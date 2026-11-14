import type { AgentStatus, ProcessRunInit, SessionUsage } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { MockClock, TestBody } from 'claude-code/testing'

type On = Parameters<TestBody>[1]
type Engine = Parameters<TestBody>[0]

const NOW = Date.UTC(2026, 9, 29, 13, 32)
const MINUTE = 60_000

// With these figures, all 11 panels on one row at full size need 250
// columns; the squeezed row 204 (full titles), then 193 (short titles).
// Each panel keeps room for the values it can grow to, hence the margin.
const WIDE = 260
const NARROW = 100

const POOL = ['NAV', 'CARBURANT', 'SYSTÈMES', 'CHRONO', 'ESCADRILLE', 'CRÉDITS', 'SOUTE', 'CONTRATS', 'HEURE']

function band({ isWorking = false, hasSurvey = false } = {}) {
  return {
    plugin: 'status-band',
    component: 'AbovePrompt',
    surface: 'terminal',
    props: {
      hasSurvey,
      isCollapsed: false,
      isWorking,
      maxRows: 10,
      bodyColumns: 200,
      scroll: { offset: 0, bodyRows: 10 },
      view: {},
    },
  } as const
}

const GIT_STATUS = [
  '# branch.oid 0123abc',
  '# branch.head main',
  '# branch.upstream origin/main',
  '# branch.ab +2 -1',
  '1 .M N... 100644 100644 100644 0123 0123 src/a.rs',
  '1 M. N... 100644 100644 100644 0123 0123 src/b.rs',
  '? notes.txt',
].join('\n')

type Agent = { id: string; description: string; type: string; status: AgentStatus }

const SQUADRON: Agent[] = [
  { id: 'a1', description: 'explore', type: 'Explore', status: 'running' },
  { id: 'a2', description: 'plan', type: 'Plan', status: 'completed' },
]

type Options = {
  contextPercent?: number
  ramKb?: number
  fiveHourUsed?: number
  sevenDayUsed?: number
  // The session's model and folder: null when the engine cannot say.
  model?: string | null
  cwd?: string | null
  turns?: () => number | Promise<number>
  // The repository's `git status`: null outside any repository, a rejection
  // for a repository too slow to answer.
  git?: () => string | null | Promise<string | null>
  // What `date +%H:%M` prints: null when it fails, a throw when it cannot run.
  time?: () => string | null
  // /proc/meminfo, or a throw when it cannot be read.
  meminfo?: () => string
  // The subagents, or a throw when they cannot be listed.
  agents?: () => Agent[]
  cost?: () => number
  // The usage as the engine would report it, from the usual one.
  usage?: (usual: SessionUsage) => SessionUsage
  isUsageDown?: () => boolean
}

// A promise the test settles when it chooses.
function gate(): { promise: Promise<void>; release: () => void } {
  let release: () => void = () => undefined
  const promise = new Promise<void>(resolve => {
    release = resolve
  })

  return { promise, release: () => { release() } }
}

function ran(exitCode: number, stdout: string, stderr = '') {
  return { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false }
}

// Nothing sits beneath the plugin: each hook here stands for the engine. The
// clock moves only when the test moves it; `runs` records each command run,
// with its options.
function engine(
  on: On,
  {
    contextPercent = 23,
    ramKb = 14_889_779,
    fiveHourUsed = 12.5,
    sevenDayUsed = 36,
    model = 'claude-opus-5-5',
    cwd = '/home/muchini/projet',
    turns = () => 12,
    git = () => GIT_STATUS,
    time = () => '14:32',
    meminfo = () => `MemTotal: 24000000 kB\nMemAvailable:   ${ramKb} kB\n`,
    agents = () => SQUADRON,
    cost = () => 1.4242,
    usage = usual => usual,
    isUsageDown = () => false,
  }: Options = {},
) {
  const clock = mock.clock(on, { now: NOW })
  const runs: { argv: string[]; init: ProcessRunInit | undefined }[] = []
  on('session.model', () => {
    if (model === null) throw new Error('model unavailable')
    return { value: model }
  })
  on('session.cwd', () => {
    if (cwd === null) throw new Error('cwd unavailable')
    return { value: cwd }
  })
  on('session.turns', async () => ({ value: await turns() }))
  on('session.usage', () => {
    if (isUsageDown()) throw new Error('usage unavailable')

    return {
      value: usage({
        startedAt: NOW - 72 * MINUTE,
        context: { window: 200_000, tokens: 46_000, percent: contextPercent },
        rateLimits: [
          { kind: 'five_hour', percentUsed: fiveHourUsed, resetsAt: new Date(NOW + 133 * MINUTE).toISOString() },
          { kind: 'seven_day', percentUsed: sevenDayUsed },
        ],
        cost: { usd: cost() },
      }),
    }
  })
  on('agent.list', () => ({ value: agents() }))
  on('process.run', async (_, e) => {
    runs.push({ argv: [...e.argv], init: e.init })
    if (e.argv[0] !== 'git') {
      const shown = time()
      return { value: shown === null ? ran(1, '', 'date: failed') : ran(0, `${shown}\n`) }
    }
    const status = await git()

    return { value: status === null ? ran(128, '', 'fatal: not a git repository') : ran(0, status) }
  })
  on('fs.read', () => ({ value: meminfo() }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  return { clock, runs }
}

async function start($: Engine, clock: MockClock) {
  await $.session.start({ cwd: '/home/muchini/projet', surface: 'terminal', isInteractive: true })
  // The first reading runs off the session's critical path.
  await clock.settle()
}

async function cockpit($: Engine, columns: number, options = {}) {
  const ui = await $.ui.mount(band(options))
  await ui.resize({ columns, rows: 3 })
  await ui.advance(200)
  return ui
}

type Mounted = Awaited<ReturnType<typeof cockpit>>

async function shows(ui: Mounted, text: string): Promise<boolean> {
  return (await ui.find({ type: 'Text', text, in: 'cockpit' })) !== undefined
}

// The cockpit's three rows, as shown.
async function rows(ui: Mounted): Promise<string[]> {
  const texts = await ui.findAll({ type: 'Text', in: 'cockpit' })

  return texts.filter(text => text.props.wrap === 'truncate-end').map(text => text.text)
}

// One run of styled text, by its whole text.
async function run(ui: Mounted, text: string) {
  return (await ui.findAll({ type: 'Text', text, in: 'cockpit' })).find(found => found.text === text)
}

// What a panel reads between its borders, by its title: '' when not shown.
async function reading(ui: Mounted, title: string): Promise<string> {
  const [top = '', middle = ''] = await rows(ui)
  const frame = [...top.matchAll(/╭─+ (\S+) ─+╮/g)].find(found => found[1] === title)
  if (frame === undefined) return ''

  return middle.slice(frame.index + 1, frame.index + frame[0].length - 1).trim()
}

// The panels' titles, left to right.
async function titles(ui: Mounted): Promise<string[]> {
  const [top = ''] = await rows(ui)

  return [...top.matchAll(/╭─+ (\S+) ─+╮/g)].map(found => found[1] ?? '')
}

// The titles of each of the next pages, once each has slid in.
async function pages(ui: Mounted, count: number): Promise<string[][]> {
  const seen: string[][] = []
  await ui.advance(400)
  for (let page = 0; page < count; page++) {
    seen.push(await titles(ui))
    await ui.advance(5000)
  }

  return seen
}

// Each of the next pages, once it has slid in: its titles, then the dots
// counting the pages when they show.
async function leaves(ui: Mounted, count: number): Promise<string[]> {
  const seen: string[] = []
  await ui.advance(400)
  for (let page = 0; page < count; page++) {
    const [, middle = ''] = await rows(ui)
    const dots = /[○●]+/.exec(middle)?.[0]
    seen.push([...(await titles(ui)), ...(dots === undefined ? [] : [dots])].join(' '))
    await ui.advance(5000)
  }

  return seen
}

// A cell's style in one letter: its color's, upper case when bold, its dim
// mark when faded; a blank cell has none.
const STYLE: Record<string, string> = {
  inactive: 'i',
  subtle: 's',
  text: 't',
  suggestion: 'a',
  success: 'g',
  warning: 'w',
  error: 'e',
}
const DIM: Record<string, string> = { i: '.', s: ',', t: ';' }

type Run = { props: { color?: string; weight?: string; dimColor?: boolean }; children: string[] }

// The cockpit as drawn: each row, then under it the style of each of its cells.
async function frame(ui: Mounted): Promise<string[]> {
  const texts = await ui.findAll({ type: 'Text', in: 'cockpit' })

  return texts
    .filter(text => text.props.wrap === 'truncate-end')
    .flatMap(row => {
      const styles = (row.children as Run[]).map(({ props, children }) => {
        const letter = props.color === undefined ? ' ' : (STYLE[props.color] ?? '?')
        const mark = props.dimColor === true ? (DIM[letter] ?? '!') : props.weight === 'bold' ? letter.toUpperCase() : letter
        return mark.repeat(Array.from(children.join('')).length)
      })
      return [row.text, styles.join('')]
    })
}

// For each of the next frames, whether the cockpit drew anew.
async function redraws(ui: Mounted, frames: number): Promise<boolean[]> {
  const seen: boolean[] = []
  let last = (await frame(ui)).join('\n')
  for (let i = 0; i < frames; i++) {
    await ui.advance(80)
    const shown = (await frame(ui)).join('\n')
    seen.push(shown !== last)
    last = shown
  }

  return seen
}

// The colors the cockpit draws in, over the next frames.
async function colors(ui: Mounted, frames: number): Promise<Set<unknown>> {
  const seen = new Set<unknown>()
  for (let i = 0; i < frames; i++) {
    await ui.advance(80)
    for (const text of await ui.findAll({ type: 'Text', in: 'cockpit' })) seen.add(text.props.color)
  }

  return seen
}

// The colors of the gauges' filled runs.
async function gauges(ui: Mounted): Promise<unknown[]> {
  const texts = await ui.findAll({ type: 'Text', in: 'cockpit' })

  return texts.filter(text => /^[█▏▎▍▌▋▊▉]+$/.test(text.text)).map(text => text.props.color)
}

// The engine's own drawing, beneath the band: what the band hands on.
function drawsBeneath(on: On) {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })
}

