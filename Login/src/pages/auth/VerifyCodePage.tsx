import { useState, useEffect, useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from "react"
import { AuthLayout } from "./AuthLayout"
import { authApi } from "@/auth"
import { useAuth } from "@/auth/AuthContext"

const RESET_KEY = "waytrack.reset"
const isMock = import.meta.env.VITE_USE_MOCK_AUTH !== "false"

interface ResetData {
  resetId: string
  maskedPhone: string
  maskedEmail: string
  expiresInSeconds: number
  resendInSeconds: number
}

interface VerifyCodePageProps {
  navigate: (path: string) => void
}

export function VerifyCodePage({ navigate }: VerifyCodePageProps) {
  const { signIn } = useAuth()
  const [resetData, setResetData] = useState<ResetData | null>(null)
  const [digits, setDigits] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendIn, setResendIn] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RESET_KEY)
      if (!raw) { navigate("/forgot-password"); return }
      const data = JSON.parse(raw) as ResetData
      setResetData(data)
      setResendIn(data.resendInSeconds)
    } catch {
      navigate("/forgot-password")
    }
  }, [navigate])

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn((v) => Math.max(0, v - 1)), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  const submit = useCallback(async (code: string) => {
    if (!resetData || code.length !== 6) return
    setError("")
    setLoading(true)
    try {
      const result = await authApi.verifyOtp(resetData.resetId, code)
      try { sessionStorage.removeItem(RESET_KEY) } catch {}
      navigate(signIn(result))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setLoading(false)
    }
  }, [resetData, signIn, navigate])

  function handleDigitChange(idx: number, val: string) {
    const d = val.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[idx] = d
    setDigits(next)
    if (d && idx < 5) inputRefs.current[idx + 1]?.focus()
    if (next.every((x) => x !== "")) submit(next.join(""))
  }

  function handleKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!text) return
    const next = [...digits]
    for (let i = 0; i < 6; i++) next[i] = text[i] ?? ""
    setDigits(next)
    inputRefs.current[Math.min(text.length, 5)]?.focus()
    if (text.length === 6) submit(text)
  }

  async function handleResend() {
    if (!resetData || resendIn > 0) return
    try {
      const result = await authApi.resendOtp(resetData.resetId)
      setResendIn(result.resendInSeconds)
      setError("")
      setDigits(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } catch {}
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  if (!resetData) return null

  return (
    <AuthLayout>
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: "#9ca3af" }}>
          Step 2 of 2 · Enter the code
        </p>
        <h1
          className="text-[28px] font-bold leading-9 mb-2"
          style={{ fontFamily: "var(--font-poppins)", color: "#0e3f78" }}
        >
          Enter verification code
        </h1>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: "#6b7280" }}>
          We sent a 6-digit code. It expires in 5 minutes.
        </p>

        {/* Sent-to card */}
        <div
          className="rounded-xl px-4 py-3.5 mb-6 text-sm"
          style={{ backgroundColor: "#f8fafc", border: "1.5px solid #e2e8f0" }}
        >
          <div className="flex items-center gap-2.5 mb-1.5" style={{ color: "#374151" }}>
            <PhoneIcon />
            <span style={{ fontFamily: "var(--font-mono)" }}>{resetData.maskedPhone}</span>
          </div>
          <div className="flex items-center gap-2.5" style={{ color: "#374151" }}>
            <MailIcon />
            <span style={{ fontFamily: "var(--font-mono)" }}>{resetData.maskedEmail}</span>
          </div>
        </div>

        {/* OTP digits */}
        <div className="mb-1.5">
          <label className="block text-sm font-medium mb-3" style={{ color: "#374151" }}>
            Verification code
          </label>
          <div className="flex gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-xl font-semibold rounded-lg outline-none transition-all"
                style={{
                  fontFamily: "var(--font-mono)",
                  border: `1.5px solid ${error ? "#e5484d" : d ? "#14549c" : "#d9dde8"}`,
                  boxShadow: d ? "0 0 0 3px rgb(20 84 156 / 12%)" : "none",
                  color: "#0e3f78",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#14549c"; e.target.style.boxShadow = "0 0 0 3px rgb(20 84 156 / 15%)" }}
                onBlur={(e) => {
                  if (!e.target.value) { e.target.style.borderColor = "#d9dde8"; e.target.style.boxShadow = "none" }
                }}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Resend / countdown */}
        <p className="text-sm mb-5" style={{ color: "#6b7280" }}>
          Didn't get it?{" "}
          {resendIn > 0 ? (
            <span>
              Resend in{" "}
              <span className="font-semibold" style={{ fontFamily: "var(--font-mono)", color: "#374151" }}>
                {fmt(resendIn)}
              </span>
            </span>
          ) : (
            <button
              type="button"
              className="font-medium transition-colors"
              style={{ color: "#14549c" }}
              onClick={handleResend}
            >
              Resend code
            </button>
          )}
        </p>

        {/* Prototype hint */}
        {isMock && (
          <div
            className="mb-5 px-4 py-3 rounded-xl text-sm"
            style={{ border: "1.5px dashed #8a91ab", backgroundColor: "#f8fafc", color: "#6b7280" }}
          >
            This is for prototype — use code{" "}
            <span className="font-semibold" style={{ fontFamily: "var(--font-mono)", color: "#374151" }}>
              123456
            </span>
          </div>
        )}

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
          type="button"
          disabled={loading || digits.join("").length !== 6}
          onClick={() => submit(digits.join(""))}
          className="w-full h-12 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#14549c", fontFamily: "var(--font-inter)" }}
        >
          {loading ? "Verifying…" : "Verify and continue"}
        </button>

        <div className="mt-5 text-center">
          <button
            type="button"
            className="text-sm font-medium transition-colors"
            style={{ color: "#14549c" }}
            onClick={() => navigate("/forgot-password")}
          >
            ← Change details
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
      <rect x="3.5" y="1" width="9" height="14" rx="2" stroke="#9ca3af" strokeWidth="1.5" />
      <circle cx="8" cy="12.5" r="0.75" fill="#9ca3af" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
      <rect x="1" y="3" width="14" height="10" rx="2" stroke="#9ca3af" strokeWidth="1.5" />
      <path d="M1 5l7 5 7-5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
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
