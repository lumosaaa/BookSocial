'use strict';

const db   = require('../common/db');
const axios = require('axios');

function triggerNotify(payload) {
  axios
    .post('http://localhost:3001/internal/notify', payload, { timeout: 3000 })
    .catch(err => console.error('[M3→M4] 通知触发失败:', err.message));
}

/**
 * 关注 / 取关 Toggle
 * @returns {{ followed: boolean, isMutual: boolean, followerCount: number }}
 */
async function toggleFollow(followerId, followingId) {
  if (followerId === followingId) {
    const err = new Error('不能关注自己');
    err.statusCode = 400;
    throw err;
  }

  // 确认目标用户存在
  const [[target]] = await db.query(
    'SELECT id FROM users WHERE id=? AND status=1',
    [followingId]
  );
  if (!target) {
    const err = new Error('用户不存在');
    err.statusCode = 404;
    throw err;
  }

  const [[existing]] = await db.query(
    'SELECT id FROM user_follows WHERE follower_id=? AND following_id=?',
    [followerId, followingId]
  );

  let followed;
  let isMutual = false;

  if (existing) {
    // 取关
    await db.transaction(async (conn) => {
      await conn.query('DELETE FROM user_follows WHERE id=?', [existing.id]);
      // 清除对方记录中的互关标记
      await conn.query(
        'UPDATE user_follows SET is_mutual=0 WHERE follower_id=? AND following_id=?',
        [followingId, followerId]
      );
      await conn.query(
        'UPDATE users SET following_count = GREATEST(following_count-1,0) WHERE id=?',
        [followerId]
      );
      await conn.query(
        'UPDATE users SET follower_count = GREATEST(follower_count-1,0) WHERE id=?',
        [followingId]
      );
    });
    followed = false;
  } else {
    // 关注
    await db.transaction(async (conn) => {
      await conn.query(
        'INSERT INTO user_follows (follower_id, following_id, is_mutual) VALUES (?,?,0)',
        [followerId, followingId]
      );
      // 检查是否互关
      const [[reverse]] = await conn.query(
        'SELECT id FROM user_follows WHERE follower_id=? AND following_id=?',
        [followingId, followerId]
      );
      if (reverse) {
        await conn.query(
          'UPDATE user_follows SET is_mutual=1 WHERE (follower_id=? AND following_id=?) OR (follower_id=? AND following_id=?)',
          [followerId, followingId, followingId, followerId]
        );
        isMutual = true;
      }
      await conn.query(
        'UPDATE users SET following_count = following_count+1 WHERE id=?',
        [followerId]
      );
      await conn.query(
        'UPDATE users SET follower_count = follower_count+1 WHERE id=?',
        [followingId]
      );
    });
    followed = true;

    // 异步通知被关注者
    triggerNotify({
      userId:  followingId,
      type:    1,
      actorId: followerId,
    });
  }

  const [[{ followerCount }]] = await db.query(
    'SELECT follower_count AS followerCount FROM users WHERE id=?',
    [followingId]
  );

  return { followed, isMutual, followerCount };
}

/**
 * 获取粉丝列表
 */
async function getFollowers(userId, viewerId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const [rows] = await db.query(
    `SELECT u.id, u.username, u.avatar_url AS avatarUrl, u.bio,
            u.follower_count AS followerCount, u.following_count AS followingCount
     FROM user_follows f
     JOIN users u ON u.id = f.follower_id
     WHERE f.following_id=?
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM user_follows WHERE following_id=?',
    [userId]
  );

  // 附加当前用户是否关注这些粉丝
  const list = rows;
  if (viewerId && list.length) {
    const ids = list.map(u => u.id);
    const [followed] = await db.query(
      'SELECT following_id FROM user_follows WHERE follower_id=? AND following_id IN (?)',
      [viewerId, ids]
    );
    const followedSet = new Set(followed.map(r => r.following_id));
    list.forEach(u => { u.isFollowed = followedSet.has(u.id); });
  }

  return { list, total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasMore: page * pageSize < total };
}

/**
 * 获取关注列表
 */
async function getFollowing(userId, viewerId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const [rows] = await db.query(
    `SELECT u.id, u.username, u.avatar_url AS avatarUrl, u.bio,
            u.follower_count AS followerCount, u.following_count AS followingCount,
            f.is_mutual AS isMutual
     FROM user_follows f
     JOIN users u ON u.id = f.following_id
     WHERE f.follower_id=?
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM user_follows WHERE follower_id=?',
    [userId]
  );

  return { list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasMore: page * pageSize < total };
}

module.exports = { toggleFollow, getFollowers, getFollowing };
