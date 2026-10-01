import { readSession } from "../auth/session"
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"
export class ApiError extends Error { constructor(public code: string, message: string, public requestId?: string, public details?: unknown) { super(message) } }
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = readSession()
  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, { ...init, headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}), ...init.headers } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(body.error?.code ?? "REQUEST_FAILED", body.error?.message ?? "The request failed.", body.requestId, body.error?.details)
  return body.data as T
}
