import {
  AlertCircle,
  ArrowRight,
  Bell,
  Bolt,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Clock3,
  Home,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquareText,
  Phone,
  Search,
  Settings,
  Snowflake,
  Truck,
  UserRound,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import wayTrackLogo from "./assets/waytrack-logo.png"
import { planningApi, type DriverReference, type TripInput } from "./api/planning"
import { apiRequest } from "./api/client"
import { clearSession } from "./auth/session"
import { CalendarModal } from "./components/CalendarModal"
import { CheckModal } from "./components/CheckModal"
import { DeferModal } from "./components/DeferModal"
import { DriverHoverCard } from "./components/DriverHoverCard"
import { ManageVehiclesModal } from "./components/ManageVehiclesModal"
import { OrderDetailsModal } from "./components/OrderDetailsModal"
import { OrderLogPage } from "./components/OrderLogPage"
import { RemarksModal } from "./components/RemarksModal"
import { ReviewModal } from "./components/ReviewModal"
import { RouteSummaryModal } from "./components/RouteSummaryModal"
import {
  Button,
  Heading,
  PageTitle,
  ProgressBar,
  ShopTag,
  TextInput,
  UnstyledButton,
} from "./components/ui"
import type { Order, Person, Remark, RouteRecord, ShopType, Vehicle } from "./types/dispatcher";
import { completedRouteRecord, initialOrders, initialRemarks, initialRoutes, initialVehicles, people, DAILY_TURN_LIMIT, OPEN_ORDER_EVENT, TODAY, TODAY_ORDER_IDS, DEPOT } from "./lib/constants";
import { AppShell } from './components/layout/AppShell';

function getInitialPath() {
  if (window.location.pathname.startsWith("/monitor/")) {
    return window.location.pathname
  }
  if (window.location.pathname.startsWith("/orders")) return "/orders"
  return window.location.pathname.startsWith("/schedule")
    ? "/schedule"
    : "/home"
}


function RouteRow({
  item,
  onOpen,
}: {
  item: RouteRecord
  onOpen: (remarksOpen: boolean) => void
}) {
  return (
    <UnstyledButton
      className="route-row"
      onClick={(event) =>
        onOpen(
          Boolean((event.target as HTMLElement).closest(".remarks-count")),
        )
      }
    >
      <span className="route-row__identity">
        <span className="route-row__top">
          <span className="data-text">{item.id}</span>
          {item.tags.map((tag) => (
            <ShopTag key={tag} type={tag} />
          ))}
        </span>
        <span className="route-row__name">{item.route}</span>
      </span>
      <span className="route-row__progress">
        <strong>
          {item.done}/{item.total} shops
        </strong>
        <ProgressBar value={(item.done / item.total) * 100} />
      </span>
      <span className="route-row__end">
        {item.remarks ? (
          <span className="remarks-count">
            <Bell aria-hidden="true" size={18} />
            <strong>{item.remarks}</strong>
          </span>
        ) : null}
        <ChevronRight
          className="route-row__chevron"
          aria-hidden="true"
          size={22}
        />
      </span>
    </UnstyledButton>
  )
}

function FilterCard({
  type,
  count,
  active,
  onClick,
}: {
  type: ShopType
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <UnstyledButton
      className={`filter-card ${active ? "filter-card--active" : ""}`}
      onClick={onClick}
    >
      {count ? <span className="filter-card__count">{count}</span> : null}
      <strong>Waypoint {type}</strong>
      <span>
        {active ? "Filter on · click to clear" : "Shop type · active routes"}
      </span>
      {active ? (
        <X className="filter-card__x" aria-hidden="true" size={20} />
      ) : null}
    </UnstyledButton>
  )
}

function DayPlannerCard({
  day,
  filter,
  onOpenCalendar,
  onSelectDay,
}: {
  day: number
  filter: ShopType | null
  onOpenCalendar: () => void
  onSelectDay: (day: number) => void
}) {
  const [clock, setClock] = useState(() => new Date(2026, 8, 27, 10, 42))
  const isToday = day === 27
  const scope = filter ?? "All"
  const todayDue = scope === "Fresh" ? 2 : scope === "Tech" ? 1 : scope === "Style" ? 2 : 5
  const todayUnscheduled =
    scope === "Fresh" || scope === "Style" ? 1 : scope === "Tech" ? 0 : 2
  const nextDue = scope === "Fresh" ? 3 : scope === "Tech" ? 2 : scope === "Style" ? 2 : 7
  const week = [
    { label: "Sun", day: 27, count: 5 },
    { label: "Mon", day: 28, count: 3 },
    { label: "Tue", day: 29, count: 0 },
    { label: "Wed", day: 30, count: 4 },
    { label: "Thu", day: 1, count: 0 },
    { label: "Fri", day: 2, count: 3 },
    { label: "Sat", day: 3, count: 0 },
  ]

  useEffect(() => {
    const timer = window.setInterval(
      () => setClock((current) => new Date(current.getTime() + 60_000)),
      60_000,
    )
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="day-planner-card">
      <div className="day-planner-card__top">
        <span className="day-planner-date">
          <small>{isToday ? "Sun" : "Mon"}</small>
          <strong>{day}</strong>
          <b>Sep</b>
        </span>
        <span className="day-planner-clock">
          <strong>
            {clock.toLocaleTimeString("en", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </strong>
          <span>
            <i /> Live{isToday ? "" : " · today Sun 27"}
          </span>
        </span>
        <UnstyledButton onClick={onOpenCalendar}>
          Open calendar →
        </UnstyledButton>
      </div>
      <div className="day-planner-stats">
        <div className="day-stat day-stat--due">
          <strong>{isToday ? todayDue : 3}</strong>
          <b>{isToday ? "Due today" : "Due Mon 28"}</b>
          <span>
            {isToday ? todayUnscheduled : 2} not scheduled yet
          </span>
        </div>
        <div className="day-stat">
          <strong>{isToday ? nextDue : 1}</strong>
          <b>{isToday ? "Due next 3 days" : "Route scheduled"}</b>
          <span>{isToday ? "Mon 28 – Wed 30" : "WP PK-7741 · 07:00"}</span>
        </div>
      </div>
      <div className="week-strip">
        {week.map((item) => (
          <UnstyledButton
            className={item.day === day ? "week-day week-day--active" : "week-day"}
            key={`${item.label}-${item.day}`}
            onClick={() => onSelectDay(item.day)}
          >
            <span>{item.label}</span>
            <strong>{item.day}</strong>
            {item.count ? <b>{item.count}</b> : null}
          </UnstyledButton>
        ))}
      </div>
    </div>
  )
}

function HomePage({
  navigate,
  toast,
  filter,
  setFilter,
  approved,
  viewDate,
  setViewDate,
  routes,
  orders,
}: {
  navigate: (path: string) => void
  toast: string
  filter: ShopType | null
  setFilter: React.Dispatch<React.SetStateAction<ShopType | null>>
  approved: boolean
  viewDate: number
  setViewDate: React.Dispatch<React.SetStateAction<number>>
  routes: RouteRecord[]
  orders: Order[]
}) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarDay, setCalendarDay] = useState(viewDate)
  const [showAllCompleted, setShowAllCompleted] = useState(false)
  const isToday = viewDate === 27

  const activeToday = routes.filter((item) =>
    ["WP LB-4521", "WP CAB-7810", "WP KD-3301", "SP LC-2290"].includes(item.id),
  )
  const shownRoutes = filter
    ? activeToday.filter((item) => item.tags.includes(filter))
    : activeToday

  const completedRoute = completedRouteRecord
  const futureRoute: RouteRecord = {
    id: "WP PK-7741",
    route: "Galle → Weligama · Coastal 02",
    tags: ["Fresh", "Tech"],
    done: 0,
    total: 3,
    remarks: 0,
  }

  const futureOrders = orders.filter((o) => o.dueDay === 28 && !o.stop)
  const shownFutureOrders = filter
    ? futureOrders.filter((order) => order.type === filter)
    : futureOrders

  const showFutureRoute = !filter || futureRoute.tags.includes(filter)
  const filterCounts = isToday
    ? { Fresh: 4, Tech: 2, Style: 3 }
    : { Fresh: 1, Tech: 1, Style: 0 }

  return (
    <section className="page page-enter">
      <div className="page-heading">
        <div className="home-title-row">
          <PageTitle>Dispatcher home</PageTitle>
          <span className={isToday ? "plan-pill" : "plan-pill plan-pill--future"}>
            {isToday
              ? "Today's plan · Sun 27 Sep"
              : "Planning ahead · Mon 28 Sep"}
          </span>
        </div>
        {!isToday ? (
          <Button
            onClick={() => {
              setViewDate(27)
              window.history.pushState({}, "", "/home")
            }}
          >
            ← Back to today
          </Button>
        ) : null}
      </div>
      {toast ? (
        <div className="toast" role="status">
          <CheckCircle2 aria-hidden="true" size={19} />
          {toast}
        </div>
      ) : null}
      <div className="workspace-card home-workspace">
        <div className="filter-grid">
          <FilterCard
            active={filter === "Fresh"}
            count={filterCounts.Fresh}
            onClick={() => setFilter(filter === "Fresh" ? null : "Fresh")}
            type="Fresh"
          />
          <FilterCard
            active={filter === "Tech"}
            count={filterCounts.Tech}
            onClick={() => setFilter(filter === "Tech" ? null : "Tech")}
            type="Tech"
          />
          <FilterCard
            active={filter === "Style"}
            count={filterCounts.Style}
            onClick={() => setFilter(filter === "Style" ? null : "Style")}
            type="Style"
          />
        </div>
        <div className="home-day-grid">
          <aside className="day-plan-column">
            <DayPlannerCard
              day={viewDate}
              filter={filter}
              onOpenCalendar={() => {
                setCalendarDay(viewDate)
                setCalendarOpen(true)
              }}
              onSelectDay={(day) => {
                setCalendarDay(day)
                setCalendarOpen(true)
              }}
            />
            <Button
              className="schedule-cta"
              icon={ArrowRight}
              onClick={() =>
                navigate(
                  isToday
                    ? "/schedule"
                    : `/schedule?date=2026-09-${viewDate}`,
                )
              }
              variant="primary"
            >
              <span className="schedule-cta__copy">
                <strong>
                  {isToday
                    ? "Schedule orders"
                    : `Schedule orders for Mon ${viewDate}`}
                </strong>
                <small>
                  {isToday
                    ? `${filter === "Fresh" ? 1 : 2} order${filter === "Fresh" ? "" : "s"} due today not scheduled`
                    : "2 orders due that day not scheduled"}
                </small>
              </span>
            </Button>
          </aside>
          <section className="day-routes-column">
            {isToday ? (
              <>
                <div className="section-heading">
                  <Heading>Active routes</Heading>
                  <span>
                    {filter ? `Waypoint ${filter}` : "All shop types"} ·{" "}
                    {shownRoutes.length} routes
                  </span>
                  {filter ? (
                    <UnstyledButton
                      className="clear-filter"
                      onClick={() => setFilter(null)}
                    >
                      Clear filter <X aria-hidden="true" size={16} />
                    </UnstyledButton>
                  ) : null}
                </div>
                <div className="route-list route-list--home">
                  {shownRoutes.map((item) => (
                    <RouteRow
                      item={
                        approved && item.id === "WP LB-4521"
                          ? { ...item, remarks: 0 }
                          : item
                      }
                      key={item.id}
                      onOpen={(remarksOpen) =>
                        navigate(
                          `/monitor/${item.id.replace(/ /g, "-")}${remarksOpen ? "?remarks=open" : ""
                          }`,
                        )
                      }
                    />
                  ))}
                </div>
                <div className="section-heading completed-heading">
                  <Heading>Completed today</Heading>
                  <span>{filter && filter !== "Fresh" ? 0 : 2} routes</span>
                  <UnstyledButton
                    className="show-all-link"
                    onClick={() => setShowAllCompleted((current) => !current)}
                  >
                    {showAllCompleted ? "Show less" : "Show all"}
                  </UnstyledButton>
                </div>
                {!filter || filter === "Fresh" ? (
                  <UnstyledButton
                    className="completed-route-row"
                    onClick={() =>
                      navigate("/monitor/SP-ND-4417?state=completed")
                    }
                  >
                    <span>
                      <span className="data-text">{completedRoute.id}</span>
                      <ShopTag type="Fresh" />
                      <small>{completedRoute.route}</small>
                    </span>
                    <span>
                      <strong>4/4 shops</strong>
                      <ProgressBar value={100} />
                    </span>
                    <b>Done 10:05</b>
                    <ChevronRight aria-hidden="true" size={21} />
                  </UnstyledButton>
                ) : null}
              </>
            ) : (
              <>
                <div className="section-heading">
                  <Heading>Scheduled routes</Heading>
                  <span>Mon 28 Sep · {showFutureRoute ? 1 : 0} route</span>
                </div>
                {showFutureRoute ? (
                  <UnstyledButton
                    className="future-route-row"
                    onClick={() => navigate("/schedule?date=2026-09-28")}
                  >
                    <span>
                      <span className="data-text">{futureRoute.id}</span>
                      <ShopTag type="Fresh" />
                      <ShopTag type="Tech" />
                      <small>{futureRoute.route}</small>
                    </span>
                    <span>
                      <strong>0/3 shops</strong>
                      <ProgressBar value={0} />
                    </span>
                    <b>Starts 07:00</b>
                    <ChevronRight aria-hidden="true" size={21} />
                  </UnstyledButton>
                ) : null}
                <div className="section-heading future-due-heading">
                  <Heading>Due Mon 28, not scheduled</Heading>
                  <span>{shownFutureOrders.length} orders</span>
                </div>
                <div className="future-order-list">
                  {shownFutureOrders.map((order) => (
                    <UnstyledButton
                      className="future-order-row"
                      key={order.id}
                      onClick={() =>
                        navigate(
                          `/schedule?date=2026-09-28&order=${order.id}`,
                        )
                      }
                    >
                      <span>
                        <span className="data-text">{order.id}</span>
                        <ShopTag type={order.type} />
                        <small>
                          {order.shop} · {order.town} · {order.kg} kg
                        </small>
                      </span>
                      <b>Not scheduled</b>
                    </UnstyledButton>
                  ))}
                </div>
                <div className="section-heading future-completed-heading">
                  <Heading>Completed</Heading>
                  <span>none yet · future day</span>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      {calendarOpen ? (
        <CalendarModal
          initialDay={calendarDay}
          onClose={() => setCalendarOpen(false)}
          onOpenDay={(day) => {
            setCalendarOpen(false)
            setViewDate(day)
            window.history.pushState(
              {},
              "",
              day === 27 ? "/home" : "/home?date=2026-09-28",
            )
          }}
          onSchedule={(day, orderId) => {
            setCalendarOpen(false)
            // Any day: due-day scheduling — that day's due orders locked,
            // AI suggested vehicle, more orders on the route.
            navigate(
              day === 27
                ? `/schedule?mode=immediate${orderId ? `&order=${orderId}` : ""}`
                : `/schedule?mode=due&date=2026-09-${String(day).padStart(2, "0")}${orderId ? `&order=${orderId}` : ""}`,
            )
          }}
          orders={orders}
        />
      ) : null}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Daily turns (max 2 per vehicle per day) and load volume.            */
/* Values here extend sampleData without changing its Vehicle type.    */
/* ------------------------------------------------------------------ */
const VEHICLE_DAY: Record<string, { turnsToday: number; volumeM3: number }> = {
  "WP PH-2210": { turnsToday: 1, volumeM3: 6 },
  "WP PK-7741": { turnsToday: 2, volumeM3: 6 },
  "WP LC-8870": { turnsToday: 0, volumeM3: 18 },
  "WP LE-1123": { turnsToday: 1, volumeM3: 30 },
  "WP LR-5006": { turnsToday: 0, volumeM3: 12 },
}

function vehicleDay(v: Vehicle) {
  const known = VEHICLE_DAY[v.id]
  const fallbackVolume =
    v.type === "Van" ? 6 : v.type === "Refrigerated" ? 12 : v.capacityKg >= 3000 ? 30 : 18
  return {
    turnsToday: known?.turnsToday ?? 0,
    volumeM3: known?.volumeM3 ?? fallbackVolume,
  }
}

function isAtQuota(v: Vehicle) {
  return v.turns >= v.turnQuota || v.km >= v.kmQuota
}

function isDayLimit(v: Vehicle) {
  return vehicleDay(v).turnsToday >= DAILY_TURN_LIMIT
}

function canGo(v: Vehicle) {
  return !isAtQuota(v) && !isDayLimit(v)
}

/** Count one more turn today for this vehicle (after a route is scheduled). */
function recordTurn(v: Vehicle) {
  const day = vehicleDay(v)
  VEHICLE_DAY[v.id] = { ...day, turnsToday: day.turnsToday + 1 }
}

/** Estimated volume of an order in m³, from its items (e.g. "12 crates"). */
function orderVolume(o: Order) {
  const match = o.items.match(/(\d+)\s*(crate|box|bag|pallet)/i)
  if (!match) return Math.round((o.kg / 250) * 100) / 100
  const perUnit: Record<string, number> = { crate: 0.06, box: 0.04, bag: 0.03, pallet: 1.2 }
  return Math.round(Number(match[1]) * perUnit[match[2].toLowerCase()] * 100) / 100
}

function volumeOf(list: Order[]) {
  return Math.round(list.reduce((sum, o) => sum + orderVolume(o), 0) * 10) / 10
}

function TurnsToday({ vehicle }: { vehicle: Vehicle }) {
  const { turnsToday } = vehicleDay(vehicle)
  const full = turnsToday >= DAILY_TURN_LIMIT
  return (
    <span className={`turns-today ${full ? "turns-today--full" : ""}`}>
      Turns today {turnsToday} / {DAILY_TURN_LIMIT}
    </span>
  )
}

function VolumeRow({ vehicle, used }: { vehicle: Vehicle; used: number }) {
  const total = vehicleDay(vehicle).volumeM3
  const percent = Math.round((used / total) * 100)
  return (
    <>
      <div className="selected-card__load selected-card__load--volume">
        <strong>
          Volume {used.toFixed(1)} / {total} m³
        </strong>
        <b>{percent}%</b>
      </div>
      <ProgressBar value={percent} warning={percent >= 90} />
    </>
  )
}

/** Why a vehicle can't be picked, or null if it can. */
function blockedReason(v: Vehicle) {
  if (isAtQuota(v)) return "Quota reached"
  if (isDayLimit(v)) return `Day limit · ${DAILY_TURN_LIMIT}/${DAILY_TURN_LIMIT} turns`
  return null
}

function VehicleGraphic({
  vehicle,
  large = false,
}: {
  vehicle: Vehicle
  large?: boolean
}) {
  return (
    <div className={`vehicle-graphic ${large ? "vehicle-graphic--large" : ""}`}>
      <Truck
        aria-hidden="true"
        size={large ? 88 : vehicle.capacityKg > 2500 ? 62 : 52}
        strokeWidth={1.7}
      />
      {vehicle.type === "Refrigerated" ? (
        <Snowflake
          className="vehicle-graphic__snow"
          aria-hidden="true"
          size={16}
        />
      ) : null}
      {large ? (
        <span className="vehicle-graphic__length">↔ {vehicle.length}</span>
      ) : null}
    </div>
  )
}

function openOrderDetails(order: Order) {
  window.dispatchEvent(new CustomEvent<Order>(OPEN_ORDER_EVENT, { detail: order }))
}

/** Click / Enter on an order row opens its details, except on its buttons. */
function orderRowOpenProps(order: Order) {
  return {
    role: "button" as const,
    tabIndex: 0,
    title: "Open order details",
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest("button")) return
      openOrderDetails(order)
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" && e.target === e.currentTarget) openOrderDetails(order)
    },
  }
}

function OrderRow({
  order,
  selectedVehicle,
  added,
  toggleAdded,
  aiSuggested,
  highlighted,
  datePreset,
}: {
  order: Order
  selectedVehicle: Vehicle | null
  added: boolean
  toggleAdded: (id: string) => void
  aiSuggested?: boolean
  highlighted?: boolean
  datePreset?: string
}) {
  const isDuePresetDay = datePreset && order.dueDay === 28

  return (
    <div
      className={`order-row ${order.emergency ? "order-row--emergency" : ""} ${selectedVehicle && !order.inReach ? "order-row--disabled" : ""
        } ${highlighted ? "order-row--highlighted" : ""} order-row--clickable`}
      {...orderRowOpenProps(order)}
    >
      {order.emergency ? (
        <AlertCircle
          className="order-row__alert"
          aria-hidden="true"
          size={26}
        />
      ) : (
        <span className="order-row__alert-space" />
      )}
      <div className="order-row__content">
        <div className="order-row__line">
          <span className="data-text">{order.id}</span>
          <ShopTag type={order.type} />
          {isDuePresetDay ? (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "999px",
                background: "var(--sunburst-100)",
                color: "var(--sunburst-900)",
                fontWeight: 700,
                fontSize: "11px",
              }}
            >
              Due Mon 28
            </span>
          ) : null}
          {selectedVehicle && (aiSuggested ?? order.suggested) ? (
            <Bolt
              className="suggestion-star"
              aria-label="Suggested order"
              size={20}
            />
          ) : null}
          <strong className="order-row__kg">{order.kg} kg</strong>
          {selectedVehicle ? (
            order.inReach ? (
              <Button
                className="order-row__action"
                onClick={() => toggleAdded(order.id)}
                variant={added ? "primary" : "secondary"}
              >
                {added ? "✓ Added" : "+ Add"}
              </Button>
            ) : (
              <span className="out-of-reach">Out of reach</span>
            )
          ) : null}
        </div>
        <span className="order-row__meta">
          {order.shop} · {order.town} · {order.items}
        </span>
      </div>
    </div>
  )
}

function ReachMap({ packed }: { packed: boolean }) {
  return (
    <div className="map-wrap">
      <div
        className="reach-map"
        aria-label="Vehicle reach map from Galle to Matara"
      >
        <span className="map-label map-label--akuressa">
          Akuressa · out of reach
        </span>
        <span className="out-pin" />
        <span className="map-label map-label--depot">Galle depot</span>
        <span className="depot-pin" />
        <div className="reach-zone" />
        {packed ? <div className="route-line" /> : null}
        {[8, 25, 56, 70, 91].map((left) => (
          <span
            className={`shop-pin ${packed ? "shop-pin--covered" : ""}`}
            key={left}
            style={{ left: `${left}%` }}
          />
        ))}
        <span className="map-label map-label--weligama">Weligama</span>
        <span className="map-label map-label--matara">Matara</span>
      </div>
      <div className="shop-reach">
        <strong>{packed ? "Shops covered" : "Shops in reach"} · 5</strong>
        {[
          "Sunrise Mart",
          "Lanka Super Stores",
          "Coastal Traders",
          "Mirissa Mart",
          "Matara City Mart",
        ].map((shop) => (
          <span key={shop}>
            {packed ? <Check aria-hidden="true" size={17} /> : <i />} {shop}
          </span>
        ))}
        <p>Hill View Stores, Akuressa, is out of reach</p>
      </div>
    </div>
  )
}

function SchedulePage({
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

/* ------------------------------------------------------------------ */
/* Due-day scheduling — opened from the calendar's "Schedule for       */
/* [day]" button (today or any other day). The orders due that day are */
/* pre-added and locked, the system suggests the best vehicle, and     */
/* other orders along the same route can be added.                     */
/* ------------------------------------------------------------------ */
// Extra orders that lie on the typical route for a day. If sampleData has an
// order with the same id, that one is used instead.
const ROUTE_EXTRAS_BY_DAY: Record<number, Order[]> = {
  27: [
    { id: "ORD-1061", shop: "Imaduwa Traders", town: "Imaduwa", type: "Tech", items: "5 boxes", kg: 140, emergency: false, inReach: true, suggested: true, dueDay: 28 },
    { id: "ORD-1064", shop: "Akuressa Food City", town: "Akuressa", type: "Fresh", items: "12 crates", kg: 180, emergency: false, inReach: true, suggested: true, dueDay: 28 },
    { id: "ORD-1066", shop: "Fort Book Corner", town: "Galle Fort", type: "Style", items: "3 boxes", kg: 60, emergency: false, inReach: true, suggested: true, dueDay: 30 },
  ] as Order[],
  28: [
    { id: "ORD-1080", shop: "Weligama Bay Stores", town: "Weligama", type: "Fresh", items: "9 crates", kg: 130, emergency: false, inReach: true, suggested: true, dueDay: 30 },
    { id: "ORD-1082", shop: "Unawatuna Beach Mart", town: "Unawatuna", type: "Style", items: "4 boxes", kg: 90, emergency: false, inReach: true, suggested: true, dueDay: 30 },
  ] as Order[],
}

// Rough map positions (viewBox 520 × 300) for towns around Galle.
const TOWN_POS: Record<string, { x: number; y: number }> = {
  "Galle Fort": { x: 70, y: 262 },
  Galle: { x: 92, y: 244 },
  Hikkaduwa: { x: 36, y: 170 },
  Baddegama: { x: 120, y: 120 },
  Unawatuna: { x: 150, y: 256 },
  Ahangama: { x: 225, y: 258 },
  Weligama: { x: 300, y: 248 },
  Mirissa: { x: 360, y: 258 },
  Matara: { x: 452, y: 250 },
  Imaduwa: { x: 250, y: 160 },
  Akuressa: { x: 405, y: 92 },
}

function dayLabel(day: number) {
  const date = new Date(2026, 8, day)
  return {
    weekday: date.toLocaleString("en", { weekday: "short" }),
    short: `${date.toLocaleString("en", { weekday: "short" })} ${day} Sep`,
  }
}

function pinsFor(list: Order[]) {
  const seen: Record<string, number> = {}
  const pins: Record<string, { x: number; y: number }> = {}
  list.forEach((o, i) => {
    const base = TOWN_POS[o.town] ?? { x: 120 + i * 70, y: 200 - (i % 2) * 40 }
    const n = seen[o.town] ?? 0
    seen[o.town] = n + 1
    pins[o.id] = { x: base.x + n * 22, y: base.y + n * 16 }
  })
  return pins
}

function RouteLineMap({
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

function routeNameFor(list: Order[]) {
  const pins = pinsFor(list)
  if (!list.length) return "Galle"
  const far = list.reduce((a, b) => (pins[b.id].x > pins[a.id].x ? b : a))
  return `Galle → ${far.town}`
}

function DueSchedulePage({
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

function PersonBadge({
  person,
  size = "medium",
  showRole = false,
}: {
  person: Person
  size?: "small" | "medium" | "large"
  showRole?: boolean
}) {
  return (
    <div className={`person-badge person-badge--${size}`}>
      <UnstyledButton
        aria-label={`View ${person.name}, ${person.role}`}
        className="person-trigger"
      >
        <UserRound aria-hidden="true" size={size === "large" ? 38 : 25} />
      </UnstyledButton>
      {showRole ? <strong>{person.role}</strong> : null}
      <div className="person-card" role="tooltip">
        <span className="person-card__portrait">
          <UserRound aria-hidden="true" size={40} />
        </span>
        <span className="person-card__details">
          <strong>{person.name}</strong>
          <span>
            {person.role} {person.shop ? `· ${person.shop}` : ""}
          </span>
          <UnstyledButton
            className="person-card__phone"
            onClick={() => {
              window.location.href = `tel:${person.phone.replace(/ /g, "")}`
            }}
          >
            <Phone aria-hidden="true" size={14} />
            {person.phone}
          </UnstyledButton>
        </span>
      </div>
    </div>
  )
}

function MonitorPage({
  remarks,
  setRemarks,
  onApprove,
}: {
  remarks: Remark[]
  setRemarks: React.Dispatch<React.SetStateAction<Remark[]>>
  onApprove: (message: string) => void
}) {
  const params = new URLSearchParams(window.location.search)
  const completed = params.get("state") === "completed"
  const remarksParam = params.get("remarks") === "open"

  const [remarksModalOpen, setRemarksModalOpen] = useState(remarksParam)
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)

  const vehicleId = completed ? "SP ND-4417" : "WP LB-4521"
  const routeName = completed
    ? "Galle → Matara · Southern 05"
    : "Galle → Matara · Southern 03"

  const unreviewedCount = remarks.filter((r) => !r.reviewed).length
  const allRemarksReviewed = unreviewedCount === 0

  const stops = completed
    ? [
      { shop: "Sunrise Mart", address: "Lighthouse St, Galle Fort", time: "07:10", arrived: true, person: people.sunriseManager },
      { shop: "Lanka Super Stores", address: "Main St, Unawatuna", time: "07:55", arrived: true, person: people.lankaManager },
      { shop: "Coastal Traders", address: "Galle Rd, Weligama", time: "08:40", arrived: true, person: people.coastalManager },
      { shop: "Matara City Mart", address: "Anagarika Dharmapala Mw, Matara", time: "09:50", arrived: true, person: people.lankaManager },
    ]
    : [
      { shop: "Sunrise Mart", address: "Lighthouse St, Galle Fort", time: "08:55", arrived: true, person: people.sunriseManager },
      { shop: "Lanka Super Stores", address: "Main St, Unawatuna", time: "09:40", arrived: true, person: people.lankaManager },
      { shop: "Coastal Traders", address: "Galle Rd, Weligama", time: "10:20", arrived: true, person: people.coastalManager },
      { shop: "Matara City Mart", address: "Anagarika Dharmapala Mw, Matara", time: "11:35", arrived: false, nextStop: true },
    ]

  return (
    <section className="page page-enter monitor-page">
      <div className="page-heading">
        <div>
          <PageTitle>Route monitoring</PageTitle>
        </div>
        <div className="page-heading__meta">
          {completed ? (
            "Completed route · read only"
          ) : (
            <span style={{ color: "var(--navy-900)", fontWeight: 600 }}>
              Live route · on time
            </span>
          )}
        </div>
      </div>

      <div className="workspace-card monitor-workspace">
        {/* Left Column: Route and Stop Timeline */}
        <section className="monitor-route">
          <div className="monitor-route__heading">
            <VehicleGraphic
              large
              vehicle={{
                id: vehicleId,
                type: "Lorry",
                capacityKg: 2000,
                length: "6.1 m",
                turns: 0,
                turnQuota: 0,
                km: 0,
                kmQuota: 0,
                fuel: 0,
              }}
            />
            <div>
              <strong className="monitor-route__id">{vehicleId}</strong>
              <span>Route: {routeName}</span>
            </div>
          </div>

          <div className={`stop-timeline ${completed ? "stop-timeline--completed" : ""}`}>
            <div className="stop-timeline__head">
              <span>Shop</span>
              <span>Time</span>
              <span>Stock manager</span>
            </div>

            {stops.map((stop) => (
              <div
                className={`stop-row ${stop.arrived ? "stop-row--visited" : ""}`}
                key={stop.shop}
              >
                <span className="stop-row__marker">
                  {stop.arrived ? (
                    <Check aria-hidden="true" size={22} />
                  ) : (
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        border: "2px solid var(--cobalt-500)",
                      }}
                    />
                  )}
                </span>
                <span className="stop-row__shop">
                  <strong>{stop.shop}</strong>
                  <span>{stop.address}</span>
                </span>
                <span className="stop-row__time">
                  <b style={{ color: stop.arrived ? "var(--emerald-700)" : "var(--cobalt-500)" }}>
                    {stop.time}
                  </b>
                  <small style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)" }}>
                    {stop.arrived ? "arrived" : "est. arrival"}
                  </small>
                </span>
                <span className="stop-row__manager">
                  {stop.person ? (
                    <PersonBadge person={stop.person} size="small" />
                  ) : stop.nextStop ? (
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "999px",
                        background: "var(--cobalt-50)",
                        color: "var(--cobalt-500)",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}
                    >
                      Next stop
                    </span>
                  ) : (
                    "Not visited"
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Route Summary Trigger Button */}
          <div style={{ marginTop: "28px" }}>
            <Button
              disabled={!completed}
              onClick={() => setSummaryModalOpen(true)}
              variant={completed ? "primary" : "secondary"}
            >
              📖 Route summary {completed ? "" : "· after the route finishes"}
            </Button>
          </div>
        </section>

        {/* Right Column: Status, Crew, Remarks */}
        <section className="monitor-details">
          {/* Route Status Card */}
          <div className="route-status">
            <div className="route-status__top">
              <strong>Route status</strong>
              <span className={completed ? "route-status__done" : ""}>
                {completed ? "✓ Done" : "In progress"}
              </span>
            </div>
            <div className="route-status__metric">
              <strong className="data-text">{completed ? "4/4" : "3/4"}</strong>
              <b>shops covered</b>
            </div>
            <div style={{ margin: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span>Started {completed ? "06:32" : "08:15"}</span>
                <span>{completed ? "Ended 10:05" : "Est. end 12:05"}</span>
              </div>
              <span className={completed ? "completed-progress" : ""}>
                <ProgressBar value={completed ? 100 : 75} />
              </span>
            </div>
            <p>
              {completed ? (
                <span style={{ color: "var(--emerald-700)", fontWeight: 600 }}>
                  Finished 5 min after plan · all 4 shops covered
                </span>
              ) : (
                <span>
                  Now 10:42 · next stop at 11:35 ·{" "}
                  <strong style={{ color: "var(--emerald-700)" }}>on time</strong>
                </span>
              )}
            </p>
          </div>

          {/* Crew Panel */}
          <div className="crew-panel">
            <strong>Crew</strong>
            <div className="crew-list">
              <DriverHoverCard driver={people.driver} vehicleId={vehicleId} />
              <PersonBadge person={people.loaderOne} showRole size="large" />
              <PersonBadge person={people.loaderTwo} showRole size="large" />
            </div>
          </div>

          {/* Remarks Block */}
          <div
            className="remarks-bar"
            onClick={() => setRemarksModalOpen(true)}
            style={{ cursor: "pointer", marginTop: "14px" }}
          >
            <strong>
              Remarks <span>{remarks.length}</span>
            </strong>
            <span>
              {completed ? (
                <span style={{ color: "var(--emerald-700)" }}>3 of 3 reviewed</span>
              ) : (
                `${remarks.filter((r) => r.reviewed).length} of ${remarks.length} reviewed`
              )}
            </span>
            <span style={{ color: "var(--cobalt-500)", fontWeight: 700, marginLeft: "12px" }}>
              {completed ? "View →" : "Review →"}
            </span>
          </div>

          {/* Accept route button or Accepted stamp */}
          {completed ? (
            <div className="approved-stamp">
              <CheckCircle2 aria-hidden="true" size={22} />
              <span>Accepted · 10:20</span>
            </div>
          ) : (
            <Button
              className="approve-button"
              disabled={!allRemarksReviewed}
              onClick={() => onApprove(`Route ${vehicleId} accepted`)}
              variant={allRemarksReviewed ? "confirm" : "secondary"}
            >
              {allRemarksReviewed ? "✓ Accept route" : "Accept route"}
            </Button>
          )}
        </section>
      </div>

      {/* Remarks Review Modal */}
      {remarksModalOpen ? (
        <RemarksModal
          onClose={() => setRemarksModalOpen(false)}
          onUpdateRemarks={setRemarks}
          remarks={remarks}
          vehicleId={vehicleId}
        />
      ) : null}

      {/* Route Summary Modal */}
      {summaryModalOpen ? (
        <RouteSummaryModal
          dateStr="Sun 27 Sep"
          onClose={() => setSummaryModalOpen(false)}
          route={routeName}
          vehicleId={vehicleId}
        />
      ) : null}
    </section>
  )
}

export default function App() {
  const [path, setPath] = useState(getInitialPath)
  const [search, setSearch] = useState(() => window.location.search)
  const [toast, setToast] = useState("")
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [orderNotices, setOrderNotices] = useState<
    Record<string, { text: string; shareWithCrew: boolean }>
  >({})

  useEffect(() => {
    const onOpen = (e: Event) => setDetailOrder((e as CustomEvent<Order>).detail)
    window.addEventListener(OPEN_ORDER_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_ORDER_EVENT, onOpen)
  }, [])
  const [approved, setApproved] = useState(false)
  const [homeFilter, setHomeFilter] = useState<ShopType | null>(null)
  const [viewDate, setViewDate] = useState(() =>
    new URLSearchParams(window.location.search).get("date") ? 28 : 27,
  )

  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles)
  const [drivers, setDrivers] = useState<DriverReference[]>([])
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [routes, setRoutes] = useState<RouteRecord[]>(initialRoutes)
  const [remarks, setRemarks] = useState<Remark[]>(initialRemarks)

  useEffect(() => {
    if (import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === "true") return
    const serviceDate = import.meta.env.VITE_SERVICE_DATE ?? new Date().toISOString().slice(0, 10)
    void Promise.all([planningApi.orders(serviceDate), planningApi.vehicles(serviceDate), planningApi.drivers()])
      .then(([apiOrders, apiVehicles, apiDrivers]) => {
        setOrders(apiOrders.map((order) => ({
          apiId: order._id,
          id: order.orderNumber,
          shop: order.outletId,
          town: order.outletId,
          type: order.brand,
          items: `${order.items.reduce((sum, item) => sum + item.quantity, 0)} units`,
          kg: order.totalWeightKg,
          emergency: order.cutoffBucket === "after_cutoff",
          inReach: true,
          suggested: true,
        })))
        setVehicles(apiVehicles.map((vehicle) => ({
          id: vehicle.vehicleId,
          type: vehicle.temperatureClass === "reefer" ? "Refrigerated" : vehicle.type.toLowerCase() === "van" ? "Van" : "Lorry",
          capacityKg: vehicle.weightCapacityKg,
          length: "Reference fleet",
          turns: 0,
          turnQuota: 2,
          km: 0,
          kmQuota: Math.round(vehicle.weeklyFuelQuotaL * vehicle.kmPerL),
          fuel: 100,
        })))
        setDrivers(apiDrivers)
      })
      .catch((error) => {
        console.error("Dispatcher planning data request failed", error)
        setOrders([])
        setVehicles([])
      })
  }, [])

  const [manageVehiclesOpen, setManageVehiclesOpen] = useState(false)
  const [deferOpen, setDeferOpen] = useState(false)

  useEffect(() => {
    if (window.location.pathname === "/")
      window.history.replaceState({}, "", "/home")
    const onPopState = () => {
      setPath(getInitialPath())
      setSearch(window.location.search)
      setViewDate(
        new URLSearchParams(window.location.search).get("date") ? 28 : 27,
      )
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const navigate = (nextPath: string) => {
    window.history.pushState({}, "", nextPath)
    setPath(getInitialPath())
    setSearch(window.location.search)
    setToast("")
  }

  const serviceDate = import.meta.env.VITE_SERVICE_DATE ?? new Date().toISOString().slice(0, 10)
  const prototypeMode = import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === "true"

  const datePlusDays = (date: string, days: number) => {
    const value = new Date(`${date}T00:00:00Z`)
    value.setUTCDate(value.getUTCDate() + days)
    return value.toISOString().slice(0, 10)
  }

  const publishSchedule = async (scheduled: Order[], vehicle: Vehicle, targetDate: string, departureTime: string) => {
    if (prototypeMode) return
    const liveOrders = scheduled.filter((order): order is Order & { apiId: string } => Boolean(order.apiId))
    if (liveOrders.length !== scheduled.length) throw new Error("One or more selected orders are not backed by the planning service.")
    const driver = drivers[0]
    if (!driver) throw new Error("No active Driver is available for this route.")
    const departureAt = new Date(`${targetDate}T${departureTime}:00+05:30`)
    const input: TripInput = {
      serviceDate: targetDate,
      departureAt: departureAt.toISOString(),
      plannedEndAt: new Date(departureAt.getTime() + (liveOrders.length + 1) * 30 * 60_000).toISOString(),
      vehicleId: vehicle.id,
      driverId: driver._id,
      distanceKm: Math.max(10, liveOrders.length * 12),
      stops: liveOrders.map((order, index) => ({
        orderId: order.apiId,
        plannedArrivalAt: new Date(departureAt.getTime() + (index + 1) * 20 * 60_000).toISOString(),
      })),
    }
    const draft = await planningApi.createTrip(input)
    const validation = await planningApi.validateTrip(draft._id)
    if (!validation.valid) {
      const failures = validation.rules.filter((rule) => !rule.passed).map((rule) => rule.message).join(" ")
      throw new Error(failures || "The route failed planning validation.")
    }
    await planningApi.publishTrip(draft._id, validation.version)
  }

  const finishSchedule = (message: string, scheduled: Order[], day?: number) => {
    window.history.pushState({}, "", "/home")
    setPath("/home")
    setSearch("")
    setToast(message)
    setOrders((prev) => {
      const ids = scheduled.map((o) => o.id)
      const updated = prev.map((o) =>
        ids.includes(o.id) ? { ...o, stop: ids.indexOf(o.id) + 1, dueDay: o.dueDay ?? day } : o,
      )
      const missing = scheduled
        .filter((o) => !prev.some((p) => p.id === o.id))
        .map((o) => ({ ...o, stop: ids.indexOf(o.id) + 1, dueDay: day }))
      return [...updated, ...missing]
    })
  }

  const completeSchedule = async (message: string, scheduled: Order[], vehicle: Vehicle, routeDate: string, departureTime: string) => {
    try {
      const targetDate = routeDate.includes("28") ? datePlusDays(serviceDate, 1) : serviceDate
      await publishSchedule(scheduled, vehicle, targetDate, departureTime)
      finishSchedule(message, scheduled)
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The route could not be published.")
    }
  }

  const completeImmediate = async (message: string, scheduled: Order[], day: number, vehicle: Vehicle, departureTime: string) => {
    try {
      const targetDate = datePlusDays(serviceDate, Math.max(0, day - TODAY))
      await publishSchedule(scheduled, vehicle, targetDate, departureTime)
      finishSchedule(message, scheduled, day)
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The route could not be published.")
    }
  }

  const completeApproval = (message: string) => {
    setApproved(true)
    window.history.pushState({}, "", "/home")
    setPath("/home")
    setToast(message)
  }

  const handleDeferOrders = async (
    selectedIds: string[],
    deferTo: string,
    reasons: string[],
    notice: string,
  ) => {
    const selected = orders.filter((order) => selectedIds.includes(order.id))
    try {
      if (!prototypeMode) {
        const apiIds = selected.map((order) => order.apiId).filter((id): id is string => Boolean(id))
        if (apiIds.length !== selected.length) throw new Error("One or more selected orders are not backed by the planning service.")
        const offset = deferTo.startsWith("Wed") ? 3 : deferTo.startsWith("Tue") ? 2 : 1
        const reasonCode = (reasons[0] ?? "dispatcher_deferral").toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/^_|_$/g, "")
        const results = await planningApi.deferBatch(apiIds, datePlusDays(serviceDate, offset), reasonCode, [reasons.join(", "), notice].filter(Boolean).join(" — "))
        const conflicts = results.filter((result) => result.result === "conflict").length
        if (conflicts) throw new Error(`${conflicts} order${conflicts === 1 ? "" : "s"} changed before deferral. Refresh and try again.`)
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The orders could not be deferred.")
      return
    }
    setOrders((prev) =>
      prev.map((o) =>
        selectedIds.includes(o.id)
          ? {
            ...o,
            deferred: true,
            deferredTo: deferTo,
            deferredNotice: notice,
            dueDay: 28,
          }
          : o,
      ),
    )
    setDeferOpen(false)
    setToast(`${selectedIds.length} orders deferred to ${deferTo.split(" · ")[0]}`)
  }

  const handleUpdateVehicles = (updated: Vehicle[]) => {
    setVehicles(updated)
    setManageVehiclesOpen(false)
    setToast("Weekly quota updated")
  }

  return (
    <AppShell navigate={navigate} path={path}>
      {path === "/schedule" &&
        ["immediate", "due"].includes(
          new URLSearchParams(search).get("mode") ?? "",
        ) ? (
        <DueSchedulePage
          day={
            new URLSearchParams(search).get("mode") === "immediate"
              ? 27
              : Number(
                (new URLSearchParams(search).get("date") ?? "2026-09-27").slice(8, 10),
              ) || 27
          }
          key={search}
          onOpenDefer={() => setDeferOpen(true)}
          onOpenManageVehicles={() => setManageVehiclesOpen(true)}
          onOpenNormal={() => navigate("/schedule")}
          onScheduled={completeImmediate}
          orders={orders}
          vehicles={vehicles}
        />
      ) : path === "/schedule" ? (
        <SchedulePage
          key={search}
          navigateHome={completeSchedule}
          onOpenDefer={() => setDeferOpen(true)}
          onOpenManageVehicles={() => setManageVehiclesOpen(true)}
          orders={orders}
          setOrders={setOrders}
          setVehicles={setVehicles}
          vehicles={vehicles}
        />
      ) : path === "/orders" ? (
        <OrderLogPage
          onOpenOrder={(entry) =>
            openOrderDetails(
              orders.find((o) => o.id === entry.id) ??
              ({
                id: entry.id,
                shop: entry.shop,
                town: entry.town,
                type: entry.type,
                items: entry.items,
                kg: entry.kg,
                emergency: false,
                inReach: true,
                suggested: false,
                dueDay: entry.day,
                stop: entry.stop === "—" ? undefined : Number(entry.stop),
                deferred: entry.status === "Deferred",
              } as Order),
            )
          }
          orders={orders}
        />
      ) : path.startsWith("/monitor/") ? (
        <MonitorPage
          onApprove={completeApproval}
          remarks={remarks}
          setRemarks={setRemarks}
        />
      ) : (
        <HomePage
          approved={approved}
          filter={homeFilter}
          navigate={navigate}
          orders={orders}
          routes={routes}
          setFilter={setHomeFilter}
          setViewDate={setViewDate}
          toast={toast}
          viewDate={viewDate}
        />
      )}

      {/* Global Modals for Defer & Manage Vehicles */}
      {deferOpen ? (
        <DeferModal
          onClose={() => setDeferOpen(false)}
          onDefer={handleDeferOrders}
          orders={orders.filter((o) => !o.deferred)}
        />
      ) : null}

      {manageVehiclesOpen ? (
        <ManageVehiclesModal
          dailyTurnLimit={DAILY_TURN_LIMIT}
          turnsToday={Object.fromEntries(vehicles.map((v) => [v.id, vehicleDay(v).turnsToday]))}
          volumes={Object.fromEntries(vehicles.map((v) => [v.id, vehicleDay(v).volumeM3]))}
          onClose={() => setManageVehiclesOpen(false)}
          onSubmit={handleUpdateVehicles}
          vehicles={vehicles}
        />
      ) : null}

      {/* Store order details — opened by clicking any order */}
      {detailOrder ? (
        <OrderDetailsModal
          key={detailOrder.id}
          notice={orderNotices[detailOrder.id]}
          onClose={() => setDetailOrder(null)}
          onSaveNotice={(text: string, shareWithCrew: boolean) => {
            setOrderNotices((prev) => ({
              ...prev,
              [detailOrder.id]: { text, shareWithCrew },
            }))
            setToast(`Notice saved for ${detailOrder.id}`)
          }}
          order={orders.find((o) => o.id === detailOrder.id) ?? detailOrder}
        />
      ) : null}
    </AppShell>
  )
}
