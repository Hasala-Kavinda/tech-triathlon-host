import { AsyncLocalStorage } from "node:async_hooks"
import { DateTime } from "luxon"

/**
 * The time source for the rules that depend on "now" (the 16:00 order cutoff and earliest delivery day, the
 * Driver's "today", PIN expiry). In normal operation it is simply the real clock.
 *
 * `runAsOf` lets the development scenario tool run a block of code "as of" another instant, so the REAL
 * rules evaluate against a simulated submission time. The simulated time lives only in the async scope of
 * that call (AsyncLocalStorage), never in global state, so it cannot leak into other requests. Only the
 * development-only scenario module imports `runAsOf`; production code never sets a scope.
 */
const scope = new AsyncLocalStorage<{ at: Date }>()

export const clock = {
  now: (): Date => scope.getStore()?.at ?? new Date(),
  nowDateTime: (): DateTime => DateTime.fromJSDate(clock.now()).toUTC(),
}

/** Development scenario tool only. */
export function runAsOf<T>(at: Date, work: () => T): T {
  return scope.run({ at }, work)
}
