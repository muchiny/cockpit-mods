import type { SessionMessage } from 'claude-code'

import type { Mission, Pending, Plan, Step, StepKind } from '../types'
import { basename, clip, flatten, length, squeeze } from './text'

// From the work to the flight plan: the journal each mission keeps (Claude's
// words, each tool call, each failure), what Haiku reads of it, and what its
// JSON reply comes back as. The transcript itself is read only to seed the
// missions of a session the pane started on late.

// The kinds a step may name; any other is an action done.
const NAMED: readonly StepKind[] = ['decision', 'fail', 'fix']
// The engine's own blocks in a transcript row; a tag the person typed stays.
const ENGINE_TAGS = [
  'system-reminder',
  'command-name',
  'command-message',
  'command-args',
  'local-command-stdout',
  'local-command-stderr',
  'local-command-caveat',
  'task-notification',
  'user-prompt-submit-hook',
]
const ENGINE_BLOCK = new RegExp(`<(${ENGINE_TAGS.join('|')})\\b[^>]*>[\\s\\S]*?</\\1>`, 'g')
// Journal lines a mission keeps; the steps carry what came before.
export const JOURNAL_MAX = 150
// Steps a mission keeps; the ones before are counted, the fold says how many.
export const STEPS_MAX = 40
// What a prompt keeps of the person's words (a paste can be long): the band
// shows two lines of it, Haiku reads as much.
export const PROMPT_MAX = 600
// Earlier missions named to Haiku as context.
const PAST_MAX = 8
// Missions the plan keeps: the oldest leave, their numbers stay with the rest.
export const MISSIONS_MAX = 60
// What one log sent to Haiku may hold: its newest part.
const LOG_MAX = 12_000
const TOOL = '· '

const RULES = `Règles d'écriture, en français, lisible d'un coup d'œil :
- "what" : ce qui a été fait, 40 caractères maximum ; regroupe les actions semblables (« Lu 4 fichiers du mod »), ne liste jamais chaque outil ;
- "why" : la raison de l'action (« pour … », « car … ») ou, pour un test ou une vérification, ce qu'il a donné ; 50 caractères maximum ;
- "kind" : done = action menée, decision = choix fait (par Claude ou par la personne), fail = échec réel, fix = correction de cet échec ;
- "fail" seulement pour une ligne marquée ÉCHEC ou une erreur que Claude rapporte explicitement ; n'invente jamais d'échec ; un "fix" suit toujours le "fail" qu'il corrige ;
- "title" : ce que la personne voulait avec ce prompt, 35 caractères maximum ;
- "objective" : le but global de toute la session, 45 caractères maximum ; garde l'objectif connu sauf si le but a clairement changé ;
- "waiting" : ce que la personne doit faire maintenant (répondre, valider, tester…) si Claude attend quelque chose d'elle à la fin du journal, sinon null.
Réponds UNIQUEMENT par un objet JSON, sans texte autour ni bloc de code.`

export const SYSTEM_INCREMENT = `Tu tiens le « plan de vol » d'une session de travail entre une personne et Claude (assistant de code) : un logigramme court de ce qui a été fait et pourquoi.
On te donne une mission (un prompt de la personne), les étapes déjà tracées, et le journal de ce qui s'est passé depuis. Tu ajoutes seulement les étapes nouvelles.
Format : {"objective": string, "title": string, "steps": [{"kind": "done"|"decision"|"fail"|"fix", "what": string, "why": string}], "waiting": string|null}
"steps" : 0 à 3 étapes NOUVELLES, dans l'ordre ; ne répète jamais une étape déjà tracée.
${RULES}`

export const SYSTEM_BATCH = `Tu tiens le « plan de vol » d'une session de travail entre une personne et Claude (assistant de code) : un logigramme court de ce qui a été fait et pourquoi.
On te donne plusieurs missions numérotées (un prompt de la personne chacune), pour chacune les étapes déjà tracées et le journal de ce qui s'est passé depuis. Tu ajoutes seulement les étapes nouvelles.
Format : {"objective": string, "missions": [{"n": number, "title": string, "steps": [{"kind": "done"|"decision"|"fail"|"fix", "what": string, "why": string}], "waiting": string|null}]}
Une entrée par MISSION, "n" étant son numéro ; 0 à 4 étapes NOUVELLES chacune, jamais une étape déjà tracée ; "waiting" pour la dernière seulement, null pour les autres.
${RULES}`

export type Increment = { objective: string | null; title: string | null; steps: Step[]; waiting: string | null }

export type BatchEntry = Omit<Increment, 'objective'> & { n: number | null }

export type Batch = { objective: string | null; missions: BatchEntry[] }

