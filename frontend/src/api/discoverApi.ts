/**
 * discoverApi.ts — M6 · 发现页接口封装
 */

import apiClient from './apiClient';

// ── 类型定义 ──────────────────────────────────────────────────
export interface RecommendedBook {
  id:             number;
  title:          string;
  author:         string;
  coverUrl:       string | null;
  platformRating: number | null;
  shelfCount:     number;
  categoryName:   string | null;
}

export interface RecommendedFriend {
  id:             number;
  username:       string;
  avatarUrl:      string | null;
  bio:            string | null;
  followerCount:  number;
  bookCount:      number;
  isFollowing:    boolean;
}

export interface InterestProfile {
  categories: { category: string; count: number }[];
  tags:        { name: string; count: number }[];
  activity:    { date: string; count: number }[];
  ratings:     { rating: number; count: number }[];
}

// ── 推荐书籍 ──────────────────────────────────────────────────
export async function getRecommendedBooks(limit = 20): Promise<RecommendedBook[]> {
  const res = await apiClient.get('/recommendations/books', { params: { limit } });
  return res.data.data || [];
}

// ── 推荐书友 ──────────────────────────────────────────────────
export async function getRecommendedFriends(limit = 10): Promise<RecommendedFriend[]> {
  const res = await apiClient.get('/recommendations/friends', { params: { limit } });
  return res.data.data || [];
}

// ── 热门书籍榜 ────────────────────────────────────────────────
export async function getHotBooks(limit = 20): Promise<RecommendedBook[]> {
  const res = await apiClient.get('/recommendations/hot', { params: { limit } });
  return res.data.data || [];
}

// ── 推荐反馈 ──────────────────────────────────────────────────
export async function submitFeedback(
  targetId: number,
  targetType: 'book' | 'friend',
  action: 'dislike'
): Promise<void> {
  await apiClient.post('/recommendations/feedback', { targetId, targetType, action });
}

// ── 用户兴趣画像 ──────────────────────────────────────────────
export async function getInterestProfile(userId: number): Promise<InterestProfile> {
  const res = await apiClient.get(`/users/${userId}/interest-profile`);
  return res.data.data;
}

// ── 行为日志上报（工具函数，供其他模块调用）──────────────────────
export async function reportBehavior(
  actionType: number,
  targetId: number,
  targetType: number,
  extraData?: Record<string, unknown>
): Promise<void> {
  try {
    await apiClient.post('/recommendations/behavior-logs', {
      actionType,
      targetId,
      targetType,
      extraData,
    });
  } catch {
    // 行为上报失败不影响主流程
  }
}

// actionType 常量
export const ACTION_TYPE = {
  VIEW_BOOK:    1,
  ADD_SHELF:    2,
  RATE_BOOK:    3,
  WRITE_REVIEW: 4,
  LIKE:         5,
  SEARCH:       6,
  VIEW_USER:    7,
} as const;

// targetType 常量
export const TARGET_TYPE = {
  BOOK:  1,
  USER:  2,
  POST:  3,
  GROUP: 4,
} as const;
