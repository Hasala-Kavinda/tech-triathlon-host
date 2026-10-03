import { apiRequest } from "../api/client"
import { listMutations, putMutation, deleteMutation, type StoredMutation } from "./db"

type StopItem = { sku: string; delivered: number; short: number; damaged: number }
export type OfflineStopCompletion = {
  tripId: string
  stopId: string
  pin: string
  items: StopItem[]
  /** Arrival and item counts are queued only when they have not already reached the server. */
  includeArrival: boolean
}

type SyncResult = { clientMutationId: string; result: "applied" | "duplicate" | "conflict" | "rejected" }

const MAX_BATCH = 100
let flushing = false

// Mutations replay in recorded order, so each step gets a timestamp a millisecond after the last.
export async function queueStopCompletion(input: OfflineStopCompletion, now = new Date()) {
  const steps: Array<Pick<StoredMutation, "type" | "payload">> = [
    ...(input.includeArrival ? [
      { type: "stop_arrive" as const, payload: { tripId: input.tripId, stopId: input.stopId } },
      { type: "stop_items" as const, payload: { tripId: input.tripId, stopId: input.stopId, items: input.items } },
    ] : []),
    { type: "pin_submission", payload: { tripId: input.tripId, stopId: input.stopId, pin: input.pin } },
    { type: "stop_complete", payload: { tripId: input.tripId, stopId: input.stopId, outcome: "delivered" } },
  ]
  for (const [index, step] of steps.entries()) {
    await putMutation({
      id: crypto.randomUUID(),
      type: step.type,
      payload: step.payload,
      recordedAt: new Date(now.getTime() + index).toISOString(),
      attempts: 0,
      state: "pending",
    })
  }
}

export async function pendingMutationCount() {
  return (await listMutations()).filter((item) => item.state === "pending").length
}

function deviceId() {
  const existing = localStorage.getItem("waylink.deviceId")
  if (existing) return existing
  const created = crypto.randomUUID()
  localStorage.setItem("waylink.deviceId", created)
  return created
}

/**
 * Sends queued stop mutations to /sync/batch. Applied and duplicate items are removed.
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
