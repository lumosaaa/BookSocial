import apiClient from './apiClient';

// ─── 类型定义 ────────────────────────────────────────────────

export interface BookRef {
  id: number;
  title: string;
  author: string;
  coverUrl?: string;
}

export interface PostImage {
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  sortOrder: number;
}

export interface Post {
  data: any;
  id: number;
  userId: number;
  username: string;
  avatarUrl?: string;
  content: string;
  postType: 0 | 1 | 2 | 3 | 4;   // 0普通 1书评 2笔记 3书单 4进度
  bookId?: number;
  book?: BookRef;
  bookList?: number[];
  rating?: number;
  visibility: 0 | 1 | 2;
  hasSpoiler: boolean;
  imageCount: number;
  images: PostImage[];
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  shareCount: number;
  originPostId?: number;
  originPost?: Partial<Post>;
  auditStatus: number;
  isDeleted: boolean;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  data: any;
  id: number;
  userId: number;
  username: string;
  avatarUrl?: string;
  targetId: number;
  targetType: number;
  parentId?: number;
  rootId?: number;
  replyToUserId?: number;
  replyToUsername?: string;
  content: string;
  likeCount: number;
  replyCount: number;
  isDeleted: boolean;
  isLiked: boolean;
  replies: Comment[];
  createdAt: string;
}

