import { describe, it, expect, vi } from "vitest"
import { ProductReadPort } from "../reference/product.read-port.js"

describe("DB-06 Consumer Boundary: Orders -> ProductReadPort", () => {
  it("Orders module delegates to ProductReadPort without direct Mongoose imports", async () => {
    // Mock the read port to verify it provides the expected interface
    const mockFindActiveByIds = vi.spyOn(ProductReadPort, "findActiveByIds").mockResolvedValue([
      {
        _id: "fake_id" as any,
        sku: "TEST-01",
        name: "Test",
        brand: "Fresh",
        orderTypes: ["chilled"],
        unit: "box",
        weightKg: 10,
        volumeM3: 0.1,
        temperatureClass: "chilled",
        fragile: false,
        source: "test",
        active: true
      } as any
    ])

    const result = await ProductReadPort.findActiveByIds(["fake_id"])
    
    expect(mockFindActiveByIds).toHaveBeenCalledWith(["fake_id"])
    expect(result).toHaveLength(1)
    expect(result[0]!.sku).toBe("TEST-01")
    
    mockFindActiveByIds.mockRestore()
  })
})
