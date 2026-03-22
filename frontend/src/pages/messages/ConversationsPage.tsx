// frontend/src/pages/messages/ConversationsPage.tsx
// M4 · 私信会话列表页
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Avatar, Badge, Empty, Spin, Typography, Tag } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { getConversations } from '../../api/messageApi';
import type { Conversation } from '../../api/messageApi';
import { useSocketStore } from '../../store/socketStore';
import { formatDistanceToNow } from '../../utils/dateUtils';

const { Text, Title } = Typography;

export default function ConversationsPage() {
  const navigate   = useNavigate();
  const [convs, setConvs]   = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);

  // 当有新消息时刷新列表
  const newMessages = useSocketStore((s) => s.newMessages);
  const clearNewMessages = useSocketStore((s) => s.clearNewMessages);

  const fetchConvs = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const data = await getConversations(p, 20);
      setConvs(p === 1 ? data.list : (prev) => [...prev, ...data.list]);
      setTotal(data.total);
      setPage(p);
    } catch {
      // 错误由全局拦截器处理
    } finally {
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

  const renderLastMsg = (conv: Conversation) => {
    if (!conv.lastContent) return <Text type="secondary" italic>暂无消息，发个招呼吧</Text>;
    const prefix = conv.lastSenderId !== conv.other.id ? '我: ' : '';
    const text   = conv.lastContent.length > 24 ? conv.lastContent.slice(0, 24) + '…' : conv.lastContent;
    return <Text type="secondary">{prefix}{text}</Text>;
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
      <Title level={4} style={{ marginBottom: 20 }}>
        <MessageOutlined style={{ marginRight: 8, color: '#4A6741' }} />
        私信
      </Title>

      {loading && convs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
      ) : convs.length === 0 ? (
        <Empty description="还没有私信，去认识书友吧～" />
      ) : (
        <List
          dataSource={convs}
          loadMore={
            convs.length < total ? (
              <div style={{ textAlign: 'center', padding: 16 }}>
                <Text
                  style={{ cursor: 'pointer', color: '#4A6741' }}
                  onClick={() => fetchConvs(page + 1)}
                >
                  加载更多
                </Text>
              </div>
            ) : null
          }
          renderItem={(conv) => (
            <List.Item
              key={conv.id}
              style={{ cursor: 'pointer', padding: '12px 8px', borderRadius: 8 }}
              onClick={() => navigate(`/messages/${conv.id}`)}
              className="conv-item"
            >
              <List.Item.Meta
                avatar={
                  <Badge count={conv.unreadCount} offset={[-4, 4]}>
                    <Avatar
                      src={conv.other.avatarUrl}
                      size={46}
                      style={{ backgroundColor: '#4A6741' }}
                    >
                      {conv.other.username[0]}
                    </Avatar>
                  </Badge>
                }
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: conv.unreadCount > 0 ? 600 : 400 }}>
                      {conv.other.username}
                    </span>
                    {conv.isBlocked && <Tag color="red" style={{ fontSize: 11 }}>已屏蔽</Tag>}
                  </div>
                }
                description={renderLastMsg(conv)}
              />
              <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                {conv.lastMessageAt ? formatDistanceToNow(conv.lastMessageAt) : ''}
              </Text>
            </List.Item>
          )}
        />
      )}

      <style>{`
        .conv-item:hover { background: #f5f7f5; }
      `}</style>
    </div>
  );
}
