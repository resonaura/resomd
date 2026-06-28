/**
 * Lightweight defense-in-depth before handing the client's rendered HTML to
 * headless Chromium. This is not a full sanitizer (the content always
 * originates from this app's own markdown renderer, not arbitrary third-party
 * input) — it just strips the few constructs that could execute code if
 * something unexpected slipped through: <script>/<iframe> tags, inline event
 * handler attributes, and javascript: URLs.
 */
export function sanitizeRenderedHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/(href|src)\s*=\s*"javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'javascript:[^']*'/gi, "$1='#'");
}
