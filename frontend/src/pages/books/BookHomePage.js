import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * BookHomePage.tsx
 * 微信读书风格首页：继续阅读 / 猜你喜欢 / 推荐书友 / 分类
 */
import { useEffect, useState, useCallback } from 'react';
import { Avatar, Button, Empty, Spin, Tooltip } from 'antd';
import { ReloadOutlined, ArrowRightOutlined, BookOutlined, StarFilled, UserAddOutlined, } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getCategories, getShelf, } from '../../api/bookApi';
import { getRecommendedBooks, getRecommendedFriends, getHotBooks, } from '../../api/discoverApi';
import { useAuthStore } from '../../store/authStore';
import FollowButton from '../../components/FollowButton';
const READING_LIMIT = 8;
const REC_PAGE = 4;
const FRIEND_PAGE = 4;
const CATEGORY_LIMIT = 12;
const sectionTitleStyle = {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    margin: 0,
};
const sectionStyle = {
    background: 'var(--color-surface-card)',
    borderRadius: 16,
    padding: '20px 24px',
    marginBottom: 24,
    boxShadow: 'var(--shadow-card)',
};
function SectionHeader({ title, onRefresh, onExpand, expandLabel = '展开', extra, }) {
    return (_jsxs("div", { style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
        }, children: [_jsx("h2", { style: sectionTitleStyle, children: title }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [extra, onRefresh && (_jsx(Tooltip, { title: "\u6362\u4E00\u6279", children: _jsx(Button, { size: "small", type: "text", icon: _jsx(ReloadOutlined, {}), onClick: onRefresh, style: { color: 'var(--color-text-secondary)' }, children: "\u6362\u4E00\u6279" }) })), onExpand && (_jsxs(Button, { size: "small", type: "text", onClick: onExpand, style: { color: 'var(--color-primary)' }, children: [expandLabel, " ", _jsx(ArrowRightOutlined, {})] }))] })] }));
}
function ContinueReadingCard({ entry }) {
    const navigate = useNavigate();
    const progress = entry.readingProgress && entry.totalPagesRef
        ? Math.min(100, Math.round((entry.readingProgress / entry.totalPagesRef) * 100))
        : null;
    return (_jsxs("div", { onClick: () => navigate(`/books/${entry.bookId}/read`), style: {
            display: 'flex',
            gap: 12,
            cursor: 'pointer',
            padding: 8,
            borderRadius: 10,
            transition: 'background 0.2s',
        }, onMouseEnter: e => (e.currentTarget.style.background = 'var(--color-accent)'), onMouseLeave: e => (e.currentTarget.style.background = 'transparent'), children: [_jsx("div", { style: {
                    width: 56,
                    height: 80,
                    borderRadius: 4,
                    overflow: 'hidden',
                    background: 'var(--color-accent)',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }, children: entry.coverUrl ? (_jsx("img", { src: entry.coverUrl, alt: entry.title, style: { width: '100%', height: '100%', objectFit: 'cover' } })) : (_jsx(BookOutlined, { style: { color: 'var(--color-secondary)', fontSize: 22 } })) }), _jsxs("div", { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }, children: [_jsxs("div", { children: [_jsx("div", { style: {
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: 'var(--color-text-primary)',
                                    lineHeight: 1.35,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                }, children: entry.title }), _jsx("div", { style: {
                                    fontSize: 12,
                                    color: 'var(--color-text-secondary)',
                                    marginTop: 4,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }, children: entry.author?.split('│')[0] || '佚名' })] }), _jsx("div", { style: { fontSize: 11, color: 'var(--color-text-secondary)' }, children: progress !== null ? `已读 ${progress}%` : '继续阅读' })] })] }));
}
function BookRecommendCard({ book }) {
    const navigate = useNavigate();
    const stars = book.platformRating ? (book.platformRating / 2).toFixed(1) : null;
    return (_jsxs("div", { onClick: () => navigate(`/books/${book.id}`), style: { cursor: 'pointer', display: 'flex', flexDirection: 'column' }, children: [_jsx("div", { style: {
                    width: '100%',
                    aspectRatio: '3 / 4',
                    background: 'var(--color-accent)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 4px 14px rgba(44,62,45,0.12)',
                }, children: book.coverUrl ? (_jsx("img", { src: book.coverUrl, alt: book.title, style: { width: '100%', height: '100%', objectFit: 'cover' } })) : (_jsx("div", { style: {
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-secondary)',
                    }, children: _jsx(BookOutlined, { style: { fontSize: 32 } }) })) }), _jsx("div", { style: {
                    marginTop: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.35,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }, children: book.title }), _jsx("div", { style: {
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                    marginTop: 4,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }, children: book.author?.split('│')[0] || '佚名' }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }, children: [stars && (_jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, color: '#92400e', fontWeight: 600 }, children: [_jsx(StarFilled, { style: { color: '#f59e0b', fontSize: 12 } }), stars] })), book.categoryName && (_jsxs("span", { style: { fontSize: 11, color: 'var(--color-text-secondary)' }, children: ["\u00B7 ", book.categoryName] }))] })] }));
}
function FriendRecommendCard({ friend }) {
    const navigate = useNavigate();
    const [followerCount, setFollowerCount] = useState(friend.followerCount);
    return (_jsxs("div", { style: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            textAlign: 'center',
        }, children: [_jsx(Avatar, { size: 56, src: friend.avatarUrl || undefined, style: { cursor: 'pointer', background: 'var(--color-accent)', color: 'var(--color-primary)' }, onClick: () => navigate(`/users/${friend.id}`), children: !friend.avatarUrl && friend.username[0] }), _jsxs("div", { style: { minHeight: 48 }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', cursor: 'pointer' }, onClick: () => navigate(`/users/${friend.id}`), children: friend.username }), _jsx("div", { style: {
                            fontSize: 12,
                            color: 'var(--color-text-secondary)',
                            marginTop: 4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }, children: friend.bio || `${friend.bookCount} 本书 · ${followerCount} 粉丝` })] }), _jsx(FollowButton, { userId: friend.id, initialFollowed: friend.isFollowing, size: "small", onToggle: (_followed, _mutual, nextFollowerCount) => setFollowerCount(nextFollowerCount) })] }));
}
function CategoryCard({ cat }) {
    const navigate = useNavigate();
    return (_jsxs("div", { onClick: () => navigate(`/categories/${cat.id}`), style: {
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 8px',
            borderRadius: 12,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            transition: 'all 0.2s',
            gap: 6,
        }, onMouseEnter: e => {
            e.currentTarget.style.borderColor = 'var(--color-primary-light)';
            e.currentTarget.style.transform = 'translateY(-2px)';
        }, onMouseLeave: e => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.transform = '';
        }, children: [_jsx("span", { style: { fontSize: 28 }, children: cat.icon || '📚' }), _jsx("span", { style: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }, children: cat.name }), cat.bookCount !== undefined && (_jsxs("span", { style: { fontSize: 11, color: 'var(--color-text-secondary)' }, children: [cat.bookCount, " \u672C\u4E66\u7C4D"] }))] }));
}
const BookHomePage = () => {
    const navigate = useNavigate();
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const [reading, setReading] = useState([]);
    const [recBooks, setRecBooks] = useState([]);
    const [recBookOffset, setRecBookOffset] = useState(0);
    const [recBooksLoading, setRecBooksLoading] = useState(false);
    const [friends, setFriends] = useState([]);
    const [friendOffset, setFriendOffset] = useState(0);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    // 继续阅读
    useEffect(() => {
        if (!isLoggedIn) {
            setReading([]);
            return;
        }
        getShelf({ status: 2, page: 1 })
            .then(res => {
            const list = res.data?.data?.list || [];
            setReading(list.slice(0, READING_LIMIT));
        })
            .catch(() => setReading([]));
    }, [isLoggedIn]);
    // 推荐书籍
    const loadRecBooks = useCallback(async (offset) => {
        setRecBooksLoading(true);
        try {
            const list = await getRecommendedBooks(REC_PAGE, offset);
            if (list.length === 0 && offset > 0) {
                // 翻完一轮，回到开头
                const fresh = await getRecommendedBooks(REC_PAGE, 0);
                setRecBookOffset(0);
                setRecBooks(fresh);
            }
            else {
                setRecBooks(list);
            }
        }
        catch {
            // 兜底：未登录用户走 hot
            try {
                const hot = await getHotBooks(REC_PAGE, offset);
                setRecBooks(hot);
            }
            catch {
                setRecBooks([]);
            }
        }
        finally {
            setRecBooksLoading(false);
        }
    }, []);
    useEffect(() => {
        loadRecBooks(0);
    }, [loadRecBooks]);
    // 推荐书友
    const loadFriends = useCallback(async (offset) => {
        if (!isLoggedIn) {
            setFriends([]);
            return;
        }
        setFriendsLoading(true);
        try {
            const list = await getRecommendedFriends(FRIEND_PAGE, offset);
            if (list.length === 0 && offset > 0) {
                const fresh = await getRecommendedFriends(FRIEND_PAGE, 0);
                setFriendOffset(0);
                setFriends(fresh);
            }
            else {
                setFriends(list);
            }
        }
        catch {
            setFriends([]);
        }
        finally {
            setFriendsLoading(false);
        }
    }, [isLoggedIn]);
    useEffect(() => {
        loadFriends(0);
    }, [loadFriends]);
    // 分类
    useEffect(() => {
        getCategories()
            .then(res => setCategories(res.data?.data ?? []))
            .catch(() => setCategories([]));
    }, []);
    const handleRefreshRecBooks = () => {
        const next = recBookOffset + REC_PAGE;
        setRecBookOffset(next);
        loadRecBooks(next);
    };
    const handleRefreshFriends = () => {
        const next = friendOffset + FRIEND_PAGE;
        setFriendOffset(next);
        loadFriends(next);
    };
    return (_jsxs("div", { children: [isLoggedIn && reading.length > 0 && (_jsxs("div", { style: sectionStyle, children: [_jsx(SectionHeader, { title: "\u7EE7\u7EED\u9605\u8BFB", onExpand: () => navigate('/shelf'), expandLabel: "\u6211\u7684\u4E66\u67B6" }), _jsx("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            gap: 12,
                        }, children: reading.map(entry => (_jsx(ContinueReadingCard, { entry: entry }, entry.bookId))) })] })), _jsxs("div", { style: sectionStyle, children: [_jsx(SectionHeader, { title: "\u731C\u4F60\u559C\u6B22", onRefresh: handleRefreshRecBooks, onExpand: () => navigate('/discover') }), recBooksLoading ? (_jsx("div", { style: { textAlign: 'center', padding: 48 }, children: _jsx(Spin, {}) })) : recBooks.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u63A8\u8350" })) : (_jsx("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            gap: 20,
                        }, children: recBooks.map(book => (_jsx(BookRecommendCard, { book: book }, book.id))) }))] }), isLoggedIn && (_jsxs("div", { style: sectionStyle, children: [_jsx(SectionHeader, { title: _jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 8 }, children: [_jsx(UserAddOutlined, { style: { color: 'var(--color-primary)' } }), " \u63A8\u8350\u4E66\u53CB"] }), onRefresh: handleRefreshFriends, onExpand: () => navigate('/discover') }), friendsLoading ? (_jsx("div", { style: { textAlign: 'center', padding: 32 }, children: _jsx(Spin, {}) })) : friends.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u63A8\u8350\u4E66\u53CB" })) : (_jsx("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            gap: 16,
                        }, children: friends.map(friend => (_jsx(FriendRecommendCard, { friend: friend }, friend.id))) }))] })), _jsxs("div", { style: sectionStyle, children: [_jsx(SectionHeader, { title: "\u5206\u7C7B", onExpand: () => navigate('/categories'), expandLabel: `查看全部${categories.length ? ` · ${categories.length} 个` : ''}` }), categories.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u5206\u7C7B" })) : (_jsx("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            gap: 12,
                        }, children: categories.slice(0, CATEGORY_LIMIT).map(cat => (_jsx(CategoryCard, { cat: cat }, cat.id))) }))] })] }));
};
export default BookHomePage;
