import type { Role } from "./types"

export const ROLE_HOME: Record<Role, string> = {
  dispatcher: "/home",
  loader: "/loader",
  driver: "/driver",
  store_manager: "/store",
}

export const PUBLIC_ROUTES = ["/", "/login"]

const ROLE_ACCESS: Record<Role, string[]> = {
  dispatcher: ["/home", "/schedule", "/live", "/orders"],
  loader: ["/loader"],
  driver: ["/driver"],
  store_manager: ["/store"],
}

export function canAccess(role: Role, path: string) {
  return ROLE_ACCESS[role].some((prefix) => path.startsWith(prefix))
}
