// src/pages/auth/LoginPage.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Form, Input, Button, Tabs, Divider, message, Typography,
} from 'antd';
import { MailOutlined, LockOutlined, NumberOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { authApi, userApi } from '../../api/authApi';

const { Text } = Typography;
const GOOGLE_AUTH_URL = `${new URL(import.meta.env.VITE_API_URL || 'http://localhost:3001').origin}/auth/google`;

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser  = useAuthStore((s) => s.setUser);

  const [loading, setLoading]         = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [countdown, setCountdown]     = useState(0);
  const [activeTab, setActiveTab]     = useState<'password' | 'code'>('password');
  const [form] = Form.useForm();

  /* ── 验证码倒计时 ── */
  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((v) => {
        if (v <= 1) { clearInterval(timer); return 0; }
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
        ?.response?.data?.message || '发送失败，请稍后重试';
      message.error(msg);
    } finally {
      setCodeSending(false);
    }
  };

  /* ── 登录提交 ── */
  const handleLogin = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const payload =
        activeTab === 'password'
          ? { email: values.email, password: values.password }
          : { email: values.email, code: values.code };

      const { data } = await authApi.login(payload);
      const { user, accessToken, refreshToken } = data.data;
      setUser(user, accessToken, refreshToken);
      message.success('登录成功，欢迎回来！');
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || '登录失败，请检查邮箱或密码';
      message.error(msg);
    } finally {
      setLoading(false);
    }
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
          maxWidth: 420,
          background: '#fff',
          borderRadius: 16,
          padding: '40px 36px',
          boxShadow: '0 8px 32px rgba(44,62,45,0.10)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 34, lineHeight: 1 }}>📖</div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--color-primary)',
              marginTop: 8,
            }}
          >
            书·友
          </div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            BookSocial — 与书结缘
          </Text>
        </div>

        {/* Google 登录按钮（遵循 Google 品牌规范） */}
        <a href={GOOGLE_AUTH_URL}>
          <Button
            block
            size="large"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              height: 48,
              border: '1px solid #dadce0',
              borderRadius: 8,
              background: '#fff',
              color: '#3c4043',
              fontWeight: 500,
              fontSize: 15,
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              marginBottom: 4,
            }}
          >
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google"
              width={20}
              height={20}
              style={{ flexShrink: 0 }}
            />
            使用 Google 账号登录
          </Button>
        </a>

        <Divider style={{ color: 'var(--color-text-secondary)', fontSize: 13, margin: '20px 0' }}>
          或使用邮箱登录
        </Divider>

        {/* 登录方式 Tab */}
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as 'password' | 'code')}
          size="small"
          style={{ marginBottom: 8 }}
          items={[
            { key: 'password', label: '密码登录' },
            { key: 'code',     label: '验证码登录' },
          ]}
        />

        <Form form={form} onFinish={handleLogin} layout="vertical" size="large">
          {/* 邮箱 */}
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: 'var(--color-text-secondary)' }} />}
              placeholder="邮箱地址"
              autoComplete="email"
            />
          </Form.Item>

          {/* 密码 or 验证码 */}
          {activeTab === 'password' ? (
            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--color-text-secondary)' }} />}
                placeholder="密码"
                autoComplete="current-password"
              />
            </Form.Item>
          ) : (
            <Form.Item
              name="code"
              rules={[
                { required: true, message: '请输入验证码' },
                { len: 6, message: '验证码为6位数字' },
              ]}
            >
              <Input
                prefix={<NumberOutlined style={{ color: 'var(--color-text-secondary)' }} />}
                placeholder="6 位验证码"
                maxLength={6}
                suffix={
                  <Button
                    type="link"
                    size="small"
                    disabled={countdown > 0 || codeSending}
                    loading={codeSending}
                    onClick={handleSendCode}
                    style={{ padding: 0, fontSize: 13, color: 'var(--color-primary)' }}
                  >
                    {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                  </Button>
                }
              />
            </Form.Item>
          )}

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
              marginTop: 4,
            }}
          >
            登录
          </Button>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 20, color: 'var(--color-text-secondary)', fontSize: 14 }}>
          还没有账号？{' '}
          <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            立即注册
          </Link>
        </div>
      </div>
    </div>
  );
}
