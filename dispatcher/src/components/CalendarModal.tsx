import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"
import { useEffect, useState } from "react"
import { planningApi, type DueOrder } from "../api/planning"
import { addDays, shortDate } from "../lib/dates"
import { countsByDate, useDueRange } from "../lib/dueData"
import { colomboTime, useNow } from "../lib/useServerClock"
import { openOrderDetails } from "./planning/helpers"
import { Button, Heading, IconButton, ShopTag, UnstyledButton } from "./ui"
import type { Order, ShopType } from "../types/dispatcher";

type CalendarModalProps = {
  today: string
  offsetMs: number
  synced: boolean
  initialDate: string
  reloadKey?: number
  /** The home screen's shop-type filter; null = all brands. */
  brand?: ShopType | null
  onClose: () => void
  /** Go to Route scheduling for this date. The calendar never schedules anything itself. */
  onOpenDay: (date: string) => void
}

const monthStartOf = (iso: string) => `${iso.slice(0, 7)}-01`

function shiftMonth(monthStart: string, delta: number) {
  const d = new Date(`${monthStart}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + delta, 1)
  return d.toISOString().slice(0, 10)
}

const SCHEDULED_STATUSES = ["allocated", "loading", "load_confirmed", "in_transit", "delivered", "delivery_failed"]
const isScheduled = (order: DueOrder) => Boolean(order.allocatedTripId) || SCHEDULED_STATUSES.includes(order.status)

const toOrder = (order: DueOrder): Order => ({
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
})

export function CalendarModal({ today, offsetMs, synced, initialDate, reloadKey = 0, brand = null, onClose, onOpenDay }: CalendarModalProps) {
  const now = useNow(offsetMs)
  const [monthStart, setMonthStart] = useState(monthStartOf(initialDate))
  const [selected, setSelected] = useState(initialDate)
  const [dayOrders, setDayOrders] = useState<DueOrder[] | null>(null)
  const [dayFailed, setDayFailed] = useState(false)

  const nextMonthStart = shiftMonth(monthStart, 1)
  const monthEnd = addDays(nextMonthStart, -1)
  const daysInMonth = Number(monthEnd.slice(8, 10))
  const mondayOffset = (new Date(`${monthStart}T00:00:00Z`).getUTCDay() + 6) % 7
  const monthName = new Intl.DateTimeFormat("en", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${monthStart}T00:00:00Z`))

  // Month data is fetched for whichever month is showing, so < > always reads that month's data.
  const { calendar, summary, loading, failed } = useDueRange(monthStart, monthEnd, reloadKey)
  const counts = countsByDate(summary, brand)
  const calendarKnown = calendar.size > 0
  const isClosed = (date: string) => calendarKnown && !calendar.get(date)?.isOperating

  useEffect(() => {
    let cancelled = false
    setDayOrders(null)
    setDayFailed(false)
    planningApi.dueOrders(selected, brand)
      .then((rows) => { if (!cancelled) setDayOrders(rows) })
      .catch(() => { if (!cancelled) { setDayOrders([]); setDayFailed(true) } })
    return () => { cancelled = true }
  }, [selected, brand, reloadKey])

  const goToMonth = (next: string) => {
    setMonthStart(next)
    setSelected(next === monthStartOf(today) ? today : next)
  }

  const notScheduled = (dayOrders ?? []).filter((o) => !isScheduled(o)).length
  const selectedInfo = calendar.get(selected)
  const selectedClosed = isClosed(selected)

  return (
    <div
      className="modal-layer"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        aria-labelledby="calendar-title"
        aria-modal="true"
        className="modal calendar-modal"
        role="dialog"
      >
        <div className="calendar-main">
          <div className="calendar-heading">
            <Heading id="calendar-title">{monthName}</Heading>
            <IconButton icon={ChevronLeft} label="Previous month" onClick={() => goToMonth(shiftMonth(monthStart, -1))} />
            <IconButton icon={ChevronRight} label="Next month" onClick={() => goToMonth(nextMonthStart)} />
          </div>

          <div className="calendar-weekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid" aria-busy={loading}>
            {Array.from({ length: mondayOffset }, (_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const date = addDays(monthStart, index)
              const day = index + 1
              const due = counts.get(date)?.due ?? 0
              const unscheduled = counts.get(date)?.unscheduled ?? 0
              const closed = isClosed(date)
              const info = calendar.get(date)
              // A closed day stays selectable if orders are due on it, so they are never hidden.
              const disabled = closed && due === 0
              const classes = ["calendar-day"]
              if (date === selected) classes.push("calendar-day--selected")
              else if (date === today) classes.push("calendar-day--today")
              if (closed) classes.push("calendar-day--closed")

              return (
                <UnstyledButton
                  className={classes.join(" ")}
                  disabled={disabled}
                  key={date}
                  onClick={() => setSelected(date)}
                  title={closed ? `Closed${info?.festival ? ` · ${info.festival.replaceAll("_", " ")}` : ""}` : unscheduled ? `${unscheduled} not scheduled` : due ? `${due} due, all scheduled` : undefined}
                >
                  {day}
                  {unscheduled ? <i /> : null}
                </UnstyledButton>
              )
            })}
          </div>

          <div className="calendar-legend">
            <span>
              <i /> Not scheduled
            </span>
            <span>
              <i /> Today
            </span>
            {calendarKnown ? <span>Hatched = closed</span> : null}
          </div>
          {failed ? <p role="alert">Some calendar data could not be loaded.</p> : null}
        </div>

        <div className="calendar-orders">
          <div className="calendar-orders__actions">
            <span className="calendar-live-chip">
              <i /> {colomboTime(now)} · {synced ? "live" : "offline"}
            </span>
            <Button
              onClick={() => {
                setMonthStart(monthStartOf(today))
                setSelected(today)
              }}
              variant="secondary"
            >
              Today
            </Button>
            <IconButton icon={X} label="Close calendar" onClick={onClose} />
          </div>

          <Heading>{shortDate(selected)} · {brand ? `${brand} orders` : "orders"} due</Heading>

          {selectedClosed ? (
            <p>Closed — not an operating day{selectedInfo?.festival ? ` (${selectedInfo.festival.replaceAll("_", " ")})` : ""}.</p>
          ) : null}

          {dayOrders === null ? (
            <p>Loading…</p>
          ) : dayOrders.length > 0 ? (
            <>
              <p>
                {dayOrders.length} orders due · {notScheduled} not scheduled yet
              </p>
              <div className="calendar-order-list">
                {dayOrders.map((order) => (
                  <UnstyledButton
                    className={`calendar-order ${order.cutoffBucket === "after_cutoff" ? "calendar-order--emergency" : ""}`}
                    key={order._id}
                    onClick={() => openOrderDetails(toOrder(order))}
                    title="Open order details"
                  >
                    <span>
                      <span className="calendar-order__top">
                        <span className="data-text">{order.orderNumber}</span>
                        <ShopTag type={order.brand} />
                      </span>
                      <span>
                        {order.outletId} · {order.totalWeightKg} kg
                        {order.cutoffBucket === "after_cutoff" ? " · Emergency" : ""}
                      </span>
                    </span>
                    <strong
                      className={
                        isScheduled(order)
                          ? "calendar-status calendar-status--scheduled"
                          : "calendar-status calendar-status--pending"
                      }
                    >
                      {order.status.replaceAll("_", " ")}
                    </strong>
                  </UnstyledButton>
                ))}
              </div>
            </>
          ) : (
            <div className="calendar-empty">
              <CalendarDays aria-hidden="true" size={28} />
              <strong>{dayFailed ? "Orders could not be loaded" : "No orders due"}</strong>
              <span>{dayFailed ? "Try again in a moment." : `Nothing is due on ${shortDate(selected)}.`}</span>
            </div>
          )}

          <div className="calendar-date-actions">
            <Button onClick={() => onOpenDay(selected)} variant="primary">
              {selected === today ? "Open route scheduling for today →" : `Open route scheduling for ${shortDate(selected)} →`}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
