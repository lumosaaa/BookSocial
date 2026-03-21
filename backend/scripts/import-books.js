#!/usr/bin/env node
/**
 * import-books.js
 * 从 Open Library 批量导入书籍元数据到 BookSocial 数据库
 *
 * 用法：
 *   node scripts/import-books.js              # 默认导入 ~150 本
 *   node scripts/import-books.js --count 200  # 指定数量
 *   node scripts/import-books.js --reset      # 重置进度，从头开始
 */

'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const db   = require('../common/db');
const { SocksProxyAgent } = require('socks-proxy-agent');

// ── 配置 ─────────────────────────────────────────────────────
const PROXY_URL   = (process.env.SMTP_PROXY || 'socks5://127.0.0.1:7897').replace('socks5://', 'socks5h://');
const proxyAgent  = new SocksProxyAgent(PROXY_URL);
const CONFIG_PATH = path.join(__dirname, 'import-config.json');
const DELAY_MS    = 300;   // 请求间隔，避免被限流
const COVER_BASE  = 'https://covers.openlibrary.org/b/id';

// Open Library subject → BookSocial category_id 映射
// category_id 对应 book_categories 表的 id（按 schema.sql 插入顺序）
const SUBJECTS = [
  // 文学 (id=1)
  { subject: 'classic_literature',   categoryId: 1,  label: '经典文学' },
  { subject: 'chinese_literature',   categoryId: 1,  label: '中国文学' },
  { subject: 'fiction',              categoryId: 1,  label: '小说' },
  { subject: 'science_fiction',      categoryId: 1,  label: '科幻' },
  { subject: 'poetry',              categoryId: 1,  label: '诗歌' },
  // 科技与互联网 (id=2)
  { subject: 'computer_science',    categoryId: 2,  label: '计算机科学' },
  { subject: 'programming',         categoryId: 2,  label: '编程' },
  { subject: 'software_engineering', categoryId: 2, label: '软件工程' },
  // 历史 (id=3)
  { subject: 'history',             categoryId: 3,  label: '历史' },
  { subject: 'world_history',       categoryId: 3,  label: '世界史' },
  // 社会科学 (id=4)
  { subject: 'sociology',           categoryId: 4,  label: '社会学' },
  { subject: 'political_science',   categoryId: 4,  label: '政治学' },
  // 艺术与设计 (id=5)
  { subject: 'art',                 categoryId: 5,  label: '艺术' },
  // 哲学与宗教 (id=6)
  { subject: 'philosophy',          categoryId: 6,  label: '哲学' },
  // 经济与管理 (id=7)
  { subject: 'economics',           categoryId: 7,  label: '经济学' },
  { subject: 'business',            categoryId: 7,  label: '商业' },
  // 心理学 (id=8)
  { subject: 'psychology',          categoryId: 8,  label: '心理学' },
];

// ── 工具函数 ─────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** 带代理的 HTTP GET → JSON */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent: proxyAgent }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let body = '';
      res.setEncoding('utf-8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('JSON parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('Timeout')); });
  });
}

/** 读取/初始化进度文件 */
function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  }
  const config = {};
  for (const s of SUBJECTS) {
    config[s.subject] = { offset: 0 };
  }
  return config;
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/** 从 Works API 获取书籍详情（描述、ISBN） */
async function fetchWorkDetail(workKey) {
  try {
    const data = await fetchJSON(`https://openlibrary.org${workKey}.json`);
    let description = '';
    if (typeof data.description === 'string') {
      description = data.description;
    } else if (data.description?.value) {
      description = data.description.value;
    }
    // 截断过长描述
    if (description.length > 5000) {
      description = description.slice(0, 5000) + '...';
    }
    return { description };
  } catch {
    return { description: '' };
  }
}

/** 从 Edition API 获取 ISBN */
async function fetchEditionISBN(editionKey) {
  if (!editionKey) return { isbn10: null, isbn13: null, pageCount: null, publishDate: null, publisher: null };
  try {
    const data = await fetchJSON(`https://openlibrary.org/books/${editionKey}.json`);
    return {
      isbn10:      data.isbn_10?.[0] || null,
      isbn13:      data.isbn_13?.[0] || null,
      pageCount:   data.number_of_pages || null,
      publishDate: data.publish_date || null,
      publisher:   data.publishers?.[0] || null,
    };
  } catch {
    return { isbn10: null, isbn13: null, pageCount: null, publishDate: null, publisher: null };
  }
}

