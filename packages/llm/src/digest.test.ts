// Fixture: teks Indonesia dan kata Arab buatan, bukan teks kitab.
import { describe, expect, test } from "vite-plus/test";

import { DIGEST_BOOK_SCHEMA, DIGEST_LEAF_SCHEMA } from "../prompts/digest-schema.ts";
import { GLOSSARY_V1 } from "../prompts/glossary-v1.ts";
import {
  GLOSSARY_TERMS,
  GLOSSARY_TERM_KEYS,
  GLOSSARY_V2,
  glossaryWritten,
} from "../prompts/glossary-v2.ts";
import { MODELS } from "./client.ts";
import {
  DIGEST_SECTION_PROMPT,
  buildDigestLeafRequest,
  buildDigestMergeRequest,
  judgeDigest,
  leafPointRange,
  mergePointRange,
} from "./digest.ts";
import type { DigestJudgeContext, LeafBlock, QuoteInspection } from "./digest.ts";
import { judgeGlossaryGlosses } from "./glossary.ts";

const msg = (body: unknown, stop: "end_turn" | "max_tokens" | "refusal" = "end_turn") => ({
  content: [
    {
      type: "text" as const,
      text: typeof body === "string" ? body : JSON.stringify(body),
      citations: null,
    },
  ],
  stop_reason: stop,
});

const words = (n: number, w = "ilmu") => Array.from({ length: n }, () => w).join(" ");
const body = (topic: string) =>
  `Al-Ghazali menjelaskan bahwa ${topic} menjadi pokok pembahasan bagian ini. ${words(40, "kata")}.`;
const ABSTRACT =
  "Al-Ghazali menjelaskan keutamaan ilmu dan para ulama. Ia menukil pendapat para sahabat tentang ilmu yang bermanfaat dan membantah anggapan bahwa ilmu hanya hafalan.";

// Tiga paragraf: p1 judul (b1), p2 = b2–b4 (b3 memuat ayat), p3 = b5–b6.
const blocks = new Map<string, LeafBlock>([
  ["b1", { passageId: 11, start: 0, end: 30, heading: true, ayah: false }],
  ["b2", { passageId: 12, start: 0, end: 150, heading: false, ayah: false }],
  ["b3", { passageId: 12, start: 150, end: 320, heading: false, ayah: true }],
  ["b4", { passageId: 12, start: 320, end: 500, heading: false, ayah: false }],
  ["b5", { passageId: 13, start: 0, end: 200, heading: false, ayah: false }],
  ["b6", { passageId: 13, start: 200, end: 380, heading: false, ayah: false }],
]);
const plain = (): QuoteInspection => ({ kind: "text", banned: null });
const leafCtx = (
  inspectQuote: (r: { passageId: number; start: number; end: number }) => QuoteInspection = plain,
): DigestJudgeContext => ({ stage: "leaf", blocks, points: { min: 2, max: 3 }, inspectQuote });

const point = (title: string, dasar: string[], over: Record<string, unknown> = {}) => ({
  judul: title,
  isi: body(title.toLowerCase()),
  sikap: "author",
  jenis: "idea",
  dasar,
  pertanyaan: ["Menurut al-Ghazali, apa keutamaan ilmu?"],
  ...over,
});
const leafOut = (over: Record<string, unknown> = {}) => ({
  abstrak: ABSTRACT,
  gagasan: [
    point("Al-Ghazali mendahulukan ilmu atas ibadah", ["b2"]),
    point("Al-Ghazali menyebut ulama pewaris para nabi", ["b5", "b6"]),
  ],
  kutipan: [
    { dari: "b5", sampai: "b5", gagasan: 2, terjemahan: "Ilmu adalah cahaya yang dilihat hati." },
  ],
  istilah: ["ilmu", "ulama"],
  ...over,
});

