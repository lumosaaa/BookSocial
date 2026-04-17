import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { BookOutlined, StarFilled } from '@ant-design/icons';
import { STATUS_LABELS, STATUS_COLORS } from '../api/bookApi';
const BookCard = ({ book, compact = false, shelfStatus, onClick, }) => {
    const navigate = useNavigate();
    const handleClick = onClick ?? (() => navigate(`/books/${book.id}`));
    // 平台评分（5星制）
    const ratingRaw = book.platformRating ?? null;
    const ratingFive = ratingRaw !== null && ratingRaw !== undefined
        ? ratingRaw
        : null;
    if (compact) {
        // ── 紧凑模式：水平布局，用于书架列表 ────────────────────────────────────
        return (_jsxs("div", { onClick: handleClick, style: {
                display: 'flex',
                gap: 10,
                cursor: 'pointer',
                width: 200,
                flexShrink: 0,
            }, children: [_jsx("div", { style: {
                        width: 52,
                        height: 72,
                        borderRadius: 4,
                        overflow: 'hidden',
                        background: 'var(--color-accent, #E8D5B7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                    }, children: book.coverUrl ? (_jsx("img", { src: book.coverUrl, alt: book.title, style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: e => { e.target.style.display = 'none'; } })) : (_jsx(BookOutlined, { style: { color: 'var(--color-secondary, #C8A96E)', fontSize: 20 } })) }), _jsxs("div", { style: { flex: 1, minWidth: 0, paddingTop: 2 }, children: [_jsx("div", { style: {
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--color-text-primary, #2C3E2D)',
                                lineHeight: 1.35,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                marginBottom: 3,
                            }, children: book.title }), _jsx("div", { style: {
                                fontSize: 11,
                                color: 'var(--color-text-secondary, #6B7C6D)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }, children: book.author?.split('│')[0] }), shelfStatus && (_jsx("span", { style: {
                                display: 'inline-block',
                                marginTop: 4,
                                fontSize: 10,
                                padding: '1px 7px',
                                borderRadius: 10,
                                background: STATUS_COLORS[shelfStatus] + '20',
                                color: STATUS_COLORS[shelfStatus],
                                fontWeight: 600,
                                letterSpacing: 0.3,
                            }, children: STATUS_LABELS[shelfStatus] }))] })] }));
    }
    // ── 普通模式：竖向卡片，用于搜索结果网格 ──────────────────────────────────
    return (_jsxs("div", { onClick: handleClick, className: "book-card", style: {
            display: 'flex',
            flexDirection: 'column',
            cursor: 'pointer',
            borderRadius: 10,
            overflow: 'hidden',
            background: 'var(--color-surface, #FDFAF4)',
            border: '1px solid var(--color-border, #D4C9B0)',
            transition: 'box-shadow 0.22s ease, transform 0.22s ease',
            width: 140,
        }, onMouseEnter: e => {
            const el = e.currentTarget;
            el.style.boxShadow = '0 6px 20px rgba(74,103,65,0.18)';
            el.style.transform = 'translateY(-3px)';
        }, onMouseLeave: e => {
            const el = e.currentTarget;
            el.style.boxShadow = '';
            el.style.transform = '';
        }, children: [_jsxs("div", { style: {
                    width: '100%',
                    height: 196,
                    background: 'var(--color-accent, #E8D5B7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                }, children: [book.coverUrl ? (_jsx("img", { src: book.coverUrl, alt: book.title, style: { width: '100%', height: '100%', objectFit: 'cover' }, onError: e => {
                            const img = e.target;
                            img.style.display = 'none';
                            const fallback = img.nextElementSibling;
                            if (fallback)
                                fallback.style.display = 'flex';
                        } })) : null, _jsxs("div", { style: {
                            display: book.coverUrl ? 'none' : 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                            color: 'var(--color-secondary, #C8A96E)',
                        }, children: [_jsx(BookOutlined, { style: { fontSize: 40 } }), _jsx("span", { style: { fontSize: 10, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0 8px', lineHeight: 1.3 }, children: book.title })] }), shelfStatus && (_jsx("div", { style: {
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            fontSize: 10,
                            padding: '2px 7px',
                            borderRadius: 10,
                            background: STATUS_COLORS[shelfStatus],
                            color: '#fff',
                            fontWeight: 600,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        }, children: STATUS_LABELS[shelfStatus] }))] }), _jsxs("div", { style: { padding: '10px 10px 12px' }, children: [_jsx("div", { style: {
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--color-text-primary, #2C3E2D)',
                            lineHeight: 1.4,
                            marginBottom: 4,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            minHeight: 36,
                        }, children: book.title }), _jsx("div", { style: {
                            fontSize: 12,
                            color: 'var(--color-text-secondary, #6B7C6D)',
                            marginBottom: 6,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }, children: book.author?.split('│')[0] }), ratingFive !== null && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 3 }, children: [_jsx(StarFilled, { style: { color: '#f59e0b', fontSize: 11 } }), _jsx("span", { style: { fontSize: 12, color: '#92400e', fontWeight: 600 }, children: ratingFive.toFixed(1) }), book.shelfCount !== undefined && book.shelfCount > 0 && (_jsxs("span", { style: { fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 2 }, children: ["\u00B7 ", book.shelfCount > 999 ? `${(book.shelfCount / 1000).toFixed(1)}k` : book.shelfCount, "\u4EBA\u8BFB"] }))] }))] })] }));
};
export default BookCard;
