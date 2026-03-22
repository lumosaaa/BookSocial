import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { Tabs, Button, Avatar, Badge, Spin, Empty, message as antMsg, Popconfirm, } from 'antd';
import { BellOutlined, CheckOutlined, UserAddOutlined, HeartOutlined, CommentOutlined, MessageOutlined, NotificationOutlined, DeleteOutlined, } from '@ant-design/icons';
import { getNotifications, markNotificationsRead, deleteNotification, getNotificationUnreadCount, NOTIF_TYPE_TEXT, } from '../../api/messageApi';
import { useSocketStore } from '../../store/socketStore';
import { formatDistanceToNow } from '../../utils/dateUtils';
// ─────────────────────────────────────────────────────────────────────────────
// 通知 type → 跳转路径
// ─────────────────────────────────────────────────────────────────────────────
function getTargetPath(n) {
    switch (n.type) {
        case 1: return n.actor ? `/users/${n.actor.id}` : null; // 被关注 → 对方主页
        case 2:
        case 3:
        case 4:
            if (n.targetType === 'post' && n.targetId)
                return `/posts/${n.targetId}`;
            if (n.targetType === 'note' && n.targetId)
                return `/reading-notes/${n.targetId}`;
            if (n.targetType === 'comment' && n.targetId)
                return `/posts/${n.targetId}`; // 跳到帖子，评论在其中
            return null;
        case 6: return '/messages'; // 新私信 → 消息列表
        default: return null;
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// 通知类型图标
// ─────────────────────────────────────────────────────────────────────────────
function TypeIcon({ type }) {
    const cfg = {
        1: { bg: '#e8f5e9', color: '#4A6741', icon: _jsx(UserAddOutlined, {}) },
        2: { bg: '#fce4ec', color: '#e91e63', icon: _jsx(HeartOutlined, {}) },
        3: { bg: '#e3f2fd', color: '#1976d2', icon: _jsx(CommentOutlined, {}) },
        4: { bg: '#fff8e1', color: '#f57f17', icon: _jsx(CommentOutlined, {}) },
        5: { bg: '#f3e5f5', color: '#7b1fa2', icon: _jsx(NotificationOutlined, {}) },
        6: { bg: '#e8eaf6', color: '#3949ab', icon: _jsx(MessageOutlined, {}) },
    };
    const { bg, color, icon } = cfg[type] ?? cfg[5];
    return (_jsx("div", { style: {
            width: 22, height: 22, borderRadius: '50%',
            background: bg, color, fontSize: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'absolute', bottom: -2, right: -2,
            boxShadow: '0 0 0 2px #fff',
        }, children: icon }));
}
// ─────────────────────────────────────────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('all');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [unreadBadge, setUnreadBadge] = useState(0);
    const [markingAll, setMarkingAll] = useState(false);
    // Socket 实时通知
    const newNotifications = useSocketStore((s) => s.newNotifications);
    const clearNewNotifications = useSocketStore((s) => s.clearNewNotifications);
    // ── 加载通知 ─────────────────────────────────────────────────────────────
    const load = useCallback(async (pg, append = false) => {
        setLoading(true);
        try {
            const data = await getNotifications(pg, 20, tab === 'unread');
            setItems((prev) => append ? [...prev, ...data.list] : data.list);
            setHasMore(data.hasMore);
            setPage(pg);
            // 同步未读数 badge
            const { unread } = await getNotificationUnreadCount();
            setUnreadBadge(unread);
        }
        catch {
            antMsg.error('加载通知失败');
        }
        finally {
            setLoading(false);
        }
    }, [tab]);
    useEffect(() => {
        setItems([]);
        load(1);
    }, [load]);
    // ── Socket 实时推入 ──────────────────────────────────────────────────────
    useEffect(() => {
        if (newNotifications.length === 0)
            return;
        setItems((prev) => {
            const existIds = new Set(prev.map((n) => n.id));
            const toAdd = newNotifications.filter((n) => !existIds.has(n.id));
            return toAdd.length > 0 ? [...toAdd, ...prev] : prev;
        });
        setUnreadBadge((c) => c + newNotifications.length);
        clearNewNotifications();
    }, [newNotifications, clearNewNotifications]);
    // ── 点击单条（跳转 + 标记已读） ──────────────────────────────────────────
    const handleClick = async (n) => {
        if (!n.isRead) {
            await markNotificationsRead([n.id]).catch(() => { });
            setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
            setUnreadBadge((c) => Math.max(0, c - 1));
        }
        const path = getTargetPath(n);
        if (path)
            navigate(path);
    };
    // ── 全部已读 ─────────────────────────────────────────────────────────────
    const handleMarkAll = async () => {
        setMarkingAll(true);
        try {
            await markNotificationsRead();
            setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadBadge(0);
            antMsg.success('已全部标记为已读');
        }
        catch {
            antMsg.error('操作失败');
        }
        finally {
            setMarkingAll(false);
        }
    };
    // ── 删除单条 ─────────────────────────────────────────────────────────────
    const handleDelete = async (e, notifId) => {
        e.stopPropagation();
        try {
            await deleteNotification(notifId);
            setItems((prev) => prev.filter((n) => n.id !== notifId));
        }
        catch {
            antMsg.error('删除失败');
        }
    };
    // ── 渲染 ─────────────────────────────────────────────────────────────────
    return (_jsxs("div", { style: { maxWidth: 680, margin: '0 auto', padding: '0 16px 40px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 4px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 20, fontWeight: 700, color: '#333' }, children: "\u901A\u77E5" }), unreadBadge > 0 && (_jsx(Badge, { count: unreadBadge, style: { background: '#4A6741' } }))] }), unreadBadge > 0 && (_jsx(Button, { type: "text", size: "small", icon: _jsx(CheckOutlined, {}), loading: markingAll, onClick: handleMarkAll, style: { color: '#4A6741', fontSize: 12 }, children: "\u5168\u90E8\u5DF2\u8BFB" }))] }), _jsx(Tabs, { activeKey: tab, onChange: (k) => setTab(k), size: "small", style: { marginBottom: 4 }, items: [
                    { key: 'all', label: _jsxs("span", { children: [_jsx(BellOutlined, {}), " \u5168\u90E8"] }) },
                    { key: 'unread', label: _jsxs("span", { children: [_jsx(Badge, { dot: true, offset: [4, 0], children: _jsx(BellOutlined, {}) }), ' ', "\u672A\u8BFB"] }) },
                ] }), loading && items.length === 0 ? (_jsx("div", { style: { textAlign: 'center', padding: '60px 0' }, children: _jsx(Spin, {}) })) : items.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u901A\u77E5", style: { padding: '60px 0' } })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: items.map((n) => (_jsxs("div", { onClick: () => handleClick(n), style: {
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 14px',
                        background: n.isRead ? '#fff' : '#f0f7ed',
                        borderRadius: 10,
                        cursor: getTargetPath(n) ? 'pointer' : 'default',
                        border: '1px solid #f0f0f0',
                        transition: 'background 0.15s',
                        position: 'relative',
                    }, className: "notif-item", children: [_jsxs("div", { style: { position: 'relative', flexShrink: 0 }, children: [n.actor?.avatarUrl ? (_jsx(Avatar, { size: 44, src: n.actor.avatarUrl })) : (_jsx(Avatar, { size: 44, style: { background: '#4A6741' }, children: n.actor?.username?.[0]?.toUpperCase() ?? '系' })), _jsx(TypeIcon, { type: n.type })] }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { fontSize: 14, color: '#333', lineHeight: 1.5 }, children: [_jsx("span", { style: { fontWeight: 600 }, children: n.actor?.username ?? '系统' }), ' ', _jsx("span", { style: { color: '#666' }, children: NOTIF_TYPE_TEXT[n.type] })] }), n.content && (_jsx("div", { style: {
                                        fontSize: 13, color: '#888', marginTop: 3,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }, children: n.content })), _jsx("div", { style: { fontSize: 11, color: '#bbb', marginTop: 4 }, children: formatDistanceToNow(n.createdAt) })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }, children: [!n.isRead && (_jsx("div", { style: { width: 8, height: 8, borderRadius: '50%', background: '#4A6741' } })), _jsx(Popconfirm, { title: "\u5220\u9664\u8BE5\u901A\u77E5\uFF1F", onConfirm: (e) => handleDelete(e, n.id), onPopupClick: (e) => e.stopPropagation(), okText: "\u5220\u9664", cancelText: "\u53D6\u6D88", okButtonProps: { danger: true }, children: _jsx(Button, { type: "text", size: "small", icon: _jsx(DeleteOutlined, {}), style: { color: '#ddd', fontSize: 12 }, onClick: (e) => e.stopPropagation() }) })] })] }, n.id))) })), hasMore && (_jsx("div", { style: { textAlign: 'center', marginTop: 16 }, children: _jsx(Button, { loading: loading, onClick: () => load(page + 1, true), style: { borderColor: '#4A6741', color: '#4A6741' }, children: "\u52A0\u8F7D\u66F4\u591A" }) })), _jsx("style", { children: `
        .notif-item:hover { background: #f5faf5 !important; }
      ` })] }));
}
