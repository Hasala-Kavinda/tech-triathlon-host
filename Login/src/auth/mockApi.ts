import { ROLE_HOME } from "./roles"
import { AuthError, type User } from "./types"
import type { AuthApi } from "./api"

export const PROTOTYPE_USERS: (User & { password: string; nic: string; email: string; phone: string })[] = [
  { employeeId: "DSP-1001", password: "Dispatch@123", name: "Nuwan Perera", role: "dispatcher",
    nic: "199512345678", email: "nuwan.perera@waypoint.lk", phone: "+94771234567" },
  { employeeId: "LDR-2001", password: "Loader@123", name: "Kasun Silva", role: "loader",
    nic: "199023456789", email: "kasun.silva@waypoint.lk", phone: "+94712345678" },
  { employeeId: "DRV-3001", password: "Driver@123", name: "Ruwan Fernando", role: "driver",
    nic: "198834567890", email: "ruwan.fernando@waypoint.lk", phone: "+94763456789" },
  { employeeId: "STM-4001", password: "Store@123", name: "Dilani Jayasuriya", role: "store_manager",
    nic: "199245678901", email: "dilani.j@waypoint.lk", phone: "+94754567890" },
]

export const PROTOTYPE_OTP = "123456"

const wait = (ms = 500) => new Promise((r) => setTimeout(r, ms))
const pending = new Map<string, string>()

function success(u: User) {
  const { employeeId, name, role } = u
  return { token: `mock-${employeeId}`, user: { employeeId, name, role }, redirectTo: ROLE_HOME[role] }
}

export const mockApi: AuthApi = {
  async login(employeeId, password) {
    await wait()
    const u = PROTOTYPE_USERS.find((x) => x.employeeId === employeeId.toUpperCase() && x.password === password)
    if (!u) throw new AuthError("INVALID_CREDENTIALS", "Employee ID or password is incorrect.")
    return success(u)
  },
  async forgotPassword(nic, email, phone) {
    await wait()
    const u = PROTOTYPE_USERS.find(
      (x) => x.nic === nic.trim() && x.email === email.toLowerCase().trim() && x.phone === phone,
    )
    if (!u) throw new AuthError("DETAILS_NOT_MATCHED", "These details don't match an employee record.")
    const resetId = `rst_${Date.now()}`
    pending.set(resetId, u.employeeId)
    return {
      resetId,
      maskedPhone: `${u.phone.slice(0, 3)} ${u.phone.slice(3, 5)} ••• ${u.phone.slice(-4)}`,
      maskedEmail: `${u.email[0]}•••••${u.email.slice(u.email.indexOf("@"))}`,
      expiresInSeconds: 300,
      resendInSeconds: 60,
    }
  },
  async verifyOtp(resetId, code) {
    await wait()
    const id = pending.get(resetId)
    if (!id) throw new AuthError("CODE_EXPIRED", "This code has expired. Request a new one.")
    if (code !== PROTOTYPE_OTP) throw new AuthError("CODE_INCORRECT", "That code is incorrect.")
    pending.delete(resetId)
    return success(PROTOTYPE_USERS.find((x) => x.employeeId === id)!)
  },
  async resendOtp() {
    await wait()
    return { resendInSeconds: 60, expiresInSeconds: 300 }
  },
  async logout() {
    await wait(100)
  },
}
