import { describe, it, expect, vi } from "vitest"
import { CalendarDayReadPort } from "../reference/calendar-day.read-port.js"

// We mock CalendarDayReadPort to ensure no direct Mongoose dependency
vi.mock("../reference/calendar-day.read-port.js", () => ({
  CalendarDayReadPort: {
    findByDate: vi.fn(),
    findNextOperatingDay: vi.fn(),
  }
}))

describe("Calendar Boundary", () => {
  it("should provide lean read results without mongoose models for exact date", async () => {
    const mockDay = {
      date: "2026-10-02",
      dayOfWeek: "Fri",
      isWeekend: false,
      isoYear: 2026,
      isoWeek: 40,
      isPayday: false,
      isHoliday: false,
      monsoon: false,
      isOperating: true
    }
    
    vi.mocked(CalendarDayReadPort.findByDate).mockResolvedValue(mockDay as any)

    const result = await CalendarDayReadPort.findByDate("2026-10-02")
    expect(result).toEqual(mockDay)
    // No .save() method exists, proving it's not a live document
    expect((result as any).save).toBeUndefined()
  })

  it("should provide lean read results for next operating day", async () => {
    const mockDay = {
      date: "2026-10-05",
      isOperating: true
    }
    
    vi.mocked(CalendarDayReadPort.findNextOperatingDay).mockResolvedValue(mockDay as any)

    const result = await CalendarDayReadPort.findNextOperatingDay("2026-10-02")
    expect(result).toEqual(mockDay)
  })
})
