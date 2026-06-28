// Minimal local shape for the HAST nodes we touch — avoids pulling in `hast`
// as a direct dependency just for types.
interface HastText {
  type: 'text';
  value: string;
}
interface HastElement {
  type: 'element';
  tagName: string;
  properties?: Record<string, unknown>;
  children: HastNode[];
}
type HastNode =
  HastText | HastElement | { type: string; children?: HastNode[] };
interface HastRoot {
  type: 'root';
  children: HastNode[];
}

const EMOJI_PATTERN = /\p{Extended_Pictographic}/u;
const EMOJI_CDN_BASE =
  'https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-modern/assets';
const SKIP_TAGS = new Set(['code', 'pre']);

function emojiToCodepoints(segment: string): string {
  return [...segment]
    .map(char => char.codePointAt(0)?.toString(16))
    .filter((hex): hex is string => Boolean(hex) && hex !== 'fe0f')
    .join('-');
}

function splitTextNode(node: HastText): HastNode[] {
  if (!EMOJI_PATTERN.test(node.value)) return [node];

  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const segments = [...segmenter.segment(node.value)].map(s => s.segment);

  const result: HastNode[] = [];
  for (const segment of segments) {
    if (EMOJI_PATTERN.test(segment)) {
      const codepoints = emojiToCodepoints(segment);
      const img: HastElement = {
        type: 'element',
        tagName: 'img',
        properties: {
          src: `${EMOJI_CDN_BASE}/${codepoints}.svg`,
          alt: segment,
          className: ['markdown-emoji'],
        },
        children: [],
      };
      result.push(img);
    } else if (segment) {
      result.push({ type: 'text', value: segment } satisfies HastText);
    }
  }
  return result;
}

function walk(node: HastNode): void {
  if (!('children' in node) || !node.children) return;
  if (node.type === 'element' && SKIP_TAGS.has((node as HastElement).tagName))
    return;

  const newChildren: HastNode[] = [];
  for (const child of node.children) {
    if (child.type === 'text') {
      newChildren.push(...splitTextNode(child as HastText));
    } else {
      walk(child);
      newChildren.push(child);
    }
  }
  node.children = newChildren;
}

/** Replaces emoji grapheme clusters in rendered text with LobeHub Fluent Emoji images. */
export function rehypeLobehubEmoji() {
  return (tree: HastRoot) => {
    walk(tree);
  };
}