describe("glosarium berkunci", () => {
  test("setiap pasangan GLOSSARY_V1 ada di data (kecuali 'ra.' yang sengaja dipecah)", () => {
    const pairs = GLOSSARY_V1.split("\n")
      .filter((l) => l.startsWith("- "))
      .flatMap((l) => l.slice(2).split("; "))
      .map((pair) => pair.split(" → ") as [string, string]);
    expect(pairs.length).toBeGreaterThan(150);
    const have = new Set(GLOSSARY_TERMS.map((e) => `${e.source} → ${glossaryWritten(e)}`));
    const missing = pairs
      .filter(([source]) => source !== "radhiyallahu 'anhu/'anha/'anhum")
      .map(([s, l]) => `${s} → ${l}`)
      .filter((p) => !have.has(p));
    expect(missing).toEqual([]);
  });

  test("kunci unik dan sah; v2 memuat kunci istilah saja, deterministik", () => {
    const keys = GLOSSARY_TERMS.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(GLOSSARY_TERM_KEYS).toContain("ikhlas");
    expect(GLOSSARY_TERM_KEYS).not.toContain("saw");
    expect(GLOSSARY_V2).toContain("- al-ikhlash → ikhlas [ikhlas]");
    expect(GLOSSARY_V2).toContain(
      "- shallallahu 'alaihi wa sallam (dan bentuk singkatnya) → saw. (misalnya",
    );
    expect(GLOSSARY_V2).not.toContain("[saw]");
    expect(GLOSSARY_V2).toContain("radhiyallahu 'anha → radhiyallahu 'anha");
    expect(GLOSSARY_TERMS.find((e) => e.key === "ra")?.spoken).toBe("radhiyallahu 'anhu");
    expect(DIGEST_SECTION_PROMPT.system).toContain(GLOSSARY_V2);
    expect(DIGEST_LEAF_SCHEMA.properties.istilah.items.enum).toBe(GLOSSARY_TERM_KEYS);
  });
});

describe("request Intisari", () => {
  test("blok berlabel per paragraf, judul ditandai, jumlah gagasan di akhir", () => {
    const req = buildDigestLeafRequest({
      heading: "كتاب الاختبار › باب",
      titleId: "Bab Uji",
      intro: false,
      part: 2,
      parts: 3,
      points: leafPointRange(4_000),
      blocks: [
        { label: "b1", paragraph: 1, heading: true, text: "باب" },
        { label: "b2", paragraph: 2, heading: false, text: "نص ⟦QS 2:255⟧ (١)" },
        { label: "b3", paragraph: 2, heading: false, text: "نص آخر" },
      ],
    });
    expect(req.model).toBe(MODELS.haiku);
    expect(req.output_config?.format).toEqual({ type: "json_schema", schema: DIGEST_LEAF_SCHEMA });
    const user = req.messages[0]?.content as string;
    expect(user).toContain(
      '<p n="1">\n[b1 judul] باب\n</p>\n<p n="2">\n[b2] نص ⟦QS 2:255⟧ (١)\n[b3] نص آخر\n</p>',
    );
    expect(user).toContain("Judul Indonesia: Bab Uji");
    expect(
      user.endsWith(
        "potongan 2 dari 3: 2–5 gagasan, jumlahnya mengikuti banyaknya gagasan di teks.",
      ),
    ).toBe(true);
  });

  test("Intisari Kitab memakai Sonnet 5.5 dan skema dengan pembuka/penutup", () => {
    const req = buildDigestMergeRequest({
      heading: "كتاب",
      titleId: null,
      tier: "book",
      points: mergePointRange("book", 12),
      sources: [
        {
          key: "n4",
          title: "Bab Pertama",
          abstract: ABSTRACT,
          points: [
            { id: "n4.g1", title: "Al-Ghazali", body: "isi", stance: "author", kind: "idea" },
          ],
          quotes: [{ id: "n4.q1", point: "n4.g1", translation: "Ilmu itu cahaya." }],
          terms: ["ilmu"],
        },
      ],
    });
    expect(req.model).toBe(MODELS.sonnet);
    expect(req.output_config?.format).toEqual({ type: "json_schema", schema: DIGEST_BOOK_SCHEMA });
    const user = req.messages[0]?.content as string;
    expect(user).toContain(
      '<gagasan id="n4.g1" sikap="author" jenis="idea">Al-Ghazali. isi</gagasan>',
    );
    expect(user).toContain('<kutipan id="n4.q1" gagasan="n4.g1">Ilmu itu cahaya.</kutipan>');
    expect(user).toContain("5–10 gagasan");
    expect(mergePointRange("section", 2)).toEqual({ min: 2, max: 7 });
  });
});

