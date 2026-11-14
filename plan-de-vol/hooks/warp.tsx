import type { ClientModule, ThemeKey } from 'claude-code'

// The pane's header: the status-band starfield, warping while Claude works,
// behind one centred panel. The stars paint no background and take theme
// keys, as in status-band's cockpit; the panel sits on the palette's glass.
// The starfield is adapted from status-band's, not imported: a mod loads only
// its own files, and the two mods load (and fail) independently.

type Mode = 'warp' | 'idle' | 'waiting'

// glass: the badge's fill, chart.ts's palette for the person's theme; null
// where the theme gives none (the badge then sits on the console).
type Props = { mode: Mode; missions: number; glass: string | null }

// One depth of the field: how fast it drifts and streaks, how it is drawn.
type Layer = { drift: number; warp: number; trail: number; color: ThemeKey; dot: string; streak: string; isNear: boolean }

type Star = { x: number; y: number; layer: Layer; phase: number }

type Sim = { props: Props; columns: number; stars: Star[]; tick: number; warp: number }

type State = { sim: Sim; tick: number }

type Cell = { ch: string; color: ThemeKey | undefined; bold: boolean; dim: boolean; bg: string | undefined }

const ACCENT: ThemeKey = 'suggestion'
const ROWS = 3
const FRAME_MS = 80
// At rest (idle, the warp faded) a frame in this many is drawn: the stars
// drift and twinkle slowly enough, and the pane costs the terminal little.
const CALM_EVERY = 4
const STAR_COUNT = 30
const FAR: Layer = { drift: 0.03, warp: 0.7, trail: 1, color: 'inactive', dot: '·', streak: '─', isNear: false }
const MID: Layer = { drift: 0.08, warp: 1.6, trail: 3, color: 'subtle', dot: '•', streak: '─', isNear: false }
const NEAR: Layer = { drift: 0.2, warp: 3.2, trail: 7, color: 'text', dot: '*', streak: '━', isNear: true }

function random(seed: number): () => number {
  let a = seed
  return () => {
    // Wrapped to 32 bits, as every operation below reads it.
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function length(text: string): number {
  return Array.from(text).length
}

function pickLayer(r: number): Layer {
  return r < 1 / 3 ? FAR : r < 2 / 3 ? MID : NEAR
}

function createSim(props: Props): Sim {
  const rand = random(7)
  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: rand(),
    y: Math.floor(rand() * ROWS),
    layer: pickLayer(rand()),
    phase: Math.floor(rand() * 40),
  }))

  return { props, columns: 0, stars, tick: 0, warp: 0 }
}

function step(sim: Sim): void {
  const w = Math.max(sim.columns, 1)
  sim.tick += 1
  sim.warp += ((sim.props.mode === 'warp' ? 1 : 0) - sim.warp) * 0.12
  for (const star of sim.stars) {
    star.x -= lerp(star.layer.drift, star.layer.warp, sim.warp) / w
    if (star.x < 0) star.x += 1
  }
}

function put(grid: Cell[][], x: number, y: number, ch: string, color: ThemeKey | undefined, bold: boolean, dim = false, bg?: string): void {
  const cell = grid[y]?.[x]
  if (!cell) return
  cell.ch = ch
  cell.color = color
  cell.bold = bold
  cell.dim = dim
  cell.bg = bg
}

function write(grid: Cell[][], x: number, y: number, text: string, color: ThemeKey | undefined, bold: boolean, bg?: string): void {
  Array.from(text).forEach((ch, i) => {
    put(grid, x + i, y, ch, color, bold, false, bg)
  })
}

function drawStars(grid: Cell[][], sim: Sim, w: number): void {
  for (const star of sim.stars) {
    const x = Math.floor(star.x * w)
    const { color, isNear } = star.layer
    const trail = Math.round(star.layer.trail * sim.warp)
    for (let i = trail; i >= 1; i--) {
      const isFar = i > trail / 2
      put(grid, x + i, star.y, isFar ? '╌' : '─', color, false, isFar)
    }
    const isTwinkling = (sim.tick + star.phase) % 40 < 4
    if (sim.warp > 0.5) {
      put(grid, x, star.y, star.layer.streak, color, isNear)
    } else if (isTwinkling && star.layer !== FAR) {
      put(grid, x, star.y, '+', ACCENT, true)
    } else {
      put(grid, x, star.y, star.layer.dot, color, isNear, star.layer === FAR)
    }
  }
}

