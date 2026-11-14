import { band, flowchart, objectiveRow, route } from '../hooks/chart'
import type { FlowchartArgs, Row, Seg } from '../hooks/chart'
import { STALE_MS } from '../hooks/fleet'
import { markdown } from '../hooks/logbook'
import type { Logbook } from '../hooks/logbook'
import { SYSTEM_BATCH, SYSTEM_INCREMENT, batchPrompt, incrementPrompt, logOf, newMission, textLine, toolLine } from '../hooks/summary'
import Warp from '../hooks/warp'
import type { Drone, DroneStatus, Live, Mission, Squadron, Step } from '../types'
import { PANE, endTurn, engine, prompt, reply, spawn, start, step } from './engine'
import type { Engine, On } from './engine'
import { rowRuns, rows, surface } from './surface'
import type { Props, Run } from './surface'

// The pane's drawings, each scene in words, then style by style, and what
// Haiku is asked: what tests/golden.ts holds and render.test.ts compares. After a change on
// purpose, `npm run golden` in qa/plan-de-vol writes them anew; read
// its diff before keeping it.

function style(parts: (string | false | undefined)[]): string {
  return parts.filter(part => part !== false && part !== undefined).join(' ')
}

function segment(text: string, look: string): string {
  return look === '' ? JSON.stringify(text) : `${JSON.stringify(text)} ${look}`
}

// The rows as they read, then each one's segments and their styles.
function picture(lines: string[], styled: string[][]): string {
  return [...lines, '──', ...styled.map((row, r) => `${String(r)}: ${row.join(' | ')}`)].join('\n')
}

function drawn(list: readonly Row[]): string {
  const look = (s: Seg) => style([s.color, s.bg !== undefined && `fond ${s.bg}`, s.bold === true && 'gras', s.dim === true && 'pâle', s.italic === true && 'italique'])

  return picture(
    list.map(row => row.map(s => s.text).join('')),
    list.map(row => row.map(s => segment(s.text, look(s)))),
  )
}

const IDLE: Live = { isWorking: false, action: null, question: null, summarizing: [] }
const NOW = STALE_MS * 3

function mission(id: number, prompt: string, over: Partial<Mission> = {}, lines: string[] = []): Mission {
  return { ...newMission(id, prompt, lines), ...over }
}

function drone(i: number, status: DroneStatus, over: Partial<Drone> = {}): Drone {
  return { id: `a${String(i)}`, label: `relecteur ${String(i)}`, status, action: null, seenAt: NOW, ...over }
}

function squadron(name: string, drones: Drone[]): Squadron {
  return { key: name, name, isWorkflow: true, mission: 0, drones }
}

const STEPS: Step[] = [
  { kind: 'done', what: 'Lu les hooks du mod', why: 'Comprendre le rendu du panneau' },
  { kind: 'decision', what: 'Un seul panneau latéral', why: '' },
  { kind: 'fail', what: 'Tests du rendu étroit en échec sur trois cas', why: 'Le pointeur sortait du cadre quand le panneau rétrécissait' },
  { kind: 'fix', what: 'Bornes du pointeur corrigées', why: 'Rejoué au vert' },
  { kind: 'fix', what: 'Nettoyage', why: '' },
]

const PROMPT = 'Construis un logigramme de la session qui grandit au fil du temps, lisible d’un coup d’œil, avec ce qui a été fait, pourquoi, et sur quel prompt'

function chart(over: Partial<FlowchartArgs>): string {
  return drawn(
    flowchart({
      mission: mission(0, PROMPT),
      isLast: true,
      live: IDLE,
      look: 'dark',
      squadrons: [],
      now: NOW,
      columns: 60,
      rows: 60,
      ...over,
    }),
  )
}

// The Markdown logbook /plan-de-vol export writes.
function logbook(over: Partial<Logbook>): string {
  return markdown({
    plan: { epoch: 0, objective: null, missions: [], pending: [] },
    live: IDLE,
    fleet: { squadrons: [] },
    now: NOW,
    when: '2026-11-14 02:42',
    sessionId: '1c0ffee5-0a1b-4c2d-8e3f-5a6b7c8d9e0f',
    cwd: '/home/pilote/projet',
    ...over,
  })
}

