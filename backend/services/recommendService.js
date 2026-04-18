/**
 * recommendService.js — M6 · 推荐算法服务
 * 算法：User-CF (Jaccard相似度) + Tag-Based + 热门榜 + 冷启动
 */

const db    = require('../common/db');
const redis = require('../common/redis');

// ── TTL 常量 ───────────────────────────────────────────────────
const TTL = {
  REC_BOOKS:   86400,  // 24h
  REC_FRIENDS: 21600,  // 6h
  HOT_BOOKS:   3600,   // 1h
};

// ══════════════════════════════════════════════════════════════
// 一、书籍推荐
// ══════════════════════════════════════════════════════════════

/**
 * 获取为用户推荐的书籍列表（先查 Redis，未命中则实时计算）
 * @param {number} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getRecommendedBooks(userId, limit = 20, offset = 0) {
  const cacheKey = `rec:books:${userId}`;

  // 1. 命中缓存直接返回
  const cached = await redis.get(cacheKey);
  if (cached) {
    const ids = Array.isArray(cached) ? cached : JSON.parse(cached);
    return fetchBooksDetail(ids.slice(offset, offset + limit));
  }

  // 2. 实时计算（User-CF + Tag-Based 混合）
  const bookIds = await computeBookRecommendations(userId, Math.max(40, offset + limit + 16));

  // 3. 写 Redis 缓存
  if (bookIds.length > 0) {
    await redis.set(cacheKey, JSON.stringify(bookIds), TTL.REC_BOOKS);
  }

  return fetchBooksDetail(bookIds.slice(offset, offset + limit));
}

/**
 * 实时计算书籍推荐（User-CF 为主，Tag-Based 为辅，冷启动兜底）
 */
async function computeBookRecommendations(userId, limit) {
  // Step 1: 获取已在书架的书籍 ID（排除）
  const [shelfRows] = await db.query(
    'SELECT book_id FROM user_shelves WHERE user_id = ?',
    [userId]
  );
  const shelfIds = shelfRows.map(r => r.book_id);

  // Step 2: User-CF —— 找相似书友的书籍
  let cfBookIds = [];
  if (shelfIds.length >= 3) {
    const [cfRows] = await db.query(
      `SELECT us2.book_id, COUNT(*) AS common_score
       FROM user_shelves us1
       JOIN user_shelves us2
         ON us1.book_id = us2.book_id AND us2.user_id != ?
       WHERE us1.user_id = ?
         AND us2.book_id NOT IN (${shelfIds.map(() => '?').join(',')})
         AND us2.status IN (2, 3)
       GROUP BY us2.book_id
       ORDER BY common_score DESC
       LIMIT ?`,
      [userId, userId, ...shelfIds, limit]
    );
    cfBookIds = cfRows.map(r => r.book_id);
  }

  // Step 3: Category-Based —— 找与用户偏好分类相关的书籍
  const [prefRows] = await db.query(
    `SELECT category_id FROM user_reading_preferences WHERE user_id = ? LIMIT 10`,
    [userId]
  );
  let tagBookIds = [];
  if (prefRows.length > 0) {
    const catIds = prefRows.map(r => r.category_id);
    const exclude = [...shelfIds, ...cfBookIds];
    const [tagRows] = await db.query(
      `SELECT b.id AS book_id, b.shelf_count AS tag_score
       FROM books b
       WHERE b.category_id IN (${catIds.map(() => '?').join(',')})
         AND b.is_active = 1
         ${exclude.length > 0 ? `AND b.id NOT IN (${exclude.map(() => '?').join(',')})` : ''}
       ORDER BY tag_score DESC
       LIMIT ?`,
      [...catIds, ...exclude, limit]
    );
    tagBookIds = tagRows.map(r => r.book_id);
  }

  // Step 4: 合并去重
  const merged = [...new Set([...cfBookIds, ...tagBookIds])];

  // Step 5: 冷启动兜底（书架数量少时，补充热门书籍）
  if (merged.length < 10) {
    const hotIds = await getHotBookIds(20);
    for (const id of hotIds) {
      if (!shelfIds.includes(id) && !merged.includes(id)) {
        merged.push(id);
      }
      if (merged.length >= limit) break;
    }
  }

  return merged.slice(0, limit);
}

