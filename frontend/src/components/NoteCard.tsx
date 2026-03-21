import React from 'react';
import { Avatar, Tag, Typography } from 'antd';
import { HeartOutlined, LockOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ReadingNote } from '../api/postApi';

const { Text, Paragraph } = Typography;

interface Props {
  note: ReadingNote;
}

const NoteCard: React.FC<Props> = ({ note }) => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 10,
        border: '1px solid #f0f0f0',
        cursor: 'pointer',
      }}
      onClick={() => navigate(`/reading-notes/${note.id}`)}
    >
      {/* 标题行 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          {note.title && (
            <Text strong style={{ fontSize: 14 }}>{note.title}</Text>
          )}
          {!note.isPublic && (
            <Tag icon={<LockOutlined />} color="default" style={{ marginLeft: 6, fontSize: 11 }}>
              私密
            </Tag>
          )}
        </div>
        <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
          {new Date(note.createdAt).toLocaleDateString('zh-CN')}
        </Text>
      </div>

      {/* 正文预览 */}
      <Paragraph
        ellipsis={{ rows: 3 }}
        style={{ margin: '0 0 8px', fontSize: 13, color: '#444', whiteSpace: 'pre-wrap' }}
      >
        {note.content}
      </Paragraph>

      {/* 摘录 */}
      {note.quote && (
        <div style={{
          borderLeft: '3px solid #4A6741',
          paddingLeft: 10,
          color: '#777',
          fontSize: 12,
          fontStyle: 'italic',
          marginBottom: 8,
          overflow: 'hidden',
          maxHeight: 36,
        }}>
          {note.quote}
        </div>
      )}

      {/* 底部：书籍 + 点赞 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {note.bookTitle && (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#888', fontSize: 12 }}
            onClick={e => { e.stopPropagation(); navigate(`/books/${note.bookId}`); }}
          >
            <BookOutlined />
            <span>{note.bookTitle}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#bbb', fontSize: 12 }}>
          <HeartOutlined />
          {note.likeCount > 0 && <span>{note.likeCount}</span>}
        </div>
      </div>
    </div>
  );
};

export default NoteCard;
