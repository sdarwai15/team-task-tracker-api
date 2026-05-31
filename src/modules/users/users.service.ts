import { prisma } from '../../config/db';
import { AppError, ErrorCode } from '../../lib/errors';
import { UpdateUserInput } from './users.schemas';

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  orgId: true,
  createdAt: true,
} as const;

// ── List all users in the org ──────────────────────────────────────────────

export const listUsers = async (orgId: string) => {
  const users = await prisma.user.findMany({
    where: { orgId },
    select: userSelect,
    orderBy: { createdAt: 'desc' },
  });
  return users;
};

// ── Get single user by ID ──────────────────────────────────────────────────

export const getUserById = async (userId: string, orgId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, orgId },
    select: userSelect,
  });

  if (!user) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  }

  return user;
};

// ── Update user role or status ─────────────────────────────────────────────

export const updateUser = async (
  targetUserId: string,
  requestingUserId: string,
  orgId: string,
  input: UpdateUserInput,
) => {
  // Ensure target user belongs to same org
  const target = await prisma.user.findFirst({
    where: { id: targetUserId, orgId },
  });

  if (!target) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  }

  // Prevent admin from deactivating themselves
  if (targetUserId === requestingUserId && input.isActive === false) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'You cannot deactivate your own account');
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: input,
    select: userSelect,
  });

  return updated;
};

// ── Deactivate user (soft delete) ──────────────────────────────────────────

export const deactivateUser = async (
  targetUserId: string,
  requestingUserId: string,
  orgId: string,
) => {
  if (targetUserId === requestingUserId) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'You cannot deactivate your own account');
  }

  const target = await prisma.user.findFirst({
    where: { id: targetUserId, orgId },
  });

  if (!target) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive: false },
    select: userSelect,
  });

  // Revoke all active refresh tokens for deactivated user
  await prisma.refreshToken.updateMany({
    where: { userId: targetUserId, isRevoked: false },
    data: { isRevoked: true },
  });

  return updated;
};