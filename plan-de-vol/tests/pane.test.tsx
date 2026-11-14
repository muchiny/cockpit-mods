import { expect, test } from 'claude-code/testing'

import { palette } from '../hooks/chart'
import { assistant, command, complete, COMPOSER, endTurn, engine, PANE, prompt, reply, REPLY, shows, spawn, start, step, typeOver, user } from './engine'
import type { Engine } from './engine'
import { lines } from './surface'

type Node = { type?: unknown; props?: Record<string, unknown>; children?: unknown[] }

// The rows a drawn tree takes: a Client its height, a row Box or a Text one,
// a column Box the sum of its children.
function height(el: unknown): number {
  if (typeof el !== 'object' || el === null) return 0
  const { type, props = {}, children = [] } = el as Node
  if (type === 'Client') return Number(props.height)
  if (type === 'Box' && props.flexDirection === 'column') return children.flat(Infinity).reduce<number>((n, kid) => n + height(kid), 0)

  return 1
}

// Each body height from 30 to 44 rows (more than a card's height apart), and
// the rows the pane drew in it, on the mission the button `key` shows.
async function sweep($: Engine, surface: 'terminal' | 'vscode', key: string): Promise<[number, number][]> {
  const drawn: [number, number][] = []
  for (let body = 30; body <= 44; body++) {
    const ui = await $.ui.mount({ ...PANE, surface, props: { ...PANE.props, scroll: { offset: 0, bodyRows: body } } })
    await ui.press({ key })
    drawn.push([body, height(await ui.drawn())])
    await ui.unmount()
  }

  return drawn
}

test('the pane never draws past its body, and its cards fill it to the row', { timeoutMs: 30_000 }, async ($, on) => {
  const kit = engine($, on)
  kit.answer(reply(12))
  await start($, kit.clock)
  for (const text of ['un', 'deux']) {
    await prompt($, text)
    await step($, kit, '', [{ tool: 'Read', file_path: `/m/${text}.ts` }])
    await endTurn($, kit.clock)
    // With the warp above or none; the newest mission, or (past one) the
    // first while the person is waited for on the newest.
    for (const surface of ['terminal', 'vscode'] as const) {
      for (const key of text === 'un' ? ['station-0'] : ['live', 'station-0']) {
        const drawn = await sweep($, surface, key)
        expect(drawn.filter(([body, rows]) => rows > body)).toEqual([])
        expect(drawn.some(([body, rows]) => rows === body)).toBe(true)
      }
    }
  }
})

test('a prompt, its work and the summary draw as a flowchart; a quiet turn calls no model', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)

  await prompt($, 'fais un mod')
  await step($, kit, 'Je lis le câblage.', [{ tool: 'Read', file_path: '/m/hooks/register.tsx' }])
  await endTurn($, kit.clock)

  expect(kit.asks.length).toBe(1)
  expect(kit.asks[0]).toContain('PROMPT : fais un mod')
  expect(kit.asks[0]).toContain('CLAUDE : Je lis le câblage.')
  expect(kit.asks[0]).toContain('· Lu register.tsx')
  expect(await shows($, /Faire le mod/)).toBe(true)
  expect(await shows($, /pour comprendre le câblage/)).toBe(true)
  expect(await shows($, /Valide la maquette/)).toBe(true)
  expect(await shows($, /OBJECTIF ▸ Logigramme de session/)).toBe(true)

  // Nothing new in the journal: no second completion.
  await endTurn($, kit.clock)
  expect(kit.asks.length).toBe(1)
})

test('the next summary reads only the new lines and keeps the steps drawn; a failed call is written so', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'fais un mod')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/a.ts' }])
  await endTurn($, kit.clock)

  kit.answer(JSON.stringify({ objective: null, title: 'Autre titre', steps: [{ kind: 'done', what: 'Lancé les tests', why: 'ils passent' }], waiting: null }))
  await $.turn.start({ text: '', turnId: 't2' })
  await step($, kit, 'Je teste.', [{ tool: 'Bash', command: 'false', description: 'Lance les tests' }])
  await endTurn($, kit.clock)

  expect(kit.asks.length).toBe(2)
  expect(kit.asks[1]).toContain('· Lance les tests')
  expect(kit.asks[1]).toContain('↳ ÉCHEC : Lance les tests')
  expect(kit.asks[1]).not.toContain('Lu a.ts')
  expect(kit.asks[1]).toContain('Lu register.tsx — pour comprendre le câblage')
  expect(await shows($, /Lu register.tsx/)).toBe(true)
  expect(await shows($, /Lancé les tests/)).toBe(true)
  // The first title stays: the band does not change under the person's eyes.
  expect(await shows($, /Faire le mod/)).toBe(true)
  // Nothing waited for any more.
  expect(await shows($, /Valide la maquette/)).toBe(false)
})

test('a prompt delivered mid-turn takes the work after it; the work before it is still summarized', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'P1 fais un mod')
  await step($, kit, '', [{ tool: 'Bash', command: 'x', description: 'Travail de P1' }])
  await typeOver($, 'P2 et l’ultracode')
  await step($, kit, '', [{ tool: 'Bash', command: 'y', description: 'Travail de P2' }])
  kit.answer(
    JSON.stringify({
      objective: 'O',
      missions: [
        { n: 1, title: 'Un', steps: [{ kind: 'done', what: 'Fait P1', why: 'a' }], waiting: null },
        { n: 2, title: 'Deux', steps: [{ kind: 'done', what: 'Fait P2', why: 'b' }], waiting: null },
      ],
    }),
  )
  await endTurn($, kit.clock)

  // Both missions in one completion, each with its own work.
  expect(kit.asks.length).toBe(1)
  const [p1, p2] = (kit.asks[0] ?? '').split('=== MISSION 2 ===')
  expect(p1).toContain('Travail de P1')
  expect(p1).not.toContain('Travail de P2')
  expect(p2).toContain('Travail de P2')

  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'prev' })
  expect(await ui.find({ type: 'Text', text: /Fait P1/ })).toBeDefined()
  await ui.unmount()
})

