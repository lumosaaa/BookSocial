'use strict';

const db = require('../common/db');

function formatNote(row) {
  return {
    id:          row.id,
    userId:      row.user_id,
    username:    row.username,
    avatarUrl:   row.avatar_url,
    bookId:      row.book_id,
    bookTitle:   row.bookTitle   || null,
    bookAuthor:  row.bookAuthor  || null,
    bookCoverUrl:row.bookCoverUrl|| null,
    title:       row.title,
    content:     row.content,
    quote:       row.quote,
    pageNumber:  row.page_number,
    chapter:     row.chapter,
    isPublic:    !!row.is_public,
    likeCount:   row.like_count,
    commentCount:row.comment_count,
    isDeleted:   !!row.is_deleted,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
    isLiked:     false,
  };
}

/**
 * 新建阅读笔记
 */
async function createNote(userId, body) {
  const { bookId, title, content, quote, pageNumber, chapter, isPublic = true } = body;

  if (!content || content.length > 50000) {
    const err = new Error('笔记内容长度应在1-50000字之间');
    err.statusCode = 400;
    throw err;
  }
  if (!bookId) {
    const err = new Error('必须关联书籍');
    err.statusCode = 400;
    throw err;
  }

  const [[book]] = await db.query('SELECT id FROM books WHERE id=? AND is_active=1', [bookId]);
  if (!book) {
    const err = new Error('书籍不存在');
    err.statusCode = 404;
    throw err;
  }

  const [result] = await db.query(
    `INSERT INTO reading_notes
       (user_id, book_id, title, content, quote, page_number, chapter, is_public)
     VALUES (?,?,?,?,?,?,?,?)`,
    [userId, bookId, title || null, content, quote || null, pageNumber || null, chapter || null, isPublic ? 1 : 0]
  );

  return getNoteById(result.insertId, userId);
}

/**
 * 编辑笔记
 */
async function updateNote(noteId, userId, body) {
  const [[note]] = await db.query(
    'SELECT id, user_id FROM reading_notes WHERE id=? AND is_deleted=0',
    [noteId]
  );
  if (!note) {
    const err = new Error('笔记不存在');
    err.statusCode = 404;
    throw err;
  }
  if (note.user_id !== userId) {
    const err = new Error('无权编辑他人笔记');
    err.statusCode = 403;
    throw err;
  }

  const { title, content, quote, pageNumber, chapter, isPublic } = body;
  const fields = [];
  const params = [];

  if (title     !== undefined) { fields.push('title=?');       params.push(title); }
  if (content   !== undefined) { fields.push('content=?');     params.push(content); }
  if (quote     !== undefined) { fields.push('quote=?');       params.push(quote); }
  if (pageNumber!== undefined) { fields.push('page_number=?'); params.push(pageNumber); }
  if (chapter   !== undefined) { fields.push('chapter=?');     params.push(chapter); }
  if (isPublic  !== undefined) { fields.push('is_public=?');   params.push(isPublic ? 1 : 0); }

  if (fields.length === 0) return getNoteById(noteId, userId);

  params.push(noteId);
  await db.query(`UPDATE reading_notes SET ${fields.join(',')} WHERE id=?`, params);

  return getNoteById(noteId, userId);
}

/**
 * 删除笔记（软删除）
 */
async function deleteNote(noteId, userId) {
  const [[note]] = await db.query(
    'SELECT id, user_id FROM reading_notes WHERE id=? AND is_deleted=0',
    [noteId]
  );
  if (!note) {
    const err = new Error('笔记不存在');
    err.statusCode = 404;
    throw err;
  }
  if (note.user_id !== userId) {
    const err = new Error('无权删除他人笔记');
    err.statusCode = 403;
    throw err;
  }

  await db.query('UPDATE reading_notes SET is_deleted=1 WHERE id=?', [noteId]);
}

/**
 * 获取单条笔记详情
 */
