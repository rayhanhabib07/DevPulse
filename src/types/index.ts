// Shared domain types for DevPulse

export type UserRole = 'contributor' | 'maintainer';
export type IssueType = 'bug' | 'feature_request';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';

// ---- Database row shapes ----

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface IssueRow {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter_id: number;
  created_at: Date;
  updated_at: Date;
}

// ---- Public-facing shapes (password stripped) ----

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface ReporterSummary {
  id: number;
  name: string;
  role: UserRole;
}

export interface PublicIssue {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter: ReporterSummary;
  created_at: Date;
  updated_at: Date;
}

// ---- JWT payload ----

export interface JwtPayload {
  id: number;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ---- Request body shapes ----

export interface SignupBody {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface CreateIssueBody {
  title: string;
  description: string;
  type: IssueType;
}

export interface UpdateIssueBody {
  title?: string;
  description?: string;
  type?: IssueType;
}

export interface UpdateStatusBody {
  status: IssueStatus;
}

// ---- Query param shapes ----

export interface IssueQueryParams {
  sort?: 'newest' | 'oldest';
  type?: IssueType;
  status?: IssueStatus;
}

// ---- Standard API response ----

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: unknown;
}