test('prompts queued behind the turn open each in its own turn, and a notification’s turn opens none', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'P1')
  await typeOver($, 'deux ensuite', true)
  await typeOver($, 'trois après', true)
  await step($, kit, '', [{ tool: 'Bash', command: 'x', description: 'Fin de P1' }])
  await endTurn($, kit.clock)

  expect(kit.asks[0]).toContain('PROMPT : P1')
  expect(kit.asks[0]).toContain('Fin de P1')
  expect(await shows($, /deux ensuite/)).toBe(false)

  await $.turn.start({ text: '<task-notification>agent fini</task-notification>', turnId: 'n' })
  expect(await shows($, /^P2$/)).toBe(false)

  await $.turn.start({ text: 'deux ensuite', turnId: 't2' })
  expect(await shows($, /deux ensuite/)).toBe(true)
  expect(await shows($, /^P3$/)).toBe(false)

  await $.turn.start({ text: 'trois après', turnId: 't3' })
  expect(await shows($, /trois après/)).toBe(true)

  // Taken back out of the queue: once the turn it waited behind is over, it leaves.
  await typeOver($, 'quatre retiré', true)
  await endTurn($, kit.clock)
  await kit.clock.advance(61_000)
  await $.turn.start({ text: 'quatre retiré', turnId: 't4' })
  expect(await shows($, /quatre retiré/)).toBe(false)
})

test('idle prompts each open their own mission, their turn started as they enter', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'premier')
  await step($, kit, '', [{ tool: 'Bash', command: 'x', description: 'Travail du premier' }])
  await endTurn($, kit.clock)
  await prompt($, 'deuxième')
  await step($, kit, '', [{ tool: 'Bash', command: 'y', description: 'Travail du deuxième' }])
  await endTurn($, kit.clock)

  expect(kit.asks.length).toBe(2)
  expect(kit.asks[0]).toContain('PROMPT : premier')
  expect(kit.asks[1]).toContain('=== MISSION P2 ===\nPROMPT : deuxième')
  expect(kit.asks[1]).toContain('Travail du deuxième')
  expect(kit.asks[1]).not.toContain('Travail du premier')
  // The missions before it, and not itself; asked of Haiku.
  expect(kit.asks[1]).toContain('Missions précédentes : P1 Faire le mod\n')
  expect(kit.models).toEqual(['haiku', 'haiku'])
  expect(await shows($, /^P2$/)).toBe(true)
})

test('a slash command opens a mission only if it starts a turn', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await command($, 'config')
  await prompt($, 'vrai prompt')
  // One station: /config started no turn, so no mission, and nothing waits.
  expect(await shows($, /^P1$/)).toBe(true)
  expect(await shows($, /^P2$/)).toBe(false)

  await command($, 'code-review', 'high')
  expect(await shows($, /« \/code-review high »/)).toBe(true)

  // Typed mid-turn, a command waits for its own turn, however long the running one lasts.
  await $.prompt.submit({ text: '/review', wait: false, origin: COMPOSER, command: { name: 'review', args: '' }, turnId: 't1' })
  await kit.clock.advance(120_000)
  await endTurn($, kit.clock)
  await $.turn.start({ text: 'Expansion de /review', turnId: 'q1' })
  expect(await shows($, /« \/review »/)).toBe(true)

  // One whose turn never came (/config typed mid-turn) leaves once the turn is over…
  await $.prompt.submit({ text: '/config', wait: false, origin: COMPOSER, command: { name: 'config', args: '' }, turnId: 'q1' })
  await endTurn($, kit.clock)
  await kit.clock.advance(61_000)
  await $.turn.start({ text: 'Continue the work', turnId: 'q2' })
  expect(await shows($, /^P4$/)).toBe(false)

  // …or as soon as the person's next prompt starts its own turn.
  await $.prompt.submit({ text: '/config', wait: false, origin: COMPOSER, command: { name: 'config', args: '' }, turnId: 'q2' })
  await endTurn($, kit.clock)
  await prompt($, 'suite')
  await $.turn.start({ text: 'Continue the work', turnId: 'q3' })
  expect(await shows($, /« suite »/)).toBe(true)
  expect(await shows($, /^P5$/)).toBe(false)
})

test('only the person’s prompts open missions; a refused one opens none', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'le vrai')
  await prompt($, 'un rappel planifié', { kind: 'scheduled-trigger' })
  await $.prompt.submit({ text: 'méta', wait: false, origin: COMPOSER, isMeta: true })
  expect(await shows($, /^P2$/)).toBe(false)

  kit.drop('bloqué par un hook')
  await prompt($, 'refusé au repos')
  await typeOver($, 'refusé en plein tour')
  expect(await shows($, /refusé/)).toBe(false)
  expect(await shows($, /^P2$/)).toBe(false)

  kit.drop(null)
  await $.prompt.submit({ text: '  ', wait: false, origin: COMPOSER })
  await $.prompt.submit({
    text: '',
    wait: false,
    origin: COMPOSER,
    attachments: [{ type: 'image', mediaType: 'image/png', id: 'img-1' }],
  })
  expect(await shows($, /\[pièce jointe\]/)).toBe(true)
})

test('an ultracode fleet: agents launch, act and land in batches, drawn under their workflow', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'revue complète')
  await $.tool.call({ tool: 'Workflow', tool_use_id: 'wf1', script: "export const meta = { name: 'review-changes', description: 'x' }" })
  const run = { toolUseId: 'wf1', runId: 'wf_1' }
  for (const label of ['bugs', 'perf', 'secu', 'docs', 'arch']) await spawn($, `review:${label}`, run)
  await $.tool.call({ tool: 'Bash', command: 'ls', description: 'Liste les fichiers', agentId: 'agent-review:perf' })
  await step($, kit, 'je relis', [], 'agent-review:docs')
  await complete($, { agentId: 'agent-review:bugs' })
  await complete($, { agentId: 'agent-review:secu', reason: 'error' })
  await complete($, { agentId: 'agent-review:arch', reason: 'aborted' })

  // Nothing written before the batch is due.
  await kit.clock.advance(100)
  expect(await shows($, /ESCADRILLE · review-changes/)).toBe(false)
  await kit.clock.advance(200)
  await kit.clock.settle()

  expect(await shows($, /ESCADRILLE · review-changes/)).toBe(true)
  expect(await shows($, /⟳ 2 en vol/)).toBe(true)
  expect(await shows($, /✓ 1 au hangar/)).toBe(true)
  // Cut short by an error or stopped: lost, not back.
  expect(await shows($, /✗ 2 perdus/)).toBe(true)
  expect(await shows($, /review:perf · Liste les fichiers/)).toBe(true)
})

