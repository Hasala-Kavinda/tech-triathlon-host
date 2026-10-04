import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { planningApi, type DriverReference, type TripSummary } from "../api/planning";
import { PageTitle, ProgressBar } from "../components/ui";
import { routeLabel, type RouteLabel } from "../lib/routeLabel";

type Loaded = { trip: TripSummary & { driverId?: string }; label: RouteLabel; districts: Map<string, string> }
const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" }) : "–")

/** Route monitoring for one real trip. Everything is read from the backend for the selected trip id. */
export default function MonitorLive({ tripId, drivers }: { tripId: string; drivers: DriverReference[] }) {
  const [state, setState] = useState<{ status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & Loaded)>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    setState({ status: "loading" }) // never show the previously selected route while the next one loads
    void (async () => {
      const trip = await planningApi.tripDetail(tripId)
      const [usage, sameDay] = await Promise.all([planningApi.engineContext(trip.serviceDate), planningApi.trips(trip.serviceDate)])
      const districts = new Map(usage.outlets.map((outlet) => [outlet.outletId, outlet.district]))
      const label = routeLabel(trip, (id) => districts.get(id), sameDay)
      if (!cancelled) setState({ status: "ready", trip, label, districts })
    })().catch((error) => {
      if (!cancelled) setState({ status: "error", message: error instanceof Error ? error.message : "The route could not be loaded." })
    })
    return () => { cancelled = true }
  }, [tripId])

  if (state.status === "loading") return <section className="page page-enter monitor-page"><PageTitle>Route monitoring</PageTitle><p className="mute">Loading route…</p></section>
  if (state.status === "error") return <section className="page page-enter monitor-page"><PageTitle>Route monitoring</PageTitle><p role="alert" style={{ color: "var(--critical-500)" }}>{state.message}</p></section>

  const { trip, label, districts } = state
  const driver = drivers.find((d) => d._id === trip.driverId)
  const stops = [...trip.stops]
  const done = stops.filter((stop) => ["completed", "delivered"].includes(stop.status)).length
  return (
    <section className="page page-enter monitor-page">
      <div className="page-heading">
        <PageTitle>Route monitoring</PageTitle>
        <div className="page-heading__meta">{trip.status.replaceAll("_", " ")}</div>
      </div>
      <div className="workspace-card monitor-workspace">
        <section className="monitor-route">
          <div className="monitor-route__heading">
            <div>
              <strong className="monitor-route__id">{trip.vehicleId}</strong>
              <span>Route: {label.title}</span>
              <small className="data-text" style={{ display: "block" }}>{trip.tripNumber} · {trip.serviceDate}</small>
            </div>
          </div>
          <div className="stop-timeline">
            <div className="stop-timeline__head"><span>Shop</span><span>Time</span><span>Status</span></div>
            {stops.map((stop) => {
              const arrived = ["arrived", "completed", "delivered"].includes(stop.status)
              return (
                <div className={`stop-row ${arrived ? "stop-row--visited" : ""}`} key={stop.stopId}>
                  <span className="stop-row__marker">{arrived ? <Check aria-hidden="true" size={22} /> : <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--cobalt-500)" }} />}</span>
                  <span className="stop-row__shop"><strong>{stop.outletId}</strong><span>{districts.get(stop.outletId) ?? ""}</span></span>
                  <span className="stop-row__time"><b>{time(stop.plannedArrivalAt)}</b><small style={{ display: "block", fontSize: 11 }}>planned</small></span>
                  <span className="stop-row__manager">{stop.status.replaceAll("_", " ")}</span>
                </div>
              )
            })}
          </div>
        </section>
        <section className="monitor-details">
          <div className="route-status">
            <div className="route-status__top"><strong>Route status</strong><span>{trip.status.replaceAll("_", " ")}</span></div>
            <div className="route-status__metric"><strong className="data-text">{done}/{stops.length}</strong><b>shops covered</b></div>
            <div style={{ margin: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span>Departs {time(trip.departureAt)}</span><span>Planned end {time(trip.plannedEndAt)}</span>
              </div>
              <ProgressBar value={stops.length ? (done / stops.length) * 100 : 0} />
            </div>
          </div>
          <div className="crew-panel">
            <strong>Crew</strong>
            <div className="crew-list">
              <div data-testid="assigned-driver">
                <strong>{driver ? driver.name : "Driver not found"}</strong>
                <span style={{ display: "block", fontSize: 12 }}>Driver{driver ? ` · ${driver.employeeId}${driver.depot ? ` · ${driver.depot}` : ""}` : ""}</span>
              </div>
            </div>
          </div>
          <p className="mute" style={{ fontSize: 12 }}>Remarks and route acceptance are not connected for live routes yet.</p>
        </section>
      </div>
    </section>
  )
}
