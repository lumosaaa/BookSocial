import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/profile/EditProfilePage.tsx
import { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Upload, message, Spin, Avatar, Typography, } from 'antd';
import { UploadOutlined, UserOutlined, ArrowLeftOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userApi, uploadToCloudinary } from '../../api/authApi';
import { useAuthStore } from '../../store/authStore';
const { Option } = Select;
const { Title } = Typography;
export default function EditProfilePage() {
    const navigate = useNavigate();
    const updateUser = useAuthStore((s) => s.updateUser);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    /* ── 初始化：拉取当前用户信息 ── */
    useEffect(() => {
        userApi
            .getMe()
            .then(({ data }) => {
            const u = data.data;
            setAvatarUrl(u.avatarUrl || '');
            form.setFieldsValue({
                username: u.username,
                bio: u.bio || '',
                gender: u.gender ?? undefined,
                city: u.city || '',
                readingGoal: u.readingGoal || undefined,
            });
        })
            .catch(() => message.error('加载用户信息失败'))
            .finally(() => setLoading(false));
    }, []);
    /* ── 头像上传（Cloudinary 直传） ── */
    const handleAvatarChange = async (file) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            message.error('仅支持 JPEG / PNG / WebP 格式');
            return false;
        }
        if (file.size > 10 * 1024 * 1024) {
            message.error('图片大小不能超过 10MB');
            return false;
        }
        setUploading(true);
        try {
            const result = await uploadToCloudinary(file, 'avatars');
            setAvatarUrl(result.secureUrl);
            message.success('头像已更新');
        }
        catch (err) {
            const msg = err.message || '头像上传失败，请重试';
            message.error(msg);
        }
        finally {
            setUploading(false);
        }
        return false; // 阻止 antd Upload 自动上传
    };
    /* ── 保存资料 ── */
    const handleSave = async (values) => {
        setSaving(true);
        try {
            const { data } = await userApi.updateMe({
                username: values.username,
                bio: values.bio,
                gender: values.gender,
                city: values.city,
                readingGoal: values.readingGoal ? parseInt(values.readingGoal) : undefined,
                avatarUrl: avatarUrl || undefined,
            });
            // 更新 Zustand 中的用户信息（同步顶部头像/昵称）
            updateUser({
                username: data.data.username,
                avatarUrl: data.data.avatarUrl,
            });
            message.success('资料已保存');
            navigate('/profile');
        }
        catch (err) {
            const msg = err
                ?.response?.data?.message || '保存失败，请重试';
            message.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    if (loading) {
        return (_jsx("div", { style: { display: 'flex', justifyContent: 'center', padding: 64 }, children: _jsx(Spin, { size: "large" }) }));
    }
    return (_jsxs("div", { style: { maxWidth: 520, margin: '0 auto', padding: '24px 16px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), type: "text", onClick: () => navigate(-1), style: { flexShrink: 0 } }), _jsx(Title, { level: 4, style: { margin: 0, color: 'var(--color-text-primary)' }, children: "\u7F16\u8F91\u4E2A\u4EBA\u8D44\u6599" })] }), _jsxs("div", { style: { textAlign: 'center', marginBottom: 32 }, children: [_jsxs("div", { style: { position: 'relative', display: 'inline-block' }, children: [_jsx(Avatar, { size: 96, src: avatarUrl, icon: uploading ? _jsx(LoadingOutlined, {}) : _jsx(UserOutlined, {}), style: {
                                    background: 'var(--color-accent)',
                                    border: '3px solid var(--color-border)',
                                    display: 'block',
                                } }), uploading && (_jsx("div", { style: {
                                    position: 'absolute', inset: 0,
                                    borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }, children: _jsx(LoadingOutlined, { style: { color: '#fff', fontSize: 24 } }) }))] }), _jsxs("div", { style: { marginTop: 12 }, children: [_jsx(Upload, { showUploadList: false, beforeUpload: handleAvatarChange, accept: "image/jpeg,image/png,image/webp", children: _jsx(Button, { icon: _jsx(UploadOutlined, {}), size: "small", loading: uploading, style: { borderRadius: 20, fontSize: 13 }, children: "\u66F4\u6362\u5934\u50CF" }) }), _jsx("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6 }, children: "\u652F\u6301 JPEG / PNG / WebP\uFF0C\u6700\u5927 10MB" })] })] }), _jsxs(Form, { form: form, onFinish: handleSave, layout: "vertical", size: "large", children: [_jsx(Form.Item, { name: "username", label: "\u6635\u79F0", rules: [
                            { required: true, message: '请输入昵称' },
                            { min: 2, max: 50, message: '昵称须为 2–50 个字符' },
                        ], children: _jsx(Input, { placeholder: "\u4F60\u7684\u4E66\u53CB\u6635\u79F0", maxLength: 50, showCount: true }) }), _jsx(Form.Item, { name: "bio", label: "\u4E2A\u4EBA\u7B7E\u540D", rules: [{ max: 200, message: '最多 200 字' }], children: _jsx(Input.TextArea, { placeholder: "\u4ECB\u7ECD\u4E00\u4E0B\u4F60\u81EA\u5DF1\uFF0C\u6216\u8005\u5199\u4E0B\u6700\u8FD1\u7684\u8BFB\u4E66\u611F\u609F...", maxLength: 200, showCount: true, rows: 3, style: { resize: 'none' } }) }), _jsx(Form.Item, { name: "gender", label: "\u6027\u522B", children: _jsxs(Select, { placeholder: "\u9009\u62E9\u6027\u522B\uFF08\u53EF\u4E0D\u586B\uFF09", allowClear: true, children: [_jsx(Option, { value: 1, children: "\u7537" }), _jsx(Option, { value: 2, children: "\u5973" }), _jsx(Option, { value: 0, children: "\u4FDD\u5BC6" })] }) }), _jsx(Form.Item, { name: "city", label: "\u6240\u5728\u57CE\u5E02", children: _jsx(Input, { placeholder: "\u4F8B\u5982\uFF1A\u5317\u4EAC\u3001\u4E0A\u6D77\u3001\u6210\u90FD...", maxLength: 50 }) }), _jsx(Form.Item, { name: "readingGoal", label: "\u5E74\u5EA6\u9605\u8BFB\u76EE\u6807\uFF08\u672C\uFF09", rules: [
                            {
                                validator: (_, value) => {
                                    if (!value)
                                        return Promise.resolve();
                                    const n = parseInt(value);
                                    if (isNaN(n) || n < 1 || n > 999) {
                                        return Promise.reject(new Error('请输入 1–999 之间的数字'));
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ], children: _jsx(Input, { type: "number", min: 1, max: 999, placeholder: "\u4ECA\u5E74\u8BA1\u5212\u8BFB\u591A\u5C11\u672C\u4E66\uFF1F", suffix: "\u672C" }) }), _jsxs("div", { style: { display: 'flex', gap: 12, marginTop: 8 }, children: [_jsx(Button, { block: true, size: "large", onClick: () => navigate(-1), style: { borderRadius: 8 }, children: "\u53D6\u6D88" }), _jsx(Button, { type: "primary", htmlType: "submit", block: true, size: "large", loading: saving, style: {
                                    borderRadius: 8,
                                    background: 'var(--color-primary)',
                                    borderColor: 'var(--color-primary)',
                                }, children: "\u4FDD\u5B58" })] })] })] }));
}
