// src/pages/profile/EditProfilePage.tsx
import { useState, useEffect } from 'react';
import {
  Form, Input, Button, Select, Upload,
  message, Spin, Avatar, Typography,
} from 'antd';
import { UploadOutlined, UserOutlined, ArrowLeftOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userApi, uploadToCloudinary } from '../../api/authApi';
import { useAuthStore } from '../../store/authStore';

const { Option } = Select;
const { Title } = Typography;

export default function EditProfilePage() {
  const navigate  = useNavigate();
  const updateUser   = useAuthStore((s) => s.updateUser);

  const [form]    = Form.useForm();
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  /* ── 初始化：拉取当前用户信息 ── */
  useEffect(() => {
    userApi
      .getMe()
      .then(({ data }) => {
        const u = data.data;
        setAvatarUrl(u.avatarUrl || '');
        form.setFieldsValue({
          username:    u.username,
          bio:         u.bio || '',
          gender:      u.gender ?? undefined,
          city:        u.city || '',
          readingGoal: u.readingGoal || undefined,
        });
      })
      .catch(() => message.error('加载用户信息失败'))
      .finally(() => setLoading(false));
  }, []);

  /* ── 头像上传（Cloudinary 直传） ── */
  const handleAvatarChange = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      message.error('仅支持 JPEG / PNG / WebP 格式');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('图片大小不能超过 10MB');
      return false;
    }

    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, 'avatars');
      setAvatarUrl(result.secureUrl);
      message.success('头像已更新');
    } catch (err: unknown) {
      const msg = (err as Error).message || '头像上传失败，请重试';
      message.error(msg);
    } finally {
      setUploading(false);
    }
    return false; // 阻止 antd Upload 自动上传
  };

  /* ── 保存资料 ── */
  const handleSave = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const { data } = await userApi.updateMe({
        username:    values.username as string,
        bio:         values.bio as string,
        gender:      values.gender as number,
        city:        values.city as string,
        readingGoal: values.readingGoal ? parseInt(values.readingGoal as string) : undefined,
        avatarUrl:   avatarUrl || undefined,
      });
      // 更新 Zustand 中的用户信息（同步顶部头像/昵称）
      updateUser({
        username:  data.data.username,
        avatarUrl: data.data.avatarUrl,
      });
      message.success('资料已保存');
      navigate('/profile');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || '保存失败，请重试';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={() => navigate(-1)}
          style={{ flexShrink: 0 }}
        />
        <Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          编辑个人资料
        </Title>
      </div>

      {/* ── 头像上传区 ── */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Avatar
            size={96}
            src={avatarUrl}
            icon={uploading ? <LoadingOutlined /> : <UserOutlined />}
            style={{
              background: 'var(--color-accent)',
              border: '3px solid var(--color-border)',
              display: 'block',
            }}
          />
          {uploading && (
            <div
              style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <LoadingOutlined style={{ color: '#fff', fontSize: 24 }} />
            </div>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <Upload
            showUploadList={false}
            beforeUpload={handleAvatarChange}
            accept="image/jpeg,image/png,image/webp"
          >
            <Button
              icon={<UploadOutlined />}
              size="small"
              loading={uploading}
              style={{ borderRadius: 20, fontSize: 13 }}
            >
              更换头像
            </Button>
          </Upload>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6 }}>
            支持 JPEG / PNG / WebP，最大 10MB
          </div>
        </div>
      </div>

      {/* ── 表单 ── */}
      <Form form={form} onFinish={handleSave} layout="vertical" size="large">
        <Form.Item
          name="username"
          label="昵称"
          rules={[
            { required: true, message: '请输入昵称' },
            { min: 2, max: 50, message: '昵称须为 2–50 个字符' },
          ]}
        >
          <Input placeholder="你的书友昵称" maxLength={50} showCount />
        </Form.Item>

        <Form.Item
          name="bio"
          label="个人签名"
          rules={[{ max: 200, message: '最多 200 字' }]}
        >
          <Input.TextArea
            placeholder="介绍一下你自己，或者写下最近的读书感悟..."
            maxLength={200}
            showCount
            rows={3}
            style={{ resize: 'none' }}
          />
        </Form.Item>

        <Form.Item name="gender" label="性别">
          <Select placeholder="选择性别（可不填）" allowClear>
            <Option value={1}>男</Option>
            <Option value={2}>女</Option>
            <Option value={0}>保密</Option>
          </Select>
        </Form.Item>

        <Form.Item name="city" label="所在城市">
          <Input
            placeholder="例如：北京、上海、成都..."
            maxLength={50}
          />
        </Form.Item>

        <Form.Item
          name="readingGoal"
          label="年度阅读目标（本）"
          rules={[
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const n = parseInt(value);
                if (isNaN(n) || n < 1 || n > 999) {
                  return Promise.reject(new Error('请输入 1–999 之间的数字'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            type="number"
            min={1}
            max={999}
            placeholder="今年计划读多少本书？"
            suffix="本"
          />
        </Form.Item>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Button
            block
            size="large"
            onClick={() => navigate(-1)}
            style={{ borderRadius: 8 }}
          >
            取消
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={saving}
            style={{
              borderRadius: 8,
              background: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
            }}
          >
            保存
          </Button>
        </div>
      </Form>
    </div>
  );
}
