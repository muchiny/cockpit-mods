import { atom, read, update } from 'claude-code'
import type { ConfigValue, EngineInterface, PromptOrigin, Register, Timer } from 'claude-code'

import type { Live, Look, Mission, Pending, Plan } from '../types'
import { MARGIN, STATION, band, flowchart, objectiveRow, palette, route, stationName, waitingOf } from './chart'
import type { Row } from './chart'
import { EMPTY_FLEET, act, hasRunning, isFlying, land, launch, nameSquadron, reconcile, seen } from './fleet'
import type { FleetChange, Stamp } from './fleet'
import { exportName, exportPath, isSavedKey, markdown, parseSaved, savedKey, stale, stowed } from './logbook'
import type { Saved } from './logbook'
import {
  MISSIONS_MAX,
  SYSTEM_BATCH,
  SYSTEM_INCREMENT,
  addMission,
  alignBatch,
  attempted,
  batchPrompt,
  failLine,
  freshLines,
  incrementPrompt,
  isBehind,
  label,
  later,
  logLines,
  logOf,
  parseBatch,
  parseIncrement,
  question,
  restamp,
  settled,
  takePending,
  textLine,
  toolLine,
  workflowName,
} from './summary'
import type { PlanChange, Summary } from './summary'
import { clip, flatten, length } from './text'

// The session as a flight plan, in a pane beside the chat. Each prompt of
// the person's is a mission that keeps a journal of the work done for it,
// as it happens; at each turn's end Haiku folds the new lines into a few
// steps with their why; the agents a turn starts (an ultracode run's
// dozens) fly as a fleet under the mission that launched them.

const PANE = 'plan-de-vol'
// Transparent, as status-band's band: the console's own background shows through.
const OPEN = { id: PANE, title: 'Plan de vol', backgroundColor: 'transparent' } as const
// $.store keys: set when the person closes the pane (only /plan-de-vol opens
// it again), and the layout /plan-de-vol last ran in (false: the main
// screen, where a pane opened unasked would sit above the prompt).
const CLOSED = 'closed'
const FULLSCREEN = 'fullscreen'
// The fills the person chose with `/plan-de-vol <word>`, kept across
// sessions: `clear` for none at all, the console showing through.
const BACKDROP = 'backdrop'
const BACKDROPS = new Map([
  ['transparent', 'clear'],
  ['gris', 'glass'],
])
// Missions one completion summarizes at most: the newest that are behind.
const BATCH_MAX = 12
// Writes from tool calls wait this long, then land together in one write.
const FLUSH_MS = 250
// Changes waiting past this many are written at once: a timer that never
// fired holds nothing back.
const BACKLOG_MAX = 200
// The warp header's rows, above the drawing.
const HEADER_ROWS = 3
// What `date` is given to say the time.
const DATE_MS = 2000
// Who a mission's prompt comes from: the person, at the terminal, through
// Remote Control, an SDK host (the desktop app) or Slack. A notification's,
// a peer's or a scheduled prompt's work goes to the mission under way.
const PERSON: ReadonlySet<PromptOrigin['kind']> = new Set(['composer', 'bridge', 'sdk', 'slack-ping'])

const EMPTY_PLAN: Plan = { epoch: 0, objective: null, missions: [], pending: [] }
const IDLE: Live = { isWorking: false, action: null, question: null, summarizing: [] }

// Change a tag when its value's fields change: it declines what an earlier
// version stored, which outlives a reload.
const plan = atom({ plugin: 'plan-de-vol', key: 'plan' } as const, EMPTY_PLAN, { shape: 'plan-4' })
const live = atom({ plugin: 'plan-de-vol', key: 'live' } as const, IDLE, { shape: 'live-4' })
const look = atom({ plugin: 'plan-de-vol', key: 'look' } as const, 'plain' as Look, { shape: 'look-1' })
const view = atom({ plugin: 'plan-de-vol', key: 'view' } as const, null, { shape: 'view-2' })
const fleet = atom({ plugin: 'plan-de-vol', key: 'fleet' } as const, EMPTY_FLEET, { shape: 'fleet-3' })

