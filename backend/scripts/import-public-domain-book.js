#!/usr/bin/env node
/**
 * import-public-domain-book.js
 * 从合法公版来源导入 1 本完整书籍正文到 BookSocial 数据库
 *
 * 用法：
 *   node scripts/import-public-domain-book.js
 *   node scripts/import-public-domain-book.js --slug pride-and-prejudice
 *   node scripts/import-public-domain-book.js --book-id 123
 */

'use strict';

require('dotenv').config();

const axios = require('axios');
const db = require('../common/db');

const CHARS_PER_PAGE = 1800;
const DEFAULT_CATEGORY_ID = 1;

const SOURCES = {
  'pride-and-prejudice': {
    slug: 'pride-and-prejudice',
    gutenbergId: 1342,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    language: 'en',
    categoryId: DEFAULT_CATEGORY_ID,
    coverUrl: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
    description: 'A classic public-domain novel imported from Project Gutenberg for BookSocial online reading.',
    sourceUrl: 'https://www.gutenberg.org/ebooks/1342',
    licenseNote: 'Public domain in the USA. Verify local copyright before redistribution.',
    textUrls: [
      'https://www.gutenberg.org/files/1342/1342-0.txt',
      'https://www.gutenberg.org/files/1342/1342.txt',
      'https://www.gutenberg.org/cache/epub/1342/pg1342.txt',
    ],
    chapterPattern: /^(Chapter\s+\d+|CHAPTER\s+\d+|Chapter\s+[IVXLCDM]+|CHAPTER\s+[IVXLCDM]+)\b.*$/gim,
  },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const slugIndex = args.indexOf('--slug');
  const bookIdIndex = args.indexOf('--book-id');

  return {
    slug: slugIndex >= 0 ? args[slugIndex + 1] : 'pride-and-prejudice',
    bookId: bookIdIndex >= 0 ? Number(args[bookIdIndex + 1]) : null,
  };
}

