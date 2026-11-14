export type Git = { changed: number; ahead: number; behind: number }

export type Line = {
  model: string
  effort: string | null
  dir: string
  branch: string | null
  git: Git | null
  contextPercent: number | null
  contextTokens: number | null
  contextWindow: number | null
  costUsd: number | null
  fiveHourPercent: number | null
  fiveHourResetsAt: number | null
  sevenDayPercent: number | null
  sevenDayResetsAt: number | null
  // What the session took of the week's allowance, in percent: null without
  // a weekly window, or before the worth of a dollar in it is known.
  weekSharePercent: number | null
  ramAvailableMb: number | null
  clock: string
  sessionStartedAt: number | null
  turnStartedAt: number | null
  tool: string | null
  toolCount: number
  agentsInFlight: number
  prompts: number
  // `$.clock.now()` when these figures were taken: the cockpit's time base.
  updatedAt: number
}

declare module 'claude-code' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- merges into the engine's PluginState: only an interface can
  interface PluginState {
    'status-band': { line: Shaped<Line | null> }
  }
}
