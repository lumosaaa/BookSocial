import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Result,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tabs,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../store/authStore';
import { getRoleFromToken } from '../../utils/auth';
import {
  createKeyword,
  deleteKeyword,
  getAdminOverview,
  getAdminUsers,
  getAuditLogs,
  getKeywords,
  getReports,
  resolveReport,
  updateAdminUser,
  type AdminKeyword,
  type AdminOverview,
  type AdminReport,
  type AdminUser,
  type AuditLog,
} from '../../api/adminApi';

const USER_STATUS_TEXT: Record<number, string> = {
  0: '禁用',
  1: '正常',
  2: '封禁',
};

const USER_STATUS_COLOR: Record<number, string> = {
  0: 'default',
  1: 'green',
  2: 'red',
};

const REPORT_REASON_TEXT: Record<number, string> = {
  1: '违禁信息',
  2: '色情低俗',
  3: '侵权',
  4: '广告骚扰',
  5: '人身攻击',
  6: '其他',
};

const REPORT_STATUS_TEXT: Record<number, string> = {
  0: '待处理',
  1: '有效',
  2: '无效',
};

const REPORT_STATUS_COLOR: Record<number, string> = {
  0: 'orange',
  1: 'green',
  2: 'default',
};

const AUDIT_TYPE_TEXT: Record<number, string> = {
  1: '机器审核',
  2: '人工审核',
  3: '举报触发',
};

const AUDIT_RESULT_TEXT: Record<number, string> = {
  1: '通过',
  2: '拒绝',
  3: '人工复核',
};

