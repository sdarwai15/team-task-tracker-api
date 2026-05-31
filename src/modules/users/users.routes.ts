import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { updateUserSchema } from './users.schemas';
import * as usersController from './users.controller';
import { Role } from '@prisma/client';

const router = Router();

// All users routes require authentication + ADMIN role
// RBAC enforced here at middleware level — controllers have zero role awareness
router.use(authenticate, authorize(Role.ADMIN));

router.get('/', usersController.listUsers);
router.get('/:id', usersController.getUserById);
router.patch('/:id', validate(updateUserSchema), usersController.updateUser);
router.delete('/:id', usersController.deactivateUser);

export default router;