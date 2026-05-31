import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError, ErrorCode } from '../lib/errors';

// Extend Express Request to carry parsed query
declare global {
  namespace Express {
    interface Request {
      parsedQuery?: Record<string, unknown>;
    }
  }
}

const parseWithSchema = (schema: ZodSchema, data: unknown, next: NextFunction): unknown | null => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    next(new AppError(400, ErrorCode.VALIDATION_ERROR, message));
    return null;
  }
  return result.data;
};

export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = parseWithSchema(schema, req.body, next);
    if (parsed !== null) {
      req.body = parsed;
      next();
    }
  };

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = parseWithSchema(schema, req.query, next);
    if (parsed !== null) {
      // req.query is read-only in Express 5 — attach to parsedQuery instead
      req.parsedQuery = parsed as Record<string, unknown>;
      next();
    }
  };