describe("judgeDigest tahap leaf", () => {
  test("respons sah: gagasan, kutipan dengan rentang text_raw, istilah", () => {
    const v = judgeDigest(msg(leafOut()), leafCtx());
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.digest.points.map((p) => p.basis)).toEqual([["b2"], ["b5", "b6"]]);
    expect(v.digest.quotes).toEqual([
      {
        origin: "text",
        point: 2,
        blocks: ["b5", "b5"],
        range: { passageId: 13, start: 0, end: 200 },
        quoteKind: "text",
        translation: "Ilmu adalah cahaya yang dilihat hati.",
      },
    ]);
    expect(v.digest.terms).toEqual(["ilmu", "ulama"]);
    expect(v.digest.dropped).toEqual([]);
  });

  test("ID blok karangan: gagasan dibuang dengan alasan; di bawah minimum = gagal", () => {
    const one = judgeDigest(
      msg(
        leafOut({
          gagasan: [...leafOut().gagasan, point("Al-Ghazali menyebut hal lain", ["b99"])],
        }),
      ),
      leafCtx(),
    );
    expect(one.ok && one.digest.dropped).toEqual([
      { item: "gagasan 3", reason: "unknown_block:b99" },
    ]);
    const none = judgeDigest(
      msg(
        leafOut({
          gagasan: [point("Al-Ghazali menyebut hal lain", ["b99"]), leafOut().gagasan[0]],
        }),
      ),
      leafCtx(),
    );
    expect(none).toMatchObject({ ok: false, reason: "invalid:too_few_points" });
  });

  test("kutipan yang menyentuh ayat, judul, atau lintas paragraf dibuang", () => {
    const v = judgeDigest(
      msg(
        leafOut({
          kutipan: [
            { dari: "b2", sampai: "b3", gagasan: 1, terjemahan: "Terjemahan kutipan." },
            { dari: "b1", sampai: "b1", gagasan: 1, terjemahan: "Terjemahan kutipan." },
            { dari: "b4", sampai: "b5", gagasan: 1, terjemahan: "Terjemahan kutipan." },
            { dari: "b4", sampai: "b4", gagasan: 9, terjemahan: "Terjemahan kutipan." },
          ],
        }),
      ),
      leafCtx(),
    );
    expect(v.ok && v.digest.quotes).toEqual([]);
    expect(v.ok && v.digest.dropped.map((d) => d.reason)).toEqual([
      "ayah",
      "heading",
      "cross_paragraph",
      "point_missing",
    ]);
  });

  test("penunjuk awal/akhir (v2) mempersempit kutipan di dalam blok; penunjuk di luar blok dibuang", () => {
    const locate = (r: { passageId: number; start: number; end: number }, a: string, b: string) =>
      a === "hilang"
        ? "pointer_start_not_found"
        : b === "jauh"
          ? { passageId: r.passageId, start: r.start + 10, end: r.end + 50 }
          : { passageId: r.passageId, start: r.start + 10, end: r.end - 40 };
    const ctx = { ...leafCtx(), locateQuote: locate };
    const q = (awal: string, akhir: string) => ({
      dari: "b5",
      sampai: "b6",
      awal,
      akhir,
      gagasan: 2,
      terjemahan: "Ilmu adalah cahaya yang dilihat hati.",
    });
    const v = judgeDigest(msg(leafOut({ kutipan: [q("قال", "النور")] })), ctx);
    expect(v.ok && v.digest.quotes[0]).toMatchObject({
      range: { passageId: 13, start: 10, end: 340 },
    });
    const bad = judgeDigest(msg(leafOut({ kutipan: [q("hilang", "x"), q("قال", "jauh")] })), ctx);
    expect(bad.ok && bad.digest.dropped.map((d) => d.reason)).toEqual([
      "pointer_start_not_found",
      "pointer_outside_blocks",
    ]);
  });

  test("riwayat yang takhrijnya terlarang dibuang; jenis kutipan dari kode", () => {
    const inspect = (r: { start: number }): QuoteInspection =>
      r.start === 0
        ? { kind: "report", banned: "takhrij palsu" }
        : { kind: "poetry", banned: null };
    const v = judgeDigest(
      msg(
        leafOut({
          kutipan: [
            { dari: "b5", sampai: "b5", gagasan: 2, terjemahan: "Riwayat yang dikutip." },
            { dari: "b6", sampai: "b6", gagasan: 2, terjemahan: "Bait syair yang dikutip." },
          ],
        }),
      ),
      leafCtx(inspect),
    );
    expect(v.ok && v.digest.dropped).toEqual([
      { item: "kutipan 1", reason: "banned:takhrij palsu" },
    ]);
    expect(v.ok && v.digest.quotes.map((q) => q.origin === "text" && q.quoteKind)).toEqual([
      "poetry",
    ]);
  });

  test("huruf Arab, fatwa, status hadits, parafrase ayat, orang pertama di gagasan dibuang", () => {
    const bad = [
      point("Al-Ghazali memuji الصبر", ["b2"]),
      point("Hukumnya adalah wajib menuntut ilmu", ["b2"]),
      point("Al-Ghazali mengutip hadis lemah tentang ilmu", ["b2"]),
      point("Allah berfirman bahwa ulama paling takut", ["b2"]),
      point("Kita harus mendahulukan ilmu", ["b2"]),
    ];
    const v = judgeDigest(msg(leafOut({ gagasan: [...leafOut().gagasan, ...bad], kutipan: [] })), {
      ...leafCtx(),
      points: { min: 2, max: 7 },
    });
    expect(v.ok && v.digest.points.length).toBe(2);
    const reasons = v.ok ? v.digest.dropped.map((d) => d.reason) : [];
    expect(reasons[0]).toContain("title_arabic");
    expect(reasons[1]).toContain("title_fatwa");
    expect(reasons[2]).toContain("title_hadith_status");
    expect(reasons[3]).toContain("title_ayah_paraphrase");
    expect(reasons[4]).toContain("title_first_person");
  });

  test("butir opsional cacat dibuang deterministik dengan alasan", () => {
    const v = judgeDigest(
      msg(
        leafOut({
          gagasan: [
            point("Al-Ghazali mendahulukan ilmu atas ibadah", ["b2"], {
              pertanyaan: [
                "Apa saja keutamaan ilmu",
                "Menurut al-Ghazali, siapa pewaris nabi?",
                "Menurut al-Ghazali, apa itu ilmu?",
                "Menurut al-Ghazali, kenapa ilmu didahulukan?",
              ],
            }),
            point("Al-Ghazali menyebut ulama pewaris para nabi", ["b5"]),
            point("Al-Ghazali menyebut keutamaan belajar", ["b4"]),
            point("Al-Ghazali menyebut keutamaan mengajar", ["b4"]),
          ],
          istilah: ["ilmu", "ilmu", "bukan-kunci", "ikhlas", "riya", "sabar", "zuhud", "tobat"],
        }),
      ),
      leafCtx(),
    );
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.digest.points.length).toBe(3);
    expect(v.digest.points[0]?.questions.length).toBe(2);
    expect(v.digest.terms).toEqual(["ilmu", "ikhlas", "riya", "sabar", "zuhud"]);
    expect(v.digest.dropped).toEqual([
      { item: "gagasan 1 pertanyaan 1", reason: "no_question_mark" },
      { item: "gagasan 1 pertanyaan 4", reason: "over_limit" },
      { item: "gagasan 4", reason: "over_limit" },
      { item: "istilah 2", reason: "duplicate" },
      { item: "istilah 3", reason: "unknown_term:bukan-kunci" },
      { item: "istilah 8", reason: "over_limit" },
    ]);
  });

  test("abstrak berhuruf Arab, berhenti tidak normal, atau JSON rusak = seluruh respons gagal", () => {
    expect(judgeDigest(msg(leafOut({ abstrak: `${ABSTRACT} العلم` })), leafCtx())).toMatchObject({
      ok: false,
      reason: "invalid:abstract",
    });
    expect(judgeDigest(msg(leafOut(), "max_tokens"), leafCtx())).toMatchObject({
      ok: false,
      reason: "max_tokens",
    });
    expect(judgeDigest(msg("{bukan json"), leafCtx())).toMatchObject({
      ok: false,
      reason: "invalid:json",
    });
    expect(judgeDigest(msg({ abstrak: ABSTRACT }), leafCtx())).toMatchObject({
      ok: false,
      reason: "invalid:schema",
    });
  });
});

