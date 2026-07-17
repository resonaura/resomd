/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import ReactMarkdown, {
  type Components,
  type ExtraProps,
} from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import remarkGithubBlockquoteAlert from 'remark-github-blockquote-alert';

import { rehypeLobehubEmoji } from '@/lib/emoji-rehype';
import { isAsciiDiagram, asciiToMermaid } from '@/lib/ascii-diagram';
import { useResolvedTheme } from '@/components/theme/provider';

// NOTE: github.css is intentionally NOT imported here.
// Light mode syntax colors are defined in index.css (.hljs rules),
// and dark mode overrides live in .dark .hljs rules there too.

interface MarkdownPreviewProps {
  content: string;
  onSelectBlock?: (offset: number) => void;
  /** Receives the preview scroll container element for scroll-sync. */
  registerScrollContainer?: (el: HTMLDivElement | null) => void;
  /** Receives a function that can programmatically scroll the preview. */
  registerScrollTo?: (fn: ((ratio: number) => void) | null) => void;
  /** Called when the preview is scrolled by the user. */
  onScrollRatio?: (ratio: number) => void;
}

// Translate character offsets from the processed string (which has longer logo tags)
// back to the original Markdown content string offsets.
function getOriginalOffsets(processedText: string, start: number, end: number) {
  const textBeforeStart = processedText.slice(0, start);
  const matchesBefore = textBeforeStart.match(/!\[RSNRA\]\(rsnra-logo\)/g);
  const n = matchesBefore ? matchesBefore.length : 0;

  const textInside = processedText.slice(start, end);
  const matchesInside = textInside.match(/!\[RSNRA\]\(rsnra-logo\)/g);
  const m = matchesInside ? matchesInside.length : 0;

  const shift = 12; // difference in length: 19 - 7

  return {
    start: start - n * shift,
    end: end - (n + m) * shift,
  };
}

/** Render Mermaid diagrams after each content update. */
/** Self-contained Mermaid diagram renderer component with theme reactive updates. */
const MermaidChart = ({ codeStr }: { codeStr: string }) => {
  const [svg, setSvg] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';
  const chartId = React.useId().replace(/[^a-zA-Z0-9-]/g, 'id');

  useEffect(() => {
    let active = true;
    const render = async () => {
      let mermaid;
      try {
        mermaid = (await import('mermaid')).default;
      } catch (err) {
        if (active) setError(String(err));
        return;
      }

      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        securityLevel: 'loose',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
        flowchart: {
          curve: 'linear', // straight segments — consistent rounding via CSS stroke-linejoin: round
          htmlLabels: true, // HTML labels: enables CSS Flexbox centering
          padding: 20,
          nodeSpacing: 32,
          rankSpacing: 34,
          useMaxWidth: true,
          diagramPadding: 12,
        },
        themeVariables: {
          background: isDark ? '#09090b' : '#ffffff',
          primaryColor: isDark ? '#0d2137' : '#e8f2ff',
          primaryTextColor: '#ffffff',
          primaryBorderColor: isDark ? '#0a84ff' : '#007aff',
          lineColor: isDark ? '#666666' : '#999999',
          edgeLabelBackground: isDark ? '#09090b' : '#f5f5f7',
          titleColor: '#ffffff',
          textColor: isDark ? '#f5f5f7' : '#1d1d1f',
          labelTextColor: isDark ? '#f5f5f7' : '#1d1d1f',
          nodeTextColor: '#ffffff',
        },
      });

      try {
        // Render using a clean, alphanumeric ID starting with a letter
        const { svg: renderedSvg } = await mermaid.render(
          `chart-${chartId}`,
          codeStr
        );
        if (active) {
          // Scale down the SVG's physical dimensions so the layout box shrinks too.
          // CSS transform: scale() was leaving blank space because it doesn't affect flow layout.
          const scaledSvg = renderedSvg.replace(
            /(<svg[^>]*?)\s+width="([^"]+)"\s+height="([^"]+)"/,
            (_match, prefix, w, h) => {
              const origW = parseFloat(w);
              const origH = parseFloat(h);
              // If it's a tall vertical linear-like diagram, scale it down more (0.48)
              // so it doesn't take massive vertical space and matches the visual font size of wider diagrams.
              const isTall = origH / origW > 1.6 && origH > 300;
              const factor = isTall ? 0.48 : 0.75;
              const newW = (origW * factor).toFixed(1);
              const newH = (origH * factor).toFixed(1);
              return `${prefix} width="${newW}" height="${newH}"`;
            }
          );
          setSvg(scaledSvg);
          setError('');
        }
      } catch (err) {
        if (active) {
          setError(String(err));
          setSvg('');
        }
      }
    };

    render();
    return () => {
      active = false;
    };
  }, [codeStr, isDark, chartId]);

  if (error) {
    return (
      <div className="mermaid-chart text-destructive bg-destructive/10 flex items-center justify-center rounded-lg p-4 text-xs">
        [Diagram error: {error}]
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="mermaid-chart text-muted-foreground flex items-center justify-center p-8 text-sm">
        Loading diagram...
      </div>
    );
  }

  return (
    <div className="mermaid-chart" dangerouslySetInnerHTML={{ __html: svg }} />
  );
};

