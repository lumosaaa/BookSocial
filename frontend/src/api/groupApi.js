/**
 * M5 · 小组 & 书籍讨论 前端接口封装
 * 统一使用项目共享的 apiClient（Token 自动注入）
 */
import apiClient from './apiClient';
// ─────────────────────────────────────────────────────────────────────────────
// 小组接口
// ─────────────────────────────────────────────────────────────────────────────
/** 小组列表/搜索 */
export async function listGroups(params) {
    const { data } = await apiClient.get('/groups', { params });
    return data.data;
}
/** 创建小组 */
export async function createGroup(payload) {
    const { data } = await apiClient.post('/groups', payload);
    return data.data;
}
/** 小组详情 */
export async function getGroup(groupId) {
    const { data } = await apiClient.get(`/groups/${groupId}`);
    return data.data;
}
/** 编辑小组 */
export async function updateGroup(groupId, payload) {
    const { data } = await apiClient.put(`/groups/${groupId}`, payload);
    return data.data;
}
/** 解散小组 */
export async function dissolveGroup(groupId) {
    await apiClient.delete(`/groups/${groupId}`);
}
/** 加入小组 */
export async function joinGroup(groupId) {
    const { data } = await apiClient.post(`/groups/${groupId}/join`);
    return data.data;
}
/** 退出小组 */
export async function leaveGroup(groupId) {
    await apiClient.delete(`/groups/${groupId}/leave`);
}
/** 成员列表 */
export async function listMembers(groupId, params) {
    const { data } = await apiClient.get(`/groups/${groupId}/members`, { params });
    return data.data;
}
/** 审批申请 */
export async function approveJoin(groupId, userId, approve) {
    await apiClient.put(`/groups/${groupId}/members/${userId}/approve`, { approve });
}
/** 调整角色 */
export async function setMemberRole(groupId, userId, role) {
    await apiClient.put(`/groups/${groupId}/members/${userId}/role`, { role });
}
/** 移除成员 */
export async function removeMember(groupId, userId) {
    await apiClient.delete(`/groups/${groupId}/members/${userId}`);
}
// ─────────────────────────────────────────────────────────────────────────────
// 小组帖子接口
// ─────────────────────────────────────────────────────────────────────────────
export async function listGroupPosts(groupId, page = 1) {
    const { data } = await apiClient.get(`/groups/${groupId}/posts`, { params: { page } });
    return data.data;
}
export async function createGroupPost(groupId, payload) {
    const { data } = await apiClient.post(`/groups/${groupId}/posts`, payload);
    return data.data;
}
export async function deleteGroupPost(groupId, postId) {
    await apiClient.delete(`/groups/${groupId}/posts/${postId}`);
}
export async function toggleGroupPostLike(groupId, postId) {
    const { data } = await apiClient.post(`/groups/${groupId}/posts/${postId}/likes`);
    return data.data;
}
// ─────────────────────────────────────────────────────────────────────────────
// 阅读挑战接口
// ─────────────────────────────────────────────────────────────────────────────
export async function listChallenges(groupId, params) {
    const { data } = await apiClient.get(`/groups/${groupId}/challenges`, { params });
    return data.data;
}
export async function createChallenge(groupId, payload) {
    const { data } = await apiClient.post(`/groups/${groupId}/challenges`, payload);
    return data.data;
}
export async function checkin(groupId, challengeId, payload) {
    const { data } = await apiClient.post(`/groups/${groupId}/challenges/${challengeId}/checkin`, payload || {});
    return data.data;
}
// ─────────────────────────────────────────────────────────────────────────────
// 书籍讨论接口
// ─────────────────────────────────────────────────────────────────────────────
export async function listDiscussions(bookId, params) {
    const { data } = await apiClient.get(`/books/${bookId}/discussions`, { params });
    return data.data;
}
export async function createDiscussion(bookId, payload) {
    const { data } = await apiClient.post(`/books/${bookId}/discussions`, payload);
    return data.data;
}
export async function getDiscussion(discId) {
    const { data } = await apiClient.get(`/discussions/${discId}`);
    return data.data;
}
export async function deleteDiscussion(discId) {
    await apiClient.delete(`/discussions/${discId}`);
}
export async function listDiscussionComments(discId, page = 1) {
    const { data } = await apiClient.get(`/discussions/${discId}/comments`, { params: { page } });
    return data.data;
}
export async function createDiscussionComment(discId, payload) {
    const { data } = await apiClient.post(`/discussions/${discId}/comments`, payload);
    return data.data;
}
export async function deleteDiscussionComment(discId, commentId) {
    await apiClient.delete(`/discussions/${discId}/comments/${commentId}`);
}
export async function toggleDiscussionLike(discId) {
    const { data } = await apiClient.post(`/discussions/${discId}/likes`);
    return data.data;
}
// ─────────────────────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────────────────────
export const ROLE_LABELS = {
    2: '组长',
    1: '管理员',
    0: '成员',
    '-1': '待审核',
};
export const DISCUSSION_CATEGORIES = [
    { value: 0, label: '综合' },
    { value: 1, label: '书评' },
    { value: 2, label: '剧情' },
    { value: 3, label: '推荐' },
    { value: 4, label: '求助' },
];
/** 挑战是否仍在进行中 */
export function isChallengeActive(challenge) {
    return new Date(challenge.deadline) > new Date();
}
/** 今天是否已打卡 */
export function hasCheckedInToday(lastCheckin) {
    if (!lastCheckin)
        return false;
    const today = new Date().toISOString().slice(0, 10);
    return lastCheckin.slice(0, 10) === today;
}
