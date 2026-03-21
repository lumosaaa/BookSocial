/**
 * 模块2 · SearchPage.tsx
 * 全局书籍搜索页
 * - 搜索框（debounce 300ms + 联想词暂存）
 * - 分类筛选 Tag 栏
 * - 搜索结果网格（BookCard）+ 分页
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Input, Spin, Empty, Pagination, Tag, Tooltip } from 'antd';
import { SearchOutlined, LoadingOutlined, FireOutlined } from '@ant-design/icons';
import { searchBooks, getCategories, type Book, type Category } from '../../api/bookApi';
import BookCard from '../../components/BookCard';

const { Search } = Input;

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [query, setQuery]         = useState(searchParams.get('q') || '');
  const [inputVal, setInputVal]   = useState(searchParams.get('q') || '');
  const [category, setCategory]   = useState<number | undefined>();
  const [books, setBooks]         = useState<Book[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载书籍分类
  useEffect(() => {
    getCategories()
      .then(res => setCategories(res.data.data || []))
      .catch(() => {});
  }, []);

  // 执行搜索
  const doSearch = useCallback(async (q: string, p: number, cat?: number) => {
    if (!q.trim()) { setBooks([]); setTotal(0); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchBooks(q.trim(), p, cat);
      const payload = res.data.data;
      setBooks(payload.list || []);
      setTotal(payload.total || 0);
    } catch {
      setBooks([]);
    } finally {
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
  const handleSearch = (val: string) => {
    const q = val.trim();
    setQuery(q);
    setPage(1);
    if (q) setSearchParams({ q });
    doSearch(q, 1, category);
  };

  // 输入框 onChange（实时更新 inputVal，但不立即搜索）
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    // debounce 300ms 联想提示（此处仅更新显示，真正搜索走 onSearch）
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (!val.trim()) { setBooks([]); setTotal(0); setSearched(false); }
    }, 300);
  };

  // 切换分类
  const handleCategoryChange = (val: number | undefined) => {
    setCategory(val);
    setPage(1);
    if (query) doSearch(query, 1, val);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    doSearch(query, p, category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ padding: '28px 0', maxWidth: 720 }}>

      {/* ── 搜索框 ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <Search
          size="large"
          placeholder="搜书名、作者、ISBN…"
          value={inputVal}
          onChange={handleInputChange}
          onSearch={handleSearch}
          enterButton={
            loading
              ? <LoadingOutlined />
              : <SearchOutlined />
          }
          allowClear
          style={{ borderRadius: 12 }}
        />
      </div>

      {/* ── 分类筛选 ────────────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <div style={{
          marginBottom: 20,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginRight: 2 }}>分类：</span>
          <Tag
            onClick={() => handleCategoryChange(undefined)}
            style={{
              cursor: 'pointer',
              borderRadius: 16,
              padding: '3px 12px',
              fontSize: 12,
              background:   !category ? 'var(--color-primary, #4A6741)' : 'var(--color-surface)',
              color:        !category ? '#fff' : 'var(--color-text-primary)',
              borderColor:  !category ? 'var(--color-primary, #4A6741)' : 'var(--color-border)',
              transition: 'all 0.18s',
            }}
          >
            全部
          </Tag>
          {categories.map(cat => (
            <Tag
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              style={{
                cursor: 'pointer',
                borderRadius: 16,
                padding: '3px 12px',
                fontSize: 12,
                background:  category === cat.id ? 'var(--color-primary, #4A6741)' : 'var(--color-surface)',
                color:       category === cat.id ? '#fff' : 'var(--color-text-primary)',
                borderColor: category === cat.id ? 'var(--color-primary, #4A6741)' : 'var(--color-border)',
                transition: 'all 0.18s',
              }}
            >
              {cat.icon} {cat.name}
            </Tag>
          ))}
        </div>
      )}

      {/* ── 搜索结果 ────────────────────────────────────────────────────────── */}
      <Spin spinning={loading} indicator={<LoadingOutlined style={{ fontSize: 28 }} />}>

        {/* 空状态 */}
        {!loading && books.length === 0 && !searched && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
            <BookOutlinedBig />
            <p style={{ marginTop: 16, fontSize: 15 }}>输入书名、作者或 ISBN 开始搜索</p>
          </div>
        )}

        {!loading && books.length === 0 && searched && (
          <Empty
            description={
              <span>
                未找到 <strong>"{query}"</strong> 的相关书籍，换个关键词试试
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '40px 0' }}
          />
        )}

        {/* 结果数量提示 */}
        {!loading && books.length > 0 && (
          <div style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <FireOutlined style={{ color: 'var(--color-primary)' }} />
            找到 <strong>{total}</strong> 本相关书籍
          </div>
        )}

        {/* 书籍网格 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
          gap: 16,
        }}>
          {books.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>

        {/* 分页 */}
        {total > 20 && !loading && (
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              current={page}
              total={total}
              pageSize={20}
              onChange={handlePageChange}
              showTotal={t => `共 ${t} 本`}
              showSizeChanger={false}
            />
          </div>
        )}
      </Spin>
    </div>
  );
};

// 大图标占位
const BookOutlinedBig: React.FC = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <rect x="10" y="8" width="48" height="60" rx="4" fill="#E8D5B7" />
    <rect x="14" y="14" width="36" height="4" rx="2" fill="#C8A96E" />
    <rect x="14" y="22" width="28" height="3" rx="1.5" fill="#D4C9B0" />
    <rect x="14" y="29" width="32" height="3" rx="1.5" fill="#D4C9B0" />
    <rect x="14" y="36" width="24" height="3" rx="1.5" fill="#D4C9B0" />
    <rect x="8"  y="6"  width="4"  height="64" rx="2" fill="#4A6741" />
  </svg>
);

export default SearchPage;
