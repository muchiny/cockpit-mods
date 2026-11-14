import type { Fleet, Live, Mission, Plan, Squadron, Step, StepKind } from '../types'
import { missionName, stationName, waitingOf } from './chart'
import { tally } from './fleet'
import { freshLines, object } from './summary'
import { flatten, plural } from './text'

// What the plan leaves outside the session: its copy in the store, which a
// resume starts from instead of the transcript, and the Markdown logbook
// `/plan-de-vol export` writes.

// The store key of a session's copy. The tag changes with Saved's fields: a
// copy under another tag is never read.
const SAVED = 'plan-1:'
// Copies the store keeps, the newest saved: it holds 4 MiB in all, every
// session's copy together.
export const SAVED_MAX = 12
// JSON characters the missions of one copy may take; past it the oldest
// missions leave, as they leave the plan itself.
export const SAVED_CHARS_MAX = 100_000
// Journal lines the logbook shows of a mission the steps do not cover yet.
export const RAW_MAX = 30

const KIND: Record<StepKind, string> = { done: 'Fait', decision: 'Décision', fail: 'Échec', fix: 'Correction' }
const KINDS: readonly unknown[] = Object.keys(KIND)

// A plan as the store keeps it: when it was saved, and what a resume needs
// of it (the prompts waiting for their turn and the epoch end with the
// process).
export type Saved = { at: number; objective: string | null; missions: Mission[] }

export function savedKey(sessionId: string): string {
  return `${SAVED}${sessionId}`
}

export function isSavedKey(key: string): boolean {
  return key.startsWith(SAVED)
}

// The plan's copy: its newest missions, as many as the copy may hold; the
// newest always, whatever it weighs.
export function stowed(plan: Plan, at: number): Saved {
  let room = SAVED_CHARS_MAX
  const missions = [...plan.missions]
    .reverse()
    .filter((mission, i) => {
      room -= JSON.stringify(mission).length
      return i === 0 || room >= 0
    })
    .reverse()

  return { at, objective: plan.objective, missions }
}

