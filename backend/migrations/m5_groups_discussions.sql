-- ============================================================
-- M5 · 小组 & 书籍讨论  数据库迁移脚本
-- 执行前提：schema.sql 已执行（book_groups / group_members / group_posts /
--           reading_challenges / challenge_participants 已存在基础表）
-- 本脚本补充：
--   1. book_discussions 表（若schema.sql中未建齐字段则ALTER）
--   2. discussion_comments 表（schema.sql中未定义）
--   3. group_posts 表补充 like_count / comment_count / is_deleted 字段（若缺少）
--   4. challenge_participants 表补充 note / current_pages 字段
--   5. likes.target_type 扩展说明注释（type=5=讨论, type=6=小组帖子, type=7=讨论评论）
-- ============================================================

USE booksocial;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. book_discussions 表（完整版）
-- schema.sql 可能只有基础字段，这里用 CREATE TABLE IF NOT EXISTS 确保完整
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `book_discussions` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `book_id`       BIGINT UNSIGNED NOT NULL COMMENT '关联书籍',
  `user_id`       BIGINT UNSIGNED NOT NULL COMMENT '发帖人',
  `title`         VARCHAR(200)    NOT NULL COMMENT '标题',
  `content`       TEXT            NOT NULL COMMENT '正文',
  `category`      TINYINT         NOT NULL DEFAULT 0
                  COMMENT '分类：0-综合，1-书评，2-剧情，3-推荐，4-求助',
  `has_spoiler`   TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '含剧透标记',
  `like_count`    INT             NOT NULL DEFAULT 0,
  `comment_count` INT             NOT NULL DEFAULT 0,
  `view_count`    INT             NOT NULL DEFAULT 0,
  `is_deleted`    TINYINT(1)      NOT NULL DEFAULT 0,
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_book_category`  (`book_id`, `category`, `created_at` DESC),
  INDEX `idx_book_hot`       (`book_id`, `like_count` DESC, `comment_count` DESC),
  INDEX `idx_user_id`        (`user_id`, `created_at` DESC),
  CONSTRAINT `fk_disc_book`  FOREIGN KEY (`book_id`)  REFERENCES `books`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_disc_user`  FOREIGN KEY (`user_id`)  REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='书籍讨论帖';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. discussion_comments 表（schema.sql 中未定义，M5 新增）
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `discussion_comments` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `disc_id`           BIGINT UNSIGNED NOT NULL COMMENT '所属讨论帖',
  `user_id`           BIGINT UNSIGNED NOT NULL COMMENT '评论人',
  `content`           VARCHAR(1000)   NOT NULL COMMENT '评论内容（最多1000字）',
  `parent_id`         BIGINT UNSIGNED          DEFAULT NULL COMMENT '父评论ID（回复时填写）',
  `reply_to_user_id`  BIGINT UNSIGNED          DEFAULT NULL COMMENT '被回复用户ID',
  `like_count`        INT             NOT NULL DEFAULT 0,
  `is_deleted`        TINYINT(1)      NOT NULL DEFAULT 0,
  `created_at`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_disc_created`  (`disc_id`, `created_at` ASC),
  INDEX `idx_parent_id`     (`parent_id`),
  INDEX `idx_user_id`       (`user_id`),
  CONSTRAINT `fk_dc_disc`   FOREIGN KEY (`disc_id`)          REFERENCES `book_discussions`(`id`)   ON DELETE CASCADE,
  CONSTRAINT `fk_dc_user`   FOREIGN KEY (`user_id`)          REFERENCES `users`(`id`)              ON DELETE CASCADE,
  CONSTRAINT `fk_dc_parent` FOREIGN KEY (`parent_id`)        REFERENCES `discussion_comments`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dc_reply`  FOREIGN KEY (`reply_to_user_id`) REFERENCES `users`(`id`)              ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='书籍讨论评论';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. group_posts 表补充字段（schema.sql 可能缺少以下字段）
-- ─────────────────────────────────────────────────────────────────────────────
-- 若 schema.sql 中 group_posts 已有这些字段则下面的 ALTER 会报错，可忽略
ALTER TABLE `group_posts`
  ADD COLUMN IF NOT EXISTS `like_count`    INT       NOT NULL DEFAULT 0  AFTER `content`,
  ADD COLUMN IF NOT EXISTS `comment_count` INT       NOT NULL DEFAULT 0  AFTER `like_count`,
  ADD COLUMN IF NOT EXISTS `is_deleted`    TINYINT(1) NOT NULL DEFAULT 0 AFTER `comment_count`,
  ADD COLUMN IF NOT EXISTS `updated_at`   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. challenge_participants 表补充字段
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE `challenge_participants`
  ADD COLUMN IF NOT EXISTS `note`          VARCHAR(500) DEFAULT NULL     COMMENT '打卡笔记',
  ADD COLUMN IF NOT EXISTS `current_pages` SMALLINT     DEFAULT NULL     COMMENT '当前读到页数',
  ADD COLUMN IF NOT EXISTS `checkin_count` INT NOT NULL DEFAULT 0        COMMENT '累计打卡次数',
  ADD COLUMN IF NOT EXISTS `last_checkin_at` DATETIME   DEFAULT NULL     COMMENT '最后打卡时间',
  ADD COLUMN IF NOT EXISTS `joined_at`     DATETIME     DEFAULT CURRENT_TIMESTAMP;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. group_members 支持 role=-1 的 pending 状态
--    （MySQL TINYINT 本身支持负数，无需 DDL 变更，此处仅作说明注释）
-- role: -1=待审核申请, 0=普通成员, 1=管理员, 2=组长
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. likes.target_type 扩展说明（无需 DDL，仅文档化约定）
-- ─────────────────────────────────────────────────────────────────────────────
-- 现有约定（来自 M3）:
--   1=动态(posts)  2=评论(comments)  3=阅读笔记  4=书评
-- M5 新增:
--   5=书籍讨论帖(book_discussions)
--   6=小组帖子(group_posts)
--   7=讨论评论(discussion_comments)

-- ─────────────────────────────────────────────────────────────────────────────
-- 验证语句
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 'M5 migration applied successfully' AS status;
SELECT TABLE_NAME, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'booksocial'
  AND TABLE_NAME IN (
    'book_groups', 'group_members', 'group_posts',
    'reading_challenges', 'challenge_participants',
    'book_discussions', 'discussion_comments'
  )
ORDER BY TABLE_NAME;
