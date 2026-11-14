// Ce que la dernière mesure n'a pas couvert, avec le code en cause :
// node gaps.mjs [fichier…]   (après node coverage.mjs)

import { readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(join(HERE, 'coverage', 'coverage-final.json'), 'utf8'))
const only = process.argv.slice(2)

function text(lines, loc) {
  const { start, end } = loc
  if (start.line === end.line) return (lines[start.line - 1] ?? '').slice(start.column, end.column ?? undefined)
  return `${(lines[start.line - 1] ?? '').slice(start.column)} …`
}

for (const [path, file] of Object.entries(data)) {
  if (only.length > 0 && !only.includes(basename(path))) continue
  const lines = readFileSync(path, 'utf8').split('\n')
  const out = []
  for (const [id, n] of Object.entries(file.s)) {
    if (n === 0) out.push([file.statementMap[id].start.line, `stmt   ${text(lines, file.statementMap[id]).trim().slice(0, 110)}`])
  }
  for (const [id, n] of Object.entries(file.f)) {
    if (n === 0) out.push([file.fnMap[id].loc.start.line, `fn     ${file.fnMap[id].name}`])
  }
  for (const [id, counts] of Object.entries(file.b)) {
    const branch = file.branchMap[id]
    counts.forEach((n, i) => {
      if (n > 0) return
      const loc = branch.locations[i] ?? branch.loc
      const at = loc.start.line ? loc : branch.loc
      out.push([at.start.line, `branch ${branch.type}[${i}] ${text(lines, at).trim().slice(0, 100)}`])
    })
  }
  if (out.length === 0) continue
  console.log(`\n== ${basename(path)}`)
  for (const [line, what] of out.sort((a, b) => a[0] - b[0])) console.log(`${String(line).padStart(4)}  ${what}`)
}
