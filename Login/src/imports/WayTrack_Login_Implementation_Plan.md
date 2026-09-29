# WayTrack Login: Implementation Plan

Unified sign-in for all four roles (Dispatcher, Loader, Driver, Store manager), with forgot password and one-time code (OTP) verification.

Stack: React + TypeScript + Vite, using the app's existing `navigate(path)` routing in `App.tsx`.

---

## 1. User flow

```
/login ──(Employee ID + password)──► backend checks role ──► role's home page
   │
   └─ "Forgot password?" ──► /forgot-password ──(NIC, email, phone)──►
                              /verify-code ──(6-digit code)──► role's home page
```

- There is **one** login page for every role. There is no role picker.
- The **backend** decides the role from the Employee ID and returns where the user should go (`redirectTo`).
- The frontend keeps a role-to-route map as a fallback in case `redirectTo` is missing.

### Role routes

| Role (API value) | Label | Home route | Mode |
|---|---|---|---|
| `dispatcher` | Dispatcher | `/home` (existing dashboard) | Daylight |
| `loader` | Loader | `/loader` | Midnight |
| `driver` | Driver | `/driver` | Midnight |
| `store_manager` | Store manager | `/store` | Daylight |

Public routes (no login needed): `/login`, `/forgot-password`, `/verify-code`.

---

## 2. File structure

```
src/
├── assets/
│   └── waytrack-logo.png
├── auth/
│   ├── types.ts            Role, User and API response types
│   ├── roles.ts            role → home route map, route access rules
│   ├── api.ts              real backend calls
│   ├── mockApi.ts          fake backend for the prototype
│   ├── index.ts            picks real or mock API from an env flag
│   ├── AuthContext.tsx     logged-in user, token, login/logout
│   └── validation.ts       Employee ID, NIC, email, phone, OTP checks
├── pages/auth/
│   ├── AuthLayout.tsx      blue logo panel (left) + form slot (right)
│   ├── LoginPage.tsx       screen 1
│   ├── ForgotPasswordPage.tsx  screen 2
│   └── VerifyCodePage.tsx  screen 3
├── auth.css                styles for the three screens
├── App.tsx                 add auth routes + route guard
└── main.tsx                wrap <App /> in <AuthProvider>
```

---

## 3. API contract

The base URL comes from `VITE_API_URL`. Every error response has the same shape so the UI can show a plain-language message:

```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Employee ID or password is incorrect." } }
```

### 3.1 `POST /api/auth/login`

Request:
```json
{ "employeeId": "DSP-1001", "password": "Dispatch@123" }
```

Response `200`:
```json
{
  "token": "eyJhbGciOi...",
  "user": { "employeeId": "DSP-1001", "name": "Nuwan Perera", "role": "dispatcher" },
  "redirectTo": "/home"
}
```

Errors: `401 INVALID_CREDENTIALS`, `423 ACCOUNT_LOCKED` (after 5 failed tries), `429 TOO_MANY_REQUESTS`.

### 3.2 `POST /api/auth/forgot-password`

Request:
```json
{ "nic": "199512345678", "email": "nuwan.perera@waypoint.lk", "phone": "+94771234567" }
```

Response `200`:
```json
{
  "resetId": "rst_8f2c...",
  "maskedPhone": "+94 77 ••• 4567",
  "maskedEmail": "n•••••@waypoint.lk",
  "expiresInSeconds": 300,
  "resendInSeconds": 60
}
```

Errors: `404 DETAILS_NOT_MATCHED` ("These details don't match an employee record."), `429 TOO_MANY_REQUESTS`.

> For security, the backend should not reveal *which* field was wrong.

### 3.3 `POST /api/auth/verify-otp`

Request:
```json
{ "resetId": "rst_8f2c...", "code": "482913" }
```

Response `200`: same shape as login (`token`, `user`, `redirectTo`).

Errors: `400 CODE_INCORRECT` (with `attemptsLeft`), `410 CODE_EXPIRED`, `423 TOO_MANY_ATTEMPTS`.

### 3.4 `POST /api/auth/resend-otp`

