import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Typography, Button, Avatar, Tag, Divider, message } from 'antd';
import { ArrowLeftOutlined, HeartOutlined, HeartFilled, LockOutlined, UnlockOutlined, BookOutlined, } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { getNote, toggleNoteLike } from '../../api/postApi';
import { useAuthStore } from '../../store/authStore';
const { Title, Text, Paragraph } = Typography;
const NotePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [liking, setLiking] = useState(false);
    useEffect(() => {
        if (!id)
            return;
        setLoading(true);
        getNote(+id)
            .then(setNote)
            .catch(() => navigate('/404', { replace: true }))
            .finally(() => setLoading(false));
    }, [id]);
    const handleLike = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (liking || !note)
            return;
        setLiking(true);
        try {
            const res = await toggleNoteLike(note.id);
            setNote(n => n ? { ...n, isLiked: res.liked, likeCount: res.likeCount } : n);
        }
        catch {
            message.error('操作失败');
        }
        finally {
            setLiking(false);
        }
    };
    if (loading)
        return (_jsx("div", { style: { textAlign: 'center', padding: 60 }, children: _jsx(Spin, { size: "large" }) }));
    if (!note)
        return null;
    return (_jsxs("div", { style: { maxWidth: 720, margin: '0 auto', padding: '0 0 60px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', padding: '12px 0', gap: 12 }, children: [_jsx(ArrowLeftOutlined, { style: { fontSize: 18, cursor: 'pointer' }, onClick: () => navigate(-1) }), _jsx(Title, { level: 5, style: { margin: 0 }, children: "\u9605\u8BFB\u7B14\u8BB0" })] }), _jsxs("div", { style: {
                    background: '#fff', borderRadius: 12,
                    padding: '24px', border: '1px solid #f0f0f0',
                }, children: [_jsxs("div", { style: {
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: '#f8f8f4', borderRadius: 8, padding: '10px 14px',
                            marginBottom: 20, cursor: 'pointer',
                        }, onClick: () => navigate(`/books/${note.bookId}`), children: [note.bookCoverUrl && (_jsx("img", { src: note.bookCoverUrl, alt: note.bookTitle, style: { width: 36, height: 50, objectFit: 'cover', borderRadius: 4 } })), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600 }, children: note.bookTitle }), _jsx("div", { style: { color: '#888', fontSize: 13 }, children: note.bookAuthor })] }), _jsx(BookOutlined, { style: { marginLeft: 'auto', color: '#4A6741', fontSize: 16 } })] }), note.title && (_jsx(Title, { level: 4, style: { marginBottom: 8 }, children: note.title })), note.quote && (_jsxs("blockquote", { style: {
                            borderLeft: '3px solid #4A6741',
                            paddingLeft: 14, margin: '0 0 16px',
                            color: '#555', fontStyle: 'italic', fontSize: 14,
                        }, children: [note.quote, (note.pageNumber || note.chapter) && (_jsxs("div", { style: { marginTop: 4, fontSize: 12, color: '#aaa' }, children: [note.chapter && `${note.chapter} · `, note.pageNumber && `第${note.pageNumber}页`] }))] })), _jsx("div", { className: "markdown-body", style: {
                            fontSize: 15, lineHeight: 1.8, color: '#333',
                            /* prose 样式由全局 CSS 覆盖，此处保底 */
                        }, children: _jsx(ReactMarkdown, { children: note.content }) }), _jsx(Divider, { style: { margin: '20px 0 14px' } }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(Avatar, { src: note.avatarUrl, size: 32, style: { cursor: 'pointer' }, onClick: () => navigate(`/users/${note.userId}`) }), _jsxs("div", { style: { flex: 1 }, children: [_jsx(Text, { strong: true, style: { fontSize: 13, cursor: 'pointer' }, onClick: () => navigate(`/users/${note.userId}`), children: note.username }), _jsx("div", { style: { color: '#aaa', fontSize: 11 }, children: new Date(note.createdAt).toLocaleString('zh-CN') })] }), _jsx(Tag, { icon: note.isPublic ? _jsx(UnlockOutlined, {}) : _jsx(LockOutlined, {}), color: note.isPublic ? 'green' : 'default', children: note.isPublic ? '公开' : '私密' }), _jsx(Button, { type: "text", icon: note.isLiked ? _jsx(HeartFilled, { style: { color: '#ff4d4f' } }) : _jsx(HeartOutlined, {}), onClick: handleLike, loading: liking, children: note.likeCount || '' })] })] })] }));
};
export default NotePage;
