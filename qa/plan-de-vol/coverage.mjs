// Couverture du mod plan-de-vol, mesurée dans le moteur lui-même.
//
// `claude plugin test` ne mesure rien : on instrumente une copie du mod
// (Istanbul, sources TS/TSX gardées telles quelles), on ajoute au plugin un
// module qui rend ses compteurs sur `/__cov`, et on enveloppe `test()` pour
// qu'à la fin de chaque test les compteurs de l'environnement du plugin et
// ceux de l'environnement du test soient imprimés. Le tout est fusionné et
// rapporté contre les vrais fichiers du mod.
//
// Usage : node coverage.mjs        (échoue sous 100 % sur un des quatre axes)

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import libCoverage from 'istanbul-lib-coverage'
import { createInstrumenter } from 'istanbul-lib-instrument'
import libReport from 'istanbul-lib-report'
import reports from 'istanbul-reports'
import schema from '@istanbuljs/schema'

const HERE = dirname(fileURLToPath(import.meta.url))
const MOD = resolve(HERE, '../../plan-de-vol')
// La copie de travail reste dans le banc, comme celles de status-band : sur
// disque (/tmp est un tmpfs en RAM sur cette machine) et dans un dossier à
// nous seuls, pas dans un dossier temporaire ouvert à tous.
const WORK = join(HERE, 'work', 'coverage')
const MARK = '__PDV_COV__'
const CHUNK = 2000

const instrumenter = createInstrumenter({
  esModules: true,
  compact: false,
  coverageVariable: '__coverage__',
  // Pas d'évaluation de code pour trouver l'objet global : le moteur la refuse peut-être.
  coverageGlobalScope: 'globalThis',
  coverageGlobalScopeFunc: false,
  parserPlugins: [...schema.defaults.instrumenter.parserPlugins, 'typescript', 'jsx'],
})

rmSync(WORK, { recursive: true, force: true })
mkdirSync(dirname(WORK), { recursive: true })
cpSync(MOD, WORK, { recursive: true })

// Ce que la copie change avant l'instrumentation, toujours sur la même
// ligne pour que les numéros de lignes restent ceux du vrai fichier :
// - le scan du moteur lit les `atom(...)` tels qu'écrits : leurs
//   déclarations ne sont pas instrumentées (elles s'exécutent au chargement) ;
// - un plugin n'a qu'un module : la commande qui rend les compteurs de son
//   environnement s'inscrit au début de `register`.
const ENTRY = 'export const register: Register = on => {'
const DUMP = "on('command.run', { command: '__cov' }, async () => ({ text: JSON.stringify((globalThis as { __coverage__?: unknown }).__coverage__ ?? {}) }));"
function prepare(name, text) {
  let out = text.replace(/^const (\w+) = atom\(/gm, '/* istanbul ignore next */ const $1 = atom(')
  if (name === 'register.tsx') {
    if (!out.includes(ENTRY)) throw new Error('register.tsx : entrée introuvable')
    out = out.replace(ENTRY, `${ENTRY} /* istanbul ignore next */ ${DUMP}`)
  }
  return out
}

// Chaque source du mod, instrumentée sous le nom du vrai fichier.
for (const name of readdirSync(join(WORK, 'hooks'))) {
  if (!/\.tsx?$/.test(name)) continue
  const copy = join(WORK, 'hooks', name)
  writeFileSync(copy, instrumenter.instrumentSync(prepare(name, readFileSync(copy, 'utf8')), join(MOD, 'hooks', name)))
}

// test() enveloppé : après le corps, les deux jeux de compteurs sur la sortie,
// en morceaux numérotés (la sortie des tests coupe les lignes trop longues).
writeFileSync(
  join(WORK, 'tests', 'coverage-kit.ts'),
  `import { test as base } from 'claude-code/testing'
export { expect, mock } from 'claude-code/testing'
type Body = Extract<Parameters<typeof base>[1], (...args: never[]) => unknown>
type Options = Exclude<Parameters<typeof base>[1], Body>
let dumps = 0
const emit = (json: string) => {
  const id = String(dumps++) + '-' + String(Math.random()).slice(2)
  const total = Math.ceil(json.length / ${CHUNK})
  for (let i = 0; i < total; i++) console.log('${MARK}' + id + ':' + i + ':' + total + ':' + json.slice(i * ${CHUNK}, (i + 1) * ${CHUNK}))
}
// test(name, body) ou test(name, options, body), comme le kit.
export const test = (name: string, ...rest: [Body] | [Options, Body]) => {
  const body = rest[rest.length - 1] as Body
  const options = (rest.length > 1 ? rest[0] : {}) as Options
  return base(name, options, async ($, on) => {
    await body($, on)
    const mine = (globalThis as { __coverage__?: unknown }).__coverage__
    if (mine) emit(JSON.stringify(mine))
    try {
      const ran = await $.command.run({ command: '__cov', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 200 } })
      if (ran.text) emit(ran.text)
    } catch {
      // Un test sans plugin chargé (units) n'a que ses propres compteurs.
    }
  })
}
`,
)
for (const name of readdirSync(join(WORK, 'tests'))) {
  if (!/\.test\.tsx?$/.test(name)) continue
  const file = join(WORK, 'tests', name)
  const text = readFileSync(file, 'utf8')
  const kit = /import \{([^}]*)\} from 'claude-code\/testing'/
  if (!kit.test(text)) throw new Error(`${name} : import du kit introuvable`)
  writeFileSync(file, text.replace(kit, "import {$1} from './coverage-kit'"))
}

