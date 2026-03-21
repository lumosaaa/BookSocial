/**
 * routes/users.js
 * 挂载于 /api/v1/users
 *
 * ── M1 用户路由 ──────────────────────────────────────────────────────────────
 *   GET    /search?q=&page=                 用户昵称模糊搜索
 *   GET    /me                              获取当前用户完整信息
 *   PUT    /me                              更新当前用户信息
 *   PUT    /me/privacy                      更新隐私设置
 *   POST   /me/preferences                  保存阅读偏好（新手引导）
 *   GET    /:id                             获取指定用户公开信息
 *   POST   /:id/follow                      关注 / 取关（Toggle）
 *   GET    /:id/followers                   获取粉丝列表
 *   GET    /:id/following                   获取关注列表
 *
 * ── M2 书架路由（集成在此文件，共享 /api/v1/users 前缀）───────────────────────
 *   GET    /me/shelf/export                 导出书架 CSV（⚠ 必须在 /me/shelf/:bookId 前）
 *   GET    /me/shelf?status=&page=&group=   获取书架列表
 *   POST   /me/shelf                        添加到书架
 *   PUT    /me/shelf/:bookId                更新书架记录
 *   DELETE /me/shelf/:bookId                从书架移除
 *
 * 路由声明顺序约定：
 *   精确路径（/me, /me/shelf, /me/shelf/export）必须声明在动态参数（/:id）之前
 *   /me/shelf/export 必须声明在 /me/shelf/:bookId 之前
 */

'use strict';

const express      = require('express');
const router       = express.Router();
const { authMiddleware, optionalAuth } = require('../common/authMiddleware');

// M1 Service
const {
  getUserById,
  getMyProfile,
  updateUser,
  updatePrivacy,
  saveReadingPreferences,
  searchUsers,
} = require('../services/userService');

// M2 Service
const {
  getShelf,
  addToShelf,
  updateShelfEntry,
  removeFromShelf,
  exportShelfCsv,
} = require('../services/bookService');

// ════════════════════════════════════════════════════════════════════════════
//  M1 · 用户搜索（放在 /:id 之前，避免路由冲突）
// ════════════════════════════════════════════════════════════════════════════

// GET /api/v1/users/search?q=&page=&pageSize=
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, page = 1, pageSize = 20 } = req.query;
    if (!q || q.trim().length < 1) return res.fail('请输入搜索关键词', 400);
    if (q.trim().length > 50)      return res.fail('搜索关键词过长', 400);

    const result = await searchUsers(
      q.trim(),
      req.user?.id,
      parseInt(page),
      Math.min(parseInt(pageSize), 50)
    );
    res.paginate(result.list, result.total, parseInt(page), parseInt(pageSize));
  } catch (err) {
    res.fail(err.message || '搜索失败', err.status || 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  M1 · 当前用户信息
// ════════════════════════════════════════════════════════════════════════════

// GET /api/v1/users/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const profile = await getMyProfile(req.user.id);
    res.ok(profile);
  } catch (err) {
    res.fail(err.message || '获取用户信息失败', err.status || 500);
  }
});

// PUT /api/v1/users/me
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { username, bio, gender, city, coverImage, readingGoal, avatarUrl } = req.body;
    const result = await updateUser(req.user.id, {
      username,
      bio,
      gender,
      city,
      cover_image:  coverImage,
      reading_goal: readingGoal !== undefined ? parseInt(readingGoal) : undefined,
      avatar_url:   avatarUrl,
    });
    res.ok(result);
  } catch (err) {
    res.fail(err.message || '更新失败', err.status || 500);
  }
});

// PUT /api/v1/users/me/privacy
router.put('/me/privacy', authMiddleware, async (req, res) => {
  try {
    const result = await updatePrivacy(req.user.id, req.body);
    res.ok(result);
  } catch (err) {
    res.fail(err.message || '隐私设置更新失败', err.status || 500);
  }
});

