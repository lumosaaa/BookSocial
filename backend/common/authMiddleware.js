/**
 * authMiddleware.js
 * BookSocial 模块0 · JWT 鉴权中间件
 * 所有其他模块直接 require 此文件，无需各自实现
 */

const jwt = require('jsonwebtoken');
const { error } = require('./response');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'booksocial_dev_secret_change_in_prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * 签发 Access Token
 * @param {object} payload - { id, username, status }
 * @returns {string} JWT token
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 签发 Refresh Token（更长有效期）
 * @param {object} payload - { id }
 * @returns {string} JWT refresh token
 */
function signRefreshToken(payload) {
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * 验证 JWT，强制要求登录
 * 用法：router.get('/protected', authMiddleware, handler)
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(error('未提供认证令牌', 401));
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 拒绝 refresh token 被当作 access token 使用
    if (decoded.type === 'refresh') {
      return res.status(401).json(error('令牌类型错误', 401));
    }

    // 账号封禁检查
    if (decoded.status === 2) {
      return res.status(403).json(error('账号已被封禁，请联系客服', 403));
    }

    req.user = decoded; // { id, username, status, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(error('令牌已过期，请重新登录', 401));
    }
    return res.status(401).json(error('无效的认证令牌', 401));
  }
}

/**
 * 可选鉴权：有 token 则解析用户，无 token 则继续（req.user 为 null）
 * 用于信息流等既支持未登录浏览、又需区分登录态的接口
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.type === 'refresh' ? null : decoded;
  } catch {
    req.user = null;
  }
  next();
}

/**
 * 管理员权限中间件（需配合 authMiddleware 使用）
 * 用法：router.delete('/admin/...', authMiddleware, requireAdmin, handler)
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json(error('需要管理员权限', 403));
  }
  next();
}

/**
 * 小组角色权限中间件（需配合 authMiddleware 使用）
 * @param {number} minRole - 最低角色等级：0=成员, 1=管理员, 2=组长
 */
function requireGroupRole(minRole) {
  return async (req, res, next) => {
    const groupId = Number(req.params.id);
    const userId = req.user.id;
    try {
      const [rows] = await db.query(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
        [groupId, userId]
      );
      if (!rows.length || rows[0].role < minRole) {
        return res.status(403).json(error('权限不足', 403));
      }
      next();
    } catch (err) {
      return res.status(500).json(error('权限校验失败', 500));
    }
  };
}

module.exports = {
  authMiddleware,
  optionalAuth,
  requireAdmin,
  requireGroupRole,
  signToken,
  signRefreshToken,
};
