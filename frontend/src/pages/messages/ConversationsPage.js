import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// frontend/src/pages/messages/ConversationsPage.tsx
// M4 · 私信会话列表页
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { List, Avatar, Badge, Empty, Spin, Typography, Tag, message } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { getConversations, getOrCreateConversation, msgTypePreview } from '../../api/messageApi';
import { useSocketStore } from '../../store/socketStore';
import { formatDistanceToNow } from '../../utils/dateUtils';
const { Text, Title } = Typography;
export default function ConversationsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [convs, setConvs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    // 当有新消息时刷新列表
    const newMessages = useSocketStore((s) => s.newMessages);
    const clearNewMessages = useSocketStore((s) => s.clearNewMessages);
    // ?userId= 深链兼容：自动创建/打开会话再跳转
    useEffect(() => {
        const targetId = Number(searchParams.get('userId'));
        if (!targetId)
            return;
        (async () => {
            try {
                const conv = await getOrCreateConversation(targetId);
                // 清掉 userId 参数后跳转
                const next = new URLSearchParams(searchParams);
                next.delete('userId');
                setSearchParams(next, { replace: true });
                navigate(`/messages/${conv.id}`, { replace: true });
            }
            catch (err) {
                message.warning(err?.response?.data?.message || '对方暂不接受私信');
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const fetchConvs = useCallback(async (p = 1) => {
        try {
            setLoading(true);
            const data = await getConversations(p, 20);
            setConvs(p === 1 ? data.list : (prev) => [...prev, ...data.list]);
            setTotal(data.total);
            setPage(p);
        }
        catch {
            // 错误由全局拦截器处理
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { fetchConvs(1); }, [fetchConvs]);
    // 新消息到来时刷新列表顺序
    useEffect(() => {
        if (newMessages.length > 0) {
            fetchConvs(1);
            clearNewMessages();
        }
    }, [newMessages, fetchConvs, clearNewMessages]);
    const renderLastMsg = (conv) => {
        const typePreview = msgTypePreview(conv.lastMsgType);
        if (!conv.lastContent && !typePreview) {
            return _jsx(Text, { type: "secondary", italic: true, children: "\u6682\u65E0\u6D88\u606F\uFF0C\u53D1\u4E2A\u62DB\u547C\u5427" });
        }
        const prefix = conv.lastSenderId && conv.lastSenderId !== conv.other.id ? '我: ' : '';
        const body = typePreview
            || (conv.lastContent && conv.lastContent.length > 24
                ? conv.lastContent.slice(0, 24) + '…'
                : conv.lastContent || '');
        return _jsxs(Text, { type: "secondary", children: [prefix, body] });
    };
    return (_jsxs("div", { style: { maxWidth: 680, margin: '0 auto', padding: '24px 16px' }, children: [_jsxs(Title, { level: 4, style: { marginBottom: 20 }, children: [_jsx(MessageOutlined, { style: { marginRight: 8, color: '#4A6741' } }), "\u79C1\u4FE1"] }), loading && convs.length === 0 ? (_jsx("div", { style: { textAlign: 'center', padding: 60 }, children: _jsx(Spin, {}) })) : convs.length === 0 ? (_jsx(Empty, { description: "\u8FD8\u6CA1\u6709\u79C1\u4FE1\uFF0C\u53BB\u8BA4\u8BC6\u4E66\u53CB\u5427\uFF5E" })) : (_jsx(List, { dataSource: convs, loadMore: convs.length < total ? (_jsx("div", { style: { textAlign: 'center', padding: 16 }, children: _jsx(Text, { style: { cursor: 'pointer', color: '#4A6741' }, onClick: () => fetchConvs(page + 1), children: "\u52A0\u8F7D\u66F4\u591A" }) })) : null, renderItem: (conv) => (_jsxs(List.Item, { style: { cursor: 'pointer', padding: '12px 8px', borderRadius: 8 }, onClick: () => navigate(`/messages/${conv.id}`), className: "conv-item", children: [_jsx(List.Item.Meta, { avatar: _jsx(Badge, { count: conv.unreadCount, offset: [-4, 4], children: _jsx(Avatar, { src: conv.other.avatarUrl, size: 46, style: { backgroundColor: '#4A6741' }, children: conv.other.username[0] }) }), title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("span", { style: { fontWeight: conv.unreadCount > 0 ? 600 : 400 }, children: conv.other.username }), conv.isBlocked && _jsx(Tag, { color: "red", style: { fontSize: 11 }, children: "\u5DF2\u5C4F\u853D" })] }), description: renderLastMsg(conv) }), _jsx(Text, { type: "secondary", style: { fontSize: 12, whiteSpace: 'nowrap' }, children: conv.lastMessageAt ? formatDistanceToNow(conv.lastMessageAt) : '' })] }, conv.id)) })), _jsx("style", { children: `
        .conv-item:hover { background: #f5f7f5; }
      ` })] }));
}
