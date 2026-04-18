import apiClient from './apiClient';

export interface GroupChatMessage {
  id: number;
  gcId: number;
  groupId: number;
  senderId: number;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  msgType: 0 | 1 | 2;
  refBookId: number | null;
  isRecalled: boolean;
  createdAt: string;
}

interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export async function getGroupMessages(groupId: number, page = 1, pageSize = 30): Promise<PageResult<GroupChatMessage>> {
  const res = await apiClient.get(`/groups/${groupId}/chat/messages`, { params: { page, pageSize } });
  return res.data.data;
}

export async function sendGroupMessageHttp(
  groupId: number,
  payload: { content: string; msgType?: 0 | 1 | 2; refBookId?: number }
): Promise<GroupChatMessage> {
  const res = await apiClient.post(`/groups/${groupId}/chat/messages`, payload);
  return res.data.data;
}

export async function recallGroupMessage(groupId: number, messageId: number): Promise<{ messageId: number; groupId: number }> {
  const res = await apiClient.delete(`/groups/${groupId}/chat/messages/${messageId}`);
  return res.data.data;
}
