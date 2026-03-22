import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, Button, Spin, Empty, FloatButton } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { getFeed } from '../../api/postApi';
import PostCard from '../../components/PostCard';
import PostComposer from '../../components/PostComposer';
import { useAuthStore } from '../../store/authStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
const FeedPage = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [tab, setTab] = useState('recommend');
    const [posts, setPosts] = useState([]);
    const [cursor, setCursor] = useState();
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [composerOpen, setComposerOpen] = useState(false);
    const loaderRef = useRef(null);
    // /create 重定向过来时（?compose=1），自动打开发帖弹窗
    useEffect(() => {
        if (searchParams.get('compose') === '1') {
            if (user) {
                setComposerOpen(true);
            }
            else {
                navigate('/login');
            }
            // 清除 URL 参数，避免刷新后再次触发
            setSearchParams({}, { replace: true });
        }
    }, []);
    // ── 加载数据 ──────────────────────────────────────────────
    const loadFeed = useCallback(async (nextCursor, append = false) => {
        if (loading)
            return;
        setLoading(true);
        try {
            const res = await getFeed(tab, nextCursor);
            setPosts(prev => append ? [...prev, ...res.list] : res.list);
            setCursor(res.nextCursor ?? undefined);
            setHasMore(res.hasMore);
        }
        catch {
            // 静默失败，已有 apiClient 全局拦截
        }
        finally {
            setLoading(false);
        }
    }, [tab]);
    // Tab 切换时重置
    useEffect(() => {
        setPosts([]);
        setCursor(undefined);
        setHasMore(true);
        loadFeed();
    }, [tab]);
    // ── IntersectionObserver 无限滚动 ─────────────────────────
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loading) {
                loadFeed(cursor, true);
            }
        }, { threshold: 0.1 });
        if (loaderRef.current)
            observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasMore, loading, cursor, loadFeed]);
    const handlePostDeleted = (id) => {
        setPosts(prev => prev.filter(p => p.id !== id));
    };
    const tabItems = [
        { key: 'recommend', label: '推荐' },
        {
            key: 'following',
            label: '关注',
            disabled: !user,
        },
    ];
    return (_jsxs("div", { style: { maxWidth: 680, margin: '0 auto', padding: '0 0 80px' }, children: [_jsx(Tabs, { activeKey: tab, onChange: k => {
                    if (k === 'following' && !user) {
                        navigate('/login');
                        return;
                    }
                    setTab(k);
                }, items: tabItems, style: { position: 'sticky', top: 0, background: '#fff', zIndex: 10, paddingTop: 8 }, tabBarExtraContent: user && (_jsx(Button, { type: "primary", icon: _jsx(EditOutlined, {}), size: "small", onClick: () => setComposerOpen(true), style: { marginRight: 8 }, children: "\u53D1\u52A8\u6001" })) }), posts.map(post => (_jsx(PostCard, { post: post, onDeleted: handlePostDeleted }, post.id))), !loading && posts.length === 0 && (_jsx(Empty, { style: { marginTop: 60 }, description: tab === 'following'
                    ? '还没有关注的人发帖，去发现更多书友吧 →'
                    : '暂时没有推荐内容' })), _jsxs("div", { ref: loaderRef, style: { height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: [loading && _jsx(Spin, { size: "small" }), !loading && !hasMore && posts.length > 0 && (_jsx("span", { style: { color: '#bbb', fontSize: 13 }, children: "\u5DF2\u52A0\u8F7D\u5168\u90E8\u5185\u5BB9" }))] }), user && (_jsx(FloatButton, { icon: _jsx(PlusOutlined, {}), type: "primary", style: { bottom: 72, right: 20 }, onClick: () => setComposerOpen(true) })), _jsx(PostComposer, { open: composerOpen, onClose: () => setComposerOpen(false), onSuccess: () => {
                    setComposerOpen(false);
                    setPosts([]);
                    setCursor(undefined);
                    setHasMore(true);
                    loadFeed();
                } })] }));
};
export default FeedPage;
