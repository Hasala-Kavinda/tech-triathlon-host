import { CalendarDay } from "./persistence/calendar-day.model.js"

export const CalendarDayReadPort = {
  findByDate: async (date: string) => {
    return CalendarDay.findOne({ date }).lean()
  },
  
  findRange: async (from: string, to: string) => {
    return CalendarDay.find({ date: { $gte: from, $lte: to } })
      .select("date dayOfWeek isOperating isHoliday festival -_id")
      .sort({ date: 1 })
      .lean()
  },

  findNextOperatingDay: async (afterDate: string) => {
    return CalendarDay.findOne({ date: { $gt: afterDate }, isOperating: true }).sort({ date: 1 }).lean()
  }
}
