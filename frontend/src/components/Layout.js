import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Layout.tsx
 * BookSocial 模块0 · 三栏布局 Shell
 * 参照 PRD 6.5.1：左侧导航220px + 中央内容max-720px + 右侧面板300px
 *
 * PC端：三栏；移动端：单栏 + 底部TabBar
 */
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { HomeOutlined, CompassOutlined, EditOutlined, MessageOutlined, UserOutlined, BellOutlined, SearchOutlined, TeamOutlined, BookOutlined, MenuFoldOutlined, MenuUnfoldOutlined, RightOutlined, LeftOutlined, SafetyCertificateOutlined, } from '@ant-design/icons';
import { Badge, Input } from 'antd';
import './Layout.css';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { getRoleFromToken } from '../utils/auth';
import { getMessageUnreadCount, getNotificationUnreadCount, } from '../api/messageApi';
const SIDEBAR_STORAGE_KEY = 'bs-sidebar-collapsed';
const RIGHT_PANEL_STORAGE_KEY = 'bs-rightpanel-collapsed';
// ─── 导航项配置 ──────────────────────────────────────────────────────
const NAV_ITEMS = [
    { to: '/', icon: _jsx(HomeOutlined, {}), label: '首页' },
    { to: '/feed', icon: _jsx(EditOutlined, {}), label: '动态' },
    { to: '/discover', icon: _jsx(CompassOutlined, {}), label: '发现' },
    { to: '/groups', icon: _jsx(TeamOutlined, {}), label: '小组' },
    { to: '/shelf', icon: _jsx(BookOutlined, {}), label: '书架' },
    { to: '/profile', icon: _jsx(UserOutlined, {}), label: '我的' },
];
export default function Layout({ children, rightPanel, rightPanelCollapsible = false, rightPanelTitle = '筛选', showSearch = true, }) {
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window === 'undefined')
            return false;
        return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
    });
    const [panelCollapsed, setPanelCollapsed] = useState(() => {
        if (typeof window === 'undefined')
            return false;
        return window.localStorage.getItem(RIGHT_PANEL_STORAGE_KEY) === '1';
    });
    // 鉴权 + socket 接线
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const accessToken = useAuthStore(s => s.accessToken);
    const currentUser = useAuthStore(s => s.user);
    const connectSocket = useSocketStore(s => s.connect);
    const disconnectSocket = useSocketStore(s => s.disconnect);
    const setMessageUnread = useSocketStore(s => s.setMessageUnread);
    const setNotificationUnread = useSocketStore(s => s.setNotificationUnread);
    const messageUnread = useSocketStore(s => s.messageUnread);
    const notificationUnread = useSocketStore(s => s.notificationUnread);
    const resolvedRole = currentUser?.role || getRoleFromToken(accessToken);
    // 登录态变化时连接 / 断开 socket，并拉取未读数
    useEffect(() => {
        if (!isLoggedIn || !accessToken) {
            disconnectSocket();
            setMessageUnread(0);
            setNotificationUnread(0);
            return;
        }
        connectSocket(accessToken);
        let cancelled = false;
        Promise.all([
            getMessageUnreadCount().catch(() => ({ unread: 0 })),
            getNotificationUnreadCount().catch(() => ({ unread: 0 })),
        ]).then(([msg, notif]) => {
            if (cancelled)
                return;
            setMessageUnread(msg?.unread ?? 0);
            setNotificationUnread(notif?.unread ?? 0);
        });
        return () => {
            cancelled = true;
        };
    }, [isLoggedIn, accessToken, connectSocket, disconnectSocket, setMessageUnread, setNotificationUnread]);
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? '1' : '0');
    }, [sidebarCollapsed]);
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        window.localStorage.setItem(RIGHT_PANEL_STORAGE_KEY, panelCollapsed ? '1' : '0');
    }, [panelCollapsed]);
    const layoutStyle = useMemo(() => ({
        ['--layout-sidebar-current']: sidebarCollapsed
            ? 'var(--layout-sidebar-width-collapsed)'
            : 'var(--layout-sidebar-width)',
        ['--layout-panel-current']: rightPanel
            ? (rightPanelCollapsible && panelCollapsed
                ? 'var(--layout-panel-width-collapsed)'
                : 'var(--layout-panel-width)')
            : '0px',
    }), [sidebarCollapsed, rightPanel, rightPanelCollapsible, panelCollapsed]);
    const navItems = useMemo(() => (resolvedRole === 'admin'
        ? [...NAV_ITEMS, { to: '/admin', icon: _jsx(SafetyCertificateOutlined, {}), label: '管理' }]
        : NAV_ITEMS), [resolvedRole]);
    return (_jsxs("div", { className: `bs-layout${sidebarCollapsed ? ' bs-layout--sidebar-collapsed' : ''}${rightPanel ? ' bs-layout--has-panel' : ''}${rightPanelCollapsible && panelCollapsed ? ' bs-layout--panel-collapsed' : ''}`, style: layoutStyle, children: [_jsxs("aside", { className: `bs-sidebar${sidebarCollapsed ? ' bs-sidebar--collapsed' : ''}`, children: [_jsxs("div", { className: "bs-sidebar__logo", onClick: () => navigate('/'), children: [_jsx("span", { className: "bs-sidebar__logo-icon", children: "\uD83D\uDCD6" }), !sidebarCollapsed && _jsx("span", { className: "bs-sidebar__logo-text", children: "\u4E66\u00B7\u53CB" })] }), _jsx("nav", { className: "bs-sidebar__nav", children: navItems.map(({ to, icon, label }) => (_jsxs(NavLink, { to: to, end: to === '/', title: sidebarCollapsed ? label : undefined, className: ({ isActive }) => `bs-nav-item${isActive ? ' bs-nav-item--active' : ''}`, children: [_jsx("span", { className: "bs-nav-item__icon", children: icon }), !sidebarCollapsed && _jsx("span", { className: "bs-nav-item__label", children: label })] }, to))) }), _jsxs("button", { type: "button", className: "bs-sidebar__toggle", onClick: () => setSidebarCollapsed(v => !v), "aria-label": sidebarCollapsed ? '展开侧边栏' : '收起侧边栏', children: [sidebarCollapsed ? _jsx(MenuUnfoldOutlined, {}) : _jsx(MenuFoldOutlined, {}), !sidebarCollapsed && _jsx("span", { style: { marginLeft: 8 }, children: "\u6536\u8D77" })] })] }), _jsxs("main", { className: "bs-main", children: [_jsxs("header", { className: "bs-topbar", children: [showSearch && (_jsx(Input, { className: "bs-topbar__search", prefix: _jsx(SearchOutlined, {}), placeholder: "\u641C\u7D22\u4E66\u7C4D\u3001\u4E66\u53CB\u3001\u4E66\u8BC4...", onPressEnter: (e) => {
                                    const q = e.target.value.trim();
                                    if (q)
                                        navigate(`/search?q=${encodeURIComponent(q)}`);
                                }, allowClear: true })), _jsxs("div", { className: "bs-topbar__actions", children: [_jsx(Badge, { count: isLoggedIn ? notificationUnread : 0, size: "small", overflowCount: 99, children: _jsx(BellOutlined, { className: "bs-topbar__icon", onClick: () => navigate('/notifications') }) }), _jsx(Badge, { count: isLoggedIn ? messageUnread : 0, size: "small", overflowCount: 99, children: _jsx(MessageOutlined, { className: "bs-topbar__icon", onClick: () => navigate('/messages') }) }), _jsx(UserOutlined, { className: "bs-topbar__icon", onClick: () => navigate(isLoggedIn ? '/profile' : '/login') })] })] }), _jsx("div", { className: "bs-content", children: children })] }), rightPanel && (_jsxs("aside", { className: `bs-panel${rightPanelCollapsible ? ' bs-panel--collapsible' : ''}${rightPanelCollapsible && panelCollapsed ? ' bs-panel--collapsed' : ''}`, children: [rightPanelCollapsible && (_jsxs("button", { type: "button", className: "bs-panel__toggle", onClick: () => setPanelCollapsed(v => !v), "aria-label": panelCollapsed ? '展开右侧栏' : '收起右侧栏', children: [panelCollapsed ? _jsx(LeftOutlined, {}) : _jsx(RightOutlined, {}), !panelCollapsed && _jsx("span", { children: rightPanelTitle })] })), _jsx("div", { className: `bs-panel__inner${rightPanelCollapsible && panelCollapsed ? ' bs-panel__inner--hidden' : ''}`, children: rightPanel })] })), _jsx("nav", { className: "bs-tabbar", children: navItems.map(({ to, icon, label }) => (_jsxs(NavLink, { to: to, end: to === '/', className: ({ isActive }) => `bs-tabbar__item${isActive ? ' bs-tabbar__item--active' : ''}`, children: [_jsx("span", { className: "bs-tabbar__icon", children: icon }), _jsx("span", { className: "bs-tabbar__label", children: label })] }, to))) })] }));
}
