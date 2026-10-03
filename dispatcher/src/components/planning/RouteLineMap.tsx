import { Check } from "lucide-react";
import { DEPOT } from "../../lib/constants";
import type { Order } from "../../types/dispatcher";
import { pinsFor, TOWN_POS } from "./helpers";

export function RouteLineMap({
  locked,
  extras,
  added,
}: {
  locked: Order[]
  extras: Order[]
  added: string[]
}) {
  const all = [...locked, ...extras]
  const pins = pinsFor(all)
  const isOn = (o: Order) => locked.includes(o) || added.includes(o.id)
  const onRoute = all.filter(isOn).map((o) => pins[o.id]).sort((a, b) => a.x - b.x)
  const line = [DEPOT, ...onRoute].map((p) => `${p.x},${p.y}`).join(" ")
  const xs = [DEPOT.x, ...Object.values(pins).map((p) => p.x)]
  const ys = [DEPOT.y, ...Object.values(pins).map((p) => p.y)]
  const box = {
    x: Math.max(Math.min(...xs) - 30, 4),
    y: Math.max(Math.min(...ys) - 30, 4),
    w: Math.min(Math.max(...xs) - Math.min(...xs) + 60, 512),
    h: Math.min(Math.max(...ys) - Math.min(...ys) + 60, 292),
  }
  const towns = Array.from(new Set(all.map((o) => o.town))).filter(
    (t) => !t.startsWith("Galle") && TOWN_POS[t],
  )
  const lastTown = all.length
    ? all.reduce((far, o) => (pins[o.id].x > pins[far.id].x ? o : far)).town
    : "Galle"

  return (
    <div className="map-wrap calendar-route-layout">
      <div
        aria-label={`Route map from Galle depot to ${lastTown}`}
        className="calendar-route-map"
        role="img"
      >
        <svg preserveAspectRatio="none" viewBox="0 0 520 300">
          <rect
            className="calendar-route-map__reach"
            height={box.h}
            rx="40"
            width={box.w}
            x={box.x}
            y={box.y}
          />
          {onRoute.length ? (
            <polyline className="calendar-route-map__line" points={line} />
          ) : null}
          <rect
            className="calendar-route-map__depot"
            height="22"
            rx="4"
            width="22"
            x={DEPOT.x - 11}
            y={DEPOT.y - 11}
          />
          {all.map((o) => (
            <circle
              className={isOn(o) ? "calendar-route-map__added" : "calendar-route-map__open"}
              cx={pins[o.id].x}
              cy={pins[o.id].y}
              key={o.id}
              r="9"
            />
          ))}
        </svg>
        <span className="calendar-map-label calendar-map-label--depot">
          Galle depot
        </span>
        {towns.map((t) => (
          <span
            className="calendar-map-label"
            key={t}
            style={{
              left: `${((TOWN_POS[t].x - 36) / 520) * 100}%`,
              top: `${((TOWN_POS[t].y - 46) / 300) * 100}%`,
              right: "auto",
              bottom: "auto",
            }}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="calendar-route-shops">
        <strong>Shops on this route</strong>
        {all.map((o) => (
          <span key={o.id}>
            {isOn(o) ? <Check aria-hidden="true" size={17} /> : <i />}
            {o.shop}
          </span>
        ))}
        <small>✓ added · ○ can add</small>
      </div>
    </div>
  )
}