// A prompt found in the transcript: its words and the row it stands at.
export type Group = { prompt: string; start: number }

export function stripEngineTags(text: string): string {
  return text.replace(ENGINE_BLOCK, '').trim()
}

// What a tool call did, in a few words.
export function label(tool: string, input: Readonly<Record<string, unknown>>): string {
  const str = (key: string): string => {
    const value = input[key]
    return typeof value === 'string' ? value : ''
  }
  switch (tool) {
    case 'Bash':
      return str('description') || clip(str('command'), 60)
    case 'Read':
      return `Lu ${basename(str('file_path'))}`
    case 'Edit':
    case 'Write':
      return `Écrit ${basename(str('file_path'))}`
    case 'Grep':
      return `Cherché « ${clip(str('pattern'), 30)} »`
    case 'Glob':
      return `Listé ${clip(str('pattern'), 30)}`
    case 'Agent':
      return `Drone : ${str('description')}`
    case 'Workflow':
      return `Flotte : ${workflowName(input)}`
    case 'Skill':
      return `Skill ${str('skill')}`
    case 'WebFetch':
      return `Lu ${clip(str('url'), 40)}`
    case 'WebSearch':
      return `Recherche « ${clip(str('query'), 30)} »`
    case 'AskUserQuestion':
      return 'Question pour toi'
    case 'ToolSearch':
      return 'Chargé des outils'
    default:
      return tool.startsWith('mcp__') ? tool.split('__').slice(1).join(' · ') : tool
  }
}

