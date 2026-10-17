// Fixture: kata Arab buatan.
import { describe, expect, test } from "vite-plus/test";

import {
  contentLength,
  footnoteMarkerDigits,
  hasArabicLetters,
  hasMarkdown,
  hasMetaCommentary,
  hasPreamble,
  longestArabicRun,
  restoreFootnoteMarkers,
  stripMarkers,
} from "./check.ts";
import { messageText, stopProblem } from "./response.ts";

describe("pemeriksaan keluaran", () => {
  test("placeholder dan penanda tidak dihitung sebagai teks Arab", () => {
    expect(longestArabicRun("Ia berkata ⟦QS 2:255⟧ (١) (٢) lalu selesai.")).toBe(0);
    expect(hasArabicLetters("Ia berkata (١).")).toBe(false);
    expect(stripMarkers("a ⟦QS 1:1-7⟧ b (٣) c")).toBe("a   b   c");
  });

  test("kata Arab berturut-turut dihitung", () => {
    expect(longestArabicRun("ikhlas الإخلاص dan الصبر الجميل جدا")).toBe(3);
    expect(hasArabicLetters("istilah الزهد")).toBe(true);
  });

  test("panjang isi dan digit penanda", () => {
    expect(contentLength("  a  ⟦QS 2:1⟧  b ")).toBe(3);
    expect(footnoteMarkerDigits("x (١) y ( ٢ ) z (12)")).toEqual(["١", "٢", "12"]);
  });

  test("Markdown dan kalimat pembuka", () => {
    expect(hasMarkdown("teks **tebal**")).toBe(true);
    expect(hasMarkdown("## Judul")).toBe(true);
    expect(hasMarkdown("teks biasa #1")).toBe(false);
    expect(hasPreamble("Berikut ini adalah terjemahan paragraf")).toBe(true);
    expect(hasPreamble("Here is the summary")).toBe(true);
    expect(hasPreamble("Berikutnya ia berkata")).toBe(false);
  });
});

describe("komentar model", () => {
  test("Indonesia: frasa Inggris/permintaan maaf di mana pun; Inggris: hanya di awal kalimat", () => {
    expect(hasMetaCommentary("Ia berkata ... Wait — I must not add content.")).toBe(true);
    expect(hasMetaCommentary("Maaf, saya ulangi dengan benar: ...")).toBe(true);
    expect(hasMetaCommentary("Ia berkata, kami akan datang.")).toBe(false);
    expect(hasMetaCommentary("The text available here is only the heading.", "en")).toBe(false);
    expect(hasMetaCommentary("He said: I will forgive you.", "en")).toBe(false);
    expect(hasMetaCommentary("Sure. Let me summarize again.", "en")).toBe(true);
    // "prompt" wajar dalam ringkasan Inggris ("prompt payment"); hanya dicurigai di bahasa Indonesia.
    expect(hasMetaCommentary("He urges prompt payment of zakat.", "en")).toBe(false);
    expect(hasMetaCommentary("sesuai prompt", "id")).toBe(true);
    expect(hasMetaCommentary("(placeholders in the text)", "en")).toBe(true);
  });

  test("koreksi-diri berbahasa Indonesia (temuan batch S13) ditolak, kata biasa tidak", () => {
    for (const t of [
      "Empat puluh hari. Maaf, bagian di atas keliru. Berikut terjemahannya: ...",
      "Ia berkata. Catatan: teks ini terpotong pada akhir kalimat.",
      "Versi yang benar: Adapun kaff ...",
      "terjemahan AI\n\nTamamul haul dari waktu keislamannya.",
      "isi <teks> saja yang diterjemahkan",
      "Perlu koreksi: istilah itu tidak ada di glosarium.",
      "Tunggu, saya ulangi.",
      "Catatan: tidak ada, sesuai instruksi.",
      "Sebenarnya bait ini berbunyi: ...",
      "(¹) Catatan ini hanya menandai bagian sumber.",
      "Catatan singkat: kata itu sebenarnya berarti ...",
      "tidak ada catatan penerjemah. Terjemahan yang benar: ...",
      "Teks ini berisi beberapa penanda ayat.",
      "Hmm, wait: the instruction says ...",
      "tidak perlu... (tidak ada) — yaitu",
      "— tidak, mari terjemahkan teks itu saja dengan benar.",
      "Ia berkata [tidak, lanjutkan di bawah] lalu",
      "Namun teks yang diberikan kepada saya berbeda.",
    ]) {
      expect(hasMetaCommentary(t), t).toBe(true);
    }
    for (const t of [
      "Engkau memerintahkan kami untuk memberi maaf kepada orang yang menzalimi kami.",
      "kelahiran yang sedang ditunggu-tunggu",
      "Ia menunggu imbalannya berlipat ganda.",
      "Catatan amalnya dibuka pada hari kiamat.",
      "membolehkan upah haji dengan catatan niat utamanya ibadah",
      "cukup diajarkan terjemahan akidah yang telah kami sebutkan",
      "Kitab ini saya susun atas empat rub'.",
      "Mari kita lihat keadaan orang-orang saleh.",
    ]) {
      expect(hasMetaCommentary(t), t).toBe(false);
    }
  });
});

describe("penanda catatan kaki", () => {
  test("hanya penanda yang diharapkan dan hilang yang dikembalikan", () => {
    expect(restoreFootnoteMarkers("a (1) b (2) tahun (1402)", ["١", "٢"])).toBe(
      "a (١) b (٢) tahun (1402)",
    );
    // (٣) sudah ada; (1) bukan penanda yang diharapkan → dibiarkan.
    expect(restoreFootnoteMarkers("a (٣) lalu (1)", ["٣"])).toBe("a (٣) lalu (1)");
    // Penanda dua kali: kemunculan kedua juga dikembalikan.
    expect(restoreFootnoteMarkers("x (١) y (1)", ["١", "١"])).toBe("x (١) y (١)");
    expect(restoreFootnoteMarkers("tanpa penanda", ["١"])).toBe("tanpa penanda");
  });
});

describe("respons", () => {
  test("teks diambil dari blok text, bukan blok pertama", () => {
    const content = [
      { type: "thinking", thinking: "", signature: "s" },
      { type: "text", text: " Halo ", citations: null },
    ] as const;
    expect(messageText({ content: [...content] } as never)).toBe("Halo");
  });

  test("refusal, max_tokens, dan tanpa teks = masalah", () => {
    const text = [{ type: "text", text: "ok", citations: null }];
    expect(stopProblem({ content: text, stop_reason: "refusal" } as never)).toBe("refusal");
    expect(stopProblem({ content: text, stop_reason: "max_tokens" } as never)).toBe("max_tokens");
    expect(stopProblem({ content: [], stop_reason: "end_turn" } as never)).toBe("no_text");
    expect(stopProblem({ content: text, stop_reason: "end_turn" } as never)).toBeNull();
  });
});