// Les tests impriment sur stderr : les deux flux sont lus.
const run = spawnSync('claude', ['plugin', 'test', WORK], { encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] })
const out = `${run.stdout ?? ''}\n${run.stderr ?? ''}`
if (run.status !== 0) {
  console.error(out.split('\n').filter(line => !line.includes(MARK)).join('\n'))
  console.error('Des tests échouent sous instrumentation : couverture non mesurée.')
  process.exit(1)
}

const map = libCoverage.createCoverageMap({})
const parts = new Map()
for (const line of out.split('\n')) {
  const at = line.indexOf(MARK)
  if (at < 0) continue
  const [, id, index, total, chunk] = /^([^:]+):(\d+):(\d+):(.*)$/s.exec(line.slice(at + MARK.length)) ?? []
  if (id === undefined) throw new Error(`morceau de compteurs illisible : ${line.slice(0, 120)}`)
  const got = parts.get(id) ?? { total: Number(total), chunks: [] }
  got.chunks[Number(index)] = chunk
  parts.set(id, got)
}
let dumps = 0
for (const [id, { total, chunks }] of parts) {
  if (chunks.filter(c => c !== undefined).length !== total) throw new Error(`compteurs ${id} incomplets`)
  map.merge(JSON.parse(chunks.join('')))
  dumps += 1
}
if (dumps === 0) {
  console.error(out)
  console.error('Aucun compteur reçu : la sortie des tests ne les porte pas.')
  process.exit(1)
}

// Une source qu'aucun test n'a chargée compte à zéro, pas comme absente.
for (const name of readdirSync(join(MOD, 'hooks'))) {
  const path = join(MOD, 'hooks', name)
  if (/\.tsx?$/.test(name) && !map.files().includes(path)) {
    instrumenter.instrumentSync(readFileSync(path, 'utf8'), path)
    map.addFileCoverage(instrumenter.lastFileCoverage())
  }
}

const context = libReport.createContext({ dir: join(HERE, 'coverage'), coverageMap: map, defaultSummarizer: 'flat' })
for (const kind of ['text', 'text-summary', 'html', 'json']) reports.create(kind).execute(context)
// lcov.info pour SonarQube, aux chemins comptés depuis la racine du dépôt.
reports.create('lcovonly', { projectRoot: resolve(HERE, '../..') }).execute(context)
console.log(`\n${dumps} relevés de compteurs fusionnés · rapport HTML : ${join(HERE, 'coverage', 'index.html')}`)

const total = map.getCoverageSummary()
const short = ['lines', 'statements', 'functions', 'branches'].filter(key => total[key].pct < 100)
if (short.length > 0) {
  console.error(`Sous 100 % : ${short.map(key => `${key} ${total[key].pct} %`).join(', ')}`)
  process.exit(1)
}
if (!existsSync(join(HERE, 'coverage', 'index.html'))) process.exit(1)
