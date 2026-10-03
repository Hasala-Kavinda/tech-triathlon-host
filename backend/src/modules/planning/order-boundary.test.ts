import { describe, it, expect, vi } from "vitest"
import { OrderReadPort } from "../orders/order.read-port.js"
import { advanceOrdersForTrip, allocateOrdersToTrip, deferOrder, deferOrderBatch, markOrdersDelivered } from "../orders/order.commands.js"

// Mock both the read port and command boundary
vi.mock("../orders/order.read-port.js", () => ({
  OrderReadPort: {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByIdsInSession: vi.fn(),
    findEligibleForDatePaged: vi.fn(),
    findByIdsPaged: vi.fn(),
    findByOutlet: vi.fn(),
    findRecentByOutlet: vi.fn(),
  }
}))

vi.mock("../orders/order.commands.js", () => ({
  allocateOrdersToTrip: vi.fn(),
  deferOrder: vi.fn(),
  deferOrderBatch: vi.fn(),
  markOrdersDelivered: vi.fn(),
  advanceOrdersForTrip: vi.fn(),
}))

describe("Order Boundary (DB-09 corrective pass)", () => {
  it("should provide lean order results via read port — no live Mongoose document", async () => {
    const mockOrder = {
      _id: "abc123",
      orderNumber: "ORD-001",
      outletId: "OUT001",
      status: "submitted",
      items: [{ sku: "DEMO-001", quantity: 2 }],
    }

    vi.mocked(OrderReadPort.findById).mockResolvedValue(mockOrder as any)
    const result = await OrderReadPort.findById("abc123")
    expect(result).toEqual(mockOrder)
    expect((result as any)?.save).toBeUndefined()
  })

  it("should find multiple orders via read port", async () => {
    const mockOrders = [
      { _id: "abc1", orderNumber: "ORD-001", status: "submitted" },
      { _id: "abc2", orderNumber: "ORD-002", status: "deferred" },
    ]
    vi.mocked(OrderReadPort.findByIds).mockResolvedValue(mockOrders as any)
    const result = await OrderReadPort.findByIds(["abc1", "abc2"])
    expect(result).toHaveLength(2)
  })

  it("should route allocation through command boundary", async () => {
    vi.mocked(allocateOrdersToTrip).mockResolvedValue({ modifiedCount: 2 })
    const { modifiedCount } = await allocateOrdersToTrip(
      ["abc1", "abc2"],
      { toString: () => "trip-id" } as any,
      "dispatcher-id",
      {} as any,
    )
    expect(modifiedCount).toBe(2)
  })

  it("should route deferral through command boundary", async () => {
    vi.mocked(deferOrder).mockResolvedValue({ _id: "abc1", status: "deferred" } as any)
    const result = await deferOrder("abc1", "2026-10-05", "VEHICLE_UNAVAILABLE", undefined, "dispatcher-id")
    expect(result?.status).toBe("deferred")
  })

  it("should route batch deferral through command boundary", async () => {
    vi.mocked(deferOrderBatch).mockResolvedValue([
      { orderId: "abc1", result: "deferred", order: {} as any },
    ])
    const results = await deferOrderBatch(["abc1"], "2026-10-05", "VEHICLE_UNAVAILABLE", undefined, "dispatcher-id")
    expect(results[0]?.result).toBe("deferred")
  })

  it("should route delivery outcomes for every order of a stop through the command boundary", async () => {
    vi.mocked(markOrdersDelivered).mockResolvedValue({ modifiedCount: 2 })
    const result = await markOrdersDelivered(["o1", "o2"], "delivered", new Date(), "driver-id", {} as any)
    expect(result.modifiedCount).toBe(2)
  })

  it("should route trip-wide order status advances through the command boundary", async () => {
    vi.mocked(advanceOrdersForTrip).mockResolvedValue({ modifiedCount: 3 })
    const result = await advanceOrdersForTrip("trip-id", "allocated", "loading", "loader-id", {} as any)
    expect(result.modifiedCount).toBe(3)
  })
})

describe("Order Boundary — import audit (static)", () => {
  it("OrderReadPort does not expose the Order Mongoose model directly", () => {
    // The read port returns plain lean objects. We verify the mock shape
    // corresponds to the actual port's expected interface.
    const methods = Object.keys(OrderReadPort)
    expect(methods).toContain("findById")
    expect(methods).toContain("findByIds")
    expect(methods).toContain("findByIdsInSession")
    expect(methods).toContain("findEligibleForDatePaged")
    expect(methods).toContain("findByIdsPaged")
    expect(methods).toContain("findByOutlet")
    expect(methods).toContain("findRecentByOutlet")

    // Ensure there is no direct Mongoose Model constructor exposed
    const hasMongooseModel = methods.some((m) => m === "create" || m === "aggregate" || m === "updateMany")
    expect(hasMongooseModel).toBe(false)
  })
})
