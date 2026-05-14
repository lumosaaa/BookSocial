const db = require('../common/db');

// ─────────────────────────────────────────────────────────────
//  内部工具
// ─────────────────────────────────────────────────────────────

/**
 * 检查 requesterId 是否关注了 targetId
 * @returns {{ isFollowing: boolean, isMutual: boolean }}
 */
async function getFollowRelation(requesterId, targetId) {
  if (!requesterId || requesterId === targetId) {
    return { isFollowing: false, isMutual: false };
  }
  const [rows] = await db.query(
    'SELECT is_mutual FROM user_follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
    [requesterId, targetId]
  );
  if (!rows.length) return { isFollowing: false, isMutual: false };
  return { isFollowing: true, isMutual: rows[0].is_mutual === 1 };
}

// ─────────────────────────────────────────────────────────────
//  读取用户信息
// ─────────────────────────────────────────────────────────────

/**
 * 获取指定用户公开信息（含隐私检查）
 */
async function getUserById(targetId, requesterId = null) {
  const [rows] = await db.query(
    `SELECT u.id, u.username, u.avatar_url, u.bio, u.gender, u.city,
            u.cover_image, u.reading_goal, u.book_count,
            u.follower_count, u.following_count, u.post_count,
            u.created_at,
            COALESCE(ups.profile_visible, 0) AS profile_visible
     FROM users u
     LEFT JOIN user_privacy_settings ups ON ups.user_id = u.id
     WHERE u.id = ? AND u.status != 2
     LIMIT 1`,
    [targetId]
  );
  if (!rows.length) throw { status: 404, message: '用户不存在' };

  const user = rows[0];

  // 隐私检查：0-所有人, 1-仅关注者, 2-仅自己
  if (user.profile_visible === 2 && requesterId !== targetId) {
    throw { status: 403, message: '该用户已设置主页为私密' };
  }
  if (user.profile_visible === 1 && requesterId !== targetId) {
    const [f] = await db.query(
      'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
      [requesterId, targetId]
    );
    if (!f.length) throw { status: 403, message: '仅关注者可查看该用户主页' };
  }

  const { isFollowing, isMutual } = await getFollowRelation(requesterId, targetId);

  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    gender: user.gender,
    city: user.city,
    coverImage: user.cover_image,
    readingGoal: user.reading_goal,
    bookCount: user.book_count,
    followerCount: user.follower_count,
    followingCount: user.following_count,
    postCount: user.post_count,
    createdAt: user.created_at,
    isFollowing,
    isMutual,
  };
}

/**
 * 获取当前用户完整信息（含隐私设置字段，自用）
 */
async function getMyProfile(userId) {
  const [rows] = await db.query(
    `SELECT u.id, u.username, u.email, u.avatar_url, u.bio, u.gender,
            u.city, u.cover_image, u.reading_goal, u.book_count,
            u.follower_count, u.following_count, u.post_count,
            u.status, u.role,
            u.created_at, u.updated_at,
            COALESCE(ups.profile_visible, 0)        AS profile_visible,
            COALESCE(ups.shelf_visible, 0)          AS shelf_visible,
            COALESCE(ups.notes_visible, 0)          AS notes_visible,
            COALESCE(ups.searchable, 1)             AS searchable,
            COALESCE(ups.message_permission, 0)     AS message_permission,
            COALESCE(ups.allow_recommendation, 1)   AS allow_recommendation,
            COALESCE(ups.show_in_discovery, 1)      AS show_in_discovery,
            COALESCE(ups.allow_behavior_analysis,1) AS allow_behavior_analysis
     FROM users u
     LEFT JOIN user_privacy_settings ups ON ups.user_id = u.id
     WHERE u.id = ? LIMIT 1`,
    [userId]
  );
  if (!rows.length) throw { status: 404, message: '用户不存在' };

  const u = rows[0];
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatarUrl: u.avatar_url,
    status: u.status,
    role: u.role || 'user',
    bio: u.bio,
    gender: u.gender,
    city: u.city,
    coverImage: u.cover_image,
    readingGoal: u.reading_goal,
    bookCount: u.book_count,
    followerCount: u.follower_count,
    followingCount: u.following_count,
    postCount: u.post_count,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
    privacy: {
      profileVisible: u.profile_visible,
      shelfVisible: u.shelf_visible,
      notesVisible: u.notes_visible,
      searchable: u.searchable,
      messagePermission: u.message_permission,
      allowRecommendation: u.allow_recommendation,
      showInDiscovery: u.show_in_discovery,
      allowBehaviorAnalysis: u.allow_behavior_analysis,
    },
  };
}

// ─────────────────────────────────────────────────────────────
//  更新用户信息
// ─────────────────────────────────────────────────────────────

