import { EventEmitter } from 'events';

/**
 * Central in-process event bus.
 * Services emit task events here.
 * SSE controller subscribes and pushes to connected clients.
 */
class TaskEventEmitter extends EventEmitter {}

export const taskEvents = new TaskEventEmitter();

export const TaskEvent = {
  STATUS_CHANGED: 'task:status_changed',
  ASSIGNED: 'task:assigned',
} as const;

export interface TaskStatusChangedPayload {
  taskId: string;
  title: string;
  oldStatus: string;
  newStatus: string;
  assigneeId: string | null;
  orgId: string;
  changedBy: string;
  timestamp: string;
}

export interface TaskAssignedPayload {
  taskId: string;
  title: string;
  assigneeId: string;
  orgId: string;
  assignedBy: string;
  timestamp: string;
}
