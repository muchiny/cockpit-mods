// Coverage of the mod, which `claude plugin test` does not measure.
//
// The mod's own tests run against an instrumented copy of it. Code runs in
// three separate environments (the test file, the hooks module, the cockpit
// surface module) whose globals the others cannot see, so after each test
// the counters are fetched: the hooks module answers a command, the cockpit
// draws them when posted to, and the test file logs both. The totals are
// reported against the real files.
//
// Usage: node coverage.mjs [mod folder] [--strict]
// (default: the mod beside this bench, ../../status-band; --strict exits 1
// below 100 %).
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import schema from '@istanbuljs/schema'
import libCoverage from 'istanbul-lib-coverage'
import { createInstrumenter } from 'istanbul-lib-instrument'
import libReport from 'istanbul-lib-report'
import reports from 'istanbul-reports'

const MARK = '__COVERAGE__'
// A drawing whose counters could not be read, and why.
const SKIP = '__COVERAGE_SKIP__'
const SOURCES = ['hooks/register.tsx', 'hooks/cockpit.tsx']
const TESTS = 'hooks/status-band.test.tsx'

const args = process.argv.slice(2)
const isStrict = args.includes('--strict')
const tooling = path.dirname(fileURLToPath(import.meta.url))
const mod = path.resolve(args.find(a => !a.startsWith('--')) ?? path.join(tooling, '../../status-band'))
const out = path.join(tooling, '.coverage')
const work = path.join(out, 'work', path.basename(mod))

// Swaps the one occurrence of `from`; anything else means the source moved
// under this script, which must not instrument it blind.
function swap(code, from, to, file) {
  const at = code.indexOf(from)
  if (at === -1 || code.indexOf(from, at + 1) !== -1) {
    throw new Error(`${file}: expected exactly one "${from}"`)
  }
  return code.slice(0, at) + to + code.slice(at + from.length)
}

// What each environment hands back: its counters, not the maps, which the
// instrumenter gave this script already.
const COUNTERS = `
function coverageCounters(): Record<string, { s: unknown; f: unknown; b: unknown }> {
  const all = (globalThis as { ${MARK}?: Record<string, { s: unknown; f: unknown; b: unknown }> }).${MARK} ?? {}
  return Object.fromEntries(Object.entries(all).map(([file, c]) => [file, { s: c.s, f: c.f, b: c.b }]))
}
`

const HOOKS_HARNESS = `
// Coverage harness: answers the test with this environment's counters, and
// has the cockpit draw its own.
${COUNTERS}
export const register: Register = (on, options) => {
  on('command.run', ($, e, next) =>
    e.command === '${MARK}' ? Promise.resolve({ text: JSON.stringify(coverageCounters()) }) : next(e),
  )
  on('ui.message', ($, e, next) =>
    (e.data as { coverage?: unknown } | null)?.coverage === true
      ? Promise.resolve({ props: { coverageDump: true } })
      : next(e),
  )
  coveredRegister(on, options)
}
`

const COCKPIT_HARNESS = `
// Coverage harness: draws this environment's counters when asked.
${COUNTERS}
const CoverageCockpit: ClientModule<Props, State> = (props, surface) => {
  if ((props as { coverageDump?: boolean }).coverageDump === true) {
    const { Text } = surface.elements
    return <Text>{'${MARK}' + JSON.stringify(coverageCounters())}</Text>
  }
  return Cockpit(props, surface)
}
export default CoverageCockpit
`

const TEST_HARNESS = `
// Coverage harness: each test, then the counters of both module environments.
async function dumpDrawing(drawn: any): Promise<void> {
  try {
    await drawn.post({ coverage: true }, { in: 'cockpit' })
    const found = await drawn.find({ type: 'Text', text: '${MARK}', in: 'cockpit' })
    console.log(found === undefined ? '${SKIP}nothing drawn' : found.text)
  } catch (error) {
    console.log('${SKIP}' + String(error).split('\\n')[0])
  }
}

function test(name: string, ...rest: unknown[]): void {
  const body = rest[rest.length - 1] as (engine: unknown, on: unknown) => unknown
  const head = rest.slice(0, -1)
  const register = kitTest as (...all: unknown[]) => void
  register(name, ...head, async ($: any, on: unknown) => {
    // The kit's engine and drawings are frozen, which a Proxy may not stand
    // in for: objects built on them instead. The one change: a drawing hands
    // its counters over before it goes, whether the test or the end takes it.
    const live = new Set<any>()
    const ui = Object.create($.ui, {
      mount: {
        value: async (...all: unknown[]) => {
          const drawn = await $.ui.mount(...all)
          live.add(drawn)
          return Object.create(drawn, {
            unmount: {
              value: async () => {
                if (live.delete(drawn)) await dumpDrawing(drawn)
                return drawn.unmount()
              },
            },
          })
        },
      },
    })
    const engine = Object.create($, { ui: { value: ui } })
    try {
      return await body(engine, on)
    } finally {
      for (const drawn of live) await dumpDrawing(drawn)
      const hooks = await $.command.run({
        command: '${MARK}',
        args: '',
        origin: { kind: 'sdk' },
        presentation: { isFullscreen: false, columns: 80 },
      })
      console.log('${MARK}' + String(hooks.text))
    }
  })
}
`

