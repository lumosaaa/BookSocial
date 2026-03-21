'use strict';

const db    = require('../common/db');
const redis = require('../common/redis');
const axios = require('axios');

// ─── 内部工具 ────────────────────────────────────────────────

/**
 * 同步调用 M6 违禁词审核
 * @returns {{ pass: boolean, keywords: string[] }}
 */
async function auditContent(content) {
  try {
    const { data } = await axios.post(
      'http://localhost:3001/internal/audit/text',
      { content },
      { timeout: 3000 }
    );
    return data.data;
  } catch (err) {
    // 审核服务不可用时，默认放行（降级策略，可按需改为拦截）
    console.error('[M3→M6] 违禁词审核服务异常，已降级放行:', err.message);
    return { pass: true, keywords: [] };
  }
}

/**
 * 异步触发 M4 通知（不阻塞主流程）
 */
function triggerNotify(payload) {
  axios
    .post('http://localhost:3001/internal/notify', payload, { timeout: 3000 })
    .catch(err => console.error('[M3→M4] 通知触发失败:', err.message));
}

/**
 * 从帖子内容中解析 @用户名 列表
 * @returns {string[]} usernames
 */
function extractMentions(content) {
  const matches = content.match(/@([a-zA-Z0-9\u4e00-\u9fa5_-]{2,50})/g) || [];
  return [...new Set(matches.map(m => m.slice(1)))];
}

// ─── 查询帮助 ────────────────────────────────────────────────

/**
 * 查询单条帖子（含作者信息、图片、关联书籍）
 * @param {number} postId
 * @param {number|null} viewerId  当前登录用户ID，用于填充 isLiked / isBookmarked
 */