// The model request beneath every step: no chunk, then its result.
function requests(on: On) {
  // eslint-disable-next-line require-yield, @typescript-eslint/require-await -- a request that streams and awaits nothing
  on('turn.step', async function* (_, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
}

// One model request at the effort given, by the main loop or a subagent.
async function step($: Engine, effort?: 'high' | 'xhigh' | 'max', agentId?: string) {
  const stream = $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', messageCount: 1, effort, agentId })
  while (!(await stream.next()).done) {
    // Read to its end: the hook's bookkeeping settles with the stream.
  }
}

// Where a panel's title starts on the top row: its panel's place.
async function placeOf($: Engine, title: string): Promise<number> {
  const ui = await cockpit($, WIDE)
  const [top = ''] = await rows(ui)
  await ui.unmount()

  return top.indexOf(title)
}

test('git is read without taking its index lock', async ($, on) => {
  const { clock, runs } = engine(on)
  await start($, clock)
  await clock.advance(15_000)

  const gits = runs.filter(({ argv }) => argv[0] === 'git')
  expect(gits.length).toBeGreaterThan(1)
  for (const { argv } of gits) expect(argv[1]).toBe('--no-optional-locks')
})

test('a reading that fails at start leaves the band up, and the poll mends it', async ($, on) => {
  let isDown = true
  const { clock } = engine(on, { isUsageDown: () => isDown })
  await start($, clock)

  const early = await cockpit($, WIDE)
  expect(await shows(early, 'OPUS 5.5')).toBe(true)
  expect(await shows(early, '77%')).toBe(false)
  expect(await shows(early, '100%')).toBe(false)
  await early.unmount()

  isDown = false
  await clock.advance(15_000)
  const mended = await cockpit($, WIDE)
  expect(await shows(mended, '77%')).toBe(true)
  await mended.unmount()
})

test('a repository too slow to answer keeps its last known state', async ($, on) => {
  let isSlow = false
  const { clock } = engine(on, {
    git: () => {
      if (isSlow) throw new Error('timed out')
      return GIT_STATUS
    },
  })
  await start($, clock)

  isSlow = true
  await clock.advance(15_000)
  const ui = await cockpit($, WIDE)
  expect(await shows(ui, 'projet : main ✎ 3')).toBe(true)
  await ui.unmount()
})

test('a turn hands back without waiting on git', async ($, on) => {
  let calls = 0
  const stuck = gate()
  const { clock } = engine(on, {
    git: async () => {
      calls += 1
      if (calls > 1) await stuck.promise
      return GIT_STATUS
    },
  })
  on('turn.complete', () => ({ text: '' }))
  await start($, clock)

  let isDone = false
  const completing = $.turn.complete({ turnId: 't1', reason: 'answer', answer: '', durationMs: 10, isAborted: false }).then(() => {
    isDone = true
  })
  await clock.settle()
  expect(isDone).toBe(true)
  stuck.release()
  await completing
})

test('titles read in the accent color, in bold', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, WIDE)

  for (const title of ['VAISSEAU', 'NAV', 'BOUCLIER', 'CARBURANT', 'HEURE']) {
    const found = await run(ui, title)
    expect({ title, color: found?.props.color, weight: found?.props.weight }).toEqual({ title, color: 'suggestion', weight: 'bold' })
  }
  await ui.unmount()
})

test('secondary readings stay legible, not faded', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, WIDE)

  for (const word of ['$', 'contrats', '46k/200k', '↻', '2h13', '7J', 'veille']) {
    const found = await run(ui, word)
    expect({ word, color: found?.props.color, isDim: found?.props.dimColor ?? false }).toEqual({ word, color: 'text', isDim: false })
  }
  await ui.unmount()
})

test('every panel centers its title and its reading', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, WIDE)
  const [top = '', middle = ''] = await rows(ui)
  const frames = [...top.matchAll(/╭(─+) (\S+) (─+)╮/g)]

  expect(frames.length).toBe(11)
  for (const frame of frames) {
    const [whole, left = '', title = '', right = ''] = frame
    const at = frame.index
    const inside = middle.slice(at + 1, at + whole.length - 1)
    const lead = inside.length - inside.trimStart().length
    const trail = inside.length - inside.trimEnd().length
    expect({ title, isTitleCentered: Math.abs(left.length - right.length) <= 1, isReadingCentered: Math.abs(lead - trail) <= 1 }).toEqual({
      title,
      isTitleCentered: true,
      isReadingCentered: true,
    })
  }
  await ui.unmount()
})

test('stars keep to the open sky, clear of the panels', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, WIDE, { isWorking: true })

  for (let frame = 0; frame < 25; frame++) {
    await ui.advance(80)
    const [top = '', , bottom = ''] = await rows(ui)
    for (const [row, open, close] of [
      [top, '╭', '╮'],
      [bottom, '╰', '╯'],
    ] as const) {
      // Beside a panel: a blank, or the next panel's edge.
      const before = [...row.matchAll(new RegExp(`(.)${open}`, 'g'))].map(m => m[1])
      const after = [...row.matchAll(new RegExp(`${close}(.)`, 'g'))].map(m => m[1])
      expect({ frame, stray: before.filter(ch => ch !== ' ' && ch !== close) }).toEqual({ frame, stray: [] })
      expect({ frame, stray: after.filter(ch => ch !== ' ' && ch !== open) }).toEqual({ frame, stray: [] })
    }
  }
  await ui.unmount()
})

test('stars keep clear of the page dots too', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, NARROW)

  for (let frame = 0; frame < 40; frame++) {
    await ui.advance(240)
    const [, middle = ''] = await rows(ui)
    const [, before, after] = /(.)[●○]+(.)/.exec(middle) ?? []
    expect({ frame, before, after }).toEqual({ frame, before: ' ', after: ' ' })
  }
  await ui.unmount()
})

test('a growing tool count leaves the panels where they stand', async ($, on) => {
  const { clock } = engine(on)
  on('tool.call', () => ({ result: {} }))
  await start($, clock)

  for (let i = 1; i <= 9; i++) await $.tool.call({ tool: 'Read', tool_use_id: `tu${i}`, file_path: '/x' })
  const before = await placeOf($, 'CONTRATS')
  await $.tool.call({ tool: 'Read', tool_use_id: 'tu10', file_path: '/x' })
  expect(await placeOf($, 'CONTRATS')).toBe(before)
})

test('a growing cost leaves the panels where they stand', async ($, on) => {
  let usd = 9.99
  const { clock } = engine(on, { cost: () => usd })
  await start($, clock)

  const before = await placeOf($, 'BOUCLIER')
  usd = 10.01
  await clock.advance(15_000)
  expect(await placeOf($, 'BOUCLIER')).toBe(before)
})

test('a wide terminal shows all eleven panels on one row, full size', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, WIDE)

  for (const part of [
    'VAISSEAU', 'OPUS 5.5',
    'NAV', 'projet', 'main', '✎ 3', '↑2', '↓1',
    'BOUCLIER', '77%', '46k/200k',
    'CARBURANT', '88%', '↻ 2h13', '7J', '64%',
    'CHRONO', '1h12', 'T+--:--',
    'SYSTÈMES', '×0',
    'ESCADRILLE', '1 en vol',
    'CRÉDITS', '1.42 $',
    'SOUTE', '14.2 Go',
    'CONTRATS', '12 contrats',
    'HEURE', '14:32',
  ]) {
    expect({ part, isShown: await shows(ui, part) }).toEqual({ part, isShown: true })
  }
  expect(await shows(ui, '●')).toBe(false)
  await ui.unmount()
})

