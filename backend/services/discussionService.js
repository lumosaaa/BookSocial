/**
 * M5 · 书籍讨论业务逻辑
 */
const db    = require('../common/db');
const axios = require('axios');

// 讨论分类枚举
const CATEGORY_NAMES = {
  0: '综合',
  1: '书评',
  2: '剧情',
  3: '推荐',
  4: '求助',
};

function formatDiscussion(row) {
  if (!row) return null;
  return {
    id:           row.id,
    bookId:       row.book_id,
    bookTitle:    row.book_title || null,
    bookCover:    row.book_cover || null,
    userId:       row.user_id,
    username:     row.username || null,
    avatarUrl:    row.avatar_url || null,
    title:        row.is_deleted ? '该帖子已删除' : row.title,
    content:      row.is_deleted ? '' : row.content,
    category:     row.category,
    categoryName: CATEGORY_NAMES[row.category] || '综合',
    hasSpoiler:   row.has_spoiler === 1,
    likeCount:    row.like_count,
    commentCount: row.comment_count,
    viewCount:    row.view_count || 0,
    isLiked:      row.is_liked === 1,
    isDeleted:    row.is_deleted === 1,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

function formatComment(row) {
  if (!row) return null;
  return {
    id:              row.id,
    discId:          row.disc_id,
    userId:          row.user_id,
    username:        row.username || null,
    avatarUrl:       row.avatar_url || null,
    content:         row.is_deleted ? '该评论已删除' : row.content,
    parentId:        row.parent_id || null,
    replyToUserId:   row.reply_to_user_id || null,
    replyToUsername: row.reply_to_username || null,
    likeCount:       row.like_count,
    isLiked:         row.is_liked === 1,
    isDeleted:       row.is_deleted === 1,
    createdAt:       row.created_at,
  };
}

// ── 讨论列表 ──────────────────────────────────────────────────────────────────
async function listDiscussions({ bookId, category, sort, page, currentUserId }) {
  const pageSize = 20;
  const offset   = (page - 1) * pageSize;
  const params   = [bookId];
  let where = 'WHERE bd.book_id = ? AND bd.is_deleted = 0';
  if (category !== null && category !== undefined) {
    where += ' AND bd.category = ?';
    params.push(Number(category));
  }

  const likedJoin = currentUserId
    ? `LEFT JOIN likes lk ON lk.target_id = bd.id AND lk.target_type = 5 AND lk.user_id = ${Number(currentUserId)}`
    : '';
  const likedSelect = currentUserId ? ', IF(lk.id IS NOT NULL, 1, 0) AS is_liked' : ', 0 AS is_liked';

  const orderBy = sort === 'new'
    ? 'ORDER BY bd.created_at DESC'
    : 'ORDER BY (bd.like_count * 2 + bd.comment_count) DESC, bd.created_at DESC';

  const [rows] = await db.query(
    `SELECT bd.*, u.username, u.avatar_url,
            b.title AS book_title, b.cover_url AS book_cover ${likedSelect}
     FROM book_discussions bd
     JOIN users u ON u.id = bd.user_id
     LEFT JOIN books b ON b.id = bd.book_id
     ${likedJoin}
     ${where}
     ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [cnt] = await db.query(
    `SELECT COUNT(*) AS total FROM book_discussions bd ${where}`,
    params
  );

  return { list: rows.map(formatDiscussion), total: cnt[0].total };
}

// ── 发布讨论 ──────────────────────────────────────────────────────────────────
async function createDiscussion({ bookId, userId, title, content, category, hasSpoiler }) {
  const [books] = await db.query('SELECT id FROM books WHERE id = ? AND is_active = 1', [bookId]);
  if (!books.length) { const e = new Error('书籍不存在'); e.status = 404; throw e; }

  const [r] = await db.query(
    `INSERT INTO book_discussions
     (book_id, user_id, title, content, category, has_spoiler,
      like_count, comment_count, view_count, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, NOW(), NOW())`,
    [bookId, userId, title, content, category, hasSpoiler ? 1 : 0]
  );
  const discId = r.insertId;

  const [rows] = await db.query(
    `SELECT bd.*, u.username, u.avatar_url, b.title AS book_title, b.cover_url AS book_cover, 0 AS is_liked
     FROM book_discussions bd
     JOIN users u ON u.id = bd.user_id
     LEFT JOIN books b ON b.id = bd.book_id
     WHERE bd.id = ?`,
    [discId]
  );
  return formatDiscussion(rows[0]);
}

// ── 讨论详情 ──────────────────────────────────────────────────────────────────
async function getDiscussion({ discId, currentUserId }) {
  const likedJoin = currentUserId
    ? `LEFT JOIN likes lk ON lk.target_id = bd.id AND lk.target_type = 5 AND lk.user_id = ${Number(currentUserId)}`
    : '';
  const likedSelect = currentUserId ? ', IF(lk.id IS NOT NULL, 1, 0) AS is_liked' : ', 0 AS is_liked';

  const [rows] = await db.query(
    `SELECT bd.*, u.username, u.avatar_url, b.title AS book_title, b.cover_url AS book_cover ${likedSelect}
     FROM book_discussions bd
     JOIN users u ON u.id = bd.user_id
     LEFT JOIN books b ON b.id = bd.book_id
     ${likedJoin}
     WHERE bd.id = ?`,
    [discId]
  );
  if (!rows.length) return null;

  // 浏览量 +1（异步，不阻塞响应）
  db.query('UPDATE book_discussions SET view_count = view_count + 1 WHERE id = ?', [discId]).catch(() => {});

  return formatDiscussion(rows[0]);
}

// ── 删除讨论 ──────────────────────────────────────────────────────────────────
async function deleteDiscussion({ discId, userId }) {
  const [rows] = await db.query('SELECT user_id FROM book_discussions WHERE id = ?', [discId]);
  if (!rows.length) { const e = new Error('讨论不存在'); e.status = 404; throw e; }
  if (rows[0].user_id !== userId) { const e = new Error('无权删除'); e.status = 403; throw e; }
  await db.query('UPDATE book_discussions SET is_deleted = 1 WHERE id = ?', [discId]);
}

// ── 评论列表 ──────────────────────────────────────────────────────────────────
async function listComments({ discId, page, currentUserId }) {
  const pageSize = 20;
  const offset   = (page - 1) * pageSize;

  const likedJoin = currentUserId
    ? `LEFT JOIN likes lk ON lk.target_id = dc.id AND lk.target_type = 7 AND lk.user_id = ${Number(currentUserId)}`
    : '';
  const likedSelect = currentUserId ? ', IF(lk.id IS NOT NULL, 1, 0) AS is_liked' : ', 0 AS is_liked';

  const [rows] = await db.query(
    `SELECT dc.*, u.username, u.avatar_url,
            ur.username AS reply_to_username ${likedSelect}
     FROM discussion_comments dc
     JOIN users u ON u.id = dc.user_id
     LEFT JOIN users ur ON ur.id = dc.reply_to_user_id
     ${likedJoin}
     WHERE dc.disc_id = ?
     ORDER BY dc.created_at ASC
     LIMIT ? OFFSET ?`,
    [discId, pageSize, offset]
  );
  const [cnt] = await db.query(
    'SELECT COUNT(*) AS total FROM discussion_comments WHERE disc_id = ?',
    [discId]
  );

  return { list: rows.map(formatComment), total: cnt[0].total };
}

// ── 发表评论 ──────────────────────────────────────────────────────────────────
async function createComment({ discId, userId, content, parentId }) {
  const [discs] = await db.query(
    'SELECT id, user_id FROM book_discussions WHERE id = ? AND is_deleted = 0',
    [discId]
  );
  if (!discs.length) { const e = new Error('讨论不存在'); e.status = 404; throw e; }

  let replyToUserId = null;
  if (parentId) {
    const [parent] = await db.query(
      'SELECT user_id FROM discussion_comments WHERE id = ? AND disc_id = ?',
      [parentId, discId]
    );
    if (!parent.length) { const e = new Error('父评论不存在'); e.status = 404; throw e; }
    replyToUserId = parent[0].user_id;
  }

  let commentId;
  await db.transaction(async (conn) => {
    const [r] = await conn.query(
      `INSERT INTO discussion_comments
       (disc_id, user_id, content, parent_id, reply_to_user_id, like_count, is_deleted, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, NOW())`,
      [discId, userId, content, parentId || null, replyToUserId]
    );
    commentId = r.insertId;
    await conn.query(
      'UPDATE book_discussions SET comment_count = comment_count + 1 WHERE id = ?',
      [discId]
    );
  });

  // 触发 M4 通知（被评论，type=3）
  const targetUserId = parentId ? replyToUserId : discs[0].user_id;
  if (targetUserId && targetUserId !== userId) {
    triggerNotify({
      userId:     targetUserId,
      type:       3,
      actorId:    userId,
      targetId:   discId,
      targetType: 'discussion',
      content:    content.slice(0, 100),
    });
  }

  const [rows] = await db.query(
    `SELECT dc.*, u.username, u.avatar_url, 0 AS is_liked, NULL AS reply_to_username
     FROM discussion_comments dc JOIN users u ON u.id = dc.user_id WHERE dc.id = ?`,
    [commentId]
  );
  return formatComment(rows[0]);
}

// ── 删除评论 ──────────────────────────────────────────────────────────────────
async function deleteComment({ commentId, userId }) {
  const [rows] = await db.query(
    'SELECT dc.*, bd.user_id AS disc_owner FROM discussion_comments dc JOIN book_discussions bd ON bd.id = dc.disc_id WHERE dc.id = ?',
    [commentId]
  );
  if (!rows.length) { const e = new Error('评论不存在'); e.status = 404; throw e; }
  const c = rows[0];
  if (c.user_id !== userId && c.disc_owner !== userId) {
    const e = new Error('无权删除'); e.status = 403; throw e;
  }

  await db.transaction(async (conn) => {
    await conn.query(
      'UPDATE discussion_comments SET is_deleted = 1, content = "该评论已删除" WHERE id = ?',
      [commentId]
    );
    await conn.query(
      'UPDATE book_discussions SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?',
      [c.disc_id]
    );
  });
}

// ── 点赞讨论 ──────────────────────────────────────────────────────────────────
async function toggleLike({ discId, userId }) {
  // target_type=5 代表讨论帖（与 likes 表约定一致）
  const [existing] = await db.query(
    'SELECT id FROM likes WHERE user_id = ? AND target_id = ? AND target_type = 5',
    [userId, discId]
  );
  if (existing.length) {
    await db.transaction(async (conn) => {
      await conn.query('DELETE FROM likes WHERE id = ?', [existing[0].id]);
      await conn.query(
        'UPDATE book_discussions SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?',
        [discId]
      );
    });
    const [d] = await db.query('SELECT like_count FROM book_discussions WHERE id = ?', [discId]);
    return { liked: false, likeCount: d[0]?.like_count || 0 };
  } else {
    await db.transaction(async (conn) => {
      await conn.query(
        'INSERT INTO likes (user_id, target_id, target_type, created_at) VALUES (?, ?, 5, NOW())',
        [userId, discId]
      );
      await conn.query(
        'UPDATE book_discussions SET like_count = like_count + 1 WHERE id = ?',
        [discId]
      );
    });

    // 通知被点赞的讨论作者
    const [discs] = await db.query('SELECT user_id FROM book_discussions WHERE id = ?', [discId]);
    if (discs.length && discs[0].user_id !== userId) {
      triggerNotify({ userId: discs[0].user_id, type: 2, actorId: userId, targetId: discId, targetType: 'discussion' });
    }

    const [d] = await db.query('SELECT like_count FROM book_discussions WHERE id = ?', [discId]);
    return { liked: true, likeCount: d[0]?.like_count || 0 };
  }
}

function triggerNotify(params) {
  axios.post(`http://localhost:${process.env.PORT || 3001}/internal/notify`, params, {
    headers: { 'X-Internal-Secret': process.env.INTERNAL_SECRET || '' },
  }).catch(err => console.error('[M5 通知] 发送失败:', err.message));
}

module.exports = {
  listDiscussions,
  createDiscussion,
  getDiscussion,
  deleteDiscussion,
  listComments,
  createComment,
  deleteComment,
  toggleLike,
};
