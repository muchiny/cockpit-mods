// Mutation testing du mod plan-de-vol, jugé par sa propre suite.
//
// Chaque mutant (une petite faute plantée dans une source de hooks/, à la
// manière de Stryker) est appliqué à une copie du mod sur disque, puis
// `claude plugin test` tourne sur la copie : un test qui échoue le tue, une
// suite verte le laisse survivre. Les copies sont dans /var/tmp (disque),
// jamais dans /tmp (tmpfs en RAM sur cette machine).
//
// Usage :
//   node mutation.mjs                    tous les mutants, 4 copies en parallèle
//   node mutation.mjs --file a.ts,b.ts   ces sources seulement
//   node mutation.mjs --only <id,id…>    rejouer des mutants précis
//   node mutation.mjs --list             compter les mutants sans rien lancer
//   node mutation.mjs --report           le rapport des derniers verdicts, sans rien lancer
//   node mutation.mjs --workers 2
//
// Les verdicts sont gardés par source (mutation/<source>.json) avec
// l'empreinte du code jugé : le rapport dit périmé celui d'une source
// modifiée depuis, à rejouer avec --file.
//
// Hors mutation, comme hors couverture : les déclarations `atom(...)` (le
// scan du moteur les lit telles qu'écrites) et le code marqué
// `istanbul ignore next` (que le kit de test ne peut pas atteindre).

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { freemem } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const HERE = dirname(fileURLToPath(import.meta.url))
const MOD = resolve(HERE, '../../plan-de-vol')
const WORK = '/var/tmp/plan-de-vol-qa/mutation'
const OUT = join(HERE, 'mutation')
const FILES = ['text.ts', 'fleet.ts', 'summary.ts', 'chart.ts', 'logbook.ts', 'warp.tsx', 'register.tsx']
const TIMEOUT_MS = 120_000
// Sous ce seuil de RAM libre, rien ne démarre (chaque copie en prend ~1 Go au pic).
const MIN_FREE_MB = 8 * 1024

const args = process.argv.slice(2)
const flag = name => args.includes(name)
const value = name => {
  const at = args.indexOf(name)
  return at >= 0 ? args[at + 1] : undefined
}
const WORKERS = Number(value('--workers') ?? 4)
const onlyFiles = value('--file')?.split(',')
const onlyIds = value('--only')?.split(',')

// ─── Les mutants ────────────────────────────────────────────────────────────

const BINARY = {
  [ts.SyntaxKind.EqualsEqualsEqualsToken]: ['!=='],
  [ts.SyntaxKind.ExclamationEqualsEqualsToken]: ['==='],
  [ts.SyntaxKind.LessThanToken]: ['<=', '>='],
  [ts.SyntaxKind.LessThanEqualsToken]: ['<', '>'],
  [ts.SyntaxKind.GreaterThanToken]: ['>=', '<='],
  [ts.SyntaxKind.GreaterThanEqualsToken]: ['>', '<'],
  [ts.SyntaxKind.AmpersandAmpersandToken]: ['||'],
  [ts.SyntaxKind.BarBarToken]: ['&&'],
  [ts.SyntaxKind.QuestionQuestionToken]: ['&&'],
  [ts.SyntaxKind.PlusToken]: ['-'],
  [ts.SyntaxKind.MinusToken]: ['+'],
  [ts.SyntaxKind.AsteriskToken]: ['/'],
  [ts.SyntaxKind.SlashToken]: ['*'],
  [ts.SyntaxKind.PercentToken]: ['*'],
  [ts.SyntaxKind.PlusEqualsToken]: ['-='],
  [ts.SyntaxKind.MinusEqualsToken]: ['+='],
}
const SWAP_METHOD = { some: 'every', every: 'some', startsWith: 'endsWith', endsWith: 'startsWith' }
const SWAP_MATH = { max: 'min', min: 'max' }
const DROP_METHOD = new Set(['filter', 'slice', 'trim', 'reverse', 'flat'])

function isIgnored(node) {
  const text = node.getSourceFile().getFullText()
  const comments = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []
  return comments.some(c => /istanbul ignore next/.test(text.slice(c.pos, c.end)))
}

function isAtomDeclaration(node) {
  return (
    ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(
      d => d.initializer && ts.isCallExpression(d.initializer) && d.initializer.expression.getText() === 'atom',
    )
  )
}

