import React, { useState, useRef } from 'react';
import {
  Modal, Tabs, Input, Button, Upload, Select, Rate,
  Switch, Space, message, Avatar, Tooltip,
} from 'antd';
import {
  PictureOutlined, BookOutlined, EyeOutlined,
  WarningOutlined, CloseCircleFilled,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { createPost, POST_TYPE_LABELS, POST_TYPE_MAX_LENGTH } from '../api/postApi';
import { uploadToCloudinary } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

const { TextArea } = Input;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultPostType?: number;
  defaultBookId?: number;
  defaultBookTitle?: string;
}

const VISIBILITY_OPTIONS = [
  { value: 0, label: '所有人可见' },
  { value: 1, label: '仅关注者可见' },
  { value: 2, label: '仅自己可见' },
];

const PostComposer: React.FC<Props> = ({
  open,
  onClose,
  onSuccess,
  defaultPostType = 0,
  defaultBookId,
  defaultBookTitle,
}) => {
  const { user } = useAuthStore();

  const [postType, setPostType]       = useState(defaultPostType);
  const [content, setContent]         = useState('');
  const [rating, setRating]           = useState<number>(0);
  const [visibility, setVisibility]   = useState(0);
  const [hasSpoiler, setHasSpoiler]   = useState(false);
  const [fileList, setFileList]       = useState<UploadFile[]>([]);
  const [submitting, setSubmitting]   = useState(false);
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
  const handleImageUpload = async (file: File): Promise<string> => {
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
      const imageUrls: string[] = [];
      for (const f of fileList) {
        if (f.originFileObj) {
          const url = await handleImageUpload(f.originFileObj as File);
          imageUrls.push(url);
        }
      }
      setUploadingImg(false);

      await createPost({
        content:    content.trim(),
        postType,
        bookId:     defaultBookId,
        rating:     postType === 1 ? Math.round(rating * 2) : undefined,
        visibility,
        hasSpoiler,
        imageUrls,
      });

      message.success('发布成功！');
      handleClose();
      onSuccess?.();
    } catch (err: any) {
      setUploadingImg(false);
      message.error(err?.response?.data?.message || '发布失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const tabItems = Object.entries(POST_TYPE_LABELS).map(([k, label]) => ({
    key: k,
    label,
  }));

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={560}
      title={null}
      destroyOnClose
      styles={{ body: { padding: '16px 20px 8px' } }}
    >
      {/* 用户头像 + 类型选择 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Avatar src={user?.avatarUrl} size={40} />
        <div>
          <div style={{ fontWeight: 600 }}>{user?.username}</div>
          <Select
            size="small"
            value={visibility}
            onChange={setVisibility}
            options={VISIBILITY_OPTIONS}
            style={{ width: 130, marginTop: 2 }}
            variant="borderless"
            suffixIcon={<EyeOutlined />}
          />
        </div>
      </div>

      {/* 帖子类型 Tab */}
      <Tabs
        activeKey={String(postType)}
        onChange={k => setPostType(+k)}
        items={tabItems}
        size="small"
        style={{ marginBottom: 10 }}
      />

      {/* 关联书籍提示 */}
      {defaultBookTitle && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#f0f4f0', borderRadius: 6, padding: '6px 10px',
          marginBottom: 10, fontSize: 13,
        }}>
          <BookOutlined style={{ color: '#4A6741' }} />
          <span>{defaultBookTitle}</span>
        </div>
      )}

      {/* 书评评分 */}
      {postType === 1 && (
        <div style={{ marginBottom: 10 }}>
          <span style={{ marginRight: 8, color: '#666' }}>评分：</span>
          <Rate allowHalf value={rating} onChange={setRating} />
          {rating > 0 && <span style={{ marginLeft: 6, color: '#888' }}>{rating} 星</span>}
        </div>
      )}

      {/* 正文输入 */}
      <TextArea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={`分享你的${POST_TYPE_LABELS[postType]}...（最多${maxLen}字）`}
        autoSize={{ minRows: 4, maxRows: 12 }}
        maxLength={maxLen}
        showCount
        style={{ fontSize: 14 }}
      />

      {/* 图片预览区 */}
      {fileList.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {fileList.map((f, i) => (
            <div key={f.uid} style={{ position: 'relative' }}>
              <img
                src={f.thumbUrl || URL.createObjectURL(f.originFileObj as File)}
                alt={`img-${i}`}
                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6 }}
              />
              <CloseCircleFilled
                style={{
                  position: 'absolute', top: -6, right: -6,
                  color: '#999', fontSize: 16, cursor: 'pointer', background: '#fff', borderRadius: '50%',
                }}
                onClick={() => setFileList(prev => prev.filter(x => x.uid !== f.uid))}
              />
            </div>
          ))}
        </div>
      )}

      {/* 工具栏 + 发布按钮 */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 14, gap: 10 }}>
        {/* 上传图片 */}
        {fileList.length < 9 && (
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => {
              if (file.size > 10 * 1024 * 1024) {
                message.error('图片不能超过10MB');
                return false;
              }
              setFileList(prev => [...prev, {
                uid:           `-${Date.now()}`,
                name:          file.name,
                status:        'done',
                originFileObj: file,
                thumbUrl:      URL.createObjectURL(file),
              }]);
              return false; // 阻止 Ant Design 自动上传
            }}
            multiple
          >
            <Tooltip title="添加图片（最多9张）">
              <Button
                icon={<PictureOutlined />}
                type="text"
                size="small"
                style={{ color: '#666' }}
              >
                图片
              </Button>
            </Tooltip>
          </Upload>
        )}

        {/* 剧透标记 */}
        <Tooltip title="含剧透内容将被折叠">
          <Space size={4}>
            <WarningOutlined style={{ color: hasSpoiler ? '#faad14' : '#ccc' }} />
            <Switch
              size="small"
              checked={hasSpoiler}
              onChange={setHasSpoiler}
            />
            <span style={{ fontSize: 12, color: '#888' }}>含剧透</span>
          </Space>
        </Tooltip>

        <div style={{ flex: 1 }} />

        <Button onClick={handleClose}>取消</Button>
        <Button
          type="primary"
          loading={submitting}
          disabled={!content.trim() || content.length > maxLen}
          onClick={handleSubmit}
        >
          {uploadingImg ? '上传图片中...' : '发布'}
        </Button>
      </div>
    </Modal>
  );
};

export default PostComposer;
