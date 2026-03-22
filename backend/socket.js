// backend/socket.js
// M4 · Socket.io 服务端实现
// 在 app.js 中 require 并传入 httpServer 初始化
'use strict';

const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const redis      = require('./common/redis');
const { sendMessage, recallMessage } = require('./services/messageService');
const { createNotification, NOTIF_TYPE } = require('./services/notificationService');

// 在线用户 Map：userId -> socketId
const onlineUsers = new Map();

function initSocket(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // 将 io 实例挂载到 express app，供 notifications.js internalRouter 使用
  if (app) app.set('io', io);

  // ── 鉴权中间件 ──────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('未提供 Token'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id;
      next();
    } catch {
      next(new Error('Token 无效或已过期'));
    }
  });

  // ── 连接事件 ──────────────────────────────
  io.on('connection', (socket) => {
    const myId = socket.userId;
    onlineUsers.set(myId, socket.id);

    // Redis 记录在线状态
    redis.set(`session:${myId}`, socket.id, redis.TTL.SESSION).catch(() => {});

    // 通知所有人该用户上线（只通知关注该用户的人）
    socket.broadcast.emit('user_online', { userId: myId, online: true });

    console.log(`[Socket] 用户 ${myId} 上线，socketId=${socket.id}`);

    // ── 发送私信 ──────────────────────────────
    socket.on('send_message', async ({ conversationId, content, msgType = 0 }, callback) => {
      try {
        const { message, receiverId } = await sendMessage(myId, conversationId, { content, msgType });

        // 推送给接收方（如在线）
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('new_message', { message });
        }

        // 创建通知（仅 msgType=0 普通文字时）
        const notif = await createNotification({
          userId:     receiverId,
          type:       NOTIF_TYPE.MESSAGE,
          actorId:    myId,
          targetId:   conversationId,
          targetType: 'conversation',
          content:    content.slice(0, 30),
        });
        if (notif && receiverSocketId) {
          io.to(receiverSocketId).emit('notification_push', { notification: notif });
        }

        if (typeof callback === 'function') callback({ ok: true, message });
      } catch (err) {
        if (typeof callback === 'function') callback({ ok: false, error: err.message });
      }
    });

    // ── 撤回消息 ──────────────────────────────
    socket.on('recall_message', async ({ messageId }, callback) => {
      try {
        const { conversationId } = await recallMessage(myId, messageId);

        // 通知会话双方
        io.emit('message_recalled', { messageId, conversationId });

        if (typeof callback === 'function') callback({ ok: true });
      } catch (err) {
        if (typeof callback === 'function') callback({ ok: false, error: err.message });
      }
    });

    // ── 标记已读（心跳） ──────────────────────
    socket.on('mark_read', ({ conversationId }) => {
      // 通知对方消息已读（可选，用于显示"已读"状态）
      socket.broadcast.emit('messages_read', { conversationId, readerId: myId });
    });

    // ── 断开连接 ──────────────────────────────
    socket.on('disconnect', () => {
      onlineUsers.delete(myId);
      redis.del(`session:${myId}`).catch(() => {});
      socket.broadcast.emit('user_online', { userId: myId, online: false });
      console.log(`[Socket] 用户 ${myId} 下线`);
    });
  });

  return io;
}

// 暴露 onlineUsers 供路由层查询在线状态
module.exports = { initSocket, onlineUsers };