// Every mutant of one source: { at, end, to, kind } on the source text.
function mutantsOf(name, text) {
  const kind = name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const file = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, kind)
  const out = []
  const add = (node, to, what, start = node.getStart(file), end = node.getEnd()) => out.push({ at: start, end, to, kind: what })

  const visit = node => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return
    if (ts.isTypeNode(node) || ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) return
    if (ts.isModuleDeclaration(node)) return
    if (isAtomDeclaration(node) || isIgnored(node)) return

    if (ts.isBinaryExpression(node) && BINARY[node.operatorToken.kind]) {
      for (const to of BINARY[node.operatorToken.kind]) add(node.operatorToken, to, `opérateur ${node.operatorToken.getText(file)} → ${to}`)
    }
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
      add(node, node.operand.getText(file), 'négation retirée')
    }
    if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
      const swap = { [ts.SyntaxKind.PlusPlusToken]: '--', [ts.SyntaxKind.MinusMinusToken]: '++' }[node.operator]
      if (swap) {
        const operand = node.operand.getText(file)
        add(node, ts.isPrefixUnaryExpression(node) ? `${swap}${operand}` : `${operand}${swap}`, `${node.getText(file)} → ${swap}`)
      }
    }
    if (ts.isConditionalExpression(node)) {
      add(node.condition, 'true', 'condition ? toujours vraie')
      add(node.condition, 'false', 'condition ? toujours fausse')
    }
    if (ts.isIfStatement(node) || ts.isWhileStatement(node)) {
      add(node.expression, 'true', 'condition toujours vraie')
      add(node.expression, 'false', 'condition toujours fausse')
    }
    if (ts.isForStatement(node) && node.condition) add(node.condition, 'false', 'boucle jamais parcourue')
    if (node.kind === ts.SyntaxKind.TrueKeyword) add(node, 'false', 'true → false')
    if (node.kind === ts.SyntaxKind.FalseKeyword) add(node, 'true', 'false → true')
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && node.text !== '') {
      const parent = node.parent
      const isName = (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) && parent.name === node
      const isJsx = ts.isJsxAttribute(parent)
      if (!isName && !isJsx && !ts.isLiteralTypeNode(parent)) add(node, ts.isStringLiteral(node) ? "''" : '``', 'texte vidé')
    }
    if (ts.isTemplateExpression(node)) add(node, '``', 'gabarit vidé')
    if (ts.isArrayLiteralExpression(node) && node.elements.length > 0) add(node, '[]', 'tableau vidé')
    const body = ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node) ? node.body : undefined
    if (body && ts.isBlock(body) && body.statements.length > 0) add(body, '{}', 'corps de fonction vidé')
    if (ts.isPropertyAccessExpression(node)) {
      const method = node.name.getText(file)
      if (SWAP_METHOD[method]) add(node.name, SWAP_METHOD[method], `.${method} → .${SWAP_METHOD[method]}`)
      if (SWAP_MATH[method] && node.expression.getText(file) === 'Math') add(node.name, SWAP_MATH[method], `Math.${method} → Math.${SWAP_MATH[method]}`)
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.getText(file)
      if (DROP_METHOD.has(method)) add(node, node.expression.expression.getText(file), `.${method}(…) retiré`)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)

  return out.map((m, i) => {
    const { line, character } = file.getLineAndCharacterOfPosition(m.at)
    return {
      ...m,
      id: `${name}#${i}`,
      file: name,
      line: line + 1,
      column: character + 1,
      from: text.slice(m.at, m.end),
      source: text.split('\n')[line].trim(),
    }
  })
}

const sources = Object.fromEntries(FILES.map(name => [name, readFileSync(join(MOD, 'hooks', name), 'utf8')]))
const hash = name => createHash('sha256').update(sources[name]).digest('hex').slice(0, 16)
const verdictsOf = name => {
  const path = join(OUT, `${name}.json`)
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null
}

if (flag('--report')) process.exit(report())

let mutants = FILES.filter(name => !onlyFiles || onlyFiles.includes(name)).flatMap(name => mutantsOf(name, sources[name]))
if (onlyIds) mutants = mutants.filter(m => onlyIds.includes(m.id))

if (flag('--list')) {
  const byFile = Object.groupBy(mutants, m => m.file)
  for (const [name, list] of Object.entries(byFile)) console.log(`${name.padEnd(14)} ${String(list.length).padStart(4)} mutants`)
  const byKind = Object.groupBy(mutants, m => m.kind.replace(/ .*→.*/, ' →').replace(/^\.\S+/, '.méthode'))
  console.log(Object.entries(byKind).map(([k, l]) => `${k}: ${l.length}`).join(' · '))
  console.log(`total : ${mutants.length}`)
  process.exit(0)
}

// ─── Les copies et la suite ─────────────────────────────────────────────────

function run(dir) {
  return new Promise(done => {
    const child = spawn('claude', ['plugin', 'test', dir], { detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', d => (output += d))
    child.stderr.on('data', d => (output += d))
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch {
        // Already gone.
      }
      done({ status: 'timeout', output })
    }, TIMEOUT_MS)
    child.on('close', code => {
      clearTimeout(timer)
      done({ status: code === 0 ? 'passed' : 'failed', output })
    })
  })
}

