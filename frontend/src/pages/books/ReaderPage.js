import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftOutlined, BookOutlined, FontSizeOutlined, LeftOutlined, MenuOutlined, MoonOutlined, PlusOutlined, PushpinOutlined, RightOutlined, SkinOutlined, } from '@ant-design/icons';
import { Button, Drawer, Empty, Input, List, Modal, Spin, Tag, Tooltip, message, } from 'antd';
import { addReaderBookmark, getReaderChapter, getReaderManifest, removeReaderBookmark, saveReaderProgress, } from '../../api/bookApi';
import { useAuthStore } from '../../store/authStore';
const SETTINGS_STORAGE_KEY = 'bs-reader-settings';
const THEME_PRESETS = {
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
function loadSettings() {
    if (typeof window === 'undefined') {
        return { theme: 'light', fontSize: 18 };
    }
    try {
        const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw)
            return { theme: 'light', fontSize: 18 };
        const parsed = JSON.parse(raw);
        return {
            theme: parsed.theme === 'sepia' || parsed.theme === 'dark' ? parsed.theme : 'light',
            fontSize: clampFontSize(parsed.fontSize),
        };
    }
    catch {
        return { theme: 'light', fontSize: 18 };
    }
}
function clampFontSize(fontSize) {
    const size = Number(fontSize) || 18;
    return Math.min(28, Math.max(14, size));
}
function estimateCharsPerPage(fontSize, viewportWidth) {
    const widthFactor = viewportWidth < 640 ? 0.56 : viewportWidth < 900 ? 0.78 : 1;
    const fontFactor = Math.pow(18 / fontSize, 1.18);
    return Math.max(320, Math.round(1080 * widthFactor * fontFactor));
}
function takeChunk(text, maxChars) {
    if (text.length <= maxChars)
        return text;
    const slice = text.slice(0, maxChars);
    const candidates = [slice.lastIndexOf('\n\n'), slice.lastIndexOf('。'), slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '), slice.lastIndexOf('; '), slice.lastIndexOf(', '), slice.lastIndexOf(' ')];
    const cut = candidates.find(index => index >= Math.floor(maxChars * 0.55));
    return slice.slice(0, (cut ?? maxChars)).trim();
}
function paginateContent(content, fontSize, viewportWidth) {
    const normalized = content
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    if (!normalized)
        return [''];
    const paragraphs = normalized
        .split(/\n{2,}/)
        .map(part => part.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    const pageSize = estimateCharsPerPage(fontSize, viewportWidth);
    const pages = [];
    let current = '';
    const pushCurrent = () => {
        const text = current.trim();
        if (text)
            pages.push(text);
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
    if (current.trim())
        pushCurrent();
    return pages.length ? pages : [normalized];
}
function getChapterProgress(pageIndex, pageCount) {
    if (pageCount <= 1)
        return 1;
    return Number((pageIndex / (pageCount - 1)).toFixed(4));
}
function getExcerpt(text) {
    const excerpt = text.replace(/\s+/g, ' ').trim().slice(0, 120);
    return excerpt || '阅读位置书签';
}
function formatDate(date) {
    return new Date(date).toLocaleString('zh-CN');
}
const ReaderPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const initialSettings = useMemo(() => loadSettings(), []);
    const [theme, setTheme] = useState(initialSettings.theme);
    const [fontSize, setFontSize] = useState(initialSettings.fontSize);
    const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));
    const [manifest, setManifest] = useState(null);
    const [chapter, setChapter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chapterLoading, setChapterLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tocOpen, setTocOpen] = useState(false);
    const [bookmarkDrawerOpen, setBookmarkDrawerOpen] = useState(false);
    const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false);
    const [bookmarkNote, setBookmarkNote] = useState('');
    const [bookmarkSubmitting, setBookmarkSubmitting] = useState(false);
    const [activeChapterId, setActiveChapterId] = useState(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [pendingProgress, setPendingProgress] = useState(0);
    const lastSavedRef = useRef('');
    useEffect(() => {
        const onResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
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
            if (cancelled)
                return;
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
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [id, navigate]);
    useEffect(() => {
        if (!id || !activeChapterId)
            return;
        let cancelled = false;
        setChapterLoading(true);
        getReaderChapter(Number(id), activeChapterId)
            .then(res => {
            if (!cancelled)
                setChapter(res.data.data);
        })
            .catch(() => {
            if (!cancelled)
                message.error('加载章节失败');
        })
            .finally(() => {
            if (!cancelled)
                setChapterLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [activeChapterId, id]);
    const pages = useMemo(() => {
        if (!chapter)
            return [];
        return paginateContent(chapter.content, fontSize, viewportWidth);
    }, [chapter, fontSize, viewportWidth]);
    useEffect(() => {
        if (!chapter || !pages.length)
            return;
        const nextPage = Math.min(pages.length - 1, Math.max(0, Math.round(pendingProgress * Math.max(0, pages.length - 1))));
        setPageIndex(nextPage);
    }, [chapter, pages, pendingProgress]);
    useEffect(() => {
        if (!id || !chapter || !pages.length || !isLoggedIn)
            return;
        const chapterProgress = getChapterProgress(pageIndex, pages.length);
        const saveKey = `${chapter.id}:${chapterProgress}`;
        if (lastSavedRef.current === saveKey)
            return;
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
            }
            catch {
                message.error('保存阅读进度失败');
            }
            finally {
                setSaving(false);
            }
        }, 1200);
        return () => window.clearTimeout(timer);
    }, [chapter, id, isLoggedIn, pageIndex, pages.length]);
    useEffect(() => {
        const onKeyDown = (event) => {
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
        ? Math.min(100, Math.max(0, Math.round(((chapter.pageStart + pageIndex) / manifest.book.readerPageCount) * 100)))
        : null;
    function openChapter(chapterId, chapterProgress = 0) {
        setActiveChapterId(chapterId);
        setPendingProgress(chapterProgress);
        setTocOpen(false);
        setBookmarkDrawerOpen(false);
    }
    function handlePrevPage() {
        if (!chapter || !pages.length)
            return;
        if (pageIndex > 0) {
            setPageIndex(prev => prev - 1);
            return;
        }
        if (chapter.previousChapter) {
            openChapter(chapter.previousChapter.id, 1);
        }
    }
    function handleNextPage() {
        if (!chapter || !pages.length)
            return;
        if (pageIndex < pages.length - 1) {
            setPageIndex(prev => prev + 1);
            return;
        }
        if (chapter.nextChapter) {
            openChapter(chapter.nextChapter.id, 0);
        }
    }
    async function handleCreateBookmark() {
        if (!id || !chapter || !pages.length)
            return;
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
        }
        catch {
            message.error('添加书签失败');
        }
        finally {
            setBookmarkSubmitting(false);
        }
    }
    async function handleDeleteBookmark(bookmark) {
        if (!id)
            return;
        try {
            await removeReaderBookmark(Number(id), bookmark.id);
            setManifest(current => current ? {
                ...current,
                bookmarks: current.bookmarks.filter(item => item.id !== bookmark.id),
            } : current);
            message.success('书签已删除');
        }
        catch {
            message.error('删除书签失败');
        }
    }
    if (loading || !manifest) {
        return (_jsx("div", { style: { padding: '100px 0', textAlign: 'center' }, children: _jsx(Spin, { size: "large" }) }));
    }
    return (_jsxs("div", { style: { minHeight: '100vh', margin: '0 -24px', background: currentTheme.shell, color: currentTheme.text }, children: [_jsxs("div", { style: { maxWidth: 1120, margin: '0 auto', padding: '24px 20px 48px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate(`/books/${manifest.book.id}`), children: "\u8FD4\u56DE\u8BE6\u60C5" }), _jsx(Button, { icon: _jsx(MenuOutlined, {}), onClick: () => setTocOpen(true), children: "\u76EE\u5F55" }), _jsx(Button, { icon: _jsx(PushpinOutlined, {}), onClick: () => setBookmarkDrawerOpen(true), children: "\u4E66\u7B7E" }), _jsx(Button, { icon: _jsx(PlusOutlined, {}), type: "primary", onClick: () => setBookmarkModalOpen(true), children: "\u6DFB\u52A0\u4E66\u7B7E" }), _jsxs("div", { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Tooltip, { title: "\u51CF\u5C0F\u5B57\u53F7", children: _jsx(Button, { icon: _jsx(FontSizeOutlined, {}), onClick: () => setFontSize(size => clampFontSize(size - 2)) }) }), _jsxs(Tag, { style: { marginRight: 0, padding: '4px 10px', borderRadius: 14 }, children: [fontSize, "px"] }), _jsx(Tooltip, { title: "\u589E\u5927\u5B57\u53F7", children: _jsx(Button, { icon: _jsx(PlusOutlined, {}), onClick: () => setFontSize(size => clampFontSize(size + 2)) }) }), _jsx(Button, { onClick: () => setTheme('light'), type: theme === 'light' ? 'primary' : 'default', children: "\u6D45\u8272" }), _jsx(Button, { icon: _jsx(SkinOutlined, {}), onClick: () => setTheme('sepia'), type: theme === 'sepia' ? 'primary' : 'default', children: "\u62A4\u773C" }), _jsx(Button, { icon: _jsx(MoonOutlined, {}), onClick: () => setTheme('dark'), type: theme === 'dark' ? 'primary' : 'default', children: "\u6DF1\u8272" })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: viewportWidth < 960 ? '1fr' : '260px minmax(0, 1fr)', gap: 20 }, children: [viewportWidth >= 960 && (_jsx("aside", { style: { alignSelf: 'start', position: 'sticky', top: 24 }, children: _jsxs("div", { style: { background: currentTheme.card, border: `1px solid ${currentTheme.border}`, borderRadius: 18, padding: 18, boxShadow: '0 12px 32px rgba(15,23,42,0.06)' }, children: [_jsxs("div", { style: { display: 'flex', gap: 14, marginBottom: 14 }, children: [_jsx("div", { style: { width: 72, height: 102, borderRadius: 10, overflow: 'hidden', background: currentTheme.shell, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, children: manifest.book.coverUrl ? (_jsx("img", { src: manifest.book.coverUrl, alt: manifest.book.title, style: { width: '100%', height: '100%', objectFit: 'cover' } })) : (_jsx(BookOutlined, { style: { fontSize: 28, color: currentTheme.muted } })) }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 700, fontSize: 16, lineHeight: 1.45 }, children: manifest.book.title }), _jsx("div", { style: { marginTop: 6, fontSize: 13, color: currentTheme.muted }, children: manifest.book.author }), _jsxs("div", { style: { marginTop: 10, fontSize: 12, color: currentTheme.muted }, children: [manifest.toc.length, " \u7AE0 \u00B7 ", manifest.book.readerPageCount || '--', " \u9875"] })] })] }), manifest.progress && (_jsxs("div", { style: { marginBottom: 14, padding: '10px 12px', borderRadius: 12, background: currentTheme.shell, fontSize: 12, color: currentTheme.muted, lineHeight: 1.7 }, children: ["\u4E0A\u6B21\u9605\u8BFB\uFF1A", manifest.progress.chapterTitle || '未记录', _jsx("br", {}), "\u66F4\u65B0\u65F6\u95F4\uFF1A", formatDate(manifest.progress.updatedAt)] })), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: [manifest.book.readerSource && _jsxs(Tag, { color: "green", children: ["\u6765\u6E90\uFF1A", manifest.book.readerSource] }), saving && _jsx(Tag, { color: "processing", children: "\u540C\u6B65\u4E2D" }), !isLoggedIn && _jsx(Tag, { children: "\u672A\u767B\u5F55\u4EC5\u672C\u5730\u9605\u8BFB" }), globalPercent !== null && _jsxs(Tag, { color: "gold", children: ["\u5168\u4E66\u7EA6 ", globalPercent, "%"] })] })] }) })), _jsxs("section", { children: [_jsx("div", { style: { background: currentTheme.card, border: `1px solid ${currentTheme.border}`, borderRadius: 24, padding: viewportWidth < 640 ? '20px 18px' : '28px 32px', boxShadow: '0 16px 36px rgba(15,23,42,0.08)' }, children: chapterLoading || !chapter ? (_jsx("div", { style: { padding: '120px 0', textAlign: 'center' }, children: _jsx(Spin, { size: "large" }) })) : (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${currentTheme.border}` }, children: [_jsxs("div", { style: { fontSize: 12, color: currentTheme.muted, marginBottom: 8 }, children: ["\u7B2C ", chapter.chapterIndex, " \u7AE0", globalPercent !== null ? ` · 全书约 ${globalPercent}%` : ''] }), _jsx("h1", { style: { margin: 0, fontSize: 28, lineHeight: 1.35, color: currentTheme.text }, children: chapter.title })] }), _jsxs("article", { style: { minHeight: viewportWidth < 640 ? 360 : 520, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }, children: [_jsx("div", { style: { whiteSpace: 'pre-wrap', fontSize, lineHeight: 1.95, letterSpacing: 0.2, color: currentTheme.text }, children: currentPageText }), _jsxs("div", { style: { marginTop: 24, paddingTop: 16, borderTop: `1px solid ${currentTheme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }, children: [_jsxs("div", { style: { fontSize: 12, color: currentTheme.muted }, children: ["\u672C\u7AE0\u7B2C ", pageIndex + 1, " / ", pages.length, " \u9875", manifest.book.readerPageCount ? ` · 全书约 ${chapter.pageStart + pageIndex} / ${manifest.book.readerPageCount} 页` : ''] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Button, { icon: _jsx(LeftOutlined, {}), onClick: handlePrevPage, disabled: pageIndex === 0 && !chapter.previousChapter, children: "\u4E0A\u4E00\u9875" }), _jsx(Button, { type: "primary", icon: _jsx(RightOutlined, {}), onClick: handleNextPage, disabled: pageIndex === pages.length - 1 && !chapter.nextChapter, children: "\u4E0B\u4E00\u9875" })] })] })] })] })) }), _jsxs("div", { style: { marginTop: 14, color: currentTheme.muted, fontSize: 12, lineHeight: 1.8 }, children: [_jsx("div", { children: manifest.book.readerLicenseNote || '仅展示已授权或公版书全文，请在合法范围内阅读。' }), _jsx("div", { children: "\u952E\u76D8 \u2190 \u2192 \u6216\u7A7A\u683C \u4E5F\u53EF\u7FFB\u9875\u3002" })] })] })] })] }), _jsx(Drawer, { title: "\u76EE\u5F55", open: tocOpen, onClose: () => setTocOpen(false), width: 360, children: _jsx(List, { dataSource: manifest.toc, renderItem: item => (_jsx(List.Item, { onClick: () => openChapter(item.id, 0), style: { cursor: 'pointer', paddingLeft: 4, paddingRight: 4 }, actions: item.id === chapter?.id ? [_jsx(Tag, { color: "processing", children: "\u5F53\u524D" }, "current")] : undefined, children: _jsx(List.Item.Meta, { title: _jsxs("span", { style: { color: item.id === chapter?.id ? '#1677ff' : undefined }, children: ["\u7B2C ", item.chapterIndex, " \u7AE0 \u00B7 ", item.title] }), description: `约 ${item.pageCount} 页 · ${item.wordCount} 词` }) })) }) }), _jsx(Drawer, { title: "\u4E66\u7B7E", open: bookmarkDrawerOpen, onClose: () => setBookmarkDrawerOpen(false), width: 380, children: manifest.bookmarks.length === 0 ? (_jsx(Empty, { description: "\u8FD8\u6CA1\u6709\u4E66\u7B7E" })) : (_jsx(List, { dataSource: manifest.bookmarks, renderItem: item => (_jsx(List.Item, { actions: [
                            _jsx(Button, { type: "link", onClick: () => openChapter(item.chapterId, item.chapterProgress), children: "\u8DF3\u8F6C" }, "jump"),
                            _jsx(Button, { type: "link", danger: true, onClick: () => handleDeleteBookmark(item), children: "\u5220\u9664" }, "delete"),
                        ], children: _jsx(List.Item.Meta, { title: `第 ${item.chapterIndex} 章 · ${item.chapterTitle}`, description: _jsxs("div", { style: { color: '#6b7280', lineHeight: 1.7 }, children: [_jsx("div", { children: item.quote || '阅读位置书签' }), item.note && _jsxs("div", { style: { marginTop: 4 }, children: ["\u5907\u6CE8\uFF1A", item.note] }), _jsxs("div", { style: { marginTop: 4 }, children: ["\u521B\u5EFA\u4E8E\uFF1A", formatDate(item.createdAt)] })] }) }) })) })) }), _jsxs(Modal, { title: "\u6DFB\u52A0\u4E66\u7B7E", open: bookmarkModalOpen, onCancel: () => {
                    setBookmarkModalOpen(false);
                    setBookmarkNote('');
                }, onOk: handleCreateBookmark, okText: "\u4FDD\u5B58\u4E66\u7B7E", confirmLoading: bookmarkSubmitting, children: [_jsxs("div", { style: { marginBottom: 12, fontSize: 13, color: '#6b7280', lineHeight: 1.7 }, children: ["\u5F53\u524D\u7AE0\u8282\uFF1A", chapter?.title || '--', _jsx("br", {}), "\u5F53\u524D\u6458\u5F55\uFF1A", getExcerpt(currentPageText)] }), _jsx(Input.TextArea, { value: bookmarkNote, onChange: e => setBookmarkNote(e.target.value), placeholder: "\u7ED9\u8FD9\u4E2A\u4F4D\u7F6E\u7559\u4E00\u53E5\u5907\u6CE8\uFF08\u53EF\u9009\uFF09", rows: 4, maxLength: 200, showCount: true })] })] }));
};
export default ReaderPage;
