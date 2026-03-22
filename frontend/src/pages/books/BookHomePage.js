import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * BookHomePage.tsx
 * 首页 — 书籍浏览 + 分类筛选
 */
import { useState, useEffect, useCallback } from 'react';
import { Spin, Empty, Pagination, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { browseBooks, getCategories } from '../../api/bookApi';
import BookCard from '../../components/BookCard';
const BookHomePage = () => {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [books, setBooks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const categoryId = params.get('category')
        ? Number(params.get('category'))
        : null;
    const loadBooks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await browseBooks(page, categoryId);
            setBooks(res.list || []);
            setTotal(res.total || 0);
        }
        catch {
            setBooks([]);
        }
        finally {
            setLoading(false);
        }
    }, [page, categoryId]);
    useEffect(() => {
        loadBooks();
    }, [loadBooks]);
    useEffect(() => {
        getCategories().then(res => setCategories(res.data?.data ?? [])).catch(() => { });
    }, []);
    const updateParams = (key, val) => {
        const next = new URLSearchParams(params);
        if (val)
            next.set(key, val);
        else
            next.delete(key);
        if (key !== 'page')
            next.delete('page');
        setParams(next);
    };
    return (_jsxs("div", { style: { maxWidth: 960, margin: '0 auto', padding: '24px 16px' }, children: [_jsxs("div", { onClick: () => navigate('/search'), style: {
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 16px', marginBottom: 20,
                    background: '#f5f0e8', borderRadius: 8, cursor: 'pointer',
                    color: '#999', fontSize: 15,
                }, children: [_jsx(SearchOutlined, {}), " \u641C\u7D22\u4E66\u540D\u3001\u4F5C\u8005..."] }), _jsxs("div", { style: { marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }, children: [_jsx(Tag, { color: !categoryId ? '#4A6741' : undefined, onClick: () => updateParams('category', null), style: { cursor: 'pointer', borderRadius: 12, padding: '2px 12px' }, children: "\u5168\u90E8" }), categories.map(c => (_jsxs(Tag, { color: categoryId === c.id ? '#4A6741' : undefined, onClick: () => updateParams('category', String(c.id)), style: { cursor: 'pointer', borderRadius: 12, padding: '2px 12px' }, children: [c.icon, " ", c.name] }, c.id)))] }), _jsxs(Spin, { spinning: loading, children: [!loading && books.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u4E66\u7C4D", style: { marginTop: 80 } })) : (_jsx("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: 16,
                        }, children: books.map(book => (_jsx(BookCard, { book: book }, book.id))) })), total > 20 && (_jsx("div", { style: { textAlign: 'center', marginTop: 24 }, children: _jsx(Pagination, { current: page, total: total, pageSize: 20, onChange: p => updateParams('page', String(p)), showTotal: t => `共 ${t} 本`, showSizeChanger: false }) }))] })] }));
};
export default BookHomePage;
