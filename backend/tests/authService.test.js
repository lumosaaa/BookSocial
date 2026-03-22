/**
 * authService.test.js — 认证服务单元测试
 */

// Mock 依赖
jest.mock('../common/db', () => ({
  query: jest.fn(),
}));
jest.mock('../common/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));
jest.mock('../services/emailService', () => ({
  sendVerificationCode: jest.fn().mockResolvedValue(true),
}));
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashedpassword'),
  compare: jest.fn(),
}));

const db = require('../common/db');
const redis = require('../common/redis');
const bcrypt = require('bcryptjs');
const { sendVerificationCode } = require('../services/emailService');
const authService = require('../services/authService');

beforeEach(() => {
  jest.resetAllMocks();
});

// ── sendCode ──────────────────────────────────────────────────
describe('sendCode', () => {
  it('应生成6位验证码并写入Redis', async () => {
    const code = await authService.sendCode('test@example.com');
    expect(code).toMatch(/^\d{6}$/);
    expect(redis.set).toHaveBeenCalledWith('code:test@example.com', code, 600);
    expect(sendVerificationCode).toHaveBeenCalledWith('test@example.com', code);
  });
});

// ── verifyCode ────────────────────────────────────────────────
describe('verifyCode', () => {
  it('验证码正确时应通过并删除', async () => {
    redis.get.mockResolvedValue('123456');
    const result = await authService.verifyCode('test@example.com', '123456');
    expect(result).toBe(true);
    expect(redis.del).toHaveBeenCalledWith('code:test@example.com');
  });

  it('验证码错误时应抛出400', async () => {
    redis.get.mockResolvedValue('123456');
    await expect(authService.verifyCode('test@example.com', '000000'))
      .rejects.toMatchObject({ status: 400, message: '验证码错误' });
  });

  it('验证码过期时应抛出400', async () => {
    redis.get.mockResolvedValue(null);
    await expect(authService.verifyCode('test@example.com', '123456'))
      .rejects.toMatchObject({ status: 400 });
  });
});
// ── register ──────────────────────────────────────────────────
describe('register', () => {
  it('注册成功应返回用户信息和token', async () => {
    // mock verifyCode
    redis.get.mockResolvedValue('123456');
    redis.del.mockResolvedValue(true);
    // mock 查重：无重复
    db.query.mockResolvedValueOnce([[], null])  // verifyCode 内部的 redis 已 mock
      .mockResolvedValueOnce([[], null])         // 查重
      .mockResolvedValueOnce([{ insertId: 1 }, null])  // INSERT users
      .mockResolvedValueOnce([null, null]);      // INSERT privacy

    const result = await authService.register({
      email: 'new@example.com',
      code: '123456',
      username: '测试用户',
      password: 'password123',
    });

    expect(result.user.username).toBe('测试用户');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });
});

// ── loginWithPassword ─────────────────────────────────────────
describe('loginWithPassword', () => {
  const mockUser = {
    id: 1,
    username: '测试用户',
    email: 'test@example.com',
    password_hash: '$2a$12$hashedpassword',
    status: 1,
    role: 'user',
    login_fail_count: 0,
    locked_until: null,
    avatar_url: null,
  };

  it('密码正确应返回token', async () => {
    const calls = [];
    db.query.mockImplementation(async () => {
      calls.push(true);
      if (calls.length === 1) return [[mockUser]]; // SELECT user
      return [{ affectedRows: 1 }]; // UPDATE
    });
    bcrypt.compare.mockResolvedValue(true);

    const result = await authService.loginWithPassword({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.accessToken).toBeDefined();
    expect(result.user.id).toBe(1);
  });

  it('密码错误应递增失败计数', async () => {
    const calls = [];
    db.query.mockImplementation(async () => {
      calls.push(true);
      if (calls.length === 1) return [[mockUser]]; // SELECT user
      return [{ affectedRows: 1 }]; // UPDATE fail count
    });
    bcrypt.compare.mockResolvedValue(false);

    await expect(authService.loginWithPassword({
      email: 'test@example.com',
      password: 'wrong',
    })).rejects.toMatchObject({ status: 401 });
  });

  it('连续5次失败应锁定账号', async () => {
    const lockedUser = { ...mockUser, login_fail_count: 4 };
    const calls = [];
    db.query.mockImplementation(async () => {
      calls.push(true);
      if (calls.length === 1) return [[lockedUser]]; // SELECT user
      return [{ affectedRows: 1 }]; // UPDATE lock
    });
    bcrypt.compare.mockResolvedValue(false);

    await expect(authService.loginWithPassword({
      email: 'test@example.com',
      password: 'wrong',
    })).rejects.toMatchObject({ status: 403, message: expect.stringContaining('锁定') });
  });
});

// ── refreshAccessToken ────────────────────────────────────────
describe('refreshAccessToken', () => {
  it('有效refresh token应返回新access token', async () => {
    const { signRefreshToken } = require('../common/authMiddleware');
    const refreshToken = signRefreshToken({ id: 1 });

    db.query.mockResolvedValueOnce([[{ id: 1, username: '测试', status: 1, role: 'user' }], null]);

    const result = await authService.refreshAccessToken(refreshToken);
    expect(result.accessToken).toBeDefined();
  });

  it('无效token应抛出401', async () => {
    await expect(authService.refreshAccessToken('invalid.token.here'))
      .rejects.toMatchObject({ status: 401 });
  });
});
