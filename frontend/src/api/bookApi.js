/**
 * 模块2 · bookApi.ts
 * 书籍搜索 / 详情 / 分类 / 标签 / 书架 CRUD / CSV 导出
 */
import apiClient from './apiClient';
// ═══════════════════════════════════════════════════════════════════════════════
//  书籍接口
// ═══════════════════════════════════════════════════════════════════════════════
/** 搜索书籍（本地 FULLTEXT → Open Library → Google Books） */
/** 浏览书籍列表（首页） */
export const browseBooks = async (page = 1, category) => {
    const params = { page };
    if (category)
        params.category = category;
    const { data } = await apiClient.get('/books', { params });
    return data.data;
};
export const searchBooks = (q, page = 1, category) => apiClient.get('/books/search', { params: { q, page, ...(category ? { category } : {}) } });
/** 获取书籍详情（含 myShelf 字段，需登录后才有） */
export const getBook = (id) => apiClient.get(`/books/${id}`);
export const getReaderManifest = (bookId) => apiClient.get(`/books/${bookId}/reader`);
export const getReaderChapter = (bookId, chapterId) => apiClient.get(`/books/${bookId}/reader/chapters/${chapterId}`);
export const saveReaderProgress = (bookId, payload) => apiClient.put(`/books/${bookId}/reader/progress`, payload);
export const addReaderBookmark = (bookId, payload) => apiClient.post(`/books/${bookId}/reader/bookmarks`, payload);
export const removeReaderBookmark = (bookId, bookmarkId) => apiClient.delete(`/books/${bookId}/reader/bookmarks/${bookmarkId}`);
/** 获取全部书籍大类 */
export const getCategories = () => apiClient.get('/books/categories');
/** 获取书籍标签列表 */
export const getBookTags = (bookId) => apiClient.get(`/books/${bookId}/tags`);
/** 为书籍添加标签（需登录） */
export const addBookTag = (bookId, tagName) => apiClient.post(`/books/${bookId}/tags`, { tagName });
// ═══════════════════════════════════════════════════════════════════════════════
//  书架接口
// ═══════════════════════════════════════════════════════════════════════════════
/** 获取我的书架列表 */
export const getShelf = (params) => apiClient.get('/users/me/shelf', { params });
/** 添加书籍到书架 */
export const addToShelf = (bookId, status, shelfGroup) => apiClient.post('/users/me/shelf', { bookId, status, shelfGroup });
/** 更新书架记录（状态/评分/进度/短评等） */
export const updateShelfEntry = (bookId, updates) => apiClient.put(`/users/me/shelf/${bookId}`, updates);
/** 从书架移除 */
export const removeFromShelf = (bookId) => apiClient.delete(`/users/me/shelf/${bookId}`);
/** 导出书架 CSV（返回 Blob） */
export const exportShelf = () => apiClient.get('/users/me/shelf/export', { responseType: 'blob' });
// ═══════════════════════════════════════════════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════════════════════════════════════════════
/** 触发 CSV 文件下载 */
export const downloadShelfCsv = async () => {
    const res = await exportShelf();
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_shelf.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
/**
 * 评分转半星字符串展示
 * rating 范围 1-10（对应 0.5-5 星）
 */
export const ratingToStars = (rating) => {
    if (rating === null || rating === undefined)
        return '暂无评分';
    const stars = rating / 2; // 转换为 0.5–5
    const full = Math.floor(stars);
    const hasHalf = (stars - full) >= 0.5;
    const empty = 5 - full - (hasHalf ? 1 : 0);
    return '★'.repeat(full) + (hasHalf ? '½' : '') + '☆'.repeat(empty);
};
/** 阅读状态文本 */
export const STATUS_LABELS = {
    1: '想读',
    2: '在读',
    3: '已读',
};
/** 阅读状态颜色（与 Design Token 对应） */
export const STATUS_COLORS = {
    1: '#C8A96E',
    2: '#4A6741',
    3: '#6B8F62',
};
