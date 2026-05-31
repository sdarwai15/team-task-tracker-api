import { z } from 'zod';

export const updateUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).optional(),
  isActive: z.boolean().optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;