test('a terminal a little too narrow squeezes the row instead of hiding panels', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, 220)

  for (const title of ['VAISSEAU', 'BOUCLIER', ...POOL]) {
    expect({ title, isShown: await shows(ui, title) }).toEqual({ title, isShown: true })
  }
  // Squeezed: the decorations go first.
  expect(await shows(ui, '$')).toBe(false)
  expect(await shows(ui, '●')).toBe(false)
  await ui.unmount()
})

test('narrower still, the titles shorten before anything is hidden', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, 196)

  for (const title of ['VSO', 'NAV', 'BCL', 'CRB', 'CHR', 'SYS', 'ESC', 'CRD', 'STE', 'CTR']) {
    expect({ title, isShown: await shows(ui, title) }).toEqual({ title, isShown: true })
  }
  expect(await shows(ui, '●')).toBe(false)
  await ui.unmount()
})

async function stage(ui: Mounted): Promise<string> {
  if (await shows(ui, '●')) return 'pages'
  if (await shows(ui, '$')) return 'full'
  return (await shows(ui, 'BCL')) ? 'short titles' : 'squeezed'
}

test('each squeeze starts only once the step before no longer fits', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const steps: [number, string][] = [
    [248, 'full'],
    [247, 'squeezed'],
    [203, 'squeezed'],
    [202, 'short titles'],
    [194, 'short titles'],
    [193, 'pages'],
  ]

  for (const [columns, expected] of steps) {
    const ui = await cockpit($, columns)
    expect({ columns, stage: await stage(ui) }).toEqual({ columns, stage: expected })
    await ui.unmount()
  }
})

test('a 100-column terminal pages the panels, the ship and the shield staying put', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, NARROW)
  const seen = new Set<string>()
  // Read each page once its slide-in is over.
  await ui.advance(400)

  for (let page = 0; page < 12; page++) {
    expect(await shows(ui, 'VAISSEAU')).toBe(true)
    expect(await shows(ui, 'BOUCLIER')).toBe(true)
    expect(await shows(ui, '●')).toBe(true)
    for (const title of POOL) if (await shows(ui, title)) seen.add(title)
    await ui.advance(5000)
  }
  expect([...seen].sort()).toEqual([...POOL].sort())
  await ui.unmount()
})

test('a panel in alert stays pinned on every page', async ($, on) => {
  const { clock } = engine(on, { ramKb: 3_000_000 })
  await start($, clock)
  const ui = await cockpit($, NARROW)
  await ui.advance(400)

  for (let page = 0; page < 8; page++) {
    const pinned = (await titles(ui)).filter(title => title === 'SOUTE')
    expect({ page, pinned }).toEqual({ page, pinned: ['SOUTE'] })
    await ui.advance(5000)
  }
  await ui.unmount()
})

test('with two panels in alert and room for one, the later one gives way', async ($, on) => {
  const { clock } = engine(on, { fiveHourUsed: 85, ramKb: 3_000_000 })
  await start($, clock)
  const ui = await cockpit($, 80)

  expect(await pages(ui, 4)).toEqual(Array.from({ length: 4 }, () => ['VSO', 'BCL', 'CRB']))
  await ui.unmount()
})

test('narrower still, the ship gives way and the shield stays', async ($, on) => {
  const { clock } = engine(on, { fiveHourUsed: 85, ramKb: 3_000_000 })
  await start($, clock)
  const ui = await cockpit($, 44)

  expect(await pages(ui, 4)).toEqual([
    ['BCL', 'ESC'],
    ['BCL', 'CRD'],
    ['BCL', 'CTR'],
    ['BCL', 'H'],
  ])
  await ui.unmount()
})

test('a very narrow terminal still shows the shield', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, 60)

  expect(await shows(ui, '77%')).toBe(true)
  await ui.unmount()
})

test('too narrow for the page dots, the pages turn without them', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, 60)
  await ui.advance(400)
  const seen = new Set<string>()

  for (let page = 0; page < 6; page++) {
    expect(await shows(ui, '●')).toBe(false)
    for (const value of ['1 en vol', '1.42', '14.2 Go', '12 ctr']) if (await shows(ui, value)) seen.add(value)
    await ui.advance(5000)
  }
  expect([...seen].sort()).toEqual(['1 en vol', '1.42', '12 ctr', '14.2 Go'])
  await ui.unmount()
})

test('a clean, detached checkout shows as such, nothing ahead or behind', async ($, on) => {
  const { clock } = engine(on, { git: () => '# branch.oid 0123abc\n# branch.head (detached)' })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await shows(ui, 'projet : détaché ✓')).toBe(true)
  for (const mark of ['✎', '↑', '↓']) {
    expect({ mark, isShown: await shows(ui, mark) }).toEqual({ mark, isShown: false })
  }
  await ui.unmount()
})

test('outside a git repository, NAV shows the folder alone', async ($, on) => {
  const { clock } = engine(on, { git: () => null })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await shows(ui, 'projet')).toBe(true)
  expect(await shows(ui, 'projet :')).toBe(false)
  expect(await shows(ui, '✓')).toBe(false)
  await ui.unmount()
})

for (const [model, shown] of [
  ['claude-sonnet-4-5-20250929[1m]', 'SONNET 4.5'],
  ['claude-haiku-5-5', 'HAIKU 5.5'],
  ['claude-fable-5-1', 'FABLE 5.1'],
  ['my-local-model', 'MY-LOCAL-MODEL'],
  ['opus', 'OPUS'],
  ['claude-opus-10-12', 'OPUS 10.12'],
] as const) {
  test(`the model ${model} shows as ${shown}`, async ($, on) => {
    const { clock } = engine(on, { model })
    await start($, clock)
    const ui = await cockpit($, WIDE)

    // What follows the name proves nothing trails it.
    expect(await shows(ui, `${shown}  EN ORBITE`)).toBe(true)
    await ui.unmount()
  })
}

for (const [reserve, options, shown] of [
  ['five-hour', { fiveHourUsed: 85 }, '15%'],
  ['weekly', { sevenDayUsed: 90 }, '10%'],
] as const) {
  test(`the quantum stays pinned while its ${reserve} reserve is below 20 %`, async ($, on) => {
    const { clock } = engine(on, options)
    await start($, clock)
    const ui = await cockpit($, NARROW)
    await ui.advance(400)

    for (let page = 0; page < 8; page++) {
      expect({ page, isPinned: await shows(ui, shown) }).toEqual({ page, isPinned: true })
      await ui.advance(5000)
    }
    await ui.unmount()
  })
}

test('with no subagent in flight, the squadron is in the hangar', async ($, on) => {
  const { clock } = engine(on, {
    agents: () => [
      { id: 'a2', description: 'plan', type: 'Plan', status: 'completed' },
      { id: 'a3', description: 'fix', type: 'general-purpose', status: 'failed' },
    ],
  })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await shows(ui, 'au hangar')).toBe(true)
  expect(await shows(ui, 'en vol')).toBe(false)
  await ui.unmount()
})

test('the squadron count follows a subagent taking off and landing', async ($, on) => {
  let squadron: Agent[] = []
  const { clock } = engine(on, { agents: () => squadron })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  await start($, clock)

  squadron = [{ id: 'a1', description: 'explore', type: 'Explore', status: 'running' }]
  await $.turn.start({ text: 'explore', turnId: 's1', agentId: 'a1' })
  const flying = await cockpit($, WIDE)
  expect(await shows(flying, '1 en vol')).toBe(true)
  await flying.unmount()

  squadron = [{ id: 'a1', description: 'explore', type: 'Explore', status: 'completed' }]
  await $.turn.complete({ turnId: 's1', agentId: 'a1', reason: 'answer', answer: '', durationMs: 10, isAborted: false })
  const landed = await cockpit($, WIDE)
  expect(await shows(landed, 'au hangar')).toBe(true)
  await landed.unmount()
})

test('the running tool shows while it runs, then counts', async ($, on) => {
  const { clock } = engine(on)
  const tool = gate()
  on('tool.call', async () => {
    await tool.promise
    return { result: {} }
  })
  await start($, clock)

  const call = $.tool.call({ tool: 'Bash', tool_use_id: 'tu1', command: 'ls' })
  // The bookkeeping runs beside the tool, not ahead of it.
  await clock.settle()
  const running = await cockpit($, WIDE)
  expect(await shows(running, '▸ Bash')).toBe(true)
  await running.unmount()

  tool.release()
  await call
  const done = await cockpit($, WIDE)
  expect(await shows(done, '×1')).toBe(true)
  expect(await shows(done, '▸ Bash')).toBe(false)
  await done.unmount()
})

