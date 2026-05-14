import apiClient from './apiClient';
export async function getAdminOverview() {
    const { data } = await apiClient.get('/admin/overview');
    return data.data;
}
export async function getAdminUsers(params) {
    const { data } = await apiClient.get('/admin/users', { params });
    return data.data;
}
export async function updateAdminUser(userId, payload) {
    const { data } = await apiClient.put(`/admin/users/${userId}`, payload);
    return data.data;
}
export async function getReports(params) {
    const { data } = await apiClient.get('/reports', { params });
    return data.data;
}
export async function resolveReport(reportId, payload) {
    const { data } = await apiClient.put(`/reports/${reportId}`, payload);
    return data.data;
}
export async function getKeywords() {
    const { data } = await apiClient.get('/admin/keywords');
    return data.data;
}
export async function createKeyword(payload) {
    const { data } = await apiClient.post('/admin/keywords', payload);
    return data.data;
}
export async function deleteKeyword(keywordId) {
    const { data } = await apiClient.delete(`/admin/keywords/${keywordId}`);
    return data.data;
}
export async function getAuditLogs(params) {
    const { data } = await apiClient.get('/admin/audit-logs', { params });
    return data.data;
}