// One event's change of the plan, the fleet or both, applied in the order the
// events came: a line lands on the mission that was newest when it was
// written, an agent under the mission that launched it.
type Change = { plan?: PlanChange; fleet?: FleetChange }

// Module state on purpose: a reload drops at most a quarter second of trace,
// never what $.state holds (the plan, the prompts waiting for their turn).
let changes: Change[] = []
let flushTimer: Timer | null = null
// Writes run one after the other, and so do summaries: each reads what the
// one before wrote.
let writes: Promise<void> = Promise.resolve()
let summaries: Promise<void> = Promise.resolve()
// The submissions entering now, the person's or not: the engine starts an
// idle submission's turn inside its prompt.submit's next(e), and that turn
// takes the one it is of (its text, flattened in `said`) out of here.
// Module state: an entry lives for one hook call.
type Entering = { said: string; shown: string; isCommand: boolean; isPerson: boolean }
let entering: Entering[] = []

// What a failed hook of the mod does: lets the event through as if the hook
// were absent. `next` is replay-safe there: a call the hook made already is
// answered again, nothing beneath runs twice.
// istanbul ignore next -- what fails in these hooks is a state write, and the test kit falls back to its own store when a test's state hook throws.
function passOn<E, R>(_$: unknown, e: E, next: (e: E) => R): R {
  return next(e)
}

function log($: EngineInterface, what: string): (err: unknown) => void {
  return err => {
    $.ui.log(`plan-de-vol : ${what} : ${String(err)}`)
  }
}

async function apply($: EngineInterface, batch: readonly Change[]): Promise<void> {
  const now = await $.clock.now()
  // Each fleet change with the newest mission's id once the plan changes
  // before it applied (the walk runs again if the write retries).
  let stamped: { change: FleetChange; at: Stamp }[] = []
  const walk = (p: Plan): Plan => {
    stamped = []
    return batch.reduce((acc, change) => {
      const changed = change.plan ? change.plan(acc) : acc
      const mission = changed.missions[changed.missions.length - 1]?.id ?? -1
      if (change.fleet) stamped.push({ change: change.fleet, at: { mission, now } })
      return changed
    }, p)
  }
  if (batch.some(change => change.plan)) await update($, plan, walk)
  else walk(await read($, plan))
  if (stamped.length > 0) await update($, fleet, f => stamped.reduce((acc, { change, at }) => change(acc, at), f))
}

function flush($: EngineInterface): Promise<void> {
  flushTimer?.cancel()
  flushTimer = null
  const batch = changes
  changes = []
  writes = writes.then(() => apply($, batch)).catch(log($, 'écriture'))

  return writes
}

function queue($: EngineInterface, change: Change): void {
  changes.push(change)
  if (changes.length >= BACKLOG_MAX) void flush($)
  else flushTimer ??= $.clock.after(FLUSH_MS, () => void flush($))
}

function serial($: EngineInterface, work: () => Promise<void>, what = 'résumé'): void {
  summaries = summaries.then(work).catch(log($, what))
}

async function complete($: EngineInterface, system: string, prompt: string, maxTokens: number): Promise<string | null> {
  const reply = await $.model.complete({ model: 'haiku', system, prompt, maxTokens, timeoutMs: 60_000 })
  if (reply.isAnswered) return reply.text
  $.ui.log(`plan-de-vol : pas de résumé (${reply.reason})`)

  return null
}

// Haiku runs only for a pane the person can see: placed by a surface (none
// is in a -p run), not closed. What it skips stays in the journals,
// summarized once the pane is up.
async function isSeen($: EngineInterface): Promise<boolean> {
  return (await $.ui.panes()).some(pane => pane.id === PANE && pane.isPlaced)
}

// One write each, the epoch checked inside it: a /clear between a summary's
// start and its end leaves the new plan alone.
async function settle($: EngineInterface, epoch: number, made: readonly Summary[], objective: string | null): Promise<void> {
  await update($, plan, p => settled(p, epoch, made, objective))
}

