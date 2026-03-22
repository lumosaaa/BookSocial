/**
 * M5 · 小组 & 书籍讨论 前端接口封装
 * 统一使用项目共享的 apiClient（Token 自动注入）
 */
import apiClient from './apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────────────────

export interface Group {
  id:              number;
  name:            string;
  description:     string;
  coverUrl:        string | null;
  creatorId:       number;
  creatorName:     string | null;
  creatorAvatar:   string | null;
  categoryId:      number | null;
  categoryName:    string | null;
  memberCount:     number;
  postCount:       number;
  isPublic:        boolean;
  requireApproval: boolean;
  status:          number;
  myRole:          number | null;  // null=非成员, 0=普通, 1=管理员, 2=组长
  isMember:        boolean;
  createdAt:       string;
}

export interface GroupMember {
  userId:    number;
  username:  string;
  avatarUrl: string | null;
  bio:       string;
  role:      number;
  joinedAt:  string;
}

export interface GroupPost {
  id:           number;
  groupId:      number;
  userId:       number;
  username:     string;
  avatarUrl:    string | null;
  content:      string;
  isDeleted:    boolean;
  likeCount:    number;
  commentCount: number;
  isLiked:      boolean;
  createdAt:    string;
}

export interface Challenge {
  id:               number;
  groupId:          number;
  creatorId:        number;
  creatorName:      string | null;
  title:            string;
  description:      string;
  bookId:           number | null;
  bookTitle:        string | null;
  bookCover:        string | null;
  targetPages:      number | null;
  deadline:         string;
  participantCount: number;
  myCheckinCount:   number;
  myLastCheckin:    string | null;
  isParticipating:  boolean;
  status:           'active' | 'ended';
  createdAt:        string;
}

export interface Discussion {
  id:           number;
  bookId:       number;
  bookTitle:    string | null;
  bookCover:    string | null;
  userId:       number;
  username:     string | null;
  avatarUrl:    string | null;
  title:        string;
  content:      string;
  category:     number;
  categoryName: string;
  hasSpoiler:   boolean;
  likeCount:    number;
  commentCount: number;
  viewCount:    number;
  isLiked:      boolean;
  isDeleted:    boolean;
  createdAt:    string;
  updatedAt:    string;
}

export interface DiscussionComment {
  id:              number;
  discId:          number;
  userId:          number;
  username:        string | null;
  avatarUrl:       string | null;
  content:         string;
  parentId:        number | null;
  replyToUserId:   number | null;
  replyToUsername: string | null;
  likeCount:       number;
  isLiked:         boolean;
  isDeleted:       boolean;
  createdAt:       string;
}