/**
 * 获取热门书籍 IDs
 */
async function getHotBookIds(limit = 20) {
  const [rows] = await db.query(
    `SELECT b.id,
            (COUNT(DISTINCT s.id) * 2 + COUNT(DISTINCT p.id)) AS hot_score
     FROM books b
     LEFT JOIN user_shelves s ON s.book_id = b.id
       AND s.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     LEFT JOIN posts p ON p.book_id = b.id AND p.post_type = 1
       AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       AND p.is_deleted = 0 AND p.audit_status = 1
     WHERE b.is_active = 1
     GROUP BY b.id
     ORDER BY hot_score DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map(r => r.id);
}

/**
 * 获取书籍详情数组（用于返回给前端）
 */
async function fetchBooksDetail(ids) {
  if (!ids || ids.length === 0) return [];
  const [rows] = await db.query(
    `SELECT b.id, b.title, b.author, b.cover_url AS coverUrl,
            b.platform_rating AS platformRating, b.shelf_count AS shelfCount,
            bc.name AS categoryName
     FROM books b
     LEFT JOIN book_categories bc ON bc.id = b.category_id
     WHERE b.id IN (${ids.map(() => '?').join(',')}) AND b.is_active = 1`,
    ids
  );
  // 保持推荐顺序
  const map = {};
  rows.forEach(r => { map[r.id] = r; });
  return ids.map(id => map[id]).filter(Boolean);
}

// ══════════════════════════════════════════════════════════════
// 二、书友推荐
// ══════════════════════════════════════════════════════════════

/**
 * 获取推荐书友列表（先查 Redis，未命中则实时计算）
 * @param {number} userId
 * @param {number} limit
 */
async function getRecommendedFriends(userId, limit = 10, offset = 0) {
  const cacheKey = `rec:friends:${userId}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    const ids = Array.isArray(cached) ? cached : JSON.parse(cached);
    return fetchUsersDetail(ids.slice(offset, offset + limit), userId);
  }

  const userIds = await computeFriendRecommendations(userId, Math.max(30, offset + limit + 8));

  if (userIds.length > 0) {
    await redis.set(cacheKey, JSON.stringify(userIds), TTL.REC_FRIENDS);
  }

  return fetchUsersDetail(userIds.slice(offset, offset + limit), userId);
}

/**
 * Jaccard 相似度计算书友推荐
 */
async function computeFriendRecommendations(userId, limit) {
  // 已关注的人排除
  const [followingRows] = await db.query(
    'SELECT following_id FROM user_follows WHERE follower_id = ?',
    [userId]
  );
  const followingIds = [userId, ...followingRows.map(r => r.following_id)];

  // Jaccard 相似度（SQL 简化版）
  const [rows] = await db.query(
    `SELECT
       us2.user_id,
       COUNT(*) AS common_books,
       COUNT(*) / (
         (SELECT COUNT(*) FROM user_shelves WHERE user_id = ?) +
         (SELECT COUNT(*) FROM user_shelves WHERE user_id = us2.user_id) -
         COUNT(*)
       ) AS jaccard_score
     FROM user_shelves us1
     JOIN user_shelves us2
       ON us1.book_id = us2.book_id
      AND us2.user_id NOT IN (${followingIds.map(() => '?').join(',')})
     WHERE us1.user_id = ?
       AND us2.status IN (2, 3)
     GROUP BY us2.user_id
     HAVING common_books >= 2
     ORDER BY jaccard_score DESC, common_books DESC
     LIMIT ?`,
    [userId, ...followingIds, userId, limit]
  );

  // 过滤 show_in_discovery = 0 的用户
  if (rows.length === 0) return [];
  const candidateIds = rows.map(r => r.user_id);
  const [privacyRows] = await db.query(
    `SELECT user_id FROM user_privacy_settings
     WHERE user_id IN (${candidateIds.map(() => '?').join(',')}) AND show_in_discovery = 0`,
    candidateIds
  );
  const hiddenSet = new Set(privacyRows.map(r => r.user_id));
  return candidateIds.filter(id => !hiddenSet.has(id));
}