async function failed($: EngineInterface, epoch: number, tried: readonly { id: number; read: number }[]): Promise<void> {
  await update($, plan, p => attempted(p, epoch, tried))
}

async function increment($: EngineInterface, p: Plan, mission: Mission): Promise<void> {
  const before = p.missions.filter(m => m.id < mission.id)
  const reply = await complete($, SYSTEM_INCREMENT, incrementPrompt(p.objective, before, mission, logOf(freshLines(mission))), 1500)
  const added = reply === null ? null : parseIncrement(reply)
  if (added === null) {
    if (reply !== null) $.ui.log('plan-de-vol : résumé illisible')
    await failed($, p.epoch, [{ id: mission.id, read: mission.logged }])
    return
  }
  await settle($, p.epoch, [{ id: mission.id, read: mission.logged, ...added }], added.objective)
}

async function batch($: EngineInterface, p: Plan, missions: readonly Mission[]): Promise<void> {
  const reply = await complete($, SYSTEM_BATCH, batchPrompt(p.objective, missions), 6000)
  const back = reply === null ? null : parseBatch(reply)
  if (back === null) {
    if (reply !== null) $.ui.log('plan-de-vol : résumé illisible')
    await failed($, p.epoch, missions.map(m => ({ id: m.id, read: m.logged })))
    return
  }
  const entries = alignBatch(back, missions.length)
  const made = missions.flatMap((m, i): Summary[] => {
    const entry = entries[i]
    return entry === undefined ? [] : [{ id: m.id, read: m.logged, steps: entry.steps, title: entry.title, waiting: entry.waiting }]
  })
  await settle($, p.epoch, made, back.objective)
}

// Every mission whose journal runs past its steps: usually the newest alone,
// two after a prompt sent mid-turn, more once a closed pane opens again.
async function refresh($: EngineInterface): Promise<void> {
  if (!(await isSeen($))) return
  const p = await read($, plan)
  const behind = p.missions.filter(isBehind).slice(-BATCH_MAX)
  const [only] = behind
  if (only === undefined) return

  await update($, live, l => ({ ...l, summarizing: behind.map(m => m.id) }))
  try {
    await (behind.length === 1 ? increment($, p, only) : batch($, p, behind))
  } finally {
    await update($, live, l => ({ ...l, summarizing: [] }))
  }
}

// The plan's copy in the store, under the session's own key: what a resume
// starts from. Each session writes its key alone, so sessions running at
// once lose nothing of each other's. Only for a pane a surface draws: a -p
// run would push a session's copy out with its own. The copies past the
// newest leave.
async function stow($: EngineInterface, sessionId?: string): Promise<void> {
  const p = await read($, plan)
  if (p.missions.length === 0 || !(await isSeen($))) return
  await $.store.set(savedKey(sessionId ?? (await $.session.id())), stowed(p, await $.clock.now()))
  const keys = (await $.store.keys()).filter(isSavedKey)
  const copies = await Promise.all(keys.map(async key => ({ key, at: parseSaved(await $.store.get(key))?.at ?? -1 })))
  for (const key of stale(copies)) await $.store.delete(key)
}

async function recall($: EngineInterface): Promise<Saved | null> {
  return parseSaved(await $.store.get(savedKey(await $.session.id())))
}

// The copy unread: the transcript alone gives the plan.
function unread($: EngineInterface): (err: unknown) => null {
  return err => {
    log($, 'sauvegarde')(err)
    return null
  }
}