export interface PagedResult<T> {
  list:       T[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
  hasMore:    boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 小组接口
// ─────────────────────────────────────────────────────────────────────────────

/** 小组列表/搜索 */
export async function listGroups(params: {
  q?: string;
  category?: number;
  page?: number;
}): Promise<PagedResult<Group>> {
  const { data } = await apiClient.get('/groups', { params });
  return data.data;
}

/** 创建小组 */
export async function createGroup(payload: {
  name:            string;
  description?:    string;
  coverUrl?:       string;
  categoryId?:     number;
  isPublic?:       boolean;
  requireApproval?: boolean;
}): Promise<Group> {
  const { data } = await apiClient.post('/groups', payload);
  return data.data;
}

/** 小组详情 */
export async function getGroup(groupId: number): Promise<Group> {
  const { data } = await apiClient.get(`/groups/${groupId}`);
  return data.data;
}

/** 编辑小组 */
export async function updateGroup(groupId: number, payload: Partial<{
  name:            string;
  description:     string;
  coverUrl:        string;
  categoryId:      number;
  isPublic:        boolean;
  requireApproval: boolean;
}>): Promise<Group> {
  const { data } = await apiClient.put(`/groups/${groupId}`, payload);
  return data.data;
}

/** 解散小组 */
export async function dissolveGroup(groupId: number): Promise<void> {
  await apiClient.delete(`/groups/${groupId}`);
}

/** 加入小组 */
export async function joinGroup(groupId: number): Promise<{ joined: boolean; pending: boolean }> {
  const { data } = await apiClient.post(`/groups/${groupId}/join`);
  return data.data;
}

/** 退出小组 */
export async function leaveGroup(groupId: number): Promise<void> {
  await apiClient.delete(`/groups/${groupId}/leave`);
}

/** 成员列表 */
export async function listMembers(groupId: number, params?: {
  page?: number;
  role?: number;
}): Promise<PagedResult<GroupMember>> {
  const { data } = await apiClient.get(`/groups/${groupId}/members`, { params });
  return data.data;
}

/** 审批申请 */
export async function approveJoin(groupId: number, userId: number, approve: boolean): Promise<void> {
  await apiClient.put(`/groups/${groupId}/members/${userId}/approve`, { approve });
}

/** 调整角色 */
export async function setMemberRole(groupId: number, userId: number, role: number): Promise<void> {
  await apiClient.put(`/groups/${groupId}/members/${userId}/role`, { role });
}

/** 移除成员 */
export async function removeMember(groupId: number, userId: number): Promise<void> {
  await apiClient.delete(`/groups/${groupId}/members/${userId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 小组帖子接口
// ─────────────────────────────────────────────────────────────────────────────

export async function listGroupPosts(groupId: number, page = 1): Promise<PagedResult<GroupPost>> {
  const { data } = await apiClient.get(`/groups/${groupId}/posts`, { params: { page } });
  return data.data;
}

export async function createGroupPost(groupId: number, payload: {
  content:    string;
  imageUrls?: string[];
}): Promise<GroupPost> {
  const { data } = await apiClient.post(`/groups/${groupId}/posts`, payload);
  return data.data;
}

export async function deleteGroupPost(groupId: number, postId: number): Promise<void> {
  await apiClient.delete(`/groups/${groupId}/posts/${postId}`);
}

export async function toggleGroupPostLike(groupId: number, postId: number): Promise<{
  liked: boolean;
  likeCount: number;
}> {
  const { data } = await apiClient.post(`/groups/${groupId}/posts/${postId}/likes`);
  return data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 阅读挑战接口
// ─────────────────────────────────────────────────────────────────────────────

export async function listChallenges(groupId: number, params?: {
  page?:   number;
  status?: 'active' | 'ended';
}): Promise<PagedResult<Challenge>> {
  const { data } = await apiClient.get(`/groups/${groupId}/challenges`, { params });
  return data.data;
}

export async function createChallenge(groupId: number, payload: {
  title:        string;
  description?: string;
  bookId?:      number;
  targetPages?: number;
  deadline:     string;
}): Promise<Challenge> {
  const { data } = await apiClient.post(`/groups/${groupId}/challenges`, payload);
  return data.data;
}

export async function checkin(groupId: number, challengeId: number, payload?: {
  note?:         string;
  currentPages?: number;
}): Promise<{ checkedIn: boolean; checkinCount: number }> {
  const { data } = await apiClient.post(
    `/groups/${groupId}/challenges/${challengeId}/checkin`,
    payload || {}
  );
  return data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 书籍讨论接口
// ─────────────────────────────────────────────────────────────────────────────

export async function listDiscussions(bookId: number, params?: {
  category?: number;
  sort?:     'hot' | 'new';
  page?:     number;
}): Promise<PagedResult<Discussion>> {
  const { data } = await apiClient.get(`/books/${bookId}/discussions`, { params });
  return data.data;
}

export async function createDiscussion(bookId: number, payload: {
  title:       string;
  content:     string;
  category?:   number;
  hasSpoiler?: boolean;
}): Promise<Discussion> {
  const { data } = await apiClient.post(`/books/${bookId}/discussions`, payload);
  return data.data;
}

export async function getDiscussion(discId: number): Promise<Discussion> {
  const { data } = await apiClient.get(`/discussions/${discId}`);
  return data.data;
}

export async function deleteDiscussion(discId: number): Promise<void> {
  await apiClient.delete(`/discussions/${discId}`);
}

export async function listDiscussionComments(discId: number, page = 1): Promise<PagedResult<DiscussionComment>> {
  const { data } = await apiClient.get(`/discussions/${discId}/comments`, { params: { page } });
  return data.data;
}

export async function createDiscussionComment(discId: number, payload: {
  content:   string;
  parentId?: number;
}): Promise<DiscussionComment> {
  const { data } = await apiClient.post(`/discussions/${discId}/comments`, payload);
  return data.data;
}

export async function deleteDiscussionComment(discId: number, commentId: number): Promise<void> {
  await apiClient.delete(`/discussions/${discId}/comments/${commentId}`);
}

export async function toggleDiscussionLike(discId: number): Promise<{ liked: boolean; likeCount: number }> {
  const { data } = await apiClient.post(`/discussions/${discId}/likes`);
  return data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<number, string> = {
  2:  '组长',
  1:  '管理员',
  0:  '成员',
  '-1': '待审核',
};

export const DISCUSSION_CATEGORIES = [
  { value: 0, label: '综合' },
  { value: 1, label: '书评' },
  { value: 2, label: '剧情' },
  { value: 3, label: '推荐' },
  { value: 4, label: '求助' },
];

/** 挑战是否仍在进行中 */
export function isChallengeActive(challenge: Challenge): boolean {
  return new Date(challenge.deadline) > new Date();
}

/** 今天是否已打卡 */
export function hasCheckedInToday(lastCheckin: string | null): boolean {
  if (!lastCheckin) return false;
  const today = new Date().toISOString().slice(0, 10);
  return lastCheckin.slice(0, 10) === today;
}
