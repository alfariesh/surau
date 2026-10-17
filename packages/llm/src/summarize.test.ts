import { describe, expect, test } from "vite-plus/test";

import {
  SUMMARY_PROMPT,
  buildSummaryRequest,
  buildSummaryRound2Request,
  checkSummary,
  summaryChunkUserText,
  summaryRound2UserText,
} from "./summarize.ts";

const ID =
  "al-Ghazali menjelaskan bahwa ilmu yang wajib dicari adalah ilmu tentang amal. Ia menukil pendapat para ulama dan membantah anggapan bahwa semua ilmu sama nilainya.";
const EN =
  "al-Ghazali explains that the knowledge one must seek is the knowledge of practice. He cites the scholars and rejects the view that all knowledge is of equal worth.";

describe("request ringkasan", () => {
  test("putaran 1: potongan disebut, bahasa di kalimat terakhir", () => {
    const req = buildSummaryRequest({
      tocNodeId: 100_161,
      heading: "كتاب مصنوع",
      lang: "en",
      part: 2,
      parts: 3,
      text: "[1/23] نص مصنوع",
    });
    expect(req.model).toBe("claude-haiku-5-5");
    expect(req.output_config).toEqual({ effort: "low" });
    expect(req).not.toHaveProperty("temperature");
    const user = req.messages[0]?.content;
    expect(user).toContain("(potongan 2 dari 3)");
    expect(user).toMatch(/dalam bahasa Inggris\.$/);
    expect(req.system).toEqual([
      {
        type: "text",
        text: SUMMARY_PROMPT.system,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ]);
  });

  test("putaran 1 simpul utuh tanpa keterangan potongan", () => {
    const text = summaryChunkUserText({
      tocNodeId: 1,
      heading: "باب",
      lang: "id",
      part: 1,
      parts: 1,
      text: "نص",
    });
    expect(text).not.toContain("potongan");
    expect(text).toMatch(/ringkasan bagian ini dalam bahasa Indonesia\.$/);
  });

  test("putaran 2 dari ringkasan anak berurutan", () => {
    const text = summaryRound2UserText({
      tocNodeId: 1,
      heading: "ربع مصنوع",
      lang: "id",
      children: [
        { heading: "كتاب أ", summary: "Ringkasan A." },
        { heading: "كتاب ب", summary: "Ringkasan B." },
      ],
    });
    expect(text).toContain("1. كتاب أ\nRingkasan A.\n\n2. كتاب ب\nRingkasan B.");
    const req = buildSummaryRound2Request({ tocNodeId: 1, heading: "x", lang: "en", children: [] });
    expect(req.messages[0]?.content).toMatch(/seluruh bagian ini dalam bahasa Inggris\.$/);
  });
});

describe("validasi ringkasan", () => {
  test("ringkasan wajar lolos di kedua bahasa", () => {
    expect(checkSummary(ID, "id")).toEqual({ ok: true, problems: [] });
    expect(checkSummary(EN, "en")).toEqual({ ok: true, problems: [] });
  });

  test("ringkasan campur bahasa ditolak (versi Indonesia + versi Inggris)", () => {
    expect(checkSummary(`${ID} Catatan: versi Inggris berikut. ${EN}`, "en").ok).toBe(false);
    expect(checkSummary(`${ID} ${EN}`, "en").problems).toContain("language");
    expect(checkSummary(`${ID} ${EN}`, "id").problems).toContain("language");
  });

  test("salah bahasa ditolak", () => {
    expect(checkSummary(ID, "en").problems).toContain("language");
    expect(checkSummary(EN, "id").problems).toContain("language");
  });

  test("placeholder, rujukan QS, teks Arab, Markdown, dan panjang ditolak", () => {
    expect(checkSummary(`${ID} ⟦QS 2:255⟧`, "id").problems).toContain("placeholder");
    expect(checkSummary(`${ID} Ia berdalil dengan QS 2:255.`, "id").problems).toContain(
      "placeholder",
    );
    expect(checkSummary(`${ID} هذا كلام مصنوع`, "id").problems).toContain("arabic");
    expect(checkSummary(`# Judul\n${ID}`, "id").problems).toContain("markdown");
    expect(checkSummary("Pendek dan.", "id").problems).toContain("too_short");
    expect(checkSummary(ID.repeat(20), "id").problems).toContain("too_long");
    expect(checkSummary("", "id").problems).toEqual(["empty"]);
    expect(checkSummary(`Berikut ringkasannya: ${ID}`, "id").problems).toContain("preamble");
  });
});
