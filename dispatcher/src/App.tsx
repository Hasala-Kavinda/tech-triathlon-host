import { useEffect, useState } from "react"
import { planningApi, type DriverReference, type PlanningOrder, type TripInput, type TripRule, type TripSummary } from "./api/planning"
import { DeferModal } from "./components/DeferModal"
import { AppShell } from './components/layout/AppShell'
import { ManageVehiclesModal } from "./components/ManageVehiclesModal"
import { OrderDetailsModal } from "./components/OrderDetailsModal"
import { OrderLogPage } from "./components/OrderLogPage"
import { openOrderDetails, vehicleDay } from "./components/planning/helpers"
import { DAILY_TURN_LIMIT, initialOrders, initialRoutes, initialVehicles, OPEN_ORDER_EVENT } from "./lib/constants"
import { addDays, colomboDate, isIsoDate } from "./lib/dates"
import { useServerClock } from "./lib/useServerClock"
import type { PlanningService } from "./lib/usePlanningCheck"
import type { RouteResult } from "@route-engine"
import { routeLabel } from "./lib/routeLabel"
import DueSchedulePage from "./pages/DueSchedulePage"
import HomePage from "./pages/HomePage"
import MonitorPage from "./pages/MonitorPage"
import SchedulePage from "./pages/SchedulePage"
import type { Order, RouteRecord, ShopType, Vehicle } from "./types/dispatcher"

function getInitialPath() {
  if (window.location.pathname.startsWith("/monitor/")) {
    return window.location.pathname
  }
  if (window.location.pathname.startsWith("/orders")) return "/orders"
  return window.location.pathname.startsWith("/schedule")
    ? "/schedule"
    : "/home"
}

/* ------------------------------------------------------------------ */
/* Daily turns (max 2 per vehicle per day) and load volume.            */
/* Values here extend sampleData without changing its Vehicle type.    */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Due-day scheduling — opened from the calendar's "Schedule for       */
/* [day]" button (today or any other day). The orders due that day are */
/* pre-added and locked, the system suggests the best vehicle, and     */
/* other orders along the same route can be added.                     */
/* ------------------------------------------------------------------ */
// Extra orders that lie on the typical route for a day. If sampleData has an
// order with the same id, that one is used instead.
// Rough map positions (viewBox 520 × 300) for towns around Galle.

const PROTOTYPE_MODE = import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === "true"
// The sample data describes Sun 27 Sep 2026; prototype mode keeps that as "today".
const PROTOTYPE_TODAY = "2026-09-27"

const toOrder = (order: PlanningOrder): Order => ({
  apiId: order._id,
  id: order.orderNumber,
  shop: order.outletId,
  town: order.outletId,
  type: order.brand,
  items: `${order.items.reduce((sum, item) => sum + item.quantity, 0)} units`,
  kg: order.totalWeightKg,
  emergency: order.cutoffBucket === "after_cutoff",
  // Reach and suggestions are decided by the route-suggestion engine on the scheduling screens, not stored on the order.
  inReach: true,
  suggested: false,
  outletId: order.outletId,
  volumeM3: order.totalVolumeM3,
  needsReefer: order.items.some((item) => item.temperatureClass === "chilled" || item.temperatureClass === "frozen"),
  requestedDate: order.requestedDate,
  status: order.status,
})

const clock = (value?: string) =>
  value ? new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : undefined

const toRouteRecord = (trip: TripSummary, title: string): RouteRecord => ({
  id: trip.vehicleId,
  // "Depot → District · Name NN" (derived, see lib/routeLabel.ts); the trip number stays as a secondary reference.
  route: title,
  tripId: trip._id,
  tripNumber: trip.tripNumber,
  tags: [...new Set(trip.orders.map((order) => order.brand))],
  done: trip.stops.filter((stop) => ["completed", "delivered"].includes(stop.status)).length,
  total: trip.stops.length,
  remarks: 0,
  ...(clock(trip.departureAt) ? { start: clock(trip.departureAt)! } : {}),
  ...(clock(trip.plannedEndAt) ? { estEnd: clock(trip.plannedEndAt)! } : {}),
  stops: trip.stops.map((stop) => ({
    shop: stop.outletId,
    ...(clock(stop.plannedArrivalAt) ? { eta: clock(stop.plannedArrivalAt)! } : {}),
  })),
})

