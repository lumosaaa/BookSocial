/**
 * 模块2 · BookDetailPage.tsx
 * 书籍详情页
 * - 封面 / 基本信息 / 评分
 * - 书架三态切换（想读 / 在读 / 已读）
 * - 阅读进度更新（在读状态）
 * - 半星评分（已读状态）
 * - 标签展示 + 用户添加标签
 * - Tab：书评 / 笔记 / 讨论（占位，M3/M5 联调后填充）
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Spin, Button, Rate, Tag, Tabs, Modal, InputNumber,
  Input, message, Tooltip, Divider, Progress, Empty,
} from 'antd';
import {
  BookOutlined, HeartOutlined, ReadOutlined, CheckOutlined,
  StarFilled, StarOutlined, PlusOutlined,
} from '@ant-design/icons';
import {
  getBook, addToShelf, updateShelfEntry, removeFromShelf, addBookTag,
  STATUS_LABELS, STATUS_COLORS,
  type Book,
} from '../../api/bookApi';
import { getBookNotes } from '../../api/postApi';
import { listDiscussions } from '../../api/groupApi';
import NoteCard from '../../components/NoteCard';
import { useAuthStore } from '../../store/authStore';

// ── 书架操作按钮配置 ────────────────────────────────────────────────────────────
const SHELF_ACTIONS = [
  { value: 1 as const, label: '想读', icon: <HeartOutlined /> },
  { value: 2 as const, label: '在读', icon: <ReadOutlined /> },
  { value: 3 as const, label: '已读', icon: <CheckOutlined /> },
];

const BookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  const [book, setBook]               = useState<Book | null>(null);
  const [loading, setLoading]         = useState(true);
  const [shelfLoading, setShelfLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState('reviews');
  const [progressModal, setProgressModal] = useState(false);
  const [progressInput, setProgressInput] = useState(0);
  const [tagInput, setTagInput]       = useState('');
  const [tagAdding, setTagAdding]     = useState(false);
  const [bookNotes, setBookNotes]     = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [tabLoading, setTabLoading]   = useState(false);

  // ── 加载书籍详情 ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || isNaN(Number(id))) { navigate('/'); return; }
    setLoading(true);
    getBook(Number(id))
      .then(res => setBook(res.data.data))
      .catch(() => { message.error('获取书籍信息失败'); navigate('/'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!book) return;
    if (activeTab === 'notes') {
      setTabLoading(true);
      getBookNotes(book.id, 1, 10, 'hot')
        .then(data => setBookNotes(data.list))
        .catch(() => message.error('加载笔记失败'))
        .finally(() => setTabLoading(false));
    }
    if (activeTab === 'discuss') {
      setTabLoading(true);
      listDiscussions(book.id, { page: 1, sort: 'hot' })
        .then(data => setDiscussions(data.list))
        .catch(() => message.error('加载讨论失败'))
        .finally(() => setTabLoading(false));
    }
  }, [activeTab, book]);

  // ── 书架操作 ────────────────────────────────────────────────────────────────
  const handleShelfToggle = async (status: 1 | 2 | 3) => {
    if (!isLoggedIn) { navigate('/login'); return; }
    if (!book) return;
    setShelfLoading(true);
    try {
      if (book.myShelf?.status === status) {
        // 点击已激活状态 → 取消
        await removeFromShelf(book.id);
        setBook({ ...book, myShelf: null });
        message.success('已从书架移除');
      } else if (book.myShelf) {
        // 切换状态
        await updateShelfEntry(book.id, { status });
        setBook({ ...book, myShelf: { ...book.myShelf, status } });
        message.success(`已更新为「${STATUS_LABELS[status]}」`);
      } else {
        // 首次添加
        await addToShelf(book.id, status);
        setBook({ ...book, myShelf: { bookId: book.id, status } as any });
        message.success(`已加入「${STATUS_LABELS[status]}」`);
      }
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setShelfLoading(false);
    }
  };

  // ── 评分（已读后允许评分，半星 = 0.5） ─────────────────────────────────────
  const handleRating = async (val: number) => {
    if (!book?.myShelf) return;
    const rating = Math.round(val * 2); // 将 0.5–5 转为 1–10
    try {
      await updateShelfEntry(book.id, { rating });
      setBook({ ...book, myShelf: { ...book.myShelf, rating } });
    } catch {
      message.error('评分失败');
    }
  };

  // ── 更新阅读进度 ────────────────────────────────────────────────────────────
  const handleProgressSave = async () => {
    if (!book?.myShelf) return;
    try {
      await updateShelfEntry(book.id, { readingProgress: progressInput });
      setBook({ ...book, myShelf: { ...book.myShelf, readingProgress: progressInput } });
      setProgressModal(false);
      message.success('进度已更新');
    } catch {
      message.error('更新失败');
    }
  };

  // ── 添加标签 ────────────────────────────────────────────────────────────────
  const handleAddTag = async () => {
    if (!tagInput.trim() || !book) return;
    setTagAdding(true);
    try {
      await addBookTag(book.id, tagInput.trim());
      // 刷新书籍信息以更新标签列表
      const res = await getBook(book.id);
      setBook(res.data.data);
      setTagInput('');
      message.success('标签已添加');
    } catch {
      message.error('添加标签失败');
    } finally {
      setTagAdding(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!book) return null;

  const currentStatus  = book.myShelf?.status;
  const progressPct    = book.myShelf?.readingProgress && book.pages
    ? Math.min(100, Math.round((book.myShelf.readingProgress / book.pages) * 100))
    : null;

  return (
    <div style={{ maxWidth: 720, padding: '28px 0' }}>

      {/* ═══ 顶部：封面 + 基本信息 ════════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: 28, marginBottom: 32, alignItems: 'flex-start' }}>

        {/* 封面 */}
        <div style={{
          width: 148,
          height: 208,
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--color-accent, #E8D5B7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
        }}>
          {book.coverUrl
            ? <img src={book.coverUrl} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <BookOutlined style={{ fontSize: 52, color: 'var(--color-secondary, #C8A96E)' }} />
          }
        </div>

        {/* 文字区 */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* 书名 */}
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--color-text-primary, #2C3E2D)',
            marginBottom: 8,
            lineHeight: 1.35,
          }}>
            {book.title}
          </h1>

          {/* 作者 */}
          <div style={{ color: 'var(--color-text-secondary)', marginBottom: 4, fontSize: 14 }}>
            作者：{book.author?.split('│').join(' / ')}
          </div>

          {/* 出版信息 */}
          {(book.publisher || book.publishDate) && (
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 4 }}>
              {[book.publisher, book.publishDate?.slice(0, 7)].filter(Boolean).join(' · ')}
            </div>
          )}

          {/* 页数 / 语言 */}
          {(book.pages || book.language) && (
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 14 }}>
              {[book.pages && `${book.pages} 页`, book.language?.toUpperCase()].filter(Boolean).join(' · ')}
            </div>
          )}

          {/* 评分区 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
            {book.platformRating !== null && book.platformRating !== undefined && (
              <Tooltip title={`平台综合评分 · ${book.ratingCount} 人评`}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Rate disabled allowHalf value={book.platformRating} style={{ fontSize: 15 }} />
                  <span style={{ color: '#92400e', fontWeight: 700, fontSize: 15 }}>
                    {book.platformRating.toFixed(1)}
                  </span>
                </span>
              </Tooltip>
            )}
            {book.shelfCount > 0 && (
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {book.shelfCount} 人读过
              </span>
            )}
          </div>

          {/* ── 书架操作按钮 ── */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {book.readerAvailable && (
              <Button
                type="primary"
                onClick={() => navigate(`/books/${book.id}/read`)}
                style={{
                  borderRadius: 20,
                  background: 'var(--color-primary, #4A6741)',
                  borderColor: 'var(--color-primary, #4A6741)',
                  fontWeight: 600,
                }}
              >
                在线阅读
              </Button>
            )}
            {SHELF_ACTIONS.map(action => {
              const isActive = currentStatus === action.value;
              return (
                <Button
                  key={action.value}
                  icon={action.icon}
                  loading={shelfLoading}
                  onClick={() => handleShelfToggle(action.value)}
                  style={{
                    borderRadius: 20,
                    borderColor: STATUS_COLORS[action.value],
                    color:       isActive ? '#fff' : STATUS_COLORS[action.value],
                    background:  isActive ? STATUS_COLORS[action.value] : 'transparent',
                    fontWeight:  600,
                    transition:  'all 0.18s',
                  }}
                >
                  {isActive ? `✓ ${action.label}` : action.label}
                </Button>
              );
            })}
          </div>

          {/* ── 在读进度条 ── */}
          {currentStatus === 2 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 5 }}>
                <span>阅读进度</span>
                <span>
                  {book.myShelf?.readingProgress ? `${book.myShelf.readingProgress}${book.pages ? ` / ${book.pages}` : ''}页` : '未记录'}
                  {progressPct !== null && `（${progressPct}%）`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Progress
                  percent={progressPct ?? 0}
                  showInfo={false}
                  strokeColor="var(--color-primary, #4A6741)"
                  trailColor="var(--color-border)"
                  style={{ flex: 1, margin: 0 }}
                />
                <Button
                  size="small"
                  style={{ borderRadius: 14, fontSize: 12 }}
                  onClick={() => {
                    setProgressInput(book.myShelf?.readingProgress || 0);
                    setProgressModal(true);
                  }}
                >
                  更新
                </Button>
              </div>
            </div>
          )}

          {/* ── 已读评分 ── */}
          {currentStatus === 3 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>我的评分：</span>
              <Rate
                allowHalf
                value={(book.myShelf?.rating || 0) / 2}
                onChange={handleRating}
                character={({ index, value }) =>
                  (index ?? 0) < Math.floor((value ?? 0)) ? (
                    <StarFilled style={{ color: '#f59e0b' }} />
                  ) : (
                    <StarOutlined style={{ color: '#f59e0b' }} />
                  )
                }
              />
              {book.myShelf?.rating && (
                <span style={{ color: '#92400e', fontWeight: 600 }}>
                  {(book.myShelf.rating / 2).toFixed(1)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ 标签区 ═══════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
        {book.tags.map(tag => (
          <Tag
            key={tag.id}
            style={{
              borderRadius: 14,
              padding: '2px 10px',
              background: tag.isOfficial ? 'var(--color-primary, #4A6741)22' : 'var(--color-accent, #E8D5B7)',
              borderColor: tag.isOfficial ? 'var(--color-primary, #4A6741)' : 'var(--color-border)',
              color: 'var(--color-text-primary)',
              fontSize: 12,
            }}
          >
            {tag.name}
            {tag.count > 1 && (
              <span style={{ color: 'var(--color-text-secondary)', marginLeft: 3, fontSize: 11 }}>
                ×{tag.count}
              </span>
            )}
          </Tag>
        ))}
        {/* 添加标签 */}
        {isLoggedIn && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Input
              size="small"
              placeholder="添加标签"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onPressEnter={handleAddTag}
              style={{ width: 90, borderRadius: 14, fontSize: 12 }}
              maxLength={20}
            />
            <Button
              size="small"
              icon={<PlusOutlined />}
              loading={tagAdding}
              onClick={handleAddTag}
              style={{ borderRadius: 14 }}
            />
          </div>
        )}
      </div>

      {/* ═══ 书籍简介 ═════════════════════════════════════════════════════════ */}
      {(book.readerLicenseNote || book.readerSource) && (
        <div style={{
          marginBottom: 20,
          padding: '12px 14px',
          borderRadius: 12,
          background: 'rgba(74,103,65,0.08)',
          color: 'var(--color-text-primary)',
          fontSize: 13,
          lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>在线阅读说明</div>
          <div>
            {[book.readerSource && `来源：${book.readerSource}`, book.readerLicenseNote].filter(Boolean).join(' · ')}
          </div>
        </div>
      )}

      {/* ═══ 书籍简介 ═════════════════════════════════════════════════════════ */}
      {book.description && (
        <>
          <Divider style={{ borderColor: 'var(--color-border)' }} />
          <div style={{
            fontSize: 14,
            color: 'var(--color-text-primary)',
            lineHeight: 1.85,
            marginBottom: 24,
            whiteSpace: 'pre-line',
          }}>
            {book.description.length > 500
              ? <ExpandableText text={book.description} maxLen={500} />
              : book.description
            }
          </div>
        </>
      )}

      {/* ═══ 书评 / 笔记 / 讨论 Tab ══════════════════════════════════════════ */}
      <Divider style={{ borderColor: 'var(--color-border)' }} />
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'reviews',
            label: `书评 (${book.reviewCount})`,
            children: (
              <div style={{ padding: '20px 0', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                <Empty description="暂未开放专门的书评页面，请到讨论或笔记 Tab 查看读者反馈" />
              </div>
            ),
          },
          {
            key: 'notes',
            label: '笔记',
            children: tabLoading ? (
              <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
            ) : bookNotes.length === 0 ? (
              <Empty description="暂无公开笔记" style={{ padding: 24 }} />
            ) : (
              <div style={{ padding: '12px 0' }}>
                {bookNotes.map(n => <NoteCard key={n.id} note={n} />)}
              </div>
            ),
          },
          {
            key: 'discuss',
            label: '讨论',
            children: tabLoading ? (
              <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
            ) : discussions.length === 0 ? (
              <Empty description="还没有讨论，第一个发起话题吧" style={{ padding: 24 }} />
            ) : (
              <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {discussions.map(d => (
                  <div
                    key={d.id}
                    style={{
                      padding: '12px 14px',
                      background: '#fff',
                      borderRadius: 12,
                      border: '1px solid #f0f0f0',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/groups`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: 14 }}>{d.title}</strong>
                      <Tag color="green" style={{ fontSize: 11 }}>{d.categoryName}</Tag>
                      {d.hasSpoiler && <Tag color="red" style={{ fontSize: 11 }}>剧透</Tag>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {d.content?.slice(0, 120)}{d.content?.length > 120 ? '…' : ''}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#999' }}>
                      @{d.username} · {d.commentCount} 评论 · {d.likeCount} 赞
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />

      {/* ═══ 更新进度 Modal ═══════════════════════════════════════════════════ */}
      <Modal
        title="更新阅读进度"
        open={progressModal}
        onOk={handleProgressSave}
        onCancel={() => setProgressModal(false)}
        okText="保存"
        okButtonProps={{ style: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>当前页数：</span>
          <InputNumber
            min={0}
            max={book.pages || 9999}
            value={progressInput}
            onChange={val => setProgressInput(val || 0)}
            style={{ width: 100 }}
          />
          {book.pages && (
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
              / {book.pages} 页
              {progressInput > 0 && book.pages > 0 && (
                <span style={{ marginLeft: 6, color: 'var(--color-primary)', fontWeight: 600 }}>
                  ({Math.min(100, Math.round(progressInput / book.pages * 100))}%)
                </span>
              )}
            </span>
          )}
        </div>
      </Modal>
    </div>
  );
};

// ── 展开/收起组件 ──────────────────────────────────────────────────────────────
const ExpandableText: React.FC<{ text: string; maxLen: number }> = ({ text, maxLen }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <span>
      {expanded ? text : text.slice(0, maxLen) + '…'}
      <span
        onClick={() => setExpanded(!expanded)}
        style={{ color: 'var(--color-primary)', cursor: 'pointer', marginLeft: 4, fontSize: 13 }}
      >
        {expanded ? ' 收起' : ' 展开全文'}
      </span>
    </span>
  );
};

export default BookDetailPage;
