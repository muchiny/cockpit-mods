import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Git, Line } from '../types'

// Change the tag when Line's fields change: it declines what an earlier
// version stored, which outlives a reload.
const line = atom({ plugin: 'status-band', key: 'line' } as const, null, {
  // Stryker disable next-line StringLiteral: a tag is a name; any other declines what this one stored
  shape: 'line-2',
})

// Clock, RAM, git and the subagents have no event of their own: polled.
const TICK_MS = 15_000
const PROCESS_TIMEOUT_MS = 2000
const IN_FLIGHT = new Set(['pending', 'running', 'waiting'])

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

type Usage = {
  context: { percent?: number; tokens?: number; window: number }
  rateLimits: readonly { kind: string; percentUsed: number; resetsAt?: string }[]
  cost?: { usd: number }
}

type Repo = { branch: string | null; git: Git | null }

// claude-opus-5-5 → opus 5.5 ; claude-sonnet-4-5-20250929[1m] → sonnet 4.5 ;
// anything else as it came. The cockpit sets the case.
function prettyModel(id: string): string {
  const bare = id.replace(/\[.*\]$/, '').replace(/-\d{8}$/, '').replace(/^claude-/, '')
  if (!/^[a-z]+(?:-\d+)*$/.test(bare)) return id
  const family = bare.replace(/-.*/, '')
  const version = bare.slice(family.length + 1).replaceAll('-', '.')

  return version ? `${family} ${version}` : family
}

function fromUsage(usage: Usage) {
  const fiveHour = usage.rateLimits.find(r => r.kind === 'five_hour')
  const sevenDay = usage.rateLimits.find(r => r.kind === 'seven_day')
  const resetsAt = fiveHour?.resetsAt === undefined ? NaN : Date.parse(fiveHour.resetsAt)

  return {
    contextPercent: usage.context.percent ?? null,
    contextTokens: usage.context.tokens ?? null,
    contextWindow: usage.context.window,
    costUsd: usage.cost?.usd ?? null,
    fiveHourPercent: fiveHour ? Math.floor(fiveHour.percentUsed) : null,
    fiveHourResetsAt: Number.isNaN(resetsAt) ? null : resetsAt,
    sevenDayPercent: sevenDay ? Math.floor(sevenDay.percentUsed) : null,
  }
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
async function refresh($: EngineInterface): Promise<void> {
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
  const repo = cwd === undefined ? undefined : await readRepo($, cwd)

  await patch($, {
    model: model === undefined ? undefined : prettyModel(model),
    dir: cwd === undefined ? undefined : (cwd.split('/').filter(Boolean).pop() ?? cwd),
    ...repo,
    ...(usage === undefined ? {} : { ...fromUsage(usage), sessionStartedAt: usage.startedAt }),
    ramAvailableMb: ram,
    clock,
    prompts,
    agentsInFlight: agents,
    updatedAt: now,
  })
}

// A full reading off the path of the event that asks for it: the timer runs
// it once the hook has handed back.
function refreshSoon($: EngineInterface): void {
  $.clock.after(0, () => void refresh($))
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

  on('session.start', async ($, e, next) => {
    // The poll starts first: whatever the first reading meets, it catches up.
    $.clock.every(TICK_MS, () => void refresh($))
    refreshSoon($)

    return next(e)
  })

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
    refreshSoon($)

    return beside(patch($, { turnStartedAt: null }), next(e))
  })

  on('tool.call', async ($, e, next) => {
    running.set(e.tool_use_id, e.tool)
    const marking = attempt(() =>
      update($, line, prev => ({ ...BLANK, ...prev, tool: e.tool, toolCount: (prev?.toolCount ?? 0) + 1 })),
    )
    try {
      return await next(e)
    } finally {
      running.delete(e.tool_use_id)
      await marking
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
