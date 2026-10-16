// Tes integrasi @surau/core terhadap D1 lokal berisi Ihya penuh (S07: `pnpm corpus:load:local`).
// Berjalan di project Vitest "node" lewat getPlatformProxy (ARSITEKTUR §7 aturan 2) dan dilewati
// bila state D1 lokal tidak ada (CI), DB korpus belum dimigrasi, atau Ihya belum dimuat. State
// disalin dulu ke folder sementara: tes tidak pernah menulis ke DB dev, dan tidak berebut kunci
// SQLite dengan `pnpm dev` yang sedang jalan (salinan saat DB sedang ditulis bisa tidak konsisten;
// jalankan ulang bila itu terjadi). Teks kitab TIDAK disalin ke file ini; yang diperiksa adalah
// kesamaan dengan DB, struktur, dan satu frasa takhrij ("باطل لا أصل له") yang sudah tercantum di
// .claude/rules/teks-arab.md.
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { D1Db } from "@surau/db";
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";

import {
  NotFound,
  SECTION_MAX_TOKENS,
  SECTION_MIN_TOKENS,
  buildCitation,
  getToc,
  getWork,
  listWorks,
  pageView,
  readPage,
  readSection,
  sectionView,
} from "../../src/index.ts";
import type { SectionView } from "../../src/index.ts";

const repo = resolve(import.meta.dirname, "../../../..");
const state = join(repo, ".wrangler/state/v3");
const hasState = existsSync(join(state, "d1"));

