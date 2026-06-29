import { AnimatePresence, motion } from 'framer-motion';
import type { editor } from 'monaco-editor';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { GroupImperativeHandle, Layout } from 'react-resizable-panels';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';

import { FileSidebar } from '@/components/file-sidebar';
import { MarkdownEditor } from '@/components/markdown/editor';
import { MarkdownPreview } from '@/components/markdown/preview';
import { type MenubarActions } from '@/components/menubar';
import { TabBar } from '@/components/tab-bar';
import { useTheme } from '@/components/theme/provider';
import { AppToolbar } from '@/components/toolbar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Toaster } from '@/components/ui/sonner';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { createDocument, getDocument, updateDocument } from '@/lib/files-api';
import { print } from '@/lib/pdf';
import { exportNodeToPdfViaServer } from '@/lib/pdf-server';
import { detectPlatform } from '@/lib/platform';
import { SCRATCH_TAB_ID, type Tab } from '@/lib/tab-types';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useKeyboardShortcuts } from '@/lib/use-keyboard-shortcuts';

const AUTOSAVE_DELAY_MS = 1000;

const STORAGE_KEY_MODE = 'resomd:mode';
// Hot-exit storage: open tabs + the untitled buffer are persisted so that
// unsaved work survives a reload (like VS Code's hot exit).
const STORAGE_KEY_TABS = 'resomd:tabs';

interface PersistedTab {
  id: string;
  name: string;
  /** Saved only for dirty tabs; synced tabs re-fetch from the server. */
  content: string;
  isDirty: boolean;
  syncStatus: Tab['syncStatus'];
  documentId: string | null;
  isPreview: boolean;
}
interface PersistedState {
  untitledContent: string;
  tabs: PersistedTab[];
}

