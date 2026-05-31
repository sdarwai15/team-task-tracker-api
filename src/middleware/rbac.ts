import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError, ErrorCode } from '../lib/errors';

/**
 * RBAC guard factory — enforced at middleware level, never inside controllers.
 * Usage: router.get('/users', authenticate, authorize(Role.ADMIN), controller)
 */
export const authorize =
  (...allowedRoles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated'));
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      next(
        new AppError(
          403,
          ErrorCode.FORBIDDEN,
          `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        ),
      );
      return;
    }

    next();
  };
