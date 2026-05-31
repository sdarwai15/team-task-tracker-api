import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { subscribe } from './notifications.controller';

const router = Router();

/**
 * @swagger
 * /api/v1/notifications/subscribe:
 *   get:
 *     tags: [Notifications]
 *     summary: Subscribe to real-time task notifications via SSE
 *     description: |
 *       Opens a Server-Sent Events stream. Client receives events when:
 *       - A task assigned to them changes status (task:status_changed)
 *       - A task is assigned to them (task:assigned)
 *     responses:
 *       200:
 *         description: SSE stream opened
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get('/subscribe', authenticate, subscribe);

export default router;
