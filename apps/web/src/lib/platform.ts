export type Platform = 'mac' | 'windows' | 'linux';

/**
 * Detect the user's platform from the browser's user agent.
 * `navigator.platform` is deprecated but still widely supported; we use
 * `navigator.userAgent` as the primary signal and fall back to
 * `navigator.platform` for older browsers.
 */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'linux';

  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('win')) return 'windows';
  return 'linux';
}

export function isMac(): boolean {
  return detectPlatform() === 'mac';
}

/** The display label for the primary modifier key (⌘ on Mac, Ctrl elsewhere). */
export function modLabel(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

/** The display label for the Shift key. */
export function shiftLabel(): string {
  return isMac() ? '⇧' : 'Shift';
}

/** The display label for the Alt / Option key. */
export function altLabel(): string {
  return isMac() ? '⌥' : 'Alt';
}

/**
 * Format a shortcut spec string into a human-readable label.
 *
 * The spec uses `mod` for the primary modifier (⌘ on Mac, Ctrl on Windows/Linux).
 * Other supported tokens: `shift`, `alt`, and any single key name.
 *
 * Examples:
 *   'mod+n'       → '⌘N' (Mac) / 'Ctrl+N' (Windows)
 *   'mod+shift+s' → '⌘⇧S' (Mac) / 'Ctrl+Shift+S' (Windows)
 *   'mod+alt+f'   → '⌘⌥F' (Mac) / 'Ctrl+Alt+F' (Windows)
 */
export function formatShortcut(spec: string): string {
  const parts = spec.split('+');
  const mac = isMac();

  const labels = parts.map(part => {
    switch (part) {
      case 'mod':
        return mac ? '⌘' : 'Ctrl';
      case 'shift':
        return mac ? '⇧' : 'Shift';
      case 'alt':
        return mac ? '⌥' : 'Alt';
      case 'esc':
        return mac ? '⎋' : 'Esc';
      default:
        return part.length === 1 ? part.toUpperCase() : part;
    }
  });

  return mac ? labels.join('') : labels.join('+');
}

/**
 * Check whether a KeyboardEvent matches a shortcut spec.
 * Uses `metaKey` on Mac and `ctrlKey` on Windows/Linux for the `mod` token.
 */
export function matchesShortcut(event: KeyboardEvent, spec: string): boolean {
  const parts = spec.split('+');
  const mac = isMac();

  const needMod = parts.includes('mod');
  const needShift = parts.includes('shift');
  const needAlt = parts.includes('alt');
  const key = parts[parts.length - 1].toLowerCase();

  const modOk = mac ? event.metaKey : event.ctrlKey;
  if (needMod && !modOk) return false;
  if (!needMod && modOk) return false;

  if (needShift !== event.shiftKey) return false;
  if (needAlt !== event.altKey) return false;

  return event.key.toLowerCase() === key;
}
