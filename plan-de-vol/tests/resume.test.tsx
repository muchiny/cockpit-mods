import { expect, test } from 'claude-code/testing'

import { SAVED_MAX, isSavedKey, parseSaved, savedKey, stowed } from '../hooks/logbook'
import type { Saved } from '../hooks/logbook'
import { MISSIONS_MAX, newMission } from '../hooks/summary'
import type { Mission } from '../types'
import { assistant, complete, COMPOSER, CWD, endTurn, engine, HOME, PANE, prompt, shows, start, stations, step, user } from './engine'
import type { Engine, Kit } from './engine'

// What the plan leaves outside the session, as the person meets it: its copy
// in the store that a resume starts from, and `/plan-de-vol export`.

function saved(missions: Mission[], objective: string | null = 'Objectif gardé', at = 10): Saved {
  return stowed({ epoch: 0, objective, missions, pending: [] }, at)
}

// A copy as an earlier run of the session left it: two missions, summarized.
const LEFT = saved([
  { ...newMission(0, 'fais un mod'), title: 'Faire le mod', steps: [{ kind: 'done', what: 'Lu register.tsx', why: 'pour comprendre' }], logged: 2, summarized: 2 },
  { ...newMission(3, 'la suite'), title: 'Suite', steps: [{ kind: 'decision', what: 'Garder la clé', why: '' }], logged: 1, summarized: 1, waiting: 'Relis le diff' },
])
const TOLD = [user('fais un mod'), assistant('fait'), user('la suite'), assistant('fait aussi')]

function copy(kit: Kit, session = 's1'): Saved | null {
  return parseSaved(kit.kept.get(savedKey(session)))
}

function copies(kit: Kit): string[] {
  return [...kit.kept.keys()].filter(isSavedKey)
}

// What a log line says failed, without the failure itself.
function what(line: string): string {
  return line.split(' : ').slice(0, 2).join(' : ')
}

function run($: Engine, args: string) {
  return $.command.run({ command: 'plan-de-vol', args, origin: COMPOSER, presentation: { isFullscreen: true, columns: 200 } })
}

const end = ($: Engine, reason: 'clear' | 'resume' | 'other', sessionId = 's1') => $.session.end({ reason, sessionId, resume: { id: sessionId } })

test('a turn’s end keeps the plan in the store under the session’s key: as it stands while Haiku reads, with its steps after', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  // An empty plan leaves no copy.
  expect(copies(kit)).toEqual([])
  await prompt($, 'fais un mod')
  await step($, kit, 'Je lis le câblage.', [{ tool: 'Read', file_path: '/m/hooks/register.tsx' }])
  const release = kit.hold()
  await complete($)
  await kit.clock.advance(0)
  expect(kit.asks.length).toBe(1)

  const before = copy(kit)
  expect(before?.objective).toBeNull()
  expect(before?.missions.map(m => [m.prompt, m.steps, m.journal])).toEqual([['fais un mod', [], ['CLAUDE : Je lis le câblage.', '· Lu register.tsx']]])

  release()
  await kit.clock.settle()
  const after = copy(kit)
  expect(after?.objective).toBe('Logigramme de session')
  expect(after?.missions.map(m => [m.title, m.steps, m.journal, m.waiting])).toEqual([
    ['Faire le mod', [{ kind: 'done', what: 'Lu register.tsx', why: 'pour comprendre le câblage' }], [], 'Valide la maquette'],
  ])
  expect(copies(kit)).toEqual([savedKey('s1')])
  expect(kit.logs).toEqual([])
})

test('a resume starts from the session’s copy: nothing summarized is asked of Haiku again', async ($, on) => {
  const kit = engine($, on, { store: { [savedKey('s1')]: LEFT } })
  kit.rows.push(...TOLD)
  await start($, kit.clock)

  expect(kit.asks.length).toBe(0)
  expect(await stations($)).toEqual(['P1', 'P4', '« la suite »'])
  expect(await shows($, /Objectif gardé/)).toBe(true)
  expect(await shows($, /Garder la clé/)).toBe(true)
  expect(await shows($, /Relis le diff/)).toBe(true)
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'station-0' })
  expect(await ui.find({ type: 'Text', text: /pour comprendre/ })).toBeDefined()
  await ui.unmount()
  // Taken up again, the copy is the newest saved.
  expect(copy(kit)?.at).toBe(kit.clock.now())
  expect(kit.logs).toEqual([])
})

