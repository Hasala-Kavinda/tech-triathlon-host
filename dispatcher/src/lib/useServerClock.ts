import { useEffect, useState } from "react"
import { planningApi } from "../api/planning"
import { colomboDate } from "./dates"

const RESYNC_MS = 5 * 60_000
const TICK_MS = 15_000

export type ServerClock = {
  /** Today in Asia/Colombo, or null until the first sync finishes. */
  today: string | null
  /** serverNow - deviceNow, so `Date.now() + offsetMs` is the server's current instant. */
  offsetMs: number
  /** True when the offset came from a successful server response. */
  synced: boolean
}

/**
 * A ticking clock seeded from the server's time (Asia/Colombo), re-synced periodically.
 * It re-renders only when the Colombo date changes or the sync state changes; components that
 * show the time of day use `useNow(offsetMs)`.
 */
export function useServerClock(enabled = true): ServerClock {
  const [state, setState] = useState<{ offsetMs: number; synced: boolean; hasSynced: boolean }>({ offsetMs: 0, synced: false, hasSynced: false })
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const sync = () => {
      void planningApi.serverClock().then((clock) => {
        if (cancelled) return
        setState({ offsetMs: clock.serverNowMs - Date.now(), synced: clock.synced, hasSynced: true })
        setToday(clock.today)
      })
    }
    sync()
    const timer = window.setInterval(sync, RESYNC_MS)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [enabled])

  // Roll "today" over at midnight Colombo time without waiting for the next resync.
  useEffect(() => {
    if (!enabled || !state.hasSynced) return
    const timer = window.setInterval(() => setToday(colomboDate(new Date(Date.now() + state.offsetMs))), TICK_MS)
    return () => window.clearInterval(timer)
  }, [enabled, state.hasSynced, state.offsetMs])

  return { today, offsetMs: state.offsetMs, synced: state.synced }
}

/** The server's current instant, refreshed every 15 seconds. */
export function useNow(offsetMs: number) {
  const [now, setNow] = useState(() => new Date(Date.now() + offsetMs))
  useEffect(() => {
    setNow(new Date(Date.now() + offsetMs))
    const timer = window.setInterval(() => setNow(new Date(Date.now() + offsetMs)), TICK_MS)
    return () => window.clearInterval(timer)
  }, [offsetMs])
  return now
}

export const colomboTime = (instant: Date) =>
  new Intl.DateTimeFormat("en", { timeZone: "Asia/Colombo", hour: "numeric", minute: "2-digit" }).format(instant)
