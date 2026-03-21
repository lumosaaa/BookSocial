'use strict';

const express = require('express');
const router  = express.Router();
const { authMiddleware, optionalAuth } = require('../common/authMiddleware');
const commentService = require('../services/commentService');
const likeService    = require('../services/likeService');

// ── 展开子评论 ────────────────────────────────────────────────
// GET /api/v1/comments/:id/replies
router.get('/:id/replies', optionalAuth, async (req, res) => {
  try {
    const list = await commentService.getReplies(+req.params.id, req.user?.id || null);
    res.ok(list);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// ── 点赞评论 ──────────────────────────────────────────────────
// POST /api/v1/comments/:id/likes
router.post('/:id/likes', authMiddleware, async (req, res) => {
  try {
    const result = await likeService.toggleLike(req.user.id, +req.params.id, 2);
    res.ok(result);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// ── 删除评论 ──────────────────────────────────────────────────
// DELETE /api/v1/comments/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await commentService.deleteComment(+req.params.id, req.user.id);
    res.ok(null);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

module.exports = router;
