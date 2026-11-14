import { mock } from 'claude-code/testing'
import type { MockClock, TestBody } from 'claude-code/testing'
import type { AgentStatus, ConfigValue, PromptOrigin, SessionMessage } from 'claude-code'

// The engine beneath the mod, for pane.test.tsx and the pane's scenes: each
// hook a test registers stands for the engine beneath the plugin. Claude
// speaks through turn.step, works through tool.call; the transcript is read
// only to seed a plan, Haiku is a canned reply, the clock and the store the
// kit's own.

export type On = Parameters<TestBody>[1]
export type Engine = Parameters<TestBody>[0]
type ToolInput = Parameters<Engine['tool']['call']>[0]

export const PANE = {
  plugin: 'plan-de-vol',
  component: 'Pane',
  requestId: 'plan-de-vol',
  surface: 'terminal',
  props: {
    title: 'Plan de vol',
    isFocused: false,
    bodyColumns: 70,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 80 },
    view: {},
  },
} as const

export const REPLY = JSON.stringify({
  objective: 'Logigramme de session',
  title: 'Faire le mod',
  steps: [{ kind: 'done', what: 'Lu register.tsx', why: 'pour comprendre le câblage' }],
  waiting: 'Valide la maquette',
})

// Haiku's reply with `n` steps of every kind and height, and a question for the person.
export function reply(n: number): string {
  const kinds = ['done', 'decision', 'fail', 'fix'] as const
  const steps = Array.from({ length: n }, (_, i) => ({ kind: kinds[i % 4], what: `Étape ${String(i + 1)} ${'menée '.repeat(i % 3)}`, why: i % 2 === 0 ? 'parce que' : '' }))

  return JSON.stringify({ objective: 'Logigramme de session', title: 'Faire le mod', steps, waiting: 'Valide la maquette' })
}

export const COMPOSER = { kind: 'composer' } as const
const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

// isPlaced: whether a surface draws the pane (none does in a -p run).
// isLocked: the engine refuses every setting change. theme null: no theme
// setting. isTranscriptLost: the transcript cannot be read. failing: the
// engine calls that throw.
type Options = {
  theme?: ConfigValue | null
  store?: Record<string, unknown>
  isPlaced?: boolean
  isLocked?: boolean
  isTranscriptLost?: boolean
  failing?: readonly ('config.list' | 'agent.list' | 'ui.open')[]
}

export function user(text: string): SessionMessage {
  return { role: 'user', text, toolUses: [] }
}

export function assistant(text: string): SessionMessage {
  return { role: 'assistant', text, toolUses: [] }
}

// A promise the test resolves when it lets the engine go on.
function latch(): { wait: Promise<void>; release: () => void } {
  let release = (): void => undefined
  const wait = new Promise<void>(resolve => (release = resolve))

  return { wait, release }
}

// The slash commands that start no turn of their own.
const NO_TURN = new Set(['config'])

