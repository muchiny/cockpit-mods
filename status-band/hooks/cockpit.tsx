import type { ClientModule, ThemeKey } from 'claude-code'

import type { Line } from '../types'

// See-through cockpit HUD over an animated starfield. No cell paints a
// background and every color is a theme key, so the band sits on whatever
// the console shows (plain, image, transparency) and keeps its contrast with
// the person's Claude Code theme.
//
// Eleven instruments. The full row is kept whenever it fits; a narrower
// terminal squeezes it (short gauges, then short titles); narrower still, the
// ship and the shield stay put while the other instruments take turns, a page
// sliding in every five seconds, and an instrument in alert stays pinned.
//
// Each panel keeps room for the values its reading can grow to, so a count
// or a cost that grows does not move the panels; title and reading are
// centered in it.

type Props = { line: Line; isWorking: boolean }

type Layer = 0 | 1 | 2

type Star = { x: number; y: number; layer: Layer; phase: number }

type Level = 0 | 1 | 2

type PanelId =
  | 'VAISSEAU'
  | 'NAV'
  | 'BOUCLIER'
  | 'CARBURANT'
  | 'CHRONO'
  | 'SYSTÈMES'
  | 'ESCADRILLE'
  | 'CRÉDITS'
  | 'SOUTE'
  | 'CONTRATS'
  | 'HEURE'

// Panels anchored left and right, and pages taking turns at the right edge.
type Plan = { lvl: Level; left: PanelId[]; right: PanelId[]; pages: PanelId[][]; isCounted: boolean }

type Sim = {
  props: Props
  columns: number
  stars: Star[]
  // Frame-clock time: `elapsed` runs on every frame, `ms` is the moment drawn.
  elapsed: number
  ms: number
  // When props.line arrived, on the frame clock: the zero of its clock.
  syncMs: number
  warp: number
  shield: number
  // The plan drawn last, for the width and figures it was made for.
  plan: { w: number; line: Line; plan: Plan } | null
}

type State = { sim: Sim; ms: number }

type Cell = { ch: string; color: ThemeKey | undefined; bold: boolean; dim: boolean }

type Seg = { text: string; color: ThemeKey; bold?: boolean; dim?: boolean }

// What an instrument reads: the figures, the moment, and the room it has.
type View = { line: Line; lvl: Level; isFull: boolean; t: number; ms: number; isWarp: boolean; shield: number }

// `min`: the room kept for the reading, whatever it reads now.
type Reading = { body: Seg[]; min: number; alert?: boolean }

type Panel = { id: PanelId; title: string; body: Seg[]; min: number; alert: boolean }

type Placed = { panel: Panel; x: number }

const ACCENT: ThemeKey = 'suggestion'
const ROWS = 3
const FRAME_MS = 80
// At rest (no warp, no alert, no page sliding in), one frame in three is drawn.
const CALM_EVERY = 3
const STAR_COUNT = 70
// Far, mid and near: the theme's dimmest to its plainest text.
const STAR_COLORS = ['inactive', 'subtle', 'text'] as const satisfies readonly ThemeKey[]
// Cells per frame and warp trail length, by parallax layer.
const DRIFT = [0.03, 0.08, 0.2] as const
const WARP = [0.7, 1.6, 3.2] as const
const TRAIL = [1, 3, 7] as const
const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']
const BLINK_MS = 320
const CHEVRON_MS = 160
const PAGE_MS = 5000
const SLIDE_MS = 320

const LEVELS: readonly Level[] = [0, 1, 2]
// Open sky kept between the two groups, and the gap between panels, by level.
const SKY: Record<Level, number> = { 0: 8, 1: 2, 2: 2 }
const GAP: Record<Level, number> = { 0: 1, 1: 0, 2: 0 }
// Pages keep the least sky.
const PAGED_SKY = 2

// One row: mission on the left, resources on the right.
const LEFT: readonly PanelId[] = ['VAISSEAU', 'NAV', 'SYSTÈMES', 'ESCADRILLE', 'CONTRATS']
const RIGHT: readonly PanelId[] = ['BOUCLIER', 'CARBURANT', 'CHRONO', 'CRÉDITS', 'SOUTE', 'HEURE']
// Pages: these two never leave; the rest take turns, in this order.
const FIXED: readonly PanelId[] = ['VAISSEAU', 'BOUCLIER']
const POOL: readonly PanelId[] = [
  'NAV',
  'CARBURANT',
  'SYSTÈMES',
  'CHRONO',
  'ESCADRILLE',
  'CRÉDITS',
  'SOUTE',
  'CONTRATS',
  'HEURE',
]

