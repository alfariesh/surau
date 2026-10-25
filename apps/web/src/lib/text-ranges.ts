// Range DOM untuk rentang karakter di gabungan node teks sebuah elemen (urut dokumen), dipakai
// sorotan CSS Custom Highlight API: hasil Cari di pembaca (S14) dan kalimat audio Intisari (X18).
// DOM dan teks tidak diubah sama sekali.

export interface Span {
  start: number;
  end: number;
}

/** Range untuk rentang di gabungan teks node-node teks `root` (urut dokumen). */
export function rangesFor(root: Element, spans: readonly Span[]): Range[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; start: number }[] = [];
  let length = 0;
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    const text = n as Text;
    nodes.push({ node: text, start: length });
    length += text.data.length;
  }
  const at = (pos: number): [Text, number] | null => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const item = nodes[i];
      if (item !== undefined && item.start <= pos) return [item.node, pos - item.start];
    }
    return null;
  };
  return spans.flatMap((s) => {
    const a = at(s.start);
    const b = at(s.end);
    if (a === null || b === null) return [];
    const range = document.createRange();
    range.setStart(a[0], Math.min(a[1], a[0].data.length));
    range.setEnd(b[0], Math.min(b[1], b[0].data.length));
    return [range];
  });
}

/** Posisi karakter (di gabungan teks `root`) dari titik node teks + offset; null bila di luar. */
export function textOffset(root: Element, node: Node, offset: number): number | null {
  if (!root.contains(node)) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let length = 0;
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    if (n === node) return length + offset;
    length += (n as Text).data.length;
  }
  return null;
}
