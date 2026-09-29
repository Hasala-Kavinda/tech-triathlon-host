import { useState, type FormEvent } from "react"
import { AuthLayout } from "./AuthLayout"
import { authApi } from "@/auth"
import { isNic, isEmail, isLocalPhone, toE164 } from "@/auth/validation"

const RESET_KEY = "waytrack.reset"

interface ForgotPasswordPageProps {
  navigate: (path: string) => void
}

export function ForgotPasswordPage({ navigate }: ForgotPasswordPageProps) {
  const [nic, setNic] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [nicError, setNicError] = useState("")
  const [emailError, setEmailError] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [loading, setLoading] = useState(false)

  const nicOk = isNic(nic)
  const emailOk = isEmail(email)
  const phoneOk = isLocalPhone(phone)
  const canSubmit = nicOk && emailOk && phoneOk && !loading

  function blurNic() {
    if (nic && !nicOk) setNicError("Enter 12 digits, or 9 digits followed by V or X.")
    else setNicError("")
  }
  function blurEmail() {
    if (email && !emailOk) setEmailError("Enter a valid email address.")
    else setEmailError("")
  }
  function blurPhone() {
    if (phone && !phoneOk) setPhoneError("Enter 9 digits starting with 7 (e.g. 77 123 4567).")
    else setPhoneError("")
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError("")
    if (!canSubmit) return
    setLoading(true)
    try {
      const result = await authApi.forgotPassword(nic.trim(), email.trim().toLowerCase(), toE164(phone))
      try { sessionStorage.setItem(RESET_KEY, JSON.stringify(result)) } catch {}
      navigate("/verify-code")
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} noValidate>
        <p className="text-xs font-medium mb-2" style={{ color: "#9ca3af" }}>
          Step 1 of 2 · Confirm who you are
        </p>
        <h1
          className="text-[28px] font-bold leading-9 mb-2"
          style={{ fontFamily: "var(--font-poppins)", color: "#0e3f78" }}
        >
          Forgot password
        </h1>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: "#6b7280" }}>
          Fill in the details on your employee record. We will send a verification code to your phone and email.
        </p>

        {/* NIC */}
        <Field label="NIC number" id="nic" error={nicError} hint="12 digits, or 9 digits followed by V or X">
          <input
            id="nic"
            type="text"
            value={nic}
            onChange={(e) => setNic(e.target.value)}
            onBlur={blurNic}
            placeholder="199512345678"
            className="w-full h-12 px-4 rounded-lg text-sm outline-none transition-all"
            style={{ border: `1.5px solid ${nicError ? "#e5484d" : "#d9dde8"}` }}
            onFocus={(e) => { e.target.style.borderColor = "#14549c"; e.target.style.boxShadow = "0 0 0 3px rgb(20 84 156 / 15%)" }}
            aria-describedby={nicError ? "nic-error" : "nic-hint"}
          />
        </Field>

        {/* Email */}
        <Field label="Email" id="email" error={emailError}>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={blurEmail}
            placeholder="nuwan.perera@waypoint.lk"
            className="w-full h-12 px-4 rounded-lg text-sm outline-none transition-all"
            style={{ border: `1.5px solid ${emailError ? "#e5484d" : "#d9dde8"}` }}
            onFocus={(e) => { e.target.style.borderColor = "#14549c"; e.target.style.boxShadow = "0 0 0 3px rgb(20 84 156 / 15%)" }}
            aria-describedby={emailError ? "email-error" : undefined}
          />
        </Field>

        {/* Phone */}
        <Field label="Phone number" id="phone" error={phoneError}>
          <div className="relative">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-sm select-none pointer-events-none"
              style={{ color: "#6b7280" }}
            >
              +94
            </span>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={blurPhone}
              placeholder="77 123 4567"
              className="w-full h-12 pl-14 pr-4 rounded-lg text-sm outline-none transition-all"
              style={{ border: `1.5px solid ${phoneError ? "#e5484d" : "#d9dde8"}` }}
              onFocus={(e) => { e.target.style.borderColor = "#14549c"; e.target.style.boxShadow = "0 0 0 3px rgb(20 84 156 / 15%)" }}
              aria-describedby={phoneError ? "phone-error" : undefined}
            />
          </div>
        </Field>

        {submitError && (
          <div
            role="alert"
            className="flex items-center gap-2 text-sm mb-4 px-3 py-2.5 rounded-lg"
            style={{ color: "#e5484d", backgroundColor: "#fff0f0", border: "1px solid #fecdd3" }}
          >
            <AlertIcon />
            <span>{submitError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-12 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#14549c", fontFamily: "var(--font-inter)" }}
        >
          {loading ? "Submitting…" : "Submit"}
        </button>

        <div className="mt-5 text-center">
          <button
            type="button"
            className="text-sm font-medium transition-colors"
            style={{ color: "#14549c" }}
            onClick={() => navigate("/login")}
          >
            ← Back to sign in
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}

function Field({
  label, id, error, hint, children,
}: {
  label: string; id: string; error?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }} htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs mt-1.5" style={{ color: "#9ca3af" }}>{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1 text-xs mt-1.5" style={{ color: "#e5484d" }}>
          <AlertIcon /> {error}
        </p>
      )}
    </div>
  )
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="#e5484d" strokeWidth="1.5" />
      <path d="M8 5v3.5" stroke="#e5484d" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.75" fill="#e5484d" />
    </svg>
  )
}
