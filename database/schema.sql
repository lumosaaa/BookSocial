-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  BookSocial 数据库 DDL                                               ║
-- ║  版本：V1.0 | 数据库：MySQL 8.0 | 字符集：utf8mb4_unicode_ci         ║
-- ║  模块0 负责建表，各模块负责对应表的业务维护                            ║
-- ║  执行顺序：此文件顺序执行即可，外键依赖已按序排列                      ║
-- ╚══════════════════════════════════════════════════════════════════════╝

CREATE DATABASE IF NOT EXISTS `booksocial`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `booksocial`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;  -- 建表期间关闭外键检查，建完后开启

-- ═══════════════════════════════════════════════════════════════════════
-- 模块1 · 用户认证 & 个人档案
-- ═══════════════════════════════════════════════════════════════════════

-- 1. 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id`                BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT     COMMENT '用户唯一ID，自增主键',
  `username`          VARCHAR(50)      NOT NULL                    COMMENT '用户昵称，全局唯一，2-50字符',
  `phone`             VARCHAR(20)      DEFAULT NULL                COMMENT '手机号，AES加密存储',
  `email`             VARCHAR(100)     DEFAULT NULL                COMMENT '邮箱地址',
  `password_hash`     VARCHAR(255)     DEFAULT NULL                COMMENT 'bcrypt哈希密码（Google用户为NULL）',
  `google_id`         VARCHAR(100)     DEFAULT NULL                COMMENT 'Google OAuth sub字段',
  `avatar_url`        VARCHAR(500)     DEFAULT NULL                COMMENT '头像URL（Cloudinary链接）',
  `bio`               VARCHAR(200)     DEFAULT NULL                COMMENT '个人签名，最多200字',
  `gender`            TINYINT          DEFAULT NULL                COMMENT '性别：0-未知，1-男，2-女',
  `city`              VARCHAR(50)      DEFAULT NULL                COMMENT '所在城市',
  `cover_image`       VARCHAR(500)     DEFAULT NULL                COMMENT '个人主页背景图URL',
  `reading_goal`      SMALLINT UNSIGNED DEFAULT NULL              COMMENT '年度阅读目标（本数）',
  `book_count`        INT UNSIGNED     NOT NULL DEFAULT 0          COMMENT '已读书籍总数（冗余计数）',
  `follower_count`    INT UNSIGNED     NOT NULL DEFAULT 0          COMMENT '粉丝数（冗余计数）',
  `following_count`   INT UNSIGNED     NOT NULL DEFAULT 0          COMMENT '关注数（冗余计数）',
  `post_count`        INT UNSIGNED     NOT NULL DEFAULT 0          COMMENT '发帖总数（冗余计数）',
  `status`            TINYINT          NOT NULL DEFAULT 1          COMMENT '账户状态：0-禁用，1-正常，2-封禁',
  `last_login_at`     DATETIME         DEFAULT NULL                COMMENT '最后登录时间（UTC）',
  `login_fail_count`  TINYINT UNSIGNED NOT NULL DEFAULT 0          COMMENT '连续登录失败次数，>=5触发锁定',
  `locked_until`      DATETIME         DEFAULT NULL                COMMENT '账号锁定截止时间（UTC）',
  `created_at`        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP       COMMENT '注册时间（UTC）',
  `updated_at`        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username`  (`username`),
  UNIQUE KEY `uk_email`     (`email`),
  UNIQUE KEY `uk_phone`     (`phone`),
  UNIQUE KEY `uk_google_id` (`google_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status`     (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户基础信息表';

-- 2. 用户隐私设置表
CREATE TABLE IF NOT EXISTS `user_privacy_settings` (
  `id`                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`                 BIGINT UNSIGNED NOT NULL                COMMENT 'users.id，1:1关联',
  `profile_visible`         TINYINT         NOT NULL DEFAULT 0      COMMENT '主页可见：0-所有人，1-关注者，2-仅自己',
  `shelf_visible`           TINYINT         NOT NULL DEFAULT 0      COMMENT '书架可见：0-所有人，1-关注者，2-仅自己',
  `notes_visible`           TINYINT         NOT NULL DEFAULT 0      COMMENT '笔记可见：0-所有人，1-关注者，2-仅自己',
  `searchable`              TINYINT         NOT NULL DEFAULT 1      COMMENT '可被搜索：1-是，0-否',
  `message_permission`      TINYINT         NOT NULL DEFAULT 0      COMMENT '接收私信：0-所有人，1-关注者，2-关闭',
  `allow_recommendation`    TINYINT         NOT NULL DEFAULT 1      COMMENT '兴趣画像用于推荐：1-同意，0-拒绝',
  `show_in_discovery`       TINYINT         NOT NULL DEFAULT 1      COMMENT '出现在书友推荐：1-是，0-否',
  `allow_behavior_analysis` TINYINT         NOT NULL DEFAULT 1      COMMENT '行为数据分析授权：1-同意，0-拒绝',
  `updated_at`              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  CONSTRAINT `fk_privacy_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户隐私设置详细配置表';

-- 3. 用户阅读偏好标签关联表
CREATE TABLE IF NOT EXISTS `user_reading_preferences` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL  COMMENT 'users.id',
  `category_id` TINYINT UNSIGNED NOT NULL COMMENT 'book_categories.id',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_category` (`user_id`, `category_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户阅读偏好标签关联表';

-- ═══════════════════════════════════════════════════════════════════════
-- 模块2 · 书籍 & 书架
-- ═══════════════════════════════════════════════════════════════════════

-- 4. 书籍分类表（先于 books 建立，books 有外键引用）
CREATE TABLE IF NOT EXISTS `book_categories` (
  `id`         TINYINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '分类ID（最多255个大类）',
  `name`       VARCHAR(50)      NOT NULL                COMMENT '分类名称',
  `icon`       VARCHAR(100)     DEFAULT NULL            COMMENT '分类图标（emoji或图标类名）',
  `sort_order` TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '排序权重，越小越靠前',
  `is_active`  TINYINT          NOT NULL DEFAULT 1      COMMENT '是否启用',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='书籍大类表';

-- 5. 书籍基础信息表
CREATE TABLE IF NOT EXISTS `books` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT  COMMENT '书籍唯一ID',
  `isbn10`          VARCHAR(13)     DEFAULT NULL             COMMENT 'ISBN-10（可空）',
  `isbn13`          VARCHAR(14)     DEFAULT NULL             COMMENT 'ISBN-13（主要唯一标识）',
  `ol_key`          VARCHAR(50)     DEFAULT NULL             COMMENT 'Open Library Key',
  `google_books_id` VARCHAR(50)     DEFAULT NULL             COMMENT 'Google Books ID',
  `title`           VARCHAR(300)    NOT NULL                 COMMENT '书名（含副标题）',
  `original_title`  VARCHAR(300)    DEFAULT NULL             COMMENT '原书名（外文书籍）',
  `author`          VARCHAR(500)    NOT NULL                 COMMENT '作者名，多作者用"|"分隔',
  `translator`      VARCHAR(200)    DEFAULT NULL             COMMENT '译者',
  `publisher`       VARCHAR(200)    DEFAULT NULL             COMMENT '出版社',
  `publish_date`    DATE            DEFAULT NULL             COMMENT '出版日期',
  `pages`           SMALLINT UNSIGNED DEFAULT NULL           COMMENT '页数',
  `language`        VARCHAR(10)     DEFAULT NULL             COMMENT '语言代码（zh/en/ja等）',
  `cover_url`       VARCHAR(500)    DEFAULT NULL             COMMENT '封面图URL（第三方CDN）',
  `description`     TEXT            DEFAULT NULL             COMMENT '书籍简介（最长5000字）',
  `category_id`     TINYINT UNSIGNED DEFAULT NULL            COMMENT 'book_categories.id，书籍大类',
  `platform_rating` DECIMAL(3,2)    DEFAULT NULL             COMMENT '本平台综合评分（1.00-5.00）',
  `rating_count`    INT UNSIGNED    NOT NULL DEFAULT 0       COMMENT '平台评分人数（冗余计数）',
  `shelf_count`     INT UNSIGNED    NOT NULL DEFAULT 0       COMMENT '加入书架总次数（冗余计数）',
  `review_count`    INT UNSIGNED    NOT NULL DEFAULT 0       COMMENT '书评数量（冗余计数）',
  `is_active`       TINYINT         NOT NULL DEFAULT 1       COMMENT '是否上架：1-正常，0-已下架',
  `fetched_at`      DATETIME        DEFAULT NULL             COMMENT '最后从第三方API同步时间',
  `reader_available` TINYINT        NOT NULL DEFAULT 0       COMMENT '是否支持在线阅读：1-支持，0-不支持',
  `reader_source`   VARCHAR(50)     DEFAULT NULL             COMMENT '在线阅读来源（如 gutenberg）',
  `reader_source_url` VARCHAR(500)  DEFAULT NULL             COMMENT '在线阅读来源页 URL',
  `reader_license_note` VARCHAR(255) DEFAULT NULL            COMMENT '在线阅读版权说明',
  `reader_page_count` SMALLINT UNSIGNED DEFAULT NULL         COMMENT '阅读器规范总页数',
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_isbn13`        (`isbn13`),
  UNIQUE KEY `uk_ol_key`        (`ol_key`),
  UNIQUE KEY `uk_google_books`  (`google_books_id`),
  KEY `idx_title`          (`title`(100)),
  KEY `idx_author`         (`author`(100)),
  KEY `idx_category_id`    (`category_id`),
  KEY `idx_platform_rating`(`platform_rating` DESC),
  KEY `idx_shelf_count`    (`shelf_count` DESC),
  FULLTEXT KEY `ft_title_author` (`title`, `author`),
  CONSTRAINT `fk_books_category` FOREIGN KEY (`category_id`) REFERENCES `book_categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='书籍基础信息表';

-- 6. 通用标签表
CREATE TABLE IF NOT EXISTS `tags` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '标签ID',
  `name`        VARCHAR(50)   NOT NULL                COMMENT '标签名称（全局唯一）',
  `category`    TINYINT       NOT NULL DEFAULT 0      COMMENT '标签类型：0-通用，1-书籍专属，2-情感类，3-场景类',
  `usage_count` INT UNSIGNED  NOT NULL DEFAULT 0      COMMENT '使用次数（冗余计数，用于热门标签排序）',
  `is_official` TINYINT       NOT NULL DEFAULT 0      COMMENT '是否官方标签：1-是',
  `created_by`  BIGINT UNSIGNED DEFAULT NULL          COMMENT 'users.id，创建者（NULL为系统创建）',
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name`       (`name`),
  KEY `idx_usage_count` (`usage_count` DESC),
  KEY `idx_category`    (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通用标签表';

-- 7. 书籍标签关联表
CREATE TABLE IF NOT EXISTS `book_tags` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `book_id`    BIGINT UNSIGNED NOT NULL  COMMENT 'books.id',
  `tag_id`     INT UNSIGNED    NOT NULL  COMMENT 'tags.id',
  `user_id`    BIGINT UNSIGNED DEFAULT NULL COMMENT 'users.id，打标签的用户（NULL为系统标签）',
  `count`      INT UNSIGNED    NOT NULL DEFAULT 1 COMMENT '该标签在该书上被使用的次数',
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_book_tag` (`book_id`, `tag_id`),
  KEY `idx_book_id` (`book_id`),
  KEY `idx_tag_id`  (`tag_id`),
  CONSTRAINT `fk_book_tags_book` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_book_tags_tag`  FOREIGN KEY (`tag_id`)  REFERENCES `tags`(`id`)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='书籍与标签多对多关联表';

-- 8. 用户书架表
CREATE TABLE IF NOT EXISTS `user_shelves` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `user_id`          BIGINT UNSIGNED NOT NULL  COMMENT 'users.id',
  `book_id`          BIGINT UNSIGNED NOT NULL  COMMENT 'books.id',
  `status`           TINYINT         NOT NULL  COMMENT '阅读状态：1-想读，2-在读，3-已读',
  `rating`           TINYINT         DEFAULT NULL COMMENT '用户评分（1-10，对应0.5-5星）',
  `short_comment`    VARCHAR(200)    DEFAULT NULL COMMENT '一句话短评',
  `start_date`       DATE            DEFAULT NULL COMMENT '开始阅读日期',
  `finish_date`      DATE            DEFAULT NULL COMMENT '完成阅读日期',
  `reading_progress` SMALLINT UNSIGNED DEFAULT NULL COMMENT '当前阅读进度（页数）',
  `total_pages_ref`  SMALLINT UNSIGNED DEFAULT NULL COMMENT '该书总页数快照',
  `shelf_group`      VARCHAR(50)     DEFAULT NULL  COMMENT '用户自定义分组名称',
  `is_private`       TINYINT         NOT NULL DEFAULT 0 COMMENT '是否私密：1-仅自己可见',
  `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入书架时间',
  `updated_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_book`   (`user_id`, `book_id`),
  KEY `idx_user_status`  (`user_id`, `status`),
  KEY `idx_book_status`  (`book_id`, `status`),
  KEY `idx_updated_at`   (`updated_at`),
  CONSTRAINT `fk_shelves_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shelves_book` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户书架记录表';

-- 10. 阅读章节表
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

-- 11. 阅读进度详细记录表
CREATE TABLE IF NOT EXISTS `reading_progress` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT UNSIGNED NOT NULL  COMMENT 'users.id',
  `book_id`      BIGINT UNSIGNED NOT NULL  COMMENT 'books.id',
  `shelf_id`     BIGINT UNSIGNED NOT NULL  COMMENT 'user_shelves.id',
  `chapter_id`   BIGINT UNSIGNED DEFAULT NULL COMMENT 'book_chapters.id',
  `page`         SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '阅读到第几页',
  `percent`      DECIMAL(5,2)    DEFAULT NULL COMMENT '阅读百分比（0.00-100.00）',
  `chapter_progress` DECIMAL(6,4) DEFAULT NULL COMMENT '章节内进度（0.0000-1.0000）',
  `note`         VARCHAR(200)    DEFAULT NULL COMMENT '进度备注',
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_book` (`user_id`, `book_id`),
  KEY `idx_shelf_id`  (`shelf_id`),
  KEY `idx_user_book_created` (`user_id`, `book_id`, `created_at` DESC),
  KEY `idx_chapter_id` (`chapter_id`),
  CONSTRAINT `fk_progress_shelf` FOREIGN KEY (`shelf_id`) REFERENCES `user_shelves`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_progress_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `book_chapters`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='阅读进度详细记录表';

-- 12. 阅读书签表
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

-- ═══════════════════════════════════════════════════════════════════════
-- 模块3 · 社交动态 & 互动
-- ═══════════════════════════════════════════════════════════════════════

-- 10. 动态帖子表
CREATE TABLE IF NOT EXISTS `posts` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT  COMMENT '帖子ID',
  `user_id`        BIGINT UNSIGNED NOT NULL                 COMMENT 'users.id，发帖人',
  `content`        TEXT            NOT NULL                 COMMENT '帖子文本内容（最大10000字符）',
  `post_type`      TINYINT         NOT NULL DEFAULT 0       COMMENT '类型：0-普通，1-书评，2-阅读笔记，3-书单，4-进度更新',
  `book_id`        BIGINT UNSIGNED DEFAULT NULL             COMMENT 'books.id，关联书籍',
  `book_list`      JSON            DEFAULT NULL             COMMENT '书单类型：JSON数组存储书籍ID',
  `rating`         TINYINT         DEFAULT NULL             COMMENT '书评评分（1-10）',
  `visibility`     TINYINT         NOT NULL DEFAULT 0       COMMENT '可见性：0-所有人，1-仅关注者，2-仅自己',
  `has_spoiler`    TINYINT         NOT NULL DEFAULT 0       COMMENT '含剧透标记：1-是',
  `image_count`    TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '图片数量（最多9张）',
  `like_count`     INT UNSIGNED    NOT NULL DEFAULT 0       COMMENT '点赞数（冗余计数）',
  `comment_count`  INT UNSIGNED    NOT NULL DEFAULT 0       COMMENT '评论数（冗余计数）',
  `bookmark_count` INT UNSIGNED    NOT NULL DEFAULT 0       COMMENT '收藏数（冗余计数）',
  `share_count`    INT UNSIGNED    NOT NULL DEFAULT 0       COMMENT '转发数（冗余计数）',
  `origin_post_id` BIGINT UNSIGNED DEFAULT NULL             COMMENT '转发的原帖ID（自引用）',
  `is_deleted`     TINYINT         NOT NULL DEFAULT 0       COMMENT '软删除标记：1-已删除',
  `delete_reason`  TINYINT         DEFAULT NULL             COMMENT '删除原因：0-用户主动，1-违规处理',
  `audit_status`   TINYINT         NOT NULL DEFAULT 1       COMMENT '审核状态：0-待审，1-通过，2-拒绝',
  `created_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_created`      (`user_id`, `created_at` DESC),
  KEY `idx_book_created`      (`book_id`, `created_at` DESC),
  KEY `idx_created_at`        (`created_at` DESC),
  KEY `idx_visibility_audit`  (`visibility`, `audit_status`, `is_deleted`),
  CONSTRAINT `fk_posts_user`        FOREIGN KEY (`user_id`)        REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_posts_book`        FOREIGN KEY (`book_id`)        REFERENCES `books`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_posts_origin_post` FOREIGN KEY (`origin_post_id`) REFERENCES `posts`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='动态/帖子表';

-- 11. 帖子图片表
CREATE TABLE IF NOT EXISTS `post_images` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id`       BIGINT UNSIGNED NOT NULL  COMMENT 'posts.id',
  `url`           VARCHAR(500)    NOT NULL  COMMENT '图片Cloudinary完整URL',
  `thumbnail_url` VARCHAR(500)    DEFAULT NULL COMMENT '压缩版缩略图URL',
  `width`         SMALLINT UNSIGNED DEFAULT NULL,
  `height`        SMALLINT UNSIGNED DEFAULT NULL,
  `sort_order`    TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '图片排序（0-8）',
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post_id` (`post_id`, `sort_order`),
  CONSTRAINT `fk_post_images_post` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='动态图片表';

-- 12. 阅读笔记表
CREATE TABLE IF NOT EXISTS `reading_notes` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '笔记ID',
  `user_id`       BIGINT UNSIGNED NOT NULL  COMMENT 'users.id',
  `book_id`       BIGINT UNSIGNED NOT NULL  COMMENT 'books.id',
  `title`         VARCHAR(200)    DEFAULT NULL COMMENT '笔记标题',
  `content`       MEDIUMTEXT      NOT NULL     COMMENT '笔记正文（支持Markdown，最大50000字符）',
  `quote`         TEXT            DEFAULT NULL COMMENT '书中摘录原文',
  `page_number`   SMALLINT UNSIGNED DEFAULT NULL COMMENT '摘录页码',
  `chapter`       VARCHAR(100)    DEFAULT NULL COMMENT '章节信息',
  `is_public`     TINYINT         NOT NULL DEFAULT 1 COMMENT '是否公开：1-公开，0-私密',
  `like_count`    INT UNSIGNED    NOT NULL DEFAULT 0,
  `comment_count` INT UNSIGNED    NOT NULL DEFAULT 0,
  `is_deleted`    TINYINT         NOT NULL DEFAULT 0,
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_created`  (`user_id`, `created_at` DESC),
  KEY `idx_book_public`   (`book_id`, `is_public`, `created_at` DESC),
  CONSTRAINT `fk_notes_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notes_book` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='阅读笔记表';

-- 13. 评论表（支持最多2层嵌套）
CREATE TABLE IF NOT EXISTS `comments` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '评论ID',
  `user_id`          BIGINT UNSIGNED NOT NULL  COMMENT 'users.id，评论人',
  `target_id`        BIGINT UNSIGNED NOT NULL  COMMENT '评论目标ID',
  `target_type`      TINYINT         NOT NULL  COMMENT '目标类型：1-动态，2-阅读笔记，3-书评，4-讨论帖',
  `parent_id`        BIGINT UNSIGNED DEFAULT NULL COMMENT 'comments.id，父评论ID（回复时填写）',
  `root_id`          BIGINT UNSIGNED DEFAULT NULL COMMENT 'comments.id，根评论ID',
  `reply_to_user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'users.id，被回复的用户ID',
  `content`          VARCHAR(1000)   NOT NULL  COMMENT '评论内容（最多1000字）',
  `like_count`       INT UNSIGNED    NOT NULL DEFAULT 0,
  `reply_count`      INT UNSIGNED    NOT NULL DEFAULT 0,
  `is_deleted`       TINYINT         NOT NULL DEFAULT 0 COMMENT '软删除（内容替换为"已删除"）',
  `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_target`    (`target_id`, `target_type`, `created_at` DESC),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_user_id`   (`user_id`, `created_at` DESC),
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论表（支持嵌套）';

-- 14. 点赞记录表（通用多态）
CREATE TABLE IF NOT EXISTS `likes` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL  COMMENT 'users.id',
  `target_id`   BIGINT UNSIGNED NOT NULL  COMMENT '被点赞内容ID',
  `target_type` TINYINT         NOT NULL  COMMENT '内容类型：1-动态，2-评论，3-阅读笔记，4-书评，5-讨论帖',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_target` (`user_id`, `target_id`, `target_type`),
  KEY `idx_target`  (`target_id`, `target_type`),
  CONSTRAINT `fk_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='点赞记录表（通用）';

-- 15. 收藏记录表
CREATE TABLE IF NOT EXISTS `bookmarks` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL  COMMENT 'users.id',
  `target_id`   BIGINT UNSIGNED NOT NULL  COMMENT '被收藏内容ID',
  `target_type` TINYINT         NOT NULL  COMMENT '内容类型：1-动态，2-阅读笔记，3-书单',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_target` (`user_id`, `target_id`, `target_type`),
  KEY `idx_user_id` (`user_id`, `created_at` DESC),
  CONSTRAINT `fk_bookmarks_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收藏记录表';

-- 16. 用户关注关系表
CREATE TABLE IF NOT EXISTS `user_follows` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `follower_id`  BIGINT UNSIGNED NOT NULL  COMMENT 'users.id，关注者（主动方）',
  `following_id` BIGINT UNSIGNED NOT NULL  COMMENT 'users.id，被关注者',
  `is_mutual`    TINYINT         NOT NULL DEFAULT 0 COMMENT '是否互相关注：1-是（解锁私信）',
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_follow`        (`follower_id`, `following_id`),
  KEY `idx_follower_id`    (`follower_id`),
  KEY `idx_following_id`   (`following_id`),
  CONSTRAINT `fk_follows_follower`  FOREIGN KEY (`follower_id`)  REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_follows_following` FOREIGN KEY (`following_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户关注关系表';

-- ═══════════════════════════════════════════════════════════════════════
-- 模块4 · 私信 & 通知
-- ═══════════════════════════════════════════════════════════════════════

-- 17. 会话表
CREATE TABLE IF NOT EXISTS `conversations` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '会话ID',
  `user1_id`        BIGINT UNSIGNED NOT NULL  COMMENT 'users.id，保证 user1_id < user2_id',
  `user2_id`        BIGINT UNSIGNED NOT NULL  COMMENT 'users.id',
  `last_message_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'messages.id，最后一条消息ID',
  `last_message_at` DATETIME        DEFAULT NULL COMMENT '最后消息时间（会话列表排序）',
  `user1_unread`    INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT 'user1未读消息数',
  `user2_unread`    INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT 'user2未读消息数',
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users`       (`user1_id`, `user2_id`),
  KEY `idx_user1_time`   (`user1_id`, `last_message_at` DESC),
  KEY `idx_user2_time`   (`user2_id`, `last_message_at` DESC),
  CONSTRAINT `fk_conv_user1` FOREIGN KEY (`user1_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_conv_user2` FOREIGN KEY (`user2_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私信会话表';

-- 18. 私信消息表
CREATE TABLE IF NOT EXISTS `messages` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `conversation_id` BIGINT UNSIGNED NOT NULL  COMMENT 'conversations.id',
  `sender_id`       BIGINT UNSIGNED NOT NULL  COMMENT 'users.id，发送者',
  `receiver_id`     BIGINT UNSIGNED NOT NULL  COMMENT 'users.id，接收者',
  `content`         TEXT            DEFAULT NULL COMMENT '文本内容',
  `msg_type`        TINYINT         NOT NULL DEFAULT 1 COMMENT '消息类型：1-文字，2-图片，3-书籍分享',
  `image_url`       VARCHAR(500)    DEFAULT NULL COMMENT '图片URL（msg_type=2）',
  `book_id`         BIGINT UNSIGNED DEFAULT NULL COMMENT '分享的书籍ID（msg_type=3）',
  `is_read`         TINYINT         NOT NULL DEFAULT 0 COMMENT '是否已读：1-已读',
  `is_recalled`     TINYINT         NOT NULL DEFAULT 0 COMMENT '是否撤回：1-已撤回（2分钟内可撤）',
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conv_created` (`conversation_id`, `created_at` DESC),
  KEY `idx_sender`       (`sender_id`, `created_at` DESC),
  CONSTRAINT `fk_msg_conv`     FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_sender`   FOREIGN KEY (`sender_id`)       REFERENCES `users`(`id`)         ON DELETE CASCADE,
  CONSTRAINT `fk_msg_receiver` FOREIGN KEY (`receiver_id`)     REFERENCES `users`(`id`)         ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私信消息表';

-- 19. 系统通知表
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '通知ID',
  `user_id`     BIGINT UNSIGNED NOT NULL  COMMENT 'users.id，接收通知的用户',
  `type`        TINYINT         NOT NULL  COMMENT '通知类型：1-被关注，2-被点赞，3-被评论，4-被@，5-系统，6-新私信',
  `actor_id`    BIGINT UNSIGNED DEFAULT NULL COMMENT 'users.id，触发通知的用户（系统通知为NULL）',
  `target_id`   BIGINT UNSIGNED DEFAULT NULL COMMENT '关联内容ID',
  `target_type` TINYINT         DEFAULT NULL COMMENT '关联内容类型（与likes.target_type一致）',
  `content`     VARCHAR(500)    DEFAULT NULL COMMENT '通知内容预览',
  `is_read`     TINYINT         NOT NULL DEFAULT 0 COMMENT '是否已读：1-已读',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_read`    (`user_id`, `is_read`, `created_at` DESC),
  KEY `idx_user_created` (`user_id`, `created_at` DESC),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统通知表';

-- ═══════════════════════════════════════════════════════════════════════
-- 模块5 · 小组 & 书籍讨论
-- ═══════════════════════════════════════════════════════════════════════

-- 20. 读书小组表
CREATE TABLE IF NOT EXISTS `book_groups` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '小组ID',
  `name`             VARCHAR(100)    NOT NULL                COMMENT '小组名称',
  `description`      TEXT            DEFAULT NULL            COMMENT '小组简介',
  `cover_url`        VARCHAR(500)    DEFAULT NULL            COMMENT '小组封面图URL',
  `creator_id`       BIGINT UNSIGNED NOT NULL                COMMENT 'users.id，创建者',
  `category_id`      TINYINT UNSIGNED DEFAULT NULL           COMMENT 'book_categories.id，主题分类',
  `member_count`     INT UNSIGNED    NOT NULL DEFAULT 1      COMMENT '成员数（冗余计数）',
  `post_count`       INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '帖子总数（冗余计数）',
  `is_public`        TINYINT         NOT NULL DEFAULT 1      COMMENT '是否公开：1-公开，0-私密',
  `require_approval` TINYINT         NOT NULL DEFAULT 0      COMMENT '是否需要审核加入：1-需要',
  `status`           TINYINT         NOT NULL DEFAULT 1      COMMENT '状态：0-解散，1-正常',
  `created_at`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_creator`         (`creator_id`),
  KEY `idx_category_member` (`category_id`, `member_count` DESC),
  CONSTRAINT `fk_groups_creator`  FOREIGN KEY (`creator_id`)  REFERENCES `users`(`id`)            ON DELETE CASCADE,
  CONSTRAINT `fk_groups_category` FOREIGN KEY (`category_id`) REFERENCES `book_categories`(`id`)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='读书小组表';

-- 21. 小组成员表
CREATE TABLE IF NOT EXISTS `group_members` (
  `id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_id`  BIGINT UNSIGNED NOT NULL  COMMENT 'book_groups.id',
  `user_id`   BIGINT UNSIGNED NOT NULL  COMMENT 'users.id',
  `role`      TINYINT         NOT NULL DEFAULT 0 COMMENT '角色：0-普通成员，1-管理员，2-组长',
  `joined_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_user` (`group_id`, `user_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_gm_group` FOREIGN KEY (`group_id`) REFERENCES `book_groups`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gm_user`  FOREIGN KEY (`user_id`)  REFERENCES `users`(`id`)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小组成员表';

-- 22. 小组内帖子表
CREATE TABLE IF NOT EXISTS `group_posts` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '帖子ID',
  `group_id`      BIGINT UNSIGNED NOT NULL  COMMENT 'book_groups.id',
  `user_id`       BIGINT UNSIGNED NOT NULL  COMMENT 'users.id',
  `content`       TEXT            NOT NULL,
  `image_count`   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `like_count`    INT UNSIGNED    NOT NULL DEFAULT 0,
  `comment_count` INT UNSIGNED    NOT NULL DEFAULT 0,
  `is_deleted`    TINYINT         NOT NULL DEFAULT 0,
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group_created` (`group_id`, `created_at` DESC),
  CONSTRAINT `fk_gpost_group` FOREIGN KEY (`group_id`) REFERENCES `book_groups`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gpost_user`  FOREIGN KEY (`user_id`)  REFERENCES `users`(`id`)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小组内帖子表';

-- 23. 阅读挑战表
CREATE TABLE IF NOT EXISTS `reading_challenges` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '挑战ID',
  `group_id`    BIGINT UNSIGNED NOT NULL  COMMENT 'book_groups.id',
  `creator_id`  BIGINT UNSIGNED NOT NULL  COMMENT 'users.id，发起者（组长）',
  `title`       VARCHAR(200)    NOT NULL  COMMENT '挑战标题',
  `book_id`     BIGINT UNSIGNED DEFAULT NULL COMMENT 'books.id，目标书籍（可选）',
  `description` TEXT            DEFAULT NULL,
  `target_pages` SMALLINT UNSIGNED DEFAULT NULL COMMENT '目标阅读页数',
  `start_date`  DATE            NOT NULL,
  `end_date`    DATE            NOT NULL,
  `status`      TINYINT         NOT NULL DEFAULT 0 COMMENT '状态：0-进行中，1-已结束，2-已取消',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group_status` (`group_id`, `status`),
  CONSTRAINT `fk_challenge_group` FOREIGN KEY (`group_id`)   REFERENCES `book_groups`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_challenge_book`  FOREIGN KEY (`book_id`)    REFERENCES `books`(`id`)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='阅读挑战表';

-- 24. 挑战参与记录表
CREATE TABLE IF NOT EXISTS `challenge_participants` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `challenge_id` BIGINT UNSIGNED NOT NULL  COMMENT 'reading_challenges.id',
  `user_id`      BIGINT UNSIGNED NOT NULL  COMMENT 'users.id',
  `checkin_count` INT UNSIGNED   NOT NULL DEFAULT 0 COMMENT '打卡次数',
  `current_page` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '当前进度（页数）',
  `is_completed` TINYINT         NOT NULL DEFAULT 0,
  `joined_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_challenge_user` (`challenge_id`, `user_id`),
  CONSTRAINT `fk_cp_challenge` FOREIGN KEY (`challenge_id`) REFERENCES `reading_challenges`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cp_user`      FOREIGN KEY (`user_id`)      REFERENCES `users`(`id`)              ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='挑战参与记录表';

-- 25. 书籍专属讨论帖表
CREATE TABLE IF NOT EXISTS `book_discussions` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '讨论帖ID',
  `book_id`       BIGINT UNSIGNED NOT NULL  COMMENT 'books.id',
  `user_id`       BIGINT UNSIGNED NOT NULL  COMMENT 'users.id',
  `title`         VARCHAR(200)    NOT NULL  COMMENT '讨论标题',
  `content`       TEXT            NOT NULL,
  `category`      TINYINT         NOT NULL DEFAULT 0 COMMENT '分类：0-书评，1-剧情，2-推荐，3-求助',
  `has_spoiler`   TINYINT         NOT NULL DEFAULT 0,
  `like_count`    INT UNSIGNED    NOT NULL DEFAULT 0,
  `comment_count` INT UNSIGNED    NOT NULL DEFAULT 0,
  `view_count`    INT UNSIGNED    NOT NULL DEFAULT 0,
  `is_deleted`    TINYINT         NOT NULL DEFAULT 0,
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_book_created`  (`book_id`, `created_at` DESC),
  KEY `idx_book_category` (`book_id`, `category`),
  KEY `idx_book_hot`      (`book_id`, `like_count` DESC),
  CONSTRAINT `fk_disc_book` FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_disc_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='书籍专属讨论帖表';

-- ═══════════════════════════════════════════════════════════════════════
-- 模块6 · 推荐系统 & 运营
-- ═══════════════════════════════════════════════════════════════════════

-- 26. 推荐结果缓存表
CREATE TABLE IF NOT EXISTS `recommendation_cache` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         BIGINT UNSIGNED NOT NULL  COMMENT 'users.id',
  `rec_type`        TINYINT         NOT NULL  COMMENT '推荐类型：1-书籍推荐，2-书友推荐，3-热门书籍',
  `recommended_ids` JSON            NOT NULL  COMMENT 'JSON数组：推荐ID列表，按评分排序',
  `scores`          JSON            DEFAULT NULL COMMENT 'JSON数组：对应的推荐分数',
  `algorithm`       VARCHAR(50)     NOT NULL  COMMENT '计算算法标识（如：cf_user, content_based）',
  `generated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '计算生成时间',
  `expires_at`      DATETIME        NOT NULL  COMMENT '过期时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_type_algo` (`user_id`, `rec_type`, `algorithm`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_rec_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推荐结果缓存表';

-- 27. 用户行为日志表（大数据量，建议按月分区）
CREATE TABLE IF NOT EXISTS `user_behavior_logs` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `user_id`     BIGINT UNSIGNED NOT NULL  COMMENT 'users.id',
  `action_type` TINYINT         NOT NULL  COMMENT '行为类型：1-浏览书籍，2-加书架，3-评分，4-写书评，5-点赞，6-搜索，7-点击用户',
  `target_id`   BIGINT UNSIGNED NOT NULL  COMMENT '行为目标ID',
  `target_type` TINYINT         NOT NULL  COMMENT '目标类型：1-书籍，2-用户，3-帖子，4-小组',
  `extra_data`  JSON            DEFAULT NULL COMMENT '附加数据（如搜索关键词、停留时长等）',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_action` (`user_id`, `action_type`, `created_at` DESC),
  KEY `idx_target`      (`target_id`, `target_type`, `action_type`)
  -- 如需按月分区，参考数据库设计文档 2.19 章节
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户行为日志表';

-- 28. 用户兴趣画像表
CREATE TABLE IF NOT EXISTS `user_interest_profiles` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         BIGINT UNSIGNED NOT NULL  COMMENT 'users.id，1:1关联',
  `category_vector` JSON            DEFAULT NULL COMMENT '分类偏好向量（12维，对应12个大类）',
  `tag_vector`      JSON            DEFAULT NULL COMMENT '标签偏好向量（Top50标签权重）',
  `active_score`    DECIMAL(5,2)    NOT NULL DEFAULT 0.00 COMMENT '活跃度评分（0-100）',
  `generated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  CONSTRAINT `fk_profile_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户兴趣画像（向量化数据）表';

-- 29. 内容举报表
CREATE TABLE IF NOT EXISTS `reports` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '举报ID',
  `reporter_id`  BIGINT UNSIGNED NOT NULL  COMMENT 'users.id，举报人',
  `target_id`    BIGINT UNSIGNED NOT NULL  COMMENT '被举报内容ID',
  `target_type`  TINYINT         NOT NULL  COMMENT '内容类型：1-帖子，2-评论，3-用户，4-小组',
  `reason_type`  TINYINT         NOT NULL  COMMENT '举报类型：1-色情，2-垃圾广告，3-骚扰，4-谣言，5-侵权，6-其他',
  `description`  VARCHAR(500)    DEFAULT NULL COMMENT '用户补充说明',
  `status`       TINYINT         NOT NULL DEFAULT 0 COMMENT '处理状态：0-待处理，1-有效，2-无效',
  `result_note`  VARCHAR(200)    DEFAULT NULL COMMENT '处理结果说明',
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at`  DATETIME        DEFAULT NULL COMMENT '处理完成时间',
  PRIMARY KEY (`id`),
  KEY `idx_status_created` (`status`, `created_at`),
  KEY `idx_target`         (`target_id`, `target_type`),
  CONSTRAINT `fk_report_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容举报表';

-- 30. 内容审核日志表
CREATE TABLE IF NOT EXISTS `content_audit_logs` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '审核日志ID',
  `content_id`    BIGINT UNSIGNED NOT NULL  COMMENT '被审核内容ID',
  `content_type`  TINYINT         NOT NULL  COMMENT '内容类型（同posts.post_type）',
  `audit_type`    TINYINT         NOT NULL  COMMENT '审核方式：1-机器审核，2-人工审核，3-用户举报触发',
  `result`        TINYINT         NOT NULL  COMMENT '审核结果：1-通过，2-拒绝，3-人工复核',
  `reject_reason` TINYINT         DEFAULT NULL COMMENT '拒绝原因代码',
  `auditor_id`    BIGINT UNSIGNED DEFAULT NULL COMMENT 'users.id，人工审核员ID',
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_content`  (`content_id`, `content_type`),
  KEY `idx_created`  (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容审核日志表';

-- ═══════════════════════════════════════════════════════════════════════
-- 补全跨模块外键（延迟添加，避免建表时循环依赖）
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE `user_reading_preferences`
  ADD CONSTRAINT `fk_pref_category` FOREIGN KEY (`category_id`) REFERENCES `book_categories`(`id`) ON DELETE CASCADE;

ALTER TABLE `tags`
  ADD CONSTRAINT `fk_tags_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

ALTER TABLE `conversations`
  ADD CONSTRAINT `fk_conv_last_msg` FOREIGN KEY (`last_message_id`) REFERENCES `messages`(`id`) ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;  -- 恢复外键检查

-- ═══════════════════════════════════════════════════════════════════════
-- 初始数据
-- ═══════════════════════════════════════════════════════════════════════

-- 书籍12大分类
INSERT IGNORE INTO `book_categories` (`name`, `icon`, `sort_order`) VALUES
  ('文学',       '📚', 1),
  ('科技与互联网','💻', 2),
  ('历史',       '🏛️', 3),
  ('社会科学',   '🌍', 4),
  ('艺术与设计', '🎨', 5),
  ('哲学与宗教', '🔮', 6),
  ('经济与管理', '📊', 7),
  ('心理学',     '🧠', 8),
  ('生活方式',   '☕', 9),
  ('儿童与青少年','🌈', 10),
  ('漫画与绘本', '🎭', 11),
  ('教育与考试', '✏️', 12);

-- 系统官方标签
INSERT IGNORE INTO `tags` (`name`, `category`, `is_official`) VALUES
  ('治愈系',     2, 1),
  ('烧脑',       2, 1),
  ('催泪',       2, 1),
  ('值得反复读', 2, 1),
  ('年度最佳',   2, 1),
  ('睡前读物',   3, 1),
  ('通勤必备',   3, 1),
  ('一口气读完', 3, 1),
  ('经典名著',   1, 1),
  ('科幻',       1, 1),
  ('悬疑推理',   1, 1);

-- ═══════════════════════════════════════════════════════════════════════
-- 验证：统计建表数量
-- ═══════════════════════════════════════════════════════════════════════
-- 执行后运行以下查询确认30张表全部建成：
-- SELECT COUNT(*) AS table_count FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = 'booksocial' AND TABLE_TYPE = 'BASE TABLE';
-- 预期结果：30
