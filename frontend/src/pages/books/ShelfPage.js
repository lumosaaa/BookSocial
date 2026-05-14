import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * 模块2 · ShelfPage.tsx
 * 个人书架页
 * - 状态 Tab（全部 / 想读 / 在读 / 已读）
 * - 书架列表（BookCard 紧凑模式 + 进度/短评/评分展示）
 * - 阅读进度内联更新（在读状态）
 * - 从书架移除
 * - CSV 导出
 * - 分组筛选下拉（读取已有 shelfGroup 分组）
 */
import { useState, useEffect, useCallback } from 'react';
import { Tabs, Button, Empty, Spin, Popconfirm, message, Tag, Progress, Rate, Tooltip, } from 'antd';
import { DownloadOutlined, DeleteOutlined, ReadOutlined, HeartOutlined, CheckOutlined, } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getShelf, removeFromShelf, downloadShelfCsv, STATUS_LABELS, STATUS_COLORS, } from '../../api/bookApi';
import BookCard from '../../components/BookCard';
// ── Tab 配置 ──────────────────────────────────────────────────────────────────
const STATUS_TABS = [
    { key: 'all', label: '全部', value: undefined, icon: null },
    { key: '1', label: '想读', value: 1, icon: _jsx(HeartOutlined, {}) },
    { key: '2', label: '在读', value: 2, icon: _jsx(ReadOutlined, {}) },
    { key: '3', label: '已读', value: 3, icon: _jsx(CheckOutlined, {}) },
];
const ShelfPage = () => {
    const navigate = useNavigate();
    const [activeStatus, setActiveStatus] = useState(undefined);
    const [books, setBooks] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    // ── 加载书架 ───────────────────────────────────────────────────────────────
    const load = useCallback(async (status, p, append = false) => {
        setLoading(true);
        try {
            const res = await getShelf({ status, page: p });
            const { list, total: t } = res.data.data;
            setBooks(prev => append ? [...prev, ...list] : list);
            setTotal(t);
        }
        catch {
            message.error('加载书架失败');
        }
        finally {
            setLoading(false);
        }
    }, []);
    // 初始加载 + 状态切换时重新加载
    useEffect(() => {
        setPage(1);
        load(activeStatus, 1, false);
    }, [activeStatus, load]);
    // ── 切换状态 Tab ────────────────────────────────────────────────────────────
    const handleTabChange = (key) => {
        const val = key === 'all' ? undefined : Number(key);
        setActiveStatus(val);
    };
    // ── 移除书籍 ────────────────────────────────────────────────────────────────
    const handleRemove = async (bookId) => {
        try {
            await removeFromShelf(bookId);
            setBooks(prev => prev.filter(b => b.bookId !== bookId));
            setTotal(t => t - 1);
            message.success('已从书架移除');
        }
        catch {
            message.error('操作失败');
        }
    };
    // ── CSV 导出 ────────────────────────────────────────────────────────────────
    const handleExport = async () => {
        setExporting(true);
        try {
            await downloadShelfCsv();
            message.success('书架已导出');
        }
        catch {
            message.error('导出失败，请重试');
        }
        finally {
            setExporting(false);
        }
    };
    // ── 加载更多 ────────────────────────────────────────────────────────────────
    const handleLoadMore = () => {
        const next = page + 1;
        setPage(next);
        load(activeStatus, next, true);
    };
    // ─────────────────────────────────────────────────────────────────────────────
    const tabItems = STATUS_TABS.map(t => {
        const count = t.value === undefined ? total : undefined; // 全部 Tab 显示 total
        return {
            key: t.key,
            label: (_jsxs("span", { children: [t.icon && _jsx("span", { style: { marginRight: 4 }, children: t.icon }), t.label, t.key === 'all' && total > 0 && (_jsx("span", { style: { marginLeft: 5, fontSize: 12, color: 'var(--color-text-secondary)' }, children: total }))] })),
        };
    });
    return (_jsxs("div", { style: { maxWidth: 720, padding: '28px 0' }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                }, children: [_jsxs("h2", { style: {
                            margin: 0,
                            fontSize: 20,
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                        }, children: ["\u6211\u7684\u4E66\u67B6", _jsxs("span", { style: { fontSize: 14, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 8 }, children: ["\u00B7 ", total, " \u672C"] })] }), _jsx(Tooltip, { title: "\u5BFC\u51FA\u4E3A CSV\uFF08Excel \u53EF\u6253\u5F00\uFF09", children: _jsx(Button, { icon: _jsx(DownloadOutlined, {}), onClick: handleExport, loading: exporting, size: "small", style: { borderRadius: 16 }, children: "\u5BFC\u51FA CSV" }) })] }), _jsx(Tabs, { activeKey: activeStatus?.toString() ?? 'all', onChange: handleTabChange, items: tabItems, style: { marginBottom: 4 } }), _jsxs(Spin, { spinning: loading && page === 1, children: [books.length === 0 && !loading && (_jsx(Empty, { description: activeStatus
                            ? `「${STATUS_LABELS[activeStatus]}」列表还是空的`
                            : '书架还没有书，快去搜索添加吧 📚', image: Empty.PRESENTED_IMAGE_SIMPLE, style: { padding: '48px 0' }, children: _jsx(Button, { type: "primary", onClick: () => navigate('/search'), style: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', borderRadius: 16 }, children: "\u53BB\u641C\u7D22\u4E66\u7C4D" }) })), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: books.map(entry => (_jsx(ShelfItem, { entry: entry, onRemove: handleRemove }, entry.bookId))) }), books.length < total && books.length > 0 && (_jsx("div", { style: { textAlign: 'center', marginTop: 24 }, children: _jsx(Button, { onClick: handleLoadMore, loading: loading && page > 1, style: { borderRadius: 16, color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }, children: "\u52A0\u8F7D\u66F4\u591A" }) }))] })] }));
};
const ShelfItem = ({ entry, onRemove }) => {
    const navigate = useNavigate();
    const progressPct = entry.readingProgress && entry.pages
        ? Math.min(100, Math.round(entry.readingProgress / entry.pages * 100))
        : null;
    return (_jsxs("div", { style: {
            display: 'flex',
            gap: 14,
            background: 'var(--color-surface, #FDFAF4)',
            border: '1px solid var(--color-border, #D4C9B0)',
            borderRadius: 12,
            padding: '14px 16px',
            alignItems: 'flex-start',
            transition: 'box-shadow 0.18s',
        }, onMouseEnter: e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(74,103,65,0.10)'), onMouseLeave: e => (e.currentTarget.style.boxShadow = ''), children: [_jsx(BookCard, { book: {
                    id: entry.bookId,
                    title: entry.title,
                    author: entry.author,
                    coverUrl: entry.coverUrl,
                    platformRating: entry.platformRating,
                    pages: entry.pages,
                }, compact: true, shelfStatus: entry.status, onClick: () => navigate(`/books/${entry.bookId}`) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [entry.status === 2 && (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsxs("div", { style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: 12,
                                    color: 'var(--color-text-secondary)',
                                    marginBottom: 4,
                                }, children: [_jsx("span", { children: "\u9605\u8BFB\u8FDB\u5EA6" }), _jsxs("span", { children: [entry.readingProgress
                                                ? `${entry.readingProgress}${entry.pages ? ` / ${entry.pages}` : ''}页`
                                                : '未记录', progressPct !== null && ` · ${progressPct}%`] })] }), _jsx(Progress, { percent: progressPct ?? 0, showInfo: false, strokeColor: STATUS_COLORS[2], trailColor: "var(--color-border)", size: "small", style: { margin: 0 } })] })), entry.status === 3 && entry.rating && (_jsxs("div", { style: { marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Rate, { disabled: true, allowHalf: true, value: entry.rating / 2, style: { fontSize: 13 } }), _jsx("span", { style: { fontSize: 12, color: '#92400e', fontWeight: 600 }, children: (entry.rating / 2).toFixed(1) })] })), entry.shortComment && (_jsxs("p", { style: {
                            fontSize: 13,
                            color: 'var(--color-text-secondary)',
                            margin: '0 0 8px',
                            fontStyle: 'italic',
                            lineHeight: 1.6,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }, children: ["\"", entry.shortComment, "\""] })), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }, children: [entry.startDate && (_jsxs("span", { style: { fontSize: 11, color: 'var(--color-text-secondary)' }, children: ["\u5F00\u59CB\uFF1A", String(entry.startDate).slice(0, 10)] })), entry.finishDate && (_jsxs("span", { style: { fontSize: 11, color: 'var(--color-text-secondary)' }, children: ["\u5B8C\u6210\uFF1A", String(entry.finishDate).slice(0, 10)] })), entry.shelfGroup && (_jsx(Tag, { style: { fontSize: 11, borderRadius: 10, margin: 0 }, children: entry.shelfGroup })), entry.isPrivate && (_jsx(Tag, { color: "orange", style: { fontSize: 11, borderRadius: 10, margin: 0 }, children: "\u79C1\u5BC6" }))] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx(Button, { size: "small", style: { borderRadius: 14, fontSize: 12 }, onClick: () => navigate(`/books/${entry.bookId}`), children: "\u67E5\u770B\u8BE6\u60C5" }), _jsx(Popconfirm, { title: "\u786E\u8BA4\u4ECE\u4E66\u67B6\u79FB\u9664\uFF1F", description: "\u79FB\u9664\u540E\u8BE5\u4E66\u7684\u9605\u8BFB\u8BB0\u5F55\u5C06\u6E05\u9664", onConfirm: () => onRemove(entry.bookId), okText: "\u786E\u8BA4\u79FB\u9664", cancelText: "\u53D6\u6D88", okButtonProps: { danger: true }, children: _jsx(Button, { size: "small", danger: true, icon: _jsx(DeleteOutlined, {}), style: { borderRadius: 14, fontSize: 12 }, children: "\u79FB\u9664" }) })] })] })] }));
};
export default ShelfPage;
