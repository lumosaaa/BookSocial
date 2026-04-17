# ============ 构建阶段 ============
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件，利用 Docker 缓存层
COPY package.json pnpm-lock.yaml* ./

# 安装 pnpm 并安装依赖
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && pnpm install --frozen-lockfile --prod

# ============ 运行阶段 ============
FROM node:20-alpine

WORKDIR /app

# 安全：创建非 root 用户
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 复制依赖和源码
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# 移除开发文件
RUN rm -f .env .env.local

# 切换到非 root 用户
USER appuser

EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "app.js"]
