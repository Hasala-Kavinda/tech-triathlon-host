import { useState, useRef, type FormEvent } from "react"
import { AuthLayout } from "./AuthLayout"
import { authApi } from "@/auth"
import { useAuth } from "@/auth/AuthContext"
import { PROTOTYPE_USERS } from "@/auth/mockApi"

const isMock = import.meta.env.VITE_USE_MOCK_AUTH !== "false"

interface LoginPageProps {
  navigate: (path: string) => void
}

export function LoginPage({ navigate }: LoginPageProps) {
  const { signIn } = useAuth()
  const [employeeId, setEmployeeId] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const idRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await authApi.login(employeeId.toUpperCase(), password)
      const redirectPath = signIn(result)
      const EXTERNAL_URLS: Record<string, string> = {
        '/home':   'https://hackathon-host-dispatcher.vercel.app',
        '/loader': 'https://hackathon-host-loader.vercel.app',
        '/driver': 'https://kraken-hack-driver.vercel.app',
        '/store':  'https://hackathon-host-store.vercel.app',
      }
      const externalUrl = EXTERNAL_URLS[redirectPath]
      if (externalUrl) {
        window.location.href = externalUrl
      } else {
        navigate(redirectPath)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  function fillRow(id: string, pw: string) {
    setEmployeeId(id)
    setPassword(pw)
    idRef.current?.focus()
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} noValidate>
        <h1
          className="text-[28px] font-bold leading-9 mb-1"
          style={{ fontFamily: "var(--font-poppins)", color: "#0e3f78" }}
        >
          Sign in
        </h1>
        <p className="text-sm mb-8" style={{ color: "#6b7280" }}>
          Enter your Employee ID and password.
        </p>

        {/* Employee ID */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }} htmlFor="emp-id">
            Employee ID
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <IdIcon />
            </span>
            <input
              ref={idRef}
              id="emp-id"
              type="text"
              autoComplete="username"
              autoFocus
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
              placeholder="DSP-1001"
              className="w-full h-12 pl-10 pr-4 rounded-lg text-sm outline-none transition-all"
              style={{
                fontFamily: "var(--font-mono)",
                border: "1.5px solid #d9dde8",
                fontSize: "14px",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#14549c"; e.target.style.boxShadow = "0 0 0 3px rgb(20 84 156 / 15%)" }}
              onBlur={(e) => { e.target.style.borderColor = "#d9dde8"; e.target.style.boxShadow = "none" }}
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium" style={{ color: "#374151" }} htmlFor="password">
              Password
            </label>
            <button
              type="button"
              className="text-sm font-medium transition-colors"
              style={{ color: "#14549c" }}
              onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <LockIcon />
            </span>
            <input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 pl-10 pr-12 rounded-lg text-sm outline-none transition-all"
              style={{ border: "1.5px solid #d9dde8" }}
              onFocus={(e) => { e.target.style.borderColor = "#14549c"; e.target.style.boxShadow = "0 0 0 3px rgb(20 84 156 / 15%)" }}
              onBlur={(e) => { e.target.style.borderColor = "#d9dde8"; e.target.style.boxShadow = "none" }}
            />
            <button
              type="button"
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setShowPw((v) => !v)}
            >
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 text-sm mb-4 px-3 py-2.5 rounded-lg"
            style={{ color: "#e5484d", backgroundColor: "#fff0f0", border: "1px solid #fecdd3" }}
          >
            <AlertIcon />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-70"
          style={{ backgroundColor: "#14549c", fontFamily: "var(--font-inter)" }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {/* Prototype credentials box */}
        {isMock && (
          <div
            className="mt-6 p-4 rounded-xl bg-white"
            style={{ border: "1.5px dashed #8a91ab" }}
          >
            <p className="text-sm font-semibold mb-0.5" style={{ color: "#374151" }}>
              This is for prototype
            </p>
            <p className="text-xs mb-3" style={{ color: "#6b7280" }}>
              Use one of these Employee ID and password pairs to sign in as that role.
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: "#9ca3af" }}>
                  <th className="text-left pb-1.5 font-medium">Employee ID</th>
                  <th className="text-left pb-1.5 font-medium">Password</th>
                  <th className="text-left pb-1.5 font-medium">Signs in as</th>
                </tr>
              </thead>
              <tbody>
                {PROTOTYPE_USERS.map((u, i) => (
                  <tr
                    key={u.employeeId}
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    style={{ borderTop: i > 0 ? "1px solid #f3f4f6" : undefined }}
                    onClick={() => fillRow(u.employeeId, u.password)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && fillRow(u.employeeId, u.password)}
                    aria-label={`Fill ${u.employeeId} credentials`}
                  >
                    <td className="py-1.5 pr-2" style={{ fontFamily: "var(--font-mono)", color: "#1f2937" }}>{u.employeeId}</td>
                    <td className="py-1.5 pr-2" style={{ fontFamily: "var(--font-mono)", color: "#1f2937" }}>{u.password}</td>
                    <td className="py-1.5" style={{ color: "#6b7280" }}>
                      {u.role === "store_manager" ? "Store manager" : u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </form>
    </AuthLayout>
  )
}

function IdIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.5" cy="7.5" r="1.5" fill="currentColor" />
      <path d="M9 6h3M9 8.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="10.5" r="1" fill="currentColor" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9Z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M2 2l14 14M7.5 7.6A2.5 2.5 0 0 0 11.4 11.5M5.2 5.3C3.3 6.5 2 9 2 9s2.5 5.5 7 5.5c1.4 0 2.6-.4 3.7-1M9 3.5c4.5 0 7 5.5 7 5.5s-.7 1.5-2 2.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="#e5484d" strokeWidth="1.5" />
      <path d="M8 5v3.5" stroke="#e5484d" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.75" fill="#e5484d" />
    </svg>
  )
}
