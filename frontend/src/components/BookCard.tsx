/**
 * 模块2 · BookCard.tsx
 * 通用书籍卡片组件
 * Props:
 *   book        — Book 对象（最少需要 id, title, author）
 *   compact     — 紧凑模式（水平布局，用于书架列表）
 *   shelfStatus — 可选，展示书架状态徽标
 *   onClick     — 可选，自定义点击行为（默认跳转详情页）
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOutlined, StarFilled } from '@ant-design/icons';
import { STATUS_LABELS, STATUS_COLORS } from '../api/bookApi';

interface BookLike {
  id: number;
  title: string;
  author: string;
  coverUrl?: string | null;
  platformRating?: number | null;
  shelfCount?: number;
  categoryName?: string | null;
  pages?: number | null;
}

interface BookCardProps {
  book: BookLike;
  compact?: boolean;
  shelfStatus?: 1 | 2 | 3 | null;
  onClick?: () => void;
}

const BookCard: React.FC<BookCardProps> = ({
  book,
  compact = false,
  shelfStatus,
  onClick,
}) => {
  const navigate = useNavigate();
  const handleClick = onClick ?? (() => navigate(`/books/${book.id}`));

  // 平台评分（5星制）
  const ratingRaw = book.platformRating ?? null;
  const ratingFive = ratingRaw !== null && ratingRaw !== undefined
    ? ratingRaw
    : null;

  if (compact) {
    // ── 紧凑模式：水平布局，用于书架列表 ────────────────────────────────────
    return (
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          gap: 10,
          cursor: 'pointer',
          width: 200,
          flexShrink: 0,
        }}
      >
        {/* 封面缩略 */}
        <div style={{
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
        }}>
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <BookOutlined style={{ color: 'var(--color-secondary, #C8A96E)', fontSize: 20 }} />
          )}
        </div>

        {/* 文字信息 */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-text-primary, #2C3E2D)',
            lineHeight: 1.35,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            marginBottom: 3,
          }}>
            {book.title}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--color-text-secondary, #6B7C6D)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {book.author?.split('│')[0]}
          </div>
          {shelfStatus && (
            <span style={{
              display: 'inline-block',
              marginTop: 4,
              fontSize: 10,
              padding: '1px 7px',
              borderRadius: 10,
              background: STATUS_COLORS[shelfStatus] + '20',
              color: STATUS_COLORS[shelfStatus],
              fontWeight: 600,
              letterSpacing: 0.3,
            }}>
              {STATUS_LABELS[shelfStatus]}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── 普通模式：竖向卡片，用于搜索结果网格 ──────────────────────────────────
  return (
    <div
      onClick={handleClick}
      className="book-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--color-surface, #FDFAF4)',
        border: '1px solid var(--color-border, #D4C9B0)',
        transition: 'box-shadow 0.22s ease, transform 0.22s ease',
        width: 140,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = '0 6px 20px rgba(74,103,65,0.18)';
        el.style.transform  = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = '';
        el.style.transform  = '';
      }}
    >
      {/* 封面 */}
      <div style={{
        width: '100%',
        height: 196,
        background: 'var(--color-accent, #E8D5B7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              const fallback = img.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        {/* 封面降级 SVG */}
        <div style={{
          display: book.coverUrl ? 'none' : 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          color: 'var(--color-secondary, #C8A96E)',
        }}>
          <BookOutlined style={{ fontSize: 40 }} />
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '0 8px', lineHeight: 1.3 }}>
            {book.title}
          </span>
        </div>

        {/* 书架状态角标 */}
        {shelfStatus && (
          <div style={{
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
          }}>
            {STATUS_LABELS[shelfStatus]}
          </div>
        )}
      </div>

      {/* 文字区 */}
      <div style={{ padding: '10px 10px 12px' }}>
        {/* 书名 */}
        <div style={{
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
        }}>
          {book.title}
        </div>

        {/* 作者 */}
        <div style={{
          fontSize: 12,
          color: 'var(--color-text-secondary, #6B7C6D)',
          marginBottom: 6,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {book.author?.split('│')[0]}
        </div>

        {/* 评分 */}
        {ratingFive !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <StarFilled style={{ color: '#f59e0b', fontSize: 11 }} />
            <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
              {ratingFive.toFixed(1)}
            </span>
            {book.shelfCount !== undefined && book.shelfCount > 0 && (
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 2 }}>
                · {book.shelfCount > 999 ? `${(book.shelfCount / 1000).toFixed(1)}k` : book.shelfCount}人读
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCard;
