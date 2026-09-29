export type Role = "dispatcher" | "loader" | "driver" | "store_manager"

export type User = {
  employeeId: string
  name: string
  role: Role
}

export type AuthSuccess = {
  token: string
  user: User
  redirectTo?: string
}

export type ForgotPasswordResult = {
  resetId: string
  maskedPhone: string
  maskedEmail: string
  expiresInSeconds: number
  resendInSeconds: number
}

export class AuthError extends Error {
  constructor(public code: string, message: string, public attemptsLeft?: number) {
    super(message)
  }
}
