export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}
export const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(Math.round(min % 60)).padStart(2, "0")}`

/** 0 = Sunday ... 6 = Saturday, for a YYYY-MM-DD calendar day. */
export const weekday = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`).getUTCDay()

const colombo = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })

/** Rule 17: a submission at or after 16:00 Asia/Colombo belongs to the following planning run. */
export function cutoffBucket(submittedAt: Date | string): "before_cutoff" | "after_cutoff" {
  const parts = colombo.formatToParts(new Date(submittedAt))
  const hour = Number(parts.find((p) => p.type === "hour")?.value)
  return hour >= 16 ? "after_cutoff" : "before_cutoff"
}