export interface ReadingNote {
  data: any;
  id: number;
  userId: number;
  username: string;
  avatarUrl?: string;
  bookId: number;
  bookTitle?: string;
  bookAuthor?: string;
  bookCoverUrl?: string;
  title?: string;
  content: string;
  quote?: string;
  pageNumber?: number;
  chapter?: string;
  isPublic: boolean;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserCard {
  id: number;
  username: string;
  avatarUrl?: string;
  bio?: string;
  followerCount: number;
  followingCount: number;
  isMutual?: boolean;
  isFollowed?: boolean;
}

export interface PageResult<T> {
  data: any;
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CursorResult<T> {
  data: any;
  list: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const POST_TYPE_LABELS: Record<number, string> = {
  0: '动态',
  1: '书评',
  2: '阅读笔记',
  3: '书单',
  4: '进度更新',
};

export const POST_TYPE_MAX_LENGTH: Record<number, number> = {
  0: 1000, 1: 2000, 2: 1000, 3: 500, 4: 200,
};

// ─── 动态接口 ────────────────────────────────────────────────

/** 获取信息流 */
export const getFeed = (
  tab: 'following' | 'recommend' = 'recommend',
  cursor?: string,
  pageSize = 20
) =>
  apiClient
    .get<CursorResult<Post>>('/posts', { params: { tab, cursor, pageSize } })
    .then(r => r.data.data);

/** 发帖 */
export const createPost = (payload: {
  content: string;
  postType?: number;
  bookId?: number;
  bookList?: number[];
  rating?: number;
  visibility?: number;
  hasSpoiler?: boolean;
  imageUrls?: string[];
}) =>
  apiClient.post<Post>('/posts', payload).then(r => r.data.data);

/** 帖子详情 */
export const getPost = (id: number) =>
  apiClient.get<Post>(`/posts/${id}`).then(r => r.data.data);

/** 删除帖子 */
export const deletePost = (id: number) =>
  apiClient.delete(`/posts/${id}`).then(r => r.data);

/** 点赞/取消点赞 动态 */
export const togglePostLike = (id: number) =>
  apiClient
    .post<{
      data: any; liked: boolean; likeCount: number 
}>(`/posts/${id}/likes`)
    .then(r => r.data.data);

/** 转发帖子 */
export const sharePost = (id: number, content?: string) =>
  apiClient.post<Post>(`/posts/${id}/share`, { content }).then(r => r.data.data);

/** 用户主页动态列表 */
export const getUserPosts = (userId: number, page = 1, pageSize = 20) =>
  apiClient
    .get<PageResult<Post>>(`/users/${userId}/posts`, { params: { page, pageSize } })
    .then(r => r.data.data);

// ─── 评论接口 ────────────────────────────────────────────────

/** 获取帖子评论列表 */
export const getPostComments = (postId: number, page = 1, pageSize = 10) =>
  apiClient
    .get<PageResult<Comment>>(`/posts/${postId}/comments`, { params: { page, pageSize } })
    .then(r => r.data.data);

/** 展开子评论 */
export const getReplies = (commentId: number) =>
  apiClient.get<{ data: Comment[] }>(`/comments/${commentId}/replies`).then(r => r.data.data);

/** 发表评论 / 回复 */
export const createComment = (
  postId: number,
  payload: { content: string; parentId?: number }
) =>
  apiClient
    .post<Comment>(`/posts/${postId}/comments`, payload)
    .then(r => r.data.data);

/** 点赞评论 */
export const toggleCommentLike = (commentId: number) =>
  apiClient
    .post<{
      data: any; liked: boolean; likeCount: number 
}>(`/comments/${commentId}/likes`)
    .then(r => r.data.data);

/** 删除评论 */
export const deleteComment = (commentId: number) =>
  apiClient.delete(`/comments/${commentId}`).then(r => r.data);

// ─── 收藏接口 ────────────────────────────────────────────────

/** 收藏动态 */
export const bookmarkPost = (targetId: number) =>
  apiClient
    .post<{
      data: any; bookmarked: boolean 
}>('/bookmarks', { targetId, targetType: 1 })
    .then(r => r.data.data);

/** 取消收藏 */
export const unbookmark = (bookmarkId: number) =>
  apiClient.delete(`/bookmarks/${bookmarkId}`).then(r => r.data);

/** 我的收藏列表 */
export const getMyBookmarks = (page = 1, pageSize = 20) =>
  apiClient
    .get<PageResult<Post>>('/bookmarks/me', { params: { page, pageSize } })
    .then(r => r.data.data);

// ─── 阅读笔记接口 ────────────────────────────────────────────

/** 新建笔记 */
export const createNote = (payload: {
  bookId: number;
  title?: string;
  content: string;
  quote?: string;
  pageNumber?: number;
  chapter?: string;
  isPublic?: boolean;
}) => apiClient.post<ReadingNote>('/reading-notes', payload).then(r => r.data.data);

/** 编辑笔记 */
export const updateNote = (id: number, payload: Partial<typeof createNote>) =>
  apiClient.put<ReadingNote>(`/reading-notes/${id}`, payload).then(r => r.data.data);

/** 删除笔记 */
export const deleteNote = (id: number) =>
  apiClient.delete(`/reading-notes/${id}`).then(r => r.data);

/** 笔记详情 */
export const getNote = (id: number) =>
  apiClient.get<ReadingNote>(`/reading-notes/${id}`).then(r => r.data.data);

/** 点赞笔记 */
export const toggleNoteLike = (id: number) =>
  apiClient
    .post<{
      data: any; liked: boolean; likeCount: number 
}>(`/reading-notes/${id}/likes`)
    .then(r => r.data.data);

/** 某书的公开笔记列表 */
export const getBookNotes = (bookId: number, page = 1, pageSize = 20, sort: 'hot' | 'new' = 'hot') =>
  apiClient
    .get<PageResult<ReadingNote>>(`/books/${bookId}/notes`, { params: { page, pageSize, sort } })
    .then(r => r.data.data);

/** 某用户的笔记列表 */
export const getUserNotes = (userId: number, page = 1, pageSize = 20) =>
  apiClient
    .get<PageResult<ReadingNote>>(`/users/${userId}/notes`, { params: { page, pageSize } })
    .then(r => r.data.data);

// ─── 关注接口 ────────────────────────────────────────────────

/** 关注 / 取关 Toggle */
export const toggleFollow = (userId: number) =>
  apiClient
    .post<{
      data: any; followed: boolean; isMutual: boolean; followerCount: number 
}>(
      `/users/${userId}/follow`
    )
    .then(r => r.data.data);

/** 粉丝列表 */
export const getFollowers = (userId: number, page = 1, pageSize = 20) =>
  apiClient
    .get<PageResult<UserCard>>(`/users/${userId}/followers`, { params: { page, pageSize } })
    .then(r => r.data.data);

/** 关注列表 */
export const getFollowing = (userId: number, page = 1, pageSize = 20) =>
  apiClient
    .get<PageResult<UserCard>>(`/users/${userId}/following`, { params: { page, pageSize } })
    .then(r => r.data.data);

// ─── 举报接口 ────────────────────────────────────────────────

/** 提交举报 */
export const submitReport = (payload: {
  targetId: number;
  targetType: number;
  reason: number;
  detail?: string;
}) => apiClient.post('/reports', payload).then(r => r.data);