function isText(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

function isTextOrNull(value: unknown): value is string | null {
  return value === null || isText(value)
}

function isStep(value: unknown): value is Step {
  const s = object(value)

  return KINDS.includes(s.kind) && isText(s.what) && isText(s.why)
}

function isMission(value: unknown): value is Mission {
  const m = object(value)

  return (
    [m.id, m.earlier, m.logged, m.summarized, m.attempted].every(isNumber) &&
    isText(m.prompt) &&
    isTextOrNull(m.title) &&
    isTextOrNull(m.waiting) &&
    Array.isArray(m.steps) &&
    m.steps.every(isStep) &&
    Array.isArray(m.journal) &&
    m.journal.every(isText)
  )
}

// What the store holds under a copy's key, or null: nothing, or a value
// this version did not write.
export function parseSaved(value: unknown): Saved | null {
  const s = object(value)
  if (!isNumber(s.at) || !isTextOrNull(s.objective) || !Array.isArray(s.missions) || !s.missions.every(isMission)) return null

  return { at: s.at, objective: s.objective, missions: s.missions }
}

// The copies past the newest SAVED_MAX, by their keys: the ones to delete.
export function stale(copies: readonly { key: string; at: number }[]): string[] {
  return [...copies]
    .sort((a, b) => b.at - a.at)
    .slice(SAVED_MAX)
    .map(copy => copy.key)
}

// The logbook's file name: the minute it is written and the session's id,
// shortened. `when` is `YYYY-MM-DD HH:MM`, whatever follows it.
export function exportName(when: string, sessionId: string): string {
  return `${when.slice(0, 16).replace(' ', '-').replace(':', '')}-${sessionId.slice(0, 8)}`
}

// Where the logbook is written: the path asked for (`~/` is the home, a
// relative one starts at the session's folder); else the plan-de-vol folder
// of the person's Claude Code directory, never the session's folder, which
// may be a repository; with no home known, the session's folder all the same.
export function exportPath(asked: string, home: string | undefined, cwd: string, name: string): string {
  if (asked === '') return home === undefined ? `${cwd}/plan-de-vol-${name}.md` : `${home}/.claude/plan-de-vol/${name}.md`
  if (asked.startsWith('~/') && home !== undefined) return `${home}${asked.slice(1)}`

  return asked.startsWith('/') ? asked : `${cwd}/${asked}`
}

function quote(text: string): string {
  return text
    .split('\n')
    .map(line => `> ${line}`.trimEnd())
    .join('\n')
}

function stepLine(step: Step): string {
  const why = flatten(step.why)

  return `- **${KIND[step.kind]}** : ${flatten(step.what)}${why === '' ? '' : ` — ${why}`}`
}

// The lines the steps do not cover yet, as the journal holds them: its newest.
function journal(lines: readonly string[]): string {
  const earlier = lines.length - RAW_MAX
  const shown = [...(earlier > 0 ? [`… ${plural(earlier, 'ligne')} plus tôt`] : []), ...lines.slice(-RAW_MAX)]

  return `**JOURNAL** (pas encore résumé, ${plural(lines.length, 'ligne')}) :\n\n\`\`\`text\n${shown.join('\n')}\n\`\`\``
}

function squadron(s: Squadron, now: number): string {
  const { flying, back, lost, silent } = tally(s, now)
  const counts = [
    `${flying.length} en vol`,
    `${back} au hangar`,
    ...(lost > 0 ? [plural(lost, 'perdu')] : []),
    ...(silent > 0 ? [`${silent} en silence radio`] : []),
  ]
  const drones = flying.map(d => `- en vol : ${flatten(d.label)}${d.action === null ? '' : ` (${flatten(d.action)})`}`)

  return [`**ESCADRILLE « ${flatten(s.name)} »** : ${counts.join(', ')}`, ...drones].join('\n')
}

export type Logbook = {
  plan: Plan
  live: Live
  fleet: Fleet
  // The clock now: a drone silent too long is said so.
  now: number
  // The local time, as written: `YYYY-MM-DD HH:MM`.
  when: string
  sessionId: string
  cwd: string
}

function chapter(mission: Mission, isNewest: boolean, { live, fleet, now }: Logbook): string {
  const fresh = freshLines(mission)
  const waiting = isNewest ? waitingOf(mission, live) : null

  return [
    `## ${stationName(mission)} · ${missionName(mission)}`,
    quote(mission.prompt),
    [...(mission.earlier > 0 ? [`- _Étapes plus anciennes, non gardées : ${mission.earlier}_`] : []), ...mission.steps.map(stepLine)].join('\n'),
    ...(fresh.length > 0 ? [journal(fresh)] : []),
    ...fleet.squadrons.filter(s => s.mission === mission.id && s.drones.length > 0).map(s => squadron(s, now)),
    // As the pane says it: the person waited for first, else the work under way.
    ...(waiting !== null ? [`**À VOUS** : ${flatten(waiting)}`] : isNewest && live.isWorking ? [`**MANŒUVRE** : ${flatten(live.action ?? 'Réfléchit')}`] : []),
  ]
    .filter(block => block !== '')
    .join('\n\n')
}

// The flight plan as a Markdown logbook that stands on its own, for a
// handover: the objective, then each mission with its contract (the
// person's prompt), its steps and their why, what the steps do not cover
// yet, its squadrons, and on the newest what the person is waited for.
export function markdown(book: Logbook): string {
  const { plan, when, sessionId, cwd } = book
  const last = plan.missions.length - 1

  return `${[
    `# Plan de vol — ${when}`,
    [`- Session : \`${sessionId}\``, `- Dossier : \`${cwd}\``, `- Contrats : ${plan.missions.length}`].join('\n'),
    '## OBJECTIF',
    plan.objective === null ? '_Trajectoire non calculée._' : flatten(plan.objective),
    ...plan.missions.map((mission, i) => chapter(mission, i === last, book)),
  ].join('\n\n')}\n`
}
