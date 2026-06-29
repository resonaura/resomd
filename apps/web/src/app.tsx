import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { GroupImperativeHandle, Layout } from 'react-resizable-panels';
import type { editor } from 'monaco-editor';
import { toast } from 'sonner';

import { FileSidebar } from '@/components/file-sidebar';
import { AppToolbar } from '@/components/toolbar';
import { MarkdownEditor } from '@/components/markdown/editor';
import { MarkdownPreview } from '@/components/markdown/preview';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Toaster } from '@/components/ui/sonner';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getDocument, updateDocument } from '@/lib/files-api';
import { useDocumentTitle } from '@/lib/use-document-title';
import type { SyncStatus } from '@/lib/sync-status';

const AUTOSAVE_DELAY_MS = 1000;

const STORAGE_KEY_CONTENT = 'resomd:content';
const STORAGE_KEY_MODE = 'resomd:mode';

function loadInitialContent() {
  return localStorage.getItem(STORAGE_KEY_CONTENT) ?? '';
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

export function App() {
  const { user } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [content, setContent] = useState(loadInitialContent);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewScrollContainerRef = useRef<HTMLDivElement>(null);
  const panelGroupRef = useRef<GroupImperativeHandle>(null);

  // Editor state and mutable ref to bypass react-markdown closure caches
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(
    null
  );
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

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

  // Track layout transition states to apply CSS animation classes only when switching modes
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track which panel is actively hovered to synchronize scroll smoothly
  const activeScrollSourceRef = useRef<'editor' | 'preview' | null>(null);
  const scrollSyncLockRef = useRef(false);
  const scrollSyncLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Cancels the in-flight panel-resize animation, if any, before starting a new one
  const cancelPanelTransitionRef = useRef<(() => void) | null>(null);

  // Cloud document sync: when opened via /d/:documentId the editor loads and
  // autosaves a server-backed document instead of the local-only scratch buffer.
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [docName, setDocName] = useState<string | null>(null);
  useDocumentTitle(docName ?? undefined);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const skipNextAutosaveRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    let isCancelled = false;
    skipNextAutosaveRef.current = true;
    getDocument(documentId)
      .then(document => {
        if (isCancelled) return;
        setContent(document.content);
        setDocName(document.name);
        setSyncStatus('synced');
      })
      .catch(error => {
        if (isCancelled) return;
        toast.error(
          error instanceof ApiError ? error.message : 'Failed to open document'
        );
        navigate('/files');
      });

    return () => {
      isCancelled = true;
    };
  }, [documentId, navigate]);

  useEffect(() => {
    if (!documentId) {
      localStorage.setItem(STORAGE_KEY_CONTENT, content);
      return;
    }

    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }

    setSyncStatus('saving');
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      updateDocument(documentId, { content })
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('error'));
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [content, documentId]);

  // Persist view mode setting in localStorage and update ref on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MODE, mode);
    modeRef.current = mode;
  }, [mode]);

  // Block-based scroll sync between editor and preview.
  //
  // Instead of a simple proportional ratio, we map the editor's top-visible
  // line to the corresponding preview DOM element (via data-sourcepos
  // attributes) and scroll the preview so that element is at the same
  // relative position. This handles cases where a single markdown line
  // (e.g. an image reference) renders as a tall block in the preview.
  useEffect(() => {
    if (!editor || mode !== 'split') return;

    const previewContainer = previewScrollContainerRef.current;
    if (!previewContainer) return;

    const container = previewContainer; // non-null alias for closures

    /**
     * Collect all elements with data-sourcepos in the preview, sorted by
     * their position in the document. Each entry has the source line range
     * and the element's offsetTop relative to the scroll container.
     */
    function getSourcePosElements() {
      const els = container.querySelectorAll<HTMLElement>('[data-sourcepos]');
      const entries: {
        startLine: number;
        endLine: number;
        offsetTop: number;
        height: number;
      }[] = [];
      els.forEach(el => {
        const pos = el.getAttribute('data-sourcepos');
        if (!pos) return;
        // Format: "startLine:startCol-endLine:endCol"
        const match = pos.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
        if (!match) return;
        const startLine = parseInt(match[1], 10);
        const endLine = parseInt(match[3], 10);
        entries.push({
          startLine,
          endLine,
          offsetTop: el.offsetTop,
          height: el.offsetHeight,
        });
      });
      entries.sort((a, b) => a.startLine - b.startLine);
      return entries;
    }

    /**
     * Given the editor's top-visible line number, find the corresponding
     * preview element and scroll to it with proportional offset within
     * the block.
     */
    function syncPreviewToEditor() {
      if (scrollSyncLockRef.current) return;
      if (activeScrollSourceRef.current !== 'editor') return;

      const editorScrollTop = editor!.getScrollTop();
      // Derive line height from the editor's font info — lineHeight is set
      // to 22 in options, but we compute it dynamically to stay accurate.
      const model = editor!.getModel();
      const lineCount = model ? model.getLineCount() : 1;
      const editorLineHeight =
        lineCount > 1 ? editor!.getScrollHeight() / lineCount : 22;
      const topLine = Math.floor(editorScrollTop / editorLineHeight) + 1;

      const entries = getSourcePosElements();
      if (entries.length === 0) {
        // Fallback to proportional sync if no sourcepos elements
        const maxEditor =
          editor!.getScrollHeight() - editor!.getLayoutInfo().height;
        const maxPreview = container.scrollHeight - container.clientHeight;
        if (maxEditor > 0 && maxPreview > 0) {
          container.scrollTop = (editorScrollTop / maxEditor) * maxPreview;
        }
        return;
      }

      // Find the block that contains the top-visible line
      let target = entries[0];
      for (const entry of entries) {
        if (entry.startLine <= topLine) {
          target = entry;
        } else {
          break;
        }
      }

      // Calculate proportional position within the block
      const blockStartLine = target.startLine;
      const blockEndLine = target.endLine;
      const lineInBlock = Math.min(topLine, blockEndLine);
      const blockProgress =
        blockEndLine > blockStartLine
          ? (lineInBlock - blockStartLine) / (blockEndLine - blockStartLine)
          : 0;

      // Scroll the preview to the same proportional position within the block
      const targetScrollTop = target.offsetTop + blockProgress * target.height;
      // Clamp to visible range
      const maxPreviewScroll = container.scrollHeight - container.clientHeight;
      container.scrollTop = Math.min(targetScrollTop, maxPreviewScroll);
    }

    /**
     * Given the preview's scroll position, find the top-visible sourcepos
     * element and scroll the editor to the corresponding line.
     */
    function syncEditorToPreview() {
      if (scrollSyncLockRef.current) return;
      if (activeScrollSourceRef.current !== 'preview') return;

      const previewScrollTop = container.scrollTop;
      const entries = getSourcePosElements();
      if (entries.length === 0) {
        // Fallback to proportional
        const maxPreview = container.scrollHeight - container.clientHeight;
        const maxEditor =
          editor!.getScrollHeight() - editor!.getLayoutInfo().height;
        if (maxPreview > 0 && maxEditor > 0) {
          editor!.setScrollTop((previewScrollTop / maxPreview) * maxEditor);
        }
        return;
      }

      // Find the block whose top is closest to (but above) the preview scroll position
      let target = entries[0];
      for (const entry of entries) {
        if (entry.offsetTop <= previewScrollTop + 5) {
          target = entry;
        } else {
          break;
        }
      }

      // Calculate how far into the block we are
      const progressInBlock =
        target.height > 0
          ? Math.min(
              1,
              Math.max(0, (previewScrollTop - target.offsetTop) / target.height)
            )
          : 0;

      // Map to editor line
      const blockLines = target.endLine - target.startLine;
      const targetLine = target.startLine + progressInBlock * blockLines;
      const model2 = editor!.getModel();
      const lineCount2 = model2 ? model2.getLineCount() : 1;
      const editorLineHeight2 =
        lineCount2 > 1 ? editor!.getScrollHeight() / lineCount2 : 22;
      editor!.setScrollTop((targetLine - 1) * editorLineHeight2);
    }

    // Lock mechanism to prevent feedback loops
    function lockSync() {
      scrollSyncLockRef.current = true;
      if (scrollSyncLockTimerRef.current)
        clearTimeout(scrollSyncLockTimerRef.current);
      scrollSyncLockTimerRef.current = setTimeout(() => {
        scrollSyncLockRef.current = false;
      }, 80);
    }

    // Monaco -> Preview
    let rafEditor = 0;
    const disposable = editor.onDidScrollChange(() => {
      if (activeScrollSourceRef.current !== 'editor') return;
      cancelAnimationFrame(rafEditor);
      rafEditor = requestAnimationFrame(() => {
        lockSync();
        syncPreviewToEditor();
      });
    });

    // Preview -> Monaco
    let rafPreview = 0;
    const handlePreviewScroll = () => {
      if (activeScrollSourceRef.current !== 'preview') return;
      cancelAnimationFrame(rafPreview);
      rafPreview = requestAnimationFrame(() => {
        lockSync();
        syncEditorToPreview();
      });
    };

    container.addEventListener('scroll', handlePreviewScroll, {
      passive: true,
    });

    return () => {
      disposable.dispose();
      container.removeEventListener('scroll', handlePreviewScroll);
      cancelAnimationFrame(rafEditor);
      cancelAnimationFrame(rafPreview);
      if (scrollSyncLockTimerRef.current)
        clearTimeout(scrollSyncLockTimerRef.current);
    };
  }, [editor, mode]);

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
      sizes.editor === targetSizes.editor &&
      sizes.preview === targetSizes.preview
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div className="flex h-svh flex-col select-none">
      <AppToolbar
        content={content}
        onLoadContent={setContent}
        previewRef={previewRef}
        mode={mode}
        onModeChange={applyMode}
        docName={documentId ? docName : null}
        syncStatus={documentId ? syncStatus : 'idle'}
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible(v => !v)}
        selectedDocId={documentId ?? null}
      />

      <div className="bg-background flex min-h-0 flex-1 select-text">
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
                  <FileSidebar selectedDocId={documentId ?? null} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Editor + Preview area */}
        <div className="bg-background min-h-0 flex-1">
          <ResizablePanelGroup
            ref={panelGroupRef}
            orientation="horizontal"
            defaultLayout={sizes}
            onLayoutChange={handleLayout}
          >
            {/* Left Panel: Editor */}
            <ResizablePanel
              id="editor"
              minSize={0}
              defaultSize={50}
              className="h-full overflow-hidden"
              data-transitioning={isTransitioning ? 'true' : undefined}
            >
              <div
                className="h-full overflow-hidden"
                onMouseEnter={() => {
                  activeScrollSourceRef.current = 'editor';
                }}
                onMouseLeave={() => {
                  if (activeScrollSourceRef.current === 'editor')
                    activeScrollSourceRef.current = null;
                }}
              >
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
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
              className="h-full overflow-hidden"
              data-transitioning={isTransitioning ? 'true' : undefined}
            >
              <div
                className="bg-muted/40 h-full overflow-hidden"
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
                  content={content}
                  onSelectBlock={handleSelectBlock}
                  registerScrollContainer={el => {
                    previewScrollContainerRef.current = el;
                  }}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <Toaster />
    </div>
  );
}

export default App;
