import { describe, expect, it } from "vitest"
import { pickDriver, type BusyTrip, type CandidateDriver } from "./driver-assignment.js"

const at = (hhmm: string) => new Date(`2026-10-05T${hhmm}:00+05:30`)
const window = { start: at("03:30"), end: at("04:30") }
const ishara: CandidateDriver = { _id: "d1", name: "Ishara", depot: "Peliyagoda" }
const ruwan: CandidateDriver = { _id: "d2", name: "Ruwan", depot: "Peliyagoda" }
const kamal: CandidateDriver = { _id: "d3", name: "Kamal", depot: "Kandy" }
const trip = (driverId: string, from: string, to: string): BusyTrip => ({ driverId, departureAt: at(from), plannedEndAt: at(to) })
const name = (r: ReturnType<typeof pickDriver>) => r?.driver.name

describe("pickDriver", () => {
  it("only picks Drivers from the vehicle's depot", () => {
    expect(name(pickDriver([ishara, ruwan, kamal], [], window, { depot: "Kandy" }))).toBe("Kamal")
    expect(name(pickDriver([ishara, ruwan, kamal], [], window, { depot: "Peliyagoda" }))).toBe("Ishara")
  })

  it("skips a Driver with an overlapping trip, and treats back-to-back trips as free", () => {
    expect(name(pickDriver([ishara, ruwan], [trip("d1", "03:00", "04:00")], window, { depot: "Peliyagoda" }))).toBe("Ruwan")
    // Ishara's trip ends exactly when ours starts, so she is free; both have one trip, so the tie goes by name.
    expect(name(pickDriver([ishara, ruwan], [trip("d1", "02:00", "03:30"), trip("d2", "00:00", "01:00")], window, { depot: "Peliyagoda" }))).toBe("Ishara")
  })

  it("spreads work: the Driver with fewer trips that day wins, ties go by name", () => {
    const busyEarlier = [trip("d1", "00:00", "01:00"), trip("d1", "01:30", "02:30")]
    expect(name(pickDriver([ishara, ruwan], busyEarlier, window, { depot: "Peliyagoda" }))).toBe("Ruwan")
    expect(name(pickDriver([ruwan, ishara], [], window, { depot: "Peliyagoda" }))).toBe("Ishara")
  })

  it("returns nothing when nobody at the depot is free", () => {
    const both = [trip("d1", "03:00", "05:00"), trip("d2", "04:00", "06:00")]
    expect(pickDriver([ishara, ruwan], both, window, { depot: "Peliyagoda" })).toBeUndefined()
    expect(pickDriver([ishara, ruwan], [], window, { depot: "Kandy" })).toBeUndefined() // no Kandy driver
  })

  it("development escape hatch: falls back to another depot's free Driver and says so", () => {
    const r = pickDriver([ishara, ruwan], [], window, { depot: "Kandy", allowOtherDepots: true })
    expect(r).toMatchObject({ otherDepot: true })
    expect(name(r)).toBe("Ishara")
    // a same-depot Driver is always preferred over the fallback
    expect(pickDriver([ishara, kamal], [], window, { depot: "Kandy", allowOtherDepots: true })).toMatchObject({ otherDepot: false })
  })
})
