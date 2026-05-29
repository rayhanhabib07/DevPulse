import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import { sendSuccess, sendError } from '../../utils/response';
import { isValidIssueType, isValidIssueStatus } from '../../utils/validators';
import {
  IssueRow,
  UserRow,
  PublicIssue,
  ReporterSummary,
  CreateIssueBody,
  UpdateIssueBody,
  IssueQueryParams,
  UserRole,
} from '../../types';

// ----------------------------------------------------------------
// Helper: fetch reporter details for one or many reporter_ids
// Uses WHERE id IN (...) to avoid N+1 without SQL JOINs (per spec)
// ----------------------------------------------------------------
const fetchReporters = async (
  reporterIds: number[],
): Promise<Map<number, ReporterSummary>> => {
  if (reporterIds.length === 0) return new Map();

  // Deduplicate ids before querying
  const uniqueIds = [...new Set(reporterIds)];

  // Build parameterised $1,$2,... placeholders
  const placeholders = uniqueIds.map((_, i) => `$${i + 1}`).join(', ');

  const result = await pool.query<Pick<UserRow, 'id' | 'name' | 'role'>>(
    `SELECT id, name, role FROM users WHERE id IN (${placeholders})`,
    uniqueIds,
  );

  const map = new Map<number, ReporterSummary>();
  result.rows.forEach((u) => {
    map.set(u.id, { id: u.id, name: u.name, role: u.role as UserRole });
  });
  return map;
};

/** Merge an IssueRow with its ReporterSummary into the public response shape */
const toPublicIssue = (issue: IssueRow, reporter: ReporterSummary): PublicIssue => ({
  id: issue.id,
  title: issue.title,
  description: issue.description,
  type: issue.type,
  status: issue.status,
  reporter,
  created_at: issue.created_at,
  updated_at: issue.updated_at,
});

// ----------------------------------------------------------------
// POST /api/issues — Create a new issue (authenticated)
// ----------------------------------------------------------------
export const createIssue = async (req: Request, res: Response): Promise<void> => {
  const { title, description, type }: CreateIssueBody = req.body;
  const reporterId = req.user!.id; // guaranteed by authenticate middleware

  // Validate required fields
  if (!title || !description || !type) {
    sendError(res, 'Title, description, and type are required.', StatusCodes.BAD_REQUEST);
    return;
  }
  if (title.length > 150) {
    sendError(res, 'Title must be 150 characters or fewer.', StatusCodes.BAD_REQUEST);
    return;
  }
  if (description.length < 20) {
    sendError(
      res,
      'Description must be at least 20 characters.',
      StatusCodes.BAD_REQUEST,
    );
    return;
  }
  if (!isValidIssueType(type)) {
    sendError(
      res,
      'Type must be either "bug" or "feature_request".',
      StatusCodes.BAD_REQUEST,
    );
    return;
  }

  const result = await pool.query<IssueRow>(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title.trim(), description.trim(), type, reporterId],
  );

  const reporter: ReporterSummary = {
    id: req.user!.id,
    name: req.user!.name,
    role: req.user!.role,
  };

  sendSuccess(res, toPublicIssue(result.rows[0], reporter), 'Issue created successfully', StatusCodes.CREATED);
};

