// Calendar dates in the operating zone. The system's cutoff and window rules all use
// Asia/Colombo, so a date here is always a Colombo calendar day written as YYYY-MM-DD.
const ZONE = "Asia/Colombo"

const isoFormat = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" })

/** The Colombo calendar day that contains this instant. */
export const colomboDate = (instant: Date) => isoFormat.format(instant)

export const isIsoDate = (value: string | null | undefined): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))

export function addDays(iso: string, days: number) {
  const value = new Date(`${iso}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

// A calendar day has no time zone, so format it at noon UTC to keep the day stable.
const part = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(new Date(`${iso}T12:00:00Z`))

export const dayParts = (iso: string) => ({
  weekday: part(iso, { weekday: "short" }),
  day: Number(iso.slice(8, 10)),
  month: part(iso, { month: "short" }),
})

/** "Sat 3 Oct" */
export const shortDate = (iso: string) => {
  const p = dayParts(iso)
  return `${p.weekday} ${p.day} ${p.month}`
}

/** "Sat 3 Oct", prefixed with "Today ·" or "Tomorrow ·" when it is. */
export function dateLabel(iso: string, today: string) {
  const base = `${part(iso, { weekday: "short" })} ${part(iso, { day: "numeric" })} ${part(iso, { month: "short" })}`
  if (iso === today) return `Today · ${base}`
  if (iso === addDays(today, 1)) return `Tomorrow · ${base}`
  return base
}
