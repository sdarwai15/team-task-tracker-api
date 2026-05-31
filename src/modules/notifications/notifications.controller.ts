import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sseManager } from '../../lib/sseManager';
import {
  taskEvents,
  TaskEvent,
  TaskStatusChangedPayload,
  TaskAssignedPayload,
} from '../../lib/eventEmitter';

export const subscribe = (req: Request, res: Response): void => {
  const clientId = uuidv4();
  const userId = req.user!.sub;
  const orgId = req.user!.orgId;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
  res.flushHeaders();

  // Register client
  sseManager.addClient(clientId, userId, orgId, res);

  // Send initial connection confirmation
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ message: 'Connected to notifications', clientId })}\n\n`);

  // Keep-alive ping every 30 seconds
  const keepAlive = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      clearInterval(keepAlive);
    }
  }, 30000);

  // Listen for task status changes
  const onStatusChanged = (payload: TaskStatusChangedPayload) => {
    if (payload.orgId !== orgId) return;
    // Push to assignee specifically, or all org members for managers
    if (payload.assigneeId === userId) {
      sseManager.pushToUser(userId, TaskEvent.STATUS_CHANGED, payload);
    }
  };

  // Listen for task assignments
  const onAssigned = (payload: TaskAssignedPayload) => {
    if (payload.orgId !== orgId) return;
    if (payload.assigneeId === userId) {
      sseManager.pushToUser(userId, TaskEvent.ASSIGNED, payload);
    }
  };

  taskEvents.on(TaskEvent.STATUS_CHANGED, onStatusChanged);
  taskEvents.on(TaskEvent.ASSIGNED, onAssigned);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    taskEvents.off(TaskEvent.STATUS_CHANGED, onStatusChanged);
    taskEvents.off(TaskEvent.ASSIGNED, onAssigned);
    sseManager.removeClient(clientId);
  });
};