test('only the prompts typed since the copy become missions, numbered after it, and they alone are summarized', async ($, on) => {
  const kit = engine($, on, { store: { [savedKey('s1')]: LEFT } })
  kit.rows.push(...TOLD, user('depuis'), assistant('travail fait depuis'))
  await start($, kit.clock)

  expect(await stations($)).toEqual(['P1', 'P4', 'P5', '« depuis »'])
  expect(kit.asks.length).toBe(1)
  expect(kit.asks[0]).toContain('Objectif connu : Objectif gardé')
  expect(kit.asks[0]).toContain('=== MISSION P5 ===\nPROMPT : depuis\nÉtapes déjà tracées :\naucune\nJournal depuis :\nCLAUDE : travail fait depuis')
  expect(copy(kit)?.missions.map(m => m.id)).toEqual([0, 3, 4])
})

test('a copy whose last mission the transcript does not hold is taken as it is', async ($, on) => {
  const kit = engine($, on, { store: { [savedKey('s1')]: LEFT } })
  kit.rows.push(user('une autre histoire'), assistant('sans rapport'))
  await start($, kit.clock)

  expect(await stations($)).toEqual(['P1', 'P4', '« la suite »'])
  expect(kit.asks.length).toBe(0)
})

test('a plan restored and caught up keeps to the missions a plan holds, the oldest leaving', async ($, on) => {
  const many = Array.from({ length: MISSIONS_MAX }, (_, i) => newMission(i, `m${String(i)}`))
  const kit = engine($, on, { store: { [savedKey('s1')]: saved(many) }, isPlaced: false })
  kit.rows.push(user(`m${String(MISSIONS_MAX - 1)}`), assistant('fait'), user('n1'), assistant('fait'), user('n2'), assistant('fait'))
  await start($, kit.clock)
  await run($, 'export /vol.md')

  const [file] = kit.files
  expect(file?.text).toContain(`- Contrats : ${String(MISSIONS_MAX)}\n`)
  expect(file?.text).not.toContain('## P2 · ')
  expect(file?.text).toContain('## P3 · « m2 »')
  expect(file?.text).toContain(`## P${String(MISSIONS_MAX + 2)} · « n2 »`)
})

test('a stored value that is no copy of this version is left unread: the transcript gives the plan', async ($, on) => {
  const kit = engine($, on, { store: { [savedKey('s1')]: { at: 10, objective: null, missions: 'aucune' }, 'plan-0:s1': LEFT } })
  kit.rows.push(user('raconté'), assistant('fait'))
  await start($, kit.clock)

  expect(await stations($)).toEqual(['P1', '« raconté »'])
  expect(await shows($, /Objectif gardé/)).toBe(false)
  // The turn's copy takes the place of what was there.
  expect(copy(kit)?.missions.map(m => m.prompt)).toEqual(['raconté'])
  expect(kit.logs).toEqual([])
})

test('a session whose id cannot be read finds no copy and leaves none, each said in the log; the transcript still gives the plan', async ($, on) => {
  const kit = engine($, on, { store: { [savedKey('s1')]: LEFT }, failing: ['session.id'] })
  kit.rows.push(user('raconté'), assistant('fait'))
  await start($, kit.clock)

  expect(await stations($)).toEqual(['P1', '« raconté »'])
  expect(kit.asks.length).toBe(1)
  // The copy unread at the seed, unwritten after the summary.
  expect(kit.logs.map(what)).toEqual(['plan-de-vol : sauvegarde', 'plan-de-vol : sauvegarde'])
  // A turn's end: unwritten before the summary and after it.
  await prompt($, 'encore')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/a.ts' }])
  await endTurn($, kit.clock)
  expect(kit.logs.map(what)).toEqual(Array.from({ length: 4 }, () => 'plan-de-vol : sauvegarde'))
  expect(copy(kit)).toEqual(LEFT)
})