test('the turn chrono runs from the start of the turn', async ($, on) => {
  const { clock } = engine(on)
  on('turn.start', () => ({ turnId: 't1' }))
  await start($, clock)
  await $.turn.start({ text: 'go', turnId: 't1' })

  const ui = await cockpit($, WIDE, { isWorking: true })
  await ui.advance(3000)
  expect((await ui.find({ type: 'Text', text: /T\+00:0[23]/, in: 'cockpit' }))?.text).toBeDefined()
  await ui.unmount()
})

test('the turn chrono stops when the turn completes', async ($, on) => {
  const { clock } = engine(on)
  on('turn.start', () => ({ turnId: 't1' }))
  on('turn.complete', () => ({ text: '' }))
  await start($, clock)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete({ turnId: 't1', reason: 'answer', answer: '', durationMs: 1000, isAborted: false })

  const ui = await cockpit($, WIDE)
  expect(await shows(ui, 'T+--:--')).toBe(true)
  await ui.unmount()
})

test('no cell paints a background or a fixed color, at any width', async ($, on) => {
  const { clock } = engine(on, { contextPercent: 85 })
  await start($, clock)

  for (const columns of [WIDE, 248, 220, 203, 202, 196, 192, 191, NARROW, 60]) {
    const ui = await cockpit($, columns, { isWorking: true })
    await ui.advance(1000)
    const texts = await ui.findAll({ type: 'Text', in: 'cockpit' })
    expect(texts.length).toBeGreaterThan(0)
    for (const text of texts) {
      expect(text.props.backgroundColor).toBeUndefined()
      const { color } = text.props
      expect(typeof color === 'string' ? color : '').not.toMatch(/^#|rgb/)
    }
    await ui.unmount()
  }
})

test('below 20 % the shield blinks red', async ($, on) => {
  const { clock } = engine(on, { contextPercent: 85 })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await shows(ui, '15%')).toBe(true)
  let isRed = false
  for (let frame = 0; frame < 8 && !isRed; frame++) {
    await ui.advance(80)
    const texts = await ui.findAll({ type: 'Text', in: 'cockpit' })
    isRed = texts.some(text => text.props.color === 'error')
  }
  expect(isRed).toBe(true)
  await ui.unmount()
})

test('the ship goes to warp while Claude works, and idles otherwise', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)

  const working = await cockpit($, WIDE, { isWorking: true })
  await working.advance(2000)
  expect(await shows(working, 'QUANTUM')).toBe(true)
  await working.unmount()

  const idle = await cockpit($, WIDE)
  await idle.advance(2000)
  expect(await shows(idle, 'EN ORBITE')).toBe(true)
  expect(await shows(idle, 'QUANTUM')).toBe(false)
  await idle.unmount()
})

test('the band yields to a survey', async ($, on) => {
  const { clock } = engine(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>survey</Text>
  })
  await start($, clock)
  const ui = await $.ui.mount(band({ hasSurvey: true }))

  expect((await ui.find({ type: 'Text', text: /survey/ }))?.text).toBe('survey')
  expect(await ui.find({ type: 'Text', text: 'VAISSEAU' })).toBeUndefined()
  await ui.unmount()
})

test('a cockpit not yet measured waits without drawing, then draws', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await $.ui.mount(band())

  await ui.advance(1000)
  expect(await rows(ui)).toEqual([])
  await ui.resize({ columns: WIDE, rows: 3 })
  await ui.advance(200)
  expect(await shows(ui, 'VAISSEAU')).toBe(true)
  await ui.unmount()
})

test('the effort of the main loop shows beside the model', async ($, on) => {
  const { clock } = engine(on)
  requests(on)
  await start($, clock)

  await step($, 'xhigh')
  await step($, 'xhigh')
  const ui = await cockpit($, WIDE)
  expect(await reading(ui, 'VAISSEAU')).toBe('OPUS 5.5 XHIGH  EN ORBITE')
  await ui.unmount()
})

test("a subagent's effort leaves the ship's alone", async ($, on) => {
  const { clock } = engine(on)
  requests(on)
  await start($, clock)

  await step($, 'high')
  await step($, 'max', 'a1')
  const ui = await cockpit($, WIDE)
  expect(await reading(ui, 'VAISSEAU')).toBe('OPUS 5.5 HIGH  EN ORBITE')
  await ui.unmount()
})

test('a request without an effort clears the one shown', async ($, on) => {
  const { clock } = engine(on)
  requests(on)
  await start($, clock)

  await step($, 'high')
  await step($)
  const ui = await cockpit($, WIDE)
  expect(await reading(ui, 'VAISSEAU')).toBe('OPUS 5.5  EN ORBITE')
  await ui.unmount()
})

test('a new measure reaches the shield without waiting for the poll', async ($, on) => {
  const { clock } = engine(on)
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await start($, clock)

  await $.session.measure({ context: { window: 200_000, tokens: 120_000, percent: 60 }, rateLimits: [], changed: ['context'] })
  const ui = await cockpit($, WIDE)
  expect(await reading(ui, 'BOUCLIER')).toMatch(/ 40% 120k\/200k$/)
  await ui.unmount()
})

test('with neither rate limits nor cost, the fuel shows dashes and the credits zero', async ($, on) => {
  const { clock } = engine(on, { usage: usual => ({ ...usual, rateLimits: [], cost: undefined }) })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'CARBURANT')).toBe('--')
  expect(await reading(ui, 'CRÉDITS')).toBe('¤ 0.00 $')
  await ui.unmount()
})

test('a five-hour limit alone shows its reserve, without reset time or week', async ($, on) => {
  const { clock } = engine(on, { usage: usual => ({ ...usual, rateLimits: [{ kind: 'five_hour', percentUsed: 40 }] }) })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'CARBURANT')).toMatch(/^[█▏▎▍▌▋▊▉░]+ {2}60%$/)
  expect(await colors(ui, 8)).not.toContain('error')
  await ui.unmount()
})

test('a context known only as a share shows no token count', async ($, on) => {
  const { clock } = engine(on, { usage: usual => ({ ...usual, context: { window: 200_000, percent: 23 } }) })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'BOUCLIER')).toMatch(/ 77%$/)
  await ui.unmount()
})

test('once the context is known, the shield gauge sweeps down from full', async ($, on) => {
  let isKnown = false
  const { clock } = engine(on, {
    usage: usual => ({ ...usual, context: { window: 200_000, tokens: 46_000, percent: isKnown ? 23 : undefined } }),
  })
  await start($, clock)
  const ui = await cockpit($, WIDE)
  await ui.advance(1000)
  expect(await reading(ui, 'BOUCLIER')).toBe('--')

  isKnown = true
  await clock.advance(15_000)
  await ui.advance(80)
  const first = Number(/(\d+)%/.exec(await reading(ui, 'BOUCLIER'))?.[1])
  expect(first).toBeGreaterThan(77)
  await ui.advance(5000)
  expect(await reading(ui, 'BOUCLIER')).toMatch(/ 77% {2}46k\/200k$/)
  await ui.unmount()
})

test('fresh figures keep the turn chrono on time', async ($, on) => {
  const { clock } = engine(on)
  on('turn.start', () => ({ turnId: 't1' }))
  await start($, clock)
  await $.turn.start({ text: 'go', turnId: 't1' })
  const ui = await cockpit($, WIDE, { isWorking: true })

  // Both clocks 15 s on: the poll's figures carry the new time.
  await ui.advance(14_800)
  await clock.advance(15_000)
  await ui.advance(80)
  expect(await reading(ui, 'CHRONO')).toMatch(/T\+00:15$/)
  await ui.unmount()
})

test('past half the context, the shield gauge turns to the warning color', async ($, on) => {
  const { clock } = engine(on, { contextPercent: 65, fiveHourUsed: 0, sevenDayUsed: 0 })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  // The quantum's gauges, full, stay green: only the shield's can warn.
  const texts = await ui.findAll({ type: 'Text', in: 'cockpit' })
  const gauges = texts.filter(text => /^[█▏▎▍▌▋▊▉]+$/.test(text.text)).map(text => text.props.color)
  expect(gauges).toContain('warning')
  await ui.unmount()
})

test('token counts below a thousand read whole, a million as M', async ($, on) => {
  const { clock } = engine(on, { usage: usual => ({ ...usual, context: { window: 1_000_000, tokens: 512, percent: 0 } }) })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'BOUCLIER')).toMatch(/ 512\/1M$/)
  await ui.unmount()
})

