import apiClient from './apiClient';
export const POST_TYPE_LABELS = {
    0: '动态',
    1: '书评',
    2: '阅读笔记',
    3: '书单',
    4: '进度更新',
};
export const POST_TYPE_MAX_LENGTH = {
    0: 1000, 1: 2000, 2: 1000, 3: 500, 4: 200,
};
// ─── 动态接口 ────────────────────────────────────────────────
/** 获取信息流 */
export const getFeed = (tab = 'recommend', cursor, pageSize = 20) => apiClient
    .get('/posts', { params: { tab, cursor, pageSize } })
    .then(r => r.data.data);
/** 发帖 */
export const createPost = (payload) => apiClient.post('/posts', payload).then(r => r.data.data);
/** 帖子详情 */
export const getPost = (id) => apiClient.get(`/posts/${id}`).then(r => r.data.data);
/** 删除帖子 */
export const deletePost = (id) => apiClient.delete(`/posts/${id}`).then(r => r.data);
/** 点赞/取消点赞 动态 */
export const togglePostLike = (id) => apiClient
    .post(`/posts/${id}/likes`)
    .then(r => r.data.data);
/** 转发帖子 */
export const sharePost = (id, content) => apiClient.post(`/posts/${id}/share`, { content }).then(r => r.data.data);
/** 用户主页动态列表 */
export const getUserPosts = (userId, page = 1, pageSize = 20) => apiClient
    .get(`/users/${userId}/posts`, { params: { page, pageSize } })
    .then(r => r.data.data);
// ─── 评论接口 ────────────────────────────────────────────────
/** 获取帖子评论列表 */
export const getPostComments = (postId, page = 1, pageSize = 10) => apiClient
    .get(`/posts/${postId}/comments`, { params: { page, pageSize } })
    .then(r => r.data.data);
/** 展开子评论 */
export const getReplies = (commentId) => apiClient.get(`/comments/${commentId}/replies`).then(r => r.data.data);
/** 发表评论 / 回复 */
export const createComment = (postId, payload) => apiClient
    .post(`/posts/${postId}/comments`, payload)
    .then(r => r.data.data);
/** 点赞评论 */
export const toggleCommentLike = (commentId) => apiClient
    .post(`/comments/${commentId}/likes`)
    .then(r => r.data.data);
/** 删除评论 */
export const deleteComment = (commentId) => apiClient.delete(`/comments/${commentId}`).then(r => r.data);
// ─── 收藏接口 ────────────────────────────────────────────────
/** 收藏动态 */
export const bookmarkPost = (targetId) => apiClient
    .post('/bookmarks', { targetId, targetType: 1 })
    .then(r => r.data.data);
/** 取消收藏 */
export const unbookmark = (bookmarkId) => apiClient.delete(`/bookmarks/${bookmarkId}`).then(r => r.data);
/** 我的收藏列表 */
export const getMyBookmarks = (page = 1, pageSize = 20) => apiClient
    .get('/bookmarks/me', { params: { page, pageSize } })
    .then(r => r.data.data);
// ─── 阅读笔记接口 ────────────────────────────────────────────
/** 新建笔记 */
export const createNote = (payload) => apiClient.post('/reading-notes', payload).then(r => r.data.data);
/** 编辑笔记 */
export const updateNote = (id, payload) => apiClient.put(`/reading-notes/${id}`, payload).then(r => r.data.data);
/** 删除笔记 */
export const deleteNote = (id) => apiClient.delete(`/reading-notes/${id}`).then(r => r.data);
/** 笔记详情 */
export const getNote = (id) => apiClient.get(`/reading-notes/${id}`).then(r => r.data.data);
/** 点赞笔记 */
export const toggleNoteLike = (id) => apiClient
    .post(`/reading-notes/${id}/likes`)
    .then(r => r.data.data);
/** 某书的公开笔记列表 */
export const getBookNotes = (bookId, page = 1, pageSize = 20, sort = 'hot') => apiClient
    .get(`/books/${bookId}/notes`, { params: { page, pageSize, sort } })
    .then(r => r.data.data);
/** 某用户的笔记列表 */
export const getUserNotes = (userId, page = 1, pageSize = 20) => apiClient
    .get(`/users/${userId}/notes`, { params: { page, pageSize } })
    .then(r => r.data.data);
// ─── 关注接口 ────────────────────────────────────────────────
/** 关注 / 取关 Toggle */
export const toggleFollow = (userId) => apiClient
    .post(`/users/${userId}/follow`)
    .then(r => r.data.data);
/** 粉丝列表 */
export const getFollowers = (userId, page = 1, pageSize = 20) => apiClient
    .get(`/users/${userId}/followers`, { params: { page, pageSize } })
    .then(r => r.data.data);
/** 关注列表 */
export const getFollowing = (userId, page = 1, pageSize = 20) => apiClient
    .get(`/users/${userId}/following`, { params: { page, pageSize } })
    .then(r => r.data.data);
// ─── 举报接口 ────────────────────────────────────────────────
/** 提交举报 */
export const submitReport = (payload) => apiClient.post('/reports', payload).then(r => r.data);
