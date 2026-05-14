/**
 * Layout.tsx
 * BookSocial 模块0 · 三栏布局 Shell
 * 参照 PRD 6.5.1：左侧导航220px + 中央内容max-720px + 右侧面板300px
 *
 * PC端：三栏；移动端：单栏 + 底部TabBar
 */

import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HomeOutlined,
  CompassOutlined,
  EditOutlined,
  MessageOutlined,
  UserOutlined,
  BellOutlined,
  SearchOutlined,
  TeamOutlined,
  BookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RightOutlined,
  LeftOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Badge, Input } from 'antd';
import './Layout.css';
import { useAuthStore }   from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { getRoleFromToken } from '../utils/auth';
import {
  getMessageUnreadCount,
  getNotificationUnreadCount,
} from '../api/messageApi';

interface LayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode; // 右侧面板内容，由页面级组件传入
  rightPanelCollapsible?: boolean; // 右侧面板是否可折叠（如分类详情页的子分类筛选）
  rightPanelTitle?: string;
  showSearch?: boolean;
}

const SIDEBAR_STORAGE_KEY = 'bs-sidebar-collapsed';
const RIGHT_PANEL_STORAGE_KEY = 'bs-rightpanel-collapsed';

// ─── 导航项配置 ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/',          icon: <HomeOutlined />,    label: '首页' },
  { to: '/feed',      icon: <EditOutlined />,    label: '动态' },
  { to: '/discover',  icon: <CompassOutlined />, label: '发现' },
  { to: '/groups',    icon: <TeamOutlined />,    label: '小组' },
  { to: '/shelf',     icon: <BookOutlined />,    label: '书架' },
  { to: '/profile',   icon: <UserOutlined />,    label: '我的' },
];

