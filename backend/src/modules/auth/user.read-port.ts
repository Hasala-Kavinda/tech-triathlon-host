import { User } from "./persistence/user.model.js"

export const UserReadPort = {
  findById: async (id: string) => {
    return User.findById(id).lean()
  },
  findDriverById: async (id: string) => {
    return User.findOne({ _id: id, role: "driver", active: true }).lean()
  },
  findByFilter: async (filter: any) => {
    return User.find(filter).select("employeeId name depot").sort({ name: 1 }).lean()
  }
}
