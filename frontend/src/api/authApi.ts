// src/api/authApi.ts
import apiClient from './apiClient';

// ─── 类型定义 ──────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  code: string;
  username: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password?: string;
  code?: string;
}

export interface UpdateProfilePayload {
  username?: string;
  bio?: string;
  gender?: number;
  city?: string;
  coverImage?: string;
  readingGoal?: number;
  avatarUrl?: string;
}

export interface PrivacyPayload {
  profileVisible?: number;
  shelfVisible?: number;
  notesVisible?: number;
  searchable?: number;
  messagePermission?: number;
  allowRecommendation?: number;
  showInDiscovery?: number;
  allowBehaviorAnalysis?: number;
}

// ─── 认证接口 ──────────────────────────────────────────────

export const authApi = {
  /** 发送邮箱验证码 */
  sendCode: (email: string) =>
    apiClient.post('/auth/send-code', { email }),

  /** 独立校验验证码（不消耗，仅验证） */
  verifyCode: (email: string, code: string) =>
    apiClient.post('/auth/verify-code', { email, code }),

  /** 邮箱注册（含验证码校验，注册后消耗验证码） */
  register: (data: RegisterPayload) =>
    apiClient.post('/auth/register', data),

  /** 邮箱登录（密码 or 验证码，传 code 则验证码登录） */
  login: (data: LoginPayload) =>
    apiClient.post('/auth/login', data),

  /** 用 Refresh Token 换新 Access Token */
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),

  /** 退出登录 */
  logout: () =>
    apiClient.post('/auth/logout'),
};

// ─── 用户接口 ──────────────────────────────────────────────

export const userApi = {
  /** 获取当前登录用户完整信息（含隐私设置） */
  getMe: () =>
    apiClient.get('/users/me'),

  /** 获取指定用户公开信息 */
  getUser: (id: number) =>
    apiClient.get(`/users/${id}`),

  /** 更新当前用户基础信息 */
  updateMe: (data: UpdateProfilePayload) =>
    apiClient.put('/users/me', data),

  /** 更新隐私设置 */
  updatePrivacy: (data: PrivacyPayload) =>
    apiClient.put('/users/me/privacy', data),

  /** 保存阅读偏好标签（新手引导，至少3个） */
  savePreferences: (tagIds: number[]) =>
    apiClient.post('/users/me/preferences', { tagIds }),

  /** 搜索用户（按昵称模糊搜索） */
  searchUsers: (q: string, page = 1, pageSize = 20) =>
    apiClient.get('/users/search', { params: { q, page, pageSize } }),

  /** 关注 / 取关（toggle） */
  toggleFollow: (userId: number) =>
    apiClient.post(`/users/${userId}/follow`),

  /** 获取粉丝列表 */
  getFollowers: (userId: number, page = 1) =>
    apiClient.get(`/users/${userId}/followers`, { params: { page } }),

  /** 获取关注列表 */
  getFollowing: (userId: number, page = 1) =>
    apiClient.get(`/users/${userId}/following`, { params: { page } }),

  /** 获取 Cloudinary 上传签名（头像/动态图/小组封面通用） */
  getUploadSign: (folder: 'avatars' | 'posts' | 'groups' | 'general' = 'general') =>
    apiClient.post('/upload/sign', { folder }),
};

// ─── Cloudinary 直传工具函数 ───────────────────────────────

export interface UploadResult {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * 前端直传图片到 Cloudinary（不经过自有服务器）
 * 先请求签名，再直传，返回图片 URL
 *
 * @param file     File 对象
 * @param folder   上传目录: 'avatars' | 'posts' | 'groups'
 */
export async function uploadToCloudinary(
  file: File,
  folder: 'avatars' | 'posts' | 'groups' = 'posts'
): Promise<UploadResult> {
  // 1. 获取服务端签名
  const { data: signData } = await userApi.getUploadSign(folder);
  const { uploadUrl, apiKey, timestamp, signature, folder: signedFolder } = signData.data;

  // 2. 构造 FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', signedFolder);

  if (folder === 'avatars') {
    formData.append('transformation', 'c_fill,w_200,h_200,g_face,q_auto,f_webp');
  }

  // 3. 直传 Cloudinary
  const response = await fetch(uploadUrl, { method: 'POST', body: formData });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || '图片上传失败');
  }

  const json = await response.json();
  return {
    secureUrl: json.secure_url,
    publicId:  json.public_id,
    width:     json.width,
    height:    json.height,
  };
}
