import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { GroupImperativeHandle, Layout } from 'react-resizable-panels';
import type { editor } from 'monaco-editor';
import { toast } from 'sonner';

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
import { getDocument, updateDocument } from '@/lib/files-api';
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

export function App() {
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

  // Cancels the in-flight panel-resize animation, if any, before starting a new one
  const cancelPanelTransitionRef = useRef<(() => void) | null>(null);

  // Cloud document sync: when opened via /d/:documentId the editor loads and
  // autosaves a server-backed document instead of the local-only scratch buffer.
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [docName, setDocName] = useState<string | null>(null);
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

  // Synchronize scrolling between left pane and right pane
  useEffect(() => {
    if (!editor || mode !== 'split') return;

    const previewContainer = previewScrollContainerRef.current;
    if (!previewContainer) return;

    // Monaco -> Preview scroll sync
    const disposable = editor.onDidScrollChange(() => {
      if (activeScrollSourceRef.current !== 'editor') return;

      const editorScrollHeight = editor.getScrollHeight();
      const editorClientHeight = editor.getLayoutInfo().height;
      const editorScrollTop = editor.getScrollTop();
      const maxEditorScroll = editorScrollHeight - editorClientHeight;

      if (maxEditorScroll > 0) {
        const ratio = editorScrollTop / maxEditorScroll;
        const maxPreviewScroll =
          previewContainer.scrollHeight - previewContainer.clientHeight;
        previewContainer.scrollTop = ratio * maxPreviewScroll;
      }
    });

    // Preview -> Monaco scroll sync
    const handlePreviewScroll = () => {
      if (activeScrollSourceRef.current !== 'preview') return;

      const maxPreviewScroll =
        previewContainer.scrollHeight - previewContainer.clientHeight;
      if (maxPreviewScroll > 0) {
        const ratio = previewContainer.scrollTop / maxPreviewScroll;
        const editorScrollHeight = editor.getScrollHeight();
        const editorClientHeight = editor.getLayoutInfo().height;
        const maxEditorScroll = editorScrollHeight - editorClientHeight;
        editor.setScrollTop(ratio * maxEditorScroll);
      }
    };

    previewContainer.addEventListener('scroll', handlePreviewScroll, {
      passive: true,
    });

    return () => {
      disposable.dispose();
      previewContainer.removeEventListener('scroll', handlePreviewScroll);
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
    console.log(
      'handleSelectBlock: offset =',
      offset,
      'editor =',
      !!editorRef.current
    );
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
    } else {
      console.warn('handleSelectBlock: editor instance is missing!');
    }
  };

  const handleEditorMount = (editorInstance: editor.IStandaloneCodeEditor) => {
    console.log('handleEditorMount: editorInstance =', !!editorInstance);
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
      />

      <div className="bg-background min-h-0 flex-1 select-text">
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
              ref={previewScrollContainerRef}
              className="bg-muted/40 h-full overflow-y-auto"
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
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <Toaster />
    </div>
  );
}

export default App;
