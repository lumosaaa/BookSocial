'use strict';

const express = require('express');
const router  = express.Router();
const { authMiddleware, optionalAuth } = require('../common/authMiddleware');
const noteService = require('../services/noteService');
const likeService = require('../services/likeService');

// POST /api/v1/reading-notes
router.post('/', authMiddleware, async (req, res) => {
  try {
    const note = await noteService.createNote(req.user.id, req.body);
    res.created(note);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// PUT /api/v1/reading-notes/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const note = await noteService.updateNote(+req.params.id, req.user.id, req.body);
    res.ok(note);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// DELETE /api/v1/reading-notes/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await noteService.deleteNote(+req.params.id, req.user.id);
    res.ok(null);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// GET /api/v1/reading-notes/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const note = await noteService.getNoteById(+req.params.id, req.user?.id || null);
    if (!note) return res.notFound('笔记不存在');
    res.ok(note);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// 点赞笔记  POST /api/v1/reading-notes/:id/likes
router.post('/:id/likes', authMiddleware, async (req, res) => {
  try {
    const result = await likeService.toggleLike(req.user.id, +req.params.id, 3);
    res.ok(result);
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

// GET /api/v1/books/:bookId/notes  → 由 books.js 路由注册，此处导出辅助函数
// GET /api/v1/users/:userId/notes  → 由 follows.js 路由注册

module.exports = router;
