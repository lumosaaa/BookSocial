/**
 * M4 · messageApi.ts
 * 所有类型定义与 backend/services/messageService.js、notificationService.js 保持一致。
 * 严禁在此文件外另建 axios 实例（参见 CLAUDE.md 约定）。
 */
import apiClient from './apiClient';
// ─────────────────────────────────────────────────────────────────────────────
// 会话接口
// ─────────────────────────────────────────────────────────────────────────────
/** 获取当前用户的会话列表 */
export async function getConversations(page = 1, pageSize = 20) {
    const res = await apiClient.get('/conversations', { params: { page, pageSize } });
    return res.data.data;
}
/**
 * 获取或创建与目标用户的会话
 * @param userId 对方用户 ID
 */
export async function getOrCreateConversation(userId) {
    const res = await apiClient.post('/conversations', { userId });
    return res.data.data;
}
// ─────────────────────────────────────────────────────────────────────────────
// 消息接口
// ─────────────────────────────────────────────────────────────────────────────
/** 获取会话历史消息（后端返回倒序，前端展示时应 .reverse()） */
export async function getMessages(conversationId, page = 1, pageSize = 30) {
    const res = await apiClient.get(`/conversations/${conversationId}/messages`, {
        params: { page, pageSize },
    });
    return res.data.data;
}
/** HTTP 通道发送消息（Socket 主通道降级备用） */
export async function sendMessageHttp(conversationId, payload) {
    const res = await apiClient.post(`/conversations/${conversationId}/messages`, payload);
    return res.data.data;
}
/** 撤回消息（只能撤回自己 2 分钟内的消息） */
export async function recallMessage(conversationId, messageId) {
    const res = await apiClient.delete(`/conversations/${conversationId}/messages/${messageId}`);
    return res.data.data;
}
/** 私信未读总数 */
export async function getMessageUnreadCount() {
    const res = await apiClient.get('/conversations/unread');
    return res.data.data;
}
// ─────────────────────────────────────────────────────────────────────────────
// 通知接口
// ─────────────────────────────────────────────────────────────────────────────
/** 获取通知列表 */
export async function getNotifications(page = 1, pageSize = 20, onlyUnread = false) {
    const res = await apiClient.get('/notifications', {
        params: { page, pageSize, unread: onlyUnread ? '1' : '0' },
    });
    return res.data.data;
}
/** 通知未读总数（供顶栏 badge 轮询） */
export async function getNotificationUnreadCount() {
    const res = await apiClient.get('/notifications/unread');
    return res.data.data;
}
/**
 * 标记通知已读
 * @param ids 传 null 或不传则全部已读；传数组则只标记指定 id
 */
export async function markNotificationsRead(ids) {
    await apiClient.put('/notifications/read', ids ? { ids } : {});
}
/** 删除单条通知 */
export async function deleteNotification(notifId) {
    await apiClient.delete(`/notifications/${notifId}`);
}
// ─────────────────────────────────────────────────────────────────────────────
// 常量
// ─────────────────────────────────────────────────────────────────────────────
/** 通知类型说明文本 */
export const NOTIF_TYPE_TEXT = {
    1: '关注了你',
    2: '赞了你的内容',
    3: '评论了你',
    4: '在帖子中@了你',
    5: '系统通知',
    6: '给你发了私信',
};
/** 消息类型默认占位文本（会话列表预览用） */
export function msgTypePreview(msgType) {
    if (msgType === 1)
        return '[图片]';
    if (msgType === 2)
        return '[书籍分享]';
    return '';
}
