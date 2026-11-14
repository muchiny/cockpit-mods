#!/usr/bin/env node
// Les dessins approuvés du mod : rejoue tests/scenes.ts dans une copie et
// réécrit tests/golden.ts, que tests/render.test.ts compare.
//
//   node golden.mjs           réécrire les dessins, dire lesquels ont changé
//   node golden.mjs --check   seulement dire lesquels ont changé (sortie 1 si l'un l'a fait)
//
// Un dessin qui change sans qu'on l'ait voulu est un bogue : relire le diff
// du fichier (le dessin en clair, puis chaque segment et son style) avant de
// le garder.

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const HERE = dirname(fileURLToPath(import.meta.url))
const MOD = resolve(HERE, '../../plan-de-vol')
// La copie de travail reste dans le banc, comme celles de status-band : sur
// disque (/tmp est un tmpfs en RAM sur cette machine) et dans un dossier à
// nous seuls, pas dans un dossier temporaire ouvert à tous.
const WORK = join(HERE, 'work', 'golden')
const GOLDEN = join(MOD, 'tests', 'golden.ts')
const MARK = '__PDV_GOLDEN__'
const CHUNK = 2000
const isCheck = process.argv.includes('--check')

rmSync(WORK, { recursive: true, force: true })
mkdirSync(dirname(WORK), { recursive: true })
cpSync(MOD, WORK, { recursive: true, filter: src => !src.includes('node_modules') })
for (const name of readdirSync(join(WORK, 'tests'))) if (/\.test\.tsx?$/.test(name)) rmSync(join(WORK, 'tests', name))
writeFileSync(
  join(WORK, 'tests', 'record.test.ts'),
  `import { test } from 'claude-code/testing'
import { SCENES } from './scenes'
Object.entries(SCENES).forEach(([name, scene], k) => {
  test('record ' + name, async ($, on) => {
    const json = JSON.stringify([name, await scene($, on)])
    const total = Math.ceil(json.length / ${CHUNK})
    for (let i = 0; i < total; i++) console.log('${MARK}' + k + ':' + i + ':' + total + ':' + json.slice(i * ${CHUNK}, (i + 1) * ${CHUNK}))
  })
})
`,
)

// Les tests impriment sur stderr : les deux flux sont lus.
const run = spawnSync('claude', ['plugin', 'test', WORK], { encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] })
const out = `${run.stdout}\n${run.stderr}`
if (run.status !== 0) {
  console.error(out.split('\n').filter(line => !line.includes(MARK)).join('\n'))
  console.error('Les scènes ne se rendent pas : rien n’est écrit.')
  process.exit(1)
}
const parts = new Map()
for (const line of out.split('\n')) {
  const at = line.indexOf(MARK)
  if (at < 0) continue
  const [, k, i, total, chunk] = /^(\d+):(\d+):(\d+):(.*)$/s.exec(line.slice(at + MARK.length)) ?? []
  const list = parts.get(k) ?? Array.from({ length: Number(total) })
  list[Number(i)] = chunk
  parts.set(k, list)
}
const scenes = Object.fromEntries(
  [...parts.entries()].sort(([a], [b]) => Number(a) - Number(b)).map(([k, list]) => {
    if (list.some(chunk => chunk === undefined)) throw new Error(`scène ${k} : morceau manquant`)
    return JSON.parse(list.join(''))
  }),
)
if (Object.keys(scenes).length === 0) {
  console.error(out)
  console.error('Aucune scène reçue.')
  process.exit(1)
}

// Les dessins approuvés jusqu'ici, lus sans exécuter le fichier : GOLDEN est
// un littéral d'objet dont chaque valeur est un texte sans substitution.
function approved(path) {
  const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest)
  const declared = file.statements.filter(ts.isVariableStatement).flatMap(s => s.declarationList.declarations)
  const golden = declared.find(d => ts.isIdentifier(d.name) && d.name.text === 'GOLDEN')?.initializer
  if (!golden || !ts.isObjectLiteralExpression(golden)) throw new Error(`${path} : littéral GOLDEN introuvable`)

  return Object.fromEntries(
    golden.properties.map(p => {
      if (!ts.isPropertyAssignment(p) || !ts.isStringLiteralLike(p.name) || !ts.isStringLiteralLike(p.initializer)) {
        throw new Error(`${path} : entrée illisible, « ${p.getText(file).slice(0, 60)} »`)
      }
      return [p.name.text, p.initializer.text]
    }),
  )
}
const before = existsSync(GOLDEN) ? approved(GOLDEN) : {}
const added = Object.keys(scenes).filter(name => !(name in before))
const changed = Object.keys(scenes).filter(name => name in before && before[name] !== scenes[name])
const removed = Object.keys(before).filter(name => !(name in scenes))
for (const [label, list] of [['nouvelle', added], ['changée', changed], ['retirée', removed]]) {
  for (const name of list) console.log(`${label.padEnd(9)} ${name}`)
}
const isSame = added.length + changed.length + removed.length === 0
console.log(isSame ? `${Object.keys(scenes).length} scènes, aucune ne change.` : '')
if (isCheck) process.exit(isSame ? 0 : 1)

const literal = text => '`' + text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`'
writeFileSync(
  GOLDEN,
  `// Généré par qa/plan-de-vol/golden.mjs (npm run golden) : ne pas
// modifier à la main. Chaque scène de tests/scenes.ts, le dessin en clair puis
// chaque segment et son style.

export const GOLDEN: Record<string, string> = {
${Object.entries(scenes).map(([name, text]) => `  ${JSON.stringify(name).replace(/^"|"$/g, "'")}: ${literal(text)},`).join('\n')}
}
`,
)
console.log(isSame ? '' : `tests/golden.ts réécrit : relire son diff avant de le garder.`)
