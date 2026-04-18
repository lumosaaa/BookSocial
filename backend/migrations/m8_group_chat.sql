-- m8_group_chat.sql
-- 小组群聊 MVP：一个小组对应一个群聊会话，成员共用
-- 本次不做 unread / 已读回执表，后续按需扩展
-- 注意：外键名需在整个数据库范围内唯一，因此这里统一使用 m8_gc_* 前缀

CREATE TABLE IF NOT EXISTS `group_conversations` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `group_id`   BIGINT UNSIGNED NOT NULL UNIQUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_m8_gc_group_conversations_group` FOREIGN KEY (`group_id`) REFERENCES `book_groups`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `group_messages` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `gc_id`        BIGINT UNSIGNED NOT NULL,
  `group_id`     BIGINT UNSIGNED NOT NULL,
  `sender_id`    BIGINT UNSIGNED NOT NULL,
  `content`      TEXT NOT NULL,
  `msg_type`     TINYINT NOT NULL DEFAULT 0, -- 0 文本 1 图片 2 书籍分享
  `ref_book_id`  BIGINT UNSIGNED NULL,
  `is_recalled`  TINYINT(1) NOT NULL DEFAULT 0,
  `recalled_at`  DATETIME NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_gm_gc_created` (`gc_id`, `created_at`),
  KEY `idx_gm_group_created` (`group_id`, `created_at`),
  CONSTRAINT `fk_m8_gc_group_messages_conv`   FOREIGN KEY (`gc_id`) REFERENCES `group_conversations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_m8_gc_group_messages_group`  FOREIGN KEY (`group_id`) REFERENCES `book_groups`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_m8_gc_group_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
