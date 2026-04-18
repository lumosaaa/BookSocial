/**
 * app.js
 * BookSocial · Express 服务器入口
 *
 * 中间件加载顺序（严格遵守）：
 *   1. 安全（helmet / cors）
 *   2. 日志（morgan）
 *   3. Body 解析（json / urlencoded）
 *   4. 限流（rate-limit）
 *   5. 统一响应注入（responseHelper）
 *   6. Passport 初始化
 *   7. 路由挂载
 *   8. 404 / 全局错误处理
 */

'use strict';

require('dotenv').config();

const express           = require('express');
const helmet            = require('helmet');
const cors              = require('cors');
const morgan            = require('morgan');
const rateLimit         = require('express-rate-limit');
const { createServer }  = require('http');
const passport          = require('passport');

const { responseHelper, notFoundHandler, errorHandler } = require('./common/response');

const app    = express();
const server = createServer(app);

// ════════════════════════════════════════════════════════════════════════════
//  1. 安全中间件
// ════════════════════════════════════════════════════════════════════════════

app.use(helmet());
app.use(cors({
  origin:         process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ════════════════════════════════════════════════════════════════════════════
//  2. 日志
// ════════════════════════════════════════════════════════════════════════════

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ════════════════════════════════════════════════════════════════════════════
//  3. Body 解析
// ════════════════════════════════════════════════════════════════════════════

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ════════════════════════════════════════════════════════════════════════════
//  4. 全局限流：每 IP 每分钟最多 100 次请求
// ════════════════════════════════════════════════════════════════════════════

app.use('/api/', rateLimit({
  windowMs:        60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    code:      429,
    message:   '请求过于频繁，请稍后再试',
    data:      null,
    timestamp: Date.now(),
  },
}));

// ════════════════════════════════════════════════════════════════════════════
//  5. 统一响应快捷方法注入
//     注入后路由中可直接使用 res.ok() / res.created() / res.paginate() 等
// ════════════════════════════════════════════════════════════════════════════

app.use(responseHelper);

// ════════════════════════════════════════════════════════════════════════════
//  6. Passport 初始化（M1 Google OAuth 依赖）
// ════════════════════════════════════════════════════════════════════════════

app.use(passport.initialize());

// ════════════════════════════════════════════════════════════════════════════
//  7. 路由挂载
// ════════════════════════════════════════════════════════════════════════════

// ── 健康检查（Railway 部署探针，无需鉴权） ───────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), env: process.env.NODE_ENV });
});

// ── M1 · 用户认证 & 个人档案 ────────────────────────────────────────────────
const authRoutes   = require('./routes/auth');
const uploadRoutes = require('./routes/upload');

app.use('/auth',          authRoutes);    // Google OAuth 回调（无 /api/v1 前缀）
app.use('/api/v1/auth',   authRoutes);    // 注册 / 登录 / 验证码 / 刷新 / 注销
app.use('/api/v1/upload', uploadRoutes);  // Cloudinary 签名（M3/M5 复用）

// ── M2 · 书籍 & 书架 ────────────────────────────────────────────────────────
const bookRoutes  = require('./routes/books');

app.use('/api/v1/books', bookRoutes);

// ── M3 · 社交动态 & 互动 ─────────────────────────────────────────────────────
const postRoutes     = require('./routes/posts');
const commentRoutes  = require('./routes/comments');
const bookmarkRoutes = require('./routes/bookmarks');
const noteRoutes     = require('./routes/notes');
const reportRoutes   = require('./routes/reports');

// 动态：信息流 / 发帖 / 详情 / 删除 / 点赞 / 转发 / 评论
app.use('/api/v1/posts',          postRoutes);

// 评论：展开子评论 / 点赞评论 / 删除评论
app.use('/api/v1/comments',       commentRoutes);

// 收藏：收藏 / 取消收藏 / 我的收藏列表
app.use('/api/v1/bookmarks',      bookmarkRoutes);

// 阅读笔记：CRUD / 点赞
app.use('/api/v1/reading-notes',  noteRoutes);

// 举报
app.use('/api/v1/reports',        reportRoutes);

// ── /api/v1/users 路由（M1 / M2 / M3 共用此前缀，按注册顺序匹配）────────────
//
//  挂载顺序说明（不可调换）：
//    1. M3 followRoutes  ── 新增：/:id/follow, /:id/followers, /:id/following,
//                                /:id/posts, /:id/notes
//    2. M1 userRoutes    ── 原有：/me, /search, /:id（公开主页），/:id 等
//    3. M2 shelfRoutes   ── 原有：/me/shelf/*
//
//  三者路径无冲突，Express 会对每个请求依次尝试所有同前缀路由，
//  因此顺序不影响正确性，但按"最具体 → 最宽泛"排列是最佳实践。

const followRoutes = require('./routes/follows');
const userRoutes   = require('./routes/users');

app.use('/api/v1/users', followRoutes);  // M3：关注 / 用户动态 / 用户笔记
app.use('/api/v1/users', userRoutes);    // M1：个人信息 / 隐私 / 搜索 + M2 书架

// ── M4 · 私信 & 通知 ────────────────────────────────────────────────────────
const messageRoutes = require('./routes/messages');
const { router: notificationRoutes, internalRouter: notifyInternalRouter } = require('./routes/notifications');
app.use('/api/v1/conversations', messageRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/internal',             notifyInternalRouter);   // POST /internal/notify

// ── M5 · 小组 & 书籍讨论 ────────────────────────────────────────────────────
const groupRoutes = require('./routes/groups');
const groupChatRoutes = require('./routes/groupChat');
const { bookDiscRouter, discRouter } = require('./routes/discussions');
app.use('/api/v1/groups',       groupRoutes);
app.use('/api/v1/groups',       groupChatRoutes);
app.use('/api/v1/books',        bookDiscRouter);   // /:bookId/discussions
app.use('/api/v1/discussions',   discRouter);       // /:id, /:id/comments, /:id/likes

// ── M6 · 推荐系统 & 运营 ────────────────────────────────────────────────────
const recRoutes = require('./routes/recommendations');
const { internalAuditRouter, reportsRouter: auditReportsRouter, keywordsRouter } = require('./routes/audit');
const interestProfileRoutes = require('./routes/interestProfile');
app.use('/api/v1/recommendations', recRoutes);
app.use('/internal',               internalAuditRouter);    // POST /internal/audit/text
app.use('/api/v1/reports',         auditReportsRouter);     // M6 举报管理（GET/PUT，与 M3 POST 共存）
app.use('/api/v1/admin/keywords',  keywordsRouter);
app.use('/api/v1/users',          interestProfileRoutes);   // /:id/interest-profile

// ════════════════════════════════════════════════════════════════════════════
//  8. 错误处理（必须放在所有路由之后）
// ════════════════════════════════════════════════════════════════════════════

app.use(notFoundHandler);
app.use(errorHandler);

// ════════════════════════════════════════════════════════════════════════════
//  Socket.io（M4 实时通信）
// ════════════════════════════════════════════════════════════════════════════
const { initSocket } = require('./socket');
initSocket(server, app);

// ════════════════════════════════════════════════════════════════════════════
//  M6 · 推荐系统定时任务
// ════════════════════════════════════════════════════════════════════════════
require('./jobs/recommendJob');

// ════════════════════════════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] BookSocial API 已启动 → http://localhost:${PORT}`);
  console.log(`[Server] 环境: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server };
