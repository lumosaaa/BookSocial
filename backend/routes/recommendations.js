/**
 * routes/recommendations.js — M6 · 推荐系统路由
 */

const express = require('express');
const router  = express.Router();

const { authMiddleware, optionalAuth } = require('../common/authMiddleware');
const recommendService = require('../services/recommendService');

// GET /api/v1/recommendations/books — 推荐书籍（走 Redis 缓存）
router.get('/books', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const limit  = Math.min(parseInt(req.query.limit) || 20, 40);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    let books;
    if (userId) {
      books = await recommendService.getRecommendedBooks(userId, limit, offset);
    } else {
      // 未登录：返回热门榜
      books = await recommendService.getHotBooks(limit, offset);
    }

    res.ok(books);
  } catch (err) {
    console.error('[M6] /recommendations/books 错误:', err);
    res.fail('获取推荐书籍失败', 500);
  }
});

// GET /api/v1/recommendations/friends — 推荐书友（走 Redis 缓存）
router.get('/friends', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit  = Math.min(parseInt(req.query.limit) || 10, 20);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    const friends = await recommendService.getRecommendedFriends(userId, limit, offset);
    res.ok(friends);
  } catch (err) {
    console.error('[M6] /recommendations/friends 错误:', err);
    res.fail('获取推荐书友失败', 500);
  }
});

// GET /api/v1/recommendations/hot — 热门书籍榜（Redis 缓存 1h）
router.get('/hot', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const books = await recommendService.getHotBooks(limit, offset);
    res.ok(books);
  } catch (err) {
    console.error('[M6] /recommendations/hot 错误:', err);
    res.fail('获取热门书籍失败', 500);
  }
});

// POST /api/v1/recommendations/feedback — 用户对推荐的反馈（忽略/不感兴趣）
router.post('/feedback', authMiddleware, async (req, res) => {
  try {
    const { targetId, targetType, action } = req.body;
    if (!targetId || !targetType || !action) {
      return res.fail('参数不完整', 400);
    }
    await recommendService.handleFeedback({
      userId: req.user.id,
      targetId,
      targetType,
      action,
    });
    res.ok({ message: '反馈已记录' });
  } catch (err) {
    console.error('[M6] /recommendations/feedback 错误:', err);
    res.fail('反馈提交失败', 500);
  }
});

// POST /api/v1/behavior-logs — 行为日志上报（前端直接上报）
router.post('/behavior-logs', optionalAuth, async (req, res) => {
  try {
    if (!req.user) return res.ok(null); // 未登录不记录
    const { actionType, targetId, targetType, extraData } = req.body;
    if (!actionType || !targetId || !targetType) return res.ok(null);

    await recommendService.logBehavior({
      userId:     req.user.id,
      actionType,
      targetId,
      targetType,
      extraData,
    });
    res.ok(null);
  } catch (err) {
    // 行为日志失败不影响主流程，静默处理
    res.ok(null);
  }
});

module.exports = router;
