'use strict';

const express = require('express');
const router = express.Router();

const db = require('../common/db');
const { authMiddleware, requireAdmin } = require('../common/authMiddleware');

router.use(authMiddleware, requireAdmin);

// GET /api/v1/admin/overview
router.get('/overview', async (_req, res) => {
  try {
    const [[userStats]] = await db.query(
      `SELECT
         COUNT(*) AS totalUsers,
         SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS activeUsers,
         SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS adminUsers,
         SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS todayNewUsers
       FROM users`
    );
    const [[bookStats]] = await db.query(
      `SELECT
         COUNT(*) AS totalBooks,
         SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeBooks
       FROM books`
    );
    const [[postStats]] = await db.query(
      `SELECT
         COUNT(*) AS totalPosts,
         SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS todayNewPosts
       FROM posts
       WHERE is_deleted = 0`
    );
    const [[groupStats]] = await db.query(
      `SELECT
         COUNT(*) AS totalGroups,
         SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS activeGroups
       FROM book_groups`
    );
    const [[reportStats]] = await db.query(
      `SELECT
         SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS pendingReports,
         SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS validReports,
         SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS invalidReports
       FROM reports`
    );
    const [[keywordStats]] = await db.query(
      `SELECT COUNT(*) AS activeKeywords
       FROM banned_keywords
       WHERE is_active = 1`
    );
    const [recentUsers] = await db.query(
      `SELECT id, username, email, role, status, created_at AS createdAt
       FROM users
       ORDER BY created_at DESC
       LIMIT 5`
    );
    const [recentReports] = await db.query(
      `SELECT r.id, r.target_id AS targetId, r.target_type AS targetType, r.reason_type AS reasonType,
              r.status, r.created_at AS createdAt, u.username AS reporterName
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       ORDER BY r.created_at DESC
       LIMIT 5`
    );

    res.ok({
      stats: {
        ...userStats,
        ...bookStats,
        ...postStats,
        ...groupStats,
        ...reportStats,
        ...keywordStats,
      },
      recentUsers,
      recentReports,
    });
  } catch (err) {
    console.error('[admin/overview]', err);
    res.fail('获取后台概览失败', 500);
  }
});

// GET /api/v1/admin/users
router.get('/users', async (req, res) => {
  const {
    keyword = '',
    role = '',
    status = '',
    page = 1,
    pageSize = 20,
  } = req.query;

  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const size = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
  const offset = (currentPage - 1) * size;

  const where = ['1=1'];
  const params = [];

  if (keyword && String(keyword).trim()) {
    where.push('(u.username LIKE ? OR u.email LIKE ?)');
    const kw = `%${String(keyword).trim()}%`;
    params.push(kw, kw);
  }
  if (role && ['user', 'admin'].includes(String(role))) {
    where.push('u.role = ?');
    params.push(String(role));
  }
  if (status !== '' && [0, 1, 2].includes(Number(status))) {
    where.push('u.status = ?');
    params.push(Number(status));
  }

  try {
    const sqlWhere = where.join(' AND ');
    const [rows] = await db.query(
      `SELECT
         u.id,
         u.username,
         u.email,
         u.avatar_url AS avatarUrl,
         u.role,
         u.status,
         u.follower_count AS followerCount,
         u.following_count AS followingCount,
         u.post_count AS postCount,
         u.book_count AS bookCount,
         u.last_login_at AS lastLoginAt,
         u.created_at AS createdAt
       FROM users u
       WHERE ${sqlWhere}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, size, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM users u
       WHERE ${sqlWhere}`,
      params
    );

    res.paginate(rows, total, currentPage, size);
  } catch (err) {
    console.error('[admin/users]', err);
    res.fail('获取用户列表失败', 500);
  }
});

// PUT /api/v1/admin/users/:id
router.put('/users/:id', async (req, res) => {
  const userId = Number(req.params.id);
  const { role, status } = req.body;

  if (!userId) return res.fail('无效的用户 ID', 400);
  if (role === undefined && status === undefined) {
    return res.fail('至少需要提供 role 或 status', 400);
  }
  if (role !== undefined && !['user', 'admin'].includes(role)) {
    return res.fail('role 仅支持 user/admin', 400);
  }
  if (status !== undefined && ![0, 1, 2].includes(Number(status))) {
    return res.fail('status 仅支持 0/1/2', 400);
  }
  if (req.user.id === userId) {
    if (role && role !== 'admin') return res.fail('不能取消当前登录管理员自己的管理员身份', 400);
    if (status !== undefined && Number(status) !== 1) return res.fail('不能修改当前登录管理员自己的账号状态', 400);
  }

  try {
    const [exists] = await db.query('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!exists.length) return res.notFound('用户不存在');

    const fields = [];
    const params = [];

    if (role !== undefined) {
      fields.push('role = ?');
      params.push(role);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      params.push(Number(status));
    }
    fields.push('updated_at = NOW()');

    await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      [...params, userId]
    );

    const [[user]] = await db.query(
      `SELECT id, username, email, role, status, updated_at AS updatedAt
       FROM users
       WHERE id = ?`,
      [userId]
    );

    res.ok(user, '用户状态已更新');
  } catch (err) {
    console.error('[admin/users/:id]', err);
    res.fail('更新用户失败', 500);
  }
});

// GET /api/v1/admin/audit-logs
router.get('/audit-logs', async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const size = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
  const offset = (currentPage - 1) * size;

  try {
    const [rows] = await db.query(
      `SELECT
         l.id,
         l.content_id AS contentId,
         l.content_type AS contentType,
         l.audit_type AS auditType,
         l.result,
         l.reject_reason AS rejectReason,
         l.created_at AS createdAt,
         l.auditor_id AS auditorId,
         u.username AS auditorName
       FROM content_audit_logs l
       LEFT JOIN users u ON u.id = l.auditor_id
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [size, offset]
    );
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM content_audit_logs');
    res.paginate(rows, total, currentPage, size);
  } catch (err) {
    console.error('[admin/audit-logs]', err);
    res.fail('获取审核日志失败', 500);
  }
});

module.exports = router;