// The first failing test's name: what killed the mutant.
function killer(output) {
  return /^\(fail\) (.*?) \[/m.exec(output)?.[1] ?? null
}

function freeMb() {
  const meminfo = existsSync('/proc/meminfo') ? readFileSync('/proc/meminfo', 'utf8') : ''
  const available = /MemAvailable:\s+(\d+) kB/.exec(meminfo)
  return available ? Number(available[1]) / 1024 : freemem() / 1024 / 1024
}

if (freeMb() < MIN_FREE_MB) {
  console.error(`RAM libre ${Math.round(freeMb())} Mo < ${MIN_FREE_MB} Mo : rien ne démarre.`)
  process.exit(2)
}

rmSync(WORK, { recursive: true, force: true })
mkdirSync(WORK, { recursive: true })
const copies = Array.from({ length: Math.max(1, Math.min(WORKERS, mutants.length)) }, (_, i) => {
  const dir = join(WORK, `copie-${i}`)
  cpSync(MOD, dir, { recursive: true })
  return dir
})

// The suite must pass unmutated, or no verdict means anything.
const baseline = await run(copies[0])
if (baseline.status !== 'passed') {
  console.error(baseline.output)
  console.error('La suite échoue sans mutant : rien à juger.')
  process.exit(1)
}

const started = Date.now()
const results = []
let next = 0
await Promise.all(
  copies.map(async dir => {
    while (next < mutants.length) {
      const m = mutants[next++]
      const path = join(dir, 'hooks', m.file)
      const original = sources[m.file]
      writeFileSync(path, original.slice(0, m.at) + m.to + original.slice(m.end))
      const verdict = await run(dir)
      writeFileSync(path, original)
      const status = verdict.status === 'passed' ? 'survived' : verdict.status === 'timeout' ? 'timeout' : 'killed'
      const isLoad = /did not load|hooks module/.test(verdict.output)
      results.push({ ...m, status, by: status === 'killed' ? (isLoad ? 'chargement refusé' : killer(verdict.output)) : null })
      const done = results.length
      if (done % 25 === 0 || done === mutants.length) {
        const left = ((Date.now() - started) / done) * (mutants.length - done)
        console.log(`${done}/${mutants.length} · ${results.filter(r => r.status === 'survived').length} survivants · reste ~${Math.round(left / 60000)} min`)
      }
    }
  }),
)
rmSync(WORK, { recursive: true, force: true })

// ─── Les verdicts, puis le rapport ──────────────────────────────────────────

mkdirSync(OUT, { recursive: true })
for (const name of FILES) {
  const mine = results.filter(r => r.file === name)
  if (mine.length === 0) continue
  // Rejoués un par un : fondus dans les verdicts du même code, s'il y en a.
  const kept = onlyIds ? verdictsOf(name) : null
  const base = kept?.hash === hash(name) ? kept.results.filter(r => !mine.some(m => m.id === r.id)) : []
  const all = [...base, ...mine].sort((a, b) => a.at - b.at)
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify({ hash: hash(name), results: all }, null, 2))
}
process.exit(report())

function report() {
  const rows = FILES.map(name => ({ name, verdicts: verdictsOf(name) }))
  const all = rows.flatMap(r => r.verdicts?.results ?? [])
  console.log('\nFichier        mutants  tués  expirés  survivants  score')
  for (const { name, verdicts } of rows) {
    if (!verdicts) {
      console.log(`${name.padEnd(14)}  pas encore jugé`)
      continue
    }
    const list = verdicts.results
    const k = list.filter(r => r.status === 'killed').length
    const t = list.filter(r => r.status === 'timeout').length
    const s = list.filter(r => r.status === 'survived').length
    const stale = verdicts.hash === hash(name) ? '' : '   PÉRIMÉ : source modifiée depuis'
    console.log(`${name.padEnd(14)} ${String(list.length).padStart(7)} ${String(k).padStart(5)} ${String(t).padStart(8)} ${String(s).padStart(11)}  ${(((k + t) / list.length) * 100).toFixed(1)} %${stale}`)
  }
  const killed = all.filter(r => r.status === 'killed').length
  const timeout = all.filter(r => r.status === 'timeout').length
  const survived = all.filter(r => r.status === 'survived')
  const atLoad = all.filter(r => r.by === 'chargement refusé').length
  console.log(`\nScore : ${(((killed + timeout) / Math.max(1, all.length)) * 100).toFixed(2)} % (${killed} tués, dont ${atLoad} au chargement, ${timeout} expirés, ${survived.length} survivants sur ${all.length})`)
  for (const s of survived) console.log(`  SURVIVANT ${s.id}  ${s.file}:${s.line}:${s.column}  ${s.kind}  « ${s.from.slice(0, 50)} »  ← ${s.source.slice(0, 90)}`)
  const isStale = rows.some(r => !r.verdicts || r.verdicts.hash !== hash(r.name))

  return survived.length === 0 && !isStale ? 0 : 1
}
