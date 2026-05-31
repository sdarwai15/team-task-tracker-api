import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { subscribe } from './notifications.controller';

const router = Router();

// SSE endpoint — any authenticated user can subscribe to their notifications
router.get('/subscribe', authenticate, subscribe);

export default router;