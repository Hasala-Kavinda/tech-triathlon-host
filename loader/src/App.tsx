import { useState } from "react"
import { initialLoadCases, initialStops } from "./data/mock-data"
import type { ActiveStop, LoadCase } from "./data/mock-data"
import ActiveLoadPage from "./pages/ActiveLoadPage"
import AvailableWorkPage from "./pages/AvailableWorkPage"
import LoadConfirmedPage from "./pages/LoadConfirmedPage"
import ReconciliationPage from "./pages/ReconciliationPage"

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
  const [stops, setStops] = useState<ActiveStop[]>(initialStops)

  /**
   * Load cases — authoritative list of loads and their states.
   * Lifted to App so state persists when returning to Available Work.
   */
  const [loadCases, setLoadCases] = useState<LoadCase[]>(initialLoadCases)

  /**
   * Currently active vehicle that is being loaded.
   */
  const [activeVehicle, setActiveVehicle] = useState<string | null>(null)

  const activeLoad = loadCases.find((lc) => lc.vehicle === activeVehicle)

  // ── View rendering ───────────────────────────────────────────────────────

  if (view === "available") {
    return (
      <AvailableWorkPage
        loadCases={loadCases}
        setLoadCases={setLoadCases}
        onOpenLoad={(vehicle) => {
          setActiveVehicle(vehicle)
          setView("active-load")
        }}
      />
    )
  }

  if (view === "active-load") {
    return (
      <ActiveLoadPage
        onBack={() => setView("available")}
        onLoadingAccounted={() => setView("reconciliation")}
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
      />
    )
  }

  if (view === "reconciliation") {
    return (
      <ReconciliationPage
        stops={stops}
        onBack={() => setView("active-load")}
        onConfirmed={() => setView("confirmed")}
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
