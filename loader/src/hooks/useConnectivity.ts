import { useEffect, useState } from "react"
import type { ConnectivityState } from "../components/loader-ui"

/**
 * Centralised connectivity hook shared across all pages.
 *
 * Accepts an optional `forced` value so URL-param overrides used in prototype
 * previews (?connectivity=offline|syncing|synced) continue to work exactly as
 * before without duplicating the override logic in every page.
 */
export function useConnectivity(forced?: ConnectivityState | null) {
  const [connectivity, setConnectivity] = useState<ConnectivityState>(
    forced ?? (navigator.onLine ? "online" : "offline"),
  )

  useEffect(() => {
    // When a forced state is provided (prototype URL override), skip live
    // browser event listeners and return immediately.
    if (forced != null) return

    const handleOnline = () => setConnectivity("online")
    const handleOffline = () => setConnectivity("offline")

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [forced])

  return [connectivity, setConnectivity] as const
}
