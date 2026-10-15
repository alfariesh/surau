// Tes integrasi @surau/text terhadap Ihya Shamela 9472 di drive lokal pemilik (hanya-baca).
// Dilewati otomatis bila drive tidak terpasang (CI). Tidak ada teks kitab yang disalin ke git:
// tes hanya memeriksa invarian dan mencetak angka.
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import {
  cleanShamelaHtml,
  findQuote,
  linkFootnotes,
  normalizeArabic,
  splitFootnotes,
  splitParagraphs,
  toRawSpan,
} from "@surau/text";
import { beforeAll, describe, expect, test } from "vite-plus/test";

// SURAU_IHYA_DB bisa menimpa lokasi (mis. path yang tidak ada, untuk menguji jalur "dilewati").
const DB = process.env.SURAU_IHYA_DB ?? "/Volumes/Elfariesh/database/book/472/9472.db";

interface PageRow {
  id: number;
  part: string;
  page: string;
  content: string | null;
}

// Isi blok describe tetap dieksekusi saat tes dikumpulkan walau di-skip, jadi DB dibuka di
// beforeAll (hanya berjalan bila blok tidak di-skip). Regresi: CI gagal "unable to open database file".
describe.skipIf(!existsSync(DB))("Ihya 9472 (DB lokal)", () => {
  let pages: PageRow[] = [];
  beforeAll(() => {
    const db = new DatabaseSync(DB, { readOnly: true });
    pages = db
      .prepare("SELECT id, part, page, content FROM page ORDER BY id")
      .all() as unknown as PageRow[];
    db.close();
  });

  test("struktur: 1.706 halaman, 1.124 berpemisah catatan kaki, judul tanpa sisa tag", () => {
    expect(pages).toHaveLength(1706);
    let withFoot = 0;
    let titles = 0;
    let spans = 0;
    for (const p of pages) {
      const content = p.content ?? "";
      spans += content.match(/<span data-type="title"/g)?.length ?? 0;
      const split = splitFootnotes(content);
      if (split.footnotes !== "") withFoot++;
      const clean = cleanShamelaHtml(split.body);
      titles += clean.titles.length;
      expect(clean.text).not.toMatch(/<\/?span/);
      expect(clean.unknownTags).toEqual([]);
      for (const t of clean.titles) expect(t.tocId).not.toBeNull();
    }
    expect(withFoot).toBe(1124);
    expect(titles).toBe(spans);
  });

  test("normalisasi + findQuote round-trip di setiap halaman (jendela 4 token acak, seed tetap)", () => {
    let a = 9472;
    const next = (): number => {
      a = (a * 1103515245 + 12345) % 2147483648;
      return a / 2147483648;
    };
    const failures: string[] = [];
    let checked = 0;
    for (const p of pages) {
      const raw = cleanShamelaHtml(p.content ?? "").text;
      const n = normalizeArabic(raw);
      if (n.map.length !== n.text.length) failures.push(`${p.id}: panjang peta`);
      const tokens = n.text.split(" ");
      if (tokens.length < 8) continue;
      const i = Math.floor(next() * (tokens.length - 4));
      const quote = tokens.slice(i, i + 4).join(" ");
      const hit = findQuote(raw, quote, { normalized: n });
      checked++;
      if (hit === null || normalizeArabic(hit.rawText).text !== quote)
        failures.push(`${p.id}: ${quote}`);
      const start = tokens.slice(0, i).join(" ").length + (i > 0 ? 1 : 0);
      const [rs, re] = toRawSpan(raw, n, start, start + quote.length);
      if (!normalizeArabic(raw.slice(rs, re)).text.includes(quote)) failures.push(`${p.id}: span`);
    }
    expect(checked).toBeGreaterThan(1600);
    expect(failures).toEqual([]);
  });

  test("j1 h200: takhrij al-'Iraqi 'باطل لا أصل له' ditemukan di catatan kaki", () => {
    const page = pages.find((p) => p.part === "1" && Number(p.page) === 200);
    expect(page).toBeDefined();
    const { footnotes } = splitFootnotes(page?.content ?? "");
    const hit = findQuote(footnotes, "باطل لا أصل له");
    expect(hit).not.toBeNull();
  });

  test("semua penanda (١) di badan teks terhubung ke catatan kaki, tanpa catatan yatim", () => {
    let refs = 0;
    let linked = 0;
    let orphanNotes = 0;
    for (const p of pages) {
      const { body, footnotes } = splitFootnotes(p.content ?? "");
      const r = linkFootnotes(body, footnotes);
      refs += r.refs.length;
      linked += r.links.length;
      orphanNotes += r.orphanNotes.length;
    }
    console.info(`Ihya: ${refs} penanda, ${linked} terhubung, ${orphanNotes} catatan yatim`);
    expect(refs).toBeGreaterThan(4000);
    expect(linked).toBe(refs);
    expect(orphanNotes).toBe(0);
  });

  test("paragraf: offset splitParagraphs menunjuk ke teks bersih", () => {
    for (const p of pages.slice(0, 200)) {
      const clean = cleanShamelaHtml(splitFootnotes(p.content ?? "").body).text;
      for (const para of splitParagraphs(clean))
        expect(clean.slice(para.start, para.end)).toBe(para.text);
    }
  });
});
