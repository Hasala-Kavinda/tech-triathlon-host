import { DateTime } from "luxon"
import { OPERATING_ZONE } from "../../common/time.js"

/** How a stop can end. refused and closed end it unsuccessfully, like failed. */
export const STOP_OUTCOMES = ["delivered", "partial", "refused", "closed", "failed"] as const
export type StopOutcome = typeof STOP_OUTCOMES[number]

/** Outcomes that end the stop as undelivered (the orders become delivery_failed). */
export const isUndeliveredOutcome = (outcome: StopOutcome) => outcome === "failed" || outcome === "refused" || outcome === "closed"

/** The outlet's window close on the service date, in Asia/Colombo. Null if the time is not valid. */
export function windowDeadlineAt(serviceDate: string, windowCloseTime: string): Date | null {
  const deadline = DateTime.fromISO(`${serviceDate}T${windowCloseTime}`, { zone: OPERATING_ZONE })
  return deadline.isValid ? deadline.toJSDate() : null
}

/** on_time when the arrival is at or before the deadline. */
export const timingResult = (arrivedAt: Date, deadline: Date): "on_time" | "late" => (arrivedAt.getTime() <= deadline.getTime() ? "on_time" : "late")
