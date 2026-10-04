import type { EngineVehicle } from "@route-engine"

/**
 * Van / Lorry / Refrigerated tag filter. "Refrigerated" is a temperature capability that applies to
 * either a van or a lorry, so the state keeps type and temperature separate:
 *   Van only -> type van (any temp) · Lorry only -> type truck (any temp)
 *   Van + Refrigerated -> van AND reefer · Lorry + Refrigerated -> truck AND reefer
 *   Refrigerated alone -> every reefer, whatever its type
 * Van and Lorry are mutually exclusive; Refrigerated toggles independently.
 */
export type TagState = { type: "van" | "truck" | null; reefer: boolean }
export type Tag = "Van" | "Lorry" | "Refrigerated"

export const NO_TAGS: TagState = { type: null, reefer: false }

export function toggleTag(state: TagState, tag: Tag): TagState {
  if (tag === "Refrigerated") return { ...state, reefer: !state.reefer }
  const type = tag === "Van" ? "van" : "truck"
  return { ...state, type: state.type === type ? null : type }
}

export const activeTags = (state: TagState): Tag[] => [
  ...(state.type === "van" ? (["Van"] as const) : state.type === "truck" ? (["Lorry"] as const) : []),
  ...(state.reefer ? (["Refrigerated"] as const) : []),
]

/** Type AND temperature, combined with AND logic. */
export const matchesTags = (vehicle: Pick<EngineVehicle, "type" | "temp">, state: TagState) =>
  (state.type === null || vehicle.type === state.type) && (!state.reefer || vehicle.temp === "reefer")

/** Fleet counters per tag: Van = any van, Lorry = any truck, Refrigerated = any reefer. */
export const tagCount = (vehicles: ReadonlyArray<Pick<EngineVehicle, "type" | "temp">>, tag: Tag) =>
  vehicles.filter((v) => (tag === "Van" ? v.type === "van" : tag === "Lorry" ? v.type === "truck" : v.temp === "reefer")).length
