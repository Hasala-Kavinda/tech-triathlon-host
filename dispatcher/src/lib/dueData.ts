import { useEffect, useState } from "react"
import { planningApi, type CalendarDayInfo, type DueSummaryRow } from "../api/planning"
import type { ShopType } from "../types/dispatcher"

export type DayCounts = { due: number; unscheduled: number }

/** Sum due/unscheduled per date, optionally for one brand. */
export function countsByDate(rows: DueSummaryRow[], brand: ShopType | null) {
  const map = new Map<string, DayCounts>()
  for (const row of rows) {
    if (brand && row.brand !== brand) continue
    const current = map.get(row.date) ?? { due: 0, unscheduled: 0 }
    map.set(row.date, { due: current.due + row.due, unscheduled: current.unscheduled + row.unscheduled })
  }
  return map
}

/**
 * Operating-calendar days and due-order counts for [from, to]. Refetches whenever the range
 * changes (e.g. when the calendar moves to another month) or `reloadKey` changes.
 */
export function useDueRange(from: string | null, to: string | null, reloadKey = 0) {
  const [calendar, setCalendar] = useState<Map<string, CalendarDayInfo>>(new Map())
  const [summary, setSummary] = useState<DueSummaryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!from || !to) return
    let cancelled = false
    setLoading(true)
    setFailed(false)
    // The calendar and the counts are independent: a missing calendar must not hide the counts.
    void Promise.allSettled([planningApi.calendarRange(from, to), planningApi.dueSummary(from, to)]).then(([days, rows]) => {
      if (cancelled) return
      setCalendar(new Map(days.status === "fulfilled" ? days.value.map((day) => [day.date, day]) : []))
      setSummary(rows.status === "fulfilled" ? rows.value : [])
      setFailed(days.status === "rejected" || rows.status === "rejected")
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [from, to, reloadKey])

  return { calendar, summary, loading, failed }
}