// ----------------------------------------------------------------
// GET /api/issues — List all issues with optional sort/filter
// ----------------------------------------------------------------
export const getAllIssues = async (req: Request, res: Response): Promise<void> => {
  // Coerce Express query param values (string | string[] | ParsedQs | ParsedQs[]) to string
  const rawSort = Array.isArray(req.query.sort) ? req.query.sort[0] : req.query.sort;
  const rawType = Array.isArray(req.query.type) ? req.query.type[0] : req.query.type;
  const rawStatus = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status;

  const sort = (typeof rawSort === 'string' ? rawSort : 'newest') as IssueQueryParams['sort'];
  const type = typeof rawType === 'string' ? rawType : undefined;
  const status = typeof rawStatus === 'string' ? rawStatus : undefined;

  // Build dynamic WHERE clause safely with parameterised values
  const conditions: string[] = [];
  const params: string[] = [];

  if (type) {
    if (!isValidIssueType(type)) {
      sendError(res, 'Invalid type filter.', StatusCodes.BAD_REQUEST);
      return;
    }
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }

  if (status) {
    if (!isValidIssueStatus(status)) {
      sendError(res, 'Invalid status filter.', StatusCodes.BAD_REQUEST);
      return;
    }
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = sort === 'oldest' ? 'ORDER BY created_at ASC' : 'ORDER BY created_at DESC';

  const issueResult = await pool.query<IssueRow>(
    `SELECT * FROM issues ${whereClause} ${orderClause}`,
    params,
  );

  const issues = issueResult.rows;

  // Batch-fetch reporters without JOIN (spec requirement)
  const reporterIds = issues.map((i) => i.reporter_id);
  const reporterMap = await fetchReporters(reporterIds);

  const publicIssues: PublicIssue[] = issues.map((issue) => {
    const reporter = reporterMap.get(issue.reporter_id) ?? {
      id: issue.reporter_id,
      name: 'Unknown',
      role: 'contributor' as UserRole,
    };
    return toPublicIssue(issue, reporter);
  });

  sendSuccess(res, publicIssues);
};

// ----------------------------------------------------------------
// GET /api/issues/:id — Get single issue by ID
// ----------------------------------------------------------------
export const getIssueById = async (req: Request, res: Response): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const issueId = parseInt(rawId ?? "", 10);

  if (isNaN(issueId)) {
    sendError(res, 'Invalid issue ID.', StatusCodes.BAD_REQUEST);
    return;
  }

  const result = await pool.query<IssueRow>(
    'SELECT * FROM issues WHERE id = $1',
    [issueId],
  );

  if (result.rows.length === 0) {
    sendError(res, 'Issue not found.', StatusCodes.NOT_FOUND);
    return;
  }

  const issue = result.rows[0];

  // Fetch reporter separately (no JOIN per spec)
  const userResult = await pool.query<Pick<UserRow, 'id' | 'name' | 'role'>>(
    'SELECT id, name, role FROM users WHERE id = $1',
    [issue.reporter_id],
  );

  const reporterRow = userResult.rows[0];
  const reporter: ReporterSummary = reporterRow
    ? { id: reporterRow.id, name: reporterRow.name, role: reporterRow.role as UserRole }
    : { id: issue.reporter_id, name: 'Unknown', role: 'contributor' };

  sendSuccess(res, toPublicIssue(issue, reporter));
};

// ----------------------------------------------------------------
// PATCH /api/issues/:id — Update issue fields (title/description/type)
// Access: maintainer (any) OR contributor (own + open only)
// ----------------------------------------------------------------
export const updateIssue = async (req: Request, res: Response): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const issueId = parseInt(rawId ?? "", 10);
  const { title, description, type }: UpdateIssueBody = req.body;
  const requestingUser = req.user!;

  if (isNaN(issueId)) {
    sendError(res, 'Invalid issue ID.', StatusCodes.BAD_REQUEST);
    return;
  }

  // At least one field must be provided
  if (!title && !description && !type) {
    sendError(
      res,
      'At least one field (title, description, type) must be provided.',
      StatusCodes.BAD_REQUEST,
    );
    return;
  }

  // Fetch the existing issue
  const issueResult = await pool.query<IssueRow>(
    'SELECT * FROM issues WHERE id = $1',
    [issueId],
  );
  if (issueResult.rows.length === 0) {
    sendError(res, 'Issue not found.', StatusCodes.NOT_FOUND);
    return;
  }

  const issue = issueResult.rows[0];

  // Permission check:
  //   - maintainer → can update any issue
  //   - contributor → can only update their own issue AND only if status is open
  if (requestingUser.role !== 'maintainer') {
    if (issue.reporter_id !== requestingUser.id) {
      sendError(
        res,
        'You can only update issues you reported.',
        StatusCodes.FORBIDDEN,
      );
      return;
    }
    if (issue.status !== 'open') {
      sendError(
        res,
        'Contributors can only edit issues with status "open".',
        StatusCodes.CONFLICT,
      );
      return;
    }
  }

  // Validate incoming fields
  if (title !== undefined && title.length > 150) {
    sendError(res, 'Title must be 150 characters or fewer.', StatusCodes.BAD_REQUEST);
    return;
  }
  if (description !== undefined && description.length < 20) {
    sendError(
      res,
      'Description must be at least 20 characters.',
      StatusCodes.BAD_REQUEST,
    );
    return;
  }
  if (type !== undefined && !isValidIssueType(type)) {
    sendError(
      res,
      'Type must be either "bug" or "feature_request".',
      StatusCodes.BAD_REQUEST,
    );
    return;
  }

  // Build dynamic SET clause
  const setClauses: string[] = ['updated_at = NOW()'];
  const values: (string | number)[] = [];

  if (title !== undefined) {
    values.push(title.trim());
    setClauses.push(`title = $${values.length}`);
  }
  if (description !== undefined) {
    values.push(description.trim());
    setClauses.push(`description = $${values.length}`);
  }
  if (type !== undefined) {
    values.push(type);
    setClauses.push(`type = $${values.length}`);
  }

  values.push(issueId);
  const idParam = `$${values.length}`;

  const updated = await pool.query<IssueRow>(
    `UPDATE issues SET ${setClauses.join(', ')} WHERE id = ${idParam} RETURNING *`,
    values,
  );

  const userResult = await pool.query<Pick<UserRow, 'id' | 'name' | 'role'>>(
    'SELECT id, name, role FROM users WHERE id = $1',
    [issue.reporter_id],
  );
  const reporterRow = userResult.rows[0];
  const reporter: ReporterSummary = reporterRow
    ? { id: reporterRow.id, name: reporterRow.name, role: reporterRow.role as UserRole }
    : { id: issue.reporter_id, name: 'Unknown', role: 'contributor' };

  sendSuccess(res, toPublicIssue(updated.rows[0], reporter), 'Issue updated successfully');
};

