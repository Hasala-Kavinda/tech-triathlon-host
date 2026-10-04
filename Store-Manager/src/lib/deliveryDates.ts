export type OfferedDay = { date: string; isOperating: boolean }

/**
 * Which delivery dates the New order screen offers.
 *
 * Production (devMode=false): exactly the server's rule - upcoming operating days only; the default is the first,
 * or the second when the 16:00 cutoff has passed.
 * Development (devMode=true, reported by the server): today and every day in the range are offered (closed days
 * included, flagged so they can be told apart) and today is the default, so a tester can place and follow an order
 * now. The server remains the authority: it only accepts these dates when it is in development mode itself.
 */
export function offeredDeliveryDates(input: { range: ReadonlyArray<OfferedDay>; today: string; pastCutoff: boolean; devMode: boolean }): { days: OfferedDay[]; defaultDate: string | null } {
  const { range, today, pastCutoff, devMode } = input
  if (devMode) {
    const days = range.filter((d) => d.date >= today).map((d) => ({ date: d.date, isOperating: d.isOperating }))
    // Calendars can omit today; still offer it in development.
    if (!days.some((d) => d.date === today)) days.unshift({ date: today, isOperating: false })
    return { days, defaultDate: today }
  }
  const days = range.filter((d) => d.date > today && d.isOperating).map((d) => ({ date: d.date, isOperating: d.isOperating }))
  const defaultDate = days.length ? (pastCutoff && days.length > 1 ? days[1]!.date : days[0]!.date) : null
  return { days, defaultDate }
}

/** "2026-10-04" -> label suffix shown next to the date in the dropdown. */
export function dayNote(day: OfferedDay, today: string, devMode: boolean) {
  if (!devMode) return ""
  return [day.date === today ? "today" : "", day.isOperating ? "" : "closed day"].filter(Boolean).join(" · ")
}