test('a transcript that cannot be read costs the prompts typed since the copy, never the copy', async ($, on) => {
  const kit = engine($, on, { store: { [savedKey('s1')]: LEFT }, isTranscriptLost: true })
  await start($, kit.clock)

  expect(await stations($)).toEqual(['P1', 'P4', '« la suite »'])
  expect(kit.logs.map(what)).toEqual(['plan-de-vol : résumé'])
})

test('two seeds at once restore the copy once; one a /clear overtakes writes nothing', async ($, on) => {
  const kit = engine($, on, { store: { [savedKey('s1')]: LEFT } })
  kit.rows.push(...TOLD, user('depuis'), assistant('fait'))
  // Two seeds read the copy, then the transcript, at once: the session's catch-up and the prompt's.
  const release = kit.holdMessages()
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const submitting = $.prompt.submit({ text: 'nouveau', wait: false, origin: COMPOSER })
  await kit.clock.advance(0)
  release()
  await submitting
  await kit.clock.settle()
  expect(await stations($)).toEqual(['P1', 'P4', 'P5', 'P6', '« nouveau »'])

  // A copy read before a /clear is not written over the plan after it: the
  // session comes back into s1, whose copy the store holds, and is cleared
  // while that copy is being read.
  await end($, 'clear')
  kit.resumeInto('s1')
  await end($, 'resume', 's2')
  expect(copy(kit)?.missions.length).toBeGreaterThan(0)
  const free = kit.holdStore()
  const seeding = $.prompt.submit({ text: 'après', wait: false, origin: COMPOSER })
  await kit.clock.advance(0)
  await end($, 'clear', 's1')
  free()
  await seeding
  expect(await stations($)).toEqual(['P1', '« après »'])
})

test('a /clear keeps the ended session’s copy and the next session writes its own; a resume finds the copy of the session it returns to', async ($, on) => {
  const elsewhere = saved([{ ...newMission(0, 'ailleurs'), title: 'Ailleurs', steps: [{ kind: 'done', what: 'Posé la balise', why: '' }] }], 'Autre objectif', 3)
  const kit = engine($, on, { store: { [savedKey('s7')]: elsewhere } })
  await start($, kit.clock)
  await prompt($, 'ici')
  await endTurn($, kit.clock)

  await end($, 'clear')
  expect(await shows($, /En attente du premier contrat/)).toBe(true)
  await prompt($, 'après le clear')
  await endTurn($, kit.clock)
  expect(copy(kit, 's1')?.missions.map(m => m.prompt)).toEqual(['ici'])
  expect(copy(kit, 's2')?.missions.map(m => m.prompt)).toEqual(['après le clear'])

  kit.resumeInto('s7')
  await end($, 'resume', 's2')
  await prompt($, 'on reprend')
  await kit.clock.settle()
  expect(await stations($)).toEqual(['P1', 'P2', '« on reprend »'])
  expect(await shows($, /Autre objectif/)).toBe(true)
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'station-0' })
  expect(await ui.find({ type: 'Text', text: /Posé la balise/ })).toBeDefined()
  await ui.unmount()
  expect(copy(kit, 's2')?.missions.map(m => m.prompt)).toEqual(['après le clear'])
})

test('what a session leaves at its end is written whole, under the id it ends with', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'garde-moi')
  // A line still waiting for its write.
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/a.ts' }])
  await kit.clock.advance(7000)
  await end($, 'other', 'celle-qui-finit')

  const left = copy(kit, 'celle-qui-finit')
  expect(left?.missions.map(m => [m.prompt, m.journal])).toEqual([['garde-moi', ['· Lu a.ts']]])
  expect(left?.at).toBe(kit.clock.now())
  expect(copies(kit)).toEqual([savedKey('celle-qui-finit')])
})

test('a run no surface draws (-p) leaves no copy, at a turn’s end or at its own', async ($, on) => {
  const kit = engine($, on, { isPlaced: false })
  await start($, kit.clock, false)
  await prompt($, 'en une fois')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/a.ts' }])
  await endTurn($, kit.clock)
  await end($, 'other')

  expect(copies(kit)).toEqual([])
})

