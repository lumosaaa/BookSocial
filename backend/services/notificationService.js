// backend/services/notificationService.js
// M4 · 通知业务逻辑层
'use strict';

const db = require('../common/db');

const NOTIF_TYPE = {
  FOLLOW:   1,
  LIKE:     2,
  COMMENT:  3,
  MENTION:  4,
  SYSTEM:   5,
  MESSAGE:  6,
};

async function createNotification({ userId, type, actorId = null, targetId = null, targetType = null, content = null }) {
  if (!userId || !type) throw new Error('userId 和 type 为必填项');

  if (actorId && targetId) {
    const [dup] = await db.query(
      `SELECT id FROM notifications
       WHERE user_id = ? AND type = ? AND actor_id = ? AND target_id = ?
         AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE) LIMIT 1`,
      [userId, type, actorId, targetId]
    );
    if (dup.length) return null;
  }

  const [result] = await db.query(
    `INSERT INTO notifications (user_id, type, actor_id, target_id, target_type, content)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, actorId || null, targetId || null, targetType || null, content ? content.slice(0, 100) : null]
  );

  const [[row]] = await db.query(
    `SELECT n.*, u.username AS actorName, u.avatar_url AS actorAvatar
     FROM notifications n LEFT JOIN users u ON u.id = n.actor_id WHERE n.id = ?`,
    [result.insertId]
  );
  return formatNotification(row);
}

async function getNotifications(myId, page = 1, pageSize = 20, onlyUnread = false) {
  const offset = (page - 1) * pageSize;
  const unreadSql = onlyUnread ? 'AND n.is_read = 0' : '';

  const [rows] = await db.query(
    `SELECT n.*, u.username AS actorName, u.avatar_url AS actorAvatar
     FROM notifications n LEFT JOIN users u ON u.id = n.actor_id
     WHERE n.user_id = ? ${unreadSql}
     ORDER BY n.created_at DESC LIMIT ? OFFSET ?`,
    [myId, pageSize, offset]
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? ${unreadSql}`,
    [myId]
  );

  return {
    list: rows.map(formatNotification),
    total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasMore: page * pageSize < total,
  };
}

async function markRead(myId, notifIds = null) {
  if (notifIds && notifIds.length === 0) return;
  if (notifIds) {
    await db.query(
      `UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id IN (?) AND user_id = ?`,
      [notifIds, myId]
    );
  } else {
    await db.query(
      `UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ?`,
      [myId]
    );
  }
}

async function getUnreadCount(myId) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0`,
    [myId]
  );
  return { unread: Number(row.total) };
}

async function deleteNotification(myId, notifId) {
  const [result] = await db.query(
    `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
    [notifId, myId]
  );
  if (!result.affectedRows) throw { status: 404, message: '通知不存在' };
}

function formatNotification(row) {
  return {
    id:         row.id,
    type:       row.type,
    actor:      row.actor_id ? { id: row.actor_id, username: row.actorName, avatarUrl: row.actorAvatar } : null,
    targetId:   row.target_id,
    targetType: row.target_type,
    content:    row.content,
    isRead:     Boolean(row.is_read),
    readAt:     row.read_at,
    createdAt:  row.created_at,
  };
}

module.exports = { NOTIF_TYPE, createNotification, getNotifications, markRead, getUnreadCount, deleteNotification };
