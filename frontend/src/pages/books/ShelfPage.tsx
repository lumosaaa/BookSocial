/**
 * 模块2 · ShelfPage.tsx
 * 个人书架页
 * - 状态 Tab（全部 / 想读 / 在读 / 已读）
 * - 书架列表（BookCard 紧凑模式 + 进度/短评/评分展示）
 * - 阅读进度内联更新（在读状态）
 * - 从书架移除
 * - CSV 导出
 * - 分组筛选下拉（读取已有 shelfGroup 分组）
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs, Button, Select, Empty, Spin, Popconfirm,
  message, Tag, Progress, Rate, Tooltip,
} from 'antd';
import {
  DownloadOutlined, DeleteOutlined, ReadOutlined,
  HeartOutlined, CheckOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  getShelf, removeFromShelf, downloadShelfCsv,
  STATUS_LABELS, STATUS_COLORS,
  type ShelfEntry,
} from '../../api/bookApi';
import BookCard from '../../components/BookCard';

// ── Tab 配置 ──────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: 'all', label: '全部',  value: undefined,         icon: null },
  { key: '1',   label: '想读',  value: 1 as const,        icon: <HeartOutlined /> },
  { key: '2',   label: '在读',  value: 2 as const,        icon: <ReadOutlined /> },
  { key: '3',   label: '已读',  value: 3 as const,        icon: <CheckOutlined /> },
];

const ShelfPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeStatus, setActiveStatus] = useState<1 | 2 | 3 | undefined>(undefined);
  const [books, setBooks]   = useState<ShelfEntry[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── 加载书架 ───────────────────────────────────────────────────────────────
  const load = useCallback(async (status: 1 | 2 | 3 | undefined, p: number, append = false) => {
    setLoading(true);
    try {
      const res = await getShelf({ status, page: p });
      const { list, total: t } = res.data.data;
      setBooks(prev => append ? [...prev, ...list] : list);
      setTotal(t);
    } catch {
      message.error('加载书架失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载 + 状态切换时重新加载
  useEffect(() => {
    setPage(1);
    load(activeStatus, 1, false);
  }, [activeStatus, load]);

  // ── 切换状态 Tab ────────────────────────────────────────────────────────────
  const handleTabChange = (key: string) => {
    const val = key === 'all' ? undefined : (Number(key) as 1 | 2 | 3);
    setActiveStatus(val);
  };

  // ── 移除书籍 ────────────────────────────────────────────────────────────────
  const handleRemove = async (bookId: number) => {
    try {
      await removeFromShelf(bookId);
      setBooks(prev => prev.filter(b => b.bookId !== bookId));
      setTotal(t => t - 1);
      message.success('已从书架移除');
    } catch {
      message.error('操作失败');
    }
  };

  // ── CSV 导出 ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadShelfCsv();
      message.success('书架已导出');
    } catch {
      message.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  // ── 加载更多 ────────────────────────────────────────────────────────────────
  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    load(activeStatus, next, true);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const tabItems = STATUS_TABS.map(t => {
    const count = t.value === undefined ? total : undefined; // 全部 Tab 显示 total
    return {
      key:   t.key,
      label: (
        <span>
          {t.icon && <span style={{ marginRight: 4 }}>{t.icon}</span>}
          {t.label}
          {t.key === 'all' && total > 0 && (
            <span style={{ marginLeft: 5, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {total}
            </span>
          )}
        </span>
      ),
    };
  });

  return (
    <div style={{ maxWidth: 720, padding: '28px 0' }}>

      {/* ── 顶部标题 + 导出 ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}>
          我的书架
          <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
            · {total} 本
          </span>
        </h2>
        <Tooltip title="导出为 CSV（Excel 可打开）">
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
            size="small"
            style={{ borderRadius: 16 }}
          >
            导出 CSV
          </Button>
        </Tooltip>
      </div>

      {/* ── 状态 Tab ───────────────────────────────────────────────────────── */}
      <Tabs
        activeKey={activeStatus?.toString() ?? 'all'}
        onChange={handleTabChange}
        items={tabItems}
        style={{ marginBottom: 4 }}
      />

      {/* ── 书架列表 ───────────────────────────────────────────────────────── */}
      <Spin spinning={loading && page === 1}>
        {books.length === 0 && !loading && (
          <Empty
            description={
              activeStatus
                ? `「${STATUS_LABELS[activeStatus]}」列表还是空的`
                : '书架还没有书，快去搜索添加吧 📚'
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '48px 0' }}
          >
            <Button
              type="primary"
              onClick={() => navigate('/books')}
              style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)', borderRadius: 16 }}
            >
              去搜索书籍
            </Button>
          </Empty>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {books.map(entry => (
            <ShelfItem
              key={entry.bookId}
              entry={entry}
              onRemove={handleRemove}
            />
          ))}
        </div>

        {/* 加载更多 */}
        {books.length < total && books.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button
              onClick={handleLoadMore}
              loading={loading && page > 1}
              style={{ borderRadius: 16, color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
            >
              加载更多
            </Button>
          </div>
        )}
      </Spin>
    </div>
  );
};

