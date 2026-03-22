/**
 * auditService.js — M6 · 内容审核服务
 * 功能：同步违禁词过滤 + 审核日志写入
 */

const db = require('../common/db');

// ── 内存违禁词缓存（启动时加载，每小时刷新）──────────────────────
let _keywords = [];
let _lastLoad = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 小时

async function loadKeywords() {
  const now = Date.now();
  if (_keywords.length > 0 && now - _lastLoad < CACHE_TTL) return _keywords;
  const [rows] = await db.query(
    'SELECT keyword, level FROM banned_keywords WHERE is_active = 1'
  );
  _keywords = rows;
  _lastLoad = now;
  return _keywords;
}

/**
 * 违禁词过滤
 * @param {string} content
 * @returns {{ pass: boolean, keywords: string[] }}
 */
async function auditText(content) {
  if (!content || typeof content !== 'string') return { pass: true, keywords: [] };

  const keywords = await loadKeywords();
  const hits = [];

  for (const { keyword, level } of keywords) {
    if (content.includes(keyword)) {
      hits.push({ keyword, level });
    }
  }

  // level=2 的词直接拦截，level=1 只标记警告但仍通过
  const blocking = hits.filter(h => h.level === 2);
  return {
    pass:     blocking.length === 0,
    keywords: hits.map(h => h.keyword),
  };
}

/**
 * 写入审核日志
 * @param {{ contentId, contentType, auditType, result, rejectReason?, auditorId? }} opts
 */
async function logAudit({ contentId, contentType, auditType, result, rejectReason = null, auditorId = null }) {
  await db.query(
    `INSERT INTO content_audit_logs
       (content_id, content_type, audit_type, result, reject_reason, auditor_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [contentId, contentType, auditType, result, rejectReason, auditorId]
  );
}

/**
 * 添加违禁词（运营后台使用）
 * @param {string} keyword
 * @param {number} level
 */
async function addKeyword(keyword, level = 1) {
  await db.query(
    'INSERT IGNORE INTO banned_keywords (keyword, level) VALUES (?, ?)',
    [keyword, level]
  );
  // 强制刷新缓存
  _lastLoad = 0;
}

/**
 * 列出所有违禁词（运营后台使用）
 */
async function listKeywords() {
  const [rows] = await db.query(
    'SELECT id, keyword, level, is_active, created_at FROM banned_keywords ORDER BY level DESC, created_at DESC'
  );
  return rows;
}

/**
 * 删除/停用违禁词
 */
async function disableKeyword(id) {
  await db.query('UPDATE banned_keywords SET is_active = 0 WHERE id = ?', [id]);
  _lastLoad = 0;
}

module.exports = { auditText, logAudit, addKeyword, listKeywords, disableKeyword };
