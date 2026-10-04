import { Check } from "lucide-react"
import type { RouteResult } from "@route-engine"
import { hhmm, reasonLabel } from "../../lib/routeEngine"

/**
 * Route map driven entirely by the engine's `buildRoute` output: depot -> stops in sequence, with
 * the shops that are on the route (✓), can still be added (○) and are out of reach. The data has
 * no coordinates (outlets are known by district only), so this is a schematic, not a geographic map.
 */
export function RouteMap({ route, depot }: { route: RouteResult; depot: string }) {
  const onRoute = route.mapStops.filter((m) => m.status === "on_route").sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
  const inReach = route.mapStops.filter((m) => m.status === "in_reach")
  const outOfReach = route.mapStops.filter((m) => m.status === "out_of_reach")
  const width = 520
  const left = 56
  const step = onRoute.length ? (width - left - 40) / onRoute.length : 0
  const x = (i: number) => left + (i + 1) * step
  const points = [`${left},70`, ...onRoute.map((_, i) => `${x(i)},70`)].join(" ")
  const stopOf = new Map(route.stops.map((s) => [s.orderId, s]))

  return (
    <div className="map-wrap calendar-route-layout">
      <div className="route-engine-map" role="img" aria-label={`Route from ${depot} depot with ${onRoute.length} stops`}>
        <svg viewBox={`0 0 ${width} 140`} preserveAspectRatio="xMidYMid meet">
          {onRoute.length ? <polyline className="route-engine-map__line" points={points} /> : null}
          <rect className="route-engine-map__depot" x={left - 12} y={58} width={24} height={24} rx={4} />
          <text className="route-engine-map__label" x={left} y={106} textAnchor="middle">{depot}</text>
          {onRoute.map((m, i) => (
            <g key={m.orderId}>
              <circle className="route-engine-map__stop" cx={x(i)} cy={70} r={11} />
              <text className="route-engine-map__num" x={x(i)} y={74} textAnchor="middle">{i + 1}</text>
              <text className="route-engine-map__label" x={x(i)} y={106} textAnchor="middle">{m.outletId}</text>
              <text className="route-engine-map__time" x={x(i)} y={50} textAnchor="middle">{hhmm(stopOf.get(m.orderId)?.arrivalMin)}</text>
            </g>
          ))}
          {!onRoute.length ? <text className="route-engine-map__label" x={width / 2} y={72} textAnchor="middle">No stops yet · add orders to build the route</text> : null}
        </svg>
        <div className="route-engine-map__summary">
          {route.tripMinutes !== null ? (
            <span><b>{route.tripMinutes} min</b> trip · {route.distanceKm} km · {route.fuelL?.toFixed(1)} L</span>
          ) : <span>Trip time not calculated</span>}
          {route.budget.pool && route.budget.limit ? (
            <span>{route.budget.pool === "fresh" ? "Fresh" : "Style+Tech"} budget {route.budget.afterTrip} / {route.budget.limit} min</span>
          ) : null}
        </div>
        {route.violations.length ? (
          <ul className="route-engine-map__problems" role="alert">
            {route.violations.map((v, i) => <li key={`${v.code}-${v.orderId ?? i}`}>{v.message}</li>)}
          </ul>
        ) : null}
        {route.warnings.map((w) => <p className="route-engine-map__warning" key={w}>{w}</p>)}
      </div>
      <div className="calendar-route-shops">
        <strong>{onRoute.length ? "Shops on this route" : "Shops in reach"} · {onRoute.length || inReach.length}</strong>
        {onRoute.map((m) => <span key={m.orderId}><Check aria-hidden="true" size={17} /> {m.outletId} · {m.district}</span>)}
        {onRoute.length ? <strong>In reach · {inReach.length}</strong> : null}
        {inReach.map((m) => <span key={m.orderId}><i /> {m.outletId} · {m.district}</span>)}
        {outOfReach.length ? <strong>Out of reach · {outOfReach.length}</strong> : null}
        {outOfReach.slice(0, 8).map((m) => (
          <span className="route-engine-map__out" key={m.orderId} title={m.reasons.map((r) => r.message).join("\n")}>
            {m.outletId} · {m.reasons[0] ? reasonLabel(m.reasons[0]) : "out of reach"}
          </span>
        ))}
        {outOfReach.length > 8 ? <small>+{outOfReach.length - 8} more</small> : null}
        <small>✓ added · ○ can add</small>
      </div>
    </div>
  )
}
