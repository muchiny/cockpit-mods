// done: action menée · decision: choix fait · fail: échec constaté · fix: correction après un échec
export type StepKind = 'done' | 'decision' | 'fail' | 'fix'

export type Step = { kind: StepKind; what: string; why: string }

// One prompt of the person's and the work it led to.
export type Mission = {
  // Unique within the plan's epoch and never reused: what a summary in
  // flight patches by, what a squadron names, the station's number (P<id+1>).
  id: number
  prompt: string
  title: string | null
  // The newest STEPS_MAX steps; `earlier` counts the ones dropped before them.
  steps: Step[]
  earlier: number
  // What the last summary says Claude waits for from the person, shown while
  // no turn runs on the newest mission.
  waiting: string | null
  // What Haiku reads: Claude's words and each tool call, as they came in,
  // the newest JOURNAL_MAX lines kept. `logged` counts every line ever
  // written, `summarized` how many of them the steps cover, `attempted` how
  // many a completion that failed had read (not tried again until more come).
  journal: string[]
  logged: number
  summarized: number
  attempted: number
}

// A submission queued behind the running turn, taken by its own turn when it
// starts: `entered` as it entered (what turn.start carries), `shown` as the
// person typed it, `isCommand` for a slash command, `isPerson` when it is the
// person's (another's, a notification's, opens no mission but keeps its turn
// from taking one), `at` the clock when it could first start (its submit,
// then the end of each turn it waited behind): one whose turn did not start
// within QUEUE_MS of that leaves.
export type Pending = { entered: string; shown: string; isCommand: boolean; isPerson: boolean; at: number }

// `epoch` grows at each /clear or resume: a summary that started before it
// finds another epoch and writes nothing.
export type Plan = { epoch: number; objective: string | null; missions: Mission[]; pending: Pending[] }

export type Live = {
  isWorking: boolean
  action: string | null
  // The question Claude asks now (AskUserQuestion): first, even mid-turn.
  question: string | null
  // The missions a completion is summarizing now.
  summarizing: number[]
}

// What the glass is painted with: the theme's lightness, or no glass at all
// where the theme gives none to read (auto, a custom theme).
export type Look = 'dark' | 'light' | 'plain'

// A subagent: one started by the Agent tool or by a workflow script's agent().
export type DroneStatus = 'running' | 'done' | 'failed'

// `seenAt`: the clock at its last sign of life; one silent too long stops
// counting as in flight (a landing lost to a reload).
export type Drone = { id: string; label: string; status: DroneStatus; action: string | null; seenAt: number }

// The agents of one workflow run, or a mission's Agent-tool agents together;
// `mission` is the id of the mission that launched them.
export type Squadron = { key: string; name: string; isWorkflow: boolean; mission: number; drones: Drone[] }

export type Fleet = { squadrons: Squadron[] }

declare module 'claude-code' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- merged into the engine's interface
  interface PluginState {
    // view: the mission id the person picked on the route; null follows the newest.
    'plan-de-vol': {
      plan: Shaped<Plan>
      live: Shaped<Live>
      look: Shaped<Look>
      view: Shaped<number | null>
      fleet: Shaped<Fleet>
    }
  }
}
