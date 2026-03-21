import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, Button, Input, Modal, message, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { Post } from '../../api/postApi';
import { getPost, sharePost } from '../../api/postApi';
import PostCard from '../../components/PostCard';
import CommentSection from '../../components/CommentSection';
import { useAuthStore } from '../../store/authStore';

const { TextArea } = Input;
const { Title } = Typography;

const PostDetailPage: React.FC = () => {
  const { id }                      = useParams<{ id: string }>();
  const navigate                    = useNavigate();
  const [searchParams]              = useSearchParams();
  const { user }                    = useAuthStore();

  const [post, setPost]             = useState<Post | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);

  // 转发弹窗
  const [shareOpen, setShareOpen]   = useState(false);
  const [shareContent, setShareContent] = useState('');
  const [sharing, setSharing]       = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPost(+id)
      .then(setPost)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    // 若 URL 带 ?action=share，自动打开转发弹窗
    if (searchParams.get('action') === 'share') setShareOpen(true);
  }, [id]);

  const handleShare = async () => {
    if (!user) { navigate('/login'); return; }
    setSharing(true);
    try {
      await sharePost(+id!, shareContent.trim() || undefined);
      message.success('转发成功！');
      setShareOpen(false);
      setShareContent('');
    } catch {
      message.error('转发失败');
    } finally {
      setSharing(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <Spin size="large" />
    </div>
  );

  if (notFound || !post) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
      帖子不存在或已被删除
      <br />
      <Button type="link" onClick={() => navigate(-1)}>返回上一页</Button>
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 40px' }}>
      {/* 顶部返回 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0', gap: 12 }}>
        <ArrowLeftOutlined
          style={{ fontSize: 18, cursor: 'pointer' }}
          onClick={() => navigate(-1)}
        />
        <Title level={5} style={{ margin: 0 }}>动态详情</Title>
      </div>

      {/* 帖子内容（不展示评论入口，由下方 CommentSection 负责） */}
      <PostCard
        post={post}
        hideCommentEntry
        onDeleted={() => { message.success('已删除'); navigate(-1); }}
      />

      {/* 评论区 */}
      <div style={{
        background: '#fff', borderRadius: 12,
        padding: '16px', marginTop: 8,
        border: '1px solid #f0f0f0',
      }}>
        <CommentSection postId={post.id} />
      </div>

      {/* 转发弹窗 */}
      <Modal
        open={shareOpen}
        title="转发"
        onCancel={() => setShareOpen(false)}
        onOk={handleShare}
        confirmLoading={sharing}
        okText="转发"
      >
        <TextArea
          value={shareContent}
          onChange={e => setShareContent(e.target.value)}
          placeholder="说点什么...（可选）"
          autoSize={{ minRows: 3, maxRows: 6 }}
          maxLength={500}
          showCount
          style={{ marginBottom: 12 }}
        />
        {/* 转发预览原帖 */}
        <div style={{
          background: '#f9f9f9', border: '1px solid #eee',
          borderRadius: 8, padding: '10px 12px',
        }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
            @{post.username}
          </div>
          <div style={{ fontSize: 13, color: '#444', overflow: 'hidden', maxHeight: 80 }}>
            {post.content}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PostDetailPage;
