import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createProjectSchema, updateProjectSchema } from './projects.schemas';
import * as projectsController from './projects.controller';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     tags: [Projects]
 *     summary: List all projects (ADMIN + MANAGER)
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
 */
router.get('/', authorize(Role.ADMIN, Role.MANAGER), projectsController.listProjects);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get project by ID with tasks (ADMIN + MANAGER)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Project retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/:id', authorize(Role.ADMIN, Role.MANAGER), projectsController.getProjectById);

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     tags: [Projects]
 *     summary: Create a new project (ADMIN + MANAGER)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created successfully
 */
router.post(
  '/',
  authorize(Role.ADMIN, Role.MANAGER),
  validate(createProjectSchema),
  projectsController.createProject,
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   patch:
 *     tags: [Projects]
 *     summary: Update project (ADMIN + MANAGER)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Project updated successfully
 */
router.patch(
  '/:id',
  authorize(Role.ADMIN, Role.MANAGER),
  validate(updateProjectSchema),
  projectsController.updateProject,
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   delete:
 *     tags: [Projects]
 *     summary: Delete project (ADMIN + MANAGER)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Project deleted successfully
 */
router.delete('/:id', authorize(Role.ADMIN, Role.MANAGER), projectsController.deleteProject);

export default router;
