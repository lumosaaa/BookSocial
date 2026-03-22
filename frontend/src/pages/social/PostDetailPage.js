import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, Button, Input, Modal, message, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getPost, sharePost } from '../../api/postApi';
import PostCard from '../../components/PostCard';
import CommentSection from '../../components/CommentSection';
import { useAuthStore } from '../../store/authStore';
const { TextArea } = Input;
const { Title } = Typography;
const PostDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuthStore();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    // 转发弹窗
    const [shareOpen, setShareOpen] = useState(false);
    const [shareContent, setShareContent] = useState('');
    const [sharing, setSharing] = useState(false);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        getPost(+id)
            .then(setPost)
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
        // 若 URL 带 ?action=share，自动打开转发弹窗
        if (searchParams.get('action') === 'share')
            setShareOpen(true);
    }, [id]);
    const handleShare = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setSharing(true);
        try {
            await sharePost(+id, shareContent.trim() || undefined);
            message.success('转发成功！');
            setShareOpen(false);
            setShareContent('');
        }
        catch {
            message.error('转发失败');
        }
        finally {
            setSharing(false);
        }
    };
    if (loading)
        return (_jsx("div", { style: { textAlign: 'center', padding: 60 }, children: _jsx(Spin, { size: "large" }) }));
    if (notFound || !post)
        return (_jsxs("div", { style: { textAlign: 'center', padding: 60, color: '#999' }, children: ["\u5E16\u5B50\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u5220\u9664", _jsx("br", {}), _jsx(Button, { type: "link", onClick: () => navigate(-1), children: "\u8FD4\u56DE\u4E0A\u4E00\u9875" })] }));
    return (_jsxs("div", { style: { maxWidth: 680, margin: '0 auto', padding: '0 0 40px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', padding: '12px 0', gap: 12 }, children: [_jsx(ArrowLeftOutlined, { style: { fontSize: 18, cursor: 'pointer' }, onClick: () => navigate(-1) }), _jsx(Title, { level: 5, style: { margin: 0 }, children: "\u52A8\u6001\u8BE6\u60C5" })] }), _jsx(PostCard, { post: post, hideCommentEntry: true, onDeleted: () => { message.success('已删除'); navigate(-1); } }), _jsx("div", { style: {
                    background: '#fff', borderRadius: 12,
                    padding: '16px', marginTop: 8,
                    border: '1px solid #f0f0f0',
                }, children: _jsx(CommentSection, { postId: post.id }) }), _jsxs(Modal, { open: shareOpen, title: "\u8F6C\u53D1", onCancel: () => setShareOpen(false), onOk: handleShare, confirmLoading: sharing, okText: "\u8F6C\u53D1", children: [_jsx(TextArea, { value: shareContent, onChange: e => setShareContent(e.target.value), placeholder: "\u8BF4\u70B9\u4EC0\u4E48...\uFF08\u53EF\u9009\uFF09", autoSize: { minRows: 3, maxRows: 6 }, maxLength: 500, showCount: true, style: { marginBottom: 12 } }), _jsxs("div", { style: {
                            background: '#f9f9f9', border: '1px solid #eee',
                            borderRadius: 8, padding: '10px 12px',
                        }, children: [_jsxs("div", { style: { fontSize: 12, color: '#888', marginBottom: 4 }, children: ["@", post.username] }), _jsx("div", { style: { fontSize: 13, color: '#444', overflow: 'hidden', maxHeight: 80 }, children: post.content })] })] })] }));
};
export default PostDetailPage;
