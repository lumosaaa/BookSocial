import React, { useState, useEffect } from 'react';
import { Avatar, Button, Input, List, Typography, message, Spin } from 'antd';
import { HeartOutlined, HeartFilled, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Comment } from '../api/postApi';
import {
  getPostComments, createComment, deleteComment,
  toggleCommentLike, getReplies,
} from '../api/postApi';
import { useAuthStore } from '../store/authStore';

const { Text } = Typography;
const { TextArea } = Input;

interface Props {
  postId: number;
}

const CommentSection: React.FC<Props> = ({ postId }) => {
  const navigate = useNavigate();
  const { user }  = useAuthStore();

  const [comments, setComments]         = useState<Comment[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  // 顶层评论输入框
  const [topContent, setTopContent]     = useState('');
  // 回复状态：{ commentId, username }
  const [replyTarget, setReplyTarget]   = useState<{ id: number; username: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // 已展开子评论的根评论 ID 集合
  const [expandedRoots, setExpandedRoots] = useState<Set<number>>(new Set());
  const [repliesMap, setRepliesMap]        = useState<Record<number, Comment[]>>({});

  // ── 加载评论 ──────────────────────────────────────────────
  const loadComments = async (p = 1, append = false) => {
    setLoading(true);
    try {
      const res = await getPostComments(postId, p);
      setComments(prev => append ? [...prev, ...res.list] : res.list);
      setTotal(res.total);
      setHasMore(res.hasMore);
      setPage(p);
    } catch {
      message.error('加载评论失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadComments(1); }, [postId]);

  // ── 展开子评论 ────────────────────────────────────────────
  const handleExpandReplies = async (rootId: number) => {
    if (expandedRoots.has(rootId)) {
      const next = new Set(expandedRoots);
      next.delete(rootId);
      setExpandedRoots(next);
      return;
    }
    try {
      const list = await getReplies(rootId);
      setRepliesMap(prev => ({ ...prev, [rootId]: list }));
      setExpandedRoots(prev => new Set(prev).add(rootId));
    } catch {
      message.error('加载回复失败');
    }
  };

  // ── 发表顶层评论 ──────────────────────────────────────────
  const handleTopSubmit = async () => {
    if (!user) { navigate('/login'); return; }
    if (!topContent.trim()) return;
    setSubmitting(true);
    try {
      const comment = await createComment(postId, { content: topContent.trim() });
      setComments(prev => [comment, ...prev]);
      setTotal(t => t + 1);
      setTopContent('');
      message.success('评论成功');
    } catch {
      message.error('发表失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 发表回复 ──────────────────────────────────────────────
  const handleReplySubmit = async (parentId: number, rootId: number) => {
    if (!user) { navigate('/login'); return; }
    if (!replyContent.trim()) return;
    setSubmitting(true);
    try {
      const comment = await createComment(postId, {
        content:  replyContent.trim(),
        parentId,
      });
      // 追加到子评论列表
      setRepliesMap(prev => ({
        ...prev,
        [rootId]: [...(prev[rootId] || []), comment],
      }));
      // 更新根评论的 replyCount
      setComments(prev =>
        prev.map(c => c.id === rootId ? { ...c, replyCount: c.replyCount + 1 } : c)
      );
      setReplyTarget(null);
      setReplyContent('');
      message.success('回复成功');
    } catch {
      message.error('回复失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 点赞评论 ──────────────────────────────────────────────
  const handleLikeComment = async (comment: Comment, isReply = false, rootId?: number) => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await toggleCommentLike(comment.id);
      const update = (c: Comment) =>
        c.id === comment.id ? { ...c, isLiked: res.liked, likeCount: res.likeCount } : c;

      if (isReply && rootId !== undefined) {
        setRepliesMap(prev => ({
          ...prev,
          [rootId]: (prev[rootId] || []).map(update),
        }));
      } else {
        setComments(prev => prev.map(update));
      }
    } catch {
      message.error('操作失败');
    }
  };

  // ── 删除评论 ──────────────────────────────────────────────
  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteComment(commentId);
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, isDeleted: true, content: '该评论已删除' } : c
      ));
      message.success('已删除');
    } catch {
      message.error('删除失败');
    }
  };

  // ── 渲染单条评论 ──────────────────────────────────────────
  const renderComment = (comment: Comment, isReply = false, rootId?: number) => (
    <div
      key={comment.id}
      style={{
        display: 'flex', gap: 10,
        paddingLeft: isReply ? 40 : 0,
        paddingTop: 10,
        paddingBottom: isReply ? 0 : 10,
        borderBottom: isReply ? 'none' : '1px solid #f5f5f5',
      }}
    >
      <Avatar
        src={comment.avatarUrl}
        size={isReply ? 28 : 34}
        style={{ flexShrink: 0, cursor: 'pointer' }}
        onClick={() => navigate(`/users/${comment.userId}`)}
      />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>
            <Text
              strong
              style={{ fontSize: isReply ? 12 : 13, cursor: 'pointer' }}
              onClick={() => navigate(`/users/${comment.userId}`)}
            >
              {comment.username}
            </Text>
            {comment.replyToUsername && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                &nbsp;回复&nbsp;
                <Text style={{ fontSize: 12, cursor: 'pointer' }}
                  onClick={() => navigate(`/users/${comment.replyToUserId}`)}>
                  @{comment.replyToUsername}
                </Text>
              </Text>
            )}
          </span>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {new Date(comment.createdAt).toLocaleString('zh-CN', {
              month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </div>

        <div style={{
          fontSize: 13,
          color: comment.isDeleted ? '#bbb' : '#333',
          margin: '4px 0',
          whiteSpace: 'pre-wrap',
        }}>
          {comment.content}
        </div>

        {/* 操作行 */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span
            style={{ cursor: 'pointer', color: comment.isLiked ? '#ff4d4f' : '#aaa', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}
            onClick={() => handleLikeComment(comment, isReply, rootId)}
          >
            {comment.isLiked ? <HeartFilled style={{ fontSize: 12 }} /> : <HeartOutlined style={{ fontSize: 12 }} />}
            {comment.likeCount > 0 && comment.likeCount}
          </span>

          {!comment.isDeleted && (
            <Text
              type="secondary"
              style={{ fontSize: 12, cursor: 'pointer' }}
              onClick={() => {
                setReplyTarget({ id: comment.id, username: comment.username });
                setReplyContent('');
              }}
            >
              回复
            </Text>
          )}

          {user?.id === comment.userId && !comment.isDeleted && (
            <Text
              type="secondary"
              style={{ fontSize: 12, cursor: 'pointer' }}
              onClick={() => handleDeleteComment(comment.id)}
            >
              <DeleteOutlined style={{ fontSize: 11 }} /> 删除
            </Text>
          )}
        </div>

        {/* 回复输入框（根评论的回复） */}
        {!isReply && replyTarget?.id === comment.id && (
          <div style={{ marginTop: 8 }}>
            <TextArea
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              placeholder={`回复 @${replyTarget.username}...`}
              autoSize={{ minRows: 2, maxRows: 4 }}
              maxLength={1000}
              style={{ fontSize: 13 }}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <Button size="small" onClick={() => setReplyTarget(null)}>取消</Button>
              <Button
                size="small" type="primary"
                loading={submitting}
                disabled={!replyContent.trim()}
                onClick={() => handleReplySubmit(comment.id, comment.id)}
              >
                发布
              </Button>
            </div>
          </div>
        )}

        {/* 子评论区域 */}
        {!isReply && comment.replyCount > 0 && (
          <div style={{ marginTop: 6 }}>
            {expandedRoots.has(comment.id) ? (
              <>
                {(repliesMap[comment.id] || comment.replies).map(r =>
                  renderComment(r, true, comment.id)
                )}
                {/* 子评论的回复输入框 */}
                {replyTarget && repliesMap[comment.id]?.some(r => r.id === replyTarget.id) && (
                  <div style={{ paddingLeft: 40, marginTop: 8 }}>
                    <TextArea
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      placeholder={`回复 @${replyTarget.username}...`}
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      maxLength={1000}
                      autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                      <Button size="small" onClick={() => setReplyTarget(null)}>取消</Button>
                      <Button
                        size="small" type="primary"
                        loading={submitting}
                        disabled={!replyContent.trim()}
                        onClick={() => handleReplySubmit(replyTarget.id, comment.id)}
                      >
                        发布
                      </Button>
                    </div>
                  </div>
                )}
                <Text
                  type="secondary"
                  style={{ fontSize: 12, cursor: 'pointer', paddingLeft: 40 }}
                  onClick={() => handleExpandReplies(comment.id)}
                >
                  收起回复
                </Text>
              </>
            ) : (
              <Text
                type="secondary"
                style={{ fontSize: 12, cursor: 'pointer' }}
                onClick={() => handleExpandReplies(comment.id)}
              >
                展开 {comment.replyCount} 条回复 ▾
              </Text>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div id="comments">
      {/* 顶层评论输入框 */}
      <div style={{ marginBottom: 16 }}>
        <TextArea
          value={topContent}
          onChange={e => setTopContent(e.target.value)}
          placeholder={user ? '说点什么吧...' : '登录后发表评论'}
          autoSize={{ minRows: 2, maxRows: 5 }}
          maxLength={1000}
          disabled={!user}
          style={{ fontSize: 14 }}
          onFocus={() => { if (!user) navigate('/login'); }}
        />
        {topContent && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button
              type="primary"
              loading={submitting}
              disabled={!topContent.trim()}
              onClick={handleTopSubmit}
            >
              发表评论
            </Button>
          </div>
        )}
      </div>

      {/* 评论列表 */}
      <div style={{ color: '#666', fontSize: 13, marginBottom: 10 }}>
        全部评论 {total > 0 && `(${total})`}
      </div>

      <Spin spinning={loading && comments.length === 0}>
        {comments.map(c => renderComment(c))}
      </Spin>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Button
            type="text"
            loading={loading}
            onClick={() => loadComments(page + 1, true)}
          >
            加载更多评论
          </Button>
        </div>
      )}

      {!loading && comments.length === 0 && (
        <div style={{ textAlign: 'center', color: '#bbb', padding: '20px 0', fontSize: 14 }}>
          暂无评论，来说第一句吧 👋
        </div>
      )}
    </div>
  );
};

export default CommentSection;