export const MarkdownPreview = forwardRef<HTMLDivElement, MarkdownPreviewProps>(
  function MarkdownPreview(
    {
      content,
      onSelectBlock,
      registerScrollContainer,
      registerScrollTo,
      onScrollRatio,
    },
    ref
  ) {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    // Pre-process [RSNRA] tag to markdown image syntax
    const processedContent = content.replace(
      /\[RSNRA\]/g,
      '![RSNRA](rsnra-logo)'
    );

    // Register the scroll container and scroll-to function with the parent
    useEffect(() => {
      if (registerScrollContainer) {
        registerScrollContainer(scrollContainerRef.current);
      }
      return () => {
        if (registerScrollContainer) registerScrollContainer(null);
      };
    }, [registerScrollContainer]);

    useEffect(() => {
      if (!registerScrollTo) return;
      registerScrollTo((ratio: number) => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const max = el.scrollHeight - el.clientHeight;
        if (max > 0) el.scrollTop = ratio * max;
      });
      return () => registerScrollTo(null);
    }, [registerScrollTo]);

    // Report scroll ratio to parent for editor sync
    useEffect(() => {
      if (!onScrollRatio) return;
      const el = scrollContainerRef.current;
      if (!el) return;
      let raf = 0;
      const handler = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const max = el.scrollHeight - el.clientHeight;
          if (max > 0) onScrollRatio(el.scrollTop / max);
        });
      };
      el.addEventListener('scroll', handler, { passive: true });
      return () => {
        el.removeEventListener('scroll', handler);
        cancelAnimationFrame(raf);
      };
    }, [onScrollRatio]);

    // Click block handler to position Monaco cursor on the left editor
    const handleClickBlock = useCallback(
      (node: ExtraProps['node'], e: React.MouseEvent) => {
        e.preventDefault();
        const start = node?.position?.start?.offset;
        const end = node?.position?.end?.offset;
        if (start !== undefined && end !== undefined && onSelectBlock) {
          e.stopPropagation();
          // Correct the offsets to match the original content string
          const orig = getOriginalOffsets(processedContent, start, end);
          onSelectBlock(orig.start);
        }
      },
      [processedContent, onSelectBlock]
    );

    // Helper: the source line where a markdown node starts, for scroll sync.
    const sourceLine = (node: ExtraProps['node']): number | undefined =>
      node?.position?.start?.line;

    const markdownComponents: Components = {
      table: ({
        node,
        children,
      }: {
        node?: ExtraProps['node'];
        children?: ReactNode;
      }) => (
        <div
          className="markdown-table-wrapper"
          data-source-line={sourceLine(node)}
        >
          <table>{children}</table>
        </div>
      ),
      img: ({ node, src, alt, ...props }) => {
        if (alt === 'RSNRA' || src === 'rsnra-logo') {
          return (
            <span className="rsnra-logo-container mx-1 inline-flex -translate-y-[0.06em] items-center align-middle select-none">
              <img
                src="/icon-light.svg"
                alt="RSNRA Logo"
                className="rsnra-logo-img h-[1.1em] w-auto dark:hidden"
              />
              <img
                src="/icon.svg"
                alt="RSNRA Logo"
                className="rsnra-logo-img hidden h-[1.1em] w-auto dark:inline-block"
              />
            </span>
          );
        }
        return (
          <img
            src={src}
            alt={alt}
            data-source-line={sourceLine(node)}
            {...props}
          />
        );
      },
      // Custom code block renderer — handles Mermaid and ASCII diagrams
      code: ({ node: _node, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className ?? '');
        const lang = match?.[1] ?? '';
        const codeStr = String(children).replace(/\n$/, '');

        // Explicit mermaid language tag
        if (lang === 'mermaid') {
          return <MermaidChart codeStr={codeStr} />;
        }

        // No language specified — check if it's an ASCII diagram
        if (!lang && isAsciiDiagram(codeStr)) {
          const mermaidSrc = asciiToMermaid(codeStr);
          if (mermaidSrc) {
            return <MermaidChart codeStr={mermaidSrc} />;
          }
        }

        // Regular code — delegate to rehype-highlight via className passthrough
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      // Task list items — render as checkbox-style list items
      li: ({ node, children, className, ...props }) => {
        const isTaskItem = className?.includes('task-list-item');

        if (isTaskItem) {
          return (
            <li
              className={`markdown-task-item ${className || ''}`}
              data-source-line={sourceLine(node)}
              onClick={e => handleClickBlock(node, e)}
              {...props}
            >
              {children}
            </li>
          );
        }

        return (
          <li
            className={className}
            data-source-line={sourceLine(node)}
            onClick={e => handleClickBlock(node, e)}
            {...props}
          >
            {children}
          </li>
        );
      },
      p: ({ node, children, className, ...props }) => (
        <p
          className={className}
          data-source-line={sourceLine(node)}
          onClick={e => handleClickBlock(node, e)}
          {...props}
        >
          {children}
        </p>
      ),
      h1: ({ node, children, className, ...props }) => (
        <h1
          className={className}
          data-source-line={sourceLine(node)}
          onClick={e => handleClickBlock(node, e)}
          {...props}
        >
          {children}
        </h1>
      ),
      h2: ({ node, children, className, ...props }) => (
        <h2
          className={className}
          data-source-line={sourceLine(node)}
          onClick={e => handleClickBlock(node, e)}
          {...props}
        >
          {children}
        </h2>
      ),
      h3: ({ node, children, className, ...props }) => (
        <h3
          className={className}
          data-source-line={sourceLine(node)}
          onClick={e => handleClickBlock(node, e)}
          {...props}
        >
          {children}
        </h3>
      ),
      h4: ({ node, children, className, ...props }) => (
        <h4
          className={className}
          data-source-line={sourceLine(node)}
          onClick={e => handleClickBlock(node, e)}
          {...props}
        >
          {children}
        </h4>
      ),
      h5: ({ node, children, className, ...props }) => (
        <h5
          className={className}
          data-source-line={sourceLine(node)}
          onClick={e => handleClickBlock(node, e)}
          {...props}
        >
          {children}
        </h5>
      ),
      h6: ({ node, children, className, ...props }) => (
        <h6
          className={className}
          data-source-line={sourceLine(node)}
          onClick={e => handleClickBlock(node, e)}
          {...props}
        >
          {children}
        </h6>
      ),
      blockquote: ({ node, children, className, ...props }) => (
        <blockquote
          className={className}
          data-source-line={sourceLine(node)}
          onClick={e => handleClickBlock(node, e)}
          {...props}
        >
          {children}
        </blockquote>
      ),
      pre: ({ node, children, className, ...props }) => {
        // If the child is a mermaid chart or has data-mermaid-src, render it directly without <pre>
        const childArray = React.Children.toArray(children);
        const hasMermaid = childArray.some(
          child =>
            React.isValidElement<{ className?: string; 'data-mermaid-src'?: string }>(child) &&
            (child.props.className === 'mermaid-chart' ||
              child.props['data-mermaid-src'] !== undefined)
        );

        if (hasMermaid) {
          return <>{children}</>;
        }

        return (
          <pre
            className={className}
            data-source-line={sourceLine(node)}
            onClick={e => handleClickBlock(node, e)}
            {...props}
          >
            {children}
          </pre>
        );
      },
      // Render input checkboxes for task lists as disabled checkboxes
      input: ({ checked, ...props }) => (
        <input
          type="checkbox"
          checked={checked}
          disabled
          className="markdown-checkbox"
          {...props}
        />
      ),
    };

    return (
      <div
        ref={scrollContainerRef}
        className="markdown-preview-scroll flex h-full justify-center overflow-y-auto px-6 pt-8 pb-32"
      >
        <div ref={ref} className="markdown-preview w-full max-w-[720px] pb-8">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkGithubBlockquoteAlert]}
            rehypePlugins={[
              [rehypeHighlight, { ignoreMissing: true }],
              rehypeLobehubEmoji,
            ]}
            components={markdownComponents}
          >
            {processedContent}
          </ReactMarkdown>
        </div>
      </div>
    );
  }
);
export default MarkdownPreview;