export default function Layout({
  children,
  rightPanel,
  rightPanelCollapsible = false,
  rightPanelTitle = '筛选',
  showSearch = true,
}: LayoutProps) {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
  });
  const [panelCollapsed, setPanelCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(RIGHT_PANEL_STORAGE_KEY) === '1';
  });

  // 鉴权 + socket 接线
  const isLoggedIn          = useAuthStore(s => s.isLoggedIn);
  const accessToken         = useAuthStore(s => s.accessToken);
  const currentUser         = useAuthStore(s => s.user);
  const connectSocket       = useSocketStore(s => s.connect);
  const disconnectSocket    = useSocketStore(s => s.disconnect);
  const setMessageUnread    = useSocketStore(s => s.setMessageUnread);
  const setNotificationUnread = useSocketStore(s => s.setNotificationUnread);

  const messageUnread      = useSocketStore(s => s.messageUnread);
  const notificationUnread = useSocketStore(s => s.notificationUnread);
  const resolvedRole       = currentUser?.role || getRoleFromToken(accessToken);

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
      if (cancelled) return;
      setMessageUnread(msg?.unread ?? 0);
      setNotificationUnread(notif?.unread ?? 0);
    });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, accessToken, connectSocket, disconnectSocket, setMessageUnread, setNotificationUnread]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(RIGHT_PANEL_STORAGE_KEY, panelCollapsed ? '1' : '0');
  }, [panelCollapsed]);

  const layoutStyle = useMemo(() => ({
    ['--layout-sidebar-current' as const]: sidebarCollapsed
      ? 'var(--layout-sidebar-width-collapsed)'
      : 'var(--layout-sidebar-width)',
    ['--layout-panel-current' as const]: rightPanel
      ? (rightPanelCollapsible && panelCollapsed
          ? 'var(--layout-panel-width-collapsed)'
          : 'var(--layout-panel-width)')
      : '0px',
  }) as React.CSSProperties, [sidebarCollapsed, rightPanel, rightPanelCollapsible, panelCollapsed]);

  const navItems = useMemo(() => (
    resolvedRole === 'admin'
      ? [...NAV_ITEMS, { to: '/admin', icon: <SafetyCertificateOutlined />, label: '管理' }]
      : NAV_ITEMS
  ), [resolvedRole]);

  return (
    <div
      className={`bs-layout${sidebarCollapsed ? ' bs-layout--sidebar-collapsed' : ''}${rightPanel ? ' bs-layout--has-panel' : ''}${rightPanelCollapsible && panelCollapsed ? ' bs-layout--panel-collapsed' : ''}`}
      style={layoutStyle}
    >

      {/* ── 左侧导航栏（PC） ─────────────────────────────────────── */}
      <aside className={`bs-sidebar${sidebarCollapsed ? ' bs-sidebar--collapsed' : ''}`}>
        {/* Logo */}
        <div className="bs-sidebar__logo" onClick={() => navigate('/')}>
          <span className="bs-sidebar__logo-icon">📖</span>
          {!sidebarCollapsed && <span className="bs-sidebar__logo-text">书·友</span>}
        </div>

        {/* 导航菜单 */}
        <nav className="bs-sidebar__nav">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={sidebarCollapsed ? label : undefined}
              className={({ isActive }) =>
                `bs-nav-item${isActive ? ' bs-nav-item--active' : ''}`
              }
            >
              <span className="bs-nav-item__icon">{icon}</span>
              {!sidebarCollapsed && <span className="bs-nav-item__label">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* 折叠按钮 */}
        <button
          type="button"
          className="bs-sidebar__toggle"
          onClick={() => setSidebarCollapsed(v => !v)}
          aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          {!sidebarCollapsed && <span style={{ marginLeft: 8 }}>收起</span>}
        </button>
      </aside>

      {/* ── 中央内容区 ──────────────────────────────────────────── */}
      <main className="bs-main">

        {/* 顶部栏（移动端可见） */}
        <header className="bs-topbar">
          {showSearch && (
            <Input
              className="bs-topbar__search"
              prefix={<SearchOutlined />}
              placeholder="搜索书籍、书友、书评..."
              onPressEnter={(e) => {
                const q = (e.target as HTMLInputElement).value.trim();
                if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
              }}
              allowClear
            />
          )}
          <div className="bs-topbar__actions">
            <Badge count={isLoggedIn ? notificationUnread : 0} size="small" overflowCount={99}>
              <BellOutlined
                className="bs-topbar__icon"
                onClick={() => navigate('/notifications')}
              />
            </Badge>
            <Badge count={isLoggedIn ? messageUnread : 0} size="small" overflowCount={99}>
              <MessageOutlined
                className="bs-topbar__icon"
                onClick={() => navigate('/messages')}
              />
            </Badge>
            <UserOutlined
              className="bs-topbar__icon"
              onClick={() => navigate(isLoggedIn ? '/profile' : '/login')}
            />
          </div>
        </header>

        {/* 页面内容 */}
        <div className="bs-content">
          {children}
        </div>
      </main>

      {/* ── 右侧面板（PC，隐藏于移动端） ───────────────────────── */}
      {rightPanel && (
        <aside className={`bs-panel${rightPanelCollapsible ? ' bs-panel--collapsible' : ''}${rightPanelCollapsible && panelCollapsed ? ' bs-panel--collapsed' : ''}`}>
          {rightPanelCollapsible && (
            <button
              type="button"
              className="bs-panel__toggle"
              onClick={() => setPanelCollapsed(v => !v)}
              aria-label={panelCollapsed ? '展开右侧栏' : '收起右侧栏'}
            >
              {panelCollapsed ? <LeftOutlined /> : <RightOutlined />}
              {!panelCollapsed && <span>{rightPanelTitle}</span>}
            </button>
          )}
          <div className={`bs-panel__inner${rightPanelCollapsible && panelCollapsed ? ' bs-panel__inner--hidden' : ''}`}>
            {rightPanel}
          </div>
        </aside>
      )}

      {/* ── 底部 TabBar（移动端） ────────────────────────────────── */}
      <nav className="bs-tabbar">
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `bs-tabbar__item${isActive ? ' bs-tabbar__item--active' : ''}`
            }
          >
            <span className="bs-tabbar__icon">{icon}</span>
            <span className="bs-tabbar__label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
