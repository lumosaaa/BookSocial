/**
 * M5 · 小组详情页
 * 路由：/groups/:id
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Tabs, Avatar, Tag, Spin, Empty, message,
  Card, Input, Popconfirm, Badge,
} from 'antd';
import {
  TeamOutlined, CrownOutlined, SafetyCertificateOutlined,
  UserOutlined, PlusOutlined, DeleteOutlined, LikeOutlined,
  LikeFilled, TrophyOutlined, LockOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import {
  getGroup, joinGroup, leaveGroup,
  listGroupPosts, createGroupPost, deleteGroupPost, toggleGroupPostLike,
  listChallenges,
  listMembers,
  approveJoin, setMemberRole, removeMember,
  type Group, type GroupPost, type Challenge, type GroupMember,
  ROLE_LABELS, isChallengeActive,
} from '../../api/groupApi';
import { uploadToCloudinary } from '../../api/authApi';

const { TabPane } = Tabs;

export default function GroupDetailPage() {
  const { id }     = useParams<{ id: string }>();
  const groupId    = Number(id);
  const navigate   = useNavigate();
  const user       = useAuthStore(s => s.user);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  const [group,    setGroup]    = useState<Group | null>(null);
  const [loading,  setLoading]  = useState(true);

  // 帖子 Tab
  const [posts,     setPosts]     = useState<GroupPost[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPage,  setPostsPage]  = useState(1);
  const [postsLoading, setPostsLoading] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [posting,    setPosting]   = useState(false);

  // 挑战 Tab
  const [challenges,    setChallenges]    = useState<Challenge[]>([]);
  const [chalLoading,   setChalLoading]   = useState(false);

  // 成员 Tab
  const [members,     setMembers]     = useState<GroupMember[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [memLoading,  setMemLoading]  = useState(false);

  // 当前 Tab
  const [tab, setTab] = useState('posts');

  // 加载小组基本信息
  useEffect(() => {
    (async () => {
      try {
        const g = await getGroup(groupId);
        setGroup(g);
      } catch {
        message.error('小组不存在');
        navigate('/groups');
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  // 加载帖子
  useEffect(() => {
    if (tab !== 'posts') return;
    (async () => {
      setPostsLoading(true);
      try {
        const res = await listGroupPosts(groupId, 1);
        setPosts(res.list);
        setPostsTotal(res.total);
        setPostsPage(2);
      } catch { /* ignore */ }
      finally { setPostsLoading(false); }
    })();
  }, [groupId, tab]);

  // 加载挑战
  useEffect(() => {
    if (tab !== 'challenges') return;
    (async () => {
      setChalLoading(true);
      try {
        const res = await listChallenges(groupId, { page: 1 });
        setChallenges(res.list);
      } catch { /* ignore */ }
      finally { setChalLoading(false); }
    })();
  }, [groupId, tab]);

  // 加载成员
  useEffect(() => {
    if (tab !== 'members') return;
    (async () => {
      setMemLoading(true);
      try {
        const res = await listMembers(groupId);
        setMembers(res.list);
        setMemberCount(res.total);
      } catch { /* ignore */ }
      finally { setMemLoading(false); }
    })();
  }, [groupId, tab]);

  const handleJoinOrLeave = async () => {
    if (!group) return;
    if (group.isMember) {
      try {
        await leaveGroup(groupId);
        message.success('已退出小组');
        setGroup(g => g ? { ...g, isMember: false, myRole: null, memberCount: g.memberCount - 1 } : g);
      } catch (err: any) { message.error(err?.response?.data?.message || '退出失败'); }
    } else {
      try {
        const res = await joinGroup(groupId);
        if (res.pending) { message.success('申请已提交，等待审核'); }
        else {
          message.success(`已加入「${group.name}」`);
          setGroup(g => g ? { ...g, isMember: true, myRole: 0, memberCount: g.memberCount + 1 } : g);
        }
      } catch (err: any) { message.error(err?.response?.data?.message || '加入失败'); }
    }
  };

  const handlePost = async () => {
    if (!newContent.trim()) return;
    setPosting(true);
    try {
      const post = await createGroupPost(groupId, { content: newContent.trim() });
      setPosts(prev => [post, ...prev]);
      setNewContent('');
      message.success('发布成功');
    } catch (err: any) {
      message.error(err?.response?.data?.message || '发布失败');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (post: GroupPost) => {
    if (!isLoggedIn) { message.info('请先登录'); return; }
    try {
      const res = await toggleGroupPostLike(groupId, post.id);
      setPosts(prev => prev.map(p => p.id === post.id
        ? { ...p, isLiked: res.liked, likeCount: res.likeCount }
        : p
      ));
    } catch { /* ignore */ }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await deleteGroupPost(groupId, postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      message.success('已删除');
    } catch (err: any) {
      message.error(err?.response?.data?.message || '删除失败');
    }
  };

  const myRole = group?.myRole;
  const isManager = myRole !== null && myRole !== undefined && myRole >= 1;

  const roleIcon = (role: number) => {
    if (role === 2) return <CrownOutlined style={{ color: '#faad14' }} />;
    if (role === 1) return <SafetyCertificateOutlined style={{ color: 'var(--color-primary)' }} />;
    return <UserOutlined style={{ color: 'var(--color-text-secondary)' }} />;
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  );
  if (!group) return null;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* 小组头部 */}
      <Card
        style={{ borderRadius: 16, marginBottom: 20, border: '1px solid var(--color-border)' }}
        bodyStyle={{ padding: 24 }}
      >
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <Avatar
            shape="square"
            size={80}
            src={group.coverUrl}
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-primary)',
              fontSize: 28,
              flexShrink: 0,
              borderRadius: 12,
            }}
          >
            {!group.coverUrl && group.name.slice(0, 2)}
          </Avatar>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: 'var(--color-text-primary)' }}>{group.name}</h2>
              {!group.isPublic && <LockOutlined style={{ color: 'var(--color-text-secondary)' }} />}
              {group.categoryName && <Tag color="green">{group.categoryName}</Tag>}
            </div>
            <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 12px', fontSize: 14 }}>
              {group.description || '暂无简介'}
            </p>
            <div style={{ display: 'flex', gap: 20, color: 'var(--color-text-secondary)', fontSize: 13 }}>
              <span><TeamOutlined /> {group.memberCount} 位成员</span>
              <span>📝 {group.postCount} 条动态</span>
              <span>由 <b>{group.creatorName}</b> 创建</span>
            </div>
          </div>
          <div>
            {isLoggedIn && (
              group.isMember ? (
                <Popconfirm title="确定退出该小组？" onConfirm={handleJoinOrLeave} okText="退出" cancelText="取消">
                  <Button danger style={{ borderRadius: 20 }}>退出小组</Button>
                </Popconfirm>
              ) : (
                <Button
                  type="primary"
                  onClick={handleJoinOrLeave}
                  style={{ borderRadius: 20, background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                >
                  {group.requireApproval ? '申请加入' : '加入小组'}
                </Button>
              )
            )}
            {isManager && (
              <Button
                style={{ marginTop: 8, borderRadius: 20, display: 'block' }}
                onClick={() => navigate(`/groups/${groupId}/settings`)}
              >
                管理小组
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tab 内容 */}
      <Tabs activeKey={tab} onChange={setTab}>
        {/* ── 帖子 Tab ── */}
        <TabPane tab="动态" key="posts">
          {group.isMember && (
            <Card
              style={{ borderRadius: 12, marginBottom: 16, border: '1px solid var(--color-border)' }}
              bodyStyle={{ padding: 16 }}
            >
              <Input.TextArea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="在组内分享一些想法..."
                rows={3}
                maxLength={1000}
                showCount
                style={{ marginBottom: 12, borderRadius: 8 }}
              />
              <div style={{ textAlign: 'right' }}>
                <Button
                  type="primary"
                  onClick={handlePost}
                  loading={posting}
                  disabled={!newContent.trim()}
                  style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)', borderRadius: 20 }}
                >
                  发布
                </Button>
              </div>
            </Card>
          )}

          {postsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : posts.length === 0 ? (
            <Empty description="暂无动态，来发第一条吧" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {posts.map(post => (
                <Card
                  key={post.id}
                  style={{ borderRadius: 12, border: '1px solid var(--color-border)' }}
                  bodyStyle={{ padding: '16px 20px' }}
                >
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <Avatar src={post.avatarUrl} style={{ background: 'var(--color-primary)', flexShrink: 0 }}>
                      {!post.avatarUrl && post.username?.[0]}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{post.username}</span>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginLeft: 8 }}>
                        {new Date(post.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    {(post.userId === user?.id || isManager) && (
                      <Popconfirm title="确定删除？" onConfirm={() => handleDeletePost(post.id)} okText="删除" cancelText="取消">
                        <Button type="text" icon={<DeleteOutlined />} danger size="small" />
                      </Popconfirm>
                    )}
                  </div>
                  <p style={{ color: 'var(--color-text-primary)', margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>
                    {post.content}
                  </p>
                  <div>
                    <Button
                      type="text"
                      icon={post.isLiked ? <LikeFilled style={{ color: 'var(--color-primary)' }} /> : <LikeOutlined />}
                      onClick={() => handleLike(post)}
                      style={{ color: post.isLiked ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontSize: 13 }}
                    >
                      {post.likeCount}
                    </Button>
                  </div>
                </Card>
              ))}
              {posts.length < postsTotal && (
                <Button block onClick={async () => {
                  const res = await listGroupPosts(groupId, postsPage);
                  setPosts(p => [...p, ...res.list]);
                  setPostsPage(n => n + 1);
                }} style={{ borderRadius: 8 }}>加载更多</Button>
              )}
            </div>
          )}
        </TabPane>

        {/* ── 挑战 Tab ── */}
        <TabPane tab={<span><TrophyOutlined />阅读挑战</span>} key="challenges">
          <Button
            icon={<PlusOutlined />}
            onClick={() => navigate(`/groups/${groupId}/challenges/new`)}
            style={{ marginBottom: 16, display: isManager ? 'inline-flex' : 'none', borderRadius: 20, borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
          >
            发布挑战
          </Button>
          {chalLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : challenges.length === 0 ? (
            <Empty description="暂无挑战" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {challenges.map(c => (
                <Card
                  key={c.id}
                  hoverable
                  onClick={() => navigate(`/groups/${groupId}/challenges/${c.id}`)}
                  style={{ borderRadius: 12, border: '1px solid var(--color-border)', cursor: 'pointer' }}
                  bodyStyle={{ padding: '16px 20px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)' }}>
                        🏆 {c.title}
                      </span>
                      <Tag
                        color={isChallengeActive(c) ? 'green' : 'default'}
                        style={{ marginLeft: 8 }}
                      >
                        {isChallengeActive(c) ? '进行中' : '已结束'}
                      </Tag>
                    </div>
                    {c.isParticipating && (
                      <Badge count={`已打卡 ${c.myCheckinCount} 次`} style={{ background: 'var(--color-primary)' }} />
                    )}
                  </div>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, margin: '8px 0' }}>
                    {c.description || '暂无描述'}
                  </p>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                    截止：{new Date(c.deadline).toLocaleDateString('zh-CN')}
                    <span style={{ margin: '0 8px' }}>·</span>
                    {c.participantCount} 人参与
                    {c.bookTitle && <span>  · 目标：《{c.bookTitle}》</span>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabPane>

        {/* ── 成员 Tab ── */}
        <TabPane tab={`成员 ${group.memberCount}`} key="members">
          {memLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map(m => (
                <div
                  key={m.userId}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, background: 'var(--color-accent)' }}
                >
                  <Avatar
                    src={m.avatarUrl}
                    style={{ background: 'var(--color-primary)', flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => navigate(`/users/${m.userId}`)}
                  >
                    {!m.avatarUrl && m.username[0]}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', cursor: 'pointer' }}
                      onClick={() => navigate(`/users/${m.userId}`)}>
                      {m.username}
                    </span>
                    <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {roleIcon(m.role)} {ROLE_LABELS[m.role]}
                    </span>
                  </div>
                  {/* 管理操作（仅组长对其他成员可见） */}
                  {myRole === 2 && m.userId !== user?.id && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {m.role === 0 && (
                        <Button size="small" onClick={() => setMemberRole(groupId, m.userId, 1).then(() => {
                          setMembers(prev => prev.map(mem => mem.userId === m.userId ? { ...mem, role: 1 } : mem));
                        })}>设为管理员</Button>
                      )}
                      {m.role === 1 && (
                        <Button size="small" onClick={() => setMemberRole(groupId, m.userId, 0).then(() => {
                          setMembers(prev => prev.map(mem => mem.userId === m.userId ? { ...mem, role: 0 } : mem));
                        })}>取消管理员</Button>
                      )}
                      <Popconfirm title="确定移除该成员？" onConfirm={() => removeMember(groupId, m.userId).then(() => {
                        setMembers(prev => prev.filter(mem => mem.userId !== m.userId));
                      })} okText="移除" cancelText="取消">
                        <Button size="small" danger>移除</Button>
                      </Popconfirm>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabPane>
      </Tabs>
    </div>
  );
}
