/**
 * CategoryListPage.tsx
 * 分类总览：所有大类网格
 */
import React, { useEffect, useState } from 'react';
import { Empty, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getCategories, type Category } from '../../api/bookApi';

const CategoryListPage: React.FC = () => {
  const navigate = useNavigate();
  const [list, setList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(res => setList(res.data?.data ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
          全部分类
        </h1>
        <p style={{ marginTop: 6, color: 'var(--color-text-secondary)', fontSize: 13 }}>
          点击分类卡片浏览该分类下的全部书籍
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : list.length === 0 ? (
        <Empty description="暂无分类" />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 16,
          }}
        >
          {list.map(cat => (
            <div
              key={cat.id}
              onClick={() => navigate(`/categories/${cat.id}`)}
              style={{
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
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-primary-light)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(74,103,65,0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <span style={{ fontSize: 32 }}>{cat.icon || '📚'}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {cat.name}
              </span>
              {cat.bookCount !== undefined && (
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {cat.bookCount} 本书籍
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryListPage;
