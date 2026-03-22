/**
 * likeService.test.js — 点赞服务单元测试
 */

const mockConn = { query: jest.fn() };

jest.mock('../common/db', () => ({
  query: jest.fn(),
  transaction: jest.fn(cb => cb(mockConn)),
}));
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({}),
}));

const db = require('../common/db');
const axios = require('axios');
const { toggleLike } = require('../services/likeService');

beforeEach(() => {
  jest.clearAllMocks();
  mockConn.query.mockReset();
});

describe('toggleLike', () => {
  it('不支持的targetType应抛出400', async () => {
    await expect(toggleLike(1, 1, 99))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('目标不存在应抛出404', async () => {
    db.query.mockResolvedValueOnce([[undefined], null]); // target不存在
    await expect(toggleLike(1, 999, 1))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('首次点赞应返回liked:true', async () => {
    // SELECT target
    db.query
      .mockResolvedValueOnce([[{ id: 1, user_id: 2 }], null])
      // SELECT existing like
      .mockResolvedValueOnce([[undefined], null])
      // SELECT updated count
      .mockResolvedValueOnce([[{ likeCount: 5 }], null]);

    // transaction内的INSERT和UPDATE
    mockConn.query.mockResolvedValue([null, null]);

    const result = await toggleLike(1, 1, 1);
    expect(result.liked).toBe(true);
    expect(result.likeCount).toBe(5);
    expect(db.transaction).toHaveBeenCalled();
  });

  it('已点赞再次调用应取消点赞', async () => {
    db.query
      .mockResolvedValueOnce([[{ id: 1, user_id: 2 }], null])
      .mockResolvedValueOnce([[{ id: 10 }], null]) // existing like
      .mockResolvedValueOnce([[{ likeCount: 3 }], null]);

    mockConn.query.mockResolvedValue([null, null]);

    const result = await toggleLike(1, 1, 1);
    expect(result.liked).toBe(false);
    expect(result.likeCount).toBe(3);
  });

  it('自己点赞自己的帖子不应触发通知', async () => {
    db.query
      .mockResolvedValueOnce([[{ id: 1, user_id: 1 }], null]) // target.user_id === userId
      .mockResolvedValueOnce([[undefined], null])
      .mockResolvedValueOnce([[{ likeCount: 1 }], null]);

    mockConn.query.mockResolvedValue([null, null]);

    await toggleLike(1, 1, 1);
    expect(axios.post).not.toHaveBeenCalled();
  });
});
