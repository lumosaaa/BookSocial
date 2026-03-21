import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Typography, Button, Avatar, Tag, Divider, message } from 'antd';
import {
  ArrowLeftOutlined, HeartOutlined, HeartFilled,
  LockOutlined, UnlockOutlined, BookOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import type { ReadingNote } from '../../api/postApi';
import { getNote, toggleNoteLike } from '../../api/postApi';
import { useAuthStore } from '../../store/authStore';

const { Title, Text, Paragraph } = Typography;

const NotePage: React.FC = () => {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const { user }     = useAuthStore();

  const [note, setNote]    = useState<ReadingNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking]   = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getNote(+id)
      .then(setNote)
      .catch(() => navigate('/404', { replace: true }))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    if (liking || !note) return;
    setLiking(true);
    try {
      const res = await toggleNoteLike(note.id);
      setNote(n => n ? { ...n, isLiked: res.liked, likeCount: res.likeCount } : n);
    } catch {
      message.error('操作失败');
    } finally {
      setLiking(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <Spin size="large" />
    </div>
  );

  if (!note) return null;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 60px' }}>
      {/* 顶部返回 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0', gap: 12 }}>
        <ArrowLeftOutlined
          style={{ fontSize: 18, cursor: 'pointer' }}
          onClick={() => navigate(-1)}
        />
        <Title level={5} style={{ margin: 0 }}>阅读笔记</Title>
      </div>

      <div style={{
        background: '#fff', borderRadius: 12,
        padding: '24px', border: '1px solid #f0f0f0',
      }}>
        {/* 关联书籍 */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#f8f8f4', borderRadius: 8, padding: '10px 14px',
            marginBottom: 20, cursor: 'pointer',
          }}
          onClick={() => navigate(`/books/${note.bookId}`)}
        >
          {note.bookCoverUrl && (
            <img
              src={note.bookCoverUrl}
              alt={note.bookTitle}
              style={{ width: 36, height: 50, objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{note.bookTitle}</div>
            <div style={{ color: '#888', fontSize: 13 }}>{note.bookAuthor}</div>
          </div>
          <BookOutlined style={{ marginLeft: 'auto', color: '#4A6741', fontSize: 16 }} />
        </div>

        {/* 笔记标题 */}
        {note.title && (
          <Title level={4} style={{ marginBottom: 8 }}>{note.title}</Title>
        )}

        {/* 摘录 */}
        {note.quote && (
          <blockquote style={{
            borderLeft: '3px solid #4A6741',
            paddingLeft: 14, margin: '0 0 16px',
            color: '#555', fontStyle: 'italic', fontSize: 14,
          }}>
            {note.quote}
            {(note.pageNumber || note.chapter) && (
              <div style={{ marginTop: 4, fontSize: 12, color: '#aaa' }}>
                {note.chapter && `${note.chapter} · `}
                {note.pageNumber && `第${note.pageNumber}页`}
              </div>
            )}
          </blockquote>
        )}

        {/* Markdown 正文 */}
        <div
          className="markdown-body"
          style={{
            fontSize: 15, lineHeight: 1.8, color: '#333',
            /* prose 样式由全局 CSS 覆盖，此处保底 */
          }}
        >
          <ReactMarkdown>{note.content}</ReactMarkdown>
        </div>

        <Divider style={{ margin: '20px 0 14px' }} />

        {/* 作者行 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            src={note.avatarUrl}
            size={32}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/users/${note.userId}`)}
          />
          <div style={{ flex: 1 }}>
            <Text
              strong
              style={{ fontSize: 13, cursor: 'pointer' }}
              onClick={() => navigate(`/users/${note.userId}`)}
            >
              {note.username}
            </Text>
            <div style={{ color: '#aaa', fontSize: 11 }}>
              {new Date(note.createdAt).toLocaleString('zh-CN')}
            </div>
          </div>

          {/* 公私密标签 */}
          <Tag icon={note.isPublic ? <UnlockOutlined /> : <LockOutlined />} color={note.isPublic ? 'green' : 'default'}>
            {note.isPublic ? '公开' : '私密'}
          </Tag>

          {/* 点赞 */}
          <Button
            type="text"
            icon={note.isLiked ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
            onClick={handleLike}
            loading={liking}
          >
            {note.likeCount || ''}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotePage;
