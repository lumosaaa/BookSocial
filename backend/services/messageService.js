// backend/services/messageService.js
// M4 · 私信业务逻辑层
'use strict';

const db = require('../common/db');

// ──────────────────────────────────────────────
// 工具：计算会话 ID（保证 user1_id < user2_id）
// ──────────────────────────────────────────────
function userPair(idA, idB) {
  return idA < idB
    ? { user1Id: idA, user2Id: idB }
    : { user1Id: idB, user2Id: idA };
}

// ──────────────────────────────────────────────
// 获取或创建会话
// ──────────────────────────────────────────────
async function getOrCreateConversation(myId, otherId) {
  if (myId === otherId) throw { status: 400, message: '不能给自己发消息' };

  const { user1Id, user2Id } = userPair(myId, otherId);

  const [rows] = await db.query(
    `SELECT c.*, 
            u1.username AS user1Name, u1.avatar_url AS user1Avatar,
            u2.username AS user2Name, u2.avatar_url AS user2Avatar
     FROM conversations c
     JOIN users u1 ON u1.id = c.user1_id
     JOIN users u2 ON u2.id = c.user2_id
     WHERE c.user1_id = ? AND c.user2_id = ?`,
    [user1Id, user2Id]
  );

  if (rows.length) return formatConversation(rows[0], myId);

  // 检查对方隐私设置（message_permission）
  const [privacy] = await db.query(
    `SELECT ups.message_permission 
     FROM user_privacy_settings ups 
     WHERE ups.user_id = ?`,
    [otherId]
  );
  if (privacy.length && privacy[0].message_permission === 2) {
    throw { status: 403, message: '该用户已关闭私信功能' };
  }
  if (privacy.length && privacy[0].message_permission === 1) {
    // 仅关注者可发——检查 myId 是否关注 otherId
    const [follow] = await db.query(
      `SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ? LIMIT 1`,
      [myId, otherId]
    );
    if (!follow.length) throw { status: 403, message: '该用户只接受关注者的私信' };
  }

  const [result] = await db.query(
    `INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)`,
    [user1Id, user2Id]
  );
  const convId = result.insertId;

  const [newRow] = await db.query(
    `SELECT c.*, 
            u1.username AS user1Name, u1.avatar_url AS user1Avatar,
            u2.username AS user2Name, u2.avatar_url AS user2Avatar
     FROM conversations c
     JOIN users u1 ON u1.id = c.user1_id
     JOIN users u2 ON u2.id = c.user2_id
     WHERE c.id = ?`,
    [convId]
  );
  return formatConversation(newRow[0], myId);
}

// ──────────────────────────────────────────────
// 获取当前用户的会话列表
// ──────────────────────────────────────────────
async function getConversationList(myId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.query(
    `SELECT c.*, 
            u1.username AS user1Name, u1.avatar_url AS user1Avatar,
            u2.username AS user2Name, u2.avatar_url AS user2Avatar,
            m.content AS lastContent, m.msg_type AS lastMsgType,
            m.sender_id AS lastSenderId
     FROM conversations c
     JOIN users u1 ON u1.id = c.user1_id
     JOIN users u2 ON u2.id = c.user2_id
     LEFT JOIN messages m ON m.id = c.last_message_id
     WHERE (c.user1_id = ? OR c.user2_id = ?)
     ORDER BY c.last_message_at DESC, c.created_at DESC
     LIMIT ? OFFSET ?`,
    [myId, myId, pageSize, offset]
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM conversations
     WHERE user1_id = ? OR user2_id = ?`,
    [myId, myId]
  );

  return {
    list: rows.map(r => formatConversation(r, myId)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasMore: page * pageSize < total,
  };
}

// ──────────────────────────────────────────────
// 发送消息
// ──────────────────────────────────────────────
async function sendMessage(myId, conversationId, { content, msgType = 0, refBookId = null }) {
  if (!content || content.trim().length === 0) throw { status: 400, message: '消息内容不能为空' };
  if (content.length > 2000) throw { status: 400, message: '消息内容不能超过2000字符' };

  // 校验会话归属
  const [convRows] = await db.query(
    `SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
    [conversationId, myId, myId]
  );
  if (!convRows.length) throw { status: 404, message: '会话不存在' };

  const conv = convRows[0];
  if (conv.is_blocked) throw { status: 403, message: '该会话已被封禁，无法发送消息' };

  const receiverId = conv.user1_id === myId ? conv.user2_id : conv.user1_id;
  const unreadCol  = conv.user1_id === receiverId ? 'user1_unread' : 'user2_unread';

  await db.transaction(async (conn) => {
    // 插入消息
    const [ins] = await conn.query(
      `INSERT INTO messages (conversation_id, sender_id, content, msg_type, ref_book_id)
       VALUES (?, ?, ?, ?, ?)`,
      [conversationId, myId, content.trim(), msgType, refBookId || null]
    );
    const msgId = ins.insertId;

    // 更新会话冗余字段
    await conn.query(
      `UPDATE conversations 
       SET last_message_id = ?, last_message_at = NOW(), ${unreadCol} = ${unreadCol} + 1, updated_at = NOW()
       WHERE id = ?`,
      [msgId, conversationId]
    );
  });

  // 重新获取完整消息（含 insertId 后的数据）
  const [[msg]] = await db.query(
    `SELECT m.*, u.username AS senderName, u.avatar_url AS senderAvatar
     FROM messages m JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ? ORDER BY m.id DESC LIMIT 1`,
    [conversationId]
  );

  return { message: formatMessage(msg), receiverId };
}

