'use strict';

const db   = require('../common/db');
const axios = require('axios');

function triggerNotify(payload) {
  axios
    .post('http://localhost:3001/internal/notify', payload, { timeout: 3000 })
    .catch(err => console.error('[M3→M4] 通知触发失败:', err.message));
}

function formatComment(row) {
  return {
    id:            row.id,
    userId:        row.user_id,
    username:      row.username,
    avatarUrl:     row.avatar_url,
    targetId:      row.target_id,
    targetType:    row.target_type,
    parentId:      row.parent_id,
    rootId:        row.root_id,
    replyToUserId: row.reply_to_user_id,
    replyToUsername: row.reply_to_username || null,
    content:       row.is_deleted ? '该评论已删除' : row.content,
    likeCount:     row.like_count,
    replyCount:    row.reply_count,
    isDeleted:     !!row.is_deleted,
    createdAt:     row.created_at,
    isLiked:       false,
    replies:       [],
  };
}

/**
 * 获取帖子根评论列表（第一层），每条附带前3条子评论预览
 */
async function getPostComments(postId, viewerId, page = 1, pageSize = 10) {
  const [[post]] = await db.query(
    'SELECT id FROM posts WHERE id=? AND is_deleted=0',
    [postId]
  );
  if (!post) {
    const err = new Error('帖子不存在');
    err.statusCode = 404;
    throw err;
  }

  const offset = (page - 1) * pageSize;

  const [rows] = await db.query(
    `SELECT c.*, u.username, u.avatar_url
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.target_id=? AND c.target_type=1 AND c.parent_id IS NULL
     ORDER BY c.created_at ASC
     LIMIT ? OFFSET ?`,
    [postId, pageSize, offset]
  );

  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM comments WHERE target_id=? AND target_type=1 AND parent_id IS NULL',
    [postId]
  );

  const list = rows.map(formatComment);

  // 批量查前3条子评论
  if (list.length > 0) {
    const rootIds = list.map(c => c.id);
    const [subRows] = await db.query(
      `SELECT c.*, u.username, u.avatar_url,
              ru.username AS reply_to_username
       FROM comments c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN users ru ON ru.id = c.reply_to_user_id
       WHERE c.root_id IN (?)
       ORDER BY c.root_id, c.created_at ASC`,
      [rootIds]
    );

    // 每个根评论最多取3条子评论
    const subMap = {};
    subRows.forEach(r => {
      if (!subMap[r.root_id]) subMap[r.root_id] = [];
      if (subMap[r.root_id].length < 3) subMap[r.root_id].push(formatComment(r));
    });

    list.forEach(c => { c.replies = subMap[c.id] || []; });
  }

  // 点赞状态
  if (viewerId && list.length > 0) {
    const ids = list.map(c => c.id);
    const [likedRows] = await db.query(
      'SELECT target_id FROM likes WHERE user_id=? AND target_id IN (?) AND target_type=2',
      [viewerId, ids]
    );
    const likedSet = new Set(likedRows.map(r => r.target_id));
    list.forEach(c => { c.isLiked = likedSet.has(c.id); });
  }

  return {
    list, total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasMore:    page * pageSize < total,
  };
}

/**
 * 展开某根评论的全部子评论
 */
async function getReplies(rootCommentId, viewerId) {
  const [rows] = await db.query(
    `SELECT c.*, u.username, u.avatar_url,
            ru.username AS reply_to_username
     FROM comments c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN users ru ON ru.id = c.reply_to_user_id
     WHERE c.root_id=?
     ORDER BY c.created_at ASC`,
    [rootCommentId]
  );

  const list = rows.map(formatComment);

  if (viewerId && list.length > 0) {
    const ids = list.map(c => c.id);
    const [likedRows] = await db.query(
      'SELECT target_id FROM likes WHERE user_id=? AND target_id IN (?) AND target_type=2',
      [viewerId, ids]
    );
    const likedSet = new Set(likedRows.map(r => r.target_id));
    list.forEach(c => { c.isLiked = likedSet.has(c.id); });
  }

  return list;
}

/**
 * 发表评论
 */
