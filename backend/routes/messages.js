// backend/routes/messages.js
// M4 · 私信 REST 路由
'use strict';

const express = require('express');
const router  = express.Router();

const { authMiddleware }     = require('../common/authMiddleware');
const messageService         = require('../services/messageService');

// GET /api/v1/conversations — 会话列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page     = parseInt(req.query.page)     || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const data = await messageService.getConversationList(req.user.id, page, pageSize);
    res.paginate(data.list, data.total, data.page, data.pageSize);
  } catch (err) {
    res.fail(err.message || '获取会话列表失败', err.status || 500);
  }
});

// POST /api/v1/conversations — 与某用户开启/获取会话
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.fail('userId 为必填项', 400);
    const conv = await messageService.getOrCreateConversation(req.user.id, Number(userId));
    res.ok(conv);
  } catch (err) {
    res.fail(err.message || '操作失败', err.status || 500);
  }
});

// GET /api/v1/conversations/unread — 未读数
router.get('/unread', authMiddleware, async (req, res) => {
  try {
    const data = await messageService.getUnreadCount(req.user.id);
    res.ok(data);
  } catch (err) {
    res.fail(err.message || '查询失败', 500);
  }
});

// GET /api/v1/conversations/:id/messages — 消息历史
router.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const page     = parseInt(req.query.page)     || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const data = await messageService.getMessages(req.user.id, Number(req.params.id), page, pageSize);
    res.paginate(data.list, data.total, data.page, data.pageSize);
  } catch (err) {
    res.fail(err.message || '获取消息失败', err.status || 500);
  }
});

// POST /api/v1/conversations/:id/messages — HTTP 发消息（Socket 备用）
router.post('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const { content, msgType = 0, refBookId } = req.body;
    if (!content) return res.fail('消息内容不能为空', 400);
    const { message } = await messageService.sendMessage(
      req.user.id,
      Number(req.params.id),
      { content, msgType, refBookId }
    );
    res.created(message);
  } catch (err) {
    res.fail(err.message || '发送失败', err.status || 500);
  }
});

// DELETE /api/v1/conversations/:convId/messages/:msgId — 撤回消息
router.delete('/:convId/messages/:msgId', authMiddleware, async (req, res) => {
  try {
    const result = await messageService.recallMessage(req.user.id, Number(req.params.msgId));
    res.ok(result);
  } catch (err) {
    res.fail(err.message || '撤回失败', err.status || 500);
  }
});

module.exports = router;
