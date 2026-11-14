import type { RenderElement } from 'claude-code'

import type Warp from '../hooks/warp'

// The warp header as a module: drawn with a surface the test holds, its
// frames run by hand.

type Surface = Parameters<typeof Warp>[1]
export type Props = Parameters<typeof Warp>[0]
type State = NonNullable<Surface['state']>

export function surface(columns: number, state?: State) {
  const frames: (() => void)[] = []
  const states: State[] = []
  const held = {
    elements: { Box: 'Box', Text: 'Text' },
    state,
    setState: (next: State) => void states.push(next),
    columns,
    rows: 3,
    every: (_: number, fn: () => void) => {
      frames.push(fn)
      return () => undefined
    },
    onPointer: () => () => undefined,
    onKey: () => () => undefined,
    post: () => undefined,
  }

  return { held: held as unknown as Surface, frames, states }
}

type Node = { type?: unknown; props?: Record<string, unknown>; children?: unknown[] }

function kids(el: unknown): unknown[] {
  return typeof el === 'object' && el !== null ? ((el as Node).children ?? []).flat(Infinity) : []
}

const flat = (el: unknown): string => (typeof el === 'string' ? el : kids(el).map(flat).join(''))

// Every piece of text the tree holds, row by row.
export function rows(tree: RenderElement): string[] {
  return kids(tree).map(flat)
}

// The tree as the lines it draws: a column Box stacks its children, any
// other element is one line.
export function lines(el: unknown): string[] {
  const node = el as Node
  return typeof el === 'object' && el !== null && node.type === 'Box' && node.props?.flexDirection === 'column' ? kids(el).flatMap(lines) : [flat(el)]
}

export type Run = { text: string; color: unknown; bg: unknown; weight: unknown; dim: unknown }

// Every styled run of an element: a Text holding only text.
export function runs(tree: unknown): Run[] {
  const out: Run[] = []
  const walk = (el: unknown): void => {
    const list = kids(el)
    const props = (el as Node).props ?? {}
    if (list.length > 0 && list.every(c => typeof c === 'string')) {
      out.push({ text: list.join(''), color: props.color, bg: props.backgroundColor, weight: props.weight, dim: props.dimColor })
    } else list.forEach(walk)
  }
  walk(tree)

  return out
}

// The styled runs of each row of the tree.
export function rowRuns(tree: RenderElement): Run[][] {
  return kids(tree).map(runs)
}
