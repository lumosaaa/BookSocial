/**
 * M5 · 书籍讨论路由
 * 挂载路径:
 *   /api/v1/books/:bookId/discussions  (书籍讨论列表/发帖)
 *   /api/v1/discussions/:id            (讨论详情/删除)
 *   /api/v1/discussions/:id/comments   (讨论评论)
 *   /api/v1/discussions/:id/likes      (讨论点赞)
 * 注意：由于前三段挂载路径不同，拆分为两个 router 从 app.js 分别挂载
 */
const express = require('express');
const bookDiscRouter = express.Router({ mergeParams: true }); // for /api/v1/books/:bookId/discussions
const discRouter     = express.Router({ mergeParams: true }); // for /api/v1/discussions

const { authMiddleware, optionalAuth } = require('../common/authMiddleware');
const discussionService = require('../services/discussionService');

// ══════════════════════════════════════════════════════════════════════════════
// bookDiscRouter — 挂载到 /api/v1/books/:bookId/discussions
// ══════════════════════════════════════════════════════════════════════════════

// 书籍讨论列表
// GET /api/v1/books/:bookId/discussions?category=&sort=hot|new&page=
bookDiscRouter.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, sort = 'hot', page = 1 } = req.query;
    const result = await discussionService.listDiscussions({
      bookId: Number(req.params.bookId),
      category: category || null,
      sort,
      page: Number(page),
      currentUserId: req.user?.id || null,
    });
    res.paginate(result.list, result.total, Number(page), 20);
  } catch (err) {
    res.fail(err.message || '获取讨论列表失败', err.status || 500);
  }
});

// 在书籍讨论区发帖
// POST /api/v1/books/:bookId/discussions
bookDiscRouter.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, content, category, hasSpoiler } = req.body;
    if (!title || title.trim().length < 2) return res.fail('标题至少2字', 400);
    if (!content || content.trim().length === 0) return res.fail('内容不能为空', 400);
    const disc = await discussionService.createDiscussion({
      bookId: Number(req.params.bookId),
      userId: req.user.id,
      title: title.trim(),
      content: content.trim(),
      category: category || 0,  // 0=综合, 1=书评, 2=剧情, 3=推荐, 4=求助
      hasSpoiler: hasSpoiler === true,
    });
    res.created(disc);
  } catch (err) {
    res.fail(err.message || '发帖失败', err.status || 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// discRouter — 挂载到 /api/v1/discussions
// ══════════════════════════════════════════════════════════════════════════════

// 讨论详情
// GET /api/v1/discussions/:id
discRouter.get('/:id', optionalAuth, async (req, res) => {
  try {
    const disc = await discussionService.getDiscussion({
      discId: Number(req.params.id),
      currentUserId: req.user?.id || null,
    });
    if (!disc) return res.notFound('讨论不存在');
    res.ok(disc);
  } catch (err) {
    res.fail(err.message || '获取讨论失败', err.status || 500);
  }
});

// 删除讨论（仅作者）
// DELETE /api/v1/discussions/:id
discRouter.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await discussionService.deleteDiscussion({
      discId: Number(req.params.id),
      userId: req.user.id,
    });
    res.ok({ deleted: true });
  } catch (err) {
    res.fail(err.message || '删除失败', err.status || 500);
  }
});

// 讨论评论列表
// GET /api/v1/discussions/:id/comments?page=
discRouter.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const result = await discussionService.listComments({
      discId: Number(req.params.id),
      page: Number(page),
      currentUserId: req.user?.id || null,
    });
    res.paginate(result.list, result.total, Number(page), 20);
  } catch (err) {
    res.fail(err.message || '获取评论失败', err.status || 500);
  }
});

// 发表讨论评论
// POST /api/v1/discussions/:id/comments
discRouter.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { content, parentId } = req.body;
    if (!content || content.trim().length === 0) return res.fail('评论内容不能为空', 400);
    const comment = await discussionService.createComment({
      discId: Number(req.params.id),
      userId: req.user.id,
      content: content.trim(),
      parentId: parentId || null,
    });
    res.created(comment);
  } catch (err) {
    res.fail(err.message || '评论失败', err.status || 500);
  }
});

// 删除评论（仅作者）
// DELETE /api/v1/discussions/:id/comments/:commentId
discRouter.delete('/:id/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    await discussionService.deleteComment({
      commentId: Number(req.params.commentId),
      userId: req.user.id,
    });
    res.ok({ deleted: true });
  } catch (err) {
    res.fail(err.message || '删除评论失败', err.status || 500);
  }
});

// 讨论点赞
// POST /api/v1/discussions/:id/likes
discRouter.post('/:id/likes', authMiddleware, async (req, res) => {
  try {
    const result = await discussionService.toggleLike({
      discId: Number(req.params.id),
      userId: req.user.id,
    });
    res.ok(result);
  } catch (err) {
    res.fail(err.message || '操作失败', err.status || 500);
  }
});

module.exports = { bookDiscRouter, discRouter };
