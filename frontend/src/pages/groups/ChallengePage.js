import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * M5 · 阅读挑战详情页（含打卡）
 * 路由：/groups/:groupId/challenges/:challengeId
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Input, Progress, Spin, Empty, message, Tag, InputNumber } from 'antd';
import { TrophyOutlined, CheckCircleFilled, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { listChallenges, checkin, isChallengeActive, hasCheckedInToday, } from '../../api/groupApi';
export default function ChallengePage() {
    const { groupId, challengeId } = useParams();
    const navigate = useNavigate();
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const [challenge, setChallenge] = useState(null);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState('');
    const [pages, setPages] = useState(null);
    const [checking, setChecking] = useState(false);
    useEffect(() => {
        (async () => {
            try {
                const res = await listChallenges(Number(groupId), { page: 1 });
                const c = res.list.find(c => c.id === Number(challengeId));
                setChallenge(c || null);
            }
            catch {
                message.error('加载失败');
            }
            finally {
                setLoading(false);
            }
        })();
    }, [groupId, challengeId]);
    const handleCheckin = async () => {
        if (!challenge)
            return;
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
        }
        catch (err) {
            message.error(err?.response?.data?.message || '打卡失败');
        }
        finally {
            setChecking(false);
        }
    };
    if (loading)
        return _jsx("div", { style: { textAlign: 'center', padding: 80 }, children: _jsx(Spin, { size: "large" }) });
    if (!challenge)
        return _jsx(Empty, { description: "\u6311\u6218\u4E0D\u5B58\u5728" });
    const active = isChallengeActive(challenge);
    const checked = hasCheckedInToday(challenge.myLastCheckin);
    const progressPercent = challenge.targetPages && pages
        ? Math.min(Math.round((pages / challenge.targetPages) * 100), 100)
        : 0;
    const daysLeft = Math.max(0, Math.ceil((new Date(challenge.deadline).getTime() - Date.now()) / 86400000));
    return (_jsxs("div", { style: { maxWidth: 720, margin: '0 auto', padding: '24px 16px' }, children: [_jsx(Button, { type: "text", icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate(`/groups/${groupId}`), style: { color: 'var(--color-text-secondary)', marginBottom: 16 }, children: "\u8FD4\u56DE\u5C0F\u7EC4" }), _jsxs(Card, { style: { borderRadius: 16, marginBottom: 20, border: '1px solid var(--color-border)' }, bodyStyle: { padding: 28 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }, children: [_jsx(TrophyOutlined, { style: { fontSize: 32, color: '#faad14' } }), _jsxs("div", { children: [_jsx("h2", { style: { margin: 0, color: 'var(--color-text-primary)' }, children: challenge.title }), _jsx(Tag, { color: active ? 'green' : 'default', children: active ? '进行中' : '已结束' }), active && _jsxs("span", { style: { color: 'var(--color-text-secondary)', fontSize: 13, marginLeft: 8 }, children: ["\u5269\u4F59 ", daysLeft, " \u5929"] })] })] }), challenge.description && (_jsx("p", { style: { color: 'var(--color-text-secondary)', marginBottom: 16 }, children: challenge.description })), challenge.bookTitle && (_jsxs("div", { style: {
                            background: 'var(--color-accent)',
                            borderRadius: 10,
                            padding: '12px 16px',
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                        }, children: [challenge.bookCover && (_jsx("img", { src: challenge.bookCover, alt: "\u5C01\u9762", style: { width: 40, height: 56, objectFit: 'cover', borderRadius: 4 } })), _jsxs("div", { children: [_jsxs("div", { style: { fontWeight: 600 }, children: ["\u76EE\u6807\u4E66\u7C4D\uFF1A\u300A", challenge.bookTitle, "\u300B"] }), challenge.targetPages && (_jsxs("div", { style: { fontSize: 13, color: 'var(--color-text-secondary)' }, children: ["\u76EE\u6807\u8BFB\u5B8C ", challenge.targetPages, " \u9875"] }))] })] })), _jsxs("div", { style: { display: 'flex', gap: 24, color: 'var(--color-text-secondary)', fontSize: 13 }, children: [_jsxs("span", { children: ["\uD83D\uDC65 ", challenge.participantCount, " \u4EBA\u53C2\u4E0E"] }), _jsxs("span", { children: ["\uD83D\uDCC5 \u622A\u6B62\uFF1A", new Date(challenge.deadline).toLocaleDateString('zh-CN')] }), challenge.isParticipating && (_jsxs("span", { children: ["\u2705 \u6211\u5DF2\u6253\u5361 ", challenge.myCheckinCount, " \u6B21"] }))] })] }), isLoggedIn && active && (_jsx(Card, { title: _jsx("span", { children: "\uD83D\uDCDD \u4ECA\u65E5\u6253\u5361" }), style: { borderRadius: 16, marginBottom: 20, border: '1px solid var(--color-border)' }, bodyStyle: { padding: 20 }, children: checked ? (_jsxs("div", { style: { textAlign: 'center', padding: '20px 0', color: 'var(--color-primary)' }, children: [_jsx(CheckCircleFilled, { style: { fontSize: 36, marginBottom: 8 } }), _jsx("div", { style: { fontWeight: 600 }, children: "\u4ECA\u5929\u5DF2\u6253\u5361\uFF01\u7EE7\u7EED\u52A0\u6CB9 \uD83D\uDCAA" }), _jsxs("div", { style: { color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4 }, children: ["\u7D2F\u8BA1\u6253\u5361 ", challenge.myCheckinCount, " \u6B21"] })] })) : (_jsxs(_Fragment, { children: [challenge.targetPages && (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { fontWeight: 500, display: 'block', marginBottom: 8 }, children: "\u5F53\u524D\u8BFB\u5230\u7B2C\u51E0\u9875\uFF1F" }), _jsx(InputNumber, { min: 1, max: challenge.targetPages, value: pages, onChange: v => setPages(v), style: { width: '100%' }, placeholder: `最多 ${challenge.targetPages} 页` }), pages !== null && challenge.targetPages && (_jsx(Progress, { percent: progressPercent, strokeColor: "var(--color-primary)", style: { marginTop: 8 } }))] })), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { fontWeight: 500, display: 'block', marginBottom: 8 }, children: "\u6253\u5361\u611F\u60F3\uFF08\u53EF\u9009\uFF09" }), _jsx(Input.TextArea, { value: note, onChange: e => setNote(e.target.value), placeholder: "\u5199\u70B9\u4ECA\u5929\u7684\u9605\u8BFB\u611F\u53D7...", rows: 3, maxLength: 500, showCount: true, style: { borderRadius: 8 } })] }), _jsx(Button, { type: "primary", block: true, onClick: handleCheckin, loading: checking, style: {
                                borderRadius: 24,
                                height: 44,
                                fontSize: 16,
                                background: 'var(--color-primary)',
                                borderColor: 'var(--color-primary)',
                            }, children: "\u2705 \u6253\u5361" })] })) })), !isLoggedIn && active && (_jsxs(Card, { style: { borderRadius: 16, textAlign: 'center', marginBottom: 20 }, bodyStyle: { padding: 24 }, children: [_jsx("p", { children: "\u767B\u5F55\u540E\u53EF\u53C2\u4E0E\u6253\u5361" }), _jsx(Button, { type: "primary", onClick: () => navigate('/login'), style: { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }, children: "\u7ACB\u5373\u767B\u5F55" })] }))] }));
}
