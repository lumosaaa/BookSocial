/**
 * recommendService.test.js — 推荐服务单元测试
 */

jest.mock('../common/db', () => ({
  query: jest.fn(),
}));
jest.mock('../common/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

const db = require('../common/db');
const redis = require('../common/redis');
const recService = require('../services/recommendService');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getRecommendedBooks', () => {
  it('缓存命中时应直接返回，不查DB', async () => {
    redis.get.mockResolvedValue([1, 2, 3]);
    // fetchBooksDetail 的 DB 查询
    db.query.mockResolvedValueOnce([[
      { id: 1, title: '书1', author: '作者1' },
      { id: 2, title: '书2', author: '作者2' },
      { id: 3, title: '书3', author: '作者3' },
    ], null]);

    const result = await recService.getRecommendedBooks(1, 20);
    expect(result).toHaveLength(3);
    // redis.get 被调用1次，db.query 只被 fetchBooksDetail 调用1次
    expect(redis.get).toHaveBeenCalledWith('rec:books:1');
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('缓存未命中时应计算推荐并写缓存', async () => {
    redis.get.mockResolvedValue(null);
    // computeBookRecommendations 内部查询
    db.query
      .mockResolvedValueOnce([[], null])           // shelfRows (空书架)
      .mockResolvedValueOnce([[], null])           // prefRows (无偏好)
      .mockResolvedValueOnce([[                     // getHotBookIds
        { id: 10 }, { id: 11 }, { id: 12 }, { id: 13 }, { id: 14 },
        { id: 15 }, { id: 16 }, { id: 17 }, { id: 18 }, { id: 19 },
      ], null])
      .mockResolvedValueOnce([[                     // fetchBooksDetail
        { id: 10, title: '热门1' }, { id: 11, title: '热门2' },
      ], null]);

    redis.set.mockResolvedValue(true);

    const result = await recService.getRecommendedBooks(1, 2);
    expect(redis.set).toHaveBeenCalled();
    expect(result.length).toBeLessThanOrEqual(2);
  });
});

describe('getHotBooks', () => {
  it('缓存命中时应直接返回', async () => {
    const cached = [
      { id: 1, title: '热门书', hotScore: 100, shelfCount: 50 },
    ];
    redis.get.mockResolvedValue(cached);

    const result = await recService.getHotBooks(20);
    expect(result).toEqual(cached);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('getRecommendedFriends', () => {
  it('应过滤隐私设置为不可发现的用户', async () => {
    redis.get.mockResolvedValue(null);
    // followingRows
    db.query.mockResolvedValueOnce([[{ following_id: 2 }], null]);
    // Jaccard query
    db.query.mockResolvedValueOnce([[
      { user_id: 3, common_books: 5, jaccard_score: 0.5 },
      { user_id: 4, common_books: 3, jaccard_score: 0.3 },
    ], null]);
    // privacy filter: user 4 隐藏
    db.query.mockResolvedValueOnce([[{ user_id: 4 }], null]);
    // fetchUsersDetail
    db.query.mockResolvedValueOnce([[
      { id: 3, username: '书友A', avatarUrl: null, bio: '', followerCount: 10, bookCount: 20, isFollowing: 0 },
    ], null]);

    redis.set.mockResolvedValue(true);

    const result = await recService.getRecommendedFriends(1, 10);
    // user 4 被过滤，只剩 user 3
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });
});

describe('handleFeedback', () => {
  it('dislike book 应清除书籍推荐缓存', async () => {
    await recService.handleFeedback({
      userId: 1, targetId: 5, targetType: 'book', action: 'dislike',
    });
    expect(redis.del).toHaveBeenCalledWith('rec:books:1');
  });

  it('dislike friend 应清除书友推荐缓存', async () => {
    await recService.handleFeedback({
      userId: 1, targetId: 3, targetType: 'friend', action: 'dislike',
    });
    expect(redis.del).toHaveBeenCalledWith('rec:friends:1');
  });
});
