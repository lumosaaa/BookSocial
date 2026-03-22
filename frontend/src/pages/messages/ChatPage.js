import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * M4 · ChatPage.tsx
 * 路由：/messages/:id  （:id = conversation_id）
 *
 * 功能：
 *  - 加载该会话的历史消息（倒序分页，向上滚动加载更多）
 *  - 实时接收新消息（来自 socketStore newMessages）
 *  - 发送文字消息（Socket 主通道，HTTP 备用降级）
 *  - 消息撤回（2 分钟内，自己发的消息才显示）
 *  - 书籍分享消息卡（msg_type=2，展示封面/书名/作者）
 *  - 进入即调后端标记已读（GET messages 接口会自动清零未读数）
 *  - 日期分组标签（同一天消息只显示一次日期头）
 */
import { useState, useEffect, useRef, useCallback, Fragment, } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input, Button, Avatar, Spin, Empty, message as antMsg, Dropdown, } from 'antd';
import { ArrowLeftOutlined, SendOutlined, RollbackOutlined, ReadOutlined, } from '@ant-design/icons';
import { getMessages, recallMessage, sendMessageHttp, } from '../../api/messageApi';
import { useSocketStore } from '../../store/socketStore';
import { useAuthStore } from '../../store/authStore';
import { formatChatTime, formatDayLabel } from '../../utils/dateUtils';
// ─────────────────────────────────────────────────────────────────────────────
// 常量 & 工具
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 30;
/** 是否在同一天（用于渲染日期分组标签） */
function sameDay(a, b) {
    return new Date(a).toDateString() === new Date(b).toDateString();
}
function Bubble({ msg, isMine, canRecall, onRecall }) {
    const menuItems = canRecall
        ? [{ key: 'recall', label: '撤回', icon: _jsx(RollbackOutlined, {}), danger: true }]
        : [];
    const bubbleContent = msg.isRecalled ? (_jsx("span", { style: { color: '#bbb', fontStyle: 'italic', fontSize: 13 }, children: "\u6D88\u606F\u5DF2\u64A4\u56DE" })) : msg.msgType === 1 ? (
    // 图片消息
    _jsx("img", { src: msg.content, alt: "\u56FE\u7247", style: { maxWidth: 200, maxHeight: 200, borderRadius: 8, display: 'block', cursor: 'zoom-in' }, onClick: () => window.open(msg.content, '_blank') })) : msg.msgType === 2 ? (
    // 书籍分享卡（仅展示文字占位，book 详情可按 refBookId 查询）
    _jsxs("div", { style: {
            display: 'flex', alignItems: 'center', gap: 10,
            background: isMine ? 'rgba(255,255,255,0.15)' : '#f5f5f5',
            padding: '8px 10px', borderRadius: 8, minWidth: 160,
        }, children: [_jsx(ReadOutlined, { style: { fontSize: 20, flexShrink: 0, color: isMine ? '#fff' : '#4A6741' } }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 13, fontWeight: 500 }, children: "\u4E66\u7C4D\u5206\u4EAB" }), _jsxs("div", { style: { fontSize: 11, opacity: 0.7 }, children: ["ID: ", msg.refBookId] })] })] })) : (
    // 普通文字，支持换行
    _jsx("span", { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }, children: msg.content }));
    const bubble = (_jsx("div", { style: {
            maxWidth: '65%',
            padding: msg.msgType === 1 ? 4 : '8px 14px',
            background: msg.isRecalled ? 'transparent' : isMine ? '#4A6741' : '#fff',
            color: msg.isRecalled ? undefined : isMine ? '#fff' : '#333',
            borderRadius: isMine ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
            boxShadow: msg.isRecalled ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
            fontSize: 14, lineHeight: 1.6,
            border: msg.isRecalled ? '1px dashed #ddd' : 'none',
        }, children: bubbleContent }));
    return (_jsxs("div", { style: {
            display: 'flex',
            flexDirection: isMine ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
            gap: 8,
        }, children: [_jsx(Avatar, { size: 36, src: msg.senderAvatar || undefined, style: { background: '#4A6741', flexShrink: 0, alignSelf: 'flex-end' }, children: msg.senderName[0]?.toUpperCase() }), _jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start',
                    gap: 2, maxWidth: '70%',
                }, children: [menuItems.length > 0 && !msg.isRecalled ? (_jsx(Dropdown, { menu: { items: menuItems, onClick: ({ key }) => key === 'recall' && onRecall(msg.id) }, trigger: ['contextMenu'], children: bubble })) : bubble, _jsx("span", { style: { fontSize: 10, color: '#bbb' }, children: formatChatTime(msg.createdAt) })] })] }));
}
// ─────────────────────────────────────────────────────────────────────────────
// ChatPage
// ─────────────────────────────────────────────────────────────────────────────
export default function ChatPage() {
    const { id: convIdStr } = useParams();
    const convId = Number(convIdStr);
    const navigate = useNavigate();
    const { user } = useAuthStore();
    // ── 消息列表状态 ─────────────────────────────────────────────────────────
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [peerName, setPeerName] = useState(''); // 从会话列表带过来也行，但这里从 msg 推断
    // ── 输入状态 ─────────────────────────────────────────────────────────────
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    // ── DOM 引用 ─────────────────────────────────────────────────────────────
    const bottomRef = useRef(null);
    const chatRef = useRef(null);
    const prevScrollH = useRef(0); // 加载更多前的 scrollHeight，用于保持位置
    // ── Socket Store ─────────────────────────────────────────────────────────
    const newMessages = useSocketStore((s) => s.newMessages);
    const clearNewMessages = useSocketStore((s) => s.clearNewMessages);
    const sendSocketMsg = useSocketStore((s) => s.sendMessage);
    const recallSocketMsg = useSocketStore((s) => s.recallMessage);
    // ── 加载消息（首次 or 加载更多） ─────────────────────────────────────────
    const loadMessages = useCallback(async (pg, prepend = false) => {
        if (!convId)
            return;
        if (prepend) {
            // 记住当前 scrollHeight，加载后恢复滚动位置
            prevScrollH.current = chatRef.current?.scrollHeight ?? 0;
        }
        setLoading(true);
        try {
            // GET messages 同时会在后端将该会话未读数清零
            const data = await getMessages(convId, pg, PAGE_SIZE);
            // 后端返回倒序（最新在前），前端展示需要正序（最新在底部）
            const sorted = [...data.list].reverse();
            if (prepend) {
                setMessages((prev) => [...sorted, ...prev]);
            }
            else {
                setMessages(sorted);
            }
            setHasMore(data.hasMore);
            setPage(pg);
            // 推断对方姓名（取第一条不是自己发的消息的 senderName）
            if (!peerName) {
                const peerMsg = data.list.find((m) => m.senderId !== user?.id);
                if (peerMsg)
                    setPeerName(peerMsg.senderName);
            }
        }
        catch (err) {
            antMsg.error(err.message || '加载消息失败');
        }
        finally {
            setLoading(false);
        }
    }, [convId, user?.id, peerName]);
    // ── 初始化 ───────────────────────────────────────────────────────────────
    useEffect(() => {
        loadMessages(1, false);
    }, [loadMessages]);
    // ── 首次加载完成后滚到底部 ───────────────────────────────────────────────
    useEffect(() => {
        if (!loading && page === 1) {
            bottomRef.current?.scrollIntoView({ behavior: 'auto' });
        }
    }, [loading, page]);
    // ── 加载更多后恢复滚动位置（不要跳到底部） ──────────────────────────────
    useEffect(() => {
        if (page > 1 && chatRef.current) {
            const newScrollH = chatRef.current.scrollHeight;
            chatRef.current.scrollTop = newScrollH - prevScrollH.current;
        }
    }, [messages, page]);
    // ── 接收 Socket 新消息 ───────────────────────────────────────────────────
    useEffect(() => {
        const incoming = newMessages.filter((m) => m.conversationId === convId);
        if (incoming.length === 0)
            return;
        setMessages((prev) => {
            // 去重（自己发的消息 ack 后已追加，避免重复）
            const existIds = new Set(prev.map((m) => m.id));
            const toAdd = incoming.filter((m) => !existIds.has(m.id));
            return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
        });
        clearNewMessages();
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }, [newMessages, convId, clearNewMessages]);
    // ── 发送消息 ─────────────────────────────────────────────────────────────
    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || sending || !user)
            return;
        setSending(true);
        setInputText('');
        // 乐观更新：先本地追加一条"发送中"的消息
        const optimistic = {
            id: Date.now(), // 临时 id（负数也行，但 Date.now 够用）
            conversationId: convId,
            senderId: user.id,
            senderName: user.username,
            senderAvatar: user.avatarUrl ?? null,
            content: text,
            msgType: 0,
            refBookId: null,
            isRecalled: false,
            isRead: false,
            readAt: null,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
        // Socket 主通道
        sendSocketMsg(convId, text, 0, async (ack) => {
            if (ack.ok && ack.message) {
                // 替换乐观消息为真实消息
                setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? ack.message : m)));
            }
            else {
                // Socket 失败，尝试 HTTP 降级
                try {
                    const real = await sendMessageHttp(convId, { content: text, msgType: 0 });
                    setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? real : m)));
                }
                catch (httpErr) {
                    antMsg.error(httpErr.message || '消息发送失败');
                    // 移除乐观消息
                    setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
                    setInputText(text); // 还原输入
                }
            }
            setSending(false);
        });
    };
    // ── 撤回消息 ─────────────────────────────────────────────────────────────
    const handleRecall = (messageId) => {
        // Socket 通道撤回
        recallSocketMsg(messageId, async (ack) => {
            if (ack.ok) {
                setMessages((prev) => prev.map((m) => m.id === messageId
                    ? { ...m, isRecalled: true, content: '[消息已撤回]' }
                    : m));
                antMsg.success('消息已撤回');
            }
            else {
                // HTTP 降级
                try {
                    await recallMessage(convId, messageId);
                    setMessages((prev) => prev.map((m) => m.id === messageId
                        ? { ...m, isRecalled: true, content: '[消息已撤回]' }
                        : m));
                    antMsg.success('消息已撤回');
                }
                catch (err) {
                    antMsg.error(err.message || '撤回失败');
                }
            }
        });
    };
    // ── 渲染 ─────────────────────────────────────────────────────────────────
    return (_jsxs("div", { style: {
            display: 'flex', flexDirection: 'column',
            height: 'calc(100vh - 64px)',
            maxWidth: 780, margin: '0 auto',
            background: '#fff',
            boxShadow: '0 0 12px rgba(0,0,0,0.06)',
        }, children: [_jsxs("div", { style: {
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0 16px', height: 54,
                    borderBottom: '1px solid #f0f0f0',
                    background: '#fff', flexShrink: 0,
                }, children: [_jsx(Button, { type: "text", icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/messages'), style: { color: '#666', padding: '0 4px' } }), _jsx("span", { style: { fontWeight: 600, fontSize: 16, color: '#333', flex: 1 }, children: peerName || '私信' })] }), _jsxs("div", { ref: chatRef, style: {
                    flex: 1, overflowY: 'auto',
                    padding: '16px 20px',
                    display: 'flex', flexDirection: 'column', gap: 12,
                    background: '#f7f9f7',
                }, children: [hasMore && (_jsx("div", { style: { textAlign: 'center' }, children: _jsx(Button, { size: "small", type: "text", loading: loading && page > 1, onClick: () => loadMessages(page + 1, true), style: { color: '#4A6741', fontSize: 12 }, children: "\u52A0\u8F7D\u66F4\u65E9\u7684\u6D88\u606F" }) })), loading && page === 1 && (_jsx("div", { style: { textAlign: 'center', padding: '60px 0' }, children: _jsx(Spin, {}) })), !loading && messages.length === 0 && (_jsx(Empty, { description: "\u6682\u65E0\u6D88\u606F\uFF0C\u53D1\u4E2A\u62DB\u547C\u5427\uFF5E", style: { marginTop: 60 } })), messages.map((msg, idx) => {
                        const isMine = msg.senderId === user?.id;
                        // 2 分钟内可撤回（前端粗判）
                        const canRecall = isMine
                            && !msg.isRecalled
                            && (Date.now() - new Date(msg.createdAt).getTime()) < 120000;
                        // 日期标签：与上一条消息不同天时显示
                        const showDay = idx === 0 || !sameDay(messages[idx - 1].createdAt, msg.createdAt);
                        return (_jsxs(Fragment, { children: [showDay && (_jsx("div", { style: { textAlign: 'center' }, children: _jsx("span", { style: {
                                            fontSize: 11, color: '#aaa', background: '#e8e8e8',
                                            padding: '2px 10px', borderRadius: 10,
                                        }, children: formatDayLabel(msg.createdAt) }) })), _jsx(Bubble, { msg: msg, isMine: isMine, canRecall: canRecall, onRecall: handleRecall })] }, msg.id));
                    }), _jsx("div", { ref: bottomRef })] }), _jsxs("div", { style: {
                    padding: '10px 16px 12px',
                    borderTop: '1px solid #f0f0f0',
                    background: '#fff', flexShrink: 0,
                    display: 'flex', gap: 8, alignItems: 'flex-end',
                }, children: [_jsx(Input.TextArea, { value: inputText, onChange: (e) => setInputText(e.target.value), onPressEnter: (e) => {
                            if (!e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }, placeholder: "\u53D1\u6D88\u606F\u2026\uFF08Enter \u53D1\u9001\uFF0CShift+Enter \u6362\u884C\uFF09", autoSize: { minRows: 1, maxRows: 5 }, style: { flex: 1, borderRadius: 20, resize: 'none', fontSize: 14 }, disabled: sending }), _jsx(Button, { type: "primary", icon: _jsx(SendOutlined, {}), onClick: handleSend, loading: sending, disabled: !inputText.trim(), style: {
                            background: '#4A6741', borderColor: '#4A6741',
                            borderRadius: 20, height: 36, padding: '0 16px',
                        }, children: "\u53D1\u9001" })] })] }));
}