test('the store keeps the twelve newest copies: past them the oldest saved leaves, one that reads as nothing first', async ($, on) => {
  const old = Object.fromEntries(Array.from({ length: SAVED_MAX }, (_, i) => [savedKey(`vieux-${String(i)}`), saved([newMission(0, 'vieux')], null, i)]))
  // The unreadable one is older than any date: it leaves before a copy saved at 0 or at 1.
  const kit = engine($, on, { store: { [savedKey('abîmé')]: { at: 'hier' }, ...old, backdrop: 'clear' } })
  await kit.clock.advance(1000)
  await start($, kit.clock)
  await prompt($, 'le plus récent')
  await endTurn($, kit.clock)

  const kept = Array.from({ length: SAVED_MAX - 1 }, (_, i) => savedKey(`vieux-${String(i + 1)}`))
  expect((copies(kit)).sort()).toEqual([savedKey('s1'), ...kept].sort())
  // What else the store holds stays.
  expect(kit.kept.get('backdrop')).toBe('clear')
})

test('a copy that cannot be written as a session is cleared holds nothing back: the plan is emptied all the same', async ($, on) => {
  const kit = engine($, on, { failing: ['ui.panes'] })
  await start($, kit.clock)
  await prompt($, 'ancienne conversation')
  await end($, 'clear')

  expect(await shows($, /En attente du premier contrat/)).toBe(true)
  expect(kit.logs.some(line => line.startsWith('plan-de-vol : sauvegarde : '))).toBe(true)
  expect(copies(kit)).toEqual([])
})

test('/plan-de-vol export writes the logbook under the home’s Claude Code folder and says where; the pane is left as it is', async ($, on) => {
  // Closed by the person: an export does not open it again.
  const kit = engine($, on, { store: { closed: true } })
  await start($, kit.clock)
  await prompt($, 'fais un mod')
  await step($, kit, 'Je lis le câblage.', [{ tool: 'Read', file_path: '/m/hooks/register.tsx' }])
  await endTurn($, kit.clock)

  const path = `${HOME}/.claude/plan-de-vol/2026-11-14-0242-s1.md`
  expect((await run($, 'export')).text).toBe(`Plan de vol exporté : ${path}`)
  expect(kit.files).toEqual([
    {
      path,
      text: `# Plan de vol — 2026-11-14 02:42

- Session : \`s1\`
- Dossier : \`${CWD}\`
- Contrats : 1

## OBJECTIF

_Trajectoire non calculée._

## P1 · « fais un mod »

> fais un mod

**JOURNAL** (pas encore résumé, 2 lignes) :

\`\`\`text
CLAUDE : Je lis le câblage.
· Lu register.tsx
\`\`\`
`,
    },
  ])
  expect(kit.runs).toEqual([{ argv: ['date', '+%Y-%m-%d %H:%M'], timeoutMs: 2000 }])
  expect(kit.opens).toEqual([])
  expect(kit.kept.get('closed')).toBe(true)
  expect(kit.kept.has('fullscreen')).toBe(false)
})

test('an export says the plan as the pane draws it: the squadron in flight, the question asked, the lines still waiting for their write', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'lance la revue')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/hooks/register.tsx' }])
  await endTurn($, kit.clock)
  await prompt($, 'et maintenant ?')
  await $.agent.spawn({
    prompt: 'relis',
    description: 'relecture',
    subagentType: 'general-purpose',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'claude-opus-5-5',
    fork: false,
    background: true,
    tool_use_id: 'call-relecture',
  })
  const answer = kit.holdToolOf('AskUserQuestion')
  const asking = $.tool.call({ tool: 'AskUserQuestion', tool_use_id: 'q1', questions: [{ question: 'Laquelle des deux ?', header: 'Choix', options: [], multiSelect: false }] })
  await kit.clock.advance(0)

  await run($, 'Export /var/tmp/Vol.md')
  const [file] = kit.files
  expect(file?.path).toBe('/var/tmp/Vol.md')
  expect(file?.text).toContain('## OBJECTIF\n\nLogigramme de session\n\n## P1 · Faire le mod\n\n> lance la revue\n\n- **Fait** : Lu register.tsx — pour comprendre le câblage\n\n## P2 · « et maintenant ? »')
  expect(file?.text).toContain('· Question pour toi\n```\n\n**ESCADRILLE « Agents »** : 1 en vol, 0 au hangar\n- en vol : relecture\n\n**À VOUS** : Laquelle des deux ?\n')
  answer()
  await asking
})

