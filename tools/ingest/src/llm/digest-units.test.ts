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
  quoteLocator,
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
    // Paragraf sebelumnya di bagian yang sama: penanda pertama sesudahnya ada di paragraf berikut
    // (±650 karakter, lintas paragraf) dan takhrijnya "la asl": larangan tetap berlaku.
    expect(inspect({ passageId: 10_000_003, start: 0, end: 40 })).toEqual({
      kind: "report",
      banned: "takhrij la_asl",
    });
    // Paragraf di bagian lain (bab kedua tanpa penanda): perkataan biasa.
    expect(inspect({ passageId: 10_000_004, start: 0, end: 40 })).toEqual({
      kind: "text",
      banned: null,
    });
    const verse = passage(7, 4, 1, 5, "بيت تجريبي أول ... بيت تجريبي ثان");
    expect(
      quoteInspector({
        page: corpus().page,
        passage: [verse],
        footnote_ref: [],
      })({
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

describe("riwayat panjang", () => {
  test("potongan awal riwayat yang penandanya beberapa blok kemudian tetap riwayat dan dilarang", () => {
    const hadith = `قال رسول الله ${"نص تجريبي طويل في الحديث ".repeat(30)}(١)`;
    const p = passage(10, 4, 1, 7, hadith);
    const note = passage(11, null, 1, 2, "حديث تجريبي لا أصل له", "foot");
    const marker = hadith.lastIndexOf("(١)");
    const inspect = quoteInspector({
      page: corpus().page,
      passage: [p, note],
      footnote_ref: [
        {
          passage_id: p.id,
          char_start: marker,
          char_end: marker + 3,
          marker: "١",
          footnote_passage_id: note.id,
        },
      ],
    });
    // Blok pertama saja (±220 karakter), penandanya ±500 karakter kemudian, tanpa titik di antaranya.
    expect(inspect({ passageId: p.id, start: 0, end: 220 })).toEqual({
      kind: "report",
      banned: "takhrij la_asl",
    });
    // Ada akhir kalimat di antaranya: larangan tetap berlaku (riwayat bisa memuat titik), tetapi
    // label riwayat tidak dipakai bila takhrijnya tidak terlarang (lihat kasus di bawah).
    const prose = `${"كلام المؤلف. ".repeat(5)}قال رسول الله نص تجريبي (١)`;
    const q = passage(12, 4, 1, 8, prose);
    const m2 = prose.lastIndexOf("(١)");
    const inspect2 = quoteInspector({
      page: corpus().page,
      passage: [q, note],
      footnote_ref: [
        {
          passage_id: q.id,
          char_start: m2,
          char_end: m2 + 3,
          marker: "١",
          footnote_passage_id: note.id,
        },
      ],
    });
    expect(inspect2({ passageId: q.id, start: 0, end: 12 })).toEqual({
      kind: "report",
      banned: "takhrij la_asl",
    });
    // Penanda lebih dari 1.500 karakter sesudahnya: di luar jangkauan.
    const far = `${"كلام المؤلف بلا علامة ".repeat(80)}(١)`;
    const f = passage(15, 4, 1, 10, far);
    const mf = far.lastIndexOf("(١)");
    expect(
      quoteInspector({
        page: corpus().page,
        passage: [f, note],
        footnote_ref: [
          {
            passage_id: f.id,
            char_start: mf,
            char_end: mf + 3,
            marker: "١",
            footnote_passage_id: note.id,
          },
        ],
      })({ passageId: f.id, start: 0, end: 20 }),
    ).toEqual({ kind: "text", banned: null });

    // Perkataan penulis sebelum riwayat baru ("قال" di antaranya): tetap perkataan, tetapi
    // larangan takhrij riwayat berikutnya tetap berlaku.
    const words = "كلام المؤلف بلا علامة ثم قال رسول الله نص تجريبي (١)";
    const w = passage(13, 4, 1, 9, words);
    const m3 = words.lastIndexOf("(١)");
    const okNote = passage(14, null, 1, 3, "حديث تجريبي رواه البخاري", "foot");
    const refs = (id: number) => [
      { passage_id: w.id, char_start: m3, char_end: m3 + 3, marker: "١", footnote_passage_id: id },
    ];
    const at = { passageId: w.id, start: 0, end: 11 };
    expect(
      quoteInspector({
        page: corpus().page,
        passage: [w, okNote],
        footnote_ref: refs(okNote.id),
      })(at),
    ).toEqual({
      kind: "text",
      banned: null,
    });
    expect(
      quoteInspector({
        page: corpus().page,
        passage: [w, note],
        footnote_ref: refs(note.id),
      })(at),
    ).toEqual({
      kind: "report",
      banned: "takhrij la_asl",
    });
  });
});

describe("penunjuk kutipan v2", () => {
  test("awal di blok dari, akhir di blok sampai sesudah awal; frasa berulang ditolak", () => {
    const text = "قال الشيخ العلم نور. والجهل ظلمة في القلب. ثم قال غير ذلك في القلب";
    const p = passage(8, 4, 1, 6, text);
    const locate = quoteLocator({ passage: [p] });
    const all = { passageId: p.id, start: 0, end: text.length };
    const firstEnd = text.indexOf("والجهل");
    const lastStart = text.indexOf("ثم");
    // Satu blok utuh: awal di blok pertama, akhir boleh di mana saja sesudahnya.
    expect(locate(all, "العلم نور", "ظلمة في", text.length, 0)).toEqual({
      passageId: p.id,
      start: text.indexOf("العلم"),
      end: text.indexOf(" القلب."),
    });
    // "في القلب" muncul dua kali: ambigu, tidak ditebak.
    expect(locate(all, "العلم نور", "في القلب", text.length, 0)).toBe("pointer_ambiguous");
    // Akhir harus berakhir di blok "sampai": kemunculan yang hanya di blok pertama tidak dipakai.
    expect(locate(all, "العلم نور", "في القلب", firstEnd, lastStart)).toEqual({
      passageId: p.id,
      start: text.indexOf("العلم"),
      end: text.length,
    });
    // Awal harus mulai di blok "dari".
    expect(locate(all, "ثم قال", "ذلك", firstEnd, lastStart)).toBe("pointer_start_not_found");
    expect(locate(all, "الجهل", "القلب", 15, lastStart)).toBe("pointer_start_not_found");
  });
});
