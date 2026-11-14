// Text helpers shared by the summary and the drawing. Lengths count code
// points, as the terminal lays out the box-drawing and mark glyphs used here.

export function length(text: string): number {
  return Array.from(text).length
}

export function flatten(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function clip(text: string, n: number): string {
  const flat = flatten(text)
  const chars = Array.from(flat)

  return chars.length <= n ? flat : `${chars.slice(0, Math.max(1, n - 1)).join('')}…`
}

// Head and tail of a long text: the question that ends an answer survives.
export function squeeze(text: string, n: number): string {
  const chars = Array.from(flatten(text))
  if (chars.length <= n) return chars.join('')
  const half = Math.floor(n / 2)

  return `${chars.slice(0, half).join('')} … ${chars.slice(-half).join('')}`
}

export function wrap(text: string, n: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of flatten(text).split(' ')) {
    const joined = line === '' ? word : `${line} ${word}`
    if (length(joined) <= n) {
      line = joined
      continue
    }
    if (line !== '') lines.push(line)
    // A word longer than the line is cut; clip leaves a shorter one whole.
    line = clip(word, n)
  }
  if (line !== '') lines.push(line)

  return lines
}

// A count and its noun, singular up to one as French has it: « 0 perdu ».
export function plural(n: number, noun: string): string {
  return `${n} ${n > 1 ? `${noun}s` : noun}`
}

export function basename(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}
