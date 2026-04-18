/**
 * 模块2 · bookApi.ts
 * 书籍搜索 / 详情 / 分类 / 标签 / 书架 CRUD / CSV 导出
 */
import apiClient from './apiClient';

// ═══════════════════════════════════════════════════════════════════════════════
//  类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface BookTag {
  id: number;
  name: string;
  isOfficial: boolean;
  count: number;
}

export interface MyShelf {
  bookId: number;
  status: 1 | 2 | 3;
  rating: number | null;
  shortComment: string | null;
  startDate: string | null;
  finishDate: string | null;
  readingProgress: number | null;
  totalPagesRef: number | null;
  shelfGroup: string | null;
  isPrivate: boolean;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn13: string | null;
  coverUrl: string | null;
  publisher: string | null;
  publishDate: string | null;
  pages: number | null;
  language: string | null;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  platformRating: number | null;
  ratingCount: number;
  shelfCount: number;
  reviewCount: number;
  readerAvailable: boolean;
  readerSource: string | null;
  readerSourceUrl: string | null;
  readerLicenseNote: string | null;
  readerPageCount: number | null;
  tags: BookTag[];
  myShelf: MyShelf | null;
}

export interface ReaderTocItem {
  id: number;
  chapterIndex: number;
  title: string;
  pageStart: number;
  pageCount: number;
  wordCount: number;
}

export interface ReaderProgress {
  chapterId: number;
  chapterIndex: number | null;
  chapterTitle: string | null;
  page: number | null;
  percent: number | null;
  chapterProgress: number;
  updatedAt: string;
}

export interface ReaderBookmark {
  id: number;
  chapterId: number;
  chapterIndex: number;
  chapterTitle: string;
  chapterProgress: number;
  page: number | null;
  percent: number | null;
  quote: string | null;
  note: string | null;
  createdAt: string;
}

export interface ReaderManifest {
  book: Pick<Book, 'id' | 'title' | 'author' | 'coverUrl' | 'readerAvailable' | 'readerSource' | 'readerSourceUrl' | 'readerLicenseNote' | 'readerPageCount'>;
  toc: ReaderTocItem[];
  progress: ReaderProgress | null;
  bookmarks: ReaderBookmark[];
}

export interface ReaderChapterLink {
  id: number;
  chapterIndex: number;
  title: string;
}

export interface ReaderChapter {
  id: number;
  bookId: number;
  title: string;
  chapterIndex: number;
  content: string;
  charCount: number;
  wordCount: number;
  pageStart: number;
  pageCount: number;
  previousChapter: ReaderChapterLink | null;
  nextChapter: ReaderChapterLink | null;
}

export interface ShelfEntry {
  bookId: number;
  title: string;
  author: string;
  coverUrl: string | null;
  pages: number | null;
  platformRating: number | null;
  status: 1 | 2 | 3;
  rating: number | null;
  shortComment: string | null;
  startDate: string | null;
  finishDate: string | null;
  readingProgress: number | null;
  totalPagesRef: number | null;
  shelfGroup: string | null;
  isPrivate: boolean;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  sortOrder: number;
  bookCount?: number;
}

