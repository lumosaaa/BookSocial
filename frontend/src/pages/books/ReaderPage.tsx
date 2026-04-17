import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftOutlined,
  BookOutlined,
  FontSizeOutlined,
  LeftOutlined,
  MenuOutlined,
  MoonOutlined,
  PlusOutlined,
  PushpinOutlined,
  RightOutlined,
  SkinOutlined,
} from '@ant-design/icons';
import {
  Button,
  Drawer,
  Empty,
  Input,
  List,
  Modal,
  Spin,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  addReaderBookmark,
  getReaderChapter,
  getReaderManifest,
  removeReaderBookmark,
  saveReaderProgress,
  type ReaderBookmark,
  type ReaderChapter,
  type ReaderManifest,
} from '../../api/bookApi';
import { useAuthStore } from '../../store/authStore';

const SETTINGS_STORAGE_KEY = 'bs-reader-settings';

type ReaderTheme = 'light' | 'sepia' | 'dark';

interface ReaderSettings {
  theme: ReaderTheme;
  fontSize: number;
}

const THEME_PRESETS: Record<ReaderTheme, { shell: string; card: string; text: string; muted: string; border: string }> = {
  light: {
    shell: '#f5f5f1',
    card: '#fffdf8',
    text: '#2c3e2d',
    muted: '#6b7280',
    border: '#e5e7eb',
  },
  sepia: {
    shell: '#efe6d4',
    card: '#f7f0e3',
    text: '#4b3a26',
    muted: '#7c6a55',
    border: '#dbc9aa',
  },
  dark: {
    shell: '#1f2937',
    card: '#111827',
    text: '#f3f4f6',
    muted: '#9ca3af',
    border: '#374151',
  },
};

function loadSettings(): ReaderSettings {
  if (typeof window === 'undefined') {
    return { theme: 'light', fontSize: 18 };
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { theme: 'light', fontSize: 18 };
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
    return {
      theme: parsed.theme === 'sepia' || parsed.theme === 'dark' ? parsed.theme : 'light',
      fontSize: clampFontSize(parsed.fontSize),
    };
  } catch {
    return { theme: 'light', fontSize: 18 };
  }
}

function clampFontSize(fontSize?: number): number {
  const size = Number(fontSize) || 18;
  return Math.min(28, Math.max(14, size));
}

function estimateCharsPerPage(fontSize: number, viewportWidth: number): number {
  const widthFactor = viewportWidth < 640 ? 0.56 : viewportWidth < 900 ? 0.78 : 1;
  const fontFactor = Math.pow(18 / fontSize, 1.18);
  return Math.max(320, Math.round(1080 * widthFactor * fontFactor));
}

