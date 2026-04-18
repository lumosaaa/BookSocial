const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../common/db');
const redis = require('../common/redis');
const { signToken, signRefreshToken, JWT_SECRET } = require('../common/authMiddleware');
const { sendVerificationCode } = require('./emailService');

// ─────────────────────────────────────────────────────────────
//  工具函数
// ─────────────────────────────────────────────────────────────

/** 生成6位数字验证码 */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** 新用户注册后，写入默认隐私设置行 */
async function createDefaultPrivacy(userId) {
  await db.query(
    `INSERT INTO user_privacy_settings
       (user_id, profile_visible, shelf_visible, notes_visible,
        searchable, message_permission, allow_recommendation,
        show_in_discovery, allow_behavior_analysis)
     VALUES (?, 0, 0, 0, 1, 0, 1, 1, 1)`,
    [userId]
  );
}

// ─────────────────────────────────────────────────────────────
//  验证码
// ─────────────────────────────────────────────────────────────

/**
 * 发送邮箱验证码
 * Redis Key: code:{email}  TTL: 10min (600s)
 */
async function sendCode(email) {
  const code = generateCode();
  // redis.TTL.CODE 应为 600，在 common/redis.js 中定义
  await redis.set(`code:${email}`, code, 600);
  await sendVerificationCode(email, code);
  return code;
}

/**
 * 校验验证码（匹配后立即删除，一次性）
 */
async function verifyCode(email, inputCode) {
  const stored = await redis.get(`code:${email}`);
  if (!stored) throw { status: 400, message: '验证码已过期，请重新获取' };
  if (stored.toString() !== inputCode.toString()) {
    throw { status: 400, message: '验证码错误' };
  }
  await redis.del(`code:${email}`);
  return true;
}

// ─────────────────────────────────────────────────────────────
//  邮箱注册
// ─────────────────────────────────────────────────────────────

/**
 * 邮箱 + 验证码 + 密码 注册
 */
async function register({ email, code, username, password }) {
  // 1. 校验验证码
  await verifyCode(email, code);

  // 2. 检查邮箱/昵称唯一性
  const [existing] = await db.query(
    'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
    [email, username]
  );
  if (existing.length > 0) {
    throw { status: 409, message: '邮箱或昵称已被注册' };
  }

  // 3. 密码哈希 (bcrypt salt=12)
  const passwordHash = await bcrypt.hash(password, 12);

  // 4. 写入 users 表
  const [result] = await db.query(
    `INSERT INTO users
       (email, username, password_hash, status, created_at, updated_at)
     VALUES (?, ?, ?, 1, NOW(), NOW())`,
    [email, username, passwordHash]
  );
  const userId = result.insertId;

  // 5. 创建默认隐私设置
  await createDefaultPrivacy(userId);

  // 6. 签发 Token
  const payload = { id: userId, username, status: 1, role: 'user' };
  const accessToken = signToken(payload);
  const refreshToken = signRefreshToken({ id: userId });

  return {
    user: { id: userId, username, email },
    accessToken,
    refreshToken,
  };
}

// ─────────────────────────────────────────────────────────────
//  邮箱密码登录
// ─────────────────────────────────────────────────────────────

