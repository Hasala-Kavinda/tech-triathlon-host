import { DateTime } from "luxon"
import { badRequest } from "./errors.js"

export const OPERATING_ZONE = "Asia/Colombo"

export function parseServiceDate(value: string) {
  const date = DateTime.fromISO(value, { zone: OPERATING_ZONE })
  if (!date.isValid || date.toFormat("yyyy-MM-dd") !== value) {
    throw badRequest("serviceDate must use YYYY-MM-DD format.")
  }
  return date.startOf("day")
}

export function cutoffFor(serviceDate: string) {
  return parseServiceDate(serviceDate).set({ hour: 16 })
}

export function cutoffContext(serviceDate: string, now: DateTime = DateTime.utc()) {
  const localNow = now.setZone(OPERATING_ZONE)
  const cutoff = cutoffFor(serviceDate)
  return {
    serverNow: now.toISO()!,
    cutoffDeadlineAt: cutoff.toUTC().toISO()!,
    secondsRemaining: Math.max(0, Math.floor(cutoff.diff(localNow, "seconds").seconds)),
    cutoffBucket: localNow < cutoff ? "before_cutoff" as const : "after_cutoff" as const,
  }
}
