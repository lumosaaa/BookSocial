/**
 * 模块2 · 书架路由
 * 挂载于 /api/v1/users（与 M1 users.js 共同挂载）
 *
 * GET    /api/v1/users/me/shelf?status=&page=&group=
 * POST   /api/v1/users/me/shelf
 * PUT    /api/v1/users/me/shelf/:bookId
 * DELETE /api/v1/users/me/shelf/:bookId
 * GET    /api/v1/users/me/shelf/export
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../common/authMiddleware');
const bookService = require('../services/bookService');

// ── 获取书架列表 ───────────────────────────────────────────────────────────────
// GET /api/v1/users/me/shelf?status=1|2|3&page=1&group=
router.get('/me/shelf/export', authMiddleware, async (req, res) => {
  // export 路由必须在 /me/shelf/:bookId 之前声明，避免被 :bookId 匹配
  try {
    const csv = await bookService.exportShelfCsv(req.user.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="my_shelf.csv"');
    res.send('\uFEFF' + csv); // UTF-8 BOM，Excel 正确显示中文
  } catch (err) {
    console.error('[shelf/export]', err);
    res.fail('导出失败', 500);
  }
});

router.get('/me/shelf', authMiddleware, async (req, res) => {
  try {
    const { status, page = 1, group } = req.query;
    const result = await bookService.getShelf(
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

// ── 添加到书架 ────────────────────────────────────────────────────────────────
// POST /api/v1/users/me/shelf  { bookId, status, shelfGroup }
router.post('/me/shelf', authMiddleware, async (req, res) => {
  try {
    const { bookId, status, shelfGroup } = req.body;
    if (!bookId) return res.fail('bookId 为必填', 400);
    if (![1, 2, 3].includes(Number(status))) return res.fail('status 必须为 1/2/3', 400);

    const entry = await bookService.addToShelf(
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

// ── 更新书架记录 ───────────────────────────────────────────────────────────────
// PUT /api/v1/users/me/shelf/:bookId
router.put('/me/shelf/:bookId', authMiddleware, async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    if (isNaN(bookId)) return res.fail('bookId 格式错误', 400);

    // 校验 rating 范围
    if (req.body.rating !== undefined) {
      const r = Number(req.body.rating);
      if (r < 1 || r > 10) return res.fail('rating 必须在 1-10 之间', 400);
    }

    const entry = await bookService.updateShelfEntry(req.user.id, bookId, req.body);
    if (!entry) return res.notFound('书架记录不存在');
    res.ok(entry);
  } catch (err) {
    console.error('[shelf PUT]', err);
    res.fail('更新书架失败', 500);
  }
});

// ── 从书架移除 ────────────────────────────────────────────────────────────────
// DELETE /api/v1/users/me/shelf/:bookId
router.delete('/me/shelf/:bookId', authMiddleware, async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    const deleted = await bookService.removeFromShelf(req.user.id, bookId);
    if (!deleted) return res.notFound('书架记录不存在');
    res.ok({ message: '已从书架移除' });
  } catch (err) {
    console.error('[shelf DELETE]', err);
    res.fail('移除失败', 500);
  }
});

module.exports = router;
