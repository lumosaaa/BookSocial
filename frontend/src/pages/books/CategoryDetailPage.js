import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * CategoryDetailPage.tsx
 * 分类详情：左主区为该分类下的书籍网格，右侧可收缩侧边栏列出全部分类
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Empty, Pagination, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import BookCard from '../../components/BookCard';
import { browseBooks, getCategories } from '../../api/bookApi';
const CategoryDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const categoryId = Number(id);
    const [categories, setCategories] = useState([]);
    const [books, setBooks] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        getCategories()
            .then(res => setCategories(res.data?.data ?? []))
            .catch(() => setCategories([]));
    }, []);
    const load = useCallback(async (p) => {
        if (!categoryId)
            return;
        setLoading(true);
        try {
            const res = await browseBooks(p, categoryId);
            setBooks(res.list || []);
            setTotal(res.total || 0);
        }
        catch {
            setBooks([]);
        }
        finally {
            setLoading(false);
        }
    }, [categoryId]);
    useEffect(() => {
        setPage(1);
        load(1);
    }, [load]);
    const current = useMemo(() => categories.find(c => c.id === categoryId), [categories, categoryId]);
    const rightPanel = (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }, children: "\u5B50\u5206\u7C7B" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: categories.map(cat => {
                    const active = cat.id === categoryId;
                    return (_jsxs("div", { onClick: () => navigate(`/categories/${cat.id}`), style: {
                            cursor: 'pointer',
                            padding: '8px 12px',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: active ? 600 : 400,
                            color: active ? '#fff' : 'var(--color-text-primary)',
                            background: active ? 'var(--color-primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }, onMouseEnter: e => {
                            if (!active)
                                e.currentTarget.style.background = 'var(--color-accent)';
                        }, onMouseLeave: e => {
                            if (!active)
                                e.currentTarget.style.background = 'transparent';
                        }, children: [_jsxs("span", { children: [cat.icon, " ", cat.name] }), cat.bookCount !== undefined && (_jsx("span", { style: { fontSize: 11, opacity: 0.7 }, children: cat.bookCount }))] }, cat.id));
                }) })] }));
    return (_jsx(Layout, { rightPanel: rightPanel, rightPanelCollapsible: true, rightPanelTitle: "\u5B50\u5206\u7C7B", children: _jsxs("div", { children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h1", { style: { fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }, children: current ? `${current.icon || '📚'} ${current.name}` : '分类' }), current?.bookCount !== undefined && (_jsxs("p", { style: { marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 13 }, children: ["\u5171 ", current.bookCount, " \u672C\u4E66\u7C4D"] }))] }), loading ? (_jsx("div", { style: { textAlign: 'center', padding: 48 }, children: _jsx(Spin, { size: "large" }) })) : books.length === 0 ? (_jsx(Empty, { description: "\u8BE5\u5206\u7C7B\u4E0B\u6682\u65E0\u4E66\u7C4D" })) : (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                gap: 16,
                            }, children: books.map(book => (_jsx(BookCard, { book: book }, book.id))) }), total > 20 && (_jsx("div", { style: { textAlign: 'center', marginTop: 24 }, children: _jsx(Pagination, { current: page, total: total, pageSize: 20, onChange: p => { setPage(p); load(p); }, showSizeChanger: false, showTotal: t => `共 ${t} 本` }) }))] }))] }) }));
};
export default CategoryDetailPage;
