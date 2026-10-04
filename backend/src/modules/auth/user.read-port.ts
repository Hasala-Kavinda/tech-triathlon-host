import { User } from "./persistence/user.model.js"

export const UserReadPort = {
  findById: async (id: string) => {
    return User.findById(id).lean()
  },
  findDriverById: async (id: string) => {
    return User.findOne({ _id: id, role: "driver", active: true }).lean()
  },
  /** Name, role and phone for the given users (crew hover cards, remark authors). */
  findContactsByIds: async (ids: string[]) => {
    return User.find({ _id: { $in: ids } }).select("employeeId name role outletId depot phoneE164").lean()
  },
  /** Active store managers of the given outlets (the per-stop contact). */
  findStoreManagersByOutlets: async (outletIds: string[]) => {
    return User.find({ role: "store_manager", active: true, outletId: { $in: outletIds } }).select("employeeId name role outletId phoneE164").sort({ employeeId: 1 }).lean()
  },
  findByFilter: async (filter: any) => {
    return User.find(filter).select("employeeId name depot").sort({ name: 1 }).lean()
  }
}