test('a squadron stays under the mission that launched it; a resumed agent flies under the one that resumed it', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'P1 revue')
  await $.tool.call({ tool: 'Workflow', tool_use_id: 'wf1', script: "export const meta = { name: 'audit', description: 'x' }" })
  await spawn($, 'auditeur', { toolUseId: 'wf1', runId: 'wf_1' })
  await spawn($, 'éclaireur')
  await complete($, { agentId: 'agent-éclaireur' })
  await endTurn($, kit.clock)

  await prompt($, 'P2 suite')
  await spawn($, 'éclaireur')
  await kit.clock.advance(300)
  await kit.clock.settle()

  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Text', text: /ESCADRILLE · audit/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /ESCADRILLE · Agents/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /⟳ 1 en vol/ })).toBeDefined()
  await ui.press({ key: 'prev' })
  expect(await ui.find({ type: 'Text', text: /ESCADRILLE · audit/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /ESCADRILLE · Agents/ })).toBeUndefined()
  await ui.unmount()
})

test('a question Claude asks shows first, even while the turn runs', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'choisis pour moi')
  const release = kit.holdTools()
  const asking = $.tool.call({ tool: 'AskUserQuestion', questions: [{ question: 'Quelle couleur ?', header: 'Couleur', options: [], multiSelect: false }] })
  await kit.clock.advance(0)

  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Text', text: /À VOUS/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Quelle couleur \?/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /MANŒUVRE/ })).toBeUndefined()
  await ui.unmount()

  release()
  await asking
  expect(await shows($, /MANŒUVRE/)).toBe(true)
  expect(await shows($, /Quelle couleur/)).toBe(false)
})

test('a pane the person closed stays closed, and /plan-de-vol catches up what was skipped', async ($, on) => {
  // What the mod's ui.close hook stored when the person closed the pane.
  const kit = engine($, on, { store: { closed: true } })
  await start($, kit.clock)
  expect(kit.opens.length).toBe(0)
  await prompt($, 'fais un mod')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/a.ts' }])
  await endTurn($, kit.clock)
  // No one to see it: no completion.
  expect(kit.asks.length).toBe(0)

  const ran = await $.command.run({ command: 'plan-de-vol', args: '', origin: COMPOSER, presentation: { isFullscreen: true, columns: 200 } })
  await kit.clock.settle()
  expect(ran.text).toBe('Plan de vol ouvert. Pour naviguer : ctrl+x tab, puis q précédent, d suivant, z position.')
  expect(kit.opens.length).toBe(1)
  expect(kit.asks.length).toBe(1)
  expect(await shows($, /pour comprendre le câblage/)).toBe(true)
  await start($, kit.clock)
  expect(kit.opens.length).toBe(2)
})

test('on the main screen, the pane waits for /plan-de-vol instead of opening above the prompt', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await $.command.run({ command: 'plan-de-vol', args: '', origin: COMPOSER, presentation: { isFullscreen: false, columns: 120 } })
  expect(kit.opens.length).toBe(2)
  await start($, kit.clock)
  expect(kit.opens.length).toBe(2)
})

test('a closed pane opened again summarizes at most a batch of missions in one completion', async ($, on) => {
  const kit = engine($, on, { store: { closed: true } })
  await start($, kit.clock)
  for (let i = 1; i <= 14; i++) {
    await prompt($, `prompt ${i}`)
    await step($, kit, '', [{ tool: 'Bash', command: 'x', description: `Travail ${i}` }])
    await endTurn($, kit.clock)
  }
  kit.answer(JSON.stringify({ objective: 'O', missions: [] }))
  await $.command.run({ command: 'plan-de-vol', args: '', origin: COMPOSER, presentation: { isFullscreen: true, columns: 200 } })
  await kit.clock.settle()

  expect(kit.asks.length).toBe(1)
  expect(kit.asks[0]).toContain('=== MISSION 12 ===')
  expect(kit.asks[0]).not.toContain('=== MISSION 13 ===')
  expect(kit.asks[0]).toContain('Travail 14')
  expect(kit.asks[0]).not.toContain('Travail 2\n')
})

test('with no surface to draw the pane (a -p run), no model is called', async ($, on) => {
  const kit = engine($, on, { isPlaced: false })
  await start($, kit.clock, false)
  await prompt($, 'fais un mod', { kind: 'sdk' })
  await step($, kit, 'Fait.', [{ tool: 'Read', file_path: '/m/a.ts' }])
  await endTurn($, kit.clock)

  expect(kit.asks.length).toBe(0)
  const ran = await $.command.run({ command: 'plan-de-vol', args: '', origin: COMPOSER, presentation: { isFullscreen: true, columns: 200 } })
  expect(ran.text).toBe('Plan de vol en attente : no-surface')
})

test('a host that is not a terminal (the desktop app) but draws the pane gets its summaries', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock, false)
  await prompt($, 'depuis le bureau', { kind: 'sdk' })
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/a.ts' }])
  await endTurn($, kit.clock)

  expect(kit.asks.length).toBe(1)
  expect(await shows($, /pour comprendre le câblage/)).toBe(true)
})

test('a reply that reads as nothing, or none at all, is not asked again until new lines come', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'fais un mod')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/a.ts' }])
  kit.answer('rien de lisible')
  await endTurn($, kit.clock)
  await endTurn($, kit.clock)
  expect(kit.asks.length).toBe(1)

  kit.answer(null)
  await $.turn.start({ text: '', turnId: 't2' })
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/b.ts' }])
  await endTurn($, kit.clock)
  await endTurn($, kit.clock)
  expect(kit.asks.length).toBe(2)

  expect(kit.logs).toEqual(['plan-de-vol : résumé illisible', 'plan-de-vol : pas de résumé (empty-reply)'])

  // Two missions behind, one batch: unreadable too, then nothing until more.
  kit.answer('toujours rien')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/b2.ts' }])
  await typeOver($, 'deuxième')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/c.ts' }])
  await endTurn($, kit.clock)
  await endTurn($, kit.clock)
  expect(kit.asks.length).toBe(3)
  expect(kit.asks[2]).toContain('=== MISSION 2 ===')

  // No answer at all to a batch: the same.
  kit.answer(null)
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/c2.ts' }])
  await $.prompt.submit({ text: 'troisième', wait: false, origin: COMPOSER, turnId: 't1' })
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/c3.ts' }])
  await endTurn($, kit.clock)
  await endTurn($, kit.clock)
  expect(kit.asks.length).toBe(4)

  kit.answer(REPLY)
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/d.ts' }])
  await endTurn($, kit.clock)
  expect(kit.asks.length).toBe(5)
  expect(await shows($, /Lu d.ts/)).toBe(false)
  expect(await shows($, /pour comprendre le câblage/)).toBe(true)
})

