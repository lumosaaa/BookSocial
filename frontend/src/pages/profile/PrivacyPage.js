import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/profile/PrivacyPage.tsx
import { useState, useEffect } from 'react';
import { Switch, Select, Button, Spin, message, Typography, Divider, } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../api/authApi';
const { Option } = Select;
const { Title, Text } = Typography;
const DEFAULT_PRIVACY = {
    profileVisible: 0,
    shelfVisible: 0,
    notesVisible: 0,
    searchable: 1,
    messagePermission: 0,
    allowRecommendation: 1,
    showInDiscovery: 1,
    allowBehaviorAnalysis: 1,
};
const VISIBILITY_OPTIONS = [
    { value: 0, label: '所有人' },
    { value: 1, label: '仅关注者' },
    { value: 2, label: '仅自己' },
];
const MESSAGE_OPTIONS = [
    { value: 0, label: '所有人' },
    { value: 1, label: '仅关注者' },
    { value: 2, label: '关闭私信' },
];
export default function PrivacyPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY);
    const [dirty, setDirty] = useState(false); // 是否有未保存的改动
    useEffect(() => {
        userApi
            .getMe()
            .then(({ data }) => {
            if (data.data.privacy) {
                setPrivacy({ ...DEFAULT_PRIVACY, ...data.data.privacy });
            }
        })
            .catch(() => message.error('加载隐私设置失败'))
            .finally(() => setLoading(false));
    }, []);
    const update = (key, val) => {
        setPrivacy((prev) => ({ ...prev, [key]: val }));
        setDirty(true);
    };
    const handleSave = async () => {
        setSaving(true);
        try {
            await userApi.updatePrivacy(privacy);
            message.success('隐私设置已保存');
            setDirty(false);
        }
        catch {
            message.error('保存失败，请重试');
        }
        finally {
            setSaving(false);
        }
    };
    /* ── 通用 Row 组件 ── */
    const Row = ({ label, desc, children, last = false, }) => (_jsxs("div", { style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: last ? 'none' : '1px solid var(--color-border)',
            gap: 16,
        }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontSize: 15, color: 'var(--color-text-primary)', lineHeight: 1.4 }, children: label }), desc && (_jsx("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }, children: desc }))] }), _jsx("div", { style: { flexShrink: 0 }, children: children })] }));
    /* ── Section 容器 ── */
    const Section = ({ title, children }) => (_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("div", { style: {
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 8,
                    paddingLeft: 4,
                }, children: title }), _jsx("div", { style: {
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden',
                }, children: children })] }));
    const switchStyle = (on) => ({
        background: on ? 'var(--color-primary)' : undefined,
    });
    if (loading) {
        return (_jsx("div", { style: { display: 'flex', justifyContent: 'center', padding: 64 }, children: _jsx(Spin, { size: "large" }) }));
    }
    return (_jsxs("div", { style: { maxWidth: 560, margin: '0 auto', padding: '24px 16px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), type: "text", onClick: () => navigate(-1) }), _jsx(Title, { level: 4, style: { margin: 0, color: 'var(--color-text-primary)' }, children: "\u9690\u79C1\u8BBE\u7F6E" }), dirty && (_jsx(Text, { type: "secondary", style: { fontSize: 13, marginLeft: 'auto' }, children: "\u6709\u672A\u4FDD\u5B58\u7684\u66F4\u6539" }))] }), _jsxs(Section, { title: "\u5185\u5BB9\u53EF\u89C1\u6027", children: [_jsx(Row, { label: "\u4E2A\u4EBA\u4E3B\u9875\u53EF\u89C1\u8303\u56F4", desc: "\u8C01\u53EF\u4EE5\u67E5\u770B\u4F60\u7684\u4E2A\u4EBA\u4E3B\u9875", children: _jsx(Select, { value: privacy.profileVisible, onChange: (v) => update('profileVisible', v), style: { width: 120 }, size: "small", children: VISIBILITY_OPTIONS.map((o) => (_jsx(Option, { value: o.value, children: o.label }, o.value))) }) }), _jsx(Row, { label: "\u4E66\u67B6\u53EF\u89C1\u8303\u56F4", desc: "\u8C01\u53EF\u4EE5\u67E5\u770B\u4F60\u7684\u4E66\u67B6", children: _jsx(Select, { value: privacy.shelfVisible, onChange: (v) => update('shelfVisible', v), style: { width: 120 }, size: "small", children: VISIBILITY_OPTIONS.map((o) => (_jsx(Option, { value: o.value, children: o.label }, o.value))) }) }), _jsx(Row, { label: "\u9605\u8BFB\u7B14\u8BB0\u53EF\u89C1\u8303\u56F4", desc: "\u8C01\u53EF\u4EE5\u67E5\u770B\u4F60\u53D1\u5E03\u7684\u516C\u5F00\u7B14\u8BB0", last: true, children: _jsx(Select, { value: privacy.notesVisible, onChange: (v) => update('notesVisible', v), style: { width: 120 }, size: "small", children: VISIBILITY_OPTIONS.map((o) => (_jsx(Option, { value: o.value, children: o.label }, o.value))) }) })] }), _jsxs(Section, { title: "\u4E92\u52A8\u6743\u9650", children: [_jsx(Row, { label: "\u63A5\u6536\u79C1\u4FE1", desc: "\u8BBE\u7F6E\u8C01\u53EF\u4EE5\u7ED9\u4F60\u53D1\u9001\u79C1\u4FE1\uFF08\u4E92\u5173\u4E66\u53CB\u4E0D\u53D7\u6B64\u9650\u5236\uFF09", children: _jsx(Select, { value: privacy.messagePermission, onChange: (v) => update('messagePermission', v), style: { width: 120 }, size: "small", children: MESSAGE_OPTIONS.map((o) => (_jsx(Option, { value: o.value, children: o.label }, o.value))) }) }), _jsx(Row, { label: "\u53EF\u88AB\u641C\u7D22\u53D1\u73B0", desc: "\u5173\u95ED\u540E\uFF0C\u5176\u4ED6\u7528\u6237\u65E0\u6CD5\u901A\u8FC7\u6635\u79F0\u641C\u7D22\u5230\u4F60", last: true, children: _jsx(Switch, { checked: privacy.searchable === 1, onChange: (v) => update('searchable', v ? 1 : 0), style: switchStyle(privacy.searchable === 1) }) })] }), _jsxs(Section, { title: "\u4E2A\u6027\u5316\u4E0E\u63A8\u8350", children: [_jsx(Row, { label: "\u51FA\u73B0\u5728\u4E66\u53CB\u63A8\u8350", desc: "\u5141\u8BB8\u7CFB\u7EDF\u5C06\u4F60\u63A8\u8350\u7ED9\u5174\u8DA3\u76F8\u4F3C\u7684\u7528\u6237", children: _jsx(Switch, { checked: privacy.showInDiscovery === 1, onChange: (v) => update('showInDiscovery', v ? 1 : 0), style: switchStyle(privacy.showInDiscovery === 1) }) }), _jsx(Row, { label: "\u5174\u8DA3\u753B\u50CF\u7528\u4E8E\u63A8\u8350", desc: "\u57FA\u4E8E\u4F60\u7684\u9605\u8BFB\u504F\u597D\u4E3A\u4F60\u63A8\u8350\u4E66\u7C4D\u548C\u4E66\u53CB", children: _jsx(Switch, { checked: privacy.allowRecommendation === 1, onChange: (v) => update('allowRecommendation', v ? 1 : 0), style: switchStyle(privacy.allowRecommendation === 1) }) }), _jsx(Row, { label: "\u9605\u8BFB\u8BB0\u5F55\u7528\u4E8E\u5206\u6790", desc: "\u6388\u6743\u5E73\u53F0\u4F7F\u7528\u884C\u4E3A\u6570\u636E\u6539\u5584\u63A8\u8350\u7B97\u6CD5\u8D28\u91CF", last: true, children: _jsx(Switch, { checked: privacy.allowBehaviorAnalysis === 1, onChange: (v) => update('allowBehaviorAnalysis', v ? 1 : 0), style: switchStyle(privacy.allowBehaviorAnalysis === 1) }) })] }), _jsx(Divider, { style: { margin: '8px 0 24px' } }), _jsx(Button, { type: "primary", block: true, size: "large", loading: saving, icon: _jsx(SaveOutlined, {}), onClick: handleSave, style: {
                    height: 48,
                    borderRadius: 8,
                    background: 'var(--color-primary)',
                    borderColor: 'var(--color-primary)',
                    fontSize: 16,
                }, children: "\u4FDD\u5B58\u8BBE\u7F6E" }), _jsx(Text, { type: "secondary", style: { display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12 }, children: "\u8BBE\u7F6E\u53D8\u66F4\u540E\u5373\u65F6\u751F\u6548" })] }));
}
