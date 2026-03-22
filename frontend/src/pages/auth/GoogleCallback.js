import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/auth/GoogleCallback.tsx
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { useAuthStore } from '../../store/authStore';
import { userApi } from '../../api/authApi';
/**
 * Google OAuth 回调页
 *
 * 后端重定向格式：
 *   /auth/callback?accessToken=xxx&refreshToken=xxx&isNewUser=true
 *
 * 流程：
 *   1. 从 URL 参数读取 Token
 *   2. 存入 localStorage
 *   3. 拉取用户信息，写入 Zustand store
 *   4. 新用户 → 跳首页（可选后续引导），老用户 → 跳首页
 */
export default function GoogleCallback() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const setUser = useAuthStore((s) => s.setUser);
    const hasRunRef = useRef(false); // 防止 React StrictMode 双执行
    useEffect(() => {
        if (hasRunRef.current)
            return;
        hasRunRef.current = true;
        const accessToken = params.get('accessToken');
        const refreshToken = params.get('refreshToken') || '';
        const isNewUser = params.get('isNewUser') === 'true';
        const error = params.get('error');
        if (error || !accessToken) {
            // 授权失败
            setTimeout(() => navigate('/login?error=google_failed'), 2000);
            return;
        }
        // 先临时存 Token，让 apiClient 拦截器能带上 Authorization header
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        // 拉取完整用户信息
        userApi
            .getMe()
            .then(({ data }) => {
            setUser(data.data, accessToken, refreshToken);
            if (isNewUser) {
                navigate('/?welcome=1');
            }
            else {
                navigate('/');
            }
        })
            .catch(() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            navigate('/login?error=fetch_failed');
        });
    }, []);
    const error = params.get('error');
    if (error) {
        return (_jsx("div", { style: {
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-surface)',
            }, children: _jsx(Result, { status: "error", title: "Google \u767B\u5F55\u5931\u8D25", subTitle: "\u6388\u6743\u88AB\u62D2\u7EDD\u6216\u53D1\u751F\u9519\u8BEF\uFF0C\u6B63\u5728\u8FD4\u56DE\u767B\u5F55\u9875...", extra: _jsx(Button, { type: "primary", onClick: () => navigate('/login'), style: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }, children: "\u8FD4\u56DE\u767B\u5F55" }) }) }));
    }
    return (_jsxs("div", { style: {
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-surface)',
            gap: 16,
        }, children: [_jsx("div", { style: { fontSize: 32 }, children: "\uD83D\uDCD6" }), _jsx(Spin, { size: "large" }), _jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 8 }, children: "Google \u767B\u5F55\u4E2D\uFF0C\u8BF7\u7A0D\u5019..." })] }));
}
