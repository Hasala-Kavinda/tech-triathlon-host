export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, "VALIDATION_ERROR", message, details)
export const unauthorized = (message = "Authentication is required.") =>
  new AppError(401, "UNAUTHORIZED", message)
export const forbidden = (message = "You do not have permission to perform this action.") =>
  new AppError(403, "FORBIDDEN", message)
export const notFound = (message = "The requested resource was not found.") =>
  new AppError(404, "NOT_FOUND", message)
export const conflict = (code: string, message: string, details?: unknown) =>
  new AppError(409, code, message, details)
export const unprocessable = (code: string, message: string, details?: unknown) =>
  new AppError(422, code, message, details)
