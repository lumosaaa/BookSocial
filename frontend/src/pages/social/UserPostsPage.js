import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Empty, Tabs } from 'antd';
import { getUserPosts, getUserNotes } from '../../api/postApi';
import PostCard from '../../components/PostCard';
import NoteCard from '../../components/NoteCard';
const UserPostsPage = ({ userId: propUserId }) => {
    const { id: paramId } = useParams();
    const userId = propUserId ?? Number(paramId);
    const [tab, setTab] = useState('posts');
    const [posts, setPosts] = useState([]);
    const [notes, setNotes] = useState([]);
    const [postPage, setPostPage] = useState(1);
    const [notePage, setNotePage] = useState(1);
    const [postHasMore, setPostHasMore] = useState(true);
    const [noteHasMore, setNoteHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    // ── 加载动态 ──────────────────────────────────────────────
    const loadPosts = useCallback(async (page = 1, append = false) => {
        if (!userId)
            return;
        setLoading(true);
        try {
            const res = await getUserPosts(userId, page);
            setPosts(prev => append ? [...prev, ...res.list] : res.list);
            setPostPage(page);
            setPostHasMore(res.hasMore);
        }
        finally {
            setLoading(false);
        }
    }, [userId]);
    // ── 加载笔记 ──────────────────────────────────────────────
    const loadNotes = useCallback(async (page = 1, append = false) => {
        if (!userId)
            return;
        setLoading(true);
        try {
            const res = await getUserNotes(userId, page);
            setNotes(prev => append ? [...prev, ...res.list] : res.list);
            setNotePage(page);
            setNoteHasMore(res.hasMore);
        }
        finally {
            setLoading(false);
        }
    }, [userId]);
    useEffect(() => {
        if (tab === 'posts')
            loadPosts(1);
        else
            loadNotes(1);
    }, [tab, userId]);
    const handlePostDeleted = (id) => setPosts(prev => prev.filter(p => p.id !== id));
    const tabItems = [
        { key: 'posts', label: '动态' },
        { key: 'notes', label: '笔记' },
    ];
    return (_jsxs("div", { children: [_jsx(Tabs, { activeKey: tab, onChange: k => setTab(k), items: tabItems, size: "small" }), tab === 'posts' && (_jsxs(_Fragment, { children: [posts.map(p => (_jsx(PostCard, { post: p, onDeleted: handlePostDeleted }, p.id))), !loading && posts.length === 0 && (_jsx(Empty, { description: "\u6682\u65E0\u52A8\u6001", style: { padding: '30px 0' } })), loading && _jsx("div", { style: { textAlign: 'center', padding: 20 }, children: _jsx(Spin, {}) }), !loading && postHasMore && (_jsx("div", { style: { textAlign: 'center', paddingTop: 12 }, children: _jsx("span", { style: { color: '#4A6741', cursor: 'pointer', fontSize: 13 }, onClick: () => loadPosts(postPage + 1, true), children: "\u52A0\u8F7D\u66F4\u591A" }) }))] })), tab === 'notes' && (_jsxs(_Fragment, { children: [notes.map(n => (_jsx(NoteCard, { note: n }, n.id))), !loading && notes.length === 0 && (_jsx(Empty, { description: "\u6682\u65E0\u516C\u5F00\u7B14\u8BB0", style: { padding: '30px 0' } })), loading && _jsx("div", { style: { textAlign: 'center', padding: 20 }, children: _jsx(Spin, {}) }), !loading && noteHasMore && (_jsx("div", { style: { textAlign: 'center', paddingTop: 12 }, children: _jsx("span", { style: { color: '#4A6741', cursor: 'pointer', fontSize: 13 }, onClick: () => loadNotes(notePage + 1, true), children: "\u52A0\u8F7D\u66F4\u591A" }) }))] }))] }));
};
export default UserPostsPage;