export function engine($: Engine, on: On, { theme = 'dark', store = {}, isPlaced = true, isLocked = false, isTranscriptLost = false, failing = [] }: Options = {}) {
  const clock = mock.clock(on, { now: 0 })
  mock.store(on, store)
  const rows: SessionMessage[] = []
  const asks: string[] = []
  const models: string[] = []
  const opens: string[] = []
  const titles: string[] = []
  const logs: string[] = []
  // What $.agent.list() says of the agents the engine still tracks.
  const agents: { id: string; status: AgentStatus }[] = []
  const fails = (call: Options['failing'] extends readonly (infer C)[] | undefined ? C : never) => {
    if (failing.includes(call)) throw new Error(`${call} en panne`)
  }
  // null: Haiku gives no answer.
  let reply: string | null = REPLY
  let said = ''
  let dropped: string | null = null
  let isBroken = false
  // A completion, a tool call or a transcript read held until the test lets it go.
  let gate: Promise<void> = Promise.resolve()
  let tools: Promise<void> = Promise.resolve()
  let messages: Promise<void> = Promise.resolve()

  // The slash commands the plugin registered, as it registered them.
  const commands: { name: string; argumentHint?: string }[] = []
  on('command.register', (_, e) => {
    commands.push(e)
    return { value: { command: e.name } }
  })
  on('ui.open', (_, e) => {
    fails('ui.open')
    opens.push(e.id)
    titles.push(e.title ?? '')
    return { value: isPlaced ? { isPlaced: true } : { isPlaced: false, reason: 'no-surface' } }
  })
  on('ui.panes', () => ({
    value: [...new Set(opens)].map(id => ({ id, title: 'Plan de vol', isShown: isPlaced, isFocused: false, isPlaced })),
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('session.messages', async () => {
    await messages
    if (isTranscriptLost) throw new Error('transcript illisible')
    return { value: [...rows] }
  })
  on('agent.list', () => {
    fails('agent.list')
    return { value: agents.map(a => ({ ...a, description: a.id, type: 'general-purpose' })) }
  })
  on('config.list', () => {
    fails('config.list')
    return {
    value:
      theme === null
        ? []
        : [{ key: 'theme', label: 'Theme', kind: 'choice', value: theme, provider: { plugin: 'engine', tier: 'core' }, isLocked: false }],
    }
  })
  on('config.set', (_, e) => (isLocked ? { deny: 'verrouillé' } : { value: e.value }))
  on('ui.log', (_, e) => {
    logs.push(e.text)
    return { value: undefined }
  })
  on('model.complete', async (_, e) => {
    asks.push(e.prompt)
    models.push(e.model)
    await gate
    if (isBroken) throw new Error('réseau coupé')
    return { value: reply === null ? { isAnswered: false, reason: 'empty-reply', usage: USAGE } : { isAnswered: true, text: reply, usage: USAGE } }
  })
  let turns = 0
  // A hook beneath that answers without next: nothing enters.
  let isAnswering = false
  // What a hook beneath adds to a prompt before its turn starts.
  let added = ''
  // The idle submissions whose turn waits until the test lets it start.
  const held = new Map<string, Promise<void>>()
  on('prompt.submit', async (_, e) => {
    if (dropped !== null) return { drop: dropped }
    if (isAnswering) return { text: e.text }
    await held.get(e.text)
    // Typed while no turn runs, a prompt's turn starts before next(e) resolves,
    // as the engine does (PromptSubmitResult); a command's with its expansion.
    if (e.turnId === undefined && !(e.command && NO_TURN.has(e.command.name))) {
      await $.turn.start({ text: e.command ? `Expansion de /${e.command.name}` : `${e.text}${added}`, turnId: `t${String(++turns)}` })
    }
    return { text: e.text }
  })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  // eslint-disable-next-line require-yield, @typescript-eslint/require-await -- the engine beneath: one whole response, no chunk to yield
  on('turn.step', async function* (_, e) {
    return { turnId: e.turnId, index: e.index, answer: said, toolUses: [], stopReason: 'end_turn', usage: null }
  })
  on('turn.complete', (_, e) => ({ text: e.answer }))
  // The tools whose calls wait until the test lets them go, by name.
  const heldTools = new Map<string, Promise<void>>()
  on('tool.call', async (_, e) => {
    await tools
    await heldTools.get(e.tool)
    return 'command' in e && e.command === 'false' ? { result: 'exit 1', isError: true } : { result: {} }
  })
  on('agent.spawn', (_, e) => (e.description === 'interdit' ? { deny: 'non' } : { model: 'haiku', agentId: `agent-${e.description}` }))

  const hold = (set: (wait: Promise<void>) => void) => () => {
    const { wait, release } = latch()
    set(wait)
    return release
  }

  return {
    clock,
    rows,
    asks,
    models,
    opens,
    titles,
    logs,
    agents,
    answer: (text: string | null) => void (reply = text),
    say: (text: string) => void (said = text),
    drop: (reason: string | null) => void (dropped = reason),
    breakModel: () => void (isBroken = true),
    hold: hold(wait => (gate = wait)),
    holdTools: hold(wait => (tools = wait)),
    holdMessages: hold(wait => (messages = wait)),
    answerAbove: (is: boolean) => void (isAnswering = is),
    addToTurns: (text: string) => void (added = text),
    commands,
    holdToolOf: (tool: string) => {
      const { wait, release } = latch()
      heldTools.set(tool, wait)
      return () => {
        heldTools.delete(tool)
        release()
      }
    },
    holdTurnOf: (text: string) => {
      const { wait, release } = latch()
      held.set(text, wait)
      return () => {
        held.delete(text)
        release()
      }
    },
  }
}

export type Kit = ReturnType<typeof engine>

export async function start($: Engine, clock: MockClock, isInteractive = true) {
  await $.session.start({ cwd: '/', surface: isInteractive ? 'terminal' : null, isInteractive })
  await clock.settle()
}

// A prompt typed while no turn runs: its turn starts as it enters.
export async function prompt($: Engine, text: string, origin: PromptOrigin = COMPOSER) {
  await $.prompt.submit({ text, wait: false, origin })
}

// A prompt typed over the running turn: delivered into it, or queued (wait)
// for a turn of its own.
export async function typeOver($: Engine, text: string, wait = false) {
  await $.prompt.submit({ text, wait, origin: COMPOSER, turnId: 't1' })
}

export async function command($: Engine, name: string, args = '') {
  await $.prompt.submit({ text: `/${name}${args ? ` ${args}` : ''}`, wait: false, origin: COMPOSER, command: { name, args } })
}

// One model response: Claude's words, then its tool calls.
export async function step($: Engine, kit: Kit, text: string, tools: Record<string, unknown>[] = [], agentId?: string) {
  kit.say(text)
  // The chunks pass by: only the whole response counts.
  const chunks: unknown[] = []
  for await (const chunk of $.turn.step({ turnId: 't1', index: 0, model: 'opus', messageCount: 1, ...(agentId ? { agentId } : {}) })) chunks.push(chunk)
  for (const input of tools) await $.tool.call(input as ToolInput)
}

type Ending = 'answer' | 'error' | 'aborted'

export function complete($: Engine, over: { agentId?: string; reason?: Ending } = {}) {
  return $.turn.complete({
    answer: '',
    durationMs: 1,
    isAborted: over.reason === 'aborted',
    turnId: over.agentId ?? 't1',
    reason: over.reason ?? 'answer',
    ...(over.agentId ? { agentId: over.agentId } : {}),
  })
}

export async function endTurn($: Engine, clock: MockClock) {
  await complete($)
  await clock.advance(300)
  await clock.settle()
}

export function spawn($: Engine, description: string, workflow?: { toolUseId: string; runId: string }, subagentType = 'general-purpose') {
  const base = {
    prompt: 'relis',
    description,
    subagentType,
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'claude-opus-5-5',
    fork: false,
    background: true,
  } as const

  return workflow
    ? $.agent.spawn({ ...base, tool_use_id: workflow.toolUseId, workflow: { runId: workflow.runId, agentIndex: 1 } })
    : $.agent.spawn({ ...base, tool_use_id: `call-${description}` })
}

export async function shows($: Engine, text: RegExp): Promise<boolean> {
  const ui = await $.ui.mount(PANE)
  const found = await ui.find({ type: 'Text', text })
  await ui.unmount()

  return found !== undefined
}