test('lines written while a summary runs wait for the next one', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'fais un mod')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/avant.ts' }])
  const release = kit.hold()
  await complete($)
  await kit.clock.advance(0)
  expect(kit.asks.length).toBe(1)
  expect(await shows($, /DÉBRIEFING/)).toBe(true)

  await $.turn.start({ text: '', turnId: 't2' })
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/pendant.ts' }])
  await kit.clock.advance(300)
  release()
  await kit.clock.settle()
  expect(await shows($, /Lu pendant.ts/)).toBe(true)
  expect(await shows($, /Lu avant.ts/)).toBe(false)

  await endTurn($, kit.clock)
  expect(kit.asks.length).toBe(2)
  expect(kit.asks[1]).toContain('Lu pendant.ts')
  expect(kit.asks[1]).not.toContain('Lu avant.ts')
})

test('a /clear empties the plan, and a summary still running for the old one writes nothing', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'ancienne conversation')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/a.ts' }])
  const release = kit.hold()
  await complete($)
  await kit.clock.advance(0)
  expect(kit.asks.length).toBe(1)

  await $.session.end({ reason: 'clear', sessionId: 's1', resume: { id: 's1' } })
  expect(await shows($, /En attente du premier contrat/)).toBe(true)
  await prompt($, 'nouvelle conversation')
  release()
  await kit.clock.settle()

  expect(await shows($, /nouvelle conversation/)).toBe(true)
  expect(await shows($, /Logigramme de session/)).toBe(false)
  expect(await shows($, /pour comprendre le câblage/)).toBe(false)
  expect(await shows($, /Valide la maquette/)).toBe(false)
})

test('a resume reads the other conversation back at its next prompt', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'ici')
  await $.session.end({ reason: 'resume', sessionId: 's1', resume: { id: 's1' } })
  kit.rows.push(user('ancien un'), assistant('fait'), user('ancien deux'), assistant('fait aussi'))

  await prompt($, 'on reprend')
  await kit.clock.settle()

  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Text', text: /^P3$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /on reprend/ })).toBeDefined()
  await ui.press({ key: 'station-0' })
  expect(await ui.find({ type: 'Text', text: /ancien un/ })).toBeDefined()
  await ui.unmount()
})

test('a transcript is seeded once, and not over a plan a /clear started meanwhile', async ($, on) => {
  const kit = engine($, on)
  kit.rows.push(user('ancien'), assistant('fait'))
  // Two seeds read the transcript at once: the session's catch-up and the prompt's.
  const release = kit.holdMessages()
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const submitting = $.prompt.submit({ text: 'nouveau', wait: false, origin: COMPOSER })
  await kit.clock.advance(0)
  release()
  await submitting
  await kit.clock.settle()
  expect(await shows($, /^P2$/)).toBe(true)
  expect(await shows($, /^P3$/)).toBe(false)

  await $.session.end({ reason: 'clear', sessionId: 's1', resume: { id: 's1' } })
  const late = kit.holdMessages()
  const seeding = $.prompt.submit({ text: 'après', wait: false, origin: COMPOSER })
  await kit.clock.advance(0)
  await $.session.end({ reason: 'clear', sessionId: 's1', resume: { id: 's1' } })
  late()
  await seeding
  expect(await shows($, /ancien/)).toBe(false)
  // The seed read before the /clear writes nothing over the plan after it.
  expect(await stations($)).toEqual(['P1', '« après »'])
})

test('two quick presses of précédent move two stations', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  for (const text of ['un', 'deux', 'trois']) await prompt($, text)

  const ui = await $.ui.mount(PANE)
  await Promise.all([ui.press({ key: 'prev' }), ui.press({ key: 'prev' })])
  expect(await ui.find({ type: 'Text', text: /« un »/ })).toBeDefined()
  await ui.press({ key: 'prev' })
  expect(await ui.find({ type: 'Text', text: /« un »/ })).toBeDefined()
  await ui.press({ key: 'next' })
  expect(await ui.find({ type: 'Text', text: /« deux »/ })).toBeDefined()
  await ui.press({ key: 'next' })
  expect(await ui.find({ type: 'Text', text: /« trois »/ })).toBeDefined()
  await ui.press({ key: 'station-1' })
  expect(await ui.find({ type: 'Text', text: /« deux »/ })).toBeDefined()
  await ui.press({ key: 'live' })
  expect(await ui.find({ type: 'Text', text: /« trois »/ })).toBeDefined()
  await ui.unmount()
})

test('a summary waiting on the newest mission is pointed at from an older one', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'un')
  await prompt($, 'deux')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/a.ts' }])
  await endTurn($, kit.clock)

  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'station-0' })
  expect(await ui.find({ type: 'Text', text: /◆ À vous sur P2 : Valide la maquette/ })).toBeDefined()
  await ui.unmount()
})

test('the glass follows the theme: pale in a light one, none in auto, changed with the setting', async ($, on) => {
  const fills = async () => {
    const ui = await $.ui.mount(PANE)
    const all = await ui.findAll({ type: 'Text' })
    await ui.unmount()
    return all.map(found => found.props.backgroundColor)
  }
  const kit = engine($, on, { theme: 'auto' })
  await start($, kit.clock)
  expect(await fills()).not.toContain(palette('dark').glass)
  expect(await fills()).not.toContain(palette('light').glass)

  const set = (value: string) =>
    $.config.set({ key: 'theme', value, previous: 'auto', provider: { plugin: 'engine', tier: 'core' }, origin: COMPOSER })
  await set('light')
  expect(await fills()).toContain(palette('light').glass)
  expect(await fills()).not.toContain(palette('dark').glass)
  await set('dark-daltonized')
  expect(await fills()).toContain(palette('dark').glass)
})