test('when date cannot answer, the clock shows dashes', async ($, on) => {
  const { clock } = engine(on, { time: () => null })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'HEURE')).toBe('--:--')
  await ui.unmount()
})

for (const [why, meminfo] of [
  ['unreadable', () => {
    throw new Error('permission denied')
  }],
  ['without MemAvailable', () => 'MemTotal: 24000000 kB\n'],
] as const) {
  test(`with /proc/meminfo ${why}, the reactor shows dashes`, async ($, on) => {
    const { clock } = engine(on, { meminfo })
    await start($, clock)
    const ui = await cockpit($, WIDE)

    expect(await reading(ui, 'SOUTE')).toBe('--')
    await ui.unmount()
  })
}

test('below 8 Go free, the hold reads in the warning color', async ($, on) => {
  const { clock } = engine(on, { ramKb: 6_000_000 })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'SOUTE')).toBe('5.7 Go')
  expect((await run(ui, '5.7'))?.props.color).toBe('warning')
  await ui.unmount()
})

test('a single prompt reads as one contract', async ($, on) => {
  const { clock } = engine(on, { turns: () => 1 })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'CONTRATS')).toBe('1 contrat')
  await ui.unmount()
})

test('a long tool name is cut short, its server left out', async ($, on) => {
  const { clock } = engine(on)
  const tool = gate()
  on('tool.call', async () => {
    await tool.promise
    return { result: {} }
  })
  await start($, clock)

  const call = $.tool.call({ tool: 'mcp__github__pull_request_review_write', tool_use_id: 'tu1' })
  await clock.settle()
  const ui = await cockpit($, WIDE)
  expect(await reading(ui, 'SYSTÈMES')).toBe('▸ pull_re… ×1')
  await ui.unmount()
  tool.release()
  await call
})

test('a tool called before the first reading still counts', async ($, on) => {
  const { clock } = engine(on)
  on('tool.call', () => ({ result: {} }))

  await $.tool.call({ tool: 'Read', tool_use_id: 'tu1', file_path: '/x' })
  await start($, clock)
  const ui = await cockpit($, WIDE)
  expect(await reading(ui, 'SYSTÈMES')).toBe('· veille ×1')
  await ui.unmount()
})

test('a session at the filesystem root shows /', async ($, on) => {
  const { clock } = engine(on, { cwd: '/' })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'NAV')).toBe('/ : main ✎ 3 ↑2↓1')
  await ui.unmount()
})

test('when the engine cannot say the model or the folder, they show as dashes', async ($, on) => {
  const { clock, runs } = engine(on, { model: null, cwd: null })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'VAISSEAU')).toBe('--  EN ORBITE')
  expect(await reading(ui, 'NAV')).toBe('--')
  expect(runs.filter(({ argv }) => argv[0] === 'git')).toEqual([])
  await ui.unmount()
})

test('an ahead/behind row git did not write as expected counts nothing', async ($, on) => {
  const { clock } = engine(on, { git: () => '# branch.oid 0123abc\n# branch.head main\n# branch.ab garbled' })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'NAV')).toBe('projet : main ✓')
  await ui.unmount()
})

test('git reads the session folder; git and date are each held to two seconds', async ($, on) => {
  const { clock, runs } = engine(on)
  await start($, clock)

  expect(runs).toContainEqual({
    argv: ['git', '--no-optional-locks', 'status', '--porcelain=v2', '--branch'],
    init: { cwd: '/home/muchini/projet', timeoutMs: 2000 },
  })
  expect(runs).toContainEqual({ argv: ['date', '+%H:%M'], init: { timeoutMs: 2000 } })
})

for (const status of ['pending', 'waiting'] as const) {
  test(`a subagent ${status} counts as in flight`, async ($, on) => {
    const { clock } = engine(on, { agents: () => [{ id: 'a1', description: 'explore', type: 'Explore', status }] })
    await start($, clock)
    const ui = await cockpit($, WIDE)

    expect(await reading(ui, 'ESCADRILLE')).toBe('1 en vol')
    await ui.unmount()
  })
}

test('the rate limits read the same in any order', async ($, on) => {
  const { clock } = engine(on, { usage: usual => ({ ...usual, rateLimits: [...usual.rateLimits].reverse() }) })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'CARBURANT')).toMatch(/ 88% ↻ 2h13 7J [█▏▎▍▌▋▊▉░]+ {2}64%$/)
  await ui.unmount()
})

for (const [ab, changes, shown] of [
  ['+12 -34', '', 'projet : main ✓ ↑12↓34'],
  ['+3 -0', '', 'projet : main ✓ ↑3'],
  ['+0 -2', '\n? notes.txt', 'projet : main ✎ 1 ↓2'],
] as const) {
  test(`a branch at ${ab} reads ${shown}`, async ($, on) => {
    const { clock } = engine(on, { git: () => `# branch.oid 0123abc\n# branch.head main\n# branch.ab ${ab}${changes}` })
    await start($, clock)
    const ui = await cockpit($, WIDE)

    expect(await reading(ui, 'NAV')).toBe(shown)
    await ui.unmount()
  })
}

test('leaving a repository clears its branch', async ($, on) => {
  let isRepo = true
  const { clock } = engine(on, { git: () => (isRepo ? GIT_STATUS : null) })
  await start($, clock)

  isRepo = false
  await clock.advance(15_000)
  const ui = await cockpit($, WIDE)
  expect(await reading(ui, 'NAV')).toBe('projet')
  await ui.unmount()
})

test('a date that cannot run leaves the other readings be', async ($, on) => {
  const { clock } = engine(on, {
    time: () => {
      throw new Error('date: not found')
    },
  })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'HEURE')).toBe('--:--')
  expect(await reading(ui, 'VAISSEAU')).toBe('OPUS 5.5  EN ORBITE')
  await ui.unmount()
})

test('when date stops answering, the clock keeps the last time it read', async ($, on) => {
  let shown: string | null = '14:32'
  const { clock } = engine(on, { time: () => shown })
  await start($, clock)

  shown = null
  await clock.advance(15_000)
  const ui = await cockpit($, WIDE)
  expect(await reading(ui, 'HEURE')).toBe('14:32')
  await ui.unmount()
})

test('a squadron that cannot be listed leaves the other readings be', async ($, on) => {
  const { clock } = engine(on, {
    agents: () => {
      throw new Error('agents unavailable')
    },
  })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'ESCADRILLE')).toBe('au hangar')
  expect(await reading(ui, 'VAISSEAU')).toBe('OPUS 5.5  EN ORBITE')
  await ui.unmount()
})

test("the band's hooks hand back what the engine answered", async ($, on) => {
  const { clock } = engine(on)
  requests(on)
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.turnId }))
  on('tool.call', () => ({ result: { stdout: 'ok' } }))
  await start($, clock)

  const measured = await $.session.measure({ context: { window: 200_000 }, rateLimits: [], changed: ['context'] })
  expect(measured).toEqual({ changed: ['context'] })
  expect(await $.turn.start({ text: 'go', turnId: 't1' })).toEqual({ turnId: 't1' })
  expect(await $.turn.start({ text: 'go', turnId: 's1', agentId: 'a1' })).toEqual({ turnId: 's1' })
  const complete = { reason: 'answer', answer: '', durationMs: 10, isAborted: false } as const
  expect(await $.turn.complete({ ...complete, turnId: 't1' })).toEqual({ text: 't1' })
  expect(await $.turn.complete({ ...complete, turnId: 's1', agentId: 'a1' })).toEqual({ text: 's1' })
  expect(await $.tool.call({ tool: 'Bash', tool_use_id: 'tu1', command: 'ls' })).toEqual({ result: { stdout: 'ok' } })
  const stream = $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', messageCount: 1 })
  let next = await stream.next()
  while (!next.done) next = await stream.next()
  expect(next.value).toMatchObject({ turnId: 't1', stopReason: 'end_turn' })
})

test('a turn hands back once its own bookkeeping is in', async ($, on) => {
  let counting = Promise.resolve()
  const { clock } = engine(on, {
    turns: async () => {
      await counting
      return 13
    },
  })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  await start($, clock)

  const counted = gate()
  counting = counted.promise
  let isBack = false
  const starting = $.turn.start({ text: 'go', turnId: 't1' }).then(() => {
    isBack = true
  })
  await clock.settle()
  expect(isBack).toBe(false)
  counted.release()
  await starting
  expect(isBack).toBe(true)
})

test('a new turn counts its prompt without waiting for the poll', async ($, on) => {
  let turns = 12
  const { clock } = engine(on, { turns: () => turns })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  await start($, clock)

  turns = 13
  await $.turn.start({ text: 'go', turnId: 't1' })
  const ui = await cockpit($, WIDE)
  expect(await reading(ui, 'CONTRATS')).toBe('13 contrats')
  await ui.unmount()
})