async function getPostById(postId, viewerId = null) {
  const [rows] = await db.query(
    `SELECT
       p.*,
       u.username, u.avatar_url AS avatarUrl,
       b.title AS bookTitle, b.author AS bookAuthor, b.cover_url AS bookCoverUrl
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN books b ON b.id = p.book_id
     WHERE p.id = ? AND p.is_deleted = 0`,
    [postId]
  );
  if (!rows.length) return null;

  const post = formatPost(rows[0]);

  // 图片
  const [imgs] = await db.query(
    'SELECT url, thumbnail_url AS thumbnailUrl, width, height, sort_order AS sortOrder FROM post_images WHERE post_id = ? ORDER BY sort_order',
    [postId]
  );
  post.images = imgs;

  // 转发原帖（浅层）
  if (post.originPostId) {
    const [orig] = await db.query(
      `SELECT p.id, p.content, p.post_type AS postType, p.is_deleted AS isDeleted,
              u.id AS userId, u.username, u.avatar_url AS avatarUrl
       FROM posts p JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [post.originPostId]
    );
    post.originPost = orig[0] || null;
  }

  // 当前用户的点赞/收藏状态
  if (viewerId) {
    const [[liked]] = await db.query(
      'SELECT id FROM likes WHERE user_id=? AND target_id=? AND target_type=1',
      [viewerId, postId]
    );
    const [[bookmarked]] = await db.query(
      'SELECT id FROM bookmarks WHERE user_id=? AND target_id=? AND target_type=1',
      [viewerId, postId]
    );
    post.isLiked      = !!liked;
    post.isBookmarked = !!bookmarked;
  }

  return post;
}

/** 驼峰格式化帖子行 */
function formatPost(row) {
  return {
    id:            row.id,
    userId:        row.user_id,
    username:      row.username,
    avatarUrl:     row.avatarUrl || row.avatar_url,
    content:       row.content,
    postType:      row.post_type,
    bookId:        row.book_id,
    book:          row.bookTitle
      ? { id: row.book_id, title: row.bookTitle, author: row.bookAuthor, coverUrl: row.bookCoverUrl }
      : null,
    bookList:      row.book_list ? JSON.parse(row.book_list) : null,
    rating:        row.rating,
    visibility:    row.visibility,
    hasSpoiler:    !!row.has_spoiler,
    imageCount:    row.image_count,
    likeCount:     row.like_count,
    commentCount:  row.comment_count,
    bookmarkCount: row.bookmark_count,
    shareCount:    row.share_count,
    originPostId:  row.origin_post_id,
    auditStatus:   row.audit_status,
    isDeleted:     !!row.is_deleted,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
    isLiked:       false,
    isBookmarked:  false,
    images:        [],
    originPost:    null,
  };
}

// ─── 信息流 ──────────────────────────────────────────────────

/**
 * 关注用户的动态信息流
 */
async function getFollowingFeed(userId, cursor, pageSize = 20) {
  let sql = `
    SELECT p.*, u.username, u.avatar_url AS avatarUrl,
           b.title AS bookTitle, b.author AS bookAuthor, b.cover_url AS bookCoverUrl
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN books b ON b.id = p.book_id
    WHERE p.is_deleted = 0
      AND p.audit_status = 1
      AND p.user_id IN (
        SELECT following_id FROM user_follows WHERE follower_id = ?
      )
      AND p.visibility IN (0, 1)
  `;
  const params = [userId];

  if (cursor) {
    sql += ' AND p.created_at < ?';
    params.push(cursor);
  }
  sql += ' ORDER BY p.created_at DESC LIMIT ?';
  params.push(pageSize + 1);

  const [rows] = await db.query(sql, params);
  const hasMore = rows.length > pageSize;
  const list    = rows.slice(0, pageSize).map(formatPost);

  // 批量填充图片（避免 N+1）
  await attachImages(list);
  // 批量填充当前用户点赞/收藏状态
  await attachInteractions(list, userId);

  return {
    list,
    nextCursor: hasMore ? list[list.length - 1].createdAt : null,
    hasMore,
  };
}

/**
 * 推荐动态信息流（未登录时降级为全局热门）
 */
async function getRecommendFeed(userId, cursor, pageSize = 20) {
  let sql = `
    SELECT p.*, u.username, u.avatar_url AS avatarUrl,
           b.title AS bookTitle, b.author AS bookAuthor, b.cover_url AS bookCoverUrl
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN books b ON b.id = p.book_id
    WHERE p.is_deleted = 0
      AND p.audit_status = 1
      AND p.visibility = 0
  `;
  const params = [];

  if (cursor) {
    sql += ' AND p.created_at < ?';
    params.push(cursor);
  }
  // 简单推荐策略：按热度（like_count + comment_count * 2）降序，同热度按时间
  sql += ' ORDER BY (p.like_count + p.comment_count * 2) DESC, p.created_at DESC LIMIT ?';
  params.push(pageSize + 1);

  const [rows] = await db.query(sql, params);
  const hasMore = rows.length > pageSize;
  const list    = rows.slice(0, pageSize).map(formatPost);

  await attachImages(list);
  if (userId) await attachInteractions(list, userId);

  return {
    list,
    nextCursor: hasMore ? list[list.length - 1].createdAt : null,
    hasMore,
  };
}

/** 批量给帖子列表附加 images */
async function attachImages(posts) {
  if (!posts.length) return;
  const ids = posts.map(p => p.id);
  const [imgs] = await db.query(
    `SELECT post_id, url, thumbnail_url AS thumbnailUrl, width, height, sort_order AS sortOrder
     FROM post_images WHERE post_id IN (?) ORDER BY post_id, sort_order`,
    [ids]
  );
  const map = {};
  imgs.forEach(img => {
    if (!map[img.post_id]) map[img.post_id] = [];
    map[img.post_id].push(img);
  });
  posts.forEach(p => { p.images = map[p.id] || []; });
}

/** 批量给帖子列表附加当前用户的互动状态 */
async function attachInteractions(posts, userId) {
  if (!posts.length || !userId) return;
  const ids = posts.map(p => p.id);

  const [likedRows] = await db.query(
    'SELECT target_id FROM likes WHERE user_id=? AND target_id IN (?) AND target_type=1',
    [userId, ids]
  );
  const [bookmarkedRows] = await db.query(
    'SELECT target_id FROM bookmarks WHERE user_id=? AND target_id IN (?) AND target_type=1',
    [userId, ids]
  );

  const likedSet      = new Set(likedRows.map(r => r.target_id));
  const bookmarkedSet = new Set(bookmarkedRows.map(r => r.target_id));

  posts.forEach(p => {
    p.isLiked      = likedSet.has(p.id);
    p.isBookmarked = bookmarkedSet.has(p.id);
  });
}

// ─── CRUD ────────────────────────────────────────────────────

/**
 * 发帖
 */
async function createPost(userId, body) {
  const {
    content, postType = 0, bookId = null, bookList = null,
    rating = null, visibility = 0, hasSpoiler = false,
    imageUrls = [],
  } = body;

  // 1. 违禁词审核（同步）
  const audit = await auditContent(content);
  if (!audit.pass) {
    const err = new Error(`内容包含违禁词：${audit.keywords.join('、')}`);
    err.statusCode = 400;
    throw err;
  }

  // 2. 参数校验
  const maxLength = { 0: 1000, 1: 2000, 2: 1000, 3: 500, 4: 200 };
  if (content.length > (maxLength[postType] || 1000)) {
    const err = new Error(`内容超出${maxLength[postType]}字限制`);
    err.statusCode = 400;
    throw err;
  }
  if (imageUrls.length > 9) {
    const err = new Error('最多上传9张图片');
    err.statusCode = 400;
    throw err;
  }

  // 3. 写库（事务）
  let postId;
  await db.transaction(async (conn) => {
    const [result] = await conn.query(
      `INSERT INTO posts
         (user_id, content, post_type, book_id, book_list, rating,
          visibility, has_spoiler, image_count, audit_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        userId, content, postType,
        bookId   || null,
        bookList ? JSON.stringify(bookList) : null,
        rating   || null,
        visibility, hasSpoiler ? 1 : 0,
        imageUrls.length,
      ]
    );
    postId = result.insertId;

    // 4. 写图片
    if (imageUrls.length > 0) {
      const imgValues = imageUrls.map((url, i) => [postId, url, null, i]);
      await conn.query(
        'INSERT INTO post_images (post_id, url, thumbnail_url, sort_order) VALUES ?',
        [imgValues]
      );
    }

    // 5. 维护冗余计数
    await conn.query('UPDATE users SET post_count = post_count + 1 WHERE id = ?', [userId]);
  });

  // 6. 处理 @提及，异步通知
  const mentions = extractMentions(content);
  if (mentions.length > 0) {
    const [mentionedUsers] = await db.query(
      'SELECT id FROM users WHERE username IN (?)',
      [mentions]
    );
    mentionedUsers.forEach(u => {
      if (u.id !== userId) {
        triggerNotify({
          userId:   u.id,
          type:     4,
          actorId:  userId,
          targetId: postId,
          content:  content.slice(0, 100),
        });
      }
    });
  }

  return getPostById(postId, userId);
}