test('a theme change the engine refuses leaves the glass as it was', async ($, on) => {
  const kit = engine($, on, { theme: 'light', isLocked: true })
  await start($, kit.clock)
  await $.config.set({ key: 'theme', value: 'dark', previous: 'light', provider: { plugin: 'engine', tier: 'core' }, origin: COMPOSER })

  const ui = await $.ui.mount(PANE)
  const all = await ui.findAll({ type: 'Text' })
  await ui.unmount()
  expect(all.map(found => found.props.backgroundColor)).toContain(palette('light').glass)
})

test('a plan an earlier version stored is declined', async ($, on) => {
  engine($, on)
  // What the code before this version wrote stays through the reload.
  on('state.get', () => ({ value: { value: { objective: 'vieux', missions: [{ prompt: 'ancien' }] }, version: 1 } }))

  expect(await shows($, /En attente du premier contrat/)).toBe(true)
})

test('the pane draws on every surface, with or without the warp header', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'fais un mod')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/a.ts' }])
  await endTurn($, kit.clock)

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /OBJECTIF ▸ Logigramme de session/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /pour comprendre le câblage/ })).toBeDefined()
    await ui.unmount()
  }
})

test('a summary that fails is logged, and nothing stays marked as running', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'fais un mod')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/a.ts' }])
  kit.breakModel()
  await endTurn($, kit.clock)

  expect(kit.logs.some(line => line.startsWith('plan-de-vol : résumé : '))).toBe(true)
  expect(await shows($, /DÉBRIEFING/)).toBe(false)
  expect(await shows($, /Lu a.ts/)).toBe(true)
})

test('a burst of calls past the backlog is written at once, without waiting for the timer', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'revue')
  await spawn($, 'rafale')
  for (let i = 0; i < 205; i++) await $.tool.call({ tool: 'Bash', command: 'x', description: `appel ${i}`, agentId: 'agent-rafale' })
  // A subagent's own turn opens no mission.
  await $.turn.start({ text: 'relis', turnId: 'a', agentId: 'agent-rafale' })
  await kit.clock.advance(0)

  expect(await shows($, /rafale · appel 19\d/)).toBe(true)
  expect(await shows($, /^P2$/)).toBe(false)
})

test('an agent the engine refuses flies nowhere; one with no name is called agent', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'lance')
  await spawn($, 'interdit')
  await spawn($, '', undefined, '')
  await kit.clock.advance(300)
  await kit.clock.settle()

  expect(await shows($, /⟳ 1 en vol/)).toBe(true)
  expect(await shows($, /interdit/)).toBe(false)
  expect(await shows($, /\bagent\b/)).toBe(true)
})

test('a session that ends for another reason keeps its plan; a theme with no setting gets no glass', async ($, on) => {
  const kit = engine($, on, { theme: null })
  await start($, kit.clock)
  await prompt($, 'garde-moi')
  await $.session.end({ reason: 'other', sessionId: 's1', resume: { id: 's1' } })

  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Text', text: /garde-moi/ })).toBeDefined()
  const fills = (await ui.findAll({ type: 'Text' })).map(found => found.props.backgroundColor)
  expect(fills).not.toContain(palette('dark').glass)
  expect(fills).not.toContain(palette('light').glass)
  await ui.unmount()
})

test('a transcript that cannot be read costs the history, never the prompt’s mission', async ($, on) => {
  const kit = engine($, on, { isTranscriptLost: true })
  await start($, kit.clock)
  await prompt($, 'malgré tout')

  expect(await shows($, /malgré tout/)).toBe(true)
  expect(kit.logs.some(line => line.startsWith('plan-de-vol : reprise : '))).toBe(true)
})

test('work before the first prompt draws nothing; the warp header is a surface module where one can be drawn', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  const ui = await $.ui.mount(PANE)
  // Laid out by the surface, the header draws its badge at rest.
  await ui.resize({ columns: 60, rows: 3, in: 'warp' })
  expect(await ui.find({ type: 'Text', text: /PLAN DE VOL/, in: 'warp' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /EN ORBITE {2}· {2}0 contrat\b/, in: 'warp' })).toBeDefined()

  await spawn($, 'trop tôt')
  await $.tool.call({ tool: 'Bash', command: 'ls', description: 'Avant tout' })
  await kit.clock.advance(300)
  await kit.clock.settle()
  await ui.advance(400)
  // A tool running is a turn under way: warp, with nothing to draw yet.
  expect(await ui.find({ type: 'Text', text: /QUANTUM/, in: 'warp' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /En attente du premier contrat/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Avant tout|trop tôt/ })).toBeUndefined()
  await ui.unmount()

  const plain = await $.ui.mount({ ...PANE, surface: 'vscode' })
  expect(await plain.find({ key: 'warp' })).toBeUndefined()
  expect(await plain.find({ type: 'Text', text: /En attente du premier contrat/ })).toBeDefined()
  await plain.unmount()
})

test('every origin of the person opens a mission, read at once; an empty list of attachments adds nothing', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  expect(kit.titles).toEqual(['Plan de vol'])
  for (const kind of ['bridge', 'sdk', 'slack-ping'] as const) await prompt($, `de ${kind}`, { kind })
  expect(await shows($, /⟳ Transmission reçue/)).toBe(true)
  await $.prompt.submit({ text: '', wait: false, origin: COMPOSER, attachments: [] })

  expect(await shows($, /^P3$/)).toBe(true)
  expect(await shows($, /^P4$/)).toBe(false)
})

test('each failure is logged with what failed: the theme, the fleet, at a load and at a turn’s end, the opening', async ($, on) => {
  const kit = engine($, on, { failing: ['config.list', 'agent.list', 'ui.open'] })
  await start($, kit.clock)
  await prompt($, 'lance')
  await spawn($, 'a1')
  await kit.clock.advance(300)
  // A reload while the drone flies, then the turn's end.
  await start($, kit.clock)
  await endTurn($, kit.clock)

  const count = (what: string) => kit.logs.filter(line => line.startsWith(`plan-de-vol : ${what} : `)).length
  expect([count('thème'), count('flotte'), count('ouverture')]).toEqual([2, 2, 2])
})

