import { Request, Response, NextFunction } from 'express';
import * as analyticsService from './analytics.service';

export const getAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await analyticsService.getAnalyticsSummary(req.user!.orgId);
    res.status(200).json({
      status: 200,
      message: 'Analytics retrieved successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const getOverdue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await analyticsService.getOverdueTasksPerUser(req.user!.orgId);
    res.status(200).json({
      status: 200,
      message: 'Overdue tasks retrieved successfully',
      data: { overduePerUser: data },
    });
  } catch (err) {
    next(err);
  }
};

export const getCompletionTime = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await analyticsService.getAvgCompletionTime(req.user!.orgId);
    res.status(200).json({
      status: 200,
      message: 'Completion time analytics retrieved successfully',
      data: { avgCompletionTime: data },
    });
  } catch (err) {
    next(err);
  }
};
