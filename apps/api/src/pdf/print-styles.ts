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
`;