async function updateUser(userId, fields) {
  // 允许更新的字段白名单
  const ALLOWED = [
    'username', 'bio', 'gender', 'city',
    'cover_image', 'reading_goal', 'avatar_url',
  ];
  const updates = {};
  for (const key of ALLOWED) {
    if (fields[key] !== undefined && fields[key] !== null) {
      updates[key] = fields[key];
    }
  }
  if (!Object.keys(updates).length) {
    throw { status: 400, message: '没有可更新的字段' };
  }

  // 昵称唯一性检查
  if (updates.username) {
    const [dup] = await db.query(
      'SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1',
      [updates.username, userId]
    );
    if (dup.length) throw { status: 409, message: '该昵称已被使用' };
  }

  const setClause = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
  const values = [...Object.values(updates), userId];
  await db.query(
    `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`,
    values
  );

  return getMyProfile(userId);
}

// ─────────────────────────────────────────────────────────────
//  更新隐私设置
// ─────────────────────────────────────────────────────────────

async function updatePrivacy(userId, settings) {
  // camelCase → snake_case 映射
  const fieldMap = {
    profileVisible:       'profile_visible',
    shelfVisible:         'shelf_visible',
    notesVisible:         'notes_visible',
    searchable:           'searchable',
    messagePermission:    'message_permission',
    allowRecommendation:  'allow_recommendation',
    showInDiscovery:      'show_in_discovery',
    allowBehaviorAnalysis:'allow_behavior_analysis',
  };

  const updates = {};
  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (settings[camel] !== undefined) {
      updates[snake] = settings[camel];
    }
  }

  if (!Object.keys(updates).length) {
    throw { status: 400, message: '没有可更新的隐私字段' };
  }

  const setClause = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
  const values = [...Object.values(updates), userId];

  // upsert：若不存在则先插入默认行
  await db.query(
    `INSERT INTO user_privacy_settings (user_id) VALUES (?)
     ON DUPLICATE KEY UPDATE user_id = user_id`,
    [userId]
  );
  await db.query(
    `UPDATE user_privacy_settings SET ${setClause}, updated_at = NOW()
     WHERE user_id = ?`,
    values
  );

  return { message: '隐私设置已更新' };
}

// ─────────────────────────────────────────────────────────────
//  阅读偏好（新手引导）
// ─────────────────────────────────────────────────────────────

async function saveReadingPreferences(userId, tagIds) {
  if (!Array.isArray(tagIds) || tagIds.length < 3) {
    throw { status: 400, message: '请至少选择 3 个阅读偏好标签' };
  }

  // 当前数据库 user_reading_preferences 关联的是 book_categories.category_id
  const validIds = [...new Set(tagIds.map(id => parseInt(id)).filter(id => !isNaN(id)))];
  if (validIds.length < 3) {
    throw { status: 400, message: '标签 ID 格式无效' };
  }

  const [categories] = await db.query(
    'SELECT id FROM book_categories WHERE id IN (?) AND is_active = 1',
    [validIds]
  );
  if (categories.length < 3) {
    throw { status: 400, message: '所选阅读偏好中存在无效分类' };
  }

  await db.transaction(async (conn) => {
    await conn.query(
      'DELETE FROM user_reading_preferences WHERE user_id = ?',
      [userId]
    );
    const rows = validIds.map(categoryId => [userId, categoryId]);
    await conn.query(
      'INSERT INTO user_reading_preferences (user_id, category_id) VALUES ?',
      [rows]
    );
  });

  return { message: '阅读偏好已保存', count: validIds.length };
}

// ─────────────────────────────────────────────────────────────
//  用户搜索
// ─────────────────────────────────────────────────────────────

async function searchUsers(keyword, requesterId = null, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const like = `%${keyword}%`;

  const [rows] = await db.query(
    `SELECT u.id, u.username, u.avatar_url, u.bio,
            u.follower_count, u.book_count,
            COALESCE(ups.searchable, 1) AS searchable
     FROM users u
     LEFT JOIN user_privacy_settings ups ON ups.user_id = u.id
     WHERE u.username LIKE ?
       AND u.status = 1
       AND COALESCE(ups.searchable, 1) = 1
     ORDER BY u.follower_count DESC
     LIMIT ? OFFSET ?`,
    [like, pageSize, offset]
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM users u
     LEFT JOIN user_privacy_settings ups ON ups.user_id = u.id
     WHERE u.username LIKE ?
       AND u.status = 1
       AND COALESCE(ups.searchable, 1) = 1`,
    [like]
  );

  return {
    list: rows.map(u => ({
      id: u.id,
      username: u.username,
      avatarUrl: u.avatar_url,
      bio: u.bio,
      followerCount: u.follower_count,
      bookCount: u.book_count,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasMore: offset + pageSize < total,
  };
}

module.exports = {
  getUserById,
  getMyProfile,
  updateUser,
  updatePrivacy,
  saveReadingPreferences,
  searchUsers,
};