describe.skipIf(!hasState)("Ihya di D1 lokal", () => {
  let db: D1Db;
  let dispose: (() => Promise<void>) | undefined;
  let tmp: string | undefined;
  let editionId = 0;

  beforeAll(async () => {
    tmp = mkdtempSync(join(tmpdir(), "surau-core-ihya-"));
    cpSync(join(state, "d1"), join(tmp, "v3", "d1"), { recursive: true });
    const { getPlatformProxy } = await import("wrangler");
    const proxy = await getPlatformProxy<{ CORPUS: D1Db }>({
      configPath: join(repo, "packages/db/wrangler.jsonc"),
      remoteBindings: false,
      persist: { path: join(tmp, "v3") },
    });
    dispose = proxy.dispose;
    db = proxy.env.CORPUS;
    // Belum dimuat (NotFound) atau belum dimigrasi ("no such table") → semua tes dilewati.
    const work = await getWork(db, "ihya").catch((e: unknown) => {
      if (e instanceof NotFound || (e instanceof Error && /no such table/.test(e.message))) {
        return null;
      }
      throw e;
    });
    editionId = work?.editions.find((e) => e.is_default)?.id ?? 0;
  }, 60_000);

  afterAll(async () => {
    await dispose?.();
    if (tmp !== undefined) rmSync(tmp, { recursive: true, force: true });
  });

  /** text_raw langsung dari DB, untuk dibandingkan dengan keluaran core. */
  async function rawText(ids: readonly number[]): Promise<Map<number, string>> {
    const out = new Map<number, string>();
    for (let i = 0; i < ids.length; i += 100) {
      const part = ids.slice(i, i + 100);
      const { results } = await db
        .prepare(`SELECT id, text_raw FROM passage WHERE id IN (${part.map(() => "?").join(",")})`)
        .bind(...part)
        .all();
      for (const r of results as { id: number; text_raw: string }[]) out.set(r.id, r.text_raw);
    }
    return out;
  }

  test("listWorks: Ihya dengan edisi default, lisensi, dan atribusi OpenITI", async ({ skip }) => {
    skip(editionId === 0, "Ihya belum dimuat ke D1 lokal (pnpm corpus:load:local)");
    const ihya = (await listWorks(db)).works.find((w) => w.slug === "ihya");
    expect(ihya?.openiti_uri).toBe("0505Ghazali.IhyaCulumDin");
    expect(ihya?.editions[0]).toMatchObject({
      slug: "dar-al-marifah",
      is_default: true,
      permalink: "/kitab/ihya",
      license: "CC BY-NC-SA 4.0",
    });
    expect(ihya?.editions[0]?.attribution).toMatch(/OpenITI/);
  });

  test("readPage j1 h200: teks + catatan kaki takhrij yang benar", async ({ skip }) => {
    skip(editionId === 0, "Ihya belum dimuat ke D1 lokal (pnpm corpus:load:local)");
    const view = await readPage(db, editionId, 1, 200);
    expect(pageView.parse(view)).toEqual(view);
    expect(view.citation).toMatchObject({
      juz: 1,
      page_no: 200,
      permalink: "/kitab/ihya/1/200",
      label: "Ihya' 'Ulum ad-Din, j. 1, h. 200",
    });
    expect(view.citation.source.work.author?.name_id).toBe("Abu Hamid al-Ghazali");
    expect(view.source_url).toBe("https://shamela.ws/book/9472/200");
    expect([view.body.length, view.footnotes.length]).toEqual([7, 7]);

    // Teks persis sama dengan DB.
    const all = [...view.body, ...view.footnotes];
    const raw = await rawText(all.map((p) => p.id));
    for (const p of all) expect(p.text_raw).toBe(raw.get(p.id));

    // Penanda ١..٧ berurutan, masing-masing ke catatan kaki bernomor sama di halaman ini.
    const refs = view.body.flatMap((b) => b.footnote_refs.map((r) => ({ b, r })));
    expect(refs.map(({ r }) => r.marker)).toEqual(["١", "٢", "٣", "٤", "٥", "٦", "٧"]);
    for (const { b, r } of refs) {
      expect(b.text_raw.slice(r.char_start, r.char_end)).toBe(`(${r.marker})`);
      const foot = view.footnotes.find((f) => f.id === r.footnote_id);
      expect(foot?.text_raw.startsWith(`(${r.marker})`)).toBe(true);
    }

    // Hadits shalat malam Jumat → takhrij al-'Iraqi "باطل لا أصل له" (contoh baku di rules):
    // catatan kaki itu ada, dan tertaut dari penanda paragraf badan di halaman ini.
    const takhrij = view.footnotes.filter((f) => f.text_raw.includes("باطل لا أصل له"));
    expect(takhrij.length).toBeGreaterThan(0);
    for (const t of takhrij) expect(refs.some(({ r }) => r.footnote_id === t.id)).toBe(true);
    expect(view.footnotes.every((f) => f.needs_review.length === 0)).toBe(true);

    expect(view.prev?.page_no).toBe(199);
    expect(view.next?.page_no).toBe(201);
    expect((await buildCitation(db, view.body[0]?.id ?? 0)).permalink).toBe(
      `/kitab/ihya/1/200#${view.body[0]?.anchor}`,
    );
  });

  test("getToc: 5 akar (muqaddimah + 4 rub'), setiap rub' 10 kitab", async ({ skip }) => {
    skip(editionId === 0, "Ihya belum dimuat ke D1 lokal (pnpm corpus:load:local)");
    const toc = await getToc(db, editionId);
    expect(toc.nodes).toHaveLength(5);
    expect(toc.nodes.slice(1).map((n) => n.child_count)).toEqual([10, 10, 10, 10]);
    expect(toc.nodes.slice(1).every((n) => n.children.length === 10)).toBe(true);
  });

  test("readSection bagian terpanjang: dipaginasi tanpa memotong paragraf", async ({ skip }) => {
    skip(editionId === 0, "Ihya belum dimuat ke D1 lokal (pnpm corpus:load:local)");
    // Bagian terpanjang = node dengan subpohon berteks terbanyak (dihitung di SQL, bukan dari core).
    const longest = (await db
      .prepare(
        `WITH RECURSIVE sub(root, id) AS (
             SELECT id, id FROM toc_node WHERE edition_id = ?1
             UNION ALL SELECT sub.root, t.id FROM toc_node t JOIN sub ON t.parent_id = sub.id
           )
           SELECT sub.root AS id, sum(length(p.text_raw)) AS chars
           FROM sub JOIN passage p ON p.toc_node_id = sub.id
           GROUP BY sub.root ORDER BY chars DESC LIMIT 1`,
      )
      .bind(editionId)
      .first()) as { id: number; chars: number };
    const expected = (
      (
        await db
          .prepare(
            `WITH RECURSIVE sub(id) AS (
                 SELECT id FROM toc_node WHERE id = ?1
                 UNION ALL SELECT t.id FROM toc_node t JOIN sub ON t.parent_id = sub.id
               )
               SELECT p.id FROM passage p JOIN page pg ON pg.id = p.page_id
               WHERE p.toc_node_id IN (SELECT id FROM sub)
               ORDER BY pg.juz, pg.page_no, p.kind = 'foot', p.ord`,
          )
          .bind(longest.id)
          .all()
      ).results as { id: number }[]
    ).map((r) => r.id);

    const chunks: SectionView[] = [];
    let cursor: string | undefined;
    do {
      const view = await readSection(db, longest.id, cursor);
      chunks.push(view);
      cursor = view.next_cursor ?? undefined;
    } while (cursor !== undefined && chunks.length < 2_000);

    const got = chunks.flatMap((c) => c.passages);
    // Setiap paragraf bagian tepat sekali (urutan antarhalaman tetap; di halaman yang terbelah,
    // catatan kaki ikut potongan paragraf badan yang merujuknya).
    expect(got.map((p) => p.id).toSorted((a, b) => a - b)).toEqual(
      expected.toSorted((a, b) => a - b),
    );
    const raw = await rawText(expected);
    let chars = 0;
    for (const p of got) {
      expect(p.text_raw).toBe(raw.get(p.id));
      chars += p.text_raw.length;
    }
    expect(chars).toBe(longest.chars);

    // Urutan halaman tidak pernah mundur antarpotongan.
    const order = got.map((p) => p.location.juz * 10_000 + p.location.page_no);
    expect(order).toEqual(order.toSorted((a, b) => a - b));
    for (const [i, c] of chunks.entries()) {
      const single = c.passages.filter((p) => p.kind === "body").length <= 1;
      expect(single || c.estimated_tokens <= SECTION_MAX_TOKENS).toBe(true);
      const here = new Set(c.passages.map((p) => p.id));
      for (const p of c.passages) {
        for (const r of p.footnote_refs) expect(here.has(r.footnote_id)).toBe(true);
      }
      expect(c.next_cursor === null).toBe(i === chunks.length - 1);
    }
    expect(sectionView.parse(chunks[0])).toEqual(chunks[0]);
    expect(chunks.length).toBeGreaterThan(100);

    // Ringkasan untuk Catatan hasil S08 (angka, tanpa teks).
    const tokens = chunks
      .slice(0, -1)
      .map((c) => c.estimated_tokens)
      .toSorted((a, b) => a - b);
    const pct = (f: number) => tokens[Math.floor(f * (tokens.length - 1))];
    const below = tokens.filter((t) => t < SECTION_MIN_TOKENS).length;
    console.info(
      `readSection ${longest.id}: ${chunks.length} potongan, ${got.length} paragraf, ` +
        `${chars} karakter; token/potongan (tanpa yang terakhir) p5 ${pct(0.05)} ` +
        `p50 ${pct(0.5)} maks ${pct(1)}; <${SECTION_MIN_TOKENS}: ${below}`,
    );
  }, 180_000);
});
