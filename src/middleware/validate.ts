import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError, ErrorCode } from '../lib/errors';

export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      next(new AppError(400, ErrorCode.VALIDATION_ERROR, message));
      return;
    }
    req.body = result.data;
    next();
  };
