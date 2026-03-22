/**
 * M5 · 小组列表页
 * 路由：/groups
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Select, Card, Avatar, Badge, Tag, Spin, Empty, Modal, Form, Switch, message } from 'antd';
import { PlusOutlined, TeamOutlined, SearchOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import {
  listGroups, createGroup, joinGroup,
  type Group,
} from '../../api/groupApi';

const { Option } = Select;

const CATEGORY_OPTIONS = [
  { value: 0, label: '不限' },
  { value: 1, label: '文学' },
  { value: 2, label: '科技' },
  { value: 3, label: '历史' },
  { value: 7, label: '心理学' },
  { value: 9, label: '生活方式' },
];

export default function GroupListPage() {
  const navigate  = useNavigate();
  const user      = useAuthStore(s => s.user);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  const [groups,   setGroups]   = useState<Group[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [q,        setQ]        = useState('');
  const [category, setCategory] = useState<number | undefined>(undefined);

  // 创建小组弹窗
  const [creating,  setCreating]  = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchGroups = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const p = reset ? 1 : page;
      const res = await listGroups({ q, category, page: p });
      setGroups(prev => reset ? res.list : [...prev, ...res.list]);
      setTotal(res.total);
      if (!reset) setPage(p + 1);
      else setPage(2);
    } catch {
      message.error('获取小组列表失败');
    } finally {
      setLoading(false);
    }
  }, [q, category, page]);

  useEffect(() => {
    fetchGroups(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category]);

  const handleJoin = async (group: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) { message.info('请先登录'); return; }
    try {
      const res = await joinGroup(group.id);
      if (res.pending) {
        message.success('申请已提交，等待审核');
      } else {
        message.success(`已加入「${group.name}」`);
        setGroups(prev => prev.map(g => g.id === group.id
          ? { ...g, isMember: true, myRole: 0, memberCount: g.memberCount + 1 }
          : g
        ));
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || '加入失败');
    }
  };

  const handleCreate = async (values: any) => {
    setCreateLoading(true);
    try {
      const group = await createGroup({
        name:            values.name,
        description:     values.description || '',
        categoryId:      values.categoryId,
        isPublic:        values.isPublic !== false,
        requireApproval: values.requireApproval === true,
      });
      message.success('小组创建成功');
      setCreating(false);
      form.resetFields();
      navigate(`/groups/${group.id}`);
    } catch (err: any) {
      message.error(err?.response?.data?.message || '创建失败');
    } finally {
      setCreateLoading(false);
    }
  };

  const hasMore = groups.length < total;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* 页头 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 22, fontWeight: 700 }}>
          <TeamOutlined style={{ marginRight: 8 }} />读书小组
        </h2>
        {isLoggedIn && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreating(true)}
            style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
          >
            创建小组
          </Button>
        )}
      </div>

      {/* 搜索栏 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索小组名称..."
          value={q}
          onChange={e => setQ(e.target.value)}
          allowClear
          style={{ flex: 1 }}
        />
        <Select
          value={category}
          onChange={setCategory}
          placeholder="书籍分类"
          allowClear
          style={{ width: 140 }}
        >
          {CATEGORY_OPTIONS.map(c => <Option key={c.value} value={c.value}>{c.label}</Option>)}
        </Select>
      </div>

      {/* 小组列表 */}
      {loading && groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : groups.length === 0 ? (
        <Empty description="暂无小组" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.map(group => (
            <Card
              key={group.id}
              hoverable
              onClick={() => navigate(`/groups/${group.id}`)}
              style={{ borderRadius: 12, border: '1px solid var(--color-border)' }}
              bodyStyle={{ padding: '16px 20px' }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* 封面 */}
                <Avatar
                  shape="square"
                  size={64}
                  src={group.coverUrl}
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-primary)',
                    fontSize: 24,
                    flexShrink: 0,
                    borderRadius: 8,
                  }}
                >
                  {!group.coverUrl && group.name.slice(0, 2)}
                </Avatar>

                {/* 信息 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)' }}>
                      {group.name}
                    </span>
                    {!group.isPublic && <LockOutlined style={{ color: 'var(--color-text-secondary)', fontSize: 13 }} />}
                    {group.categoryName && (
                      <Tag color="green" style={{ marginLeft: 4, fontSize: 12 }}>{group.categoryName}</Tag>
                    )}
                  </div>
                  <p style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: 13,
                    margin: '4px 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {group.description || '暂无简介'}
                  </p>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                    <TeamOutlined /> {group.memberCount} 位成员
                    <span style={{ margin: '0 8px' }}>·</span>
                    {group.postCount} 条动态
                  </div>
                </div>

                {/* 加入按钮 */}
                <div style={{ flexShrink: 0 }}>
                  {group.isMember ? (
                    <Button size="small" disabled style={{ borderRadius: 20 }}>已加入</Button>
                  ) : (
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      onClick={e => handleJoin(group, e)}
                      style={{ borderRadius: 20, borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                    >
                      {group.requireApproval ? '申请加入' : '加入'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {hasMore && (
            <Button
              block
              onClick={() => fetchGroups(false)}
              loading={loading}
              style={{ borderRadius: 8, color: 'var(--color-text-secondary)' }}
            >
              加载更多
            </Button>
          )}
        </div>
      )}

      {/* 创建小组弹窗 */}
      <Modal
        title="创建读书小组"
        open={creating}
        onCancel={() => { setCreating(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createLoading}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} onFinish={handleCreate} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="小组名称" rules={[{ required: true, min: 2, message: '至少2个字' }]}>
            <Input maxLength={50} showCount placeholder="给你的小组起个名字" />
          </Form.Item>
          <Form.Item name="description" label="小组简介">
            <Input.TextArea maxLength={200} showCount rows={3} placeholder="介绍一下这个小组..." />
          </Form.Item>
          <Form.Item name="categoryId" label="主题分类">
            <Select placeholder="选择书籍分类（可选）" allowClear>
              {CATEGORY_OPTIONS.slice(1).map(c => <Option key={c.value} value={c.value}>{c.label}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="isPublic" label="是否公开" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="公开" unCheckedChildren="私密" />
          </Form.Item>
          <Form.Item name="requireApproval" label="加入需审核" valuePropName="checked" initialValue={false}>
            <Switch checkedChildren="需要" unCheckedChildren="不需要" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
