import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/profile/UserProfilePage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, Button, Tabs, Spin, Statistic, Row, Col, message, Tag, Result, } from 'antd';
import { UserOutlined, MessageOutlined, PlusOutlined, CheckOutlined } from '@ant-design/icons';
import { userApi } from '../../api/authApi';
import { useAuthStore } from '../../store/authStore';
export default function UserProfilePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const currentUser = useAuthStore((s) => s.user);
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [following, setFollowing] = useState(false);
    const [isMutual, setIsMutual] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        userApi
            .getUser(parseInt(id))
            .then(({ data }) => {
            const p = data.data;
            setProfile(p);
            setFollowing(p.isFollowing);
            setIsMutual(p.isMutual);
        })
            .catch((err) => {
            if (err?.response?.status === 404 || err?.response?.status === 403) {
                setNotFound(true);
            }
            else {
                message.error('加载用户信息失败');
            }
        })
            .finally(() => setLoading(false));
    }, [id]);
    const handleFollowToggle = async () => {
        if (!isLoggedIn) {
            message.info('请先登录');
            return navigate('/login');
        }
        if (!profile)
            return;
        setFollowLoading(true);
        try {
            const { data } = await userApi.toggleFollow(profile.id);
            const { isFollowing: newFollowing, isMutual: newMutual } = data.data;
            setFollowing(newFollowing);
            setIsMutual(newMutual);
            setProfile((prev) => prev
                ? {
                    ...prev,
                    followerCount: prev.followerCount + (newFollowing ? 1 : -1),
                    isMutual: newMutual,
                    isFollowing: newFollowing,
                }
                : null);
            if (newFollowing) {
                message.success(newMutual ? '互相关注成为书友！' : '关注成功');
            }
            else {
                message.success('已取消关注');
            }
        }
        catch {
            message.error('操作失败，请重试');
        }
        finally {
            setFollowLoading(false);
        }
    };
    if (loading) {
        return (_jsx("div", { style: { display: 'flex', justifyContent: 'center', padding: 64 }, children: _jsx(Spin, { size: "large" }) }));
    }
    if (notFound || !profile) {
        return (_jsx(Result, { status: "404", title: "\u7528\u6237\u4E0D\u5B58\u5728", subTitle: "\u8BE5\u7528\u6237\u53EF\u80FD\u5DF2\u6CE8\u9500\u6216\u5C06\u4E3B\u9875\u8BBE\u4E3A\u79C1\u5BC6", extra: _jsx(Button, { onClick: () => navigate('/'), style: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' }, children: "\u8FD4\u56DE\u9996\u9875" }) }));
    }
    const isOwnProfile = currentUser?.id === profile.id;
    return (_jsxs("div", { style: { maxWidth: 720, margin: '0 auto' }, children: [_jsx("div", { style: {
                    height: 180,
                    background: profile.coverImage
                        ? `url(${profile.coverImage}) center/cover no-repeat`
                        : 'linear-gradient(135deg, #6B8F62 0%, #4A6741 100%)',
                } }), _jsxs("div", { style: { padding: '0 24px' }, children: [_jsxs("div", { style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-end',
                            marginTop: -44,
                            marginBottom: 12,
                        }, children: [_jsx(Avatar, { size: 88, src: profile.avatarUrl, icon: _jsx(UserOutlined, {}), style: {
                                    border: '4px solid #fff',
                                    background: 'var(--color-accent)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                } }), !isOwnProfile && (_jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 8 }, children: [isMutual && (_jsx(Button, { icon: _jsx(MessageOutlined, {}), onClick: () => navigate(`/messages?userId=${profile.id}`), style: { borderRadius: 20 }, children: "\u79C1\u4FE1" })), _jsx(Button, { type: following ? 'default' : 'primary', loading: followLoading, icon: following ? _jsx(CheckOutlined, {}) : _jsx(PlusOutlined, {}), onClick: handleFollowToggle, style: {
                                            borderRadius: 20,
                                            minWidth: 88,
                                            ...(following
                                                ? { color: 'var(--color-text-secondary)' }
                                                : {
                                                    background: 'var(--color-primary)',
                                                    borderColor: 'var(--color-primary)',
                                                }),
                                        }, children: following ? (isMutual ? '书友' : '已关注') : '关注' })] })), isOwnProfile && (_jsx(Button, { size: "small", onClick: () => navigate('/profile'), style: { borderRadius: 20, marginBottom: 8 }, children: "\u67E5\u770B\u6211\u7684\u4E3B\u9875" }))] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }, children: profile.username }), isMutual && (_jsx(Tag, { style: {
                                    borderRadius: 20,
                                    border: 'none',
                                    background: 'var(--color-accent)',
                                    color: 'var(--color-primary)',
                                    fontWeight: 600,
                                    fontSize: 12,
                                }, children: "\u4E66\u53CB" }))] }), profile.city && (_jsxs("div", { style: { fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }, children: ["\uD83D\uDCCD ", profile.city] })), profile.bio && (_jsx("p", { style: { fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 8, lineHeight: 1.7 }, children: profile.bio })), _jsx(Row, { gutter: 0, style: { marginTop: 20, marginBottom: 16 }, children: [
                            { label: '已读', value: profile.bookCount },
                            { label: '关注', value: profile.followingCount },
                            { label: '粉丝', value: profile.followerCount },
                            { label: '动态', value: profile.postCount },
                        ].map((item) => (_jsx(Col, { span: 6, children: _jsx(Statistic, { title: _jsx("span", { style: { fontSize: 12, color: 'var(--color-text-secondary)' }, children: item.label }), value: item.value, valueStyle: {
                                    fontSize: 20,
                                    fontWeight: 700,
                                    color: 'var(--color-text-primary)',
                                    lineHeight: 1.2,
                                } }) }, item.label))) })] }), _jsx(Tabs, { style: { padding: '0 24px' }, items: [
                    {
                        key: 'posts',
                        label: '动态',
                        children: (_jsxs("div", { style: { textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }, children: [_jsx("div", { style: { fontSize: 36, opacity: 0.3, marginBottom: 12 }, children: "\uD83D\uDCDD" }), _jsx("div", { children: "\u6682\u65E0\u516C\u5F00\u52A8\u6001" })] })),
                    },
                    {
                        key: 'shelf',
                        label: '书架',
                        children: (_jsxs("div", { style: { textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }, children: [_jsx("div", { style: { fontSize: 36, opacity: 0.3, marginBottom: 12 }, children: "\uD83D\uDCDA" }), _jsx("div", { children: "\u4E66\u67B6\u6682\u4E0D\u516C\u5F00" })] })),
                    },
                    {
                        key: 'notes',
                        label: '笔记',
                        children: (_jsxs("div", { style: { textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }, children: [_jsx("div", { style: { fontSize: 36, opacity: 0.3, marginBottom: 12 }, children: "\uD83D\uDCD2" }), _jsx("div", { children: "\u6682\u65E0\u516C\u5F00\u7B14\u8BB0" })] })),
                    },
                ] })] }));
}
