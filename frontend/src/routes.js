import { jsx as _jsx } from "react/jsx-runtime";
/**
 * routes.tsx
 * BookSocial · React Router v6 路由配置
 *
 * 路径变更说明（对比模块0初始版本）：
 *   /auth/callback          ← Google OAuth 回调（模块1 后端重定向目标）
 *   /profile                ← 我的主页  (原 /profile/me)
 *   /users/:id              ← 他人主页  (原 /profile/:id，避免与 /profile/edit 冲突)
 *
 * 模块3 新增/变更：
 *   /                       ← 首页改为 FeedPage（信息流）
 *   /posts/:id              ← 动态详情页（含评论区）
 *   /reading-notes/:id      ← 笔记详情页（Markdown 渲染）
 *   /create                 ← 发帖页（重定向到首页并打开 PostComposer）
 *   /users/:id              ← 他人主页内嵌 UserPostsPage（动态/笔记 Tab）
 */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, } from 'react-router-dom';
import { Spin } from 'antd';
import Layout from './components/Layout';
// ─── 懒加载通用包装 ──────────────────────────────────────────
const PageLoading = () => (_jsx("div", { style: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
    }, children: _jsx(Spin, { size: "large", tip: "\u52A0\u8F7D\u4E2D..." }) }));
const lazyPage = (importFn) => {
    const Component = lazy(importFn);
    return (_jsx(Suspense, { fallback: _jsx(PageLoading, {}), children: _jsx(Component, {}) }));
};
// ─── 带三栏 Layout 的路由容器 ────────────────────────────────
function AppLayout() {
    return (_jsx(Layout, { children: _jsx(Outlet, {}) }));
}
// ─── 路由配置 ────────────────────────────────────────────────
const router = createBrowserRouter([
    // ════════════════════════════════════════════════════════════
    //  无布局路由（认证相关，全屏居中卡片样式）
    // ════════════════════════════════════════════════════════════
    // 模块1 · 邮箱登录（密码 / 验证码）+ Google 一键登录入口
    {
        path: '/login',
        element: lazyPage(() => import('./pages/auth/LoginPage')),
    },
    // 模块1 · 邮箱注册（两步：账号信息 → 阅读偏好标签）
    {
        path: '/register',
        element: lazyPage(() => import('./pages/auth/RegisterPage')),
    },
    // 模块1 · Google OAuth 回调
    //   后端重定向格式：/auth/callback?accessToken=xxx&refreshToken=xxx&isNewUser=true
    {
        path: '/auth/callback',
        element: lazyPage(() => import('./pages/auth/GoogleCallback')),
    },
    // ════════════════════════════════════════════════════════════
    //  带三栏 Layout 的主应用路由
    // ════════════════════════════════════════════════════════════
    {
        element: _jsx(AppLayout, {}),
        children: [
            // ── 首页书籍浏览 ──────────────────────────────────────────
            {
                path: '/',
                element: lazyPage(() => import('./pages/books/BookHomePage')),
            },
            // ── 社交动态流（模块3）──────────────────────────────────
            {
                path: '/feed',
                element: lazyPage(() => import('./pages/social/FeedPage')),
            },
            // ── 书籍 & 书架（模块2）────────────────────────────────
            {
                path: '/search',
                element: lazyPage(() => import('./pages/books/SearchPage')),
            },
            {
                path: '/books/:id',
                element: lazyPage(() => import('./pages/books/BookDetailPage')),
            },
            {
                path: '/shelf',
                element: lazyPage(() => import('./pages/books/ShelfPage')),
            },
            // ── 发现 / 推荐（模块6）────────────────────────────────
            {
                path: '/discover',
                element: lazyPage(() => import('./pages/discover/DiscoverPage')),
            },
            // ── 动态详情（模块3）────────────────────────────────────
            //  包含完整帖子内容 + 嵌套评论区 + 转发弹窗
            {
                path: '/posts/:id',
                element: lazyPage(() => import('./pages/social/PostDetailPage')),
            },
            // ── 阅读笔记详情（模块3）────────────────────────────────
            //  Markdown 渲染 + 摘录展示 + 点赞
            {
                path: '/reading-notes/:id',
                element: lazyPage(() => import('./pages/social/NotePage')),
            },
            // ── 发帖入口（模块3）────────────────────────────────────
            //  /create 重定向到首页并自动打开 PostComposer 弹窗
            //  前端通过 URL hash（/#composer）或 location.state 触发弹窗打开
            {
                path: '/create',
                element: _jsx(Navigate, { to: "/?compose=1", replace: true }),
            },
            // ── 私信（模块4）───────────────────────────────────────
            {
                path: '/messages',
                element: lazyPage(() => import('./pages/messages/ConversationsPage')),
            },
            {
                path: '/messages/:userId',
                element: lazyPage(() => import('./pages/messages/ChatPage')),
            },
            // ── 通知（模块4）───────────────────────────────────────
            {
                path: '/notifications',
                element: lazyPage(() => import('./pages/notifications/NotificationsPage')),
            },
            // ── 个人主页（模块1）───────────────────────────────────
            //
            //  /profile          → 我的主页（含动态/笔记 Tab，复用 UserPostsPage 组件）
            //  /profile/edit     → 编辑资料
            //  /profile/privacy  → 隐私设置
            //  /users/:id        → 他人主页（含关注按钮 + 动态/笔记 Tab）
            //
            //  顺序重要：/profile/edit 和 /profile/privacy 必须在
            //  /profile 之前，React Router 会按声明顺序匹配。
            {
                path: '/profile/edit',
                element: lazyPage(() => import('./pages/profile/EditProfilePage')),
            },
            {
                path: '/profile/privacy',
                element: lazyPage(() => import('./pages/profile/PrivacyPage')),
            },
            {
                path: '/profile',
                element: lazyPage(() => import('./pages/profile/MyProfilePage')),
            },
            {
                // 他人主页：M1 负责基础信息卡，M3 的 UserPostsPage 作为内嵌 Tab 组件
                // UserProfilePage 内部直接 import UserPostsPage 组件，无需单独路由
                path: '/users/:id',
                element: lazyPage(() => import('./pages/profile/UserProfilePage')),
            },
            // ── 读书小组 & 阅读挑战（模块5）────────────────────────
            {
                path: '/groups',
                element: lazyPage(() => import('./pages/groups/GroupListPage')),
            },
            {
                path: '/groups/:id',
                element: lazyPage(() => import('./pages/groups/GroupDetailPage')),
            },
            {
                path: '/challenges/:id',
                element: lazyPage(() => import('./pages/groups/ChallengePage')),
            },
        ],
    },
    // ── 404：未匹配路由重定向到首页 ──────────────────────────────
    {
        path: '*',
        element: _jsx(Navigate, { to: "/", replace: true }),
    },
]);
export default router;
