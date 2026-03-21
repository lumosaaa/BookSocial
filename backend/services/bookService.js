/**
 * 模块2 · bookService.js
 * 书籍搜索（本地 FULLTEXT → Open Library → Google Books）
 * 书架 CRUD，评分维护，CSV 导出
 */
'use strict';

const db    = require('../common/db');
const axios = require('axios');

// ═══════════════════════════════════════════════════════════════════════════════
//  搜索
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 三级搜索：本地全文 → Open Library → Google Books
 * @param {string} q         关键词
 * @param {number} page      页码（1-based）
 * @param {number|null} category  分类 ID 筛选
 */
async function searchBooks(q, page = 1, category = null) {
  const offset = (page - 1) * 20;

  // ── 1. 本地 FULLTEXT 搜索 ────────────────────────────────────────────────
  let whereClause = `WHERE b.is_active = 1
    AND MATCH(b.title, b.author) AGAINST (? IN BOOLEAN MODE)`;
  const countParams = [`${q}*`];

  if (category) {
    whereClause += ' AND b.category_id = ?';
    countParams.push(Number(category));
  }

  const listParams  = [...countParams, offset];

  const [localRows] = await db.query(
    `SELECT b.id, b.title, b.author, b.isbn13, b.cover_url,
            b.publisher, b.publish_date, b.pages, b.language,
            b.platform_rating, b.rating_count,
            b.shelf_count, b.review_count, b.category_id,
            bc.name AS categoryName
     FROM books b
     LEFT JOIN book_categories bc ON bc.id = b.category_id
     ${whereClause}
     ORDER BY b.shelf_count DESC, b.platform_rating DESC
     LIMIT 20 OFFSET ?`,
    listParams
  );

  const [[{ total: localTotal }]] = await db.query(
    `SELECT COUNT(*) AS total FROM books b ${whereClause}`,
    countParams
  );

  if (localRows.length > 0) {
    return { list: localRows.map(formatBook), total: Number(localTotal) };
  }

  // ── 2. 远端并发搜索 ──────────────────────────────────────────────────────
  const remoteBooks = await fetchFromExternalAPIs(q);
  if (remoteBooks.length > 0) {
    // 异步入库，不阻塞响应
    cacheExternalBooks(remoteBooks).catch(e => console.error('[cacheBooks]', e));
    return { list: remoteBooks, total: remoteBooks.length };
  }

  return { list: [], total: 0 };
}

// ── Open Library ──────────────────────────────────────────────────────────────
async function fetchOpenLibrary(q) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=10` +
    `&fields=title,author_name,isbn,cover_i,first_publish_year,publisher,number_of_pages_median,language`;
  const { data } = await axios.get(url, { timeout: 6000 });
  return (data.docs || []).map(doc => ({
    title:      doc.title || '',
    author:     (doc.author_name || []).join('│'),
    isbn13:     (doc.isbn || []).find(i => i.length === 13) || null,
    coverUrl:   doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    publisher:  (doc.publisher || [])[0] || null,
    pages:      doc.number_of_pages_median || null,
    language:   (doc.language || [])[0] || null,
    description: null,
    source:     'openlibrary',
  }));
}

// ── Google Books ──────────────────────────────────────────────────────────────
async function fetchGoogleBooks(q) {
  const key = process.env.GOOGLE_BOOKS_API_KEY || '';
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10` +
    (key ? `&key=${key}` : '');
  const { data } = await axios.get(url, { timeout: 6000 });
  return ((data.items || [])).map(item => {
    const info = item.volumeInfo || {};
    const ids  = info.industryIdentifiers || [];
    const isbn13 = ids.find(i => i.type === 'ISBN_13')?.identifier || null;
    return {
      title:       info.title || '',
      author:      (info.authors || []).join('│'),
      isbn13,
      coverUrl:    (info.imageLinks?.thumbnail || '').replace('http:', 'https:') || null,
      publisher:   info.publisher || null,
      pages:       info.pageCount || null,
      language:    info.language || null,
      description: info.description || null,
      source:      'googlebooks',
    };
  });
}

