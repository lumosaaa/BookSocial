/**
 * M5 · 小组业务逻辑
 */
const db    = require('../common/db');
const axios = require('axios');
const { buildInternalUrl, getInternalHeaders } = require('./internalRequest');

const MAX_GROUPS_PER_USER = 20; // 每人最多加入20个小组

// ── 格式化函数 ─────────────────────────────────────────────────────────────────
function formatGroup(row) {
  if (!row) return null;
  return {
    id:              row.id,
    name:            row.name,
    description:     row.description || '',
    coverUrl:        row.cover_url || null,
    creatorId:       row.creator_id,
    creatorName:     row.creator_name || null,
    creatorAvatar:   row.creator_avatar || null,
    categoryId:      row.category_id || null,
    categoryName:    row.category_name || null,
    memberCount:     row.member_count,
    postCount:       row.post_count,
    isPublic:        row.is_public === 1,
    requireApproval: row.require_approval === 1,
    status:          row.status,
    myRole:          row.my_role !== undefined ? row.my_role : null,
    isMember:        row.my_role !== undefined && row.my_role !== null,
    createdAt:       row.created_at,
  };
}

function formatGroupPost(row) {
  if (!row) return null;
  return {
    id:           row.id,
    groupId:      row.group_id,
    userId:       row.user_id,
    username:     row.username,
    avatarUrl:    row.avatar_url || null,
    content:      row.is_deleted ? '该帖子已删除' : row.content,
    isDeleted:    row.is_deleted === 1,
    likeCount:    row.like_count,
    commentCount: row.comment_count,
    isLiked:      row.is_liked === 1,
    createdAt:    row.created_at,
  };
}

function formatChallenge(row) {
  if (!row) return null;
  return {
    id:               row.id,
    groupId:          row.group_id,
    creatorId:        row.creator_id,
    creatorName:      row.creator_name || null,
    title:            row.title,
    description:      row.description || '',
    bookId:           row.book_id || null,
    bookTitle:        row.book_title || null,
    bookCover:        row.book_cover || null,
    targetPages:      row.target_pages || null,
    deadline:         row.deadline,
    participantCount: row.participant_count || 0,
    myCheckinCount:   row.my_checkin_count || 0,
    myLastCheckin:    row.my_last_checkin || null,
    isParticipating:  row.is_participating === 1,
    status:           row.status || 'active', // active | ended
    createdAt:        row.created_at,
  };
}

// ── 小组列表 ──────────────────────────────────────────────────────────────────
async function listGroups({ q, categoryId, page, currentUserId }) {
  const pageSize = 20;
  const offset   = (page - 1) * pageSize;
  const params   = [];
  let whereClause = 'WHERE bg.status = 1 ';

  if (q) {
    whereClause += 'AND bg.name LIKE ? ';
    params.push(`%${q}%`);
  }
  if (categoryId) {
    whereClause += 'AND bg.category_id = ? ';
    params.push(categoryId);
  }

  const myRoleJoin = currentUserId
    ? `LEFT JOIN group_members gm_me ON gm_me.group_id = bg.id AND gm_me.user_id = ${Number(currentUserId)}`
    : '';
  const myRoleSelect = currentUserId ? ', gm_me.role AS my_role' : ', NULL AS my_role';

  const sql = `
    SELECT bg.*, u.username AS creator_name, u.avatar_url AS creator_avatar,
           bc.name AS category_name ${myRoleSelect}
    FROM book_groups bg
    LEFT JOIN users u ON u.id = bg.creator_id
    LEFT JOIN book_categories bc ON bc.id = bg.category_id
    ${myRoleJoin}
    ${whereClause}
    ORDER BY bg.member_count DESC, bg.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(pageSize, offset);

  const countSql = `SELECT COUNT(*) AS total FROM book_groups bg ${whereClause.replace(/\?/g, () => {
    // count query uses same params except limit/offset
    return '?';
  })}`;

  const [rows]  = await db.query(sql, params);
  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM book_groups bg ${whereClause}`,
    params.slice(0, params.length - 2)
  );

  return {
    list:  rows.map(formatGroup),
    total: countRows[0].total,
  };
}

