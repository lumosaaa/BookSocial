import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * 模块2 · BookDetailPage.tsx
 * 书籍详情页
 * - 封面 / 基本信息 / 评分
 * - 书架三态切换（想读 / 在读 / 已读）
 * - 阅读进度更新（在读状态）
 * - 半星评分（已读状态）
 * - 标签展示 + 用户添加标签
 * - Tab：书评 / 笔记 / 讨论（占位，M3/M5 联调后填充）
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Button, Rate, Tag, Tabs, Modal, InputNumber, Input, message, Tooltip, Divider, Progress, Empty, Select, } from 'antd';
import { BookOutlined, HeartOutlined, ReadOutlined, CheckOutlined, StarFilled, StarOutlined, PlusOutlined, } from '@ant-design/icons';
import { getBook, addToShelf, updateShelfEntry, removeFromShelf, addBookTag, STATUS_LABELS, STATUS_COLORS, } from '../../api/bookApi';
import { createNote, getBookNotes } from '../../api/postApi';
import { createDiscussion, createDiscussionComment, getDiscussion, listDiscussionComments, listDiscussions, toggleDiscussionLike, } from '../../api/groupApi';
import NoteCard from '../../components/NoteCard';
import { useAuthStore } from '../../store/authStore';
// ── 书架操作按钮配置 ────────────────────────────────────────────────────────────
const SHELF_ACTIONS = [
    { value: 1, label: '想读', icon: _jsx(HeartOutlined, {}) },
    { value: 2, label: '在读', icon: _jsx(ReadOutlined, {}) },
    { value: 3, label: '已读', icon: _jsx(CheckOutlined, {}) },
];
const BookDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [shelfLoading, setShelfLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('reviews');
    const [progressModal, setProgressModal] = useState(false);
    const [progressInput, setProgressInput] = useState(0);
    const [tagInput, setTagInput] = useState('');
    const [tagAdding, setTagAdding] = useState(false);
    const [bookNotes, setBookNotes] = useState([]);
    const [discussions, setDiscussions] = useState([]);
    const [tabLoading, setTabLoading] = useState(false);
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [noteSubmitting, setNoteSubmitting] = useState(false);
    const [noteForm, setNoteForm] = useState({
        title: '',
        content: '',
        quote: '',
        pageNumber: undefined,
        chapter: '',
    });
    const [discussionModalOpen, setDiscussionModalOpen] = useState(false);
    const [discussionSubmitting, setDiscussionSubmitting] = useState(false);
    const [discussionForm, setDiscussionForm] = useState({
        title: '',
        content: '',
        category: 0,
        hasSpoiler: false,
    });
    const [discussionDetailOpen, setDiscussionDetailOpen] = useState(false);
    const [discussionDetailLoading, setDiscussionDetailLoading] = useState(false);
    const [activeDiscussion, setActiveDiscussion] = useState(null);
    const [discussionComments, setDiscussionComments] = useState([]);
    const [discussionCommentInput, setDiscussionCommentInput] = useState('');
    const [discussionCommentSubmitting, setDiscussionCommentSubmitting] = useState(false);
    const loadNotes = async () => {
        if (!book)
            return;
        setTabLoading(true);
        try {
            const data = await getBookNotes(book.id, 1, 10, 'hot');
            setBookNotes(data.list);
        }
        catch {
            message.error('加载笔记失败');
        }
        finally {
            setTabLoading(false);
        }
    };
    const loadDiscussions = async () => {
        if (!book)
            return;
        setTabLoading(true);
        try {
            const data = await listDiscussions(book.id, { page: 1, sort: 'hot' });
            setDiscussions(data.list);
        }
        catch {
            message.error('加载讨论失败');
        }
        finally {
            setTabLoading(false);
        }
    };
    // ── 加载书籍详情 ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!id || isNaN(Number(id))) {
            navigate('/');
            return;
        }
        setLoading(true);
        getBook(Number(id))
            .then(res => setBook(res.data.data))
            .catch(() => { message.error('获取书籍信息失败'); navigate('/'); })
            .finally(() => setLoading(false));
    }, [id, navigate]);
    useEffect(() => {
        if (!book)
            return;
        if (activeTab === 'notes') {
            loadNotes();
        }
        if (activeTab === 'discuss') {
            loadDiscussions();
        }
    }, [activeTab, book]);
    // ── 书架操作 ────────────────────────────────────────────────────────────────
    const handleShelfToggle = async (status) => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }
        if (!book)
            return;
        setShelfLoading(true);
        try {
            if (book.myShelf?.status === status) {
                // 点击已激活状态 → 取消
                await removeFromShelf(book.id);
                setBook({ ...book, myShelf: null });
                message.success('已从书架移除');
            }
            else if (book.myShelf) {
                // 切换状态
                await updateShelfEntry(book.id, { status });
                setBook({ ...book, myShelf: { ...book.myShelf, status } });
                message.success(`已更新为「${STATUS_LABELS[status]}」`);
            }
            else {
                // 首次添加
                await addToShelf(book.id, status);
                setBook({ ...book, myShelf: { bookId: book.id, status } });
                message.success(`已加入「${STATUS_LABELS[status]}」`);
            }
        }
        catch {
            message.error('操作失败，请重试');
        }
        finally {
            setShelfLoading(false);
        }
    };
    // ── 评分（已读后允许评分，半星 = 0.5） ─────────────────────────────────────
    const handleRating = async (val) => {
        if (!book?.myShelf)
            return;
        const rating = Math.round(val * 2); // 将 0.5–5 转为 1–10
        try {
            await updateShelfEntry(book.id, { rating });
            setBook({ ...book, myShelf: { ...book.myShelf, rating } });
        }
        catch {
            message.error('评分失败');
        }
    };
    // ── 更新阅读进度 ────────────────────────────────────────────────────────────
    const handleProgressSave = async () => {
        if (!book?.myShelf)
            return;
        try {
            await updateShelfEntry(book.id, { readingProgress: progressInput });
            setBook({ ...book, myShelf: { ...book.myShelf, readingProgress: progressInput } });
            setProgressModal(false);
            message.success('进度已更新');
        }
        catch {
            message.error('更新失败');
        }
    };
    // ── 添加标签 ────────────────────────────────────────────────────────────────
    const handleAddTag = async () => {
        if (!tagInput.trim() || !book)
            return;
        setTagAdding(true);
        try {
            await addBookTag(book.id, tagInput.trim());
            // 刷新书籍信息以更新标签列表
            const res = await getBook(book.id);
            setBook(res.data.data);
            setTagInput('');
            message.success('标签已添加');
        }
        catch {
            message.error('添加标签失败');
        }
        finally {
            setTagAdding(false);
        }
    };
    const handleCreateNote = async () => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }
        if (!book || !noteForm.content.trim()) {
            message.warning('请填写笔记内容');
            return;
        }
        setNoteSubmitting(true);
        try {
            await createNote({
                bookId: book.id,
                title: noteForm.title.trim() || undefined,
                content: noteForm.content.trim(),
                quote: noteForm.quote.trim() || undefined,
                pageNumber: noteForm.pageNumber,
                chapter: noteForm.chapter.trim() || undefined,
                isPublic: true,
            });
            message.success('笔记已发布');
            setNoteModalOpen(false);
            setNoteForm({ title: '', content: '', quote: '', pageNumber: undefined, chapter: '' });
            setActiveTab('notes');
            await loadNotes();
        }
        catch {
            message.error('发布笔记失败');
        }
        finally {
            setNoteSubmitting(false);
        }
    };
    const handleCreateDiscussion = async () => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }
        if (!book || !discussionForm.title.trim() || !discussionForm.content.trim()) {
            message.warning('请填写讨论标题和内容');
            return;
        }
        setDiscussionSubmitting(true);
        try {
            const created = await createDiscussion(book.id, {
                title: discussionForm.title.trim(),
                content: discussionForm.content.trim(),
                category: discussionForm.category,
                hasSpoiler: discussionForm.hasSpoiler,
            });
            message.success('讨论已发布');
            setDiscussionModalOpen(false);
            setDiscussionForm({ title: '', content: '', category: 0, hasSpoiler: false });
            setActiveTab('discuss');
            setDiscussions(prev => [created, ...prev]);
        }
        catch {
            message.error('发布讨论失败');
        }
        finally {
            setDiscussionSubmitting(false);
        }
    };
    const openDiscussionDetail = async (discId) => {
        setDiscussionDetailOpen(true);
        setDiscussionDetailLoading(true);
        try {
            const [disc, comments] = await Promise.all([
                getDiscussion(discId),
                listDiscussionComments(discId, 1),
            ]);
            setActiveDiscussion(disc);
            setDiscussionComments(comments.list);
        }
        catch {
            message.error('加载讨论详情失败');
            setDiscussionDetailOpen(false);
        }
        finally {
            setDiscussionDetailLoading(false);
        }
    };
    const handleDiscussionLike = async () => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }
        if (!activeDiscussion)
            return;
        try {
            const res = await toggleDiscussionLike(activeDiscussion.id);
            setActiveDiscussion((prev) => prev ? { ...prev, isLiked: res.liked, likeCount: res.likeCount } : prev);
            setDiscussions(prev => prev.map((item) => item.id === activeDiscussion.id ? { ...item, isLiked: res.liked, likeCount: res.likeCount } : item));
        }
        catch {
            message.error('操作失败');
        }
    };
    const handleCreateDiscussionComment = async () => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }
        if (!activeDiscussion || !discussionCommentInput.trim())
            return;
        setDiscussionCommentSubmitting(true);
        try {
            const comment = await createDiscussionComment(activeDiscussion.id, {
                content: discussionCommentInput.trim(),
            });
            setDiscussionComments(prev => [...prev, comment]);
            setDiscussionCommentInput('');
            setActiveDiscussion((prev) => prev ? { ...prev, commentCount: (prev.commentCount || 0) + 1 } : prev);
            setDiscussions(prev => prev.map((item) => item.id === activeDiscussion.id ? { ...item, commentCount: (item.commentCount || 0) + 1 } : item));
        }
        catch {
            message.error('发表评论失败');
        }
        finally {
            setDiscussionCommentSubmitting(false);
        }
    };
    // ─────────────────────────────────────────────────────────────────────────────
    if (loading) {
        return (_jsx("div", { style: { padding: '80px 0', textAlign: 'center' }, children: _jsx(Spin, { size: "large" }) }));
    }
    if (!book)
        return null;
    const currentStatus = book.myShelf?.status;
    const progressPct = book.myShelf?.readingProgress && book.pages
        ? Math.min(100, Math.round((book.myShelf.readingProgress / book.pages) * 100))
        : null;
    return (_jsxs("div", { style: { maxWidth: 720, padding: '28px 0' }, children: [_jsxs("div", { style: { display: 'flex', gap: 28, marginBottom: 32, alignItems: 'flex-start' }, children: [_jsx("div", { style: {
                            width: 148,
                            height: 208,
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: 'var(--color-accent, #E8D5B7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
                        }, children: book.coverUrl
                            ? _jsx("img", { src: book.coverUrl, alt: book.title, style: { width: '100%', height: '100%', objectFit: 'cover' } })
                            : _jsx(BookOutlined, { style: { fontSize: 52, color: 'var(--color-secondary, #C8A96E)' } }) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("h1", { style: {
                                    fontSize: 22,
                                    fontWeight: 700,
                                    color: 'var(--color-text-primary, #2C3E2D)',
                                    marginBottom: 8,
                                    lineHeight: 1.35,
                                }, children: book.title }), _jsxs("div", { style: { color: 'var(--color-text-secondary)', marginBottom: 4, fontSize: 14 }, children: ["\u4F5C\u8005\uFF1A", book.author?.split('│').join(' / ')] }), (book.publisher || book.publishDate) && (_jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 4 }, children: [book.publisher, book.publishDate?.slice(0, 7)].filter(Boolean).join(' · ') })), (book.pages || book.language) && (_jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 14 }, children: [book.pages && `${book.pages} 页`, book.language?.toUpperCase()].filter(Boolean).join(' · ') })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }, children: [book.platformRating !== null && book.platformRating !== undefined && (_jsx(Tooltip, { title: `平台综合评分 · ${book.ratingCount} 人评`, children: _jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: 5 }, children: [_jsx(Rate, { disabled: true, allowHalf: true, value: book.platformRating, style: { fontSize: 15 } }), _jsx("span", { style: { color: '#92400e', fontWeight: 700, fontSize: 15 }, children: book.platformRating.toFixed(1) })] }) })), book.shelfCount > 0 && (_jsxs("span", { style: { fontSize: 13, color: 'var(--color-text-secondary)' }, children: [book.shelfCount, " \u4EBA\u8BFB\u8FC7"] }))] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }, children: [book.readerAvailable && (_jsx(Button, { type: "primary", onClick: () => navigate(`/books/${book.id}/read`), style: {
                                            borderRadius: 20,
                                            background: 'var(--color-primary, #4A6741)',
                                            borderColor: 'var(--color-primary, #4A6741)',
                                            fontWeight: 600,
                                        }, children: "\u5728\u7EBF\u9605\u8BFB" })), SHELF_ACTIONS.map(action => {
                                        const isActive = currentStatus === action.value;
                                        return (_jsx(Button, { icon: action.icon, loading: shelfLoading, onClick: () => handleShelfToggle(action.value), style: {
                                                borderRadius: 20,
                                                borderColor: STATUS_COLORS[action.value],
                                                color: isActive ? '#fff' : STATUS_COLORS[action.value],
                                                background: isActive ? STATUS_COLORS[action.value] : 'transparent',
                                                fontWeight: 600,
                                                transition: 'all 0.18s',
                                            }, children: isActive ? `✓ ${action.label}` : action.label }, action.value));
                                    })] }), currentStatus === 2 && (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 5 }, children: [_jsx("span", { children: "\u9605\u8BFB\u8FDB\u5EA6" }), _jsxs("span", { children: [book.myShelf?.readingProgress ? `${book.myShelf.readingProgress}${book.pages ? ` / ${book.pages}` : ''}页` : '未记录', progressPct !== null && `（${progressPct}%）`] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Progress, { percent: progressPct ?? 0, showInfo: false, strokeColor: "var(--color-primary, #4A6741)", trailColor: "var(--color-border)", style: { flex: 1, margin: 0 } }), _jsx(Button, { size: "small", style: { borderRadius: 14, fontSize: 12 }, onClick: () => {
                                                    setProgressInput(book.myShelf?.readingProgress || 0);
                                                    setProgressModal(true);
                                                }, children: "\u66F4\u65B0" })] })] })), currentStatus === 3 && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 13, color: 'var(--color-text-secondary)' }, children: "\u6211\u7684\u8BC4\u5206\uFF1A" }), _jsx(Rate, { allowHalf: true, value: (book.myShelf?.rating || 0) / 2, onChange: handleRating, character: ({ index, value }) => (index ?? 0) < Math.floor((value ?? 0)) ? (_jsx(StarFilled, { style: { color: '#f59e0b' } })) : (_jsx(StarOutlined, { style: { color: '#f59e0b' } })) }), book.myShelf?.rating && (_jsx("span", { style: { color: '#92400e', fontWeight: 600 }, children: (book.myShelf.rating / 2).toFixed(1) }))] }))] })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }, children: [book.tags.map(tag => (_jsxs(Tag, { style: {
                            borderRadius: 14,
                            padding: '2px 10px',
                            background: tag.isOfficial ? 'var(--color-primary, #4A6741)22' : 'var(--color-accent, #E8D5B7)',
                            borderColor: tag.isOfficial ? 'var(--color-primary, #4A6741)' : 'var(--color-border)',
                            color: 'var(--color-text-primary)',
                            fontSize: 12,
                        }, children: [tag.name, tag.count > 1 && (_jsxs("span", { style: { color: 'var(--color-text-secondary)', marginLeft: 3, fontSize: 11 }, children: ["\u00D7", tag.count] }))] }, tag.id))), isLoggedIn && (_jsxs("div", { style: { display: 'flex', gap: 4, alignItems: 'center' }, children: [_jsx(Input, { size: "small", placeholder: "\u6DFB\u52A0\u6807\u7B7E", value: tagInput, onChange: e => setTagInput(e.target.value), onPressEnter: handleAddTag, style: { width: 90, borderRadius: 14, fontSize: 12 }, maxLength: 20 }), _jsx(Button, { size: "small", icon: _jsx(PlusOutlined, {}), loading: tagAdding, onClick: handleAddTag, style: { borderRadius: 14 } })] }))] }), (book.readerLicenseNote || book.readerSource) && (_jsxs("div", { style: {
                    marginBottom: 20,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'rgba(74,103,65,0.08)',
                    color: 'var(--color-text-primary)',
                    fontSize: 13,
                    lineHeight: 1.7,
                }, children: [_jsx("div", { style: { fontWeight: 600, marginBottom: 4 }, children: "\u5728\u7EBF\u9605\u8BFB\u8BF4\u660E" }), _jsx("div", { children: [book.readerSource && `来源：${book.readerSource}`, book.readerLicenseNote].filter(Boolean).join(' · ') })] })), book.description && (_jsxs(_Fragment, { children: [_jsx(Divider, { style: { borderColor: 'var(--color-border)' } }), _jsx("div", { style: {
                            fontSize: 14,
                            color: 'var(--color-text-primary)',
                            lineHeight: 1.85,
                            marginBottom: 24,
                            whiteSpace: 'pre-line',
                        }, children: book.description.length > 500
                            ? _jsx(ExpandableText, { text: book.description, maxLen: 500 })
                            : book.description })] })), _jsx(Divider, { style: { borderColor: 'var(--color-border)' } }), _jsx(Tabs, { activeKey: activeTab, onChange: setActiveTab, items: [
                    {
                        key: 'reviews',
                        label: `书评 (${book.reviewCount})`,
                        children: (_jsx("div", { style: { padding: '20px 0', color: 'var(--color-text-secondary)', textAlign: 'center' }, children: _jsx(Empty, { description: "\u6682\u672A\u5F00\u653E\u4E13\u95E8\u7684\u4E66\u8BC4\u9875\u9762\uFF0C\u8BF7\u5230\u8BA8\u8BBA\u6216\u7B14\u8BB0 Tab \u67E5\u770B\u8BFB\u8005\u53CD\u9988" }) })),
                    },
                    {
                        key: 'notes',
                        label: `笔记 ${bookNotes.length > 0 ? bookNotes.length : ''}`,
                        children: tabLoading ? (_jsx("div", { style: { padding: 24, textAlign: 'center' }, children: _jsx(Spin, {}) })) : bookNotes.length === 0 ? (_jsxs("div", { style: { padding: 24 }, children: [_jsx(Empty, { description: "\u6682\u65E0\u516C\u5F00\u7B14\u8BB0" }), isLoggedIn && (_jsx("div", { style: { textAlign: 'center', marginTop: 16 }, children: _jsx(Button, { type: "primary", onClick: () => setNoteModalOpen(true), children: "\u5199\u7B2C\u4E00\u7BC7\u7B14\u8BB0" }) }))] })) : (_jsxs("div", { style: { padding: '12px 0' }, children: [_jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }, children: _jsx(Button, { onClick: () => setNoteModalOpen(true), type: "primary", children: "\u5199\u7B14\u8BB0" }) }), bookNotes.map(n => _jsx(NoteCard, { note: n }, n.id))] })),
                    },
                    {
                        key: 'discuss',
                        label: `讨论 ${discussions.length > 0 ? discussions.length : ''}`,
                        children: tabLoading ? (_jsx("div", { style: { padding: 24, textAlign: 'center' }, children: _jsx(Spin, {}) })) : discussions.length === 0 ? (_jsxs("div", { style: { padding: 24 }, children: [_jsx(Empty, { description: "\u8FD8\u6CA1\u6709\u8BA8\u8BBA\uFF0C\u7B2C\u4E00\u4E2A\u53D1\u8D77\u8BDD\u9898\u5427" }), isLoggedIn && (_jsx("div", { style: { textAlign: 'center', marginTop: 16 }, children: _jsx(Button, { type: "primary", onClick: () => setDiscussionModalOpen(true), children: "\u53D1\u8D77\u8BA8\u8BBA" }) }))] })) : (_jsxs("div", { style: { padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }, children: _jsx(Button, { onClick: () => setDiscussionModalOpen(true), type: "primary", children: "\u53D1\u8D77\u8BA8\u8BBA" }) }), discussions.map(d => (_jsxs("div", { style: {
                                        padding: '12px 14px',
                                        background: '#fff',
                                        borderRadius: 12,
                                        border: '1px solid #f0f0f0',
                                        cursor: 'pointer',
                                    }, onClick: () => openDiscussionDetail(d.id), children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("strong", { style: { fontSize: 14 }, children: d.title }), _jsx(Tag, { color: "green", style: { fontSize: 11 }, children: d.categoryName }), d.hasSpoiler && _jsx(Tag, { color: "red", style: { fontSize: 11 }, children: "\u5267\u900F" })] }), _jsxs("div", { style: { fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }, children: [d.content?.slice(0, 120), d.content?.length > 120 ? '…' : ''] }), _jsxs("div", { style: { marginTop: 6, fontSize: 12, color: '#999' }, children: ["@", d.username, " \u00B7 ", d.commentCount, " \u8BC4\u8BBA \u00B7 ", d.likeCount, " \u8D5E"] })] }, d.id)))] })),
                    },
                ] }), _jsx(Modal, { title: "\u66F4\u65B0\u9605\u8BFB\u8FDB\u5EA6", open: progressModal, onOk: handleProgressSave, onCancel: () => setProgressModal(false), okText: "\u4FDD\u5B58", okButtonProps: { style: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }, children: [_jsx("span", { style: { color: 'var(--color-text-secondary)', fontSize: 14 }, children: "\u5F53\u524D\u9875\u6570\uFF1A" }), _jsx(InputNumber, { min: 0, max: book.pages || 9999, value: progressInput, onChange: val => setProgressInput(val || 0), style: { width: 100 } }), book.pages && (_jsxs("span", { style: { color: 'var(--color-text-secondary)', fontSize: 13 }, children: ["/ ", book.pages, " \u9875", progressInput > 0 && book.pages > 0 && (_jsxs("span", { style: { marginLeft: 6, color: 'var(--color-primary)', fontWeight: 600 }, children: ["(", Math.min(100, Math.round(progressInput / book.pages * 100)), "%)"] }))] }))] }) }), _jsx(Modal, { title: "\u5199\u9605\u8BFB\u7B14\u8BB0", open: noteModalOpen, onCancel: () => setNoteModalOpen(false), onOk: handleCreateNote, okText: "\u53D1\u5E03\u7B14\u8BB0", confirmLoading: noteSubmitting, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsx(Input, { placeholder: "\u7B14\u8BB0\u6807\u9898\uFF08\u53EF\u9009\uFF09", value: noteForm.title, onChange: e => setNoteForm(prev => ({ ...prev, title: e.target.value })), maxLength: 120 }), _jsx(Input.TextArea, { placeholder: "\u5199\u4E0B\u4F60\u7684\u9605\u8BFB\u611F\u53D7...", rows: 6, value: noteForm.content, onChange: e => setNoteForm(prev => ({ ...prev, content: e.target.value })), maxLength: 50000, showCount: true }), _jsx(Input, { placeholder: "\u6458\u5F55\uFF08\u53EF\u9009\uFF09", value: noteForm.quote, onChange: e => setNoteForm(prev => ({ ...prev, quote: e.target.value })), maxLength: 500 }), _jsxs("div", { style: { display: 'flex', gap: 12 }, children: [_jsx(InputNumber, { min: 1, max: book.pages || 9999, placeholder: "\u9875\u7801", value: noteForm.pageNumber, onChange: val => setNoteForm(prev => ({ ...prev, pageNumber: val || undefined })), style: { width: 120 } }), _jsx(Input, { placeholder: "\u7AE0\u8282\uFF08\u53EF\u9009\uFF09", value: noteForm.chapter, onChange: e => setNoteForm(prev => ({ ...prev, chapter: e.target.value })), maxLength: 120 })] })] }) }), _jsx(Modal, { title: "\u53D1\u8D77\u4E66\u7C4D\u8BA8\u8BBA", open: discussionModalOpen, onCancel: () => setDiscussionModalOpen(false), onOk: handleCreateDiscussion, okText: "\u53D1\u5E03\u8BA8\u8BBA", confirmLoading: discussionSubmitting, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsx(Input, { placeholder: "\u8BA8\u8BBA\u6807\u9898", value: discussionForm.title, onChange: e => setDiscussionForm(prev => ({ ...prev, title: e.target.value })), maxLength: 200 }), _jsx(Select, { value: discussionForm.category, onChange: (value) => setDiscussionForm(prev => ({ ...prev, category: value })), options: [
                                { value: 0, label: '综合' },
                                { value: 1, label: '书评' },
                                { value: 2, label: '剧情' },
                                { value: 3, label: '推荐' },
                                { value: 4, label: '求助' },
                            ] }), _jsx(Input.TextArea, { placeholder: "\u5199\u4E0B\u4F60\u7684\u89C2\u70B9\u3001\u95EE\u9898\u6216\u5206\u4EAB...", rows: 6, value: discussionForm.content, onChange: e => setDiscussionForm(prev => ({ ...prev, content: e.target.value })), maxLength: 5000, showCount: true }), _jsx(Button, { onClick: () => setDiscussionForm(prev => ({ ...prev, hasSpoiler: !prev.hasSpoiler })), type: discussionForm.hasSpoiler ? 'primary' : 'default', children: discussionForm.hasSpoiler ? '含剧透' : '不含剧透' })] }) }), _jsx(Modal, { title: "\u8BA8\u8BBA\u8BE6\u60C5", open: discussionDetailOpen, onCancel: () => {
                    setDiscussionDetailOpen(false);
                    setActiveDiscussion(null);
                    setDiscussionComments([]);
                    setDiscussionCommentInput('');
                }, footer: null, width: 760, children: discussionDetailLoading || !activeDiscussion ? (_jsx("div", { style: { textAlign: 'center', padding: 48 }, children: _jsx(Spin, {}) })) : (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }, children: [_jsx(Tag, { color: "green", children: activeDiscussion.categoryName }), activeDiscussion.hasSpoiler && _jsx(Tag, { color: "red", children: "\u5267\u900F" }), _jsxs("span", { style: { color: '#999', fontSize: 12 }, children: ["@", activeDiscussion.username] })] }), _jsx("h3", { style: { margin: '0 0 8px', fontSize: 18 }, children: activeDiscussion.title }), _jsx("div", { style: { whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)', lineHeight: 1.8 }, children: activeDiscussion.content }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }, children: [_jsxs(Button, { onClick: handleDiscussionLike, type: activeDiscussion.isLiked ? 'primary' : 'default', children: [activeDiscussion.isLiked ? '已点赞' : '点赞', " ", activeDiscussion.likeCount || 0] }), _jsxs("span", { style: { color: '#999', fontSize: 12 }, children: [activeDiscussion.commentCount || 0, " \u6761\u8BC4\u8BBA"] })] })] }), _jsx(Divider, { style: { margin: 0 } }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: discussionComments.length === 0 ? (_jsx(Empty, { description: "\u8FD8\u6CA1\u6709\u8BC4\u8BBA" })) : (discussionComments.map(comment => (_jsxs("div", { style: { background: '#fafafa', borderRadius: 10, padding: '10px 12px' }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, marginBottom: 4 }, children: comment.username }), _jsx("div", { style: { whiteSpace: 'pre-wrap', lineHeight: 1.7 }, children: comment.content }), _jsx("div", { style: { marginTop: 6, color: '#999', fontSize: 12 }, children: new Date(comment.createdAt).toLocaleString('zh-CN') })] }, comment.id)))) }), _jsxs("div", { style: { display: 'flex', gap: 10 }, children: [_jsx(Input.TextArea, { rows: 3, value: discussionCommentInput, onChange: e => setDiscussionCommentInput(e.target.value), placeholder: "\u5199\u4E0B\u4F60\u7684\u8BC4\u8BBA...", maxLength: 1000 }), _jsx(Button, { type: "primary", onClick: handleCreateDiscussionComment, loading: discussionCommentSubmitting, disabled: !discussionCommentInput.trim(), children: "\u53D1\u8868\u8BC4\u8BBA" })] })] })) })] }));
};
// ── 展开/收起组件 ──────────────────────────────────────────────────────────────
const ExpandableText = ({ text, maxLen }) => {
    const [expanded, setExpanded] = useState(false);
    return (_jsxs("span", { children: [expanded ? text : text.slice(0, maxLen) + '…', _jsx("span", { onClick: () => setExpanded(!expanded), style: { color: 'var(--color-primary)', cursor: 'pointer', marginLeft: 4, fontSize: 13 }, children: expanded ? ' 收起' : ' 展开全文' })] }));
};
export default BookDetailPage;
