/**
 * M4 · NotificationsPage.tsx
 * 路由：/notifications
 *
 * 通知中心：分 Tab 展示所有通知，支持：
 *  - 全部已读 / 逐条已读
 *  - Socket 实时推入新通知（来自 socketStore.newNotifications）
 *  - 点击跳转至对应内容（帖子/用户/私信）
 *  - 删除单条通知
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tabs, Button, Avatar, Badge, Spin, Empty,
  message as antMsg, Popconfirm,
} from 'antd';
import {
  BellOutlined, CheckOutlined,
  UserAddOutlined, HeartOutlined, CommentOutlined,
  MessageOutlined, NotificationOutlined, DeleteOutlined,
} from '@ant-design/icons';

import {
  getNotifications, markNotificationsRead, deleteNotification,
  getNotificationUnreadCount, NOTIF_TYPE_TEXT,
  Notification,
} from '../../api/messageApi';
import { useSocketStore }  from '../../store/socketStore';
import { formatDistanceToNow } from '../../utils/dateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// 通知 type → 跳转路径
// ─────────────────────────────────────────────────────────────────────────────
function getTargetPath(n: Notification): string | null {
  switch (n.type) {
    case 1: return n.actor ? `/users/${n.actor.id}` : null;   // 被关注 → 对方主页
    case 2:
    case 3:
    case 4:
      if (n.targetType === 'post'    && n.targetId) return `/posts/${n.targetId}`;
      if (n.targetType === 'note'    && n.targetId) return `/reading-notes/${n.targetId}`;
      if (n.targetType === 'comment' && n.targetId) return `/posts/${n.targetId}`;  // 跳到帖子，评论在其中
      return null;
    case 6: return '/messages';                                 // 新私信 → 消息列表
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 通知类型图标
// ─────────────────────────────────────────────────────────────────────────────
function TypeIcon({ type }: { type: number }) {
  const cfg: Record<number, { bg: string; color: string; icon: React.ReactNode }> = {
    1: { bg: '#e8f5e9', color: '#4A6741', icon: <UserAddOutlined /> },
    2: { bg: '#fce4ec', color: '#e91e63', icon: <HeartOutlined /> },
    3: { bg: '#e3f2fd', color: '#1976d2', icon: <CommentOutlined /> },
    4: { bg: '#fff8e1', color: '#f57f17', icon: <CommentOutlined /> },
    5: { bg: '#f3e5f5', color: '#7b1fa2', icon: <NotificationOutlined /> },
    6: { bg: '#e8eaf6', color: '#3949ab', icon: <MessageOutlined /> },
  };
  const { bg, color, icon } = cfg[type] ?? cfg[5];
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      background: bg, color, fontSize: 11,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'absolute', bottom: -2, right: -2,
      boxShadow: '0 0 0 2px #fff',
    }}>
      {icon}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const navigate = useNavigate();

  const [tab, setTab]                   = useState<'all' | 'unread'>('all');
  const [items, setItems]               = useState<Notification[]>([]);
  const [loading, setLoading]           = useState(false);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(false);
  const [unreadBadge, setUnreadBadge]   = useState(0);
  const [markingAll, setMarkingAll]     = useState(false);

  // Socket 实时通知
  const newNotifications      = useSocketStore((s) => s.newNotifications);
  const clearNewNotifications  = useSocketStore((s) => s.clearNewNotifications);

  // ── 加载通知 ─────────────────────────────────────────────────────────────
  const load = useCallback(async (pg: number, append = false) => {
    setLoading(true);
    try {
      const data = await getNotifications(pg, 20, tab === 'unread');
      setItems((prev) => append ? [...prev, ...data.list] : data.list);
      setHasMore(data.hasMore);
      setPage(pg);

      // 同步未读数 badge
      const { unread } = await getNotificationUnreadCount();
      setUnreadBadge(unread);
    } catch {
      antMsg.error('加载通知失败');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    setItems([]);
    load(1);
  }, [load]);

  // ── Socket 实时推入 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (newNotifications.length === 0) return;
    setItems((prev) => {
      const existIds = new Set(prev.map((n) => n.id));
      const toAdd    = newNotifications.filter((n) => !existIds.has(n.id));
      return toAdd.length > 0 ? [...toAdd, ...prev] : prev;
    });
    setUnreadBadge((c) => c + newNotifications.length);
    clearNewNotifications();
  }, [newNotifications, clearNewNotifications]);

  // ── 点击单条（跳转 + 标记已读） ──────────────────────────────────────────
  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      await markNotificationsRead([n.id]).catch(() => {});
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
      setUnreadBadge((c) => Math.max(0, c - 1));
    }
    const path = getTargetPath(n);
    if (path) navigate(path);
  };

  // ── 全部已读 ─────────────────────────────────────────────────────────────
  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadBadge(0);
      antMsg.success('已全部标记为已读');
    } catch {
      antMsg.error('操作失败');
    } finally {
      setMarkingAll(false);
    }
  };

  // ── 删除单条 ─────────────────────────────────────────────────────────────
  const handleDelete = async (e: React.MouseEvent, notifId: number) => {
    e.stopPropagation();
    try {
      await deleteNotification(notifId);
      setItems((prev) => prev.filter((n) => n.id !== notifId));
    } catch {
      antMsg.error('删除失败');
    }
  };

  // ── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 40px' }}>

      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#333' }}>通知</span>
          {unreadBadge > 0 && (
            <Badge count={unreadBadge} style={{ background: '#4A6741' }} />
          )}
        </div>
        {unreadBadge > 0 && (
          <Button
            type="text" size="small"
            icon={<CheckOutlined />}
            loading={markingAll}
            onClick={handleMarkAll}
            style={{ color: '#4A6741', fontSize: 12 }}
          >
            全部已读
          </Button>
        )}
      </div>

      {/* Tab */}
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as 'all' | 'unread')}
        size="small"
        style={{ marginBottom: 4 }}
        items={[
          { key: 'all',    label: <span><BellOutlined /> 全部</span> },
          { key: 'unread', label: <span><Badge dot offset={[4, 0]}><BellOutlined /></Badge>{' '}未读</span> },
        ]}
      />

      {/* 列表 */}
      {loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin /></div>
      ) : items.length === 0 ? (
        <Empty description="暂无通知" style={{ padding: '60px 0' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 14px',
                background: n.isRead ? '#fff' : '#f0f7ed',
                borderRadius: 10,
                cursor: getTargetPath(n) ? 'pointer' : 'default',
                border: '1px solid #f0f0f0',
                transition: 'background 0.15s',
                position: 'relative',
              }}
              className="notif-item"
            >
              {/* 头像 + 类型图标 */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {n.actor?.avatarUrl ? (
                  <Avatar size={44} src={n.actor.avatarUrl} />
                ) : (
                  <Avatar size={44} style={{ background: '#4A6741' }}>
                    {n.actor?.username?.[0]?.toUpperCase() ?? '系'}
                  </Avatar>
                )}
                <TypeIcon type={n.type} />
              </div>

              {/* 文字内容 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#333', lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600 }}>
                    {n.actor?.username ?? '系统'}
                  </span>{' '}
                  <span style={{ color: '#666' }}>{NOTIF_TYPE_TEXT[n.type]}</span>
                </div>
                {n.content && (
                  <div style={{
                    fontSize: 13, color: '#888', marginTop: 3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {n.content}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
                  {formatDistanceToNow(n.createdAt)}
                </div>
              </div>

              {/* 右侧：未读点 + 删除按钮 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {!n.isRead && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4A6741' }} />
                )}
                <Popconfirm
                  title="删除该通知？"
                  onConfirm={(e) => handleDelete(e as any, n.id)}
                  onPopupClick={(e) => e.stopPropagation()}
                  okText="删除" cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text" size="small"
                    icon={<DeleteOutlined />}
                    style={{ color: '#ddd', fontSize: 12 }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 加载更多 */}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button
            loading={loading}
            onClick={() => load(page + 1, true)}
            style={{ borderColor: '#4A6741', color: '#4A6741' }}
          >
            加载更多
          </Button>
        </div>
      )}

      <style>{`
        .notif-item:hover { background: #f5faf5 !important; }
      `}</style>
    </div>
  );
}
