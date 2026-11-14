import type { AgentStatus } from 'claude-code'

import type { Drone, DroneStatus, Fleet, Squadron } from '../types'

// The fleet's bookkeeping: each change a pure function of the fleet, so a
// burst of them (an ultracode run's dozens of agents) applies in one write.

// Where a change lands: the id of the plan's newest mission at its place in
// the queue (-1 before any), and the clock when the batch was written.
export type Stamp = { mission: number; now: number }

export type FleetChange = (fleet: Fleet, at: Stamp) => Fleet

// Squadrons kept: an ultracode session can start a run per prompt.
export const SQUADRONS_MAX = 40
// A drone silent this long no longer counts as in flight: its landing may
// have been lost to a reload, and nothing lists a workflow's agents. Long:
// a drone is stamped at each step and each tool call's start and end, so
// only a single step or call outlasting it reads as silent.
export const STALE_MS = 30 * 60_000

export const EMPTY_FLEET: Fleet = { squadrons: [] }

export type Workflow = { toolUseId: string; runId: string }

// A workflow's agents share the Workflow call's id; the Agent tool's are
// grouped by the mission they started in.
export function squadronKey(workflow: Workflow | undefined, missionId: number): string {
  if (workflow === undefined) return `agents-${missionId}`

  return workflow.toolUseId || workflow.runId || 'workflow'
}

function withSquadron(fleet: Fleet, key: string, make: () => Squadron, change: (s: Squadron) => Squadron): Fleet {
  const has = fleet.squadrons.some(s => s.key === key)
  const squadrons = has ? fleet.squadrons : [...fleet.squadrons, make()]

  return { squadrons: squadrons.map(s => (s.key === key ? change(s) : s)).slice(-SQUADRONS_MAX) }
}

export function nameSquadron(key: string, name: string): FleetChange {
  return (fleet, at) =>
    at.mission < 0
      ? fleet
      : withSquadron(fleet, key, () => ({ key, name, isWorkflow: true, mission: at.mission, drones: [] }), s => ({ ...s, name }))
}

// Agents started before any prompt belong to no mission: they are not drawn.
// An agent resumed later (a message to one that had finished) flies again
// under the mission that resumed it, and only there.
export function launch(workflow: Workflow | undefined, id: string, label: string): FleetChange {
  return (fleet, at) => {
    if (at.mission < 0) return fleet
    const key = squadronKey(workflow, at.mission)
    const isWorkflow = workflow !== undefined
    const drone: Drone = { id, label, status: 'running', action: null, seenAt: at.now }
    // Out of the squadron it flew in before, and an Agents one it leaves empty.
    const without = {
      squadrons: fleet.squadrons.map(s => ({ ...s, drones: s.drones.filter(d => d.id !== id) })).filter(s => s.drones.length > 0 || s.isWorkflow),
    }

    return withSquadron(
      without,
      key,
      () => ({ key, name: isWorkflow ? 'workflow' : 'Agents', isWorkflow, mission: at.mission, drones: [] }),
      s => ({ ...s, drones: [...s.drones, drone] }),
    )
  }
}

// The drone wherever it flies (launch keeps it in one squadron).
function withDrone(fleet: Fleet, id: string, change: (d: Drone) => Drone): Fleet {
  return { squadrons: fleet.squadrons.map(s => ({ ...s, drones: s.drones.map(d => (d.id === id ? change(d) : d)) })) }
}

export function act(id: string, action: string): FleetChange {
  return (fleet, at) => withDrone(fleet, id, d => ({ ...d, action, seenAt: at.now }))
}

// A sign of life with nothing new to show: a step ended, a tool call returned.
export function seen(id: string): FleetChange {
  return (fleet, at) => withDrone(fleet, id, d => (d.status === 'running' ? { ...d, seenAt: at.now } : d))
}

export function land(id: string, status: Exclude<DroneStatus, 'running'>): FleetChange {
  return (fleet, at) => withDrone(fleet, id, d => ({ ...d, status, action: null, seenAt: at.now }))
}

// What the engine says of the agents it still tracks lands the drones whose
// end this copy of the mod missed (a reload between their end and a write).
export function reconcile(agents: readonly { id: string; status: AgentStatus }[]): FleetChange {
  return (fleet, at) =>
    agents.reduce((acc, agent) => {
      const status = agent.status === 'completed' ? 'done' : agent.status === 'failed' || agent.status === 'killed' ? 'failed' : null
      return status === null ? acc : withDrone(acc, agent.id, d => (d.status === 'running' ? { ...d, status, action: null, seenAt: at.now } : d))
    }, fleet)
}

export function isSilent(drone: Drone, now: number): boolean {
  return drone.status === 'running' && now - drone.seenAt > STALE_MS
}

// A squadron's count, as its card and the logbook say it: the drones in
// flight, and how many are back, lost, silent.
export function tally(squadron: Squadron, now: number): { flying: Drone[]; back: number; lost: number; silent: number } {
  return {
    flying: squadron.drones.filter(d => d.status === 'running' && !isSilent(d, now)),
    back: squadron.drones.filter(d => d.status === 'done').length,
    lost: squadron.drones.filter(d => d.status === 'failed').length,
    silent: squadron.drones.filter(d => isSilent(d, now)).length,
  }
}

// Any drone not known to have landed, in flight or silent: what the engine
// may know more of.
export function hasRunning(fleet: Fleet): boolean {
  return fleet.squadrons.some(s => s.drones.some(d => d.status === 'running'))
}

export function isFlying(fleet: Fleet, now: number): boolean {
  return fleet.squadrons.some(s => s.drones.some(d => d.status === 'running' && !isSilent(d, now)))
}
