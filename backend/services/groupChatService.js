'use strict';

const db = require('../common/db');

// ── 工具：成员校验 ────────────────────────────────────────────────────────────
async function assertMember(groupId, userId) {
  const [rows] = await db.query(
    'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId]
  );
  if (!rows.length || rows[0].role < 0) {
    const err = new Error('仅小组成员可参与群聊');
    err.status = 403;
    throw err;
  }
}

async function getOrCreateGroupConversation(groupId) {
  const [rows] = await db.query(
    'SELECT id FROM group_conversations WHERE group_id = ?',
    [groupId]
  );
  if (rows.length) return rows[0].id;

  const [result] = await db.query(
    'INSERT INTO group_conversations (group_id) VALUES (?)',
    [groupId]
  );
  return result.insertId;
}

function formatMessage(row) {
  return {
    id:          row.id,
    gcId:        row.gc_id,
    groupId:     row.group_id,
    senderId:    row.sender_id,
    senderName:  row.senderName,
    senderAvatar: row.senderAvatar,
    content:     row.is_recalled ? '[消息已撤回]' : row.content,
    msgType:     row.msg_type,
    refBookId:   row.ref_book_id,
    isRecalled:  Boolean(row.is_recalled),
    createdAt:   row.created_at,
  };
}

// ── 获取历史消息（倒序分页，由前端再 reverse 显示） ─────────────────────────
async function getMessages(userId, groupId, page = 1, pageSize = 30) {
  await assertMember(groupId, userId);
  const offset = (page - 1) * pageSize;

  const [rows] = await db.query(
    `SELECT m.*, u.username AS senderName, u.avatar_url AS senderAvatar
     FROM group_messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.group_id = ?
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT ? OFFSET ?`,
    [groupId, pageSize, offset]
  );

  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) AS total FROM group_messages WHERE group_id = ?',
    [groupId]
  );

  return {
    list: rows.map(formatMessage).reverse(),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasMore: page * pageSize < total,
  };
}

async function sendMessage(userId, groupId, { content, msgType = 0, refBookId = null }) {
  await assertMember(groupId, userId);
  if (!content || !String(content).trim()) {
    const err = new Error('消息内容不能为空');
    err.status = 400;
    throw err;
  }
  if (String(content).length > 2000) {
    const err = new Error('消息内容不能超过2000字符');
    err.status = 400;
    throw err;
  }

  const gcId = await getOrCreateGroupConversation(groupId);

  const [ins] = await db.query(
    `INSERT INTO group_messages (gc_id, group_id, sender_id, content, msg_type, ref_book_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [gcId, groupId, userId, String(content).trim(), msgType, refBookId || null]
  );

  const [[row]] = await db.query(
    `SELECT m.*, u.username AS senderName, u.avatar_url AS senderAvatar
     FROM group_messages m JOIN users u ON u.id = m.sender_id
     WHERE m.id = ?`,
    [ins.insertId]
  );
  return formatMessage(row);
}

async function recallMessage(userId, messageId) {
  const [[row]] = await db.query(
    'SELECT * FROM group_messages WHERE id = ? AND sender_id = ?',
    [messageId, userId]
  );
  if (!row) {
    const err = new Error('消息不存在或无权操作');
    err.status = 404;
    throw err;
  }
  if (row.is_recalled) {
    const err = new Error('该消息已撤回');
    err.status = 409;
    throw err;
  }
  const diffMs = Date.now() - new Date(row.created_at).getTime();
  if (diffMs > 2 * 60 * 1000) {
    const err = new Error('只能撤回2分钟内的消息');
    err.status = 403;
    throw err;
  }

  await db.query(
    'UPDATE group_messages SET is_recalled = 1, recalled_at = NOW() WHERE id = ?',
    [messageId]
  );
  return { messageId, groupId: row.group_id };
}

// ── 列出用户所在小组 id（供 socket 连接时批量 join room）──────────────────
async function listUserGroupIds(userId) {
  const [rows] = await db.query(
    'SELECT group_id FROM group_members WHERE user_id = ? AND role >= 0',
    [userId]
  );
  return rows.map(r => Number(r.group_id));
}

module.exports = {
  assertMember,
  getOrCreateGroupConversation,
  getMessages,
  sendMessage,
  recallMessage,
  listUserGroupIds,
};
