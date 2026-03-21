import React, { useState } from 'react';
import { Avatar, Image, Rate, Tag, Tooltip, Typography, Dropdown, message } from 'antd';
import {
  HeartOutlined, HeartFilled,
  MessageOutlined, StarOutlined, StarFilled,
  RetweetOutlined, EllipsisOutlined,
  EyeInvisibleOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Post } from '../api/postApi';
import { togglePostLike, bookmarkPost, unbookmark, deletePost } from '../api/postApi';
import { useAuthStore } from '../store/authStore';

const { Paragraph, Text } = Typography;

interface Props {
  post: Post;
  readonly?: boolean;          // 只展示，不含互动操作栏（转发原帖用）
  hideCommentEntry?: boolean;  // 详情页内嵌时隐藏评论入口
  onDeleted?: (id: number) => void;
  onCommentClick?: (post: Post) => void;
}

const POST_TYPE_COLOR: Record<number, string> = {
  0: 'default', 1: 'blue', 2: 'green', 3: 'orange', 4: 'purple',
};
const POST_TYPE_LABEL: Record<number, string> = {
  0: '动态', 1: '书评', 2: '阅读笔记', 3: '书单', 4: '进度更新',
};

const PostCard: React.FC<Props> = ({
  post: initialPost,
  readonly = false,
  hideCommentEntry = false,
  onDeleted,
  onCommentClick,
}) => {
  const navigate         = useNavigate();
  const { user }         = useAuthStore();
  const [post, setPost]  = useState(initialPost);
  const [spoilerVisible, setSpoilerVisible] = useState(!post.hasSpoiler);

  // ── 点赞 ──────────────────────────────────────────────────
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try {
      const res = await togglePostLike(post.id);
      setPost(p => ({ ...p, isLiked: res.liked, likeCount: res.likeCount }));
    } catch {
      message.error('操作失败');
    }
  };

  // ── 收藏 ──────────────────────────────────────────────────
  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try {
      if (post.isBookmarked) {
        // 注意：真实场景需要传 bookmarkId，此处简化为按 postId 反查
        // 可以在 post 对象上缓存 bookmarkId，这里用服务端重新查询的方式兼容
        message.info('请到"我的收藏"页面取消收藏');
      } else {
        await bookmarkPost(post.id);
        setPost(p => ({ ...p, isBookmarked: true, bookmarkCount: p.bookmarkCount + 1 }));
        message.success('已收藏');
      }
    } catch (err: any) {
      if (err?.response?.data?.code === 409) {
        setPost(p => ({ ...p, isBookmarked: true }));
      } else {
        message.error('操作失败');
      }
    }
  };

  // ── 删除 ──────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await deletePost(post.id);
      message.success('已删除');
      onDeleted?.(post.id);
    } catch {
      message.error('删除失败');
    }
  };

  // ── 更多操作菜单 ──────────────────────────────────────────
  const menuItems = [
    ...(user?.id === post.userId
      ? [{ key: 'delete', label: '删除', danger: true, onClick: handleDelete }]
      : [{ key: 'report', label: '举报', icon: <WarningOutlined />, onClick: () => navigate(`/report?targetId=${post.id}&targetType=1`) }]
    ),
  ];

  return (
    <div
      className="post-card"
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '16px',
        marginBottom: 12,
        cursor: readonly ? 'default' : 'pointer',
        border: '1px solid #f0f0f0',
      }}
      onClick={() => !readonly && navigate(`/posts/${post.id}`)}
    >
      {/* ── 作者行 ── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <Avatar
          src={post.avatarUrl}
          size={38}
          style={{ cursor: 'pointer', flexShrink: 0 }}
          onClick={e => { e?.stopPropagation(); navigate(`/users/${post.userId}`); }}
        />
        <div style={{ marginLeft: 10, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text
              strong
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); navigate(`/users/${post.userId}`); }}
            >
              {post.username}
            </Text>
            <Tag color={POST_TYPE_COLOR[post.postType]} style={{ fontSize: 11 }}>
              {POST_TYPE_LABEL[post.postType]}
            </Tag>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(post.createdAt).toLocaleString('zh-CN', {
              month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </div>
        {!readonly && (
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <EllipsisOutlined
              style={{ fontSize: 18, color: '#999', cursor: 'pointer' }}
              onClick={e => e.stopPropagation()}
            />
          </Dropdown>
        )}
      </div>

      {/* ── 关联书籍 ── */}
      {post.book && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#fafafa', borderRadius: 8, padding: '8px 10px',
            marginBottom: 10, cursor: 'pointer',
          }}
          onClick={e => { e.stopPropagation(); navigate(`/books/${post.bookId}`); }}
        >
          {post.book.coverUrl && (
            <img
              src={post.book.coverUrl}
              alt={post.book.title}
              style={{ width: 32, height: 44, objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{post.book.title}</div>
            <div style={{ color: '#888', fontSize: 12 }}>{post.book.author}</div>
          </div>
          {post.postType === 1 && post.rating != null && (
            <div style={{ marginLeft: 'auto' }}>
              <Rate disabled value={post.rating / 2} allowHalf style={{ fontSize: 14 }} />
              <Text style={{ fontSize: 12, marginLeft: 4 }}>{(post.rating / 2).toFixed(1)}</Text>
            </div>
          )}
        </div>
      )}

      {/* ── 正文 ── */}
      {post.hasSpoiler && !spoilerVisible ? (
        <div
          style={{
            background: '#f5f5f5', borderRadius: 8, padding: '12px',
            textAlign: 'center', cursor: 'pointer', color: '#888',
          }}
          onClick={e => { e.stopPropagation(); setSpoilerVisible(true); }}
        >
          <EyeInvisibleOutlined /> &nbsp;含剧透，点击展开
        </div>
      ) : (
        <Paragraph
          ellipsis={readonly ? { rows: 3, expandable: false } : { rows: 6, expandable: true, symbol: '展开' }}
          style={{ marginBottom: post.images.length ? 10 : 0, whiteSpace: 'pre-wrap' }}
        >
          {post.content}
        </Paragraph>
      )}

      {/* ── 图片网格 ── */}
      {post.images.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: post.images.length === 1 ? '1fr' : 'repeat(3, 1fr)',
            gap: 4,
            marginBottom: 10,
          }}
          onClick={e => e.stopPropagation()}
        >
          <Image.PreviewGroup>
            {post.images.map((img, idx) => (
              <Image
                key={idx}
                src={img.thumbnailUrl || img.url}
                style={{
                  width: '100%',
                  aspectRatio: post.images.length === 1 ? '16/9' : '1',
                  objectFit: 'cover',
                  borderRadius: 6,
                }}
              />
            ))}
          </Image.PreviewGroup>
        </div>
      )}

      {/* ── 转发原帖 ── */}
      {post.originPost && (
        <div
          style={{
            background: '#f9f9f9', border: '1px solid #eee',
            borderRadius: 8, padding: '10px 12px', marginBottom: 10,
          }}
          onClick={e => { e.stopPropagation(); navigate(`/posts/${post.originPostId}`); }}
        >
          <Text style={{ fontSize: 12, color: '#888' }}>@{post.originPost.username}</Text>
          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{ marginBottom: 0, fontSize: 13, color: '#444' }}
          >
            {post.originPost.isDeleted ? '原帖已删除' : post.originPost.content}
          </Paragraph>
        </div>
      )}

      {/* ── 互动操作栏 ── */}
      {!readonly && (
        <div
          style={{
            display: 'flex', gap: 20, paddingTop: 10,
            borderTop: '1px solid #f5f5f5', marginTop: 6,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* 点赞 */}
          <span
            style={{ cursor: 'pointer', color: post.isLiked ? '#ff4d4f' : '#888', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={handleLike}
          >
            {post.isLiked ? <HeartFilled /> : <HeartOutlined />}
            <span style={{ fontSize: 13 }}>{post.likeCount || ''}</span>
          </span>

          {/* 评论 */}
          {!hideCommentEntry && (
            <span
              style={{ cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => onCommentClick ? onCommentClick(post) : navigate(`/posts/${post.id}#comments`)}
            >
              <MessageOutlined />
              <span style={{ fontSize: 13 }}>{post.commentCount || ''}</span>
            </span>
          )}

          {/* 收藏 */}
          <span
            style={{ cursor: 'pointer', color: post.isBookmarked ? '#faad14' : '#888', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={handleBookmark}
          >
            {post.isBookmarked ? <StarFilled /> : <StarOutlined />}
            <span style={{ fontSize: 13 }}>{post.bookmarkCount || ''}</span>
          </span>

          {/* 转发 */}
          <span
            style={{ cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => navigate(`/posts/${post.id}?action=share`)}
          >
            <RetweetOutlined />
            <span style={{ fontSize: 13 }}>{post.shareCount || ''}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default PostCard;
