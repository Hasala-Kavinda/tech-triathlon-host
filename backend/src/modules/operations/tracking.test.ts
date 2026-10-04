import { describe, expect, it } from "vitest"
import { haversineMeters, nearLabel, trackingState } from "./tracking.js"

describe("trackingState", () => {
  it("is completed for a finished trip regardless of the last point", () => {
    expect(trackingState("completed", 5)).toBe("completed")
    expect(trackingState("completed", null)).toBe("completed")
  })
  it("is offline_unknown when no point has ever arrived", () => {
    expect(trackingState("in_transit", null)).toBe("offline_unknown")
  })
  it("is live up to 120 s, delayed up to 600 s, then a gps gap", () => {
    expect(trackingState("in_transit", 0)).toBe("live")
    expect(trackingState("in_transit", 120)).toBe("live")
    expect(trackingState("in_transit", 121)).toBe("delayed")
    expect(trackingState("in_transit", 600)).toBe("delayed")
    expect(trackingState("in_transit", 601)).toBe("gps_gap")
  })
})

describe("nearLabel", () => {
  const galle = { latitude: 6.0329, longitude: 80.217 }
  it("names the district of the closest outlet that has coordinates", () => {
    const label = nearLabel({ latitude: 6.04, longitude: 80.22 }, [{ district: "Galle", coordinates: galle }, { district: "Matara", coordinates: { latitude: 5.9496, longitude: 80.5469 } }])
    expect(label).toBe("near Galle")
  })
  it("ignores outlets without coordinates and falls back to the next stop's district", () => {
    expect(nearLabel({ latitude: 6.5, longitude: 80.1 }, [{ district: "Galle" }], "Matara")).toBe("towards Matara")
  })
  it("does not claim a place when the closest outlet is far away", () => {
    expect(nearLabel({ latitude: 7.29, longitude: 80.63 }, [{ district: "Galle", coordinates: galle }])).toBeNull()
  })
  it("is null without a position", () => {
    expect(nearLabel(null, [{ district: "Galle", coordinates: galle }], "Matara")).toBeNull()
  })
  it("measures distance sanely", () => {
    expect(Math.round(haversineMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) / 1000)).toBe(111)
  })
})
