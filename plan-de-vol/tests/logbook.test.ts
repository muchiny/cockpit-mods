import { expect, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'

import { STALE_MS } from '../hooks/fleet'
import { RAW_MAX, SAVED_CHARS_MAX, SAVED_MAX, exportName, exportPath, isSavedKey, markdown, parseSaved, savedKey, stale, stowed } from '../hooks/logbook'
import type { Logbook } from '../hooks/logbook'
import { PROMPT_MAX, later, newMission, toolLine } from '../hooks/summary'
import type { Drone, Fleet, Live, Mission, Plan } from '../types'

// What the plan leaves outside the session, as pure functions: its copy in
// the store, the missions a transcript adds past it, and the Markdown logbook.

const IDLE: Live = { isWorking: false, action: null, question: null, summarizing: [] }
const NOW = STALE_MS * 3

function mission(id: number, prompt: string, over: Partial<Mission> = {}, lines: string[] = []): Mission {
  return { ...newMission(id, prompt, lines), ...over }
}

function planOf(missions: Mission[], objective: string | null = null): Plan {
  return { epoch: 3, objective, missions, pending: [{ entered: 'x', shown: 'x', isCommand: false, isPerson: true, at: 0 }] }
}

function user(text: string): SessionMessage {
  return { role: 'user', text, toolUses: [] }
}

function assistant(text: string): SessionMessage {
  return { role: 'assistant', text, toolUses: [] }
}

function drone(i: number, over: Partial<Drone> = {}): Drone {
  return { id: `a${String(i)}`, label: `relecteur ${String(i)}`, status: 'running', action: null, seenAt: NOW, ...over }
}

// A mission whose JSON takes exactly `chars` characters.
function weighing(id: number, chars: number): Mission {
  const bare = JSON.stringify(mission(id, '')).length

  return { ...mission(id, ''), prompt: 'x'.repeat(chars - bare) }
}

test('a copy holds what a resume needs, under the session’s own key', () => {
  const missions = [mission(0, 'un', { title: 'Un' }), mission(1, 'deux', {}, [toolLine('Lu a.ts')])]
  const plan = planOf(missions, 'Objectif')
  const saved = stowed(plan, 42)

  expect(saved).toEqual({ at: 42, objective: 'Objectif', missions })
  // The plan itself is left as it was.
  expect(plan.missions.map(m => m.id)).toEqual([0, 1])
  expect(Object.keys(saved)).toEqual(['at', 'objective', 'missions'])
  expect(savedKey('1c0ffee5')).toBe('plan-1:1c0ffee5')
  expect(isSavedKey('plan-1:1c0ffee5')).toBe(true)
  expect(isSavedKey('plan-2:1c0ffee5')).toBe(false)
  expect(isSavedKey('closed')).toBe(false)
})

test('a copy keeps the newest missions that fit its room, to the character; the newest whatever it weighs', () => {
  const half = SAVED_CHARS_MAX / 2
  const ids = (weights: number[]) => stowed(planOf(weights.map((chars, id) => weighing(id, chars))), 0).missions.map(m => m.id)

  expect(JSON.stringify(weighing(7, half)).length).toBe(half)
  // Two fill the room exactly; one character more each, and only the newest stays.
  expect(ids([half, half, half, half])).toEqual([2, 3])
  expect(ids([half, half, half + 1, half])).toEqual([3])
  // An old mission too heavy takes the ones before it with it, however light.
  expect(ids([10_000, SAVED_CHARS_MAX, 10_000, 10_000])).toEqual([2, 3])
  expect(ids([10_000, SAVED_CHARS_MAX * 2])).toEqual([1])
})

const SAVED = stowed(
  planOf(
    [
      mission(0, 'un', { title: 'Un', waiting: 'Relis', steps: [{ kind: 'fix', what: 'Clé ajoutée', why: 'rejoué' }] }, [toolLine('Lu a.ts')]),
      mission(1, 'deux'),
    ],
    'Objectif',
  ),
  7,
)

type Loose = { at: unknown; objective: unknown; missions: unknown }
type LooseMission = Record<string, unknown> & { steps: Record<string, unknown>[] }

// The copy as the store hands it back, changed in one place.
function spoiled(change: (copy: Loose, first: LooseMission, step: Record<string, unknown>) => void): unknown {
  const copy = JSON.parse(JSON.stringify(SAVED)) as Loose & { missions: LooseMission[] }
  const [first] = copy.missions
  const step = first?.steps[0]
  if (first === undefined || step === undefined) throw new Error('copie sans mission ni étape')
  change(copy, first, step)

  return copy
}

test('a copy reads back as it was written, with or without an objective, a title, steps', () => {
  expect(parseSaved(JSON.parse(JSON.stringify(SAVED)))).toEqual(SAVED)
  const bare = stowed(planOf([mission(0, 'seul')]), 0)
  expect(parseSaved(JSON.parse(JSON.stringify(bare)))).toEqual(bare)
  expect(parseSaved(JSON.parse(JSON.stringify(stowed(planOf([]), 0))))).toEqual({ at: 0, objective: null, missions: [] })
  for (const kind of ['done', 'decision', 'fail', 'fix']) {
    expect(parseSaved(spoiled((_, __, step) => (step.kind = kind)))).not.toBeNull()
  }
})

for (const [what, value] of [
  ['nothing', undefined],
  ['null', null],
  ['a number', 42],
  ['a text', 'plan'],
  ['a list', [SAVED]],
  ['no date', spoiled(copy => (copy.at = '2026-11-14'))],
  ['an objective that is no text', spoiled(copy => (copy.objective = 7))],
  ['missions that are no list', spoiled(copy => (copy.missions = 'aucune'))],
  ['a mission that is no object', spoiled(copy => (copy.missions = [null]))],
  ...['id', 'earlier', 'logged', 'summarized', 'attempted'].map(field => [`a mission whose ${field} is no number`, spoiled((_, first) => (first[field] = '0'))] as const),
  ['a mission with no id', spoiled((_, first) => delete first.id)],
  ['a prompt that is no text', spoiled((_, first) => (first.prompt = 5))],
  ['a title that is no text', spoiled((_, first) => (first.title = 5))],
  ['a waiting that is no text', spoiled((_, first) => (first.waiting = 5))],
  ['steps that are no list', spoiled((_, first) => Object.assign(first, { steps: 'aucune' }))],
  ['a step that is no object', spoiled((_, first) => Object.assign(first, { steps: [null] }))],
  ['a step of an unknown kind', spoiled((_, __, step) => (step.kind = 'autre'))],
  ['a step whose kind is no text', spoiled((_, __, step) => (step.kind = ['fix']))],
  ['a step with no what', spoiled((_, __, step) => (step.what = null))],
  ['a step with no why', spoiled((_, __, step) => (step.why = 3))],
  ['a journal that is no list', spoiled((_, first) => (first.journal = 'vide'))],
  ['a journal line that is no text', spoiled((_, first) => (first.journal = ['· Lu a.ts', 1]))],
] as const) {
  test(`a stored value with ${what} is no copy`, () => {
    expect(parseSaved(value)).toBeNull()
  })
}

test('past the newest twelve, the copies to delete are the oldest saved, in any order given', () => {
  const copies = Array.from({ length: SAVED_MAX + 2 }, (_, i) => ({ key: `k${String(i)}`, at: ((i * 5) % (SAVED_MAX + 2)) + 1 }))

  expect(stale(copies.slice(0, SAVED_MAX))).toEqual([])
  // Saved at 2 and at 1: the thirteenth and the fourteenth newest.
  expect(stale(copies)).toEqual(['k3', 'k0'])
  expect(copies[3]?.at).toBe(2)
  // The list given is left as it was.
  expect(copies.map(c => c.key)).toEqual(Array.from({ length: SAVED_MAX + 2 }, (_, i) => `k${String(i)}`))
})

const ROWS = [user('un'), assistant('a1'), user('deux'), assistant('a2'), user('trois'), assistant('a3')]

test('with no mission yet, a transcript gives its newest prompts, each with the lines after it', () => {
  expect(later(undefined, ROWS, 2)).toEqual([mission(0, 'deux', {}, ['CLAUDE : a2']), mission(1, 'trois', {}, ['CLAUDE : a3'])])
  expect(later(undefined, [], 2)).toEqual([])
})

test('past a saved mission, a transcript gives only the prompts that came since, numbered after it', () => {
  expect(later(mission(7, 'un'), ROWS, 12)).toEqual([mission(8, 'deux', {}, ['CLAUDE : a2']), mission(9, 'trois', {}, ['CLAUDE : a3'])])
  expect(later(mission(7, 'un'), ROWS, 1)).toEqual([mission(8, 'trois', {}, ['CLAUDE : a3'])])
  expect(later(mission(7, 'trois'), ROWS, 12)).toEqual([])
  // A prompt said twice: the mission is the last of them.
  expect(later(mission(7, 'deux'), [...ROWS, user('deux'), assistant('encore')], 12)).toEqual([])
  // A mission keeps the head of a long prompt: found by it.
  const long = 'x'.repeat(PROMPT_MAX + 100)
  expect(later(mission(0, long), [user(long), assistant('lu'), user('après')], 12).map(m => m.prompt)).toEqual(['après'])
})

test('a saved mission the transcript does not hold adds nothing, so nothing is doubled', () => {
  expect(later(mission(7, '/plan-de-vol'), ROWS, 12)).toEqual([])
})

test('the logbook is named after the minute and the session, and goes where asked or under the home’s Claude Code folder', () => {
  const name = exportName('2026-11-14 02:42', '1c0ffee5-0a1b-4c2d-8e3f-5a6b7c8d9e0f')
  expect(name).toBe('2026-11-14-0242-1c0ffee5')
  expect(exportName('1970-01-01 03:07 UTC', 's1')).toBe('1970-01-01-0307-s1')

  expect(exportPath('', '/home/pilote', '/depot', name)).toBe('/home/pilote/.claude/plan-de-vol/2026-11-14-0242-1c0ffee5.md')
  expect(exportPath('', undefined, '/depot', name)).toBe('/depot/plan-de-vol-2026-11-14-0242-1c0ffee5.md')
  expect(exportPath('/var/tmp/vol.md', '/home/pilote', '/depot', name)).toBe('/var/tmp/vol.md')
  expect(exportPath('notes/vol.md', '/home/pilote', '/depot', name)).toBe('/depot/notes/vol.md')
  expect(exportPath('~/Docs/Vol.md', '/home/pilote', '/depot', name)).toBe('/home/pilote/Docs/Vol.md')
  // No home to read `~/` as, a name that only starts like it: paths of the folder.
  expect(exportPath('~/Docs/Vol.md', undefined, '/depot', name)).toBe('/depot/~/Docs/Vol.md')
  expect(exportPath('~vol.md', '/home/pilote', '/depot', name)).toBe('/depot/~vol.md')
})

function book(over: Partial<Logbook>): Logbook {
  return { plan: planOf([]), live: IDLE, fleet: { squadrons: [] }, now: NOW, when: '2026-11-14 02:42', sessionId: '1c0ffee5-f011', cwd: '/home/pilote/projet', ...over }
}

test('the logbook stands on its own: the objective, each mission with its contract, steps and why, what is still raw, its squadrons, and what the person is waited for', () => {
  const fleet: Fleet = {
    squadrons: [
      {
        key: 'wf1',
        name: 'revue  ultracode',
        isWorkflow: true,
        mission: 0,
        drones: [
          drone(0, { action: 'Lu  chart.ts' }),
          drone(1),
          drone(2, { status: 'done' }),
          drone(3, { status: 'failed' }),
          drone(4, { status: 'failed' }),
          drone(5, { seenAt: 0 }),
        ],
      },
      // No drone, or a mission the plan no longer holds: not written.
      { key: 'wf2', name: 'vide', isWorkflow: true, mission: 4, drones: [] },
      { key: 'agents-9', name: 'Agents', isWorkflow: false, mission: 9, drones: [drone(6)] },
    ],
  }
  const plan = planOf(
    [
      mission(0, 'fais un mod\n\navec un export  ', {
        title: 'Faire le mod',
        earlier: 2,
        waiting: 'une attente passée',
        steps: [
          { kind: 'done', what: 'Lu  register.tsx', why: 'pour comprendre\nle câblage' },
          { kind: 'decision', what: 'Un seul module', why: '' },
          { kind: 'fail', what: 'Tests en échec', why: 'la clé manquait' },
          { kind: 'fix', what: 'Clé ajoutée', why: 'rejoué au vert' },
        ],
      }),
      mission(4, 'ensuite', { waiting: 'Valide  la maquette' }, ['CLAUDE : Je regarde', toolLine('Lu a.ts'), '  ↳ ÉCHEC : Lu a.ts']),
    ],
    'Plan de vol  exportable',
  )

  expect(markdown(book({ plan, fleet }))).toBe(`# Plan de vol — 2026-11-14 02:42

- Session : \`1c0ffee5-f011\`
- Dossier : \`/home/pilote/projet\`
- Contrats : 2

## OBJECTIF

Plan de vol exportable

## P1 · Faire le mod

> fais un mod
>
> avec un export

- _Étapes plus anciennes, non gardées : 2_
- **Fait** : Lu register.tsx — pour comprendre le câblage
- **Décision** : Un seul module
- **Échec** : Tests en échec — la clé manquait
- **Correction** : Clé ajoutée — rejoué au vert

**ESCADRILLE « revue ultracode »** : 2 en vol, 1 au hangar, 2 perdus, 1 en silence radio
- en vol : relecteur 0 (Lu chart.ts)
- en vol : relecteur 1

## P5 · « ensuite »

> ensuite

**JOURNAL** (pas encore résumé, 3 lignes) :

\`\`\`text
CLAUDE : Je regarde
· Lu a.ts
  ↳ ÉCHEC : Lu a.ts
\`\`\`

**À VOUS** : Valide la maquette
`)
})

test('the logbook says the work under way on the newest mission, the question asked before it, and no objective yet', () => {
  const plan = planOf([mission(0, 'avant', { waiting: 'plus rien' }), mission(1, 'maintenant', { title: 'Maintenant' })])
  const tail = (live: Live) => markdown(book({ plan, live })).split('\n\n').slice(2)

  expect(tail({ ...IDLE, isWorking: true, action: 'Edit  chart.ts' })).toEqual([
    '## OBJECTIF',
    '_Trajectoire non calculée._',
    '## P1 · « avant »',
    '> avant',
    '## P2 · Maintenant',
    '> maintenant',
    '**MANŒUVRE** : Edit chart.ts\n',
  ])
  expect(tail({ ...IDLE, isWorking: true }).at(-1)).toBe('**MANŒUVRE** : Réfléchit\n')
  expect(tail({ ...IDLE, isWorking: true, action: 'Edit chart.ts', question: 'Lequel ?' }).at(-1)).toBe('**À VOUS** : Lequel ?\n')
  // At rest with nothing waited for: the mission ends on its contract.
  expect(tail(IDLE).at(-1)).toBe('> maintenant\n')
})

test('a long journal shows its newest lines and counts the ones before; a squadron with one lost says it singular', () => {
  const lines = Array.from({ length: RAW_MAX + 1 }, (_, i) => toolLine(`Lu f${String(i)}.ts`))
  const one = mission(0, 'long', {}, lines)
  const fleet: Fleet = { squadrons: [{ key: 'agents-0', name: 'Agents', isWorkflow: false, mission: 0, drones: [drone(0, { status: 'failed' })] }] }
  const text = markdown(book({ plan: planOf([one]), fleet }))

  expect(text).toContain(`**JOURNAL** (pas encore résumé, ${String(RAW_MAX + 1)} lignes) :\n\n\`\`\`text\n… 1 ligne plus tôt\n· Lu f1.ts\n`)
  expect(text).not.toContain('· Lu f0.ts')
  expect(text).toContain(`· Lu f${String(RAW_MAX)}.ts\n\`\`\`\n\n**ESCADRILLE « Agents »** : 0 en vol, 0 au hangar, 1 perdu\n`)
  // Exactly as many as shown: none before, and a lone line is counted singular.
  const full = markdown(book({ plan: planOf([mission(0, 'plein', {}, lines.slice(1))]) }))
  expect(full).toContain(`(pas encore résumé, ${String(RAW_MAX)} lignes) :\n\n\`\`\`text\n· Lu f1.ts\n`)
  expect(markdown(book({ plan: planOf([mission(0, 'court', {}, lines.slice(0, 1))]) }))).toContain('(pas encore résumé, 1 ligne) :\n\n```text\n· Lu f0.ts\n```\n')
})
