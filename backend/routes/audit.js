/**
 * routes/audit.js — M6 · 内容审核路由
 * 包含：
 *   - internalAuditRouter：POST /internal/audit/text（供M3调用）
 *   - reportsRouter：POST /api/v1/reports（举报提交）
 *   - adminRouter：运营后台（违禁词管理、举报处理）
 */

const express = require('express');

const auditService = require('../services/auditService');
const { authMiddleware, requireAdmin } = require('../common/authMiddleware');
const { verifyInternalSecret } = require('../common/internalAuth');
const db = require('../common/db');

// ── 内部审核接口（M3 发帖前调用）────────────────────────────────
const internalAuditRouter = express.Router();

internalAuditRouter.post('/audit/text', async (req, res) => {
  if (!verifyInternalSecret(req, res)) return;

  const { content } = req.body;
  if (!content) {
    return res.json({ code: 200, message: '审核通过', data: { pass: true, keywords: [] }, timestamp: Date.now() });
  }

  try {
    const result = await auditService.auditText(content);
    return res.json({
      code:      200,
      message:   result.pass ? '审核通过' : '包含违禁词',
      data:      result,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[M6] 违禁词审核失败:', err);
    // 审核服务异常时放行（fail-open策略），避免阻断用户发帖
    return res.json({ code: 200, message: '审核通过（服务异常，已放行）', data: { pass: true, keywords: [] }, timestamp: Date.now() });
  }
});

// ── 举报提交路由 ──────────────────────────────────────────────
const reportsRouter = express.Router();

// GET /api/v1/reports — 获取举报列表（仅管理员）
reportsRouter.get('/', authMiddleware, requireAdmin, async (req, res) => {
  const { status = 0, page = 1, pageSize = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  try {
    const [rows] = await db.query(
      `SELECT r.*, u.username AS reporterName
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       WHERE r.status = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [status, parseInt(pageSize), offset]
    );
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM reports WHERE status = ?',
      [status]
    );
    res.paginate(rows, total, parseInt(page), parseInt(pageSize));
  } catch (err) {
    res.fail('获取举报列表失败', 500);
  }
});

// PUT /api/v1/reports/:id — 处理举报（仅管理员）
reportsRouter.put('/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { status, resultNote } = req.body;
  if (![1, 2].includes(Number(status))) return res.fail('处理状态无效', 400);

  try {
    await db.query(
      `UPDATE reports
       SET status = ?, result_note = ?, resolved_at = NOW()
       WHERE id = ?`,
      [status, resultNote || null, req.params.id]
    );
    res.ok({ message: '举报已处理' });
  } catch (err) {
    res.fail('处理举报失败', 500);
  }
});

// ── 违禁词管理路由 ─────────────────────────────────────────────
const keywordsRouter = express.Router();

// GET /api/v1/admin/keywords（仅管理员）
keywordsRouter.get('/', authMiddleware, requireAdmin, async (req, res) => {
  const list = await auditService.listKeywords();
  res.ok(list);
});

// POST /api/v1/admin/keywords（仅管理员）
keywordsRouter.post('/', authMiddleware, requireAdmin, async (req, res) => {
  const { keyword, level = 1 } = req.body;
  if (!keyword) return res.fail('关键词不能为空', 400);
  await auditService.addKeyword(keyword.trim(), level);
  res.created({ message: '违禁词已添加' });
});

// DELETE /api/v1/admin/keywords/:id（仅管理员）
keywordsRouter.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  await auditService.disableKeyword(req.params.id);
  res.ok({ message: '违禁词已停用' });
});

module.exports = { internalAuditRouter, reportsRouter, keywordsRouter };