function prepare() {
  fs.rmSync(work, { recursive: true, force: true })
  fs.cpSync(mod, work, {
    recursive: true,
    filter: source => !source.startsWith(path.join(mod, '.claude-plugin', 'types')),
  })

  const instrumenter = createInstrumenter({
    esModules: true,
    compact: false,
    preserveComments: true,
    coverageVariable: MARK,
    coverageGlobalScope: 'globalThis',
    // The mod's environments refuse `new Function`.
    coverageGlobalScopeFunc: false,
    parserPlugins: [...schema.defaults.instrumenter.parserPlugins, 'typescript', 'jsx'],
  })

  const baseline = {}
  for (const file of SOURCES) {
    const real = path.join(mod, file)
    let source = fs.readFileSync(real, 'utf8')
    // The engine reads the state a module touches off its source, and needs
    // `atom(...)` bare where the const is declared: no counter there. It runs
    // at load, so nothing is lost.
    if (file.endsWith('register.tsx')) {
      source = swap(source, 'const line = atom(', '/* istanbul ignore next */ const line = atom(', file)
    }
    let code = instrumenter.instrumentSync(source, real)
    baseline[real] = instrumenter.lastFileCoverage()
    if (file.endsWith('register.tsx')) {
      code = swap(code, 'export const register: Register =', 'const coveredRegister: Register =', file)
      code += HOOKS_HARNESS
    } else {
      code = swap(code, 'export default Cockpit;', '', file)
      code += COCKPIT_HARNESS
    }
    fs.writeFileSync(path.join(work, file), code)
  }

  const testsPath = path.join(work, TESTS)
  const tests = fs.readFileSync(testsPath, 'utf8')
  const kit = tests.match(/^import \{([^}]*)\} from 'claude-code\/testing'$/m)
  if (kit === null || !/\btest\b/.test(kit[1])) throw new Error(`${TESTS}: expected the kit's test import`)
  const imported = kit[0].replace(/\btest\b/, 'test as kitTest')
  fs.writeFileSync(testsPath, swap(tests, kit[0], imported, TESTS) + TEST_HARNESS)

  return baseline
}

function run() {
  const ran = spawnSync('claude', ['plugin', 'test', work], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  return { status: ran.status, output: `${ran.stdout}\n${ran.stderr}` }
}

// Every dump adds its counts: one file's counters reached from two dumps
// count twice, which leaves what ran and what did not as it is.
function collect(baseline, output) {
  let dumps = 0
  const skips = new Map()
  for (const row of output.split('\n')) {
    const skipped = row.indexOf(SKIP)
    if (skipped !== -1) {
      const why = row.slice(skipped + SKIP.length)
      skips.set(why, (skips.get(why) ?? 0) + 1)
      continue
    }
    const at = row.indexOf(MARK)
    if (at === -1) continue
    const counters = JSON.parse(row.slice(at + MARK.length))
    dumps += 1
    for (const [file, { s, f, b }] of Object.entries(counters)) {
      const base = baseline[file]
      if (base === undefined) throw new Error(`counters for an unknown file: ${file}`)
      for (const [k, n] of Object.entries(s)) base.s[k] += n
      for (const [k, n] of Object.entries(f)) base.f[k] += n
      for (const [k, ns] of Object.entries(b)) ns.forEach((n, i) => (base.b[k][i] += n))
    }
  }
  return { dumps, skips }
}

const baseline = prepare()
const { status, output } = run()
const { dumps, skips } = collect(baseline, output)
const summary = output.split('\n').filter(row => /^\s*\d+ (pass|fail)$|^Ran |^\(fail\)/.test(row))
console.log(summary.join('\n'))
console.log(`${dumps} relevés de compteurs`)
for (const [why, n] of skips) console.log(`${n} dessin(s) sans relevé : ${why}`)
console.log()

const coverageMap = libCoverage.createCoverageMap(baseline)
const context = libReport.createContext({ dir: path.join(out, 'report'), coverageMap, defaultSummarizer: 'flat' })
for (const name of ['text', 'html', 'json', 'json-summary']) reports.create(name).execute(context)
// lcov.info for SonarQube, its paths counted from the repository's root.
reports.create('lcovonly', { projectRoot: path.join(tooling, '../..') }).execute(context)
console.log(`\nRapport HTML : ${path.join(out, 'report', 'index.html')}`)

const total = coverageMap.getCoverageSummary()
const isFull = ['statements', 'branches', 'functions', 'lines'].every(k => total[k].pct === 100)
if (status !== 0) {
  console.error('Des tests échouent sur la copie instrumentée.')
  process.exit(1)
}
if (dumps === 0) {
  console.error('Aucun relevé de compteurs : le harnais ne parle plus.')
  process.exit(1)
}
if (isStrict && !isFull) process.exit(1)
