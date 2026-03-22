-- ============================================================
-- M4 数据库迁移：私信 & 通知表
-- 执行前提：M0/M1/M2/M3 表已全部建好
-- 执行方式：mysql -u root -p booksocial < this_file.sql
-- ============================================================

-- 14. 私信会话表 (conversations)
CREATE TABLE IF NOT EXISTS conversations (
  id              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user1_id        BIGINT UNSIGNED   NOT NULL COMMENT '会话参与者1（id较小者）',
  user2_id        BIGINT UNSIGNED   NOT NULL COMMENT '会话参与者2（id较大者）',
  last_message_id BIGINT UNSIGNED   NULL     DEFAULT NULL COMMENT '最后一条消息ID（冗余）',
  last_message_at DATETIME          NULL     DEFAULT NULL COMMENT '最后消息时间（排序用）',
  user1_unread    INT               NOT NULL DEFAULT 0   COMMENT 'user1 未读数',
  user2_unread    INT               NOT NULL DEFAULT 0   COMMENT 'user2 未读数',
  is_blocked      TINYINT(1)        NOT NULL DEFAULT 0   COMMENT '是否已拉黑：1-是',
  blocked_by      BIGINT UNSIGNED   NULL     DEFAULT NULL COMMENT '发起拉黑的用户ID',
  created_at      DATETIME          NOT NULL DEFAULT NOW(),
  updated_at      DATETIME          NOT NULL DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE INDEX uk_user_pair (user1_id, user2_id),
  INDEX idx_user1_last (user1_id, last_message_at DESC),
  INDEX idx_user2_last (user2_id, last_message_at DESC),
  CONSTRAINT fk_conv_user1 FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_user2 FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='私信会话表，user1_id < user2_id 保证唯一性';

-- 15. 私信消息表 (messages)
CREATE TABLE IF NOT EXISTS messages (
  id              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  conversation_id BIGINT UNSIGNED   NOT NULL COMMENT 'conversations.id',
  sender_id       BIGINT UNSIGNED   NOT NULL COMMENT '发送者 users.id',
  content         TEXT              NOT NULL COMMENT '消息内容（最大2000字符）',
  msg_type        TINYINT(1)        NOT NULL DEFAULT 0 COMMENT '消息类型：0-文字，1-图片，2-书籍分享',
  ref_book_id     BIGINT UNSIGNED   NULL     DEFAULT NULL COMMENT '分享书籍ID（msg_type=2时）',
  is_recalled     TINYINT(1)        NOT NULL DEFAULT 0 COMMENT '是否撤回：1-已撤回',
  recalled_at     DATETIME          NULL     DEFAULT NULL COMMENT '撤回时间',
  is_read         TINYINT(1)        NOT NULL DEFAULT 0 COMMENT '是否已读：1-已读',
  read_at         DATETIME          NULL     DEFAULT NULL COMMENT '已读时间',
  created_at      DATETIME          NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  INDEX idx_conv_created  (conversation_id, created_at DESC),
  INDEX idx_sender        (sender_id),
  CONSTRAINT fk_msg_conv   FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id)       REFERENCES users(id)          ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='私信消息表';

-- 16. 系统通知表 (notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED   NOT NULL COMMENT '接收通知的用户',
  type        TINYINT(1)        NOT NULL COMMENT '1-被关注 2-被点赞 3-被评论 4-被@ 5-系统 6-新私信',
  actor_id    BIGINT UNSIGNED   NULL     DEFAULT NULL COMMENT '触发通知的用户（系统通知为NULL）',
  target_id   BIGINT UNSIGNED   NULL     DEFAULT NULL COMMENT '关联内容ID（帖子/评论/笔记）',
  target_type VARCHAR(20)       NULL     DEFAULT NULL COMMENT '关联内容类型：post/comment/note',
  content     VARCHAR(100)      NULL     DEFAULT NULL COMMENT '通知内容预览（最多100字）',
  is_read     TINYINT(1)        NOT NULL DEFAULT 0   COMMENT '是否已读：1-已读',
  read_at     DATETIME          NULL     DEFAULT NULL,
  created_at  DATETIME          NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  INDEX idx_user_read    (user_id, is_read, created_at DESC),
  INDEX idx_user_created (user_id, created_at DESC),
  INDEX idx_actor        (actor_id),
  CONSTRAINT fk_notif_user  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='系统通知表';