test('the engine’s word lands the drones whose end this copy missed, a silent one too', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'lance')
  for (const name of ['a1', 'a2', 'a3']) await spawn($, name)
  await kit.clock.advance(300)
  // a3 says nothing for longer than a drone is counted in flight.
  await kit.clock.advance(31 * 60_000)
  kit.agents.push({ id: 'agent-a1', status: 'completed' }, { id: 'agent-a2', status: 'running' }, { id: 'agent-a3', status: 'failed' })
  await endTurn($, kit.clock)

  expect(await shows($, /✓ 1 au hangar/)).toBe(true)
  expect(await shows($, /✗ 1 perdu(?!s)/)).toBe(true)
  // The one the engine still runs is still silent.
  expect(await shows($, /◌ 1 en silence radio/)).toBe(true)
})

test('a long transcript seeds its newest batch of prompts, each with the lines after it', async ($, on) => {
  const kit = engine($, on)
  for (let i = 0; i < 14; i++) kit.rows.push(user(`ancien ${String(i)}`), assistant(`réponse ${String(i)}`))
  await start($, kit.clock)

  expect(kit.asks.length).toBe(1)
  expect(kit.asks[0]).not.toContain('PROMPT : ancien 1\n')
  expect(kit.asks[0]).toContain('PROMPT : ancien 5\nÉtapes déjà tracées :\naucune\nJournal depuis :\nCLAUDE : réponse 5\n\n=== MISSION')
  expect(kit.asks[0]).toContain('PROMPT : ancien 13\nÉtapes déjà tracées :\naucune\nJournal depuis :\nCLAUDE : réponse 13')
  expect(await shows($, /^P12$/)).toBe(true)
  expect(await shows($, /^P13$/)).toBe(false)
})

test('a batch reply that skips a mission summarizes the others', async ($, on) => {
  const kit = engine($, on)
  kit.answer(JSON.stringify({ objective: null, missions: [{ n: 1, title: 'Premier titré' }, { n: 3, title: 'Troisième titré' }] }))
  for (const text of ['un', 'deux', 'trois']) kit.rows.push(user(text), assistant(`fait ${text}`))
  await start($, kit.clock)

  expect(await shows($, /Troisième titré/)).toBe(true)
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'station-0' })
  expect(await ui.find({ type: 'Text', text: /Premier titré/ })).toBeDefined()
  await ui.press({ key: 'station-1' })
  expect(await ui.find({ type: 'Text', text: /« deux »/ })).toBeDefined()
  await ui.unmount()
})

test('a batch reply that reads as nothing is logged so; no reply at all is not', async ($, on) => {
  const kit = engine($, on)
  kit.answer('pas du json')
  for (const text of ['un', 'deux']) kit.rows.push(user(text), assistant(`fait ${text}`))
  await start($, kit.clock)
  expect(kit.logs).toContain('plan-de-vol : résumé illisible')
})

test('a batch with no reply at all logs no unreadable summary', async ($, on) => {
  const kit = engine($, on)
  kit.answer(null)
  for (const text of ['un', 'deux']) kit.rows.push(user(text), assistant(`fait ${text}`))
  await start($, kit.clock)
  expect(kit.asks.length).toBe(1)
  expect(kit.logs).not.toContain('plan-de-vol : résumé illisible')
})

test('a theme named after its lightness gets its glass; a setting that is no name gets none, and no fault', async ($, on) => {
  const kit = engine($, on, { theme: 'light-ansi' })
  await start($, kit.clock)
  const ui = await $.ui.mount(PANE)
  expect((await ui.findAll({ type: 'Text' })).map(found => found.props.backgroundColor)).toContain(palette('light').glass)
  await ui.unmount()
  await $.config.set({ key: 'theme', value: 3, previous: 'light-ansi', provider: { plugin: 'engine', tier: 'core' }, origin: COMPOSER })
  expect(await shows($, /OBJECTIF/)).toBe(true)
  const after = await $.ui.mount(PANE)
  expect((await after.findAll({ type: 'Text' })).map(found => found.props.backgroundColor)).not.toContain(palette('light').glass)
  await after.unmount()
  expect(kit.logs).toEqual([])
})

test('a subagent’s words stay out of the mission’s journal; a call that is not a Workflow names no squadron', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'revue')
  await $.tool.call({ tool: 'Workflow', tool_use_id: 'wf1', script: "export const meta = { name: 'revue' }" })
  await spawn($, '', { toolUseId: 'wf1', runId: 'wf_1' })
  await step($, kit, 'je relis en sous-agent', [], 'agent-')
  // More calls than the fleet keeps squadrons, each with its own id.
  for (let i = 0; i < 41; i++) await $.tool.call({ tool: 'Read', tool_use_id: `r${String(i)}`, file_path: `/m/${String(i)}.ts` })
  await step($, kit, 'je lance la revue')
  await endTurn($, kit.clock)

  expect(kit.asks[0]).toContain('CLAUDE : je lance la revue')
  expect(kit.asks[0]).not.toContain('je relis en sous-agent')
  expect(await shows($, /ESCADRILLE · revue/)).toBe(true)
  // Unnamed, a workflow's agent goes by its place in the run.
  expect(await shows($, /⟳ agent 1/)).toBe(true)
})

const NOTIFICATION = { kind: 'task-notification' } as const

// The stations on the route, then the chosen mission's quote.
async function stations($: Engine): Promise<string[]> {
  const ui = await $.ui.mount(PANE)
  const drawn = lines(await ui.drawn()).map(line => line.trim())
  await ui.unmount()

  return drawn.flatMap(line => (/^(P\d+ *)+$/.test(line) ? line.split(/ +/) : /^« .* »$/.test(line) ? [line] : []))
}

test('a late prompt of the turn that ended, settling while an idle one enters, takes nothing from it', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'zéro')
  await endTurn($, kit.clock)
  const release = kit.holdTurnOf('A au repos')
  const entering = $.prompt.submit({ text: 'A au repos', wait: false, origin: COMPOSER })
  await kit.clock.advance(0)
  await typeOver($, 'B tardif', true)
  release()
  await entering
  await kit.clock.advance(300)

  expect(await stations($)).toEqual(['P1', 'P2', '« A au repos »'])
})

