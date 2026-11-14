// Mutation testing of the mod, one mutant at a time.
//
// Stryker cannot run the mod as it stands: it puts every mutant in the code
// at once and picks one through `process.env` or a global, while the engine
// reads a module's source before loading it (its event names, its state) and
// runs it with no `process` and globals of its own. So Stryker's instrumenter
// only makes the mutants, with its usual mutators and `// Stryker disable`
// comments; each one is then written alone into a copy of the mod and the
// mod's tests run on it. The report follows Stryker's schema and viewer.
//
// Usage: node mutation.mjs [mod folder] [--concurrency N] [--limit N] [--survivors]
// (default: the mod beside this bench, 4 at a time; --limit tries the first N only;
// --survivors runs again what survived last time, and every mutant the last
// run did not have: new code, or a line that changed).
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Instrumenter } from '@stryker-mutator/instrumenter'

const SOURCES = ['hooks/register.tsx', 'hooks/cockpit.tsx']
// A run takes about 10 s, more with four at once; this much means the
// mutant hangs it.
const TIMEOUT_MS = 60_000
// Each run peaks near 300 MB; below this much free, none starts.
const MIN_FREE_MB = 8 * 1024

const args = process.argv.slice(2)
const option = name => {
  const at = args.indexOf(name)
  return at === -1 ? undefined : args[at + 1]
}
const concurrency = Number(option('--concurrency') ?? 4)
const limit = Number(option('--limit') ?? Infinity)
const isSurvivorsOnly = args.includes('--survivors')
const tooling = path.dirname(fileURLToPath(import.meta.url))
const mod = path.resolve(
  args.find((a, i) => !a.startsWith('--') && !['--concurrency', '--limit'].includes(args[i - 1] ?? '')) ??
    path.join(tooling, '../../status-band'),
)
const out = path.join(tooling, '.mutation')
const reportPath = path.join(out, 'report.json')

function freeMb() {
  const kb = /^MemAvailable:\s+(\d+)/m.exec(fs.readFileSync('/proc/meminfo', 'utf8'))
  return kb === null ? 0 : Math.floor(Number(kb[1]) / 1024)
}

// Stryker positions count from zero; the report's from one.
function offset(source, { line, column }) {
  let at = 0
  for (let i = 0; i < line; i++) at = source.indexOf('\n', at) + 1
  return at + column
}

async function generate(sources) {
  const quiet = () => undefined
  const logger = {
    isTraceEnabled: () => false,
    isDebugEnabled: () => false,
    isInfoEnabled: () => false,
    isWarnEnabled: () => true,
    isErrorEnabled: () => true,
    isFatalEnabled: () => true,
    trace: quiet,
    debug: quiet,
    info: quiet,
    warn: console.warn,
    error: console.error,
    fatal: console.error,
  }
  const files = SOURCES.map(file => ({ name: file, content: sources[file], mutate: true }))
  const { mutants } = await new Instrumenter(logger).instrument(files, {
    plugins: null,
    excludedMutations: [],
    ignorers: [],
  })
  return mutants.map(m => ({
    id: m.id,
    file: m.fileName,
    mutatorName: m.mutatorName,
    replacement: m.replacement,
    location: m.location,
    status: m.status,
    statusReason: m.statusReason,
  }))
}

// A mutant's identity from one run to the next: its file, the text of its
// line, its column, mutator and replacement, numbered among its twins. Lines
// added or removed elsewhere in the file leave it as it was.
function keyed(mutants, sources) {
  const lines = Object.fromEntries(Object.entries(sources).map(([file, source]) => [file, source.split('\n')]))
  const twins = new Map()
  return mutants.map(m => {
    const line = lines[m.file][m.location.start.line].trim()
    const base = `${m.file}|${line}|${m.location.start.column}|${m.mutatorName}|${m.replacement}`
    const n = twins.get(base) ?? 0
    twins.set(base, n + 1)
    return { ...m, key: `${base}|${n}` }
  })
}

