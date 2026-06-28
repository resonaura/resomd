import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

import { useResolvedTheme } from '@/components/theme/provider';
import { Spinner } from '@/components/ui/spinner';
import githubLightTheme from '@/assets/monaco-themes/github-light.json';
import githubDarkTheme from '@/assets/monaco-themes/github-dark.json';

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

  const handleMount: OnMount = editor => {
    editor.updateOptions({ tabSize: 2 });
    editor.focus();
    if (onMount) {
      onMount(editor);
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
        automaticLayout: true,
      }}
    />
  );
}
export default MarkdownEditor;