// POST /api/v1/users/me/preferences
router.post('/me/preferences', authMiddleware, async (req, res) => {
  try {
    const { tagIds } = req.body;
    if (!tagIds) return res.fail('请提供 tagIds 数组', 400);
    const result = await saveReadingPreferences(req.user.id, tagIds);
    res.ok(result);
  } catch (err) {
    res.fail(err.message || '保存偏好失败', err.status || 400);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  M2 · 书架路由
//  ⚠ 必须在 /:id 动态路由之前声明，否则 "me" 会被当作用户 ID
//  ⚠ /me/shelf/export 必须在 /me/shelf/:bookId 之前声明
// ════════════════════════════════════════════════════════════════════════════

// GET /api/v1/users/me/shelf/export  ← 必须最先声明
router.get('/me/shelf/export', authMiddleware, async (req, res) => {
  try {
    const csv = await exportShelfCsv(req.user.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="my_shelf.csv"');
    res.send('\uFEFF' + csv); // UTF-8 BOM，保证 Excel 正确显示中文
  } catch (err) {
    console.error('[shelf/export]', err);
    res.fail('导出失败', 500);
  }
});

// GET /api/v1/users/me/shelf?status=1|2|3&page=1&group=
router.get('/me/shelf', authMiddleware, async (req, res) => {
  try {
    const { status, page = 1, group } = req.query;

    if (status !== undefined && ![1, 2, 3].includes(Number(status))) {
      return res.fail('status 必须为 1（想读）/ 2（在读）/ 3（已读）', 400);
    }

    const result = await getShelf(
      req.user.id,
      status ? Number(status) : null,
      Number(page),
      group || null
    );
    res.paginate(result.list, result.total, Number(page), 20);
  } catch (err) {
    console.error('[shelf GET]', err);
    res.fail('获取书架失败', 500);
  }
});

// POST /api/v1/users/me/shelf  { bookId, status, shelfGroup }
router.post('/me/shelf', authMiddleware, async (req, res) => {
  try {
    const { bookId, status, shelfGroup } = req.body;
    if (!bookId)                                return res.fail('bookId 为必填', 400);
    if (![1, 2, 3].includes(Number(status)))    return res.fail('status 必须为 1/2/3', 400);

    const entry = await addToShelf(
      req.user.id,
      Number(bookId),
      Number(status),
      shelfGroup || null
    );
    res.created(entry);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.fail('该书已在书架中', 409);
    console.error('[shelf POST]', err);
    res.fail('添加书架失败', 500);
  }
});

// PUT /api/v1/users/me/shelf/:bookId
router.put('/me/shelf/:bookId', authMiddleware, async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    if (isNaN(bookId) || bookId <= 0) return res.fail('bookId 格式错误', 400);

    if (req.body.status !== undefined && ![1, 2, 3].includes(Number(req.body.status))) {
      return res.fail('status 必须为 1/2/3', 400);
    }
    if (req.body.rating !== undefined) {
      const r = Number(req.body.rating);
      if (r < 1 || r > 10) return res.fail('rating 范围 1-10', 400);
    }

    const entry = await updateShelfEntry(req.user.id, bookId, req.body);
    if (!entry) return res.notFound('书架记录不存在');
    res.ok(entry);
  } catch (err) {
    console.error('[shelf PUT]', err);
    res.fail('更新书架失败', 500);
  }
});

// DELETE /api/v1/users/me/shelf/:bookId
router.delete('/me/shelf/:bookId', authMiddleware, async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    if (isNaN(bookId) || bookId <= 0) return res.fail('bookId 格式错误', 400);

    const deleted = await removeFromShelf(req.user.id, bookId);
    if (!deleted) return res.notFound('书架记录不存在');
    res.ok({ message: '已从书架移除' });
  } catch (err) {
    console.error('[shelf DELETE]', err);
    res.fail('移除失败', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  M1 · 动态参数路由（/:id 相关，必须在所有精确路径之后）
// ════════════════════════════════════════════════════════════════════════════

// GET /api/v1/users/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (isNaN(targetId) || targetId <= 0) return res.fail('无效的用户 ID', 400);

    const profile = await getUserById(targetId, req.user?.id);
    res.ok(profile);
  } catch (err) {
    res.fail(err.message || '获取用户信息失败', err.status || 500);
  }
});

module.exports = router;