Request: `{ "resetId": "rst_8f2c..." }`
Response `200`: `{ "resendInSeconds": 60, "expiresInSeconds": 300 }`

### 3.5 `POST /api/auth/logout`

Invalidates the token. Response `204`.

---

## 4. Types and role map

`src/auth/types.ts`

```ts
export type Role = "dispatcher" | "loader" | "driver" | "store_manager"

export type User = {
  employeeId: string
  name: string
  role: Role
}

export type AuthSuccess = {
  token: string
  user: User
  redirectTo?: string
}

export type ForgotPasswordResult = {
  resetId: string
  maskedPhone: string
  maskedEmail: string
  expiresInSeconds: number
  resendInSeconds: number
}

export class AuthError extends Error {
  constructor(public code: string, message: string, public attemptsLeft?: number) {
    super(message)
  }
}
```

`src/auth/roles.ts`

```ts
import type { Role } from "./types"

export const ROLE_HOME: Record<Role, string> = {
  dispatcher: "/home",
  loader: "/loader",
  driver: "/driver",
  store_manager: "/store",
}

export const PUBLIC_ROUTES = ["/login", "/forgot-password", "/verify-code"]

// Which route prefixes each role may open
const ROLE_ACCESS: Record<Role, string[]> = {
  dispatcher: ["/home", "/schedule", "/live", "/orders"],
  loader: ["/loader"],
  driver: ["/driver"],
  store_manager: ["/store"],
}

export function canAccess(role: Role, path: string) {
  return ROLE_ACCESS[role].some((prefix) => path.startsWith(prefix))
}
```

Adjust `ROLE_ACCESS` for the dispatcher to match the routes that already exist in `App.tsx`.

---

## 5. API layer

`src/auth/api.ts`

```ts
import { AuthError, type AuthSuccess, type ForgotPasswordResult } from "./types"

const BASE = import.meta.env.VITE_API_URL ?? ""

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const e = data.error ?? {}
    throw new AuthError(e.code ?? "NETWORK", e.message ?? "Something went wrong. Try again.", e.attemptsLeft)
  }
  return data as T
}

export const realApi = {
  login: (employeeId: string, password: string) =>
    post<AuthSuccess>("/api/auth/login", { employeeId, password }),
  forgotPassword: (nic: string, email: string, phone: string) =>
    post<ForgotPasswordResult>("/api/auth/forgot-password", { nic, email, phone }),
  verifyOtp: (resetId: string, code: string) =>
    post<AuthSuccess>("/api/auth/verify-otp", { resetId, code }),
  resendOtp: (resetId: string) =>
    post<{ resendInSeconds: number; expiresInSeconds: number }>("/api/auth/resend-otp", { resetId }),
  logout: (token: string) => post<void>("/api/auth/logout", {}, token),
}

export type AuthApi = typeof realApi
```

`src/auth/index.ts`

```ts
import { realApi } from "./api"
import { mockApi } from "./mockApi"

export const authApi = import.meta.env.VITE_USE_MOCK_AUTH === "true" ? mockApi : realApi
```

---

## 6. Prototype mock backend

This lets the frontend work before the real backend is ready. Turn it on in `.env.local`:

```
VITE_USE_MOCK_AUTH=true
```

`src/auth/mockApi.ts`

