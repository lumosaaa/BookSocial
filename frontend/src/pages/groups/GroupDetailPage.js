import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * M5 · 小组详情页
 * 路由：/groups/:id
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Tabs, Avatar, Tag, Spin, Empty, message, Card, Input, Popconfirm, Badge, } from 'antd';
import { TeamOutlined, CrownOutlined, SafetyCertificateOutlined, UserOutlined, PlusOutlined, DeleteOutlined, LikeOutlined, LikeFilled, TrophyOutlined, LockOutlined, } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { getGroup, joinGroup, leaveGroup, listGroupPosts, createGroupPost, deleteGroupPost, toggleGroupPostLike, listChallenges, listMembers, setMemberRole, removeMember, ROLE_LABELS, isChallengeActive, } from '../../api/groupApi';
const { TabPane } = Tabs;
export default function GroupDetailPage() {
    const { id } = useParams();
    const groupId = Number(id);
    const navigate = useNavigate();
    const user = useAuthStore(s => s.user);
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    // 帖子 Tab
    const [posts, setPosts] = useState([]);
    const [postsTotal, setPostsTotal] = useState(0);
    const [postsPage, setPostsPage] = useState(1);
    const [postsLoading, setPostsLoading] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [posting, setPosting] = useState(false);
    // 挑战 Tab
    const [challenges, setChallenges] = useState([]);
    const [chalLoading, setChalLoading] = useState(false);
    // 成员 Tab
    const [members, setMembers] = useState([]);
    const [memberCount, setMemberCount] = useState(0);
    const [memLoading, setMemLoading] = useState(false);
    // 当前 Tab
    const [tab, setTab] = useState('posts');
    // 加载小组基本信息
    useEffect(() => {
        (async () => {
            try {
                const g = await getGroup(groupId);
                setGroup(g);
            }
            catch {
                message.error('小组不存在');
                navigate('/groups');
            }
            finally {
                setLoading(false);
            }
        })();
    }, [groupId]);
    // 加载帖子
    useEffect(() => {
        if (tab !== 'posts')
            return;
        (async () => {
            setPostsLoading(true);
            try {
                const res = await listGroupPosts(groupId, 1);
                setPosts(res.list);
                setPostsTotal(res.total);
                setPostsPage(2);
            }
            catch { /* ignore */ }
            finally {
                setPostsLoading(false);
            }
        })();
    }, [groupId, tab]);
    // 加载挑战
    useEffect(() => {
        if (tab !== 'challenges')
            return;
        (async () => {
            setChalLoading(true);
            try {
                const res = await listChallenges(groupId, { page: 1 });
                setChallenges(res.list);
            }
            catch { /* ignore */ }
            finally {
                setChalLoading(false);
            }
        })();
    }, [groupId, tab]);
    // 加载成员
    useEffect(() => {
        if (tab !== 'members')
            return;
        (async () => {
            setMemLoading(true);
            try {
                const res = await listMembers(groupId);
                setMembers(res.list);
                setMemberCount(res.total);
            }
            catch { /* ignore */ }
            finally {
                setMemLoading(false);
            }
        })();
    }, [groupId, tab]);
    const handleJoinOrLeave = async () => {
        if (!group)
            return;
        if (group.isMember) {
            try {
                await leaveGroup(groupId);
                message.success('已退出小组');
                setGroup(g => g ? { ...g, isMember: false, myRole: null, memberCount: g.memberCount - 1 } : g);
            }
            catch (err) {
                message.error(err?.response?.data?.message || '退出失败');
            }
        }
        else {
            try {
                const res = await joinGroup(groupId);
                if (res.pending) {
                    message.success('申请已提交，等待审核');
                }
                else {
                    message.success(`已加入「${group.name}」`);
                    setGroup(g => g ? { ...g, isMember: true, myRole: 0, memberCount: g.memberCount + 1 } : g);
                }
            }
            catch (err) {
                message.error(err?.response?.data?.message || '加入失败');
            }
        }
    };
    const handlePost = async () => {
        if (!newContent.trim())
            return;
        setPosting(true);
        try {
            const post = await createGroupPost(groupId, { content: newContent.trim() });
            setPosts(prev => [post, ...prev]);
            setNewContent('');
            message.success('发布成功');
        }
        catch (err) {
            message.error(err?.response?.data?.message || '发布失败');
        }
        finally {
            setPosting(false);
        }
    };
    const handleLike = async (post) => {
        if (!isLoggedIn) {
            message.info('请先登录');
            return;
        }
        try {
            const res = await toggleGroupPostLike(groupId, post.id);
            setPosts(prev => prev.map(p => p.id === post.id
                ? { ...p, isLiked: res.liked, likeCount: res.likeCount }
                : p));
        }
        catch { /* ignore */ }
    };
    const handleDeletePost = async (postId) => {
        try {
            await deleteGroupPost(groupId, postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
            message.success('已删除');
        }
        catch (err) {
            message.error(err?.response?.data?.message || '删除失败');
        }
    };
    const myRole = group?.myRole;
    const isManager = myRole !== null && myRole !== undefined && myRole >= 1;
    const roleIcon = (role) => {
        if (role === 2)
            return _jsx(CrownOutlined, { style: { color: '#faad14' } });
        if (role === 1)
            return _jsx(SafetyCertificateOutlined, { style: { color: 'var(--color-primary)' } });
        return _jsx(UserOutlined, { style: { color: 'var(--color-text-secondary)' } });
    };
    if (loading)
        return (_jsx("div", { style: { textAlign: 'center', padding: 80 }, children: _jsx(Spin, { size: "large" }) }));
    if (!group)
        return null;
    return (_jsxs("div", { style: { maxWidth: 720, margin: '0 auto', padding: '24px 16px' }, children: [_jsx(Card, { style: { borderRadius: 16, marginBottom: 20, border: '1px solid var(--color-border)' }, bodyStyle: { padding: 24 }, children: _jsxs("div", { style: { display: 'flex', gap: 20, alignItems: 'flex-start' }, children: [_jsx(Avatar, { shape: "square", size: 80, src: group.coverUrl, style: {
                                background: 'var(--color-accent)',
                                color: 'var(--color-primary)',
                                fontSize: 28,
                                flexShrink: 0,
                                borderRadius: 12,
                            }, children: !group.coverUrl && group.name.slice(0, 2) }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }, children: [_jsx("h2", { style: { margin: 0, fontSize: 20, color: 'var(--color-text-primary)' }, children: group.name }), !group.isPublic && _jsx(LockOutlined, { style: { color: 'var(--color-text-secondary)' } }), group.categoryName && _jsx(Tag, { color: "green", children: group.categoryName })] }), _jsx("p", { style: { color: 'var(--color-text-secondary)', margin: '0 0 12px', fontSize: 14 }, children: group.description || '暂无简介' }), _jsxs("div", { style: { display: 'flex', gap: 20, color: 'var(--color-text-secondary)', fontSize: 13 }, children: [_jsxs("span", { children: [_jsx(TeamOutlined, {}), " ", group.memberCount, " \u4F4D\u6210\u5458"] }), _jsxs("span", { children: ["\uD83D\uDCDD ", group.postCount, " \u6761\u52A8\u6001"] }), _jsxs("span", { children: ["\u7531 ", _jsx("b", { children: group.creatorName }), " \u521B\u5EFA"] })] })] }), _jsxs("div", { children: [isLoggedIn && (group.isMember ? (_jsx(Popconfirm, { title: "\u786E\u5B9A\u9000\u51FA\u8BE5\u5C0F\u7EC4\uFF1F", onConfirm: handleJoinOrLeave, okText: "\u9000\u51FA", cancelText: "\u53D6\u6D88", children: _jsx(Button, { danger: true, style: { borderRadius: 20 }, children: "\u9000\u51FA\u5C0F\u7EC4" }) })) : (_jsx(Button, { type: "primary", onClick: handleJoinOrLeave, style: { borderRadius: 20, background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }, children: group.requireApproval ? '申请加入' : '加入小组' }))), isManager && (_jsx(Button, { style: { marginTop: 8, borderRadius: 20, display: 'block' }, onClick: () => navigate(`/groups/${groupId}/settings`), children: "\u7BA1\u7406\u5C0F\u7EC4" }))] })] }) }), _jsxs(Tabs, { activeKey: tab, onChange: setTab, children: [_jsxs(TabPane, { tab: "\u52A8\u6001", children: [group.isMember && (_jsxs(Card, { style: { borderRadius: 12, marginBottom: 16, border: '1px solid var(--color-border)' }, bodyStyle: { padding: 16 }, children: [_jsx(Input.TextArea, { value: newContent, onChange: e => setNewContent(e.target.value), placeholder: "\u5728\u7EC4\u5185\u5206\u4EAB\u4E00\u4E9B\u60F3\u6CD5...", rows: 3, maxLength: 1000, showCount: true, style: { marginBottom: 12, borderRadius: 8 } }), _jsx("div", { style: { textAlign: 'right' }, children: _jsx(Button, { type: "primary", onClick: handlePost, loading: posting, disabled: !newContent.trim(), style: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', borderRadius: 20 }, children: "\u53D1\u5E03" }) })] })), postsLoading ? (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx(Spin, {}) })) : posts.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u52A8\u6001\uFF0C\u6765\u53D1\u7B2C\u4E00\u6761\u5427" })) : (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [posts.map(post => (_jsxs(Card, { style: { borderRadius: 12, border: '1px solid var(--color-border)' }, bodyStyle: { padding: '16px 20px' }, children: [_jsxs("div", { style: { display: 'flex', gap: 12, marginBottom: 12 }, children: [_jsx(Avatar, { src: post.avatarUrl, style: { background: 'var(--color-primary)', flexShrink: 0 }, children: !post.avatarUrl && post.username?.[0] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("span", { style: { fontWeight: 600, color: 'var(--color-text-primary)' }, children: post.username }), _jsx("span", { style: { color: 'var(--color-text-secondary)', fontSize: 12, marginLeft: 8 }, children: new Date(post.createdAt).toLocaleString('zh-CN') })] }), (post.userId === user?.id || isManager) && (_jsx(Popconfirm, { title: "\u786E\u5B9A\u5220\u9664\uFF1F", onConfirm: () => handleDeletePost(post.id), okText: "\u5220\u9664", cancelText: "\u53D6\u6D88", children: _jsx(Button, { type: "text", icon: _jsx(DeleteOutlined, {}), danger: true, size: "small" }) }))] }), _jsx("p", { style: { color: 'var(--color-text-primary)', margin: '0 0 12px', whiteSpace: 'pre-wrap' }, children: post.content }), _jsx("div", { children: _jsx(Button, { type: "text", icon: post.isLiked ? _jsx(LikeFilled, { style: { color: 'var(--color-primary)' } }) : _jsx(LikeOutlined, {}), onClick: () => handleLike(post), style: { color: post.isLiked ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontSize: 13 }, children: post.likeCount }) })] }, post.id))), posts.length < postsTotal && (_jsx(Button, { block: true, onClick: async () => {
                                            const res = await listGroupPosts(groupId, postsPage);
                                            setPosts(p => [...p, ...res.list]);
                                            setPostsPage(n => n + 1);
                                        }, style: { borderRadius: 8 }, children: "\u52A0\u8F7D\u66F4\u591A" }))] }))] }, "posts"), _jsxs(TabPane, { tab: _jsxs("span", { children: [_jsx(TrophyOutlined, {}), "\u9605\u8BFB\u6311\u6218"] }), children: [_jsx(Button, { icon: _jsx(PlusOutlined, {}), onClick: () => navigate(`/groups/${groupId}/challenges/new`), style: { marginBottom: 16, display: isManager ? 'inline-flex' : 'none', borderRadius: 20, borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }, children: "\u53D1\u5E03\u6311\u6218" }), chalLoading ? (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx(Spin, {}) })) : challenges.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u6311\u6218" })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: challenges.map(c => (_jsxs(Card, { hoverable: true, onClick: () => navigate(`/groups/${groupId}/challenges/${c.id}`), style: { borderRadius: 12, border: '1px solid var(--color-border)', cursor: 'pointer' }, bodyStyle: { padding: '16px 20px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs("div", { children: [_jsxs("span", { style: { fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)' }, children: ["\uD83C\uDFC6 ", c.title] }), _jsx(Tag, { color: isChallengeActive(c) ? 'green' : 'default', style: { marginLeft: 8 }, children: isChallengeActive(c) ? '进行中' : '已结束' })] }), c.isParticipating && (_jsx(Badge, { count: `已打卡 ${c.myCheckinCount} 次`, style: { background: 'var(--color-primary)' } }))] }), _jsx("p", { style: { color: 'var(--color-text-secondary)', fontSize: 13, margin: '8px 0' }, children: c.description || '暂无描述' }), _jsxs("div", { style: { color: 'var(--color-text-secondary)', fontSize: 12 }, children: ["\u622A\u6B62\uFF1A", new Date(c.deadline).toLocaleDateString('zh-CN'), _jsx("span", { style: { margin: '0 8px' }, children: "\u00B7" }), c.participantCount, " \u4EBA\u53C2\u4E0E", c.bookTitle && _jsxs("span", { children: ["  \u00B7 \u76EE\u6807\uFF1A\u300A", c.bookTitle, "\u300B"] })] })] }, c.id))) }))] }, "challenges"), _jsx(TabPane, { tab: `成员 ${group.memberCount}`, children: memLoading ? (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx(Spin, {}) })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: members.map(m => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, background: 'var(--color-accent)' }, children: [_jsx(Avatar, { src: m.avatarUrl, style: { background: 'var(--color-primary)', flexShrink: 0, cursor: 'pointer' }, onClick: () => navigate(`/users/${m.userId}`), children: !m.avatarUrl && m.username[0] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("span", { style: { fontWeight: 600, color: 'var(--color-text-primary)', cursor: 'pointer' }, onClick: () => navigate(`/users/${m.userId}`), children: m.username }), _jsxs("span", { style: { marginLeft: 8, fontSize: 12, color: 'var(--color-text-secondary)' }, children: [roleIcon(m.role), " ", ROLE_LABELS[m.role]] })] }), myRole === 2 && m.userId !== user?.id && (_jsxs("div", { style: { display: 'flex', gap: 8 }, children: [m.role === 0 && (_jsx(Button, { size: "small", onClick: () => setMemberRole(groupId, m.userId, 1).then(() => {
                                                    setMembers(prev => prev.map(mem => mem.userId === m.userId ? { ...mem, role: 1 } : mem));
                                                }), children: "\u8BBE\u4E3A\u7BA1\u7406\u5458" })), m.role === 1 && (_jsx(Button, { size: "small", onClick: () => setMemberRole(groupId, m.userId, 0).then(() => {
                                                    setMembers(prev => prev.map(mem => mem.userId === m.userId ? { ...mem, role: 0 } : mem));
                                                }), children: "\u53D6\u6D88\u7BA1\u7406\u5458" })), _jsx(Popconfirm, { title: "\u786E\u5B9A\u79FB\u9664\u8BE5\u6210\u5458\uFF1F", onConfirm: () => removeMember(groupId, m.userId).then(() => {
                                                    setMembers(prev => prev.filter(mem => mem.userId !== m.userId));
                                                }), okText: "\u79FB\u9664", cancelText: "\u53D6\u6D88", children: _jsx(Button, { size: "small", danger: true, children: "\u79FB\u9664" }) })] }))] }, m.userId))) })) }, "members")] })] }));
}
