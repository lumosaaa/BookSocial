import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Empty, Tabs } from 'antd';
import type { Post, ReadingNote } from '../../api/postApi';
import { getUserPosts, getUserNotes } from '../../api/postApi';
import PostCard from '../../components/PostCard';
import NoteCard from '../../components/NoteCard';

type TabKey = 'posts' | 'notes';

interface Props {
  /** 可从父组件（MyProfilePage / UserProfilePage）传入，也可从路由参数读取 */
  userId?: number;
  initialTab?: TabKey;
  hideTabs?: boolean;
}

const UserPostsPage: React.FC<Props> = ({ userId: propUserId, initialTab = 'posts', hideTabs = false }) => {
  const { id: paramId }          = useParams<{ id: string }>();
  const userId                   = propUserId ?? Number(paramId);

  const [tab, setTab]            = useState<TabKey>(initialTab);
  const [posts, setPosts]        = useState<Post[]>([]);
  const [notes, setNotes]        = useState<ReadingNote[]>([]);
  const [postPage, setPostPage]  = useState(1);
  const [notePage, setNotePage]  = useState(1);
  const [postHasMore, setPostHasMore] = useState(true);
  const [noteHasMore, setNoteHasMore] = useState(true);
  const [loading, setLoading]    = useState(false);

  // ── 加载动态 ──────────────────────────────────────────────
  const loadPosts = useCallback(async (page = 1, append = false) => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await getUserPosts(userId, page);
      setPosts(prev => append ? [...prev, ...res.list] : res.list);
      setPostPage(page);
      setPostHasMore(res.hasMore);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── 加载笔记 ──────────────────────────────────────────────
  const loadNotes = useCallback(async (page = 1, append = false) => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await getUserNotes(userId, page);
      setNotes(prev => append ? [...prev, ...res.list] : res.list);
      setNotePage(page);
      setNoteHasMore(res.hasMore);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, userId]);

  useEffect(() => {
    if (tab === 'posts') loadPosts(1);
    else                 loadNotes(1);
  }, [tab, userId, loadPosts, loadNotes]);

  const handlePostDeleted = (id: number) =>
    setPosts(prev => prev.filter(p => p.id !== id));

  const tabItems = [
    { key: 'posts', label: '动态' },
    { key: 'notes', label: '笔记' },
  ];

  return (
    <div>
      {!hideTabs && (
        <Tabs
          activeKey={tab}
          onChange={k => setTab(k as TabKey)}
          items={tabItems}
          size="small"
        />
      )}

      {tab === 'posts' && (
        <>
          {posts.map(p => (
            <PostCard key={p.id} post={p} onDeleted={handlePostDeleted} />
          ))}
          {!loading && posts.length === 0 && (
            <Empty description="暂无动态" style={{ padding: '30px 0' }} />
          )}
          {loading && <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>}
          {!loading && postHasMore && (
            <div style={{ textAlign: 'center', paddingTop: 12 }}>
              <span
                style={{ color: '#4A6741', cursor: 'pointer', fontSize: 13 }}
                onClick={() => loadPosts(postPage + 1, true)}
              >
                加载更多
              </span>
            </div>
          )}
        </>
      )}

      {tab === 'notes' && (
        <>
          {notes.map(n => (
            <NoteCard key={n.id} note={n} />
          ))}
          {!loading && notes.length === 0 && (
            <Empty description="暂无公开笔记" style={{ padding: '30px 0' }} />
          )}
          {loading && <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>}
          {!loading && noteHasMore && (
            <div style={{ textAlign: 'center', paddingTop: 12 }}>
              <span
                style={{ color: '#4A6741', cursor: 'pointer', fontSize: 13 }}
                onClick={() => loadNotes(notePage + 1, true)}
              >
                加载更多
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserPostsPage;