async function createComment(userId, body) {
  const { targetId, targetType = 1, parentId = null, content } = body;

  if (!content || content.length > 1000) {
    const err = new Error('评论内容长度应在1-1000字之间');
    err.statusCode = 400;
    throw err;
  }

  // 确认目标存在
  //   1=帖子, 2=阅读笔记, 4=小组帖子
  //   注意：通知里的 type=3 是"被评论/被回复"这一事件类型，与这里的 targetType 概念不同，不要混用
  const targetTableMap = { 1: 'posts', 2: 'reading_notes', 4: 'group_posts' };
  const targetTable = targetTableMap[targetType];
  if (!targetTable) {
    const err = new Error('不支持的评论目标类型');
    err.statusCode = 400;
    throw err;
  }

  const [[targetRow]] = await db.query(
    `SELECT id, user_id FROM ${targetTable} WHERE id=? AND is_deleted=0`,
    [targetId]
  );
  if (!targetRow) {
    const err = new Error('评论目标不存在');
    err.statusCode = 404;
    throw err;
  }

  // 父评论验证
  let rootId          = null;
  let replyToUserId   = null;

  if (parentId) {
    const [[parent]] = await db.query(
      'SELECT id, root_id, user_id FROM comments WHERE id=? AND is_deleted=0',
      [parentId]
    );
    if (!parent) {
      const err = new Error('父评论不存在');
      err.statusCode = 404;
      throw err;
    }
    // 最多2层嵌套：parent 若已有 root，则新评论的 root = parent.root
    rootId        = parent.root_id || parent.id;
    replyToUserId = parent.user_id;
  }

  let commentId;
  await db.transaction(async (conn) => {
    const [result] = await conn.query(
      `INSERT INTO comments
         (user_id, target_id, target_type, parent_id, root_id, reply_to_user_id, content)
       VALUES (?,?,?,?,?,?,?)`,
      [userId, targetId, targetType, parentId || null, rootId, replyToUserId || null, content]
    );
    commentId = result.insertId;

    // 更新冗余计数
    if (targetType === 1) {
      await conn.query('UPDATE posts SET comment_count = comment_count+1 WHERE id=?', [targetId]);
    } else if (targetType === 2) {
      await conn.query('UPDATE reading_notes SET comment_count = comment_count+1 WHERE id=?', [targetId]);
    }

    // 若是回复，更新根评论和直接父评论的 reply_count
    if (parentId) {
      if (rootId && rootId !== parentId) {
        await conn.query('UPDATE comments SET reply_count = reply_count+1 WHERE id=?', [rootId]);
      }
      await conn.query('UPDATE comments SET reply_count = reply_count+1 WHERE id=?', [parentId]);
    }
  });

  // 异步通知
  // 通知目标内容作者（type=3 被评论）
  if (targetRow.user_id !== userId) {
    triggerNotify({
      userId:   targetRow.user_id,
      type:     3,
      actorId:  userId,
      targetId: targetId,
      content:  content.slice(0, 100),
    });
  }
  // 通知被回复者（type=3 被回复，避免重复通知）
  if (replyToUserId && replyToUserId !== userId && replyToUserId !== targetRow.user_id) {
    triggerNotify({
      userId:   replyToUserId,
      type:     3,
      actorId:  userId,
      targetId: commentId,
      content:  content.slice(0, 100),
    });
  }

  // 返回完整评论对象
  const [[row]] = await db.query(
    `SELECT c.*, u.username, u.avatar_url
     FROM comments c JOIN users u ON u.id=c.user_id
     WHERE c.id=?`,
    [commentId]
  );
  return formatComment(row);
}

/**
 * 删除评论（软删除，仅作者或帖子作者可删）
 */
async function deleteComment(commentId, userId) {
  const [[comment]] = await db.query(
    'SELECT id, user_id, target_id, target_type, parent_id, root_id FROM comments WHERE id=? AND is_deleted=0',
    [commentId]
  );
  if (!comment) {
    const err = new Error('评论不存在');
    err.statusCode = 404;
    throw err;
  }

  // 检查权限：评论作者 or 帖子作者
  let allowed = comment.user_id === userId;
  if (!allowed && comment.target_type === 1) {
    const [[post]] = await db.query('SELECT user_id FROM posts WHERE id=?', [comment.target_id]);
    if (post && post.user_id === userId) allowed = true;
  }
  if (!allowed) {
    const err = new Error('无权删除该评论');
    err.statusCode = 403;
    throw err;
  }

  await db.transaction(async (conn) => {
    await conn.query(
      "UPDATE comments SET is_deleted=1, content='该评论已删除' WHERE id=?",
      [commentId]
    );
    // 更新冗余计数
    if (comment.target_type === 1) {
      await conn.query(
        'UPDATE posts SET comment_count = GREATEST(comment_count-1,0) WHERE id=?',
        [comment.target_id]
      );
    }
    if (comment.root_id) {
      await conn.query(
        'UPDATE comments SET reply_count = GREATEST(reply_count-1,0) WHERE id=?',
        [comment.root_id]
      );
    }
    if (comment.parent_id) {
      await conn.query(
        'UPDATE comments SET reply_count = GREATEST(reply_count-1,0) WHERE id=?',
        [comment.parent_id]
      );
    }
  });
}

module.exports = { getPostComments, getReplies, createComment, deleteComment };
