import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { Role } from '@prisma/client';
import * as analyticsController from './analytics.controller';

const router = Router();

router.use(authenticate, authorize(Role.ADMIN, Role.MANAGER));

/**
 * @swagger
 * /api/v1/analytics:
 *   get:
 *     tags: [Analytics]
 *     summary: Full analytics summary (ADMIN + MANAGER)
 *     description: Returns total tasks, completion rate, overdue per user, avg completion time
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 */
router.get('/', analyticsController.getAnalytics);

/**
 * @swagger
 * /api/v1/analytics/overdue:
 *   get:
 *     tags: [Analytics]
 *     summary: Overdue task count per user (ADMIN + MANAGER)
 *     responses:
 *       200:
 *         description: Overdue tasks retrieved successfully
 */
router.get('/overdue', analyticsController.getOverdue);

/**
 * @swagger
 * /api/v1/analytics/completion-time:
 *   get:
 *     tags: [Analytics]
 *     summary: Average task completion time per user (ADMIN + MANAGER)
 *     responses:
 *       200:
 *         description: Completion time analytics retrieved successfully
 */
router.get('/completion-time', analyticsController.getCompletionTime);

export default router;
