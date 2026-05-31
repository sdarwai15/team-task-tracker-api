import { Request, Response, NextFunction } from 'express';
import * as projectsService from './projects.service';

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const project = await projectsService.createProject(req.body, req.user!.orgId, req.user!.sub);
    res.status(201).json({
      status: 201,
      message: 'Project created successfully',
      data: { project },
    });
  } catch (err) {
    next(err);
  }
};

export const listProjects = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const projects = await projectsService.listProjects(req.user!.orgId);
    res.status(200).json({
      status: 200,
      message: 'Projects retrieved successfully',
      data: { projects },
    });
  } catch (err) {
    next(err);
  }
};

export const getProjectById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const project = await projectsService.getProjectById(String(req.params.id), req.user!.orgId);
    res.status(200).json({
      status: 200,
      message: 'Project retrieved successfully',
      data: { project },
    });
  } catch (err) {
    next(err);
  }
};

export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const project = await projectsService.updateProject(
      String(req.params.id),
      req.user!.orgId,
      req.body,
    );
    res.status(200).json({
      status: 200,
      message: 'Project updated successfully',
      data: { project },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await projectsService.deleteProject(String(req.params.id), req.user!.orgId);
    res.status(200).json({
      status: 200,
      message: 'Project deleted successfully',
      data: { deleted: true },
    });
  } catch (err) {
    next(err);
  }
};
