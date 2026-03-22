/**
 * M5 · 阅读挑战详情页（含打卡）
 * 路由：/groups/:groupId/challenges/:challengeId
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Input, Progress, Badge, Avatar, Spin, Empty, message, Tag, InputNumber } from 'antd';
import { TrophyOutlined, CheckCircleFilled, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import {
  listChallenges, checkin,
  type Challenge,
  isChallengeActive, hasCheckedInToday,
} from '../../api/groupApi';

export default function ChallengePage() {
  const { groupId, challengeId } = useParams<{ groupId: string; challengeId: string }>();
  const navigate   = useNavigate();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [note,      setNote]      = useState('');
  const [pages,     setPages]     = useState<number | null>(null);
  const [checking,  setChecking]  = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await listChallenges(Number(groupId), { page: 1 });
        const c = res.list.find(c => c.id === Number(challengeId));
        setChallenge(c || null);
      } catch {
        message.error('加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId, challengeId]);

  const handleCheckin = async () => {
    if (!challenge) return;
    setChecking(true);
    try {
      const res = await checkin(Number(groupId), Number(challengeId), {
        note: note.trim(),
        currentPages: pages || undefined,
      });
      message.success(`打卡成功！累计打卡 ${res.checkinCount} 次 🎉`);
      setNote('');
      setPages(null);
      setChallenge(prev => prev ? {
        ...prev,
        myCheckinCount: res.checkinCount,
        myLastCheckin: new Date().toISOString(),
        isParticipating: true,
      } : prev);
    } catch (err: any) {
      message.error(err?.response?.data?.message || '打卡失败');
    } finally {
      setChecking(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!challenge) return <Empty description="挑战不存在" />;

  const active  = isChallengeActive(challenge);
  const checked = hasCheckedInToday(challenge.myLastCheckin);
  const progressPercent = challenge.targetPages && pages
    ? Math.min(Math.round((pages / challenge.targetPages) * 100), 100)
    : 0;
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(challenge.deadline).getTime() - Date.now()) / 86400000
  ));

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/groups/${groupId}`)}
        style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}
      >
        返回小组
      </Button>

      {/* 挑战基本信息 */}
      <Card
        style={{ borderRadius: 16, marginBottom: 20, border: '1px solid var(--color-border)' }}
        bodyStyle={{ padding: 28 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <TrophyOutlined style={{ fontSize: 32, color: '#faad14' }} />
          <div>
            <h2 style={{ margin: 0, color: 'var(--color-text-primary)' }}>{challenge.title}</h2>
            <Tag color={active ? 'green' : 'default'}>{active ? '进行中' : '已结束'}</Tag>
            {active && <span style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginLeft: 8 }}>剩余 {daysLeft} 天</span>}
          </div>
        </div>

        {challenge.description && (
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            {challenge.description}
          </p>
        )}

        {challenge.bookTitle && (
          <div style={{
            background: 'var(--color-accent)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            {challenge.bookCover && (
              <img src={challenge.bookCover} alt="封面" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4 }} />
            )}
            <div>
              <div style={{ fontWeight: 600 }}>目标书籍：《{challenge.bookTitle}》</div>
              {challenge.targetPages && (
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>目标读完 {challenge.targetPages} 页</div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 24, color: 'var(--color-text-secondary)', fontSize: 13 }}>
          <span>👥 {challenge.participantCount} 人参与</span>
          <span>📅 截止：{new Date(challenge.deadline).toLocaleDateString('zh-CN')}</span>
          {challenge.isParticipating && (
            <span>✅ 我已打卡 {challenge.myCheckinCount} 次</span>
          )}
        </div>
      </Card>

      {/* 打卡区域 */}
      {isLoggedIn && active && (
        <Card
          title={<span>📝 今日打卡</span>}
          style={{ borderRadius: 16, marginBottom: 20, border: '1px solid var(--color-border)' }}
          bodyStyle={{ padding: 20 }}
        >
          {checked ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-primary)' }}>
              <CheckCircleFilled style={{ fontSize: 36, marginBottom: 8 }} />
              <div style={{ fontWeight: 600 }}>今天已打卡！继续加油 💪</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4 }}>
                累计打卡 {challenge.myCheckinCount} 次
              </div>
            </div>
          ) : (
            <>
              {challenge.targetPages && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: 8 }}>
                    当前读到第几页？
                  </label>
                  <InputNumber
                    min={1}
                    max={challenge.targetPages}
                    value={pages}
                    onChange={v => setPages(v)}
                    style={{ width: '100%' }}
                    placeholder={`最多 ${challenge.targetPages} 页`}
                  />
                  {pages !== null && challenge.targetPages && (
                    <Progress
                      percent={progressPercent}
                      strokeColor="var(--color-primary)"
                      style={{ marginTop: 8 }}
                    />
                  )}
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 500, display: 'block', marginBottom: 8 }}>打卡感想（可选）</label>
                <Input.TextArea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="写点今天的阅读感受..."
                  rows={3}
                  maxLength={500}
                  showCount
                  style={{ borderRadius: 8 }}
                />
              </div>
              <Button
                type="primary"
                block
                onClick={handleCheckin}
                loading={checking}
                style={{
                  borderRadius: 24,
                  height: 44,
                  fontSize: 16,
                  background: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                }}
              >
                ✅ 打卡
              </Button>
            </>
          )}
        </Card>
      )}

      {!isLoggedIn && active && (
        <Card style={{ borderRadius: 16, textAlign: 'center', marginBottom: 20 }} bodyStyle={{ padding: 24 }}>
          <p>登录后可参与打卡</p>
          <Button type="primary" onClick={() => navigate('/login')}
            style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
            立即登录
          </Button>
        </Card>
      )}
    </div>
  );
}
