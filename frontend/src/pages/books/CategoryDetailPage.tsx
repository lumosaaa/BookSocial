/**
 * CategoryDetailPage.tsx
 * 分类详情：左主区为该分类下的书籍网格，右侧可收缩侧边栏列出全部分类
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Empty, Pagination, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import BookCard from '../../components/BookCard';
import { browseBooks, getCategories, type Book, type Category } from '../../api/bookApi';

const CategoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const categoryId = Number(id);

  const [categories, setCategories] = useState<Category[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCategories()
      .then(res => setCategories(res.data?.data ?? []))
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async (p: number) => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const res = await browseBooks(p, categoryId);
      setBooks(res.list || []);
      setTotal(res.total || 0);
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load]);

  const current = useMemo(
    () => categories.find(c => c.id === categoryId),
    [categories, categoryId],
  );

  const rightPanel = (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
        子分类
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {categories.map(cat => {
          const active = cat.id === categoryId;
          return (
            <div
              key={cat.id}
              onClick={() => navigate(`/categories/${cat.id}`)}
              style={{
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
              }}
              onMouseEnter={e => {
                if (!active) e.currentTarget.style.background = 'var(--color-accent)';
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span>{cat.icon} {cat.name}</span>
              {cat.bookCount !== undefined && (
                <span style={{ fontSize: 11, opacity: 0.7 }}>{cat.bookCount}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Layout rightPanel={rightPanel} rightPanelCollapsible rightPanelTitle="子分类">
      <div>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
            {current ? `${current.icon || '📚'} ${current.name}` : '分类'}
          </h1>
          {current?.bookCount !== undefined && (
            <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 13 }}>
              共 {current.bookCount} 本书籍
            </p>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
        ) : books.length === 0 ? (
          <Empty description="该分类下暂无书籍" />
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 16,
              }}
            >
              {books.map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
            {total > 20 && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Pagination
                  current={page}
                  total={total}
                  pageSize={20}
                  onChange={p => { setPage(p); load(p); }}
                  showSizeChanger={false}
                  showTotal={t => `共 ${t} 本`}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default CategoryDetailPage;
