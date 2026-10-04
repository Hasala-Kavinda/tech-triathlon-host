import { useEffect, useState } from "react"
import type { ConnectivityState } from "../types/loader"

/**
 * Centralised connectivity hook shared across all pages.
 */
export function useConnectivity() {
  const [connectivity, setConnectivity] = useState<ConnectivityState>(
    navigator.onLine ? "online" : "offline",
  )

  useEffect(() => {

    const handleOnline = () => setConnectivity("online")
    const handleOffline = () => setConnectivity("offline")

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return [connectivity, setConnectivity] as const
}
