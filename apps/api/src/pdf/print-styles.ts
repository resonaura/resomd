/** Mirrors the print overrides the client used to apply for window.print(). */
export const PDF_PRINT_STYLES = `
  @page { size: A4; margin: 20mm; }
  body { background: white; color: black; margin: 0; padding: 0; }
  .markdown-preview {
    background: transparent;
    color: black;
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
  tr, pre, blockquote, img, li {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
    break-after: avoid;
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

  /* GitHub-style admonitions */
  .markdown-alert {
    margin: 1.1em 0;
    padding: 0.6em 1em;
    border-left: 3px solid #ccc;
    border-radius: 0 0.4rem 0.4rem 0;
    background: #f6f8fa;
  }
  .markdown-alert-title {
    display: flex;
    align-items: center;
    gap: 0.4em;
    font-weight: 600;
    font-size: 0.9em;
    margin-bottom: 0.3em;
  }
  .markdown-alert-note { border-left-color: #0969da; }
  .markdown-alert-note .markdown-alert-title { color: #0969da; }
  .markdown-alert-tip { border-left-color: #1a7f37; }
  .markdown-alert-tip .markdown-alert-title { color: #1a7f37; }
  .markdown-alert-important { border-left-color: #8250df; }
  .markdown-alert-important .markdown-alert-title { color: #8250df; }
  .markdown-alert-warning { border-left-color: #9a6700; }
  .markdown-alert-warning .markdown-alert-title { color: #9a6700; }
  .markdown-alert-caution { border-left-color: #cf222e; }
  .markdown-alert-caution .markdown-alert-title { color: #cf222e; }
  .markdown-alert > :first-child { margin-top: 0; }
  .markdown-alert > :last-child { margin-bottom: 0; }
`;