// Kills the whole process group: the tests run in children of `claude`.
function runTests(dir) {
  return new Promise(resolve => {
    const child = spawn('claude', ['plugin', 'test', dir], { detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    let isTimedOut = false
    child.stdout.on('data', chunk => (output += chunk))
    child.stderr.on('data', chunk => (output += chunk))
    const timer = setTimeout(() => {
      isTimedOut = true
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch {
        // Already gone.
      }
    }, TIMEOUT_MS)
    child.on('close', code => {
      clearTimeout(timer)
      resolve({ code, output, isTimedOut })
    })
  })
}

// Stryker's statuses. A module the engine will not load never ran: refused
// by its reading of the source, a compile error; failing as it loads, a
// runtime error. Neither counts in the score.
function classify({ code, output, isTimedOut }) {
  if (isTimedOut) return { status: 'Timeout' }
  const refused = /did not load[^\n]*/.exec(output)
  if (refused !== null) {
    const isScan = /can read|always spelled|always on\(|always next\.to/.test(refused[0])
    return { status: isScan ? 'CompileError' : 'RuntimeError', statusReason: refused[0].slice(0, 300) }
  }
  if (code === 0) return { status: 'Survived' }
  const killedBy = output
    .split('\n')
    .filter(row => row.startsWith('(fail) '))
    .map(row => row.slice('(fail) '.length).replace(/ \[[\d.]+ms\]$/, ''))
  if (killedBy.length > 0) return { status: 'Killed', killedBy }
  return { status: 'RuntimeError', statusReason: output.trim().split('\n').slice(-3).join(' ').slice(0, 300) }
}

async function main() {
  const sources = Object.fromEntries(SOURCES.map(file => [file, fs.readFileSync(path.join(mod, file), 'utf8')]))
  let mutants = keyed(await generate(sources), sources)
  const ignored = mutants.filter(m => m.status === 'Ignored')
  let pending = mutants.filter(m => m.status === undefined)

  let previous = new Map()
  if (isSurvivorsOnly) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
    previous = new Map(keyed(report.raw, report.sources).map(m => [m.key, m]))
    pending = pending.filter(m => [undefined, 'Survived'].includes(previous.get(m.key)?.status))
  }
  pending = pending.slice(0, limit)

  if (freeMb() < MIN_FREE_MB) {
    console.error(`Pas assez de mémoire libre (${freeMb()} Mo < ${MIN_FREE_MB} Mo) : rien lancé.`)
    process.exit(1)
  }
  console.log(`${mutants.length} mutants, ${ignored.length} ignorés par commentaire, ${pending.length} à tester, ${concurrency} à la fois`)

  // Each worker its own copy of the mod, one file mutated at a time.
  const workers = Array.from({ length: concurrency }, (_, i) => path.join(out, `work-${i}`, path.basename(mod)))
  for (const dir of workers) {
    fs.rmSync(dir, { recursive: true, force: true })
    fs.cpSync(mod, dir, { recursive: true, filter: s => !s.startsWith(path.join(mod, '.claude-plugin', 'types')) })
  }

  const started = Date.now()
  let done = 0
  let next = 0
  const results = new Map()
  await Promise.all(
    workers.map(async dir => {
      while (next < pending.length) {
        const m = pending[next++]
        const source = sources[m.file]
        const mutated =
          source.slice(0, offset(source, m.location.start)) + m.replacement + source.slice(offset(source, m.location.end))
        const target = path.join(dir, m.file)
        fs.writeFileSync(target, mutated)
        results.set(m.id, classify(await runTests(dir)))
        fs.writeFileSync(target, source)
        done += 1
        if (done % 50 === 0 || done === pending.length) {
          const s = Math.round((Date.now() - started) / 1000)
          console.log(`${done}/${pending.length} en ${s} s`)
        }
      }
    }),
  )

  // The full picture: this run's results over the last one's.
  mutants = mutants.map(m => {
    const fresh = results.get(m.id)
    if (fresh !== undefined) return { ...m, ...fresh }
    if (m.status === 'Ignored') return m
    const old = previous.get(m.key)
    return old === undefined ? { ...m, status: 'Pending' } : { ...m, status: old.status, killedBy: old.killedBy, statusReason: old.statusReason }
  })
  write(mutants, sources)
  summarize(mutants, sources)
}

function write(mutants, sources) {
  const files = {}
  for (const file of SOURCES) {
    files[path.join(mod, file)] = {
      language: 'typescript',
      source: sources[file],
      mutants: mutants
        .filter(m => m.file === file)
        .map(m => ({
          id: String(m.id),
          mutatorName: m.mutatorName,
          replacement: m.replacement,
          status: m.status,
          statusReason: m.statusReason,
          killedBy: m.killedBy,
          location: {
            start: { line: m.location.start.line + 1, column: m.location.start.column + 1 },
            end: { line: m.location.end.line + 1, column: m.location.end.column + 1 },
          },
        })),
    }
  }
  const report = { schemaVersion: '2', thresholds: { high: 90, low: 70 }, files }
  fs.mkdirSync(out, { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify({ ...report, raw: mutants, sources }))
  const viewer = fs.readFileSync(path.join(tooling, '../node_modules/mutation-testing-elements/dist/mutation-test-elements.js'), 'utf8')
  fs.writeFileSync(
    path.join(out, 'index.html'),
    `<!doctype html><html><head><meta charset="utf-8"><title>Mutants : ${path.basename(mod)}</title></head><body>
<mutation-test-report-app title-postfix="${path.basename(mod)}"></mutation-test-report-app>
<script>${viewer.replaceAll('</script', '<\\/script')}</script>
<script>document.querySelector('mutation-test-report-app').report = ${JSON.stringify(report).replaceAll('</', '<\\/')}</script>
</body></html>`,
  )
}

function summarize(mutants, sources) {
  const count = status => mutants.filter(m => m.status === status).length
  const detected = count('Killed') + count('Timeout')
  const undetected = count('Survived') + count('NoCoverage')
  const score = detected + undetected === 0 ? 100 : (100 * detected) / (detected + undetected)
  console.log()
  for (const status of ['Killed', 'Timeout', 'Survived', 'NoCoverage', 'CompileError', 'RuntimeError', 'Ignored', 'Pending']) {
    if (count(status) > 0) console.log(`${status.padEnd(13)} ${count(status)}`)
  }
  console.log(`Score : ${score.toFixed(2)} % (détectés / (détectés + survivants))`)
  const survivors = mutants.filter(m => m.status === 'Survived')
  if (survivors.length > 0) {
    console.log(`\nSurvivants :`)
    for (const m of survivors) {
      const source = sources[m.file]
      const original = source.slice(offset(source, m.location.start), offset(source, m.location.end))
      const shown = s => JSON.stringify(s.replace(/\s+/g, ' ').slice(0, 70))
      console.log(`  ${m.file}:${m.location.start.line + 1} ${m.mutatorName} ${shown(original)} → ${shown(m.replacement)}`)
    }
  }
  console.log(`\nRapport : ${path.join(out, 'index.html')}`)
}

await main()
