import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { StatusCodes } from 'http-status-codes';
import authRouter from './modules/auth/auth.router';
import issuesRouter from './modules/issues/issues.router';
import { globalErrorHandler } from './middleware/errorHandler';
import { sendError } from './utils/response';

const createApp = (): Application => {
  const app = express();

  // ---- Core middleware ----
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true }));

  // ---- Health check ----
  app.get('/health', (_req: Request, res: Response) => {
    res.status(StatusCodes.OK).json({ status: 'ok', service: 'DevPulse API' });
  });

  // ---- API Routes ----
  app.use('/api/auth', authRouter);
  app.use('/api/issues', issuesRouter);

  // ---- 404 handler for unrecognised routes ----
  app.use((_req: Request, res: Response) => {
    sendError(res, 'Route not found.', StatusCodes.NOT_FOUND);
  });

  // ---- Global error handler (must be last) ----
  app.use(globalErrorHandler);

  return app;
};

export default createApp;
