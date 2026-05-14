import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Avatar, Image, Rate, Tag, Typography, Dropdown, message, Modal, Input, Select } from 'antd';
import { HeartOutlined, HeartFilled, MessageOutlined, StarOutlined, StarFilled, RetweetOutlined, EllipsisOutlined, EyeInvisibleOutlined, WarningOutlined, } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { togglePostLike, bookmarkPost, deletePost, submitReport } from '../api/postApi';
import { useAuthStore } from '../store/authStore';
const { Paragraph, Text } = Typography;
const POST_TYPE_COLOR = {
    0: 'default', 1: 'blue', 2: 'green', 3: 'orange', 4: 'purple',
};
const POST_TYPE_LABEL = {
    0: '动态', 1: '书评', 2: '阅读笔记', 3: '书单', 4: '进度更新',
};
const PostCard = ({ post: initialPost, readonly = false, hideCommentEntry = false, onDeleted, onCommentClick, }) => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [post, setPost] = useState(initialPost);
    const [spoilerVisible, setSpoilerVisible] = useState(!post.hasSpoiler);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState(1);
    const [reportDetail, setReportDetail] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const handleReport = async () => {
        setReportSubmitting(true);
        try {
            await submitReport({
                targetId: post.id,
                targetType: 1,
                reason: reportReason,
                detail: reportDetail.trim() || undefined,
            });
            message.success('举报已提交，我们会尽快处理');
            setReportOpen(false);
            setReportDetail('');
            setReportReason(1);
        }
        catch {
            message.error('举报提交失败');
        }
        finally {
            setReportSubmitting(false);
        }
    };
    // ── 点赞 ──────────────────────────────────────────────────
    const handleLike = async (e) => {
        e.stopPropagation();
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            const res = await togglePostLike(post.id);
            setPost(p => ({ ...p, isLiked: res.liked, likeCount: res.likeCount }));
        }
        catch {
            message.error('操作失败');
        }
    };
    // ── 收藏 ──────────────────────────────────────────────────
    const handleBookmark = async (e) => {
        e.stopPropagation();
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            if (post.isBookmarked) {
                // 注意：真实场景需要传 bookmarkId，此处简化为按 postId 反查
                // 可以在 post 对象上缓存 bookmarkId，这里用服务端重新查询的方式兼容
                message.info('请到"我的收藏"页面取消收藏');
            }
            else {
                await bookmarkPost(post.id);
                setPost(p => ({ ...p, isBookmarked: true, bookmarkCount: p.bookmarkCount + 1 }));
                message.success('已收藏');
            }
        }
        catch (err) {
            if (err?.response?.data?.code === 409) {
                setPost(p => ({ ...p, isBookmarked: true }));
            }
            else {
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
        }
        catch {
            message.error('删除失败');
        }
    };
    // ── 更多操作菜单 ──────────────────────────────────────────
    const menuItems = [
        ...(user?.id === post.userId
            ? [{ key: 'delete', label: '删除', danger: true, onClick: handleDelete }]
            : [{ key: 'report', label: '举报', icon: _jsx(WarningOutlined, {}), onClick: () => setReportOpen(true) }]),
    ];
    return (_jsxs("div", { className: "post-card", style: {
            background: '#fff',
            borderRadius: 12,
            padding: '16px',
            marginBottom: 12,
            cursor: readonly ? 'default' : 'pointer',
            border: '1px solid #f0f0f0',
        }, onClick: () => !readonly && navigate(`/posts/${post.id}`), children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 10 }, children: [_jsx(Avatar, { src: post.avatarUrl, size: 38, style: { cursor: 'pointer', flexShrink: 0 }, onClick: e => { e?.stopPropagation(); navigate(`/users/${post.userId}`); } }), _jsxs("div", { style: { marginLeft: 10, flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Text, { strong: true, style: { cursor: 'pointer' }, onClick: e => { e.stopPropagation(); navigate(`/users/${post.userId}`); }, children: post.username }), _jsx(Tag, { color: POST_TYPE_COLOR[post.postType], style: { fontSize: 11 }, children: POST_TYPE_LABEL[post.postType] })] }), _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: new Date(post.createdAt).toLocaleString('zh-CN', {
                                    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                }) })] }), !readonly && (_jsx(Dropdown, { menu: { items: menuItems }, trigger: ['click'], placement: "bottomRight", children: _jsx(EllipsisOutlined, { style: { fontSize: 18, color: '#999', cursor: 'pointer' }, onClick: e => e.stopPropagation() }) }))] }), post.book && (_jsxs("div", { style: {
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: '#fafafa', borderRadius: 8, padding: '8px 10px',
                    marginBottom: 10, cursor: 'pointer',
                }, onClick: e => { e.stopPropagation(); navigate(`/books/${post.bookId}`); }, children: [post.book.coverUrl && (_jsx("img", { src: post.book.coverUrl, alt: post.book.title, style: { width: 32, height: 44, objectFit: 'cover', borderRadius: 4 } })), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600, fontSize: 13 }, children: post.book.title }), _jsx("div", { style: { color: '#888', fontSize: 12 }, children: post.book.author })] }), post.postType === 1 && post.rating != null && (_jsxs("div", { style: { marginLeft: 'auto' }, children: [_jsx(Rate, { disabled: true, value: post.rating / 2, allowHalf: true, style: { fontSize: 14 } }), _jsx(Text, { style: { fontSize: 12, marginLeft: 4 }, children: (post.rating / 2).toFixed(1) })] }))] })), post.hasSpoiler && !spoilerVisible ? (_jsxs("div", { style: {
                    background: '#f5f5f5', borderRadius: 8, padding: '12px',
                    textAlign: 'center', cursor: 'pointer', color: '#888',
                }, onClick: e => { e.stopPropagation(); setSpoilerVisible(true); }, children: [_jsx(EyeInvisibleOutlined, {}), " \u00A0\u542B\u5267\u900F\uFF0C\u70B9\u51FB\u5C55\u5F00"] })) : (_jsx(Paragraph, { ellipsis: readonly ? { rows: 3, expandable: false } : { rows: 6, expandable: true, symbol: '展开' }, style: { marginBottom: post.images.length ? 10 : 0, whiteSpace: 'pre-wrap' }, children: post.content })), post.images.length > 0 && (_jsx("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: post.images.length === 1 ? '1fr' : 'repeat(3, 1fr)',
                    gap: 4,
                    marginBottom: 10,
                }, onClick: e => e.stopPropagation(), children: _jsx(Image.PreviewGroup, { children: post.images.map((img, idx) => (_jsx(Image, { src: img.thumbnailUrl || img.url, style: {
                            width: '100%',
                            aspectRatio: post.images.length === 1 ? '16/9' : '1',
                            objectFit: 'cover',
                            borderRadius: 6,
                        } }, idx))) }) })), post.originPost && (_jsxs("div", { style: {
                    background: '#f9f9f9', border: '1px solid #eee',
                    borderRadius: 8, padding: '10px 12px', marginBottom: 10,
                }, onClick: e => { e.stopPropagation(); navigate(`/posts/${post.originPostId}`); }, children: [_jsxs(Text, { style: { fontSize: 12, color: '#888' }, children: ["@", post.originPost.username] }), _jsx(Paragraph, { ellipsis: { rows: 2 }, style: { marginBottom: 0, fontSize: 13, color: '#444' }, children: post.originPost.isDeleted ? '原帖已删除' : post.originPost.content })] })), !readonly && (_jsxs("div", { style: {
                    display: 'flex', gap: 20, paddingTop: 10,
                    borderTop: '1px solid #f5f5f5', marginTop: 6,
                }, onClick: e => e.stopPropagation(), children: [_jsxs("span", { style: { cursor: 'pointer', color: post.isLiked ? '#ff4d4f' : '#888', display: 'flex', alignItems: 'center', gap: 4 }, onClick: handleLike, children: [post.isLiked ? _jsx(HeartFilled, {}) : _jsx(HeartOutlined, {}), _jsx("span", { style: { fontSize: 13 }, children: post.likeCount || '' })] }), !hideCommentEntry && (_jsxs("span", { style: { cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', gap: 4 }, onClick: () => onCommentClick ? onCommentClick(post) : navigate(`/posts/${post.id}#comments`), children: [_jsx(MessageOutlined, {}), _jsx("span", { style: { fontSize: 13 }, children: post.commentCount || '' })] })), _jsxs("span", { style: { cursor: 'pointer', color: post.isBookmarked ? '#faad14' : '#888', display: 'flex', alignItems: 'center', gap: 4 }, onClick: handleBookmark, children: [post.isBookmarked ? _jsx(StarFilled, {}) : _jsx(StarOutlined, {}), _jsx("span", { style: { fontSize: 13 }, children: post.bookmarkCount || '' })] }), _jsxs("span", { style: { cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', gap: 4 }, onClick: () => navigate(`/posts/${post.id}?action=share`), children: [_jsx(RetweetOutlined, {}), _jsx("span", { style: { fontSize: 13 }, children: post.shareCount || '' })] })] })), _jsx(Modal, { title: "\u4E3E\u62A5\u5185\u5BB9", open: reportOpen, onOk: handleReport, onCancel: () => setReportOpen(false), okText: "\u63D0\u4EA4\u4E3E\u62A5", confirmLoading: reportSubmitting, okButtonProps: { disabled: !reportReason }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsx(Select, { value: reportReason, onChange: setReportReason, options: [
                                { value: 1, label: '违禁信息' },
                                { value: 2, label: '色情低俗' },
                                { value: 3, label: '侵权' },
                                { value: 4, label: '广告骚扰' },
                                { value: 5, label: '人身攻击' },
                                { value: 6, label: '其他' },
                            ] }), _jsx(Input.TextArea, { rows: 4, value: reportDetail, onChange: e => setReportDetail(e.target.value), placeholder: "\u8865\u5145\u8BF4\u660E\uFF08\u9009\u586B\uFF09", maxLength: 500 })] }) })] }));
};
export default PostCard;
