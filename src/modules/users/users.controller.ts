import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';

export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await usersService.listUsers(req.user!.orgId);
    res.status(200).json({
      status: 200,
      message: 'Users retrieved successfully',
      data: { users },
    });
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await usersService.getUserById(String(req.params.id), req.user!.orgId);
    res.status(200).json({
      status: 200,
      message: 'User retrieved successfully',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await usersService.updateUser(
      String(req.params.id),
      req.user!.sub,
      req.user!.orgId,
      req.body,
    );
    res.status(200).json({
      status: 200,
      message: 'User updated successfully',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const deactivateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await usersService.deactivateUser(
      String(req.params.id),
      req.user!.sub,
      req.user!.orgId,
    );
    res.status(200).json({
      status: 200,
      message: 'User deactivated successfully',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};