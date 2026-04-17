/**
 * 模块2 · 书籍路由
 * GET  /api/v1/books/search?q=&page=&category=
 * GET  /api/v1/books/categories
 * GET  /api/v1/books/:id
 * GET  /api/v1/books/:id/reader
 * GET  /api/v1/books/:id/reader/chapters/:chapterId
 * PUT  /api/v1/books/:id/reader/progress
 * POST /api/v1/books/:id/reader/bookmarks
 * DELETE /api/v1/books/:id/reader/bookmarks/:bookmarkId
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

// ── 在线阅读概览 ───────────────────────────────────────────────────────────────
// GET /api/v1/books/:id/reader
router.get('/:id/reader', optionalAuth, async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    if (isNaN(bookId)) return res.fail('书籍ID格式错误', 400);

    const manifest = await bookService.getReaderManifest(bookId, req.user?.id);
    if (!manifest) return res.notFound('该书暂不支持在线阅读');
    res.ok(manifest);
  } catch (err) {
    console.error('[books/:id/reader]', err);
    res.fail('获取在线阅读信息失败', 500);
  }
});

// ── 在线阅读章节 ───────────────────────────────────────────────────────────────
// GET /api/v1/books/:id/reader/chapters/:chapterId
router.get('/:id/reader/chapters/:chapterId', optionalAuth, async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    const chapterId = Number(req.params.chapterId);
    if (isNaN(bookId) || isNaN(chapterId)) return res.fail('章节参数格式错误', 400);

    const chapter = await bookService.getReaderChapter(bookId, chapterId);
    if (!chapter) return res.notFound('章节不存在');
    res.ok(chapter);
  } catch (err) {
    console.error('[books/:id/reader/chapters/:chapterId]', err);
    res.fail('获取章节正文失败', 500);
  }
});

// ── 保存阅读进度 ───────────────────────────────────────────────────────────────
// PUT /api/v1/books/:id/reader/progress
router.put('/:id/reader/progress', authMiddleware, async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    const chapterId = Number(req.body.chapterId);
    const chapterProgress = Number(req.body.chapterProgress ?? 0);

    if (isNaN(bookId) || isNaN(chapterId)) return res.fail('进度参数格式错误', 400);
    if (Number.isNaN(chapterProgress) || chapterProgress < 0 || chapterProgress > 1) {
      return res.fail('章节进度必须在 0 到 1 之间', 400);
    }

    const progress = await bookService.saveReaderProgress(req.user.id, bookId, chapterId, chapterProgress);
    if (!progress) return res.notFound('该书暂不支持在线阅读或章节不存在');
    res.ok(progress);
  } catch (err) {
    console.error('[books/:id/reader/progress]', err);
    res.fail('保存阅读进度失败', 500);
  }
});

// ── 添加书签 ───────────────────────────────────────────────────────────────────
// POST /api/v1/books/:id/reader/bookmarks
router.post('/:id/reader/bookmarks', authMiddleware, async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    const chapterId = Number(req.body.chapterId);
    const chapterProgress = Number(req.body.chapterProgress ?? 0);
    const { quote, note } = req.body;

    if (isNaN(bookId) || isNaN(chapterId)) return res.fail('书签参数格式错误', 400);
    if (Number.isNaN(chapterProgress) || chapterProgress < 0 || chapterProgress > 1) {
      return res.fail('章节进度必须在 0 到 1 之间', 400);
    }

    const bookmark = await bookService.addReaderBookmark(req.user.id, bookId, {
      chapterId,
      chapterProgress,
      quote,
      note,
    });
    if (!bookmark) return res.notFound('该书暂不支持在线阅读或章节不存在');
    res.created(bookmark);
  } catch (err) {
    console.error('[books/:id/reader/bookmarks POST]', err);
    res.fail('添加书签失败', 500);
  }
});

// ── 删除书签 ───────────────────────────────────────────────────────────────────
// DELETE /api/v1/books/:id/reader/bookmarks/:bookmarkId
router.delete('/:id/reader/bookmarks/:bookmarkId', authMiddleware, async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    const bookmarkId = Number(req.params.bookmarkId);
    if (isNaN(bookId) || isNaN(bookmarkId)) return res.fail('书签参数格式错误', 400);

    const removed = await bookService.removeReaderBookmark(req.user.id, bookId, bookmarkId);
    if (!removed) return res.notFound('书签不存在');
    res.ok({ success: true });
  } catch (err) {
    console.error('[books/:id/reader/bookmarks DELETE]', err);
    res.fail('删除书签失败', 500);
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
