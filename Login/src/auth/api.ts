import { AuthError, type LoginSuccess } from "./types"

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"

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
  return (data.data ?? data) as T
}

export const realApi = {
  login: (employeeId: string, password: string, email: string) =>
    post<LoginSuccess>("/api/v1/auth/login", { employeeId, password, email }),
}

export type AuthApi = typeof realApi
