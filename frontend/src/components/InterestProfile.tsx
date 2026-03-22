/**
 * InterestProfile.tsx — M6 · 兴趣画像组件
 * 用于 MyProfilePage / UserProfilePage 中展示书籍阅读偏好雷达图 + 活跃度热力图
 */

import { useEffect, useState } from 'react';
import { Spin, Tag, Empty, Tooltip } from 'antd';
import { getInterestProfile, type InterestProfile } from '../../api/discoverApi';

interface Props {
  userId: number;
}

// 简单颜色映射（按分类热度深浅）
const COLORS = [
  '#4A6741', '#6B8F62', '#8BAF82', '#A8C8A0',
  '#C8DFC4', '#C8A96E', '#D4B97E', '#E0CA90',
];

export default function InterestProfileWidget({ userId }: Props) {
  const [profile, setProfile] = useState<InterestProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    setLoading(true);
    getInterestProfile(userId)
      .then(data => setProfile(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div style={{ textAlign: 'center', padding: '24px 0' }}><Spin /></div>;
  if (error)   return null; // 隐私限制时静默不显示
  if (!profile) return null;

  const { categories, tags, activity } = profile;
  const maxCatCount = Math.max(...categories.map(c => c.count), 1);

  // ── 近30天活跃热力图（简化为打点网格）──────────────
  const today = new Date();
  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const found = activity.find(a => a.date === dateStr);
    days.push({ date: dateStr, count: found?.count || 0 });
  }
  const maxActivity = Math.max(...days.map(d => d.count), 1);

  const activityColor = (count: number) => {
    if (count === 0) return '#ebedf0';
    const ratio = count / maxActivity;
    if (ratio < 0.25) return '#c6e48b';
    if (ratio < 0.5)  return '#7bc96f';
    if (ratio < 0.75) return '#239a3b';
    return '#196127';
  };

  return (
    <div className="interest-profile">
      {/* 阅读分类分布 */}
      {categories.length > 0 && (
        <div className="profile-section">
          <h4 className="profile-section-title">阅读分类分布</h4>
          <div className="category-bars">
            {categories.map((cat, idx) => (
              <div key={cat.category} className="category-bar-row">
                <span className="cat-name">{cat.category}</span>
                <div className="cat-bar-track">
                  <div
                    className="cat-bar-fill"
                    style={{
                      width: `${(cat.count / maxCatCount) * 100}%`,
                      background: COLORS[idx % COLORS.length],
                    }}
                  />
                </div>
                <span className="cat-count">{cat.count} 本</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 偏好标签云 */}
      {tags.length > 0 && (
        <div className="profile-section">
          <h4 className="profile-section-title">口味标签</h4>
          <div className="tag-cloud">
            {tags.map(t => (
              <Tag key={t.name} color="green" style={{ marginBottom: 6 }}>
                {t.name}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* 近30天阅读热力图 */}
      <div className="profile-section">
        <h4 className="profile-section-title">近 30 天阅读活跃</h4>
        <div className="activity-grid">
          {days.map(d => (
            <Tooltip key={d.date} title={`${d.date}：${d.count > 0 ? `加入 ${d.count} 本` : '无活动'}`}>
              <div
                className="activity-cell"
                style={{ background: activityColor(d.count) }}
              />
            </Tooltip>
          ))}
        </div>
        <p className="activity-hint">每格代表1天，颜色越深阅读越活跃</p>
      </div>

      {categories.length === 0 && tags.length === 0 && (
        <Empty description="还没有足够的阅读数据，多读几本书吧~" />
      )}
    </div>
  );
}
