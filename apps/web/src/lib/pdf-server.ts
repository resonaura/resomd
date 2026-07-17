const PDF_SERVER_URL =
  import.meta.env.VITE_PDF_SERVER_URL ?? 'http://localhost:3004';

/**
 * Collects the actual CSS text behind every <link rel="stylesheet"> and
 * <style> tag on the page. The server can't resolve relative asset URLs the
 * way the browser does, so everything is inlined into one self-contained
 * string before being sent over.
 */
async function collectStylesheetText(): Promise<string> {
  const linkHrefs = Array.from(
    document.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']")
  ).map(link => link.href);
  const inlineStyles = Array.from(document.querySelectorAll('style')).map(
    style => style.textContent ?? ''
  );

  const linkedCss = await Promise.all(
    linkHrefs.map(async href => {
      try {
        const response = await fetch(href);
        return await response.text();
      } catch (error) {
        console.error(
          `Failed to fetch stylesheet for PDF export: ${href}`,
          error
        );
        return '';
      }
    })
  );

  return [...linkedCss, ...inlineStyles].join('\n');
}

/**
 * Inlines same-origin images as base64 data URLs.
 * This ensures that when the HTML is rendered on the server in Puppeteer,
 * relative paths like logo SVGs (/icon.svg, /icon-light.svg) do not break.
 */
async function inlineSameOriginImages(node: HTMLElement): Promise<HTMLElement> {
  const clone = node.cloneNode(true) as HTMLElement;

  // ── Programmatically patch Mermaid edge label inline styles ──────────────────
  // Mermaid bakes dark theme colors into foreignObject > div inline style attrs.
  // CSS overrides cannot always defeat inline styles inside foreignObject in print,
  // so we must patch the cloned DOM directly before sending it to the PDF server.
  clone.querySelectorAll<HTMLElement>('.mermaid-chart svg .edgeLabel foreignObject > div').forEach(el => {
    el.style.setProperty('background-color', '#f5f5f7', 'important');
    el.style.setProperty('background', '#f5f5f7', 'important');
    el.style.setProperty('border', 'none', 'important');
    el.style.setProperty('color', '#1d1d1f', 'important');
    el.style.setProperty('padding', '2px 6px', 'important');
    el.style.setProperty('border-radius', '4px', 'important');
  });
  clone.querySelectorAll<HTMLElement>(
    '.mermaid-chart svg .edgeLabel foreignObject span, .mermaid-chart svg .edgeLabel foreignObject p'
  ).forEach(el => {
    el.style.setProperty('color', '#1d1d1f', 'important');
    el.style.setProperty('background-color', '#f5f5f7', 'important');
    el.style.setProperty('background', '#f5f5f7', 'important');
    el.style.setProperty('border', 'none', 'important');
  });
  // Also patch SVG rect mask elements that have inline fill set by Mermaid
  clone.querySelectorAll<SVGRectElement>('.mermaid-chart svg .edgeLabel rect').forEach(el => {
    el.style.setProperty('fill', '#f5f5f7', 'important');
    el.setAttribute('fill', '#f5f5f7');
    el.style.setProperty('stroke', 'none', 'important');
    el.setAttribute('stroke', 'none');
  });

  // ── Directly resize Mermaid SVGs to fit A4 content width ─────────────────────
  // This is the only 100% reliable method: set width/height attrs directly before
  // the HTML is serialized. CSS max-width is silently ignored for SVGs with
  // explicit dimension attrs. zoom on containers is unreliable across Puppeteer versions.
  const MAX_SVG_WIDTH = 650; // px — fits comfortably inside A4 margins at 96dpi
  clone.querySelectorAll<SVGSVGElement>('.mermaid-chart svg').forEach(svg => {
    const wAttr = svg.getAttribute('width');
    const hAttr = svg.getAttribute('height');
    if (!wAttr || !hAttr) return;
    const origW = parseFloat(wAttr);
    const origH = parseFloat(hAttr);
    if (!origW || !origH || origW <= MAX_SVG_WIDTH) return;
    const scale = MAX_SVG_WIDTH / origW;
    svg.setAttribute('width', String(MAX_SVG_WIDTH));
    svg.setAttribute('height', (origH * scale).toFixed(1));
  });

  const images = Array.from(clone.querySelectorAll('img'));

  await Promise.all(
    images.map(async img => {
      const src = img.getAttribute('src');
      if (!src) return;

      try {
        // Resolve target URL relative to current document location
        const absoluteUrl = new URL(src, window.location.href).href;

        // Inline only same-origin images to avoid CORS blockers and speed up processing
        if (absoluteUrl.startsWith(window.location.origin)) {
          const response = await fetch(absoluteUrl);
          if (response.ok) {
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            img.setAttribute('src', base64);
          }
        }
      } catch (error) {
        console.error(`Failed to inline image for PDF export: ${src}`, error);
      }
    })
  );

  return clone;
}

export async function exportNodeToPdfViaServer(node: HTMLElement, targetFilename?: string) {
  // Process and inline all same-origin images first so relative paths don't fail in Puppeteer
  const processedNode = await inlineSameOriginImages(node);
  const css = await collectStylesheetText();

  if (processedNode.innerHTML === '') {
    throw new Error('Document must not be empty');
  }

  const filename = targetFilename || 'document.pdf';

  const response = await fetch(`${PDF_SERVER_URL}/v1/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html: processedNode.innerHTML,
      css,
      filename,
    }),
  });

  if (!response.ok) {
    throw new Error(`PDF server responded with ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