// ── 创建小组 ──────────────────────────────────────────────────────────────────
async function createGroup({ creatorId, name, description, coverUrl, categoryId, isPublic, requireApproval }) {
  // 检查用户已加入的小组数
  const [joined] = await db.query(
    'SELECT COUNT(*) AS cnt FROM group_members WHERE user_id = ?',
    [creatorId]
  );
  if (joined[0].cnt >= MAX_GROUPS_PER_USER) {
    const err = new Error(`每人最多加入 ${MAX_GROUPS_PER_USER} 个小组`);
    err.status = 400;
    throw err;
  }

  let groupId;
  await db.transaction(async (conn) => {
    const [result] = await conn.query(
      `INSERT INTO book_groups (name, description, cover_url, creator_id, category_id,
        member_count, post_count, is_public, require_approval, status, created_at)
       VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, 1, NOW())`,
      [name, description, coverUrl, creatorId, categoryId,
       isPublic ? 1 : 0, requireApproval ? 1 : 0]
    );
    groupId = result.insertId;

    // 创建者自动成为组长 (role=2)
    await conn.query(
      'INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, 2, NOW())',
      [groupId, creatorId]
    );
  });

  return getGroupDetail({ groupId, currentUserId: creatorId });
}

// ── 小组详情 ──────────────────────────────────────────────────────────────────
async function getGroupDetail({ groupId, currentUserId }) {
  const myRoleJoin = currentUserId
    ? `LEFT JOIN group_members gm_me ON gm_me.group_id = bg.id AND gm_me.user_id = ${Number(currentUserId)}`
    : '';
  const myRoleSelect = currentUserId ? ', gm_me.role AS my_role' : ', NULL AS my_role';

  const [rows] = await db.query(
    `SELECT bg.*, u.username AS creator_name, u.avatar_url AS creator_avatar,
            bc.name AS category_name ${myRoleSelect}
     FROM book_groups bg
     LEFT JOIN users u ON u.id = bg.creator_id
     LEFT JOIN book_categories bc ON bc.id = bg.category_id
     ${myRoleJoin}
     WHERE bg.id = ?`,
    [groupId]
  );
  return rows.length ? formatGroup(rows[0]) : null;
}

// ── 更新小组 ──────────────────────────────────────────────────────────────────
async function updateGroup({ groupId, operatorId, fields }) {
  await checkOperatorRole(groupId, operatorId, 1); // 至少管理员
  const allowed = ['name', 'description', 'cover_url', 'category_id', 'is_public', 'require_approval'];
  const updates = {};
  if (fields.name)            updates.name = fields.name.trim();
  if (fields.description !== undefined) updates.description = fields.description;
  if (fields.coverUrl !== undefined) updates.cover_url = fields.coverUrl;
  if (fields.categoryId !== undefined) updates.category_id = fields.categoryId;
  if (fields.isPublic !== undefined) updates.is_public = fields.isPublic ? 1 : 0;
  if (fields.requireApproval !== undefined) updates.require_approval = fields.requireApproval ? 1 : 0;

  if (Object.keys(updates).length === 0) {
    const err = new Error('没有可更新的字段'); err.status = 400; throw err;
  }
  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  await db.query(`UPDATE book_groups SET ${setClauses} WHERE id = ?`,
    [...Object.values(updates), groupId]);

  return getGroupDetail({ groupId, currentUserId: operatorId });
}

// ── 解散小组 ──────────────────────────────────────────────────────────────────
async function dissolveGroup({ groupId, operatorId }) {
  await checkOperatorRole(groupId, operatorId, 2); // 仅组长
  await db.query('UPDATE book_groups SET status = 0 WHERE id = ?', [groupId]);
}

