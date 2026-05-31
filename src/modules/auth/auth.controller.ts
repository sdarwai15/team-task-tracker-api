import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({
      status: 201,
      message: 'Registration successful',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({
      status: 200,
      message: 'Login successful',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refresh(refreshToken);
    res.status(200).json({
      status: 200,
      message: 'Tokens refreshed',
      data: tokens,
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.status(200).json({
      status: 200,
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
};
