import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, Button, Spin, Empty, FloatButton } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import type { Post, CursorResult } from '../../api/postApi';
import { getFeed } from '../../api/postApi';
import PostCard from '../../components/PostCard';
import PostComposer from '../../components/PostComposer';
import { useAuthStore } from '../../store/authStore';
import { useNavigate, useSearchParams } from 'react-router-dom';

type FeedTab = 'following' | 'recommend';

const FeedPage: React.FC = () => {
  const { user }                  = useAuthStore();
  const navigate                  = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab]             = useState<FeedTab>('recommend');
  const [posts, setPosts]         = useState<Post[]>([]);
  const [cursor, setCursor]       = useState<string | undefined>();
  const [hasMore, setHasMore]     = useState(true);
  const [loading, setLoading]     = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const loaderRef                 = useRef<HTMLDivElement>(null);

  // /create 重定向过来时（?compose=1），自动打开发帖弹窗
  useEffect(() => {
    if (searchParams.get('compose') === '1') {
      if (user) {
        setComposerOpen(true);
      } else {
        navigate('/login');
      }
      // 清除 URL 参数，避免刷新后再次触发
      setSearchParams({}, { replace: true });
    }
  }, []);

  // ── 加载数据 ──────────────────────────────────────────────
  const loadFeed = useCallback(async (nextCursor?: string, append = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await getFeed(tab, nextCursor);
      setPosts(prev => append ? [...prev, ...res.list] : res.list);
      setCursor(res.nextCursor ?? undefined);
      setHasMore(res.hasMore);
    } catch {
      // 静默失败，已有 apiClient 全局拦截
    } finally {
      setLoading(false);
    }
  }, [tab]);

  // Tab 切换时重置
  useEffect(() => {
    setPosts([]);
    setCursor(undefined);
    setHasMore(true);
    loadFeed();
  }, [tab]);

  // ── IntersectionObserver 无限滚动 ─────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadFeed(cursor, true);
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, cursor, loadFeed]);

  const handlePostDeleted = (id: number) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const tabItems = [
    { key: 'recommend', label: '推荐' },
    {
      key: 'following',
      label: '关注',
      disabled: !user,
    },
  ];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 80px' }}>
      <Tabs
        activeKey={tab}
        onChange={k => {
          if (k === 'following' && !user) { navigate('/login'); return; }
          setTab(k as FeedTab);
        }}
        items={tabItems}
        style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10, paddingTop: 8 }}
        tabBarExtraContent={
          user && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={() => setComposerOpen(true)}
              style={{ marginRight: 8 }}
            >
              发动态
            </Button>
          )
        }
      />

      {/* 帖子列表 */}
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onDeleted={handlePostDeleted}
        />
      ))}

      {/* 空态 */}
      {!loading && posts.length === 0 && (
        <Empty
          style={{ marginTop: 60 }}
          description={
            tab === 'following'
              ? '还没有关注的人发帖，去发现更多书友吧 →'
              : '暂时没有推荐内容'
          }
        />
      )}

      {/* 加载触发器 */}
      <div ref={loaderRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading && <Spin size="small" />}
        {!loading && !hasMore && posts.length > 0 && (
          <span style={{ color: '#bbb', fontSize: 13 }}>已加载全部内容</span>
        )}
      </div>

      {/* 移动端发帖悬浮按钮 */}
      {user && (
        <FloatButton
          icon={<PlusOutlined />}
          type="primary"
          style={{ bottom: 72, right: 20 }}
          onClick={() => setComposerOpen(true)}
        />
      )}

      {/* 发帖弹窗 */}
      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSuccess={() => {
          setComposerOpen(false);
          setPosts([]);
          setCursor(undefined);
          setHasMore(true);
          loadFeed();
        }}
      />
    </div>
  );
};

export default FeedPage;
