import { ArrowRight, CheckCircle2, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { CalendarModal } from "../components/CalendarModal";
import { DayPlannerCard } from "../components/planning/DayPlannerCard";
import { FilterCard } from "../components/planning/FilterCard";
import { RouteRow } from "../components/planning/RouteRow";
import { Button, Heading, PageTitle, ProgressBar, ShopTag, UnstyledButton } from "../components/ui";
import { completedRouteRecord } from "../lib/constants";
import type { Order, RouteRecord, ShopType } from "../types/dispatcher";
export default function HomePage({
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

  // Live mode shows every published route the backend returns; the id filter only
  // selects the sample routes in prototype mode.
  const activeToday = import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === "true"
    ? routes.filter((item) => ["WP LB-4521", "WP CAB-7810", "WP KD-3301", "SP LC-2290"].includes(item.id))
    : routes
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
