import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/profile/MyProfilePage.tsx
import { useState, useEffect } from 'react';
import { Avatar, Button, Tabs, Skeleton, message, Row, Col, Statistic, Spin, Popconfirm, } from 'antd';
import { EditOutlined, SettingOutlined, UserOutlined, BookOutlined, LogoutOutlined, DeleteOutlined, } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../api/authApi';
import { useAuthStore } from '../../store/authStore';
import UserPostsPage from '../social/UserPostsPage';
import PostCard from '../../components/PostCard';
import { getMyBookmarks, unbookmark } from '../../api/postApi';
function BookmarkCenter() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const load = async (targetPage = 1, append = false) => {
        setLoading(true);
        try {
            const data = await getMyBookmarks(targetPage, 10);
            setItems(prev => append ? [...prev, ...data.list] : data.list);
            setPage(targetPage);
            setHasMore(data.hasMore);
        }
        catch {
            message.error('加载收藏失败');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load(1, false);
    }, []);
    const handleRemove = async (bookmarkId) => {
        if (!bookmarkId)
            return;
        try {
            await unbookmark(bookmarkId);
            setItems(prev => prev.filter(item => item.bookmarkId !== bookmarkId));
            message.success('已取消收藏');
        }
        catch {
            message.error('取消收藏失败');
        }
    };
    if (loading && items.length === 0) {
        return (_jsx("div", { style: { textAlign: 'center', padding: '32px 0' }, children: _jsx(Spin, {}) }));
    }
    if (!loading && items.length === 0) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }, children: [_jsx("div", { style: { fontSize: 40, marginBottom: 12, opacity: 0.3 }, children: "\uD83D\uDD16" }), _jsx("div", { children: "\u8FD8\u6CA1\u6709\u6536\u85CF\u5185\u5BB9" })] }));
    }
    return (_jsxs("div", { style: { paddingTop: 12 }, children: [items.map(item => (_jsxs("div", { children: [_jsx(PostCard, { post: item }), _jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginTop: -2, marginBottom: 12 }, children: _jsx(Popconfirm, { title: "\u786E\u8BA4\u53D6\u6D88\u6536\u85CF\uFF1F", onConfirm: () => handleRemove(item.bookmarkId), okText: "\u53D6\u6D88\u6536\u85CF", cancelText: "\u4FDD\u7559", children: _jsx(Button, { size: "small", danger: true, icon: _jsx(DeleteOutlined, {}), style: { borderRadius: 14 }, children: "\u53D6\u6D88\u6536\u85CF" }) }) })] }, item.bookmarkId || item.id))), hasMore && (_jsx("div", { style: { textAlign: 'center', paddingTop: 8 }, children: _jsx(Button, { onClick: () => load(page + 1, true), loading: loading, children: "\u52A0\u8F7D\u66F4\u591A" }) }))] }));
}
export default function MyProfilePage() {
    const navigate = useNavigate();
    const clearUser = useAuthStore((s) => s.clearUser);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        userApi
            .getMe()
            .then(({ data }) => setProfile(data.data))
            .catch(() => message.error('加载用户信息失败'))
            .finally(() => setLoading(false));
    }, []);
    const handleLogout = () => {
        clearUser();
        message.success('已退出登录');
        navigate('/login');
    };
    if (loading) {
        return (_jsx("div", { style: { maxWidth: 720, margin: '0 auto' }, children: _jsx(Skeleton, { active: true, paragraph: { rows: 6 }, style: { padding: 24 } }) }));
    }
    if (!profile)
        return null;
    return (_jsxs("div", { style: { maxWidth: 720, margin: '0 auto' }, children: [_jsx("div", { style: {
                    height: 180,
                    background: profile.coverImage
                        ? `url(${profile.coverImage}) center/cover no-repeat`
                        : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light, #6B8F62) 100%)',
                    position: 'relative',
                    borderRadius: '0 0 0 0',
                }, children: _jsxs("div", { style: {
                        position: 'absolute',
                        top: 12,
                        right: 16,
                        display: 'flex',
                        gap: 8,
                    }, children: [_jsx(Button, { icon: _jsx(EditOutlined, {}), size: "small", onClick: () => navigate('/profile/edit'), style: {
                                borderRadius: 20,
                                background: 'rgba(255,255,255,0.92)',
                                border: 'none',
                                fontWeight: 500,
                                fontSize: 13,
                            }, children: "\u7F16\u8F91\u8D44\u6599" }), _jsx(Button, { icon: _jsx(SettingOutlined, {}), size: "small", onClick: () => navigate('/profile/privacy'), style: {
                                borderRadius: 20,
                                background: 'rgba(255,255,255,0.92)',
                                border: 'none',
                            } }), _jsx(Button, { icon: _jsx(LogoutOutlined, {}), size: "small", onClick: handleLogout, style: {
                                borderRadius: 20,
                                background: 'rgba(255,255,255,0.92)',
                                border: 'none',
                                color: '#d64045',
                            } })] }) }), _jsxs("div", { style: { padding: '0 24px' }, children: [_jsx("div", { style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end',
                            marginTop: -44,
                            marginBottom: 12,
                        }, children: _jsx(Avatar, { size: 88, src: profile.avatarUrl, icon: _jsx(UserOutlined, {}), style: {
                                border: '4px solid #fff',
                                background: 'var(--color-accent)',
                                flexShrink: 0,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            } }) }), _jsx("div", { style: {
                            fontSize: 22,
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                            marginBottom: 4,
                            lineHeight: 1.3,
                        }, children: profile.username }), profile.city && (_jsxs("div", { style: { fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }, children: ["\uD83D\uDCCD ", profile.city] })), profile.bio && (_jsx("p", { style: {
                            fontSize: 14,
                            color: 'var(--color-text-secondary)',
                            marginTop: 8,
                            marginBottom: 0,
                            lineHeight: 1.7,
                        }, children: profile.bio })), _jsx(Row, { gutter: 0, style: { marginTop: 20, marginBottom: 12 }, children: [
                            { label: '已读', value: profile.bookCount },
                            { label: '关注', value: profile.followingCount },
                            { label: '粉丝', value: profile.followerCount },
                            { label: '动态', value: profile.postCount },
                        ].map((item) => (_jsx(Col, { span: 6, children: _jsx(Statistic, { title: _jsx("span", { style: { fontSize: 12, color: 'var(--color-text-secondary)' }, children: item.label }), value: item.value, valueStyle: {
                                    fontSize: 20,
                                    fontWeight: 700,
                                    color: 'var(--color-text-primary)',
                                    lineHeight: 1.2,
                                } }) }, item.label))) }), profile.readingGoal > 0 && (_jsxs("div", { style: {
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'var(--color-accent)',
                            borderRadius: 8,
                            padding: '6px 12px',
                            fontSize: 13,
                            color: 'var(--color-text-secondary)',
                            marginBottom: 16,
                        }, children: ["\uD83C\uDFAF \u4ECA\u5E74\u76EE\u6807\u8BFB", ' ', _jsx("span", { style: { color: 'var(--color-primary)', fontWeight: 700 }, children: profile.readingGoal }), ' ', "\u672C"] }))] }), _jsx(Tabs, { style: { padding: '0 24px' }, tabBarStyle: { marginBottom: 0 }, items: [
                    {
                        key: 'posts',
                        label: `动态 ${profile.postCount > 0 ? profile.postCount : ''}`,
                        children: _jsx(UserPostsPage, { userId: profile.id, initialTab: "posts", hideTabs: true }),
                    },
                    {
                        key: 'shelf',
                        label: `书架 ${profile.bookCount > 0 ? profile.bookCount : ''}`,
                        children: (_jsxs("div", { style: {
                                textAlign: 'center',
                                padding: '48px 0',
                                color: 'var(--color-text-secondary)',
                            }, children: [_jsx(BookOutlined, { style: { fontSize: 48, opacity: 0.2, marginBottom: 12 } }), _jsx("div", { children: "\u4E66\u67B6\u5185\u5BB9\u5DF2\u5728\u72EC\u7ACB\u9875\u9762\u5C55\u793A" }), _jsx(Button, { type: "primary", style: {
                                        marginTop: 16,
                                        background: 'var(--color-primary)',
                                        borderColor: 'var(--color-primary)',
                                        borderRadius: 20,
                                    }, onClick: () => navigate('/shelf'), children: "\u67E5\u770B\u6211\u7684\u4E66\u67B6" })] })),
                    },
                    {
                        key: 'notes',
                        label: '笔记',
                        children: _jsx(UserPostsPage, { userId: profile.id, initialTab: "notes", hideTabs: true }),
                    },
                    {
                        key: 'bookmarks',
                        label: '收藏',
                        children: _jsx(BookmarkCenter, {}),
                    },
                ] })] }));
}
