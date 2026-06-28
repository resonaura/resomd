import { forwardRef, type ReactNode, useMemo } from "react"
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkGfm from "remark-gfm"

import "highlight.js/styles/github.css"

interface MarkdownPreviewProps {
  content: string
  onSelectBlock?: (offset: number) => void
}

// Translate character offsets from the processed string (which has longer logo tags)
// back to the original Markdown content string offsets.
function getOriginalOffsets(processedText: string, start: number, end: number) {
  const textBeforeStart = processedText.slice(0, start)
  const matchesBefore = textBeforeStart.match(/!\[RSNRA\]\(rsnra-logo\)/g)
  const n = matchesBefore ? matchesBefore.length : 0

  const textInside = processedText.slice(start, end)
  const matchesInside = textInside.match(/!\[RSNRA\]\(rsnra-logo\)/g)
  const m = matchesInside ? matchesInside.length : 0

  const shift = 12 // difference in length: 19 - 7

  return {
    start: start - n * shift,
    end: end - (n + m) * shift,
  }
}

export const MarkdownPreview = forwardRef<HTMLDivElement, MarkdownPreviewProps>(
  function MarkdownPreview({ content, onSelectBlock }, ref) {
    // Pre-process [RSNRA] tag to markdown image syntax
    const processedContent = content.replace(/\[RSNRA\]/g, "![RSNRA](rsnra-logo)")

    // Click block handler to position Monaco cursor on the left editor
    const handleClickBlock = (node: ExtraProps["node"], e: React.MouseEvent) => {
      e.preventDefault()
      console.log("handleClickBlock: node =", node, "position =", node?.position)
      const start = node?.position?.start?.offset
      const end = node?.position?.end?.offset
      if (start !== undefined && end !== undefined && onSelectBlock) {
        e.stopPropagation()
        // Correct the offsets to match the original content string
        const orig = getOriginalOffsets(processedContent, start, end)
        onSelectBlock(orig.start)
      } else {
        console.warn("handleClickBlock: start/end or onSelectBlock missing!", { start, end, hasSelect: !!onSelectBlock })
      }
    }

    const markdownComponents: Components = useMemo(() => {
      return {
        table: ({ children }: { children?: ReactNode }) => (
          <div className="markdown-table-wrapper">
            <table>{children}</table>
          </div>
        ),
        img: ({ src, alt, ...props }) => {
          if (alt === "RSNRA" || src === "rsnra-logo") {
            return (
              <span className="rsnra-logo-container inline-flex items-center align-middle mx-1 select-none -translate-y-[0.06em]">
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
            )
          }
          return <img src={src} alt={alt} {...props} />
        },
        p: ({ node, children }) => (
          <p onClick={(e) => handleClickBlock(node, e)}>
            {children}
          </p>
        ),
        h1: ({ node, children }) => (
          <h1 onClick={(e) => handleClickBlock(node, e)}>
            {children}
          </h1>
        ),
        h2: ({ node, children }) => (
          <h2 onClick={(e) => handleClickBlock(node, e)}>
            {children}
          </h2>
        ),
        h3: ({ node, children }) => (
          <h3 onClick={(e) => handleClickBlock(node, e)}>
            {children}
          </h3>
        ),
        h4: ({ node, children }) => (
          <h4 onClick={(e) => handleClickBlock(node, e)}>
            {children}
          </h4>
        ),
        h5: ({ node, children }) => (
          <h5 onClick={(e) => handleClickBlock(node, e)}>
            {children}
          </h5>
        ),
        h6: ({ node, children }) => (
          <h6 onClick={(e) => handleClickBlock(node, e)}>
            {children}
          </h6>
        ),
        blockquote: ({ node, children }) => (
          <blockquote onClick={(e) => handleClickBlock(node, e)}>
            {children}
          </blockquote>
        ),
        li: ({ node, children }) => (
          <li onClick={(e) => handleClickBlock(node, e)}>
            {children}
          </li>
        ),
        pre: ({ node, children }) => (
          <pre onClick={(e) => handleClickBlock(node, e)}>
            {children}
          </pre>
        ),
      }
    }, [content, onSelectBlock])

    return (
      <div className="flex justify-center px-6 py-8">
        <div ref={ref} className="markdown-preview w-full max-w-[720px]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {processedContent}
          </ReactMarkdown>
        </div>
      </div>
    )
  }
)
export default MarkdownPreview
