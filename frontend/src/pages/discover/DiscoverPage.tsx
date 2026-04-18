/**
 * DiscoverPage.tsx — M6 · 发现页
 * 路由：/discover
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Spin, Empty, Button, Avatar, Tag, Rate, message } from 'antd';
import { UserAddOutlined, CheckOutlined, BookOutlined, StarFilled, CloseOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import {
  getRecommendedBooks,
  getRecommendedFriends,
  getHotBooks,
  submitFeedback,
  type RecommendedBook,
  type RecommendedFriend,
} from '../../api/discoverApi';
import apiClient from '../../api/apiClient';

import './DiscoverPage.css';

// ── 推荐书籍卡片 ──────────────────────────────────────────────
function BookRecommendCard({
  book,
  onDismiss,
}: {
  book: RecommendedBook;
  onDismiss: (id: number) => void;
}) {
  const navigate = useNavigate();
  const stars = book.platformRating ? book.platformRating / 2 : 0; // 10分制→5星

  return (
    <div className="discover-book-card" onClick={() => navigate(`/books/${book.id}`)}>
      <button
        className="dismiss-btn"
        onClick={e => {
          e.stopPropagation();
          onDismiss(book.id);
        }}
        title="不感兴趣"
      >
        <CloseOutlined />
      </button>
      <div className="book-cover">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} loading="lazy" />
        ) : (
          <div className="cover-placeholder">
            <BookOutlined />
          </div>
        )}
      </div>
      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>
        {book.categoryName && <Tag color="green">{book.categoryName}</Tag>}
        {book.platformRating && (
          <div className="book-rating">
            <Rate disabled allowHalf value={stars} style={{ fontSize: 12 }} />
            <span className="rating-value">{(book.platformRating / 2).toFixed(1)}</span>
          </div>
        )}
        <p className="shelf-count">
          <BookOutlined /> {(book.shelfCount ?? 0).toLocaleString()} 人在读
        </p>
      </div>
    </div>
  );
}

// ── 推荐书友卡片 ──────────────────────────────────────────────
function FriendRecommendCard({
  friend,
  onFollowChange,
  onDismiss,
}: {
  friend: RecommendedFriend;
  onFollowChange: (id: number, followed: boolean) => void;
  onDismiss: (id: number) => void;
}) {
  const navigate   = useNavigate();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const [loading, setLoading]     = useState(false);
  const [followed, setFollowed]   = useState(friend.isFollowing);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post(`/users/${friend.id}/follow`);
      const newFollowed = res.data.data.followed;
      setFollowed(newFollowed);
      onFollowChange(friend.id, newFollowed);
      message.success(newFollowed ? '已关注' : '已取关');
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="discover-friend-card">
      <button
        className="dismiss-btn"
        onClick={() => onDismiss(friend.id)}
        title="不感兴趣"
      >
        <CloseOutlined />
      </button>
      <div className="friend-header" onClick={() => navigate(`/users/${friend.id}`)}>
        <Avatar size={56} src={friend.avatarUrl} style={{ cursor: 'pointer' }}>
          {!friend.avatarUrl && friend.username[0]}
        </Avatar>
        <div className="friend-meta">
          <span className="friend-name">{friend.username}</span>
          {friend.bio && <span className="friend-bio">{friend.bio}</span>}
          <span className="friend-stats">
            {friend.bookCount} 本书 · {friend.followerCount} 粉丝
          </span>
        </div>
      </div>
      <Button
        type={followed ? 'default' : 'primary'}
        icon={followed ? <CheckOutlined /> : <UserAddOutlined />}
        loading={loading}
        onClick={handleFollow}
        className="follow-btn"
        style={{ borderColor: followed ? undefined : 'var(--color-primary)', color: followed ? undefined : 'var(--color-primary)', background: followed ? undefined : 'transparent' }}
      >
        {followed ? '已关注' : '关注'}
      </Button>
    </div>
  );
}

// ── 发现页主组件 ──────────────────────────────────────────────
export default function DiscoverPage() {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  const [recBooks,    setRecBooks]    = useState<RecommendedBook[]>([]);
  const [hotBooks,    setHotBooks]    = useState<RecommendedBook[]>([]);
  const [friends,     setFriends]     = useState<RecommendedFriend[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [hotLoading,  setHotLoading]  = useState(false);
  const [activeTab,   setActiveTab]   = useState('rec');

  // 加载推荐书籍
  const loadRecBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const data = await getRecommendedBooks(24);
      setRecBooks(data);
    } catch {
      message.error('加载推荐书籍失败');
    } finally {
      setBooksLoading(false);
    }
  }, []);

  // 加载热门书籍
  const loadHotBooks = useCallback(async () => {
    setHotLoading(true);
    try {
      const data = await getHotBooks(24);
      setHotBooks(data);
    } catch {
      message.error('加载热门书籍失败');
    } finally {
      setHotLoading(false);
    }
  }, []);

  // 加载推荐书友
  const loadFriends = useCallback(async () => {
    if (!isLoggedIn) return;
    setFriendsLoading(true);
    try {
      const data = await getRecommendedFriends(12);
      setFriends(data);
    } catch {
      message.error('加载推荐书友失败');
    } finally {
      setFriendsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadRecBooks();
    loadHotBooks();
    loadFriends();
  }, [loadRecBooks, loadHotBooks, loadFriends]);

  // 不感兴趣 → 提交反馈 + 移除卡片
  const dismissBook = async (bookId: number) => {
    setRecBooks(prev => prev.filter(b => b.id !== bookId));
    try {
      await submitFeedback(bookId, 'book', 'dislike');
    } catch {/* 静默 */}
  };

  // 热门榜的 dismiss：只把卡片从当前视图移除，不上报反馈（热门是全站榜单）
  const dismissHotBook = (bookId: number) => {
    setHotBooks(prev => prev.filter(b => b.id !== bookId));
  };

  const dismissFriend = async (userId: number) => {
    setFriends(prev => prev.filter(f => f.id !== userId));
    try {
      await submitFeedback(userId, 'friend', 'dislike');
    } catch {/* 静默 */}
  };

  const tabItems = [
    {
      key:   'rec',
      label: '为你推荐',
      children: (
        <div className="discover-section">
          <h2 className="section-title">
            <StarFilled style={{ color: 'var(--color-secondary)' }} /> 猜你喜欢
          </h2>
          {booksLoading ? (
            <div className="loading-center"><Spin size="large" /></div>
          ) : recBooks.length === 0 ? (
            <Empty description="暂无推荐，去书架添加几本书吧~" />
          ) : (
            <div className="books-grid">
              {recBooks.map(b => (
                <BookRecommendCard key={b.id} book={b} onDismiss={dismissBook} />
              ))}
            </div>
          )}

          {isLoggedIn && (
            <>
              <h2 className="section-title" style={{ marginTop: 40 }}>
                <UserAddOutlined style={{ color: 'var(--color-primary)' }} /> 推荐书友
              </h2>
              {friendsLoading ? (
                <div className="loading-center"><Spin /></div>
              ) : friends.length === 0 ? (
                <Empty description="暂无推荐书友，先多读几本书吧~" />
              ) : (
                <div className="friends-grid">
                  {friends.map(f => (
                    <FriendRecommendCard
                      key={f.id}
                      friend={f}
                      onFollowChange={(id, followed) => {
                        setFriends(prev => prev.map(fr => fr.id === id ? { ...fr, isFollowing: followed } : fr));
                      }}
                      onDismiss={dismissFriend}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key:   'hot',
      label: '热门榜单',
      children: (
        <div className="discover-section">
          <h2 className="section-title">
            🔥 近 7 天热门书籍
          </h2>
          {hotLoading ? (
            <div className="loading-center"><Spin size="large" /></div>
          ) : hotBooks.length === 0 ? (
            <Empty description="暂无热门数据" />
          ) : (
            <div className="books-grid">
              {hotBooks.map((b, idx) => (
                <div key={b.id} className="hot-rank-wrapper">
                  <span className={`rank-badge ${idx < 3 ? 'rank-top' : ''}`}>{idx + 1}</span>
                  <BookRecommendCard book={b} onDismiss={dismissHotBook} />
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="discover-page">
      <div className="discover-header">
        <h1>发现</h1>
        <p>基于你的阅读偏好，为你推荐好书与书友</p>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="discover-tabs"
      />
    </div>
  );
}
