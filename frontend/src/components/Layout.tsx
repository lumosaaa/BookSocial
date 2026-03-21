/**
 * Layout.tsx
 * BookSocial 模块0 · 三栏布局 Shell
 * 参照 PRD 6.5.1：左侧导航220px + 中央内容max-720px + 右侧面板300px
 *
 * PC端：三栏；移动端：单栏 + 底部TabBar
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HomeOutlined,
  CompassOutlined,
  EditOutlined,
  MessageOutlined,
  UserOutlined,
  BellOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Badge, Input } from 'antd';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode; // 右侧面板内容，由页面级组件传入
  showSearch?: boolean;
}

// ─── 导航项配置 ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/',          icon: <HomeOutlined />,    label: '首页' },
  { to: '/feed',      icon: <EditOutlined />,    label: '动态' },
  { to: '/search',    icon: <SearchOutlined />,  label: '搜索' },
  { to: '/shelf',     icon: <CompassOutlined />, label: '书架' },
  { to: '/profile',   icon: <UserOutlined />,    label: '我的' },
];

export default function Layout({ children, rightPanel, showSearch = true }: LayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="bs-layout">

      {/* ── 左侧导航栏（PC） ─────────────────────────────────────── */}
      <aside className="bs-sidebar">
        {/* Logo */}
        <div className="bs-sidebar__logo" onClick={() => navigate('/')}>
          <span className="bs-sidebar__logo-icon">📖</span>
          <span className="bs-sidebar__logo-text">书·友</span>
        </div>

        {/* 导航菜单 */}
        <nav className="bs-sidebar__nav">
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `bs-nav-item${isActive ? ' bs-nav-item--active' : ''}`
              }
            >
              <span className="bs-nav-item__icon">{icon}</span>
              <span className="bs-nav-item__label">{label}</span>
            </NavLink>
          ))}
        </nav>
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
            <Badge count={0} size="small">
              <BellOutlined
                className="bs-topbar__icon"
                onClick={() => navigate('/notifications')}
              />
            </Badge>
            <Badge count={0} size="small">
              <MessageOutlined
                className="bs-topbar__icon"
                onClick={() => navigate('/messages')}
              />
            </Badge>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="bs-content">
          {children}
        </div>
      </main>

      {/* ── 右侧面板（PC，隐藏于移动端） ───────────────────────── */}
      {rightPanel && (
        <aside className="bs-panel">
          {rightPanel}
        </aside>
      )}

      {/* ── 底部 TabBar（移动端） ────────────────────────────────── */}
      <nav className="bs-tabbar">
        {NAV_ITEMS.map(({ to, icon, label }) => (
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
