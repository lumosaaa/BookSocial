/**
 * redis.js
 * BookSocial 模块0 · Redis 7.0 客户端封装
 * 封装 get/set/del/expire 等工具函数，所有模块共用同一连接实例
 *
 * Redis Key 命名约定（全局统一，禁止私自新增未经约定的前缀）：
 *   rec:books:{userId}    书籍推荐缓存，TTL 24h
 *   rec:friends:{userId}  书友推荐缓存，TTL 6h
 *   hot:books             热门榜，TTL 1h
 *   session:{userId}      在线状态，TTL 5min（Socket 心跳刷新）
 *   code:{email}          邮箱验证码，TTL 10min
 *   rate:{ip}             限流计数器
 */

const { createClient } = require('redis');

const client = createClient({
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('[Redis] 重连次数超限，停止重连');
        return new Error('Redis 重连次数超限');
      }
      return Math.min(retries * 100, 3000);
    },
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB || '0', 10),
});

client.on('connect',    () => console.log('[Redis] 已连接'));
client.on('ready',      () => console.log('[Redis] 就绪'));
client.on('error',  (err) => console.error('[Redis] 错误:', err.message));
client.on('reconnecting', () => console.warn('[Redis] 重连中...'));

// 立即连接
client.connect().catch(err => {
  console.error('[Redis] 初始连接失败:', err.message);
  // 开发环境允许无 Redis 启动（降级为无缓存模式）
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// ─── 工具函数封装 ────────────────────────────────────────────────────────────

/**
 * 获取缓存值（自动 JSON 解析）
 * @param {string} key
 * @returns {*|null} 解析后的值，键不存在返回 null
 */
async function get(key) {
  const raw = await client.get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // 非 JSON 字符串原样返回
  }
}

/**
 * 设置缓存值（自动 JSON 序列化）
 * @param {string} key
 * @param {*} value
 * @param {number} [ttlSeconds] - 不传则永不过期
 */
async function set(key, value, ttlSeconds) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (ttlSeconds) {
    await client.setEx(key, ttlSeconds, serialized);
  } else {
    await client.set(key, serialized);
  }
}

/**
 * 删除一个或多个键
 * @param {...string} keys
 */
async function del(...keys) {
  if (keys.length === 0) return;
  await client.del(keys);
}

/**
 * 为已有键设置过期时间
 * @param {string} key
 * @param {number} ttlSeconds
 */
async function expire(key, ttlSeconds) {
  await client.expire(key, ttlSeconds);
}

/**
 * 检查键是否存在
 * @param {string} key
 * @returns {boolean}
 */
async function exists(key) {
  const count = await client.exists(key);
  return count > 0;
}

/**
 * 原子递增（用于计数器/限流）
 * @param {string} key
 * @param {number} [ttlSeconds] - 若键不存在则同时设置 TTL
 * @returns {number} 递增后的值
 */
async function incr(key, ttlSeconds) {
  const val = await client.incr(key);
  if (val === 1 && ttlSeconds) {
    await client.expire(key, ttlSeconds);
  }
  return val;
}

/**
 * 批量删除匹配 pattern 的键（谨慎在生产使用 SCAN）
 * @param {string} pattern - 如 'rec:books:*'
 */
async function delPattern(pattern) {
  const keys = [];
  for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
    keys.push(key);
  }
  if (keys.length > 0) {
    await client.del(keys);
  }
  return keys.length;
}

module.exports = {
  client,   // 原始客户端，供需要高级操作的模块使用
  get,
  set,
  del,
  expire,
  exists,
  incr,
  delPattern,
  // TTL 常量，统一管理避免魔法数字
  TTL: {
    CODE:          10 * 60,       // 验证码 10 分钟
    SESSION:        5 * 60,       // 在线状态 5 分钟
    REC_BOOKS:     24 * 60 * 60,  // 书籍推荐 24 小时
    REC_FRIENDS:    6 * 60 * 60,  // 书友推荐 6 小时
    HOT_BOOKS:          60 * 60,  // 热门榜 1 小时
    RATE_LIMIT:          60,      // 限流窗口 1 分钟
  },
};