```ts
import { ROLE_HOME } from "./roles"
import { AuthError, type User } from "./types"
import type { AuthApi } from "./api"

export const PROTOTYPE_USERS: (User & { password: string; nic: string; email: string; phone: string })[] = [
  { employeeId: "DSP-1001", password: "Dispatch@123", name: "Nuwan Perera", role: "dispatcher",
    nic: "199512345678", email: "nuwan.perera@waypoint.lk", phone: "+94771234567" },
  { employeeId: "LDR-2001", password: "Loader@123", name: "Kasun Silva", role: "loader",
    nic: "199023456789", email: "kasun.silva@waypoint.lk", phone: "+94712345678" },
  { employeeId: "DRV-3001", password: "Driver@123", name: "Ruwan Fernando", role: "driver",
    nic: "198834567890", email: "ruwan.fernando@waypoint.lk", phone: "+94763456789" },
  { employeeId: "STM-4001", password: "Store@123", name: "Dilani Jayasuriya", role: "store_manager",
    nic: "199245678901", email: "dilani.j@waypoint.lk", phone: "+94754567890" },
]

export const PROTOTYPE_OTP = "123456"

const wait = (ms = 500) => new Promise((r) => setTimeout(r, ms))
const pending = new Map<string, string>() // resetId → employeeId

function success(u: User) {
  const { employeeId, name, role } = u
  return { token: `mock-${employeeId}`, user: { employeeId, name, role }, redirectTo: ROLE_HOME[role] }
}

export const mockApi: AuthApi = {
  async login(employeeId, password) {
    await wait()
    const u = PROTOTYPE_USERS.find((x) => x.employeeId === employeeId.toUpperCase() && x.password === password)
    if (!u) throw new AuthError("INVALID_CREDENTIALS", "Employee ID or password is incorrect.")
    return success(u)
  },
  async forgotPassword(nic, email, phone) {
    await wait()
    const u = PROTOTYPE_USERS.find(
      (x) => x.nic === nic.toUpperCase() && x.email === email.toLowerCase() && x.phone === phone,
    )
    if (!u) throw new AuthError("DETAILS_NOT_MATCHED", "These details don't match an employee record.")
    const resetId = `rst_${Date.now()}`
    pending.set(resetId, u.employeeId)
    return {
      resetId,
      maskedPhone: `${u.phone.slice(0, 3)} ${u.phone.slice(3, 5)} ••• ${u.phone.slice(-4)}`,
      maskedEmail: `${u.email[0]}•••••${u.email.slice(u.email.indexOf("@"))}`,
      expiresInSeconds: 300,
      resendInSeconds: 60,
    }
  },
  async verifyOtp(resetId, code) {
    await wait()
    const id = pending.get(resetId)
    if (!id) throw new AuthError("CODE_EXPIRED", "This code has expired. Request a new one.")
    if (code !== PROTOTYPE_OTP) throw new AuthError("CODE_INCORRECT", "That code is incorrect.")
    pending.delete(resetId)
    return success(PROTOTYPE_USERS.find((x) => x.employeeId === id)!)
  },
  async resendOtp() {
    await wait()
    return { resendInSeconds: 60, expiresInSeconds: 300 }
  },
  async logout() {
    await wait(100)
  },
}
```

In prototype mode, the verify-code screen should also show a small dashed box: *"This is for prototype, use code 123456."*

---

## 7. Session state

`src/auth/AuthContext.tsx`

```tsx
import { createContext, useContext, useState, type ReactNode } from "react"
import { authApi } from "."
import { ROLE_HOME } from "./roles"
import type { AuthSuccess, User } from "./types"

const KEY = "waytrack.session"

type Session = { token: string; user: User }

type AuthValue = {
  user: User | null
  token: string | null
  signIn: (result: AuthSuccess) => string // returns where to go
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
```

`main.tsx`

```tsx
<React.StrictMode>
  <AuthProvider>
    <App />
  </AuthProvider>
</React.StrictMode>
```

> For production, the backend should ideally set the token as an **httpOnly cookie** instead of the frontend storing it. `sessionStorage` is fine for the prototype.

---

## 8. Routing and route guard in `App.tsx`

Add the guard where `App.tsx` decides which page to render from `path`:

```tsx
import { useAuth } from "./auth/AuthContext"
import { PUBLIC_ROUTES, ROLE_HOME, canAccess } from "./auth/roles"
import { LoginPage } from "./pages/auth/LoginPage"
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage"
import { VerifyCodePage } from "./pages/auth/VerifyCodePage"

// inside App()
const { user } = useAuth()
const isPublic = PUBLIC_ROUTES.includes(path)

useEffect(() => {
  if (!user && !isPublic) navigate("/login")                           // not signed in
  else if (user && isPublic) navigate(ROLE_HOME[user.role])            // already signed in
  else if (user && !canAccess(user.role, path)) navigate(ROLE_HOME[user.role]) // wrong role
}, [user, path])

if (path === "/login") return <LoginPage navigate={navigate} />
if (path === "/forgot-password") return <ForgotPasswordPage navigate={navigate} />
if (path === "/verify-code") return <VerifyCodePage navigate={navigate} />
if (!user) return null
// ...existing Shell + pages
```

