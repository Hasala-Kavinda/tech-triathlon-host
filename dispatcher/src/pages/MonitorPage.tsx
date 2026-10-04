import { Check, CheckCircle2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { monitorApi, type MonitorStop, type TripMonitor } from "../api/monitor"
import { planningApi, type FleetVehicle } from "../api/planning"
import { DriverHoverCard } from "../components/DriverHoverCard"
import { PersonBadge } from "../components/planning/PersonBadge"
import { VehicleGraphic } from "../components/planning/VehicleGraphic"
import { RemarksModal } from "../components/RemarksModal"
import { RouteSummaryModal } from "../components/RouteSummaryModal"
import { Button, PageTitle, ProgressBar } from "../components/ui"
import { routeLabel, type RouteLabel } from "../lib/routeLabel"
import type { Person, Vehicle } from "../types/dispatcher"

const POLL_MS = 15_000
const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" }) : "–")
const STATUS_TEXT: Record<string, string> = { published: "Published · not loaded yet", loading: "Loading at depot", load_confirmed: "Loaded · awaiting driver", claimed: "Claimed by driver", in_transit: "In progress", completed: "Completed", cancelled: "Cancelled" }

const asPerson = (contact: { id: string; name: string; role: string; phoneE164: string | null }, shop?: string): Person => ({
  id: contact.id,
  name: contact.name,
  role: contact.role === "store_manager" ? "Stock manager" : contact.role === "loader" ? "Loader" : "Driver",
  phone: contact.phoneE164 ?? "",
  ...(shop ? { shop } : {}),
})

function asVehicle(fleet: FleetVehicle | undefined, vehicleId: string): Vehicle {
  const refrigerated = Boolean(fleet && /chill|cold|fridge|refrig|frozen/i.test(fleet.temperatureClass))
  return {
    id: vehicleId,
    type: refrigerated ? "Refrigerated" : fleet && /van/i.test(fleet.type) ? "Van" : "Lorry",
    capacityKg: fleet?.weightCapacityKg ?? 2000,
    length: "",
    turns: 0, turnQuota: 0, km: 0, kmQuota: 0, fuel: 0,
  }
}

function StopRow({ stop, next }: { stop: MonitorStop; next: boolean }) {
  const visited = stop.state === "arrived" || stop.state === "delivered" || stop.state === "failed"
  const done = stop.state === "delivered" || stop.state === "failed"
  const actual = stop.arrivedAt ?? null
  return (
    <div className={`stop-row ${visited ? "stop-row--visited" : ""}`}>
      <span className="stop-row__marker">
        {visited ? <Check aria-hidden="true" size={22} /> : <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--cobalt-500)" }} />}
      </span>
      <span className="stop-row__shop">
        <strong>{stop.outletName}</strong>
        <span>{stop.district ?? stop.outletId}</span>
      </span>
      <span className="stop-row__time">
        <b style={{ color: visited ? "var(--emerald-700)" : "var(--cobalt-500)" }}>{clock(actual ?? stop.plannedArrivalAt)}</b>
        <small style={{ display: "block", fontSize: 11, color: "var(--text-secondary)" }}>
          {actual ? `arrived${stop.timingResult === "late" ? " · late" : ""}` : "est. arrival"}
          {done && stop.state === "failed" ? " · not delivered" : ""}
        </small>
      </span>
      <span className="stop-row__manager">
        {stop.manager ? <PersonBadge person={asPerson(stop.manager, stop.outletName)} size="small" /> : <span className="mute">No stock manager on file</span>}
        {next ? (
          <span style={{ padding: "3px 10px", borderRadius: 999, background: "var(--cobalt-50)", color: "var(--cobalt-500)", fontWeight: 700, fontSize: 12 }}>Next stop</span>
        ) : null}
      </span>
    </div>
  )
}

/**
 * Route monitoring for one real trip. A single layout serves planned, in-progress and completed routes:
 * live-only parts (position, next stop, Accept) simply show their "no live data" / finished state.
 */
export default function MonitorPage({ onApprove }: { onApprove?: (message: string) => void; drivers?: unknown }) {
  const tripId = window.location.pathname.split("/")[2] ?? ""
  const [monitor, setMonitor] = useState<TripMonitor | null>(null)
  const [label, setLabel] = useState<RouteLabel | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [remarksOpen, setRemarksOpen] = useState(new URLSearchParams(window.location.search).get("remarks") === "open")
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const load = useCallback(async () => {
    try {
      setMonitor(await monitorApi.trip(tripId))
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The route could not be loaded.")
    }
  }, [tripId])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!monitor || monitor.trip.status === "completed") return
    const timer = window.setInterval(() => void load(), POLL_MS)
    return () => window.clearInterval(timer)
  }, [monitor?.trip.status, load])

  // Route label and vehicle come from reference data for the trip's service date (fetched once the trip is known).
  const serviceDate = monitor?.trip.serviceDate
  const vehicleId = monitor?.trip.vehicleId
  const stopIds = monitor?.stops.map((stop) => stop.outletId).join(",")
  useEffect(() => {
    if (!monitor || !serviceDate) return
    let cancelled = false
    void Promise.all([planningApi.engineContext(serviceDate), planningApi.trips(serviceDate), planningApi.vehicles(serviceDate)])
      .then(([context, sameDay, fleet]) => {
        if (cancelled) return
        const districts = new Map(context.outlets.map((outlet) => [outlet.outletId, outlet.district]))
        setLabel(routeLabel({ tripNumber: monitor.trip.tripNumber, depot: monitor.trip.depot, serviceDate, stops: monitor.stops.map((stop) => ({ outletId: stop.outletId })) }, (id) => districts.get(id), sameDay))
        setVehicle(asVehicle(fleet.find((candidate) => candidate.vehicleId === vehicleId), vehicleId!))
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [serviceDate, vehicleId, stopIds]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !monitor) return <section className="page page-enter monitor-page"><PageTitle>Route monitoring</PageTitle><p role="alert" style={{ color: "var(--critical-500)" }}>{error}</p></section>
  if (!monitor) return <section className="page page-enter monitor-page"><PageTitle>Route monitoring</PageTitle><p className="mute">Loading route…</p></section>

  const { trip, stops, progress, crew, tracking, remarks, pendingRemarks } = monitor
  const completed = trip.status === "completed"
  const allReviewed = pendingRemarks === 0
  const accepted = Boolean(trip.acceptedAt)
  const title = label?.title ?? trip.tripNumber
  const reviewedCount = remarks.length - pendingRemarks
  const nextStop = stops.find((stop) => stop.tripStopId === progress.nextTripStopId)
  const late = stops.some((stop) => stop.timingResult === "late")

  const accept = async () => {
    setAccepting(true)
    try {
      await monitorApi.accept(trip.id)
      await load()
      onApprove?.(`Route ${trip.vehicleId} accepted`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The route could not be accepted.")
      await load()
    } finally {
      setAccepting(false)
    }
  }

  return (
    <section className="page page-enter monitor-page">
      <div className="page-heading">
        <div><PageTitle>Route monitoring</PageTitle></div>
        <div className="page-heading__meta">
          {completed ? "Completed route" : <span style={{ color: "var(--navy-900)", fontWeight: 600 }}>{STATUS_TEXT[trip.status] ?? trip.status.replaceAll("_", " ")}</span>}
        </div>
      </div>
      {error ? <p role="alert" style={{ color: "var(--critical-500)" }}>{error}</p> : null}

      <div className="workspace-card monitor-workspace">
        <section className="monitor-route">
          <div className="monitor-route__heading">
            {vehicle ? <VehicleGraphic vehicle={vehicle} /> : null}
            <div>
              <strong className="monitor-route__id">{trip.vehicleId}</strong>
              <span>Route: {title}</span>
              <small className="data-text" style={{ display: "block" }}>{trip.tripNumber} · {trip.serviceDate}</small>
            </div>
          </div>

          <div className={`stop-timeline ${completed ? "stop-timeline--completed" : ""}`}>
            <div className="stop-timeline__head"><span>Shop</span><span>Time</span><span>Stock manager</span></div>
            {stops.map((stop) => <StopRow key={stop.tripStopId} next={stop.tripStopId === progress.nextTripStopId} stop={stop} />)}
          </div>

          <div style={{ marginTop: 28 }}>
            <Button disabled={!completed} onClick={() => setSummaryOpen(true)} variant={completed ? "primary" : "secondary"}>
              📖 Route summary {completed ? "" : "· after the route finishes"}
            </Button>
          </div>
        </section>

        <section className="monitor-details">
          <div className="route-status">
            <div className="route-status__top">
              <strong>Route status</strong>
              <span className={completed ? "route-status__done" : ""}>{completed ? "✓ Done" : STATUS_TEXT[trip.status] ?? trip.status}</span>
            </div>
            <div className="route-status__metric">
              <strong className="data-text">{progress.done}/{progress.total}</strong>
              <b>shops covered</b>
            </div>
            <div style={{ margin: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span>{trip.startedAt ? `Started ${clock(trip.startedAt)}` : `Departs ${clock(trip.departureAt)}`}</span>
                <span>{completed ? `Ended ${clock(trip.completedAt)}` : `Est. end ${clock(trip.plannedEndAt)}`}</span>
              </div>
              <span className={completed ? "completed-progress" : ""}>
                <ProgressBar value={progress.total ? (progress.done / progress.total) * 100 : 0} />
              </span>
            </div>
            <p>
              {completed ? (
                <span style={{ color: "var(--emerald-700)", fontWeight: 600 }}>
                  Finished {clock(trip.completedAt)} · {progress.done} of {progress.total} shops covered{late ? " · some arrivals late" : ""}
                </span>
              ) : nextStop ? (
                <span>Next stop {nextStop.outletName} at {clock(nextStop.plannedArrivalAt)}</span>
              ) : (
                <span>No stop in progress</span>
              )}
            </p>
          </div>

          <div className="crew-panel">
            <strong>Crew</strong>
            <div className="crew-list">
              <DriverHoverCard driver={crew.driver} stops={stops} tracking={tracking} vehicleId={trip.vehicleId} />
              {crew.loaders.map((loader) => <PersonBadge key={loader.id} person={asPerson(loader)} showRole size="large" />)}
              {crew.loaders.length === 0 ? <span className="mute" style={{ fontSize: 12 }}>No loader has claimed this load yet</span> : null}
            </div>
          </div>

          <div className="remarks-bar" onClick={() => setRemarksOpen(true)} style={{ cursor: "pointer", marginTop: 14 }}>
            <strong>Remarks <span>{remarks.length}</span></strong>
            <span>
              {remarks.length === 0 ? "none raised" : pendingRemarks === 0 ? <span style={{ color: "var(--emerald-700)" }}>{reviewedCount} of {remarks.length} reviewed</span> : `${reviewedCount} of ${remarks.length} reviewed · ${pendingRemarks} new`}
            </span>
            <span style={{ color: "var(--cobalt-500)", fontWeight: 700, marginLeft: 12 }}>{remarks.length === 0 ? "" : pendingRemarks === 0 ? "View →" : "Review →"}</span>
          </div>

          {accepted ? (
            <div className="approved-stamp"><CheckCircle2 aria-hidden="true" size={22} /><span>Accepted · {clock(trip.acceptedAt)}</span></div>
          ) : (
            <Button className="approve-button" disabled={!allReviewed || accepting} onClick={() => void accept()} variant={allReviewed ? "confirm" : "secondary"}>
              {allReviewed ? "✓ Accept route" : `Accept route · ${pendingRemarks} remark${pendingRemarks === 1 ? "" : "s"} to review`}
            </Button>
          )}
        </section>
      </div>

      {remarksOpen ? <RemarksModal driver={crew.driver} onChanged={load} onClose={() => setRemarksOpen(false)} recipients={monitor.recipients} remarks={remarks} tripId={trip.id} vehicleId={trip.vehicleId} /> : null}
      {summaryOpen ? <RouteSummaryModal monitor={monitor} onClose={() => setSummaryOpen(false)} route={title} /> : null}
    </section>
  )
}
