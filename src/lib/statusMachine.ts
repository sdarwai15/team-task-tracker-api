import { TaskStatus } from '@prisma/client';

/**
 * Valid transitions map.
 * Key = current status, Value = allowed next statuses
 */
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
  IN_PROGRESS: [TaskStatus.IN_REVIEW, TaskStatus.BLOCKED],
  IN_REVIEW: [TaskStatus.DONE, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
  DONE: [],
  BLOCKED: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
};

export const canTransition = (from: TaskStatus, to: TaskStatus): boolean => {
  return TRANSITIONS[from].includes(to);
};

export const getAllowedTransitions = (from: TaskStatus): TaskStatus[] => {
  return TRANSITIONS[from];
};
