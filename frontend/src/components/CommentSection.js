import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Avatar, Button, Input, Typography, message, Spin } from 'antd';
import { HeartOutlined, HeartFilled, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getPostComments, createComment, deleteComment, toggleCommentLike, getReplies, } from '../api/postApi';
import { useAuthStore } from '../store/authStore';
const { Text } = Typography;
const { TextArea } = Input;
const CommentSection = ({ postId }) => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [comments, setComments] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    // 顶层评论输入框
    const [topContent, setTopContent] = useState('');
    // 回复状态：{ commentId, username }
    const [replyTarget, setReplyTarget] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    // 已展开子评论的根评论 ID 集合
    const [expandedRoots, setExpandedRoots] = useState(new Set());
    const [repliesMap, setRepliesMap] = useState({});
    // ── 加载评论 ──────────────────────────────────────────────
    const loadComments = async (p = 1, append = false) => {
        setLoading(true);
        try {
            const res = await getPostComments(postId, p);
            setComments(prev => append ? [...prev, ...res.list] : res.list);
            setTotal(res.total);
            setHasMore(res.hasMore);
            setPage(p);
        }
        catch {
            message.error('加载评论失败');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { loadComments(1); }, [postId]);
    // ── 展开子评论 ────────────────────────────────────────────
    const handleExpandReplies = async (rootId) => {
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
        }
        catch {
            message.error('加载回复失败');
        }
    };
    // ── 发表顶层评论 ──────────────────────────────────────────
    const handleTopSubmit = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!topContent.trim())
            return;
        setSubmitting(true);
        try {
            const comment = await createComment(postId, { content: topContent.trim() });
            setComments(prev => [comment, ...prev]);
            setTotal(t => t + 1);
            setTopContent('');
            message.success('评论成功');
        }
        catch {
            message.error('发表失败，请重试');
        }
        finally {
            setSubmitting(false);
        }
    };
    // ── 发表回复 ──────────────────────────────────────────────
    const handleReplySubmit = async (parentId, rootId) => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!replyContent.trim())
            return;
        setSubmitting(true);
        try {
            const comment = await createComment(postId, {
                content: replyContent.trim(),
                parentId,
            });
            // 追加到子评论列表
            setRepliesMap(prev => ({
                ...prev,
                [rootId]: [...(prev[rootId] || []), comment],
            }));
            // 更新根评论的 replyCount
            setComments(prev => prev.map(c => c.id === rootId ? { ...c, replyCount: c.replyCount + 1 } : c));
            setReplyTarget(null);
            setReplyContent('');
            message.success('回复成功');
        }
        catch {
            message.error('回复失败，请重试');
        }
        finally {
            setSubmitting(false);
        }
    };
    // ── 点赞评论 ──────────────────────────────────────────────
    const handleLikeComment = async (comment, isReply = false, rootId) => {
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            const res = await toggleCommentLike(comment.id);
            const update = (c) => c.id === comment.id ? { ...c, isLiked: res.liked, likeCount: res.likeCount } : c;
            if (isReply && rootId !== undefined) {
                setRepliesMap(prev => ({
                    ...prev,
                    [rootId]: (prev[rootId] || []).map(update),
                }));
            }
            else {
                setComments(prev => prev.map(update));
            }
        }
        catch {
            message.error('操作失败');
        }
    };
    // ── 删除评论 ──────────────────────────────────────────────
    const handleDeleteComment = async (commentId) => {
        try {
            await deleteComment(commentId);
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, isDeleted: true, content: '该评论已删除' } : c));
            message.success('已删除');
        }
        catch {
            message.error('删除失败');
        }
    };
    // ── 渲染单条评论 ──────────────────────────────────────────
    const renderComment = (comment, isReply = false, rootId) => (_jsxs("div", { style: {
            display: 'flex', gap: 10,
            paddingLeft: isReply ? 40 : 0,
            paddingTop: 10,
            paddingBottom: isReply ? 0 : 10,
            borderBottom: isReply ? 'none' : '1px solid #f5f5f5',
        }, children: [_jsx(Avatar, { src: comment.avatarUrl, size: isReply ? 28 : 34, style: { flexShrink: 0, cursor: 'pointer' }, onClick: () => navigate(`/users/${comment.userId}`) }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsxs("span", { children: [_jsx(Text, { strong: true, style: { fontSize: isReply ? 12 : 13, cursor: 'pointer' }, onClick: () => navigate(`/users/${comment.userId}`), children: comment.username }), comment.replyToUsername && (_jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: ["\u00A0\u56DE\u590D\u00A0", _jsxs(Text, { style: { fontSize: 12, cursor: 'pointer' }, onClick: () => navigate(`/users/${comment.replyToUserId}`), children: ["@", comment.replyToUsername] })] }))] }), _jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: new Date(comment.createdAt).toLocaleString('zh-CN', {
                                    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                }) })] }), _jsx("div", { style: {
                            fontSize: 13,
                            color: comment.isDeleted ? '#bbb' : '#333',
                            margin: '4px 0',
                            whiteSpace: 'pre-wrap',
                        }, children: comment.content }), _jsxs("div", { style: { display: 'flex', gap: 14, alignItems: 'center' }, children: [_jsxs("span", { style: { cursor: 'pointer', color: comment.isLiked ? '#ff4d4f' : '#aaa', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }, onClick: () => handleLikeComment(comment, isReply, rootId), children: [comment.isLiked ? _jsx(HeartFilled, { style: { fontSize: 12 } }) : _jsx(HeartOutlined, { style: { fontSize: 12 } }), comment.likeCount > 0 && comment.likeCount] }), !comment.isDeleted && (_jsx(Text, { type: "secondary", style: { fontSize: 12, cursor: 'pointer' }, onClick: () => {
                                    setReplyTarget({ id: comment.id, username: comment.username });
                                    setReplyContent('');
                                }, children: "\u56DE\u590D" })), user?.id === comment.userId && !comment.isDeleted && (_jsxs(Text, { type: "secondary", style: { fontSize: 12, cursor: 'pointer' }, onClick: () => handleDeleteComment(comment.id), children: [_jsx(DeleteOutlined, { style: { fontSize: 11 } }), " \u5220\u9664"] }))] }), !isReply && replyTarget?.id === comment.id && (_jsxs("div", { style: { marginTop: 8 }, children: [_jsx(TextArea, { value: replyContent, onChange: e => setReplyContent(e.target.value), placeholder: `回复 @${replyTarget.username}...`, autoSize: { minRows: 2, maxRows: 4 }, maxLength: 1000, style: { fontSize: 13 }, autoFocus: true }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }, children: [_jsx(Button, { size: "small", onClick: () => setReplyTarget(null), children: "\u53D6\u6D88" }), _jsx(Button, { size: "small", type: "primary", loading: submitting, disabled: !replyContent.trim(), onClick: () => handleReplySubmit(comment.id, comment.id), children: "\u53D1\u5E03" })] })] })), !isReply && comment.replyCount > 0 && (_jsx("div", { style: { marginTop: 6 }, children: expandedRoots.has(comment.id) ? (_jsxs(_Fragment, { children: [(repliesMap[comment.id] || comment.replies).map(r => renderComment(r, true, comment.id)), replyTarget && repliesMap[comment.id]?.some(r => r.id === replyTarget.id) && (_jsxs("div", { style: { paddingLeft: 40, marginTop: 8 }, children: [_jsx(TextArea, { value: replyContent, onChange: e => setReplyContent(e.target.value), placeholder: `回复 @${replyTarget.username}...`, autoSize: { minRows: 2, maxRows: 4 }, maxLength: 1000, autoFocus: true }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }, children: [_jsx(Button, { size: "small", onClick: () => setReplyTarget(null), children: "\u53D6\u6D88" }), _jsx(Button, { size: "small", type: "primary", loading: submitting, disabled: !replyContent.trim(), onClick: () => handleReplySubmit(replyTarget.id, comment.id), children: "\u53D1\u5E03" })] })] })), _jsx(Text, { type: "secondary", style: { fontSize: 12, cursor: 'pointer', paddingLeft: 40 }, onClick: () => handleExpandReplies(comment.id), children: "\u6536\u8D77\u56DE\u590D" })] })) : (_jsxs(Text, { type: "secondary", style: { fontSize: 12, cursor: 'pointer' }, onClick: () => handleExpandReplies(comment.id), children: ["\u5C55\u5F00 ", comment.replyCount, " \u6761\u56DE\u590D \u25BE"] })) }))] })] }, comment.id));
    return (_jsxs("div", { id: "comments", children: [_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(TextArea, { value: topContent, onChange: e => setTopContent(e.target.value), placeholder: user ? '说点什么吧...' : '登录后发表评论', autoSize: { minRows: 2, maxRows: 5 }, maxLength: 1000, disabled: !user, style: { fontSize: 14 }, onFocus: () => { if (!user)
                            navigate('/login'); } }), topContent && (_jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 }, children: _jsx(Button, { type: "primary", loading: submitting, disabled: !topContent.trim(), onClick: handleTopSubmit, children: "\u53D1\u8868\u8BC4\u8BBA" }) }))] }), _jsxs("div", { style: { color: '#666', fontSize: 13, marginBottom: 10 }, children: ["\u5168\u90E8\u8BC4\u8BBA ", total > 0 && `(${total})`] }), _jsx(Spin, { spinning: loading && comments.length === 0, children: comments.map(c => renderComment(c)) }), hasMore && (_jsx("div", { style: { textAlign: 'center', marginTop: 12 }, children: _jsx(Button, { type: "text", loading: loading, onClick: () => loadComments(page + 1, true), children: "\u52A0\u8F7D\u66F4\u591A\u8BC4\u8BBA" }) })), !loading && comments.length === 0 && (_jsx("div", { style: { textAlign: 'center', color: '#bbb', padding: '20px 0', fontSize: 14 }, children: "\u6682\u65E0\u8BC4\u8BBA\uFF0C\u6765\u8BF4\u7B2C\u4E00\u53E5\u5427 \uD83D\uDC4B" }))] }));
};
export default CommentSection;
