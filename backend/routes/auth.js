const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const router = express.Router();

const { authMiddleware } = require('../common/authMiddleware');
const {
  sendCode,
  verifyCode,
  register,
  loginWithPassword,
  loginWithCode,
  findOrCreateGoogleUser,
  refreshAccessToken,
} = require('../services/authService');

// ─────────────────────────────────────────────────────────────
//  Passport Google Strategy 初始化
//  （app.js 中需 app.use(passport.initialize())）
// ─────────────────────────────────────────────────────────────

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3001/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const result = await findOrCreateGoogleUser({
          googleId:    profile.id,
          email:       profile.emails?.[0]?.value || null,
          displayName: profile.displayName || `书友_${profile.id.slice(-6)}`,
          avatarUrl:   profile.photos?.[0]?.value || null,
        });
        done(null, result);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

// ─────────────────────────────────────────────────────────────
//  POST /api/v1/auth/send-code  发送邮箱验证码
// ─────────────────────────────────────────────────────────────

router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.fail('请提供邮箱地址', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.fail('邮箱格式不正确', 400);
    }
    await sendCode(email);
    res.ok({ message: '验证码已发送，请查收邮件（开发环境请查看服务端控制台）' });
  } catch (err) {
    res.fail(err.message || '发送失败', err.status || 500);
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/v1/auth/verify-code  校验验证码（独立校验接口）
// ─────────────────────────────────────────────────────────────

router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.fail('缺少邮箱或验证码', 400);
    await verifyCode(email, code);
    res.ok({ valid: true });
  } catch (err) {
    res.fail(err.message || '验证码校验失败', err.status || 400);
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/v1/auth/register  邮箱注册
// ─────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { email, code, username, password } = req.body;

    if (!email || !code || !username || !password) {
      return res.fail('邮箱、验证码、昵称、密码均为必填项', 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.fail('邮箱格式不正确', 400);
    }
    if (password.length < 8 || password.length > 20) {
      return res.fail('密码长度须为 8–20 位', 400);
    }
    if (username.trim().length < 2 || username.trim().length > 50) {
      return res.fail('昵称须为 2–50 个字符', 400);
    }

    const result = await register({
      email: email.toLowerCase().trim(),
      code: code.trim(),
      username: username.trim(),
      password,
    });
    res.created(result);
  } catch (err) {
    res.fail(err.message || '注册失败', err.status || 500);
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/v1/auth/login  邮箱登录（密码 or 验证码）
// ─────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { email, password, code } = req.body;
    if (!email) return res.fail('请输入邮箱', 400);

    let result;
    if (code) {
      result = await loginWithCode({ email: email.toLowerCase().trim(), code: code.trim() });
    } else if (password) {
      result = await loginWithPassword({ email: email.toLowerCase().trim(), password });
    } else {
      return res.fail('请提供密码或验证码', 400);
    }

    res.ok(result);
  } catch (err) {
    res.fail(err.message || '登录失败', err.status || 401);
  }
});

// ─────────────────────────────────────────────────────────────
//  Google OAuth
//  GET  /auth/google          → 发起授权跳转
//  GET  /auth/google/callback → OAuth 回调
// ─────────────────────────────────────────────────────────────

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=google_failed`,
  }),
  (req, res) => {
    const { accessToken, refreshToken, isNewUser } = req.user;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const params = new URLSearchParams({
      accessToken,
      refreshToken,
      isNewUser: String(isNewUser),
    });
    res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  }
);

// ─────────────────────────────────────────────────────────────
//  POST /api/v1/auth/refresh  刷新 Access Token
// ─────────────────────────────────────────────────────────────

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.fail('缺少 refreshToken', 400);
    const result = await refreshAccessToken(refreshToken);
    res.ok(result);
  } catch (err) {
    res.fail(err.message || 'Token 刷新失败', err.status || 401);
  }
});

// ─────────────────────────────────────────────────────────────
//  POST /api/v1/auth/logout  注销
// ─────────────────────────────────────────────────────────────

router.post('/logout', authMiddleware, async (req, res) => {
  // 无状态 JWT：客户端删除 Token 即可
  // 如需服务端黑名单：将 req.user.jti 写入 Redis 并设置同 Token 剩余有效期的 TTL
  res.ok({ message: '已退出登录' });
});

module.exports = router;
