// Parser mARkdown OpenITI minimal, cukup untuk QA (bukan untuk menampilkan teks).
// Format: https://alraqmiyyat.github.io/mARkdown/. Jebakan yang ditangani (docs/03):
// - penanda halaman `PageVxxPyyy` ada di AKHIR halaman: teks SEBELUM penanda adalah isi halaman itu;
// - baris lanjutan `~~` digabung ke baris sebelumnya;
// - milestone `ms\d+` dan tag ayat `@QB@`/`@QE@` dibuang;
// - pembuka paragraf `#` dan judul `### |…` dibuang (teks judulnya tetap).
// File sumber tidak pernah diubah; semua ini hanya terjadi di memori.

export interface OpenitiPage {
  volume: number;
  page: number;
  /** Teks halaman tanpa markup, baris dipisah `\n`. */
  text: string;
}

const HEADER_END = "#META#Header#End#";
const PAGE_MARKER = /PageV(\d+)P(\d+)/g;

/** Buang markup mARkdown dari potongan teks satu halaman. */
export function stripMarkdown(chunk: string): string {
  return chunk
    .replace(/\r\n?/g, "\n")
    .replace(/\n~~/g, " ")
    .split("\n")
    .map((line) =>
      line
        .replace(/^#+\s*\|*\s*/, "")
        .replace(/@Q[BE]@/g, " ")
        .replace(/\bms\d+\b/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim(),
    )
    .filter((line) => line !== "")
    .join("\n");
}

/** Pecah file mARkdown menjadi halaman. Teks setelah penanda halaman terakhir dibuang. */
export function parseOpenitiPages(source: string): OpenitiPage[] {
  const start = source.indexOf(HEADER_END);
  const text = start < 0 ? source : source.slice(start + HEADER_END.length);
  const pages: OpenitiPage[] = [];
  let last = 0;
  for (const m of text.matchAll(PAGE_MARKER)) {
    pages.push({
      volume: Number(m[1]),
      page: Number(m[2]),
      text: stripMarkdown(text.slice(last, m.index)),
    });
    last = m.index + m[0].length;
  }
  return pages;
}

/**
 * Gabungkan penanda halaman OpenITI BERURUTAN yang bernomor sama (jilid, halaman) menjadi satu
 * halaman, pasangan halaman Surau gabungan (ADR-139; mis. al-Ajurrumiyyah memecah satu halaman
 * cetak per bab). Hanya untuk kitab ber-`mergeSamePrintPage`; kitab lain tetap per penanda.
 */
export function mergeSamePageMarkers(pages: readonly OpenitiPage[]): OpenitiPage[] {
  const out: OpenitiPage[] = [];
  const seen = new Set<string>();
  for (const p of pages) {
    const last = out.at(-1);
    if (last !== undefined && last.volume === p.volume && last.page === p.page) {
      out[out.length - 1] = {
        ...last,
        text: [last.text, p.text].filter((t) => t !== "").join("\n"),
      };
    } else {
      const key = `${p.volume}:${p.page}`;
      if (seen.has(key)) {
        throw new Error(
          `OpenITI PageV${p.volume}P${p.page}: nomor halaman sama muncul lagi tidak berurutan (ADR-139)`,
        );
      }
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}
