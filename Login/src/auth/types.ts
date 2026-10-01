export type Role = "dispatcher" | "loader" | "driver" | "store_manager"

export type User = {
  id?: string
  employeeId: string
  email: string
  name: string
  role: Role
  outletId?: string
  depot?: string
}

export type LoginSuccess = {
  handoffCode: string
  redirectUrl: string
  expiresIn: number
}

export class AuthError extends Error {
  constructor(public code: string, message: string, public attemptsLeft?: number) {
    super(message)
  }
}
