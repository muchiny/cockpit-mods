import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Git, Line } from '../types'

// Change the tag when Line's fields change: it declines what an earlier
// version stored, which outlives a reload.
const line = atom({ plugin: 'status-band', key: 'line' } as const, null, {
  // Stryker disable next-line StringLiteral: a tag is a name; any other declines what this one stored
  shape: 'line-3',
})

// Clock, RAM, git and the subagents have no event of their own: polled.
const TICK_MS = 15_000
const PROCESS_TIMEOUT_MS = 2000
const IN_FLIGHT = new Set(['pending', 'running', 'waiting'])
const HOUR_MS = 3_600_000

// The week's ledger, in the mod's store, which every session of the machine
// shares: each session notes what it spent under a key of its own, so that
// sessions writing at once lose nothing. The tags decline what another
// version stored.
// Stryker disable next-line StringLiteral: a tag is a name; any other declines what this one stored
const ENTRY = 'week-1:'
// Stryker disable next-line StringLiteral: a tag is a name; any other declines what this one stored
const RATE = 'rate-1'
// The account's windows as the last session to hear of them read them: a
// session knows none before its first response, and shows these meanwhile.
// Stryker disable next-line StringLiteral: a tag is a name; any other declines what this one stored
const LIMITS = 'limits-1'
const ENTRY_FIELDS = ['week', 'from', 'to', 'spent', 'usd'] as const
// The worth of a dollar moves slowly: every session's entry is read again
// this often, and only once the week's percentage moved enough to tell.
const RATE_EVERY_MS = 5 * 60_000
const RATE_MIN_PCT = 1
// Folders whose work tree is remembered, so that git is asked once for each.
const TREES_MAX = 200

// What the band shows until a reading comes in.
const BLANK: Line = {
  model: '--',
  effort: null,
  dir: '--',
  branch: null,
  git: null,
  contextPercent: null,
  contextTokens: null,
  contextWindow: null,
  costUsd: null,
  fiveHourPercent: null,
  fiveHourResetsAt: null,
  sevenDayPercent: null,
  sevenDayResetsAt: null,
  weekSharePercent: null,
  ramAvailableMb: null,
  clock: '',
  sessionStartedAt: null,
  turnStartedAt: null,
  tool: null,
  toolCount: 0,
  agentsInFlight: 0,
  prompts: 0,
  updatedAt: 0,
}

type Limit = { kind: string; percentUsed: number; resetsAt?: string }

type Usage = {
  context: { percent?: number; tokens?: number; window: number }
  rateLimits: readonly Limit[]
  cost?: { usd: number }
}

type Repo = { branch: string | null; git: Git | null }

// A work tree, and the name of the repository it belongs to.
type Tree = { root: string; name: string }

// Where NAV points when the session's own folder is in no repository: the
// work tree of the last file Claude touched.
type Nav = { isAdrift: boolean; followed: Tree | null; trees: Map<string, Tree | null> }

// What one session took of one week: the week by the moment it resets at, the
// account's weekly percentage when the session first and last read it, the
// dollars it spent in between, and its cost at the last reading.
type Entry = Record<(typeof ENTRY_FIELDS)[number], number>

// What this process keeps of the ledger, whose entries live in the store:
// the worth of a dollar in percent of the week, and when that was worked out.
type Ledger = { perUsd: number | null; ratedAt: number }

// What outlives a reading, for the next one; `last`: the reading under way,
// which the next one waits for.
type Flight = { nav: Nav; ledger: Ledger; last: Promise<void> }

// claude-opus-5-5 → opus 5.5 ; claude-sonnet-4-5-20250929[1m] → sonnet 4.5 ;
// anything else as it came. The cockpit sets the case.
function prettyModel(id: string): string {
  const bare = id.replace(/\[[^[\]]*\]$/, '').replace(/-\d{8}$/, '').replace(/^claude-/, '')
  if (!/^[a-z]+(?:-\d+)*$/.test(bare)) return id
  const family = bare.replace(/-.*/, '')
  const version = bare.slice(family.length + 1).replaceAll('-', '.')

  return version ? `${family} ${version}` : family
}