// ----------------------------------------------------------------
// PATCH /api/issues/:id/status — Update workflow status (maintainer only)
// ----------------------------------------------------------------
export const updateIssueStatus = async (req: Request, res: Response): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const issueId = parseInt(rawId ?? "", 10);
  const { status } = req.body as { status: string };

  if (isNaN(issueId)) {
    sendError(res, 'Invalid issue ID.', StatusCodes.BAD_REQUEST);
    return;
  }

  if (!status || !isValidIssueStatus(status)) {
    sendError(
      res,
      'Status must be one of: open, in_progress, resolved.',
      StatusCodes.BAD_REQUEST,
    );
    return;
  }

  const result = await pool.query<Pick<IssueRow, 'id' | 'reporter_id'>>(
    'SELECT id, reporter_id FROM issues WHERE id = $1',
    [issueId],
  );
  if (result.rows.length === 0) {
    sendError(res, 'Issue not found.', StatusCodes.NOT_FOUND);
    return;
  }

  const updated = await pool.query<IssueRow>(
    `UPDATE issues SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, issueId],
  );

  const userResult = await pool.query<Pick<UserRow, 'id' | 'name' | 'role'>>(
    'SELECT id, name, role FROM users WHERE id = $1',
    [result.rows[0].reporter_id],
  );
  const reporterRow = userResult.rows[0];
  const reporter: ReporterSummary = reporterRow
    ? { id: reporterRow.id, name: reporterRow.name, role: reporterRow.role as UserRole }
    : { id: result.rows[0].reporter_id, name: 'Unknown', role: 'contributor' };

  sendSuccess(res, toPublicIssue(updated.rows[0], reporter), 'Issue status updated successfully');
};

// ----------------------------------------------------------------
// DELETE /api/issues/:id — Delete issue (maintainer only)
// ----------------------------------------------------------------
export const deleteIssue = async (req: Request, res: Response): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const issueId = parseInt(rawId ?? "", 10);

  if (isNaN(issueId)) {
    sendError(res, 'Invalid issue ID.', StatusCodes.BAD_REQUEST);
    return;
  }

  const result = await pool.query<IssueRow>(
    'SELECT id FROM issues WHERE id = $1',
    [issueId],
  );
  if (result.rows.length === 0) {
    sendError(res, 'Issue not found.', StatusCodes.NOT_FOUND);
    return;
  }

  await pool.query('DELETE FROM issues WHERE id = $1', [issueId]);

  sendSuccess(res, null, 'Issue deleted successfully');
};