// A plan with no mission on a session under way (the pane started late, a
// resume). The session's copy first, as it was saved: nothing Haiku
// summarized is asked of it again, and a transcript that cannot be read
// costs only the prompts typed since. Then the prompts the transcript holds
// past it (all its newest, with no copy) become missions, their journals
// written from the rows, for the next refresh to summarize.
async function seed($: EngineInterface): Promise<void> {
  const before = await read($, plan)
  if (before.missions.length > 0) return
  // Not over a plan a /clear or a resume started meanwhile, nor over missions.
  const isAsLeft = (p: Plan, missions: number): boolean => p.epoch === before.epoch && p.missions.length === missions
  const saved = await recall($).catch(unread($))
  const kept = saved?.missions ?? []
  if (saved !== null) await update($, plan, p => (isAsLeft(p, 0) ? { ...p, objective: saved.objective, missions: kept } : p))
  const added = later(kept.at(-1), await $.session.messages(), BATCH_MAX)
  await update($, plan, p => (isAsLeft(p, kept.length) ? { ...p, missions: [...p.missions, ...added].slice(-MISSIONS_MAX) } : p))
}

// New missions: what came before them is written first, to the missions it
// belongs to.
async function begin($: EngineInterface, prompts: readonly string[]): Promise<void> {
  for (const prompt of prompts) queue($, { plan: addMission(prompt) })
  await flush($)
  await update($, live, l => ({ ...l, isWorking: true, action: 'Transmission reçue' }))
  // A new prompt brings the route back to the live mission.
  await update($, view, () => null)
}

// The engine's word on the agents it still tracks: drones whose landing this
// copy missed land, the silent ones too.
async function reconcileFleet($: EngineInterface): Promise<void> {
  if (!hasRunning(await read($, fleet))) return
  queue($, { fleet: reconcile(await $.agent.list()) })
}

// A /clear or a resume: another conversation, another plan. The epoch moves
// on, so a summary still running for the old one writes nothing.
async function reset($: EngineInterface): Promise<void> {
  changes = []
  flushTimer?.cancel()
  flushTimer = null
  await writes
  await update($, plan, p => ({ ...EMPTY_PLAN, epoch: p.epoch + 1 }))
  await update($, fleet, () => EMPTY_FLEET)
  await update($, view, () => null)
  await update($, live, () => IDLE)
}

// The theme's lightness, where its name says it; auto and custom themes give
// no glass.
function lookOf(theme: ConfigValue | undefined): Look {
  if (typeof theme !== 'string') return 'plain'

  return theme.startsWith('light') ? 'light' : theme.startsWith('dark') ? 'dark' : 'plain'
}

// The theme's lightness gives the fills, unless the person chose none.
async function lookFor($: EngineInterface, theme: ConfigValue | undefined): Promise<Look> {
  return (await $.store.get(BACKDROP)) === 'clear' ? 'plain' : lookOf(theme)
}

// The choice unread: the theme alone gives the fills; the setting stands.
// istanbul ignore next -- the test kit cannot make $.store fail.
function themeAlone($: EngineInterface, theme: ConfigValue | undefined): (err: unknown) => Look {
  return err => {
    log($, 'thème')(err)
    return lookOf(theme)
  }
}

async function readTheme($: EngineInterface): Promise<void> {
  const found = await lookFor($, (await $.config.list()).find(row => row.key === 'theme')?.value)
  await update($, look, () => found)
}

async function catchUp($: EngineInterface): Promise<void> {
  await seed($)
  await refresh($)
}

// What a load, /plan-de-vol and a turn's end owe the plan, one after the
// other: its copy as it stands (Haiku may take a minute), the summary, its
// copy with the new steps.
function settleSoon($: EngineInterface, work: () => Promise<void>): void {
  serial($, () => stow($), 'sauvegarde')
  serial($, work)
  serial($, () => stow($), 'sauvegarde')
}

// The local time, by `date`: the mod's environment may not carry the host's
// timezone. Where date cannot say, the clock's, in UTC and said so.
async function localTime($: EngineInterface, now: number): Promise<string> {
  const ran = await $.process.run(['date', '+%Y-%m-%d %H:%M'], { timeoutMs: DATE_MS }).catch(() => null)
  const out = ran?.exitCode === 0 ? ran.stdout.trim() : ''

  return out === '' ? `${new Date(now).toISOString().slice(0, 16).replace('T', ' ')} UTC` : out
}

