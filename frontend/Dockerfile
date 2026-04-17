# ============ 构建阶段 ============
FROM node:20-alpine AS builder

WORKDIR /app

# 接收构建参数（注入到 Vite 环境变量）
ARG VITE_API_URL=/api/v1
ARG VITE_CLOUDINARY_CLOUD_NAME=

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME

# 先复制依赖文件，利用 Docker 缓存层
COPY package.json pnpm-lock.yaml* ./

# 安装 pnpm 并安装依赖
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && pnpm install --frozen-lockfile

# 复制源码并构建
COPY . .
RUN pnpm build

# ============ 运行阶段 ============
FROM nginx:1.27-alpine

# 复制构建产物到 Nginx 默认目录
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