test('an effort noted before the first reading still shows', async ($, on) => {
  const { clock } = engine(on)
  requests(on)

  await step($, 'high')
  await start($, clock)
  const ui = await cockpit($, WIDE)
  expect(await reading(ui, 'VAISSEAU')).toBe('OPUS 5.5 HIGH  EN ORBITE')
  await ui.unmount()
})

test('a turn that completes refreshes the readings without waiting for the poll', async ($, on) => {
  let usd = 1.4242
  const { clock } = engine(on, { cost: () => usd })
  on('turn.complete', () => ({ text: '' }))
  await start($, clock)

  usd = 2.5
  await $.turn.complete({ turnId: 't1', reason: 'answer', answer: '', durationMs: 10, isAborted: false })
  await clock.settle()
  const ui = await cockpit($, WIDE)
  expect(await reading(ui, 'CRÉDITS')).toBe('¤ 2.50 $')
  await ui.unmount()
})

test('of two tools running at once, the one still running shows once the other ends', async ($, on) => {
  const { clock } = engine(on)
  const gates = new Map([
    ['tu1', gate()],
    ['tu2', gate()],
  ])
  on('tool.call', async (_, e) => {
    await gates.get(e.tool_use_id)?.promise
    return { result: {} }
  })
  await start($, clock)

  const read = $.tool.call({ tool: 'Read', tool_use_id: 'tu1', file_path: '/x' })
  const bash = $.tool.call({ tool: 'Bash', tool_use_id: 'tu2', command: 'ls' })
  await clock.settle()
  gates.get('tu2')?.release()
  await bash
  const one = await cockpit($, WIDE)
  expect(await reading(one, 'SYSTÈMES')).toBe('▸ Read ×2')
  await one.unmount()

  gates.get('tu1')?.release()
  await read
  const none = await cockpit($, WIDE)
  expect(await reading(none, 'SYSTÈMES')).toBe('· veille ×2')
  await none.unmount()
})

test('the band draws above the prompt alone', async ($, on) => {
  const { clock } = engine(on)
  drawsBeneath(on)
  await start($, clock)

  const hint = await $.ui.mount({
    plugin: 'status-band',
    component: 'PromptHint',
    surface: 'terminal',
    props: { isDraft: false, isWorking: false, hint: 'ask' },
  })
  expect(await hint.find({ type: 'Client' })).toBeUndefined()
  expect((await hint.find({ type: 'Text' }))?.text).toBe('engine')
  await hint.unmount()
})

test('before the first reading, the band leaves its place to the engine', async ($, on) => {
  engine(on)
  drawsBeneath(on)

  const ui = await $.ui.mount(band())
  expect(await ui.find({ type: 'Client' })).toBeUndefined()
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})

test('a reading an earlier version stored is declined', async ($, on) => {
  engine(on)
  // What the code before this edit wrote stays through the reload.
  on('state.get', () => ({ value: { value: { model: 'opus', dir: 'projet' }, version: 1 } }))
  drawsBeneath(on)

  const ui = await $.ui.mount(band())
  expect(await ui.find({ type: 'Client' })).toBeUndefined()
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})

for (const [shield, gauge] of [
  [50, '████████░░░░░░░░'],
  [51, '████████▏░░░░░░░'],
  [52, '████████▎░░░░░░░'],
  [53, '████████▍░░░░░░░'],
  [53.25, '████████▌░░░░░░░'],
  [54, '████████▋░░░░░░░'],
  [55, '████████▊░░░░░░░'],
  [56, '████████▉░░░░░░░'],
] as const) {
  test(`a shield at ${shield} % fills ${gauge}`, async ($, on) => {
    const { clock } = engine(on, { contextPercent: 100 - shield })
    await start($, clock)
    const ui = await cockpit($, WIDE)

    expect(await reading(ui, 'BOUCLIER')).toStartWith(`${gauge} `)
    await ui.unmount()
  })
}

test('at exactly half, the shield gauge is still green', async ($, on) => {
  const { clock } = engine(on, { contextPercent: 50, fiveHourUsed: 0, sevenDayUsed: 0 })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(new Set(await gauges(ui))).toEqual(new Set(['success']))
  await ui.unmount()
})

test('at exactly 20 %, the shield warns without blinking', async ($, on) => {
  const { clock } = engine(on, { contextPercent: 80, fiveHourUsed: 0, sevenDayUsed: 0 })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await gauges(ui)).toContain('warning')
  expect(await colors(ui, 8)).not.toContain('error')
  await ui.unmount()
})

test('below 20 %, the shield gauge empties every other blink', async ($, on) => {
  const { clock } = engine(on, { contextPercent: 85 })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  const seen: string[] = []
  for (let frame = 0; frame < 8; frame++) {
    await ui.advance(80)
    seen.push((await reading(ui, 'BOUCLIER')).slice(0, 16))
  }
  // From 240 ms: shown until 320 ms, empty until 640 ms, shown again.
  const [shown, hidden] = ['██▍░░░░░░░░░░░░░', '░░░░░░░░░░░░░░░░']
  expect(seen).toEqual([shown, hidden, hidden, hidden, hidden, shown, shown, shown])
  await ui.unmount()
})

for (const [reserve, options] of [
  ['five-hour', { fiveHourUsed: 80 }],
  ['weekly', { sevenDayUsed: 80 }],
] as const) {
  test(`at exactly 20 % of its ${reserve} reserve, the quantum takes its turn with the others`, async ($, on) => {
    const { clock } = engine(on, options)
    await start($, clock)
    const ui = await cockpit($, NARROW)

    const pages: boolean[] = []
    for (let page = 0; page < 6; page++) {
      pages.push((await reading(ui, 'CARBURANT')) !== '')
      await ui.advance(5000)
    }
    expect(pages).toContain(false)
    expect(pages).toContain(true)
    await ui.unmount()
  })
}

for (const [tokens, shown] of [
  [1000, '1k'],
  [999_499, '999k'],
  [999_500, '1M'],
] as const) {
  test(`${tokens} tokens read ${shown}`, async ($, on) => {
    const { clock } = engine(on, { usage: usual => ({ ...usual, context: { window: 1_000_000, tokens, percent: 0 } }) })
    await start($, clock)
    const ui = await cockpit($, WIDE)

    expect(await reading(ui, 'BOUCLIER')).toMatch(new RegExp(` ${shown}/1M$`))
    await ui.unmount()
  })
}

for (const [minutes, shown] of [
  [59, '59m'],
  [60, '1h00'],
] as const) {
  test(`a session ${minutes} minutes old reads ${shown}`, async ($, on) => {
    const { clock } = engine(on, { usage: usual => ({ ...usual, startedAt: NOW - minutes * MINUTE }) })
    await start($, clock)
    const ui = await cockpit($, WIDE)

    expect(await reading(ui, 'CHRONO')).toBe(`${shown}  T+--:--`)
    await ui.unmount()
  })
}

test('the reset countdown rounds up, to the minute it ends in', async ($, on) => {
  const resetsAt = new Date(NOW + 132.5 * MINUTE).toISOString()
  const { clock } = engine(on, {
    usage: usual => ({ ...usual, rateLimits: [{ kind: 'five_hour', percentUsed: 12.5, resetsAt }] }),
  })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  expect(await reading(ui, 'CARBURANT')).toMatch(/ ↻ 2h13$/)
  await ui.unmount()
})

for (const [mb, shown, color] of [
  [8192, '8.0', 'text'],
  [4096, '4.0', 'warning'],
] as const) {
  test(`${mb} Mo free reads ${shown} Go in the ${color} color, with no alert`, async ($, on) => {
    const { clock } = engine(on, { ramKb: mb * 1024, contextPercent: 0, fiveHourUsed: 0, sevenDayUsed: 0 })
    await start($, clock)
    const ui = await cockpit($, WIDE)

    expect((await run(ui, shown))?.props.color).toBe(color)
    expect(await colors(ui, 8)).not.toContain('error')
    await ui.unmount()
  })
}

// After `cockpit`, the frame clock stands at 160 ms: a frame in three at rest
// falls on 240, 480, 720 ms... Wide open sky, so that each drawing moves stars.
const AT_REST = [true, false, false, true, false, false]
const OPEN_SKY = 600

test('at rest, the cockpit draws one frame in three', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, OPEN_SKY)

  expect(await redraws(ui, 6)).toEqual(AT_REST)
  await ui.unmount()
})

test('while Claude works, the cockpit draws every frame', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, OPEN_SKY, { isWorking: true })

  expect(await redraws(ui, 6)).toEqual(Array<boolean>(6).fill(true))
  await ui.unmount()
})

