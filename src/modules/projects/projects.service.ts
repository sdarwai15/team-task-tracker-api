import { prisma } from '../../config/db';
import { AppError, ErrorCode } from '../../lib/errors';
import { CreateProjectInput, UpdateProjectInput } from './projects.schemas';

const projectSelect = {
  id: true,
  name: true,
  description: true,
  orgId: true,
  createdById: true,
  createdAt: true,
  _count: {
    select: { tasks: true },
  },
} as const;

// ── Create project ─────────────────────────────────────────────────────────

export const createProject = async (
  input: CreateProjectInput,
  orgId: string,
  createdById: string,
) => {
  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      orgId,
      createdById,
    },
    select: projectSelect,
  });

  return project;
};

// ── List all projects in org ───────────────────────────────────────────────

export const listProjects = async (orgId: string) => {
  const projects = await prisma.project.findMany({
    where: { orgId },
    select: projectSelect,
    orderBy: { createdAt: 'desc' },
  });

  return projects;
};

// ── Get single project ─────────────────────────────────────────────────────

export const getProjectById = async (projectId: string, orgId: string) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId },
    select: {
      ...projectSelect,
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assignee: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Project not found');
  }

  return project;
};

// ── Update project ─────────────────────────────────────────────────────────

export const updateProject = async (
  projectId: string,
  orgId: string,
  input: UpdateProjectInput,
) => {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, orgId },
  });

  if (!existing) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Project not found');
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: input,
    select: projectSelect,
  });

  return project;
};

// ── Delete project ─────────────────────────────────────────────────────────

export const deleteProject = async (projectId: string, orgId: string) => {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, orgId },
  });

  if (!existing) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Project not found');
  }

  // Tasks will need to be handled — prevent delete if tasks exist
  const taskCount = await prisma.task.count({
    where: { projectId },
  });

  if (taskCount > 0) {
    throw new AppError(
      400,
      ErrorCode.VALIDATION_ERROR,
      `Cannot delete project with ${taskCount} existing task(s). Reassign or delete tasks first.`,
    );
  }

  await prisma.project.delete({ where: { id: projectId } });

  return { deleted: true };
};