/**
 * 获取用户详情数组
 */
async function fetchUsersDetail(ids, currentUserId) {
  if (!ids || ids.length === 0) return [];
  const [rows] = await db.query(
    `SELECT u.id, u.username, u.avatar_url AS avatarUrl, u.bio, u.follower_count AS followerCount,
            u.book_count AS bookCount,
            IF(uf.id IS NOT NULL, 1, 0) AS isFollowing
     FROM users u
     LEFT JOIN user_follows uf ON uf.follower_id = ? AND uf.following_id = u.id
     WHERE u.id IN (${ids.map(() => '?').join(',')}) AND u.status = 1`,
    [currentUserId, ...ids]
  );
  const map = {};
  rows.forEach(r => { map[r.id] = r; });
  return ids.map(id => map[id]).filter(Boolean);
}

// ══════════════════════════════════════════════════════════════
// 三、热门书籍榜
// ══════════════════════════════════════════════════════════════

/**
 * 获取热门书籍榜（先查 Redis）
 * @param {number} limit
 */
async function getHotBooks(limit = 20, offset = 0) {
  const cacheKey = 'hot:books';

  const cached = await redis.get(cacheKey);
  if (cached) {
    const books = Array.isArray(cached) ? cached : JSON.parse(cached);
    return books.slice(offset, offset + limit);
  }

  const books = await computeHotBooks(Math.max(limit + offset, 24));

  if (books.length > 0) {
    await redis.set(cacheKey, JSON.stringify(books), TTL.HOT_BOOKS);
  }

  return books.slice(offset, offset + limit);
}

/**
 * 计算热门书籍榜
 */
async function computeHotBooks(limit) {
  const [rows] = await db.query(
    `SELECT b.id, b.title, b.author, b.cover_url AS coverUrl,
            b.platform_rating AS platformRating,
            b.shelf_count AS shelfCount,
            COUNT(DISTINCT s.id) AS shelfAdds,
            COUNT(DISTINCT p.id) AS newReviews,
            (COUNT(DISTINCT s.id) * 2 + COUNT(DISTINCT p.id)) AS hotScore,
            bc.name AS categoryName
     FROM books b
     LEFT JOIN book_categories bc ON bc.id = b.category_id
     LEFT JOIN user_shelves s ON s.book_id = b.id
       AND s.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     LEFT JOIN posts p ON p.book_id = b.id AND p.post_type = 1
       AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       AND p.is_deleted = 0 AND p.audit_status = 1
     WHERE b.is_active = 1
     GROUP BY b.id
     ORDER BY hotScore DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

// ══════════════════════════════════════════════════════════════
// 四、用户兴趣画像
// ══════════════════════════════════════════════════════════════

/**
 * 获取用户兴趣画像数据（用于雷达图 / 标签云）
 * @param {number} userId
 */
async function getUserInterestProfile(userId) {
  // 阅读分类分布（雷达图数据）
  const [categoryRows] = await db.query(
    `SELECT bc.name AS category, COUNT(*) AS count
     FROM user_shelves us
     JOIN books b ON b.id = us.book_id
     JOIN book_categories bc ON bc.id = b.category_id
     WHERE us.user_id = ? AND us.status IN (2, 3)
     GROUP BY bc.id
     ORDER BY count DESC
     LIMIT 8`,
    [userId]
  );

  // 偏好标签（标签云）
  const [tagRows] = await db.query(
    `SELECT t.name, t.usage_count AS count
     FROM user_reading_preferences urp
     JOIN tags t ON t.id = urp.tag_id
     WHERE urp.user_id = ?
     ORDER BY t.usage_count DESC`,
    [userId]
  );

  // 阅读活跃度（近30天加入书架次数，用于简单热力图）
  const [activityRows] = await db.query(
    `SELECT DATE(created_at) AS date, COUNT(*) AS count
     FROM user_shelves
     WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [userId]
  );

  // 评分分布
  const [ratingRows] = await db.query(
    `SELECT rating, COUNT(*) AS count
     FROM user_shelves
     WHERE user_id = ? AND rating IS NOT NULL
     GROUP BY rating
     ORDER BY rating ASC`,
    [userId]
  );

  return {
    categories: categoryRows,
    tags:        tagRows,
    activity:    activityRows,
    ratings:     ratingRows,
  };
}

