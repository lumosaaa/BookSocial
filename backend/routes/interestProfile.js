/**
 * routes/interestProfile.js — M6 · 用户兴趣画像路由
 * 挂载路径：app.use('/api/v1/users', interestProfileRouter)
 */

const express          = require('express');
const router           = express.Router();
const { optionalAuth } = require('../common/authMiddleware');
const db               = require('../common/db');
const recommendService = require('../services/recommendService');

// GET /api/v1/users/:id/interest-profile — 用户兴趣画像
router.get('/:id/interest-profile', optionalAuth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (!targetId || isNaN(targetId)) return res.fail('用户ID无效', 400);

    // 隐私检查：profile_visible = 2（仅自己）时，其他人不可查看
    if (!req.user || req.user.id !== targetId) {
      const [privRows] = await db.query(
        'SELECT profile_visible FROM user_privacy_settings WHERE user_id = ?',
        [targetId]
      );
      if (privRows[0]?.profile_visible === 2) {
        return res.fail('该用户已开启隐私保护', 403);
      }
    }

    const profile = await recommendService.getUserInterestProfile(targetId);
    res.ok(profile);
  } catch (err) {
    console.error('[M6] /interest-profile 错误:', err);
    res.fail('获取兴趣画像失败', 500);
  }
});

module.exports = router;