// ═══ 单条书架项组件 ═══════════════════════════════════════════════════════════

interface ShelfItemProps {
  entry: ShelfEntry;
  onRemove: (bookId: number) => void;
}

const ShelfItem: React.FC<ShelfItemProps> = ({ entry, onRemove }) => {
  const navigate = useNavigate();
  const progressPct = entry.readingProgress && entry.pages
    ? Math.min(100, Math.round(entry.readingProgress / entry.pages * 100))
    : null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        background: 'var(--color-surface, #FDFAF4)',
        border: '1px solid var(--color-border, #D4C9B0)',
        borderRadius: 12,
        padding: '14px 16px',
        alignItems: 'flex-start',
        transition: 'box-shadow 0.18s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(74,103,65,0.10)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
    >
      {/* 书卡（紧凑模式） */}
      <BookCard
        book={{
          id: entry.bookId,
          title: entry.title,
          author: entry.author,
          coverUrl: entry.coverUrl,
          platformRating: entry.platformRating,
          pages: entry.pages,
        }}
        compact
        shelfStatus={entry.status}
        onClick={() => navigate(`/books/${entry.bookId}`)}
      />

      {/* 右侧信息区 */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* 在读进度条 */}
        {entry.status === 2 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              marginBottom: 4,
            }}>
              <span>阅读进度</span>
              <span>
                {entry.readingProgress
                  ? `${entry.readingProgress}${entry.pages ? ` / ${entry.pages}` : ''}页`
                  : '未记录'}
                {progressPct !== null && ` · ${progressPct}%`}
              </span>
            </div>
            <Progress
              percent={progressPct ?? 0}
              showInfo={false}
              strokeColor={STATUS_COLORS[2]}
              trailColor="var(--color-border)"
              size="small"
              style={{ margin: 0 }}
            />
          </div>
        )}

        {/* 已读评分 */}
        {entry.status === 3 && entry.rating && (
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Rate
              disabled
              allowHalf
              value={entry.rating / 2}
              style={{ fontSize: 13 }}
            />
            <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
              {(entry.rating / 2).toFixed(1)}
            </span>
          </div>
        )}

        {/* 短评 */}
        {entry.shortComment && (
          <p style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            margin: '0 0 8px',
            fontStyle: 'italic',
            lineHeight: 1.6,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            "{entry.shortComment}"
          </p>
        )}

        {/* 日期 + 分组信息 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          {entry.startDate && (
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              开始：{String(entry.startDate).slice(0, 10)}
            </span>
          )}
          {entry.finishDate && (
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              完成：{String(entry.finishDate).slice(0, 10)}
            </span>
          )}
          {entry.shelfGroup && (
            <Tag style={{ fontSize: 11, borderRadius: 10, margin: 0 }}>{entry.shelfGroup}</Tag>
          )}
          {entry.isPrivate && (
            <Tag color="orange" style={{ fontSize: 11, borderRadius: 10, margin: 0 }}>私密</Tag>
          )}
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="small"
            style={{ borderRadius: 14, fontSize: 12 }}
            onClick={() => navigate(`/books/${entry.bookId}`)}
          >
            查看详情
          </Button>
          <Popconfirm
            title="确认从书架移除？"
            description="移除后该书的阅读记录将清除"
            onConfirm={() => onRemove(entry.bookId)}
            okText="确认移除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 14, fontSize: 12 }}>
              移除
            </Button>
          </Popconfirm>
        </div>
      </div>
    </div>
  );
};

export default ShelfPage;
