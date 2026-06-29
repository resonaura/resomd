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

import 'highlight.js/styles/github.css';

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

    const markdownComponents: Components = {
      table: ({ children }: { children?: ReactNode }) => (
        <div className="markdown-table-wrapper">
          <table>{children}</table>
        </div>
      ),
      img: ({ src, alt, ...props }) => {
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
        return <img src={src} alt={alt} {...props} />;
      },
      // Task list items — render as checkbox-style list items
      li: ({ node, children, ...props }) => {
        // Check if this is a task list item (GFM adds data attributes or className)
        const className = (props as { className?: string }).className ?? '';
        const isTaskItem = className.includes('task-list-item');

        if (isTaskItem) {
          return (
            <li
              className="markdown-task-item"
              onClick={e => handleClickBlock(node, e)}
            >
              {children}
            </li>
          );
        }

        return <li onClick={e => handleClickBlock(node, e)}>{children}</li>;
      },
      p: ({ node, children }) => (
        <p onClick={e => handleClickBlock(node, e)}>{children}</p>
      ),
      h1: ({ node, children }) => (
        <h1 onClick={e => handleClickBlock(node, e)}>{children}</h1>
      ),
      h2: ({ node, children }) => (
        <h2 onClick={e => handleClickBlock(node, e)}>{children}</h2>
      ),
      h3: ({ node, children }) => (
        <h3 onClick={e => handleClickBlock(node, e)}>{children}</h3>
      ),
      h4: ({ node, children }) => (
        <h4 onClick={e => handleClickBlock(node, e)}>{children}</h4>
      ),
      h5: ({ node, children }) => (
        <h5 onClick={e => handleClickBlock(node, e)}>{children}</h5>
      ),
      h6: ({ node, children }) => (
        <h6 onClick={e => handleClickBlock(node, e)}>{children}</h6>
      ),
      blockquote: ({ node, children }) => (
        <blockquote onClick={e => handleClickBlock(node, e)}>
          {children}
        </blockquote>
      ),
      pre: ({ node, children }) => (
        <pre onClick={e => handleClickBlock(node, e)}>{children}</pre>
      ),
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
        className="markdown-preview-scroll flex h-full justify-center overflow-y-auto px-6 py-8"
      >
        <div ref={ref} className="markdown-preview w-full max-w-[720px]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkGithubBlockquoteAlert]}
            rehypePlugins={[rehypeHighlight, rehypeLobehubEmoji]}
            remarkRehypeOptions={{ sourcePos: true } as never}
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
