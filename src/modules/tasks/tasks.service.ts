import { TaskStatus, Role } from '@prisma/client';
import { prisma } from '../../config/db';
import { AppError, ErrorCode } from '../../lib/errors';
import { canTransition, getAllowedTransitions } from '../../lib/statusMachine';
import {
  CreateTaskInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
  ListTasksQuery,
} from './tasks.schemas';

const taskSelect = {
  id: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  dueDate: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  projectId: true,
  orgId: true,
  assignee: {
    select: { id: true, fullName: true, email: true },
  },
  creator: {
    select: { id: true, fullName: true, email: true },
  },
} as const;

// ── Create task ────────────────────────────────────────────────────────────

export const createTask = async (input: CreateTaskInput, orgId: string, createdById: string) => {
  // Verify project belongs to org
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, orgId },
  });
  if (!project) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Project not found');
  }

  // Verify assignee belongs to org if provided
  if (input.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: input.assigneeId, orgId },
    });
    if (!assignee) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Assignee not found in organization');
    }
  }

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      priority: input.priority,
      projectId: input.projectId,
      orgId,
      createdById,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    },
    select: taskSelect,
  });

  return task;
};

// ── List tasks ─────────────────────────────────────────────────────────────

export const listTasks = async (
  query: ListTasksQuery,
  orgId: string,
  requestingUserId: string,
  requestingUserRole: Role,
) => {
  const { page, limit, status, priority, assigneeId, projectId } = query;
  const skip = (page - 1) * limit;

  // MEMBER can only see their own tasks
  const effectiveAssigneeId = requestingUserRole === Role.MEMBER ? requestingUserId : assigneeId;

  const where = {
    orgId,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(effectiveAssigneeId && { assigneeId: effectiveAssigneeId }),
    ...(projectId && { projectId }),
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      select: taskSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    tasks,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ── Get task by ID ─────────────────────────────────────────────────────────

export const getTaskById = async (
  taskId: string,
  orgId: string,
  requestingUserId: string,
  requestingUserRole: Role,
) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, orgId },
    select: taskSelect,
  });

  if (!task) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  // MEMBER can only view tasks assigned to them
  if (requestingUserRole === Role.MEMBER && task.assignee?.id !== requestingUserId) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'You can only view tasks assigned to you');
  }

  return task;
};

// ── Update task ────────────────────────────────────────────────────────────

export const updateTask = async (
  taskId: string,
  orgId: string,
  requestingUserId: string,
  requestingUserRole: Role,
  input: UpdateTaskInput,
) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, orgId },
  });

  if (!task) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  // MEMBER can only update tasks assigned to them
  if (requestingUserRole === Role.MEMBER && task.assigneeId !== requestingUserId) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'You can only update tasks assigned to you');
  }

  // Verify new assignee belongs to org if changing
  if (input.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: input.assigneeId, orgId },
    });
    if (!assignee) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Assignee not found in organization');
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...input,
      dueDate: input.dueDate ? new Date(input.dueDate) : input.dueDate === null ? null : undefined,
    },
    select: taskSelect,
  });

  return updated;
};

// ── Update task status ─────────────────────────────────────────────────────

export const updateTaskStatus = async (
  taskId: string,
  orgId: string,
  requestingUserId: string,
  requestingUserRole: Role,
  input: UpdateTaskStatusInput,
) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, orgId },
  });

  if (!task) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  // Only assignee or MANAGER/ADMIN can advance status
  const isAssignee = task.assigneeId === requestingUserId;
  const isManagerOrAdmin = requestingUserRole === Role.MANAGER || requestingUserRole === Role.ADMIN;

  if (!isAssignee && !isManagerOrAdmin) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Only the assignee or a manager can update task status',
    );
  }

  // Enforce state machine
  const newStatus = input.status as TaskStatus;
  if (!canTransition(task.status, newStatus)) {
    const allowed = getAllowedTransitions(task.status);
    throw new AppError(
      400,
      ErrorCode.INVALID_STATUS_TRANSITION,
      `Cannot transition from ${task.status} to ${newStatus}. Allowed transitions: ${
        allowed.length ? allowed.join(', ') : 'none'
      }`,
    );
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: newStatus,
      // Auto-set completedAt when task is marked DONE
      completedAt: newStatus === TaskStatus.DONE ? new Date() : task.completedAt,
    },
    select: taskSelect,
  });

  return updated;
};

// ── Delete task ────────────────────────────────────────────────────────────

export const deleteTask = async (taskId: string, orgId: string, requestingUserRole: Role) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, orgId },
  });

  if (!task) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  // Only ADMIN and MANAGER can delete tasks
  if (requestingUserRole === Role.MEMBER) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'Members cannot delete tasks');
  }

  await prisma.task.delete({ where: { id: taskId } });

  return { deleted: true };
};
