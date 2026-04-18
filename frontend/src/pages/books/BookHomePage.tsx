/**
 * BookHomePage.tsx
 * 微信读书风格首页：继续阅读 / 猜你喜欢 / 推荐书友 / 分类
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Avatar, Button, Empty, Spin, Tooltip } from 'antd';
import {
  ReloadOutlined,
  ArrowRightOutlined,
  BookOutlined,
  StarFilled,
  UserAddOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  getCategories,
  getShelf,
  type Category,
  type ShelfEntry,
} from '../../api/bookApi';
import {
  getRecommendedBooks,
  getRecommendedFriends,
  getHotBooks,
  type RecommendedBook,
  type RecommendedFriend,
} from '../../api/discoverApi';
import { useAuthStore } from '../../store/authStore';
import FollowButton from '../../components/FollowButton';

const READING_LIMIT = 8;
const REC_PAGE = 4;
const FRIEND_PAGE = 4;
const CATEGORY_LIMIT = 12;

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--color-text-primary)',
  margin: 0,
};

const sectionStyle: React.CSSProperties = {
  background: 'var(--color-surface-card)',
  borderRadius: 16,
  padding: '20px 24px',
  marginBottom: 24,
  boxShadow: 'var(--shadow-card)',
};

function SectionHeader({
  title,
  onRefresh,
  onExpand,
  expandLabel = '展开',
  extra,
}: {
  title: React.ReactNode;
  onRefresh?: () => void;
  onExpand?: () => void;
  expandLabel?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}
    >
      <h2 style={sectionTitleStyle}>{title}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {extra}
        {onRefresh && (
          <Tooltip title="换一批">
            <Button
              size="small"
              type="text"
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              换一批
            </Button>
          </Tooltip>
        )}
        {onExpand && (
          <Button
            size="small"
            type="text"
            onClick={onExpand}
            style={{ color: 'var(--color-primary)' }}
          >
            {expandLabel} <ArrowRightOutlined />
          </Button>
        )}
      </div>
    </div>
  );
}

function ContinueReadingCard({ entry }: { entry: ShelfEntry }) {
  const navigate = useNavigate();
  const progress = entry.readingProgress && entry.totalPagesRef
    ? Math.min(100, Math.round((entry.readingProgress / entry.totalPagesRef) * 100))
    : null;
  return (
    <div
      onClick={() => navigate(`/books/${entry.bookId}/read`)}
      style={{
        display: 'flex',
        gap: 12,
        cursor: 'pointer',
        padding: 8,
        borderRadius: 10,
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div
        style={{
          width: 56,
          height: 80,
          borderRadius: 4,
          overflow: 'hidden',
          background: 'var(--color-accent)',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {entry.coverUrl ? (
          <img
            src={entry.coverUrl}
            alt={entry.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <BookOutlined style={{ color: 'var(--color-secondary)', fontSize: 22 }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {entry.title}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              marginTop: 4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {entry.author?.split('│')[0] || '佚名'}
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          {progress !== null ? `已读 ${progress}%` : '继续阅读'}
        </div>
      </div>
    </div>
  );
}

function BookRecommendCard({ book }: { book: RecommendedBook }) {
  const navigate = useNavigate();
  const stars = book.platformRating ? (book.platformRating / 2).toFixed(1) : null;
  return (
    <div
      onClick={() => navigate(`/books/${book.id}`)}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '3 / 4',
          background: 'var(--color-accent)',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 4px 14px rgba(44,62,45,0.12)',
        }}
      >
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-secondary)',
            }}
          >
            <BookOutlined style={{ fontSize: 32 }} />
          </div>
        )}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {book.title}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--color-text-secondary)',
          marginTop: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {book.author?.split('│')[0] || '佚名'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        {stars && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, color: '#92400e', fontWeight: 600 }}>
            <StarFilled style={{ color: '#f59e0b', fontSize: 12 }} />
            {stars}
          </span>
        )}
        {book.categoryName && (
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>· {book.categoryName}</span>
        )}
      </div>
    </div>
  );
}

function FriendRecommendCard({ friend }: { friend: RecommendedFriend }) {
  const navigate = useNavigate();
  const [followerCount, setFollowerCount] = useState(friend.followerCount);
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        textAlign: 'center',
      }}
    >
      <Avatar
        size={56}
        src={friend.avatarUrl || undefined}
        style={{ cursor: 'pointer', background: 'var(--color-accent)', color: 'var(--color-primary)' }}
        onClick={() => navigate(`/users/${friend.id}`)}
      >
        {!friend.avatarUrl && friend.username[0]}
      </Avatar>
      <div style={{ minHeight: 48 }}>
        <div
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', cursor: 'pointer' }}
          onClick={() => navigate(`/users/${friend.id}`)}
        >
          {friend.username}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            marginTop: 4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {friend.bio || `${friend.bookCount} 本书 · ${followerCount} 粉丝`}
        </div>
      </div>
      <FollowButton
        userId={friend.id}
        initialFollowed={friend.isFollowing}
        size="small"
        onToggle={(_followed, _mutual, nextFollowerCount) => setFollowerCount(nextFollowerCount)}
      />
    </div>
  );
}

function CategoryCard({ cat }: { cat: Category }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/categories/${cat.id}`)}
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px 8px',
        borderRadius: 12,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        transition: 'all 0.2s',
        gap: 6,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--color-primary-light)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.transform = '';
      }}
    >
      <span style={{ fontSize: 28 }}>{cat.icon || '📚'}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {cat.name}
      </span>
      {cat.bookCount !== undefined && (
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          {cat.bookCount} 本书籍
        </span>
      )}
    </div>
  );
}

const BookHomePage: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  const [reading, setReading] = useState<ShelfEntry[]>([]);
  const [recBooks, setRecBooks] = useState<RecommendedBook[]>([]);
  const [recBookOffset, setRecBookOffset] = useState(0);
  const [recBooksLoading, setRecBooksLoading] = useState(false);
  const [friends, setFriends] = useState<RecommendedFriend[]>([]);
  const [friendOffset, setFriendOffset] = useState(0);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // 继续阅读
  useEffect(() => {
    if (!isLoggedIn) {
      setReading([]);
      return;
    }
    getShelf({ status: 2, page: 1 })
      .then(res => {
        const list: ShelfEntry[] = res.data?.data?.list || [];
        setReading(list.slice(0, READING_LIMIT));
      })
      .catch(() => setReading([]));
  }, [isLoggedIn]);

  // 推荐书籍
  const loadRecBooks = useCallback(async (offset: number) => {
    setRecBooksLoading(true);
    try {
      const list = await getRecommendedBooks(REC_PAGE, offset);
      if (list.length === 0 && offset > 0) {
        // 翻完一轮，回到开头
        const fresh = await getRecommendedBooks(REC_PAGE, 0);
        setRecBookOffset(0);
        setRecBooks(fresh);
      } else {
        setRecBooks(list);
      }
    } catch {
      // 兜底：未登录用户走 hot
      try {
        const hot = await getHotBooks(REC_PAGE, offset);
        setRecBooks(hot);
      } catch {
        setRecBooks([]);
      }
    } finally {
      setRecBooksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecBooks(0);
  }, [loadRecBooks]);

  // 推荐书友
  const loadFriends = useCallback(async (offset: number) => {
    if (!isLoggedIn) {
      setFriends([]);
      return;
    }
    setFriendsLoading(true);
    try {
      const list = await getRecommendedFriends(FRIEND_PAGE, offset);
      if (list.length === 0 && offset > 0) {
        const fresh = await getRecommendedFriends(FRIEND_PAGE, 0);
        setFriendOffset(0);
        setFriends(fresh);
      } else {
        setFriends(list);
      }
    } catch {
      setFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadFriends(0);
  }, [loadFriends]);

  // 分类
  useEffect(() => {
    getCategories()
      .then(res => setCategories(res.data?.data ?? []))
      .catch(() => setCategories([]));
  }, []);

  const handleRefreshRecBooks = () => {
    const next = recBookOffset + REC_PAGE;
    setRecBookOffset(next);
    loadRecBooks(next);
  };

  const handleRefreshFriends = () => {
    const next = friendOffset + FRIEND_PAGE;
    setFriendOffset(next);
    loadFriends(next);
  };

  return (
    <div>
      {/* 继续阅读 */}
      {isLoggedIn && reading.length > 0 && (
        <div style={sectionStyle}>
          <SectionHeader
            title="继续阅读"
            onExpand={() => navigate('/shelf')}
            expandLabel="我的书架"
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            {reading.map(entry => (
              <ContinueReadingCard key={entry.bookId} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* 猜你喜欢 */}
      <div style={sectionStyle}>
        <SectionHeader
          title="猜你喜欢"
          onRefresh={handleRefreshRecBooks}
          onExpand={() => navigate('/discover')}
        />
        {recBooksLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
        ) : recBooks.length === 0 ? (
          <Empty description="暂无推荐" />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 20,
            }}
          >
            {recBooks.map(book => (
              <BookRecommendCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>

      {/* 推荐书友 */}
      {isLoggedIn && (
        <div style={sectionStyle}>
          <SectionHeader
            title={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <UserAddOutlined style={{ color: 'var(--color-primary)' }} /> 推荐书友
              </span>
            }
            onRefresh={handleRefreshFriends}
            onExpand={() => navigate('/discover')}
          />
          {friendsLoading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
          ) : friends.length === 0 ? (
            <Empty description="暂无推荐书友" />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 16,
              }}
            >
              {friends.map(friend => (
                <FriendRecommendCard key={friend.id} friend={friend} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 分类 */}
      <div style={sectionStyle}>
        <SectionHeader
          title="分类"
          onExpand={() => navigate('/categories')}
          expandLabel={`查看全部${categories.length ? ` · ${categories.length} 个` : ''}`}
        />
        {categories.length === 0 ? (
          <Empty description="暂无分类" />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            {categories.slice(0, CATEGORY_LIMIT).map(cat => (
              <CategoryCard key={cat.id} cat={cat} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookHomePage;