- Auth pages render **without** the top bar and sidebar.
- Change the hard-coded "Nuwan P." and "NP" in the top bar to use `user.name`, and wire the profile menu to `signOut()` then `navigate("/login")`.
- Pass `resetId`, `maskedPhone` and `maskedEmail` from the forgot-password page to the verify-code page. Keep them in `sessionStorage` (key `waytrack.reset`) so a page refresh doesn't lose them. If they're missing on `/verify-code`, send the user back to `/forgot-password`.

---

## 9. Screens

All three use `AuthLayout`: a 520px blue panel on the left (logo, "WayTrack" in yellow, tagline, four role chips, yellow stripe at the bottom) and a centred 420px form column on the right. Below 900px wide, the blue panel collapses into a short header bar above the form.

### 9.1 Login (`/login`)

| Element | Details |
|---|---|
| Title | "Sign in" + "Enter your Employee ID and password." |
| Employee ID | Text input, auto-uppercase, `autoComplete="username"`, autofocus |
| Password | Password input with show/hide eye button, `autoComplete="current-password"` |
| Forgot password? | Link on the right of the password label → `/forgot-password` |
| Sign in button | Full width, 48px. Shows "Signing in…" and is disabled while waiting |
| Error | Red text above the button, e.g. "Employee ID or password is incorrect." |
| Prototype box | Dashed box with the 4 ID/password pairs. Only shown when `VITE_USE_MOCK_AUTH=true`. Clicking a row fills the form |

On success: `navigate(signIn(result))`.

### 9.2 Forgot password (`/forgot-password`)

| Element | Details |
|---|---|
| Step label | "Step 1 of 2 · Confirm who you are" |
| NIC number | Helper text: "12 digits, or 9 digits followed by V or X" |
| Email | `type="email"` |
| Phone number | Fixed `+94` prefix, user types 9 digits (`77 123 4567`) |
| Submit button | Disabled until all three fields are valid |
| Back to sign in | Link → `/login` |

On success: save the reset details and `navigate("/verify-code")`.

### 9.3 Verify code (`/verify-code`)

| Element | Details |
|---|---|
| Step label | "Step 2 of 2 · Enter the code" |
| Sent to | Card showing the masked phone and masked email |
| Code boxes | 6 boxes, digits only, auto-advance, Backspace goes back, pasting a 6-digit code fills all boxes, `autoComplete="one-time-code"`, `inputMode="numeric"` |
| Resend | "Resend in 00:42" countdown, becomes a "Resend code" link at 0 |
| Verify button | Auto-submits when the 6th digit is typed |
| Errors | "That code is incorrect. 2 tries left." / "This code has expired. Request a new one." |
| Change details | Link → `/forgot-password` |

On success: clear the reset details and `navigate(signIn(result))`.

---

## 10. Validation rules

`src/auth/validation.ts`

```ts
export const isEmployeeId = (v: string) => /^[A-Z]{3}-\d{4}$/.test(v.trim().toUpperCase())
export const isNic = (v: string) => /^(\d{9}[VvXx]|\d{12})$/.test(v.trim())
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
export const isLocalPhone = (v: string) => /^7\d{8}$/.test(v.replace(/\s/g, "")) // after +94
export const isOtp = (v: string) => /^\d{6}$/.test(v)
export const toE164 = (local: string) => `+94${local.replace(/\s/g, "")}`
```

Show field errors only after the user leaves the field (on blur) or presses the button, not while they're typing.

---

## 11. Styling

Add these tokens to `index.css` (the logo colours from the top bar change are reused):

```css
--waytrack-blue: #14549c;
--waytrack-blue-deep: #0e3f78;
--waytrack-blue-soft: #d3e1f2;
--waytrack-yellow: #f6c022;
```