export default function AdminDashboardPage() {
  const user = useAuthStore(s => s.user);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const accessToken = useAuthStore(s => s.accessToken);
  const resolvedRole = user?.role || getRoleFromToken(accessToken);
  const isAdmin = isLoggedIn && resolvedRole === 'admin';

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [userLoading, setUserLoading] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userFilters, setUserFilters] = useState({
    keyword: '',
    role: '',
    status: '' as '' | number,
  });

  const [reportLoading, setReportLoading] = useState(false);
  const [reportPage, setReportPage] = useState(1);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportStatusFilter, setReportStatusFilter] = useState(0);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [processingReport, setProcessingReport] = useState<AdminReport | null>(null);
  const [reportActionStatus, setReportActionStatus] = useState<1 | 2>(1);
  const [reportResultNote, setReportResultNote] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [keywordLoading, setKeywordLoading] = useState(false);
  const [keywords, setKeywords] = useState<AdminKeyword[]>([]);
  const [keywordForm] = Form.useForm();

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

  async function loadOverview() {
    setOverviewLoading(true);
    try {
      setOverview(await getAdminOverview());
    } finally {
      setOverviewLoading(false);
    }
  }

  async function loadUsers(targetPage = userPage, targetPageSize = userPageSize) {
    setUserLoading(true);
    try {
      const data = await getAdminUsers({
        keyword: userFilters.keyword || undefined,
        role: userFilters.role || undefined,
        status: userFilters.status,
        page: targetPage,
        pageSize: targetPageSize,
      });
      setUsers(data.list);
      setUserTotal(data.total);
      setUserPage(data.page);
      setUserPageSize(data.pageSize);
    } finally {
      setUserLoading(false);
    }
  }

  async function loadReports(targetPage = reportPage, status = reportStatusFilter) {
    setReportLoading(true);
    try {
      const data = await getReports({
        status,
        page: targetPage,
        pageSize: 10,
      });
      setReports(data.list);
      setReportTotal(data.total);
      setReportPage(data.page);
    } finally {
      setReportLoading(false);
    }
  }

  async function loadKeywords() {
    setKeywordLoading(true);
    try {
      setKeywords(await getKeywords());
    } finally {
      setKeywordLoading(false);
    }
  }

  async function loadAuditLogs(targetPage = auditPage) {
    setAuditLoading(true);
    try {
      const data = await getAuditLogs({ page: targetPage, pageSize: 10 });
      setAuditLogs(data.list);
      setAuditTotal(data.total);
      setAuditPage(data.page);
    } finally {
      setAuditLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    loadOverview();
    loadUsers(1, 10);
    loadReports(1, 0);
    loadKeywords();
    loadAuditLogs(1);
  }, [isAdmin]);

  const overviewCards = useMemo(() => {
    if (!overview) return [];
    return [
      { title: '用户总数', value: overview.stats.totalUsers },
      { title: '活跃用户', value: overview.stats.activeUsers },
      { title: '书籍总数', value: overview.stats.totalBooks },
      { title: '帖子总数', value: overview.stats.totalPosts },
      { title: '小组总数', value: overview.stats.totalGroups },
      { title: '待处理举报', value: overview.stats.pendingReports },
      { title: '生效违禁词', value: overview.stats.activeKeywords },
      { title: '今日新增用户', value: overview.stats.todayNewUsers },
    ];
  }, [overview]);

  const userColumns: ColumnsType<AdminUser> = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      render: (_, record) => (
        <Space>
          <Avatar src={record.avatarUrl}>{record.username.slice(0, 1)}</Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{record.username}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{record.email || '未绑定邮箱'}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => <Tag color={role === 'admin' ? 'blue' : 'default'}>{role}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={USER_STATUS_COLOR[status]}>{USER_STATUS_TEXT[status]}</Tag>,
    },
    {
      title: '互动数据',
      key: 'stats',
      render: (_, record) => (
        <div style={{ fontSize: 12, color: '#666' }}>
          帖子 {record.postCount} / 关注 {record.followingCount} / 粉丝 {record.followerCount}
        </div>
      ),
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: value => value ? new Date(value).toLocaleString('zh-CN') : '暂无',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space wrap>
          <Select
            size="small"
            style={{ width: 110 }}
            value={record.role}
            options={[
              { value: 'user', label: '普通用户' },
              { value: 'admin', label: '管理员' },
            ]}
            onChange={async (value: 'user' | 'admin') => {
              await updateAdminUser(record.id, { role: value });
              message.success('角色已更新');
              loadUsers();
              loadOverview();
            }}
          />
          <Select
            size="small"
            style={{ width: 110 }}
            value={record.status}
            options={[
              { value: 1, label: '正常' },
              { value: 0, label: '禁用' },
              { value: 2, label: '封禁' },
            ]}
            onChange={async (value: 0 | 1 | 2) => {
              await updateAdminUser(record.id, { status: value });
              message.success('状态已更新');
              loadUsers();
              loadOverview();
            }}
          />
        </Space>
      ),
    },
  ];

  const reportColumns: ColumnsType<AdminReport> = [
    {
      title: '举报人',
      dataIndex: 'reporterName',
      key: 'reporterName',
    },
    {
      title: '举报原因',
      dataIndex: 'reason_type',
      key: 'reason_type',
      render: (value) => REPORT_REASON_TEXT[value] || `类型${value}`,
    },
    {
      title: '目标',
      key: 'target',
      render: (_, record) => `#${record.target_id} / 类型${record.target_type}`,
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      render: value => value || '无',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value) => <Tag color={REPORT_STATUS_COLOR[value]}>{REPORT_STATUS_TEXT[value]}</Tag>,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: value => new Date(value).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          disabled={record.status !== 0}
          onClick={() => {
            setProcessingReport(record);
            setReportActionStatus(1);
            setReportResultNote(record.result_note || '');
            setReportModalOpen(true);
          }}
        >
          处理
        </Button>
      ),
    },
  ];

  const keywordColumns: ColumnsType<AdminKeyword> = [
    { title: '关键词', dataIndex: 'keyword', key: 'keyword' },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      render: (value) => <Tag color={value === 2 ? 'red' : 'gold'}>{value === 2 ? '拦截' : '警告'}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: value => new Date(value).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Button
          danger
          size="small"
          onClick={async () => {
            await deleteKeyword(record.id);
            message.success('已停用');
            loadKeywords();
            loadOverview();
          }}
        >
          停用
        </Button>
      ),
    },
  ];

  const auditColumns: ColumnsType<AuditLog> = [
    {
      title: '内容',
      key: 'content',
      render: (_, record) => `#${record.contentId} / 类型${record.contentType}`,
    },
    {
      title: '审核方式',
      dataIndex: 'auditType',
      key: 'auditType',
      render: value => AUDIT_TYPE_TEXT[value] || `类型${value}`,
    },
    {
      title: '审核结果',
      dataIndex: 'result',
      key: 'result',
      render: value => AUDIT_RESULT_TEXT[value] || `结果${value}`,
    },
    {
      title: '审核人',
      dataIndex: 'auditorName',
      key: 'auditorName',
      render: value => value || '系统',
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: value => new Date(value).toLocaleString('zh-CN'),
    },
  ];

  if (!isLoggedIn) {
    return <Result status="warning" title="请先登录" subTitle="管理员后台需要登录后访问" />;
  }

  if (!isAdmin) {
    return <Result status="403" title="无权限访问" subTitle="当前账号不是管理员" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>管理后台</div>
          <div style={{ color: '#666', marginTop: 4 }}>运营审核、用户管理与系统概览</div>
        </div>
        <Button onClick={() => {
          loadOverview();
          loadUsers();
          loadReports();
          loadKeywords();
          loadAuditLogs();
        }}>
          刷新数据
        </Button>
      </div>

      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: 'overview',
            label: '概览',
            children: overviewLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
            ) : !overview ? (
              <Empty description="暂无概览数据" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                  }}
                >
                  {overviewCards.map(card => (
                    <Card key={card.title} size="small">
                      <Statistic title={card.title} value={card.value} />
                    </Card>
                  ))}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 12,
                  }}
                >
                  <Card title="最近注册用户" size="small">
                    {overview.recentUsers.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                        <span>{item.username}</span>
                        <Tag color={item.role === 'admin' ? 'blue' : 'default'}>{item.role}</Tag>
                      </div>
                    ))}
                  </Card>
                  <Card title="最近举报" size="small">
                    {overview.recentReports.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                        <span>{item.reporterName} / {REPORT_REASON_TEXT[item.reasonType] || item.reasonType}</span>
                        <Tag color={REPORT_STATUS_COLOR[item.status]}>{REPORT_STATUS_TEXT[item.status]}</Tag>
                      </div>
                    ))}
                  </Card>
                </div>
              </div>
            ),
          },
          {
            key: 'users',
            label: '用户管理',
            children: (
              <Card size="small">
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input
                    placeholder="搜索用户名/邮箱"
                    value={userFilters.keyword}
                    onChange={e => setUserFilters(prev => ({ ...prev, keyword: e.target.value }))}
                    style={{ width: 220 }}
                  />
                  <Select
                    value={userFilters.role}
                    onChange={value => setUserFilters(prev => ({ ...prev, role: value }))}
                    style={{ width: 140 }}
                    options={[
                      { value: '', label: '全部角色' },
                      { value: 'user', label: '普通用户' },
                      { value: 'admin', label: '管理员' },
                    ]}
                  />
                  <Select
                    value={userFilters.status}
                    onChange={value => setUserFilters(prev => ({ ...prev, status: value }))}
                    style={{ width: 140 }}
                    options={[
                      { value: '', label: '全部状态' },
                      { value: 1, label: '正常' },
                      { value: 0, label: '禁用' },
                      { value: 2, label: '封禁' },
                    ]}
                  />
                  <Button type="primary" onClick={() => loadUsers(1, userPageSize)}>查询</Button>
                </Space>
                <Table
                  rowKey="id"
                  loading={userLoading}
                  columns={userColumns}
                  dataSource={users}
                  pagination={{
                    current: userPage,
                    pageSize: userPageSize,
                    total: userTotal,
                    onChange: (page, pageSize) => loadUsers(page, pageSize),
                  }}
                />
              </Card>
            ),
          },
          {
            key: 'reports',
            label: '举报处理',
            children: (
              <Card size="small">
                <Space style={{ marginBottom: 16 }}>
                  <Select
                    value={reportStatusFilter}
                    onChange={(value) => {
                      setReportStatusFilter(value);
                      loadReports(1, value);
                    }}
                    style={{ width: 160 }}
                    options={[
                      { value: 0, label: '待处理' },
                      { value: 1, label: '有效' },
                      { value: 2, label: '无效' },
                    ]}
                  />
                </Space>
                <Table
                  rowKey="id"
                  loading={reportLoading}
                  columns={reportColumns}
                  dataSource={reports}
                  pagination={{
                    current: reportPage,
                    pageSize: 10,
                    total: reportTotal,
                    onChange: page => loadReports(page, reportStatusFilter),
                  }}
                />
              </Card>
            ),
          },
          {
            key: 'keywords',
            label: '违禁词',
            children: (
              <Card size="small">
                <Form
                  form={keywordForm}
                  layout="inline"
                  onFinish={async (values) => {
                    await createKeyword(values);
                    message.success('违禁词已添加');
                    keywordForm.resetFields();
                    loadKeywords();
                    loadOverview();
                  }}
                  style={{ marginBottom: 16 }}
                >
                  <Form.Item
                    name="keyword"
                    rules={[{ required: true, message: '请输入关键词' }]}
                  >
                    <Input placeholder="新增违禁词" style={{ width: 220 }} />
                  </Form.Item>
                  <Form.Item name="level" initialValue={1}>
                    <Select
                      style={{ width: 140 }}
                      options={[
                        { value: 1, label: '警告级' },
                        { value: 2, label: '拦截级' },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={keywordLoading}>添加</Button>
                  </Form.Item>
                </Form>
                <Table
                  rowKey="id"
                  loading={keywordLoading}
                  columns={keywordColumns}
                  dataSource={keywords}
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: 'audit',
            label: '审核日志',
            children: (
              <Card size="small">
                <Table
                  rowKey="id"
                  loading={auditLoading}
                  columns={auditColumns}
                  dataSource={auditLogs}
                  pagination={{
                    current: auditPage,
                    pageSize: 10,
                    total: auditTotal,
                    onChange: page => loadAuditLogs(page),
                  }}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title={processingReport ? `处理举报 #${processingReport.id}` : '处理举报'}
        open={reportModalOpen}
        onCancel={() => setReportModalOpen(false)}
        onOk={async () => {
          if (!processingReport) return;
          setReportSubmitting(true);
          try {
            await resolveReport(processingReport.id, {
              status: reportActionStatus,
              resultNote: reportResultNote.trim() || undefined,
            });
            message.success('举报已处理');
            setReportModalOpen(false);
            setProcessingReport(null);
            setReportResultNote('');
            loadReports(reportPage, reportStatusFilter);
            loadOverview();
          } finally {
            setReportSubmitting(false);
          }
        }}
        confirmLoading={reportSubmitting}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select
            value={reportActionStatus}
            onChange={setReportActionStatus}
            options={[
              { value: 1, label: '判定有效' },
              { value: 2, label: '判定无效' },
            ]}
          />
          <Input.TextArea
            rows={4}
            value={reportResultNote}
            onChange={e => setReportResultNote(e.target.value)}
            placeholder="处理说明（选填）"
            maxLength={200}
          />
        </div>
      </Modal>
    </div>
  );
}
