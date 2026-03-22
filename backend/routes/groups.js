/**
 * M5 · 读书小组路由
 * 挂载路径: /api/v1/groups
 */
const express = require('express');
const router  = express.Router();
const { authMiddleware, optionalAuth, requireGroupRole } = require('../common/authMiddleware');
const groupService = require('../services/groupService');

// ── 小组列表 / 搜索 ──────────────────────────────────────────────────────────
// GET /api/v1/groups?q=&category=&page=
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { q = '', category, page = 1 } = req.query;
    const result = await groupService.listGroups({
      q,
      categoryId: category ? Number(category) : null,
      page: Number(page),
      currentUserId: req.user?.id || null,
    });
    res.paginate(result.list, result.total, Number(page), 20);
  } catch (err) {
    res.fail(err.message || '获取小组列表失败', err.status || 500);
  }
});

// ── 创建小组 ──────────────────────────────────────────────────────────────────
// POST /api/v1/groups
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, coverUrl, categoryId, isPublic, requireApproval } = req.body;
    if (!name || name.trim().length < 2) {
      return res.fail('小组名称至少2个字符', 400);
    }
    const group = await groupService.createGroup({
      creatorId: req.user.id,
      name: name.trim(),
      description: description || '',
      coverUrl: coverUrl || null,
      categoryId: categoryId || null,
      isPublic: isPublic !== undefined ? isPublic : true,
      requireApproval: requireApproval !== undefined ? requireApproval : false,
    });
    res.created(group);
  } catch (err) {
    res.fail(err.message || '创建小组失败', err.status || 500);
  }
});

// ── 小组详情 ──────────────────────────────────────────────────────────────────
// GET /api/v1/groups/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const group = await groupService.getGroupDetail({
      groupId: Number(req.params.id),
      currentUserId: req.user?.id || null,
    });
    if (!group) return res.notFound('小组不存在');
    res.ok(group);
  } catch (err) {
    res.fail(err.message || '获取小组详情失败', err.status || 500);
  }
});

// ── 编辑小组（仅组长/管理员） ─────────────────────────────────────────────────
// PUT /api/v1/groups/:id
router.put('/:id', authMiddleware, requireGroupRole(1), async (req, res) => {
  try {
    const updated = await groupService.updateGroup({
      groupId: Number(req.params.id),
      operatorId: req.user.id,
      fields: req.body,
    });
    res.ok(updated);
  } catch (err) {
    res.fail(err.message || '更新小组失败', err.status || 500);
  }
});

// ── 解散小组（仅组长） ─────────────────────────────────────────────────────────
// DELETE /api/v1/groups/:id
router.delete('/:id', authMiddleware, requireGroupRole(2), async (req, res) => {
  try {
    await groupService.dissolveGroup({
      groupId: Number(req.params.id),
      operatorId: req.user.id,
    });
    res.ok({ dissolved: true });
  } catch (err) {
    res.fail(err.message || '解散小组失败', err.status || 500);
  }
});

// ── 加入小组 ──────────────────────────────────────────────────────────────────
// POST /api/v1/groups/:id/join
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const result = await groupService.joinGroup({
      groupId: Number(req.params.id),
      userId: req.user.id,
    });
    res.ok(result); // { joined: bool, pending: bool (需审核时) }
  } catch (err) {
    res.fail(err.message || '加入小组失败', err.status || 500);
  }
});

// ── 退出小组 ──────────────────────────────────────────────────────────────────
// DELETE /api/v1/groups/:id/leave
router.delete('/:id/leave', authMiddleware, async (req, res) => {
  try {
    await groupService.leaveGroup({
      groupId: Number(req.params.id),
      userId: req.user.id,
    });
    res.ok({ left: true });
  } catch (err) {
    res.fail(err.message || '退出小组失败', err.status || 500);
  }
});

// ── 小组成员列表 ──────────────────────────────────────────────────────────────
// GET /api/v1/groups/:id/members?page=
router.get('/:id/members', optionalAuth, async (req, res) => {
  try {
    const { page = 1, role } = req.query;
    const result = await groupService.listMembers({
      groupId: Number(req.params.id),
      page: Number(page),
      role: role !== undefined ? Number(role) : null,
    });
    res.paginate(result.list, result.total, Number(page), 20);
  } catch (err) {
    res.fail(err.message || '获取成员列表失败', err.status || 500);
  }
});

// ── 审批加入申请（组长/管理员） ───────────────────────────────────────────────
// PUT /api/v1/groups/:id/members/:userId/approve
router.put('/:id/members/:userId/approve', authMiddleware, requireGroupRole(1), async (req, res) => {
  try {
    const { approve } = req.body; // true=批准, false=拒绝
    await groupService.approveJoinRequest({
      groupId: Number(req.params.id),
      targetUserId: Number(req.params.userId),
      operatorId: req.user.id,
      approve: approve !== false,
    });
    res.ok({ approved: approve !== false });
  } catch (err) {
    res.fail(err.message || '审批失败', err.status || 500);
  }
});