for (const [alert, options, isAlert] of [
  ['the shield below 20 %', { contextPercent: 85 }, true],
  ['the shield at 20 %', { contextPercent: 80 }, false],
  ['the five-hour reserve below 20 %', { fiveHourUsed: 85 }, true],
  ['the five-hour reserve at 20 %', { fiveHourUsed: 80 }, false],
  ['the weekly reserve below 20 %', { sevenDayUsed: 85 }, true],
  ['the weekly reserve at 20 %', { sevenDayUsed: 80 }, false],
  ['below 4 Go free', { ramKb: 4095 * 1024 }, true],
  ['at 4 Go free', { ramKb: 4096 * 1024 }, false],
  [
    'nothing known of the limits or the RAM',
    {
      usage: (usual: SessionUsage) => ({ ...usual, rateLimits: [] }),
      meminfo: () => {
        throw new Error('permission denied')
      },
    },
    false,
  ],
] as const) {
  test(`with ${alert}, the cockpit draws ${isAlert ? 'every frame' : 'one frame in three'}`, async ($, on) => {
    const { clock } = engine(on, options)
    await start($, clock)
    const ui = await cockpit($, OPEN_SKY)

    expect(await redraws(ui, 6)).toEqual(isAlert ? Array<boolean>(6).fill(true) : AT_REST)
    await ui.unmount()
  })
}

test('while a page slides in, the cockpit draws every frame', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, NARROW)
  await ui.advance(4720)

  // 4960 ms at rest; from 5040 ms the page moves on every frame, in place by
  // 5280 ms (5360 ms draws it again, unmoved); then a frame in three, 5520 ms.
  expect(await redraws(ui, 9)).toEqual([false, true, true, true, true, false, false, true, false])
  await ui.unmount()
})

// Reference images: whole frames as `frame` reads them, each row and under it
// its cells' styles. Any change to the look shows here: a change meant to be
// is copied from the frame the failure prints.
test('reference: at rest, a new page sliding in, its dot lit', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, NARROW)
  await ui.advance(5040)

  expect(await frame(ui)).toEqual([
    ' ╭── VAISSEAU ──╮╭─────── BOUCLIER ────────╮ •      +  ╭──────── CARBURANT ────────╮╭── SYSTÈMES ───',
    ' aaa AAAAAAAA aaaaaaaaaaa AAAAAAAA aaaaaaaaa s      A  aaaaaaaaa AAAAAAAAA aaaaaaaaaaaa AAAAAAAA aaa',
    ' │   OPUS 5.5   ││ ██████▏░  77%  46k/200k │   ○●○○    │ ████▍  88% ↻ 2h13 7J  64% ││  · veille ×0  ',
    ' a   TTTT TTT   aa ggggggg.  TTT  tttttttt a   iAii    a ggggg  TTT t tttt tt  TTT aa  t tttttt tt  ',
    ' ╰──────────────╯╰─────────────────────────╯           ╰───────────────────────────╯╰───────────────',
    ' aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa           aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  ])
  await ui.unmount()
})

test('reference: going to warp, the stars draw out into trails', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, NARROW, { isWorking: true })

  await ui.advance(240)
  expect(await frame(ui)).toEqual([
    ' ╭── VAISSEAU ──╮╭─────── BOUCLIER ────────╮        ╌╌ •╌        ·      ╭────────── NAV ──────────╮ ',
    ' aaa AAAAAAAA aaaaaaaaaaa AAAAAAAA aaaaaaaaa        ;; s,        .      aaaaaaaaaaa AAA aaaaaaaaaaa ',
    ' │   OPUS 5.5   ││ ██████▏░  77%  46k/200k │   ●○○○   *─╌+╌   *·╌╌ ·    │ projet : main ✎ 3 ↑2↓1  │ ',
    ' a   TTTT TTT   aa ggggggg.  TTT  tttttttt a   Aiii   Tt;A,   T.;; .    a TTTTTT s aaaa w w aaww  a ',
    ' ╰──────────────╯╰─────────────────────────╯ *       •╌     ··*•╌*─╌╌·  ╰─────────────────────────╯ ',
    ' aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa T       s,     ..Ts,Tt;;.  aaaaaaaaaaaaaaaaaaaaaaaaaaa ',
  ])
  await ui.advance(800)
  expect(await frame(ui)).toEqual([
    ' ╭── VAISSEAU ──╮╭─────── BOUCLIER ────────╮ ╌      ━───╌╌╌ ─╌  ━────╌╌ ╭────────── NAV ──────────╮ ',
    ' aaa AAAAAAAA aaaaaaaaaaa AAAAAAAA aaaaaaaaa ,      Tttt;;; i.  Ttssi.; aaaaaaaaaaa AAA aaaaaaaaaaa ',
    ' │ OPUS 5.5 »»  ││ ██████▏░  77%  46k/200k │ ─ ●○○○ ━───╌╌─╌  ─╌ ━───━─ │ projet : main ✎ 3 ↑2↓1  │ ',
    ' a TTTT TTT AA  aa ggggggg.  TTT  tttttttt a s Aiii Tttt;;i.  i. TtttTt a TTTTTT s aaaa w w aaww  a ',
    ' ╰──────────────╯╰─────────────────────────╯ ╌      ─╌╌╌─╌ ──╌╌ ─╌      ╰─────────────────────────╯ ',
    ' aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ;      s,,.i. ss,, i.      aaaaaaaaaaaaaaaaaaaaaaaaaaa ',
  ])
  await ui.unmount()
})

test('reference: the full row, the shield and the hold in alert', async ($, on) => {
  const { clock } = engine(on, { contextPercent: 85, ramKb: 3_000_000 })
  await start($, clock)
  const ui = await cockpit($, WIDE)
  await ui.advance(40)

  expect(await frame(ui)).toEqual([
    ' ╭────── VAISSEAU ───────╮ ╭────────── NAV ──────────╮ ╭─── SYSTÈMES ────╮ ╭─ ESCADRILLE ─╮ ╭── CONTRATS ──╮  ·                 ╭─────────── BOUCLIER ────────────╮ ╭──────────── CARBURANT ────────────╮ ╭──── CHRONO ────╮ ╭─ CRÉDITS ──╮ ╭─ SOUTE ─╮ ╭─ HEURE ─╮ ',
    ' aaaaaaa AAAAAAAA aaaaaaaa aaaaaaaaaaa AAA aaaaaaaaaaa aaaa AAAAAAAA aaaaa aa AAAAAAAAAA aa aaa AAAAAAAA aaa  .                 eeeeeeeeeeee AAAAAAAA eeeeeeeeeeeee aaaaaaaaaaaaa AAAAAAAAA aaaaaaaaaaaaa aaaaa AAAAAA aaaaa aa AAAAAAA aaa ee AAAAA ee aa AAAAA aa ',
    ' │  OPUS 5.5  EN ORBITE  │ │ projet : main ✎ 3 ↑2↓1  │ │   · veille ×0   │ │   1 en vol   │ │ 12 contrats  │   ·                │ ██▍░░░░░░░░░░░░░  15%  46k/200k │ │ ███████░  88% ↻ 2h13 7J ██▌░  64% │ │ 1h12  T+--:--  │ │  ¤ 1.42 $  │ │ 2.9 Go  │ │  14:32  │ ',
    ' a  TTTT TTT  tt tttttt  a a TTTTTT s aaaa w w aaww  a a   t tttttt tt   a a   A AA AAA   a a TT tttttttt  a   .                e eee.............  TTT  tttttttt e a ggggggg.  TTT t tttt tt ggg.  TTT a a TTTT  iiiiiii  a a  A TTTT t  a e EEE EE  e a  TTTTT  a ',
    ' ╰───────────────────────╯ ╰─────────────────────────╯ ╰─────────────────╯ ╰──────────────╯ ╰──────────────╯                  · ╰─────────────────────────────────╯ ╰───────────────────────────────────╯ ╰────────────────╯ ╰────────────╯ ╰─────────╯ ╰─────────╯ ',
    ' aaaaaaaaaaaaaaaaaaaaaaaaa aaaaaaaaaaaaaaaaaaaaaaaaaaa aaaaaaaaaaaaaaaaaaa aaaaaaaaaaaaaaaa aaaaaaaaaaaaaaaa                  . eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa aaaaaaaaaaaaaaaaaa aaaaaaaaaaaaaa eeeeeeeeeee aaaaaaaaaaa ',
  ])
  await ui.unmount()
})

test('with an effort shown, going to warp leaves the panels where they stand', async ($, on) => {
  const { clock } = engine(on)
  requests(on)
  await step($, 'high')
  await start($, clock)
  const idle = await placeOf($, 'NAV')

  const working = await cockpit($, WIDE, { isWorking: true })
  await working.advance(2000)
  expect(await reading(working, 'VAISSEAU')).toMatch(/^OPUS 5\.5 HIGH {2}QUANTUM /)
  const [top = ''] = await rows(working)
  expect(top.indexOf('NAV')).toBe(idle)
  await working.unmount()
})