// ── 加入小组 ──────────────────────────────────────────────────────────────────
async function joinGroup({ groupId, userId }) {
  const [groups] = await db.query('SELECT * FROM book_groups WHERE id = ? AND status = 1', [groupId]);
  if (!groups.length) { const e = new Error('小组不存在'); e.status = 404; throw e; }
  const group = groups[0];

  // 已经是成员？
  const [existing] = await db.query(
    'SELECT id, role FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId]
  );
  if (existing.length) {
    const e = new Error('已是小组成员'); e.status = 409; throw e;
  }

  // 最多20个小组
  const [cnt] = await db.query('SELECT COUNT(*) AS c FROM group_members WHERE user_id = ?', [userId]);
  if (cnt[0].c >= MAX_GROUPS_PER_USER) {
    const e = new Error(`每人最多加入 ${MAX_GROUPS_PER_USER} 个小组`); e.status = 400; throw e;
  }

  // 需要审核？
  if (group.require_approval) {
    // 写入 pending 申请（role=-1 表示待审核）
    await db.query(
      'INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, -1, NOW())',
      [groupId, userId]
    );
    return { joined: false, pending: true };
  }

  await db.transaction(async (conn) => {
    await conn.query(
      'INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, 0, NOW())',
      [groupId, userId]
    );
    await conn.query(
      'UPDATE book_groups SET member_count = member_count + 1 WHERE id = ?',
      [groupId]
    );
  });
  return { joined: true, pending: false };
}

