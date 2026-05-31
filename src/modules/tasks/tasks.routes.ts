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

router.use(authenticate);

/**
 * @swagger
 * /api/v1/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List tasks with pagination and filters
 *     description: MEMBER sees only their assigned tasks. ADMIN/MANAGER see all.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 *       - in: query
 *         name: assigneeId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 */
router.get('/', validateQuery(listTasksQuerySchema), tasksController.listTasks);

/**
 * @swagger
 * /api/v1/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskInput'
 *     responses:
 *       201:
 *         description: Task created successfully
 */
router.post('/', validate(createTaskSchema), tasksController.createTask);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *       403:
 *         description: MEMBER trying to access task not assigned to them
 *       404:
 *         description: Task not found
 */
router.get('/:id', tasksController.getTaskById);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update task fields
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task updated successfully
 */
router.patch('/:id', validate(updateTaskSchema), tasksController.updateTask);

/**
 * @swagger
 * /api/v1/tasks/{id}/status:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update task status (enforces state machine)
 *     description: |
 *       Valid transitions:
 *       - TODO → IN_PROGRESS, BLOCKED
 *       - IN_PROGRESS → IN_REVIEW, BLOCKED
 *       - IN_REVIEW → DONE, IN_PROGRESS, BLOCKED
 *       - BLOCKED → TODO, IN_PROGRESS
 *       - DONE → (no transitions)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTaskStatusInput'
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status transition
 */
router.patch('/:id/status', validate(updateTaskStatusSchema), tasksController.updateTaskStatus);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete task (ADMIN + MANAGER only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       403:
 *         description: Members cannot delete tasks
 */
router.delete('/:id', tasksController.deleteTask);

export default router;