export interface ShelfUpdatePayload {
  status?: 1 | 2 | 3;
  rating?: number;
  shortComment?: string;
  startDate?: string;
  finishDate?: string;
  readingProgress?: number;
  shelfGroup?: string;
  isPrivate?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  书籍接口
// ═══════════════════════════════════════════════════════════════════════════════

/** 搜索书籍（本地 FULLTEXT → Open Library → Google Books） */
/** 浏览书籍列表（首页） */
export const browseBooks = async (
  page = 1,
  category?: number | null,
): Promise<{ list: Book[]; total: number; page: number; totalPages: number }> => {
  const params: Record<string, unknown> = { page };
  if (category) params.category = category;
  const { data } = await apiClient.get('/books', { params });
  return data.data;
};

export const searchBooks = (q: string, page = 1, category?: number) =>
  apiClient.get('/books/search', { params: { q, page, ...(category ? { category } : {}) } });

/** 获取书籍详情（含 myShelf 字段，需登录后才有） */
export const getBook = (id: number) =>
  apiClient.get<{ code: number; data: Book }>(`/books/${id}`);

export const getReaderManifest = (bookId: number) =>
  apiClient.get<{ code: number; data: ReaderManifest }>(`/books/${bookId}/reader`);

export const getReaderChapter = (bookId: number, chapterId: number) =>
  apiClient.get<{ code: number; data: ReaderChapter }>(`/books/${bookId}/reader/chapters/${chapterId}`);

export const saveReaderProgress = (bookId: number, payload: { chapterId: number; chapterProgress: number }) =>
  apiClient.put<{ code: number; data: ReaderProgress }>(`/books/${bookId}/reader/progress`, payload);

export const addReaderBookmark = (bookId: number, payload: { chapterId: number; chapterProgress: number; quote?: string; note?: string }) =>
  apiClient.post<{ code: number; data: ReaderBookmark }>(`/books/${bookId}/reader/bookmarks`, payload);

export const removeReaderBookmark = (bookId: number, bookmarkId: number) =>
  apiClient.delete<{ code: number; data: { success: boolean } }>(`/books/${bookId}/reader/bookmarks/${bookmarkId}`);

/** 获取全部书籍大类 */
export const getCategories = () =>
  apiClient.get<{ code: number; data: Category[] }>('/books/categories');

/** 获取书籍标签列表 */
export const getBookTags = (bookId: number) =>
  apiClient.get<{ code: number; data: BookTag[] }>(`/books/${bookId}/tags`);

/** 为书籍添加标签（需登录） */
export const addBookTag = (bookId: number, tagName: string) =>
  apiClient.post(`/books/${bookId}/tags`, { tagName });

// ═══════════════════════════════════════════════════════════════════════════════
//  书架接口
// ═══════════════════════════════════════════════════════════════════════════════

/** 获取我的书架列表 */
export const getShelf = (params?: { status?: 1 | 2 | 3; page?: number; group?: string }) =>
  apiClient.get('/users/me/shelf', { params });

/** 添加书籍到书架 */
export const addToShelf = (bookId: number, status: 1 | 2 | 3, shelfGroup?: string) =>
  apiClient.post('/users/me/shelf', { bookId, status, shelfGroup });

/** 更新书架记录（状态/评分/进度/短评等） */
export const updateShelfEntry = (bookId: number, updates: ShelfUpdatePayload) =>
  apiClient.put(`/users/me/shelf/${bookId}`, updates);

/** 从书架移除 */
export const removeFromShelf = (bookId: number) =>
  apiClient.delete(`/users/me/shelf/${bookId}`);

/** 导出书架 CSV（返回 Blob） */
export const exportShelf = () =>
  apiClient.get('/users/me/shelf/export', { responseType: 'blob' });

// ═══════════════════════════════════════════════════════════════════════════════
//  工具函数
// ═══════════════════════════════════════════════════════════════════════════════

/** 触发 CSV 文件下载 */
export const downloadShelfCsv = async (): Promise<void> => {
  const res = await exportShelf();
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
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
export const ratingToStars = (rating: number | null): string => {
  if (rating === null || rating === undefined) return '暂无评分';
  const stars   = rating / 2;          // 转换为 0.5–5
  const full    = Math.floor(stars);
  const hasHalf = (stars - full) >= 0.5;
  const empty   = 5 - full - (hasHalf ? 1 : 0);
  return '★'.repeat(full) + (hasHalf ? '½' : '') + '☆'.repeat(empty);
};

/** 阅读状态文本 */
export const STATUS_LABELS: Record<1 | 2 | 3, string> = {
  1: '想读',
  2: '在读',
  3: '已读',
};

/** 阅读状态颜色（与 Design Token 对应） */
export const STATUS_COLORS: Record<1 | 2 | 3, string> = {
  1: '#C8A96E',
  2: '#4A6741',
  3: '#6B8F62',
};
