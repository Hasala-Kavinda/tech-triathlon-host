import { Bolt, Check, CheckCircle2, Clock, Search, Settings, Snowflake, Truck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PreparedTrip } from "../App";
import { addDays, dateLabel } from "../lib/dates";
import { CheckModal } from "../components/CheckModal";
import { blockedReason, canGo, isAtQuota, isDayLimit, recordTurn, vehicleDay, volumeOf } from "../components/planning/helpers";
import { OrderRow } from "../components/planning/OrderRow";
import { ReachMap } from "../components/planning/ReachMap";
import { TurnsToday } from "../components/planning/TurnsToday";
import { VehicleGraphic } from "../components/planning/VehicleGraphic";
import { VolumeRow } from "../components/planning/VolumeRow";
import { ReviewModal } from "../components/ReviewModal";
import { Button, Heading, PageTitle, ProgressBar, TextInput, UnstyledButton } from "../components/ui";
import { DAILY_TURN_LIMIT } from "../lib/constants";
import type { Order, ShopType, Vehicle } from "../types/dispatcher";
export default function SchedulePage({
  navigateHome,
  vehicles,
  setVehicles,
  orders,
  setOrders,
  onOpenManageVehicles,
  onOpenDefer,
  planning,
  today,
  planningDate,
  onPlanningDateChange,
}: {
  /** Today in Asia/Colombo and the day being planned (both YYYY-MM-DD); null until known. */
  today: string | null
  planningDate: string | null
  onPlanningDateChange: (date: string) => void
  navigateHome: (message: string, scheduled: Order[], vehicle: Vehicle, routeDate: string, departureTime: string) => void | Promise<void>
  /** Live planning service. Absent in prototype mode, where navigateHome does everything. */
  planning?: {
    prepare: (scheduled: Order[], vehicle: Vehicle, routeDate: string, departureTime: string) => Promise<PreparedTrip>
    publish: (prepared: PreparedTrip) => Promise<void>
    onPublished: (message: string, scheduled: Order[]) => void
  }
  vehicles: Vehicle[]
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>
  orders: Order[]
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>
  onOpenManageVehicles: () => void
  onOpenDefer: () => void
}) {
  const params = new URLSearchParams(window.location.search)
  // A route planned for a day after today is a "future" plan (departure defaults to the early slot).
  const isDatePreset = Boolean(today && planningDate && planningDate !== today)
  const routeDate = planningDate ?? ""
  const routeDateLabel = planningDate && today ? dateLabel(planningDate, today) : "loading date…"
  const [departsTime, setDepartsTime] = useState(() => (isDatePreset ? "07:00" : "12:30"))
  const [dateChipOpen, setDateChipOpen] = useState(false)

  const [orderFilter, setOrderFilter] = useState<"All" | ShopType>("All")
  const [tags, setTags] = useState<string[]>([])
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [added, setAdded] = useState<string[]>([])
  const [overlay, setOverlay] = useState<"review" | "check" | null>(null)
  const [reviewPack, setReviewPack] = useState<Order[]>([])
  const [checked, setChecked] = useState<string[]>([])

  const highlightedOrder = params.get("order")

  // Backend validation of the route shown in the check sheet. A draft trip is created and
  // validated whenever the sheet opens or the pack, vehicle or slot changes.
  const [prepared, setPrepared] = useState<PreparedTrip | null>(null)
  const [validation, setValidation] = useState<React.ComponentProps<typeof CheckModal>["validation"]>(undefined)
  const [scheduling, setScheduling] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [recheck, setRecheck] = useState(0)

  // Vehicles that can go: under weekly quota and under the daily turn limit
  const availableVehicles = vehicles.filter(canGo)
  const overQuotaCount = vehicles.filter(isAtQuota).length
  const dayLimitCount = vehicles.filter((v) => !isAtQuota(v) && isDayLimit(v)).length

  // Filter orders by shop type (excluding deferred)
  const openOrders = orders.filter((o) => !o.deferred)
  const displayedOrders = useMemo(() => {
    const list = orderFilter === "All"
      ? openOrders
      : openOrders.filter((o) => o.type === orderFilter)

    return [...list].sort(
      (a, b) =>
        Number(b.emergency) - Number(a.emergency) ||
        (vehicle ? Number(b.suggested) - Number(a.suggested) : 0) ||
        Number(b.inReach) - Number(a.inReach),
    )
  }, [openOrders, orderFilter, vehicle])

  // "All" is every open (not deferred) order, emergency or not; the header uses the same list.
  const emergencyCount = openOrders.filter((o) => o.emergency).length
  const fleetCount = (type: Vehicle["type"]) => vehicles.filter((v) => v.type === type).length

  const suggestedOrders = useMemo(() => {
    return openOrders.filter((o) => o.suggested && o.inReach)
  }, [openOrders])

  const addedOrders = useMemo(() => {
    return openOrders.filter((o) => added.includes(o.id))
  }, [openOrders, added])

  const suggestedKg = suggestedOrders.reduce((sum, o) => sum + o.kg, 0)
  const loadKg = addedOrders.reduce((sum, o) => sum + o.kg, 0)
  const capacityPercent = vehicle
    ? Math.round((loadKg / vehicle.capacityKg) * 100)
    : 0

  const packed = added.length > 0
  const isAllSuggestedPacked =
    suggestedOrders.length > 0 &&
    suggestedOrders.every((o) => added.includes(o.id))

  const currentStep = !vehicle
    ? tags.length
      ? "Step 2 · vehicle search"
      : "Step 1 · all orders, all vehicles"
    : packed
      ? "Step 4 · orders packed"
      : "Step 3 · vehicle picked, suggested pack"

  const toggleAdded = (id: string) => {
    setAdded((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const openReview = () => {
    setReviewPack(suggestedOrders)
    setOverlay("review")
  }

  const openCheck = () => {
    setChecked(added)
    // The button must stay disabled until the planning service has answered.
    setValidation(planning ? { phase: "loading" } : undefined)
    setOverlay("check")
  }

  const packKey = addedOrders.map((o) => o.id).join("|")
  useEffect(() => {
    if (!planning || overlay !== "check" || !vehicle || !addedOrders.length) return
    let stale = false
    setPrepared(null)
    setSubmitError("")
    setValidation({ phase: "loading" })
    planning.prepare(addedOrders, vehicle, routeDate, departsTime)
      .then((trip) => {
        if (stale) return
        setPrepared(trip)
        setValidation({ phase: "ready", valid: trip.valid, rules: trip.rules })
      })
      .catch((error) => {
        if (!stale) setValidation({ phase: "error", message: error instanceof Error ? error.message : "The route could not be checked." })
      })
    return () => { stale = true }
    // addedOrders is derived from packKey; planning callbacks are recreated on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, vehicle?.id, packKey, routeDate, departsTime, recheck])

  const schedule = async () => {
    if (!vehicle) return
    if (!planning) {
      setOverlay(null)
      recordTurn(vehicle)
      void navigateHome(`Route ${vehicle.id} scheduled`, addedOrders, vehicle, routeDate, departsTime)
      return
    }
    if (!prepared) return
    setScheduling(true)
    setSubmitError("")
    try {
      await planning.publish(prepared)
      recordTurn(vehicle)
      setOverlay(null)
      planning.onPublished(`Route ${vehicle.id} scheduled`, addedOrders)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "The route could not be scheduled.")
    } finally {
      setScheduling(false)
    }
  }

  const matchingVehicles = useMemo(() => {
    if (!tags.length) return vehicles
    return vehicles.filter((v) =>
      tags.every((tag) => v.type.toLowerCase().includes(tag.toLowerCase())),
    )
  }, [vehicles, tags])

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) setTags((prev) => [...prev, tag])
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
                Route date: {routeDateLabel} · departs {departsTime} ▾
              </span>
            </button>
            {dateChipOpen && (
              <div className="route-date-popover">
                <strong>Route date</strong>
                <div className="route-date-options">
                  {today
                    ? Array.from({ length: 7 }, (_, offset) => addDays(today, offset)).map((date) => (
                      <button
                        className={`route-date-option ${planningDate === date ? "route-date-option--active" : ""}`}
                        key={date}
                        onClick={() => {
                          if (date !== planningDate) {
                            // A different day has different orders: start a fresh pack for it.
                            setAdded([])
                            setVehicle(null)
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
                <strong>Departure slot</strong>
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

          {/* AI Suggestion / Packed Banner */}
          {vehicle ? (
            packed ? (
              <div className="suggestion-banner suggestion-banner--packed">
                <CheckCircle2 size={24} color="var(--cobalt-500)" />
                <div>
                  <strong>Pack added · {added.length} of {suggestedOrders.length}</strong>
                  <span>{loadKg.toLocaleString()} kg loaded</span>
                </div>
                <Button onClick={() => setAdded([])} variant="secondary">
                  Undo
                </Button>
              </div>
            ) : (
              <div className="suggestion-banner suggestion-banner--ai">
                <Bolt size={24} color="var(--cobalt-500)" />
                <div>
                  <strong>AI suggested: {suggestedOrders.length} {suggestedOrders.length === 1 ? "order" : "orders"}</strong>
                  <span>{suggestedKg.toLocaleString()} kg, fits reach</span>
                </div>
                <Button onClick={openReview} variant="primary">
                  Review
                </Button>
              </div>
            )
          ) : null}

          {/* Orders List */}
          <div className="order-list">
            {displayedOrders.map((order) => (
              <OrderRow
                added={added.includes(order.id)}
                aiSuggested={order.suggested}
                datePreset={isDatePreset ? "28" : undefined}
                highlighted={highlightedOrder === order.id}
                key={order.id}
                order={order}
                selectedVehicle={vehicle}
                toggleAdded={toggleAdded}
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
                Vehicles available · {availableVehicles.length} of {vehicles.length}
                {overQuotaCount > 0 ? (
                  <span style={{ color: "var(--critical-500)", marginLeft: "4px" }}>
                    · {overQuotaCount} over quota
                  </span>
                ) : ""}
                {dayLimitCount > 0 ? (
                  <span style={{ color: "var(--sunburst-900)", marginLeft: "4px" }}>
                    · {dayLimitCount} at day limit
                  </span>
                ) : ""}
              </strong>
              <span>
                <Truck aria-hidden="true" size={24} /> Van ×{fleetCount("Van")}
              </span>
              <span>
                <Truck aria-hidden="true" size={24} /> Lorry ×{fleetCount("Lorry")}
              </span>
              <span>
                <Snowflake aria-hidden="true" size={19} /> Refrigerated ×{fleetCount("Refrigerated")}
              </span>
            </div>
          </div>

          {vehicle ? (
            /* Selected Vehicle View */
            <div className="selected-vehicle">
              <div className="selected-card">
                <VehicleGraphic large vehicle={vehicle} />
                <div className="selected-card__body">
                  <div className="selected-card__title">
                    <strong className="data-text">{vehicle.id}</strong>
                    <span>{vehicle.type}</span>
                    <TurnsToday vehicle={vehicle} />
                    <UnstyledButton onClick={() => setVehicle(null)}>
                      Change
                    </UnstyledButton>
                  </div>
                  <div className="selected-card__load">
                    <strong>
                      Load {loadKg.toLocaleString()} /{" "}
                      {vehicle.capacityKg.toLocaleString()} kg
                    </strong>
                    <b>{capacityPercent}%</b>
                  </div>
                  <ProgressBar
                    value={capacityPercent}
                    warning={capacityPercent >= 90}
                  />
                  <VolumeRow used={volumeOf(addedOrders)} vehicle={vehicle} />
                </div>
              </div>

              <ReachMap packed={packed} />

              <div className="selected-footer">
                <strong>
                  {added.length} {added.length === 1 ? "order" : "orders"} ·{" "}
                  {loadKg.toLocaleString()} kg
                </strong>
                <Button
                  disabled={!packed}
                  icon={Check}
                  onClick={openCheck}
                  variant="primary"
                >
                  Check
                </Button>
              </div>
            </div>
          ) : (
            /* Vehicle Search & Grid View */
            <div className="vehicle-search">
              <div className={`tag-search ${tags.length ? "tag-search--active" : ""}`}>
                <Search aria-hidden="true" size={22} />
                {tags.map((tag) => (
                  <UnstyledButton
                    className="active-tag"
                    key={tag}
                    onClick={() => setTags((current) => current.filter((t) => t !== tag))}
                  >
                    {tag}
                    <X aria-hidden="true" size={15} />
                  </UnstyledButton>
                ))}
                <TextInput
                  aria-label="Search vehicles or add a tag"
                  placeholder={tags.length ? "Add another tag…" : "Search vehicles or add a tag…"}
                />
              </div>

              <div className="suggested-tags">
                <span>Tags:</span>
                {["Van", "Lorry", "Refrigerated", "Tail lift"]
                  .filter((t) => !tags.includes(t))
                  .map((t) => (
                    <UnstyledButton key={t} onClick={() => addTag(t)}>
                      + {t}
                    </UnstyledButton>
                  ))}
              </div>

              {tags.length ? (
                <strong className="matching-count">
                  {matchingVehicles.length} vehicles match
                </strong>
              ) : null}

              <div className={`vehicle-grid ${tags.length ? "vehicle-grid--filtered" : ""}`}>
                {matchingVehicles.map((v) => {
                  const blocked = blockedReason(v)
                  const { turnsToday, volumeM3 } = vehicleDay(v)
                  return (
                    <UnstyledButton
                      className={`vehicle-card ${blocked ? "vehicle-card--quota-reached" : ""}`}
                      key={v.id}
                      onClick={() => {
                        if (blocked) {
                          onOpenManageVehicles()
                        } else {
                          setVehicle(v)
                        }
                      }}
                      title={
                        isAtQuota(v)
                          ? "Weekly quota reached · raise it in Manage vehicles"
                          : blocked
                            ? `${turnsToday} turns done today (max ${DAILY_TURN_LIMIT}) · free again tomorrow`
                            : "Select vehicle"
                      }
                    >
                      <VehicleGraphic vehicle={v} />
                      <strong className="data-text">{v.id}</strong>
                      <b>{v.type}</b>
                      {blocked ? (
                        <span className="vehicle-card__quota-text">{blocked}</span>
                      ) : (
                        <span>
                          {v.capacityKg.toLocaleString()} kg · {volumeM3} m³ · {v.length}
                        </span>
                      )}
                      <span className="vehicle-card__turns">
                        Turns today {turnsToday} / {DAILY_TURN_LIMIT}
                      </span>
                      <em>{blocked ? "Manage →" : "Select →"}</em>
                    </UnstyledButton>
                  )
                })}
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

      {/* Review Modal */}
      {overlay === "review" && vehicle ? (
        <ReviewModal
          onAdd={() => {
            setAdded(reviewPack.map((o) => o.id))
            setOverlay(null)
          }}
          onClose={() => setOverlay(null)}
          onDrop={(id) => setReviewPack((prev) => prev.filter((o) => o.id !== id))}
          pack={reviewPack}
          vehicle={vehicle}
        />
      ) : null}

      {/* Check Modal */}
      {overlay === "check" && vehicle ? (
        <CheckModal
          checked={checked}
          onClose={() => setOverlay(null)}
          onDrop={(id) => {
            setAdded((prev) => prev.filter((item) => item !== id))
            setChecked((prev) => prev.filter((item) => item !== id))
          }}
          onRetryValidation={() => setRecheck((count) => count + 1)}
          onSchedule={() => void schedule()}
          pack={addedOrders}
          scheduling={scheduling}
          setChecked={setChecked}
          vehicle={vehicle}
          {...(planning ? { validation } : {})}
          {...(submitError ? { submitError } : {})}
        />
      ) : null}
    </section>
  )
}