// When a rate-limit window resets, if it says so in a date that reads.
function resetOf(limit: { resetsAt?: string } | undefined): number | null {
  const at = limit?.resetsAt === undefined ? Number.NaN : Date.parse(limit.resetsAt)

  return Number.isNaN(at) ? null : at
}

// With no window at all the engine has heard of none yet: what the band
// shows of them stands.
function fromUsage(usage: Usage) {
  const fiveHour = usage.rateLimits.find(r => r.kind === 'five_hour')
  const sevenDay = usage.rateLimits.find(r => r.kind === 'seven_day')

  return {
    contextPercent: usage.context.percent ?? null,
    contextTokens: usage.context.tokens ?? null,
    contextWindow: usage.context.window,
    costUsd: usage.cost?.usd ?? null,
    ...(usage.rateLimits.length === 0
      ? {}
      : {
          fiveHourPercent: fiveHour ? Math.floor(fiveHour.percentUsed) : null,
          fiveHourResetsAt: resetOf(fiveHour),
          sevenDayPercent: sevenDay ? Math.floor(sevenDay.percentUsed) : null,
          sevenDayResetsAt: resetOf(sevenDay),
        }),
  }
}

// A window as the store keeps it. Nothing stored has no field; a number or
// a text has none of these.
function isLimit(value: unknown): value is Limit {
  const limit = (value ?? {}) as Partial<Record<keyof Limit, unknown>>

  return typeof limit.kind === 'string' && typeof limit.percentUsed === 'number' && typeof limit.resetsAt === 'string'
}

// When a window resets; the oldest time there is for one that does not say.
function resetTime(limit: Limit): number {
  return resetOf(limit) ?? 0
}

// The readings of one window in order, the one further on first: the later
// reset, or at one reset the higher percentage, which only a reset brings down.
function byFreshness(a: Limit, b: Limit): number {
  return resetTime(b) - resetTime(a) || b.percentUsed - a.percentUsed
}

// What the store keeps of the windows: those that say when they reset, their
// own fields alone, in one order whoever writes them.
function storable(limits: readonly Limit[]): Limit[] {
  return limits
    .filter(isLimit)
    .map(({ kind, percentUsed, resetsAt }) => ({ kind, percentUsed, resetsAt }))
    .sort((a, b) => a.kind.localeCompare(b.kind))
}

// The usage with the account's windows as the sessions of the machine last
// heard of them: this session's own reading and what the store holds that
// has not reset since, the fresher of the two for each window. So a session
// shows them before its first response, and an idle one follows the others.
// The store is written when that changes what it holds.
async function withLimits<U extends Usage>($: EngineInterface, usage: U, now: number): Promise<U> {
  // What the store holds, as a list: anything else in it is no window.
  const kept = [await $.store.get(LIMITS)]
    .flat()
    .filter(isLimit)
    .filter(limit => resetTime(limit) > now)
  const all = [...usage.rateLimits, ...kept]
  const rateLimits = [...new Set(all.map(limit => limit.kind))].flatMap(kind =>
    all
      .filter(limit => limit.kind === kind)
      .sort(byFreshness)
      .slice(0, 1),
  )
  const noted = storable(rateLimits)
  if (JSON.stringify(noted) !== JSON.stringify(storable(kept))) await $.store.set(LIMITS, noted)

  return { ...usage, rateLimits }
}

// The last folder of a path: the path itself at the filesystem's root.
function folder(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}

