import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createProjectSchema, updateProjectSchema } from './projects.schemas';
import * as projectsController from './projects.controller';
import { Role } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List and get — ADMIN + MANAGER
router.get('/', authorize(Role.ADMIN, Role.MANAGER), projectsController.listProjects);
router.get('/:id', authorize(Role.ADMIN, Role.MANAGER), projectsController.getProjectById);

// Create, update, delete — ADMIN + MANAGER
router.post(
  '/',
  authorize(Role.ADMIN, Role.MANAGER),
  validate(createProjectSchema),
  projectsController.createProject,
);
router.patch(
  '/:id',
  authorize(Role.ADMIN, Role.MANAGER),
  validate(updateProjectSchema),
  projectsController.updateProject,
);
router.delete('/:id', authorize(Role.ADMIN, Role.MANAGER), projectsController.deleteProject);

export default router;
