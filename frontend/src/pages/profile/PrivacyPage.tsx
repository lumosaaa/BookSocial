// src/pages/profile/PrivacyPage.tsx
import { useState, useEffect } from 'react';
import {
  Switch, Select, Button, Spin, message,
  Typography, Divider,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../api/authApi';

const { Option } = Select;
const { Title, Text } = Typography;

interface Privacy {
  profileVisible: number;
  shelfVisible: number;
  notesVisible: number;
  searchable: number;
  messagePermission: number;
  allowRecommendation: number;
  showInDiscovery: number;
  allowBehaviorAnalysis: number;
}

const DEFAULT_PRIVACY: Privacy = {
  profileVisible: 0,
  shelfVisible: 0,
  notesVisible: 0,
  searchable: 1,
  messagePermission: 0,
  allowRecommendation: 1,
  showInDiscovery: 1,
  allowBehaviorAnalysis: 1,
};

const VISIBILITY_OPTIONS = [
  { value: 0, label: '所有人' },
  { value: 1, label: '仅关注者' },
  { value: 2, label: '仅自己' },
];

const MESSAGE_OPTIONS = [
  { value: 0, label: '所有人' },
  { value: 1, label: '仅关注者' },
  { value: 2, label: '关闭私信' },
];

export default function PrivacyPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [privacy, setPrivacy] = useState<Privacy>(DEFAULT_PRIVACY);
  const [dirty, setDirty]     = useState(false); // 是否有未保存的改动

  useEffect(() => {
    userApi
      .getMe()
      .then(({ data }) => {
        if (data.data.privacy) {
          setPrivacy({ ...DEFAULT_PRIVACY, ...data.data.privacy });
        }
      })
      .catch(() => message.error('加载隐私设置失败'))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof Privacy>(key: K, val: Privacy[K]) => {
    setPrivacy((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userApi.updatePrivacy(privacy);
      message.success('隐私设置已保存');
      setDirty(false);
    } catch {
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  /* ── 通用 Row 组件 ── */
  const Row = ({
    label,
    desc,
    children,
    last = false,
  }: {
    label: string;
    desc?: string;
    children: React.ReactNode;
    last?: boolean;
  }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: last ? 'none' : '1px solid var(--color-border)',
        gap: 16,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
          {label}
        </div>
        {desc && (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {desc}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );

  /* ── Section 容器 ── */
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8,
          paddingLeft: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );

  const switchStyle = (on: boolean) => ({
    background: on ? 'var(--color-primary)' : undefined,
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={() => navigate(-1)}
        />
        <Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          隐私设置
        </Title>
        {dirty && (
          <Text type="secondary" style={{ fontSize: 13, marginLeft: 'auto' }}>
            有未保存的更改
          </Text>
        )}
      </div>

      {/* ── 内容可见性 ── */}
      <Section title="内容可见性">
        <Row label="个人主页可见范围" desc="谁可以查看你的个人主页">
          <Select
            value={privacy.profileVisible}
            onChange={(v) => update('profileVisible', v)}
            style={{ width: 120 }}
            size="small"
          >
            {VISIBILITY_OPTIONS.map((o) => (
              <Option key={o.value} value={o.value}>{o.label}</Option>
            ))}
          </Select>
        </Row>
        <Row label="书架可见范围" desc="谁可以查看你的书架">
          <Select
            value={privacy.shelfVisible}
            onChange={(v) => update('shelfVisible', v)}
            style={{ width: 120 }}
            size="small"
          >
            {VISIBILITY_OPTIONS.map((o) => (
              <Option key={o.value} value={o.value}>{o.label}</Option>
            ))}
          </Select>
        </Row>
        <Row label="阅读笔记可见范围" desc="谁可以查看你发布的公开笔记" last>
          <Select
            value={privacy.notesVisible}
            onChange={(v) => update('notesVisible', v)}
            style={{ width: 120 }}
            size="small"
          >
            {VISIBILITY_OPTIONS.map((o) => (
              <Option key={o.value} value={o.value}>{o.label}</Option>
            ))}
          </Select>
        </Row>
      </Section>

      {/* ── 互动权限 ── */}
      <Section title="互动权限">
        <Row
          label="接收私信"
          desc="设置谁可以给你发送私信（互关书友不受此限制）"
        >
          <Select
            value={privacy.messagePermission}
            onChange={(v) => update('messagePermission', v)}
            style={{ width: 120 }}
            size="small"
          >
            {MESSAGE_OPTIONS.map((o) => (
              <Option key={o.value} value={o.value}>{o.label}</Option>
            ))}
          </Select>
        </Row>
        <Row
          label="可被搜索发现"
          desc="关闭后，其他用户无法通过昵称搜索到你"
          last
        >
          <Switch
            checked={privacy.searchable === 1}
            onChange={(v) => update('searchable', v ? 1 : 0)}
            style={switchStyle(privacy.searchable === 1)}
          />
        </Row>
      </Section>

      {/* ── 个性化与推荐 ── */}
      <Section title="个性化与推荐">
        <Row
          label="出现在书友推荐"
          desc="允许系统将你推荐给兴趣相似的用户"
        >
          <Switch
            checked={privacy.showInDiscovery === 1}
            onChange={(v) => update('showInDiscovery', v ? 1 : 0)}
            style={switchStyle(privacy.showInDiscovery === 1)}
          />
        </Row>
        <Row
          label="兴趣画像用于推荐"
          desc="基于你的阅读偏好为你推荐书籍和书友"
        >
          <Switch
            checked={privacy.allowRecommendation === 1}
            onChange={(v) => update('allowRecommendation', v ? 1 : 0)}
            style={switchStyle(privacy.allowRecommendation === 1)}
          />
        </Row>
        <Row
          label="阅读记录用于分析"
          desc="授权平台使用行为数据改善推荐算法质量"
          last
        >
          <Switch
            checked={privacy.allowBehaviorAnalysis === 1}
            onChange={(v) => update('allowBehaviorAnalysis', v ? 1 : 0)}
            style={switchStyle(privacy.allowBehaviorAnalysis === 1)}
          />
        </Row>
      </Section>

      <Divider style={{ margin: '8px 0 24px' }} />

      {/* 保存按钮 */}
      <Button
        type="primary"
        block
        size="large"
        loading={saving}
        icon={<SaveOutlined />}
        onClick={handleSave}
        style={{
          height: 48,
          borderRadius: 8,
          background: 'var(--color-primary)',
          borderColor: 'var(--color-primary)',
          fontSize: 16,
        }}
      >
        保存设置
      </Button>

      <Text
        type="secondary"
        style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12 }}
      >
        设置变更后即时生效
      </Text>
    </div>
  );
}
