import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { AppError, ErrorCode } from '../../lib/errors';
import { RegisterInput, LoginInput } from './auth.schemas';
import { Role } from '@prisma/client';

// ── Helpers ────────────────────────────────────────────────────────────────

const generateAccessToken = (userId: string, role: Role, orgId: string): string =>
  jwt.sign(
    { sub: userId, role, orgId, exp: Math.floor(Date.now() / 1000) + 15 * 60 },
    env.JWT_ACCESS_SECRET,
  );

const generateRefreshToken = (userId: string): string =>
  jwt.sign(
    { sub: userId, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 },
    env.JWT_REFRESH_SECRET,
  );

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

// ── Service ────────────────────────────────────────────────────────────────

export const register = async (input: RegisterInput) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  let orgId: string;
  let role: Role = 'MEMBER';

  if (input.orgName) {
    const slug = input.orgSlug ?? slugify(input.orgName);
    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      throw new AppError(409, ErrorCode.ALREADY_EXISTS, 'Organization slug already taken');
    }
    const org = await prisma.organization.create({
      data: { name: input.orgName, slug },
    });
    orgId = org.id;
    role = 'ADMIN';
  } else {
    let defaultOrg = await prisma.organization.findUnique({ where: { slug: 'default' } });
    if (!defaultOrg) {
      defaultOrg = await prisma.organization.create({
        data: { name: 'Default Organization', slug: 'default' },
      });
    }
    orgId = defaultOrg.id;
  }

  const user = await prisma.user.create({
    data: { email: input.email, passwordHash, fullName: input.fullName, orgId, role },
    select: { id: true, email: true, fullName: true, role: true, orgId: true, createdAt: true },
  });

  return user;
};

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  const accessToken = generateAccessToken(user.id, user.role, user.orgId);
  const refreshToken = generateRefreshToken(user.id);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      orgId: user.orgId,
    },
  };
};

export const refresh = async (token: string) => {
  let payload: { sub: string };
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
  } catch {
    throw new AppError(401, ErrorCode.REFRESH_TOKEN_INVALID, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(token);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
    throw new AppError(401, ErrorCode.REFRESH_TOKEN_INVALID, 'Refresh token has been revoked');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { isRevoked: true },
  });

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'User not found or inactive');
  }

  const newAccessToken = generateAccessToken(user.id, user.role, user.orgId);
  const newRefreshToken = generateRefreshToken(user.id);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt,
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const logout = async (token: string) => {
  const tokenHash = hashToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, isRevoked: false },
    data: { isRevoked: true },
  });
};
