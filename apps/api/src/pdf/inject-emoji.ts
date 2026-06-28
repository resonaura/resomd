export const LOBEHUB_EMOJI_CDN_BASE =
  'https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-modern/assets';

/**
 * Runs inside the headless page via `page.evaluate`, not in Node — Puppeteer
 * serializes this function and executes it against the real DOM. The
 * server's Chromium has no color emoji font installed, so every emoji
 * grapheme cluster in the rendered text is swapped for a LobeHub Fluent
 * Emoji <img>, matching the colorful look regardless of the host OS.
 */
export function injectEmojiImages(cdnBase: string): void {
  const emojiPattern = /\p{Extended_Pictographic}/u;
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    if (current.nodeValue && emojiPattern.test(current.nodeValue)) {
      textNodes.push(current as Text);
    }
  }

  for (const textNode of textNodes) {
    const text = textNode.nodeValue ?? '';
    const segments = [...segmenter.segment(text)].map(s => s.segment);
    if (!segments.some(segment => emojiPattern.test(segment))) continue;

    const fragment = document.createDocumentFragment();
    for (const segment of segments) {
      if (emojiPattern.test(segment)) {
        const codepoints = [...segment]
          .map(char => char.codePointAt(0)?.toString(16))
          .filter((hex): hex is string => Boolean(hex) && hex !== 'fe0f')
          .join('-');
        const img = document.createElement('img');
        img.src = `${cdnBase}/${codepoints}.svg`;
        img.style.height = '1.1em';
        img.style.width = '1.1em';
        img.style.verticalAlign = '-0.2em';
        img.style.display = 'inline-block';
        fragment.appendChild(img);
      } else {
        fragment.appendChild(document.createTextNode(segment));
      }
    }
    textNode.replaceWith(fragment);
  }
}

/** Runs inside the page; resolves once every <img> has finished loading (or failed). */
export function waitForImagesToSettle(): Promise<void[]> {
  const images = Array.from(document.querySelectorAll('img'));
  return Promise.all(
    images.map(
      img =>
        new Promise<void>(resolve => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve());
          img.addEventListener('error', () => resolve());
        })
    )
  );
}
