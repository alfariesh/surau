// Leksikon lafal suara AI (X17, ADR-097 butir 6): `data/lexicon/<lang>.yaml`. Istilah dan nama yang
// salah dibaca mesin diberi lafal IPA (ditulis inline `/…/`, didukung eleven_v4 untuk bahasa selain
// Inggris) atau ejaan pengganti (`alias`). Diterapkan SESUDAH skrip dibangun dan sha-nya dihitung:
// leksikon mengubah suara, bukan isi, jadi perbaikan lafal tidak menggugurkan kecocokan skrip, dan
// versinya (= sha berkas) dicatat terpisah di manifest.
//
// Hanya entri `active` yang diterapkan. Entri `test` hanya diperdengarkan berdampingan (tanpa/dengan
// lafal) oleh `pnpm audio sample` untuk uji dengar pemilik (T-31): docs ElevenLabs menyarankan IPA
// dipakai selektif, karena lafal bawaan sering sudah benar.
import { createHash } from "node:crypto";

import { ordinalWords } from "@surau/text";
import { parse } from "yaml";
import { z } from "zod";

const entry = z
  .strictObject({
    term: z.string().min(1),
    ipa: z
      .string()
      .min(1)
      .refine((s) => !s.includes("/"), "IPA ditulis tanpa garis miring (ditambahkan alat)")
      .optional(),
    alias: z.string().min(1).optional(),
    status: z.enum(["test", "active"]),
    note: z.string().optional(),
  })
  .refine(
    (e) => (e.ipa === undefined) !== (e.alias === undefined),
    "isi tepat satu: ipa atau alias",
  );
export type LexiconEntry = z.infer<typeof entry>;

const lexiconFile = z.strictObject({
  format: z.literal(1),
  lang: z.string().regex(/^[a-z]{2,3}$/u),
  entries: z.array(entry),
});

export interface Lexicon {
  lang: string;
  /** 12 heks pertama sha256 berkas (versi leksikon di manifest dan `audio_track`). */
  version: string;
  entries: LexiconEntry[];
}

export function parseLexicon(source: string): Lexicon {
  const file = lexiconFile.parse(parse(source));
  const seen = new Set<string>();
  for (const e of file.entries) {
    const key = e.term.toLowerCase();
    if (seen.has(key)) throw new Error(`istilah ganda di leksikon: ${e.term}`);
    seen.add(key);
  }
  return {
    lang: file.lang,
    version: createHash("sha256").update(source).digest("hex").slice(0, 12),
    entries: file.entries,
  };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/** Bentuk yang dikirim ke suara AI untuk satu entri. */
export const spokenForm = (e: LexiconEntry): string =>
  e.ipa !== undefined ? `/${e.ipa}/` : (e.alias as string);

/**
 * Terapkan entri (bawaan: yang `active`) ke teks: satu regex gabungan, istilah terpanjang dulu,
 * tanpa membedakan huruf besar, hanya di batas kata (huruf/apostrof di kiri dan kanan tidak boleh
 * menempel). Satu putaran, jadi lafal yang sudah dimasukkan tidak diganti lagi.
 */
export function applyLexicon(
  text: string,
  lexicon: Lexicon,
  pick: (e: LexiconEntry) => boolean = (e) => e.status === "active",
): string {
  const entries = lexicon.entries.filter(pick).sort((a, b) => b.term.length - a.term.length);
  if (entries.length === 0) return text;
  const byTerm = new Map(entries.map((e) => [e.term.toLowerCase(), e]));
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}'])(?:${entries.map((e) => escape(e.term)).join("|")})(?![\\p{L}\\p{N}])`,
    "giu",
  );
  return text.replace(pattern, (m) => spokenForm(byTerm.get(m.toLowerCase()) as LexiconEntry));
}

/**
 * Teks contoh untuk uji dengar (T-31): setiap entri `test` dibacakan dua kali, lafal bawaan lalu
 * lafal leksikon, dalam kalimat pembawa yang sama.
 */
export function lexiconSample(lexicon: Lexicon, opening: string): string {
  const pairs = lexicon.entries
    .filter((e) => e.status === "test")
    .map((e, i) => `Yang ${ordinalWords(i + 1)}: ${e.term}. ${spokenForm(e)}.`);
  return [opening, ...pairs].join(" ");
}
