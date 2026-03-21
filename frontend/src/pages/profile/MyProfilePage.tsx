// src/pages/profile/MyProfilePage.tsx
import { useState, useEffect } from 'react';
import {
  Avatar, Button, Tabs, Spin, Statistic,
  Row, Col, Skeleton, message,
} from 'antd';
import {
  EditOutlined, SettingOutlined, UserOutlined,
  BookOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../api/authApi';
import { useAuthStore } from '../../store/authStore';

interface Profile {
  id: number;
  username: string;
  email: string;
  avatarUrl: string;
  bio: string;
  city: string;
  gender: number;
  coverImage: string;
  bookCount: number;
  followerCount: number;
  followingCount: number;
  postCount: number;
  readingGoal: number;
  createdAt: string;
}

export default function MyProfilePage() {
  const navigate = useNavigate();
  const clearUser   = useAuthStore((s) => s.clearUser);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi
      .getMe()
      .then(({ data }) => setProfile(data.data))
      .catch(() => message.error('加载用户信息失败'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    clearUser();
    message.success('已退出登录');
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Skeleton active paragraph={{ rows: 6 }} style={{ padding: 24 }} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* ── 封面图 ── */}
      <div
        style={{
          height: 180,
          background: profile.coverImage
            ? `url(${profile.coverImage}) center/cover no-repeat`
            : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light, #6B8F62) 100%)',
          position: 'relative',
          borderRadius: '0 0 0 0',
        }}
      >
        {/* 操作按钮组 */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 16,
            display: 'flex',
            gap: 8,
          }}
        >
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate('/profile/edit')}
            style={{
              borderRadius: 20,
              background: 'rgba(255,255,255,0.92)',
              border: 'none',
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            编辑资料
          </Button>
          <Button
            icon={<SettingOutlined />}
            size="small"
            onClick={() => navigate('/profile/privacy')}
            style={{
              borderRadius: 20,
              background: 'rgba(255,255,255,0.92)',
              border: 'none',
            }}
          />
          <Button
            icon={<LogoutOutlined />}
            size="small"
            onClick={handleLogout}
            style={{
              borderRadius: 20,
              background: 'rgba(255,255,255,0.92)',
              border: 'none',
              color: '#d64045',
            }}
          />
        </div>
      </div>

      {/* ── 用户信息区 ── */}
      <div style={{ padding: '0 24px' }}>
        {/* 头像（叠在封面下方） */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: -44,
            marginBottom: 12,
          }}
        >
          <Avatar
            size={88}
            src={profile.avatarUrl}
            icon={<UserOutlined />}
            style={{
              border: '4px solid #fff',
              background: 'var(--color-accent)',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
        </div>

        {/* 昵称 & 位置 */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: 4,
            lineHeight: 1.3,
          }}
        >
          {profile.username}
        </div>
        {profile.city && (
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            📍 {profile.city}
          </div>
        )}
        {profile.bio && (
          <p
            style={{
              fontSize: 14,
              color: 'var(--color-text-secondary)',
              marginTop: 8,
              marginBottom: 0,
              lineHeight: 1.7,
            }}
          >
            {profile.bio}
          </p>
        )}

        {/* 统计数据 */}
        <Row gutter={0} style={{ marginTop: 20, marginBottom: 12 }}>
          {[
            { label: '已读', value: profile.bookCount },
            { label: '关注', value: profile.followingCount },
            { label: '粉丝', value: profile.followerCount },
            { label: '动态', value: profile.postCount },
          ].map((item) => (
            <Col key={item.label} span={6}>
              <Statistic
                title={
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {item.label}
                  </span>
                }
                value={item.value}
                valueStyle={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.2,
                }}
              />
            </Col>
          ))}
        </Row>

        {/* 年度阅读目标 */}
        {profile.readingGoal > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-accent)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              marginBottom: 16,
            }}
          >
            🎯 今年目标读{' '}
            <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
              {profile.readingGoal}
            </span>{' '}
            本
          </div>
        )}
      </div>

      {/* ── 内容 Tab ── */}
      <Tabs
        style={{ padding: '0 24px' }}
        tabBarStyle={{ marginBottom: 0 }}
        items={[
          {
            key: 'posts',
            label: `动态 ${profile.postCount > 0 ? profile.postCount : ''}`,
            children: (
              <div
                style={{
                  textAlign: 'center',
                  padding: '48px 0',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📝</div>
                <div>暂无动态，快去分享你的阅读感悟吧</div>
                <Button
                  type="primary"
                  style={{
                    marginTop: 16,
                    background: 'var(--color-primary)',
                    borderColor: 'var(--color-primary)',
                    borderRadius: 20,
                  }}
                  onClick={() => navigate('/create')}
                >
                  发布动态
                </Button>
              </div>
            ),
          },
          {
            key: 'shelf',
            label: `书架 ${profile.bookCount > 0 ? profile.bookCount : ''}`,
            children: (
              <div
                style={{
                  textAlign: 'center',
                  padding: '48px 0',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <BookOutlined style={{ fontSize: 48, opacity: 0.2, marginBottom: 12 }} />
                <div>书架还是空的，快去添加喜欢的书籍</div>
                <Button
                  type="primary"
                  style={{
                    marginTop: 16,
                    background: 'var(--color-primary)',
                    borderColor: 'var(--color-primary)',
                    borderRadius: 20,
                  }}
                  onClick={() => navigate('/search')}
                >
                  搜索书籍
                </Button>
              </div>
            ),
          },
          {
            key: 'notes',
            label: '笔记',
            children: (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📒</div>
                <div>还没有阅读笔记</div>
              </div>
            ),
          },
          {
            key: 'bookmarks',
            label: '收藏',
            children: (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🔖</div>
                <div>还没有收藏内容</div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
