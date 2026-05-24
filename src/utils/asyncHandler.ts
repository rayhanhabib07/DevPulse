import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler so unhandled promise rejections
 * are forwarded to Express's error middleware via next(err).
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
