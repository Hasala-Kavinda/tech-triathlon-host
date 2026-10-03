import { useEffect, useState } from "react"
import type { ActiveStop, LoadCase } from "./data/mock-data"
import ActiveLoadPage from "./pages/ActiveLoadPage"
import AvailableWorkPage from "./pages/AvailableWorkPage"
import LoadConfirmedPage from "./pages/LoadConfirmedPage"
import ReconciliationPage from "./pages/ReconciliationPage"
import { loadApi, type LoadRecord } from "./api/loads"
import type { LoadItemData, LoadItemException } from "./components/loader-ui"

// ── Workflow view type ───────────────────────────────────────────────────────

type LoaderView = "available" | "active-load" | "reconciliation" | "confirmed"

// ── Prototype URL overrides ──────────────────────────────────────────────────

const requestedView = new URLSearchParams(window.location.search).get("view")
const forceOffline = requestedView === "offline"
const forceEmpty = requestedView === "empty"

function resolveInitialView(): LoaderView {
  if (requestedView === "active-load") return "active-load"
  if (requestedView === "reconciliation") return "reconciliation"
  if (requestedView === "confirmed") return "confirmed"
  return "available"
}

// ── Application shell ────────────────────────────────────────────────────────

export default function App() {
  /**
   * Workflow view — drives which page is rendered.
   * This is the only router in the application.
   */
  const [view, setView] = useState<LoaderView>(resolveInitialView())

  /**
   * Active load stops — owned at the application level so that exception
   * state, item statuses, and quantities survive the transition from
   * ActiveLoadPage → ReconciliationPage → LoadConfirmedPage.
   */
  const [stops, setStops] = useState<ActiveStop[]>([])

  /**
   * Load cases — authoritative list of loads and their states.
   * Lifted to App so state persists when returning to Available Work.
   */
  const [loadCases, setLoadCases] = useState<LoadCase[]>([])

  /**
   * Currently active vehicle that is being loaded.
   */
  const [activeVehicle, setActiveVehicle] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void loadApi.list().then((rows) => {
      if (!active) return
      setLoadCases(rows.map((record) => ({
        tripId: record.tripId,
        version: record.version,
        departure: record.trip ? new Date(record.trip.departureAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
        items: record.items.length,
        priority: "normal",
        route: record.trip?.tripNumber ?? record.tripId,
        state: record.status === "available" ? "available" : record.status === "claimed" || record.status === "loading" || record.status === "reconciled" ? "claimed" : "completed",
        stops: record.trip?.stops.length ?? new Set(record.items.map((item) => item.stopId)).size,
        vehicle: record.trip?.vehicleId ?? "Unassigned",
        weight: `${record.items.reduce((sum, item) => sum + item.expectedQuantity, 0)} units`,
        timing: { receivedAt: Date.now(), departureAt: record.trip ? new Date(record.trip.departureAt).getTime() : Date.now() },
      })))
    }).catch((error) => {
      console.error("Load jobs request failed", error)
      setLoadCases([])
    })
    return () => { active = false }
  }, [])

  function applyManifest(record: LoadRecord) {
    const stopMeta = new Map(record.trip?.stops.map((stop) => [stop.stopId, stop]) ?? [])
    const grouped = new Map<string, LoadRecord["items"]>()
    for (const item of record.items) grouped.set(item.stopId, [...(grouped.get(item.stopId) ?? []), item])
    setStops([...grouped.entries()].map(([stopId, items]) => ({
      stopNumber: stopMeta.get(stopId)?.sequence ?? 0,
      outlet: stopMeta.get(stopId)?.outletId ?? stopId,
      deliveryWindow: "Server planned",
      orderId: String(items[0]?.orderId ?? ""),
      items: items.map((item) => ({ id: item.itemId, name: item.name, quantity: String(item.expectedQuantity), status: item.status === "pending" ? "pending" : item.status === "loaded" ? "loaded" : "flagged" })),
    })).sort((a, b) => b.stopNumber - a.stopNumber))
  }

  const activeLoad = loadCases.find((lc) => lc.vehicle === activeVehicle)

  function setActiveVersion(version: number) {
    if (!activeLoad?.tripId) return
    setLoadCases((current) => current.map((item) => item.tripId === activeLoad.tripId ? { ...item, version } : item))
  }

  async function updateLoadedItem(item: LoadItemData) {
    if (!activeLoad?.tripId || activeLoad.version === undefined) return
    const expectedQuantity = Number.parseInt(item.quantity, 10)
    const record = await loadApi.updateItem(activeLoad.tripId, item.id, activeLoad.version, "loaded", expectedQuantity)
    setActiveVersion(record.version)
  }

  async function updateException(item: LoadItemData, exception: LoadItemException) {
    if (!activeLoad?.tripId || activeLoad.version === undefined) return
    const record = await loadApi.exception(activeLoad.tripId, item.id, activeLoad.version, {
      type: exception.type,
      quantity: exception.affectedQuantity,
      reasonCode: exception.reason.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/^_|_$/g, ""),
      note: exception.note,
    })
    setActiveVersion(record.version)
  }

  // ── View rendering ───────────────────────────────────────────────────────

  if (view === "available") {
    return (
      <AvailableWorkPage
        loadCases={loadCases}
        setLoadCases={setLoadCases}
        onOpenLoad={(vehicle) => {
          const selected = loadCases.find((loadCase) => loadCase.vehicle === vehicle)
          setActiveVehicle(vehicle)
          if (selected?.tripId && selected.version !== undefined) {
            void loadApi.start(selected.tripId, selected.version).then(async (record) => {
              const detail = await loadApi.detail(selected.tripId!)
              applyManifest({ ...detail, version: record.version })
              setLoadCases((current) => current.map((item) => item.tripId === selected.tripId ? { ...item, version: record.version, state: "claimed" } : item))
              setView("active-load")
            }).catch((error) => console.error("Unable to start loading", error))
          } else setView("active-load")
        }}
      />
    )
  }

  if (view === "active-load") {
    return (
      <ActiveLoadPage
        onBack={() => setView("available")}
        onLoadingAccounted={() => {
          if (!activeLoad?.tripId || activeLoad.version === undefined) {
            setView("reconciliation")
            return
          }
          void loadApi.reconcile(activeLoad.tripId, activeLoad.version).then(({ record }) => {
            setActiveVersion(record.version)
            setView("reconciliation")
          }).catch((error) => console.error("Unable to reconcile load", error))
        }}
        onLoadCompleted={(completionTime) => {
          if (activeLoad && activeLoad.timing.finalVariance === undefined) {
            setLoadCases((current) =>
              current.map((lc) =>
                lc.vehicle === activeVehicle
                  ? {
                      ...lc,
                      timing: {
                        ...lc.timing,
                        finalVariance: lc.timing.departureAt - completionTime,
                      },
                    }
                  : lc
              )
            )
          }
        }}
        stops={stops}
        onStopsChange={setStops}
        activeLoad={activeLoad}
        onMarkItemLoaded={updateLoadedItem}
        onSaveException={updateException}
      />
    )
  }

  if (view === "reconciliation") {
    return (
      <ReconciliationPage
        stops={stops}
        onBack={() => setView("active-load")}
        onConfirmed={async () => {
          if (!activeLoad?.tripId || activeLoad.version === undefined) {
            setView("confirmed")
            return
          }
          try {
            const record = await loadApi.confirm(activeLoad.tripId, activeLoad.version)
            setActiveVersion(record.version)
            setView("confirmed")
          } catch (error) {
            console.error("Unable to confirm load", error)
          }
        }}
        activeLoad={activeLoad}
      />
    )
  }

  // view === "confirmed"
  return (
    <LoadConfirmedPage
      stops={stops}
      onBackToWork={() => {
        if (activeVehicle) {
          setLoadCases((current) =>
            current.map((lc) =>
              lc.vehicle === activeVehicle
                ? { ...lc, state: "completed" }
                : lc
            )
          )
        }
        setActiveVehicle(null)
        setView("available")
      }}
      activeLoad={activeLoad}
    />
  )
}
