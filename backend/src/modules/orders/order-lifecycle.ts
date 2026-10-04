/**
 * The Store Manager's order timeline, derived from the order, its trip and its delivery record together.
 * `orders.status` alone cannot say "arrived" (that lives in `delivery_records.status`), so no screen should map
 * orders.status to a timeline position by itself. This is the single source of truth for that mapping.
 */
export type OrderUiState = "confirmed" | "deferred" | "scheduled" | "on-way" | "arrived" | "awaiting-confirmation" | "receipt-confirmed" | "receipt-issue"
export type StepKey = "confirmed" | "deferred" | "scheduled" | "on_the_way" | "arrived" | "receipt"
export type StepState = "complete" | "current" | "future"

export interface LifecycleOrder {
  status: string
  createdAt?: Date | undefined
  requestedDate: string
  allocatedTripId?: unknown
  statusHistory: Array<{ status: string; at: Date }>
}
export interface LifecycleTrip { status: string; startedAt?: Date | null; stops: Array<{ tripStopId: unknown; plannedArrivalAt?: Date | null }> }
export interface LifecycleDelivery {
  status: string
  tripStopId: unknown
  arrivedAt?: Date | null
  completedAt?: Date | null
  receipt?: { confirmedAt?: Date | string | null } | null
}

export interface LifecycleStep { key: StepKey; label: string; state: StepState; reachedAt: string | null }
export interface OrderLifecycle {
  uiState: OrderUiState
  wasDeferred: boolean
  steps: LifecycleStep[]
  /** Planned arrival of this order's stop; null until a trip is published. */
  expectedArrivalAt: string | null
  /** The planning day this order targets (the order's requested date). */
  targetPlanningRun: string
  awaitingReceipt: boolean
}

const LABELS: Record<StepKey, string> = {
  confirmed: "Order confirmed", deferred: "Deferred", scheduled: "Scheduled", on_the_way: "On the way", arrived: "Arrived", receipt: "Receipt confirmation",
}
const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : null)
const firstAt = (order: LifecycleOrder, ...statuses: string[]) => order.statusHistory.find((h) => statuses.includes(h.status))?.at

export function deriveOrderLifecycle(input: { order: LifecycleOrder; trip?: LifecycleTrip | null; delivery?: LifecycleDelivery | null }): OrderLifecycle {
  const { order, trip, delivery } = input
  const receiptDone = delivery?.status === "receipt_confirmed" || delivery?.status === "receipt_issue"
  const delivered = delivery?.status === "delivered" || delivery?.status === "failed" || receiptDone
  const arrived = delivery?.status === "arrived" || delivered
  const onWay = order.status === "in_transit" || trip?.status === "in_transit" || trip?.status === "completed" || arrived
  const scheduled = Boolean(order.allocatedTripId) || ["allocated", "loading", "load_confirmed", "in_transit", "delivered", "delivery_failed"].includes(order.status) || onWay
  const deferredNow = order.status === "deferred"
  const wasDeferred = deferredNow || order.statusHistory.some((h) => h.status === "deferred")

  let uiState: OrderUiState = "confirmed"
  if (receiptDone) uiState = delivery!.status === "receipt_issue" ? "receipt-issue" : "receipt-confirmed"
  else if (delivered) uiState = "awaiting-confirmation"
  else if (arrived) uiState = "arrived"
  else if (onWay) uiState = "on-way"
  else if (scheduled) uiState = "scheduled"
  else if (deferredNow) uiState = "deferred"

  const stamp: Record<StepKey, string | null> = {
    confirmed: iso(firstAt(order, "submitted") ?? order.createdAt ?? null),
    deferred: iso(order.statusHistory.filter((h) => h.status === "deferred").at(-1)?.at),
    scheduled: scheduled ? iso(firstAt(order, "allocated")) : null,
    on_the_way: onWay ? iso(firstAt(order, "in_transit") ?? trip?.startedAt) : null,
    arrived: arrived ? iso(delivery?.arrivedAt) : null,
    receipt: receiptDone ? iso(delivery?.receipt?.confirmedAt) : null,
  }
  const keys: StepKey[] = wasDeferred ? ["confirmed", "deferred", "scheduled", "on_the_way", "arrived", "receipt"] : ["confirmed", "scheduled", "on_the_way", "arrived", "receipt"]
  const currentKey: StepKey | null = ({
    confirmed: "confirmed", deferred: "deferred", scheduled: "scheduled", "on-way": "on_the_way", arrived: "arrived", "awaiting-confirmation": "receipt", "receipt-confirmed": null, "receipt-issue": null,
  } as Record<OrderUiState, StepKey | null>)[uiState]
  const currentIndex = currentKey ? keys.indexOf(currentKey) : keys.length
  const steps: LifecycleStep[] = keys.map((key, index) => ({
    key, label: LABELS[key], reachedAt: index <= currentIndex ? stamp[key] : null,
    state: index < currentIndex ? "complete" : index === currentIndex ? "current" : "future",
  }))
  // Once a trip is published the Store knows when to expect the vehicle.
  const stop = trip?.stops.find((s) => String(s.tripStopId) === String(delivery?.tripStopId))
  return {
    uiState, wasDeferred, steps, expectedArrivalAt: iso(stop?.plannedArrivalAt), targetPlanningRun: order.requestedDate,
    awaitingReceipt: uiState === "awaiting-confirmation",
  }
}
