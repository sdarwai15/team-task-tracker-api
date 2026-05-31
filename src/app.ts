import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';

const app = express();

// ── Core middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);

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
