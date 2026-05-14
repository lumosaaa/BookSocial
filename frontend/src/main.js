import { jsx as _jsx } from "react/jsx-runtime";
/**
 * main.tsx
 * BookSocial 模块0 · React 18 应用入口
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import router from './routes';
import './tokens.css';
// ─── React Query 全局配置 ────────────────────────────────────────────
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5分钟
            gcTime: 10 * 60 * 1000, // 10分钟
            retry: 1,
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 0,
        },
    },
});
// ─── Ant Design 主题 Token（与 Design Token 保持一致）───────────────
const antdTheme = {
    token: {
        colorPrimary: '#4A6741',
        colorSuccess: '#4CAF50',
        colorWarning: '#F59E0B',
        colorError: '#D64045',
        colorBgBase: '#FDFAF4',
        colorTextBase: '#2C3E2D',
        borderRadius: 8,
        fontFamily: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
        fontSize: 16,
        lineHeight: 1.8,
    },
};
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(ConfigProvider, { locale: zhCN, theme: antdTheme, children: _jsx(RouterProvider, { router: router }) }) }) }));