// `git status --porcelain=v2 --branch`: the branch, how far it is from its
// upstream, and one row per changed or untracked file.
function parseGit(out: string): { branch: string | null; git: Git } {
  let branch: string | null = null
  const git = { changed: 0, ahead: 0, behind: 0 }
  for (const row of out.split('\n')) {
    if (row.startsWith('# branch.head ')) {
      const head = row.slice('# branch.head '.length)
      branch = head === '(detached)' ? 'détaché' : head
    } else if (row.startsWith('# branch.ab ')) {
      const ab = /\+(\d+) -(\d+)/.exec(row)
      git.ahead = Number(ab?.[1] ?? 0)
      git.behind = Number(ab?.[2] ?? 0)
    } else if (/^[12u?] /.test(row)) {
      git.changed += 1
    }
  }

  return { branch, git }
}

// Undefined when the source could not answer: the band keeps what it last knew.
async function attempt<T>(source: () => Promise<T>): Promise<T | undefined> {
  try {
    return await source()
  } catch {
    // Nothing known: undefined.
  }
}

// Leaves out what a source could not say.
function known(fields: Partial<Line>): Partial<Line> {
  return Object.fromEntries(Object.entries<unknown>(fields).filter(([, value]) => value !== undefined))
}

// Writes what is known over what was; never rejects, so any hook or timer can
// call it without a guard.
async function patch($: EngineInterface, fields: Partial<Line>): Promise<void> {
  await attempt(() => update($, line, prev => ({ ...BLANK, ...prev, ...known(fields) })))
}

// `--no-optional-locks`: a read that never takes `.git/index.lock` from under
// a commit. Outside a repository git exits non-zero: no branch. Too slow, the
// run rejects: undefined, and the last state stands.
async function readRepo($: EngineInterface, cwd: string): Promise<Repo | undefined> {
  const ran = await attempt(() =>
    $.process.run(['git', '--no-optional-locks', 'status', '--porcelain=v2', '--branch'], {
      cwd,
      timeoutMs: PROCESS_TIMEOUT_MS,
    }),
  )
  if (ran === undefined) return undefined

  return ran.exitCode === 0 ? parseGit(ran.stdout) : { branch: null, git: null }
}

// The work tree a folder is in and its repository's name; null in none,
// undefined when git was too slow to say. A linked work tree is named after
// the repository it shares, not after its own folder, which is its branch's.
async function readTree($: EngineInterface, dir: string): Promise<Tree | null | undefined> {
  const ran = await attempt(() =>
    $.process.run(['git', 'rev-parse', '--path-format=absolute', '--show-toplevel', '--git-common-dir'], {
      cwd: dir,
      timeoutMs: PROCESS_TIMEOUT_MS,
    }),
  )
  if (ran === undefined) return undefined
  const [root, shared] = ran.stdout.split('\n')
  if (ran.exitCode !== 0 || !root) return null

  return { root, name: folder(shared?.endsWith('/.git') ? shared.slice(0, -'/.git'.length) : root) }
}

// The file a tool call reads or writes, when it names one by an absolute path.
function fileOf(call: object): string | null {
  const { file_path: file, notebook_path: notebook } = call as { file_path?: unknown; notebook_path?: unknown }
  const path = file ?? notebook

  return typeof path === 'string' && path.startsWith('/') ? path : null
}

// What NAV shows: the session's folder and its repository; in no repository,
// the work tree followed, for as long as it is one.
async function readNav($: EngineInterface, cwd: string, nav: Nav): Promise<Partial<Line>> {
  const home = await readRepo($, cwd)
  if (home !== undefined) nav.isAdrift = home.git === null
  const { followed } = nav
  if (!nav.isAdrift || followed === null) return { dir: folder(cwd), ...home }

  const repo = await readRepo($, followed.root)
  // Too slow to answer: what NAV last showed stands.
  if (repo === undefined) return {}
  if (repo.git === null) {
    nav.followed = null
    return { dir: folder(cwd), ...home }
  }

  return { dir: followed.name, ...repo }
}

