/**
 * M4 · messageApi.ts
 * 所有类型定义与 backend/services/messageService.js、notificationService.js 保持一致。
 * 严禁在此文件外另建 axios 实例（参见 CLAUDE.md 约定）。
 */

import apiClient from './apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// 类型定义（与后端 formatConversation / formatMessage / formatNotification 对齐）
// ─────────────────────────────────────────────────────────────────────────────

/** 对方用户信息（会话列表中展示） */
export interface ConvPeer {
  id: number;
  username: string;
  avatarUrl: string | null;
}

/**
 * 会话（对应 messageService.formatConversation 输出）
 * 字段名与后端完全一致，前端直接使用，不做映射。
 */
export interface Conversation {
  id: number;
  other: ConvPeer;            // 对方用户（非当前登录用户）
  lastContent: string | null; // 最后一条消息文本（recalled 时为 '[消息已撤回]'）
  lastMsgType: number | null; // 0=文字 1=图片 2=书籍分享
  lastSenderId: number | null;
  lastMessageAt: string | null;
  unreadCount: number;        // 当前用户的未读数
  isBlocked: boolean;
  createdAt: string;
}

/**
 * 消息（对应 messageService.formatMessage 输出）
 */
export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderAvatar: string | null;
  content: string;            // 已撤回时内容为 '[消息已撤回]'
  msgType: 0 | 1 | 2;        // 0=文字 1=图片 2=书籍分享
  refBookId: number | null;   // 书籍分享时的 book id，可用 /api/v1/books/:id 拉取详情
  isRecalled: boolean;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

/** 通知中的触发用户（actor）信息 */
export interface NotifActor {
  id: number;
  username: string;
  avatarUrl: string | null;
}

/**
 * 通知（对应 notificationService.formatNotification 输出）
 * type: 1被关注 2被点赞 3被评论 4被@ 5系统 6新私信
 */
export interface Notification {
  id: number;
  type: 1 | 2 | 3 | 4 | 5 | 6;
  actor: NotifActor | null;       // 系统通知时为 null
  targetId: number | null;
  targetType: string | null;      // 'post' | 'comment' | 'note' | 'conversation'
  content: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

/** 分页响应通用包装（与 M0 res.paginate 输出对齐） */
interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 会话接口
// ─────────────────────────────────────────────────────────────────────────────

/** 获取当前用户的会话列表 */
export async function getConversations(page = 1, pageSize = 20): Promise<PageResult<Conversation>> {
  const res = await apiClient.get('/conversations', { params: { page, pageSize } });
  return res.data.data as PageResult<Conversation>;
}

/**
 * 获取或创建与目标用户的会话
 * @param userId 对方用户 ID
 */
export async function getOrCreateConversation(userId: number): Promise<Conversation> {
  const res = await apiClient.post('/conversations', { userId });
  return res.data.data as Conversation;
}

// ─────────────────────────────────────────────────────────────────────────────
// 消息接口
// ─────────────────────────────────────────────────────────────────────────────

/** 获取会话历史消息（后端返回倒序，前端展示时应 .reverse()） */
export async function getMessages(
  conversationId: number,
  page = 1,
  pageSize = 30
): Promise<PageResult<Message>> {
  const res = await apiClient.get(`/conversations/${conversationId}/messages`, {
    params: { page, pageSize },
  });
  return res.data.data as PageResult<Message>;
}

/** HTTP 通道发送消息（Socket 主通道降级备用） */
export async function sendMessageHttp(
  conversationId: number,
  payload: { content: string; msgType?: 0 | 1 | 2; refBookId?: number }
): Promise<Message> {
  const res = await apiClient.post(`/conversations/${conversationId}/messages`, payload);
  return res.data.data as Message;
}

/** 撤回消息（只能撤回自己 2 分钟内的消息） */
export async function recallMessage(
  conversationId: number,
  messageId: number
): Promise<{ messageId: number; conversationId: number }> {
  const res = await apiClient.delete(`/conversations/${conversationId}/messages/${messageId}`);
  return res.data.data;
}

/** 私信未读总数 */
export async function getMessageUnreadCount(): Promise<{ unread: number }> {
  const res = await apiClient.get('/conversations/unread');
  return res.data.data as { unread: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// 通知接口
// ─────────────────────────────────────────────────────────────────────────────

/** 获取通知列表 */
export async function getNotifications(
  page = 1,
  pageSize = 20,
  onlyUnread = false
): Promise<PageResult<Notification>> {
  const res = await apiClient.get('/notifications', {
    params: { page, pageSize, unread: onlyUnread ? '1' : '0' },
  });
  return res.data.data as PageResult<Notification>;
}

/** 通知未读总数（供顶栏 badge 轮询） */
export async function getNotificationUnreadCount(): Promise<{ unread: number }> {
  const res = await apiClient.get('/notifications/unread');
  return res.data.data as { unread: number };
}

/**
 * 标记通知已读
 * @param ids 传 null 或不传则全部已读；传数组则只标记指定 id
 */
export async function markNotificationsRead(ids?: number[]): Promise<void> {
  await apiClient.put('/notifications/read', ids ? { ids } : {});
}

/** 删除单条通知 */
export async function deleteNotification(notifId: number): Promise<void> {
  await apiClient.delete(`/notifications/${notifId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 常量
// ─────────────────────────────────────────────────────────────────────────────

/** 通知类型说明文本 */
export const NOTIF_TYPE_TEXT: Record<number, string> = {
  1: '关注了你',
  2: '赞了你的内容',
  3: '评论了你',
  4: '在帖子中@了你',
  5: '系统通知',
  6: '给你发了私信',
};

/** 消息类型默认占位文本（会话列表预览用） */
export function msgTypePreview(msgType: number | null): string {
  if (msgType === 1) return '[图片]';
  if (msgType === 2) return '[书籍分享]';
  return '';
}