// A Workflow call names its run in the script's meta block, or by its saved name.
export function workflowName(input: Readonly<Record<string, unknown>>): string {
  const script = typeof input.script === 'string' ? input.script : ''
  const meta = /name\s*:\s*['"`]([^'"`]+)['"`]/.exec(script)
  if (meta?.[1]) return meta[1]

  return typeof input.name === 'string' && input.name !== '' ? input.name : 'workflow'
}

export function question(input: Readonly<Record<string, unknown>>): string {
  const questions = input.questions
  const first: unknown = Array.isArray(questions) ? questions[0] : undefined
  const text = typeof first === 'object' && first !== null ? (first as { question?: unknown }).question : undefined

  return typeof text === 'string' ? text : 'Une question t’attend'
}

// The journal's lines: Claude's words, a tool call, a tool call that failed.
export function textLine(text: string): string | null {
  return flatten(text) === '' ? null : `CLAUDE : ${squeeze(text, 400)}`
}

export function toolLine(action: string): string {
  return `${TOOL}${action}`
}

export function failLine(action: string): string {
  return `  ↳ ÉCHEC : ${action}`
}

export function addLines(mission: Mission, lines: readonly string[]): Mission {
  return { ...mission, journal: [...mission.journal, ...lines].slice(-JOURNAL_MAX), logged: mission.logged + lines.length }
}

// The lines the steps do not cover yet (all the journal kept, if more came in).
export function freshLines(mission: Mission): string[] {
  const count = mission.logged - mission.summarized
  return count <= 0 ? [] : mission.journal.slice(-count)
}

// The tool calls not folded into steps yet: the JOURNAL card's list.
export function rawActions(mission: Mission): string[] {
  return freshLines(mission).flatMap(line => (line.startsWith(TOOL) ? [line.slice(TOOL.length)] : []))
}

export function logOf(lines: readonly string[]): string {
  const text = lines.join('\n')
  const chars = Array.from(text)

  return chars.length > LOG_MAX ? `…\n${chars.slice(-LOG_MAX).join('')}` : text
}

// New steps after the ones already drawn, the oldest past the cap counted
// in `earlier`. `summarized` is how many lines the summary read: the lines
// that came in while it ran stay fresh, the ones it read leave the journal.
export function appendSteps(mission: Mission, added: readonly Step[], summarized: number): Mission {
  const left = Math.max(0, mission.logged - summarized)
  const steps = [...mission.steps, ...added]
  const dropped = Math.max(0, steps.length - STEPS_MAX)

  return {
    ...mission,
    steps: steps.slice(dropped),
    earlier: mission.earlier + dropped,
    journal: left === 0 ? [] : mission.journal.slice(-left),
    summarized,
  }
}

export type PlanChange = (plan: Plan) => Plan

export function newMission(id: number, prompt: string, lines: readonly string[] = []): Mission {
  const kept = Array.from(prompt).slice(0, PROMPT_MAX).join('')

  return addLines(
    { id, prompt: kept, title: null, steps: [], earlier: 0, waiting: null, journal: [], logged: 0, summarized: 0, attempted: 0 },
    lines,
  )
}

// A mission after the newest, numbered after every one the plan holds.
export function addMission(prompt: string): PlanChange {
  return p => {
    const id = p.missions.reduce((n, m) => Math.max(n, m.id + 1), 0)
    return { ...p, missions: [...p.missions, newMission(id, prompt)].slice(-MISSIONS_MAX) }
  }
}

// Lines for the newest mission; none before the first prompt.
export function logLines(lines: readonly string[]): PlanChange {
  return p => {
    const last = p.missions.length - 1
    return last < 0 ? p : { ...p, missions: p.missions.map((m, i) => (i === last ? addLines(m, lines) : m)) }
  }
}

// Whether a completion has lines to read: new ones since the steps, and
// since the last completion that failed on them.
export function isBehind(mission: Mission): boolean {
  return mission.logged > Math.max(mission.summarized, mission.attempted)
}

// The person's own words in a transcript row, or null: tool results, skill
// bodies and the engine's blocks are not prompts.
export function promptText(row: SessionMessage): string | null {
  if (row.role !== 'user' || (row.toolResults?.length ?? 0) > 0) return null
  const text = stripEngineTags(row.text)
  if (text === '' || text.startsWith('Base directory for this skill') || text.startsWith('[Request interrupted')) {
    return null
  }

  return text
}

export function groupsOf(rows: readonly SessionMessage[]): Group[] {
  return rows.flatMap((row, start) => {
    const prompt = promptText(row)
    return prompt === null ? [] : [{ prompt, start }]
  })
}

// A transcript row's journal lines, to seed a mission: what the live hooks
// would have written for it.
export function rowLines(row: SessionMessage): string[] {
  if (row.role !== 'assistant') return []
  const said = textLine(row.text)

  return [
    ...(said === null ? [] : [said]),
    ...row.toolUses.flatMap(use => {
      const action = label(use.tool, use.input)
      return use.isError ? [toolLine(action), failLine(action)] : [toolLine(action)]
    }),
  ]
}

function drawn(mission: Mission): string {
  const older = mission.earlier > 0 ? `(${mission.earlier} étapes plus anciennes)\n` : ''
  const steps = mission.steps.map(s => `- [${s.kind}] ${s.what} — ${s.why}`).join('\n')

  return `${older}${steps === '' ? 'aucune' : steps}`
}

// The missions before this one, the newest PAST_MAX, by their station number.
export function incrementPrompt(objective: string | null, before: readonly Mission[], mission: Mission, log: string): string {
  const named = before.slice(-PAST_MAX).map(m => `P${m.id + 1} ${m.title ?? clip(m.prompt, 35)}`)
  const past = named.length > 0 ? named.join(' ; ') : 'aucune'

  return [
    `Objectif connu : ${objective ?? 'aucun'}`,
    `Missions précédentes : ${past}`,
    `=== MISSION P${mission.id + 1} ===`,
    `PROMPT : ${squeeze(mission.prompt, PROMPT_MAX)}`,
    `Étapes déjà tracées :\n${drawn(mission)}`,
    `Journal depuis :\n${log}`,
  ].join('\n')
}

// Several missions in one completion; each part's log is its own fresh lines,
// the logs together held to what one log may hold.
export function batchPrompt(objective: string | null, missions: readonly Mission[]): string {
  const share = Math.max(500, Math.floor(LOG_MAX / Math.max(1, missions.length)))
  const parts = missions.map((m, i) => {
    const log = Array.from(freshLines(m).join('\n'))
    const kept = log.length > share ? `…\n${log.slice(-share).join('')}` : log.join('')
    return `=== MISSION ${i + 1} ===\nPROMPT : ${squeeze(m.prompt, PROMPT_MAX)}\nÉtapes déjà tracées :\n${drawn(m)}\nJournal depuis :\n${kept}`
  })

  return [`Objectif connu : ${objective ?? 'aucun'}`, ...parts].join('\n\n')
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function steps(value: unknown): Step[] {
  const list: unknown[] = Array.isArray(value) ? value : []
  return list.flatMap((item): Step[] => {
    const s = object(item)
    const what = text(s.what)
    if (what === null) return []
    return [{ kind: NAMED.find(k => k === s.kind) ?? 'done', what, why: text(s.why) ?? '' }]
  })
}

// The JSON object in a reply, wherever the model put it: from the first `{`
// that opens one that parses, to its own `}` (from one `{`, one span at most
// parses), so braces in prose around it do no harm.
// A span that parses is an object: it starts with `{` (one that ends before
// it starts is empty, and parses as nothing).
function json(reply: string): Record<string, unknown> | null {
  const opens = [...reply.matchAll(/\{/g)].map(m => m.index)
  const closes = [...reply.matchAll(/\}/g)].map(m => m.index)
  for (const from of opens) {
    for (const to of closes) {
      try {
        return JSON.parse(reply.slice(from, to + 1)) as Record<string, unknown>
      } catch {
        // Not this span: a longer one may parse.
      }
    }
  }

  return null
}

export function parseIncrement(reply: string): Increment | null {
  const raw = json(reply)
  if (raw === null) return null

  return { objective: text(raw.objective), title: text(raw.title), steps: steps(raw.steps), waiting: text(raw.waiting) }
}

export function parseBatch(reply: string): Batch | null {
  const raw = json(reply)
  if (raw === null) return null
  const missions: unknown[] = Array.isArray(raw.missions) ? raw.missions : []

  return {
    objective: text(raw.objective),
    missions: missions.map(item => {
      const m = object(item)
      const n = typeof m.n === 'number' && Number.isInteger(m.n) ? m.n : null
      return { n, title: text(m.title), steps: steps(m.steps), waiting: text(m.waiting) }
    }),
  }
}

// The batch's entry for each of `count` missions: by the number Haiku gave
// it, so one it merged or skipped shifts none of the others; by position
// only where it gave no numbers.
export function alignBatch(back: Batch, count: number): (BatchEntry | undefined)[] {
  const isNumbered = back.missions.some(m => m.n !== null)

  return Array.from({ length: count }, (_, i) =>
    isNumbered ? back.missions.find(m => m.n === i + 1) : back.missions[i],
  )
}

// A queued prompt's turn starts within this of the end of the turn it waited
// behind, or never (the person took it back out of the queue).
export const QUEUE_MS = 60_000

// The queued prompts a main turn opens, by the text it starts with: the one
// that entered as that text; several the engine joined into one turn; else
// the newest command (its turn's text is the command's own expansion), but
// not for a turn of nothing but the engine's blocks. A turn that is none of
// theirs (a notification's, a continuation's) takes none. Prompts whose turn
// did not come in time leave.
export function takePending(pending: readonly Pending[], text: string, now: number): { taken: Pending[]; left: Pending[] } {
  const current = pending.filter(p => now - p.at <= QUEUE_MS)
  const said = flatten(text)
  const prompts = current.filter(p => !p.isCommand)
  const same = prompts.find(p => flatten(p.entered) === said)
  const joined = prompts.filter(p => flatten(p.entered) !== '' && said.includes(flatten(p.entered)))
  const covers = joined.reduce((n, p) => n + length(flatten(p.entered)), 0) * 2 >= length(said)
  // The newest: a turn starts right after its own submit.
  const command = current.filter(p => p.isCommand).pop()
  const isWords = stripEngineTags(text) !== ''
  // An empty join covers a turn that says nothing, and takes nothing.
  const taken = same !== undefined ? [same] : covers ? joined : command !== undefined && isWords ? [command] : []
  // A command submitted before what this turn took started no turn of its own.
  const last = Math.max(-1, ...taken.map(t => current.indexOf(t)))

  return { taken, left: current.filter((p, i) => !taken.includes(p) && !(p.isCommand && i < last)) }
}

// At the end of a main turn, what waited behind it can start: its clock runs
// from now.
export function restamp(pending: readonly Pending[], now: number): Pending[] {
  return pending.map(p => ({ ...p, at: now }))
}

// What one completion made of a mission: `read` is how many of its journal
// lines the completion saw.
export type Summary = { id: number; read: number; steps: Step[]; title: string | null; waiting: string | null }

// The plan with each completion's steps after the ones drawn; unchanged if a
// /clear or a resume started another plan meanwhile, and a mission whose
// steps already cover those lines (another copy of the mod across a reload
// summarized them) keeps its own.
export function settled(plan: Plan, epoch: number, made: readonly Summary[], objective: string | null): Plan {
  if (plan.epoch !== epoch) return plan

  return {
    ...plan,
    objective: objective ?? plan.objective,
    missions: plan.missions.map(m => {
      const s = made.find(x => x.id === m.id)
      if (s === undefined || s.read <= m.summarized) return m
      return { ...appendSteps(m, s.steps, s.read), title: m.title ?? s.title, waiting: s.waiting }
    }),
  }
}

// The plan once a completion failed on these lines: not tried again until
// more come.
export function attempted(plan: Plan, epoch: number, tried: readonly { id: number; read: number }[]): Plan {
  if (plan.epoch !== epoch) return plan

  return {
    ...plan,
    missions: plan.missions.map(m => {
      const t = tried.find(x => x.id === m.id)
      return t === undefined ? m : { ...m, attempted: Math.max(m.attempted, t.read) }
    }),
  }
}
