import { createContext, useContext, useState, type ReactNode } from "react"
import { authApi } from "."
import { ROLE_HOME } from "./roles"
import type { AuthSuccess, User } from "./types"

const KEY = "waytrack.session"

type Session = { token: string; user: User }

type AuthValue = {
  user: User | null
  token: string | null
  signIn: (result: AuthSuccess) => string
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)

  function signIn({ token, user, redirectTo }: AuthSuccess) {
    const next = { token, user }
    setSession(next)
    try { sessionStorage.setItem(KEY, JSON.stringify(next)) } catch {}
    return redirectTo ?? ROLE_HOME[user.role]
  }

  async function signOut() {
    if (session) await authApi.logout(session.token).catch(() => {})
    setSession(null)
    try { sessionStorage.removeItem(KEY) } catch {}
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, token: session?.token ?? null, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