function track(count: number, chosen: number, l: Live, look: FlowchartArgs['look'], w: number, newest: Partial<Mission> = {}): string {
  const missions = Array.from({ length: count }, (_, i) => mission(i, `prompt ${String(i)}`, i === count - 1 ? newest : {}))
  const { track: row, stations } = route(missions, chosen, l, look, w)

  return `${drawn([row])}\n──\n${stations.map(s => `${s.label}#${String(s.id)}${s.isChosen ? ' choisie' : ''}`).join(' ')}`
}

// The warp header, frame by frame: each listed tick drawn with `props`.
function film(props: Props, columns: number, ticks: number[], rest?: Props): string {
  const s = surface(columns)
  const shots: string[] = []
  const shoot = (shown: Props) => {
    const state = s.states[s.states.length - 1]
    const tree = Warp(shown, surface(columns, state).held)
    const look = (r: Run) =>
      style([typeof r.color === 'string' && r.color, typeof r.bg === 'string' && `fond ${r.bg}`, r.weight === 'semibold' && 'gras', r.dim === true && 'pâle'])
    shots.push(picture(rows(tree), rowRuns(tree).map(row => row.map(r => segment(r.text, look(r))))))
  }
  Warp(props, s.held)
  const [frame] = s.frames
  let tick = 0
  for (const at of ticks) {
    for (; tick < at; tick++) frame?.()
    shoot(props)
  }
  if (rest !== undefined) {
    // Back at rest: the same sim, now drawn with these props.
    Warp(rest, surface(columns, s.states[s.states.length - 1]).held)
    for (let i = 0; i < 6; i++) frame?.()
    shoot(rest)
  }

  return shots.join('\n══\n')
}

const many: Drone[] = [
  ...Array.from({ length: 30 }, (_, i) => drone(i, 'done')),
  ...Array.from({ length: 5 }, (_, i) => drone(30 + i, 'failed')),
  drone(35, 'running', { action: 'Lit chart.ts' }),
  drone(36, 'running'),
  drone(37, 'running', { action: 'Lance les tests de rendu en largeur étroite' }),
  drone(38, 'running', { seenAt: 0 }),
  drone(39, 'running', { seenAt: 0 }),
]

// A log `n` characters long, its lines numbered so a cut shows where.
function longLog(n: number): string[] {
  return Array.from({ length: Math.ceil(n / 50) }, (_, i) => toolLine(`ligne ${String(i).padStart(4, '0')} ${'x'.repeat(36)}`))
}

const PAST: Mission[] = Array.from({ length: 10 }, (_, i) => mission(i, `prompt ancien numéro ${String(i)} un peu long pour être coupé`, i % 2 === 0 ? { title: `Titre ${String(i)}` } : {}))

type Element = { type?: unknown; key?: unknown; props?: Record<string, unknown>; children?: unknown[] }

// A tree as the surface gets it: each element and its props (the handlers
// left out), its children one indent deeper; a Text of words on one line.
function outline(el: unknown, depth = 0): string[] {
  const pad = '  '.repeat(depth)
  if (typeof el === 'string' || typeof el === 'number') return [`${pad}${JSON.stringify(el)}`]
  if (typeof el !== 'object' || el === null) return []
  const { type, key, props = {}, children = [] } = el as Element
  const kids = children.flat(Infinity)
  const named = [
    ...(key === undefined || key === null ? [] : [['key', key] as const]),
    ...Object.entries(props).filter(([name, value]) => name !== 'children' && value !== undefined && typeof value !== 'function'),
  ]
  const tag = `${pad}<${typeof type === 'string' ? type : '?'}${named.map(([name, value]) => ` ${name}=${JSON.stringify(value)}`).join('')}>`
  if (kids.length > 0 && kids.every(kid => typeof kid === 'string')) return [`${tag} ${JSON.stringify(kids.join(''))}`]

  return [tag, ...kids.flatMap(kid => outline(kid, depth + 1))]
}

type Mount = { surface?: 'terminal' | 'vscode' | 'desktop'; columns?: number; rows?: number }

// The pane as drawn, once `act` has pressed what it presses.
async function pane($: Engine, { surface: where = 'terminal', columns = 70, rows: body = 80 }: Mount = {}, act?: (ui: { press: (q: { key: string }) => Promise<unknown> }) => Promise<void>): Promise<string> {
  const ui = await $.ui.mount({ ...PANE, surface: where, props: { ...PANE.props, bodyColumns: columns, scroll: { offset: 0, bodyRows: body } } })
  if (act !== undefined) await act(ui)
  const tree = await ui.drawn()
  await ui.unmount()

  return outline(tree).join('\n')
}

