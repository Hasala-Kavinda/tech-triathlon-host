const ZONE = "Asia/Colombo"

/** "Sun 09:03 PM": weekday and clock time in the operating zone, for timeline stamps. */
export function stamp(iso: string | null | undefined) {
  if (!iso) return "-"
  const d = new Date(iso)
  const day = new Intl.DateTimeFormat("en", { timeZone: ZONE, weekday: "short" }).format(d)
  const time = new Intl.DateTimeFormat("en", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hour12: true }).format(d)
  return `${day} ${time}`
}

export const clockTime = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("en", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(iso)) : "-"

/** "Sunday, 4 October" for a plain YYYY-MM-DD calendar day. */
export const longDate = (isoDate: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${isoDate}T12:00:00Z`))
