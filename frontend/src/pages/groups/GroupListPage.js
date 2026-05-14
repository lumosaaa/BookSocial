import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * M5 · 小组列表页
 * 路由：/groups
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Select, Card, Avatar, Tag, Spin, Empty, Modal, Form, Switch, message } from 'antd';
import { PlusOutlined, TeamOutlined, SearchOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { listGroups, createGroup, joinGroup, } from '../../api/groupApi';
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
    const navigate = useNavigate();
    const user = useAuthStore(s => s.user);
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const [groups, setGroups] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [category, setCategory] = useState(undefined);
    // 创建小组弹窗
    const [creating, setCreating] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [form] = Form.useForm();
    const fetchGroups = useCallback(async (reset = false) => {
        setLoading(true);
        try {
            const p = reset ? 1 : page;
            const res = await listGroups({ q, category, page: p });
            setGroups(prev => reset ? res.list : [...prev, ...res.list]);
            setTotal(res.total);
            if (!reset)
                setPage(p + 1);
            else
                setPage(2);
        }
        catch {
            message.error('获取小组列表失败');
        }
        finally {
            setLoading(false);
        }
    }, [q, category, page]);
    useEffect(() => {
        fetchGroups(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, category]);
    const handleJoin = async (group, e) => {
        e.stopPropagation();
        if (!isLoggedIn) {
            message.info('请先登录');
            return;
        }
        try {
            const res = await joinGroup(group.id);
            if (res.pending) {
                message.success('申请已提交，等待审核');
            }
            else {
                message.success(`已加入「${group.name}」`);
                setGroups(prev => prev.map(g => g.id === group.id
                    ? { ...g, isMember: true, myRole: 0, memberCount: g.memberCount + 1 }
                    : g));
            }
        }
        catch (err) {
            message.error(err?.response?.data?.message || '加入失败');
        }
    };
    const handleCreate = async (values) => {
        setCreateLoading(true);
        try {
            const group = await createGroup({
                name: values.name,
                description: values.description || '',
                categoryId: values.categoryId,
                isPublic: values.isPublic !== false,
                requireApproval: values.requireApproval === true,
            });
            message.success('小组创建成功');
            setCreating(false);
            form.resetFields();
            navigate(`/groups/${group.id}`);
        }
        catch (err) {
            message.error(err?.response?.data?.message || '创建失败');
        }
        finally {
            setCreateLoading(false);
        }
    };
    const hasMore = groups.length < total;
    return (_jsxs("div", { style: { maxWidth: 720, margin: '0 auto', padding: '24px 16px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, children: [_jsxs("h2", { style: { margin: 0, color: 'var(--color-text-primary)', fontSize: 22, fontWeight: 700 }, children: [_jsx(TeamOutlined, { style: { marginRight: 8 } }), "\u8BFB\u4E66\u5C0F\u7EC4"] }), isLoggedIn && (_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => setCreating(true), style: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }, children: "\u521B\u5EFA\u5C0F\u7EC4" }))] }), _jsxs("div", { style: { display: 'flex', gap: 12, marginBottom: 20 }, children: [_jsx(Input, { prefix: _jsx(SearchOutlined, {}), placeholder: "\u641C\u7D22\u5C0F\u7EC4\u540D\u79F0...", value: q, onChange: e => setQ(e.target.value), allowClear: true, style: { flex: 1 } }), _jsx(Select, { value: category, onChange: setCategory, placeholder: "\u4E66\u7C4D\u5206\u7C7B", allowClear: true, style: { width: 140 }, children: CATEGORY_OPTIONS.map(c => _jsx(Option, { value: c.value, children: c.label }, c.value)) })] }), loading && groups.length === 0 ? (_jsx("div", { style: { textAlign: 'center', padding: 60 }, children: _jsx(Spin, { size: "large" }) })) : groups.length === 0 ? (_jsx(Empty, { description: "\u6682\u65E0\u5C0F\u7EC4" })) : (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [groups.map(group => (_jsx(Card, { hoverable: true, onClick: () => navigate(`/groups/${group.id}`), style: { borderRadius: 12, border: '1px solid var(--color-border)' }, bodyStyle: { padding: '16px 20px' }, children: _jsxs("div", { style: { display: 'flex', gap: 16, alignItems: 'flex-start' }, children: [_jsx(Avatar, { shape: "square", size: 64, src: group.coverUrl, style: {
                                        background: 'var(--color-accent)',
                                        color: 'var(--color-primary)',
                                        fontSize: 24,
                                        flexShrink: 0,
                                        borderRadius: 8,
                                    }, children: !group.coverUrl && group.name.slice(0, 2) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx("span", { style: { fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)' }, children: group.name }), !group.isPublic && _jsx(LockOutlined, { style: { color: 'var(--color-text-secondary)', fontSize: 13 } }), group.categoryName && (_jsx(Tag, { color: "green", style: { marginLeft: 4, fontSize: 12 }, children: group.categoryName }))] }), _jsx("p", { style: {
                                                color: 'var(--color-text-secondary)',
                                                fontSize: 13,
                                                margin: '4px 0',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }, children: group.description || '暂无简介' }), _jsxs("div", { style: { color: 'var(--color-text-secondary)', fontSize: 12 }, children: [_jsx(TeamOutlined, {}), " ", group.memberCount, " \u4F4D\u6210\u5458", _jsx("span", { style: { margin: '0 8px' }, children: "\u00B7" }), group.postCount, " \u6761\u52A8\u6001"] })] }), _jsx("div", { style: { flexShrink: 0 }, children: group.isMember ? (_jsx(Button, { size: "small", disabled: true, style: { borderRadius: 20 }, children: "\u5DF2\u52A0\u5165" })) : (_jsx(Button, { size: "small", type: "primary", ghost: true, onClick: e => handleJoin(group, e), style: { borderRadius: 20, borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }, children: group.requireApproval ? '申请加入' : '加入' })) })] }) }, group.id))), hasMore && (_jsx(Button, { block: true, onClick: () => fetchGroups(false), loading: loading, style: { borderRadius: 8, color: 'var(--color-text-secondary)' }, children: "\u52A0\u8F7D\u66F4\u591A" }))] })), _jsx(Modal, { title: "\u521B\u5EFA\u8BFB\u4E66\u5C0F\u7EC4", open: creating, onCancel: () => { setCreating(false); form.resetFields(); }, onOk: () => form.submit(), confirmLoading: createLoading, okText: "\u521B\u5EFA", cancelText: "\u53D6\u6D88", children: _jsxs(Form, { form: form, onFinish: handleCreate, layout: "vertical", style: { marginTop: 16 }, children: [_jsx(Form.Item, { name: "name", label: "\u5C0F\u7EC4\u540D\u79F0", rules: [{ required: true, min: 2, message: '至少2个字' }], children: _jsx(Input, { maxLength: 50, showCount: true, placeholder: "\u7ED9\u4F60\u7684\u5C0F\u7EC4\u8D77\u4E2A\u540D\u5B57" }) }), _jsx(Form.Item, { name: "description", label: "\u5C0F\u7EC4\u7B80\u4ECB", children: _jsx(Input.TextArea, { maxLength: 200, showCount: true, rows: 3, placeholder: "\u4ECB\u7ECD\u4E00\u4E0B\u8FD9\u4E2A\u5C0F\u7EC4..." }) }), _jsx(Form.Item, { name: "categoryId", label: "\u4E3B\u9898\u5206\u7C7B", children: _jsx(Select, { placeholder: "\u9009\u62E9\u4E66\u7C4D\u5206\u7C7B\uFF08\u53EF\u9009\uFF09", allowClear: true, children: CATEGORY_OPTIONS.slice(1).map(c => _jsx(Option, { value: c.value, children: c.label }, c.value)) }) }), _jsx(Form.Item, { name: "isPublic", label: "\u662F\u5426\u516C\u5F00", valuePropName: "checked", initialValue: true, children: _jsx(Switch, { checkedChildren: "\u516C\u5F00", unCheckedChildren: "\u79C1\u5BC6" }) }), _jsx(Form.Item, { name: "requireApproval", label: "\u52A0\u5165\u9700\u5BA1\u6838", valuePropName: "checked", initialValue: false, children: _jsx(Switch, { checkedChildren: "\u9700\u8981", unCheckedChildren: "\u4E0D\u9700\u8981" }) })] }) })] }));
}
