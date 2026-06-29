import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEffect, useRef } from 'react';

import githubDarkTheme from '@/assets/monaco-themes/github-dark.json';
import githubLightTheme from '@/assets/monaco-themes/github-light.json';
import { useResolvedTheme } from '@/components/theme/provider';
import { Spinner } from '@/components/ui/spinner';

export const GITHUB_LIGHT_THEME = 'github-light';
export const GITHUB_DARK_THEME = 'github-dark';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
}

const FONT_FAMILY =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

export function MarkdownEditor({
  value,
  onChange,
  onMount,
}: MarkdownEditorProps) {
  const resolvedTheme = useResolvedTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeRafRef = useRef(0);

  // Manual, debounced layout instead of Monaco's `automaticLayout: true`.
  // automaticLayout uses a ResizeObserver that can enter a feedback loop with
  // the animated resizable panels (layout changes container size -> observer
  // fires -> layout() -> ...), which manifested as the editor growing without
  // bound in editor-only mode. We observe the wrapper and relayout on a frame,
  // which breaks the loop while staying responsive.
  useEffect(() => {
    return () => {
      cancelAnimationFrame(resizeRafRef.current);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, []);

  const handleMount: OnMount = editorInstance => {
    editorRef.current = editorInstance;
    editorInstance.updateOptions({ tabSize: 2 });
    editorInstance.focus();

    const wrapperEl = editorInstance.getDomNode()?.parentElement ?? null;
    if (wrapperEl) {
      const relayout = () => {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = requestAnimationFrame(() => {
          editorRef.current?.layout();
        });
      };
      const observer = new ResizeObserver(relayout);
      observer.observe(wrapperEl);
      resizeObserverRef.current = observer;
    }

    if (onMount) {
      onMount(editorInstance);
    }
  };

  const handleBeforeMount: BeforeMount = monaco => {
    monaco.editor.defineTheme(
      GITHUB_LIGHT_THEME,
      githubLightTheme as unknown as editor.IStandaloneThemeData
    );
    monaco.editor.defineTheme(
      GITHUB_DARK_THEME,
      githubDarkTheme as unknown as editor.IStandaloneThemeData
    );
  };

  return (
    <Editor
      height="100%"
      language="markdown"
      value={value}
      onChange={next => onChange(next ?? '')}
      onMount={handleMount}
      beforeMount={handleBeforeMount}
      theme={resolvedTheme === 'dark' ? GITHUB_DARK_THEME : GITHUB_LIGHT_THEME}
      loading={<Spinner className="text-primary/80 size-8" />}
      options={{
        wordWrap: 'on',
        minimap: { enabled: false },
        fontSize: 13.5,
        lineHeight: 22,
        fontFamily: FONT_FAMILY,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        renderLineHighlight: 'line',
        padding: { top: 16, bottom: 16 },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        wrappingStrategy: 'advanced',
        automaticLayout: false,
      }}
    />
  );
}
export default MarkdownEditor;