test('a notification’s turn takes its own entry: not an idle prompt entering, not a command waiting', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'un')
  // A command that starts no turn, typed mid-turn.
  await $.prompt.submit({ text: '/config', wait: false, origin: COMPOSER, command: { name: 'config', args: '' }, turnId: 't1' })
  await endTurn($, kit.clock)
  await $.prompt.submit({ text: '<task-notification>agent fini</task-notification>', wait: false, origin: NOTIFICATION })
  expect(await stations($)).toEqual(['P1', '« un »'])

  // A notification's turn while the person's prompt enters.
  const release = kit.holdTurnOf('deux')
  const entering = $.prompt.submit({ text: 'deux', wait: false, origin: COMPOSER })
  await kit.clock.advance(0)
  await $.prompt.submit({ text: '<task-notification>autre</task-notification>', wait: false, origin: NOTIFICATION })
  await step($, kit, '', [{ tool: 'Bash', command: 'x', description: 'Travail de la notification' }])
  await kit.clock.advance(300)
  expect(await stations($)).toEqual(['P1', '« un »'])
  release()
  await entering
  expect(await stations($)).toEqual(['P1', 'P2', '« deux »'])
  // Delivered into the running turn, a notification opens nothing either.
  await $.prompt.submit({ text: '<task-notification>en plein tour</task-notification>', wait: false, origin: NOTIFICATION, turnId: 't2' })
  expect(await stations($)).toEqual(['P1', 'P2', '« deux »'])
  // Even with no submission of its own, a turn of engine blocks takes no command.
  await $.prompt.submit({ text: '/config', wait: false, origin: COMPOSER, command: { name: 'config', args: '' }, turnId: 't9' })
  await $.turn.start({ text: '<task-notification>sans soumission</task-notification>', turnId: 'n2' })
  expect(await stations($)).toEqual(['P1', 'P2', '« deux »'])
})

test('a submission a hook answered stays no longer than the next idle prompt', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  kit.answerAbove(true)
  await prompt($, 'répondu sans next')
  kit.answerAbove(false)
  await prompt($, 'un')
  await endTurn($, kit.clock)
  await $.turn.start({ text: 'Continue: répondu sans next', turnId: 'x' })

  expect(await stations($)).toEqual(['P1', '« un »'])
})

test('an idle prompt opens its mission though a hook beneath added to its text', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  kit.addToTurns('\n\n<context>la branche courante</context>')
  await prompt($, 'deux')

  expect(await stations($)).toEqual(['P1', '« deux »'])
})

test('a prompt of attachments alone, entering, takes no turn that is not its own', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  const release = kit.holdTurnOf('')
  const entering = $.prompt.submit({ text: '', wait: false, origin: COMPOSER, attachments: [{ type: 'image', mediaType: 'image/png', id: 'img-2' }] })
  await kit.clock.advance(0)
  await $.turn.start({ text: 'Continue', turnId: 'c' })
  expect(await stations($)).toEqual([])
  release()
  await entering

  expect(await stations($)).toEqual(['P1', '« [pièce jointe] »'])
})

test('two idle prompts entering at once: each turn opens its own', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  const release = kit.holdTurnOf('lent')
  const slow = $.prompt.submit({ text: 'lent', wait: false, origin: COMPOSER })
  await kit.clock.advance(0)
  await prompt($, 'rapide')
  expect(await stations($)).toEqual(['P1', '« rapide »'])
  release()
  await slow
  expect(await stations($)).toEqual(['P1', 'P2', '« lent »'])
})

// The cells a drawn element's content takes on one line: a plain Button
// draws `hotkey: label`.
function cells(el: unknown): number {
  if (typeof el === 'string') return Array.from(el).length
  if (typeof el !== 'object' || el === null) return 0
  const { type, props = {}, children = [] } = el as Node
  const inner = children.flat(Infinity).reduce<number>((n, kid) => n + cells(kid), 0)
  if (type === 'Button') return (typeof props.hotkey === 'string' ? props.hotkey.length + 2 : 0) + (typeof props.label === 'string' ? Array.from(props.label).length : inner)

  return inner
}

// The labels of the buttons drawn, in order.
function labels(el: unknown): string[] {
  if (typeof el !== 'object' || el === null) return []
  const { type, props = {}, children = [] } = el as Node
  const own = type === 'Button' && typeof props.label === 'string' ? [props.label] : []

  return [...own, ...children.flat(Infinity).flatMap(labels)]
}

// Every row wider than its room: a row of the pane's column wider than the
// pane, a Box of set width whose content is wider than it.
function overflows(el: unknown, room: number): string[] {
  if (typeof el !== 'object' || el === null) return []
  const { type, props = {}, children = [] } = el as Node
  const kids = children.flat(Infinity)
  if (type === 'Box' && props.flexDirection === 'column') return kids.flatMap(kid => overflows(kid, room))
  const own = cells(el) > room ? [`${String(type)} de ${String(cells(el))} cellules pour ${String(room)}`] : []
  const boxed = kids.flatMap(kid => {
    const width = (kid as Node).props?.width
    return typeof width === 'number' && cells(kid) > width ? [`Box de ${String(cells(kid))} cellules pour ${String(width)}`] : []
  })

  return type === 'Client' ? [] : [...own, ...boxed]
}

test('every row the pane draws fits its width, the narrowest as the widest', async ($, on) => {
  const kit = engine($, on)
  kit.answer(JSON.stringify({ objective: 'Un objectif bien plus long que le panneau le plus étroit', title: 'Un titre bien plus long que le panneau', steps: [], waiting: 'Une question bien plus longue que ce que le panneau étroit peut tenir sur une ligne' }))
  await start($, kit.clock)
  for (const text of ['un', 'deux', 'trois']) {
    await prompt($, `${text} ${'mot '.repeat(30)}`)
    await step($, kit, '', [{ tool: 'Read', file_path: `/m/${text}.ts` }])
    await endTurn($, kit.clock)
  }
  for (const columns of [24, 30, 41, 42, 70]) {
    const ui = await $.ui.mount({ ...PANE, props: { ...PANE.props, bodyColumns: columns } })
    // An older mission, while the person is waited for on the newest.
    await ui.press({ key: 'station-0' })
    const drawn = await ui.drawn()
    expect([columns, overflows(drawn, columns)]).toEqual([columns, []])
    // The buttons go by arrows only where their words would not fit.
    expect([columns, labels(drawn).includes('précédent')]).toEqual([columns, columns >= 42])
    await ui.unmount()
  }
})

