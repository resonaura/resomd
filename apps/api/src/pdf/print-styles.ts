/** Mirrors the print overrides the client used to apply for window.print(). */
export const PDF_PRINT_STYLES = `
  @page { size: A4; margin: 20mm; }
  
  /* Force exact color rendering — prevents browser from adjusting colors */
  *, *::before, *::after {
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
    box-sizing: border-box;
  }

  body {
    background: white;
    color: #1d1d1f;
    margin: 0;
    padding: 0;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .markdown-preview {
    background: transparent;
    color: #1d1d1f;
    padding: 0;
    width: 100%;
    max-width: 100%;
    min-height: 0;
    height: auto;
    overflow: visible;
    position: static;
  }

  .rsnra-logo-img { height: 1.8em; width: auto; }
  .rsnra-logo-container {
    height: 1.8em;
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
  }

  /* Page break rules */
  tr, pre, blockquote, img, table, .markdown-alert, ul, ol {
    page-break-inside: avoid !important;
    break-inside: avoid-page !important;
    break-inside: avoid !important;
  }

  h2:not(:first-of-type) {
    page-break-before: always !important;
    break-before: page !important;
  }

  h1, h2, h3, h4, h5, h6 {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    page-break-after: avoid !important;
    break-after: avoid-page !important;
    break-after: avoid !important;
  }

  /* Keep headings bonded to the immediately following content */
  h1 + *, h2 + *, h3 + *, h4 + *, h5 + *, h6 + * {
    page-break-before: avoid !important;
    break-before: avoid-page !important;
    break-before: avoid !important;
  }

  /* Force page break before h3 when it follows a diagram code block */
  pre + h3 {
    page-break-before: always !important;
    break-before: page !important;
  }

  /* Task list checkboxes */
  .markdown-task-item {
    list-style: none;
    display: flex;
    align-items: flex-start;
    gap: 0.5em;
    margin-left: -1.2em;
  }
  .markdown-checkbox {
    margin-top: 0.35em;
    width: 1em;
    height: 1em;
    accent-color: #333;
    flex-shrink: 0;
  }
  .markdown-task-item > p { margin: 0; }

  /* Footnotes */
  .footnotes {
    margin-top: 2em;
    padding-top: 1em;
    border-top: 1px solid #ccc;
    font-size: 0.8em;
    color: #555;
  }
  .footnotes ol { padding-left: 1.2em; }
  .footnotes li { margin-top: 0.4em; }
  sup { font-size: 0.7em; vertical-align: super; line-height: 0; }
  sup a { text-decoration: none; }
  .data-footnote-backref { text-decoration: none; }

  /* Apple-style alert blocks with solid Apple colors and correct rounded corners */
  .markdown-alert {
    margin: 1.1em 0;
    padding: 0.8em 1.2em;
    border-left: 4px solid #ccc;
    border-radius: 8px !important;
    background: #f5f5f7 !important;
  }
  .markdown-alert-title {
    display: inline-flex !important;
    align-items: center !important;
    gap: 0.5em;
    font-weight: 600;
    font-size: 0.9em;
    margin-bottom: 0.4em;
    line-height: 1.4;
  }
  .markdown-alert-title svg,
  .markdown-alert-title .octicon {
    fill: currentColor !important;
    color: inherit !important;
    width: 1em;
    height: 1em;
    display: inline-block !important;
    vertical-align: middle !important;
  }

  /* NOTE — Blue */
  .markdown-alert-note {
    border-left-color: #007aff !important;
    background-color: #e8f2ff !important;
  }
  .markdown-alert-note .markdown-alert-title {
    color: #007aff !important;
  }

  /* TIP — Green */
  .markdown-alert-tip {
    border-left-color: #34c759 !important;
    background-color: #e8f8ed !important;
  }
  .markdown-alert-tip .markdown-alert-title {
    color: #34c759 !important;
  }

  /* IMPORTANT — Purple */
  .markdown-alert-important {
    border-left-color: #af52de !important;
    background-color: #f3e8fc !important;
  }
  .markdown-alert-important .markdown-alert-title {
    color: #af52de !important;
  }

  /* WARNING — Orange */
  .markdown-alert-warning {
    border-left-color: #ff9500 !important;
    background-color: #fff4e0 !important;
  }
  .markdown-alert-warning .markdown-alert-title {
    color: #ff9500 !important;
  }

  /* CAUTION — Red */
  .markdown-alert-caution {
    border-left-color: #ff3b30 !important;
    background-color: #ffe8e7 !important;
  }
  .markdown-alert-caution .markdown-alert-title {
    color: #ff3b30 !important;
  }

  .markdown-alert > :first-child { margin-top: 0; }
  .markdown-alert > :last-child { margin-bottom: 0; }

  /* Pre / code blocks */
  pre, pre code {
    white-space: pre-wrap !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
    overflow-x: visible !important;
  }
  pre {
    background: #f5f5f7 !important;
    color: #1d1d1f !important;
    border-radius: 12px !important;
    border: none !important;
    padding: 0.8em !important;
    font-size: 0.78em !important;
  }

  /* Mermaid charts */
  .mermaid-chart {
    page-break-inside: avoid;
    break-inside: avoid;
    background: #f5f5f7 !important;
    border-radius: 12px !important;
    padding: 1.4em 1.2em !important;
    display: flex !important;
    justify-content: center !important;
  }
  .mermaid-chart svg {
    background: transparent !important;
  }
  .mermaid-chart svg .cluster rect,
  .mermaid-chart svg .subgraph rect {
    fill: transparent !important;
    stroke: none !important;
    stroke-width: 0 !important;
  }

  /* Rounded node corners */
  .mermaid-chart svg .node rect {
    rx: 10px !important;
    ry: 10px !important;
    stroke-width: 0 !important;
  }

  /* Node text */
  .mermaid-chart svg .node text {
    fill: #ffffff !important;
    font-weight: 500 !important;
  }

  /* Edges — Light Mode: Solid Black Line, NO FILL */
  .mermaid-chart svg .edgePath path {
    fill: none !important;
    stroke: #1d1d1f !important;
    stroke-width: 2.5px !important;
    stroke-linecap: round !important;
    stroke-linejoin: round !important;
  }
  .mermaid-chart svg marker path {
    fill: #1d1d1f !important;
    stroke: #1d1d1f !important;
    stroke-width: 1px !important;
    stroke-linecap: round !important;
    stroke-linejoin: round !important;
  }

  /* Edge labels */
  .mermaid-chart svg .edgeLabel rect {
    fill: #f5f5f7 !important;
    stroke: none !important;
    stroke-width: 0 !important;
  }
  .mermaid-chart svg .edgeLabel foreignObject div,
  .mermaid-chart svg .edgeLabel foreignObject span {
    color: #1d1d1f !important;
    background-color: #f5f5f7 !important;  /* solid light-mode card background under text */
    padding: 2px 6px !important;
    border-radius: 4px !important;
    border: none !important;
  }
  .mermaid-chart svg .edgeLabel text,
  .mermaid-chart svg .edgeLabel tspan {
    color: #1d1d1f !important;
    fill: #1d1d1f !important;
    background: transparent !important;
    border: none !important;
  }

  /* Apple light-mode node color styles (override dark themes baked inside clone) */
  .mermaid-chart svg .node.c0 rect { fill: #007aff !important; }
  .mermaid-chart svg .node.c1 rect { fill: #34c759 !important; }
  .mermaid-chart svg .node.c2 rect { fill: #ff9500 !important; }
  .mermaid-chart svg .node.c3 rect { fill: #af52de !important; }
  .mermaid-chart svg .node.c4 rect { fill: #5ac8fa !important; }
  .mermaid-chart svg .node.c5 rect { fill: #ff3b30 !important; }
`;
