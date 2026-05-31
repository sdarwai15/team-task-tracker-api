import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';
import { authorize } from './middleware/rbac';
import { Role } from '@prisma/client';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import projectRoutes from './modules/projects/projects.routes';

const app = express();

// ── Core middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);

// ── RBAC smoke-test routes (remove after verification) ─────────────────────
app.get('/test/admin', authenticate, authorize(Role.ADMIN), (_req, res) => {
  res.json({ message: 'You are an ADMIN' });
});
app.get('/test/manager', authenticate, authorize(Role.MANAGER, Role.ADMIN), (_req, res) => {
  res.json({ message: 'You are a MANAGER or ADMIN' });
});
app.get('/test/member', authenticate, authorize(Role.MEMBER, Role.MANAGER, Role.ADMIN), (_req, res) => {
  res.json({ message: 'You are authenticated' });
});

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ status: 404, code: 'NOT_FOUND', message: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────
app.use(errorHandler);

export default app;
