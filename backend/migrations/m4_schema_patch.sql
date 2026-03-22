-- ============================================================
-- M4 补丁：补充 schema.sql 中 M4 表缺失的列
-- 执行前提：schema.sql 已执行
-- 执行方式：mysql -u root -p booksocial < backend/migrations/m4_schema_patch.sql
-- 注意：MySQL 8.0 不支持 ADD COLUMN IF NOT EXISTS，
--       如果列已存在会报错，可忽略
-- ============================================================

USE booksocial;

-- ── conversations 表补充列 ──────────────────────────────────
ALTER TABLE `conversations`
  ADD COLUMN `is_blocked`  TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否已拉黑：1-是' AFTER `user2_unread`,
  ADD COLUMN `blocked_by`  BIGINT UNSIGNED  DEFAULT NULL COMMENT '发起拉黑的用户ID' AFTER `is_blocked`,
  ADD COLUMN `updated_at`  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ── messages 表补充列 ───────────────────────────────────────
ALTER TABLE `messages`
  ADD COLUMN `ref_book_id` BIGINT UNSIGNED  DEFAULT NULL COMMENT '分享书籍ID（msg_type=2时）' AFTER `msg_type`,
  ADD COLUMN `recalled_at` DATETIME         DEFAULT NULL COMMENT '撤回时间' AFTER `is_recalled`,
  ADD COLUMN `read_at`     DATETIME         DEFAULT NULL COMMENT '已读时间' AFTER `is_read`;

-- ── notifications 表补充列 ──────────────────────────────────
ALTER TABLE `notifications`
  ADD COLUMN `read_at`     DATETIME         DEFAULT NULL COMMENT '已读时间' AFTER `is_read`;

SELECT 'M4 schema patch applied' AS status;
