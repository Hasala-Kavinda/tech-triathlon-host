const DB_NAME = "waylink-driver-v1"
const DB_VERSION = 1
const MUTATIONS = "mutations"

export type StoredMutation = {
  id: string
  // The first four are accepted by /sync/batch. The last two come from the legacy
  // prototype queue (state/syncQueueContext.tsx), which the live app does not mount.
  type: "stop_arrive" | "stop_items" | "pin_submission" | "stop_complete" | "outlet_progress" | "route_start" | "route_finish"
  payload: Record<string, unknown>
  recordedAt: string
  attempts: number
  state: "pending" | "conflict" | "rejected"
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function openDriverDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of ["driverMeta", "assignments", "trips", "stops", "orders", MUTATIONS, "locations", "fileDrafts", "history", "syncReceipts"]) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: store === MUTATIONS ? "id" : "key" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDriverDb()
  try {
    return await requestResult(action(db.transaction(MUTATIONS, mode).objectStore(MUTATIONS)))
  } finally { db.close() }
}

export async function listMutations(): Promise<StoredMutation[]> {
  const rows = await transaction("readonly", (store) => store.getAll())
  return rows.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
}

export async function putMutation(item: StoredMutation) { await transaction("readwrite", (store) => store.put(item)) }
export async function deleteMutation(id: string) { await transaction("readwrite", (store) => store.delete(id)) }
export async function clearMutations() { await transaction("readwrite", (store) => store.clear()) }

export async function saveBootstrap(payload: { assignment: Record<string, unknown>; manifest: { trip: Record<string, unknown>; orders: Array<Record<string, unknown>> }; bootstrapVersion: number; serverNow: string }) {
  const db = await openDriverDb()
  const tx = db.transaction(["driverMeta", "assignments", "trips", "stops", "orders"], "readwrite")
  const tripId = String(payload.assignment._id)
  tx.objectStore("driverMeta").put({ key: "bootstrap", tripId, bootstrapVersion: payload.bootstrapVersion, serverNow: payload.serverNow, savedAt: new Date().toISOString() })
  tx.objectStore("assignments").put({ key: tripId, ...payload.assignment })
  tx.objectStore("trips").put({ key: tripId, ...payload.manifest.trip })
  const stops = Array.isArray(payload.manifest.trip.stops) ? payload.manifest.trip.stops as Array<Record<string, unknown>> : []
  for (const stop of stops) tx.objectStore("stops").put({ key: `${tripId}:${String(stop.stopId)}`, tripId, ...stop })
  for (const order of payload.manifest.orders) tx.objectStore("orders").put({ key: String(order._id), tripId, ...order })
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error) })
  db.close()
}

export type StoredLocation = { key: string; tripId: string; sequence: number; recordedAt: string; latitude: number; longitude: number; accuracy: number; heading?: number; speed?: number }

export async function queueLocation(point: StoredLocation) {
  const db = await openDriverDb()
  try { await requestResult(db.transaction("locations", "readwrite").objectStore("locations").put(point)) } finally { db.close() }
}

export async function listLocations(tripId: string) {
  const db = await openDriverDb()
  try {
    const rows = await requestResult(db.transaction("locations", "readonly").objectStore("locations").getAll()) as StoredLocation[]
    return rows.filter((row) => row.tripId === tripId).sort((a, b) => a.sequence - b.sequence)
  } finally { db.close() }
}

export async function deleteLocations(keys: string[]) {
  const db = await openDriverDb()
  const tx = db.transaction("locations", "readwrite")
  for (const key of keys) tx.objectStore("locations").delete(key)
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) })
  db.close()
}