/**
 * 删除帖子（软删除）
 */
async function deletePost(postId, userId) {
  const [rows] = await db.query(
    'SELECT id, user_id FROM posts WHERE id = ? AND is_deleted = 0',
    [postId]
  );
  if (!rows.length) {
    const err = new Error('帖子不存在');
    err.statusCode = 404;
    throw err;
  }
  if (rows[0].user_id !== userId) {
    const err = new Error('无权删除他人帖子');
    err.statusCode = 403;
    throw err;
  }

  await db.transaction(async (conn) => {
    await conn.query(
      'UPDATE posts SET is_deleted=1, delete_reason=0 WHERE id=?',
      [postId]
    );
    await conn.query(
      'UPDATE users SET post_count = GREATEST(post_count-1, 0) WHERE id=?',
      [userId]
    );
  });
}

/**
 * 转发帖子
 */
async function sharePost(userId, originPostId, content = '') {
  // 验证原帖存在
  const [orig] = await db.query(
    'SELECT id FROM posts WHERE id=? AND is_deleted=0',
    [originPostId]
  );
  if (!orig.length) {
    const err = new Error('原帖不存在');
    err.statusCode = 404;
    throw err;
  }

  // 内容审核（转发附评论）
  if (content) {
    const audit = await auditContent(content);
    if (!audit.pass) {
      const err = new Error(`内容包含违禁词：${audit.keywords.join('、')}`);
      err.statusCode = 400;
      throw err;
    }
  }

  let newPostId;
  await db.transaction(async (conn) => {
    const [result] = await conn.query(
      `INSERT INTO posts (user_id, content, post_type, origin_post_id, visibility, audit_status)
       VALUES (?, ?, 0, ?, 0, 1)`,
      [userId, content || '', originPostId]
    );
    newPostId = result.insertId;
    await conn.query(
      'UPDATE posts SET share_count = share_count + 1 WHERE id=?',
      [originPostId]
    );
    await conn.query(
      'UPDATE users SET post_count = post_count + 1 WHERE id=?',
      [userId]
    );
  });

  return getPostById(newPostId, userId);
}

/**
 * 用户主页动态列表
 */
async function getUserPosts(targetUserId, viewerId, page = 1, pageSize = 20) {
  // 隐私：仅自己可见 visibility=2 过滤
  let visibilityFilter = 'p.visibility IN (0)';
  if (viewerId === targetUserId) {
    visibilityFilter = '1=1'; // 自己看自己全部
  } else if (viewerId) {
    // 检查是否关注
    const [[follow]] = await db.query(
      'SELECT id FROM user_follows WHERE follower_id=? AND following_id=?',
      [viewerId, targetUserId]
    );
    if (follow) visibilityFilter = 'p.visibility IN (0, 1)';
  }

  const offset = (page - 1) * pageSize;
  const [rows] = await db.query(
    `SELECT p.*, u.username, u.avatar_url AS avatarUrl,
            b.title AS bookTitle, b.author AS bookAuthor, b.cover_url AS bookCoverUrl
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN books b ON b.id = p.book_id
     WHERE p.user_id=? AND p.is_deleted=0 AND ${visibilityFilter}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [targetUserId, pageSize, offset]
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM posts p
     WHERE p.user_id=? AND p.is_deleted=0 AND ${visibilityFilter}`,
    [targetUserId]
  );

  const list = rows.map(formatPost);
  await attachImages(list);
  if (viewerId) await attachInteractions(list, viewerId);

  return { list, total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasMore: page * pageSize < total };
}

module.exports = {
  createPost, deletePost, sharePost,
  getPostById, getFollowingFeed, getRecommendFeed, getUserPosts,
};
