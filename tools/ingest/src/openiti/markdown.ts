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

/**
 * Isi penanda halaman OpenITI tanpa nomor (`PageV00P000`, hasil konversi yang kehilangan nomor)
 * dari urutannya (ADR-152; mis. al-Waraqat). Setiap deret penanda tanpa nomor di antara dua penanda
 * bernomor wajib PAS mengisi celahnya (jilid sama, selisih nomor = panjang deret + 1); deret di awal
 * mendapat nomor mundur dari penanda bernomor pertama, deret di akhir maju dari yang terakhir.
 * Celah yang tidak pas = galat, supaya teks tidak dipasangkan ke halaman yang salah diam-diam.
 * Hanya untuk kitab ber-`openiti.fillZeroPageMarkers`; QA matan per halaman tetap berlaku.
 */
export function fillZeroPageMarkers(pages: readonly OpenitiPage[]): OpenitiPage[] {
  const isZero = (p: OpenitiPage): boolean => p.volume === 0 && p.page === 0;
  const numbered = pages.flatMap((p, i) => (isZero(p) ? [] : [i]));
  const first = numbered[0];
  const last = numbered.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error("OpenITI: tidak ada penanda halaman bernomor untuk mengisi PageV00P000");
  }
  const out = pages.map((p) => ({ ...p }));
  const at = (i: number): OpenitiPage => out[i] as OpenitiPage;
  for (let i = first - 1; i >= 0; i--) {
    const next = at(i + 1);
    if (next.page <= 1)
      throw new Error("OpenITI: PageV00P000 di awal tidak muat sebelum halaman 1");
    out[i] = { ...at(i), volume: next.volume, page: next.page - 1 };
  }
  for (let k = 0; k + 1 < numbered.length; k++) {
    const a = at(numbered[k] as number);
    const bi = numbered[k + 1] as number;
    const b = at(bi);
    const run = bi - (numbered[k] as number) - 1;
    if (run === 0) continue;
    if (a.volume !== b.volume || b.page - a.page - 1 !== run) {
      throw new Error(
        `OpenITI: ${run} penanda PageV00P000 antara PageV${a.volume}P${a.page} dan PageV${b.volume}P${b.page} tidak mengisi celah dengan pas`,
      );
    }
    for (let j = 1; j <= run; j++) {
      out[(numbered[k] as number) + j] = {
        ...at((numbered[k] as number) + j),
        volume: a.volume,
        page: a.page + j,
      };
    }
  }
  for (let i = last + 1; i < out.length; i++) {
    const prev = at(i - 1);
    out[i] = { ...at(i), volume: prev.volume, page: prev.page + 1 };
  }
  return out;
}
