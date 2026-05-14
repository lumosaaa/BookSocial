import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/auth/LoginPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Tabs, Divider, message, Typography, } from 'antd';
import { MailOutlined, LockOutlined, NumberOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/authApi';
const { Text } = Typography;
const GOOGLE_AUTH_URL = `${new URL(import.meta.env.VITE_API_URL || 'http://localhost:3001').origin}/auth/google`;
const LOGIN_ERROR_TEXT = {
    google_failed: 'Google 授权未完成或已取消。',
    google_token_exchange_failed: 'Google 已返回授权码，但后端换取 access token 失败。请检查 Google 控制台中的回调地址是否与当前后端地址完全一致。',
    google_config_error: '后端 Google 登录配置缺失，请检查环境变量。',
    fetch_failed: 'Google 登录后拉取用户信息失败，请稍后重试。',
};
export default function LoginPage() {
    const navigate = useNavigate();
    const setUser = useAuthStore((s) => s.setUser);
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [codeSending, setCodeSending] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [activeTab, setActiveTab] = useState('password');
    const [form] = Form.useForm();
    useEffect(() => {
        const error = searchParams.get('error');
        if (error && LOGIN_ERROR_TEXT[error]) {
            message.error(LOGIN_ERROR_TEXT[error]);
        }
    }, [searchParams]);
    /* ── 验证码倒计时 ── */
    const startCountdown = () => {
        setCountdown(60);
        const timer = setInterval(() => {
            setCountdown((v) => {
                if (v <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return v - 1;
            });
        }, 1000);
    };
    const handleSendCode = async () => {
        const email = form.getFieldValue('email');
        if (!email)
            return message.warning('请先填写邮箱');
        setCodeSending(true);
        try {
            await authApi.sendCode(email);
            message.success('验证码已发送，请查收邮件');
            startCountdown();
        }
        catch (err) {
            const msg = err
                ?.response?.data?.message || '发送失败，请稍后重试';
            message.error(msg);
        }
        finally {
            setCodeSending(false);
        }
    };
    /* ── 登录提交 ── */
    const handleLogin = async (values) => {
        setLoading(true);
        try {
            const payload = activeTab === 'password'
                ? { email: values.email, password: values.password }
                : { email: values.email, code: values.code };
            const { data } = await authApi.login(payload);
            const { user, accessToken, refreshToken } = data.data;
            setUser(user, accessToken, refreshToken);
            message.success('登录成功，欢迎回来！');
            navigate('/');
        }
        catch (err) {
            const msg = err
                ?.response?.data?.message || '登录失败，请检查邮箱或密码';
            message.error(msg);
        }
        finally {
            setLoading(false);
        }
    };
    /* ── UI ── */
    return (_jsx("div", { style: {
            minHeight: '100vh',
            background: 'var(--color-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
        }, children: _jsxs("div", { style: {
                width: '100%',
                maxWidth: 420,
                background: '#fff',
                borderRadius: 16,
                padding: '40px 36px',
                boxShadow: '0 8px 32px rgba(44,62,45,0.10)',
            }, children: [_jsxs("div", { style: { textAlign: 'center', marginBottom: 32 }, children: [_jsx("div", { style: { fontSize: 34, lineHeight: 1 }, children: "\uD83D\uDCD6" }), _jsx("div", { style: {
                                fontSize: 24,
                                fontWeight: 700,
                                color: 'var(--color-primary)',
                                marginTop: 8,
                            }, children: "\u4E66\u00B7\u53CB" }), _jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: "BookSocial \u2014 \u4E0E\u4E66\u7ED3\u7F18" })] }), _jsx("a", { href: GOOGLE_AUTH_URL, children: _jsxs(Button, { block: true, size: "large", style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            height: 48,
                            border: '1px solid #dadce0',
                            borderRadius: 8,
                            background: '#fff',
                            color: '#3c4043',
                            fontWeight: 500,
                            fontSize: 15,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                            marginBottom: 4,
                        }, children: [_jsx("img", { src: "https://developers.google.com/identity/images/g-logo.png", alt: "Google", width: 20, height: 20, style: { flexShrink: 0 } }), "\u4F7F\u7528 Google \u8D26\u53F7\u767B\u5F55"] }) }), _jsx(Divider, { style: { color: 'var(--color-text-secondary)', fontSize: 13, margin: '20px 0' }, children: "\u6216\u4F7F\u7528\u90AE\u7BB1\u767B\u5F55" }), _jsx(Tabs, { activeKey: activeTab, onChange: (k) => setActiveTab(k), size: "small", style: { marginBottom: 8 }, items: [
                        { key: 'password', label: '密码登录' },
                        { key: 'code', label: '验证码登录' },
                    ] }), _jsxs(Form, { form: form, onFinish: handleLogin, layout: "vertical", size: "large", children: [_jsx(Form.Item, { name: "email", rules: [
                                { required: true, message: '请输入邮箱' },
                                { type: 'email', message: '邮箱格式不正确' },
                            ], children: _jsx(Input, { prefix: _jsx(MailOutlined, { style: { color: 'var(--color-text-secondary)' } }), placeholder: "\u90AE\u7BB1\u5730\u5740", autoComplete: "email" }) }), activeTab === 'password' ? (_jsx(Form.Item, { name: "password", rules: [{ required: true, message: '请输入密码' }], children: _jsx(Input.Password, { prefix: _jsx(LockOutlined, { style: { color: 'var(--color-text-secondary)' } }), placeholder: "\u5BC6\u7801", autoComplete: "current-password" }) })) : (_jsx(Form.Item, { name: "code", rules: [
                                { required: true, message: '请输入验证码' },
                                { len: 6, message: '验证码为6位数字' },
                            ], children: _jsx(Input, { prefix: _jsx(NumberOutlined, { style: { color: 'var(--color-text-secondary)' } }), placeholder: "6 \u4F4D\u9A8C\u8BC1\u7801", maxLength: 6, suffix: _jsx(Button, { type: "link", size: "small", disabled: countdown > 0 || codeSending, loading: codeSending, onClick: handleSendCode, style: { padding: 0, fontSize: 13, color: 'var(--color-primary)' }, children: countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }) }) })), _jsx(Button, { type: "primary", htmlType: "submit", block: true, loading: loading, style: {
                                height: 48,
                                borderRadius: 8,
                                background: 'var(--color-primary)',
                                borderColor: 'var(--color-primary)',
                                fontSize: 16,
                                marginTop: 4,
                            }, children: "\u767B\u5F55" })] }), _jsxs("div", { style: { textAlign: 'center', marginTop: 20, color: 'var(--color-text-secondary)', fontSize: 14 }, children: ["\u8FD8\u6CA1\u6709\u8D26\u53F7\uFF1F", ' ', _jsx(Link, { to: "/register", style: { color: 'var(--color-primary)', fontWeight: 600 }, children: "\u7ACB\u5373\u6CE8\u518C" })] })] }) }));
}
