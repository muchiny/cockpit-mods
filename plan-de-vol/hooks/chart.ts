import type { Color, ThemeKey } from 'claude-code'

import type { Live, Look, Mission, Squadron, StepKind } from '../types'
import { isSilent } from './fleet'
import { rawActions } from './summary'
import { clip, length, plural, wrap } from './text'

// The drawing as rows of styled segments: a route of stations (one per
// prompt), then the chosen mission's flowchart, one card per step.
// The pane is transparent: every block of text sits on a glass fill of its
// own so it reads over any wallpaper; the gaps show the console. The text is
// in theme keys and the fills follow the theme's lightness, so the two keep
// their contrast in a dark theme and a light one alike; where the theme's
// lightness is unknown (auto, a custom theme) there is no glass at all, the
// text on the console's own background, which that theme was made for.
// The fills are grays of the 256-color ramp: a path that draws 256 colors (a
// background session's viewer) turns a dark tint into a saturated color of
// the cube (#0e121b into navy), a gray stays itself. A card's kind is in its
// border and glyph, which are theme keys.

export const ACCENT: ThemeKey = 'suggestion'

export type Seg = { text: string; color?: Color; bg?: Color; bold?: boolean; dim?: boolean; italic?: boolean }
export type Row = Seg[]

export type Palette = Record<StepKind | 'glass' | 'live' | 'alert' | 'pending' | 'fleet', Color | undefined>

const DARK: Palette = {
  glass: '#121212',
  done: '#1c1c1c',
  decision: '#1c1c1c',
  fail: '#1c1c1c',
  fix: '#1c1c1c',
  live: '#262626',
  alert: '#262626',
  pending: '#121212',
  fleet: '#1c1c1c',
}

const LIGHT: Palette = {
  glass: '#eeeeee',
  done: '#e4e4e4',
  decision: '#e4e4e4',
  fail: '#e4e4e4',
  fix: '#e4e4e4',
  live: '#dadada',
  alert: '#dadada',
  pending: '#eeeeee',
  fleet: '#e4e4e4',
}

const PLAIN: Palette = {
  glass: undefined,
  done: undefined,
  decision: undefined,
  fail: undefined,
  fix: undefined,
  live: undefined,
  alert: undefined,
  pending: undefined,
  fleet: undefined,
}

const PALETTES: Record<Look, Palette> = { dark: DARK, light: LIGHT, plain: PLAIN }

export function palette(look: Look): Palette {
  return PALETTES[look]
}

type Border = { tl: string; tr: string; bl: string; br: string; h: string; v: string; tee: string }
type Card = { border: Border; color: ThemeKey; fill: Color | undefined; title?: string; lines: Row[]; kind?: StepKind }