const LOW_PCT = 20
const HALF_PCT = 50
const LOW_RAM_MB = 4096
const TIGHT_RAM_MB = 8192
// Room kept for a tool's name, by level; for the work tree's marks (± 12 ↑3↓1).
const TOOL_NAME: Record<Level, number> = { 0: 8, 1: 6, 2: 6 }
const GIT_MARKS = 10
const HOUR_MS = 3_600_000
// How long each tank's window runs.
const FIVE_HOURS_MS = 5 * HOUR_MS
const SEVEN_DAYS_MS = 7 * 24 * HOUR_MS
// A tank's pace is read once a twentieth of its window has run: sooner, a
// few minutes would speak for the week.
const PACE_AFTER = 20

// Mulberry32: the same sky on every mount.
function random(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Moves `from` toward `to` as `perFrame` of the way each frame would, over `dt` ms.
function approach(from: number, to: number, perFrame: number, dt: number): number {
  return to + (from - to) * (1 - perFrame) ** (dt / FRAME_MS)
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3
}

function length(text: string): number {
  return Array.from(text).length
}

function width(body: readonly Seg[]): number {
  return body.reduce((n, seg) => n + length(seg.text), 0)
}

function tone(pct: number): ThemeKey {
  return pct < LOW_PCT ? 'error' : pct < HALF_PCT ? 'warning' : 'success'
}

function isBlinkOn(ms: number): boolean {
  return Math.floor(ms / BLINK_MS) % 2 === 0
}

// 46000 → 46k ; 1000000 → 1M
function compact(n: number): string {
  if (n < 1000) return String(n)
  if (n < 999_500) return `${Math.round(n / 1000)}k`
  return `${Number((n / 1_000_000).toFixed(1))}M`
}

// 45 min → 45m ; 72 min → 1h12 ; 101 h → 4j05. A countdown rounds up, to
// the minute it ends in.
function duration(ms: number, round = Math.floor): string {
  const minutes = Math.max(0, round(ms / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h${String(minutes % 60).padStart(2, '0')}`
  return `${Math.floor(hours / 24)}j${String(hours % 24).padStart(2, '0')}`
}

// T+mm:ss, the minutes growing past 99.
function stopwatch(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')

  return `T+${mm}:${String(seconds % 60).padStart(2, '0')}`
}

// A value stands out; what qualifies it reads plainly; an empty slot fades.
function value(text: string, color: ThemeKey = 'text'): Seg {
  return { text, color, bold: true }
}

function plain(text: string, color: ThemeKey = 'text'): Seg {
  return { text, color }
}

function empty(text: string): Seg {
  return { text, color: 'inactive' }
}

function percent(pct: number): Seg {
  return value(` ${`${pct}%`.padStart(4)}`)
}

function gauge(pct: number, n: number, ms: number): Seg[] {
  const fill = (Math.min(Math.max(pct, 0), 100) / 100) * n
  const color = tone(pct)
  // Below 20 % the bar blinks.
  const isHidden = color === 'error' && !isBlinkOn(ms)

  return Array.from({ length: n }, (_, i): Seg => {
    if (isHidden) return empty('░')
    if (i + 1 <= fill) return { text: '█', color }
    // Past the fill, the index is 0 or below: no partial block.
    const partial = EIGHTHS[Math.floor((fill - i) * 8)] ?? ''
    if (partial !== '') return { text: partial, color }
    return { text: '░', color: 'inactive', dim: true }
  })
}

function readShip(v: View): Reading {
  const { line } = v
  const effort = line.effort ? ` ${line.effort.toUpperCase()}` : ''
  const chevrons = '»'.repeat(1 + (Math.floor(v.ms / CHEVRON_MS) % 3)).padEnd(3)
  const state = v.isWarp
    ? [value(v.isFull ? '  QUANTUM ' : ' ', ACCENT), value(chevrons, ACCENT)]
    : v.isFull
      ? [plain('  EN ORBITE')]
      : []

  return {
    body: [value(line.model.toUpperCase()), ...(effort ? [plain(effort)] : []), ...state],
    min: length(line.model) + length(effort) + (v.isFull ? 13 : 4),
  }
}

function readNav(v: View): Reading {
  const { line } = v
  const { git } = line
  const where = [value(line.dir), ...(line.branch ? [plain(' : ', 'subtle'), plain(line.branch, ACCENT)] : [])]
  if (git === null) return { body: where, min: 0 }
  const marks = [
    git.changed > 0 ? plain(` ± ${git.changed}`, 'warning') : plain(' ✓', 'success'),
    ...(git.ahead > 0 || git.behind > 0 ? [plain(' ')] : []),
    ...(git.ahead > 0 ? [plain(`↑${git.ahead}`, ACCENT)] : []),
    ...(git.behind > 0 ? [plain(`↓${git.behind}`, 'warning')] : []),
  ]

  return { body: [...where, ...marks], min: width(where) + GIT_MARKS }
}

function readShield(v: View): Reading {
  const { line } = v
  const n = v.isFull ? 16 : 8
  // The gauge, the percentage, and up to `999k/999k`.
  const min = n + 5 + 10
  if (line.contextPercent === null) return { body: [empty('--')], min }
  const pct = Math.round(v.shield)
  const tokens =
    line.contextTokens === null || line.contextWindow === null
      ? []
      : [plain(` ${`${compact(line.contextTokens)}/${compact(line.contextWindow)}`.padStart(9)}`)]

  return { body: [...gauge(v.shield, n, v.ms), percent(pct), ...tokens], min, alert: pct < LOW_PCT }
}

// One rate-limit window: what is left of it, how long until it resets, and
// how long it lasts at the pace kept since it opened.
type Tank = { left: number; resetsIn: number | null; range: number | null }

// The ms until a tank is dry at its pace so far, Infinity when it holds to
// its reset; null while the window is too young to tell, or its reset past.
function rangeOf(usedPct: number, resetsIn: number, span: number): number | null {
  const elapsed = span - resetsIn
  if (resetsIn < 0 || elapsed < span / PACE_AFTER) return null
  // Nothing burnt yet: the division says Infinity.
  const dryIn = ((100 - usedPct) * elapsed) / usedPct

  return dryIn < resetsIn ? dryIn : Infinity
}

function tank(usedPct: number | null, resetsAt: number | null, span: number, t: number): Tank | null {
  if (usedPct === null) return null
  const resetsIn = resetsAt === null ? null : resetsAt - t

  return { left: 100 - usedPct, resetsIn, range: resetsIn === null ? null : rangeOf(usedPct, resetsIn, span) }
}

function isFuelLow(line: Line): boolean {
  // A window the account does not have has used nothing.
  return [line.fiveHourPercent, line.sevenDayPercent].some(used => 100 - (used ?? 0) < LOW_PCT)
}

// The window the account has, its countdown, and whether the pace holds to
// the reset. With both windows the five hours lead and the week follows.
function readFuel(v: View): Reading {
  const { line } = v
  const five = tank(line.fiveHourPercent, line.fiveHourResetsAt, FIVE_HOURS_MS, v.t)
  const week = tank(line.sevenDayPercent, line.sevenDayResetsAt, SEVEN_DAYS_MS, v.t)
  const main = five ?? week
  // Gauge, percentage, ⟳ 0h00, 7J, its gauge in full, its percentage, then
  // `à sec 0j00`, which takes the countdown's place in a squeezed row.
  const min = v.isFull ? 44 : 29
  if (main === null) return { body: [empty('--')], min }

  // The tank dry first is the one that counts: with none known, Infinity.
  const ranges = [five, week].map(t => t?.range ?? null).filter(range => range !== null)
  const soonest = Math.min(...ranges)
  const isShort = soonest !== Infinity
  const countdown = main.resetsIn === null ? [] : [plain(` ⟳ ${duration(main.resetsIn, Math.ceil)}`)]
  const verdict = isShort
    ? [plain(` à sec ${duration(soonest)}`, 'warning')]
    : ranges.length > 0
      ? [plain(' tient', 'success')]
      : []
  const second =
    five === null || week === null
      ? []
      : [plain(' 7J'), ...(v.isFull ? [plain(' '), ...gauge(week.left, 4, v.ms)] : []), percent(week.left)]

  return {
    body: [
      ...(five === null ? [plain('7J ')] : []),
      ...gauge(main.left, v.isFull ? 8 : 5, v.ms),
      percent(main.left),
      ...(v.isFull ? [...countdown, ...second, ...verdict] : [...(isShort ? verdict : countdown), ...second]),
    ],
    min,
    alert: isFuelLow(line),
  }
}

function readChrono(v: View): Reading {
  const { line } = v
  const turn = line.turnStartedAt === null ? empty('T+--:--') : value(stopwatch(v.t - line.turnStartedAt), ACCENT)

  // Up to 99j23, then the turn's stopwatch.
  return { body: [value(duration(v.t - (line.sessionStartedAt ?? v.t))), plain('  '), turn], min: 14 }
}

function readSystems(v: View): Reading {
  const room = TOOL_NAME[v.lvl]
  const name = v.line.tool?.split('__').pop() ?? null
  const shown = name === null ? null : name.length > room ? `${name.slice(0, room - 1)}…` : name

  return {
    body: [shown === null ? plain('· veille') : value(`► ${shown}`, ACCENT), plain(` ×${v.line.toolCount}`)],
    // The marker and the name, then up to three digits of count.
    min: 2 + room + 5,
  }
}

function readSquadron(v: View): Reading {
  const n = v.line.agentsInFlight

  return { body: [n > 0 ? value(`${n} en vol`, ACCENT) : plain('au hangar')], min: 9 }
}

// What the session costs in what the account pays with. On a weekly
// allowance, its share of the week; off one, real money: dollars, not the
// game's aUEC.
function readCredits(v: View): Reading {
  const { line } = v
  // Up to 999.99 $, or 99.9% 7J.
  const min = v.isFull ? 10 : 8
  if (line.sevenDayPercent === null) {
    return {
      body: [value('¤ ', ACCENT), value((line.costUsd ?? 0).toFixed(2)), ...(v.isFull ? [plain(' $')] : [])],
      min,
    }
  }
  if (line.weekSharePercent === null) return { body: [value('¤ ', ACCENT), empty('--')], min }

  return {
    body: [value('¤ ', ACCENT), value(`${line.weekSharePercent.toFixed(1)}%`), ...(v.isFull ? [plain(' 7J')] : [])],
    min,
  }
}

function readHold(v: View): Reading {
  const ram = v.line.ramAvailableMb
  if (ram === null) return { body: [empty('--')], min: 7 }
  const color: ThemeKey = ram < LOW_RAM_MB ? 'error' : ram < TIGHT_RAM_MB ? 'warning' : 'text'

  return { body: [value(`${(ram / 1024).toFixed(1)} Go`, color)], min: 7, alert: ram < LOW_RAM_MB }
}

function readContracts(v: View): Reading {
  const n = v.line.prompts
  const unit = v.isFull ? (n > 1 ? ' contrats' : ' contrat') : ' ctr'

  // Up to three digits of count.
  return { body: [value(String(n)), plain(unit)], min: v.isFull ? 12 : 7 }
}

function readClock(v: View): Reading {
  return { body: [v.line.clock ? value(v.line.clock) : empty('--:--')], min: 5 }
}

const INSTRUMENTS: Record<PanelId, { short: string; read: (v: View) => Reading }> = {
  VAISSEAU: { short: 'VSO', read: readShip },
  NAV: { short: 'NAV', read: readNav },
  BOUCLIER: { short: 'BCL', read: readShield },
  CARBURANT: { short: 'CRB', read: readFuel },
  CHRONO: { short: 'CHR', read: readChrono },
  SYSTÈMES: { short: 'SYS', read: readSystems },
  ESCADRILLE: { short: 'ESC', read: readSquadron },
  CRÉDITS: { short: 'CRD', read: readCredits },
  SOUTE: { short: 'STE', read: readHold },
  CONTRATS: { short: 'CTR', read: readContracts },
  HEURE: { short: 'H', read: readClock },
}

function createSim(props: Props): Sim {
  const rand = random(42)
  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: rand(),
    y: Math.floor(rand() * ROWS),
    layer: Math.min(2, Math.floor(rand() * 3)) as Layer,
    phase: Math.floor(rand() * 40),
  }))

  return {
    props,
    columns: 0,
    stars,
    elapsed: 0,
    ms: 0,
    syncMs: 0,
    warp: 0,
    shield: 100 - (props.line.contextPercent ?? 0),
    plan: null,
  }
}

function hasAlert(sim: Sim): boolean {
  const { line } = sim.props

  return (
    sim.shield < LOW_PCT || isFuelLow(line) || (line.ramAvailableMb !== null && line.ramAvailableMb < LOW_RAM_MB)
  )
}

// Nothing moves fast: drawing one frame in three loses nothing.
function isCalm(sim: Sim): boolean {
  const isPaging = (sim.plan?.plan.pages.length ?? 0) > 1
  const isSliding = isPaging && sim.elapsed % PAGE_MS < SLIDE_MS + FRAME_MS

  return !sim.props.isWorking && sim.warp < 0.01 && !isSliding && !hasAlert(sim)
}

// Past half speed the ship reads QUANTUM and the stars streak.
function isWarping(sim: Sim): boolean {
  return sim.warp > 0.5
}

function step(sim: Sim): void {
  const dt = sim.elapsed - sim.ms
  sim.ms = sim.elapsed
  const w = Math.max(sim.columns, 1)
  sim.warp = approach(sim.warp, sim.props.isWorking ? 1 : 0, 0.12, dt)
  sim.shield = approach(sim.shield, 100 - (sim.props.line.contextPercent ?? 0), 0.15, dt)
  for (const star of sim.stars) {
    star.x -= (lerp(DRIFT[star.layer], WARP[star.layer], sim.warp) * dt) / FRAME_MS / w
    star.x -= Math.floor(star.x)
  }
}

function now(sim: Sim): number {
  return sim.props.line.updatedAt + (sim.ms - sim.syncMs)
}

function panelsAt(sim: Sim, lvl: Level): Record<PanelId, Panel> {
  const view: View = {
    line: sim.props.line,
    lvl,
    isFull: lvl === 0,
    t: now(sim),
    ms: sim.ms,
    isWarp: isWarping(sim),
    shield: sim.shield,
  }
  const ids = Object.keys(INSTRUMENTS) as PanelId[]

  return Object.fromEntries(
    ids.map(id => {
      const { short, read } = INSTRUMENTS[id]
      const { body, min, alert = false } = read(view)
      return [id, { id, title: lvl === 2 ? short : id, body, min, alert }]
    }),
  ) as Record<PanelId, Panel>
}

function panelWidth(panel: Panel): number {
  return Math.max(Math.max(width(panel.body), panel.min) + 4, length(panel.title) + 6)
}

function span(group: readonly Panel[], gap: number): number {
  return group.reduce((n, p) => n + panelWidth(p), 0) + gap * Math.max(group.length - 1, 0)
}

// Greedy: panels in order, a new page when the next one does not fit.
function paginate(pool: readonly Panel[], budget: number, gap: number): Panel[][] {
  const pages: Panel[][] = []
  for (const panel of pool) {
    if (panelWidth(panel) > budget) continue
    const page = pages.at(-1)
    if (page !== undefined && span([...page, panel], gap) <= budget) {
      page.push(panel)
    } else {
      pages.push([panel])
    }
  }

  return pages
}

function fitsRow(byId: Record<PanelId, Panel>, lvl: Level, w: number): boolean {
  const gap = GAP[lvl]
  const row = span(LEFT.map(id => byId[id]), gap) + span(RIGHT.map(id => byId[id]), gap)

  return 2 + row + SKY[lvl] <= w
}

// Pages at one level. Complete when no fixed or pinned panel gave way, every
// other one has a page, and the dots counting the pages fit beside them.
function pagesAt(byId: Record<PanelId, Panel>, lvl: Level, w: number): { plan: Plan; isComplete: boolean } {
  const gap = GAP[lvl]
  const pinned = POOL.filter(id => byId[id].alert)
  const pool = POOL.filter(id => !pinned.includes(id)).map(id => byId[id])
  let fixed: PanelId[] = [...FIXED, ...pinned]
  // What is left for the pages and their dots once the fixed panels are in.
  const room = () => w - 2 - span(fixed.map(id => byId[id]), gap) - gap - PAGED_SKY

  // Too narrow even for the fixed panels: the pinned ones, then the ship, give way.
  for (const id of [...pinned].reverse().concat('VAISSEAU')) {
    if (room() >= 0) break
    fixed = fixed.filter(f => f !== id)
  }

  // The dots take one cell a page and a space each side: the fewest that
  // leave room for the pages they count. They give way if they cost a panel.
  const bare = paginate(pool, room(), gap)
  let counted = bare
  for (let n = 1; counted.length > n; n++) counted = paginate(pool, room() - (n + 2), gap)
  const isCounted = counted.flat().length === bare.flat().length
  const pages = (isCounted ? counted : bare).map(page => page.map(panel => panel.id))

  return {
    plan: { lvl, left: fixed, right: [], pages, isCounted },
    isComplete: isCounted && fixed.length === FIXED.length + pinned.length && bare.flat().length === pool.length,
  }
}

// The full row, squeezed only as far as the width asks; else pages, at the
// first level where all of them fit, or the tightest.
function planFor(sim: Sim, w: number): Plan {
  const cached = sim.plan
  if (cached !== null && cached.w === w && cached.line === sim.props.line) return cached.plan

  const at = (lvl: Level) => panelsAt(sim, lvl)
  const row = LEVELS.find(lvl => fitsRow(at(lvl), lvl, w))
  const plan: Plan =
    row !== undefined
      ? // Stryker disable next-line BooleanLiteral: a row has no pages, so no dots to count
        { lvl: row, left: [...LEFT], right: [...RIGHT], pages: [], isCounted: false }
      : (LEVELS.map(lvl => pagesAt(at(lvl), lvl, w)).find(p => p.isComplete)?.plan ?? pagesAt(at(2), 2, w).plan)
  sim.plan = { w, line: sim.props.line, plan }

  return plan
}

// Left group from the left edge, right group against the right edge.
function place(leftGroup: readonly Panel[], rightGroup: readonly Panel[], w: number, gap: number): Placed[] {
  const placed: Placed[] = []
  let x = 1
  for (const panel of leftGroup) {
    placed.push({ panel, x })
    x += panelWidth(panel) + gap
  }
  x = w - 1
  for (const panel of [...rightGroup].reverse()) {
    x -= panelWidth(panel)
    placed.push({ panel, x })
    x -= gap
  }

  return placed
}

function emptyGrid(w: number): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    // Stryker disable next-line BooleanLiteral: a blank cell is drawn with no style, whatever it holds
    Array.from({ length: w }, () => ({ ch: ' ', color: undefined, bold: false, dim: false })),
  )
}

function put(grid: Cell[][], x: number, y: number, ch: string, color?: ThemeKey, bold = false, dim = false): void {
  // Stryker disable next-line OptionalChaining: every caller writes on one of the grid's rows
  const cell = grid[y]?.[x]
  if (!cell) return
  cell.ch = ch
  cell.color = color
  cell.bold = bold
  cell.dim = dim
}

function write(grid: Cell[][], x: number, y: number, text: string, color?: ThemeKey, bold = false, dim = false): void {
  Array.from(text).forEach((ch, i) => {
    put(grid, x + i, y, ch, color, bold, dim)
  })
}

// The columns each panel (and the page dots) takes and one either side: no
// star there.
function clearance(spans: readonly { x: number; w: number }[]): Set<number> {
  const taken = new Set<number>()
  for (const { x, w } of spans) {
    for (let col = x - 1; col <= x + w; col++) taken.add(col)
  }

  return taken
}

function drawStars(grid: Cell[][], sim: Sim, w: number, taken: ReadonlySet<number>): void {
  const frame = Math.floor(sim.ms / FRAME_MS)
  const sky = (x: number, y: number, ch: string, color: ThemeKey, bold: boolean, dim = false) => {
    if (!taken.has(x)) put(grid, x, y, ch, color, bold, dim)
  }
  for (const star of sim.stars) {
    const x = Math.floor(star.x * w)
    const color = STAR_COLORS[star.layer]
    const trail = Math.round(TRAIL[star.layer] * sim.warp)
    // The trail thins out behind the star: a line, then a dashed dim line.
    for (let i = trail; i >= 1; i--) {
      const isFar = i > trail / 2
      sky(x + i, star.y, isFar ? '╌' : '─', color, false, isFar)
    }
    const isTwinkling = (frame + star.phase) % 40 < 4
    if (isWarping(sim)) {
      sky(x, star.y, star.layer === 2 ? '━' : '─', color, star.layer === 2)
    } else if (isTwinkling && star.layer > 0) {
      sky(x, star.y, '+', ACCENT, true)
    } else {
      sky(x, star.y, star.layer === 0 ? '·' : star.layer === 1 ? '•' : '*', color, star.layer === 2, star.layer === 0)
    }
  }
}

function drawPanel(grid: Cell[][], x: number, panel: Panel, ms: number): void {
  const w = panelWidth(panel)
  const frame: ThemeKey = panel.alert && isBlinkOn(ms) ? 'error' : ACCENT
  const title = length(panel.title)
  // `╭─ TITLE ─╮`: the dashes shared out either side of the title.
  const dashes = w - 4 - title
  const before = Math.floor(dashes / 2)

  write(grid, x, 0, `╭${'─'.repeat(before)} `, frame)
  write(grid, x + 2 + before, 0, panel.title, ACCENT, true)
  write(grid, x + 2 + before + title, 0, ` ${'─'.repeat(dashes - before)}╮`, frame)
  put(grid, x, 1, '│', frame)
  put(grid, x + w - 1, 1, '│', frame)
  write(grid, x, 2, `╰${'─'.repeat(w - 2)}╯`, frame)

  let cx = x + 2 + Math.floor((w - 4 - width(panel.body)) / 2)
  for (const seg of panel.body) {
    write(grid, cx, 1, seg.text, seg.color, seg.bold ?? false, seg.dim ?? false)
    cx += length(seg.text)
  }
}

function draw(sim: Sim, w: number): Cell[][] {
  const plan = planFor(sim, w)
  const byId = panelsAt(sim, plan.lvl)
  const gap = GAP[plan.lvl]
  const placed = place(
    plan.left.map(id => byId[id]),
    plan.right.map(id => byId[id]),
    w,
    gap,
  )
  const pages = plan.pages.map(page => page.map(id => byId[id]))
  const index = Math.floor(sim.ms / PAGE_MS) % Math.max(pages.length, 1)
  // Where the widest page starts: the dots sit just before it.
  const area = Math.max(0, ...pages.map(page => span(page, gap)))
  // A new page slides in from the right edge.
  const into = sim.ms % PAGE_MS
  const offset = pages.length > 1 && into < SLIDE_MS ? Math.round(area * (1 - easeOut(into / SLIDE_MS))) : 0
  // The page showing, if the plan has pages at all.
  for (const page of pages.slice(index, index + 1)) {
    placed.push(...place([], page, w, gap).map(({ panel, x }) => ({ panel, x: x + offset })))
  }

  const dots = pages.length > 1 && plan.isCounted ? { x: w - 1 - area - 1 - pages.length, w: pages.length } : null

  const grid = emptyGrid(w)
  const spans = placed.map(({ panel, x }) => ({ x, w: panelWidth(panel) }))
  drawStars(grid, sim, w, clearance(dots === null ? spans : [...spans, dots]))
  if (dots !== null) {
    pages.forEach((_, i) => {
      put(grid, dots.x + i, 1, i === index ? '●' : '○', i === index ? ACCENT : 'inactive', i === index)
    })
  }
  for (const { panel, x } of placed) drawPanel(grid, x, panel, sim.ms)

  return grid
}

const Cockpit: ClientModule<Props, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  let state = surface.state
  if (state === undefined) {
    const sim = createSim(props)
    state = { sim, ms: 0 }
    surface.every(FRAME_MS, () => {
      sim.elapsed += FRAME_MS
      if (isCalm(sim) && sim.elapsed % (CALM_EVERY * FRAME_MS) !== 0) return
      step(sim)
      surface.setState({ sim, ms: sim.ms })
    })
    // Stryker disable next-line CallExpression: unseen in a drawing; without it a draw before the first frame starts a second sky, the same, and the work doubles
    surface.setState(state)
  }

  const { sim } = state
  if (props.line.updatedAt !== sim.props.line.updatedAt) sim.syncMs = sim.ms
  sim.props = props
  sim.columns = surface.columns
  const w = surface.columns
  if (w <= 0) return <Box height={ROWS} />

  return (
    <Box flexDirection="column">
      {draw(sim, w).map(cells => {
        const runs: Cell[] = []
        for (const cell of cells) {
          // A blank cell carries no style, so it joins any neighbouring blank.
          // Stryker disable next-line BooleanLiteral: a blank cell shows nothing, whatever its weight or fading
          const styled = cell.ch === ' ' ? { ...cell, color: undefined, bold: false, dim: false } : cell
          const last = runs[runs.length - 1]
          if (last && last.color === styled.color && last.bold === styled.bold && last.dim === styled.dim) {
            last.ch += styled.ch
          } else {
            runs.push({ ...styled })
          }
        }
        return (
          <Text wrap="truncate-end">
            {runs.map(run => (
              <Text color={run.color} weight={run.bold ? 'bold' : undefined} dimColor={run.dim}>
                {run.ch}
              </Text>
            ))}
          </Text>
        )
      })}
    </Box>
  )
}

export default Cockpit
