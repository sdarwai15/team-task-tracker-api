import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: err.statusCode,
      code: err.code,
      message: err.message,
    });
    return;
  }

  // Unexpected errors
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
};