function drawBadge(grid: Cell[][], sim: Sim, w: number): void {
  const { mode, missions } = sim.props
  const glass = sim.props.glass ?? undefined
  const chevrons = '»'.repeat(1 + (Math.floor(sim.tick / 2) % 3)).padEnd(3)
  const status =
    mode === 'warp' ? `QUANTUM ${chevrons}` : mode === 'waiting' ? 'ATTENTE ATC' : 'EN ORBITE'
  const title = 'PLAN DE VOL'
  const room = (text: string) => Math.max(length(text), length(title) + 2) + 2
  // Too narrow for the count: the status alone.
  const full = `${status}  ·  ${missions} contrat${missions > 1 ? 's' : ''}`
  const body = room(full) + 2 <= w ? full : status
  const inner = room(body)
  const bw = inner + 2
  const x = Math.max(0, Math.floor((w - bw) / 2))
  const blink = mode === 'waiting' && sim.tick % 10 < 5
  const frame: ThemeKey = blink ? 'warning' : ACCENT

  write(grid, x, 0, '╭─ ', frame, false, glass)
  write(grid, x + 3, 0, title, 'text', true, glass)
  write(grid, x + 3 + length(title), 0, ` ${'─'.repeat(bw - 5 - length(title))}╮`, frame, false, glass)
  put(grid, x, 1, '│', frame, false, false, glass)
  write(grid, x + 1, 1, ' '.repeat(inner), undefined, false, glass)
  put(grid, x + bw - 1, 1, '│', frame, false, false, glass)
  write(grid, x, 2, `╰${'─'.repeat(bw - 2)}╯`, frame, false, glass)
  const color: ThemeKey = mode === 'warp' ? ACCENT : mode === 'waiting' ? 'warning' : 'inactive'
  write(grid, x + 2, 1, status, color, true, glass)
  write(grid, x + 2 + length(status), 1, body.slice(status.length), 'text', false, glass)
}

const Warp: ClientModule<Props, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  let state = surface.state
  if (state === undefined) {
    const sim = createSim(props)
    state = { sim, tick: 0 }
    surface.every(FRAME_MS, () => {
      step(sim)
      const isCalm = sim.props.mode === 'idle' && sim.warp < 0.01
      if (!isCalm || sim.tick % CALM_EVERY === 0) surface.setState({ sim, tick: sim.tick })
    })
    surface.setState(state)
  }

  const { sim } = state
  sim.props = props
  sim.columns = surface.columns
  const w = surface.columns
  if (w <= 0) return <Box height={ROWS} />

  const grid: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: w }, () => ({ ch: ' ', color: undefined, bold: false, dim: false, bg: undefined })),
  )
  drawStars(grid, sim, w)
  drawBadge(grid, sim, w)

  return (
    <Box flexDirection="column">
      {grid.map(row => {
        const runs: Cell[] = []
        for (const cell of row) {
          const styled = cell.ch === ' ' ? { ...cell, color: undefined, bold: false, dim: false } : cell
          const last = runs[runs.length - 1]
          const isSame = last && last.color === styled.color && last.bold === styled.bold && last.dim === styled.dim
          if (last && isSame && last.bg === styled.bg) {
            last.ch += styled.ch
          } else {
            runs.push({ ...styled })
          }
        }
        return (
          <Text wrap="truncate-end">
            {runs.map(run => (
              <Text color={run.color} backgroundColor={run.bg} weight={run.bold ? 'semibold' : undefined} dimColor={run.dim}>
                {run.ch}
              </Text>
            ))}
          </Text>
        )
      })}
    </Box>
  )
}

export default Warp