// ── 退出小组 ──────────────────────────────────────────────────────────────────
async function leaveGroup({ groupId, userId }) {
  const [member] = await db.query(
    'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId]
  );
  if (!member.length) { const e = new Error('不在该小组中'); e.status = 400; throw e; }
  if (member[0].role === 2) {
    const e = new Error('组长不能直接退出，请先转让或解散小组'); e.status = 400; throw e;
  }

  await db.transaction(async (conn) => {
    await conn.query('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
    if (member[0].role >= 0) { // 正式成员才减少计数
      await conn.query(
        'UPDATE book_groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = ?',
        [groupId]
      );
    }
  });
}

// ── 成员列表 ──────────────────────────────────────────────────────────────────
async function listMembers({ groupId, page, role }) {
  const pageSize = 20;
  const offset   = (page - 1) * pageSize;
  let where = 'WHERE gm.group_id = ? AND gm.role >= 0';
  const params = [groupId];
  if (role !== null) { where += ' AND gm.role = ?'; params.push(role); }

  const [rows] = await db.query(
    `SELECT gm.role, gm.joined_at, u.id, u.username, u.avatar_url, u.bio
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     ${where}
     ORDER BY gm.role DESC, gm.joined_at ASC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [cnt] = await db.query(`SELECT COUNT(*) AS total FROM group_members gm ${where}`, params);

  return {
    list: rows.map(r => ({
      userId:    r.id,
      username:  r.username,
      avatarUrl: r.avatar_url || null,
      bio:       r.bio || '',
      role:      r.role,
      joinedAt:  r.joined_at,
    })),
    total: cnt[0].total,
  };
}

// ── 审批加入申请 ──────────────────────────────────────────────────────────────
async function approveJoinRequest({ groupId, targetUserId, operatorId, approve }) {
  await checkOperatorRole(groupId, operatorId, 1);
  const [pending] = await db.query(
    'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND role = -1',
    [groupId, targetUserId]
  );
  if (!pending.length) { const e = new Error('未找到待审核申请'); e.status = 404; throw e; }

  if (approve) {
    await db.transaction(async (conn) => {
      await conn.query(
        'UPDATE group_members SET role = 0, joined_at = NOW() WHERE group_id = ? AND user_id = ?',
        [groupId, targetUserId]
      );
      await conn.query(
        'UPDATE book_groups SET member_count = member_count + 1 WHERE id = ?',
        [groupId]
      );
    });
    // 触发 M4 通知（系统通知，申请已批准）
    triggerNotify({ userId: targetUserId, type: 5, actorId: operatorId, content: '您的入组申请已通过' });
  } else {
    await db.query('DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND role = -1',
      [groupId, targetUserId]);
  }
}

// ── 调整成员角色 ──────────────────────────────────────────────────────────────
async function setMemberRole({ groupId, targetUserId, operatorId, role }) {
  await checkOperatorRole(groupId, operatorId, 2); // 仅组长
  if (![0, 1].includes(role)) { const e = new Error('角色值无效'); e.status = 400; throw e; }
  await db.query(
    'UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?',
    [role, groupId, targetUserId]
  );
}

// ── 移除成员 ──────────────────────────────────────────────────────────────────
async function removeMember({ groupId, targetUserId, operatorId }) {
  await checkOperatorRole(groupId, operatorId, 1);
  const [target] = await db.query(
    'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, targetUserId]
  );
  if (!target.length) { const e = new Error('该用户不在小组中'); e.status = 404; throw e; }
  if (target[0].role === 2) { const e = new Error('不能移除组长'); e.status = 400; throw e; }

  await db.transaction(async (conn) => {
    await conn.query('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, targetUserId]);
    await conn.query(
      'UPDATE book_groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = ?',
      [groupId]
    );
  });
}

// ── 小组帖子列表 ──────────────────────────────────────────────────────────────
async function listGroupPosts({ groupId, page, currentUserId }) {
  await checkGroupExists(groupId);
  const pageSize = 20;
  const offset   = (page - 1) * pageSize;
  const likedJoin = currentUserId
    ? `LEFT JOIN likes lk ON lk.target_id = gp.id AND lk.target_type = 6 AND lk.user_id = ${Number(currentUserId)}`
    : '';
  const likedSelect = currentUserId ? ', IF(lk.id IS NOT NULL, 1, 0) AS is_liked' : ', 0 AS is_liked';

  const [rows] = await db.query(
    `SELECT gp.*, u.username, u.avatar_url ${likedSelect}
     FROM group_posts gp
     JOIN users u ON u.id = gp.user_id
     ${likedJoin}
     WHERE gp.group_id = ?
     ORDER BY gp.created_at DESC
     LIMIT ? OFFSET ?`,
    [groupId, pageSize, offset]
  );
  const [cnt] = await db.query('SELECT COUNT(*) AS total FROM group_posts WHERE group_id = ?', [groupId]);

  return { list: rows.map(formatGroupPost), total: cnt[0].total };
}

// ── 小组内发帖 ────────────────────────────────────────────────────────────────
async function createGroupPost({ groupId, userId, content, imageUrls }) {
  await checkMembership(groupId, userId);
  let postId;
  await db.transaction(async (conn) => {
    const [r] = await conn.query(
      `INSERT INTO group_posts (group_id, user_id, content, like_count, comment_count, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, 0, 0, 0, NOW(), NOW())`,
      [groupId, userId, content]
    );
    postId = r.insertId;
    await conn.query(
      'UPDATE book_groups SET post_count = post_count + 1 WHERE id = ?',
      [groupId]
    );
  });
  const [rows] = await db.query(
    `SELECT gp.*, u.username, u.avatar_url, 0 AS is_liked
     FROM group_posts gp JOIN users u ON u.id = gp.user_id WHERE gp.id = ?`,
    [postId]
  );
  return formatGroupPost(rows[0]);
}

// ── 删除小组帖子 ──────────────────────────────────────────────────────────────
async function deleteGroupPost({ groupId, postId, operatorId }) {
  const [posts] = await db.query('SELECT * FROM group_posts WHERE id = ? AND group_id = ?', [postId, groupId]);
  if (!posts.length) { const e = new Error('帖子不存在'); e.status = 404; throw e; }
  const post = posts[0];

  const isAuthor = post.user_id === operatorId;
  if (!isAuthor) {
    // 检查是否管理员/组长
    await checkOperatorRole(groupId, operatorId, 1);
  }

  await db.transaction(async (conn) => {
    await conn.query('UPDATE group_posts SET is_deleted = 1 WHERE id = ?', [postId]);
    await conn.query(
      'UPDATE book_groups SET post_count = GREATEST(post_count - 1, 0) WHERE id = ?',
      [groupId]
    );
  });
}

// ── 小组帖子点赞 ──────────────────────────────────────────────────────────────
async function toggleGroupPostLike({ postId, userId }) {
  // target_type=6 代表小组帖子
  const [existing] = await db.query(
    'SELECT id FROM likes WHERE user_id = ? AND target_id = ? AND target_type = 6',
    [userId, postId]
  );

  if (existing.length) {
    await db.transaction(async (conn) => {
      await conn.query('DELETE FROM likes WHERE id = ?', [existing[0].id]);
      await conn.query(
        'UPDATE group_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?',
        [postId]
      );
    });
    const [p] = await db.query('SELECT like_count FROM group_posts WHERE id = ?', [postId]);
    return { liked: false, likeCount: p[0]?.like_count || 0 };
  } else {
    await db.transaction(async (conn) => {
      await conn.query(
        'INSERT INTO likes (user_id, target_id, target_type, created_at) VALUES (?, ?, 6, NOW())',
        [userId, postId]
      );
      await conn.query('UPDATE group_posts SET like_count = like_count + 1 WHERE id = ?', [postId]);
    });
    const [p] = await db.query('SELECT like_count FROM group_posts WHERE id = ?', [postId]);
    return { liked: true, likeCount: p[0]?.like_count || 0 };
  }
}

// ── 创建阅读挑战 ──────────────────────────────────────────────────────────────
async function createChallenge({ groupId, creatorId, title, description, bookId, targetPages, deadline }) {
  await checkOperatorRole(groupId, creatorId, 1); // 管理员以上才能创建挑战
  const [r] = await db.query(
    `INSERT INTO reading_challenges (group_id, creator_id, title, description, book_id, target_pages, deadline, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [groupId, creatorId, title, description, bookId, targetPages, deadline]
  );
  const challengeId = r.insertId;
  const [rows] = await db.query(
    `SELECT rc.*, u.username AS creator_name, b.title AS book_title, b.cover_url AS book_cover
     FROM reading_challenges rc
     LEFT JOIN users u ON u.id = rc.creator_id
     LEFT JOIN books b ON b.id = rc.book_id
     WHERE rc.id = ?`,
    [challengeId]
  );
  return formatChallenge(rows[0]);
}

// ── 挑战列表 ──────────────────────────────────────────────────────────────────
async function listChallenges({ groupId, page, status, currentUserId }) {
  const pageSize = 10;
  const offset   = (page - 1) * pageSize;
  const params   = [groupId];
  let where = 'WHERE rc.group_id = ?';
  if (status === 'active') { where += ' AND rc.deadline >= NOW()'; }
  if (status === 'ended')  { where += ' AND rc.deadline < NOW()'; }

  const myJoin = currentUserId
    ? `LEFT JOIN challenge_participants cp_me ON cp_me.challenge_id = rc.id AND cp_me.user_id = ${Number(currentUserId)}`
    : '';
  const mySelect = currentUserId
    ? ', cp_me.checkin_count AS my_checkin_count, cp_me.last_checkin_at AS my_last_checkin, IF(cp_me.id IS NOT NULL, 1, 0) AS is_participating'
    : ', 0 AS my_checkin_count, NULL AS my_last_checkin, 0 AS is_participating';

  const [rows] = await db.query(
    `SELECT rc.*, u.username AS creator_name, b.title AS book_title, b.cover_url AS book_cover,
            (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = rc.id) AS participant_count
            ${mySelect}
     FROM reading_challenges rc
     LEFT JOIN users u ON u.id = rc.creator_id
     LEFT JOIN books b ON b.id = rc.book_id
     ${myJoin}
     ${where}
     ORDER BY rc.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [cnt] = await db.query(
    `SELECT COUNT(*) AS total FROM reading_challenges rc ${where}`,
    params
  );

  return { list: rows.map(formatChallenge), total: cnt[0].total };
}

// ── 打卡 ──────────────────────────────────────────────────────────────────────
async function checkin({ challengeId, userId, note, currentPages }) {
  const [challenges] = await db.query(
    'SELECT * FROM reading_challenges WHERE id = ?',
    [challengeId]
  );
  if (!challenges.length) { const e = new Error('挑战不存在'); e.status = 404; throw e; }
  const challenge = challenges[0];
  if (new Date(challenge.deadline) < new Date()) {
    const e = new Error('挑战已结束，无法打卡'); e.status = 400; throw e;
  }

  // 检查今天是否已打卡
  const [todayCheckin] = await db.query(
    `SELECT id FROM challenge_participants
     WHERE challenge_id = ? AND user_id = ? AND DATE(last_checkin_at) = CURDATE()`,
    [challengeId, userId]
  );
  if (todayCheckin.length) { const e = new Error('今天已打卡'); e.status = 409; throw e; }

  const [existing] = await db.query(
    'SELECT id, checkin_count FROM challenge_participants WHERE challenge_id = ? AND user_id = ?',
    [challengeId, userId]
  );

  let checkinCount;
  if (existing.length) {
    checkinCount = existing[0].checkin_count + 1;
    await db.query(
      'UPDATE challenge_participants SET checkin_count = ?, last_checkin_at = NOW(), note = ?, current_pages = ? WHERE id = ?',
      [checkinCount, note, currentPages, existing[0].id]
    );
  } else {
    checkinCount = 1;
    await db.query(
      `INSERT INTO challenge_participants (challenge_id, user_id, checkin_count, last_checkin_at, note, current_pages, joined_at)
       VALUES (?, ?, 1, NOW(), ?, ?, NOW())`,
      [challengeId, userId, note, currentPages]
    );
  }

  return { checkedIn: true, checkinCount };
}

// ── 辅助函数 ──────────────────────────────────────────────────────────────────
async function checkGroupExists(groupId) {
  const [rows] = await db.query('SELECT id FROM book_groups WHERE id = ? AND status = 1', [groupId]);
  if (!rows.length) { const e = new Error('小组不存在或已解散'); e.status = 404; throw e; }
}

async function checkMembership(groupId, userId) {
  const [rows] = await db.query(
    'SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND role >= 0',
    [groupId, userId]
  );
  if (!rows.length) { const e = new Error('仅小组成员可操作'); e.status = 403; throw e; }
  return rows[0].role;
}

async function checkOperatorRole(groupId, operatorId, minRole) {
  const [rows] = await db.query(
    'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, operatorId]
  );
  if (!rows.length || rows[0].role < minRole) {
    const e = new Error('权限不足');
    e.status = 403;
    throw e;
  }
}

function triggerNotify(params) {
  axios.post(buildInternalUrl('/internal/notify'), params, {
    headers: getInternalHeaders(),
  }).catch(err => console.error('[M5 通知] 发送失败:', err.message));
}

module.exports = {
  listGroups,
  createGroup,
  getGroupDetail,
  updateGroup,
  dissolveGroup,
  joinGroup,
  leaveGroup,
  listMembers,
  approveJoinRequest,
  setMemberRole,
  removeMember,
  listGroupPosts,
  createGroupPost,
  deleteGroupPost,
  toggleGroupPostLike,
  createChallenge,
  listChallenges,
  checkin,
};
