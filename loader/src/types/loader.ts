
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
