export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const ErrorCode = {
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_MISSING: 'TOKEN_MISSING',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  // Resource
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  // Access
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // Task
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
} as const;