describe("judgeDigest tahap merge/book", () => {
  const sourcePoints = new Map([
    ["n4.g1", "author" as const],
    ["n4.g2", "refuted" as const],
    ["n5p1.g1", "reported" as const],
  ]);
  const mergeCtx = (stage: "merge" | "book"): DigestJudgeContext => ({
    stage,
    points: stage === "book" ? { min: 1, max: 10 } : { min: 1, max: 7 },
    sourcePoints,
    sourceQuotes: new Set(["n4.q1"]),
  });
  const mergeOut = (over: Record<string, unknown> = {}) => ({
    abstrak: ABSTRACT,
    gagasan: [point("Al-Ghazali menempatkan ilmu di atas ibadah", ["n4.g1", "n5p1.g1"])],
    kutipan: [{ id: "n4.q1", gagasan: 1 }],
    istilah: ["ilmu"],
    ...over,
  });

  test("ID gagasan anak karangan dan sikap yang dibalik dibuang; kutipan anak lewat ID", () => {
    const v = judgeDigest(
      msg(
        mergeOut({
          gagasan: [
            ...mergeOut().gagasan,
            point("Al-Ghazali menyebut hal yang tidak ada", ["n9.g1"]),
            point("Al-Ghazali berpendapat ilmu cukup dihafal", ["n4.g2"]),
          ],
          kutipan: [
            { id: "n4.q1", gagasan: 1 },
            { id: "n4.q1", gagasan: 1 },
            { id: "n4.q7", gagasan: 1 },
          ],
        }),
      ),
      mergeCtx("merge"),
    );
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.digest.quotes).toEqual([{ origin: "child", point: 1, id: "n4.q1" }]);
    expect(v.digest.dropped).toEqual([
      { item: "gagasan 2", reason: "unknown_point:n9.g1" },
      { item: "gagasan 3", reason: "stance_flip" },
      { item: "kutipan 2", reason: "duplicate" },
      { item: "kutipan 3", reason: "unknown_quote:n4.q7" },
    ]);
  });

  test("Intisari Kitab wajib pembuka dan penutup yang bersih", () => {
    const bookPoint = point("Al-Ghazali menempatkan ilmu di atas ibadah", ["n4.g1"], {
      isi: `Al-Ghazali menjelaskan keutamaan ilmu. ${words(110, "kata")}.`,
    });
    const ok = {
      ...mergeOut({ gagasan: [bookPoint] }),
      pembuka: `Kitab ini membuka Ihya dengan pembahasan ilmu. ${words(20, "kata")}.`,
      penutup: `Inti kitab ini menurut al-Ghazali adalah ilmu jalan akhirat. ${words(20, "kata")}.`,
    };
    const v = judgeDigest(msg(ok), mergeCtx("book"));
    expect(v.ok && v.digest.opening?.startsWith("Kitab ini")).toBe(true);
    expect(judgeDigest(msg(mergeOut()), mergeCtx("book"))).toMatchObject({
      ok: false,
      reason: "invalid:schema",
    });
    expect(
      judgeDigest(
        msg({
          ...ok,
          penutup:
            "Kita harus menuntut ilmu sepanjang hayat dan tidak berhenti belajar sampai akhir hayat kita nanti.",
        }),
        mergeCtx("book"),
      ),
    ).toMatchObject({ ok: false, reason: "invalid:closing" });
  });
});

describe("definisi glosarium", () => {
  test("hanya kunci yang diminta; definisi cacat ditolak per kunci", () => {
    const r = judgeGlossaryGlosses(
      msg({
        definisi: [
          {
            kunci: "ikhlas",
            definisi: "Memurnikan niat amal hanya untuk Allah, tanpa mengharap pujian manusia.",
          },
          { kunci: "riya", definisi: "Kita harus menghindari pamer amal agar dipuji orang lain." },
          { kunci: "asing", definisi: "Definisi untuk kunci yang tidak diminta sama sekali." },
        ],
      }),
      ["ikhlas", "riya", "sabar"],
    );
    expect([...r.accepted.keys()]).toEqual(["ikhlas"]);
    expect(r.rejected.get("riya")).toContain("first_person");
    expect(r.rejected.get("sabar")).toBe("tidak ada di keluaran");
    expect(r.problems).toEqual(["kunci asing: asing"]);
  });
});