async function fetchText(urls) {
  let lastError = null;

  for (const url of urls) {
    try {
      const { data } = await axios.get(url, {
        timeout: 15000,
        responseType: 'text',
        transformResponse: [res => res],
      });
      if (typeof data === 'string' && data.trim()) {
        return data;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('未能获取正文文本');
}

function stripGutenbergBoilerplate(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const startPattern = /\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i;
  const endPattern = /\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i;

  const startMatch = normalized.match(startPattern);
  const endMatch = normalized.match(endPattern);

  let body = normalized;
  if (startMatch?.index !== undefined) {
    body = body.slice(startMatch.index + startMatch[0].length);
  }
  if (endMatch?.index !== undefined) {
    const bodyEnd = body.match(endPattern);
    if (bodyEnd?.index !== undefined) {
      body = body.slice(0, bodyEnd.index);
    }
  }

  return body.trim();
}

function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\uFEFF/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanChapterTitle(raw) {
  // Remove trailing punctuation artifacts from Gutenberg illustrated-edition markup
  // e.g. "Chapter I.]" → "Chapter I.", "CHAPTER II. " → "CHAPTER II."
  return raw
    .replace(/[\]\[)}>]+\s*$/, '')   // strip trailing brackets/braces
    .replace(/\s+$/, '')              // trailing whitespace
    .replace(/\.{2,}$/, '.')          // collapse trailing dots
    || raw;                            // fallback: return original if empty
}

function splitChapters(text, pattern) {
  const matches = [...text.matchAll(pattern)];
  if (matches.length < 2) {
    throw new Error('未能识别出足够的章节标题');
  }

  return matches.map((match, index) => {
    const title = cleanChapterTitle(match[0].trim());
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    const content = text.slice(start + match[0].length, end).trim();
    const normalizedContent = content
      .split(/\n{2,}/)
      .map(paragraph => paragraph.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n\n');

    if (!normalizedContent) return null;

    return {
      title,
      content: normalizedContent,
      charCount: normalizedContent.length,
      wordCount: normalizedContent.split(/\s+/).filter(Boolean).length,
    };
  }).filter(Boolean);
}

function withPagination(chapters) {
  let pageStart = 1;

  return chapters.map((chapter, index) => {
    const pageCount = Math.max(1, Math.ceil(chapter.charCount / CHARS_PER_PAGE));
    const row = {
      chapterIndex: index + 1,
      title: chapter.title,
      content: chapter.content,
      charCount: chapter.charCount,
      wordCount: chapter.wordCount,
      pageStart,
      pageCount,
    };
    pageStart += pageCount;
    return row;
  });
}

async function upsertBook(conn, source, bookId, totalPages) {
  if (bookId) {
    await conn.query(
      `UPDATE books
       SET title = ?, author = ?, language = ?, category_id = ?, cover_url = COALESCE(?, cover_url),
           description = COALESCE(?, description), reader_available = 1, reader_source = 'gutenberg',
           reader_source_url = ?, reader_license_note = ?, reader_page_count = ?, is_active = 1, fetched_at = NOW()
       WHERE id = ?`,
      [
        source.title,
        source.author,
        source.language,
        source.categoryId,
        source.coverUrl,
        source.description,
        source.sourceUrl,
        source.licenseNote,
        totalPages,
        bookId,
      ]
    );
    return bookId;
  }

  const [existingRows] = await conn.query(
    `SELECT id FROM books WHERE title = ? AND author = ? LIMIT 1`,
    [source.title, source.author]
  );
  const existingBook = existingRows[0];

  if (existingBook) {
    await conn.query(
      `UPDATE books
       SET language = COALESCE(?, language), category_id = COALESCE(?, category_id), cover_url = COALESCE(?, cover_url),
           description = COALESCE(?, description), reader_available = 1, reader_source = 'gutenberg',
           reader_source_url = ?, reader_license_note = ?, reader_page_count = ?, is_active = 1, fetched_at = NOW()
       WHERE id = ?`,
      [
        source.language,
        source.categoryId,
        source.coverUrl,
        source.description,
        source.sourceUrl,
        source.licenseNote,
        totalPages,
        existingBook.id,
      ]
    );
    return existingBook.id;
  }

  const [result] = await conn.query(
    `INSERT INTO books
      (title, author, language, category_id, cover_url, description, reader_available,
       reader_source, reader_source_url, reader_license_note, reader_page_count, is_active, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 'gutenberg', ?, ?, ?, 1, NOW())`,
    [
      source.title,
      source.author,
      source.language,
      source.categoryId,
      source.coverUrl,
      source.description,
      source.sourceUrl,
      source.licenseNote,
      totalPages,
    ]
  );

  return result.insertId;
}

async function main() {
  const { slug, bookId } = parseArgs();
  const source = SOURCES[slug];

  if (!source) {
    throw new Error(`不支持的 slug：${slug}`);
  }

  console.log(`\n📖 导入公版全文：${source.title}`);
  console.log(`   来源：${source.sourceUrl}\n`);

  const rawText = await fetchText(source.textUrls);
  const cleanedText = normalizeText(stripGutenbergBoilerplate(rawText));
  const chapters = withPagination(splitChapters(cleanedText, source.chapterPattern));
  const totalPages = chapters.reduce((sum, chapter) => sum + chapter.pageCount, 0);

  const importedBookId = await db.transaction(async (conn) => {
    const resolvedBookId = await upsertBook(conn, source, bookId, totalPages);

    await conn.query('DELETE FROM reader_bookmarks WHERE book_id = ?', [resolvedBookId]);
    await conn.query('DELETE FROM book_chapters WHERE book_id = ?', [resolvedBookId]);

    for (const chapter of chapters) {
      await conn.query(
        `INSERT INTO book_chapters
          (book_id, chapter_index, title, content, char_count, word_count, page_start, page_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resolvedBookId,
          chapter.chapterIndex,
          chapter.title,
          chapter.content,
          chapter.charCount,
          chapter.wordCount,
          chapter.pageStart,
          chapter.pageCount,
        ]
      );
    }

    return resolvedBookId;
  });

  console.log('════════════════════════════════════');
  console.log(`  书籍ID: ${importedBookId}`);
  console.log(`  章节数: ${chapters.length}`);
  console.log(`  规范页数: ${totalPages}`);
  console.log('════════════════════════════════════\n');

  await db.end();
}

main().catch(async err => {
  console.error('导入失败:', err.message);
  try {
    await db.end();
  } catch {}
  process.exit(1);
});
