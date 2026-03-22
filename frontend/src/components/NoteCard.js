import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Tag, Typography } from 'antd';
import { HeartOutlined, LockOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
const { Text, Paragraph } = Typography;
const NoteCard = ({ note }) => {
    const navigate = useNavigate();
    return (_jsxs("div", { style: {
            background: '#fff',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 10,
            border: '1px solid #f0f0f0',
            cursor: 'pointer',
        }, onClick: () => navigate(`/reading-notes/${note.id}`), children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }, children: [_jsxs("div", { style: { flex: 1 }, children: [note.title && (_jsx(Text, { strong: true, style: { fontSize: 14 }, children: note.title })), !note.isPublic && (_jsx(Tag, { icon: _jsx(LockOutlined, {}), color: "default", style: { marginLeft: 6, fontSize: 11 }, children: "\u79C1\u5BC6" }))] }), _jsx(Text, { type: "secondary", style: { fontSize: 11, flexShrink: 0 }, children: new Date(note.createdAt).toLocaleDateString('zh-CN') })] }), _jsx(Paragraph, { ellipsis: { rows: 3 }, style: { margin: '0 0 8px', fontSize: 13, color: '#444', whiteSpace: 'pre-wrap' }, children: note.content }), note.quote && (_jsx("div", { style: {
                    borderLeft: '3px solid #4A6741',
                    paddingLeft: 10,
                    color: '#777',
                    fontSize: 12,
                    fontStyle: 'italic',
                    marginBottom: 8,
                    overflow: 'hidden',
                    maxHeight: 36,
                }, children: note.quote })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [note.bookTitle && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4, color: '#888', fontSize: 12 }, onClick: e => { e.stopPropagation(); navigate(`/books/${note.bookId}`); }, children: [_jsx(BookOutlined, {}), _jsx("span", { children: note.bookTitle })] })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4, color: '#bbb', fontSize: 12 }, children: [_jsx(HeartOutlined, {}), note.likeCount > 0 && _jsx("span", { children: note.likeCount })] })] })] }));
};
export default NoteCard;
