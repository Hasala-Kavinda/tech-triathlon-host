import { Outlet } from "./persistence/outlet.model.js"

export const OutletReadPort = {
  findByOutletId: async (outletId: string) => {
    return Outlet.findOne({ outletId, active: true }).lean()
  },
  findManyByOutletIds: async (outletIds: string[]) => {
    return Outlet.find({ outletId: { $in: outletIds } }).lean()
  },
  find: async (filter: any, skip: number = 0, limit: number = 10) => {
    return Outlet.find(filter).sort({ outletId: 1 }).skip(skip).limit(limit).lean()
  },
  countDocuments: async (filter: any) => {
    return Outlet.countDocuments(filter)
  }
}
