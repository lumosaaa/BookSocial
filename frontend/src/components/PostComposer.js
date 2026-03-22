import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Modal, Tabs, Input, Button, Upload, Select, Rate, Switch, Space, message, Avatar, Tooltip, } from 'antd';
import { PictureOutlined, BookOutlined, EyeOutlined, WarningOutlined, CloseCircleFilled, } from '@ant-design/icons';
import { createPost, POST_TYPE_LABELS, POST_TYPE_MAX_LENGTH } from '../api/postApi';
import { uploadToCloudinary } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
const { TextArea } = Input;
const VISIBILITY_OPTIONS = [
    { value: 0, label: '所有人可见' },
    { value: 1, label: '仅关注者可见' },
    { value: 2, label: '仅自己可见' },
];
const PostComposer = ({ open, onClose, onSuccess, defaultPostType = 0, defaultBookId, defaultBookTitle, }) => {
    const { user } = useAuthStore();
    const [postType, setPostType] = useState(defaultPostType);
    const [content, setContent] = useState('');
    const [rating, setRating] = useState(0);
    const [visibility, setVisibility] = useState(0);
    const [hasSpoiler, setHasSpoiler] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingImg, setUploadingImg] = useState(false);
    const maxLen = POST_TYPE_MAX_LENGTH[postType];
    const handleClose = () => {
        setContent('');
        setRating(0);
        setFileList([]);
        setHasSpoiler(false);
        setVisibility(0);
        setPostType(defaultPostType);
        onClose();
    };
    // 图片上传（调 M1 签名接口直传 Cloudinary）
    const handleImageUpload = async (file) => {
        const result = await uploadToCloudinary(file, 'posts');
        return result.secureUrl;
    };
    const handleSubmit = async () => {
        if (!content.trim()) {
            message.warning('请输入内容');
            return;
        }
        if (content.length > maxLen) {
            message.warning(`内容超出${maxLen}字限制`);
            return;
        }
        if (postType === 1 && !defaultBookId) {
            message.warning('书评需要关联书籍');
            return;
        }
        setSubmitting(true);
        try {
            // 上传图片
            setUploadingImg(true);
            const imageUrls = [];
            for (const f of fileList) {
                if (f.originFileObj) {
                    const url = await handleImageUpload(f.originFileObj);
                    imageUrls.push(url);
                }
            }
            setUploadingImg(false);
            await createPost({
                content: content.trim(),
                postType,
                bookId: defaultBookId,
                rating: postType === 1 ? Math.round(rating * 2) : undefined,
                visibility,
                hasSpoiler,
                imageUrls,
            });
            message.success('发布成功！');
            handleClose();
            onSuccess?.();
        }
        catch (err) {
            setUploadingImg(false);
            message.error(err?.response?.data?.message || '发布失败，请重试');
        }
        finally {
            setSubmitting(false);
        }
    };
    const tabItems = Object.entries(POST_TYPE_LABELS).map(([k, label]) => ({
        key: k,
        label,
    }));
    return (_jsxs(Modal, { open: open, onCancel: handleClose, footer: null, width: 560, title: null, destroyOnClose: true, styles: { body: { padding: '16px 20px 8px' } }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }, children: [_jsx(Avatar, { src: user?.avatarUrl, size: 40 }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600 }, children: user?.username }), _jsx(Select, { size: "small", value: visibility, onChange: setVisibility, options: VISIBILITY_OPTIONS, style: { width: 130, marginTop: 2 }, variant: "borderless", suffixIcon: _jsx(EyeOutlined, {}) })] })] }), _jsx(Tabs, { activeKey: String(postType), onChange: k => setPostType(+k), items: tabItems, size: "small", style: { marginBottom: 10 } }), defaultBookTitle && (_jsxs("div", { style: {
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#f0f4f0', borderRadius: 6, padding: '6px 10px',
                    marginBottom: 10, fontSize: 13,
                }, children: [_jsx(BookOutlined, { style: { color: '#4A6741' } }), _jsx("span", { children: defaultBookTitle })] })), postType === 1 && (_jsxs("div", { style: { marginBottom: 10 }, children: [_jsx("span", { style: { marginRight: 8, color: '#666' }, children: "\u8BC4\u5206\uFF1A" }), _jsx(Rate, { allowHalf: true, value: rating, onChange: setRating }), rating > 0 && _jsxs("span", { style: { marginLeft: 6, color: '#888' }, children: [rating, " \u661F"] })] })), _jsx(TextArea, { value: content, onChange: e => setContent(e.target.value), placeholder: `分享你的${POST_TYPE_LABELS[postType]}...（最多${maxLen}字）`, autoSize: { minRows: 4, maxRows: 12 }, maxLength: maxLen, showCount: true, style: { fontSize: 14 } }), fileList.length > 0 && (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }, children: fileList.map((f, i) => (_jsxs("div", { style: { position: 'relative' }, children: [_jsx("img", { src: f.thumbUrl || URL.createObjectURL(f.originFileObj), alt: `img-${i}`, style: { width: 72, height: 72, objectFit: 'cover', borderRadius: 6 } }), _jsx(CloseCircleFilled, { style: {
                                position: 'absolute', top: -6, right: -6,
                                color: '#999', fontSize: 16, cursor: 'pointer', background: '#fff', borderRadius: '50%',
                            }, onClick: () => setFileList(prev => prev.filter(x => x.uid !== f.uid)) })] }, f.uid))) })), _jsxs("div", { style: { display: 'flex', alignItems: 'center', marginTop: 14, gap: 10 }, children: [fileList.length < 9 && (_jsx(Upload, { accept: "image/*", showUploadList: false, beforeUpload: (file) => {
                            if (file.size > 10 * 1024 * 1024) {
                                message.error('图片不能超过10MB');
                                return false;
                            }
                            setFileList(prev => [...prev, {
                                    uid: `-${Date.now()}`,
                                    name: file.name,
                                    status: 'done',
                                    originFileObj: file,
                                    thumbUrl: URL.createObjectURL(file),
                                }]);
                            return false; // 阻止 Ant Design 自动上传
                        }, multiple: true, children: _jsx(Tooltip, { title: "\u6DFB\u52A0\u56FE\u7247\uFF08\u6700\u591A9\u5F20\uFF09", children: _jsx(Button, { icon: _jsx(PictureOutlined, {}), type: "text", size: "small", style: { color: '#666' }, children: "\u56FE\u7247" }) }) })), _jsx(Tooltip, { title: "\u542B\u5267\u900F\u5185\u5BB9\u5C06\u88AB\u6298\u53E0", children: _jsxs(Space, { size: 4, children: [_jsx(WarningOutlined, { style: { color: hasSpoiler ? '#faad14' : '#ccc' } }), _jsx(Switch, { size: "small", checked: hasSpoiler, onChange: setHasSpoiler }), _jsx("span", { style: { fontSize: 12, color: '#888' }, children: "\u542B\u5267\u900F" })] }) }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { onClick: handleClose, children: "\u53D6\u6D88" }), _jsx(Button, { type: "primary", loading: submitting, disabled: !content.trim() || content.length > maxLen, onClick: handleSubmit, children: uploadingImg ? '上传图片中...' : '发布' })] })] }));
};
export default PostComposer;
