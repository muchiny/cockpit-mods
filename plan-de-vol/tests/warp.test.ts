import { expect, test } from 'claude-code/testing'

import Warp from '../hooks/warp'
import { rows, runs, surface } from './surface'
import type { Props } from './surface'

const IDLE: Props = { mode: 'idle', missions: 1, glass: null }

test('the first frame starts the clock and draws the badge over the stars', () => {
  const s = surface(60)
  const tree = Warp(IDLE, s.held)

  expect(s.frames.length).toBe(1)
  expect(s.states.length).toBe(1)
  const lines = rows(tree)
  expect(lines.length).toBe(3)
  expect(lines.every(line => Array.from(line).length === 60)).toBe(true)
  expect(lines[0]).toContain('PLAN DE VOL')
  expect(lines[1]).toContain('EN ORBITE  ·  1 contrat')
  expect(lines[1]).not.toContain('contrats')

  // Drawn again with its state: no second clock.
  const again = surface(60, s.states[0])
  Warp({ ...IDLE, missions: 3 }, again.held)
  expect(again.frames.length).toBe(0)
})

test('in warp the stars streak and every frame is drawn; at rest one in four', () => {
  const s = surface(60)
  Warp({ mode: 'warp', missions: 2, glass: null }, s.held)
  const [frame] = s.frames
  if (frame === undefined) throw new Error('no frame clock')
  for (let i = 0; i < 40; i++) frame()
  expect(s.states.length).toBe(41)

  const state = s.states[s.states.length - 1]
  const streaking = rows(Warp({ mode: 'warp', missions: 2, glass: null }, surface(60, state).held))
  expect(streaking[1]).toContain('QUANTUM »')
  expect(streaking[1]).toContain('2 contrats')
  expect(streaking.join('')).toMatch(/━|─/)

  // Back at rest: the warp fades, then only one frame in four is drawn.
  const rest = surface(60, state)
  Warp(IDLE, rest.held)
  for (let i = 0; i < 200; i++) frame()
  const before = s.states.length
  for (let i = 0; i < 40; i++) frame()
  expect(s.states.length - before).toBe(10)
  const calm = rows(Warp(IDLE, surface(60, s.states[s.states.length - 1]).held)).join('')
  expect(calm).toMatch(/[·•*+]/)
})

test('waiting, every frame is drawn, even with the warp faded: the frame blinks', () => {
  const s = surface(60)
  Warp({ mode: 'waiting', missions: 1, glass: null }, s.held)
  const [frame] = s.frames
  if (frame === undefined) throw new Error('no frame clock')
  for (let i = 0; i < 40; i++) frame()
  expect(s.states.length).toBe(41)
})

test('waiting, the badge says so and its frame blinks', () => {
  const s = surface(60)
  Warp({ mode: 'waiting', missions: 1, glass: null }, s.held)
  const [frame] = s.frames
  if (frame === undefined) throw new Error('no frame clock')
  const colors = new Set<unknown>()
  for (let i = 0; i < 10; i++) {
    frame()
    const drawn = Warp({ mode: 'waiting', missions: 1, glass: null }, surface(60, s.states[s.states.length - 1]).held)
    expect(rows(drawn)[1]).toContain('ATTENTE ATC')
    for (const run of runs(drawn)) if (run.text.startsWith('╭')) colors.add(run.color)
  }
  expect([...colors].sort()).toEqual(['suggestion', 'warning'])
})

test('the badge sits on the glass; a surface with no width draws an empty band', () => {
  const tree = Warp({ ...IDLE, glass: '#123456' }, surface(60).held)
  // Words and the spaces between them alike: the panel is one piece of glass.
  expect(runs(tree).some(run => run.text === 'PLAN' && run.bg === '#123456')).toBe(true)
  expect(runs(tree).filter(run => run.bg === '#123456').map(run => run.text).join('')).toContain('PLAN DE VOL')

  const none = Warp(IDLE, surface(0).held) as { type: unknown; props: { height?: unknown } }
  expect(none.props.height).toBe(3)
})
