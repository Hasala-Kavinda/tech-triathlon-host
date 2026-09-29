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
