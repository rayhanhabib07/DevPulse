import { IssueType, IssueStatus, UserRole } from '../types';

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidRole = (role: string): role is UserRole =>
  role === 'contributor' || role === 'maintainer';

export const isValidIssueType = (type: string): type is IssueType =>
  type === 'bug' || type === 'feature_request';

export const isValidIssueStatus = (status: string): status is IssueStatus =>
  status === 'open' || status === 'in_progress' || status === 'resolved';