test('an export asked right after a resume, before any prompt, writes the plan of the session returned to', async ($, on) => {
  const kit = engine($, on, { store: { [savedKey('s7')]: LEFT } })
  await start($, kit.clock)
  await prompt($, 'ici')
  await endTurn($, kit.clock)
  kit.resumeInto('s7')
  await end($, 'resume')

  expect((await run($, 'export /vol.md')).text).toBe('Plan de vol exporté : /vol.md')
  const [file] = kit.files
  expect(file?.text).toContain('- Session : `s7`\n')
  expect(file?.text).toContain('## OBJECTIF\n\nObjectif gardé\n\n## P1 · Faire le mod\n\n> fais un mod\n\n- **Fait** : Lu register.tsx — pour comprendre\n\n## P4 · Suite')
  expect(file?.text).not.toContain('> ici')
  // Read back from the copy: no model is called for it.
  expect(kit.asks.length).toBe(0)
})

test('an export that cannot read the session back says the plan empty, and the failure in the log', async ($, on) => {
  const kit = engine($, on, { isTranscriptLost: true })
  await start($, kit.clock)

  expect((await run($, 'export')).text).toBe('Plan de vol vide : rien à exporter.')
  expect(kit.logs.map(what)).toEqual(['plan-de-vol : résumé', 'plan-de-vol : reprise'])
  expect(kit.files).toEqual([])
})

test('an export takes the path asked for, in its own case: from the session’s folder, from the home, or as given', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'fais un mod')
  await endTurn($, kit.clock)

  expect((await run($, 'export notes/Vol.md')).text).toBe(`Plan de vol exporté : ${CWD}/notes/Vol.md`)
  expect((await run($, ' EXPORT   ~/Docs/Vol.md ')).text).toBe(`Plan de vol exporté : ${HOME}/Docs/Vol.md`)
  expect(kit.files.map(file => file.path)).toEqual([`${CWD}/notes/Vol.md`, `${HOME}/Docs/Vol.md`])
  // A word that only starts like it is no export: the pane opens and says the words it knows.
  expect((await run($, 'exporter')).text).toBe('Plan de vol ouvert (« exporter » : transparent, gris ou export). Pour naviguer : ctrl+x tab, puis q précédent, d suivant, z position.')
  expect(kit.files.length).toBe(2)
})

for (const [why, time] of [
  ['fails', () => null],
  [
    'cannot run',
    () => {
      throw new Error('date introuvable')
    },
  ],
] as const) {
  test(`with no home and a date that ${why}, the logbook goes to the session’s folder under the clock’s time, said as UTC`, async ($, on) => {
    const kit = engine($, on, { home: null, time })
    await kit.clock.advance((3 * 60 + 7) * 60_000)
    await start($, kit.clock)
    await prompt($, 'fais un mod')

    const path = `${CWD}/plan-de-vol-1970-01-01-0307-s1.md`
    expect((await run($, 'export')).text).toBe(`Plan de vol exporté : ${path}`)
    expect(kit.files.map(file => [file.path, file.text.split('\n')[0]])).toEqual([[path, '# Plan de vol — 1970-01-01 03:07 UTC']])
  })
}

test('an empty plan exports nothing and says so; a file that cannot be written is said with its path', async ($, on) => {
  const kit = engine($, on, { failing: ['fs.write'] })
  await start($, kit.clock)
  expect((await run($, 'export')).text).toBe('Plan de vol vide : rien à exporter.')
  expect(kit.runs).toEqual([])

  await prompt($, 'fais un mod')
  expect((await run($, 'export')).text).toStartWith(`Export impossible vers ${HOME}/.claude/plan-de-vol/2026-11-14-0242-s1.md : `)
  expect(kit.files).toEqual([])
})
