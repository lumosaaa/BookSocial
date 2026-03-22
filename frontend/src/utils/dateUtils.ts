/**
 * frontend/src/utils/dateUtils.ts
 * M4 新增 — 日期格式化工具
 */

/**
 * 相对时间展示（中文）
 * 规则：
 *   < 1分钟   → "刚刚"
 *   < 1小时   → "N分钟前"
 *   今天      → "HH:mm"
 *   昨天      → "昨天"
 *   今年      → "M月D日"
 *   更早      → "YYYY/M/D"
 */
export function formatDistanceToNow(dateStr: string): string {
  const date = new Date(dateStr);
  const now  = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr  = Math.floor(diffMs / 3_600_000);

  if (diffMin < 1)  return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHr  < 24  && isSameDay(date, now)) return hhmm(date);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return '昨天';

  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 聊天气泡时间戳（短格式）
 * 规则：今天 → "HH:mm"，否则 → "M/D HH:mm"
 */
export function formatChatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now  = new Date();
  if (isSameDay(date, now)) return hhmm(date);
  return `${date.getMonth() + 1}/${date.getDate()} ${hhmm(date)}`;
}

/** 消息分组用日期标题（同一天只显示一次） */
export function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now  = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now))        return '今天';
  if (isSameDay(date, yesterday))  return '昨天';
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// ── 内部工具 ──────────────────────────────────────────────────────────────────
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth()      === b.getMonth()
    && a.getDate()       === b.getDate();
}

function hhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
