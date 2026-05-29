import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';

/**
 * Verifies the JWT in the Authorization header.
 * Attaches decoded payload to req.user on success.
 * Expects header format: Authorization: Bearer <token>
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Access denied. No token provided.', StatusCodes.UNAUTHORIZED);
    return;
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    sendError(res, 'Invalid or expired token.', StatusCodes.UNAUTHORIZED);
  }
};
