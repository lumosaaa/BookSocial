'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const { authMiddleware } = require('../common/authMiddleware');
const groupChatService = require('../services/groupChatService');

// GET /api/v1/groups/:id/chat/messages
router.get('/:id/chat/messages', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 30;
    const data = await groupChatService.getMessages(req.user.id, Number(req.params.id), page, pageSize);
    res.paginate(data.list, data.total, data.page, data.pageSize);
  } catch (err) {
    console.error('[群聊][GET messages]', err);
    res.fail(err.message || '获取群聊消息失败', err.status || 500);
  }
});

// POST /api/v1/groups/:id/chat/messages
router.post('/:id/chat/messages', authMiddleware, async (req, res) => {
  try {
    const { content, msgType = 0, refBookId } = req.body;
    const data = await groupChatService.sendMessage(req.user.id, Number(req.params.id), { content, msgType, refBookId });
    res.created(data);
  } catch (err) {
    console.error('[群聊][POST messages]', err);
    res.fail(err.message || '发送群聊消息失败', err.status || 500);
  }
});

// DELETE /api/v1/groups/:id/chat/messages/:msgId
router.delete('/:id/chat/messages/:msgId', authMiddleware, async (req, res) => {
  try {
    const data = await groupChatService.recallMessage(req.user.id, Number(req.params.msgId));
    res.ok(data);
  } catch (err) {
    console.error('[群聊][DELETE message]', err);
    res.fail(err.message || '撤回群聊消息失败', err.status || 500);
  }
});

module.exports = router;