async function loginWithPassword({ email, password }) {
  const [rows] = await db.query(
    `SELECT id, username, email, password_hash, status, role,
            login_fail_count, locked_until, avatar_url
     FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  const user = rows[0];
  if (!user) throw { status: 401, message: '邮箱或密码错误' };

  // 检查封禁
  if (user.status === 2) throw { status: 403, message: '账号已被封禁，请联系客服' };

  // 检查锁定
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const remainingMin = Math.ceil(
      (new Date(user.locked_until) - new Date()) / 60000
    );
    throw {
      status: 403,
      message: `账号已锁定，请 ${remainingMin} 分钟后再试`,
    };
  }

  // 校验密码
  const valid = await bcrypt.compare(password, user.password_hash || '');
  if (!valid) {
    const failCount = (user.login_fail_count || 0) + 1;
    if (failCount >= 5) {
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      await db.query(
        'UPDATE users SET login_fail_count = ?, locked_until = ? WHERE id = ?',
        [failCount, lockedUntil, user.id]
      );
      throw { status: 403, message: '密码错误次数过多，账号已锁定 30 分钟' };
    }
    await db.query(
      'UPDATE users SET login_fail_count = ? WHERE id = ?',
      [failCount, user.id]
    );
    throw {
      status: 401,
      message: `邮箱或密码错误（还剩 ${5 - failCount} 次机会）`,
    };
  }

  // 登录成功 → 重置失败计数，更新最后登录时间
  await db.query(
    'UPDATE users SET login_fail_count = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?',
    [user.id]
  );

  const payload = { id: user.id, username: user.username, status: user.status, role: user.role || 'user' };
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatar_url,
    },
    accessToken: signToken(payload),
    refreshToken: signRefreshToken({ id: user.id }),
  };
}

// ─────────────────────────────────────────────────────────────
//  邮箱验证码登录
// ─────────────────────────────────────────────────────────────

async function loginWithCode({ email, code }) {
  await verifyCode(email, code);

  const [rows] = await db.query(
    'SELECT id, username, email, status, role, avatar_url FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  const user = rows[0];
  if (!user) throw { status: 404, message: '该邮箱尚未注册，请先注册' };
  if (user.status === 2) throw { status: 403, message: '账号已被封禁' };

  await db.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = ?',
    [user.id]
  );

  const payload = { id: user.id, username: user.username, status: user.status, role: user.role || 'user' };
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatar_url,
    },
    accessToken: signToken(payload),
    refreshToken: signRefreshToken({ id: user.id }),
  };
}

// ─────────────────────────────────────────────────────────────
//  Google OAuth：查找或创建用户
// ─────────────────────────────────────────────────────────────

/**
 * Google OAuth 回调处理
 */
async function findOrCreateGoogleUser({ googleId, email, displayName, avatarUrl }) {
  // 1. 先按 googleId 查找
  let [rows] = await db.query(
    'SELECT id, username, email, status, role FROM users WHERE google_id = ? LIMIT 1',
    [googleId]
  );

  // 2. 按邮箱查找（已有邮箱账号，关联 Google）
  if (!rows.length && email) {
    [rows] = await db.query(
      'SELECT id, username, email, status, role FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (rows.length) {
      // 关联 Google ID
      await db.query(
        'UPDATE users SET google_id = ? WHERE id = ?',
        [googleId, rows[0].id]
      );
    }
  }

  // 3. 已有用户 → 直接登录
  if (rows.length) {
    const user = rows[0];
    if (user.status === 2) throw { status: 403, message: '账号已被封禁' };
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );
    const payload = { id: user.id, username: user.username, status: user.status, role: user.role || 'user' };
    return {
      user: { id: user.id, username: user.username, email: user.email },
      accessToken: signToken(payload),
      refreshToken: signRefreshToken({ id: user.id }),
      isNewUser: false,
    };
  }

  // 4. 新用户 → 自动注册
  let finalUsername = displayName || `书友_${Date.now().toString(36)}`;
  // 处理昵称冲突
  const [dup] = await db.query(
    'SELECT id FROM users WHERE username = ? LIMIT 1',
    [finalUsername]
  );
  if (dup.length) {
    finalUsername = `${finalUsername}_${Date.now().toString(36)}`;
  }

  const [result] = await db.query(
    `INSERT INTO users
       (username, email, google_id, avatar_url, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
    [finalUsername, email || null, googleId, avatarUrl || null]
  );
  const userId = result.insertId;
  await createDefaultPrivacy(userId);

  const payload = { id: userId, username: finalUsername, status: 1, role: 'user' };
  return {
    user: { id: userId, username: finalUsername, email: email || null },
    accessToken: signToken(payload),
    refreshToken: signRefreshToken({ id: userId }),
    isNewUser: true,
  };
}

// ─────────────────────────────────────────────────────────────
//  Token 刷新
// ─────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, JWT_SECRET);
  } catch {
    throw { status: 401, message: 'Refresh Token 无效或已过期，请重新登录' };
  }

  const [rows] = await db.query(
    'SELECT id, username, status, role FROM users WHERE id = ? LIMIT 1',
    [payload.id]
  );
  if (!rows.length) throw { status: 404, message: '用户不存在' };
  const user = rows[0];
  if (user.status === 2) throw { status: 403, message: '账号已被封禁' };

  const newAccessToken = signToken({
    id: user.id,
    username: user.username,
    status: user.status,
    role: user.role || 'user',
  });
  return { accessToken: newAccessToken };
}

module.exports = {
  sendCode,
  verifyCode,
  register,
  loginWithPassword,
  loginWithCode,
  findOrCreateGoogleUser,
  refreshAccessToken,
};