// ── 主逻辑 ───────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const targetCount = parseInt(args.find((_, i, a) => a[i - 1] === '--count') || '150', 10);
  const resetMode   = args.includes('--reset');

  console.log(`\n📚 BookSocial 书籍导入工具`);
  console.log(`   目标数量: ${targetCount} 本`);
  console.log(`   代理: ${PROXY_URL}\n`);

  let config = resetMode ? {} : loadConfig();
  if (resetMode) {
    for (const s of SUBJECTS) config[s.subject] = { offset: 0 };
    console.log('⟳  已重置导入进度\n');
  }

  // 每个 subject 平均分配配额
  const perSubject = Math.ceil(targetCount / SUBJECTS.length);

  let totalImported = 0;
  let totalSkipped  = 0;
  let totalFailed   = 0;

  for (const { subject, categoryId, label } of SUBJECTS) {
    if (totalImported >= targetCount) break;

    const offset = config[subject]?.offset || 0;
    const limit  = Math.min(perSubject, targetCount - totalImported + 10); // 多拉一些，有些会跳过

    console.log(`── ${label} (${subject}) offset=${offset} limit=${limit} ──`);

    let works;
    try {
      const data = await fetchJSON(
        `https://openlibrary.org/subjects/${subject}.json?limit=${limit}&offset=${offset}`
      );
      works = data.works || [];
    } catch (err) {
      console.log(`   ✗ 拉取失败: ${err.message}`);
      continue;
    }

    if (works.length === 0) {
      console.log(`   (已无更多书籍，重置 offset)`);
      config[subject] = { offset: 0 };
      continue;
    }

    let subImported = 0;

    for (const work of works) {
      if (totalImported >= targetCount) break;

      const olKey = work.key; // e.g. "/works/OL138052W"

      // 查重
      const [existing] = await db.query('SELECT id FROM books WHERE ol_key = ? LIMIT 1', [olKey]);
      if (existing.length > 0) {
        totalSkipped++;
        continue;
      }

      // 获取详情
      const [detail, edition] = await Promise.all([
        fetchWorkDetail(olKey),
        fetchEditionISBN(work.cover_edition_key),
      ]);
      await sleep(DELAY_MS);

      const title    = work.title || 'Untitled';
      const author   = work.authors?.map(a => a.name).join(', ') || '未知作者';
      const coverId  = work.cover_id;
      const coverUrl = coverId ? `${COVER_BASE}/${coverId}-L.jpg` : null;

      try {
        await db.query(
          `INSERT INTO books
            (ol_key, isbn10, isbn13, title, author, cover_url, description,
             category_id, fetched_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            olKey,
            edition.isbn10,
            edition.isbn13,
            title,
            author,
            coverUrl,
            detail.description || null,
            categoryId,
          ]
        );
        totalImported++;
        subImported++;
        process.stdout.write(`   ✓ ${title.slice(0, 50)}\n`);
      } catch (err) {
        // 可能是重复 key 或其他 DB 错误
        totalFailed++;
        if (!err.message.includes('Duplicate')) {
          console.log(`   ✗ ${title.slice(0, 40)}: ${err.message.slice(0, 60)}`);
        }
      }
    }

    // 更新 offset
    config[subject] = { offset: offset + works.length };
    saveConfig(config);

    console.log(`   小计: +${subImported} 本\n`);
  }

  console.log(`\n════════════════════════════════════`);
  console.log(`  导入完成`);
  console.log(`  ✓ 新增: ${totalImported} 本`);
  console.log(`  ⊘ 跳过(已存在): ${totalSkipped} 本`);
  console.log(`  ✗ 失败: ${totalFailed} 本`);
  console.log(`════════════════════════════════════\n`);

  process.exit(0);
}

main().catch(err => {
  console.error('致命错误:', err);
  process.exit(1);
});
