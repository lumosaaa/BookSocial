import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, useNavigate } from 'react-router-dom';
import { HomeOutlined, CompassOutlined, EditOutlined, MessageOutlined, UserOutlined, BellOutlined, SearchOutlined, TeamOutlined, BookOutlined, } from '@ant-design/icons';
import { Badge, Input } from 'antd';
import './Layout.css';
// ─── 导航项配置 ──────────────────────────────────────────────────────
const NAV_ITEMS = [
    { to: '/', icon: _jsx(HomeOutlined, {}), label: '首页' },
    { to: '/feed', icon: _jsx(EditOutlined, {}), label: '动态' },
    { to: '/discover', icon: _jsx(CompassOutlined, {}), label: '发现' },
    { to: '/groups', icon: _jsx(TeamOutlined, {}), label: '小组' },
    { to: '/shelf', icon: _jsx(BookOutlined, {}), label: '书架' },
    { to: '/profile', icon: _jsx(UserOutlined, {}), label: '我的' },
];
export default function Layout({ children, rightPanel, showSearch = true }) {
    const navigate = useNavigate();
    return (_jsxs("div", { className: "bs-layout", children: [_jsxs("aside", { className: "bs-sidebar", children: [_jsxs("div", { className: "bs-sidebar__logo", onClick: () => navigate('/'), children: [_jsx("span", { className: "bs-sidebar__logo-icon", children: "\uD83D\uDCD6" }), _jsx("span", { className: "bs-sidebar__logo-text", children: "\u4E66\u00B7\u53CB" })] }), _jsx("nav", { className: "bs-sidebar__nav", children: NAV_ITEMS.map(({ to, icon, label }) => (_jsxs(NavLink, { to: to, end: to === '/', className: ({ isActive }) => `bs-nav-item${isActive ? ' bs-nav-item--active' : ''}`, children: [_jsx("span", { className: "bs-nav-item__icon", children: icon }), _jsx("span", { className: "bs-nav-item__label", children: label })] }, to))) })] }), _jsxs("main", { className: "bs-main", children: [_jsxs("header", { className: "bs-topbar", children: [showSearch && (_jsx(Input, { className: "bs-topbar__search", prefix: _jsx(SearchOutlined, {}), placeholder: "\u641C\u7D22\u4E66\u7C4D\u3001\u4E66\u53CB\u3001\u4E66\u8BC4...", onPressEnter: (e) => {
                                    const q = e.target.value.trim();
                                    if (q)
                                        navigate(`/search?q=${encodeURIComponent(q)}`);
                                }, allowClear: true })), _jsxs("div", { className: "bs-topbar__actions", children: [_jsx(Badge, { count: 0, size: "small", children: _jsx(BellOutlined, { className: "bs-topbar__icon", onClick: () => navigate('/notifications') }) }), _jsx(Badge, { count: 0, size: "small", children: _jsx(MessageOutlined, { className: "bs-topbar__icon", onClick: () => navigate('/messages') }) })] })] }), _jsx("div", { className: "bs-content", children: children })] }), rightPanel && (_jsx("aside", { className: "bs-panel", children: rightPanel })), _jsx("nav", { className: "bs-tabbar", children: NAV_ITEMS.map(({ to, icon, label }) => (_jsxs(NavLink, { to: to, end: to === '/', className: ({ isActive }) => `bs-tabbar__item${isActive ? ' bs-tabbar__item--active' : ''}`, children: [_jsx("span", { className: "bs-tabbar__icon", children: icon }), _jsx("span", { className: "bs-tabbar__label", children: label })] }, to))) })] }));
}
