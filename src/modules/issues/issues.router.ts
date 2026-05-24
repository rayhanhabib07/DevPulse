import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssue,
  updateIssueStatus,
  deleteIssue,
} from './issues.controller';

const issuesRouter = Router();

// GET /api/issues — Public: list all issues (supports ?sort, ?type, ?status)
issuesRouter.get('/', asyncHandler(getAllIssues));

// GET /api/issues/:id — Public: get a single issue
issuesRouter.get('/:id', asyncHandler(getIssueById));

// POST /api/issues — Authenticated (contributor or maintainer)
issuesRouter.post('/', authenticate, asyncHandler(createIssue));

// PATCH /api/issues/:id — Authenticated; controller enforces role/ownership rules
issuesRouter.patch('/:id', authenticate, asyncHandler(updateIssue));

// PATCH /api/issues/:id/status — Maintainer only: change workflow status
issuesRouter.patch(
  '/:id/status',
  authenticate,
  authorize('maintainer'),
  asyncHandler(updateIssueStatus),
);

// DELETE /api/issues/:id — Maintainer only
issuesRouter.delete(
  '/:id',
  authenticate,
  authorize('maintainer'),
  asyncHandler(deleteIssue),
);

export default issuesRouter;