// ══════════════════════════════════════════════════════════════
// 五、行为日志
// ══════════════════════════════════════════════════════════════

/**
 * 写入用户行为日志（异步，失败不阻断主流程）
 * action_type: 1-浏览书籍 2-加书架 3-评分 4-写书评 5-点赞 6-搜索 7-点击用户
 * target_type: 1-书籍 2-用户 3-帖子 4-小组
 */
async function logBehavior({ userId, actionType, targetId, targetType, extraData = null }) {
  try {
    await db.query(
      `INSERT INTO user_behavior_logs (user_id, action_type, target_id, target_type, extra_data)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, actionType, targetId, targetType, extraData ? JSON.stringify(extraData) : null]
    );
  } catch (err) {
    console.error('[M6] 行为日志写入失败:', err.message);
  }
}

// ══════════════════════════════════════════════════════════════
// 六、推荐反馈
// ══════════════════════════════════════════════════════════════

/**
 * 处理用户对推荐的反馈（忽略某本书/某书友）
 * 目前策略：负反馈书籍从缓存中删除，强制下次重算
 */
async function handleFeedback({ userId, targetId, targetType, action }) {
  if (action === 'dislike') {
    if (targetType === 'book') {
      await redis.del(`rec:books:${userId}`);
    } else if (targetType === 'friend') {
      await redis.del(`rec:friends:${userId}`);
    }
  }
}

// ══════════════════════════════════════════════════════════════
// 七、离线批量计算（定时任务调用）
// ══════════════════════════════════════════════════════════════

/**
 * 全量计算活跃用户书籍推荐，写 recommendation_cache 表 + Redis
 */
async function batchComputeBookRecommendations() {
  console.log('[M6] 开始批量计算书籍推荐...');
  const [activeUsers] = await db.query(
    `SELECT DISTINCT user_id FROM user_shelves
     WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 500`
  );

  let count = 0;
  for (const { user_id } of activeUsers) {
    try {
      const bookIds = await computeBookRecommendations(user_id, 40);
      if (bookIds.length === 0) continue;

      // 写 Redis
      await redis.set(`rec:books:${user_id}`, JSON.stringify(bookIds), TTL.REC_BOOKS);

      // 写 DB（recommendation_cache）
      await db.query(
        `INSERT INTO recommendation_cache
           (user_id, rec_type, recommended_ids, algorithm, expires_at)
         VALUES (?, 1, ?, 'cf_user', DATE_ADD(NOW(), INTERVAL 24 HOUR))
         ON DUPLICATE KEY UPDATE
           recommended_ids = VALUES(recommended_ids),
           generated_at   = NOW(),
           expires_at     = DATE_ADD(NOW(), INTERVAL 24 HOUR)`,
        [user_id, JSON.stringify(bookIds)]
      );
      count++;
    } catch (err) {
      console.error(`[M6] 用户 ${user_id} 推荐计算失败:`, err.message);
    }
  }
  console.log(`[M6] 批量书籍推荐完成，共处理 ${count} 个用户`);
}

/**
 * 刷新热门书籍榜 Redis 缓存
 */
async function refreshHotBooks() {
  console.log('[M6] 刷新热门书籍榜...');
  const books = await computeHotBooks(20);
  await redis.set('hot:books', JSON.stringify(books), TTL.HOT_BOOKS);
  console.log('[M6] 热门书籍榜刷新完成');
}

module.exports = {
  getRecommendedBooks,
  getRecommendedFriends,
  getHotBooks,
  getUserInterestProfile,
  logBehavior,
  handleFeedback,
  batchComputeBookRecommendations,
  refreshHotBooks,
};
