import { useEffect, useState } from "react"
import { planningApi, type DriverReference, type TripInput } from "./api/planning"
import { DeferModal } from "./components/DeferModal"
import { AppShell } from './components/layout/AppShell'
import { ManageVehiclesModal } from "./components/ManageVehiclesModal"
import { OrderDetailsModal } from "./components/OrderDetailsModal"
import { OrderLogPage } from "./components/OrderLogPage"
import { openOrderDetails, vehicleDay } from "./components/planning/helpers"
import { DAILY_TURN_LIMIT, initialOrders, initialRemarks, initialRoutes, initialVehicles, OPEN_ORDER_EVENT, TODAY } from "./lib/constants"
import DueSchedulePage from "./pages/DueSchedulePage"
import HomePage from "./pages/HomePage"
import MonitorPage from "./pages/MonitorPage"
import SchedulePage from "./pages/SchedulePage"
import type { Order, Remark, RouteRecord, ShopType, Vehicle } from "./types/dispatcher"

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
  const [viewDate, setViewDate] = useState(() =>
    new URLSearchParams(window.location.search).get("date") ? 28 : 27,
  )

  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles)
  const [drivers, setDrivers] = useState<DriverReference[]>([])
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [routes, setRoutes] = useState<RouteRecord[]>(initialRoutes)
  const [remarks, setRemarks] = useState<Remark[]>(initialRemarks)

  useEffect(() => {
    if (import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === "true") return
    const serviceDate = import.meta.env.VITE_SERVICE_DATE ?? new Date().toISOString().slice(0, 10)
    void Promise.all([planningApi.orders(serviceDate), planningApi.vehicles(serviceDate), planningApi.drivers()])
      .then(([apiOrders, apiVehicles, apiDrivers]) => {
        setOrders(apiOrders.map((order) => ({
          apiId: order._id,
          id: order.orderNumber,
          shop: order.outletId,
          town: order.outletId,
          type: order.brand,
          items: `${order.items.reduce((sum, item) => sum + item.quantity, 0)} units`,
          kg: order.totalWeightKg,
          emergency: order.cutoffBucket === "after_cutoff",
          inReach: true,
          suggested: true,
        })))
        setVehicles(apiVehicles.map((vehicle) => ({
          id: vehicle.vehicleId,
          type: vehicle.temperatureClass === "reefer" ? "Refrigerated" : vehicle.type.toLowerCase() === "van" ? "Van" : "Lorry",
          capacityKg: vehicle.weightCapacityKg,
          length: "Reference fleet",
          turns: 0,
          turnQuota: 2,
          km: 0,
          kmQuota: Math.round(vehicle.weeklyFuelQuotaL * vehicle.kmPerL),
          fuel: 100,
        })))
        setDrivers(apiDrivers)
      })
      .catch((error) => {
        console.error("Dispatcher planning data request failed", error)
        setOrders([])
        setVehicles([])
      })
  }, [])

  const [manageVehiclesOpen, setManageVehiclesOpen] = useState(false)
  const [deferOpen, setDeferOpen] = useState(false)

  useEffect(() => {
    if (window.location.pathname === "/")
      window.history.replaceState({}, "", "/home")
    const onPopState = () => {
      setPath(getInitialPath())
      setSearch(window.location.search)
      setViewDate(
        new URLSearchParams(window.location.search).get("date") ? 28 : 27,
      )
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

  const serviceDate = import.meta.env.VITE_SERVICE_DATE ?? new Date().toISOString().slice(0, 10)
  const prototypeMode = import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === "true"

  const datePlusDays = (date: string, days: number) => {
    const value = new Date(`${date}T00:00:00Z`)
    value.setUTCDate(value.getUTCDate() + days)
    return value.toISOString().slice(0, 10)
  }

  const publishSchedule = async (scheduled: Order[], vehicle: Vehicle, targetDate: string, departureTime: string) => {
    if (prototypeMode) return
    const liveOrders = scheduled.filter((order): order is Order & { apiId: string } => Boolean(order.apiId))
    if (liveOrders.length !== scheduled.length) throw new Error("One or more selected orders are not backed by the planning service.")
    const driver = drivers[0]
    if (!driver) throw new Error("No active Driver is available for this route.")
    const departureAt = new Date(`${targetDate}T${departureTime}:00+05:30`)
    const input: TripInput = {
      serviceDate: targetDate,
      departureAt: departureAt.toISOString(),
      plannedEndAt: new Date(departureAt.getTime() + (liveOrders.length + 1) * 30 * 60_000).toISOString(),
      vehicleId: vehicle.id,
      driverId: driver._id,
      distanceKm: Math.max(10, liveOrders.length * 12),
      stops: liveOrders.map((order, index) => ({
        orderId: order.apiId,
        plannedArrivalAt: new Date(departureAt.getTime() + (index + 1) * 20 * 60_000).toISOString(),
      })),
    }
    const draft = await planningApi.createTrip(input)
    const validation = await planningApi.validateTrip(draft._id)
    if (!validation.valid) {
      const failures = validation.rules.filter((rule) => !rule.passed).map((rule) => rule.message).join(" ")
      throw new Error(failures || "The route failed planning validation.")
    }
    await planningApi.publishTrip(draft._id, validation.version)
  }

  const finishSchedule = (message: string, scheduled: Order[], day?: number) => {
    window.history.pushState({}, "", "/home")
    setPath("/home")
    setSearch("")
    setToast(message)
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

  const completeSchedule = async (message: string, scheduled: Order[], vehicle: Vehicle, routeDate: string, departureTime: string) => {
    try {
      const targetDate = routeDate.includes("28") ? datePlusDays(serviceDate, 1) : serviceDate
      await publishSchedule(scheduled, vehicle, targetDate, departureTime)
      finishSchedule(message, scheduled)
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The route could not be published.")
    }
  }

  const completeImmediate = async (message: string, scheduled: Order[], day: number, vehicle: Vehicle, departureTime: string) => {
    try {
      const targetDate = datePlusDays(serviceDate, Math.max(0, day - TODAY))
      await publishSchedule(scheduled, vehicle, targetDate, departureTime)
      finishSchedule(message, scheduled, day)
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The route could not be published.")
    }
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
          day={
            new URLSearchParams(search).get("mode") === "immediate"
              ? 27
              : Number(
                (new URLSearchParams(search).get("date") ?? "2026-09-27").slice(8, 10),
              ) || 27
          }
          key={search}
          onOpenDefer={() => setDeferOpen(true)}
          onOpenManageVehicles={() => setManageVehiclesOpen(true)}
          onOpenNormal={() => navigate("/schedule")}
          onScheduled={completeImmediate}
          orders={orders}
          vehicles={vehicles}
        />
      ) : path === "/schedule" ? (
        <SchedulePage
          key={search}
          navigateHome={completeSchedule}
          onOpenDefer={() => setDeferOpen(true)}
          onOpenManageVehicles={() => setManageVehiclesOpen(true)}
          orders={orders}
          setOrders={setOrders}
          setVehicles={setVehicles}
          vehicles={vehicles}
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
        <MonitorPage
          onApprove={completeApproval}
          remarks={remarks}
          setRemarks={setRemarks}
        />
      ) : (
        <HomePage
          approved={approved}
          filter={homeFilter}
          navigate={navigate}
          orders={orders}
          routes={routes}
          setFilter={setHomeFilter}
          setViewDate={setViewDate}
          toast={toast}
          viewDate={viewDate}
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