async function fetchFromExternalAPIs(q) {
  const [olResult, gbResult] = await Promise.allSettled([
    fetchOpenLibrary(q),
    fetchGoogleBooks(q),
  ]);
  const all = [
    ...(olResult.status === 'fulfilled' ? olResult.value : []),
    ...(gbResult.status === 'fulfilled' ? gbResult.value : []),
  ];
  // 按 isbn13 去重
  const seen = new Set();
  return all.filter(b => {
    if (!b.title) return false;
    const key = b.isbn13 || `${b.title}::${b.author}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function cacheExternalBooks(books) {
  for (const book of books) {
    if (!book.title || !book.author) continue;
    try {
      await db.query(
        `INSERT IGNORE INTO books
         (title, author, isbn13, cover_url, publisher, pages, language, description, is_active, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [
          book.title, book.author, book.isbn13 || null,
          book.coverUrl || null, book.publisher || null,
          book.pages || null, book.language || null,
          book.description || null,
        ]
      );
    } catch (e) {
      // 忽略单条失败，继续缓存其他书
      console.warn('[cacheBook]', book.title, e.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  书籍详情
// ═══════════════════════════════════════════════════════════════════════════════

async function getBookById(bookId, userId = null) {
  const [[book]] = await db.query(
    `SELECT b.*, bc.name AS categoryName
     FROM books b
     LEFT JOIN book_categories bc ON bc.id = b.category_id
     WHERE b.id = ? AND b.is_active = 1`,
    [bookId]
  );
  if (!book) return null;

  // 标签
  book.tags = await getBookTags(bookId);

  // 当前用户的书架状态（可选）
  if (userId) {
    const [[shelfEntry]] = await db.query(
      `SELECT status, rating, short_comment, reading_progress, total_pages_ref,
              start_date, finish_date, shelf_group, is_private
       FROM user_shelves
       WHERE user_id = ? AND book_id = ?`,
      [userId, bookId]
    );
    book.myShelf = shelfEntry || null;
  }

  return formatBook(book);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  分类
// ═══════════════════════════════════════════════════════════════════════════════

async function getCategories() {
  const [rows] = await db.query(
    `SELECT id, name, icon, sort_order
     FROM book_categories
     WHERE is_active = 1
     ORDER BY sort_order`
  );
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  标签
// ═══════════════════════════════════════════════════════════════════════════════

async function getBookTags(bookId) {
  const [rows] = await db.query(
    `SELECT t.id, t.name, t.is_official, bt.count
     FROM book_tags bt
     JOIN tags t ON t.id = bt.tag_id
     WHERE bt.book_id = ?
     ORDER BY bt.count DESC
     LIMIT 30`,
    [bookId]
  );
  return rows;
}

async function addBookTag(bookId, tagName, userId) {
  // 查或建标签
  let [[tag]] = await db.query(`SELECT id FROM tags WHERE name = ?`, [tagName]);
  if (!tag) {
    const [result] = await db.query(
      `INSERT INTO tags (name, category, is_official, created_by) VALUES (?, 0, 0, ?)`,
      [tagName, userId]
    );
    tag = { id: result.insertId };
  }

  // book_tags：count +1（存在则累加）
  await db.query(
    `INSERT INTO book_tags (book_id, tag_id, user_id, count)
     VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE count = count + 1`,
    [bookId, tag.id, userId]
  );

  // 全局 usage_count +1
  await db.query(
    `UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?`,
    [tag.id]
  );

  return { id: tag.id, name: tagName };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  书架 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

async function getShelf(userId, status, page, group) {
  const offset = (page - 1) * 20;
  let where  = 'WHERE us.user_id = ?';
  const params = [userId];

  if (status) { where += ' AND us.status = ?'; params.push(status); }
  if (group)  { where += ' AND us.shelf_group = ?'; params.push(group); }

  const [list] = await db.query(
    `SELECT us.*, b.title, b.author, b.cover_url, b.pages,
            b.platform_rating, b.isbn13
     FROM user_shelves us
     JOIN books b ON b.id = us.book_id
     ${where}
     ORDER BY us.updated_at DESC
     LIMIT 20 OFFSET ?`,
    [...params, offset]
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM user_shelves us ${where}`,
    params
  );

  return { list: list.map(formatShelfEntry), total: Number(total) };
}

async function addToShelf(userId, bookId, status, shelfGroup) {
  const startDate = status >= 2 ? new Date() : null;

  const [result] = await db.query(
    `INSERT INTO user_shelves
       (user_id, book_id, status, shelf_group, start_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [userId, bookId, status, shelfGroup, startDate]
  );

  // 冗余计数维护
  await db.query(
    `UPDATE books SET shelf_count = shelf_count + 1 WHERE id = ?`,
    [bookId]
  );
  if (status === 3) {
    await db.query(
      `UPDATE users SET book_count = book_count + 1 WHERE id = ?`,
      [userId]
    );
    // 记录 total_pages_ref 快照
    await db.query(
      `UPDATE user_shelves us
       JOIN books b ON b.id = us.book_id
       SET us.total_pages_ref = b.pages, us.finish_date = CURDATE()
       WHERE us.user_id = ? AND us.book_id = ?`,
      [userId, bookId]
    );
  }

  return { id: result.insertId, bookId, status };
}

async function updateShelfEntry(userId, bookId, updates) {
  const [[existing]] = await db.query(
    `SELECT * FROM user_shelves WHERE user_id = ? AND book_id = ?`,
    [userId, bookId]
  );
  if (!existing) return null;

  const fieldMap = {
    status:          'status',
    rating:          'rating',
    shortComment:    'short_comment',
    startDate:       'start_date',
    finishDate:      'finish_date',
    readingProgress: 'reading_progress',
    shelfGroup:      'shelf_group',
    isPrivate:       'is_private',
  };

  const setClauses = [];
  const vals       = [];

  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (updates[camel] !== undefined) {
      setClauses.push(`${snake} = ?`);
      vals.push(updates[camel]);
    }
  }
  if (!setClauses.length) return formatShelfEntry({ ...existing });

  setClauses.push('updated_at = NOW()');

  await db.query(
    `UPDATE user_shelves SET ${setClauses.join(', ')}
     WHERE user_id = ? AND book_id = ?`,
    [...vals, userId, bookId]
  );

  // ── users.book_count 维护 ────────────────────────────────────────────────
  if (updates.status !== undefined) {
    const newStatus = Number(updates.status);
    const oldStatus = existing.status;
    if (newStatus === 3 && oldStatus !== 3) {
      await db.query(
        `UPDATE users SET book_count = book_count + 1 WHERE id = ?`,
        [userId]
      );
    } else if (oldStatus === 3 && newStatus !== 3) {
      await db.query(
        `UPDATE users SET book_count = GREATEST(book_count - 1, 0) WHERE id = ?`,
        [userId]
      );
    }
    // 切换到已读时自动记录完成日期
    if (newStatus === 3 && !existing.finish_date) {
      await db.query(
        `UPDATE user_shelves SET finish_date = CURDATE() WHERE user_id = ? AND book_id = ?`,
        [userId, bookId]
      );
    }
  }

  // ── books.platform_rating 维护 ────────────────────────────────────────────
  if (updates.rating !== undefined) {
    await db.query(
      `UPDATE books b
       SET b.platform_rating = (
             SELECT AVG(us.rating) / 2.0
             FROM user_shelves us
             WHERE us.book_id = ? AND us.rating IS NOT NULL
           ),
           b.rating_count = (
             SELECT COUNT(*)
             FROM user_shelves us
             WHERE us.book_id = ? AND us.rating IS NOT NULL
           )
       WHERE b.id = ?`,
      [bookId, bookId, bookId]
    );
  }

  const [[updated]] = await db.query(
    `SELECT us.*, b.title, b.author, b.cover_url, b.pages, b.platform_rating
     FROM user_shelves us JOIN books b ON b.id = us.book_id
     WHERE us.user_id = ? AND us.book_id = ?`,
    [userId, bookId]
  );
  return formatShelfEntry(updated);
}

async function removeFromShelf(userId, bookId) {
  const [[existing]] = await db.query(
    `SELECT status FROM user_shelves WHERE user_id = ? AND book_id = ?`,
    [userId, bookId]
  );
  if (!existing) return false;

  await db.query(
    `DELETE FROM user_shelves WHERE user_id = ? AND book_id = ?`,
    [userId, bookId]
  );

  await db.query(
    `UPDATE books SET shelf_count = GREATEST(shelf_count - 1, 0) WHERE id = ?`,
    [bookId]
  );
  if (existing.status === 3) {
    await db.query(
      `UPDATE users SET book_count = GREATEST(book_count - 1, 0) WHERE id = ?`,
      [userId]
    );
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CSV 导出
// ═══════════════════════════════════════════════════════════════════════════════

async function exportShelfCsv(userId) {
  const [rows] = await db.query(
    `SELECT b.title, b.author, b.isbn13, b.publisher, b.pages,
            us.status, us.rating, us.short_comment,
            us.start_date, us.finish_date,
            us.reading_progress, us.shelf_group, us.created_at
     FROM user_shelves us
     JOIN books b ON b.id = us.book_id
     WHERE us.user_id = ?
     ORDER BY us.updated_at DESC`,
    [userId]
  );

  const statusMap = { 1: '想读', 2: '在读', 3: '已读' };
  const headers = [
    '书名', '作者', 'ISBN13', '出版社', '总页数',
    '阅读状态', '评分(1-10)', '短评',
    '开始日期', '完成日期', '当前页数', '自定义分组', '加入书架时间',
  ];

  const escape = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
  const fmtDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';

  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      escape(r.title),
      escape(r.author),
      r.isbn13 || '',
      escape(r.publisher),
      r.pages || '',
      statusMap[r.status] || '',
      r.rating || '',
      escape(r.short_comment),
      fmtDate(r.start_date),
      fmtDate(r.finish_date),
      r.reading_progress || '',
      escape(r.shelf_group),
      fmtDate(r.created_at),
    ].join(','));
  }
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  浏览（首页书籍列表）
// ═══════════════════════════════════════════════════════════════════════════════

async function browseBooks(page = 1, category = null) {
  const offset = (page - 1) * 20;
  const conditions = ['b.is_active = 1'];
  const params = [];

  if (category) {
    conditions.push('b.category_id = ?');
    params.push(category);
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');
  const countParams = [...params];
  const listParams  = [...params, offset];

  const [rows] = await db.query(
    `SELECT b.id, b.title, b.author, b.isbn13, b.cover_url,
            b.publisher, b.publish_date, b.pages, b.language,
            b.platform_rating, b.rating_count,
            b.shelf_count, b.review_count, b.category_id,
            bc.name AS categoryName
     FROM books b
     LEFT JOIN book_categories bc ON bc.id = b.category_id
     ${whereClause}
     ORDER BY b.created_at DESC
     LIMIT 20 OFFSET ?`,
    listParams
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM books b ${whereClause}`,
    countParams
  );

  return { list: rows.map(formatBook), total: Number(total) };
}

// ══════════════════════════════════════════════════════════���════════════════════
//  格式化辅助函数
// ═══════════════════════════════════════════════════════════════════════════════

function formatBook(b) {
  return {
    id:             b.id,
    title:          b.title,
    author:         b.author,
    isbn13:         b.isbn13 || null,
    coverUrl:       b.cover_url || null,
    publisher:      b.publisher || null,
    publishDate:    b.publish_date || null,
    pages:          b.pages || null,
    language:       b.language || null,
    description:    b.description || null,
    categoryId:     b.category_id || null,
    categoryName:   b.categoryName || null,
    platformRating: b.platform_rating ? Number(b.platform_rating) : null,
    ratingCount:    Number(b.rating_count)  || 0,
    shelfCount:     Number(b.shelf_count)   || 0,
    reviewCount:    Number(b.review_count)  || 0,
    tags:           b.tags    || [],
    myShelf:        b.myShelf || null,
  };
}

function formatShelfEntry(s) {
  return {
    bookId:          s.book_id,
    title:           s.title           || null,
    author:          s.author          || null,
    coverUrl:        s.cover_url       || null,
    pages:           s.pages           || null,
    platformRating:  s.platform_rating ? Number(s.platform_rating) : null,
    status:          s.status,
    rating:          s.rating          || null,
    shortComment:    s.short_comment   || null,
    startDate:       s.start_date      || null,
    finishDate:      s.finish_date     || null,
    readingProgress: s.reading_progress || null,
    totalPagesRef:   s.total_pages_ref  || null,
    shelfGroup:      s.shelf_group      || null,
    isPrivate:       s.is_private === 1,
    updatedAt:       s.updated_at,
  };
}

module.exports = {
  searchBooks,
  browseBooks,
  getBookById,
  getCategories,
  getBookTags,
  addBookTag,
  getShelf,
  addToShelf,
  updateShelfEntry,
  removeFromShelf,
  exportShelfCsv,
};
