import { CalendarDay } from "./persistence/calendar-day.model.js"

export const CalendarDayReadPort = {
  findByDate: async (date: string) => {
    return CalendarDay.findOne({ date }).lean()
  },
  
  findNextOperatingDay: async (afterDate: string) => {
    return CalendarDay.findOne({ date: { $gt: afterDate }, isOperating: true }).sort({ date: 1 }).lean()
  }
}
