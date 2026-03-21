'use strict';

const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../common/authMiddleware');
const db = require('../common/db');

const VALID_TARGET_TYPES = [1, 2, 3, 4, 5]; // 1=帖子 2=评论 3=笔记 4=用户 5=小组帖子
const VALID_REASONS      = [1, 2, 3, 4, 5, 6];
// 1=违禁信息 2=色情低俗 3=侵权 4=广告骚扰 5=人身攻击 6=其他

// POST /api/v1/reports
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { targetId, targetType, reason, detail = '' } = req.body;
    const userId = req.user.id;

    if (!targetId || !VALID_TARGET_TYPES.includes(+targetType)) {
      return res.fail('举报目标参数错误', 400);
    }
    if (!VALID_REASONS.includes(+reason)) {
      return res.fail('举报原因参数错误', 400);
    }

    // 防止重复举报（同用户对同目标）
    const [[existing]] = await db.query(
      'SELECT id FROM reports WHERE reporter_id=? AND target_id=? AND target_type=? AND status=0',
      [userId, targetId, targetType]
    );
    if (existing) return res.fail('您已举报过该内容，请等待处理', 409);

    await db.query(
      `INSERT INTO reports (reporter_id, target_id, target_type, reason, detail)
       VALUES (?,?,?,?,?)`,
      [userId, targetId, targetType, reason, detail.slice(0, 500)]
    );

    res.created({ message: '举报已提交，我们将尽快处理' });
  } catch (err) {
    res.fail(err.message, err.statusCode || 500);
  }
});

module.exports = router;
