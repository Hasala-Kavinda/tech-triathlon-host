import { UnstyledButton } from "../../components/ui";
import type { CalendarDayInfo } from "../../api/planning";
import { addDays, dayParts, shortDate } from "../../lib/dates";
import type { DayCounts } from "../../lib/dueData";
import { colomboTime, useNow } from "../../lib/useServerClock";

export function DayPlannerCard({
  today,
  offsetMs,
  synced,
  counts,
  calendar,
  onOpenCalendar,
  onSelectDay,
}: {
  today: string
  offsetMs: number
  synced: boolean
  /** Per-date counts (due = all requested that day, unscheduled = still needs scheduling), scoped to the active brand filter. */
  counts: Map<string, DayCounts>
  calendar: Map<string, CalendarDayInfo>
  onOpenCalendar: () => void
  onSelectDay: (date: string) => void
}) {
  const now = useNow(offsetMs)
  const todayParts = dayParts(today)
  const todayCounts = counts.get(today) ?? { due: 0, unscheduled: 0 }
  const nextDays = [1, 2, 3].map((n) => addDays(today, n))
  const nextDue = nextDays.reduce((sum, date) => sum + (counts.get(date)?.unscheduled ?? 0), 0)
  const week = Array.from({ length: 7 }, (_, n) => addDays(today, n))
  // Only mark a day closed once the calendar actually loaded for this range.
  const isClosed = (date: string) => calendar.size > 0 && !calendar.get(date)?.isOperating

  return (
    <div className="day-planner-card">
      <div className="day-planner-card__top">
        <span className="day-planner-date">
          <small>{todayParts.weekday}</small>
          <strong>{todayParts.day}</strong>
          <b>{todayParts.month}</b>
        </span>
        <span className="day-planner-clock">
          <strong>{colomboTime(now)}</strong>
          <span>
            <i /> {synced ? "Live" : "Offline"}
          </span>
        </span>
        <UnstyledButton onClick={onOpenCalendar}>
          Open calendar →
        </UnstyledButton>
      </div>
      <div className="day-planner-stats">
        <div className="day-stat day-stat--due">
          <strong>{todayCounts.unscheduled}</strong>
          <b>Due today</b>
          <span>{todayCounts.due - todayCounts.unscheduled} of {todayCounts.due} scheduled</span>
        </div>
        <div className="day-stat">
          <strong>{nextDue}</strong>
          <b>Due next 3 days</b>
          <span>{shortDate(nextDays[0]!)} – {shortDate(nextDays[2]!)}</span>
        </div>
      </div>
      <div className="week-strip">
        {week.map((date) => {
          const count = counts.get(date)?.unscheduled ?? 0
          const closed = isClosed(date)
          const parts = dayParts(date)
          return (
            <UnstyledButton
              className={`week-day${date === today ? " week-day--active" : ""}${closed ? " week-day--closed" : ""}`}
              key={date}
              onClick={() => onSelectDay(date)}
              title={closed ? "Not an operating day" : undefined}
            >
              <span>{parts.weekday}</span>
              <strong>{parts.day}</strong>
              {count ? <b>{count}</b> : null}
            </UnstyledButton>
          )
        })}
      </div>
    </div>
  )
}