function takeChunk(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const candidates = [slice.lastIndexOf('\n\n'), slice.lastIndexOf('。'), slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '), slice.lastIndexOf('; '), slice.lastIndexOf(', '), slice.lastIndexOf(' ')];
  const cut = candidates.find(index => index >= Math.floor(maxChars * 0.55));
  return slice.slice(0, (cut ?? maxChars)).trim();
}

function paginateContent(content: string, fontSize: number, viewportWidth: number): string[] {
  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) return [''];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map(part => part.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const pageSize = estimateCharsPerPage(fontSize, viewportWidth);
  const pages: string[] = [];
  let current = '';

  const pushCurrent = () => {
    const text = current.trim();
    if (text) pages.push(text);
    current = '';
  };

  for (const paragraph of paragraphs) {
    let remaining = paragraph;

    while (remaining.length > 0) {
      const separator = current ? '\n\n' : '';
      const free = pageSize - current.length - separator.length;

      if (free <= Math.floor(pageSize * 0.18)) {
        pushCurrent();
        continue;
      }

      if (remaining.length <= free) {
        current = `${current}${separator}${remaining}`;
        remaining = '';
        continue;
      }

      const chunk = takeChunk(remaining, free);
      current = `${current}${separator}${chunk}`;
      remaining = remaining.slice(chunk.length).trim();
      pushCurrent();
    }
  }

  if (current.trim()) pushCurrent();
  return pages.length ? pages : [normalized];
}

function getChapterProgress(pageIndex: number, pageCount: number): number {
  if (pageCount <= 1) return 1;
  return Number((pageIndex / (pageCount - 1)).toFixed(4));
}

function getExcerpt(text: string): string {
  const excerpt = text.replace(/\s+/g, ' ').trim().slice(0, 120);
  return excerpt || '阅读位置书签';
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString('zh-CN');
}

const ReaderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  const initialSettings = useMemo(() => loadSettings(), []);
  const [theme, setTheme] = useState<ReaderTheme>(initialSettings.theme);
  const [fontSize, setFontSize] = useState(initialSettings.fontSize);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));

  const [manifest, setManifest] = useState<ReaderManifest | null>(null);
  const [chapter, setChapter] = useState<ReaderChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [bookmarkDrawerOpen, setBookmarkDrawerOpen] = useState(false);
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [bookmarkSubmitting, setBookmarkSubmitting] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pendingProgress, setPendingProgress] = useState(0);

  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme, fontSize }));
  }, [theme, fontSize]);

  useEffect(() => {
    if (!id || Number.isNaN(Number(id))) {
      message.error('书籍不存在');
      navigate('/');
      return;
    }

    let cancelled = false;
    setLoading(true);

    getReaderManifest(Number(id))
      .then(res => {
        if (cancelled) return;
        const data = res.data.data;
        if (!data.toc.length) {
          message.error('该书暂无可读章节');
          navigate(`/books/${id}`);
          return;
        }
        setManifest(data);
        setActiveChapterId(data.progress?.chapterId ?? data.toc[0].id);
        setPendingProgress(data.progress?.chapterProgress ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          message.error('获取在线阅读信息失败');
          navigate(`/books/${id}`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  useEffect(() => {
    if (!id || !activeChapterId) return;

    let cancelled = false;
    setChapterLoading(true);

    getReaderChapter(Number(id), activeChapterId)
      .then(res => {
        if (!cancelled) setChapter(res.data.data);
      })
      .catch(() => {
        if (!cancelled) message.error('加载章节失败');
      })
      .finally(() => {
        if (!cancelled) setChapterLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeChapterId, id]);

  const pages = useMemo(() => {
    if (!chapter) return [];
    return paginateContent(chapter.content, fontSize, viewportWidth);
  }, [chapter, fontSize, viewportWidth]);

  useEffect(() => {
    if (!chapter || !pages.length) return;
    const nextPage = Math.min(pages.length - 1, Math.max(0, Math.round(pendingProgress * Math.max(0, pages.length - 1))));
    setPageIndex(nextPage);
  }, [chapter, pages, pendingProgress]);

  useEffect(() => {
    if (!id || !chapter || !pages.length || !isLoggedIn) return;

    const chapterProgress = getChapterProgress(pageIndex, pages.length);
    const saveKey = `${chapter.id}:${chapterProgress}`;
    if (lastSavedRef.current === saveKey) return;

    const timer = window.setTimeout(async () => {
      setSaving(true);
      try {
        await saveReaderProgress(Number(id), {
          chapterId: chapter.id,
          chapterProgress,
        });
        lastSavedRef.current = saveKey;
        setManifest(current => current ? {
          ...current,
          progress: {
            chapterId: chapter.id,
            chapterIndex: chapter.chapterIndex,
            chapterTitle: chapter.title,
            page: null,
            percent: null,
            chapterProgress,
            updatedAt: new Date().toISOString(),
          },
        } : current);
      } catch {
        message.error('保存阅读进度失败');
      } finally {
        setSaving(false);
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [chapter, id, isLoggedIn, pageIndex, pages.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevPage();
      }
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        handleNextPage();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const currentTheme = THEME_PRESETS[theme];
  const currentPageText = pages[pageIndex] || '';
  const currentChapterIndex = manifest?.toc.findIndex(item => item.id === chapter?.id) ?? -1;
  const globalPercent = manifest?.book.readerPageCount && chapter
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(((chapter.pageStart + pageIndex) / manifest.book.readerPageCount) * 100)
        )
      )
    : null;

  function openChapter(chapterId: number, chapterProgress = 0) {
    setActiveChapterId(chapterId);
    setPendingProgress(chapterProgress);
    setTocOpen(false);
    setBookmarkDrawerOpen(false);
  }

  function handlePrevPage() {
    if (!chapter || !pages.length) return;
    if (pageIndex > 0) {
      setPageIndex(prev => prev - 1);
      return;
    }
    if (chapter.previousChapter) {
      openChapter(chapter.previousChapter.id, 1);
    }
  }

  function handleNextPage() {
    if (!chapter || !pages.length) return;
    if (pageIndex < pages.length - 1) {
      setPageIndex(prev => prev + 1);
      return;
    }
    if (chapter.nextChapter) {
      openChapter(chapter.nextChapter.id, 0);
    }
  }

  async function handleCreateBookmark() {
    if (!id || !chapter || !pages.length) return;
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    setBookmarkSubmitting(true);
    try {
      const res = await addReaderBookmark(Number(id), {
        chapterId: chapter.id,
        chapterProgress: getChapterProgress(pageIndex, pages.length),
        quote: getExcerpt(currentPageText),
        note: bookmarkNote,
      });
      const bookmark = res.data.data;
      setManifest(current => current ? {
        ...current,
        bookmarks: [bookmark, ...current.bookmarks],
      } : current);
      setBookmarkNote('');
      setBookmarkModalOpen(false);
      setBookmarkDrawerOpen(true);
      message.success('书签已添加');
    } catch {
      message.error('添加书签失败');
    } finally {
      setBookmarkSubmitting(false);
    }
  }

  async function handleDeleteBookmark(bookmark: ReaderBookmark) {
    if (!id) return;
    try {
      await removeReaderBookmark(Number(id), bookmark.id);
      setManifest(current => current ? {
        ...current,
        bookmarks: current.bookmarks.filter(item => item.id !== bookmark.id),
      } : current);
      message.success('书签已删除');
    } catch {
      message.error('删除书签失败');
    }
  }

  if (loading || !manifest) {
    return (
      <div style={{ padding: '100px 0', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', margin: '0 -24px', background: currentTheme.shell, color: currentTheme.text }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 20px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/books/${manifest.book.id}`)}>
            返回详情
          </Button>
          <Button icon={<MenuOutlined />} onClick={() => setTocOpen(true)}>
            目录
          </Button>
          <Button icon={<PushpinOutlined />} onClick={() => setBookmarkDrawerOpen(true)}>
            书签
          </Button>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setBookmarkModalOpen(true)}>
            添加书签
          </Button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Tooltip title="减小字号">
              <Button icon={<FontSizeOutlined />} onClick={() => setFontSize(size => clampFontSize(size - 2))} />
            </Tooltip>
            <Tag style={{ marginRight: 0, padding: '4px 10px', borderRadius: 14 }}>{fontSize}px</Tag>
            <Tooltip title="增大字号">
              <Button icon={<PlusOutlined />} onClick={() => setFontSize(size => clampFontSize(size + 2))} />
            </Tooltip>
            <Button onClick={() => setTheme('light')} type={theme === 'light' ? 'primary' : 'default'}>
              浅色
            </Button>
            <Button icon={<SkinOutlined />} onClick={() => setTheme('sepia')} type={theme === 'sepia' ? 'primary' : 'default'}>
              护眼
            </Button>
            <Button icon={<MoonOutlined />} onClick={() => setTheme('dark')} type={theme === 'dark' ? 'primary' : 'default'}>
              深色
            </Button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: viewportWidth < 960 ? '1fr' : '260px minmax(0, 1fr)', gap: 20 }}>
          {viewportWidth >= 960 && (
            <aside style={{ alignSelf: 'start', position: 'sticky', top: 24 }}>
              <div style={{ background: currentTheme.card, border: `1px solid ${currentTheme.border}`, borderRadius: 18, padding: 18, boxShadow: '0 12px 32px rgba(15,23,42,0.06)' }}>
                <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 72, height: 102, borderRadius: 10, overflow: 'hidden', background: currentTheme.shell, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {manifest.book.coverUrl ? (
                      <img src={manifest.book.coverUrl} alt={manifest.book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <BookOutlined style={{ fontSize: 28, color: currentTheme.muted }} />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.45 }}>{manifest.book.title}</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: currentTheme.muted }}>{manifest.book.author}</div>
                    <div style={{ marginTop: 10, fontSize: 12, color: currentTheme.muted }}>
                      {manifest.toc.length} 章 · {manifest.book.readerPageCount || '--'} 页
                    </div>
                  </div>
                </div>

                {manifest.progress && (
                  <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 12, background: currentTheme.shell, fontSize: 12, color: currentTheme.muted, lineHeight: 1.7 }}>
                    上次阅读：{manifest.progress.chapterTitle || '未记录'}
                    <br />
                    更新时间：{formatDate(manifest.progress.updatedAt)}
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {manifest.book.readerSource && <Tag color="green">来源：{manifest.book.readerSource}</Tag>}
                  {saving && <Tag color="processing">同步中</Tag>}
                  {!isLoggedIn && <Tag>未登录仅本地阅读</Tag>}
                  {globalPercent !== null && <Tag color="gold">全书约 {globalPercent}%</Tag>}
                </div>
              </div>
            </aside>
          )}

          <section>
            <div style={{ background: currentTheme.card, border: `1px solid ${currentTheme.border}`, borderRadius: 24, padding: viewportWidth < 640 ? '20px 18px' : '28px 32px', boxShadow: '0 16px 36px rgba(15,23,42,0.08)' }}>
              {chapterLoading || !chapter ? (
                <div style={{ padding: '120px 0', textAlign: 'center' }}>
                  <Spin size="large" />
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${currentTheme.border}` }}>
                    <div style={{ fontSize: 12, color: currentTheme.muted, marginBottom: 8 }}>
                      第 {chapter.chapterIndex} 章
                      {globalPercent !== null ? ` · 全书约 ${globalPercent}%` : ''}
                    </div>
                    <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.35, color: currentTheme.text }}>{chapter.title}</h1>
                  </div>

                  <article style={{ minHeight: viewportWidth < 640 ? 360 : 520, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize, lineHeight: 1.95, letterSpacing: 0.2, color: currentTheme.text }}>
                      {currentPageText}
                    </div>

                    <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${currentTheme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12, color: currentTheme.muted }}>
                        本章第 {pageIndex + 1} / {pages.length} 页
                        {manifest.book.readerPageCount ? ` · 全书约 ${chapter.pageStart + pageIndex} / ${manifest.book.readerPageCount} 页` : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Button icon={<LeftOutlined />} onClick={handlePrevPage} disabled={pageIndex === 0 && !chapter.previousChapter}>
                          上一页
                        </Button>
                        <Button type="primary" icon={<RightOutlined />} onClick={handleNextPage} disabled={pageIndex === pages.length - 1 && !chapter.nextChapter}>
                          下一页
                        </Button>
                      </div>
                    </div>
                  </article>
                </>
              )}
            </div>

            <div style={{ marginTop: 14, color: currentTheme.muted, fontSize: 12, lineHeight: 1.8 }}>
              <div>{manifest.book.readerLicenseNote || '仅展示已授权或公版书全文，请在合法范围内阅读。'}</div>
              <div>键盘 ← → 或空格 也可翻页。</div>
            </div>
          </section>
        </div>
      </div>

      <Drawer
        title="目录"
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        width={360}
      >
        <List
          dataSource={manifest.toc}
          renderItem={item => (
            <List.Item
              onClick={() => openChapter(item.id, 0)}
              style={{ cursor: 'pointer', paddingLeft: 4, paddingRight: 4 }}
              actions={item.id === chapter?.id ? [<Tag color="processing" key="current">当前</Tag>] : undefined}
            >
              <List.Item.Meta
                title={<span style={{ color: item.id === chapter?.id ? '#1677ff' : undefined }}>第 {item.chapterIndex} 章 · {item.title}</span>}
                description={`约 ${item.pageCount} 页 · ${item.wordCount} 词`}
              />
            </List.Item>
          )}
        />
      </Drawer>

      <Drawer
        title="书签"
        open={bookmarkDrawerOpen}
        onClose={() => setBookmarkDrawerOpen(false)}
        width={380}
      >
        {manifest.bookmarks.length === 0 ? (
          <Empty description="还没有书签" />
        ) : (
          <List
            dataSource={manifest.bookmarks}
            renderItem={item => (
              <List.Item
                actions={[
                  <Button type="link" key="jump" onClick={() => openChapter(item.chapterId, item.chapterProgress)}>跳转</Button>,
                  <Button type="link" danger key="delete" onClick={() => handleDeleteBookmark(item)}>删除</Button>,
                ]}
              >
                <List.Item.Meta
                  title={`第 ${item.chapterIndex} 章 · ${item.chapterTitle}`}
                  description={
                    <div style={{ color: '#6b7280', lineHeight: 1.7 }}>
                      <div>{item.quote || '阅读位置书签'}</div>
                      {item.note && <div style={{ marginTop: 4 }}>备注：{item.note}</div>}
                      <div style={{ marginTop: 4 }}>创建于：{formatDate(item.createdAt)}</div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>

      <Modal
        title="添加书签"
        open={bookmarkModalOpen}
        onCancel={() => {
          setBookmarkModalOpen(false);
          setBookmarkNote('');
        }}
        onOk={handleCreateBookmark}
        okText="保存书签"
        confirmLoading={bookmarkSubmitting}
      >
        <div style={{ marginBottom: 12, fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
          当前章节：{chapter?.title || '--'}
          <br />
          当前摘录：{getExcerpt(currentPageText)}
        </div>
        <Input.TextArea
          value={bookmarkNote}
          onChange={e => setBookmarkNote(e.target.value)}
          placeholder="给这个位置留一句备注（可选）"
          rows={4}
          maxLength={200}
          showCount
        />
      </Modal>
    </div>
  );
};

export default ReaderPage;
