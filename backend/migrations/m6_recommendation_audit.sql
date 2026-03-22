-- ============================================================
-- M6 · 推荐系统 & 运营 · 数据库迁移脚本
-- 执行命令：mysql -u root -p booksocial < backend/migrations/m6_recommendation_audit.sql
-- ============================================================

USE booksocial;

-- ── 违禁词表 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `banned_keywords` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `keyword`    VARCHAR(100) NOT NULL COMMENT '违禁词',
  `level`      TINYINT NOT NULL DEFAULT 1 COMMENT '风险级别：1-警告，2-拦截',
  `is_active`  TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用：1-启用，0-停用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_keyword` (`keyword`),
  KEY `idx_active` (`is_active`, `level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='违禁词表';

-- ── 初始违禁词样本 ─────────────────────────────────────────────
INSERT IGNORE INTO `banned_keywords` (keyword, level) VALUES
  ('垃圾', 1), ('骗子', 1), ('傻瓜', 1),
  ('涉黄', 2), ('赌博', 2), ('诈骗', 2), ('传销', 2);

-- ── recommendation_cache（schema.sql 已定义，确保不重建）────────
-- CREATE TABLE IF NOT EXISTS `recommendation_cache` 已在 schema.sql 中

-- ── user_behavior_logs（schema.sql 已定义）─────────────────────
-- CREATE TABLE IF NOT EXISTS `user_behavior_logs` 已在 schema.sql 中

-- ── user_interest_profiles（schema.sql 已定义）────────────────
-- CREATE TABLE IF NOT EXISTS `user_interest_profiles` 已在 schema.sql 中

-- ── reports（schema.sql 已定义）──────────────────────────────
-- CREATE TABLE IF NOT EXISTS `reports` 已在 schema.sql 中

-- ── content_audit_logs（schema.sql 已定义）────────────────────
-- CREATE TABLE IF NOT EXISTS `content_audit_logs` 已在 schema.sql 中

SELECT 'M6 迁移完成' AS status;
