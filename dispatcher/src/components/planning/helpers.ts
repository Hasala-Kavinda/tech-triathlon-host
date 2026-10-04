import { OPEN_ORDER_EVENT } from "../../lib/constants";
import type { Order, Vehicle } from "../../types/dispatcher";

/** Turns done today and cargo volume for a vehicle, from the real fleet/usage data carried on the Vehicle. */
export function vehicleDay(v: Vehicle) {
  return { turnsToday: v.turns, volumeM3: v.volumeM3 ?? 0 }
}
export function openOrderDetails(order: Order) {
  window.dispatchEvent(new CustomEvent<Order>(OPEN_ORDER_EVENT, { detail: order }))
}
export function orderRowOpenProps(order: Order) {
  return {
    role: "button" as const,
    tabIndex: 0,
    title: "Open order details",
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest("button")) return
      openOrderDetails(order)
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" && e.target === e.currentTarget) openOrderDetails(order)
    },
  }
}
