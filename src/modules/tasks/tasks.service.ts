import { TaskStatus, Role } from '@prisma/client';
import { prisma } from '../../config/db';
import { AppError, ErrorCode } from '../../lib/errors';
import { canTransition, getAllowedTransitions } from '../../lib/statusMachine';
import { getCache, setCache, invalidateTaskCaches, CacheKey } from '../../lib/cache';
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
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, orgId },
  });
  if (!project) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Project not found');
  }

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

  // Invalidate caches — new task affects org list and assignee list
  await invalidateTaskCaches(orgId, input.assigneeId);

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

  // Cache only applies to simple assignee-scoped queries (page 1, no extra filters)
  // This is the primary cache use case: "show me my tasks"
  const isCacheable = effectiveAssigneeId && page === 1 && !status && !priority && !projectId;

  const cacheKey = effectiveAssigneeId
    ? CacheKey.tasksByAssignee(effectiveAssigneeId)
    : CacheKey.tasksByOrg(orgId);

  if (isCacheable) {
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log(`[cache] HIT ${cacheKey}`);
      return cached;
    }
    console.log(`[cache] MISS ${cacheKey}`);
  }

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

  const result = {
    tasks,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };

  // Store in cache if cacheable
  if (isCacheable) {
    await setCache(cacheKey, result);
  }

  return result;
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

  if (requestingUserRole === Role.MEMBER && task.assigneeId !== requestingUserId) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'You can only update tasks assigned to you');
  }

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

  // Invalidate both old assignee and new assignee caches
  const affectedAssignees = new Set<string>();
  if (task.assigneeId) affectedAssignees.add(task.assigneeId);
  if (input.assigneeId) affectedAssignees.add(input.assigneeId);

  for (const uid of affectedAssignees) {
    await invalidateTaskCaches(orgId, uid);
  }

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

  const isAssignee = task.assigneeId === requestingUserId;
  const isManagerOrAdmin = requestingUserRole === Role.MANAGER || requestingUserRole === Role.ADMIN;

  if (!isAssignee && !isManagerOrAdmin) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Only the assignee or a manager can update task status',
    );
  }

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
      completedAt: newStatus === TaskStatus.DONE ? new Date() : task.completedAt,
    },
    select: taskSelect,
  });

  // Status change invalidates assignee cache
  await invalidateTaskCaches(orgId, task.assigneeId);

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

  if (requestingUserRole === Role.MEMBER) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'Members cannot delete tasks');
  }

  await prisma.task.delete({ where: { id: taskId } });

  // Invalidate assignee cache on delete
  await invalidateTaskCaches(orgId, task.assigneeId);

  return { deleted: true };
};