// Two readings of one week may say its reset a moment apart: within the
// hour, one week.
function isSameWeek(a: number, b: number): boolean {
  return Math.abs(a - b) < HOUR_MS
}

function isEntry(value: unknown): value is Entry {
  return (
    typeof value === 'object' &&
    value !== null &&
    ENTRY_FIELDS.every(field => typeof (value as Record<string, unknown>)[field] === 'number')
  )
}

// The worth of a dollar in percent of the week: how far the account's
// percentage moved over what every session noted spending meanwhile. Until
// it has moved enough to tell, the last worth worked out, a past week's even.
// Entries of a past week are dropped on the way.
async function readRate($: EngineInterface, week: number): Promise<number | null> {
  let from = Infinity
  let to = -Infinity
  let spent = 0
  for (const key of await $.store.keys()) {
    if (!key.startsWith(ENTRY)) continue
    const entry = await $.store.get(key)
    if (!isEntry(entry)) continue
    if (!isSameWeek(entry.week, week)) {
      // Stryker disable next-line EqualityOperator: a week that is not this one is never equal to it
      if (entry.week < week) await $.store.delete(key)
      continue
    }
    from = Math.min(from, entry.from)
    to = Math.max(to, entry.to)
    spent += entry.spent
  }
  if (to - from >= RATE_MIN_PCT && spent > 0) {
    const perUsd = (to - from) / spent
    await $.store.set(RATE, perUsd)
    return perUsd
  }
  const last = await $.store.get(RATE)

  return typeof last === 'number' ? last : null
}

// Notes in the ledger what the session has spent of the week, and answers
// its share of the week in percent: null without a weekly window or a cost,
// or while the worth of a dollar is unknown. The cost is the session's alone,
// the percentage the whole account's: only the ledger tells one session's
// share from another's running beside it. The count starts at the session's
// first reading of the week: with the windows another session left in the
// store, before its first request; with none, after it, and that request
// stays out.
async function readShare($: EngineInterface, usage: Usage, now: number, ledger: Ledger): Promise<number | null> {
  const sevenDay = usage.rateLimits.find(r => r.kind === 'seven_day')
  const week = resetOf(sevenDay)
  // Stryker disable next-line ConditionalExpression: a window that is not there has no reset either, and the next line answers the same; this one is for the types
  if (sevenDay === undefined) return null
  if (week === null || usage.cost === undefined) return null
  const percent = sevenDay.percentUsed
  const { usd } = usage.cost
  const key = `${ENTRY}${await $.session.id()}`

  // What the store keeps for this session and this week: nothing yet at its
  // first reading, after a /clear (a new id) or a week's reset.
  const stored = await $.store.get(key)
  const kept = isEntry(stored) && isSameWeek(stored.week, week) ? stored : null
  const base = kept ?? { week, from: percent, to: percent, spent: 0, usd }
  // A cost that starts over counts from there.
  const entry = { ...base, to: percent, spent: base.spent + Math.max(0, usd - base.usd), usd }
  // Written when new, or when it moved.
  if (entry.to !== kept?.to || entry.usd !== kept.usd) await $.store.set(key, entry)

  if (now - ledger.ratedAt >= RATE_EVERY_MS) {
    ledger.perUsd = await readRate($, week)
    ledger.ratedAt = now
  }

  // A worth told too high (spending the ledger did not see) must not say the
  // session took more of the week than the whole account has.
  return ledger.perUsd === null ? null : Math.min(entry.spent * ledger.perUsd, percent)
}

// `date` rather than Date: the mod's environment may not carry the host's timezone.
async function readClock($: EngineInterface): Promise<string | undefined> {
  const ran = await attempt(() => $.process.run(['date', '+%H:%M'], { timeoutMs: PROCESS_TIMEOUT_MS }))
  const out = ran?.exitCode === 0 ? ran.stdout.trim() : ''

  return out === '' ? undefined : out
}

