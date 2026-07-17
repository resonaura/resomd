// ─────────────────────────────────────────────────────────────────────────────
// Helper: snapshot computed styles from live elements → inline on clone
// ─────────────────────────────────────────────────────────────────────────────

/** Snapshot a subset of computed style properties from a live element to its clone counterpart. */
function snapshotStyle(live: Element, clone: Element, props: string[]) {
  const computed = getComputedStyle(live);
  const cloneEl = clone as HTMLElement;
  props.forEach(prop => {
    const val = computed.getPropertyValue(prop);
    if (val) cloneEl.style.setProperty(prop, val, 'important');
  });
}

/** Walk two parallel subtrees and snapshot styles on matched selector elements. */
function snapshotAll(
  liveRoot: Element,
  cloneRoot: Element,
  selector: string,
  props: string[]
) {
  const liveEls = Array.from(liveRoot.querySelectorAll<Element>(selector));
  const cloneEls = Array.from(cloneRoot.querySelectorAll<Element>(selector));
  liveEls.forEach((liveEl, i) => {
    const cloneEl = cloneEls[i];
    if (cloneEl) snapshotStyle(liveEl, cloneEl, props);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main print function
// ─────────────────────────────────────────────────────────────────────────────

export async function print(node: HTMLElement) {
  // Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    throw new Error('Could not access iframe document');
  }

  // Set page title so browser uses it as the default filename in print to PDF dialog
  const oldTitle = document.title;
  document.title = 'document';

  // Clone the node — we clone BEFORE snapshotting so we can patch both together
  const clone = node.cloneNode(true) as HTMLElement;

  // ── Snapshot computed styles from live elements → apply as inline styles on clone ──
  // This is more reliable than copying <link> stylesheets because:
  // 1. Stylesheet links in the iframe require async re-fetching (timing issues)
  // 2. CSS custom properties (oklch colors, --muted etc.) resolve correctly here
  // 3. No dependency on CSS specificity battles in a foreign document

  const BOX = [
    'background-color',
    'border-left-color',
    'border-left-width',
    'border-left-style',
    'border-radius',
    'padding',
    'margin',
    'display',
    'font-weight',
    'font-size',
    'line-height',
    'color',
  ];

  // Alert blocks (note / tip / important / warning / caution)
  const alertTypes = ['note', 'tip', 'important', 'warning', 'caution'];
  alertTypes.forEach(type => {
    snapshotAll(node, clone, `.markdown-alert-${type}`, BOX);
    snapshotAll(node, clone, `.markdown-alert-${type} .markdown-alert-title`, [
      'color',
      'font-weight',
      'font-size',
      'display',
      'align-items',
      'gap',
    ]);
    snapshotAll(
      node,
      clone,
      `.markdown-alert-${type} .markdown-alert-title svg`,
      ['color', 'fill', 'width', 'height']
    );
  });

  // General alert container (border-radius, padding)
  snapshotAll(node, clone, '.markdown-alert', [
    'border-radius',
    'padding',
    'margin',
  ]);

  // ── Patch Mermaid edge label inline styles (Mermaid bakes dark colors into foreignObject) ──
  // CSS !important cannot reliably override inline styles in foreignObject in print context.
  clone
    .querySelectorAll<HTMLElement>(
      '.mermaid-chart svg .edgeLabel foreignObject > div'
    )
    .forEach(el => {
      el.style.setProperty('background-color', 'transparent', 'important');
      el.style.setProperty('background', 'transparent', 'important');
      el.style.setProperty('border', 'none', 'important');
      el.style.setProperty('color', '#1d1d1f', 'important');
    });
  clone
    .querySelectorAll<HTMLElement>(
      '.mermaid-chart svg .edgeLabel foreignObject span, .mermaid-chart svg .edgeLabel foreignObject p'
    )
    .forEach(el => {
      el.style.setProperty('color', '#1d1d1f', 'important');
      el.style.setProperty('background', 'transparent', 'important');
      el.style.setProperty('border', 'none', 'important');
    });
  // Patch SVG rect mask fill (Mermaid sets inline fill attribute)
  clone
    .querySelectorAll<SVGRectElement>('.mermaid-chart svg .edgeLabel rect')
    .forEach(el => {
      el.style.setProperty('fill', '#f5f5f7', 'important');
      el.setAttribute('fill', '#f5f5f7');
      el.style.setProperty('stroke', 'none', 'important');
      el.setAttribute('stroke', 'none');
    });

  // ── Minimal print-specific <style> — only things that CANNOT be snapshotted ──
  const printStyle = doc.createElement('style');
  printStyle.textContent = `
    @media print {
      @page {
        size: A4;
        margin: 20mm;
      }
    }
    *, *::before, *::after {
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
      box-sizing: border-box;
    }
    body {
      background: #ffffff !important;
      color: #1d1d1f !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .markdown-preview {
      background: transparent !important;
      color: #1d1d1f !important;
      padding: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: 0 !important;
      height: auto !important;
      overflow: visible !important;
      position: static !important;
    }
    /* Logo */
    .rsnra-logo-img { height: 1.8em !important; width: auto !important; }
    .rsnra-logo-container {
      height: 1.8em !important; display: inline-flex !important;
      align-items: center !important; vertical-align: middle !important;
    }
    /* Code blocks */
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
    /* Lists */
    ul { list-style-type: disc !important; padding-left: 1.75em !important; }
    ol { list-style-type: decimal !important; padding-left: 1.75em !important; }
    ul ul { list-style-type: circle !important; }
    ul ul ul { list-style-type: square !important; }
    li { margin-top: 0.2em !important; }
    .markdown-task-item { list-style: none !important; margin-left: -1.2em !important; }
    /* Page break rules */
    .mermaid-chart, tr, pre, blockquote, img, table, .markdown-alert, ul, ol {
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
    /* Alert icons */
    .markdown-alert-title svg,
    .markdown-alert-title .octicon {
      fill: currentColor !important;
      color: inherit !important;
    }
    /* Alert titles text color (in case snapshot didn't reach) */
    .markdown-alert-note .markdown-alert-title    { color: #007aff !important; }
    .markdown-alert-tip .markdown-alert-title     { color: #34c759 !important; }
    .markdown-alert-important .markdown-alert-title { color: #af52de !important; }
    .markdown-alert-warning .markdown-alert-title  { color: #ff9500 !important; }
    .markdown-alert-caution .markdown-alert-title  { color: #ff3b30 !important; }
    /* Alert icons SVG color */
    .markdown-alert-note .markdown-alert-title svg    { color: #007aff !important; fill: #007aff !important; }
    .markdown-alert-tip .markdown-alert-title svg     { color: #34c759 !important; fill: #34c759 !important; }
    .markdown-alert-important .markdown-alert-title svg { color: #af52de !important; fill: #af52de !important; }
    .markdown-alert-warning .markdown-alert-title svg  { color: #ff9500 !important; fill: #ff9500 !important; }
    .markdown-alert-caution .markdown-alert-title svg  { color: #ff3b30 !important; fill: #ff3b30 !important; }
    /* Mermaid charts */
    .mermaid-chart {
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
    /* Mermaid edge labels */
    .mermaid-chart svg .edgeLabel rect { fill: #f5f5f7 !important; stroke: none !important; stroke-width: 0 !important; }
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
      color: #1d1d1f !important; fill: #1d1d1f !important;
      background: transparent !important; border: none !important;
    }
    /* Tables */
    .markdown-table-wrapper { border: 1px solid #d1d1d6 !important; border-radius: 8px !important; overflow: hidden !important; }
    table { border-collapse: collapse !important; width: 100% !important; }
    th, td { border: 1px solid #d1d1d6 !important; padding: 0.5em 0.75em !important; }
    th { background: #f5f5f7 !important; font-weight: 600 !important; }
  `;
  doc.head.appendChild(printStyle);
  doc.body.appendChild(clone);

  // Wait for images
  const images = Array.from(clone.querySelectorAll('img'));
  await Promise.all(
    images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  // Trigger print
  return new Promise<void>(resolve => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve();
      } catch (err) {
        console.error(err);
        resolve();
      } finally {
        iframe.remove();
        document.title = oldTitle;
      }
    }, 300);
  });
}
