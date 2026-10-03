import { readSession } from "../auth/session"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"

export class ApiError extends Error {
  constructor(public code: string, message: string, public requestId?: string, public details?: unknown) { super(message) }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = readSession()
  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    // The API rejects an empty body that is labelled as JSON, so only label a body that exists.
    headers: { ...(init.body === undefined ? {} : { "Content-Type": "application/json" }), ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}), ...init.headers },
  })
  const body = await response.json().catch(() => ({}))
  // Errors normally use { error: { code, message } }; also accept a bare { code, message }
  // so a response in another shape still shows its own reason instead of a generic text.
  if (!response.ok) throw new ApiError(body.error?.code ?? body.code ?? "REQUEST_FAILED", body.error?.message ?? body.message ?? `The request failed (HTTP ${response.status}).`, body.requestId, body.error?.details)
  return body.data as T
}
