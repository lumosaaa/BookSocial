-- ============================================================
-- M7 · 公版书在线阅读器 · 数据库迁移脚本
-- 执行命令：mysql -u root -p booksocial < backend/migrations/m7_public_domain_reader.sql
-- ============================================================

USE booksocial;

ALTER TABLE `books`
  ADD COLUMN `reader_available` TINYINT NOT NULL DEFAULT 0 COMMENT '是否支持在线阅读：1-支持，0-不支持' AFTER `fetched_at`,
  ADD COLUMN `reader_source` VARCHAR(50) DEFAULT NULL COMMENT '在线阅读来源（如 gutenberg）' AFTER `reader_available`,
  ADD COLUMN `reader_source_url` VARCHAR(500) DEFAULT NULL COMMENT '在线阅读来源页 URL' AFTER `reader_source`,
  ADD COLUMN `reader_license_note` VARCHAR(255) DEFAULT NULL COMMENT '在线阅读版权说明' AFTER `reader_source_url`,
  ADD COLUMN `reader_page_count` SMALLINT UNSIGNED DEFAULT NULL COMMENT '阅读器规范总页数' AFTER `reader_license_note`;

CREATE TABLE IF NOT EXISTS `book_chapters` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `book_id`       BIGINT UNSIGNED NOT NULL COMMENT 'books.id',
  `chapter_index` SMALLINT UNSIGNED NOT NULL COMMENT '章节顺序，从1开始',
  `title`         VARCHAR(255)    NOT NULL COMMENT '章节标题',
  `content`       MEDIUMTEXT      NOT NULL COMMENT '章节纯文本正文',
  `char_count`    INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '字符数',
  `word_count`    INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '单词数',
  `page_start`    SMALLINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '规范分页起始页',
  `page_count`    SMALLINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '规范分页页数',
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_book_chapter_index` (`book_id`, `chapter_index`),
  KEY `idx_book_page_start` (`book_id`, `page_start`),
  CONSTRAINT `fk_book_chapters_book` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='书籍章节正文表';

ALTER TABLE `reading_progress`
  ADD COLUMN `chapter_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'book_chapters.id' AFTER `shelf_id`,
  ADD COLUMN `chapter_progress` DECIMAL(6,4) DEFAULT NULL COMMENT '章节内进度（0.0000-1.0000）' AFTER `percent`;

CREATE INDEX `idx_user_book_created` ON `reading_progress` (`user_id`, `book_id`, `created_at` DESC);
CREATE INDEX `idx_chapter_id` ON `reading_progress` (`chapter_id`);
ALTER TABLE `reading_progress`
  ADD CONSTRAINT `fk_progress_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `book_chapters`(`id`) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS `reader_bookmarks` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL COMMENT 'users.id',
  `book_id`          BIGINT UNSIGNED NOT NULL COMMENT 'books.id',
  `chapter_id`       BIGINT UNSIGNED NOT NULL COMMENT 'book_chapters.id',
  `chapter_progress` DECIMAL(6,4)    NOT NULL DEFAULT 0.0000 COMMENT '章节内进度（0.0000-1.0000）',
  `page`             SMALLINT UNSIGNED DEFAULT NULL COMMENT '规范页码',
  `percent`          DECIMAL(5,2)    DEFAULT NULL COMMENT '全书进度百分比',
  `quote`            VARCHAR(500)    DEFAULT NULL COMMENT '书签摘录',
  `note`             VARCHAR(200)    DEFAULT NULL COMMENT '书签备注',
  `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reader_bookmarks_user_book` (`user_id`, `book_id`, `created_at` DESC),
  KEY `idx_reader_bookmarks_chapter` (`chapter_id`),
  CONSTRAINT `fk_reader_bookmarks_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reader_bookmarks_book` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reader_bookmarks_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `book_chapters`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='在线阅读书签表';

SELECT 'M7 迁移完成' AS status;