const ROUND: Border = { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│', tee: '┬' }
const DECISION: Border = { tl: '◇', tr: '◇', bl: '◇', br: '◇', h: '─', v: '│', tee: '┬' }
const LIVE: Border = { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║', tee: '╤' }
const PENDING: Border = { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '┄', v: '┆', tee: '┬' }
const ALERT: Border = { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃', tee: '┯' }

const SYMBOL: Record<StepKind, string> = { done: '✓', decision: '◆', fail: '✗', fix: '↺' }
const COLOR: Record<StepKind, ThemeKey> = { done: 'success', decision: ACCENT, fail: 'error', fix: 'warning' }
const BORDER: Record<StepKind, Border> = { done: ROUND, decision: DECISION, fail: ROUND, fix: ROUND }

// Columns each station takes on the route: its mark and the track after it.
export const STATION = 6
export const MARGIN = 2
// Cells kept right of the cards for the fail → fix loop.
const GUTTER = 4
const CARD_MAX = 72
// Rows of drone marks a fleet card shows before it says how many more.
const GRID_ROWS = 3
// Raw actions a journal card lists.
const RAW_SHOWN = 4

function width(row: Row): number {
  return row.reduce((n, seg) => n + length(seg.text), 0)
}

// Segments one after another, `gap` between them, a new row where the next
// one does not fit in `n` (and one too long cut to it).
function flow(parts: readonly Seg[], n: number, gap: string): Row[] {
  const out: Row[] = []
  for (const part of parts) {
    const row = out[out.length - 1]
    const fitted = { ...part, text: clip(part.text, n) }
    if (row !== undefined && width(row) + length(gap) + length(fitted.text) <= n) row.push({ text: gap }, fitted)
    else out.push([fitted])
  }

  return out
}

function padTo(row: Row, n: number): Row {
  const used = width(row)
  return used >= n ? row : [...row, { text: ' '.repeat(n - used) }]
}

// The row laid on glass: every segment takes `bg` (none has a fill of its own).
function onGlass(row: Row, bg: Color | undefined): Row {
  return row.map(seg => ({ ...seg, bg }))
}

// A strip of glass across the pane, after the left margin.
function glassRow(row: Row, w: number, glass: Color | undefined): Row {
  return [{ text: ' '.repeat(MARGIN) }, ...onGlass(padTo([{ text: ' ' }, ...row], w - MARGIN), glass)]
}

// What the person is waited for on the newest mission: the question asked
// now, else, while no turn runs, what the last summary said.
export function waitingOf(newest: Mission | undefined, l: Live): string | null {
  return l.question ?? (l.isWorking ? null : (newest?.waiting ?? null))
}

// A mission's number on the route: its id, so it keeps it when older
// missions are dropped.
export function stationName(mission: Mission): string {
  return `P${mission.id + 1}`
}

export function missionName(mission: Mission): string {
  return mission.title ?? `« ${clip(mission.prompt, 40)} »`
}

// A mark, then the text wrapped beside it, continuation lines under the text.
function para(mark: Seg, text: string, n: number, style: Omit<Seg, 'text'>): Row[] {
  const pad = ' '.repeat(length(mark.text))
  return wrap(text, Math.max(4, n - length(mark.text))).map((line, i) => [
    i === 0 ? mark : { text: pad },
    { ...style, text: line },
  ])
}

// A card's rows, its arrow to the next one under it.
function cardRows(card: Card, cw: number, hasNext: boolean): Row[] {
  const { border: b, color, fill } = card
  const inner = cw - 4
  const left: Seg = { text: ' '.repeat(MARGIN) }
  // The title cut to the top border: its corners, `─ ` and a space around it.
  const name = card.title === undefined ? '' : clip(card.title, cw - 5)
  const title = name ? `${b.h} ${name} ` : ''
  const top: Row = [
    { text: b.tl + (name ? `${b.h} ` : ''), color },
    ...(name ? [{ text: name, color, bold: true }, { text: ' ', color }] : []),
    { text: b.h.repeat(Math.max(0, cw - 2 - length(title))) + b.tr, color },
  ]
  const body = card.lines.map((line): Row => [{ text: `${b.v} `, color }, ...padTo(line, inner), { text: ` ${b.v}`, color }])
  const mid = Math.floor((cw - 2) / 2)
  const bottom: Row = [
    { text: b.bl + b.h.repeat(mid) + (hasNext ? b.tee : b.h) + b.h.repeat(cw - 3 - mid) + b.br, color },
  ]
  const arrow: Row[] = hasNext ? [[{ text: ' '.repeat(MARGIN + 1 + mid) }, { text: '▼', color: ACCENT, bold: true }]] : []
  const framed = [top, ...body, bottom].map(row => [left, ...onGlass(row, fill)])

  return [...framed, ...arrow]
}

function stepCard(step: Mission['steps'][number], inner: number, pal: Palette): Card {
  return {
    border: BORDER[step.kind],
    color: COLOR[step.kind],
    fill: pal[step.kind],
    kind: step.kind,
    lines: [
      ...para({ text: `${SYMBOL[step.kind]} `, color: COLOR[step.kind], bold: true }, step.what, inner, { color: 'text', bold: true }),
      // No why, no row: an empty text wraps to none.
      ...para({ text: '  ' }, step.why, inner, { color: 'text' }),
    ],
  }
}

// A workflow run or a mission's agents: counts, one mark per drone (enough
// for an ultracode fleet of dozens), then the drones still flying.
function fleetCard(squadron: Squadron, inner: number, pal: Palette, now: number): Card {
  const silent = squadron.drones.filter(d => isSilent(d, now)).length
  const flying = squadron.drones.filter(d => d.status === 'running' && !isSilent(d, now))
  const back = squadron.drones.filter(d => d.status === 'done').length
  const lost = squadron.drones.filter(d => d.status === 'failed').length
  const counts = flow(
    [
      { text: `⟳ ${flying.length} en vol`, color: flying.length > 0 ? ACCENT : 'subtle', bold: true },
      { text: `✓ ${back} au hangar`, color: 'success', bold: true },
      ...(lost > 0 ? [{ text: `✗ ${plural(lost, 'perdu')}`, color: 'error' as const, bold: true }] : []),
      ...(silent > 0 ? [{ text: `◌ ${silent} en silence radio`, color: 'text' as const }] : []),
    ],
    inner,
    '   ',
  )
  const marks = squadron.drones.map((d): Seg =>
    isSilent(d, now)
      ? { text: '◌ ', color: 'text' }
      : d.status === 'running'
        ? { text: '◈ ', color: ACCENT, bold: true }
        : d.status === 'failed'
          ? { text: '✗ ', color: 'error', bold: true }
          : { text: '● ', color: 'success', bold: true },
  )
  const perRow = Math.max(1, Math.floor(inner / 2))
  const grid: Row[] = []
  for (let i = 0; i < marks.length && grid.length < GRID_ROWS; i += perRow) grid.push(marks.slice(i, i + perRow))
  const unseen = marks.length - GRID_ROWS * perRow
  if (unseen > 0) grid.push([{ text: `+ ${plural(unseen, 'drone')}`, color: 'text' }])
  const live = flying.slice(-3).map((d): Row => [
    { text: '⟳ ', color: ACCENT, bold: true },
    { text: clip(d.action ? `${d.label} · ${d.action}` : d.label, inner - 2), color: 'text' },
  ])

  return {
    border: flying.length > 0 ? LIVE : ROUND,
    color: 'merged',
    fill: pal.fleet,
    title: `ESCADRILLE · ${clip(squadron.name, Math.max(4, inner - 16))}`,
    lines: [...counts, ...grid, ...live],
  }
}

function cards(args: FlowchartArgs, inner: number, pal: Palette): Card[] {
  const { mission, isLast, live: l, squadrons, now } = args
  const list = [...mission.steps.map(step => stepCard(step, inner, pal)), ...squadrons.map(s => fleetCard(s, inner, pal, now))]

  // What the steps do not cover yet: on every mission, so one Haiku has not
  // reached (a summary failed, the pane was closed) still shows its work.
  const raw = rawActions(mission)
  const isSummarizing = l.summarizing.includes(mission.id)
  if (raw.length > 0 || isSummarizing) {
    list.push({
      border: PENDING,
      color: 'subtle',
      fill: pal.pending,
      title: isSummarizing ? 'DÉBRIEFING' : 'JOURNAL',
      lines: [
        ...(raw.length > RAW_SHOWN ? [[{ text: `┄ ${plural(raw.length - RAW_SHOWN, 'action')} plus tôt`, color: 'text' as const }]] : []),
        ...raw.slice(-RAW_SHOWN).map((action): Row => [{ text: `· ${clip(action, inner - 2)}`, color: 'text' }]),
      ],
    })
  }
  if (!isLast) return list
  // A question waits on the person even while the turn runs (AskUserQuestion):
  // what is asked of them comes first.
  const waiting = waitingOf(mission, l)
  if (waiting !== null) {
    list.push({
      border: ALERT,
      color: 'warning',
      fill: pal.alert,
      title: 'À VOUS',
      lines: para({ text: '◆ ', color: 'warning', bold: true }, waiting, inner, { color: 'text', bold: true }),
    })
  } else if (l.isWorking) {
    list.push({
      border: LIVE,
      color: ACCENT,
      fill: pal.live,
      title: 'MANŒUVRE',
      lines: para({ text: '⟳ ', color: ACCENT, bold: true }, l.action ?? 'Réfléchit', inner, { color: 'text', bold: true }),
    })
  }

  return list
}

export type FlowchartArgs = {
  mission: Mission
  isLast: boolean
  live: Live
  look: Look
  squadrons: readonly Squadron[]
  // The clock now: a drone silent past STALE_MS is drawn as such.
  now: number
  columns: number
  // Rows the flowchart may take: the cards that fit, the older ones folded.
  rows: number
}

// The chosen mission's flowchart: cards joined by arrows, and a loop from
// each fix back to the failure it answers.
export function flowchart(args: FlowchartArgs): Row[] {
  const { columns: w, rows } = args
  const pal = palette(args.look)
  const hasGutter = w >= 40
  const cw = Math.max(16, Math.min(w - MARGIN - (hasGutter ? GUTTER : 0), CARD_MAX))
  const all = cards(args, cw - 4, pal)
  if (all.length === 0) return [glassRow([{ text: clip('en attente du décollage…', w - MARGIN - 1), color: 'text', italic: true }], w, pal.glass)]

  // From the newest back, each card that fits in `rows` with the ones after
  // it and the fold line above them (when cards or steps are left out); the
  // newest one always, what is going on now.
  const drawn = all.map((card, i) => ({ card, rows: cardRows(card, cw, i < all.length - 1) }))
  let first = drawn.length
  let used = 0
  for (const { rows: block } of [...drawn].reverse()) {
    const fold = first > 1 || args.mission.earlier > 0 ? 1 : 0
    if (first < drawn.length && used + block.length + fold > rows) break
    used += block.length
    first -= 1
  }
  const out: Row[] = []
  // The cards that do not fit, and the steps the mission no longer keeps.
  const above = first + args.mission.earlier
  if (above > 0) {
    out.push(glassRow([{ text: `┆ ${plural(above, 'étape')} plus haut`, color: 'text', italic: true }], MARGIN + cw, pal.glass))
  }

  // Each fix right after a failure: the rows of their first lines, under
  // their top borders, where the loop meets them.
  const loops: [number, number][] = []
  let before: { kind?: StepKind; at: number } | null = null
  for (const { card, rows: block } of drawn.slice(first)) {
    const at = out.length + 1
    if (card.kind === 'fix' && before?.kind === 'fail') loops.push([before.at, at])
    before = { kind: card.kind, at }
    out.push(...block)
  }

  if (!hasGutter) return out
  // The loop's glyph on each row it passes, past the cards' right edge.
  const loop = new Map<number, string>()
  for (const [from, to] of loops) {
    loop.set(from, ' ◀─╮')
    loop.set(to, ' ──╯')
    for (let r = from + 1; r < to; r++) loop.set(r, r === Math.floor((from + to) / 2) ? '   ↺' : '   │')
  }
  const edge = MARGIN + cw

  return out.map((row, r) => {
    const glyph = loop.get(r)
    return glyph === undefined ? row : [...padTo(row, edge), { text: glyph, color: 'warning', bold: true }]
  })
}

// `id`: the mission's, which the view keeps; `label` its number.
export type Station = { id: number; label: string; isChosen: boolean }

// The route: one station per prompt, the newest on the right, the window
// slid so the chosen one (an index in `missions`) stays in sight; a fold (┄)
// on the side where stations are out of it.
export function route(missions: readonly Mission[], chosen: number, l: Live, look: Look, w: number): { track: Row; stations: Station[] } {
  const fit = Math.max(1, Math.floor((w - MARGIN - 3) / STATION))
  const last = missions.length - 1
  const end = Math.min(last, Math.max(chosen + 1, fit - 1))
  const start = Math.max(0, Math.min(end - fit + 1, chosen))
  const stations: Station[] = []
  const track: Row = [{ text: start > 0 ? '┄' : ' ', color: 'text' }]

  missions.slice(start, end + 1).forEach((mission, k) => {
    const i = start + k
    const isLive = i === last
    const isWaiting = isLive && waitingOf(mission, l) !== null
    const color: ThemeKey = isWaiting ? 'warning' : isLive && l.isWorking ? ACCENT : 'success'
    track.push({ text: i === chosen ? '◉' : isWaiting ? '◆' : '●', color, bold: true })
    if (i < end) track.push({ text: '━'.repeat(STATION - 1), color: 'success', bold: true })
    else if (isLive && l.isWorking) track.push({ text: '╍╍▸', color: ACCENT, bold: true })
    else if (!isLive) track.push({ text: ' ┄', color: 'text' })
    stations.push({ id: mission.id, label: stationName(mission), isChosen: i === chosen })
  })

  return { track: glassRow(track, w, palette(look).glass), stations }
}

export function band(mission: Mission, isLive: boolean, look: Look, w: number): Row[] {
  const tag = isLive ? '' : ' archive '
  const station = stationName(mission)
  const text = ` ${station} · ${clip(missionName(mission), w - MARGIN - length(tag) - length(station) - 5)} `
  const fill = Math.max(0, w - MARGIN - length(text) - length(tag))
  const head: Row = [
    { text: ' '.repeat(MARGIN) },
    { text: text + ' '.repeat(fill), color: 'inverseText', bg: isLive ? ACCENT : 'subtle', bold: true },
    ...(tag ? [{ text: tag, color: 'inverseText' as const, bg: 'warning' as const, bold: true }] : []),
  ]
  const glass = palette(look).glass
  const all = wrap(`« ${mission.prompt} »`, w - MARGIN - 3)
  const quote = all.slice(0, 2).map((line, i): Row =>
    glassRow([{ text: i === 1 && all.length > 2 ? clip(`${line} …`, w - MARGIN - 3) : line, color: 'text', italic: true }], w, glass),
  )

  return [head, ...quote]
}

export function objectiveRow(objective: string | null, hasMissions: boolean, look: Look, w: number): Row {
  return glassRow(
    [
      { text: 'OBJECTIF ▸ ', color: ACCENT, bold: true },
      objective === null
        ? { text: hasMissions ? 'calcul de trajectoire…' : '—', color: 'text', italic: true }
        : { text: clip(objective, w - MARGIN - 13), color: 'text', bold: true },
    ],
    w,
    palette(look).glass,
  )
}
