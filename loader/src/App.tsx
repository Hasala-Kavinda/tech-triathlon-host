import { useCallback, useEffect, useState } from "react"
import { loadApi } from "./api/loads"
import { readSession } from "./auth/session"
import { addDays, colomboDate, toActiveStops, toLoadCase } from "./lib/loadJobs"
import ActiveLoadPage from "./pages/ActiveLoadPage"
import AvailableWorkPage from "./pages/AvailableWorkPage"
import LoadConfirmedPage from "./pages/LoadConfirmedPage"
import ReconciliationPage from "./pages/ReconciliationPage"
import type { ActiveStop, LoadCase, LoadItemData, LoadItemException } from "./types/loader"

// ── Workflow view type ───────────────────────────────────────────────────────

type LoaderView = "available" | "active-load" | "reconciliation" | "confirmed"

export type JobsStatus = "loading" | "ready" | "error"

const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback)

// ── Application shell ────────────────────────────────────────────────────────

export default function App() {
  /**
   * Workflow view — drives which page is rendered.
   * This is the only router in the application.
   */
  const [view, setView] = useState<LoaderView>("available")

  /**
   * Stops (and their items) of the load that is open. Owned here so exception state, item
   * statuses and quantities survive ActiveLoadPage → ReconciliationPage → LoadConfirmedPage.
   * It is filled from the backend when a load is opened.
   */
  const [stops, setStops] = useState<ActiveStop[]>([])

  /** The Loader's depot's load jobs for today and tomorrow, as returned by the backend. */
  const [loadCases, setLoadCases] = useState<LoadCase[]>([])
  const [jobsStatus, setJobsStatus] = useState<JobsStatus>("loading")
  const [jobsError, setJobsError] = useState("")
  /** A problem opening or claiming a job (for example another loader claimed it first). */
  const [actionError, setActionError] = useState("")
  const [opening, setOpening] = useState<string | null>(null)

  /** The load that is being worked on. */
  const [activeTripId, setActiveTripId] = useState<string | null>(null)
  const activeLoad = loadCases.find((loadCase) => loadCase.tripId === activeTripId)

  const refresh = useCallback(async () => {
    setJobsStatus((current) => (current === "ready" ? current : "loading"))
    try {
      const today = colomboDate(new Date())
      const lists = await Promise.all([today, addDays(today, 1)].map((day) => loadApi.list(day)))
      const myUserId = readSession()?.user.id
      const records = lists.flat()
      records.sort((a, b) => Date.parse(a.trip?.departureAt ?? a.createdAt) - Date.parse(b.trip?.departureAt ?? b.createdAt))
      setLoadCases(records.map((record) => toLoadCase(record, myUserId)))
      setJobsError("")
      setJobsStatus("ready")
    } catch (error) {
      console.error("Load jobs request failed", error)
      setJobsError(messageOf(error, "The load jobs could not be loaded."))
      setJobsStatus("error")
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function claimLoad(loadCase: LoadCase) {
    setActionError("")
    setLoadCases((current) => current.map((item) => item.tripId === loadCase.tripId ? { ...item, state: "claiming" } : item))
    try {
      await loadApi.claim(loadCase.tripId, loadCase.version)
    } catch (error) {
      // The claim is a compare-and-set on the server: the backend says so if another loader won.
      setActionError(messageOf(error, "The load could not be claimed."))
    }
    // Always show the server's truth: claimed by you, or already assigned to someone else.
    await refresh()
  }

  async function openLoad(tripId: string) {
    const selected = loadCases.find((loadCase) => loadCase.tripId === tripId)
    if (!selected) return
    setActionError("")
    setOpening(tripId)
    try {
      // A freshly claimed job starts loading when it is opened; one that is already loading
      // (or reconciled) is simply reopened where the loader left off.
      if (selected.recordStatus === "claimed") await loadApi.start(selected.tripId, selected.version)
      const detail = await loadApi.detail(tripId)
      setStops(toActiveStops(detail))
      setLoadCases((current) => current.map((item) => item.tripId === tripId ? { ...item, version: detail.version, recordStatus: detail.status } : item))
      setActiveTripId(tripId)
      setView(detail.status === "reconciled" ? "reconciliation" : detail.status === "confirmed" ? "confirmed" : "active-load")
    } catch (error) {
      setActionError(messageOf(error, "The load could not be opened."))
      void refresh()
    } finally {
      setOpening(null)
    }
  }

  function setActiveVersion(version: number) {
    if (!activeTripId) return
    setLoadCases((current) => current.map((item) => item.tripId === activeTripId ? { ...item, version } : item))
  }

  async function updateLoadedItem(item: LoadItemData) {
    if (!activeLoad) return
    const expectedQuantity = Number.parseInt(item.quantity, 10)
    const record = await loadApi.updateItem(activeLoad.tripId, item.id, activeLoad.version, "loaded", expectedQuantity)
    setActiveVersion(record.version)
  }

  async function updateException(item: LoadItemData, exception: LoadItemException) {
    if (!activeLoad) return
    const record = await loadApi.exception(activeLoad.tripId, item.id, activeLoad.version, {
      type: exception.type,
      quantity: exception.affectedQuantity,
      reasonCode: exception.reason.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/^_|_$/g, ""),
      note: exception.note,
    })
    setActiveVersion(record.version)
  }

  function backToWork() {
    setActiveTripId(null)
    setStops([])
    setView("available")
    void refresh()
  }

  // ── View rendering ───────────────────────────────────────────────────────

  if (view === "available") {
    return (
      <AvailableWorkPage
        loadCases={loadCases}
        status={jobsStatus}
        error={jobsError}
        actionError={actionError}
        opening={opening}
        onRefresh={refresh}
        onClaim={claimLoad}
        onOpenLoad={(tripId) => void openLoad(tripId)}
      />
    )
  }

  if (view === "active-load") {
    return (
      <ActiveLoadPage
        onBack={backToWork}
        onLoadingAccounted={() => {
          if (!activeLoad) return
          void loadApi.reconcile(activeLoad.tripId, activeLoad.version).then(({ record }) => {
            setActiveVersion(record.version)
            setView("reconciliation")
          }).catch((error) => console.error("Unable to reconcile load", error))
        }}
        onLoadCompleted={(completionTime) => {
          if (activeLoad && activeLoad.timing.finalVariance === undefined) {
            setLoadCases((current) =>
              current.map((lc) =>
                lc.tripId === activeTripId
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
          if (!activeLoad) return
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
      onBackToWork={backToWork}
      activeLoad={activeLoad}
    />
  )
}