// `/plan-de-vol export [path]`: the flight plan as a Markdown logbook, for a
// handover. The pane stays as it is.
async function exportPlan($: EngineInterface, asked: string): Promise<string> {
  // A session resumed and not prompted yet has its plan read back first.
  await seed($).catch(log($, 'reprise'))
  await flush($)
  const p = await read($, plan)
  if (p.missions.length === 0) return 'Plan de vol vide : rien à exporter.'
  const now = await $.clock.now()
  const sessionId = await $.session.id()
  const cwd = await $.session.cwd()
  const when = await localTime($, now)
  const path = exportPath(asked, await $.env.get('HOME'), cwd, exportName(when, sessionId))
  const text = markdown({ plan: p, live: await read($, live), fleet: await read($, fleet), now, when, sessionId, cwd })

  return $.fs.write(path, text).then(
    () => `Plan de vol exporté : ${path}`,
    (err: unknown) => `Export impossible vers ${path} : ${String(err)}`,
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'plan-de-vol',
      description: 'Ouvre le plan de vol de la session (logigramme) ; transparent ou gris choisit le fond, export l’écrit en Markdown',
      argumentHint: '[transparent|gris|export [chemin]]',
    })
    // A load starts with nothing running in this copy: what the copy before
    // was doing (a summary, a turn it saw start) ended with it.
    await update($, live, () => IDLE)
    void readTheme($).catch(log($, 'thème'))
    void reconcileFleet($).catch(log($, 'flotte'))
    // Unasked, a pane is a sidebar in the fullscreen layout; on the main
    // screen it would sit above the prompt, so there it waits for /plan-de-vol.
    const isClosed = (await $.store.get(CLOSED)) === true
    const isMainScreen = (await $.store.get(FULLSCREEN)) === false
    if (!isClosed && !isMainScreen) void $.ui.open(OPEN).catch(log($, 'ouverture'))
    settleSoon($, () => catchUp($))

    return next(e)
  })

  on('command.run', { command: 'plan-de-vol' }, async ($, e) => {
    const args = flatten(e.args)
    // The path keeps its case; the word may be typed in any.
    if (/^export(?: |$)/i.test(args)) return { text: await exportPlan($, args.slice('export '.length)) }
    const word = args.toLowerCase()
    const backdrop = BACKDROPS.get(word)
    if (backdrop !== undefined) {
      await $.store.set(BACKDROP, backdrop)
      // None needs no theme; the gray takes the theme's lightness.
      if (backdrop === 'clear') await update($, look, () => 'plain')
      else await readTheme($).catch(log($, 'thème'))
    }
    // What is drawn, not what was asked: a theme whose lightness is unknown
    // (auto, a custom one) has no gray.
    const isGrayless = backdrop === 'glass' && (await read($, look)) === 'plain'
    const said =
      word === ''
        ? ''
        : backdrop === undefined
          ? ` (« ${clip(word, 30)} » : transparent, gris ou export)`
          : isGrayless
            ? ', fond gris indisponible : ton thème ne dit pas s’il est clair ou sombre'
            : `, fond ${word}`
    await $.store.delete(CLOSED)
    await $.store.set(FULLSCREEN, e.presentation.isFullscreen)
    const opened = await $.ui.open(OPEN)
    // What was skipped while the pane was closed.
    settleSoon($, () => catchUp($))

    return {
      text: opened.isPlaced
        ? `Plan de vol ouvert${said}. Pour naviguer : ctrl+x tab, puis q précédent, d suivant, z position.`
        : `Plan de vol en attente : ${opened.reason}${said}`,
    }
  })

  // Closed by the person, the pane stays closed: no reload or new session reopens it.
  // istanbul ignore next -- the engine alone raises ui.close: a test's $ has no ui.close.
  on('ui.close', { id: PANE }, async ($, e, next) => {
    if (e.origin.kind === 'person') await $.store.set(CLOSED, true)

    return next(e)
  }).catch(passOn)

  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const result = await next(e)
    if (result.deny === undefined) {
      const chosen = await lookFor($, result.value).catch(themeAlone($, result.value))
      await update($, look, () => chosen)
    }

    return result
  }).catch(passOn)

  on('session.end', async ($, e, next) => {
    // What the session leaves is written whole and kept for its return,
    // under the id it ends with; a copy that cannot be written holds
    // nothing back.
    await flush($)
    await stow($, e.sessionId).catch(log($, 'sauvegarde'))
    if (e.reason === 'clear' || e.reason === 'resume') await reset($)

    return next(e)
  })

  // Where a prompt of the person's opens its mission:
  // - typed while no turn runs, at its turn's start, which the engine raises
  //   inside next(e) (a prompt a hook refused, a command that starts no turn
  //   such as /config, opens none);
  // - delivered into the running turn, once it entered;
  // - queued behind the running turn, at its own turn's start (plan.pending).
  // Another's submission (a notification, a schedule) is followed the same
  // way, so its turn takes its own entry and never the person's.
  on('prompt.submit', async ($, e, next) => {
    const shown = e.text.trim() || ((e.attachments?.length ?? 0) > 0 ? '[pièce jointe]' : '')
    const isPerson = PERSON.has(e.origin.kind) && e.isMeta !== true && shown !== ''
    // Before the prompt enters, so the transcript a seed reads does not hold
    // it; a transcript that cannot be read costs the history, not this prompt.
    await seed($).catch(log($, 'reprise'))
    const isIdle = e.turnId === undefined
    const isCommand = e.command !== undefined
    const own: Entering = { said: flatten(e.text), shown, isCommand, isPerson }
    entering.push(own)
    let isTaken: boolean
    let result: Awaited<ReturnType<typeof next>>
    try {
      result = await next(e)
    } finally {
      // Gone from here: its turn took it.
      isTaken = !entering.includes(own)
      entering = entering.filter(x => x !== own)
    }
    if (result.drop !== undefined || isTaken || (isIdle && isCommand)) return result
    if (!isIdle && !e.wait && !isCommand) {
      if (isPerson) await begin($, [shown])
      return result
    }
    // Queued: behind the running turn, or behind one that started meanwhile.
    const queued: Pending = { entered: result.text, shown, isCommand, isPerson, at: await $.clock.now() }
    await update($, plan, p => ({ ...p, pending: [...p.pending, queued] }))

    return result
  }).catch(passOn)

  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    // The idle submission this turn is of: the one that entered with its text,
    // or whose text it holds (a hook beneath added to it); a command's turn
    // carries its expansion, the newest command then.
    const said = flatten(e.text)
    const own =
      entering.find(x => !x.isCommand && x.said === said) ??
      entering.find(x => !x.isCommand && x.said !== '' && said.includes(x.said)) ??
      entering.findLast(x => x.isCommand)
    if (own !== undefined) {
      entering = entering.filter(x => x !== own)
      // No turn ran when it was submitted: nothing queued waits any more.
      await update($, plan, p => ({ ...p, pending: [] }))
      if (own.isPerson) await begin($, [own.shown])
      else await update($, live, l => ({ ...l, isWorking: true }))
      return next(e)
    }
    const now = await $.clock.now()
    let taken: Pending[] = []
    await update($, plan, p => {
      const found = takePending(p.pending, e.text, now)
      taken = found.taken
      return { ...p, pending: found.left }
    })
    const mine = taken.filter(t => t.isPerson)
    if (mine.length > 0) await begin($, mine.map(t => t.shown))
    else await update($, live, l => ({ ...l, isWorking: true }))

    return next(e)
  })

  // Claude's words of each model response, on the main loop; a subagent's
  // step is a sign of life. The stream passes on untouched, read once whole.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    if (e.agentId !== undefined) {
      queue($, { fleet: seen(e.agentId) })
      return result
    }
    const said = textLine(result.answer)
    if (said !== null) queue($, { plan: logLines([said]) })

    return result
  })

  on('tool.call', async ($, e, next) => {
    const action = label(e.tool, e)
    if (e.agentId !== undefined) {
      const agentId = e.agentId
      queue($, { fleet: act(agentId, action) })
      const done = await next(e)
      queue($, { fleet: seen(agentId) })
      return done
    }
    const isQuestion = e.tool === 'AskUserQuestion'
    if (e.tool === 'Workflow' && e.tool_use_id) queue($, { fleet: nameSquadron(e.tool_use_id, workflowName(e)) })
    queue($, { plan: logLines([toolLine(action)]) })
    await update($, live, l => ({ ...l, isWorking: true, action, question: isQuestion ? question(e) : l.question }))
    try {
      const ran = await next(e)
      if (ran.isError === true) queue($, { plan: logLines([failLine(action)]) })
      return ran
    } finally {
      // Answered, refused or cut short: the question is no longer asked.
      if (isQuestion) await update($, live, l => ({ ...l, question: null }))
    }
  }).catch(passOn)

  // Every started agent joins a squadron: its workflow run's, else its
  // mission's Agent-tool agents.
  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    // A refused spawn, or one a hook answered, started no agent.
    const id = result.agentId
    if (id !== undefined) {
      const workflow = e.workflow === undefined ? undefined : { toolUseId: e.tool_use_id, runId: e.workflow.runId }
      // The first of its names that says something.
      const names = [e.description, e.name, e.workflow ? `agent ${e.workflow.agentIndex}` : e.subagentType]
      const name = names.find(n => n !== undefined && n !== '') ?? 'agent'
      queue($, { fleet: launch(workflow, id, name) })
    }

    return result
  }).catch(passOn)

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined) {
      // An agent's turn. Aborted, refused or cut by an error: the drone is lost.
      queue($, { fleet: land(e.agentId, e.reason === 'answer' ? 'done' : 'failed') })
    } else {
      await flush($)
      // No question outlives its turn, whatever became of the call that asked it.
      await update($, live, l => ({ ...l, isWorking: false, action: null, question: null }))
      // What waited behind this turn can start now.
      const now = await $.clock.now()
      await update($, plan, p => ({ ...p, pending: restamp(p.pending, now) }))
      void reconcileFleet($).catch(log($, 'flotte'))
      settleSoon($, () => refresh($))
    }

    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text, Button } = elements
    // The warp header where the surface draws a surface module: the terminal
    // and the desktop app; elsewhere a Client renders as nothing.
    const hasHeader = e.surface === 'terminal' || e.surface === 'desktop'
    const Client = hasHeader && 'Client' in elements ? elements.Client : null
    const p = await read($, plan)
    const l = await read($, live)
    const theme = await read($, look)
    const picked = await read($, view)
    const f = await read($, fleet)
    const now = await $.clock.now()
    const w = Math.max(24, e.props.bodyColumns)
    const n = p.missions.length
    const last = n - 1
    const at = p.missions.findIndex(m => m.id === picked)
    const chosen = at >= 0 ? at : last
    const mission = p.missions[chosen]
    const isLive = chosen === last
    const squadrons = f.squadrons.filter(s => s.mission === mission?.id && s.drones.length > 0)
    const newest = p.missions[last]
    const waiting = waitingOf(newest, l)
    // The person waited for first; a background fleet keeps the ship in warp
    // after the main turn ended.
    const mode = waiting !== null ? 'waiting' : l.isWorking || isFlying(f, now) ? 'warp' : 'idle'
    const glass = palette(theme).glass
    const isWaitingElsewhere = !isLive && waiting !== null

    const draw = (row: Row) => (
      <Text wrap="truncate-end">
        {row.map(seg => (
          <Text color={seg.color} backgroundColor={seg.bg} weight={seg.bold ? 'semibold' : undefined} dimColor={seg.dim} italic={seg.italic}>
            {seg.text}
          </Text>
        ))}
      </Text>
    )
    // From the view and the plan as they are when pressed, not as drawn: two
    // quick presses move two stations. `to` takes the index in the missions
    // of the one in view and gives the one to view; none follows the newest
    // (live), and the newest is drawn live as well.
    const go = (to: (current: number, missions: readonly Mission[]) => number) => async () => {
      const missions = (await read($, plan)).missions
      await update($, view, v => {
        const found = missions.findIndex(m => m.id === v)
        const target = missions[to(found < 0 ? missions.length - 1 : found, missions)]
        return target?.id ?? null
      })
    }
    const { track, stations } = route(p.missions, Math.max(0, chosen), l, theme, w)
    const heading = mission === undefined ? [] : band(mission, isLive, theme, w)
    // Every row drawn but the flowchart's, once there is a mission, so the
    // cards get exactly the rest: the warp, the objective and a blank, the
    // route and its stations, the buttons past one mission, a blank, the band
    // and a blank, and the line that says the person is waited for elsewhere.
    const header = Client !== null ? HEADER_ROWS : 0
    const above = header + 2 + 2 + (n > 1 ? 1 : 0) + 1 + heading.length + 1 + (isWaitingElsewhere ? 1 : 0)
    const room = e.props.scroll.bodyRows - above
    // Below 42 columns the buttons go by arrows: `q: précédent   d: suivant
    // z: position` takes 40 cells. The keys are AZERTY's ZQSD: Q left, D right,
    // Z ahead to the live mission.
    const isNarrow = w < 42
    const gap = isNarrow ? ' ' : '   '
    const pointer = newest === undefined ? '' : `  ◆ À vous sur ${stationName(newest)} : `

    return (
      <Box flexDirection="column">
        {Client !== null && (
          <Client key="warp" module="./warp.tsx" props={{ mode, missions: n, glass: glass ?? null }} width="100%" height={HEADER_ROWS} />
        )}
        {draw(objectiveRow(p.objective, n > 0, theme, w))}
        <Text> </Text>
        {n > 0 && draw(track)}
        {n > 0 && (
          <Box flexDirection="row">
            <Text>{' '.repeat(MARGIN)}</Text>
            <Box flexDirection="row" backgroundColor={glass} width={w - MARGIN}>
              <Text> </Text>
              {stations.map(station => (
                <Box key={`stop-${station.id}`} flexDirection="row">
                  <Button
                    key={`station-${station.id}`}
                    plain
                    onPress={go((_, missions) => missions.findIndex(m => m.id === station.id))}
                  >
                    <Text color={station.isChosen ? 'suggestion' : 'text'} weight="semibold">
                      {station.label}
                    </Text>
                  </Button>
                  <Text>{' '.repeat(Math.max(1, STATION - length(station.label)))}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        {n > 1 && (
          <Box flexDirection="row">
            <Text>{' '.repeat(MARGIN)}</Text>
            <Box flexDirection="row" backgroundColor={glass} width={w - MARGIN}>
              <Text> </Text>
              <Button key="prev" plain hotkey="q" onPress={go(current => Math.max(0, current - 1))}>
                {isNarrow ? '◀' : 'précédent'}
              </Button>
              <Text>{gap}</Text>
              <Button key="next" plain hotkey="d" onPress={go(current => current + 1)}>
                {isNarrow ? '▶' : 'suivant'}
              </Button>
              <Text>{gap}</Text>
              <Button key="live" plain hotkey="z" onPress={go(() => -1)}>
                position
              </Button>
            </Box>
          </Box>
        )}
        <Text> </Text>
        {mission === undefined ? (
          <Text color="text" italic>
            {'  En attente du premier contrat'}
          </Text>
        ) : (
          <Box flexDirection="column">
            {heading.map(draw)}
            <Text> </Text>
            {flowchart({ mission, isLast: isLive, live: l, look: theme, squadrons, now, columns: w, rows: room }).map(draw)}
          </Box>
        )}
        {isWaitingElsewhere && newest !== undefined && (
          <Text color="warning" weight="semibold" wrap="truncate-end">
            {pointer + clip(waiting, w - length(pointer))}
          </Text>
        )}
      </Box>
    )
  })
}
