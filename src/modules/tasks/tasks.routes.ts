import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  listTasksQuerySchema,
} from './tasks.schemas';
import * as tasksController from './tasks.controller';

const router = Router();

// All task routes require authentication
// Role checks are handled inside service layer for tasks
// because MEMBER access is data-scoped (own tasks), not route-level
router.use(authenticate);

router.get('/', validateQuery(listTasksQuerySchema), tasksController.listTasks);
router.post('/', validate(createTaskSchema), tasksController.createTask);
router.get('/:id', tasksController.getTaskById);
router.patch('/:id', validate(updateTaskSchema), tasksController.updateTask);
router.patch('/:id/status', validate(updateTaskStatusSchema), tasksController.updateTaskStatus);
router.delete('/:id', tasksController.deleteTask);

export default router;
