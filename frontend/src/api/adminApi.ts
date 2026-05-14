import apiClient from './apiClient';

export interface AdminOverviewStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  todayNewUsers: number;
  totalBooks: number;
  activeBooks: number;
  totalPosts: number;
  todayNewPosts: number;
  totalGroups: number;
  activeGroups: number;
  pendingReports: number;
  validReports: number;
  invalidReports: number;
  activeKeywords: number;
}

export interface AdminOverview {
  stats: AdminOverviewStats;
  recentUsers: Array<{
    id: number;
    username: string;
    email: string | null;
    role: string;
    status: number;
    createdAt: string;
  }>;
  recentReports: Array<{
    id: number;
    targetId: number;
    targetType: number;
    reasonType: number;
    status: number;
    reporterName: string;
    createdAt: string;
  }>;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  status: 0 | 1 | 2;
  followerCount: number;
  followingCount: number;
  postCount: number;
  bookCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminKeyword {
  id: number;
  keyword: string;
  level: number;
  is_active: number;
  created_at: string;
}

export interface AdminReport {
  id: number;
  reporter_id: number;
  target_id: number;
  target_type: number;
  reason_type: number;
  description: string | null;
  status: number;
  result_note: string | null;
  created_at: string;
  resolved_at: string | null;
  reporterName: string;
}

export interface AuditLog {
  id: number;
  contentId: number;
  contentType: number;
  auditType: number;
  result: number;
  rejectReason: number | null;
  createdAt: string;
  auditorId: number | null;
  auditorName: string | null;
}

interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { data } = await apiClient.get('/admin/overview');
  return data.data;
}

export async function getAdminUsers(params?: {
  keyword?: string;
  role?: string;
  status?: number | '';
  page?: number;
  pageSize?: number;
}): Promise<PageResult<AdminUser>> {
  const { data } = await apiClient.get('/admin/users', { params });
  return data.data;
}

export async function updateAdminUser(userId: number, payload: {
  role?: 'user' | 'admin';
  status?: 0 | 1 | 2;
}) {
  const { data } = await apiClient.put(`/admin/users/${userId}`, payload);
  return data.data;
}

export async function getReports(params?: {
  status?: number;
  page?: number;
  pageSize?: number;
}): Promise<PageResult<AdminReport>> {
  const { data } = await apiClient.get('/reports', { params });
  return data.data;
}

export async function resolveReport(reportId: number, payload: {
  status: 1 | 2;
  resultNote?: string;
}) {
  const { data } = await apiClient.put(`/reports/${reportId}`, payload);
  return data.data;
}

export async function getKeywords(): Promise<AdminKeyword[]> {
  const { data } = await apiClient.get('/admin/keywords');
  return data.data;
}

export async function createKeyword(payload: { keyword: string; level?: 1 | 2 }) {
  const { data } = await apiClient.post('/admin/keywords', payload);
  return data.data;
}

export async function deleteKeyword(keywordId: number) {
  const { data } = await apiClient.delete(`/admin/keywords/${keywordId}`);
  return data.data;
}

export async function getAuditLogs(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PageResult<AuditLog>> {
  const { data } = await apiClient.get('/admin/audit-logs', { params });
  return data.data;
}