async function readRam($: EngineInterface): Promise<number | undefined> {
  const meminfo = await attempt(() => $.fs.read('/proc/meminfo'))
  // Stryker disable next-line StringLiteral: nothing read, any text without MemAvailable matches nothing
  const kb = /^MemAvailable:\s+(\d+)/m.exec(meminfo ?? '')

  return kb ? Math.floor(Number(kb[1]) / 1024) : undefined
}

async function readSquadron($: EngineInterface): Promise<number | undefined> {
  const agents = await attempt(() => $.agent.list())

  return agents?.filter(agent => IN_FLIGHT.has(agent.status)).length
}

// One reading of everything the band shows.
async function refresh($: EngineInterface, flight: Flight): Promise<void> {
  const [model, cwd, usage, ram, clock, prompts, agents, now] = await Promise.all([
    attempt(() => $.session.model()),
    attempt(() => $.session.cwd()),
    attempt(() => $.session.usage()),
    readRam($),
    readClock($),
    attempt(() => $.session.turns()),
    readSquadron($),
    attempt(() => $.clock.now()),
  ])
  // A store that fails leaves the usage as the engine gave it.
  const seen =
    // Stryker disable next-line ConditionalExpression,LogicalOperator: with either unknown the reading throws inside `attempt` and the usage stands as it was; the test is for the types
    usage === undefined || now === undefined ? usage : ((await attempt(() => withLimits($, usage, now))) ?? usage)
  const [nav, share] = await Promise.all([
    cwd === undefined ? {} : readNav($, cwd, flight.nav),
    // Stryker disable next-line ConditionalExpression,LogicalOperator: with either unknown the reading throws inside `attempt`, which answers undefined too; the test is for the types
    seen === undefined || now === undefined ? undefined : attempt(() => readShare($, seen, now, flight.ledger)),
  ])

  await patch($, {
    model: model === undefined ? undefined : prettyModel(model),
    ...nav,
    ...(seen === undefined ? {} : { ...fromUsage(seen), sessionStartedAt: seen.startedAt }),
    weekSharePercent: share,
    ramAvailableMb: ram,
    clock,
    prompts,
    agentsInFlight: agents,
    updatedAt: now,
  })
}

// Readings run one at a time, in the order asked: a slow one never lands
// its figures on a later one's.
function refreshInTurn($: EngineInterface, flight: Flight): void {
  flight.last = flight.last.then(() => refresh($, flight))
}

// A full reading off the path of the event that asks for it: the timer runs
// it once the hook has handed back.
function refreshSoon($: EngineInterface, flight: Flight): void {
  $.clock.after(0, () => {
    refreshInTurn($, flight)
  })
}

// Notes the work tree a touched file is in; a new one shows at once.
async function follow($: EngineInterface, flight: Flight, file: string): Promise<void> {
  const { nav } = flight
  const dir = file.slice(0, file.lastIndexOf('/')) || '/'
  let tree = nav.trees.get(dir)
  if (tree === undefined) {
    tree = await readTree($, dir)
    // Too slow to say: asked again at the folder's next file.
    if (tree === undefined) return
    if (nav.trees.size >= TREES_MAX) nav.trees.clear()
    nav.trees.set(dir, tree)
  }
  if (tree === null || tree.root === nav.followed?.root) return
  nav.followed = tree
  refreshSoon($, flight)
}

// The session's last word in the ledger, before it ends: with the week as
// the machine's sessions last heard of it, which an idle session's own
// reading is behind.
async function closeLedger($: EngineInterface, ledger: Ledger): Promise<void> {
  await attempt(async () => {
    const [usage, now] = await Promise.all([$.session.usage(), $.clock.now()])
    await readShare($, await withLimits($, usage, now), now, ledger)
  })
}

