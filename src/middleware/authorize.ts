import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { UserRole } from '../types';
import { sendError } from '../utils/response';

/**
 * Middleware factory that restricts access to the specified roles.
 * Must be used after the `authenticate` middleware.
 *
 * @example
 *   router.delete('/:id', authenticate, authorize('maintainer'), deleteIssue);
 */
export const authorize = (...allowedRoles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Not authenticated.', StatusCodes.UNAUTHORIZED);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        'You do not have permission to perform this action.',
        StatusCodes.FORBIDDEN,
      );
      return;
    }

    next();
  };
