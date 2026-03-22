/**
 * jobs/recommendJob.js — M6 · 推荐系统定时任务
 * 依赖：npm install node-cron
 *
 * 调用方式（在 app.js 或 socket.js 启动后引入）：
 *   require('./jobs/recommendJob');
 */

const cron             = require('node-cron');
const recommendService = require('../services/recommendService');

/**
 * 任务1：凌晨 02:00 全量计算活跃用户书籍推荐
 * 写入 recommendation_cache 表 + Redis rec:books:{userId}
 */
cron.schedule('0 2 * * *', async () => {
  console.log('[CRON] 开始全量书籍推荐计算 -', new Date().toISOString());
  try {
    await recommendService.batchComputeBookRecommendations();
    console.log('[CRON] 全量书籍推荐计算完成');
  } catch (err) {
    console.error('[CRON] 全量书籍推荐计算失败:', err);
  }
}, { timezone: 'Asia/Shanghai' });

/**
 * 任务2：每小时整点刷新热门书籍榜
 * 写入 Redis hot:books（TTL 1h）
 */
cron.schedule('0 * * * *', async () => {
  console.log('[CRON] 刷新热门书籍榜 -', new Date().toISOString());
  try {
    await recommendService.refreshHotBooks();
  } catch (err) {
    console.error('[CRON] 热门书籍榜刷新失败:', err);
  }
}, { timezone: 'Asia/Shanghai' });

/**
 * 任务3：每天凌晨 03:00 清理过期 recommendation_cache 记录
 */
cron.schedule('0 3 * * *', async () => {
  console.log('[CRON] 清理过期推荐缓存 -', new Date().toISOString());
  try {
    const db = require('../common/db');
    const [result] = await db.query(
      'DELETE FROM recommendation_cache WHERE expires_at < NOW()'
    );
    console.log(`[CRON] 已清理 ${result.affectedRows} 条过期推荐缓存`);
  } catch (err) {
    console.error('[CRON] 推荐缓存清理失败:', err);
  }
}, { timezone: 'Asia/Shanghai' });

console.log('✅ M6 定时任务已注册（推荐计算/热门榜/缓存清理）');
