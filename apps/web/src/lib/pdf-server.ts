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

export async function exportNodeToPdfViaServer(node: HTMLElement) {
  // Process and inline all same-origin images first so relative paths don't fail in Puppeteer
  const processedNode = await inlineSameOriginImages(node);
  const css = await collectStylesheetText();

  if (processedNode.innerHTML === '') {
    throw new Error('Document must not be empty');
  }

  const filename = `document.pdf`;

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
