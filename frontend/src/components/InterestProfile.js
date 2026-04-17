import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * InterestProfile.tsx — M6 · 兴趣画像组件
 * 用于 MyProfilePage / UserProfilePage 中展示书籍阅读偏好雷达图 + 活跃度热力图
 */
import { useEffect, useState } from 'react';
import { Spin, Tag, Empty, Tooltip } from 'antd';
import { getInterestProfile } from '../api/discoverApi';
// 简单颜色映射（按分类热度深浅）
const COLORS = [
    '#4A6741', '#6B8F62', '#8BAF82', '#A8C8A0',
    '#C8DFC4', '#C8A96E', '#D4B97E', '#E0CA90',
];
export default function InterestProfileWidget({ userId }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    useEffect(() => {
        setLoading(true);
        getInterestProfile(userId)
            .then(data => setProfile(data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [userId]);
    if (loading)
        return _jsx("div", { style: { textAlign: 'center', padding: '24px 0' }, children: _jsx(Spin, {}) });
    if (error)
        return null; // 隐私限制时静默不显示
    if (!profile)
        return null;
    const { categories, tags, activity } = profile;
    const maxCatCount = Math.max(...categories.map(c => c.count), 1);
    // ── 近30天活跃热力图（简化为打点网格）──────────────
    const today = new Date();
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const found = activity.find(a => a.date === dateStr);
        days.push({ date: dateStr, count: found?.count || 0 });
    }
    const maxActivity = Math.max(...days.map(d => d.count), 1);
    const activityColor = (count) => {
        if (count === 0)
            return '#ebedf0';
        const ratio = count / maxActivity;
        if (ratio < 0.25)
            return '#c6e48b';
        if (ratio < 0.5)
            return '#7bc96f';
        if (ratio < 0.75)
            return '#239a3b';
        return '#196127';
    };
    return (_jsxs("div", { className: "interest-profile", children: [categories.length > 0 && (_jsxs("div", { className: "profile-section", children: [_jsx("h4", { className: "profile-section-title", children: "\u9605\u8BFB\u5206\u7C7B\u5206\u5E03" }), _jsx("div", { className: "category-bars", children: categories.map((cat, idx) => (_jsxs("div", { className: "category-bar-row", children: [_jsx("span", { className: "cat-name", children: cat.category }), _jsx("div", { className: "cat-bar-track", children: _jsx("div", { className: "cat-bar-fill", style: {
                                            width: `${(cat.count / maxCatCount) * 100}%`,
                                            background: COLORS[idx % COLORS.length],
                                        } }) }), _jsxs("span", { className: "cat-count", children: [cat.count, " \u672C"] })] }, cat.category))) })] })), tags.length > 0 && (_jsxs("div", { className: "profile-section", children: [_jsx("h4", { className: "profile-section-title", children: "\u53E3\u5473\u6807\u7B7E" }), _jsx("div", { className: "tag-cloud", children: tags.map(t => (_jsx(Tag, { color: "green", style: { marginBottom: 6 }, children: t.name }, t.name))) })] })), _jsxs("div", { className: "profile-section", children: [_jsx("h4", { className: "profile-section-title", children: "\u8FD1 30 \u5929\u9605\u8BFB\u6D3B\u8DC3" }), _jsx("div", { className: "activity-grid", children: days.map(d => (_jsx(Tooltip, { title: `${d.date}：${d.count > 0 ? `加入 ${d.count} 本` : '无活动'}`, children: _jsx("div", { className: "activity-cell", style: { background: activityColor(d.count) } }) }, d.date))) }), _jsx("p", { className: "activity-hint", children: "\u6BCF\u683C\u4EE3\u88681\u5929\uFF0C\u989C\u8272\u8D8A\u6DF1\u9605\u8BFB\u8D8A\u6D3B\u8DC3" })] }), categories.length === 0 && tags.length === 0 && (_jsx(Empty, { description: "\u8FD8\u6CA1\u6709\u8DB3\u591F\u7684\u9605\u8BFB\u6570\u636E\uFF0C\u591A\u8BFB\u51E0\u672C\u4E66\u5427~" }))] }));
}
