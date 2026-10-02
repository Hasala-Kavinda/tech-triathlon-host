import mongoose from "mongoose"
import { createBaseSchema } from "../../../db/model-conventions.js"

export interface CalendarDayDoc {
  date: string
  dayOfWeek: string
  isWeekend: boolean
  isoYear: number
  isoWeek: number
  isPayday: boolean
  festival?: string
  festivalRamp?: number
  isHoliday: boolean
  monsoon: boolean
  isOperating: boolean
  createdAt?: Date
  updatedAt?: Date
}

const calendarDaySchema = createBaseSchema<CalendarDayDoc>({
  date: { type: String, required: true, unique: true },
  dayOfWeek: { type: String, required: true },
  isWeekend: { type: Boolean, required: true },
  isoYear: { type: Number, required: true },
  isoWeek: { type: Number, required: true },
  isPayday: { type: Boolean, required: true },
  festival: String,
  festivalRamp: Number,
  isHoliday: { type: Boolean, required: true },
  monsoon: { type: Boolean, required: true },
  isOperating: { type: Boolean, required: true },
}, { versionKey: false, optimisticConcurrency: false })

export const CalendarDay = mongoose.model("CalendarDay", calendarDaySchema)
