export type Role = "dispatcher" | "loader" | "driver" | "store_manager"
export type Session = { accessToken: string; user: { id: string; employeeId: string; email: string; name: string; role: Role; outletId?: string; depot?: string } }
const KEY = "waylink.role.session"
export function readSession(): Session | null { try { const raw = sessionStorage.getItem(KEY); return raw ? JSON.parse(raw) as Session : null } catch { return null } }
export function saveSession(session: Session) { sessionStorage.setItem(KEY, JSON.stringify(session)) }
export function clearSession() { sessionStorage.removeItem(KEY) }
