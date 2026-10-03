import { useEffect, useState } from "react";
import { UnstyledButton } from "../../components/ui";
import type { ShopType } from "../../types/dispatcher";

export function DayPlannerCard({
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
