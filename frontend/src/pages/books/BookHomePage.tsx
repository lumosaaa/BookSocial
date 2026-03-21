/**
 * BookHomePage.tsx
 * 首页 — 书籍浏览 + 分类筛选
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Empty, Pagination, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { browseBooks, getCategories, type Book, type Category } from '../../api/bookApi';
import BookCard from '../../components/BookCard';

const BookHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [page, categoryId]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    getCategories().then(res => setCategories(res.data?.data ?? [])).catch(() => {});
  }, []);

  const updateParams = (key: string, val: string | null) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      {/* 顶部搜索入口 */}
      <div
        onClick={() => navigate('/search')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', marginBottom: 20,
          background: '#f5f0e8', borderRadius: 8, cursor: 'pointer',
          color: '#999', fontSize: 15,
        }}
      >
        <SearchOutlined /> 搜索书名、作者...
      </div>

      {/* 分类筛选 */}
      <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Tag
          color={!categoryId ? '#4A6741' : undefined}
          onClick={() => updateParams('category', null)}
          style={{ cursor: 'pointer', borderRadius: 12, padding: '2px 12px' }}
        >
          全部
        </Tag>
        {categories.map(c => (
          <Tag
            key={c.id}
            color={categoryId === c.id ? '#4A6741' : undefined}
            onClick={() => updateParams('category', String(c.id))}
            style={{ cursor: 'pointer', borderRadius: 12, padding: '2px 12px' }}
          >
            {c.icon} {c.name}
          </Tag>
        ))}
      </div>

      {/* 书籍网格 */}
      <Spin spinning={loading}>
        {!loading && books.length === 0 ? (
          <Empty description="暂无书籍" style={{ marginTop: 80 }} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 16,
          }}>
            {books.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}

        {total > 20 && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Pagination
              current={page}
              total={total}
              pageSize={20}
              onChange={p => updateParams('page', String(p))}
              showTotal={t => `共 ${t} 本`}
              showSizeChanger={false}
            />
          </div>
        )}
      </Spin>
    </div>
  );
};

export default BookHomePage;