async function getNoteById(noteId, viewerId = null) {
  const [[row]] = await db.query(
    `SELECT n.*, u.username, u.avatar_url,
            b.title AS bookTitle, b.author AS bookAuthor, b.cover_url AS bookCoverUrl
     FROM reading_notes n
     JOIN users u ON u.id = n.user_id
     LEFT JOIN books b ON b.id = n.book_id
     WHERE n.id=? AND n.is_deleted=0`,
    [noteId]
  );
  if (!row) return null;

  // 私密笔记仅作者可见
  if (!row.is_public && row.user_id !== viewerId) {
    const err = new Error('无权查看私密笔记');
    err.statusCode = 403;
    throw err;
  }

  const note = formatNote(row);

  if (viewerId) {
    const [[liked]] = await db.query(
      'SELECT id FROM likes WHERE user_id=? AND target_id=? AND target_type=3',
      [viewerId, noteId]
    );
    note.isLiked = !!liked;
  }

  return note;
}

/**
 * 获取某书的公开笔记列表
 */
async function getBookNotes(bookId, viewerId, page = 1, pageSize = 20, sort = 'hot') {
  const offset = (page - 1) * pageSize;
  const orderBy = sort === 'hot'
    ? 'n.like_count DESC, n.created_at DESC'
    : 'n.created_at DESC';

  const [rows] = await db.query(
    `SELECT n.*, u.username, u.avatar_url
     FROM reading_notes n
     JOIN users u ON u.id = n.user_id
     WHERE n.book_id=? AND n.is_public=1 AND n.is_deleted=0
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [bookId, pageSize, offset]
  );

  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM reading_notes WHERE book_id=? AND is_public=1 AND is_deleted=0',
    [bookId]
  );

  const list = rows.map(r => formatNote(r));

  if (viewerId && list.length) {
    const ids = list.map(n => n.id);
    const [likedRows] = await db.query(
      'SELECT target_id FROM likes WHERE user_id=? AND target_id IN (?) AND target_type=3',
      [viewerId, ids]
    );
    const likedSet = new Set(likedRows.map(r => r.target_id));
    list.forEach(n => { n.isLiked = likedSet.has(n.id); });
  }

  return { list, total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasMore: page * pageSize < total };
}

/**
 * 获取某用户的笔记列表（尊重 notes_visible 隐私设置）
 */
async function getUserNotes(targetUserId, viewerId, page = 1, pageSize = 20) {
  // 检查隐私设置
  const [[privacy]] = await db.query(
    'SELECT notes_visible FROM user_privacy_settings WHERE user_id=?',
    [targetUserId]
  );

  if (privacy) {
    const nv = privacy.notes_visible;
    if (nv === 2 && viewerId !== targetUserId) {
      return { list: [], total: 0, page, pageSize, totalPages: 0, hasMore: false };
    }
    if (nv === 1 && viewerId !== targetUserId) {
      const [[follow]] = await db.query(
        'SELECT id FROM user_follows WHERE follower_id=? AND following_id=?',
        [viewerId, targetUserId]
      );
      if (!follow) return { list: [], total: 0, page, pageSize, totalPages: 0, hasMore: false };
    }
  }

  const isPublicFilter = viewerId === targetUserId ? '' : 'AND n.is_public=1';
  const offset = (page - 1) * pageSize;

  const [rows] = await db.query(
    `SELECT n.*, u.username, u.avatar_url,
            b.title AS bookTitle, b.author AS bookAuthor, b.cover_url AS bookCoverUrl
     FROM reading_notes n
     JOIN users u ON u.id = n.user_id
     LEFT JOIN books b ON b.id = n.book_id
     WHERE n.user_id=? AND n.is_deleted=0 ${isPublicFilter}
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`,
    [targetUserId, pageSize, offset]
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM reading_notes n
     WHERE n.user_id=? AND n.is_deleted=0 ${isPublicFilter}`,
    [targetUserId]
  );

  return {
    list: rows.map(r => formatNote(r)),
    total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasMore: page * pageSize < total,
  };
}

module.exports = { createNote, updateNote, deleteNote, getNoteById, getBookNotes, getUserNotes };