// Bookkeeping beside an event, never ahead of it: started first, settled
// before the hook returns. It cannot fail the event: `patch` never rejects.
async function beside<T>(work: Promise<void>, event: Promise<T>): Promise<T> {
  // Stryker disable next-line BlockStatement: a hook that answers nothing is skipped and the engine's answer stands; the kit tells no test
  try {
    return await event
  } finally {
    await work
  }
}

async function markTurn($: EngineInterface): Promise<void> {
  const [now, prompts] = await Promise.all([attempt(() => $.clock.now()), attempt(() => $.session.turns())])
  await patch($, { turnStartedAt: now, prompts, updatedAt: now })
}

async function countSquadron($: EngineInterface): Promise<void> {
  await patch($, { agentsInFlight: await readSquadron($) })
}

async function noteEffort($: EngineInterface, raw: string | number | undefined): Promise<void> {
  const effort = raw === undefined ? null : String(raw)
  const shown = await attempt(() => read($, line))
  if (shown?.effort !== effort) await patch($, { effort })
}

export const register: Register = on => {
  // Tools in flight by call id; the cockpit shows the latest one started.
  const running = new Map<string, string>()
  const flight: Flight = {
    nav: { isAdrift: false, followed: null, trees: new Map() },
    ledger: { perUsd: null, ratedAt: -Infinity },
    last: Promise.resolve(),
  }

  on('session.start', async ($, e, next) => {
    // The poll starts first: whatever the first reading meets, it catches up.
    $.clock.every(TICK_MS, () => {
      refreshInTurn($, flight)
    })
    refreshSoon($, flight)

    return next(e)
  })

  // A short session ends between two polls: its spending is noted here.
  on('session.end', ($, e, next) => beside(closeLedger($, flight.ledger), next(e)))

  on('session.measure', ($, e, next) => beside(patch($, fromUsage(e)), next(e)))

  // The effort reaches a mod only on the model request itself.
  on('turn.step', async function* ($, e, next) {
    const noting = e.agentId === undefined ? noteEffort($, e.effort) : Promise.resolve()
    // Stryker disable next-line BlockStatement: a hook that answers nothing is skipped and the engine's answer stands; the kit tells no test
    try {
      return yield* next(e)
    } finally {
      await noting
    }
  })

  on('turn.start', ($, e, next) => beside(e.agentId === undefined ? markTurn($) : countSquadron($), next(e)))

  on('turn.complete', ($, e, next) => {
    if (e.agentId !== undefined) return beside(countSquadron($), next(e))
    refreshSoon($, flight)

    return beside(patch($, { turnStartedAt: null }), next(e))
  })

  on('tool.call', async ($, e, next) => {
    running.set(e.tool_use_id, e.tool)
    const marking = attempt(() =>
      update($, line, prev => ({ ...BLANK, ...prev, tool: e.tool, toolCount: (prev?.toolCount ?? 0) + 1 })),
    )
    // In a repository of its own the session needs no following: git is not asked.
    const file = flight.nav.isAdrift ? fileOf(e) : null
    const following = file === null ? Promise.resolve() : follow($, flight, file)
    try {
      return await next(e)
    } finally {
      running.delete(e.tool_use_id)
      await marking
      await following
      await patch($, { tool: [...running.values()].pop() ?? null })
    }
  })

  // The cockpit animates on its own frame clock: the hook hands it fresh
  // figures and whether Claude is working, nothing more.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const now = await read($, line)
    if (e.props.hasSurvey || now === null) {
      return next(e)
    }

    const elements = $.ui.resolve(e)
    // VS Code and mobile draw no Client. The test kit hands every surface
    // every element, so no test reaches this: left out of the coverage.
    /* istanbul ignore if */
    // Stryker disable next-line ConditionalExpression,BlockStatement: no surface of the kit lacks a Client
    if (!('Client' in elements)) {
      return next(e)
    }
    const { Client } = elements
    const props = { line: now, isWorking: e.props.isWorking }

    return <Client key="cockpit" module="./cockpit.tsx" props={props} width="100%" height={3} />
  })
}
