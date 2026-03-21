// src/pages/profile/UserProfilePage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Avatar, Button, Tabs, Spin, Statistic,
  Row, Col, message, Tag, Result,
} from 'antd';
import { UserOutlined, MessageOutlined, PlusOutlined, CheckOutlined } from '@ant-design/icons';
import { userApi } from '../../api/authApi';
import { useAuthStore } from '../../store/authStore';

interface Profile {
  id: number;
  username: string;
  avatarUrl: string;
  bio: string;
  city: string;
  coverImage: string;
  bookCount: number;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
  isMutual: boolean;
}

export default function UserProfilePage() {
  const { id }         = useParams<{ id: string }>();
  const navigate       = useNavigate();
  const currentUser    = useAuthStore((s) => s.user);
  const isLoggedIn     = useAuthStore((s) => s.isLoggedIn);

  const [profile, setProfile]           = useState<Profile | null>(null);
  const [loading, setLoading]           = useState(true);
  const [notFound, setNotFound]         = useState(false);
  const [following, setFollowing]       = useState(false);
  const [isMutual, setIsMutual]         = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    userApi
      .getUser(parseInt(id))
      .then(({ data }) => {
        const p = data.data;
        setProfile(p);
        setFollowing(p.isFollowing);
        setIsMutual(p.isMutual);
      })
      .catch((err) => {
        if (err?.response?.status === 404 || err?.response?.status === 403) {
          setNotFound(true);
        } else {
          message.error('加载用户信息失败');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleFollowToggle = async () => {
    if (!isLoggedIn) {
      message.info('请先登录');
      return navigate('/login');
    }
    if (!profile) return;
    setFollowLoading(true);
    try {
      const { data } = await userApi.toggleFollow(profile.id);
      const { isFollowing: newFollowing, isMutual: newMutual } = data.data;
      setFollowing(newFollowing);
      setIsMutual(newMutual);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followerCount: prev.followerCount + (newFollowing ? 1 : -1),
              isMutual: newMutual,
              isFollowing: newFollowing,
            }
          : null
      );
      if (newFollowing) {
        message.success(newMutual ? '互相关注成为书友！' : '关注成功');
      } else {
        message.success('已取消关注');
      }
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <Result
        status="404"
        title="用户不存在"
        subTitle="该用户可能已注销或将主页设为私密"
        extra={
          <Button
            onClick={() => navigate('/')}
            style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' }}
          >
            返回首页
          </Button>
        }
      />
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* ── 封面 ── */}
      <div
        style={{
          height: 180,
          background: profile.coverImage
            ? `url(${profile.coverImage}) center/cover no-repeat`
            : 'linear-gradient(135deg, #6B8F62 0%, #4A6741 100%)',
        }}
      />

      {/* ── 用户信息区 ── */}
      <div style={{ padding: '0 24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: -44,
            marginBottom: 12,
          }}
        >
          {/* 头像 */}
          <Avatar
            size={88}
            src={profile.avatarUrl}
            icon={<UserOutlined />}
            style={{
              border: '4px solid #fff',
              background: 'var(--color-accent)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />

          {/* 操作按钮（非本人才显示） */}
          {!isOwnProfile && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 8 }}>
              {isMutual && (
                <Button
                  icon={<MessageOutlined />}
                  onClick={() => navigate(`/messages?userId=${profile.id}`)}
                  style={{ borderRadius: 20 }}
                >
                  私信
                </Button>
              )}
              <Button
                type={following ? 'default' : 'primary'}
                loading={followLoading}
                icon={following ? <CheckOutlined /> : <PlusOutlined />}
                onClick={handleFollowToggle}
                style={{
                  borderRadius: 20,
                  minWidth: 88,
                  ...(following
                    ? { color: 'var(--color-text-secondary)' }
                    : {
                        background: 'var(--color-primary)',
                        borderColor: 'var(--color-primary)',
                      }),
                }}
              >
                {following ? (isMutual ? '书友' : '已关注') : '关注'}
              </Button>
            </div>
          )}

          {isOwnProfile && (
            <Button
              size="small"
              onClick={() => navigate('/profile')}
              style={{ borderRadius: 20, marginBottom: 8 }}
            >
              查看我的主页
            </Button>
          )}
        </div>

        {/* 昵称 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {profile.username}
          </span>
          {isMutual && (
            <Tag
              style={{
                borderRadius: 20,
                border: 'none',
                background: 'var(--color-accent)',
                color: 'var(--color-primary)',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              书友
            </Tag>
          )}
        </div>

        {profile.city && (
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            📍 {profile.city}
          </div>
        )}
        {profile.bio && (
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 8, lineHeight: 1.7 }}>
            {profile.bio}
          </p>
        )}

        {/* 统计 */}
        <Row gutter={0} style={{ marginTop: 20, marginBottom: 16 }}>
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
      </div>

      {/* ── 内容 Tab ── */}
      <Tabs
        style={{ padding: '0 24px' }}
        items={[
          {
            key: 'posts',
            label: '动态',
            children: (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 12 }}>📝</div>
                <div>暂无公开动态</div>
              </div>
            ),
          },
          {
            key: 'shelf',
            label: '书架',
            children: (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 12 }}>📚</div>
                <div>书架暂不公开</div>
              </div>
            ),
          },
          {
            key: 'notes',
            label: '笔记',
            children: (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }}>
                <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 12 }}>📒</div>
                <div>暂无公开笔记</div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
