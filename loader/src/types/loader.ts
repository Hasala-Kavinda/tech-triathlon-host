
export type ConnectivityState = "online" | "offline" | "syncing" | "synced"
export type WorkCardState = "available" | "claiming" | "claimed" | "unavailable" | "completed" | "completed-other"
export type LoadItemStatus = "pending" | "loaded" | "flagged"
export type ExceptionType = "missing" | "damaged"
export type LoadItemException = {
  affectedQuantity: number
  note?: string
  pendingSync: boolean
  reason: string
  type: ExceptionType
  unit: string
}
export type LoadItemData = {
  exception?: LoadItemException
  id: string
  name: string
  quantity: string
  status: LoadItemStatus
}

export type LoadTiming = {
  receivedAt: number
  departureAt: number
  finalVariance?: number
}

export type PlanChange = {
  changeId: string
  type: string
  orderId: string
  description: string
  reason?: string
  createdAt: string
  acknowledgedAt?: string
  acknowledgedBy?: string
}

export type LoadRecordStatus = "available" | "claimed" | "loading" | "reconciled" | "confirmed"

/** One load job as the Available Work list shows it. Built from the load record and its trip. */
export type LoadCase = {
  tripId: string
  version: number
  recordStatus: LoadRecordStatus
  departure: string
  items: number
  priority: "normal" | "urgent"
  route: string
  state: WorkCardState
  stops: number
  vehicle: string
  weight: string
  timing: LoadTiming
  planChanges: PlanChange[]
}

/** One stop of the open load: the items to load for that outlet. */
export type ActiveStop = {
  deliveryWindow: string
  items: LoadItemData[]
  orderId: string
  outlet: string
  stopNumber: number
}
