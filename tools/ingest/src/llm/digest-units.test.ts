// Fixture: kalimat Arab buatan ("نص تجريبي"), bukan teks kitab.
import { describe, expect, test } from "vite-plus/test";

import {
  DIGEST_BLOCK_SINGLE_MAX,
  blockCuts,
  digestCustomId,
  digestKey,
  digestPlan,
  parseDigestCustomId,
  passageBlocks,
  quoteInspector,
} from "./digest-units.ts";
import { digestCorpus as corpus, long, passage } from "../../test/digest-fixture.ts";

describe("blok", () => {
  test("blok menutup text_raw persis, tidak memotong rentang yang dijaga, memotong di subjudul", () => {
    const text = long(30);
    const keep = [{ start: 200, end: 420 }];
    const cuts = blockCuts(text, keep, [55]);
    expect(cuts).toContain(55);
    expect(cuts.every((c) => !(c > 200 && c < 420))).toBe(true);
    const bounds = [0, ...cuts, text.length];
    const pieces = bounds.slice(1).map((end, i) => text.slice(bounds[i], end));
    expect(pieces.join("")).toBe(text);
    expect(pieces.every((p) => p.trim() !== "")).toBe(true);
    expect(blockCuts(long(5).slice(0, DIGEST_BLOCK_SINGLE_MAX), [], [])).toEqual([]);
  });

  test("ayat tetap utuh di satu blok bertanda placeholder; judul node jadi blok judul", () => {
    const rows = corpus();
    const p = rows.passage.find((x) => x.id === 10_000_006)!;
    const r = passageBlocks(p, rows.passage_ayah_ref, rows.footnote_ref, []);
    if (typeof r === "string") throw new Error(r);
    expect(r.blocks.map((b) => p.text_raw.slice(b.start, b.end)).join("")).toBe(p.text_raw);
    const withAyah = r.blocks.filter((b) => b.ayah);
    expect(withAyah).toHaveLength(1);
    expect(withAyah[0]?.text).toContain("⟦QS 39:9⟧");
    expect(r.blocks.every((b) => !/قل هل يستوي/u.test(b.text))).toBe(true);
    const plan = digestPlan(rows, { scope: 100_003 });
    const intro = plan.leafById.get(digestCustomId(100_003, "part", 1))!;
    expect(intro.blocks[0]).toMatchObject({ label: "b1", heading: true, paragraph: 1 });
  });

  test("rujukan ayat rusak = paragraf tidak dikirim", () => {
    const rows = corpus();
    const bad = { ...rows.passage_ayah_ref[0]!, char_end: 99_999 };
    const plan = digestPlan({ ...rows, passage_ayah_ref: [bad] }, { scope: 100_003 });
    expect(plan.blocked).toEqual([
      { passageId: 10_000_006, detail: "rujukan ayat tidak bisa ditandai" },
    ]);
  });
});

describe("rencana tiga tahap", () => {
  test("bab pendek = satu request final; bab panjang = potongan + merge; kitab = book (mixed)", () => {
    const plan = digestPlan(corpus(), { scope: 100_003, maxTokens: 150 });
    const bab1 = plan.nodeById.get(100_004)!;
    expect(bab1).toMatchObject({
      stage: "leaf",
      basis: "text",
      tier: "section",
      customId: "dg-100004-id",
    });
    const bab2 = plan.nodeById.get(100_005)!;
    expect(bab2).toMatchObject({ stage: "merge", basis: "text", customId: "dg-100005-id-m" });
    expect(bab2.parts).toEqual(["dg-100005-id-p1", "dg-100005-id-p2"]);
    const kitab = plan.nodeById.get(100_003)!;
    expect(kitab).toMatchObject({
      stage: "book",
      basis: "mixed",
      tier: "book",
      customId: "dg-100003-id-b",
    });
    expect(kitab.children).toEqual([100_004, 100_005]);
    expect(plan.leafById.get("dg-100003-id-p1")?.intro).toBe(true);
    // Pascaurut: anak sebelum induk.
    expect(plan.nodes.map((n) => n.tocNodeId)).toEqual([100_004, 100_005, 100_003]);
    expect([...plan.scope].sort((a, b) => a - b)).toEqual([100_003, 100_004, 100_005]);
  });

  test("sha deterministik dan berjenjang: teks bab berubah = bab dan kitab basi, bab lain tidak", () => {
    const a = digestPlan(corpus(), { scope: 100_003 });
    const b = digestPlan(corpus(), { scope: 100_003 });
    expect(b.nodes.map((n) => n.sourceSha256)).toEqual(a.nodes.map((n) => n.sourceSha256));
    const c = digestPlan(corpus({ 3: long(7) }), { scope: 100_003 });
    const sha = (p: typeof a, id: number) => p.nodeById.get(id)?.sourceSha256;
    expect(sha(c, 100_004)).not.toBe(sha(a, 100_004));
    expect(sha(c, 100_003)).not.toBe(sha(a, 100_003));
    expect(sha(c, 100_005)).toBe(sha(a, 100_005));
  });

  test("custom_id dan kunci sumber", () => {
    for (const id of [
      "dg-100003-id",
      "dg-100003-id-p2",
      "dg-100003-id-m",
      "dg-100003-id-b",
      "dg-100003-id-bh",
    ]) {
      const p = parseDigestCustomId(id)!;
      expect(digestCustomId(p.tocNodeId, p.kind, p.part ?? undefined)).toBe(id);
    }
    expect(parseDigestCustomId("toc-100003-id")).toBeNull();
    expect(digestKey(100_012)).toBe("n12");
    expect(digestKey(100_012, 2)).toBe("n12p2");
  });
});

describe("jenis kutipan dari kode", () => {
  test("riwayat bertakhrij 'tidak ada asalnya' dilarang; syair dikenali", () => {
    const rows = corpus();
    const inspect = quoteInspector(rows);
    const p = rows.passage.find((x) => x.id === 10_000_006)!;
    const end = p.text_raw.lastIndexOf("(١)") - 1;
    expect(inspect({ passageId: p.id, start: end - 40, end })).toEqual({
      kind: "report",
      banned: "takhrij la_asl",
    });
    expect(inspect({ passageId: 10_000_003, start: 0, end: 40 })).toEqual({
      kind: "text",
      banned: null,
    });
    const verse = passage(7, 4, 1, 5, "بيت تجريبي أول ... بيت تجريبي ثان");
    expect(
      quoteInspector({ passage: [verse], footnote_ref: [] })({
        passageId: verse.id,
        start: 0,
        end: 15,
      }),
    ).toEqual({
      kind: "poetry",
      banned: null,
    });
  });
});
