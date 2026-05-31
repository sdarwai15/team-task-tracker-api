import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError, ErrorCode } from '../lib/errors';

export interface AuthPayload {
  sub: string;
  role: string;
  orgId: string;
  exp: number;
}

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError(401, ErrorCode.TOKEN_MISSING, 'Authorization header missing or malformed'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError(401, ErrorCode.TOKEN_EXPIRED, 'Access token has expired'));
    } else {
      next(new AppError(401, ErrorCode.TOKEN_INVALID, 'Access token is invalid'));
    }
  }
};
