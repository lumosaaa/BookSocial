/**
 * apiClient.ts
 * BookSocial 模块0 · Axios HTTP 客户端
 * 统一处理 baseURL、Authorization 头、token 刷新、错误提示
 * 各模块基于此实例发起请求，禁止各自创建 axios 实例
 */
import axios from 'axios';
import { message } from 'antd';
import { useAuthStore } from '../store/authStore';
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
export const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});
// ─── 请求拦截：自动注入 Authorization ───────────────────────────────
apiClient.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));
// ─── 响应拦截：统一错误处理 & Token 刷新 ────────────────────────────
let isRefreshing = false;
let pendingQueue = [];
function processQueue(error, token) {
    pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
    pendingQueue = [];
}
apiClient.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    // 401：尝试 Token 刷新一次
    if (error.response?.status === 401 && !originalRequest._retry) {
        const { refreshToken, setToken, clearUser } = useAuthStore.getState();
        if (!refreshToken) {
            clearUser();
            window.location.href = '/login';
            return Promise.reject(error);
        }
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                pendingQueue.push({ resolve, reject });
            }).then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return apiClient(originalRequest);
            });
        }
        originalRequest._retry = true;
        isRefreshing = true;
        try {
            const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
            const newToken = data.data.accessToken;
            setToken(newToken);
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
        }
        catch (refreshError) {
            processQueue(refreshError, null);
            clearUser();
            window.location.href = '/login';
            return Promise.reject(refreshError);
        }
        finally {
            isRefreshing = false;
        }
    }
    // 其他错误：全局提示
    const msg = error.response?.data?.message || '请求失败，请稍后重试';
    if (error.response?.status !== 401) {
        message.error(msg);
    }
    return Promise.reject(error);
});
export default apiClient;
