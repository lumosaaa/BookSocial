import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * CategoryListPage.tsx
 * 分类总览：所有大类网格
 */
import { useEffect, useState } from 'react';
import { Empty, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../../api/bookApi';
const CategoryListPage = () => {
    const navigate = useNavigate();
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        getCategories()
            .then(res => setList(res.data?.data ?? []))
            .catch(() => setList([]))
            .finally(() => setLoading(false));
    }, []);
    return (_jsxs("div", { children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h1", { style: { fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }, children: "\u5168\u90E8\u5206\u7C7B" }), _jsx("p", { style: { marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 13 }, children: "\u70B9\u51FB\u5206\u7C7B\u5361\u7247\u6D4F\u89C8\u8BE5\u5206\u7C7B\u4E0B\u7684\u5168\u90E8\u4E66\u7C4D" })] }), loading ? (_jsx("div", { style: { textAlign: 'center', padding: 48 }, children: _jsx(Spin, { size: "large" }) })) : list.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u5206\u7C7B" })) : (_jsx("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 16,
                }, children: list.map(cat => (_jsxs("div", { onClick: () => navigate(`/categories/${cat.id}`), style: {
                        cursor: 'pointer',
                        background: 'var(--color-surface-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 12,
                        padding: '20px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.2s',
                    }, onMouseEnter: e => {
                        e.currentTarget.style.borderColor = 'var(--color-primary-light)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(74,103,65,0.12)';
                    }, onMouseLeave: e => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.transform = '';
                        e.currentTarget.style.boxShadow = '';
                    }, children: [_jsx("span", { style: { fontSize: 32 }, children: cat.icon || '📚' }), _jsx("span", { style: { fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }, children: cat.name }), cat.bookCount !== undefined && (_jsxs("span", { style: { fontSize: 12, color: 'var(--color-text-secondary)' }, children: [cat.bookCount, " \u672C\u4E66\u7C4D"] }))] }, cat.id))) }))] }));
};
export default CategoryListPage;
