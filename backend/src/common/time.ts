import { DateTime } from "luxon"
import { clock } from "./clock.js"
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

/**
 * Where a submission made at `now` stands against the daily 16:00 order cutoff.
 * The cutoff is 16:00 Asia/Colombo on the day the order is SUBMITTED (not the delivery day):
 * before it, the order enters the next planning run; at or after it, the following run.
 */
export function submissionContext(now: DateTime = clock.nowDateTime()) {
  const localNow = now.setZone(OPERATING_ZONE)
  const cutoff = localNow.startOf("day").set({ hour: 16 })
  return {
    serverNow: now.toISO()!,
    submissionDay: localNow.toFormat("yyyy-MM-dd"),
    cutoffDeadlineAt: cutoff.toUTC().toISO()!,
    secondsRemaining: Math.max(0, Math.floor(cutoff.diff(localNow, "seconds").seconds)),
    cutoffBucket: localNow < cutoff ? "before_cutoff" as const : "after_cutoff" as const,
  }
}

export function cutoffContext(serviceDate: string, now: DateTime = clock.nowDateTime()) {
  const localNow = now.setZone(OPERATING_ZONE)
  const cutoff = cutoffFor(serviceDate)
  return {
    serverNow: now.toISO()!,
    cutoffDeadlineAt: cutoff.toUTC().toISO()!,
    secondsRemaining: Math.max(0, Math.floor(cutoff.diff(localNow, "seconds").seconds)),
    cutoffBucket: localNow < cutoff ? "before_cutoff" as const : "after_cutoff" as const,
  }
}