/** A draft trip that the backend has validated and that is ready to be published. */
export type PreparedTrip = { tripId: string; version: number; valid: boolean; rules: TripRule[]; driverId: string }

function App() {
  const [path, setPath] = useState(getInitialPath)
  const [search, setSearch] = useState(() => window.location.search)
  const [toast, setToast] = useState("")
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [orderNotices, setOrderNotices] = useState<
    Record<string, { text: string; shareWithCrew: boolean }>
  >({})

  useEffect(() => {
    const onOpen = (e: Event) => setDetailOrder((e as CustomEvent<Order>).detail)
    window.addEventListener(OPEN_ORDER_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_ORDER_EVENT, onOpen)
  }, [])
  const [approved, setApproved] = useState(false)
  const [homeFilter, setHomeFilter] = useState<ShopType | null>(null)

  // Outside prototype mode nothing is shown until the backend answers.
  const [vehicles, setVehicles] = useState<Vehicle[]>(PROTOTYPE_MODE ? initialVehicles : [])
  const [drivers, setDrivers] = useState<DriverReference[]>([])
  const [orders, setOrders] = useState<Order[]>(PROTOTYPE_MODE ? initialOrders : [])
  // The planning date the `orders` list was loaded for (null until the first load finishes).
  const [ordersDate, setOrdersDate] = useState<string | null>(null)
  const [routes, setRoutes] = useState<RouteRecord[]>(PROTOTYPE_MODE ? initialRoutes : [])
  const [completedRoutes, setCompletedRoutes] = useState<RouteRecord[]>([])

  // "Today" and the date being planned. Today comes from the server's clock (Asia/Colombo), the
  // same clock that decides each order's cutoff bucket; the Dispatcher can plan another day.
  const serverClock = useServerClock(!PROTOTYPE_MODE)
  const today = PROTOTYPE_MODE ? PROTOTYPE_TODAY : serverClock.today
  // Bumped whenever orders change server-side so the home due-calendar refetches its counts.
  const [dueVersion, setDueVersion] = useState(0)
  const [planningDate, setPlanningDate] = useState<string | null>(() => {
    const requested = new URLSearchParams(window.location.search).get("date")
    if (isIsoDate(requested)) return requested
    return PROTOTYPE_MODE ? PROTOTYPE_TODAY : null
  })

  useEffect(() => {
    if (today) setPlanningDate((current) => current ?? today)
  }, [today])

  // The planning queue and the route list are always read back from the backend, so an
  // order that was scheduled disappears because its status/allocation changed, not because
  // the screen hid it. Orders are listed for the date being planned.
  const refreshQueueAndRoutes = async (date: string | null = planningDate) => {
    if (!date) return
    const [apiOrders, tripLists, usage] = await Promise.all([
      planningApi.orders(date),
      Promise.all([date, addDays(date, 1)].map((day) => planningApi.trips(day))),
      planningApi.engineContext(date), // outlet districts for the route labels
    ])
    const allTrips = tripLists.flat()
    const districtOf = (outletId: string) => usage.outlets.find((outlet) => outletId === outlet.outletId)?.district
    const labelFor = (trip: TripSummary) => routeLabel(trip, districtOf, allTrips.filter((other) => other.serviceDate === trip.serviceDate)).title
    const liveTrips = allTrips.filter((trip) => ["published", "loading", "load_confirmed", "claimed", "in_transit"].includes(trip.status))
    const doneTrips = allTrips.filter((trip) => trip.status === "completed")
    const [details, doneDetails] = await Promise.all([
      Promise.all(liveTrips.map((trip) => planningApi.tripDetail(trip._id))),
      Promise.all(doneTrips.map((trip) => planningApi.tripDetail(trip._id))),
    ])
    setOrders(apiOrders.map(toOrder))
    setOrdersDate(date)
    setRoutes(details.map((trip) => toRouteRecord(trip, labelFor(trip))))
    setCompletedRoutes(doneDetails.map((trip) => toRouteRecord(trip, labelFor(trip))))
    setDueVersion((version) => version + 1)
  }

  // Changing the planned date re-queries the orders for that date.
  useEffect(() => {
    if (PROTOTYPE_MODE || !planningDate) return
    let cancelled = false
    void refreshQueueAndRoutes(planningDate).catch((error) => {
      if (cancelled) return
      console.error("Dispatcher planning queue request failed", error)
      setOrders([])
      setToast(error instanceof Error ? `The orders for ${planningDate} could not be loaded: ${error.message}` : "The orders could not be loaded.")
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planningDate])

  useEffect(() => {
    if (PROTOTYPE_MODE || !today) return
    void Promise.all([planningApi.vehicles(today), planningApi.drivers(), planningApi.engineContext(today)])
      .then(([apiVehicles, apiDrivers, usage]) => {
        setVehicles(apiVehicles.map((vehicle) => {
          const used = usage.vehicleState[vehicle.vehicleId]
          return {
            id: vehicle.vehicleId,
            type: vehicle.temperatureClass === "reefer" ? "Refrigerated" : vehicle.type.toLowerCase() === "van" ? "Van" : "Lorry",
            capacityKg: vehicle.weightCapacityKg,
            volumeM3: vehicle.volumeCapacityM3,
            depot: vehicle.depot,
            length: vehicle.depot,
            turns: used?.turnsToday ?? 0,
            turnQuota: 2,
            km: Math.round((used?.weeklyFuelUsedL ?? 0) * vehicle.kmPerL),
            kmQuota: Math.round(vehicle.weeklyFuelQuotaL * vehicle.kmPerL),
            fuel: Math.max(0, Math.round(100 - ((used?.weeklyFuelUsedL ?? 0) / vehicle.weeklyFuelQuotaL) * 100)),
          }
        }))
        setDrivers(apiDrivers)
      })
      .catch((error) => {
        console.error("Dispatcher fleet request failed", error)
        setVehicles([])
      })
  }, [today])

  const [manageVehiclesOpen, setManageVehiclesOpen] = useState(false)
  const [deferOpen, setDeferOpen] = useState(false)

  useEffect(() => {
    if (window.location.pathname === "/")
      window.history.replaceState({}, "", "/home")
    const onPopState = () => {
      setPath(getInitialPath())
      setSearch(window.location.search)
      const requested = new URLSearchParams(window.location.search).get("date")
      if (isIsoDate(requested)) setPlanningDate(requested)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const navigate = (nextPath: string) => {
    window.history.pushState({}, "", nextPath)
    setPath(getInitialPath())
    setSearch(window.location.search)
    setToast("")
  }

  // Calendar widget: pick the Route date, then open Route scheduling. Nothing is scheduled here.
  const openRouteDay = (date: string, brand?: ShopType | null) => {
    setPlanningDate(date)
    navigate(`/schedule?date=${date}${brand ? `&brand=${brand}` : ""}`)
  }

  // Calendar "schedule now": the picked orders become the mandatory set of the order-first flow.
  const scheduleNow = (date: string, orderApiIds: string[]) => {
    setPlanningDate(date)
    navigate(`/schedule?mode=due&date=${date}&mandatory=${orderApiIds.join(",")}`)
  }

  const serviceDate = today ?? colomboDate(new Date())
  const prototypeMode = import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === "true"

  const datePlusDays = (date: string, days: number) => {
    const value = new Date(`${date}T00:00:00Z`)
    value.setUTCDate(value.getUTCDate() + days)
    return value.toISOString().slice(0, 10)
  }

  const atMinutes = (date: string, minutes: number) => new Date(new Date(`${date}T00:00:00+05:30`).getTime() + minutes * 60_000)

  // Creates a draft trip and has the backend validate it, so the review sheet can show the
  // real constraint results. Drafts do not lock orders or the vehicle's turn; publishing does.
  // When the engine's route is supplied, the draft carries exactly what the dispatcher sees: the
  // engine's stop sequence, departure, arrival times, trip duration and distance.
  const prepareTrip = async (scheduled: Order[], vehicle: Vehicle, targetDate: string, departureTime: string, route?: RouteResult): Promise<PreparedTrip> => {
    const liveOrders = scheduled.filter((order): order is Order & { apiId: string } => Boolean(order.apiId))
    if (liveOrders.length !== scheduled.length) throw new Error("One or more selected orders are not backed by the planning service.")
    const sequenced = route
      ? route.stops.map((stop) => liveOrders.find((order) => order.apiId === stop.orderId)).filter((order): order is Order & { apiId: string } => Boolean(order))
      : liveOrders
    const departureAt = route?.departureMin != null ? atMinutes(targetDate, route.departureMin) : new Date(`${targetDate}T${departureTime}:00+05:30`)
    const plannedEndAt = new Date(departureAt.getTime() + (route?.tripMinutes ?? (liveOrders.length + 1) * 30) * 60_000)
    const input: TripInput = {
      serviceDate: targetDate,
      departureAt: departureAt.toISOString(),
      plannedEndAt: plannedEndAt.toISOString(),
      vehicleId: vehicle.id,
      distanceKm: route?.distanceKm ?? Math.max(10, liveOrders.length * 12),
      stops: sequenced.map((order, index) => {
        const planned = route?.stops.find((stop) => stop.orderId === order.apiId)?.arrivalMin
        return {
          orderId: order.apiId,
          plannedArrivalAt: (planned != null ? atMinutes(targetDate, planned) : new Date(departureAt.getTime() + (index + 1) * 20 * 60_000)).toISOString(),
        }
      }),
    }
    const draft = await planningApi.createTrip(input)
    const validation = await planningApi.validateTrip(draft._id)
    return { tripId: draft._id, version: validation.version, valid: validation.valid, rules: validation.rules, driverId: draft.driverId }
  }

  const publishPrepared = async (prepared: PreparedTrip) => {
    if (!prepared.valid) {
      const failures = prepared.rules.filter((rule) => !rule.passed).map((rule) => rule.message).join(" ")
      throw new Error(failures || "The route failed planning validation.")
    }
    await planningApi.publishTrip(prepared.tripId, prepared.version)
  }

  const planningService: PlanningService | undefined = prototypeMode ? undefined : {
    prepare: prepareTrip,
    publish: publishPrepared,
    onPublished: (message, scheduled) => onTripPublished(message, scheduled),
  }

  // Called once the backend has published the trip.
  const onTripPublished = (message: string, scheduled: Order[]) => {
    finishSchedule(message, scheduled)
  }

  const finishSchedule = (message: string, scheduled: Order[], day?: number) => {
    window.history.pushState({}, "", "/home")
    setPath("/home")
    setSearch("")
    setToast(message)
    if (!prototypeMode) {
      // Scheduled orders leave the queue because the backend no longer lists them.
      void refreshQueueAndRoutes().catch((error) => setToast(error instanceof Error ? `Scheduled, but the lists could not refresh: ${error.message}` : "Scheduled, but the lists could not refresh."))
      return
    }
    setOrders((prev) => {
      const ids = scheduled.map((o) => o.id)
      const updated = prev.map((o) =>
        ids.includes(o.id) ? { ...o, stop: ids.indexOf(o.id) + 1, dueDay: o.dueDay ?? day } : o,
      )
      const missing = scheduled
        .filter((o) => !prev.some((p) => p.id === o.id))
        .map((o) => ({ ...o, stop: ids.indexOf(o.id) + 1, dueDay: day }))
      return [...updated, ...missing]
    })
  }

  const completeApproval = (message: string) => {
    setApproved(true)
    window.history.pushState({}, "", "/home")
    setPath("/home")
    setToast(message)
  }

  const handleDeferOrders = async (
    selectedIds: string[],
    deferTo: string,
    reasons: string[],
    notice: string,
  ) => {
    const selected = orders.filter((order) => selectedIds.includes(order.id))
    try {
      if (!prototypeMode) {
        const apiIds = selected.map((order) => order.apiId).filter((id): id is string => Boolean(id))
        if (apiIds.length !== selected.length) throw new Error("One or more selected orders are not backed by the planning service.")
        const offset = deferTo.startsWith("Wed") ? 3 : deferTo.startsWith("Tue") ? 2 : 1
        const reasonCode = (reasons[0] ?? "dispatcher_deferral").toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/^_|_$/g, "")
        const results = await planningApi.deferBatch(apiIds, datePlusDays(serviceDate, offset), reasonCode, [reasons.join(", "), notice].filter(Boolean).join(" — "))
        const conflicts = results.filter((result) => result.result === "conflict").length
        if (conflicts) throw new Error(`${conflicts} order${conflicts === 1 ? "" : "s"} changed before deferral. Refresh and try again.`)
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The orders could not be deferred.")
      return
    }
    setOrders((prev) =>
      prev.map((o) =>
        selectedIds.includes(o.id)
          ? {
            ...o,
            deferred: true,
            deferredTo: deferTo,
            deferredNotice: notice,
            dueDay: 28,
          }
          : o,
      ),
    )
    setDeferOpen(false)
    setDueVersion((version) => version + 1)
    setToast(`${selectedIds.length} orders deferred to ${deferTo.split(" · ")[0]}`)
  }

  const handleUpdateVehicles = (updated: Vehicle[]) => {
    setVehicles(updated)
    setManageVehiclesOpen(false)
    setToast("Weekly quota updated")
  }

  return (
    <AppShell navigate={navigate} path={path}>
      {path === "/schedule" &&
        ["immediate", "due"].includes(
          new URLSearchParams(search).get("mode") ?? "",
        ) ? (
        <DueSchedulePage
          dueVersion={dueVersion}
          key={search}
          mandatoryApiIds={(new URLSearchParams(search).get("mandatory") ?? "").split(",").filter(Boolean)}
          onOpenDefer={() => setDeferOpen(true)}
          onOpenManageVehicles={() => setManageVehiclesOpen(true)}
          onOpenNormal={() => navigate("/schedule")}
          orders={orders}
          ordersDate={ordersDate}
          planningDate={planningDate}
          today={today}
          drivers={drivers}
          {...(planningService ? { planning: planningService } : {})}
        />
      ) : path === "/schedule" ? (
        <SchedulePage
          dueVersion={dueVersion}
          key={search}
          onOpenDefer={() => setDeferOpen(true)}
          onOpenManageVehicles={() => setManageVehiclesOpen(true)}
          onPlanningDateChange={setPlanningDate}
          orders={orders}
          ordersDate={ordersDate}
          planningDate={planningDate}
          today={today}
          drivers={drivers}
          {...(planningService ? { planning: planningService } : {})}
        />
      ) : path === "/orders" ? (
        <OrderLogPage
          onOpenOrder={(entry) =>
            openOrderDetails(
              orders.find((o) => o.id === entry.id) ??
              ({
                id: entry.id,
                shop: entry.shop,
                town: entry.town,
                type: entry.type,
                items: entry.items,
                kg: entry.kg,
                emergency: false,
                inReach: true,
                suggested: false,
                dueDay: entry.day,
                stop: entry.stop === "—" ? undefined : Number(entry.stop),
                deferred: entry.status === "Deferred",
              } as Order),
            )
          }
          orders={orders}
        />
      ) : path.startsWith("/monitor/") ? (
        <MonitorPage key={path} onApprove={completeApproval} />
      ) : (
        <HomePage
          approved={approved}
          filter={homeFilter}
          navigate={navigate}
          orders={orders}
          routes={routes}
          completedRoutes={completedRoutes}
          openDay={openRouteDay}
          scheduleNow={scheduleNow}
          setFilter={setHomeFilter}
          synced={serverClock.synced}
          toast={toast}
          today={today}
          dueVersion={dueVersion}
          offsetMs={serverClock.offsetMs}
        />
      )}

      {/* Global Modals for Defer & Manage Vehicles */}
      {deferOpen ? (
        <DeferModal
          onClose={() => setDeferOpen(false)}
          onDefer={handleDeferOrders}
          orders={orders.filter((o) => !o.deferred)}
        />
      ) : null}

      {manageVehiclesOpen ? (
        <ManageVehiclesModal
          dailyTurnLimit={DAILY_TURN_LIMIT}
          turnsToday={Object.fromEntries(vehicles.map((v) => [v.id, vehicleDay(v).turnsToday]))}
          volumes={Object.fromEntries(vehicles.map((v) => [v.id, vehicleDay(v).volumeM3]))}
          onClose={() => setManageVehiclesOpen(false)}
          onSubmit={handleUpdateVehicles}
          vehicles={vehicles}
        />
      ) : null}

      {/* Store order details — opened by clicking any order */}
      {detailOrder ? (
        <OrderDetailsModal
          key={detailOrder.id}
          notice={orderNotices[detailOrder.id]}
          onClose={() => setDetailOrder(null)}
          onSaveNotice={(text: string, shareWithCrew: boolean) => {
            setOrderNotices((prev) => ({
              ...prev,
              [detailOrder.id]: { text, shareWithCrew },
            }))
            setToast(`Notice saved for ${detailOrder.id}`)
          }}
          order={orders.find((o) => o.id === detailOrder.id) ?? detailOrder}
        />
      ) : null}
    </AppShell>
  )
}

export default App;
