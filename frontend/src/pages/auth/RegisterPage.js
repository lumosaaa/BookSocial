import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/auth/RegisterPage.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Steps, Tag, Spin, message, Typography, Progress, } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, NumberOutlined, CheckCircleFilled, } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { authApi, userApi } from '../../api/authApi';
import { getCategories } from '../../api/bookApi';
const { Text } = Typography;
const STEP_LABELS = ['创建账号', '阅读偏好'];
export default function RegisterPage() {
    const navigate = useNavigate();
    const setUser = useAuthStore((s) => s.setUser);
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [codeSending, setCodeSending] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [tags, setTags] = useState([]);
    const [tagsLoading, setTagsLoading] = useState(false);
    const [selectedTags, setSelectedTags] = useState([]);
    const [form] = Form.useForm();
    /* ── 倒计时 ── */
    const startCountdown = () => {
        setCountdown(60);
        const t = setInterval(() => {
            setCountdown((v) => {
                if (v <= 1) {
                    clearInterval(t);
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
                ?.response?.data?.message || '发送失败';
            message.error(msg);
        }
        finally {
            setCodeSending(false);
        }
    };
    /* ── Step 0：注册 ── */
    const handleRegister = async (values) => {
        setLoading(true);
        try {
            const { data } = await authApi.register({
                email: values.email.toLowerCase().trim(),
                code: values.code.trim(),
                username: values.username.trim(),
                password: values.password,
            });
            const { user, accessToken, refreshToken } = data.data;
            setUser(user, accessToken, refreshToken);
            // 加载阅读偏好分类
            setTagsLoading(true);
            try {
                const res = await getCategories();
                setTags((res.data.data || []).map((item) => ({
                    id: item.id,
                    name: item.name,
                    icon: item.icon,
                })));
            }
            catch {
                setTags([]);
            }
            finally {
                setTagsLoading(false);
            }
            setStep(1);
        }
        catch (err) {
            const msg = err
                ?.response?.data?.message || '注册失败，请稍后重试';
            message.error(msg);
        }
        finally {
            setLoading(false);
        }
    };
    /* ── Step 1：保存偏好 ── */
    const handleSavePreferences = async () => {
        if (selectedTags.length < 3) {
            return message.warning('至少选择 3 个偏好标签');
        }
        setLoading(true);
        try {
            await userApi.savePreferences(selectedTags);
            message.success('🎉 注册完成，欢迎来到书·友！');
            navigate('/');
        }
        catch {
            message.error('保存偏好失败，可稍后在设置中修改');
            navigate('/');
        }
        finally {
            setLoading(false);
        }
    };
    const toggleTag = (id) => {
        setSelectedTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
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
                maxWidth: 480,
                background: '#fff',
                borderRadius: 16,
                padding: '40px 36px',
                boxShadow: '0 8px 32px rgba(44,62,45,0.10)',
            }, children: [_jsxs("div", { style: { textAlign: 'center', marginBottom: 28 }, children: [_jsx("div", { style: { fontSize: 30 }, children: "\uD83D\uDCD6" }), _jsx("div", { style: { fontSize: 22, fontWeight: 700, color: 'var(--color-primary)', marginTop: 6 }, children: "\u4E66\u00B7\u53CB" })] }), _jsx(Steps, { current: step, size: "small", style: { marginBottom: 28 }, items: STEP_LABELS.map((t) => ({ title: t })) }), step === 0 && (_jsxs(Form, { form: form, onFinish: handleRegister, layout: "vertical", size: "large", children: [_jsx(Form.Item, { name: "email", label: "\u90AE\u7BB1", rules: [
                                { required: true, message: '请输入邮箱' },
                                { type: 'email', message: '邮箱格式不正确' },
                            ], children: _jsx(Input, { prefix: _jsx(MailOutlined, { style: { color: 'var(--color-text-secondary)' } }), placeholder: "your@email.com", autoComplete: "email" }) }), _jsx(Form.Item, { name: "code", label: "\u9A8C\u8BC1\u7801", rules: [
                                { required: true, message: '请输入验证码' },
                                { len: 6, message: '请输入6位验证码' },
                            ], children: _jsx(Input, { prefix: _jsx(NumberOutlined, { style: { color: 'var(--color-text-secondary)' } }), placeholder: "6 \u4F4D\u6570\u5B57\u9A8C\u8BC1\u7801", maxLength: 6, suffix: _jsx(Button, { type: "link", size: "small", loading: codeSending, disabled: countdown > 0 || codeSending, onClick: handleSendCode, style: { padding: 0, fontSize: 13, color: 'var(--color-primary)' }, children: countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }) }) }), _jsx(Form.Item, { name: "username", label: "\u6635\u79F0", rules: [
                                { required: true, message: '请设置昵称' },
                                { min: 2, max: 50, message: '昵称须为 2–50 个字符' },
                                {
                                    pattern: /^[^\s].*[^\s]$|^[^\s]{1,2}$/,
                                    message: '昵称不能以空格开头或结尾',
                                },
                            ], children: _jsx(Input, { prefix: _jsx(UserOutlined, { style: { color: 'var(--color-text-secondary)' } }), placeholder: "\u4F60\u7684\u4E66\u53CB\u6635\u79F0\uFF082-50\u5B57\u7B26\uFF09", maxLength: 50 }) }), _jsx(Form.Item, { name: "password", label: "\u5BC6\u7801", rules: [
                                { required: true, message: '请设置密码' },
                                { min: 8, max: 20, message: '密码须为 8–20 位' },
                            ], children: _jsx(Input.Password, { prefix: _jsx(LockOutlined, { style: { color: 'var(--color-text-secondary)' } }), placeholder: "8\u201320 \u4F4D\u5BC6\u7801", autoComplete: "new-password" }) }), _jsx(Form.Item, { name: "confirmPassword", label: "\u786E\u8BA4\u5BC6\u7801", dependencies: ['password'], rules: [
                                { required: true, message: '请再次输入密码' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('两次密码输入不一致'));
                                    },
                                }),
                            ], children: _jsx(Input.Password, { prefix: _jsx(LockOutlined, { style: { color: 'var(--color-text-secondary)' } }), placeholder: "\u518D\u6B21\u8F93\u5165\u5BC6\u7801", autoComplete: "new-password" }) }), _jsx("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }, children: "\u6CE8\u518C\u5373\u4EE3\u8868\u540C\u610F\u300A\u7528\u6237\u534F\u8BAE\u300B\u548C\u300A\u9690\u79C1\u653F\u7B56\u300B" }), _jsx(Button, { type: "primary", htmlType: "submit", block: true, loading: loading, style: {
                                height: 48,
                                borderRadius: 8,
                                background: 'var(--color-primary)',
                                borderColor: 'var(--color-primary)',
                                fontSize: 16,
                            }, children: "\u4E0B\u4E00\u6B65" }), _jsxs("div", { style: { textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--color-text-secondary)' }, children: ["\u5DF2\u6709\u8D26\u53F7\uFF1F", ' ', _jsx(Link, { to: "/login", style: { color: 'var(--color-primary)', fontWeight: 600 }, children: "\u76F4\u63A5\u767B\u5F55" })] })] })), step === 1 && (_jsxs("div", { children: [_jsx("div", { style: { marginBottom: 16 }, children: _jsxs(Text, { type: "secondary", style: { fontSize: 14 }, children: ["\u9009\u62E9\u4F60\u611F\u5174\u8DA3\u7684\u9605\u8BFB\u7C7B\u578B\uFF08\u81F3\u5C11", ' ', _jsx(Text, { strong: true, style: { color: 'var(--color-primary)' }, children: "3" }), ' ', "\u4E2A\uFF09\uFF0C\u5E2E\u52A9\u6211\u4EEC\u63A8\u8350\u9002\u5408\u4F60\u7684\u597D\u4E66\u548C\u4E66\u53CB"] }) }), _jsx(Progress, { percent: Math.min(Math.round((selectedTags.length / 3) * 100), 100), showInfo: false, strokeColor: "var(--color-primary)", style: { marginBottom: 16 } }), tagsLoading ? (_jsx("div", { style: { textAlign: 'center', padding: '32px 0' }, children: _jsx(Spin, { tip: "\u52A0\u8F7D\u6807\u7B7E\u4E2D..." }) })) : tags.length === 0 ? (
                        /* 如果标签接口未就绪，允许跳过 */
                        _jsx("div", { style: {
                                textAlign: 'center', padding: '32px 0',
                                color: 'var(--color-text-secondary)',
                            }, children: "\u6807\u7B7E\u6682\u65F6\u65E0\u6CD5\u52A0\u8F7D\uFF0C\u53EF\u7A0D\u540E\u5728\u4E2A\u4EBA\u8BBE\u7F6E\u4E2D\u5B8C\u5584" })) : (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }, children: tags.map((tag) => {
                                const selected = selectedTags.includes(tag.id);
                                return (_jsxs(Tag, { onClick: () => toggleTag(tag.id), style: {
                                        cursor: 'pointer',
                                        borderRadius: 20,
                                        padding: '5px 14px',
                                        fontSize: 14,
                                        userSelect: 'none',
                                        transition: 'all 0.15s',
                                        borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                                        background: selected ? 'var(--color-accent)' : '#fff',
                                        color: selected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                                        fontWeight: selected ? 600 : 400,
                                    }, icon: selected ? _jsx(CheckCircleFilled, {}) : undefined, children: [tag.icon ? `${tag.icon} ` : '', tag.name] }, tag.id));
                            }) })), _jsxs("div", { style: {
                                fontSize: 13,
                                color: selectedTags.length >= 3 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                marginBottom: 20,
                                fontWeight: selectedTags.length >= 3 ? 600 : 400,
                            }, children: ["\u5DF2\u9009 ", selectedTags.length, " \u4E2A", selectedTags.length >= 3 && ' ✓'] }), _jsx(Button, { type: "primary", block: true, loading: loading, disabled: tags.length > 0 && selectedTags.length < 3, onClick: handleSavePreferences, style: {
                                height: 48,
                                borderRadius: 8,
                                background: 'var(--color-primary)',
                                borderColor: 'var(--color-primary)',
                                fontSize: 16,
                            }, children: "\u5B8C\u6210\u6CE8\u518C \uD83C\uDF89" }), tags.length === 0 && (_jsx(Button, { block: true, onClick: () => navigate('/'), style: { marginTop: 8, borderRadius: 8, height: 48 }, children: "\u8DF3\u8FC7\uFF0C\u7A0D\u540E\u8BBE\u7F6E" }))] }))] }) }));
}
