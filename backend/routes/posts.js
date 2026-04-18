'use strict';

const express = require('express');
const router  = express.Router();
const { authMiddleware, optionalAuth } = require('../common/authMiddleware');
const postService    = require('../services/postService');
const likeService    = require('../services/likeService');
const commentService = require('../services/commentService');

// ── 信息流 ────────────────────────────────────────────────────
// GET /api/v1/posts?tab=following|recommend&cursor=&pageSize=
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { tab = 'recommend', cursor, pageSize = 20 } = req.query;
    const viewerId = req.user?.id || null;
    let result;

    if (tab === 'following') {
      if (!viewerId) return res.fail('请先登录', 401);
      result = await postService.getFollowingFeed(viewerId, cursor, +pageSize);
    } else {
      result = await postService.getRecommendFeed(viewerId, cursor, +pageSize);
    }

    res.ok(result);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// ── 发帖 ──────────────────────────────────────────────────────
// POST /api/v1/posts
router.post('/', authMiddleware, async (req, res) => {
  try {
    const post = await postService.createPost(req.user.id, req.body);
    res.created(post);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// ── 帖子详情 ──────────────────────────────────────────────────
// GET /api/v1/posts/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await postService.getPostById(+req.params.id, req.user?.id || null);
    if (!post) return res.notFound('帖子不存在');

    // 可见性检查
    if (post.visibility === 2 && req.user?.id !== post.userId) {
      return res.fail('无权查看该内容', 403);
    }
    res.ok(post);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// ── 删除帖子 ──────────────────────────────────────────────────
// DELETE /api/v1/posts/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deleteReason = req.body?.reason !== undefined ? Number(req.body.reason) : 0;
    if (![0, 1, 2].includes(deleteReason)) {
      return res.fail('删除原因无效', 400);
    }

    await postService.deletePost(+req.params.id, req.user.id, deleteReason);
    res.ok(null);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// ── 点赞 / 取消点赞 ───────────────────────────────────────────
// POST /api/v1/posts/:id/likes
router.post('/:id/likes', authMiddleware, async (req, res) => {
  try {
    const result = await likeService.toggleLike(req.user.id, +req.params.id, 1);
    res.ok(result);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// ── 转发 ──────────────────────────────────────────────────────
// POST /api/v1/posts/:id/share
router.post('/:id/share', authMiddleware, async (req, res) => {
  try {
    const post = await postService.sharePost(req.user.id, +req.params.id, req.body.content);
    res.created(post);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// ── 评论列表 ──────────────────────────────────────────────────
// GET /api/v1/posts/:id/comments?page=&pageSize=
router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const result = await commentService.getPostComments(
      +req.params.id, req.user?.id || null, +page, +pageSize
    );
    res.ok(result);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// ── 发表评论 ──────────────────────────────────────────────────
// POST /api/v1/posts/:id/comments
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const comment = await commentService.createComment(req.user.id, {
      targetId:   +req.params.id,
      targetType: 1,
      ...req.body,
    });
    res.created(comment);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

module.exports = router;
