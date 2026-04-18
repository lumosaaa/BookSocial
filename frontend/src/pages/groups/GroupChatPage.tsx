/**
 * GroupChatPage.tsx
 * 小组群聊页 · 仅成员可参与，消息实时推送
 */
import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar, Button, Empty, Input, Spin, Dropdown, MenuProps, message as antMsg,
} from 'antd';
import { ArrowLeftOutlined, SendOutlined, RollbackOutlined } from '@ant-design/icons';
import {
  getGroupMessages, sendGroupMessageHttp, recallGroupMessage,
  type GroupChatMessage,
} from '../../api/groupChatApi';
import { getGroup, type Group } from '../../api/groupApi';
import { useAuthStore } from '../../store/authStore';
import { useSocketStore } from '../../store/socketStore';
import { formatChatTime, formatDayLabel } from '../../utils/dateUtils';

const PAGE_SIZE = 30;

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export default function GroupChatPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const prevScrollH = useRef(0);

  const newGroupMessages = useSocketStore((s) => s.newGroupMessages);
  const sendSocket = useSocketStore((s) => s.sendGroupMessage);
  const recallSocket = useSocketStore((s) => s.recallGroupMessage);
  const joinRoom = useSocketStore((s) => s.joinGroupRoom);

  // 小组信息
  useEffect(() => {
    if (!groupId) return;
    getGroup(groupId)
      .then(setGroup)
      .catch(() => {
        antMsg.error('小组不存在或无法访问');
        navigate('/groups');
      });
  }, [groupId, navigate]);

  // 入场主动 join room（连接早于渲染时也能保证加入）
  useEffect(() => {
    if (group?.isMember) joinRoom(groupId);
  }, [group?.isMember, groupId, joinRoom]);

  const loadMessages = useCallback(async (pg: number, prepend = false) => {
    if (!groupId) return;
    if (prepend) prevScrollH.current = chatRef.current?.scrollHeight ?? 0;
    setLoading(true);
    try {
      const data = await getGroupMessages(groupId, pg, PAGE_SIZE);
      const sorted = [...data.list];
      if (prepend) {
        setMessages((prev) => [...sorted, ...prev]);
      } else {
        setMessages(sorted);
      }
      setHasMore(data.hasMore);
      setPage(pg);
    } catch (err: any) {
      antMsg.error(err?.response?.data?.message || '加载群聊失败');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (group?.isMember) loadMessages(1, false);
  }, [group?.isMember, loadMessages]);

  useEffect(() => {
    if (!loading && page === 1) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [loading, page]);

  useEffect(() => {
    if (page > 1 && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight - prevScrollH.current;
    }
  }, [messages, page]);

  // 接 socket 实时消息
  useEffect(() => {
    const incoming = newGroupMessages.filter((m) => m.groupId === groupId);
    if (!incoming.length) return;
    setMessages((prev) => {
      const existIds = new Set(prev.map((m) => m.id));
      const toAdd = incoming.filter((m) => !existIds.has(m.id));
      const recalls = incoming.filter((m) => m.isRecalled);
      let next = prev;
      if (toAdd.length) next = [...next, ...toAdd];
      if (recalls.length) {
        next = next.map((m) => {
          const recall = recalls.find((r) => r.id === m.id);
          return recall ? { ...m, isRecalled: true, content: '[消息已撤回]' } : m;
        });
      }
      return next;
    });
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [newGroupMessages, groupId]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending || !user) return;
    setSending(true);
    setInputText('');

    const optimistic: GroupChatMessage = {
      id: Date.now(),
      gcId: 0,
      groupId,
      senderId: user.id,
      senderName: user.username,
      senderAvatar: user.avatarUrl ?? null,
      content: text,
      msgType: 0,
      refBookId: null,
      isRecalled: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

    sendSocket(groupId, text, 0, async (ack) => {
      if (ack.ok && ack.message) {
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? ack.message! : m)));
      } else {
        try {
          const real = await sendGroupMessageHttp(groupId, { content: text, msgType: 0 });
          setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? real : m)));
        } catch (err: any) {
          antMsg.error(err?.response?.data?.message || '发送失败');
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          setInputText(text);
        }
      }
      setSending(false);
    });
  };

  const handleRecall = (messageId: number) => {
    recallSocket(messageId, async (ack) => {
      if (ack.ok) {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, isRecalled: true, content: '[消息已撤回]' } : m));
        antMsg.success('已撤回');
      } else {
        try {
          await recallGroupMessage(groupId, messageId);
          setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, isRecalled: true, content: '[消息已撤回]' } : m));
          antMsg.success('已撤回');
        } catch (err: any) {
          antMsg.error(err?.response?.data?.message || '撤回失败');
        }
      }
    });
  };

  const header = useMemo(() => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 16px', height: 54, borderBottom: '1px solid #f0f0f0',
      background: '#fff', flexShrink: 0,
    }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/groups/${groupId}`)} style={{ color: '#666', padding: '0 4px' }} />
      <span style={{ fontWeight: 600, fontSize: 16, color: '#333', flex: 1 }}>
        {group ? `群聊 · ${group.name}` : '群聊'}
      </span>
      {group && (
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {group.memberCount} 位成员
        </span>
      )}
    </div>
  ), [group, groupId, navigate]);

  if (!group) {
    return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>;
  }

  if (!group.isMember) {
    return (
      <div style={{ maxWidth: 640, margin: '48px auto', padding: 32, textAlign: 'center', background: '#fff', borderRadius: 12 }}>
        <h3>仅小组成员可参与群聊</h3>
        <p style={{ color: 'var(--color-text-secondary)' }}>加入「{group.name}」后即可进入群聊。</p>
        <Button type="primary" onClick={() => navigate(`/groups/${groupId}`)}>
          返回小组
        </Button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      maxWidth: 820, margin: '0 auto',
      background: '#fff', boxShadow: '0 0 12px rgba(0,0,0,0.06)',
    }}>
      {header}

      <div
        ref={chatRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop < 60 && hasMore && !loading) {
            loadMessages(page + 1, true);
          }
        }}
        style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 8, background: '#f7f9f7',
        }}
      >
        {hasMore && loading && page > 1 && (
          <div style={{ textAlign: 'center' }}><Spin size="small" /></div>
        )}
        {loading && page === 1 && (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
        )}
        {!loading && messages.length === 0 && (
          <Empty description="还没有人发言，来说点什么吧~" style={{ marginTop: 60 }} />
        )}

        {messages.map((msg, idx) => {
          const isMine = msg.senderId === user?.id;
          const canRecall = isMine && !msg.isRecalled && (Date.now() - new Date(msg.createdAt).getTime()) < 120_000;
          const prev = idx > 0 ? messages[idx - 1] : null;
          const showDay = idx === 0 || !sameDay(messages[idx - 1].createdAt, msg.createdAt);
          const showHeader = !prev || prev.senderId !== msg.senderId || showDay;

          const menuItems: MenuProps['items'] = canRecall
            ? [{ key: 'recall', label: '撤回', icon: <RollbackOutlined />, danger: true }]
            : [];

          const bubble = (
            <div style={{
              maxWidth: '70%',
              padding: '8px 12px',
              background: msg.isRecalled ? 'transparent' : isMine ? '#4A6741' : '#fff',
              color: msg.isRecalled ? '#bbb' : isMine ? '#fff' : '#333',
              borderRadius: isMine ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
              boxShadow: msg.isRecalled ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
              fontStyle: msg.isRecalled ? 'italic' : 'normal',
              border: msg.isRecalled ? '1px dashed #ddd' : 'none',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontSize: 14, lineHeight: 1.6,
            }}>
              {msg.isRecalled ? '消息已撤回' : msg.content}
            </div>
          );

          return (
            <Fragment key={msg.id}>
              {showDay && (
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: '#aaa', background: '#e8e8e8', padding: '2px 10px', borderRadius: 10 }}>
                    {formatDayLabel(msg.createdAt)}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}>
                {showHeader ? (
                  <Avatar size={36} src={msg.senderAvatar || undefined} style={{ background: '#4A6741', flexShrink: 0 }}>
                    {msg.senderName[0]?.toUpperCase()}
                  </Avatar>
                ) : <div style={{ width: 36, flexShrink: 0 }} />}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: 2, maxWidth: '75%' }}>
                  {showHeader && !isMine && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{msg.senderName}</span>
                  )}
                  {menuItems.length > 0 ? (
                    <Dropdown menu={{ items: menuItems, onClick: ({ key }) => key === 'recall' && handleRecall(msg.id) }} trigger={['contextMenu']}>
                      {bubble}
                    </Dropdown>
                  ) : bubble}
                  <span style={{ fontSize: 10, color: '#bbb' }}>{formatChatTime(msg.createdAt)}</span>
                </div>
              </div>
            </Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 16px 12px', borderTop: '1px solid #f0f0f0', background: '#fff', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <Input.TextArea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="在群里说点什么…（Enter 发送，Shift+Enter 换行）"
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
          style={{ background: '#4A6741', borderColor: '#4A6741', borderRadius: 20, height: 36, padding: '0 16px' }}
        >
          发送
        </Button>
      </div>
    </div>
  );
}