test('a branch with changes, nothing ahead or behind, reads centered', async ($, on) => {
  const { clock } = engine(on, {
    git: () => '# branch.oid 0123abc\n# branch.head main\n# branch.ab +0 -0\n? a.txt\n? b.txt\n? c.txt',
  })
  await start($, clock)
  const ui = await cockpit($, WIDE)

  const [, middle = ''] = await rows(ui)
  expect(middle).toContain('│    projet : main ✎ 3    │')
  await ui.unmount()
})

test('the shield keeps its room before the context is known', async ($, on) => {
  let isKnown = false
  const { clock } = engine(on, {
    usage: usual => ({ ...usual, context: { window: 200_000, tokens: 46_000, percent: isKnown ? 23 : undefined } }),
  })
  await start($, clock)
  const before = await placeOf($, 'BOUCLIER')

  isKnown = true
  await clock.advance(15_000)
  expect(await placeOf($, 'BOUCLIER')).toBe(before)
})

test('dropping out of warp, the stars slow on every frame, then rest', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, OPEN_SKY, { isWorking: true })
  await ui.advance(2000)

  await ui.redraw({ ...band().props, isWorking: false })
  expect(await redraws(ui, 6)).toEqual(Array<boolean>(6).fill(true))
  // 7680 ms: the warp is spent; at rest, a frame in three, from 7920 ms.
  await ui.advance(5000)
  expect(await redraws(ui, 6)).toEqual([false, false, true, false, false, true])
  await ui.unmount()
})

test('a tool name just as long as its room reads whole', async ($, on) => {
  const { clock } = engine(on)
  const tool = gate()
  on('tool.call', async () => {
    await tool.promise
    return { result: {} }
  })
  await start($, clock)

  const call = $.tool.call({ tool: 'WebFetch', tool_use_id: 'tu1', url: 'https://example.com', prompt: 'read' })
  await clock.settle()
  const ui = await cockpit($, WIDE)
  expect(await reading(ui, 'SYSTÈMES')).toBe('▸ WebFetch ×1')
  await ui.unmount()
  tool.release()
  await call
})

test('a terminal resized narrower lays the panels out again', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, WIDE)

  await ui.resize({ columns: NARROW, rows: 3 })
  await ui.advance(400)
  expect(await titles(ui)).toEqual(['VAISSEAU', 'BOUCLIER', 'NAV'])
  await ui.unmount()
})

test('a panel going into alert while the band is up is pinned at once', async ($, on) => {
  let ramKb = 14_889_779
  const { clock } = engine(on, { meminfo: () => `MemAvailable: ${ramKb} kB\n` })
  await start($, clock)
  const ui = await cockpit($, NARROW)

  ramKb = 3_000_000
  await clock.advance(15_000)
  for (const page of await pages(ui, 4)) expect(page).toContain('SOUTE')
  await ui.unmount()
})

test('a model request ends once its effort is noted', async ($, on) => {
  const { clock } = engine(on)
  requests(on)
  let reading = Promise.resolve()
  on('state.get', async (_, e, next) => {
    await reading
    return next(e)
  })
  await start($, clock)

  const noted = gate()
  reading = noted.promise
  let isDone = false
  const stepping = step($, 'high').then(() => {
    isDone = true
  })
  await clock.settle()
  expect(isDone).toBe(false)
  reading = Promise.resolve()
  noted.release()
  await stepping
  expect(isDone).toBe(true)
})

test('a request at the effort already shown writes nothing', async ($, on) => {
  const { clock } = engine(on)
  requests(on)
  let writes = 0
  on('state.set', (_, e, next) => {
    writes += 1
    return next(e)
  })
  await start($, clock)
  await step($, 'high')

  const before = writes
  await step($, 'high')
  expect(writes).toBe(before)
})

// The pages each width shows, the first again at the end: the turn comes
// round. Narrow terminals take the short titles; below 84 columns the dots
// give way; at 70 the widest panels find no page; at 40, the ship gives way.
for (const [columns, book] of [
  [40, ['BCL H']],
  [56, ['VSO BCL H']],
  [70, ['VSO BCL SYS', 'VSO BCL CHR', 'VSO BCL ESC', 'VSO BCL CRD STE', 'VSO BCL CTR H']],
  [
    84,
    [
      'VAISSEAU BOUCLIER NAV ●○○○○○○',
      'VAISSEAU BOUCLIER CARBURANT ○●○○○○○',
      'VAISSEAU BOUCLIER SYSTÈMES ○○●○○○○',
      'VAISSEAU BOUCLIER CHRONO ○○○●○○○',
      'VAISSEAU BOUCLIER ESCADRILLE CRÉDITS ○○○○●○○',
      'VAISSEAU BOUCLIER SOUTE CONTRATS ○○○○○●○',
      'VAISSEAU BOUCLIER HEURE ○○○○○○●',
    ],
  ],
  [
    104,
    [
      'VAISSEAU BOUCLIER NAV ●○○○',
      'VAISSEAU BOUCLIER CARBURANT SYSTÈMES ○●○○',
      'VAISSEAU BOUCLIER CHRONO ESCADRILLE CRÉDITS ○○●○',
      'VAISSEAU BOUCLIER SOUTE CONTRATS HEURE ○○○●',
    ],
  ],
] as const) {
  test(`${columns} columns lay the panels out in ${book.length} page(s)`, async ($, on) => {
    const { clock } = engine(on)
    await start($, clock)
    const ui = await cockpit($, columns)

    expect(await leaves(ui, book.length + 1)).toEqual([...book, book[0]])
    await ui.unmount()
  })
}

test('a lone page stays put when its turn comes round', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, 40)
  await ui.advance(4800)

  // 4960 to 5280 ms: across the turn, where a page would slide in.
  for (let frame = 0; frame < 5; frame++) {
    await ui.advance(80)
    expect({ frame, titles: await titles(ui) }).toEqual({ frame, titles: ['BCL', 'H'] })
  }
  await ui.unmount()
})

test('a page slides in eased, a step on every frame', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, NARROW)
  await ui.advance(9840)

  // From 10 080 ms: how far right of its place the page's first panel stands.
  const starts: number[] = []
  for (let frame = 0; frame < 5; frame++) {
    await ui.advance(80)
    const [top = ''] = await rows(ui)
    starts.push(top.indexOf('╭', top.indexOf('BOUCLIER')))
  }
  const place = starts[starts.length - 1] ?? 0
  expect(starts.map(x => x - place)).toEqual([20, 6, 1, 0, 0])
  await ui.unmount()
})

test('in a long warp the stars come round again', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, OPEN_SKY, { isWorking: true })
  const heads = async () => ((await rows(ui)).join('').match(/━/g) ?? []).length

  // A star leaving at the left edge comes back at the right: lap after lap,
  // the sky keeps its near stars.
  await ui.advance(2000)
  expect(await heads()).toBeGreaterThanOrEqual(5)
  for (let lap = 0; lap < 3; lap++) {
    await ui.advance(10_000)
    expect({ lap, isFull: (await heads()) >= 5 }).toEqual({ lap, isFull: true })
  }
  await ui.unmount()
})

test('at rest, the near stars twinkle and the far ones never do', async ($, on) => {
  const { clock } = engine(on)
  await start($, clock)
  const ui = await cockpit($, OPEN_SKY)

  // Cells whose star turned into a twinkle from one frame to the next.
  const turned = { far: 0, near: 0 }
  let last = await rows(ui)
  for (let frame = 0; frame < 120; frame++) {
    await ui.advance(80)
    const shown = await rows(ui)
    shown.forEach((row, y) => {
      Array.from(row).forEach((ch, x) => {
        const was = last[y]?.[x]
        if (ch === '+' && was === '·') turned.far += 1
        if (ch === '+' && (was === '•' || was === '*')) turned.near += 1
      })
    })
    last = shown
  }
  expect(turned.far).toBe(0)
  expect(turned.near).toBeGreaterThan(0)
  await ui.unmount()
})

test('a panel in alert is never left out where the short titles keep it', async ($, on) => {
  const { clock } = engine(on, { fiveHourUsed: 85 })
  await start($, clock)

  for (let columns = 90; columns <= 130; columns++) {
    const ui = await cockpit($, columns)
    await ui.advance(400)
    const isShown = (await titles(ui)).some(title => title === 'CARBURANT' || title === 'CRB')
    expect({ columns, isShown }).toEqual({ columns, isShown: true })
    await ui.unmount()
  }
})
