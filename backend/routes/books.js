/**
 * 模块2 · 书籍路由
 * GET  /api/v1/books/search?q=&page=&category=
 * GET  /api/v1/books/categories
 * GET  /api/v1/books/:id
 * GET  /api/v1/books/:id/tags
 * POST /api/v1/books/:id/tags
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuth } = require('../common/authMiddleware');
const bookService = require('../services/bookService');

// ── 书籍浏览（首页） ─────────────────────────────────────────────────────────
// GET /api/v1/books?page=1&category=
router.get('/', async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page) || 1);
    const category = req.query.category ? Number(req.query.category) : null;
    const result   = await bookService.browseBooks(page, category);
    res.paginate(result.list, result.total, page, 20);
  } catch (err) {
    console.error('[books browse]', err);
    res.fail('获取书籍列表失败', 500);
  }
});

// ── 书籍搜索 ─────────────────────────────────────────────────────────────────
// GET /api/v1/books/search?q=&page=1&category=
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q = '', page = 1, category } = req.query;
    if (!q.trim()) return res.fail('搜索关键词不能为空', 400);

    const result = await bookService.searchBooks(
      q.trim(),
      Number(page),
      category ? Number(category) : null
    );
    res.paginate(result.list, result.total, Number(page), 20);
  } catch (err) {
    console.error('[books/search]', err);
    res.fail('搜索失败', 500);
  }
});

// ── 书籍分类 ─────────────────────────────────────────────────────────────────
// GET /api/v1/books/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await bookService.getCategories();
    res.ok(categories);
  } catch (err) {
    console.error('[books/categories]', err);
    res.fail('获取分类失败', 500);
  }
});

// ── 书籍详情 ─────────────────────────────────────────────────────────────────
// GET /api/v1/books/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    if (isNaN(bookId)) return res.fail('书籍ID格式错误', 400);

    const book = await bookService.getBookById(bookId, req.user?.id);
    if (!book) return res.notFound('书籍不存在');
    res.ok(book);
  } catch (err) {
    console.error('[books/:id]', err);
    res.fail('获取书籍失败', 500);
  }
});

// ── 书籍标签列表 ──────────────────────────────────────────────────────────────
// GET /api/v1/books/:id/tags
router.get('/:id/tags', async (req, res) => {
  try {
    const tags = await bookService.getBookTags(Number(req.params.id));
    res.ok(tags);
  } catch (err) {
    res.fail('获取标签失败', 500);
  }
});

// ── 添加书籍标签 ──────────────────────────────────────────────────────────────
// POST /api/v1/books/:id/tags  { tagName }
router.post('/:id/tags', authMiddleware, async (req, res) => {
  try {
    const { tagName } = req.body;
    if (!tagName?.trim()) return res.fail('标签名不能为空', 400);
    if (tagName.trim().length > 20) return res.fail('标签名最多20个字符', 400);

    const tag = await bookService.addBookTag(
      Number(req.params.id),
      tagName.trim(),
      req.user.id
    );
    res.created(tag);
  } catch (err) {
    console.error('[books/:id/tags POST]', err);
    res.fail('添加标签失败', 500);
  }
});

module.exports = router;