// ──────────────────────────────────────────────
// 获取会话消息历史（分页，倒序）
// ──────────────────────────────────────────────
async function getMessages(myId, conversationId, page = 1, pageSize = 30) {
  const [convRows] = await db.query(
    `SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
    [conversationId, myId, myId]
  );
  if (!convRows.length) throw { status: 404, message: '会话不存在' };

  const offset = (page - 1) * pageSize;
  const [rows] = await db.query(
    `SELECT m.*, u.username AS senderName, u.avatar_url AS senderAvatar
     FROM messages m JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ?
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [conversationId, pageSize, offset]
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM messages WHERE conversation_id = ?`,
    [conversationId]
  );

  // 将未读标记为已读
  const conv = convRows[0];
  const unreadCol = conv.user1_id === myId ? 'user1_unread' : 'user2_unread';
  await db.query(
    `UPDATE conversations SET ${unreadCol} = 0 WHERE id = ?`,
    [conversationId]
  );
  await db.query(
    `UPDATE messages SET is_read = 1, read_at = NOW()
     WHERE conversation_id = ? AND sender_id != ? AND is_read = 0`,
    [conversationId, myId]
  );

  return {
    list: rows.map(formatMessage).reverse(), // 返回正序
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasMore: page * pageSize < total,
  };
}

// ──────────────────────────────────────────────
// 撤回消息（2分钟内）
// ──────────────────────────────────────────────
async function recallMessage(myId, messageId) {
  const [[msg]] = await db.query(
    `SELECT * FROM messages WHERE id = ? AND sender_id = ?`,
    [messageId, myId]
  );
  if (!msg) throw { status: 404, message: '消息不存在或无权操作' };
  if (msg.is_recalled) throw { status: 409, message: '该消息已撤回' };

  const diffMs = Date.now() - new Date(msg.created_at).getTime();
  if (diffMs > 2 * 60 * 1000) throw { status: 403, message: '只能撤回2分钟内的消息' };

  await db.query(
    `UPDATE messages SET is_recalled = 1, recalled_at = NOW() WHERE id = ?`,
    [messageId]
  );
  return { messageId, conversationId: msg.conversation_id };
}

// ──────────────────────────────────────────────
// 未读总数
// ──────────────────────────────────────────────
async function getUnreadCount(myId) {
  const [[row]] = await db.query(
    `SELECT 
       SUM(CASE WHEN user1_id = ? THEN user1_unread ELSE user2_unread END) AS total
     FROM conversations
     WHERE user1_id = ? OR user2_id = ?`,
    [myId, myId, myId]
  );
  return { unread: Number(row.total) || 0 };
}

// ──────────────────────────────────────────────
// 格式化函数
// ──────────────────────────────────────────────
function formatConversation(row, myId) {
  const isUser1 = row.user1_id === myId || row.user1_id === BigInt(myId);
  const other = isUser1
    ? { id: row.user2_id, username: row.user2Name, avatarUrl: row.user2Avatar }
    : { id: row.user1_id, username: row.user1Name, avatarUrl: row.user1Avatar };

  return {
    id:           row.id,
    other,
    lastContent:  row.lastContent  || null,
    lastMsgType:  row.lastMsgType  ?? null,
    lastSenderId: row.lastSenderId || null,
    lastMessageAt: row.last_message_at,
    unreadCount:  isUser1 ? row.user1_unread : row.user2_unread,
    isBlocked:    Boolean(row.is_blocked),
    createdAt:    row.created_at,
  };
}

function formatMessage(row) {
  return {
    id:             row.id,
    conversationId: row.conversation_id,
    senderId:       row.sender_id,
    senderName:     row.senderName,
    senderAvatar:   row.senderAvatar,
    content:        row.is_recalled ? '[消息已撤回]' : row.content,
    msgType:        row.msg_type,
    refBookId:      row.ref_book_id,
    isRecalled:     Boolean(row.is_recalled),
    isRead:         Boolean(row.is_read),
    readAt:         row.read_at,
    createdAt:      row.created_at,
  };
}

module.exports = {
  getOrCreateConversation,
  getConversationList,
  sendMessage,
  getMessages,
  recallMessage,
  getUnreadCount,
};
