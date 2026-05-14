import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Card, Empty, Form, Input, Modal, Result, Select, Space, Spin, Statistic, Table, Tag, Tabs, message, } from 'antd';
import { useAuthStore } from '../../store/authStore';
import { getRoleFromToken } from '../../utils/auth';
import { createKeyword, deleteKeyword, getAdminOverview, getAdminUsers, getAuditLogs, getKeywords, getReports, resolveReport, updateAdminUser, } from '../../api/adminApi';
const USER_STATUS_TEXT = {
    0: '禁用',
    1: '正常',
    2: '封禁',
};
const USER_STATUS_COLOR = {
    0: 'default',
    1: 'green',
    2: 'red',
};
const REPORT_REASON_TEXT = {
    1: '违禁信息',
    2: '色情低俗',
    3: '侵权',
    4: '广告骚扰',
    5: '人身攻击',
    6: '其他',
};
const REPORT_STATUS_TEXT = {
    0: '待处理',
    1: '有效',
    2: '无效',
};
const REPORT_STATUS_COLOR = {
    0: 'orange',
    1: 'green',
    2: 'default',
};
const AUDIT_TYPE_TEXT = {
    1: '机器审核',
    2: '人工审核',
    3: '举报触发',
};
const AUDIT_RESULT_TEXT = {
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
    const [overview, setOverview] = useState(null);
    const [overviewLoading, setOverviewLoading] = useState(false);
    const [userLoading, setUserLoading] = useState(false);
    const [userPage, setUserPage] = useState(1);
    const [userPageSize, setUserPageSize] = useState(10);
    const [users, setUsers] = useState([]);
    const [userTotal, setUserTotal] = useState(0);
    const [userFilters, setUserFilters] = useState({
        keyword: '',
        role: '',
        status: '',
    });
    const [reportLoading, setReportLoading] = useState(false);
    const [reportPage, setReportPage] = useState(1);
    const [reports, setReports] = useState([]);
    const [reportTotal, setReportTotal] = useState(0);
    const [reportStatusFilter, setReportStatusFilter] = useState(0);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [processingReport, setProcessingReport] = useState(null);
    const [reportActionStatus, setReportActionStatus] = useState(1);
    const [reportResultNote, setReportResultNote] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [keywordLoading, setKeywordLoading] = useState(false);
    const [keywords, setKeywords] = useState([]);
    const [keywordForm] = Form.useForm();
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditPage, setAuditPage] = useState(1);
    const [auditTotal, setAuditTotal] = useState(0);
    async function loadOverview() {
        setOverviewLoading(true);
        try {
            setOverview(await getAdminOverview());
        }
        finally {
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
        }
        finally {
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
        }
        finally {
            setReportLoading(false);
        }
    }
    async function loadKeywords() {
        setKeywordLoading(true);
        try {
            setKeywords(await getKeywords());
        }
        finally {
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
        }
        finally {
            setAuditLoading(false);
        }
    }
    useEffect(() => {
        if (!isAdmin)
            return;
        loadOverview();
        loadUsers(1, 10);
        loadReports(1, 0);
        loadKeywords();
        loadAuditLogs(1);
    }, [isAdmin]);
    const overviewCards = useMemo(() => {
        if (!overview)
            return [];
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
    const userColumns = [
        {
            title: '用户',
            dataIndex: 'username',
            key: 'username',
            render: (_, record) => (_jsxs(Space, { children: [_jsx(Avatar, { src: record.avatarUrl, children: record.username.slice(0, 1) }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600 }, children: record.username }), _jsx("div", { style: { fontSize: 12, color: '#888' }, children: record.email || '未绑定邮箱' })] })] })),
        },
        {
            title: '角色',
            dataIndex: 'role',
            key: 'role',
            render: (role) => _jsx(Tag, { color: role === 'admin' ? 'blue' : 'default', children: role }),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status) => _jsx(Tag, { color: USER_STATUS_COLOR[status], children: USER_STATUS_TEXT[status] }),
        },
        {
            title: '互动数据',
            key: 'stats',
            render: (_, record) => (_jsxs("div", { style: { fontSize: 12, color: '#666' }, children: ["\u5E16\u5B50 ", record.postCount, " / \u5173\u6CE8 ", record.followingCount, " / \u7C89\u4E1D ", record.followerCount] })),
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
            render: (_, record) => (_jsxs(Space, { wrap: true, children: [_jsx(Select, { size: "small", style: { width: 110 }, value: record.role, options: [
                            { value: 'user', label: '普通用户' },
                            { value: 'admin', label: '管理员' },
                        ], onChange: async (value) => {
                            await updateAdminUser(record.id, { role: value });
                            message.success('角色已更新');
                            loadUsers();
                            loadOverview();
                        } }), _jsx(Select, { size: "small", style: { width: 110 }, value: record.status, options: [
                            { value: 1, label: '正常' },
                            { value: 0, label: '禁用' },
                            { value: 2, label: '封禁' },
                        ], onChange: async (value) => {
                            await updateAdminUser(record.id, { status: value });
                            message.success('状态已更新');
                            loadUsers();
                            loadOverview();
                        } })] })),
        },
    ];
    const reportColumns = [
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
            render: (value) => _jsx(Tag, { color: REPORT_STATUS_COLOR[value], children: REPORT_STATUS_TEXT[value] }),
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
            render: (_, record) => (_jsx(Button, { size: "small", disabled: record.status !== 0, onClick: () => {
                    setProcessingReport(record);
                    setReportActionStatus(1);
                    setReportResultNote(record.result_note || '');
                    setReportModalOpen(true);
                }, children: "\u5904\u7406" })),
        },
    ];
    const keywordColumns = [
        { title: '关键词', dataIndex: 'keyword', key: 'keyword' },
        {
            title: '级别',
            dataIndex: 'level',
            key: 'level',
            render: (value) => _jsx(Tag, { color: value === 2 ? 'red' : 'gold', children: value === 2 ? '拦截' : '警告' }),
        },
        {
            title: '状态',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (value) => _jsx(Tag, { color: value ? 'green' : 'default', children: value ? '启用' : '停用' }),
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
            render: (_, record) => (_jsx(Button, { danger: true, size: "small", onClick: async () => {
                    await deleteKeyword(record.id);
                    message.success('已停用');
                    loadKeywords();
                    loadOverview();
                }, children: "\u505C\u7528" })),
        },
    ];
    const auditColumns = [
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
        return _jsx(Result, { status: "warning", title: "\u8BF7\u5148\u767B\u5F55", subTitle: "\u7BA1\u7406\u5458\u540E\u53F0\u9700\u8981\u767B\u5F55\u540E\u8BBF\u95EE" });
    }
    if (!isAdmin) {
        return _jsx(Result, { status: "403", title: "\u65E0\u6743\u9650\u8BBF\u95EE", subTitle: "\u5F53\u524D\u8D26\u53F7\u4E0D\u662F\u7BA1\u7406\u5458" });
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 26, fontWeight: 700 }, children: "\u7BA1\u7406\u540E\u53F0" }), _jsx("div", { style: { color: '#666', marginTop: 4 }, children: "\u8FD0\u8425\u5BA1\u6838\u3001\u7528\u6237\u7BA1\u7406\u4E0E\u7CFB\u7EDF\u6982\u89C8" })] }), _jsx(Button, { onClick: () => {
                            loadOverview();
                            loadUsers();
                            loadReports();
                            loadKeywords();
                            loadAuditLogs();
                        }, children: "\u5237\u65B0\u6570\u636E" })] }), _jsx(Tabs, { defaultActiveKey: "overview", items: [
                    {
                        key: 'overview',
                        label: '概览',
                        children: overviewLoading ? (_jsx("div", { style: { padding: 40, textAlign: 'center' }, children: _jsx(Spin, {}) })) : !overview ? (_jsx(Empty, { description: "\u6682\u65E0\u6982\u89C8\u6570\u636E" })) : (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsx("div", { style: {
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                        gap: 12,
                                    }, children: overviewCards.map(card => (_jsx(Card, { size: "small", children: _jsx(Statistic, { title: card.title, value: card.value }) }, card.title))) }), _jsxs("div", { style: {
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                                        gap: 12,
                                    }, children: [_jsx(Card, { title: "\u6700\u8FD1\u6CE8\u518C\u7528\u6237", size: "small", children: overview.recentUsers.map(item => (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0' }, children: [_jsx("span", { children: item.username }), _jsx(Tag, { color: item.role === 'admin' ? 'blue' : 'default', children: item.role })] }, item.id))) }), _jsx(Card, { title: "\u6700\u8FD1\u4E3E\u62A5", size: "small", children: overview.recentReports.map(item => (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0' }, children: [_jsxs("span", { children: [item.reporterName, " / ", REPORT_REASON_TEXT[item.reasonType] || item.reasonType] }), _jsx(Tag, { color: REPORT_STATUS_COLOR[item.status], children: REPORT_STATUS_TEXT[item.status] })] }, item.id))) })] })] })),
                    },
                    {
                        key: 'users',
                        label: '用户管理',
                        children: (_jsxs(Card, { size: "small", children: [_jsxs(Space, { wrap: true, style: { marginBottom: 16 }, children: [_jsx(Input, { placeholder: "\u641C\u7D22\u7528\u6237\u540D/\u90AE\u7BB1", value: userFilters.keyword, onChange: e => setUserFilters(prev => ({ ...prev, keyword: e.target.value })), style: { width: 220 } }), _jsx(Select, { value: userFilters.role, onChange: value => setUserFilters(prev => ({ ...prev, role: value })), style: { width: 140 }, options: [
                                                { value: '', label: '全部角色' },
                                                { value: 'user', label: '普通用户' },
                                                { value: 'admin', label: '管理员' },
                                            ] }), _jsx(Select, { value: userFilters.status, onChange: value => setUserFilters(prev => ({ ...prev, status: value })), style: { width: 140 }, options: [
                                                { value: '', label: '全部状态' },
                                                { value: 1, label: '正常' },
                                                { value: 0, label: '禁用' },
                                                { value: 2, label: '封禁' },
                                            ] }), _jsx(Button, { type: "primary", onClick: () => loadUsers(1, userPageSize), children: "\u67E5\u8BE2" })] }), _jsx(Table, { rowKey: "id", loading: userLoading, columns: userColumns, dataSource: users, pagination: {
                                        current: userPage,
                                        pageSize: userPageSize,
                                        total: userTotal,
                                        onChange: (page, pageSize) => loadUsers(page, pageSize),
                                    } })] })),
                    },
                    {
                        key: 'reports',
                        label: '举报处理',
                        children: (_jsxs(Card, { size: "small", children: [_jsx(Space, { style: { marginBottom: 16 }, children: _jsx(Select, { value: reportStatusFilter, onChange: (value) => {
                                            setReportStatusFilter(value);
                                            loadReports(1, value);
                                        }, style: { width: 160 }, options: [
                                            { value: 0, label: '待处理' },
                                            { value: 1, label: '有效' },
                                            { value: 2, label: '无效' },
                                        ] }) }), _jsx(Table, { rowKey: "id", loading: reportLoading, columns: reportColumns, dataSource: reports, pagination: {
                                        current: reportPage,
                                        pageSize: 10,
                                        total: reportTotal,
                                        onChange: page => loadReports(page, reportStatusFilter),
                                    } })] })),
                    },
                    {
                        key: 'keywords',
                        label: '违禁词',
                        children: (_jsxs(Card, { size: "small", children: [_jsxs(Form, { form: keywordForm, layout: "inline", onFinish: async (values) => {
                                        await createKeyword(values);
                                        message.success('违禁词已添加');
                                        keywordForm.resetFields();
                                        loadKeywords();
                                        loadOverview();
                                    }, style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "keyword", rules: [{ required: true, message: '请输入关键词' }], children: _jsx(Input, { placeholder: "\u65B0\u589E\u8FDD\u7981\u8BCD", style: { width: 220 } }) }), _jsx(Form.Item, { name: "level", initialValue: 1, children: _jsx(Select, { style: { width: 140 }, options: [
                                                    { value: 1, label: '警告级' },
                                                    { value: 2, label: '拦截级' },
                                                ] }) }), _jsx(Form.Item, { children: _jsx(Button, { type: "primary", htmlType: "submit", loading: keywordLoading, children: "\u6DFB\u52A0" }) })] }), _jsx(Table, { rowKey: "id", loading: keywordLoading, columns: keywordColumns, dataSource: keywords, pagination: false })] })),
                    },
                    {
                        key: 'audit',
                        label: '审核日志',
                        children: (_jsx(Card, { size: "small", children: _jsx(Table, { rowKey: "id", loading: auditLoading, columns: auditColumns, dataSource: auditLogs, pagination: {
                                    current: auditPage,
                                    pageSize: 10,
                                    total: auditTotal,
                                    onChange: page => loadAuditLogs(page),
                                } }) })),
                    },
                ] }), _jsx(Modal, { title: processingReport ? `处理举报 #${processingReport.id}` : '处理举报', open: reportModalOpen, onCancel: () => setReportModalOpen(false), onOk: async () => {
                    if (!processingReport)
                        return;
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
                    }
                    finally {
                        setReportSubmitting(false);
                    }
                }, confirmLoading: reportSubmitting, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsx(Select, { value: reportActionStatus, onChange: setReportActionStatus, options: [
                                { value: 1, label: '判定有效' },
                                { value: 2, label: '判定无效' },
                            ] }), _jsx(Input.TextArea, { rows: 4, value: reportResultNote, onChange: e => setReportResultNote(e.target.value), placeholder: "\u5904\u7406\u8BF4\u660E\uFF08\u9009\u586B\uFF09", maxLength: 200 })] }) })] }));
}
