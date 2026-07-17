/**
 * Detects and converts ASCII art flow diagrams to Mermaid flowchart syntax.
 *
 * Handles:
 *  - Nodes: [Label Text]
 *  - Horizontal arrows: ──► (right), ◄── (left), combined both directions
 *  - Vertical arrows: ▼ (down), ▲ (up)
 *  - Branch/fan-out lines: ┌─┼─┐ patterns
 *  - Edge labels: (label text) adjacent to arrows
 */

const BOX_DRAWING_RE = /[│┌┐└┘├┤┬┴┼─═║▼▲►◄]/;
const ARROW_CHARS_RE = /[►◄▼▲→←]/;
const NODE_RE_TEST = /\[[^\]]{1,80}\]/;

/** Returns true if the code looks like an ASCII flow diagram. */
export function isAsciiDiagram(code: string): boolean {
  if (!BOX_DRAWING_RE.test(code)) return false;
  if (!NODE_RE_TEST.test(code)) return false;
  if (!ARROW_CHARS_RE.test(code)) return false;

  const lines = code.split('\n').filter(l => l.trim());
  if (lines.length < 2) return false;

  // Require at least 2 lines that contain box/arrow chars
  const diagramLines = lines.filter(l => BOX_DRAWING_RE.test(l));
  return diagramLines.length >= 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal types
// ─────────────────────────────────────────────────────────────────────────────

interface GNode {
  id: string;
  label: string;
  lineIdx: number;
  colStart: number;
  colEnd: number;
  colCenter: number;
}

interface GEdge {
  from: string; // node id
  to: string;
  label?: string;
}

interface BranchLine {
  lineIdx: number;
  rootCol: number;   // column of ┼ or ┬ (the "hub" of the fan)
  branchCols: number[]; // columns of ┌ / ┐ endpoints + rootCol
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeId(label: string, idx: number): string {
  const safe = label
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return `N${idx}_${safe || 'node'}`;
}

function extractParenLabel(segment: string): string | undefined {
  const m = segment.match(/\(([^)]{1,60})\)/);
  return m ? m[1].trim() : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: parse all [Node] occurrences (first occurrence of each unique label)
// ─────────────────────────────────────────────────────────────────────────────

function parseNodes(lines: string[]): GNode[] {
  const nodes: GNode[] = [];
  const seen = new Set<string>();

  lines.forEach((line, lineIdx) => {
    const re = /\[([^\]]{1,80})\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      const label = m[1];
      if (seen.has(label)) continue;
      seen.add(label);
      const colStart = m.index;
      const colEnd = m.index + m[0].length;
      nodes.push({
        id: makeId(label, nodes.length),
        label,
        lineIdx,
        colStart,
        colEnd,
        colCenter: (colStart + colEnd) / 2,
      });
    }
  });

  return nodes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: detect horizontal edges on each line
// ─────────────────────────────────────────────────────────────────────────────

function parseHorizontalEdges(lines: string[], nodes: GNode[]): GEdge[] {
  const edges: GEdge[] = [];
  const labelToNode = new Map(nodes.map(n => [n.label, n]));

  lines.forEach(line => {
    // Gather all [node] occurrences in line order
    const re = /\[([^\]]{1,80})\]/g;
    const found: { label: string; start: number; end: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      found.push({ label: m[1], start: m.index, end: m.index + m[0].length });
    }

    for (let i = 0; i < found.length - 1; i++) {
      const a = found[i];
      const b = found[i + 1];
      const segment = line.slice(a.end, b.start);

      const nodeA = labelToNode.get(a.label);
      const nodeB = labelToNode.get(b.label);
      if (!nodeA || !nodeB) continue;

      const edgeLabel = extractParenLabel(segment);
      const hasRight = /[►>]/.test(segment);
      const hasLeft = /[◄<]/.test(segment);

      if (hasRight && !hasLeft) {
        edges.push({ from: nodeA.id, to: nodeB.id, label: edgeLabel });
      } else if (hasLeft && !hasRight) {
        edges.push({ from: nodeB.id, to: nodeA.id, label: edgeLabel });
      } else if (hasLeft && hasRight) {
        // Bidirectional — look at which arrow comes first
        const leftPos = segment.search(/[◄<]/);
        const rightPos = segment.search(/[►>]/);
        if (leftPos < rightPos) {
          // ◄──► pattern: B→A and A→B
          edges.push({ from: nodeB.id, to: nodeA.id, label: edgeLabel });
          edges.push({ from: nodeA.id, to: nodeB.id });
        } else {
          // ──►...◄── or ──► [B] ──► : A→B, B→A
          edges.push({ from: nodeA.id, to: nodeB.id, label: edgeLabel });
          edges.push({ from: nodeB.id, to: nodeA.id });
        }
      }
    }
  });

  return edges;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: detect ┌─┼─┐ / ┌─┬─┐ fan-out lines
// ─────────────────────────────────────────────────────────────────────────────

function parseBranchLines(lines: string[]): BranchLine[] {
  const branches: BranchLine[] = [];

  lines.forEach((line, lineIdx) => {
    if (!line.includes('┌')) return;

    // Find the hub column (┼ or ┬)
    const rootCol = line.indexOf('┼') !== -1 ? line.indexOf('┼') : line.indexOf('┬');
    if (rootCol === -1) return;

    const leftEnd = line.lastIndexOf('┌', rootCol);
    const rightEnd = line.indexOf('┐', rootCol);
    if (leftEnd === -1 || rightEnd === -1) return;

    branches.push({
      lineIdx,
      rootCol,
      branchCols: [leftEnd, rootCol, rightEnd],
    });
  });

  return branches;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: detect vertical edges via ▼ symbols and branch lines
// ─────────────────────────────────────────────────────────────────────────────

function parseVerticalEdges(
  lines: string[],
  nodes: GNode[],
  branches: BranchLine[]
): GEdge[] {
  const edges: GEdge[] = [];
  const added = new Set<string>();
  const COL_TOL = 14; // column character tolerance for matching

  function add(from: string, to: string, label?: string) {
    const key = `${from}->${to}`;
    if (added.has(key)) return;
    added.add(key);
    edges.push({ from, to, label });
  }

  function closestAbove(col: number, beforeLine: number): GNode | undefined {
    return nodes
      .filter(n => Math.abs(n.colCenter - col) <= COL_TOL && n.lineIdx < beforeLine)
      .sort((a, b) => b.lineIdx - a.lineIdx)[0];
  }

  function closestBelow(col: number, afterLine: number): GNode | undefined {
    return nodes
      .filter(n => Math.abs(n.colCenter - col) <= COL_TOL && n.lineIdx > afterLine)
      .sort((a, b) => a.lineIdx - b.lineIdx)[0];
  }

  // ── Step A: process branch lines first ──────────────────────────────────────
  // Collect (lineIdx, col) pairs of ▼ symbols that belong to a branch fan-out.
  // These must NOT be re-processed in the generic ▼ loop below, because the
  // "closest above" node for them is the wrong ancestor (e.g. Peripheral Sensor)
  // rather than the branch root (e.g. Base Hub).
  const branchArrowKeys = new Set<string>();

  branches.forEach(branch => {
    const rootNode = closestAbove(branch.rootCol, branch.lineIdx);
    if (!rootNode) return;

    branch.branchCols.forEach(bCol => {
      let found = false;
      for (let l = branch.lineIdx + 1; l < lines.length && l <= branch.lineIdx + 5; l++) {
        const line = lines[l];
        let searchFrom = 0;
        let downIdx: number;
        while ((downIdx = line.indexOf('▼', searchFrom)) !== -1) {
          if (Math.abs(downIdx - bCol) <= COL_TOL) {
            // Mark this ▼ as belonging to the branch
            branchArrowKeys.add(`${l},${downIdx}`);
            const segment = line.slice(downIdx, downIdx + 40);
            const edgeLabel = extractParenLabel(segment);
            const below = closestBelow(bCol, branch.lineIdx);
            if (below && below.id !== rootNode.id) {
              add(rootNode.id, below.id, edgeLabel);
            }
            found = true;
            break;
          }
          searchFrom = downIdx + 1;
        }
        if (found) break;
      }
    });
  });

  // ── Step B: generic ▼ processing (skip branch-owned arrows) ─────────────────
  lines.forEach((line, lineIdx) => {
    let searchFrom = 0;
    let col: number;
    while ((col = line.indexOf('▼', searchFrom)) !== -1) {
      searchFrom = col + 1;

      // Skip ▼ symbols that were already handled by the branch processor
      if (branchArrowKeys.has(`${lineIdx},${col}`)) continue;

      const above = closestAbove(col, lineIdx);
      const below = closestBelow(col, lineIdx);
      if (!above || !below) continue;

      // Look for edge label on lines between ▼ and the nodes
      let edgeLabel: string | undefined;
      for (let l = above.lineIdx + 1; l < lineIdx && !edgeLabel; l++) {
        edgeLabel = extractParenLabel(lines[l]);
      }
      for (let l = lineIdx + 1; l < below.lineIdx && !edgeLabel; l++) {
        edgeLabel = extractParenLabel(lines[l]);
      }

      add(above.id, below.id, edgeLabel);
    }
  });

  return edges;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: convert ASCII diagram to Mermaid flowchart syntax
// ─────────────────────────────────────────────────────────────────────────────

export function asciiToMermaid(code: string): string {
  const lines = code.split('\n');
  const nodes = parseNodes(lines);
  if (nodes.length < 2) return '';

  const hEdges = parseHorizontalEdges(lines, nodes);
  const branchLines = parseBranchLines(lines);
  const vEdges = parseVerticalEdges(lines, nodes, branchLines);

  const allEdges = [...hEdges, ...vEdges];
  if (allEdges.length === 0) return ''; // no connections detected → can't render

  // Sort edges by source node's lineIdx to preserve top-to-bottom layout rank
  const nodeLineMap = new Map(nodes.map(n => [n.id, n.lineIdx]));
  allEdges.sort((a, b) => {
    const lineA = nodeLineMap.get(a.from) ?? 0;
    const lineB = nodeLineMap.get(b.from) ?? 0;
    return lineA - lineB;
  });

  // Choose direction:
  //   • If there are horizontal edges → LR (user drew it horizontally)
  //   • If it's a "linear chain" (no node has >1 outgoing vertical edge, no branching) → LR
  //     This compacts tall single-column diagrams into a compact left-to-right strip.
  //   • Otherwise (fan-outs, multi-branch trees) → TD
  const outDegree = new Map<string, number>();
  const inDegree = new Map<string, number>();
  for (const e of allEdges) {
    outDegree.set(e.from, (outDegree.get(e.from) ?? 0) + 1);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }
  const isBranchFree =
    [...outDegree.values()].every(d => d <= 1) &&
    [...inDegree.values()].every(d => d <= 1) &&
    branchLines.length === 0;

  // Trace the sequential path of the linear chain
  const chainSequence: GNode[] = [];
  if (isBranchFree) {
    let currentId = nodes.find(n => (inDegree.get(n.id) ?? 0) === 0)?.id;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const nodeObj = nodes.find(n => n.id === currentId);
      if (nodeObj) chainSequence.push(nodeObj);
      const nextEdge = allEdges.find(e => e.from === currentId);
      currentId = nextEdge?.to;
    }
  }

  let direction: 'TD' | 'LR';
  if (hEdges.length > 0 && vEdges.length === 0) {
    direction = 'LR';
  } else if (hEdges.length > 0) {
    direction = hEdges.length >= vEdges.length ? 'LR' : 'TD';
  } else {
    // Lay out linear chains horizontally (LR) if short (<= 4 nodes),
    // and vertically (TD) if longer to avoid excessive width and scaling issues.
    direction = (isBranchFree && nodes.length <= 4) ? 'LR' : 'TD';
  }

  // Apple SwiftUI system colors — solid fill, no border, white text
  // Light mode values from Apple HIG; dark variants overridden via CSS
  const APPLE_CLASSES = [
    `classDef c0 fill:#0088ff,stroke-width:0,color:#ffffff`,  // Blue    rgb(0,136,255)
    `classDef c1 fill:#34c759,stroke-width:0,color:#ffffff`,  // Green   rgb(52,199,89)
    `classDef c2 fill:#ff9500,stroke-width:0,color:#ffffff`,  // Orange  rgb(255,149,0)
    `classDef c3 fill:#cb30e0,stroke-width:0,color:#ffffff`,  // Purple  rgb(203,48,224)
    `classDef c4 fill:#00c3d0,stroke-width:0,color:#ffffff`,  // Teal    rgb(0,195,208)
    `classDef c5 fill:#ff3b30,stroke-width:0,color:#ffffff`,  // Red     rgb(255,59,48)
  ];

  const out: string[] = [
    `flowchart ${direction}`,
    ...APPLE_CLASSES.map(c => `  ${c}`),
  ];

  // Normal rendering
  nodes.forEach((n, idx) => {
    const escaped = n.label.replace(/"/g, "'");
    out.push(`  ${n.id}["${escaped}"]:::c${idx % 6}`);
  });

  allEdges.forEach(e => {
    if (e.label) {
      const escaped = e.label.replace(/"/g, "'");
      out.push(`  ${e.from} -->|"${escaped}"| ${e.to}`);
    } else {
      out.push(`  ${e.from} --> ${e.to}`);
    }
  });

  return out.join('\n');
}
