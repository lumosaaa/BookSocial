// frontend/src/store/socketStore.ts
// M4 · Socket.io 客户端状态管理
import { create } from 'zustand';
import { io } from 'socket.io-client';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
export const useSocketStore = create((set, get) => ({
    socket: null,
    connected: false,
    newMessages: [],
    newGroupMessages: [],
    newNotifications: [],
    onlineUserIds: new Set(),
    typingConversations: {},
    messageUnread: 0,
    notificationUnread: 0,
    connect(token) {
        if (get().socket)
            return; // 已连接则跳过
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });
        socket.on('connect', () => {
            console.log('[Socket] 连接成功');
            set({ connected: true });
        });
        socket.on('disconnect', (reason) => {
            console.log('[Socket] 断开连接:', reason);
            set({ connected: false });
        });
        // 收到新私信
        socket.on('new_message', ({ message }) => {
            set((s) => ({
                newMessages: [...s.newMessages, message],
                messageUnread: s.messageUnread + 1,
            }));
        });
        // 收到新群聊消息
        socket.on('new_group_message', ({ message }) => {
            set((s) => ({ newGroupMessages: [...s.newGroupMessages, message] }));
        });
        socket.on('group_message_recalled', ({ messageId }) => {
            set((s) => ({
                newGroupMessages: s.newGroupMessages.map((m) => m.id === messageId ? { ...m, isRecalled: true, content: '[消息已撤回]' } : m),
            }));
        });
        // 对方正在输入
        socket.on('peer_typing', ({ conversationId }) => {
            set((s) => ({
                typingConversations: {
                    ...s.typingConversations,
                    [conversationId]: Date.now(),
                },
            }));
            window.setTimeout(() => {
                set((s) => {
                    if (!s.typingConversations[conversationId])
                        return s;
                    const next = { ...s.typingConversations };
                    if (Date.now() - next[conversationId] >= 2800)
                        delete next[conversationId];
                    return { typingConversations: next };
                });
            }, 3000);
        });
        // 收到通知推送
        socket.on('notification_push', ({ notification }) => {
            set((s) => ({
                newNotifications: [...s.newNotifications, notification],
                notificationUnread: s.notificationUnread + 1,
            }));
        });
        // 消息撤回
        socket.on('message_recalled', ({ messageId, conversationId }) => {
            // 将本地 newMessages 中对应消息标记撤回
            set((s) => ({
                newMessages: s.newMessages.map((m) => m.id === messageId ? { ...m, isRecalled: true, content: '[消息已撤回]' } : m),
            }));
            // 外部组件可通过订阅 newMessages 来感知撤回
            console.log('[Socket] 消息已撤回:', messageId, '会话:', conversationId);
        });
        // 用户上下线
        socket.on('user_online', ({ userId, online }) => {
            set((s) => {
                const next = new Set(s.onlineUserIds);
                online ? next.add(userId) : next.delete(userId);
                return { onlineUserIds: next };
            });
        });
        set({ socket });
    },
    disconnect() {
        const { socket } = get();
        socket?.disconnect();
        set({
            socket: null,
            connected: false,
            newMessages: [],
            newGroupMessages: [],
            newNotifications: [],
            onlineUserIds: new Set(),
            typingConversations: {},
            messageUnread: 0,
            notificationUnread: 0,
        });
    },
    sendMessage(conversationId, content, msgType = 0, cb) {
        const { socket } = get();
        if (!socket) {
            cb?.({ ok: false, error: '未连接' });
            return;
        }
        socket.emit('send_message', { conversationId, content, msgType }, cb);
    },
    recallMessage(messageId, cb) {
        const { socket } = get();
        if (!socket) {
            cb?.({ ok: false });
            return;
        }
        socket.emit('recall_message', { messageId }, cb);
    },
    sendGroupMessage(groupId, content, msgType = 0, cb) {
        const { socket } = get();
        if (!socket) {
            cb?.({ ok: false, error: '未连接' });
            return;
        }
        socket.emit('send_group_message', { groupId, content, msgType }, cb);
    },
    recallGroupMessage(messageId, cb) {
        const { socket } = get();
        if (!socket) {
            cb?.({ ok: false, error: '未连接' });
            return;
        }
        socket.emit('recall_group_message', { messageId }, cb);
    },
    joinGroupRoom(groupId) {
        const { socket } = get();
        socket?.emit('join_group_room', { groupId });
    },
    leaveGroupRoom(groupId) {
        const { socket } = get();
        socket?.emit('leave_group_room', { groupId });
    },
    emitTyping(conversationId) {
        const { socket } = get();
        socket?.emit('typing', { conversationId });
    },
    markRead(conversationId) {
        const { socket } = get();
        socket?.emit('mark_read', { conversationId });
    },
    clearNewMessages() { set({ newMessages: [] }); },
    clearNewNotifications() { set({ newNotifications: [] }); },
    setMessageUnread(value) { set({ messageUnread: Math.max(0, value) }); },
    setNotificationUnread(value) { set({ notificationUnread: Math.max(0, value) }); },
}));
