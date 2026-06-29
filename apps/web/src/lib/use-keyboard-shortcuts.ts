import { useEffect, useRef } from 'react';

import { matchesShortcut } from '@/lib/platform';
import type { editor } from 'monaco-editor';

export interface ShortcutActions {
  // File
  newDocument: () => void;
  openFile: () => void;
  save: () => void;
  saveAs: () => void;
  exportPdf: () => void;
  print: () => void;
  rename: () => void;
  // Format
  formatBold: () => void;
  formatItalic: () => void;
  formatStrikethrough: () => void;
  insertLink: () => void;
  insertImage: () => void;
  insertCodeBlock: () => void;
  insertTable: () => void;
  // View
  setMode: (mode: 'editor' | 'split' | 'preview') => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
}

export interface UseKeyboardShortcutsOptions {
  actions: ShortcutActions;
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>;
}

/**
 * Shortcuts that Monaco handles internally and we should NOT intercept.
 * These are listed here so we can skip them in our global handler.
 */
const MONACO_SHORTCUTS = [
  'mod+z', // undo
  'mod+shift+z', // redo (Mac / some Windows)
  'mod+y', // redo (Windows)
  'mod+f', // find
  'mod+alt+f', // replace (Mac)
  'mod+h', // replace (Windows)
  'mod+a', // select all
];

/**
 * Returns true if the event target is an editable element (input, textarea,
 * select, or contenteditable). Monaco's textarea is excluded — it uses a
 * specific class and role that we check for.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) return true;

  // Monaco uses a <textarea> with class "monaco-editor" ancestor
  // and role="textbox" — we want to allow shortcuts there.
  const monacoTextarea = target.closest('.monaco-editor');
  if (monacoTextarea) return false;

  const editableParent = target.closest(
    "input, textarea, select, [contenteditable='true']"
  );
  return editableParent !== null;
}

/**
 * Returns true if focus is currently inside the Monaco editor.
 */
function isEditorFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  return !!active.closest('.monaco-editor');
}

export function useKeyboardShortcuts({
  actions,
  editorRef,
}: UseKeyboardShortcutsOptions) {
  // Keep the latest actions in a ref so the global keydown listener can stay
  // subscribed for the lifetime of the component. Re-subscribing on every
  // `actions` change (which happens on every keystroke because the editor
  // content changes) caused shortcuts to be dropped intermittently.
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const a = actionsRef.current;

      const editorFocused = isEditorFocused();
      const inEditable = isEditableTarget(event.target);

      // Let Monaco handle its own built-in shortcuts
      for (const spec of MONACO_SHORTCUTS) {
        if (matchesShortcut(event, spec)) return;
      }

      // ── Format shortcuts (only when editor is focused) ──
      if (editorFocused) {
        if (matchesShortcut(event, 'mod+b')) {
          event.preventDefault();
          a.formatBold();
          return;
        }
        if (matchesShortcut(event, 'mod+i')) {
          event.preventDefault();
          a.formatItalic();
          return;
        }
        if (matchesShortcut(event, 'mod+k')) {
          event.preventDefault();
          a.insertLink();
          return;
        }
      }

      // ── Shortcuts that should be ignored in input fields ──
      if (inEditable) return;

      // File
      if (matchesShortcut(event, 'mod+n')) {
        event.preventDefault();
        a.newDocument();
        return;
      }
      if (matchesShortcut(event, 'mod+o')) {
        event.preventDefault();
        a.openFile();
        return;
      }
      if (matchesShortcut(event, 'mod+s')) {
        event.preventDefault();
        a.save();
        return;
      }
      if (matchesShortcut(event, 'mod+shift+s')) {
        event.preventDefault();
        a.saveAs();
        return;
      }
      if (matchesShortcut(event, 'mod+p')) {
        event.preventDefault();
        a.print();
        return;
      }

      // View
      if (matchesShortcut(event, 'mod+1')) {
        event.preventDefault();
        a.setMode('editor');
        return;
      }
      if (matchesShortcut(event, 'mod+2')) {
        event.preventDefault();
        a.setMode('split');
        return;
      }
      if (matchesShortcut(event, 'mod+3')) {
        event.preventDefault();
        a.setMode('preview');
        return;
      }
      if (matchesShortcut(event, 'mod+b')) {
        // ⌘B / Ctrl+B when NOT in editor → toggle sidebar
        event.preventDefault();
        a.toggleSidebar();
        return;
      }
      if (matchesShortcut(event, 'mod+d')) {
        event.preventDefault();
        a.toggleTheme();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorRef]);
}
