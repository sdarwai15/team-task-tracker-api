import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { Role } from '@prisma/client';
import * as analyticsController from './analytics.controller';

const router = Router();

// Analytics is ADMIN + MANAGER only
router.use(authenticate, authorize(Role.ADMIN, Role.MANAGER));

router.get('/', analyticsController.getAnalytics);
router.get('/overdue', analyticsController.getOverdue);
router.get('/completion-time', analyticsController.getCompletionTime);

export default router;