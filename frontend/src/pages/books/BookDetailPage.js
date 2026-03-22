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
import { Spin, Button, Rate, Tag, Tabs, Modal, InputNumber, Input, message, Tooltip, Divider, Progress, } from 'antd';
import { BookOutlined, HeartOutlined, ReadOutlined, CheckOutlined, StarFilled, StarOutlined, PlusOutlined, } from '@ant-design/icons';
import { getBook, addToShelf, updateShelfEntry, removeFromShelf, addBookTag, STATUS_LABELS, STATUS_COLORS, } from '../../api/bookApi';
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
    // ── 加载书籍详情 ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!id || isNaN(Number(id))) {
            navigate('/books');
            return;
        }
        setLoading(true);
        getBook(Number(id))
            .then(res => setBook(res.data.data))
            .catch(() => { message.error('获取书籍信息失败'); navigate('/books'); })
            .finally(() => setLoading(false));
    }, [id, navigate]);
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
                                }, children: book.title }), _jsxs("div", { style: { color: 'var(--color-text-secondary)', marginBottom: 4, fontSize: 14 }, children: ["\u4F5C\u8005\uFF1A", book.author?.split('│').join(' / ')] }), (book.publisher || book.publishDate) && (_jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 4 }, children: [book.publisher, book.publishDate?.slice(0, 7)].filter(Boolean).join(' · ') })), (book.pages || book.language) && (_jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 14 }, children: [book.pages && `${book.pages} 页`, book.language?.toUpperCase()].filter(Boolean).join(' · ') })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }, children: [book.platformRating !== null && book.platformRating !== undefined && (_jsx(Tooltip, { title: `平台综合评分 · ${book.ratingCount} 人评`, children: _jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: 5 }, children: [_jsx(Rate, { disabled: true, allowHalf: true, value: book.platformRating, style: { fontSize: 15 } }), _jsx("span", { style: { color: '#92400e', fontWeight: 700, fontSize: 15 }, children: book.platformRating.toFixed(1) })] }) })), book.shelfCount > 0 && (_jsxs("span", { style: { fontSize: 13, color: 'var(--color-text-secondary)' }, children: [book.shelfCount, " \u4EBA\u8BFB\u8FC7"] }))] }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }, children: SHELF_ACTIONS.map(action => {
                                    const isActive = currentStatus === action.value;
                                    return (_jsx(Button, { icon: action.icon, loading: shelfLoading, onClick: () => handleShelfToggle(action.value), style: {
                                            borderRadius: 20,
                                            borderColor: STATUS_COLORS[action.value],
                                            color: isActive ? '#fff' : STATUS_COLORS[action.value],
                                            background: isActive ? STATUS_COLORS[action.value] : 'transparent',
                                            fontWeight: 600,
                                            transition: 'all 0.18s',
                                        }, children: isActive ? `✓ ${action.label}` : action.label }, action.value));
                                }) }), currentStatus === 2 && (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 5 }, children: [_jsx("span", { children: "\u9605\u8BFB\u8FDB\u5EA6" }), _jsxs("span", { children: [book.myShelf?.readingProgress ? `${book.myShelf.readingProgress}${book.pages ? ` / ${book.pages}` : ''}页` : '未记录', progressPct !== null && `（${progressPct}%）`] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Progress, { percent: progressPct ?? 0, showInfo: false, strokeColor: "var(--color-primary, #4A6741)", trailColor: "var(--color-border)", style: { flex: 1, margin: 0 } }), _jsx(Button, { size: "small", style: { borderRadius: 14, fontSize: 12 }, onClick: () => {
                                                    setProgressInput(book.myShelf?.readingProgress || 0);
                                                    setProgressModal(true);
                                                }, children: "\u66F4\u65B0" })] })] })), currentStatus === 3 && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 13, color: 'var(--color-text-secondary)' }, children: "\u6211\u7684\u8BC4\u5206\uFF1A" }), _jsx(Rate, { allowHalf: true, value: (book.myShelf?.rating || 0) / 2, onChange: handleRating, character: ({ index, value }) => (index ?? 0) < Math.floor((value ?? 0)) ? (_jsx(StarFilled, { style: { color: '#f59e0b' } })) : (_jsx(StarOutlined, { style: { color: '#f59e0b' } })) }), book.myShelf?.rating && (_jsx("span", { style: { color: '#92400e', fontWeight: 600 }, children: (book.myShelf.rating / 2).toFixed(1) }))] }))] })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }, children: [book.tags.map(tag => (_jsxs(Tag, { style: {
                            borderRadius: 14,
                            padding: '2px 10px',
                            background: tag.isOfficial ? 'var(--color-primary, #4A6741)22' : 'var(--color-accent, #E8D5B7)',
                            borderColor: tag.isOfficial ? 'var(--color-primary, #4A6741)' : 'var(--color-border)',
                            color: 'var(--color-text-primary)',
                            fontSize: 12,
                        }, children: [tag.name, tag.count > 1 && (_jsxs("span", { style: { color: 'var(--color-text-secondary)', marginLeft: 3, fontSize: 11 }, children: ["\u00D7", tag.count] }))] }, tag.id))), isLoggedIn && (_jsxs("div", { style: { display: 'flex', gap: 4, alignItems: 'center' }, children: [_jsx(Input, { size: "small", placeholder: "\u6DFB\u52A0\u6807\u7B7E", value: tagInput, onChange: e => setTagInput(e.target.value), onPressEnter: handleAddTag, style: { width: 90, borderRadius: 14, fontSize: 12 }, maxLength: 20 }), _jsx(Button, { size: "small", icon: _jsx(PlusOutlined, {}), loading: tagAdding, onClick: handleAddTag, style: { borderRadius: 14 } })] }))] }), book.description && (_jsxs(_Fragment, { children: [_jsx(Divider, { style: { borderColor: 'var(--color-border)' } }), _jsx("div", { style: {
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
                        children: (_jsx("div", { style: { padding: '20px 0', color: 'var(--color-text-secondary)', textAlign: 'center' }, children: "\u4E66\u8BC4\u5185\u5BB9\u7531 M3 \u6A21\u5757\u63D0\u4F9B\uFF0C\u8054\u8C03\u540E\u6B64\u5904\u5C55\u793A" })),
                    },
                    {
                        key: 'notes',
                        label: '笔记',
                        children: (_jsx("div", { style: { padding: '20px 0', color: 'var(--color-text-secondary)', textAlign: 'center' }, children: "\u9605\u8BFB\u7B14\u8BB0\u7531 M3 \u6A21\u5757\u63D0\u4F9B\uFF0C\u8054\u8C03\u540E\u6B64\u5904\u5C55\u793A" })),
                    },
                    {
                        key: 'discuss',
                        label: '讨论',
                        children: (_jsx("div", { style: { padding: '20px 0', color: 'var(--color-text-secondary)', textAlign: 'center' }, children: "\u4E66\u7C4D\u8BA8\u8BBA\u533A\u7531 M5 \u6A21\u5757\u63D0\u4F9B\uFF0C\u8054\u8C03\u540E\u6B64\u5904\u5C55\u793A" })),
                    },
                ] }), _jsx(Modal, { title: "\u66F4\u65B0\u9605\u8BFB\u8FDB\u5EA6", open: progressModal, onOk: handleProgressSave, onCancel: () => setProgressModal(false), okText: "\u4FDD\u5B58", okButtonProps: { style: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }, children: [_jsx("span", { style: { color: 'var(--color-text-secondary)', fontSize: 14 }, children: "\u5F53\u524D\u9875\u6570\uFF1A" }), _jsx(InputNumber, { min: 0, max: book.pages || 9999, value: progressInput, onChange: val => setProgressInput(val || 0), style: { width: 100 } }), book.pages && (_jsxs("span", { style: { color: 'var(--color-text-secondary)', fontSize: 13 }, children: ["/ ", book.pages, " \u9875", progressInput > 0 && book.pages > 0 && (_jsxs("span", { style: { marginLeft: 6, color: 'var(--color-primary)', fontWeight: 600 }, children: ["(", Math.min(100, Math.round(progressInput / book.pages * 100)), "%)"] }))] }))] }) })] }));
};
// ── 展开/收起组件 ──────────────────────────────────────────────────────────────
const ExpandableText = ({ text, maxLen }) => {
    const [expanded, setExpanded] = useState(false);
    return (_jsxs("span", { children: [expanded ? text : text.slice(0, maxLen) + '…', _jsx("span", { onClick: () => setExpanded(!expanded), style: { color: 'var(--color-primary)', cursor: 'pointer', marginLeft: 4, fontSize: 13 }, children: expanded ? ' 收起' : ' 展开全文' })] }));
};
export default BookDetailPage;
