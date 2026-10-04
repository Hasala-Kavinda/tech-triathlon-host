import { apiRequest } from "../api/client"
import type { StopOutcome } from "../shared/types"
import { listMutations, putMutation, deleteMutation, type StoredMutation } from "./db"

type StopItem = { sku: string; delivered: number; short: number; damaged: number }

export type OfflineStopCompletion = {
  tripId: string
  stopId: string
  outcome: StopOutcome
  /** Item counts for the stop (the same numbers the online items endpoint takes). */
  items: StopItem[]
  /** The store's PIN. Not needed for a refused or closed stop. */
  pin?: string
  /** Queue the arrival too, when it has not already been recorded or queued. */
  includeArrival: boolean
  /** When the Driver actually arrived, if known; defaults to now. */
  arrivedAt?: Date
}

type SyncResult = { clientMutationId: string; result: "applied" | "duplicate" | "conflict" | "rejected"; response?: { code?: string; message?: string } }

const MAX_BATCH = 100
let flushing = false

// Mutations replay in recorded order, so each step gets a timestamp a millisecond after the last.
let lastStamp = 0
function nextStamp(base: Date) {
  lastStamp = Math.max(base.getTime(), lastStamp + 1)
  return new Date(lastStamp).toISOString()
}

async function enqueue(type: StoredMutation["type"], payload: StoredMutation["payload"], at: Date) {
  await putMutation({ id: crypto.randomUUID(), type, payload, recordedAt: nextStamp(at), attempts: 0, state: "pending" })
}

/** Arrival at a stop while offline: saved with the time the Driver arrived. */
export async function queueArrival(tripId: string, stopId: string, arrivedAt = new Date()) {
  await enqueue("stop_arrive", { tripId, stopId }, arrivedAt)
}

/** The rest of a stop (items, PIN, outcome), recorded on the phone and sent when the network returns. */
export async function queueStopCompletion(input: OfflineStopCompletion, now = new Date()) {
  const base = { tripId: input.tripId, stopId: input.stopId }
  if (input.includeArrival) await enqueue("stop_arrive", base, input.arrivedAt ?? now)
  await enqueue("stop_items", { ...base, items: input.items }, now)
  if (input.pin) await enqueue("pin_submission", { ...base, pin: input.pin }, now)
  await enqueue("stop_complete", { ...base, outcome: input.outcome }, now)
}

export async function pendingMutationCount() {
  return (await listMutations()).filter((item) => item.state === "pending").length
}

/** Queued changes the server turned down (conflict or rejected); they stay on the phone for review. */
export async function listSyncIssues() {
  return (await listMutations()).filter((item) => item.state === "conflict" || item.state === "rejected")
}

/** The stops that still have changes waiting on this phone, as "tripId:stopId". */
export async function stopsWithPendingChanges() {
  return new Set((await listMutations()).filter((item) => item.state === "pending").map((item) => `${String(item.payload.tripId)}:${String(item.payload.stopId)}`))
}

function deviceId() {
  const existing = localStorage.getItem("waylink.deviceId")
  if (existing) return existing
  const created = crypto.randomUUID()
  localStorage.setItem("waylink.deviceId", created)
  return created
}

/**
 * Sends queued stop changes to /sync/batch. Applied and duplicate items are removed.
 * Conflicts and rejections stay stored (with their state) instead of retrying forever,
 * so they remain visible; only network failures leave an item pending for the next try.
 * Returns the stops whose completion has now reached the server.
 */
export async function flushSyncQueue(): Promise<{ syncedStops: Array<{ tripId: string; stopId: string }> }> {
  if (flushing) return { syncedStops: [] }
  flushing = true
  try {
    const pending = (await listMutations()).filter((item) => item.state === "pending").slice(0, MAX_BATCH)
    if (!pending.length) return { syncedStops: [] }
    const mutations = pending.map((item) => ({
      clientMutationId: item.id,
      entityType: "stop",
      entityId: `${String(item.payload.tripId)}:${String(item.payload.stopId)}`,
      operation: item.type,
      baseVersion: 0,
      clientRecordedAt: item.recordedAt,
      payload: item.payload,
    }))
    let results: SyncResult[]
    try {
      results = (await apiRequest<{ results: SyncResult[] }>("/sync/batch", { method: "POST", body: JSON.stringify({ deviceId: deviceId(), mutations }) })).results
    } catch (error) {
      console.error("Sync batch failed; items stay queued", error)
      return { syncedStops: [] }
    }
    const syncedStops: Array<{ tripId: string; stopId: string }> = []
    for (const item of pending) {
      const result = results.find((candidate) => candidate.clientMutationId === item.id)?.result
      if (result === "applied" || result === "duplicate") {
        await deleteMutation(item.id)
        if (item.type === "stop_complete") syncedStops.push({ tripId: String(item.payload.tripId), stopId: String(item.payload.stopId) })
      } else if (result === "conflict" || result === "rejected") {
        await putMutation({ ...item, attempts: item.attempts + 1, state: result })
      }
    }
    return { syncedStops }
  } finally {
    flushing = false
  }
}
