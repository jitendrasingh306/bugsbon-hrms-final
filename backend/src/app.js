import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import branchRoutes from './routes/branches.js';
import departmentRoutes from './routes/departments.js';
import designationRoutes from './routes/designations.js';
import userRoutes from './routes/users.js';
import { errorHandler, notFound } from './middleware/error.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/branches', branchRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/designations', designationRoutes);
  app.use('/api/users', userRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
