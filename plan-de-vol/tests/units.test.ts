import { expect, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'

import { band, flowchart, objectiveRow, palette, route, waitingOf } from '../hooks/chart'
import type { FlowchartArgs, Row } from '../hooks/chart'
import { EMPTY_FLEET, SQUADRONS_MAX, STALE_MS, act, hasRunning, isFlying, land, launch, nameSquadron, reconcile, seen, squadronKey } from '../hooks/fleet'
import type { Stamp } from '../hooks/fleet'
import {
  QUEUE_MS,
  JOURNAL_MAX,
  MISSIONS_MAX,
  STEPS_MAX,
  addLines,
  addMission,
  alignBatch,
  attempted,
  appendSteps,
  batchPrompt,
  freshLines,
  groupsOf,
  incrementPrompt,
  isBehind,
  label,
  logLines,
  logOf,
  question,
  workflowName,
  parseBatch,
  parseIncrement,
  promptText,
  restamp,
  rawActions,
  rowLines,
  settled,
  stripEngineTags,
  takePending,
  toolLine,
} from '../hooks/summary'
import { basename, clip, plural, squeeze, wrap } from '../hooks/text'
import type { Drone, Live, Mission, Pending, Plan, Step } from '../types'

// The pure parts, with no engine: what a mission's journal keeps, what
// Haiku's reply becomes, how a fleet's bookkeeping folds, and the drawing.

function user(text: string, isToolResult = false): SessionMessage {
  return {
    role: 'user',
    text,
    toolUses: [],
    ...(isToolResult ? { toolResults: [{ tool_use_id: 'r1', text: 'ok', isError: false }] } : {}),
  }
}

function assistant(text: string, tools: [string, Record<string, unknown>, boolean?][] = []): SessionMessage {
  return {
    role: 'assistant',
    text,
    toolUses: tools.map(([tool, input, isError], i) => ({ tool_use_id: `u${i}`, tool, input, ...(isError ? { isError: true } : {}) })),
  }
}

function mission(over: Partial<Mission> = {}): Mission {
  return { id: 0, prompt: 'p', title: null, steps: [], earlier: 0, waiting: null, journal: [], logged: 0, summarized: 0, attempted: 0, ...over }
}

function drone(id: string, over: Partial<Drone> = {}): Drone {
  return { id, label: id, status: 'running', action: null, seenAt: 0, ...over }
}

const IDLE: Live = { isWorking: false, action: null, question: null, summarizing: [] }
const AT: Stamp = { mission: 0, now: 1000 }

function chart(over: Partial<FlowchartArgs>): Row[] {
  return flowchart({ mission: mission(), isLast: false, live: IDLE, look: 'dark', squadrons: [], now: 0, columns: 60, rows: 60, ...over })
}

function text(row: Row): string {
  return row.map(seg => seg.text).join('')
}

test('a prompt is the person’s words, not the engine’s blocks', () => {
  expect(promptText(user('<system-reminder>rappel</system-reminder>\nfais un mod'))).toBe('fais un mod')
  expect(promptText(user('<system-reminder>rappel</system-reminder>'))).toBe(null)
  expect(promptText(user('Base directory for this skill: /x'))).toBe(null)
  expect(promptText(user('[Request interrupted by user]'))).toBe(null)
  // Every block the engine writes, as many as a row holds.
  for (const tag of ['system-reminder', 'command-name', 'command-message', 'command-args', 'local-command-stdout', 'local-command-stderr', 'local-command-caveat', 'task-notification', 'user-prompt-submit-hook']) {
    expect(promptText(user(`<${tag} id="1">du moteur</${tag}>`))).toBe(null)
  }
  expect(stripEngineTags('<command-name>/x</command-name>avant<command-args>a</command-args> après')).toBe('avant après')
  expect(promptText(user('message rangé avec un résultat', true))).toBe(null)
  expect(promptText(assistant('je réponds'))).toBe(null)
  // A tag the person typed is their words.
  expect(stripEngineTags('Pourquoi <span>bonjour</span> ne s’affiche pas ?')).toBe('Pourquoi <span>bonjour</span> ne s’affiche pas ?')
  expect(promptText(user('<example>un cas</example>'))).toBe('<example>un cas</example>')
})

test('each prompt is found at its row', () => {
  const rows = [user('P1'), assistant('a'), user('ok', true), user('P2'), assistant('b')]

  expect(groupsOf(rows)).toEqual([
    { prompt: 'P1', start: 0 },
    { prompt: 'P2', start: 3 },
  ])
})

test('a transcript row reads as the lines the live hooks would have written', () => {
  const lines = rowLines(
    assistant('Je lance les tests.', [
      ['Bash', { description: 'Lance les tests' }, true],
      ['Read', { file_path: '/a/b/register.tsx' }],
    ]),
  )

  expect(lines).toEqual(['CLAUDE : Je lance les tests.', '· Lance les tests', '  ↳ ÉCHEC : Lance les tests', '· Lu register.tsx'])
  expect(rowLines(user('P1'))).toEqual([])
})

test('a journal keeps its newest lines; the steps cover what the summary read', () => {
  const many = Array.from({ length: JOURNAL_MAX + 10 }, (_, i) => toolLine(`a${i}`))
  const full = addLines(mission(), many)

  expect(full.journal.length).toBe(JOURNAL_MAX)
  expect(full.logged).toBe(JOURNAL_MAX + 10)
  // Nothing summarized yet: all the journal kept is fresh.
  expect(freshLines(full).length).toBe(JOURNAL_MAX)

  // A summary read 3 lines; 2 more came in while it ran: they stay fresh.
  const read = addLines(mission(), [toolLine('a'), toolLine('b'), toolLine('c')])
  const grown = addLines(read, [toolLine('d'), toolLine('e')])
  const after = appendSteps(grown, [{ kind: 'done', what: 'x', why: '' }], read.logged)

  expect(rawActions(after)).toEqual(['d', 'e'])
  expect(after.journal).toEqual(['· d', '· e'])
  expect(freshLines(appendSteps(after, [], after.logged))).toEqual([])
})

test('a tool call reads in a few words', () => {
  expect(label('Bash', { command: 'cargo test', description: 'Lance les tests' })).toBe('Lance les tests')
  expect(label('Bash', { command: 'ls -la' })).toBe('ls -la')
  expect(label('Edit', { file_path: '/home/x/hooks/chart.ts' })).toBe('Écrit chart.ts')
  expect(label('Workflow', { script: "export const meta = { name: 'review-changes', description: 'x' }" })).toBe(
    'Flotte : review-changes',
  )
  expect(label('mcp__github__list_issues', {})).toBe('github · list_issues')
})

test('Haiku’s reply: the JSON wherever it sits, unknown kinds as done, steps without a what dropped', () => {
  const reply = [
    'Voici :',
    '```json',
    '{"objective":"O","title":"T","steps":[{"kind":"fail","what":"tsc","why":"erreur"},{"kind":"bizarre","what":"x"},{"why":"rien"}],"waiting":""}',
    '```',
  ].join('\n')

  expect(parseIncrement(reply)).toEqual({
    objective: 'O',
    title: 'T',
    steps: [
      { kind: 'fail', what: 'tsc', why: 'erreur' },
      { kind: 'done', what: 'x', why: '' },
    ],
    waiting: null,
  })
  expect(parseIncrement('pas de JSON')).toBe(null)
  expect(parseIncrement('{ cassé')).toBe(null)
  expect(parseBatch('{"objective":"O","missions":[{"n":1,"title":"A","steps":[],"waiting":null},{}]}')).toEqual({
    objective: 'O',
    missions: [
      { n: 1, title: 'A', steps: [], waiting: null },
      { n: null, title: null, steps: [], waiting: null },
    ],
  })
})

test('a batch reply lands by mission number: one Haiku skipped shifts no other', () => {
  const entry = (n: number | null, title: string) => ({ n, title, steps: [], waiting: null })
  const numbered = alignBatch({ objective: null, missions: [entry(1, 'A'), entry(3, 'C')] }, 3)

  expect(numbered.map(e => e?.title)).toEqual(['A', undefined, 'C'])
  // No numbers at all: by position.
  const bare = alignBatch({ objective: null, missions: [entry(null, 'A'), entry(null, 'B')] }, 3)
  expect(bare.map(e => e?.title)).toEqual(['A', 'B', undefined])
})

test('a log that just fits its share is sent whole; one character more is cut from the front', () => {
  const fits = addLines(mission({ prompt: 'P1' }), ['x'.repeat(12_000)])
  expect(batchPrompt('O', [fits])).toContain(`Journal depuis :\n${'x'.repeat(12_000)}`)
  const over = addLines(mission({ prompt: 'P1' }), ['y'.repeat(12_001)])
  expect(batchPrompt('O', [over])).toContain(`Journal depuis :\n…\n${'y'.repeat(12_000)}`)
})

test('a batch prompt gives each mission its drawn steps and only its fresh lines', () => {
  const done: Step = { kind: 'done', what: 'Lu le code', why: 'pour comprendre' }
  const summarized = appendSteps(addLines(mission({ prompt: 'P1' }), [toolLine('vieux')]), [done], 1)
  const prompt = batchPrompt('O', [addLines(summarized, [toolLine('neuf')]), addLines(mission({ id: 1, prompt: 'P2' }), [toolLine('autre')])])

  expect(prompt).toContain('=== MISSION 1 ===')
  expect(prompt).toContain('- [done] Lu le code — pour comprendre')
  expect(prompt).toContain('· neuf')
  expect(prompt).not.toContain('vieux')
  expect(prompt).toContain('=== MISSION 2 ===\nPROMPT : P2')
})

test('new steps come after the drawn ones, the oldest past the cap counted, not lost from the fold', () => {
  const step = (n: number): Step => ({ kind: 'done', what: `s${n}`, why: '' })
  const before = mission({ steps: Array.from({ length: STEPS_MAX }, (_, i) => step(i)), earlier: 2 })
  const after = appendSteps(before, [step(100)], 0)

  expect(after.steps.length).toBe(STEPS_MAX)
  expect(after.steps[0]?.what).toBe('s1')
  expect(after.steps[after.steps.length - 1]?.what).toBe('s100')
  expect(after.earlier).toBe(3)
  // The fold counts the cards out of the room and the steps no longer kept.
  const lines = chart({ mission: after, rows: 10 }).map(text)
  expect(lines[0]).toContain(`${STEPS_MAX + 3 - 2} étapes plus haut`)
  expect(incrementPrompt(null, [], after, '')).toContain('(3 étapes plus anciennes)')
})

test('a mission is behind while lines came since its steps and since the completion that failed on them', () => {
  expect(isBehind(mission({ logged: 3, summarized: 3 }))).toBe(false)
  expect(isBehind(mission({ logged: 4, summarized: 3 }))).toBe(true)
  expect(isBehind(mission({ logged: 4, summarized: 3, attempted: 4 }))).toBe(false)
  expect(isBehind(mission({ logged: 5, summarized: 3, attempted: 4 }))).toBe(true)
})

test('an increment names the newest earlier missions by their number', () => {
  const before = Array.from({ length: 10 }, (_, i) => mission({ id: i, prompt: `vieux ${i}`, title: i === 9 ? 'Titre neuf' : null }))
  const prompt = incrementPrompt('O', before, mission({ id: 10, prompt: 'actuel' }), '· x')

  expect(prompt).toContain('P10 Titre neuf')
  expect(prompt).toContain('P3 vieux 2')
  expect(prompt).not.toContain('vieux 1 ;')
  expect(prompt).toContain('=== MISSION P11 ===')
})

test('a turn opens the pending prompts it starts with, and no other', () => {
  const pending = (entered: string, isCommand = false, at = 0): Pending => ({ entered, shown: entered, isCommand, isPerson: true, at })
  const queued = [pending('deux'), pending('trois')]

  // Its own text: that one, the next stays.
  expect(takePending(queued, 'deux', 0)).toEqual({ taken: [queued[0]], left: [queued[1]] })
  // An older prompt stays, as does a command submitted after.
  const around = [pending('un'), pending('deux'), pending('/x', true)]
  expect(takePending(around, 'deux', 0)).toEqual({ taken: [around[1]], left: [around[0], around[2]] })
  // Joined prompts take no command whose text one of them holds.
  const inner = [pending('a'), pending('b /x'), pending('/x', true)]
  expect(takePending(inner, 'a\nb /x', 0).taken).toEqual([inner[0], inner[1]])
  // Half the turn's text is enough to be its prompt.
  const half = [pending('ab')]
  expect(takePending(half, 'ab c', 0).taken).toEqual([half[0]])
  // Joined into one turn by the engine: both, in order.
  expect(takePending(queued, 'deux\n\ntrois', 0).taken).toEqual(queued)
  // A notification's turn, a continuation: none.
  expect(takePending(queued, '<task-notification>fini</task-notification> trois fois rien', 0).taken).toEqual([])
  expect(takePending(queued, '', 0).taken).toEqual([])
  // A command whatever its turn's text, while it is fresh; stale, it leaves.
  const command = pending('/code-review high', true, 0)
  expect(takePending([command], 'Review the diff…', QUEUE_MS).taken).toEqual([command])
  expect(takePending([command], 'Review the diff…', QUEUE_MS + 1)).toEqual({ taken: [], left: [] })
  // A turn of nothing but the engine's blocks (a notification's) is no command's.
  expect(takePending([command], '<task-notification>fini</task-notification>', 0).taken).toEqual([])
  // The newest command, and the ones before what a turn took leave with it.
  const older = pending('/config', true, 0)
  expect(takePending([older, command], 'Review the diff…', 0)).toEqual({ taken: [command], left: [] })
  expect(takePending([older, queued[0] ?? older], 'deux', 0)).toEqual({ taken: [queued[0]], left: [] })
  // The end of the turn they waited behind restarts their clock.
  expect(restamp([command, older], 500).map(p => p.at)).toEqual([500, 500])
  // A prompt of attachments alone starts a turn with no text.
  const image = pending('')
  expect(takePending([image], '', 0).taken).toEqual([image])
})

test('a resumed agent flies again under the mission that resumed it, and only there', () => {
  let fleet = launch(undefined, 'a1', 'a1')(EMPTY_FLEET, { mission: 0, now: 0 })
  fleet = land('a1', 'done')(fleet, AT)
  fleet = launch(undefined, 'a1', 'a1')(fleet, { mission: 1, now: 5 })
  fleet = land('a1', 'done')(fleet, AT)

  expect(fleet.squadrons.map(s => s.key)).toEqual(['agents-1'])
  expect(fleet.squadrons[0]?.drones).toEqual([{ id: 'a1', label: 'a1', status: 'done', action: null, seenAt: 1000 }])
  expect(isFlying(fleet, 1000)).toBe(false)
})

test('a resumed agent leaves its old squadron, which keeps its others; only an empty Agents squadron goes', () => {
  const workflow = { toolUseId: 'wf1', runId: 'wf_1' }
  let fleet = launch(undefined, 'a1', 'a1')(EMPTY_FLEET, { mission: 0, now: 0 })
  fleet = launch(undefined, 'a2', 'a2')(fleet, { mission: 0, now: 0 })
  fleet = launch(workflow, 'w1', 'w1')(fleet, { mission: 0, now: 0 })
  fleet = launch(undefined, 'a3', 'a3')(fleet, { mission: 1, now: 0 })
  // Named by its workflow only once the Workflow call says how.
  expect(fleet.squadrons.map(s => [s.key, s.name])).toEqual([
    ['agents-0', 'Agents'],
    ['wf1', 'workflow'],
    ['agents-1', 'Agents'],
  ])

  fleet = launch(undefined, 'a1', 'a1')(fleet, { mission: 2, now: 5 })
  fleet = launch(undefined, 'w1', 'w1')(fleet, { mission: 2, now: 5 })
  fleet = launch(undefined, 'a3', 'a3')(fleet, { mission: 2, now: 5 })
  expect(fleet.squadrons.map(s => [s.key, s.drones.map(d => d.id)])).toEqual([
    ['agents-0', ['a2']],
    ['wf1', []],
    ['agents-2', ['a1', 'w1', 'a3']],
  ])
  // A change reaches the squadron it names, not the others.
  expect(nameSquadron('wf1', 'audit')(fleet, AT).squadrons.map(s => s.name)).toEqual(['Agents', 'audit', 'Agents'])
})

test('a sign of life stamps a flying drone, not a landed one', () => {
  const flying = launch(undefined, 'a1', 'a1')(EMPTY_FLEET, { mission: 0, now: 0 })
  expect(seen('a1')(flying, AT).squadrons[0]?.drones[0]?.seenAt).toBe(1000)
  const landed = land('a1', 'done')(flying, { ...AT, now: 10 })
  expect(seen('a1')(landed, AT).squadrons[0]?.drones[0]?.seenAt).toBe(10)
})

test('a fleet launches, acts and lands; an unknown agent changes nothing', () => {
  const workflow = { toolUseId: 'wf1', runId: 'wf_1' }
  let fleet = launch(workflow, 'a1', 'a1')(EMPTY_FLEET, AT)
  fleet = launch(workflow, 'a2', 'a2')(fleet, AT)
  fleet = act('a1', 'Lu foo.rs')(fleet, { ...AT, now: 2000 })
  fleet = land('a2', 'done')(fleet, AT)

  expect(squadronKey(workflow, 0)).toBe('wf1')
  expect(squadronKey(undefined, 3)).toBe('agents-3')
  expect(fleet.squadrons.length).toBe(1)
  expect(fleet.squadrons[0]?.drones).toEqual([
    { id: 'a1', label: 'a1', status: 'running', action: 'Lu foo.rs', seenAt: 2000 },
    { id: 'a2', label: 'a2', status: 'done', action: null, seenAt: 1000 },
  ])
  expect(isFlying(fleet, 2000)).toBe(true)
  expect(act('inconnu', 'x')(fleet, AT)).toEqual(fleet)
  expect(isFlying(land('a1', 'failed')(fleet, AT), 2000)).toBe(false)
})

test('an agent started before any prompt is not drawn', () => {
  expect(launch(undefined, 'a1', 'a1')(EMPTY_FLEET, { mission: -1, now: 0 })).toBe(EMPTY_FLEET)
})

test('a drone silent too long no longer counts as flying; the engine’s list lands the ones it knows ended', () => {
  const fleet = launch(undefined, 'a1', 'a1')(EMPTY_FLEET, AT)

  expect(isFlying(fleet, AT.now + STALE_MS)).toBe(true)
  expect(isFlying(fleet, AT.now + STALE_MS + 1)).toBe(false)
  // Silent, it is still not known to have landed.
  expect(hasRunning(fleet)).toBe(true)
  expect(hasRunning(land('a1', 'done')(fleet, AT))).toBe(false)
  // One drone of the squadron still flying beside one landed: some drone runs.
  expect(hasRunning(launch(undefined, 'a2', 'a2')(land('a1', 'done')(fleet, AT), AT))).toBe(true)
  const landed = reconcile([{ id: 'a1', status: 'killed' }])(fleet, AT)
  expect(landed.squadrons[0]?.drones[0]?.status).toBe('failed')
  expect(reconcile([{ id: 'a1', status: 'failed' }])(fleet, AT).squadrons[0]?.drones[0]?.status).toBe('failed')
  expect(reconcile([{ id: 'a1', status: 'running' }])(fleet, AT)).toEqual(fleet)
})

test('the fleet keeps its newest squadrons only', () => {
  let fleet = EMPTY_FLEET
  for (let i = 0; i < SQUADRONS_MAX + 5; i++) fleet = launch(undefined, `a${i}`, `a${i}`)(fleet, { mission: i, now: 0 })

  expect(fleet.squadrons.length).toBe(SQUADRONS_MAX)
  expect(fleet.squadrons[0]?.key).toBe('agents-5')
})

test('the route keeps the chosen station in sight', () => {
  const missions = Array.from({ length: 20 }, (_, i) => mission({ id: i, prompt: `P${i + 1}` }))
  const early = route(missions, 3, IDLE, 'dark', 40)
  const late = route(missions, 19, IDLE, 'dark', 40)

  expect(early.stations.some(s => s.id === 3 && s.isChosen && s.label === 'P4')).toBe(true)
  expect(late.stations[late.stations.length - 1]?.id).toBe(19)
  expect(late.stations.length).toBeLessThan(20)
  // Earlier stations out of the window: the track says so.
  expect(text(late.track)).toContain('┄')
})

test('a fix loops back to the failure it answers, and every card row is as wide as the card', () => {
  const steps: Step[] = [
    { kind: 'done', what: 'Lu les API', why: 'pour savoir' },
    { kind: 'fail', what: 'tsc : une erreur', why: 'mauvais type' },
    { kind: 'fix', what: 'Corrigé le type', why: 'tsc passe' },
  ]
  const lines = chart({ mission: mission({ steps }), isLast: true }).map(text)

  expect(lines.some(line => line.endsWith('◀─╮'))).toBe(true)
  expect(lines.some(line => line.endsWith('──╯'))).toBe(true)
  // At 60 columns a card is 54 wide (less the margin and the loop's gutter):
  // its right edge stands at column 56 on every row, the loop drawn past it.
  const edge = 2 + 54
  const cards = lines.filter(line => line.startsWith('  ╭') || line.startsWith('  │') || line.startsWith('  ╰'))
  expect(cards.length).toBeGreaterThan(6)
  for (const line of cards) expect(['╮', '│', '╯']).toContain(Array.from(line)[edge - 1])
})

test('a count says its noun singular up to one, as French does', () => {
  expect([0, 1, 2].map(n => plural(n, 'perdu'))).toEqual(['0 perdu', '1 perdu', '2 perdus'])
})

test('a fleet card counts its drones and names the ones flying', () => {
  const drones: Drone[] = [
    drone('a', { label: 'review:bugs', action: 'Lu foo.rs', seenAt: 0 }),
    drone('b', { label: 'review:perf', status: 'done' }),
    drone('c', { label: 'review:secu', status: 'failed' }),
    drone('d', { label: 'review:vieux', seenAt: -STALE_MS - 1 }),
  ]
  const squadrons = [{ key: 'wf1', name: 'review-changes', isWorkflow: true, mission: 0, drones }]
  const lines = chart({ squadrons }).map(text)

  expect(lines.some(line => line.includes('ESCADRILLE · review-changes'))).toBe(true)
  expect(lines.some(line => line.includes('⟳ 1 en vol') && line.includes('✓ 1 au hangar ') && line.includes('× 1 perdu '))).toBe(true)
  expect(lines.some(line => line.includes('○ 1 en silence radio'))).toBe(true)
  expect(lines.some(line => line.includes('review:bugs · Lu foo.rs'))).toBe(true)
})

test('an older mission’s unsummarized work still shows, in its journal card', () => {
  const lines = chart({ mission: addLines(mission(), [toolLine('Lu README.md')]), isLast: false }).map(text)

  expect(lines.some(line => line.includes('JOURNAL'))).toBe(true)
  expect(lines.some(line => line.includes('· Lu README.md'))).toBe(true)
})

test('the glass follows the theme’s lightness; an unknown one gets none', () => {
  const steps: Step[] = [{ kind: 'done', what: 'x', why: '' }]
  const fills = (look: 'dark' | 'light' | 'plain') =>
    chart({ mission: mission({ steps }), look, columns: 40, rows: 40 })
      .flat()
      .map(seg => seg.bg)

  expect(fills('dark')).toContain(palette('dark').done)
  expect(fills('light')).toContain(palette('light').done)
  expect(fills('light')).not.toContain(palette('dark').done)
  expect(fills('plain').every(bg => bg === undefined)).toBe(true)
})

test('text helpers cut and wrap by code points', () => {
  expect(clip('abcdef', 4)).toBe('abc…')
  expect(clip('  a   b ', 10)).toBe('a b')
  expect(wrap('un deux trois quatre', 9)).toEqual(['un deux', 'trois', 'quatre'])
  // Each emoji is one point, two UTF-16 units: none is cut in half.
  expect(squeeze('😀😀😀😀😀😀', 4)).toBe('😀😀 … 😀😀')
})

test('a question asked during the turn shows before the work going on; what a summary waits for, only between turns', () => {
  const asking = chart({ isLast: true, live: { ...IDLE, isWorking: true, action: 'Question pour toi', question: 'Quelle couleur ?' } }).map(text)
  expect(asking.some(line => line.includes('À VOUS'))).toBe(true)
  expect(asking.some(line => line.includes('MANŒUVRE'))).toBe(false)
  const asked = route([mission()], 0, { ...IDLE, isWorking: true, question: 'Quelle couleur ?' }, 'dark', 40)
  expect(asked.track.some(seg => seg.color === 'warning')).toBe(true)

  // The last summary's wait, from the turn before: the turn under way hides it.
  const waits = mission({ waiting: 'Valide la maquette' })
  const working = chart({ mission: waits, isLast: true, live: { ...IDLE, isWorking: true } }).map(text)
  expect(working.some(line => line.includes('MANŒUVRE'))).toBe(true)
  expect(working.some(line => line.includes('À VOUS'))).toBe(false)
  expect(chart({ mission: waits, isLast: true }).map(text).some(line => line.includes('Valide la maquette'))).toBe(true)
  expect(waitingOf(undefined, IDLE)).toBe(null)
})

test('a summary lands on its mission once, in its epoch; a failed one marks what it read', () => {
  const plan: Plan = { epoch: 2, objective: 'O', missions: [mission({ id: 0, logged: 4 }), mission({ id: 1, logged: 2 })], pending: [] }
  const made = [{ id: 1, read: 2, steps: [{ kind: 'done' as const, what: 'w', why: 'y' }], title: 'T', waiting: 'Réponds' }]

  const once = settled(plan, 2, made, null)
  expect(once.objective).toBe('O')
  expect(once.missions[0]).toBe(plan.missions[0])
  expect(once.missions[1]).toMatchObject({ title: 'T', waiting: 'Réponds', summarized: 2, steps: [{ what: 'w' }] })
  // The same lines again (another copy of the mod): nothing doubles.
  expect(settled(once, 2, made, 'Autre')).toEqual({ ...once, objective: 'Autre' })
  // Another plan since: untouched.
  expect(settled(plan, 1, made, 'X')).toBe(plan)

  const tried = attempted(plan, 2, [{ id: 0, read: 4 }])
  expect(tried.missions.map(m => m.attempted)).toEqual([4, 0])
  expect(isBehind(tried.missions[0] ?? mission())).toBe(false)
  expect(attempted(plan, 3, [{ id: 0, read: 4 }])).toBe(plan)
})

test('only the missions being summarized say so', () => {
  const busy = { ...IDLE, summarizing: [1] }
  const behind = addLines(mission(), [toolLine('a')])

  expect(chart({ mission: behind, live: busy }).map(text).some(line => line.includes('JOURNAL'))).toBe(true)
  expect(chart({ mission: { ...behind, id: 1 }, live: busy }).map(text).some(line => line.includes('DÉBRIEFING'))).toBe(true)
})

test('the JSON is found among braces in prose, and never in an array alone', () => {
  expect(parseIncrement('Ensemble {a, b} : {"title":"T","steps":[]} fin }')?.title).toBe('T')
  expect(parseIncrement('[1, 2]')).toBe(null)
})

test('every tool the journal knows reads in its own words, any other by its name', () => {
  expect(label('Read', { file_path: '/a/b/README.md' })).toBe('Lu README.md')
  expect(label('Grep', { pattern: 'TODO' })).toBe('Cherché « TODO »')
  expect(label('Glob', { pattern: '**/*.ts' })).toBe('Listé **/*.ts')
  expect(label('Agent', { description: 'relis le diff' })).toBe('Drone : relis le diff')
  expect(label('Skill', { skill: 'code-review' })).toBe('Skill code-review')
  expect(label('WebFetch', { url: 'https://docs.rs/tokio' })).toBe('Lu https://docs.rs/tokio')
  expect(label('WebSearch', { query: 'tokio select' })).toBe('Recherche « tokio select »')
  expect(label('AskUserQuestion', {})).toBe('Question pour toi')
  expect(label('ToolSearch', { query: 'select:Read' })).toBe('Chargé des outils')
  expect(label('NotebookEdit', {})).toBe('NotebookEdit')
  // A field of another type reads as nothing.
  expect(label('Bash', { command: 42 })).toBe('')

  expect(workflowName({ name: 'audit' })).toBe('audit')
  expect(workflowName({ script: 'pas de meta', name: '' })).toBe('workflow')
  expect(workflowName({})).toBe('workflow')
  expect(question({ questions: [{ question: 'Laquelle ?' }] })).toBe('Laquelle ?')
  expect(question({ questions: ['pas un objet'] })).toBe('Une question t’attend')
  expect(question({ questions: [{ question: 3 }] })).toBe('Une question t’attend')
  expect(question({})).toBe('Une question t’attend')
})

test('a log too long for Haiku keeps its newest end', () => {
  const lines = Array.from({ length: 400 }, (_, i) => `ligne ${String(i).padStart(3, '0')} ${'x'.repeat(40)}`)
  const log = logOf(lines)

  expect(log.startsWith('…\n')).toBe(true)
  expect(log).toContain('ligne 399')
  expect(log).not.toContain('ligne 000')
  expect(logOf(['court'])).toBe('court')

  // A batch shares the room: each mission keeps its newest lines.
  const long = addLines(mission({ id: 0 }), lines)
  const prompt = batchPrompt(null, [long, mission({ id: 1, prompt: 'deux' })])
  expect(prompt).toContain('ligne 399')
  expect(prompt).not.toContain('ligne 000')
})

test('missions are numbered after every one the plan holds, the oldest leaving past the cap', () => {
  let plan: Plan = { epoch: 0, objective: null, missions: [], pending: [] }
  expect(logLines(['· x'])(plan)).toBe(plan)
  for (let i = 0; i <= MISSIONS_MAX; i++) plan = addMission(`p${i}`)(plan)

  expect(plan.missions.length).toBe(MISSIONS_MAX)
  expect(plan.missions[0]?.id).toBe(1)
  expect(plan.missions[MISSIONS_MAX - 1]?.id).toBe(MISSIONS_MAX)
  // Lines go to the newest.
  const logged = logLines(['· y'])(plan)
  expect(logged.missions[MISSIONS_MAX - 1]?.journal).toEqual(['· y'])
  expect(logged.missions[0]?.journal).toEqual([])
  // A long paste keeps its start.
  expect(Array.from(addMission('é'.repeat(700))(plan).missions.at(-1)?.prompt ?? '').length).toBe(600)
})

test('a reply’s steps keep the kind they name, an unknown or missing one is done', () => {
  const reply = JSON.stringify({ steps: ['decision', 'fail', 'fix', 'done', 'autre'].map(kind => ({ kind, what: kind })).concat([{ what: 'sans' } as { kind: string; what: string }]) })
  expect(parseIncrement(reply)?.steps.map(s => s.kind)).toEqual(['decision', 'fail', 'fix', 'done', 'done', 'done'])
  // Items that are not objects, blank words: no step, no title.
  expect(parseIncrement('{"title":"   ","steps":[null, 3, {"what":"  "}, {"what":"gardé","why":" "}]}')).toEqual({
    objective: null,
    title: null,
    steps: [{ kind: 'done', what: 'gardé', why: '' }],
    waiting: null,
  })
  // A number that is not a whole one numbers nothing; one numbered entry numbers the batch.
  expect(parseBatch('{"missions":[{"n":1.5},{"n":"2"}]}')?.missions.map(m => m.n)).toEqual([null, null])
  const mixed = { objective: null, missions: [{ n: 2, title: 'B', steps: [], waiting: null }, { n: null, title: 'X', steps: [], waiting: null }] }
  expect(alignBatch(mixed, 2).map(e => e?.title)).toEqual([undefined, 'B'])
})

test('the journal’s fresh lines are the ones past the summary; a summary of all of them empties it', () => {
  const m = addLines(mission(), ['CLAUDE : je lis', toolLine('Lu a.ts'), toolLine('Lu b.ts')])
  expect(freshLines({ ...m, summarized: 2 })).toEqual(['· Lu b.ts'])
  expect(freshLines({ ...m, summarized: 3 })).toEqual([])
  expect(rawActions(m)).toEqual(['Lu a.ts', 'Lu b.ts'])
  expect(appendSteps(m, [], 3).journal).toEqual([])
  expect(appendSteps(m, [], 1).journal).toEqual(['· Lu a.ts', '· Lu b.ts'])
  expect(addLines(m, [])).toEqual(m)
  expect(logOf(['a', 'b'])).toBe('a\nb')
  // Exactly as long as Haiku may read: whole.
  const full = 'x'.repeat(12_000)
  expect(logOf([full])).toBe(full)
  expect(logOf([`${full}y`]).startsWith('…\n')).toBe(true)
})

test('a Write call is labelled as written; a script that is not text names no workflow', () => {
  expect(label('Write', { file_path: '/a/b.ts' })).toBe('Écrit b.ts')
  expect(workflowName({ script: ["name: 'audit'"], name: 'enregistré' })).toBe('enregistré')
})

test('a reply with no object, or missions that are not objects, gives nothing to draw', () => {
  expect(parseIncrement('} rien {pas du json')).toBe(null)
  expect(parseIncrement('aucune accolade')).toBe(null)
  expect(parseBatch('pas de json')).toBe(null)
  expect(parseBatch('{"objective":"O"}')).toEqual({ objective: 'O', missions: [] })
  expect(parseBatch('{"missions":[1,"x"]}')?.missions).toEqual([
    { n: null, title: null, steps: [], waiting: null },
    { n: null, title: null, steps: [], waiting: null },
  ])
})

test('a transcript row of the person, or Claude saying nothing, writes no line of words', () => {
  expect(rowLines(user('une demande'))).toEqual([])
  expect(rowLines(assistant('', [['Read', { file_path: '/a.ts' }]]))).toEqual(['· Lu a.ts'])
})

test('squadron keys, names and landings for every case', () => {
  expect(squadronKey({ toolUseId: '', runId: 'wf_9' }, 0)).toBe('wf_9')
  expect(squadronKey({ toolUseId: '', runId: '' }, 0)).toBe('workflow')
  expect(nameSquadron('wf1', 'audit')(EMPTY_FLEET, { mission: -1, now: 0 })).toBe(EMPTY_FLEET)
  const named = nameSquadron('wf1', 'audit')(EMPTY_FLEET, AT)
  expect(nameSquadron('wf1', 'audit 2')(named, AT).squadrons).toEqual([{ key: 'wf1', name: 'audit 2', isWorkflow: true, mission: 0, drones: [] }])

  let fleet = launch(undefined, 'a1', 'a1')(EMPTY_FLEET, AT)
  fleet = launch(undefined, 'a2', 'a2')(fleet, AT)
  fleet = land('a2', 'failed')(fleet, { ...AT, now: 5 })
  const done = reconcile([
    { id: 'a1', status: 'completed' },
    { id: 'a2', status: 'completed' },
  ])(fleet, AT)
  expect(done.squadrons[0]?.drones.map(d => [d.status, d.seenAt])).toEqual([
    ['done', 1000],
    ['failed', 5],
  ])
})

test('every card case: a long action wraps, a landed squadron rests, a crowd is counted, a long journal folds', () => {
  const long = chart({ isLast: true, live: { ...IDLE, isWorking: true, action: 'mot '.repeat(40) } }).map(text)
  expect(long.filter(line => line.includes('mot')).length).toBeGreaterThan(1)

  const landed = [{ key: 'wf1', name: 'fini', isWorkflow: true, mission: 0, drones: [drone('a', { status: 'done' })] }]
  const rest = chart({ squadrons: landed })
  expect(rest.map(text).some(line => line.includes('⟳ 0 en vol'))).toBe(true)
  expect(rest.flat().some(seg => seg.text.includes('⟳ 0 en vol') && seg.color === 'subtle')).toBe(true)

  const crowd = [{ key: 'wf2', name: 'foule', isWorkflow: true, mission: 0, drones: Array.from({ length: 300 }, (_, i) => drone(`d${i}`)) }]
  expect(chart({ squadrons: crowd }).map(text).some(line => /\+ \d+ drones/.test(line))).toBe(true)

  const journal = addLines(mission(), Array.from({ length: 30 }, (_, i) => toolLine(`action ${i}`)))
  const folded = chart({ mission: journal }).map(text)
  expect(folded.some(line => /┄ \d+ actions plus tôt/.test(line))).toBe(true)
  expect(folded.some(line => line.includes('action 29'))).toBe(true)
})

test('a narrow pane draws the cards without the loop’s gutter', () => {
  const steps: Step[] = [
    { kind: 'fail', what: 'casse', why: '' },
    { kind: 'fix', what: 'répare', why: '' },
  ]
  const lines = chart({ mission: mission({ steps }), columns: 30 }).map(text)

  expect(lines.some(line => line.includes('répare'))).toBe(true)
  expect(lines.some(line => line.includes('◀─╮'))).toBe(false)
})

test('a long prompt shows two lines in the band, the second marked as cut', () => {
  const rows = band(mission({ prompt: 'mot '.repeat(60) }), true, 'dark', 40).map(text)
  expect(rows.some(line => line.includes('…'))).toBe(true)
  expect(band(mission({ prompt: 'court' }), false, 'plain', 40).map(text).some(line => line.includes('archive'))).toBe(true)
  expect(text(objectiveRow(null, false, 'dark', 40))).not.toBe(text(objectiveRow('O', true, 'dark', 40)))
})

test('a text exactly as long as its room is kept whole', () => {
  expect(clip('abcd', 4)).toBe('abcd')
  expect(squeeze('abcd', 4)).toBe('abcd')
  expect(wrap('ab cd', 5)).toEqual(['ab cd'])
  expect(wrap('abcde fg', 5)).toEqual(['abcde', 'fg'])
})

test('wrapping and names at their edges', () => {
  expect(wrap('', 5)).toEqual([])
  expect(wrap('anticonstitutionnellement court', 6)).toEqual(['antic…', 'court'])
  expect(wrap('ab anticonstitutionnellement', 6)).toEqual(['ab', 'antic…'])
  expect(basename('/')).toBe('/')
  expect(basename('a/b/')).toBe('b')
})