export type Scene = ($: Engine, on: On) => string | Promise<string>

export const SCENES: Record<string, Scene> = {
  'panneau · au démarrage': async ($, on) => {
    const kit = engine($, on)
    await start($, kit.clock)
    return pane($)
  },
  'panneau · une mission résumée qui attend la personne': async ($, on) => {
    const kit = engine($, on)
    await start($, kit.clock)
    await prompt($, 'fais un mod')
    await step($, kit, 'Je lis.', [{ tool: 'Read', file_path: '/m/hooks/register.tsx' }])
    await endTurn($, kit.clock)
    return pane($)
  },
  'panneau · une ancienne mission choisie, la personne attendue sur la dernière': async ($, on) => {
    const kit = engine($, on, { theme: 'light' })
    await start($, kit.clock)
    for (const text of ['un', 'deux', 'trois']) {
      await prompt($, text)
      await step($, kit, '', [{ tool: 'Read', file_path: `/m/${text}.ts` }])
      await endTurn($, kit.clock)
    }
    return pane($, { columns: 50 }, async ui => {
      await ui.press({ key: 'station-0' })
    })
  },
  'panneau · au travail, une flotte en vol': async ($, on) => {
    const kit = engine($, on)
    await start($, kit.clock)
    await prompt($, 'lance la revue')
    await $.tool.call({ tool: 'Workflow', tool_use_id: 'wf1', script: "export const meta = { name: 'revue' }" })
    for (const label of ['bugs', 'perf']) await spawn($, label, { toolUseId: 'wf1', runId: 'wf_1' })
    await kit.clock.advance(300)
    return pane($)
  },
  'panneau · vscode, étroit, sans en-tête': async ($, on) => {
    const kit = engine($, on, { theme: null })
    await start($, kit.clock)
    await prompt($, 'fais un mod')
    await endTurn($, kit.clock)
    return pane($, { surface: 'vscode', columns: 10 })
  },
  'panneau · étroit, la navigation en flèches': async ($, on) => {
    const kit = engine($, on)
    await start($, kit.clock)
    for (const text of ['un', 'deux', 'trois']) {
      await prompt($, text)
      await endTurn($, kit.clock)
    }
    return pane($, { columns: 30 })
  },
  'panneau · desktop, une longue question coupée, vue d’une ancienne mission': async ($, on) => {
    const kit = engine($, on)
    await start($, kit.clock)
    await prompt($, 'un')
    await endTurn($, kit.clock)
    kit.answer(JSON.stringify({ objective: null, title: 'Deux', steps: [], waiting: 'Choisir entre la mise en page compacte et la mise en page aérée du panneau' }))
    await prompt($, 'deux')
    await step($, kit, '', [{ tool: 'Read', file_path: '/m/b.ts' }])
    await endTurn($, kit.clock)
    return pane($, { surface: 'desktop', columns: 40 }, async ui => {
      await ui.press({ key: 'prev' })
    })
  },
  'panneau · court, seules les cartes récentes tiennent': async ($, on) => {
    const kit = engine($, on)
    kit.answer(reply(9))
    await start($, kit.clock)
    await prompt($, 'beaucoup de travail')
    await step($, kit, '', [{ tool: 'Read', file_path: '/m/a.ts' }])
    await endTurn($, kit.clock)
    return pane($, { rows: 30 })
  },

  'haiku · consignes': () => `${SYSTEM_INCREMENT}\n══\n${SYSTEM_BATCH}`,
  'haiku · incrément, premier prompt': () => incrementPrompt(null, [], mission(0, 'fais un mod'), logOf([textLine('Je regarde') ?? '', toolLine('Lu a.ts')])),
  'haiku · incrément, passé, étapes repliées': () =>
    incrementPrompt('Construire plan-de-vol', PAST, mission(10, PROMPT, { steps: STEPS.slice(0, 2), earlier: 4 }), logOf([toolLine('Lu b.ts')])),
  'haiku · incrément, étapes toutes repliées': () => incrementPrompt('Objectif', PAST.slice(0, 1), mission(1, 'suite', { earlier: 2 }), ''),
  'haiku · lot de trois, un journal trop long': () =>
    batchPrompt(null, [mission(0, 'court', {}, [toolLine('Lu a.ts')]), mission(1, 'long', { steps: STEPS.slice(3) }, longLog(6000)), mission(2, 'muet')]),
  'haiku · lot d’un seul, au-delà du plancher': () => batchPrompt('Objectif', [mission(0, 'seul', {}, longLog(1000))]),

  'journal de bord · chaque nature d’étape, journal brut, escadrille, la personne attendue': () =>
    logbook({
      plan: {
        epoch: 0,
        objective: 'Construire plan-de-vol',
        pending: [],
        missions: [
          mission(0, PROMPT, { title: 'Logigramme de session', steps: STEPS, earlier: 3 }),
          mission(1, 'ajoute un export\nen Markdown', { waiting: 'Valider la maquette' }, [textLine('Je regarde le rendu') ?? '', toolLine('Lu chart.ts')]),
        ],
      },
      fleet: {
        squadrons: [
          squadron('revue-ultracode', [drone(0, 'running', { action: 'Lu chart.ts' }), drone(1, 'done'), drone(2, 'failed'), drone(3, 'running', { seenAt: 0 })]),
        ],
      },
    }),
  'journal de bord · au travail, sans objectif': () =>
    logbook({
      plan: { epoch: 0, objective: null, pending: [], missions: [mission(0, 'fais un mod')] },
      live: { ...IDLE, isWorking: true, action: 'Edit chart.ts' },
    }),

  'objectif · aucun prompt · sans verre': () => drawn([objectiveRow(null, false, 'plain', 50)]),
  'objectif · en analyse · sombre': () => drawn([objectiveRow(null, true, 'dark', 50)]),
  'objectif · long, coupé · clair': () => drawn([objectiveRow(PROMPT, true, 'light', 40)]),

  'bandeau · en direct, titré': () => drawn(band(mission(4, 'court', { title: 'Logigramme de session' }), true, 'dark', 60)),
  'bandeau · historique, prompt long': () => drawn(band(mission(1, PROMPT), false, 'light', 40)),
  'bandeau · deux lignes tout juste': () => drawn(band(mission(2, 'un prompt qui tient sur deux lignes exactement'), true, 'plain', 30)),
  'bandeau · deuxième ligne pleine, coupée': () => drawn(band(mission(3, 'aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj kkkk'), true, 'plain', 30)),
  'bandeau · très étroit': () => drawn(band(mission(0, PROMPT, { title: 'Titre bien trop long pour la place' }), false, 'plain', 20)),

  'route · trois prompts, le dernier au travail': () => track(3, 2, { ...IDLE, isWorking: true }, 'dark', 60),
  'route · un ancien choisi, les récents repliés, question posée': () => track(12, 3, { ...IDLE, question: 'Lequel ?' }, 'light', 40),
  'route · fenêtre glissée des deux côtés': () => track(12, 8, IDLE, 'dark', 40),
  'route · au repos, le dernier attend': () => track(5, 1, IDLE, 'plain', 60, { waiting: 'Valider le plan' }),
  'route · au repos, rien n’attend, le dernier choisi': () => track(4, 3, IDLE, 'dark', 60),
  'route · un seul prompt': () => track(1, 0, IDLE, 'plain', 8),

  'logigramme · vide': () => chart({}),
  'logigramme · étapes, boucle échec → correction, en cours': () =>
    chart({ mission: mission(0, PROMPT, { steps: STEPS }), live: { ...IDLE, isWorking: true, action: 'Bash · npm test' } }),
  'logigramme · étroit, sans gouttière · clair': () => chart({ mission: mission(0, PROMPT, { steps: STEPS.slice(1, 4) }), look: 'light', columns: 30 }),
  'logigramme · replié, étapes plus haut · historique': () =>
    chart({ mission: mission(0, PROMPT, { steps: STEPS, earlier: 3 }), isLast: false, look: 'plain', rows: 10 }),
  'logigramme · journal long, résumé en cours, question': () =>
    chart({
      mission: mission(0, PROMPT, {}, [textLine('Je regarde') ?? '', ...['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts'].map(f => toolLine(`Lu ${f}`))]),
      live: { ...IDLE, isWorking: true, question: 'Garder le thème sombre ou suivre le terminal ?', summarizing: [0] },
    }),
  'logigramme · journal court · historique, clair': () =>
    chart({ mission: mission(0, PROMPT, {}, [toolLine('Lu a.ts'), toolLine('Grep « route »')]), isLast: false, look: 'light' }),
  'logigramme · en attente après le résumé': () =>
    chart({ mission: mission(0, PROMPT, { steps: STEPS.slice(0, 1), waiting: 'Choisir entre deux mises en page' }) }),
  'logigramme · en cours sans action': () => chart({ live: { ...IDLE, isWorking: true }, look: 'plain' }),
  'logigramme · flotte nombreuse, étroite': () => chart({ squadrons: [squadron('revue-ultracode', many)], columns: 30 }),
  'logigramme · flotte rentrée · clair': () =>
    chart({ squadrons: [squadron('relecture', [drone(0, 'done'), drone(1, 'done'), drone(2, 'failed')])], look: 'light', isLast: false }),
  'logigramme · flotte, minuscule': () =>
    chart({ squadrons: [squadron('audit', [drone(0, 'running', { seenAt: 0 }), drone(1, 'running', { seenAt: 0 }), drone(2, 'done')])], columns: 10 }),
  'logigramme · trop court : la plus récente, seule': () => chart({ mission: mission(0, PROMPT, { steps: STEPS }), rows: 2 }),
  'logigramme · à la ligne près : tout tient, sans repli': () => chart({ mission: mission(0, PROMPT, { steps: STEPS.slice(0, 2) }), rows: 8 }),
  'logigramme · à la ligne près : une de moins, repliée': () => chart({ mission: mission(0, PROMPT, { steps: STEPS.slice(0, 2) }), rows: 7 }),
  'logigramme · clair, chaque carte, en cours': () =>
    chart({ mission: mission(0, PROMPT, { steps: STEPS }), live: { ...IDLE, isWorking: true, action: 'Edit chart.ts' }, look: 'light' }),
  'logigramme · clair, à toi': () => chart({ mission: mission(0, PROMPT, { waiting: 'Valider la maquette' }), look: 'light' }),
  'logigramme · historique pendant un tour': () =>
    chart({ mission: mission(0, PROMPT, { steps: STEPS.slice(0, 1) }), isLast: false, live: { ...IDLE, isWorking: true, question: 'Lequel ?' } }),
  'logigramme · quarante colonnes, la boucle tient': () => chart({ mission: mission(0, PROMPT, { steps: STEPS.slice(2, 4) }), columns: 40 }),
  'logigramme · compteurs de flotte pile à la largeur': () =>
    chart({ squadrons: [squadron('pile', [drone(0, 'running'), drone(1, 'running'), drone(2, 'done')])], columns: 32 }),
  'logigramme · deux rangées pleines de drones': () => chart({ squadrons: [squadron('rangées', Array.from({ length: 24 }, (_, i) => drone(i, 'done')))], columns: 30 }),
  'logigramme · trois rangées pleines, aucun reste': () =>
    chart({ squadrons: [squadron('pleines', Array.from({ length: 36 }, (_, i) => drone(i, 'done')))], columns: 30 }),
  'logigramme · cinq drones en vol, les trois derniers nommés': () =>
    chart({ squadrons: [squadron('cinq', Array.from({ length: 5 }, (_, i) => drone(i, 'running', { action: `tâche ${String(i)}` })))] }),
  'logigramme · journal de quatre actions, une longue': () =>
    chart({
      mission: mission(0, PROMPT, {}, [
        toolLine('Lu a.ts'),
        toolLine('Bash · une commande bien trop longue pour tenir sur la ligne de la carte du journal'),
        toolLine('Lu c.ts'),
        toolLine('Lu d.ts'),
      ]),
    }),
  'logigramme · minuscule': () => chart({ mission: mission(0, PROMPT, { steps: STEPS.slice(0, 2) }), columns: 10 }),

  'warp · au repos': () => film({ mode: 'idle', missions: 1, glass: null }, 60, [0, 4, 8, 37]),
  'warp · en vol, sur verre sombre': () => film({ mode: 'warp', missions: 3, glass: '#0e121b' }, 60, [0, 3, 10, 30], { mode: 'idle', missions: 3, glass: '#0e121b' }),
  'warp · en attente, le cadre clignote': () => film({ mode: 'waiting', missions: 2, glass: '#eef1f6' }, 50, [0, 5]),
  'warp · badge pile à la largeur': () => film({ mode: 'warp', missions: 3, glass: null }, 30, [0]),
  'warp · une colonne de moins, le statut seul': () => film({ mode: 'warp', missions: 3, glass: null }, 29, [0]),
  'warp · étroit': () => film({ mode: 'warp', missions: 12, glass: null }, 18, [0, 20]),
}