// ── 调整成员角色（仅组长） ────────────────────────────────────────────────────
// PUT /api/v1/groups/:id/members/:userId/role
router.put('/:id/members/:userId/role', authMiddleware, requireGroupRole(2), async (req, res) => {
  try {
    const { role } = req.body; // 0=普通, 1=管理员
    await groupService.setMemberRole({
      groupId: Number(req.params.id),
      targetUserId: Number(req.params.userId),
      operatorId: req.user.id,
      role: Number(role),
    });
    res.ok({ role });
  } catch (err) {
    res.fail(err.message || '修改角色失败', err.status || 500);
  }
});

// ── 移除成员（组长/管理员） ──────────────────────────────────────────────────
// DELETE /api/v1/groups/:id/members/:userId
router.delete('/:id/members/:userId', authMiddleware, requireGroupRole(1), async (req, res) => {
  try {
    await groupService.removeMember({
      groupId: Number(req.params.id),
      targetUserId: Number(req.params.userId),
      operatorId: req.user.id,
    });
    res.ok({ removed: true });
  } catch (err) {
    res.fail(err.message || '移除成员失败', err.status || 500);
  }
});

// ── 小组帖子列表 ──────────────────────────────────────────────────────────────
// GET /api/v1/groups/:id/posts?page=
router.get('/:id/posts', optionalAuth, async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const result = await groupService.listGroupPosts({
      groupId: Number(req.params.id),
      page: Number(page),
      currentUserId: req.user?.id || null,
    });
    res.paginate(result.list, result.total, Number(page), 20);
  } catch (err) {
    res.fail(err.message || '获取小组帖子失败', err.status || 500);
  }
});

// ── 小组内发帖 ────────────────────────────────────────────────────────────────
// POST /api/v1/groups/:id/posts
router.post('/:id/posts', authMiddleware, async (req, res) => {
  try {
    const { content, imageUrls } = req.body;
    if (!content || content.trim().length === 0) {
      return res.fail('帖子内容不能为空', 400);
    }
    const post = await groupService.createGroupPost({
      groupId: Number(req.params.id),
      userId: req.user.id,
      content: content.trim(),
      imageUrls: imageUrls || [],
    });
    res.created(post);
  } catch (err) {
    res.fail(err.message || '发帖失败', err.status || 500);
  }
});

// ── 删除小组帖子（作者或管理员/组长） ────────────────────────────────────────
// DELETE /api/v1/groups/:id/posts/:postId
router.delete('/:id/posts/:postId', authMiddleware, async (req, res) => {
  try {
    await groupService.deleteGroupPost({
      groupId: Number(req.params.id),
      postId: Number(req.params.postId),
      operatorId: req.user.id,
    });
    res.ok({ deleted: true });
  } catch (err) {
    res.fail(err.message || '删除帖子失败', err.status || 500);
  }
});

// ── 小组帖子点赞（组内点赞） ──────────────────────────────────────────────────
// POST /api/v1/groups/:id/posts/:postId/likes
router.post('/:id/posts/:postId/likes', authMiddleware, async (req, res) => {
  try {
    const result = await groupService.toggleGroupPostLike({
      postId: Number(req.params.postId),
      userId: req.user.id,
    });
    res.ok(result);
  } catch (err) {
    res.fail(err.message || '操作失败', err.status || 500);
  }
});

// ── 创建阅读挑战 ──────────────────────────────────────────────────────────────
// POST /api/v1/groups/:id/challenges
router.post('/:id/challenges', authMiddleware, async (req, res) => {
  try {
    const { title, description, bookId, targetPages, deadline } = req.body;
    if (!title || !deadline) {
      return res.fail('挑战标题和截止日期为必填项', 400);
    }
    const challenge = await groupService.createChallenge({
      groupId: Number(req.params.id),
      creatorId: req.user.id,
      title,
      description: description || '',
      bookId: bookId || null,
      targetPages: targetPages || null,
      deadline,
    });
    res.created(challenge);
  } catch (err) {
    res.fail(err.message || '创建挑战失败', err.status || 500);
  }
});

// ── 挑战列表 ──────────────────────────────────────────────────────────────────
// GET /api/v1/groups/:id/challenges
router.get('/:id/challenges', optionalAuth, async (req, res) => {
  try {
    const { page = 1, status } = req.query;
    const result = await groupService.listChallenges({
      groupId: Number(req.params.id),
      page: Number(page),
      status: status || null,
      currentUserId: req.user?.id || null,
    });
    res.paginate(result.list, result.total, Number(page), 10);
  } catch (err) {
    res.fail(err.message || '获取挑战列表失败', err.status || 500);
  }
});

// ── 打卡 ──────────────────────────────────────────────────────────────────────
// POST /api/v1/challenges/:challengeId/checkin
router.post('/:id/challenges/:challengeId/checkin', authMiddleware, async (req, res) => {
  try {
    const { note, currentPages } = req.body;
    const result = await groupService.checkin({
      challengeId: Number(req.params.challengeId),
      userId: req.user.id,
      note: note || '',
      currentPages: currentPages || null,
    });
    res.ok(result);
  } catch (err) {
    res.fail(err.message || '打卡失败', err.status || 500);
  }
});

// ── 我加入的小组 ──────────────────────────────────────────────────────────────
// GET /api/v1/groups/mine (注意：此路由需在 /:id 之前注册，避免被吞)
// 已通过路由顺序在 app.js 中处理，这里提供 /api/v1/users/me/groups 的替代查询
module.exports = router;
