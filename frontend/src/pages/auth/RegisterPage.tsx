// src/pages/auth/RegisterPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Form, Input, Button, Steps, Tag,
  Spin, message, Typography, Progress,
} from 'antd';
import {
  MailOutlined, LockOutlined, UserOutlined, NumberOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { authApi, userApi } from '../../api/authApi';
import apiClient from '../../api/apiClient';

const { Text } = Typography;

interface TagItem {
  id: number;
  name: string;
  category: number;
  isOfficial: number;
}

const STEP_LABELS = ['创建账号', '阅读偏好'];

export default function RegisterPage() {
  const navigate  = useNavigate();
  const setUser   = useAuthStore((s) => s.setUser);

  const [step, setStep]               = useState(0);
  const [loading, setLoading]         = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [countdown, setCountdown]     = useState(0);
  const [tags, setTags]               = useState<TagItem[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [form] = Form.useForm();

  /* ── 倒计时 ── */
  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown((v) => {
        if (v <= 1) { clearInterval(t); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    const email = form.getFieldValue('email');
    if (!email) return message.warning('请先填写邮箱');
    setCodeSending(true);
    try {
      await authApi.sendCode(email);
      message.success('验证码已发送，请查收邮件');
      startCountdown();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || '发送失败';
      message.error(msg);
    } finally {
      setCodeSending(false);
    }
  };

  /* ── Step 0：注册 ── */
  const handleRegister = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const { data } = await authApi.register({
        email:    values.email.toLowerCase().trim(),
        code:     values.code.trim(),
        username: values.username.trim(),
        password: values.password,
      });
      const { user, accessToken, refreshToken } = data.data;
      setUser(user, accessToken, refreshToken);

      // 加载官方标签
      setTagsLoading(true);
      try {
        const tagRes = await apiClient.get('/tags', { params: { isOfficial: 1 } });
        setTags(tagRes.data.data || []);
      } catch {
        // 接口不存在时回退到空数组，步骤继续
        setTags([]);
      } finally {
        setTagsLoading(false);
      }

      setStep(1);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || '注册失败，请稍后重试';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 1：保存偏好 ── */
  const handleSavePreferences = async () => {
    if (selectedTags.length < 3) {
      return message.warning('至少选择 3 个偏好标签');
    }
    setLoading(true);
    try {
      await userApi.savePreferences(selectedTags);
      message.success('🎉 注册完成，欢迎来到书·友！');
      navigate('/');
    } catch {
      message.error('保存偏好失败，可稍后在设置中修改');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (id: number) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  /* ── UI ── */
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#fff',
          borderRadius: 16,
          padding: '40px 36px',
          boxShadow: '0 8px 32px rgba(44,62,45,0.10)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 30 }}>📖</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)', marginTop: 6 }}>
            书·友
          </div>
        </div>

        {/* 步骤指示器 */}
        <Steps
          current={step}
          size="small"
          style={{ marginBottom: 28 }}
          items={STEP_LABELS.map((t) => ({ title: t }))}
        />

        {/* ── Step 0：账号信息 ── */}
        {step === 0 && (
          <Form form={form} onFinish={handleRegister} layout="vertical" size="large">
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '邮箱格式不正确' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: 'var(--color-text-secondary)' }} />}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="code"
              label="验证码"
              rules={[
                { required: true, message: '请输入验证码' },
                { len: 6, message: '请输入6位验证码' },
              ]}
            >
              <Input
                prefix={<NumberOutlined style={{ color: 'var(--color-text-secondary)' }} />}
                placeholder="6 位数字验证码"
                maxLength={6}
                suffix={
                  <Button
                    type="link"
                    size="small"
                    loading={codeSending}
                    disabled={countdown > 0 || codeSending}
                    onClick={handleSendCode}
                    style={{ padding: 0, fontSize: 13, color: 'var(--color-primary)' }}
                  >
                    {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                  </Button>
                }
              />
            </Form.Item>

            <Form.Item
              name="username"
              label="昵称"
              rules={[
                { required: true, message: '请设置昵称' },
                { min: 2, max: 50, message: '昵称须为 2–50 个字符' },
                {
                  pattern: /^[^\s].*[^\s]$|^[^\s]{1,2}$/,
                  message: '昵称不能以空格开头或结尾',
                },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: 'var(--color-text-secondary)' }} />}
                placeholder="你的书友昵称（2-50字符）"
                maxLength={50}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请设置密码' },
                { min: 8, max: 20, message: '密码须为 8–20 位' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--color-text-secondary)' }} />}
                placeholder="8–20 位密码"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认密码"
              dependencies={['password']}
              rules={[
                { required: true, message: '请再次输入密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次密码输入不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--color-text-secondary)' }} />}
                placeholder="再次输入密码"
                autoComplete="new-password"
              />
            </Form.Item>

            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              注册即代表同意《用户协议》和《隐私政策》
            </div>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 48,
                borderRadius: 8,
                background: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                fontSize: 16,
              }}
            >
              下一步
            </Button>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--color-text-secondary)' }}>
              已有账号？{' '}
              <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                直接登录
              </Link>
            </div>
          </Form>
        )}

        {/* ── Step 1：阅读偏好 ── */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 14 }}>
                选择你感兴趣的阅读类型（至少{' '}
                <Text strong style={{ color: 'var(--color-primary)' }}>3</Text>{' '}
                个），帮助我们推荐适合你的好书和书友
              </Text>
            </div>

            {/* 进度条 */}
            <Progress
              percent={Math.min(Math.round((selectedTags.length / 3) * 100), 100)}
              showInfo={false}
              strokeColor="var(--color-primary)"
              style={{ marginBottom: 16 }}
            />

            {tagsLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Spin tip="加载标签中..." />
              </div>
            ) : tags.length === 0 ? (
              /* 如果标签接口未就绪，允许跳过 */
              <div style={{
                textAlign: 'center', padding: '32px 0',
                color: 'var(--color-text-secondary)',
              }}>
                标签暂时无法加载，可稍后在个人设置中完善
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
                {tags.map((tag) => {
                  const selected = selectedTags.includes(tag.id);
                  return (
                    <Tag
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: 20,
                        padding: '5px 14px',
                        fontSize: 14,
                        userSelect: 'none',
                        transition: 'all 0.15s',
                        borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                        background: selected ? 'var(--color-accent)' : '#fff',
                        color: selected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                        fontWeight: selected ? 600 : 400,
                      }}
                      icon={selected ? <CheckCircleFilled /> : undefined}
                    >
                      {tag.name}
                    </Tag>
                  );
                })}
              </div>
            )}

            <div
              style={{
                fontSize: 13,
                color: selectedTags.length >= 3 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                marginBottom: 20,
                fontWeight: selectedTags.length >= 3 ? 600 : 400,
              }}
            >
              已选 {selectedTags.length} 个
              {selectedTags.length >= 3 && ' ✓'}
            </div>

            <Button
              type="primary"
              block
              loading={loading}
              disabled={tags.length > 0 && selectedTags.length < 3}
              onClick={handleSavePreferences}
              style={{
                height: 48,
                borderRadius: 8,
                background: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                fontSize: 16,
              }}
            >
              完成注册 🎉
            </Button>

            {tags.length === 0 && (
              <Button
                block
                onClick={() => navigate('/')}
                style={{ marginTop: 8, borderRadius: 8, height: 48 }}
              >
                跳过，稍后设置
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
