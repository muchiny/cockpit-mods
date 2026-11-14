import { expect, test } from 'claude-code/testing'

import { GOLDEN } from './golden'
import { SCENES } from './scenes'

// Each drawing as tests/golden.ts holds it, word and style alike: a glyph, a
// colour or a fill that changes shows here.

test('the golden file holds every scene, and only them', () => {
  expect(Object.keys(GOLDEN).sort()).toEqual(Object.keys(SCENES).sort())
})

for (const [name, scene] of Object.entries(SCENES)) {
  test(`drawn as approved: ${name}`, async ($, on) => {
    expect(await scene($, on)).toBe(GOLDEN[name])
  })
}
