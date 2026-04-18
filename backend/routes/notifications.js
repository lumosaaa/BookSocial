// backend/routes/notifications.js
// M4 · 通知 REST 路由（含内部接口 /internal/notify）
'use strict';

const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../common/authMiddleware');
const notificationService = require('../services/notificationService');

function verifyInternalSecret(req, res) {
  const configuredSecret = process.env.INTERNAL_SECRET;
  if (!configuredSecret) {
    res.status(500).json({ code: 500, message: '内部服务密钥未配置', data: null, timestamp: Date.now() });
    return false;
  }

  const secret = req.headers['x-internal-secret'];
  if (secret !== configuredSecret) {
    res.status(403).json({ code: 403, message: '无权限', data: null, timestamp: Date.now() });
    return false;
  }

  return true;
}

// GET /api/v1/notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page       = parseInt(req.query.page)     || 1;
    const pageSize   = parseInt(req.query.pageSize) || 20;
    const onlyUnread = req.query.unread === '1';
    const data = await notificationService.getNotifications(req.user.id, page, pageSize, onlyUnread);
    res.paginate(data.list, data.total, data.page, data.pageSize);
  } catch (err) {
    res.fail(err.message || '获取通知失败', 500);
  }
});

// GET /api/v1/notifications/unread
router.get('/unread', authMiddleware, async (req, res) => {
  try {
    const data = await notificationService.getUnreadCount(req.user.id);
    res.ok(data);
  } catch (err) {
    res.fail(err.message || '查询失败', 500);
  }
});

// PUT /api/v1/notifications/read
router.put('/read', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    await notificationService.markRead(req.user.id, ids || null);
    res.ok(null);
  } catch (err) {
    res.fail(err.message || '操作失败', 500);
  }
});

// DELETE /api/v1/notifications/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await notificationService.deleteNotification(req.user.id, Number(req.params.id));
    res.ok(null);
  } catch (err) {
    res.fail(err.message || '删除失败', err.status || 500);
  }
});

// 内部路由（挂载到 /internal）
const internalRouter = express.Router();
internalRouter.post('/notify', async (req, res) => {
  if (!verifyInternalSecret(req, res)) return;

  try {
    const { userId, type, actorId, targetId, targetType, content } = req.body;
    if (!userId || !type) {
      return res.status(400).json({ code: 400, message: 'userId 和 type 为必填项', data: null, timestamp: Date.now() });
    }
    const notif = await notificationService.createNotification({ userId, type, actorId, targetId, targetType, content });
    const io = req.app.get('io');
    if (io && notif) {
      const { onlineUsers } = require('../socket');
      const socketId = onlineUsers.get(userId);
      if (socketId) io.to(socketId).emit('notification_push', { notification: notif });
    }
    res.json({ code: 200, message: '通知已发送', data: notif, timestamp: Date.now() });
  } catch (err) {
    console.error('[内部通知] 错误:', err);
    res.status(500).json({ code: 500, message: err.message, data: null, timestamp: Date.now() });
  }
});

module.exports = { router, internalRouter };
