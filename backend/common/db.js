/**
 * db.js
 * BookSocial 模块0 · MySQL 8.0 连接池
 * 所有模块通过此实例执行 SQL，禁止各模块自行创建连接
 *
 * 使用示例：
 *   const db = require('../common/db');
 *   const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
 */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:              process.env.DB_HOST     || '127.0.0.1',
  port:              parseInt(process.env.DB_PORT || '3306', 10),
  user:              process.env.DB_USER     || 'root',
  password:          process.env.DB_PASSWORD || '',
  database:          process.env.DB_NAME     || 'booksocial',
  charset:           'utf8mb4',
  timezone:          '+00:00',          // 统一 UTC，应用层做时区转换
  waitForConnections: true,
  connectionLimit:   parseInt(process.env.DB_POOL_LIMIT || '10', 10),
  queueLimit:        0,
  enableKeepAlive:   true,
  keepAliveInitialDelay: 0,
});

// 启动时验证连接
pool.getConnection()
  .then(conn => {
    console.log(`[DB] MySQL 连接成功 (${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'booksocial'})`);
    conn.release();
  })
  .catch(err => {
    console.error('[DB] MySQL 连接失败:', err.message);
    process.exit(1);
  });

/**
 * 封装事务辅助函数
 * @param {Function} callback - async (conn) => { ... }，抛出异常则自动回滚
 * @returns {*} callback 的返回值
 *
 * 使用示例：
 *   const result = await db.transaction(async (conn) => {
 *     await conn.query('INSERT INTO ...', [...]);
 *     await conn.query('UPDATE ...', [...]);
 *     return { success: true };
 *   });
 */
pool.transaction = async function (callback) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = pool;
