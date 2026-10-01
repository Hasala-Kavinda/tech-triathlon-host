import { useEffect, useState, type ReactNode } from "react"
import { apiRequest } from "../api/client"
import { readSession, saveSession, type Role, type Session } from "./session"

export function AuthBoundary({ expectedRole, children }: { expectedRole: Role; children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const [message, setMessage] = useState("")
  useEffect(() => {
    const run = async () => {
      const code = new URLSearchParams(window.location.search).get("code")
      if (window.location.pathname === "/auth/callback" && code) {
        try {
          const result = await apiRequest<Session>("/auth/exchange", { method: "POST", body: JSON.stringify({ handoffCode: code }) })
          if (result.user.role !== expectedRole) throw new Error("This account cannot open this role application.")
          saveSession(result)
          window.history.replaceState({}, "", "/")
          setState("ready")
        } catch (error) { setMessage(error instanceof Error ? error.message : "Sign-in handoff failed."); setState("error") }
        return
      }
      const session = readSession()
      if (session?.user.role === expectedRole || import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === "true") setState("ready")
      else window.location.replace(import.meta.env.VITE_LOGIN_ORIGIN ?? "http://localhost:5173")
    }
    void run()
  }, [expectedRole])
  if (state === "ready") return children
  if (state === "error") return <main style={{ fontFamily: "system-ui", padding: 32 }}><h1>Sign-in failed</h1><p>{message}</p><a href={import.meta.env.VITE_LOGIN_ORIGIN ?? "http://localhost:5173"}>Return to sign in</a></main>
  return <main style={{ fontFamily: "system-ui", padding: 32 }}>Completing secure sign-in…</main>
}
