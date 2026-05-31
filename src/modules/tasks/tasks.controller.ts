import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import * as tasksService from './tasks.service';

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const task = await tasksService.createTask(req.body, req.user!.orgId, req.user!.sub);
    res.status(201).json({
      status: 201,
      message: 'Task created successfully',
      data: { task },
    });
  } catch (err) {
    next(err);
  }
};

export const listTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await tasksService.listTasks(
      req.parsedQuery as never,
      req.user!.orgId,
      req.user!.sub,
      req.user!.role as Role,
    );
    res.status(200).json({
      status: 200,
      message: 'Tasks retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const task = await tasksService.getTaskById(
      String(req.params.id),
      req.user!.orgId,
      req.user!.sub,
      req.user!.role as Role,
    );
    res.status(200).json({
      status: 200,
      message: 'Task retrieved successfully',
      data: { task },
    });
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const task = await tasksService.updateTask(
      String(req.params.id),
      req.user!.orgId,
      req.user!.sub,
      req.user!.role as Role,
      req.body,
    );
    res.status(200).json({
      status: 200,
      message: 'Task updated successfully',
      data: { task },
    });
  } catch (err) {
    next(err);
  }
};

export const updateTaskStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const task = await tasksService.updateTaskStatus(
      String(req.params.id),
      req.user!.orgId,
      req.user!.sub,
      req.user!.role as Role,
      req.body,
    );
    res.status(200).json({
      status: 200,
      message: 'Task status updated successfully',
      data: { task },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await tasksService.deleteTask(String(req.params.id), req.user!.orgId, req.user!.role as Role);
    res.status(200).json({
      status: 200,
      message: 'Task deleted successfully',
      data: { deleted: true },
    });
  } catch (err) {
    next(err);
  }
};
