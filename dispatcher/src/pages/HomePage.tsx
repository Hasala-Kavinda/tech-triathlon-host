import { ArrowRight, CheckCircle2, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { shortDate, addDays } from "../lib/dates";
import { countsByDate, useDueRange } from "../lib/dueData";
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
  today,
  dueVersion,
  offsetMs,
  synced,
  openDay,
  routes,
  orders,
}: {
  navigate: (path: string) => void
  toast: string
  filter: ShopType | null
  setFilter: React.Dispatch<React.SetStateAction<ShopType | null>>
  approved: boolean
  today: string | null
  /** Bumped by App whenever orders change server-side, to refetch the due counts. */
  dueVersion: number
  offsetMs: number
  synced: boolean
  /** Opens Route scheduling for a date (sets the Route date, then navigates). */
  openDay: (date: string, brand?: ShopType | null) => void
  routes: RouteRecord[]
  orders: Order[]
}) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarDate, setCalendarDate] = useState<string | null>(null)
  const [showAllCompleted, setShowAllCompleted] = useState(false)
  // Due counts and operating days for the 7-day strip; refetched whenever App bumps `dueVersion` (after scheduling/deferring).
  const { calendar, summary } = useDueRange(today, today ? addDays(today, 6) : null, dueVersion)
  const stripCounts = countsByDate(summary, filter)
  const todayByBrand = (brand: ShopType) =>
    summary.find((row) => row.date === today && row.brand === brand)?.unscheduled ?? 0
  const todayUnscheduled = today ? stripCounts.get(today)?.unscheduled ?? 0 : 0

  // Live mode shows every published route the backend returns; the id filter only
  // selects the sample routes in prototype mode.
  const activeToday = import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === "true"
    ? routes.filter((item) => ["WP LB-4521", "WP CAB-7810", "WP KD-3301", "SP LC-2290"].includes(item.id))
    : routes
  const shownRoutes = filter
    ? activeToday.filter((item) => item.tags.includes(filter))
    : activeToday

  const completedRoute = completedRouteRecord
  const filterCounts = {
    Fresh: todayByBrand("Fresh"),
    Tech: todayByBrand("Tech"),
    Style: todayByBrand("Style"),
  }

  return (
    <section className="page page-enter">
      <div className="page-heading">
        <div className="home-title-row">
          <PageTitle>Dispatcher home</PageTitle>
          <span className="plan-pill">
            Today's plan{today ? ` · ${shortDate(today)}` : ""}
          </span>
        </div>
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
            {today ? (
              <DayPlannerCard
                today={today}
                offsetMs={offsetMs}
                synced={synced}
                counts={stripCounts}
                calendar={calendar}
                onOpenCalendar={() => {
                  setCalendarDate(today)
                  setCalendarOpen(true)
                }}
                onSelectDay={(date) => {
                  setCalendarDate(date)
                  setCalendarOpen(true)
                }}
              />
            ) : null}
            <Button
              className="schedule-cta"
              icon={ArrowRight}
              onClick={() => (today ? openDay(today, filter) : navigate("/schedule"))}
              variant="primary"
            >
              <span className="schedule-cta__copy">
                <strong>Schedule orders</strong>
                <small>
                  {`${todayUnscheduled} order${todayUnscheduled === 1 ? "" : "s"} due today not scheduled`}
                </small>
              </span>
            </Button>
          </aside>
          <section className="day-routes-column">
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
          </section>
        </div>
      </div>
      {calendarOpen && today && calendarDate ? (
        <CalendarModal
          initialDate={calendarDate}
          brand={filter}
          reloadKey={dueVersion}
          offsetMs={offsetMs}
          onClose={() => setCalendarOpen(false)}
          onOpenDay={(date) => {
            setCalendarOpen(false)
            openDay(date, filter)
          }}
          synced={synced}
          today={today}
        />
      ) : null}
    </section>
  )
}
