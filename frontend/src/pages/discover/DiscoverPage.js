import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * DiscoverPage.tsx — M6 · 发现页
 * 路由：/discover
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Spin, Empty, Button, Avatar, Tag, Rate, message } from 'antd';
import { UserAddOutlined, CheckOutlined, BookOutlined, StarFilled, CloseOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { getRecommendedBooks, getRecommendedFriends, getHotBooks, submitFeedback, } from '../../api/discoverApi';
import apiClient from '../../api/apiClient';
import './DiscoverPage.css';
// ── 推荐书籍卡片 ──────────────────────────────────────────────
function BookRecommendCard({ book, onDismiss, }) {
    const navigate = useNavigate();
    const stars = book.platformRating ? book.platformRating / 2 : 0; // 10分制→5星
    return (_jsxs("div", { className: "discover-book-card", onClick: () => navigate(`/books/${book.id}`), children: [_jsx("button", { className: "dismiss-btn", onClick: e => {
                    e.stopPropagation();
                    onDismiss(book.id);
                }, title: "\u4E0D\u611F\u5174\u8DA3", children: _jsx(CloseOutlined, {}) }), _jsx("div", { className: "book-cover", children: book.coverUrl ? (_jsx("img", { src: book.coverUrl, alt: book.title, loading: "lazy" })) : (_jsx("div", { className: "cover-placeholder", children: _jsx(BookOutlined, {}) })) }), _jsxs("div", { className: "book-info", children: [_jsx("h3", { className: "book-title", children: book.title }), _jsx("p", { className: "book-author", children: book.author }), book.categoryName && _jsx(Tag, { color: "green", children: book.categoryName }), book.platformRating && (_jsxs("div", { className: "book-rating", children: [_jsx(Rate, { disabled: true, allowHalf: true, value: stars, style: { fontSize: 12 } }), _jsx("span", { className: "rating-value", children: (book.platformRating / 2).toFixed(1) })] })), _jsxs("p", { className: "shelf-count", children: [_jsx(BookOutlined, {}), " ", (book.shelfCount ?? 0).toLocaleString(), " \u4EBA\u5728\u8BFB"] })] })] }));
}
// ── 推荐书友卡片 ──────────────────────────────────────────────
function FriendRecommendCard({ friend, onFollowChange, onDismiss, }) {
    const navigate = useNavigate();
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const [loading, setLoading] = useState(false);
    const [followed, setFollowed] = useState(friend.isFollowing);
    const handleFollow = async (e) => {
        e.stopPropagation();
        if (!isLoggedIn) {
            navigate('/auth/login');
            return;
        }
        setLoading(true);
        try {
            const res = await apiClient.post(`/users/${friend.id}/follow`);
            const newFollowed = res.data.data.followed;
            setFollowed(newFollowed);
            onFollowChange(friend.id, newFollowed);
            message.success(newFollowed ? '已关注' : '已取关');
        }
        catch {
            message.error('操作失败，请重试');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "discover-friend-card", children: [_jsx("button", { className: "dismiss-btn", onClick: () => onDismiss(friend.id), title: "\u4E0D\u611F\u5174\u8DA3", children: _jsx(CloseOutlined, {}) }), _jsxs("div", { className: "friend-header", onClick: () => navigate(`/users/${friend.id}`), children: [_jsx(Avatar, { size: 56, src: friend.avatarUrl, style: { cursor: 'pointer' }, children: !friend.avatarUrl && friend.username[0] }), _jsxs("div", { className: "friend-meta", children: [_jsx("span", { className: "friend-name", children: friend.username }), friend.bio && _jsx("span", { className: "friend-bio", children: friend.bio }), _jsxs("span", { className: "friend-stats", children: [friend.bookCount, " \u672C\u4E66 \u00B7 ", friend.followerCount, " \u7C89\u4E1D"] })] })] }), _jsx(Button, { type: followed ? 'default' : 'primary', icon: followed ? _jsx(CheckOutlined, {}) : _jsx(UserAddOutlined, {}), loading: loading, onClick: handleFollow, className: "follow-btn", style: { borderColor: followed ? undefined : 'var(--color-primary)', color: followed ? undefined : 'var(--color-primary)', background: followed ? undefined : 'transparent' }, children: followed ? '已关注' : '关注' })] }));
}
// ── 发现页主组件 ──────────────────────────────────────────────
export default function DiscoverPage() {
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const [recBooks, setRecBooks] = useState([]);
    const [hotBooks, setHotBooks] = useState([]);
    const [friends, setFriends] = useState([]);
    const [booksLoading, setBooksLoading] = useState(false);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [hotLoading, setHotLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('rec');
    // 加载推荐书籍
    const loadRecBooks = useCallback(async () => {
        setBooksLoading(true);
        try {
            const data = await getRecommendedBooks(24);
            setRecBooks(data);
        }
        catch {
            message.error('加载推荐书籍失败');
        }
        finally {
            setBooksLoading(false);
        }
    }, []);
    // 加载热门书籍
    const loadHotBooks = useCallback(async () => {
        setHotLoading(true);
        try {
            const data = await getHotBooks(24);
            setHotBooks(data);
        }
        catch {
            message.error('加载热门书籍失败');
        }
        finally {
            setHotLoading(false);
        }
    }, []);
    // 加载推荐书友
    const loadFriends = useCallback(async () => {
        if (!isLoggedIn)
            return;
        setFriendsLoading(true);
        try {
            const data = await getRecommendedFriends(12);
            setFriends(data);
        }
        catch {
            message.error('加载推荐书友失败');
        }
        finally {
            setFriendsLoading(false);
        }
    }, [isLoggedIn]);
    useEffect(() => {
        loadRecBooks();
        loadHotBooks();
        loadFriends();
    }, [loadRecBooks, loadHotBooks, loadFriends]);
    // 不感兴趣 → 提交反馈 + 移除卡片
    const dismissBook = async (bookId) => {
        setRecBooks(prev => prev.filter(b => b.id !== bookId));
        try {
            await submitFeedback(bookId, 'book', 'dislike');
        }
        catch { /* 静默 */ }
    };
    const dismissFriend = async (userId) => {
        setFriends(prev => prev.filter(f => f.id !== userId));
        try {
            await submitFeedback(userId, 'friend', 'dislike');
        }
        catch { /* 静默 */ }
    };
    const tabItems = [
        {
            key: 'rec',
            label: '为你推荐',
            children: (_jsxs("div", { className: "discover-section", children: [_jsxs("h2", { className: "section-title", children: [_jsx(StarFilled, { style: { color: 'var(--color-secondary)' } }), " \u731C\u4F60\u559C\u6B22"] }), booksLoading ? (_jsx("div", { className: "loading-center", children: _jsx(Spin, { size: "large" }) })) : recBooks.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u63A8\u8350\uFF0C\u53BB\u4E66\u67B6\u6DFB\u52A0\u51E0\u672C\u4E66\u5427~" })) : (_jsx("div", { className: "books-grid", children: recBooks.map(b => (_jsx(BookRecommendCard, { book: b, onDismiss: dismissBook }, b.id))) })), isLoggedIn && (_jsxs(_Fragment, { children: [_jsxs("h2", { className: "section-title", style: { marginTop: 40 }, children: [_jsx(UserAddOutlined, { style: { color: 'var(--color-primary)' } }), " \u63A8\u8350\u4E66\u53CB"] }), friendsLoading ? (_jsx("div", { className: "loading-center", children: _jsx(Spin, {}) })) : friends.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u63A8\u8350\u4E66\u53CB\uFF0C\u5148\u591A\u8BFB\u51E0\u672C\u4E66\u5427~" })) : (_jsx("div", { className: "friends-grid", children: friends.map(f => (_jsx(FriendRecommendCard, { friend: f, onFollowChange: (id, followed) => {
                                        setFriends(prev => prev.map(fr => fr.id === id ? { ...fr, isFollowing: followed } : fr));
                                    }, onDismiss: dismissFriend }, f.id))) }))] }))] })),
        },
        {
            key: 'hot',
            label: '热门榜单',
            children: (_jsxs("div", { className: "discover-section", children: [_jsx("h2", { className: "section-title", children: "\uD83D\uDD25 \u8FD1 7 \u5929\u70ED\u95E8\u4E66\u7C4D" }), hotLoading ? (_jsx("div", { className: "loading-center", children: _jsx(Spin, { size: "large" }) })) : hotBooks.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u70ED\u95E8\u6570\u636E" })) : (_jsx("div", { className: "books-grid", children: hotBooks.map((b, idx) => (_jsxs("div", { className: "hot-rank-wrapper", children: [_jsx("span", { className: `rank-badge ${idx < 3 ? 'rank-top' : ''}`, children: idx + 1 }), _jsx(BookRecommendCard, { book: b, onDismiss: () => { } })] }, b.id))) }))] })),
        },
    ];
    return (_jsxs("div", { className: "discover-page", children: [_jsxs("div", { className: "discover-header", children: [_jsx("h1", { children: "\u53D1\u73B0" }), _jsx("p", { children: "\u57FA\u4E8E\u4F60\u7684\u9605\u8BFB\u504F\u597D\uFF0C\u4E3A\u4F60\u63A8\u8350\u597D\u4E66\u4E0E\u4E66\u53CB" })] }), _jsx(Tabs, { activeKey: activeTab, onChange: setActiveTab, items: tabItems, className: "discover-tabs" })] }));
}
