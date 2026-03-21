'use strict';

const db   = require('../common/db');
const axios = require('axios');

// target_type → 对应表及 like_count 字段
const TARGET_MAP = {
  1: { table: 'posts',         col: 'like_count' },
  2: { table: 'comments',      col: 'like_count' },
  3: { table: 'reading_notes', col: 'like_count' },
};

// 通知 type（仅动态和笔记通知作者，评论点赞不通知）
const NOTIFY_TYPE = { 1: 2, 3: 2 };

function triggerNotify(payload) {
  axios
    .post('http://localhost:3001/internal/notify', payload, { timeout: 3000 })
    .catch(err => console.error('[M3→M4] 通知触发失败:', err.message));
}

/**
 * 点赞 / 取消点赞 Toggle
 * @param {number} userId
 * @param {number} targetId
 * @param {number} targetType  1=动态 2=评论 3=阅读笔记
 * @returns {{ liked: boolean, likeCount: number }}
 */
async function toggleLike(userId, targetId, targetType) {
  const meta = TARGET_MAP[targetType];
  if (!meta) {
    const err = new Error('不支持的点赞类型');
    err.statusCode = 400;
    throw err;
  }

  // 验证目标存在
  const [[target]] = await db.query(
    `SELECT id, user_id FROM ${meta.table} WHERE id = ? AND is_deleted = 0`,
    [targetId]
  );
  if (!target) {
    const err = new Error('目标内容不存在');
    err.statusCode = 404;
    throw err;
  }

  const [[existing]] = await db.query(
    'SELECT id FROM likes WHERE user_id=? AND target_id=? AND target_type=?',
    [userId, targetId, targetType]
  );

  let liked;
  let likeCount;

  if (existing) {
    // 取消点赞
    await db.transaction(async (conn) => {
      await conn.query('DELETE FROM likes WHERE id=?', [existing.id]);
      await conn.query(
        `UPDATE ${meta.table} SET ${meta.col} = GREATEST(${meta.col}-1, 0) WHERE id=?`,
        [targetId]
      );
    });
    liked = false;
  } else {
    // 点赞
    await db.transaction(async (conn) => {
      await conn.query(
        'INSERT INTO likes (user_id, target_id, target_type) VALUES (?,?,?)',
        [userId, targetId, targetType]
      );
      await conn.query(
        `UPDATE ${meta.table} SET ${meta.col} = ${meta.col}+1 WHERE id=?`,
        [targetId]
      );
    });
    liked = true;

    // 异步通知被点赞者（排除自己给自己点赞）
    const notifyType = NOTIFY_TYPE[targetType];
    if (notifyType && target.user_id !== userId) {
      triggerNotify({
        userId:   target.user_id,
        type:     notifyType,
        actorId:  userId,
        targetId: targetId,
      });
    }
  }

  const [[updated]] = await db.query(
    `SELECT ${meta.col} AS likeCount FROM ${meta.table} WHERE id=?`,
    [targetId]
  );
  likeCount = updated.likeCount;

  return { liked, likeCount };
}

module.exports = { toggleLike };
