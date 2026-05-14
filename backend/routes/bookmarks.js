'use strict';

const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../common/authMiddleware');
const db = require('../common/db');
const postService = require('../services/postService');

// ── 收藏 ──────────────────────────────────────────────────────
// POST /api/v1/bookmarks   body: { targetId, targetType }
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { targetId, targetType = 1 } = req.body;
    const userId = req.user.id;

    if (!targetId) return res.fail('缺少 targetId', 400);

    const [[existing]] = await db.query(
      'SELECT id FROM bookmarks WHERE user_id=? AND target_id=? AND target_type=?',
      [userId, targetId, targetType]
    );
    if (existing) return res.fail('已收藏', 409);

    await db.transaction(async (conn) => {
      await conn.query(
        'INSERT INTO bookmarks (user_id, target_id, target_type) VALUES (?,?,?)',
        [userId, targetId, targetType]
      );
      if (targetType === 1) {
        await conn.query(
          'UPDATE posts SET bookmark_count = bookmark_count+1 WHERE id=?',
          [targetId]
        );
      }
    });

    res.created({ bookmarked: true });
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// ── 取消收藏 ──────────────────────────────────────────────────
// DELETE /api/v1/bookmarks/:id   (id = bookmark 记录主键)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [[bm]] = await db.query(
      'SELECT id, target_id, target_type FROM bookmarks WHERE id=? AND user_id=?',
      [+req.params.id, userId]
    );
    if (!bm) return res.notFound('收藏记录不存在');

    await db.transaction(async (conn) => {
      await conn.query('DELETE FROM bookmarks WHERE id=?', [bm.id]);
      if (bm.target_type === 1) {
        await conn.query(
          'UPDATE posts SET bookmark_count = GREATEST(bookmark_count-1,0) WHERE id=?',
          [bm.target_id]
        );
      }
    });

    res.ok({ bookmarked: false });
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// ── 我的收藏列表 ──────────────────────────────────────────────
// GET /api/v1/users/me/bookmarks?page=&pageSize=
// （此路由实际挂载到 /api/v1/users，由 follows.js 统一管理 /me/* 前缀；
//   也可在此单独导出，由 app.js 按需挂载）
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const userId = req.user.id;
    const normalizedPage = Math.max(1, Number(page) || 1);
    const normalizedPageSize = Math.min(50, Math.max(1, Number(pageSize) || 20));
    const offset = (normalizedPage - 1) * normalizedPageSize;

    const [rows] = await db.query(
      `SELECT bm.id AS bookmarkId, bm.target_id, bm.created_at AS bookmarkedAt
       FROM bookmarks bm
       JOIN posts p ON p.id = bm.target_id AND bm.target_type = 1
       WHERE bm.user_id = ? AND bm.target_type = 1 AND p.is_deleted = 0
       ORDER BY bm.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, normalizedPageSize, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM bookmarks bm
       JOIN posts p ON p.id = bm.target_id AND bm.target_type = 1
       WHERE bm.user_id = ? AND bm.target_type = 1 AND p.is_deleted = 0`,
      [userId]
    );

    const list = [];
    for (const row of rows) {
      const post = await postService.getPostById(row.target_id, userId);
      if (post) {
        list.push({
          ...post,
          bookmarkId: row.bookmarkId,
          bookmarkedAt: row.bookmarkedAt,
          isBookmarked: true,
        });
      }
    }

    res.ok({
      list,
      total,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      totalPages: Math.ceil(total / normalizedPageSize),
      hasMore: normalizedPage * normalizedPageSize < total,
    });
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

module.exports = router;
