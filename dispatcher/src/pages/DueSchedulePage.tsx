import { AlertCircle, Bolt, Check, CheckCircle2, Clock, Lock, Settings, Snowflake, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { CheckModal } from "../components/CheckModal";
import { blockedReason, canGo, dayLabel, isAtQuota, orderRowOpenProps, orderVolume, recordTurn, ROUTE_EXTRAS_BY_DAY, routeNameFor, vehicleDay, volumeOf } from "../components/planning/helpers";
import { RouteLineMap } from "../components/planning/RouteLineMap";
import { TurnsToday } from "../components/planning/TurnsToday";
import { VehicleGraphic } from "../components/planning/VehicleGraphic";
import { VolumeRow } from "../components/planning/VolumeRow";
import { ReviewModal } from "../components/ReviewModal";
import { Button, Heading, PageTitle, ProgressBar, ShopTag, UnstyledButton } from "../components/ui";
import { DAILY_TURN_LIMIT, TODAY, TODAY_ORDER_IDS } from "../lib/constants";
import type { Order, Vehicle } from "../types/dispatcher";

export default function DueSchedulePage({
  day,
  vehicles,
  orders,
  onOpenManageVehicles,
  onOpenDefer,
  onOpenNormal,
  onScheduled,
}: {
  day: number
  vehicles: Vehicle[]
  orders: Order[]
  onOpenManageVehicles: () => void
  onOpenDefer: () => void
  onOpenNormal: () => void
  onScheduled: (message: string, scheduled: Order[], day: number, vehicle: Vehicle, departureTime: string) => void | Promise<void>
}) {
  const isToday = day === TODAY
  const label = dayLabel(day)
  const highlightedOrder = new URLSearchParams(window.location.search).get("order")
  const openOrders = orders.filter((o) => !o.deferred)

  // Orders due that day that still need a route (locked on this page).
  const locked = useMemo(() => {
    const dueThatDay = openOrders.filter(
      (o) => (o.dueDay ?? TODAY) === day && !o.stop,
    )
    if (!isToday) return dueThatDay
    const known = openOrders.filter((o) => TODAY_ORDER_IDS.includes(o.id))
    return known.length ? known : dueThatDay.filter((o) => !o.emergency).slice(0, 2)
  }, [openOrders, day, isToday])

  // Other orders on the same route: the day's known extras plus open orders
  // due later in the same towns.
  const extras = useMemo(() => {
    const lockedIds = locked.map((o) => o.id)
    const towns = locked.map((o) => o.town)
    const fromData = openOrders.filter(
      (o) =>
        !lockedIds.includes(o.id) &&
        !o.stop &&
        !o.emergency &&
        o.inReach &&
        (o.dueDay ?? TODAY) > day &&
        towns.includes(o.town),
    )
    const known = (ROUTE_EXTRAS_BY_DAY[day] ?? [])
      .map((e) => orders.find((o) => o.id === e.id) ?? e)
      .filter((o) => !o.deferred && !o.stop && !lockedIds.includes(o.id))
    const list = [...known, ...fromData.filter((o) => !known.some((k) => k.id === o.id))]
    return list.slice(0, 4)
  }, [orders, openOrders, locked, day])

  const lockedKg = locked.reduce((sum, o) => sum + o.kg, 0)

  // Suggestion rule: under weekly quota, big enough for the locked orders,
  // smallest good fit first, then fewest turns, then most fuel.
  const candidates = useMemo(
    () =>
      vehicles
        .filter((v) => canGo(v) && v.capacityKg >= lockedKg && vehicleDay(v).volumeM3 >= volumeOf(locked))
        .sort(
          (a, b) => a.capacityKg - b.capacityKg || a.turns - b.turns || b.fuel - a.fuel,
        ),
    [vehicles, lockedKg],
  )

  const [suggestIndex, setSuggestIndex] = useState(0)
  const [manualVehicle, setManualVehicle] = useState<Vehicle | null>(null)
  const [choosing, setChoosing] = useState(false)
  const [added, setAdded] = useState<string[]>([])
  const [overlay, setOverlay] = useState<"review" | "check" | null>(null)
  const [reviewPack, setReviewPack] = useState<Order[]>([])
  const [checked, setChecked] = useState<string[]>([])

  const aiVehicle = candidates.length ? candidates[suggestIndex % candidates.length] : null
  const vehicle = manualVehicle ?? aiVehicle
  const isAiPick = !manualVehicle && Boolean(aiVehicle)

  const addedExtras = extras.filter((o) => added.includes(o.id))
  const remainingExtras = extras.filter((o) => !added.includes(o.id))
  const pack = [...locked, ...addedExtras]
  const loadKg = pack.reduce((sum, o) => sum + o.kg, 0)
  const capacity = vehicle?.capacityKg ?? 1
  const capacityPercent = Math.round((loadKg / capacity) * 100)
  const remainingKg = remainingExtras.reduce((sum, o) => sum + o.kg, 0)
  const routeName = routeNameFor(pack)
  const packVolume = volumeOf(pack)
  const volumeCap = vehicle ? vehicleDay(vehicle).volumeM3 : 1
  const departs = isToday ? "now" : "07:00"

  const toggleAdded = (order: Order) => {
    setAdded((prev) =>
      prev.includes(order.id)
        ? prev.filter((id) => id !== order.id)
        : loadKg + order.kg <= capacity && packVolume + orderVolume(order) <= volumeCap
          ? [...prev, order.id]
          : prev,
    )
  }

  const suggestAnother = () => {
    const next = candidates[(suggestIndex + 1) % Math.max(candidates.length, 1)]
    setManualVehicle(null)
    setChoosing(false)
    setSuggestIndex((i) => i + 1)
    if (next) {
      let kg = lockedKg
      setAdded((prev) =>
        prev.filter((id) => {
          const o = extras.find((e) => e.id === id)
          if (!o || kg + o.kg > next.capacityKg) return false
          kg += o.kg
          return true
        }),
      )
    }
  }

  const available = (type: string) =>
    vehicles.filter((v) => v.type === type && canGo(v)).length

  if (!locked.length) {
    return (
      <section className="page page-enter">
        <div className="page-heading">
          <PageTitle>Route scheduling</PageTitle>
        </div>
        <div className="workspace-card calendar-empty">
          <CheckCircle2 aria-hidden="true" size={32} />
          <strong>Every order due {isToday ? "today" : label.short} already has a route</strong>
          <span>Use normal scheduling to plan other orders.</span>
          <Button onClick={onOpenNormal} variant="primary">
            Open scheduling
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="page page-enter">
      <div className="page-heading">
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <PageTitle>Route scheduling</PageTitle>
          <div className="route-date-wrapper">
            <span className={`route-date-chip ${isToday ? "" : "route-date-chip--future"}`}>
              <Clock size={16} />
              <span>
                {isToday
                  ? "Immediate · Today · Sun 27 · departs now"
                  : `Route date: ${label.short} · departs ${departs}`}
              </span>
            </span>
            <span className="step-subtitle">
              From calendar · vehicle picked, add more on route
            </span>
          </div>
        </div>
      </div>

      <div className="workspace-card schedule-workspace">
        {/* Left: orders */}
        <section className="orders-panel calendar-vehicle-entry">
          <div
            className="orders-heading"
          >
            <div>
              <Heading>Orders</Heading>
              <span>
                {openOrders.length} open ·{" "}
                <b style={{ color: "var(--critical-500)" }}>
                  {openOrders.filter((o) => o.emergency).length} emergency
                </b>
              </span>
            </div>
          </div>

          <div className="order-filters">
            <span className="order-filter order-filter--active">
              Due {day} Sep · {locked.length}
            </span>
            {(["Fresh", "Tech", "Style"] as const).map((type) => (
              <UnstyledButton
                className="order-filter"
                key={type}
                onClick={onOpenNormal}
                title="Open normal scheduling"
              >
                {type} · {openOrders.filter((o) => o.type === type).length}
              </UnstyledButton>
            ))}
          </div>

          <div className="order-list calendar-picked-orders">
            <strong className="locked-orders-label">
              <Lock aria-hidden="true" size={18} /> Due{" "}
              {isToday ? "today" : label.short} · added, can&apos;t be removed
            </strong>
            {locked.map((order) => (
              <div
                className={`order-row order-row--locked ${order.emergency ? "order-row--emergency" : ""
                  } ${highlightedOrder === order.id ? "order-row--highlighted" : ""} order-row--clickable`}
                key={order.id}
                {...orderRowOpenProps(order)}
              >
                {order.emergency ? (
                  <AlertCircle className="order-row__alert" aria-hidden="true" size={26} />
                ) : (
                  <span className="order-row__alert-space" />
                )}
                <div className="order-row__content">
                  <div className="order-row__line">
                    <span className="data-text">{order.id}</span>
                    <ShopTag type={order.type} />
                    <strong className="order-row__kg">{order.kg} kg</strong>
                    <Button
                      className="order-row__action"
                      disabled
                      title={`Due ${isToday ? "today" : label.short}, can't be removed`}
                      variant="confirm"
                    >
                      ✓ Added
                    </Button>
                  </div>
                  <span className="order-row__meta">
                    {order.shop} · {order.town} · {order.items} · due{" "}
                    {isToday ? "today" : label.weekday + " " + day}
                  </span>
                </div>
              </div>
            ))}

            {remainingExtras.length ? (
              <div className="suggestion-banner suggestion-banner--ai route-suggestion-banner">
                <Bolt size={24} color="var(--cobalt-500)" />
                <div>
                  <strong>
                    AI: also on this route · {remainingExtras.length}{" "}
                    {remainingExtras.length === 1 ? "order" : "orders"}
                  </strong>
                  <span>
                    +{remainingKg} kg · load {loadKg + remainingKg} /{" "}
                    {capacity.toLocaleString()} kg
                  </span>
                </div>
                <Button
                  onClick={() => {
                    setReviewPack(remainingExtras)
                    setOverlay("review")
                  }}
                  variant="primary"
                >
                  Review
                </Button>
              </div>
            ) : null}

            {extras.map((order) => {
              const isAdded = added.includes(order.id)
              const fits =
                isAdded ||
                (loadKg + order.kg <= capacity && packVolume + orderVolume(order) <= volumeCap)
              return (
                <div
                  className="order-row order-row--clickable"
                  key={order.id}
                  {...orderRowOpenProps(order)}
                >
                  <span className="order-row__alert-space" />
                  <div className="order-row__content">
                    <div className="order-row__line">
                      <span className="data-text">{order.id}</span>
                      <ShopTag type={order.type} />
                      <Bolt aria-label="AI suggested order" className="suggestion-star" size={20} />
                      <strong className="order-row__kg">{order.kg} kg</strong>
                      {fits ? (
                        <Button
                          className="order-row__action"
                          onClick={() => toggleAdded(order)}
                          variant={isAdded ? "primary" : "secondary"}
                        >
                          {isAdded ? "✓ Added" : "+ Add"}
                        </Button>
                      ) : (
                        <span className="out-of-reach">Over capacity</span>
                      )}
                    </div>
                    <span className="order-row__meta">
                      {order.shop} · {order.town} · {order.items}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="panel-actions">
            <p>Postpone orders to another day with a reason and notice.</p>
            <button className="defer-orders-btn" onClick={onOpenDefer} type="button">
              <Clock size={18} />
              <span>Defer orders</span>
            </button>
          </div>
        </section>

        {/* Right: vehicle */}
        <section className="vehicle-panel">
          <div className="availability-wrap">
            <div className="availability">
              <strong>Available</strong>
              <span>
                <Truck aria-hidden="true" size={24} /> ×{available("Van")}
              </span>
              <span>
                <Truck aria-hidden="true" size={24} /> ×{available("Lorry")}
              </span>
              <span>
                <Snowflake aria-hidden="true" size={19} /> ×{available("Refrigerated")}
              </span>
            </div>
          </div>

          {choosing || !vehicle ? (
            <div className="vehicle-search">
              <strong className="matching-count">
                {vehicle ? "Choose another vehicle" : "No vehicle can take these orders"}
              </strong>
              <div className="vehicle-grid">
                {vehicles.map((v) => {
                  const quota = blockedReason(v) !== null
                  const tooSmall =
                    v.capacityKg < lockedKg || vehicleDay(v).volumeM3 < volumeOf(locked)
                  return (
                    <UnstyledButton
                      className={`vehicle-card ${quota || tooSmall ? "vehicle-card--quota-reached" : ""}`}
                      key={v.id}
                      onClick={() => {
                        if (quota) return onOpenManageVehicles()
                        if (tooSmall) return
                        setManualVehicle(v)
                        setChoosing(false)
                      }}
                      title={
                        isAtQuota(v)
                          ? "Weekly quota reached · raise it in Manage vehicles"
                          : quota
                            ? `${DAILY_TURN_LIMIT} turns done today · free again tomorrow`
                            : tooSmall
                              ? "Too small for these orders"
                              : "Select vehicle"
                      }
                    >
                      <VehicleGraphic vehicle={v} />
                      <strong className="data-text">{v.id}</strong>
                      <b>{v.type}</b>
                      <span className={quota ? "vehicle-card__quota-text" : ""}>
                        {quota
                          ? blockedReason(v)
                          : tooSmall
                            ? "Too small"
                            : `${v.capacityKg.toLocaleString()} kg · ${vehicleDay(v).volumeM3} m³ · ${v.length}`}
                      </span>
                      <span className="vehicle-card__turns">
                        Turns today {vehicleDay(v).turnsToday} / {DAILY_TURN_LIMIT}
                      </span>
                      <em>{quota ? "Manage →" : "Select →"}</em>
                    </UnstyledButton>
                  )
                })}
              </div>
              {vehicle ? (
                <Button onClick={() => setChoosing(false)} variant="secondary">
                  Back to AI suggestion
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="selected-vehicle">
              <div
                className={`selected-card ${isAiPick ? "selected-card--ai" : ""}`}
                style={{ flexDirection: "column", gap: 0 }}
              >
                <div className="calendar-selected-card__label">
                  <strong>
                    <Bolt aria-hidden="true" size={20} />
                    {isAiPick ? "AI suggested vehicle · Best fit" : "Vehicle chosen by you"}
                  </strong>
                  <Button
                    disabled={candidates.length < 2 && isAiPick}
                    icon={Bolt}
                    onClick={suggestAnother}
                    title={
                      candidates.length < 2
                        ? "No other vehicle fits these orders"
                        : "Suggest the next best vehicle"
                    }
                    variant="secondary"
                  >
                    Suggest another
                  </Button>
                </div>
                <div style={{ display: "flex", gap: "22px" }}>
                  <VehicleGraphic large vehicle={vehicle} />
                  <div className="selected-card__body">
                    <div className="selected-card__title">
                      <strong className="data-text">{vehicle.id}</strong>
                      <span>{vehicle.type}</span>
                      <TurnsToday vehicle={vehicle} />
                      <UnstyledButton onClick={() => setChoosing(true)}>Change</UnstyledButton>
                    </div>
                    <div className="selected-card__load">
                      <strong>
                        Load {loadKg.toLocaleString()} / {vehicle.capacityKg.toLocaleString()} kg
                      </strong>
                      <b>{capacityPercent}%</b>
                    </div>
                    <ProgressBar value={capacityPercent} warning={capacityPercent >= 90} />
                    <VolumeRow used={volumeOf(pack)} vehicle={vehicle} />
                  </div>
                </div>
              </div>

              <RouteLineMap added={added} extras={extras} locked={locked} />

              <div className="selected-footer">
                <strong>
                  {pack.length} {pack.length === 1 ? "order" : "orders"} ·{" "}
                  {loadKg.toLocaleString()} kg
                </strong>
                <Button
                  icon={Check}
                  onClick={() => {
                    setChecked(pack.map((o) => o.id))
                    setOverlay("check")
                  }}
                  variant="primary"
                >
                  Check
                </Button>
              </div>
            </div>
          )}

          <div className="panel-actions">
            <p>Turns, km, fuel and quotas for every vehicle.</p>
            <button className="manage-vehicles-btn" onClick={onOpenManageVehicles} type="button">
              <Settings size={18} />
              <span>Manage vehicles</span>
            </button>
          </div>
        </section>
      </div>

      {overlay === "review" && vehicle ? (
        <ReviewModal
          onAdd={() => {
            let kg = loadKg
            const fitting = reviewPack.filter((o) => {
              if (kg + o.kg > vehicle.capacityKg) return false
              kg += o.kg
              return true
            })
            setAdded((prev) => [...prev, ...fitting.map((o) => o.id)])
            setOverlay(null)
          }}
          onClose={() => setOverlay(null)}
          onDrop={(id) => setReviewPack((prev) => prev.filter((o) => o.id !== id))}
          pack={reviewPack}
          vehicle={vehicle}
        />
      ) : null}

      {overlay === "check" && vehicle ? (
        <CheckModal
          checked={checked}
          lockedIds={locked.map((o) => o.id)}
          onClose={() => setOverlay(null)}
          onDrop={(id) => {
            setAdded((prev) => prev.filter((item) => item !== id))
            setChecked((prev) => prev.filter((item) => item !== id))
          }}
          onSchedule={() => {
            setOverlay(null)
            recordTurn(vehicle)
            void onScheduled(
              isToday
                ? `Route ${vehicle.id} scheduled · ${pack.length} orders, leaving now`
                : `Route ${vehicle.id} scheduled for ${label.short} · departs ${departs}`,
              pack,
              day,
              vehicle,
              departs,
            )
          }}
          pack={pack}
          routeName={routeName}
          setChecked={setChecked}
          vehicle={vehicle}
        />
      ) : null}
    </section>
  )
}
