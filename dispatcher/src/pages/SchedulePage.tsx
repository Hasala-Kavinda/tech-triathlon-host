import { Bolt, Check, CheckCircle2, Clock, Search, Settings, Snowflake, Truck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { evaluateRoute, planFromVehicle, rankVehiclesForOrders, recompute, type PlanEdit, type PlanResult } from "@route-engine";
import { CheckModal } from "../components/CheckModal";
import { LoadBars } from "../components/planning/LoadBars";
import { OrderRow } from "../components/planning/OrderRow";
import { RouteMap } from "../components/planning/RouteMap";
import { VehicleGraphic } from "../components/planning/VehicleGraphic";
import { VehicleGrid } from "../components/planning/VehicleGrid";
import { ReviewModal } from "../components/ReviewModal";
import { Button, Heading, PageTitle, TextInput, UnstyledButton } from "../components/ui";
import { DAILY_TURN_LIMIT } from "../lib/constants";
import { addDays, dateLabel } from "../lib/dates";
import { hhmm, reasonLabel, toEngineOrder, toUiVehicle, topReason, uiVehicleType, useContextWithDeparture, useEngineContext } from "../lib/routeEngine";
import { activeTags, matchesTags, NO_TAGS, tagCount, toggleTag, type Tag, type TagState } from "../lib/vehicleFilter";
import type { DriverReference } from "../api/planning";
import { usePlanningCheck, type PlanningService } from "../lib/usePlanningCheck";
import type { Order, ShopType } from "../types/dispatcher";

/**
 * Route scheduling, vehicle-first. Eligibility, the suggested pack, the route/map and the load all
 * come from the route-suggestion engine (backend/src/route-engine); this page only holds UI state
 * and forwards edits to the engine's `recompute`.
 */
export default function SchedulePage({
  orders,
  ordersDate,
  dueVersion,
  onOpenManageVehicles,
  onOpenDefer,
  planning,
  drivers,
  today,
  planningDate,
  onPlanningDateChange,
}: {
  /** Today in Asia/Colombo and the day being planned (both YYYY-MM-DD); null until known. */
  today: string | null
  planningDate: string | null
  onPlanningDateChange: (date: string) => void
  /** Open orders for `ordersDate`, and a counter that changes whenever they change server-side. */
  orders: Order[]
  ordersDate: string | null
  dueVersion: number
  /** Live planning service (draft + validate + publish). Absent in prototype mode, where there is no backend. */
  planning?: PlanningService
  /** Active Drivers (names for the assigned Driver shown on the check sheet). */
  drivers: DriverReference[]
  onOpenManageVehicles: () => void
  onOpenDefer: () => void
}) {
  const params = new URLSearchParams(window.location.search)
  const isDatePreset = Boolean(today && planningDate && planningDate !== today)
  const routeDate = planningDate ?? ""
  const routeDateLabel = planningDate && today ? dateLabel(planningDate, today) : "loading date…"
  const [departsTime, setDepartsTime] = useState(() => (isDatePreset ? "07:00" : "12:30"))
  const [dateChipOpen, setDateChipOpen] = useState(false)

  const [orderFilter, setOrderFilter] = useState<"All" | ShopType>(() => {
    // The home screen passes its shop-type filter along as ?brand=
    const brand = params.get("brand")
    return brand === "Fresh" || brand === "Tech" || brand === "Style" ? brand : "All"
  })
  // Van / Lorry / Refrigerated: type and temperature are separate, combined with AND (see lib/vehicleFilter.ts).
  const [tagState, setTagState] = useState<TagState>(NO_TAGS)
  const tags = activeTags(tagState)
  const [search, setSearch] = useState("")
  const [overlay, setOverlay] = useState<"review" | "check" | null>(null)
  const [reviewIds, setReviewIds] = useState<string[]>([])
  const [reviewDropped, setReviewDropped] = useState<string[]>([])
  const [checked, setChecked] = useState<string[]>([])
  const [notice, setNotice] = useState("")
  const [plan, setPlan] = useState<PlanResult | null>(null)

  const highlightedOrder = params.get("order")

  const engine = useEngineContext(planningDate, dueVersion)
  const ctx = useContextWithDeparture(engine.ctx, departsTime)
  const ordersReady = ordersDate === planningDate
  const openOrders = useMemo(() => (ordersReady ? orders.filter((o) => !o.deferred) : []), [orders, ordersReady])
  const engineOrders = useMemo(() => openOrders.map(toEngineOrder).filter((o): o is NonNullable<typeof o> => o !== null), [openOrders])
  const orderByApiId = useMemo(() => new Map(openOrders.map((o) => [o.apiId, o])), [openOrders])
  const orderByNumber = useMemo(() => new Map(openOrders.map((o) => [o.id, o])), [openOrders])

  // All vehicles, ranked by the engine; with no orders chosen yet this reports vehicle state only
  // (closed day, routes today, weekly fuel).
  const ranking = useMemo(() => (ctx ? rankVehiclesForOrders([], engine.vehicles, ctx) : []), [ctx, engine.vehicles])

  // Keep the plan live when the underlying data changes (orders refetched, departure slot, new usage).
  useEffect(() => {
    if (!ctx) return
    setPlan((prev) => {
      if (!prev?.vehicleId) return prev
      const base = planFromVehicle(prev.vehicleId, engineOrders, engine.vehicles, ctx, { autoSelect: false, excludeOrderIds: prev.suggestionExcludedIds })
      return recompute(base, { type: "addMany", orderIds: prev.selectedIds }, engineOrders, engine.vehicles, ctx)
    })
  }, [ctx, engineOrders, engine.vehicles])

  const selectVehicle = (vehicleId: string | null) => {
    setNotice("")
    setPlan(vehicleId && ctx ? planFromVehicle(vehicleId, engineOrders, engine.vehicles, ctx, { autoSelect: false }) : null)
  }

  /** Every dispatcher edit goes through the engine's recompute, so route, map, load and banner always agree. */
  const applyEdit = (edit: PlanEdit): PlanResult | null => {
    if (!plan || !ctx) return null
    const next = recompute(plan, edit, engineOrders, engine.vehicles, ctx)
    setPlan(next)
    const rejected = next.lastEdit?.rejected
    setNotice(rejected?.length ? `Can't add: ${[...new Set(rejected.map(reasonLabel))].join(", ")}` : "")
    return next
  }

  const vehicleEng = plan?.vehicleId ? engine.vehicles.find((v) => v.vehicleId === plan.vehicleId) ?? null : null
  const vehicle = vehicleEng && ctx ? toUiVehicle(vehicleEng, ctx.vehicleState[vehicleEng.vehicleId]) : null
  const route = plan?.route ?? null
  const selected = useMemo(() => new Set(plan?.selectedIds ?? []), [plan])
  const selectedOrders = plan ? plan.selectedIds.map((id) => orderByApiId.get(id)).filter((o): o is Order => Boolean(o)) : []
  const suggestionPack = plan?.suggestion?.suggested ?? []
  const suggestedIds = useMemo(() => new Set(suggestionPack.map((o) => o.id)), [suggestionPack])
  const remainingSuggested = suggestionPack.filter((o) => !selected.has(o.id))
  const suggestedKg = remainingSuggested.reduce((sum, o) => sum + o.weightKg, 0)
  const suggestionCheck = useMemo(
    () => (vehicleEng && ctx && remainingSuggested.length ? evaluateRoute(vehicleEng, [...(plan?.selectedIds ?? []).map((id) => engineOrders.find((o) => o.id === id)!).filter(Boolean), ...remainingSuggested], ctx) : null),
    [vehicleEng, ctx, remainingSuggested, plan, engineOrders],
  )
  const packed = selected.size > 0
  const eligibilityOf = (order: Order) => plan?.eligibleOrders.find((a) => a.order.id === order.apiId)

  const displayedOrders = useMemo(() => {
    const list = orderFilter === "All" ? openOrders : openOrders.filter((o) => o.type === orderFilter)
    const eligible = (o: Order) => (plan?.eligibleOrders.find((a) => a.order.id === o.apiId)?.eligible ?? true)
    return [...list].sort(
      (a, b) =>
        Number(b.emergency) - Number(a.emergency) ||
        Number(suggestedIds.has(b.apiId ?? "")) - Number(suggestedIds.has(a.apiId ?? "")) ||
        Number(eligible(b)) - Number(eligible(a)),
    )
  }, [openOrders, orderFilter, plan, suggestedIds])

  const emergencyCount = openOrders.filter((o) => o.emergency).length
  const toggleAdded = (order: Order) => {
    if (!order.apiId) return
    applyEdit(selected.has(order.apiId) ? { type: "drop", orderId: order.apiId } : { type: "add", orderId: order.apiId })
  }

  const openReview = () => {
    setReviewIds(remainingSuggested.map((o) => o.id))
    setReviewDropped([])
    setOverlay("review")
  }
  const reviewPack = reviewIds.map((id) => orderByApiId.get(id)).filter((o): o is Order => Boolean(o))
  const excludedNow = new Set([...(plan?.suggestionExcludedIds ?? []), ...reviewIds, ...reviewDropped])
  const alternativesLeft = (plan?.eligibleOrders ?? []).some((a) => a.eligible && !a.alreadyAdded && !excludedNow.has(a.order.id))
  const suggestAnother = () => {
    if (!plan || !ctx) return
    const next = recompute(plan, { type: "resuggest", excludeOrderIds: [...excludedNow] }, engineOrders, engine.vehicles, ctx)
    setPlan(next)
    setReviewIds((next.suggestion?.suggested ?? []).filter((o) => !next.selectedIds.includes(o.id)).map((o) => o.id))
    setReviewDropped([])
  }

  const packOrders: Order[] = route
    ? route.stops.map((s) => orderByApiId.get(s.orderId)).filter((o): o is Order => Boolean(o)).map((o, i) => ({ ...o, stop: i + 1 }))
    : []
  const check = usePlanningCheck({
    planning: planning ?? { prepare: () => Promise.reject(new Error("Planning service unavailable")), publish: () => Promise.resolve(), onPublished: () => undefined },
    open: overlay === "check", vehicle, orders: packOrders, route, routeDate, departsTime, onScheduled: () => setOverlay(null),
  })
  const openCheck = () => {
    setChecked(packOrders.map((o) => o.id))
    setOverlay("check")
  }

  // The tag filter chooses WHICH vehicles are listed; the engine's eligibility then fades/disables
  // ineligible ones inside that list. The two never overwrite each other.
  const matchingRanking = ranking.filter(({ vehicle: v }) =>
    matchesTags(v, tagState) &&
    (!search || `${v.vehicleId} ${uiVehicleType(v)} ${v.depot}`.toLowerCase().includes(search.toLowerCase())),
  )
  const reasonCount = (code: string) => matchingRanking.filter((r) => r.reasons.some((x) => x.code === code && x.scope === "vehicle")).length
  const availableCount = matchingRanking.filter((r) => r.eligible).length
  const fleetCount = (tag: Tag) => tagCount(engine.vehicles, tag)

  const currentStep = !vehicle
    ? tags.length ? "Step 2 · vehicle search" : "Step 1 · all orders, all vehicles"
    : packed ? "Step 4 · orders packed" : "Step 3 · vehicle picked, suggested pack"
  const departsLabel = route?.departureMin != null ? hhmm(route.departureMin) : departsTime
  const routeName = route?.stops[0] ? `${vehicle?.depot ?? "Depot"} → ${route.stops[0].district}` : "Route"

  if (!planning) {
    return (
      <section className="page page-enter">
        <div className="page-heading"><PageTitle>Route scheduling</PageTitle></div>
        <div className="workspace-card calendar-empty">
          <strong>Route suggestions need the planning service</strong>
          <span>Orders, vehicles and the suggestion engine load from the backend, which is not connected in prototype mode.</span>
        </div>
      </section>
    )
  }

  return (
    <section className="page page-enter">
      <div className="page-heading">
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <PageTitle>Route scheduling</PageTitle>

          {/* Route Date Chip */}
          <div className="route-date-wrapper">
            <button
              className={`route-date-chip ${isDatePreset ? "route-date-chip--future" : ""}`}
              onClick={() => setDateChipOpen(!dateChipOpen)}
              type="button"
            >
              <Clock size={16} />
              <span>
                Route date: {routeDateLabel} · departs {departsLabel} ▾
              </span>
            </button>
            {dateChipOpen && (
              <div className="route-date-popover">
                <strong>Route date</strong>
                <div className="route-date-options">
                  {today
                    ? [
                      ...Array.from({ length: 7 }, (_, offset) => addDays(today, offset)),
                      // A date picked in the calendar widget can be beyond the 7-day window.
                      ...(planningDate && planningDate > addDays(today, 6) ? [planningDate] : []),
                    ].map((date) => (
                      <button
                        className={`route-date-option ${planningDate === date ? "route-date-option--active" : ""}`}
                        key={date}
                        onClick={() => {
                          if (date !== planningDate) {
                            // A different day has different orders: start a fresh pack for it.
                            setPlan(null)
                            onPlanningDateChange(date)
                          }
                          setDepartsTime(date === today ? "12:30" : "07:00")
                          setDateChipOpen(false)
                        }}
                        type="button"
                      >
                        <span>{dateLabel(date, today)}</span>
                        <small>{date === today ? "Live" : "Planning"}</small>
                      </button>
                    ))
                    : <span>Loading the date…</span>}
                </div>
                <strong>Style / Tech departure slot</strong>
                <div className="route-time-slots">
                  {["07:00", "08:30", "12:30", "14:00", "16:00"].map((t) => (
                    <button
                      className={`route-time-slot ${departsTime === t ? "route-time-slot--active" : ""}`}
                      key={t}
                      onClick={() => {
                        setDepartsTime(t)
                        setDateChipOpen(false)
                      }}
                      type="button"
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <small>Fresh trips depart at 03:30 (plus Fresh minutes the vehicle already used).</small>
              </div>
            )}
            <span className="step-subtitle">{currentStep}</span>
          </div>
        </div>
      </div>

      <div className="workspace-card schedule-workspace">
        {/* Left: Orders Panel */}
        <section className="orders-panel">
          <div className="orders-heading">
            <div>
              <Heading>Orders</Heading>
              <span>
                {openOrders.length} open · <b style={{ color: "var(--critical-500)" }}>{emergencyCount} emergency</b>
              </span>
            </div>
          </div>

          <div className="order-filters">
            {(["All", "Fresh", "Tech", "Style"] as const).map((type) => {
              const count = type === "All" ? openOrders.length : openOrders.filter((o) => o.type === type).length
              return (
                <UnstyledButton
                  className={orderFilter === type ? "order-filter order-filter--active" : "order-filter"}
                  key={type}
                  onClick={() => setOrderFilter(type)}
                >
                  {type} · {count}
                </UnstyledButton>
              )
            })}
          </div>

          {/* AI Suggestion / Packed Banner - every number comes from the engine */}
          {vehicle && plan ? (
            packed ? (
              <div className="suggestion-banner suggestion-banner--packed">
                <CheckCircle2 size={24} color="var(--cobalt-500)" />
                <div>
                  <strong>Pack added · {selected.size} {selected.size === 1 ? "order" : "orders"}</strong>
                  <span>
                    {route?.load.weightKg.toLocaleString()} kg loaded
                    {remainingSuggested.length ? ` · ${remainingSuggested.length} more suggested` : ""}
                  </span>
                </div>
                {remainingSuggested.length ? (
                  <Button onClick={openReview} variant="secondary">Review</Button>
                ) : null}
                <Button onClick={() => applyEdit({ type: "clear" })} variant="secondary">
                  Undo
                </Button>
              </div>
            ) : remainingSuggested.length ? (
              <div className="suggestion-banner suggestion-banner--ai">
                <Bolt size={24} color="var(--cobalt-500)" />
                <div>
                  <strong>AI suggested: {remainingSuggested.length} {remainingSuggested.length === 1 ? "order" : "orders"}</strong>
                  <span>
                    {suggestedKg.toLocaleString()} kg
                    {suggestionCheck?.tripMinutes != null ? ` · ${suggestionCheck.tripMinutes} min` : ""}
                    {suggestionCheck?.feasible ? ", fits reach" : suggestionCheck?.violations[0] ? ` · ${suggestionCheck.violations[0].message}` : ""}
                  </span>
                </div>
                <Button onClick={openReview} variant="primary">
                  Review
                </Button>
              </div>
            ) : (
              <div className="suggestion-banner suggestion-banner--ai">
                <Bolt size={24} color="var(--cobalt-500)" />
                <div>
                  <strong>No orders fit {vehicle.id}</strong>
                  <span>{topReason(plan.eligibleOrders) ?? "No open orders for this date"}</span>
                </div>
              </div>
            )
          ) : null}
          {notice ? <p role="alert" style={{ color: "var(--critical-500)", margin: "4px 0" }}>{notice}</p> : null}

          {/* Orders List */}
          <div className="order-list">
            {!ordersReady ? <span className="mute">Loading orders…</span> : null}
            {ordersReady && !displayedOrders.length ? <span className="mute">No open orders for {routeDateLabel}.</span> : null}
            {displayedOrders.map((order) => (
              <OrderRow
                added={selected.has(order.apiId ?? "")}
                aiSuggested={suggestedIds.has(order.apiId ?? "")}
                highlighted={highlightedOrder === order.id}
                key={order.id}
                order={order}
                selectedVehicle={vehicle}
                toggleAdded={() => toggleAdded(order)}
                {...(eligibilityOf(order) ? { eligibility: eligibilityOf(order)! } : {})}
              />
            ))}
          </div>

          <div className="panel-actions">
            <p>Postpone orders to another day with a reason and notice.</p>
            <button className="defer-orders-btn" onClick={onOpenDefer} type="button">
              <Clock size={18} />
              <span>Defer orders</span>
            </button>
          </div>
        </section>

        {/* Right: Vehicle Panel */}
        <section className="vehicle-panel">
          <div className="availability-wrap">
            <div className="availability">
              <strong>
                Vehicles available · {availableCount} of {matchingRanking.length}
                {reasonCount("FUEL_QUOTA") > 0 ? (
                  <span style={{ color: "var(--critical-500)", marginLeft: "4px" }}>· {reasonCount("FUEL_QUOTA")} over quota</span>
                ) : ""}
                {reasonCount("TURNS_PER_DAY") > 0 ? (
                  <span style={{ color: "var(--sunburst-900)", marginLeft: "4px" }}>· {reasonCount("TURNS_PER_DAY")} at day limit</span>
                ) : ""}
                {reasonCount("NOT_OPERATING_DAY") > 0 ? (
                  <span style={{ color: "var(--critical-500)", marginLeft: "4px" }}>· closed day</span>
                ) : ""}
              </strong>
              <span><Truck aria-hidden="true" size={24} /> Van ×{fleetCount("Van")}</span>
              <span><Truck aria-hidden="true" size={24} /> Lorry ×{fleetCount("Lorry")}</span>
              <span><Snowflake aria-hidden="true" size={19} /> Refrigerated ×{fleetCount("Refrigerated")}</span>
            </div>
          </div>

          {ctx?.devMode ? (
            <p className="mute" role="note" style={{ margin: "4px 0", fontSize: 12 }}>
              Development mode: closed-day, Fresh-deadline and due-date rules are shown as warnings, not blockers. All other rules apply.
            </p>
          ) : null}

          {engine.status === "loading" ? <div className="vehicle-search"><span className="mute">Loading vehicles and planning data…</span></div> : null}
          {engine.status === "error" ? <div className="vehicle-search"><p role="alert" style={{ color: "var(--critical-500)" }}>{engine.error}</p></div> : null}

          {engine.status === "ready" && vehicle && route && plan && ctx ? (
            /* Selected Vehicle View */
            <div className="selected-vehicle">
              <div className="selected-card">
                <VehicleGraphic large vehicle={vehicle} />
                <div className="selected-card__body">
                  <div className="selected-card__title">
                    <strong className="data-text">{vehicle.id}</strong>
                    <span>{vehicle.type}</span>
                    <span className="turns-today">Turns today {ctx.vehicleState[vehicle.id]?.turnsToday ?? 0} / {DAILY_TURN_LIMIT}</span>
                    <UnstyledButton onClick={() => selectVehicle(null)}>Change</UnstyledButton>
                  </div>
                  <LoadBars route={route} vehicle={vehicle} />
                </div>
              </div>

              <RouteMap depot={vehicle.depot ?? "Depot"} route={route} />

              <div className="selected-footer">
                <strong>
                  {selected.size} {selected.size === 1 ? "order" : "orders"} · {route.load.weightKg.toLocaleString()} kg
                </strong>
                <Button disabled={!packed} icon={Check} onClick={openCheck} variant="primary">
                  Check
                </Button>
              </div>
            </div>
          ) : null}

          {engine.status === "ready" && !vehicle && ctx ? (
            /* Vehicle Search & Grid View */
            <div className="vehicle-search">
              <div className={`tag-search ${tags.length ? "tag-search--active" : ""}`}>
                <Search aria-hidden="true" size={22} />
                {tags.map((tag) => (
                  <UnstyledButton className="active-tag" key={tag} onClick={() => setTagState((current) => toggleTag(current, tag))}>
                    {tag}
                    <X aria-hidden="true" size={15} />
                  </UnstyledButton>
                ))}
                <TextInput
                  aria-label="Search vehicles or add a tag"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tags.length ? "Add another tag…" : "Search vehicles or add a tag…"}
                  value={search}
                />
              </div>

              <div className="suggested-tags">
                <span>Tags:</span>
                {(["Van", "Lorry", "Refrigerated"] as const).filter((t) => !tags.includes(t)).map((t) => (
                  <UnstyledButton
                    key={t}
                    onClick={() => setTagState((current) => toggleTag(current, t))}
                    title={t === "Van" && tagState.type === "truck" ? "Replaces Lorry (a vehicle is either a van or a lorry)" : t === "Lorry" && tagState.type === "van" ? "Replaces Van (a vehicle is either a van or a lorry)" : undefined}
                  >
                    + {t}
                  </UnstyledButton>
                ))}
              </div>

              {tags.length || search ? <strong className="matching-count">{matchingRanking.length} vehicles match</strong> : null}

              <VehicleGrid ctx={ctx} filtered={tags.length > 0} onPick={selectVehicle} ranking={matchingRanking} />
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

      {/* Review Modal */}
      {overlay === "review" && vehicle ? (
        <ReviewModal
          onAdd={() => {
            applyEdit({ type: "addMany", orderIds: reviewIds })
            setOverlay(null)
          }}
          onClose={() => setOverlay(null)}
          onDrop={(id) => {
            const apiId = orderByNumber.get(id)?.apiId
            if (!apiId) return
            setReviewIds((prev) => prev.filter((x) => x !== apiId))
            setReviewDropped((prev) => [...prev, apiId])
          }}
          onSuggestAnother={suggestAnother}
          pack={reviewPack}
          suggestAnotherDisabled={!alternativesLeft}
          vehicle={vehicle}
        />
      ) : null}

      {/* Check Modal - validated by the real planning rules (separate from the suggestion engine) */}
      {overlay === "check" && vehicle ? (
        <CheckModal
          checked={checked}
          onClose={() => setOverlay(null)}
          onDrop={(id) => {
            const apiId = orderByNumber.get(id)?.apiId
            if (apiId) applyEdit({ type: "drop", orderId: apiId })
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