function loadPersistedState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TABS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || !Array.isArray(parsed.tabs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function loadInitialMode() {
  const storedMode = localStorage.getItem(STORAGE_KEY_MODE);
  if (
    storedMode === 'editor' ||
    storedMode === 'split' ||
    storedMode === 'preview'
  ) {
    return storedMode;
  }
  return 'split';
}

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 0;

const platform = detectPlatform();

export function App() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewScrollContainerRef = useRef<HTMLDivElement | null>(null);
  // Bumped whenever the preview registers its scroll container, so the
  // scroll-sync effect re-runs once the container is actually available.
  const [previewScrollReady, setPreviewScrollReady] = useState(0);
  const registerPreviewScrollContainer = useCallback(
    (el: HTMLDivElement | null) => {
      previewScrollContainerRef.current = el;
      setPreviewScrollReady(n => (el ? n + 1 : n));
    },
    []
  );
  const panelGroupRef = useRef<GroupImperativeHandle>(null);

  // Editor state and mutable ref to bypass react-markdown closure caches
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(
    null
  );
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // ── Tab state ────────────────────────────────────────────────────────
  // Hot-exit restore: reopen the tabs that were open last time. Dirty tabs
  // (incl. the untitled buffer) come back with their unsaved content; synced
  // tabs come back empty and re-fetch from the server via the loading effect.
  const [openTabs, setOpenTabs] = useState<Tab[]>(() => {
    const persisted = loadPersistedState();
    if (!persisted) return [];
    return persisted.tabs.map(t => ({
      id: t.id,
      name: t.name,
      // Dirty tabs keep their content; synced tabs start empty to re-fetch.
      content: t.isDirty ? t.content : '',
      isDirty: t.isDirty,
      syncStatus: t.isDirty ? t.syncStatus : 'idle',
      documentId: t.documentId,
      isPreview: t.isPreview,
    }));
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const persisted = loadPersistedState();
    return persisted?.tabs[0]?.id ?? null;
  });

  // Buffer content for the transient untitled tab (restored from hot exit).
  const [untitledContent, setUntitledContent] = useState<string>(() => {
    const persisted = loadPersistedState();
    return persisted?.untitledContent ?? '';
  });

  // ── Active tab resolution ─────────────────────────────────────────────
  // When there are no document tabs, show a transient untitled buffer (like
  // VS Code). It's a preview tab, so opening a file replaces it instead of
  // stacking. Its content is kept in `untitledContent` (persisted below).
  const untitledTab = useMemo<Tab>(
    () => ({
      id: SCRATCH_TAB_ID,
      name: 'Untitled',
      content: untitledContent,
      isDirty: untitledContent !== '',
      syncStatus: 'idle',
      documentId: null,
      isPreview: true,
    }),
    [untitledContent]
  );

  // Display tabs: real document tabs, or the single untitled buffer when empty.
  const displayTabs = openTabs.length > 0 ? openTabs : [untitledTab];
  const activeTab =
    openTabs.find(t => t.id === activeTabId) ??
    openTabs[0] ??
    (openTabs.length === 0 ? untitledTab : undefined);
  const activeContent = activeTab?.content ?? '';
  const activeDocName = activeTab?.documentId ? activeTab.name : null;

  // Defer the (heavy) markdown preview render so tab switching and tab
  // animations stay smooth even while a document is still loading — the
  // preview re-renders markdown on a lower priority without blocking the
  // tab bar / framer-motion animations.
  const deferredPreviewContent = useDeferredValue(activeContent);

  // Skip the next Monaco content change when we programmatically set the
  // editor value (e.g. on tab switch) so we don't mark the tab dirty.
  const skipNextEditorChangeRef = useRef(false);
  // Skip the next autosave when content is loaded from the server.
  const skipAutosaveTabIdRef = useRef<string | null>(null);

  useDocumentTitle(activeDocName ?? undefined);

  const { documentId: urlDocumentId } = useParams();
  const navigate = useNavigate();

  // ── Open a cloud document in a tab (VS Code-style preview tabs) ──────
  // Opening a file creates a *preview* tab (italic). If the currently active
  // tab is itself a clean (non-dirty) preview, the new file replaces it in
  // place instead of stacking a new tab. Editing a preview pins it
  // (isPreview = false), so subsequent opens add a new tab.
  const activeTabIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);
  // Keep a ref to the untitled buffer content so openDocumentTab (stable
  // callback) can decide whether the dirty untitled buffer should be kept.
  const untitledContentRef = useRef('');
  useEffect(() => {
    untitledContentRef.current = untitledContent;
  }, [untitledContent]);

  const openDocumentTab = useCallback((docId: string) => {
    setOpenTabs(prev => {
      // Already open — just switch to it.
      const existing = prev.find(t => t.documentId === docId);
      if (existing) return prev;

      const newTab: Tab = {
        id: docId,
        name: 'Loading…',
        content: '',
        isDirty: false,
        syncStatus: 'idle',
        documentId: docId,
        isPreview: true,
      };

      // Replace the active preview tab if it's clean (incl. the untitled
      // buffer when it's the only thing showing — prev is empty in that case,
      // so we just add the new tab).
      const activeId = activeTabIdRef.current;
      const activeIdx = prev.findIndex(t => t.id === activeId);
      if (activeIdx !== -1) {
        const active = prev[activeIdx];
        if (
          active.isPreview &&
          !active.isDirty &&
          active.documentId !== docId
        ) {
          const next = [...prev];
          next[activeIdx] = newTab;
          return next;
        }
      }

      // If the untitled buffer is the only thing showing and it has unsaved
      // content, keep it as a real tab alongside the new file (VS Code keeps
      // a dirty Untitled instead of discarding it). A clean/empty untitled is
      // simply dropped (replaced) by the new file. Use a unique id (not
      // SCRATCH_TAB_ID) so the kept Untitled tab is closable.
      if (prev.length === 0 && untitledContentRef.current !== '') {
        const untitled: Tab = {
          id: `untitled-${Date.now()}`,
          name: 'Untitled',
          content: untitledContentRef.current,
          isDirty: true,
          syncStatus: 'idle',
          documentId: null,
          isPreview: false,
        };
        setUntitledContent('');
        return [untitled, newTab];
      }

      return [...prev, newTab];
    });
    setActiveTabId(docId);
  }, []);

  // React to URL changes: /d/:documentId opens a document tab.
  useEffect(() => {
    if (!urlDocumentId) return;
    openDocumentTab(urlDocumentId);
  }, [urlDocumentId, openDocumentTab]);

  // Load document content for any tab that was just added (Loading… state).
  // We track in-flight loads in a ref Set so that re-renders (e.g. when we
  // flip a tab to `syncStatus: 'saving'`) don't cancel the very fetch we just
  // started. A separate mounted-ref guards against setState after unmount.
  const loadingTabsRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const inFlight = loadingTabsRef.current;

    for (const tab of openTabs) {
      if (!tab.documentId) continue;
      if (tab.content !== '' || tab.syncStatus !== 'idle') continue;
      if (inFlight.has(tab.id)) continue; // already in-flight

      inFlight.add(tab.id);
      skipAutosaveTabIdRef.current = tab.id;

      // Mark as loading so we don't re-fetch.
      setOpenTabs(prev =>
        prev.map(t => (t.id === tab.id ? { ...t, syncStatus: 'saving' } : t))
      );

      getDocument(tab.documentId)
        .then(doc => {
          if (!isMountedRef.current) return;
          setOpenTabs(prev =>
            prev.map(t =>
              t.id === tab.id
                ? {
                    ...t,
                    name: doc.name,
                    content: doc.content,
                    syncStatus: 'synced',
                    isDirty: false,
                  }
                : t
            )
          );
          // If this is the active tab, push the content into Monaco.
          if (activeTabId === tab.id) {
            const ed = editorRef.current;
            if (ed) {
              skipNextEditorChangeRef.current = true;
              ed.setValue(doc.content);
            }
          }
        })
        .catch(error => {
          if (!isMountedRef.current) return;
          toast.error(
            error instanceof ApiError
              ? error.message
              : 'Failed to open document'
          );
          navigate('/files');
        })
        .finally(() => {
          inFlight.delete(tab.id);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTabs, navigate]);

  // App display modes: 'editor' (left only), 'split' (both), 'preview' (right only)
  const [mode, setMode] = useState<'editor' | 'split' | 'preview'>(
    loadInitialMode
  );
  const modeRef = useRef(mode);

  // Controlled layouts sizes for resizable panels
  const [sizes, setSizes] = useState<Layout>(() => {
    const initialMode = loadInitialMode();
    if (initialMode === 'editor') return { editor: 100, preview: 0 };
    if (initialMode === 'preview') return { editor: 0, preview: 100 };
    return { editor: 50, preview: 50 };
  });
  // Stable initial layout for the panel group — only applied on mount.
  // Passing the live `sizes` here re-triggers the group's default-layout
  // logic on every change and can fight imperative setLayout, which caused
  // the editor pane to grow without bound in editor-only mode.
  const initialLayout = useState<Layout>(() => sizes)[0];
  // Keep a ref to the latest sizes so applyMode (which may be called from a
  // memoized actions closure) always sees the current layout instead of a
  // stale snapshot — otherwise ⌘2 can no-op when the stale sizes already match
  // the target.
  const sizesRef = useRef(sizes);
  useEffect(() => {
    sizesRef.current = sizes;
  }, [sizes]);

  // Track layout transition states to apply CSS animation classes only when switching modes
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track which panel is actively hovered (kept for potential future use)
  const activeScrollSourceRef = useRef<'editor' | 'preview' | null>(null);

  // Cancels the in-flight panel-resize animation, if any, before starting a new one
  const cancelPanelTransitionRef = useRef<(() => void) | null>(null);

  // ── Autosave (per cloud document tab) ───────────────────────────────
  // Each cloud tab with unsaved changes is saved after AUTOSAVE_DELAY_MS of
  // inactivity. We track a single timer keyed by the tab id.
  const autosaveTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  useEffect(() => {
    if (!activeTab || !activeTab.documentId) return;
    if (activeTab.syncStatus === 'idle') return; // not yet loaded
    if (!activeTab.isDirty) return;

    if (skipAutosaveTabIdRef.current === activeTab.id) {
      skipAutosaveTabIdRef.current = null;
      return;
    }

    const tabId = activeTab.id;
    const docId = activeTab.documentId;
    const content = activeTab.content;

    setOpenTabs(prev =>
      prev.map(t => (t.id === tabId ? { ...t, syncStatus: 'saving' } : t))
    );

    const timers = autosaveTimerRef.current;
    const existing = timers.get(tabId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      updateDocument(docId, { content })
        .then(() => {
          setOpenTabs(prev =>
            prev.map(t =>
              t.id === tabId
                ? { ...t, syncStatus: 'synced', isDirty: false }
                : t
            )
          );
        })
        .catch(() => {
          setOpenTabs(prev =>
            prev.map(t => (t.id === tabId ? { ...t, syncStatus: 'error' } : t))
          );
        })
        .finally(() => {
          timers.delete(tabId);
        });
    }, AUTOSAVE_DELAY_MS);
    timers.set(tabId, timer);

    return () => {
      const t = timers.get(tabId);
      if (t) {
        clearTimeout(t);
        timers.delete(tabId);
      }
    };
  }, [activeTab]);

  // Persist view mode setting in localStorage and update ref on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MODE, mode);
    modeRef.current = mode;
  }, [mode]);

  // Hot exit: persist open tabs + the untitled buffer so unsaved work
  // survives a reload. We store content only for dirty tabs (synced tabs are
  // re-fetched from the server on restore) to keep the payload small.
  useEffect(() => {
    const state: PersistedState = {
      untitledContent,
      tabs: openTabs.map(t => ({
        id: t.id,
        name: t.name,
        content: t.isDirty ? t.content : '',
        isDirty: t.isDirty,
        syncStatus: t.syncStatus,
        documentId: t.documentId,
        isPreview: t.isPreview,
      })),
    };
    try {
      localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(state));
    } catch {
      // Quota errors (e.g. very large documents) are non-fatal — hot exit
      // just won't be available next time.
    }
  }, [openTabs, untitledContent]);

  // Warn before unloading the tab/window if there are unsaved changes.
  // (Hot exit still persists them, but the browser prompt gives a chance
  // to stay.)
  useEffect(() => {
    const hasUnsaved = untitledContent !== '' || openTabs.some(t => t.isDirty);
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsaved) return;
      e.preventDefault();
      // Legacy browsers require returnValue.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [openTabs, untitledContent]);

  // ── Tab switching: sync Monaco content, URL, and title ──────────────
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !activeTab) return;

    // Push the active tab's content into Monaco on tab switch.
    const currentModelValue = ed.getValue();
    if (currentModelValue !== activeTab.content) {
      skipNextEditorChangeRef.current = true;
      ed.setValue(activeTab.content);
    }

    // Reset the preview scroll to the top so it stays in sync with the
    // editor (Monaco's setValue resets its own scroll to the top).
    const previewContainer = previewScrollContainerRef.current;
    if (previewContainer) previewContainer.scrollTop = 0;
    activeScrollSourceRef.current = null;

    // Update URL to match the active tab.
    if (activeTab.documentId) {
      if (urlDocumentId !== activeTab.documentId) {
        navigate(`/d/${activeTab.documentId}`, { replace: true });
      }
    } else if (activeTab.id === SCRATCH_TAB_ID && urlDocumentId) {
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  // Smart scroll sync between editor and preview.
  //
  // We map the editor's top-visible line to the corresponding preview block
  // (via data-sourcepos attributes) and scroll proportionally *within* that
  // block. This is what makes a one-line image reference that renders as a
  // tall block scroll smoothly instead of jumping. Positions are measured
  // relative to the preview scroll container using getBoundingClientRect so
  // they stay correct regardless of the offsetParent chain.
  useEffect(() => {
    if (!editor || mode !== 'split') return;

    const container = previewScrollContainerRef.current;
    if (!container) return;
    // Non-null alias so nested function closures keep the narrowed type.
    const c = container;

    interface Entry {
      startLine: number;
      endLine: number;
      /** top relative to the scroll container's content box */
      top: number;
      height: number;
    }

    // Cached block measurements, refreshed on content/resize (not on every
    // scroll event) so the sync path stays cheap and smooth.
    let entries: Entry[] = [];
    let totalPreviewHeight = 0;

    function measureEntries() {
      const els = Array.from(
        c.querySelectorAll<HTMLElement>('[data-source-line]')
      );
      const containerRect = c.getBoundingClientRect();
      const measured: Entry[] = els
        .map(el => {
          const raw = el.getAttribute('data-source-line');
          const startLine = raw ? parseInt(raw, 10) : NaN;
          if (Number.isNaN(startLine)) return null;
          const rect = el.getBoundingClientRect();
          return {
            startLine,
            endLine: startLine,
            top: rect.top - containerRect.top + c.scrollTop,
            height: rect.height,
          } as Entry;
        })
        .filter((e): e is Entry => e !== null);
      measured.sort((a, b) => a.startLine - b.startLine);
      for (let i = 0; i < measured.length; i++) {
        const next = measured[i + 1];
        measured[i].endLine = next ? next.startLine : measured[i].startLine + 1;
      }
      entries = measured;
      totalPreviewHeight = c.scrollHeight;
    }

    function maxPreviewScroll() {
      return totalPreviewHeight - c.clientHeight;
    }
    function maxEditorScroll() {
      return editor!.getScrollHeight() - editor!.getLayoutInfo().height;
    }

    // Editor -> Preview. Returns the target scrollTop for the preview.
    function targetForPreview(): number {
      const editorScrollTop = editor!.getScrollTop();
      const maxE = maxEditorScroll();
      const maxP = maxPreviewScroll();

      // Edge clamping: when the editor is at the very top/bottom, the preview
      // snaps to the corresponding edge so the document ends align.
      if (editorScrollTop <= 0) return 0;
      if (maxE > 0 && editorScrollTop >= maxE) return maxP;

      const model = editor!.getModel();
      const lineCount = model ? model.getLineCount() : 1;
      const editorLineHeight =
        lineCount > 1 ? editor!.getScrollHeight() / lineCount : 22;
      const topLine = editorScrollTop / editorLineHeight + 1;

      if (entries.length === 0) {
        if (maxE > 0 && maxP > 0) return (editorScrollTop / maxE) * maxP;
        return c.scrollTop;
      }

      let target = entries[0];
      for (const entry of entries) {
        if (entry.startLine <= topLine) target = entry;
        else break;
      }
      const blockProgress =
        target.endLine > target.startLine
          ? Math.min(
              1,
              Math.max(
                0,
                (topLine - target.startLine) /
                  (target.endLine - target.startLine)
              )
            )
          : 0;
      return Math.min(target.top + blockProgress * target.height, maxP);
    }

    // Preview -> Editor. Returns the target scrollTop for the editor.
    function targetForEditor(): number {
      const previewScrollTop = c.scrollTop;
      const maxP = maxPreviewScroll();
      const maxE = maxEditorScroll();

      if (previewScrollTop <= 0) return 0;
      if (maxP > 0 && previewScrollTop >= maxP) return maxE;

      if (entries.length === 0) {
        if (maxP > 0 && maxE > 0) return (previewScrollTop / maxP) * maxE;
        return editor!.getScrollTop();
      }
      let target = entries[0];
      for (const entry of entries) {
        if (entry.top <= previewScrollTop + 1) target = entry;
        else break;
      }
      const progressInBlock =
        target.height > 0
          ? Math.min(
              1,
              Math.max(0, (previewScrollTop - target.top) / target.height)
            )
          : 0;
      const blockLines = target.endLine - target.startLine;
      const targetLine = target.startLine + progressInBlock * blockLines;
      const model2 = editor!.getModel();
      const lineCount2 = model2 ? model2.getLineCount() : 1;
      const editorLineHeight2 =
        lineCount2 > 1 ? editor!.getScrollHeight() / lineCount2 : 22;
      return Math.max(0, (targetLine - 1) * editorLineHeight2);
    }

    // Smooth easing: instead of jumping the driven pane to the target, we
    // animate its scrollTop toward the target with an exponential lerp so
    // speed changes accelerate/decelerate smoothly. A single rAF loop runs
    // while the animated value hasn't caught up to the target.
    let rafEase = 0;
    let easeTarget: { get: () => number; set: (v: number) => void } | null =
      null;
    let easeAnimated = 0;

    function startEase(
      getTarget: () => number,
      apply: (v: number) => void,
      current: number
    ) {
      easeTarget = { get: getTarget, set: apply };
      easeAnimated = current;
      if (rafEase) return; // loop already running
      const tick = () => {
        if (!easeTarget) {
          rafEase = 0;
          return;
        }
        const goal = easeTarget.get();
        easeAnimated += (goal - easeAnimated) * 0.35;
        if (Math.abs(goal - easeAnimated) < 0.5) {
          easeAnimated = goal;
          easeTarget.set(goal);
          easeTarget = null;
          rafEase = 0;
          return;
        }
        easeTarget.set(easeAnimated);
        rafEase = requestAnimationFrame(tick);
      };
      rafEase = requestAnimationFrame(tick);
    }

    // Directional guard: only the OPPOSITE direction is suppressed, so a user
    // continuously scrolling one pane isn't blocked. `syncDir` = which pane is
    // currently driving; cleared on a short timer after activity stops.
    let syncDir: 'editor' | 'preview' | null = null;
    let syncDirTimer: ReturnType<typeof setTimeout> | null = null;
    function setSyncDir(dir: 'editor' | 'preview') {
      syncDir = dir;
      if (syncDirTimer) clearTimeout(syncDirTimer);
      syncDirTimer = setTimeout(() => {
        syncDir = null;
        syncDirTimer = null;
      }, 80);
    }

    // Initial measurement (after the preview has rendered its content).
    measureEntries();

    // Refresh measurements when the preview content/layout changes.
    const ro = new ResizeObserver(() => measureEntries());
    ro.observe(c);
    const reMeasure = () => requestAnimationFrame(measureEntries);
    c.addEventListener('scroll', reMeasure, { passive: true });

    // Monaco -> Preview: ease the preview toward the target.
    const disposable = editor.onDidScrollChange(() => {
      if (syncDir === 'preview') return;
      setSyncDir('editor');
      startEase(
        targetForPreview,
        v => {
          c.scrollTop = v;
        },
        c.scrollTop
      );
    });

    // Preview -> Monaco: ease the editor toward the target.
    const handlePreviewScroll = () => {
      if (syncDir === 'editor') return;
      setSyncDir('preview');
      startEase(
        targetForEditor,
        v => {
          editor!.setScrollTop(v);
        },
        editor!.getScrollTop()
      );
    };
    c.removeEventListener('scroll', reMeasure);
    c.addEventListener('scroll', handlePreviewScroll, { passive: true });
    c.addEventListener('scroll', reMeasure, { passive: true });

    return () => {
      disposable.dispose();
      c.removeEventListener('scroll', handlePreviewScroll);
      c.removeEventListener('scroll', reMeasure);
      ro.disconnect();
      if (rafEase) cancelAnimationFrame(rafEase);
      if (syncDirTimer) clearTimeout(syncDirTimer);
    };
  }, [editor, mode, previewScrollReady]);

  // Switches to a display mode and animates the resizable panels to match it.
  // Called directly from event handlers (toolbar clicks, drag-to-collapse,
  // double-click reset) rather than reactively from an effect, so the panel
  // animation is tied to the user action that caused it.
  const applyMode = (newMode: 'editor' | 'split' | 'preview') => {
    setMode(newMode);

    let targetSizes: Layout = { editor: 50, preview: 50 };
    if (newMode === 'editor') {
      targetSizes = { editor: 100, preview: 0 };
    } else if (newMode === 'preview') {
      targetSizes = { editor: 0, preview: 100 };
    }

    if (
      sizesRef.current.editor === targetSizes.editor &&
      sizesRef.current.preview === targetSizes.preview
    )
      return;

    cancelPanelTransitionRef.current?.();
    setIsTransitioning(true);

    // Delay setLayout slightly to let the transition classes render on the DOM first
    const timer = setTimeout(() => {
      if (panelGroupRef.current) {
        panelGroupRef.current.setLayout(targetSizes);
      }
      setSizes(targetSizes);
    }, 30);

    // Force Monaco editor layout smooth loop
    const startTime = performance.now();
    const duration = 200;

    let animationFrameId = 0;

    const animateLayout = () => {
      const currentEditor = editorRef.current;
      if (currentEditor) {
        currentEditor.layout();
      }
      const elapsed = performance.now() - startTime;
      if (elapsed < duration) {
        animationFrameId = requestAnimationFrame(animateLayout);
      } else {
        setIsTransitioning(false);
      }
    };

    animationFrameId = requestAnimationFrame(animateLayout);

    cancelPanelTransitionRef.current = () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrameId);
    };
  };

  // Cancel any in-flight panel transition on unmount
  useEffect(() => {
    return () => cancelPanelTransitionRef.current?.();
  }, []);

  // A side-by-side split is unusable on phone-width screens (the toolbar
  // hides the Split toggle below `sm`), so fall back to the editor pane
  // alone if a narrow viewport ever ends up in split mode (e.g. a layout
  // saved from a wider screen).
  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)');

    const coerceIfNarrow = () => {
      if (query.matches && modeRef.current === 'split') {
        applyMode('editor');
      }
    };

    coerceIfNarrow();
    query.addEventListener('change', coerceIfNarrow);
    return () => query.removeEventListener('change', coerceIfNarrow);
  }, []);

  // ResizablePanelGroup layout change event: triggered by user drags
  const handleLayout = (newLayout: Layout) => {
    if (isTransitioning) return;

    setSizes(newLayout);

    // Sync mode state with collapsed panes on manual drag finishes
    const editorSize = newLayout.editor ?? 50;
    const previewSize = newLayout.preview ?? 50;
    if (editorSize >= 99) {
      if (mode !== 'editor') applyMode('editor');
    } else if (previewSize >= 99) {
      if (mode !== 'preview') applyMode('preview');
    } else {
      if (mode !== 'split') applyMode('split');
    }
  };

  // Resets the resizable panels back to 50/50 and activates Split view
  const handleResetLayout = () => {
    applyMode('split');
  };

  // Single-click navigation handler: positions cursor in Monaco at the clicked block
  const handleSelectBlock = (offset: number) => {
    // If in preview mode, switch to split mode to show the editor
    if (modeRef.current === 'preview') {
      applyMode('split');
    }

    const currentEditor = editorRef.current;
    if (currentEditor) {
      const model = currentEditor.getModel();
      if (model) {
        const position = model.getPositionAt(offset);
        currentEditor.setPosition(position);
        currentEditor.revealPositionInCenter(position);
      }

      // Delay focus slightly to bypass browser click focus-stealing
      setTimeout(() => {
        currentEditor.focus();
      }, 20);
    }
  };

  const handleEditorMount = (editorInstance: editor.IStandaloneCodeEditor) => {
    setEditor(editorInstance);
    editorRef.current = editorInstance;
  };

  // ── Tab editing: update the active tab's content and dirty flag ────
  const handleEditorChange = (next: string) => {
    if (skipNextEditorChangeRef.current) {
      skipNextEditorChangeRef.current = false;
      return;
    }
    // Untitled buffer (no document tabs): write into the standalone buffer.
    if (openTabs.length === 0) {
      setUntitledContent(next);
      return;
    }
    setOpenTabs(prev =>
      prev.map(t =>
        t.id === activeTabId
          ? {
              ...t,
              content: next,
              isDirty: t.documentId ? true : t.isDirty,
              // Editing pins a preview tab (VS Code behavior).
              isPreview: false,
            }
          : t
      )
    );
  };

  // ── Tab bar handlers ────────────────────────────────────────────────
  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
  };

  const handleCloseTab = (id: string) => {
    const tab = openTabs.find(t => t.id === id);
    // Dirty tabs (cloud docs with unsaved edits, or kept Untitled buffers)
    // prompt a save confirmation before closing.
    if (tab && tab.isDirty) {
      setPendingClose(tab);
      return;
    }
    closeTabDirect(id);
  };

  const closeTabDirect = (id: string) => {
    setOpenTabs(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx === -1) return prev;
      const next = prev.filter(t => t.id !== id);
      // If we closed the active tab, switch to the nearest remaining one.
      if (activeTabId === id) {
        const fallback = next[Math.max(0, idx - 1)] ?? next[0] ?? null;
        setActiveTabId(fallback?.id ?? null);
      }
      return next;
    });
    // When all document tabs are closed, the untitled buffer (resolved from
    // `untitledContent`) takes over automatically.
  };

  // Save the pending-close tab's content, then close it.
  const confirmSaveAndClose = async () => {
    const tab = pendingClose;
    if (!tab) return;
    try {
      if (tab.documentId) {
        await updateDocument(tab.documentId, { content: tab.content });
      } else {
        // Untitled buffer: save as a new cloud document (no need to keep
        // the tab around — we're closing it).
        await createDocument({ name: 'Untitled', content: tab.content });
      }
      closeTabDirect(tab.id);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Failed to save');
    } finally {
      setPendingClose(null);
    }
  };

  // Close without saving.
  const confirmDiscardAndClose = () => {
    if (pendingClose) closeTabDirect(pendingClose.id);
    setPendingClose(null);
  };

  const handleNewTab = () => {
    // Create a new untitled cloud document and open it as a preview tab.
    createDocument({ name: 'Untitled', content: '' })
      .then(doc => {
        setOpenTabs(prev => [
          ...prev,
          {
            id: doc.id,
            name: doc.name,
            content: '',
            isDirty: false,
            syncStatus: 'synced',
            documentId: doc.id,
            isPreview: true,
          },
        ]);
        setActiveTabId(doc.id);
        navigate(`/d/${doc.id}`);
      })
      .catch(error => {
        toast.error(
          error instanceof ApiError
            ? error.message
            : 'Failed to create document'
        );
      });
  };

  const handleRenameTab = (id: string) => {
    const tab = openTabs.find(t => t.id === id);
    if (!tab || !tab.documentId) return;
    const next = window.prompt('Rename document', tab.name);
    if (!next || next.trim() === '' || next.trim() === tab.name) return;
    const trimmed = next.trim();
    setOpenTabs(prev =>
      prev.map(t => (t.id === id ? { ...t, name: trimmed } : t))
    );
    updateDocument(tab.documentId, { name: trimmed }).catch(error => {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to rename document'
      );
      setOpenTabs(prev =>
        prev.map(t => (t.id === id ? { ...t, name: tab.name } : t))
      );
    });
  };

  // ── Sidebar: open document from file tree ───────────────────────────
  const handleOpenDocument = (id: string) => {
    openDocumentTab(id);
    navigate(`/d/${id}`);
  };

  // ── Hidden file input for "Open File…" ──────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    // Load into the untitled buffer (closing any open document tabs).
    setUntitledContent(text);
    setOpenTabs([]);
    setActiveTabId(null);
    const ed = editorRef.current;
    if (ed) {
      skipNextEditorChangeRef.current = true;
      ed.setValue(text);
    }
    toast.success(`Loaded "${file.name}"`);
  };

  // ── Save / Save As / Rename / Export / Print ────────────────────────
  const handleSave = () => {
    if (!activeTab) return;
    if (activeTab.documentId) {
      updateDocument(activeTab.documentId, { content: activeTab.content })
        .then(() => {
          setOpenTabs(prev =>
            prev.map(t =>
              t.id === activeTab.id
                ? { ...t, syncStatus: 'synced', isDirty: false }
                : t
            )
          );
          toast.success('Saved');
        })
        .catch(error => {
          toast.error(
            error instanceof ApiError ? error.message : 'Failed to save'
          );
        });
    } else {
      // Untitled buffer: save as a new cloud document.
      createDocument({ name: 'Untitled', content: activeTab.content })
        .then(doc => {
          // Add the new cloud doc as a pinned (non-preview) tab.
          setOpenTabs(prev => [
            ...prev.filter(t => t.id !== activeTab.id),
            {
              id: doc.id,
              name: doc.name,
              content: doc.content,
              isDirty: false,
              syncStatus: 'synced',
              documentId: doc.id,
              isPreview: false,
            },
          ]);
          setActiveTabId(doc.id);
          setUntitledContent('');
          navigate(`/d/${doc.id}`);
          toast.success('Saved');
        })
        .catch(error => {
          toast.error(
            error instanceof ApiError ? error.message : 'Failed to save'
          );
        });
    }
  };

  const handleSaveAs = () => {
    if (!activeTab) return;
    const blob = new Blob([activeTab.content], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab.name || 'document'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRename = () => {
    if (activeTabId) handleRenameTab(activeTabId);
  };

  const handleExportPdf = async () => {
    const node = previewRef.current;
    if (!node) {
      toast.error('Preview content is not ready for export');
      return;
    }
    try {
      await exportNodeToPdfViaServer(node);
      toast.success('PDF exported');
    } catch (error) {
      console.error(error);
      toast.error((error as Error).toString());
    }
  };

  const handlePrint = async () => {
    const node = previewRef.current;
    if (!node) {
      toast.error('Preview content is not ready for export');
      return;
    }
    try {
      await print(node);
    } catch (error) {
      console.error(error);
      toast.error('Failed to print');
    }
  };

  // ── Edit actions (Monaco-triggered) ─────────────────────────────────
  const execEditorCommand = (command: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    ed.trigger('menubar', command, null);
  };

  // ── Format actions ────────────────────────────────────────────────
  const wrapSelection = (before: string, after: string = before) => {
    const ed = editorRef.current;
    if (!ed) return;
    const selection = ed.getSelection();
    const model = ed.getModel();
    if (!selection || !model) return;
    const selected = model.getValueInRange(selection);

    // Toggle: if the selection is already wrapped with the markers, unwrap.
    if (
      selected.startsWith(before) &&
      selected.endsWith(after) &&
      selected.length >= before.length + after.length
    ) {
      const unwrapped = selected.slice(
        before.length,
        selected.length - after.length
      );
      const startOffset = model.getOffsetAt(selection.getStartPosition());
      ed.executeEdits('format', [{ range: selection, text: unwrapped }]);
      // Select the unwrapped text so a repeat press re-wraps it.
      const newEnd = model.getPositionAt(startOffset + unwrapped.length);
      ed.setSelection({
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: newEnd.lineNumber,
        endColumn: newEnd.column,
      });
      return;
    }

    // No selection: insert empty markers and place the cursor between them.
    if (selected.length === 0) {
      ed.executeEdits('format', [
        { range: selection, text: `${before}${after}` },
      ]);
      const pos = selection.getStartPosition();
      ed.setPosition({
        lineNumber: pos.lineNumber,
        column: pos.column + before.length,
      });
      return;
    }

    const wrapped = `${before}${selected}${after}`;
    const startOffset = model.getOffsetAt(selection.getStartPosition());
    ed.executeEdits('format', [
      {
        range: selection,
        text: wrapped,
      },
    ]);
    // Select the wrapped content (including markers) so repeated presses toggle.
    const newEnd = model.getPositionAt(startOffset + wrapped.length);
    ed.setSelection({
      startLineNumber: selection.startLineNumber,
      startColumn: selection.startColumn,
      endLineNumber: newEnd.lineNumber,
      endColumn: newEnd.column,
    });
  };

  const insertAtCursor = (text: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    const selection = ed.getSelection();
    const model = ed.getModel();
    if (!selection || !model) return;
    ed.executeEdits('format', [
      {
        range: selection,
        text,
      },
    ]);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleSidebar = () => {
    setSidebarVisible(v => !v);
  };

  // ── About dialog ────────────────────────────────────────────────────
  const [aboutOpen, setAboutOpen] = useState(false);

  // ── Save-on-close confirmation ──────────────────────────────────────
  // When closing a tab with unsaved changes, prompt the user to save.
  const [pendingClose, setPendingClose] = useState<Tab | null>(null);

  // ── Menubar + keyboard shortcut actions ─────────────────────────────
  const actions: MenubarActions = useMemo(
    () => ({
      newDocument: handleNewTab,
      openFile: () => fileInputRef.current?.click(),
      save: handleSave,
      saveAs: handleSaveAs,
      exportPdf: handleExportPdf,
      print: handlePrint,
      rename: handleRename,
      undo: () => execEditorCommand('undo'),
      redo: () => execEditorCommand('redo'),
      find: () => execEditorCommand('actions.find'),
      replace: () => execEditorCommand('editor.action.startFindReplaceAction'),
      selectAll: () => execEditorCommand('editor.action.selectAll'),
      setMode: applyMode,
      toggleSidebar,
      toggleTheme,
      formatBold: () => wrapSelection('**'),
      formatItalic: () => wrapSelection('*'),
      formatStrikethrough: () => wrapSelection('~~'),
      insertLink: () => {
        const ed = editorRef.current;
        if (!ed) return;
        const selection = ed.getSelection();
        const model = ed.getModel();
        if (!selection || !model) return;
        const selected = model.getValueInRange(selection) || 'text';
        insertAtCursor(`[${selected}](url)`);
      },
      insertImage: () => {
        insertAtCursor('![alt text](url)');
      },
      insertCodeBlock: () => {
        insertAtCursor('\n```\n\n```\n');
      },
      insertTable: () => {
        insertAtCursor(
          '\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| | | |\n'
        );
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, openTabs, activeTabId, theme]
  );

  useKeyboardShortcuts({ actions, editorRef });

  return (
    <div className="flex h-svh flex-col select-none">
      <AppToolbar
        content={activeContent}
        onLoadContent={text => {
          // Load an .md file into the untitled buffer (closing any open
          // document tabs so the untitled buffer is visible).
          setUntitledContent(text);
          setOpenTabs([]);
          setActiveTabId(null);
          const ed = editorRef.current;
          if (ed) {
            skipNextEditorChangeRef.current = true;
            ed.setValue(text);
          }
        }}
        previewRef={previewRef}
        mode={mode}
        onModeChange={applyMode}
        selectedDocId={activeTab?.documentId ?? null}
        menubarActions={actions}
        platform={platform}
        sidebarVisible={sidebarVisible}
        onAbout={() => setAboutOpen(true)}
      />

      <TabBar
        tabs={displayTabs}
        activeTabId={
          activeTabId ?? (openTabs.length === 0 ? SCRATCH_TAB_ID : null)
        }
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onNewTab={handleNewTab}
        onRenameTab={handleRenameTab}
        sidebarVisible={sidebarVisible}
        onToggleSidebar={toggleSidebar}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="bg-background flex min-h-0 min-w-0 flex-1 select-text">
        {/* File sidebar — only when logged in */}
        {user && (
          <AnimatePresence initial={false}>
            {sidebarVisible && (
              <motion.div
                initial={{ width: SIDEBAR_COLLAPSED_WIDTH }}
                animate={{ width: SIDEBAR_WIDTH }}
                exit={{ width: SIDEBAR_COLLAPSED_WIDTH }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
                className="shrink-0"
              >
                <div style={{ width: SIDEBAR_WIDTH }} className="h-full">
                  <FileSidebar
                    selectedDocId={activeTab?.documentId ?? null}
                    onOpenDocument={handleOpenDocument}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Editor + Preview area */}
        <div className="bg-background min-h-0 min-w-0 flex-1 overflow-hidden">
          <ResizablePanelGroup
            ref={panelGroupRef}
            orientation="horizontal"
            defaultLayout={initialLayout}
            className="overflow-hidden"
            onLayoutChange={handleLayout}
          >
            {/* Left Panel: Editor */}
            <ResizablePanel
              id="editor"
              minSize={0}
              defaultSize={50}
              className="h-full min-w-0 overflow-hidden"
              data-transitioning={isTransitioning ? 'true' : undefined}
            >
              <div
                className="h-full min-w-0 overflow-hidden"
                onMouseEnter={() => {
                  activeScrollSourceRef.current = 'editor';
                }}
                onMouseLeave={() => {
                  if (activeScrollSourceRef.current === 'editor')
                    activeScrollSourceRef.current = null;
                }}
              >
                <MarkdownEditor
                  value={activeContent}
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle onDoubleClick={handleResetLayout} />

            {/* Right Panel: Preview */}
            <ResizablePanel
              id="preview"
              minSize={0}
              defaultSize={50}
              className="h-full min-w-0 overflow-hidden"
              data-transitioning={isTransitioning ? 'true' : undefined}
            >
              <div
                className="bg-muted/40 h-full min-w-0 overflow-hidden"
                onMouseEnter={() => {
                  activeScrollSourceRef.current = 'preview';
                }}
                onMouseLeave={() => {
                  if (activeScrollSourceRef.current === 'preview')
                    activeScrollSourceRef.current = null;
                }}
              >
                <MarkdownPreview
                  ref={previewRef}
                  content={deferredPreviewContent}
                  onSelectBlock={handleSelectBlock}
                  registerScrollContainer={registerPreviewScrollContainer}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {/* About dialog */}
      <AnimatePresence>
        {aboutOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAboutOpen(false)}
          >
            <motion.div
              className="bg-background text-foreground border-border w-80 rounded-lg border p-6 shadow-lg"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <img
                  src={theme === 'dark' ? '/icon.svg' : '/icon-light.svg'}
                  alt="ResoMD"
                  className="size-8"
                />
                <div>
                  <h2 className="text-base font-semibold">ResoMD</h2>
                  <p className="text-muted-foreground text-xs">
                    Markdown editor with live preview
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mt-4 text-sm">
                Write and preview Markdown with scroll sync, cloud documents,
                and PDF export.
              </p>
              <div className="mt-5 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAboutOpen(false)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save-on-close confirmation */}
      <Dialog
        open={pendingClose !== null}
        onOpenChange={open => {
          if (!open) setPendingClose(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Save changes?</DialogTitle>
            <DialogDescription>
              {pendingClose?.name ?? 'Untitled'} has unsaved changes. Save
              before closing?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingClose(null)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={confirmDiscardAndClose}>
              Don't save
            </Button>
            <Button onClick={confirmSaveAndClose}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

export default App;
