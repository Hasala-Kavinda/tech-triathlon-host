import { useEffect, useState } from "react"
import type { RouteResult } from "@route-engine"
import type { PreparedTrip } from "../App"
import type { CheckModal } from "../components/CheckModal"
import type { Order, Vehicle } from "../types/dispatcher"

/** The live planning service (backend draft + validate + publish), supplied by App. */
export type PlanningService = {
  prepare: (scheduled: Order[], vehicle: Vehicle, routeDate: string, departureTime: string, route?: RouteResult) => Promise<PreparedTrip>
  publish: (prepared: PreparedTrip) => Promise<void>
  onPublished: (message: string, scheduled: Order[]) => void
}

type Validation = React.ComponentProps<typeof CheckModal>["validation"]

/**
 * The "Check route" step, shared by both scheduling flows. Whatever the dispatcher has selected
 * (the untouched suggestion or an edited set) is sent to the backend as a draft trip and validated
 * by the real planning rules; Schedule then publishes exactly that draft. The suggestion engine is
 * only the source of the selection, never a separate publish path.
 */
export function usePlanningCheck(opts: {
  planning: PlanningService
  open: boolean
  vehicle: Vehicle | null
  /** Orders in route sequence. */
  orders: Order[]
  route: RouteResult | null
  routeDate: string
  departsTime: string
  onScheduled: () => void
}) {
  const { planning, open, vehicle, orders, route, routeDate, departsTime, onScheduled } = opts
  const [prepared, setPrepared] = useState<PreparedTrip | null>(null)
  const [validation, setValidation] = useState<Validation>(undefined)
  const [scheduling, setScheduling] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [recheck, setRecheck] = useState(0)

  const packKey = orders.map((o) => o.apiId ?? o.id).join("|")
  useEffect(() => {
    if (!open || !vehicle || !orders.length) return
    let stale = false
    setPrepared(null)
    setSubmitError("")
    setValidation({ phase: "loading" })
    planning.prepare(orders, vehicle, routeDate, departsTime, route ?? undefined)
      .then((trip) => {
        if (stale) return
        setPrepared(trip)
        setValidation({ phase: "ready", valid: trip.valid, rules: trip.rules })
      })
      .catch((error) => {
        if (!stale) setValidation({ phase: "error", message: error instanceof Error ? error.message : "The route could not be checked." })
      })
    return () => { stale = true }
    // `orders`/`route` are derived from packKey + the plan; planning callbacks are recreated on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicle?.id, packKey, routeDate, departsTime, recheck, route?.departureMin, route?.tripMinutes])

  const schedule = async () => {
    if (!vehicle || !prepared) return
    setScheduling(true)
    setSubmitError("")
    try {
      await planning.publish(prepared)
      onScheduled()
      planning.onPublished(`Route ${vehicle.id} scheduled`, orders)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "The route could not be scheduled.")
    } finally {
      setScheduling(false)
    }
  }

  // Never show Schedule as ready before the planning service has answered.
  const shown: Validation = open && validation === undefined ? { phase: "loading" } : validation
  return { validation: shown, scheduling, submitError, schedule, retry: () => setRecheck((n) => n + 1) }
}
