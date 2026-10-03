import { Bolt, Check, CheckCircle2, Clock, Search, Settings, Snowflake, Truck, X } from "lucide-react";
import { useMemo, useState } from "react";
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
}: {
  navigateHome: (message: string, scheduled: Order[], vehicle: Vehicle, routeDate: string, departureTime: string) => void | Promise<void>
  vehicles: Vehicle[]
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>
  orders: Order[]
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>
  onOpenManageVehicles: () => void
  onOpenDefer: () => void
}) {
  const params = new URLSearchParams(window.location.search)
  const dateParam = params.get("date")
  const isDatePreset = Boolean(dateParam)
  const [routeDate, setRouteDate] = useState(() =>
    isDatePreset ? "Mon 28 Sep" : "Today · Sun 27",
  )
  const [departsTime, setDepartsTime] = useState(() =>
    isDatePreset ? "07:00" : "12:30",
  )
  const [dateChipOpen, setDateChipOpen] = useState(false)

  const [orderFilter, setOrderFilter] = useState<"All" | ShopType>("All")
  const [tags, setTags] = useState<string[]>([])
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [added, setAdded] = useState<string[]>([])
  const [overlay, setOverlay] = useState<"review" | "check" | null>(null)
  const [reviewPack, setReviewPack] = useState<Order[]>([])
  const [checked, setChecked] = useState<string[]>([])

  const highlightedOrder = params.get("order")

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

  const suggestedOrders = useMemo(() => {
    return openOrders.filter((o) => o.suggested && o.inReach)
  }, [openOrders])

  const addedOrders = useMemo(() => {
    return openOrders.filter((o) => added.includes(o.id))
  }, [openOrders, added])

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
    setOverlay("check")
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
                Route date: {routeDate} · departs {departsTime} ▾
              </span>
            </button>
            {dateChipOpen && (
              <div className="route-date-popover">
                <strong>Route date</strong>
                <div className="route-date-options">
                  <button
                    className={`route-date-option ${routeDate.includes("27") ? "route-date-option--active" : ""}`}
                    onClick={() => {
                      setRouteDate("Today · Sun 27")
                      setDepartsTime("12:30")
                      setDateChipOpen(false)
                    }}
                    type="button"
                  >
                    <span>Today · Sun 27 Sep</span>
                    <small>Live</small>
                  </button>
                  <button
                    className={`route-date-option ${routeDate.includes("28") ? "route-date-option--active" : ""}`}
                    onClick={() => {
                      setRouteDate("Mon 28 Sep")
                      setDepartsTime("07:00")
                      setDateChipOpen(false)
                    }}
                    type="button"
                  >
                    <span>Mon 28 Sep</span>
                    <small>Planning</small>
                  </button>
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
                {openOrders.length} open · <b style={{ color: "var(--critical-500)" }}>2 emergency</b>
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
                  <strong>Pack added · {added.length} of 5</strong>
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
                  <strong>AI suggested: 5 orders</strong>
                  <span>1,260 kg, fits reach</span>
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
                <Truck aria-hidden="true" size={24} /> Van ×2
              </span>
              <span>
                <Truck aria-hidden="true" size={24} /> Lorry ×2
              </span>
              <span>
                <Snowflake aria-hidden="true" size={19} /> Refrigerated ×1
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
          onSchedule={() => {
            setOverlay(null)
            recordTurn(vehicle)
            void navigateHome(`Route ${vehicle.id} scheduled`, addedOrders, vehicle, routeDate, departsTime)
          }}
          pack={addedOrders}
          setChecked={setChecked}
          vehicle={vehicle}
        />
      ) : null}
    </section>
  )
}
