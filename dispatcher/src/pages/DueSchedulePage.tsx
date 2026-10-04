import { AlertCircle, Bolt, Check, CheckCircle2, Clock, Lock, Settings, Snowflake, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { evaluateRoute, planFromOrders, recompute, type PlanEdit, type PlanResult } from "@route-engine";
import { CheckModal } from "../components/CheckModal";
import { orderRowOpenProps } from "../components/planning/helpers";
import { LoadBars } from "../components/planning/LoadBars";
import { RouteMap } from "../components/planning/RouteMap";
import { VehicleGraphic } from "../components/planning/VehicleGraphic";
import { VehicleGrid } from "../components/planning/VehicleGrid";
import { ReviewModal } from "../components/ReviewModal";
import { Button, Heading, PageTitle, ShopTag, UnstyledButton } from "../components/ui";
import { DAILY_TURN_LIMIT } from "../lib/constants";
import { dateLabel } from "../lib/dates";
import { hhmm, reasonLabel, toEngineOrder, toUiVehicle, useContextWithDeparture, useEngineContext } from "../lib/routeEngine";
import { tagCount, type Tag } from "../lib/vehicleFilter";
import type { DriverReference } from "../api/planning";
import { usePlanningCheck, type PlanningService } from "../lib/usePlanningCheck";
import type { Order } from "../types/dispatcher";

/**
 * Order-first ("schedule now" from the calendar). The orders picked in the calendar are mandatory:
 * the engine ranks vehicles for exactly those orders, suggests the best fit, then suggests more orders
 * for the route. Mandatory orders stay locked through every edit (the engine guarantees it too).
 */
export default function DueSchedulePage({
  mandatoryApiIds,
  orders,
  ordersDate,
  dueVersion,
  today,
  planningDate,
  planning,
  drivers,
  onOpenManageVehicles,
  onOpenDefer,
  onOpenNormal,
}: {
  /** Backend ids of the orders chosen in the calendar. */
  mandatoryApiIds: string[]
  orders: Order[]
  ordersDate: string | null
  dueVersion: number
  today: string | null
  planningDate: string | null
  planning?: PlanningService
  /** Active Drivers (names for the assigned Driver shown on the check sheet). */
  drivers: DriverReference[]
  onOpenManageVehicles: () => void
  onOpenDefer: () => void
  onOpenNormal: () => void
}) {
  const highlightedOrder = new URLSearchParams(window.location.search).get("order")
  const routeDate = planningDate ?? ""
  const label = planningDate && today ? dateLabel(planningDate, today) : "loading date…"
  const isToday = Boolean(planningDate && planningDate === today)
  const [departsTime] = useState(() => (isToday ? "12:30" : "07:00"))

  const [plan, setPlan] = useState<PlanResult | null>(null)
  const [manualVehicle, setManualVehicle] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [overlay, setOverlay] = useState<"review" | "check" | null>(null)
  const [reviewIds, setReviewIds] = useState<string[]>([])
  const [reviewDropped, setReviewDropped] = useState<string[]>([])
  const [checked, setChecked] = useState<string[]>([])
  const [notice, setNotice] = useState("")

  const engine = useEngineContext(planningDate, dueVersion)
  const ctx = useContextWithDeparture(engine.ctx, departsTime)
  const ordersReady = ordersDate === planningDate
  const openOrders = useMemo(() => (ordersReady ? orders.filter((o) => !o.deferred) : []), [orders, ordersReady])
  const engineOrders = useMemo(() => openOrders.map(toEngineOrder).filter((o): o is NonNullable<typeof o> => o !== null), [openOrders])
  const orderByApiId = useMemo(() => new Map(openOrders.map((o) => [o.apiId, o])), [openOrders])
  const orderByNumber = useMemo(() => new Map(openOrders.map((o) => [o.id, o])), [openOrders])
  const mandatoryOpen = mandatoryApiIds.filter((id) => orderByApiId.has(id))
  const missingMandatory = ordersReady && mandatoryOpen.length !== mandatoryApiIds.length

  // Plan (re)built from the engine whenever its inputs change; the dispatcher's added orders and chosen
  // vehicle are carried over so the screen never goes stale.
  useEffect(() => {
    if (!ctx || !ordersReady || !mandatoryOpen.length || missingMandatory) { setPlan(null); return }
    setPlan((prev) => {
      const keepVehicle = manualVehicle && prev?.vehicleId ? { vehicleId: prev.vehicleId } : {}
      const base = planFromOrders(mandatoryOpen, engineOrders, engine.vehicles, ctx, { autoSelect: false, ...keepVehicle, excludeOrderIds: prev?.suggestionExcludedIds ?? [] })
      if (!prev?.vehicleId || !base.vehicleId) return base
      return recompute(base, { type: "addMany", orderIds: prev.selectedIds }, engineOrders, engine.vehicles, ctx)
    })
    // mandatoryOpen is derived from the URL ids and the order list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, engineOrders, engine.vehicles, ordersReady, mandatoryApiIds.join(",")])

  const applyEdit = (edit: PlanEdit) => {
    if (!plan || !ctx) return
    const next = recompute(plan, edit, engineOrders, engine.vehicles, ctx)
    setPlan(next)
    const rejected = next.lastEdit?.rejected
    setNotice(rejected?.length ? `Can't add: ${[...new Set(rejected.map(reasonLabel))].join(", ")}` : "")
  }

  const vehicleEng = plan?.vehicleId ? engine.vehicles.find((v) => v.vehicleId === plan.vehicleId) ?? null : null
  const vehicle = vehicleEng && ctx ? toUiVehicle(vehicleEng, ctx.vehicleState[vehicleEng.vehicleId]) : null
  const route = plan?.route ?? null
  const mandatoryIds = new Set(plan?.mandatoryIds ?? [])
  const selected = new Set(plan?.selectedIds ?? [])
  const locked = (plan?.mandatoryIds ?? []).map((id) => orderByApiId.get(id)).filter((o): o is Order => Boolean(o))
  const suggestionExtras = (plan?.suggestion?.suggested ?? []).filter((o) => !mandatoryIds.has(o.id) && !selected.has(o.id))
  const extraKg = suggestionExtras.reduce((sum, o) => sum + o.weightKg, 0)
  const extras = (plan?.eligibleOrders ?? []).filter((a) => !mandatoryIds.has(a.order.id))
  const suggestedIds = new Set((plan?.suggestion?.suggested ?? []).map((o) => o.id))
  const aiBest = plan?.ranking.find((r) => r.eligible)?.vehicle.vehicleId
  const isAiPick = Boolean(vehicle) && !manualVehicle && vehicle?.id === aiBest
  const otherVehicles = (plan?.ranking ?? []).filter((r) => r.eligible && r.vehicle.vehicleId !== plan?.vehicleId).length
  const suggestionCheck = useMemo(() => {
    if (!vehicleEng || !ctx || !suggestionExtras.length || !plan) return null
    const current = plan.selectedIds.map((id) => engineOrders.find((o) => o.id === id)).filter((o): o is NonNullable<typeof o> => Boolean(o))
    return evaluateRoute(vehicleEng, [...current, ...suggestionExtras], ctx)
  }, [vehicleEng, ctx, suggestionExtras, plan, engineOrders])

  const reviewPack = reviewIds.map((id) => orderByApiId.get(id)).filter((o): o is Order => Boolean(o))
  const excludedNow = new Set([...(plan?.suggestionExcludedIds ?? []), ...reviewIds, ...reviewDropped])
  const alternativesLeft = extras.some((a) => a.eligible && !a.alreadyAdded && !excludedNow.has(a.order.id))
  const openReview = () => {
    setReviewIds(suggestionExtras.map((o) => o.id))
    setReviewDropped([])
    setOverlay("review")
  }
  const suggestAnotherPack = () => {
    if (!plan || !ctx) return
    const next = recompute(plan, { type: "resuggest", excludeOrderIds: [...excludedNow] }, engineOrders, engine.vehicles, ctx)
    setPlan(next)
    setReviewIds((next.suggestion?.suggested ?? []).filter((o) => !next.mandatoryIds.includes(o.id) && !next.selectedIds.includes(o.id)).map((o) => o.id))
    setReviewDropped([])
  }

  const packOrders: Order[] = route
    ? route.stops.map((s) => orderByApiId.get(s.orderId)).filter((o): o is Order => Boolean(o)).map((o, i) => ({ ...o, stop: i + 1 }))
    : []
  const check = usePlanningCheck({
    planning: planning ?? { prepare: () => Promise.reject(new Error("Planning service unavailable")), publish: () => Promise.resolve(), onPublished: () => undefined },
    open: overlay === "check", vehicle, orders: packOrders, route, routeDate, departsTime, onScheduled: () => setOverlay(null),
  })
  const routeName = route?.stops[0] ? `${vehicle?.depot ?? "Depot"} → ${route.stops[0].district}` : "Route"
  // Van = any van, Lorry = any truck, Refrigerated = any reefer (a reefer van counts under both Van and Refrigerated).
  const available = (tag: Tag) => tagCount((plan?.ranking ?? []).filter((r) => r.eligible).map((r) => r.vehicle), tag)
  const departsLabel = route?.departureMin != null ? hhmm(route.departureMin) : departsTime

  if (!planning) {
    return (
      <section className="page page-enter">
        <div className="page-heading"><PageTitle>Route scheduling</PageTitle></div>
        <div className="workspace-card calendar-empty">
          <strong>Scheduling needs the planning service</strong>
          <span>Orders, vehicles and the suggestion engine load from the backend, which is not connected in prototype mode.</span>
        </div>
      </section>
    )
  }

  if (!mandatoryApiIds.length || missingMandatory) {
    return (
      <section className="page page-enter">
        <div className="page-heading"><PageTitle>Route scheduling</PageTitle></div>
        <div className="workspace-card calendar-empty">
          <CheckCircle2 aria-hidden="true" size={32} />
          <strong>{missingMandatory ? "Those orders already have a route" : "No orders selected"}</strong>
          <span>{missingMandatory ? "They are no longer open for planning." : "Pick the orders to schedule in the calendar, or use normal scheduling."}</span>
          <Button onClick={onOpenNormal} variant="primary">Open scheduling</Button>
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
              <span>Route date: {label} · departs {departsLabel}</span>
            </span>
            <span className="step-subtitle">From calendar · vehicle suggested, add more on route</span>
          </div>
        </div>
      </div>

      <div className="workspace-card schedule-workspace">
        {/* Left: orders */}
        <section className="orders-panel calendar-vehicle-entry">
          <div className="orders-heading">
            <div>
              <Heading>Orders</Heading>
              <span>
                {openOrders.length} open ·{" "}
                <b style={{ color: "var(--critical-500)" }}>{openOrders.filter((o) => o.emergency).length} emergency</b>
              </span>
            </div>
          </div>

          <div className="order-filters">
            <span className="order-filter order-filter--active">Due {label} · {locked.length}</span>
            {(["Fresh", "Tech", "Style"] as const).map((type) => (
              <UnstyledButton className="order-filter" key={type} onClick={onOpenNormal} title="Open normal scheduling">
                {type} · {openOrders.filter((o) => o.type === type).length}
              </UnstyledButton>
            ))}
          </div>

          <div className="order-list calendar-picked-orders">
            <strong className="locked-orders-label">
              <Lock aria-hidden="true" size={18} /> Due {isToday ? "today" : label} · added, can&apos;t be removed
            </strong>
            {locked.map((order) => (
              <div
                className={`order-row order-row--locked ${order.emergency ? "order-row--emergency" : ""} ${highlightedOrder === order.id ? "order-row--highlighted" : ""} order-row--clickable`}
                key={order.id}
                {...orderRowOpenProps(order)}
              >
                {order.emergency ? <AlertCircle className="order-row__alert" aria-hidden="true" size={26} /> : <span className="order-row__alert-space" />}
                <div className="order-row__content">
                  <div className="order-row__line">
                    <span className="data-text">{order.id}</span>
                    <ShopTag type={order.type} />
                    <strong className="order-row__kg">{order.kg} kg</strong>
                    <Button className="order-row__action" disabled title={`Due ${isToday ? "today" : label}, can't be removed`} variant="confirm">
                      ✓ Added
                    </Button>
                  </div>
                  <span className="order-row__meta">{order.shop} · due {isToday ? "today" : label}</span>
                </div>
              </div>
            ))}

            {vehicle && suggestionExtras.length ? (
              <div className="suggestion-banner suggestion-banner--ai route-suggestion-banner">
                <Bolt size={24} color="var(--cobalt-500)" />
                <div>
                  <strong>AI: also on this route · {suggestionExtras.length} {suggestionExtras.length === 1 ? "order" : "orders"}</strong>
                  <span>
                    +{extraKg.toLocaleString()} kg · load {((route?.load.weightKg ?? 0) + extraKg).toLocaleString()} / {vehicle.capacityKg.toLocaleString()} kg
                    {suggestionCheck?.tripMinutes != null ? ` · ${suggestionCheck.tripMinutes} min` : ""}
                  </span>
                </div>
                <Button onClick={openReview} variant="primary">Review</Button>
              </div>
            ) : null}
            {notice ? <p role="alert" style={{ color: "var(--critical-500)", margin: "4px 0" }}>{notice}</p> : null}

            {extras.map(({ order, eligible, reasons, alreadyAdded }) => {
              const ui = orderByApiId.get(order.id)
              if (!ui) return null
              return (
                <div className="order-row order-row--clickable" key={order.id} {...orderRowOpenProps(ui)}>
                  <span className="order-row__alert-space" />
                  <div className="order-row__content">
                    <div className="order-row__line">
                      <span className="data-text">{ui.id}</span>
                      <ShopTag type={ui.type} />
                      {suggestedIds.has(order.id) ? <Bolt aria-label="AI suggested order" className="suggestion-star" size={20} /> : null}
                      <strong className="order-row__kg">{ui.kg} kg</strong>
                      {alreadyAdded || eligible ? (
                        <Button
                          className="order-row__action"
                          onClick={() => applyEdit(alreadyAdded ? { type: "drop", orderId: order.id } : { type: "add", orderId: order.id })}
                          variant={alreadyAdded ? "primary" : "secondary"}
                        >
                          {alreadyAdded ? "✓ Added" : "+ Add"}
                        </Button>
                      ) : (
                        <span className="out-of-reach" title={reasons.map((r) => r.message).join("\n")}>{reasons[0] ? reasonLabel(reasons[0]) : "Out of reach"}</span>
                      )}
                    </div>
                    <span className="order-row__meta">{ui.shop} · {ui.items}</span>
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
              <strong>Available for these orders</strong>
              <span><Truck aria-hidden="true" size={24} /> Van ×{available("Van")}</span>
              <span><Truck aria-hidden="true" size={24} /> Lorry ×{available("Lorry")}</span>
              <span><Snowflake aria-hidden="true" size={19} /> Refrigerated ×{available("Refrigerated")}</span>
            </div>
          </div>

          {ctx?.devMode ? (
            <p className="mute" role="note" style={{ margin: "4px 0", fontSize: 12 }}>
              Development mode: closed-day, Fresh-deadline and due-date rules are shown as warnings, not blockers. All other rules apply.
            </p>
          ) : null}

          {engine.status === "loading" || (engine.status === "ready" && !ordersReady) ? <div className="vehicle-search"><span className="mute">Loading vehicles and orders…</span></div> : null}
          {engine.status === "error" ? <div className="vehicle-search"><p role="alert" style={{ color: "var(--critical-500)" }}>{engine.error}</p></div> : null}

          {engine.status === "ready" && plan && ctx && (choosing || !vehicle) ? (
            <div className="vehicle-search">
              <strong className="matching-count">{vehicle ? "Choose another vehicle" : "No vehicle can take these orders"}</strong>
              <VehicleGrid
                ctx={ctx}
                onPick={(id) => { setManualVehicle(true); setChoosing(false); applyEdit({ type: "setVehicle", vehicleId: id }) }}
                ranking={plan.ranking}
                showFit
              />
              {vehicle ? <Button onClick={() => setChoosing(false)} variant="secondary">Back to AI suggestion</Button> : null}
            </div>
          ) : null}

          {engine.status === "ready" && plan && ctx && !choosing && vehicle && route ? (
            <div className="selected-vehicle">
              <div className={`selected-card ${isAiPick ? "selected-card--ai" : ""}`} style={{ flexDirection: "column", gap: 0 }}>
                <div className="calendar-selected-card__label">
                  <strong>
                    <Bolt aria-hidden="true" size={20} />
                    {isAiPick ? "AI suggested vehicle · Best fit" : "Vehicle chosen by you"}
                  </strong>
                  <Button
                    disabled={otherVehicles < 1}
                    icon={Bolt}
                    onClick={() => { setManualVehicle(false); applyEdit({ type: "nextVehicle" }) }}
                    title={otherVehicles < 1 ? "No other vehicle fits these orders" : "Suggest the next best vehicle"}
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
                      <span className="turns-today">Turns today {ctx.vehicleState[vehicle.id]?.turnsToday ?? 0} / {DAILY_TURN_LIMIT}</span>
                      <UnstyledButton onClick={() => setChoosing(true)}>Change</UnstyledButton>
                    </div>
                    <LoadBars route={route} vehicle={vehicle} />
                  </div>
                </div>
              </div>

              <RouteMap depot={vehicle.depot ?? "Depot"} route={route} />

              <div className="selected-footer">
                <strong>
                  {route.stops.length} {route.stops.length === 1 ? "order" : "orders"} · {route.load.weightKg.toLocaleString()} kg
                </strong>
                <Button icon={Check} onClick={() => { setChecked(packOrders.map((o) => o.id)); setOverlay("check") }} variant="primary">
                  Check
                </Button>
              </div>
            </div>
          ) : null}

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
          baseKg={route ? route.load.weightKg : 0}
          onAdd={() => { applyEdit({ type: "addMany", orderIds: reviewIds }); setOverlay(null) }}
          onClose={() => setOverlay(null)}
          onDrop={(id) => {
            const apiId = orderByNumber.get(id)?.apiId
            if (!apiId) return
            setReviewIds((prev) => prev.filter((x) => x !== apiId))
            setReviewDropped((prev) => [...prev, apiId])
          }}
          onSuggestAnother={suggestAnotherPack}
          pack={reviewPack}
          suggestAnotherDisabled={!alternativesLeft}
          vehicle={vehicle}
        />
      ) : null}

      {overlay === "check" && vehicle ? (
        <CheckModal
          checked={checked}
          lockedIds={locked.map((o) => o.id)}
          onClose={() => setOverlay(null)}
          onDrop={(id) => {
            const apiId = orderByNumber.get(id)?.apiId
            if (apiId && !mandatoryIds.has(apiId)) applyEdit({ type: "drop", orderId: apiId })
            setChecked((prev) => prev.filter((item) => item !== id))
          }}
          onRetryValidation={check.retry}
          onSchedule={() => void check.schedule()}
          pack={packOrders}
          routeName={routeName}
          {...(check.driverId && drivers.find((d) => d._id === check.driverId) ? { driverName: drivers.find((d) => d._id === check.driverId)!.name } : {})}
          scheduling={check.scheduling}
          setChecked={setChecked}
          vehicle={vehicle}
          {...(check.validation ? { validation: check.validation } : {})}
          {...(check.submitError ? { submitError: check.submitError } : {})}
        />
      ) : null}
    </section>
  )
}
