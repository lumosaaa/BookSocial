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

import {
  useState, useEffect, useRef, useCallback, Fragment,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Input, Button, Avatar, Tooltip, Spin, Empty,
  message as antMsg, Dropdown, MenuProps,
} from 'antd';
import {
  ArrowLeftOutlined, SendOutlined,
  EllipsisOutlined, RollbackOutlined, ReadOutlined,
} from '@ant-design/icons';

import {
  getMessages, recallMessage, sendMessageHttp,
  Message,
} from '../../api/messageApi';
import { useSocketStore } from '../../store/socketStore';
import { useAuthStore }   from '../../store/authStore';
import { formatChatTime, formatDayLabel } from '../../utils/dateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// 常量 & 工具
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 30;

/** 是否在同一天（用于渲染日期分组标签） */
function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// ─────────────────────────────────────────────────────────────────────────────
// 气泡子组件
// ─────────────────────────────────────────────────────────────────────────────
interface BubbleProps {
  msg: Message;
  isMine: boolean;
  canRecall: boolean;               // 是否在 2 分钟内（前端粗判，后端再核验）
  onRecall: (id: number) => void;
}

function Bubble({ msg, isMine, canRecall, onRecall }: BubbleProps) {
  const menuItems: MenuProps['items'] = canRecall
    ? [{ key: 'recall', label: '撤回', icon: <RollbackOutlined />, danger: true }]
    : [];

  const bubbleContent = msg.isRecalled ? (
    <span style={{ color: '#bbb', fontStyle: 'italic', fontSize: 13 }}>消息已撤回</span>
  ) : msg.msgType === 1 ? (
    // 图片消息
    <img
      src={msg.content}
      alt="图片"
      style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, display: 'block', cursor: 'zoom-in' }}
      onClick={() => window.open(msg.content, '_blank')}
    />
  ) : msg.msgType === 2 ? (
    // 书籍分享卡（仅展示文字占位，book 详情可按 refBookId 查询）
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: isMine ? 'rgba(255,255,255,0.15)' : '#f5f5f5',
      padding: '8px 10px', borderRadius: 8, minWidth: 160,
    }}>
      <ReadOutlined style={{ fontSize: 20, flexShrink: 0, color: isMine ? '#fff' : '#4A6741' }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>书籍分享</div>
        <div style={{ fontSize: 11, opacity: 0.7 }}>ID: {msg.refBookId}</div>
      </div>
    </div>
  ) : (
    // 普通文字，支持换行
    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</span>
  );

  const bubble = (
    <div style={{
      maxWidth: '65%',
      padding: msg.msgType === 1 ? 4 : '8px 14px',
      background:   msg.isRecalled ? 'transparent' : isMine ? '#4A6741' : '#fff',
      color:        msg.isRecalled ? undefined : isMine ? '#fff' : '#333',
      borderRadius: isMine ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
      boxShadow:    msg.isRecalled ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
      fontSize: 14, lineHeight: 1.6,
      border: msg.isRecalled ? '1px dashed #ddd' : 'none',
    }}>
      {bubbleContent}
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMine ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
    }}>
      {/* 头像 */}
      <Avatar
        size={36}
        src={msg.senderAvatar || undefined}
        style={{ background: '#4A6741', flexShrink: 0, alignSelf: 'flex-end' }}
      >
        {msg.senderName[0]?.toUpperCase()}
      </Avatar>

      {/* 气泡 + 时间 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMine ? 'flex-end' : 'flex-start',
        gap: 2, maxWidth: '70%',
      }}>
        {menuItems.length > 0 && !msg.isRecalled ? (
          <Dropdown menu={{ items: menuItems, onClick: ({ key }) => key === 'recall' && onRecall(msg.id) }} trigger={['contextMenu']}>
            {bubble}
          </Dropdown>
        ) : bubble}
        <span style={{ fontSize: 10, color: '#bbb' }}>{formatChatTime(msg.createdAt)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatPage
// ─────────────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { id: convIdStr } = useParams<{ id: string }>();
  const convId    = Number(convIdStr);
  const navigate  = useNavigate();
  const { user }  = useAuthStore();

  // ── 消息列表状态 ─────────────────────────────────────────────────────────
  const [messages, setMessages]   = useState<Message[]>([]);
  const [loading, setLoading]     = useState(true);
  const [hasMore, setHasMore]     = useState(false);
  const [page, setPage]           = useState(1);
  const [peerName, setPeerName]   = useState('');  // 从会话列表带过来也行，但这里从 msg 推断

  // ── 输入状态 ─────────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [sending, setSending]     = useState(false);

  // ── DOM 引用 ─────────────────────────────────────────────────────────────
  const bottomRef   = useRef<HTMLDivElement>(null);
  const chatRef     = useRef<HTMLDivElement>(null);
  const prevScrollH = useRef<number>(0);      // 加载更多前的 scrollHeight，用于保持位置

  // ── Socket Store ─────────────────────────────────────────────────────────
  const newMessages      = useSocketStore((s) => s.newMessages);
  const clearNewMessages = useSocketStore((s) => s.clearNewMessages);
  const sendSocketMsg    = useSocketStore((s) => s.sendMessage);
  const recallSocketMsg  = useSocketStore((s) => s.recallMessage);

  // ── 加载消息（首次 or 加载更多） ─────────────────────────────────────────
  const loadMessages = useCallback(async (pg: number, prepend = false) => {
    if (!convId) return;
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
      } else {
        setMessages(sorted);
      }
      setHasMore(data.hasMore);
      setPage(pg);

      // 推断对方姓名（取第一条不是自己发的消息的 senderName）
      if (!peerName) {
        const peerMsg = data.list.find((m) => m.senderId !== user?.id);
        if (peerMsg) setPeerName(peerMsg.senderName);
      }
    } catch (err: any) {
      antMsg.error(err.message || '加载消息失败');
    } finally {
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
    if (incoming.length === 0) return;

    setMessages((prev) => {
      // 去重（自己发的消息 ack 后已追加，避免重复）
      const existIds = new Set(prev.map((m) => m.id));
      const toAdd    = incoming.filter((m) => !existIds.has(m.id));
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
    });

    clearNewMessages();
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [newMessages, convId, clearNewMessages]);

  // ── 发送消息 ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending || !user) return;

    setSending(true);
    setInputText('');

    // 乐观更新：先本地追加一条"发送中"的消息
    const optimistic: Message = {
      id:             Date.now(),   // 临时 id（负数也行，但 Date.now 够用）
      conversationId: convId,
      senderId:       user.id,
      senderName:     user.username,
      senderAvatar:   user.avatarUrl ?? null,
      content:        text,
      msgType:        0,
      refBookId:      null,
      isRecalled:     false,
      isRead:         false,
      readAt:         null,
      createdAt:      new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

    // Socket 主通道
    sendSocketMsg(convId, text, 0, async (ack) => {
      if (ack.ok && ack.message) {
        // 替换乐观消息为真实消息
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? ack.message! : m))
        );
      } else {
        // Socket 失败，尝试 HTTP 降级
        try {
          const real = await sendMessageHttp(convId, { content: text, msgType: 0 });
          setMessages((prev) =>
            prev.map((m) => (m.id === optimistic.id ? real : m))
          );
        } catch (httpErr: any) {
          antMsg.error(httpErr.message || '消息发送失败');
          // 移除乐观消息
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          setInputText(text);   // 还原输入
        }
      }
      setSending(false);
    });
  };

  // ── 撤回消息 ─────────────────────────────────────────────────────────────
  const handleRecall = (messageId: number) => {
    // Socket 通道撤回
    recallSocketMsg(messageId, async (ack) => {
      if (ack.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, isRecalled: true, content: '[消息已撤回]' }
              : m
          )
        );
        antMsg.success('消息已撤回');
      } else {
        // HTTP 降级
        try {
          await recallMessage(convId, messageId);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, isRecalled: true, content: '[消息已撤回]' }
                : m
            )
          );
          antMsg.success('消息已撤回');
        } catch (err: any) {
          antMsg.error(err.message || '撤回失败');
        }
      }
    });
  };

  // ── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      maxWidth: 780, margin: '0 auto',
      background: '#fff',
      boxShadow: '0 0 12px rgba(0,0,0,0.06)',
    }}>
      {/* ── 顶栏 ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 16px', height: 54,
        borderBottom: '1px solid #f0f0f0',
        background: '#fff', flexShrink: 0,
      }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/messages')}
          style={{ color: '#666', padding: '0 4px' }}
        />
        <span style={{ fontWeight: 600, fontSize: 16, color: '#333', flex: 1 }}>
          {peerName || '私信'}
        </span>
      </div>

      {/* ── 消息区 ── */}
      <div
        ref={chatRef}
        style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 12,
          background: '#f7f9f7',
        }}
      >
        {/* 加载更多 */}
        {hasMore && (
          <div style={{ textAlign: 'center' }}>
            <Button
              size="small" type="text"
              loading={loading && page > 1}
              onClick={() => loadMessages(page + 1, true)}
              style={{ color: '#4A6741', fontSize: 12 }}
            >
              加载更早的消息
            </Button>
          </div>
        )}

        {/* 初次加载 */}
        {loading && page === 1 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin /></div>
        )}

        {/* 空会话 */}
        {!loading && messages.length === 0 && (
          <Empty description="暂无消息，发个招呼吧～" style={{ marginTop: 60 }} />
        )}

        {/* 消息列表（含日期分组） */}
        {messages.map((msg, idx) => {
          const isMine = msg.senderId === user?.id;
          // 2 分钟内可撤回（前端粗判）
          const canRecall = isMine
            && !msg.isRecalled
            && (Date.now() - new Date(msg.createdAt).getTime()) < 120_000;

          // 日期标签：与上一条消息不同天时显示
          const showDay = idx === 0 || !sameDay(messages[idx - 1].createdAt, msg.createdAt);

          return (
            <Fragment key={msg.id}>
              {showDay && (
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: 11, color: '#aaa', background: '#e8e8e8',
                    padding: '2px 10px', borderRadius: 10,
                  }}>
                    {formatDayLabel(msg.createdAt)}
                  </span>
                </div>
              )}
              <Bubble
                msg={msg}
                isMine={isMine}
                canRecall={canRecall}
                onRecall={handleRecall}
              />
            </Fragment>
          );
        })}

        {/* 底部锚点（用于自动滚到最新） */}
        <div ref={bottomRef} />
      </div>

      {/* ── 输入区 ── */}
      <div style={{
        padding: '10px 16px 12px',
        borderTop: '1px solid #f0f0f0',
        background: '#fff', flexShrink: 0,
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <Input.TextArea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="发消息…（Enter 发送，Shift+Enter 换行）"
          autoSize={{ minRows: 1, maxRows: 5 }}
          style={{ flex: 1, borderRadius: 20, resize: 'none', fontSize: 14 }}
          disabled={sending}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={sending}
          disabled={!inputText.trim()}
          style={{
            background: '#4A6741', borderColor: '#4A6741',
            borderRadius: 20, height: 36, padding: '0 16px',
          }}
        >
          发送
        </Button>
      </div>
    </div>
  );
}
