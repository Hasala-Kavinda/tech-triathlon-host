import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"
import { useState } from "react"
import { Button, Heading, IconButton, ShopTag, UnstyledButton } from "./ui"
import type { Order } from "../types/dispatcher";

type CalendarModalProps = {
  initialDay: number
  orders: Order[]
  onClose: () => void
  onSchedule: (day: number, orderId?: string) => void
  onOpenDay: (day: number) => void
}

export function CalendarModal({
  initialDay,
  orders,
  onClose,
  onSchedule,
  onOpenDay,
}: CalendarModalProps) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(initialDay)
  const monthDate = new Date(2026, 8 + monthOffset, 1)
  const monthName = monthDate.toLocaleString("en", {
    month: "long",
    year: "numeric",
  })
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  ).getDate()
  const mondayOffset = (monthDate.getDay() + 6) % 7

  // Filter orders by selected day
  const ordersForDay = monthOffset === 0
    ? orders.filter((o) => (o.dueDay ?? 27) === selectedDay && !o.deferred)
    : []

  const hasOrders = ordersForDay.length > 0
  const selectedLabel = selectedDay === 27 ? "Sun" : selectedDay === 28 ? "Mon" : "Tue"

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
            <IconButton
              icon={ChevronLeft}
              label="Previous month"
              onClick={() => {
                setMonthOffset((current) => current - 1)
                setSelectedDay(1)
              }}
            />
            <IconButton
              icon={ChevronRight}
              label="Next month"
              onClick={() => {
                setMonthOffset((current) => current + 1)
                setSelectedDay(1)
              }}
            />
          </div>

          <div className="calendar-weekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {Array.from({ length: mondayOffset }, (_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1
              const hasDueOrders =
                monthOffset === 0 && [27, 28, 30, 2].includes(day)
              const isSelected = monthOffset === 0 && day === selectedDay
              const isToday = monthOffset === 0 && day === 27

              return (
                <UnstyledButton
                  className={
                    isSelected
                      ? "calendar-day calendar-day--selected"
                      : isToday
                        ? "calendar-day calendar-day--today"
                        : "calendar-day"
                  }
                  key={day}
                  onClick={() => setSelectedDay(day)}
                >
                  {day}
                  {hasDueOrders ? <i /> : null}
                </UnstyledButton>
              )
            })}
          </div>

          <div className="calendar-legend">
            <span>
              <i /> Orders due
            </span>
            <span>
              <i /> Today
            </span>
          </div>
        </div>

        <div className="calendar-orders">
          <div className="calendar-orders__actions">
            <span className="calendar-live-chip">
              <i /> 10:42 AM · live
            </span>
            <Button
              onClick={() => {
                setMonthOffset(0)
                setSelectedDay(27)
              }}
              variant="secondary"
            >
              Today
            </Button>
            <IconButton icon={X} label="Close calendar" onClick={onClose} />
          </div>

          <Heading>
            {monthOffset === 0
              ? `${selectedLabel} ${selectedDay} Sep · orders due`
              : `${monthName} · orders due`}
          </Heading>

          {hasOrders ? (
            <>
              <p>
                {ordersForDay.length} orders due ·{" "}
                {ordersForDay.filter((o) => !o.stop).length || 2} not scheduled yet
              </p>
              <div className="calendar-order-list">
                {ordersForDay.map((order) => (
                  <UnstyledButton
                    className={`calendar-order ${order.emergency ? "calendar-order--emergency" : ""}`}
                    key={order.id}
                    onClick={() =>
                      // Opens the store order details pop-up (handled in App.tsx)
                      window.dispatchEvent(
                        new CustomEvent("waylink:open-order", { detail: order }),
                      )
                    }
                    title="Open order details"
                  >
                    <span>
                      <span className="calendar-order__top">
                        <span className="data-text">{order.id}</span>
                        <ShopTag type={order.type} />
                      </span>
                      <span>
                        {order.shop} · {order.kg} kg
                        {order.emergency ? " · Emergency" : ""}
                      </span>
                    </span>
                    <strong
                      className={
                        order.stop
                          ? "calendar-status calendar-status--scheduled"
                          : "calendar-status calendar-status--pending"
                      }
                    >
                      {order.stop ? "Scheduled" : "Not scheduled"}
                    </strong>
                  </UnstyledButton>
                ))}
              </div>
              <div className="calendar-date-actions">
                {selectedDay !== 27 ? (
                  <Button
                    onClick={() => onOpenDay(selectedDay)}
                    variant="secondary"
                  >
                    Open day plan
                  </Button>
                ) : null}
                <Button
                  onClick={() => onSchedule(selectedDay)}
                  variant="primary"
                >
                  {selectedDay === 27
                    ? "Schedule for today →"
                    : `Schedule for ${selectedLabel} ${selectedDay} →`}
                </Button>
              </div>
            </>
          ) : (
            <div className="calendar-empty">
              <CalendarDays aria-hidden="true" size={28} />
              <strong>No orders due</strong>
              <span>Select 27 or 28 September to view the delivery list.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}