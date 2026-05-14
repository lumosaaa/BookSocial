import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * 模块2 · SearchPage.tsx
 * 全局书籍搜索页
 * - 搜索框（debounce 300ms + 联想词暂存）
 * - 分类筛选 Tag 栏
 * - 搜索结果网格（BookCard）+ 分页
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Input, Spin, Empty, Pagination, Tag } from 'antd';
import { SearchOutlined, LoadingOutlined, FireOutlined } from '@ant-design/icons';
import { searchBooks, getCategories } from '../../api/bookApi';
import BookCard from '../../components/BookCard';
const { Search } = Input;
const SearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [inputVal, setInputVal] = useState(searchParams.get('q') || '');
    const [category, setCategory] = useState();
    const [books, setBooks] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [categories, setCategories] = useState([]);
    const debounceTimer = useRef(null);
    // 加载书籍分类
    useEffect(() => {
        getCategories()
            .then(res => setCategories(res.data.data || []))
            .catch(() => { });
    }, []);
    // 执行搜索
    const doSearch = useCallback(async (q, p, cat) => {
        if (!q.trim()) {
            setBooks([]);
            setTotal(0);
            return;
        }
        setLoading(true);
        setSearched(true);
        try {
            const res = await searchBooks(q.trim(), p, cat);
            const payload = res.data.data;
            setBooks(payload.list || []);
            setTotal(payload.total || 0);
        }
        catch {
            setBooks([]);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // URL 参数初始化搜索
    useEffect(() => {
        const q = searchParams.get('q');
        if (q) {
            setQuery(q);
            setInputVal(q);
            doSearch(q, 1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // 提交搜索（回车 / 点击搜索按钮）
    const handleSearch = (val) => {
        const q = val.trim();
        setQuery(q);
        setPage(1);
        if (q)
            setSearchParams({ q });
        doSearch(q, 1, category);
    };
    // 输入框 onChange（实时更新 inputVal，但不立即搜索）
    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputVal(val);
        // debounce 300ms 联想提示（此处仅更新显示，真正搜索走 onSearch）
        if (debounceTimer.current)
            clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            if (!val.trim()) {
                setBooks([]);
                setTotal(0);
                setSearched(false);
            }
        }, 300);
    };
    // 切换分类
    const handleCategoryChange = (val) => {
        setCategory(val);
        setPage(1);
        if (query)
            doSearch(query, 1, val);
    };
    const handlePageChange = (p) => {
        setPage(p);
        doSearch(query, p, category);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    return (_jsxs("div", { style: { padding: '28px 0', maxWidth: 720 }, children: [_jsx("div", { style: { marginBottom: 20 }, children: _jsx(Search, { size: "large", placeholder: "\u641C\u4E66\u540D\u3001\u4F5C\u8005\u3001ISBN\u2026", value: inputVal, onChange: handleInputChange, onSearch: handleSearch, enterButton: loading
                        ? _jsx(LoadingOutlined, {})
                        : _jsx(SearchOutlined, {}), allowClear: true, style: { borderRadius: 12 } }) }), categories.length > 0 && (_jsxs("div", { style: {
                    marginBottom: 20,
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }, children: [_jsx("span", { style: { fontSize: 12, color: 'var(--color-text-secondary)', marginRight: 2 }, children: "\u5206\u7C7B\uFF1A" }), _jsx(Tag, { onClick: () => handleCategoryChange(undefined), style: {
                            cursor: 'pointer',
                            borderRadius: 16,
                            padding: '3px 12px',
                            fontSize: 12,
                            background: !category ? 'var(--color-primary, #4A6741)' : 'var(--color-surface)',
                            color: !category ? '#fff' : 'var(--color-text-primary)',
                            borderColor: !category ? 'var(--color-primary, #4A6741)' : 'var(--color-border)',
                            transition: 'all 0.18s',
                        }, children: "\u5168\u90E8" }), categories.map(cat => (_jsxs(Tag, { onClick: () => handleCategoryChange(cat.id), style: {
                            cursor: 'pointer',
                            borderRadius: 16,
                            padding: '3px 12px',
                            fontSize: 12,
                            background: category === cat.id ? 'var(--color-primary, #4A6741)' : 'var(--color-surface)',
                            color: category === cat.id ? '#fff' : 'var(--color-text-primary)',
                            borderColor: category === cat.id ? 'var(--color-primary, #4A6741)' : 'var(--color-border)',
                            transition: 'all 0.18s',
                        }, children: [cat.icon, " ", cat.name] }, cat.id)))] })), _jsxs(Spin, { spinning: loading, indicator: _jsx(LoadingOutlined, { style: { fontSize: 28 } }), children: [!loading && books.length === 0 && !searched && (_jsxs("div", { style: { textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }, children: [_jsx(BookOutlinedBig, {}), _jsx("p", { style: { marginTop: 16, fontSize: 15 }, children: "\u8F93\u5165\u4E66\u540D\u3001\u4F5C\u8005\u6216 ISBN \u5F00\u59CB\u641C\u7D22" })] })), !loading && books.length === 0 && searched && (_jsx(Empty, { description: _jsxs("span", { children: ["\u672A\u627E\u5230 ", _jsxs("strong", { children: ["\"", query, "\""] }), " \u7684\u76F8\u5173\u4E66\u7C4D\uFF0C\u6362\u4E2A\u5173\u952E\u8BCD\u8BD5\u8BD5"] }), image: Empty.PRESENTED_IMAGE_SIMPLE, style: { padding: '40px 0' } })), !loading && books.length > 0 && (_jsxs("div", { style: {
                            fontSize: 13,
                            color: 'var(--color-text-secondary)',
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }, children: [_jsx(FireOutlined, { style: { color: 'var(--color-primary)' } }), "\u627E\u5230 ", _jsx("strong", { children: total }), " \u672C\u76F8\u5173\u4E66\u7C4D"] })), _jsx("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
                            gap: 16,
                        }, children: books.map(book => (_jsx(BookCard, { book: book }, book.id))) }), total > 20 && !loading && (_jsx("div", { style: { marginTop: 32, display: 'flex', justifyContent: 'center' }, children: _jsx(Pagination, { current: page, total: total, pageSize: 20, onChange: handlePageChange, showTotal: t => `共 ${t} 本`, showSizeChanger: false }) }))] })] }));
};
// 大图标占位
const BookOutlinedBig = () => (_jsxs("svg", { width: "80", height: "80", viewBox: "0 0 80 80", fill: "none", children: [_jsx("rect", { x: "10", y: "8", width: "48", height: "60", rx: "4", fill: "#E8D5B7" }), _jsx("rect", { x: "14", y: "14", width: "36", height: "4", rx: "2", fill: "#C8A96E" }), _jsx("rect", { x: "14", y: "22", width: "28", height: "3", rx: "1.5", fill: "#D4C9B0" }), _jsx("rect", { x: "14", y: "29", width: "32", height: "3", rx: "1.5", fill: "#D4C9B0" }), _jsx("rect", { x: "14", y: "36", width: "24", height: "3", rx: "1.5", fill: "#D4C9B0" }), _jsx("rect", { x: "8", y: "6", width: "4", height: "64", rx: "2", fill: "#4A6741" })] }));
export default SearchPage;
