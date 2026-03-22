// frontend/src/store/socketStore.ts
// M4 · Socket.io 客户端状态管理
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { Message, Notification } from '../api/messageApi';

interface SocketState {
  socket:       Socket | null;
  connected:    boolean;
  // 未读徽标（组件自行刷新，这里只存 delta）
  newMessages:     Message[];
  newNotifications: Notification[];
  onlineUserIds:   Set<number>;

  connect:    (token: string) => void;
  disconnect: () => void;
  sendMessage: (conversationId: number, content: string, msgType?: number, cb?: (res: { ok: boolean; message?: Message; error?: string }) => void) => void;
  recallMessage: (messageId: number, cb?: (res: { ok: boolean }) => void) => void;
  clearNewMessages:      () => void;
  clearNewNotifications: () => void;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useSocketStore = create<SocketState>((set, get) => ({
  socket:    null,
  connected: false,
  newMessages:      [],
  newNotifications: [],
  onlineUserIds:    new Set(),

  connect(token: string) {
    if (get().socket) return; // 已连接则跳过

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
    socket.on('new_message', ({ message }: { message: Message }) => {
      set((s) => ({ newMessages: [...s.newMessages, message] }));
    });

    // 收到通知推送
    socket.on('notification_push', ({ notification }: { notification: Notification }) => {
      set((s) => ({ newNotifications: [...s.newNotifications, notification] }));
    });

    // 消息撤回
    socket.on('message_recalled', ({ messageId, conversationId }: { messageId: number; conversationId: number }) => {
      // 将本地 newMessages 中对应消息标记撤回
      set((s) => ({
        newMessages: s.newMessages.map((m) =>
          m.id === messageId ? { ...m, isRecalled: true, content: '[消息已撤回]' } : m
        ),
      }));
      // 外部组件可通过订阅 newMessages 来感知撤回
      console.log('[Socket] 消息已撤回:', messageId, '会话:', conversationId);
    });

    // 用户上下线
    socket.on('user_online', ({ userId, online }: { userId: number; online: boolean }) => {
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
    set({ socket: null, connected: false, newMessages: [], newNotifications: [] });
  },

  sendMessage(conversationId, content, msgType = 0, cb) {
    const { socket } = get();
    if (!socket) { cb?.({ ok: false, error: '未连接' }); return; }
    socket.emit('send_message', { conversationId, content, msgType }, cb);
  },

  recallMessage(messageId, cb) {
    const { socket } = get();
    if (!socket) { cb?.({ ok: false }); return; }
    socket.emit('recall_message', { messageId }, cb);
  },

  clearNewMessages()      { set({ newMessages: [] }); },
  clearNewNotifications() { set({ newNotifications: [] }); },
}));
