import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/response';

/**
 * Express global error handler — must be registered last in the middleware chain.
 * Catches any error forwarded via next(err).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error('Unhandled error:', err);

  sendError(
    res,
    'An unexpected internal server error occurred.',
    StatusCodes.INTERNAL_SERVER_ERROR,
    process.env.NODE_ENV === 'development' ? err.message : undefined,
  );
};