test('the fill is the person’s to choose: transparent shows the console, gris the glass, kept across sessions', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  expect(kit.commands.find(c => c.name === 'plan-de-vol')?.argumentHint).toBe('[transparent|gris]')
  const glass = palette('dark').glass
  const fills = async () => {
    const ui = await $.ui.mount(PANE)
    const found = (await ui.findAll({ type: 'Text' })).map(text => text.props.backgroundColor)
    await ui.unmount()
    return found
  }
  const run = (args: string) => $.command.run({ command: 'plan-de-vol', args, origin: COMPOSER, presentation: { isFullscreen: true, columns: 200 } })
  expect(await fills()).toContain(glass)

  expect((await run(' transparent ')).text).toBe('Plan de vol ouvert, fond transparent. Pour naviguer : ctrl+x tab, puis q précédent, d suivant, z position.')
  expect(await fills()).not.toContain(glass)
  // A new session, a theme set meanwhile: still none.
  await start($, kit.clock)
  await $.config.set({ key: 'theme', value: 'dark', previous: 'dark', provider: { plugin: 'engine', tier: 'core' }, origin: COMPOSER })
  expect(await fills()).not.toContain(glass)

  expect((await run('vert')).text).toBe('Plan de vol ouvert (« vert » : transparent ou gris). Pour naviguer : ctrl+x tab, puis q précédent, d suivant, z position.')
  expect(await fills()).not.toContain(glass)
  expect((await run('gris')).text).toBe('Plan de vol ouvert, fond gris. Pour naviguer : ctrl+x tab, puis q précédent, d suivant, z position.')
  expect(await fills()).toContain(glass)
  expect(kit.logs).toEqual([])
})

test('the fill choice says what is drawn: no gray for a theme of unknown lightness, any case, a long word cut, no theme read for none', async ($, on) => {
  const kit = engine($, on, { theme: 'auto', failing: ['config.list'] })
  await start($, kit.clock)
  const run = (args: string) => $.command.run({ command: 'plan-de-vol', args, origin: COMPOSER, presentation: { isFullscreen: true, columns: 200 } })
  const said = async (args: string) => ((await run(args)).text ?? '').replace(/\. Pour naviguer.*$/, '')

  // The theme unread: none still holds, gray cannot be told.
  expect(await said('TRANSPARENT')).toBe('Plan de vol ouvert, fond transparent')
  expect(await said('Gris')).toBe('Plan de vol ouvert, fond gris indisponible : ton thème ne dit pas s’il est clair ou sombre')
  expect(await said(`un  mot\n${'x'.repeat(40)}`)).toBe(`Plan de vol ouvert (« un mot ${'x'.repeat(22)}… » : transparent ou gris)`)
  // Read at the start and for gris, never for none.
  expect(kit.logs.filter(line => line.includes('thème')).length).toBe(2)
})

test('a fill choice made while the pane cannot be placed is said with the reason', async ($, on) => {
  const kit = engine($, on, { isPlaced: false })
  await start($, kit.clock)
  const ran = await $.command.run({ command: 'plan-de-vol', args: 'gris', origin: COMPOSER, presentation: { isFullscreen: true, columns: 200 } })

  expect(ran.text).toBe('Plan de vol en attente : no-surface, fond gris')
})

test('a prompt of blanks opens nothing; an idle prompt’s own turn leaves nothing for another turn of its text', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, '   ')
  expect(await stations($)).toEqual([])
  await prompt($, 'encore')
  await endTurn($, kit.clock)
  await $.turn.start({ text: 'encore', turnId: 'r' })

  expect(await stations($)).toEqual(['P1', '« encore »'])
})

test('a continuation’s turn works on with no new mission, the mission in view kept', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  for (const text of ['un', 'deux', 'trois']) {
    await prompt($, text)
    await endTurn($, kit.clock)
  }
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'station-0' })
  await ui.unmount()
  await $.turn.start({ text: 'Continue', turnId: 'c1' })
  expect(await stations($)).toEqual(['P1', 'P2', 'P3', '« un »'])
  const live = await $.ui.mount(PANE)
  await live.press({ key: 'live' })
  await live.unmount()

  expect(await shows($, /MANŒUVRE/)).toBe(true)
})

test('from the live mission, précédent goes to the one before it', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  for (const text of ['un', 'deux', 'trois']) await prompt($, text)
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'prev' })
  await ui.unmount()

  expect(await stations($)).toEqual(['P1', 'P2', 'P3', '« deux »'])
})

test('a subagent’s turn after the main turn ended leaves the ship idle; a notification’s works it, queued or not, with no mission', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'un')
  // Queued behind the running turn, its own turn later.
  const queued = '<task-notification>en file</task-notification>'
  await $.prompt.submit({ text: queued, wait: true, origin: NOTIFICATION, turnId: 't1' })
  await endTurn($, kit.clock)
  await $.turn.start({ text: 'relis', turnId: 's1', agentId: 'a1' })
  expect(await shows($, /MANŒUVRE/)).toBe(false)
  await $.turn.start({ text: queued, turnId: 'n1' })
  expect(await stations($)).toEqual(['P1', '« un »'])
  await endTurn($, kit.clock)

  await $.prompt.submit({ text: '<task-notification>au repos</task-notification>', wait: false, origin: NOTIFICATION })
  expect(await shows($, /MANŒUVRE/)).toBe(true)
  expect(await stations($)).toEqual(['P1', '« un »'])
})

test('a call that went well logs no failure; a question stays asked while another call ends beside it', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'lis')
  await step($, kit, '', [{ tool: 'Read', file_path: '/m/a.ts' }])
  const release = kit.holdToolOf('AskUserQuestion')
  const asking = $.tool.call({ tool: 'AskUserQuestion', questions: [{ question: 'Quelle couleur ?', header: 'Couleur', options: [], multiSelect: false }] })
  await kit.clock.advance(0)
  await $.tool.call({ tool: 'Read', file_path: '/m/b.ts' })
  expect(await shows($, /Quelle couleur/)).toBe(true)
  release()
  await asking
  expect(await shows($, /Quelle couleur/)).toBe(false)
  await endTurn($, kit.clock)

  expect(kit.asks[0]).toContain('a.ts')
  expect(kit.asks[0]).not.toContain('ÉCHEC')
})

test('a workflow named before any of its agents started draws no fleet', async ($, on) => {
  const kit = engine($, on)
  await start($, kit.clock)
  await prompt($, 'lance')
  await $.tool.call({ tool: 'Workflow', tool_use_id: 'wf9', script: "export const meta = { name: 'vide' }" })
  await kit.clock.advance(300)

  expect(await shows($, /ESCADRILLE/)).toBe(false)
})
