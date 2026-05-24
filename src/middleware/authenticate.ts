import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';

/**
 * Verifies the JWT in the Authorization header.
 * Attaches decoded payload to req.user on success.
 * Expects header format: Authorization: <token>  (no "Bearer" prefix per spec)
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const token = req.headers.authorization;

  if (!token) {
    sendError(res, 'Access denied. No token provided.', StatusCodes.UNAUTHORIZED);
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    sendError(res, 'Invalid or expired token.', StatusCodes.UNAUTHORIZED);
  }
};