| Item | Value |
|---|---|
| Headings | Poppins 700, 28/36 |
| Body and labels | Inter 400/500, 15/22 and 13/18 |
| IDs, passwords in prototype box, OTP digits | JetBrains Mono 500 |
| Inputs | 48px tall, 8px radius, `#D9DDE8` border |
| Focus | Border `--waytrack-blue` + 3px ring `rgb(20 84 156 / 15%)` |
| Primary button | `--waytrack-blue` fill, white Inter 600 label |
| Error text | `#E5484D` with an icon, never colour alone |
| Prototype box | 1.5px dashed `#8A91AB` border, 12px radius, white background |

Accessibility: every input has a real `<label>`, errors are linked with `aria-describedby`, the error area uses `role="alert"`, and all buttons and links show a visible keyboard focus outline.

---

## 12. Backend notes

- Store passwords hashed with **bcrypt** or **argon2**, never plain text.
- Lock the account for 15 minutes after **5** failed logins.
- OTP: 6 random digits, stored **hashed**, valid for **5 minutes**, maximum **3** wrong tries, resend allowed after **60 seconds**.
- Send the OTP by SMS (e.g. a local SMS gateway such as Dialog or Mobitel) and by email.
- Rate-limit `/login` and `/forgot-password` by IP and by Employee ID.
- The token should include `employeeId` and `role`, and every API route must check the role on the server. The frontend guard only controls what's visible.
- Log every login, failed login and password reset for audit.
- **Recommended:** after a correct OTP, ask the user to set a new password before opening their pages. Right now the flow logs them straight in, which means the old password stays valid. A `/set-password` step can be added between the OTP and the home page later without changing the other screens.

---

## 13. Build order

| # | Task | Done when |
|---|---|---|
| 1 | Add `auth/types.ts`, `roles.ts`, `validation.ts` | Types compile |
| 2 | Add `api.ts`, `mockApi.ts`, `index.ts`, `.env.local` | Mock login returns a user in the console |
| 3 | Add `AuthContext.tsx`, wrap `<App />` in `main.tsx` | `useAuth()` works in any component |
| 4 | Build `AuthLayout` + `auth.css` | Blue panel matches the mockup |
| 5 | Build `LoginPage` | All 4 prototype users land on their own home route |
| 6 | Add route guard to `App.tsx` | Opening `/home` while signed out goes to `/login` |
| 7 | Build `ForgotPasswordPage` | Valid details move to `/verify-code` |
| 8 | Build `VerifyCodePage` | Code `123456` signs the user in |
| 9 | Wire the top bar name and sign-out | Signing out returns to `/login` |
| 10 | Create placeholder `/loader`, `/driver`, `/store` pages | Each role sees its own page |
| 11 | Switch to the real backend (`VITE_USE_MOCK_AUTH=false`) | Same tests pass against the real API |

---

## 14. Test checklist

- [ ] Each of the 4 prototype users signs in and lands on the correct page.
- [ ] Wrong password shows "Employee ID or password is incorrect." and doesn't clear the Employee ID.
- [ ] Employee ID works in lowercase (`dsp-1001`).
- [ ] Pressing Enter in the password field submits the form.
- [ ] A signed-out user opening any private route is sent to `/login`.
- [ ] A signed-in user opening `/login` is sent to their home page.
- [ ] A driver opening `/home` is sent to `/driver`.
- [ ] Refreshing the page keeps the user signed in.
- [ ] Forgot password: Submit stays disabled until NIC, email and phone are all valid.
- [ ] Forgot password: wrong details show the "don't match" message.
- [ ] Verify code: pasting `123456` fills all boxes and submits.
- [ ] Verify code: wrong code shows tries left; resend is only available after the countdown.
- [ ] Opening `/verify-code` directly (no reset in progress) goes back to `/forgot-password`.
- [ ] Sign out clears the session and returns to `/login`.
- [ ] Everything works with keyboard only, and focus is always visible.
- [ ] The prototype credentials box is hidden when mock mode is off.
