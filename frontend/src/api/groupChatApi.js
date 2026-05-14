import apiClient from './apiClient';
export async function getGroupMessages(groupId, page = 1, pageSize = 30) {
    const res = await apiClient.get(`/groups/${groupId}/chat/messages`, { params: { page, pageSize } });
    return res.data.data;
}
export async function sendGroupMessageHttp(groupId, payload) {
    const res = await apiClient.post(`/groups/${groupId}/chat/messages`, payload);
    return res.data.data;
}
export async function recallGroupMessage(groupId, messageId) {
    const res = await apiClient.delete(`/groups/${groupId}/chat/messages/${messageId}`);
    return res.data.data;
}
