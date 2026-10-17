// Penanda ayat untuk batch terjemahan (disiapkan S12, dipakai S13; ADR-020, ADR-040).
//
// 1. Sebelum paragraf dikirim ke LLM, setiap kutipan ayat (`ayah_refs`) diganti placeholder
//    `⟦QS s:a⟧` / `⟦QS s:a-b⟧` (`maskAyat`). LLM tidak pernah melihat, menulis, atau menerjemahkan
//    teks ayat.
// 2. Keluaran LLM wajib memuat placeholder yang sama persis, masing-masing sekali, tanpa
//    placeholder lain (`checkPlaceholders`); bila tidak, keluaran ditolak.
// 3. `translation.text` MENYIMPAN placeholder. Saat tampil (`translationSegments`), placeholder
//    menjadi segmen tersendiri berisi terjemahan Kemenag VERBATIM dengan label dan atribusinya
//    sendiri, bukan di bawah label "terjemahan AI". Untuk kutipan sebagian (`partial`), labelnya
//    "terjemahan ayat lengkap (Kemenag)", bukan potongan yang seolah-olah terjemahan bagian itu.
// 4. Indeks teks terjemahan (S14) mengindeks segmen `ai` saja.
import type { AyahRef, QuranView } from "./schema.ts";

/** Placeholder di teks terjemahan. Grup: surah, ayat awal, ayat akhir (opsional). */
export const AYAH_PLACEHOLDER_RE = /⟦QS (\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?⟧/g;

export function ayahPlaceholder(ref: Pick<AyahRef, "surah" | "ayah_from" | "ayah_to">): string {
  const range = ref.ayah_to > ref.ayah_from ? `${ref.ayah_from}-${ref.ayah_to}` : ref.ayah_from;
  return `⟦QS ${ref.surah}:${range}⟧`;
}

export interface AyahSlot {
  placeholder: string;
  ref: AyahRef;
  /** Teks kutipan asli di text_raw (untuk round-trip, bukan untuk ditampilkan sebagai ayat). */
  original: string;
}

export interface MaskedPassage {
  /** text_raw dengan setiap kutipan ayat diganti placeholder. */
  text: string;
  slots: AyahSlot[];
}

/**
 * Ganti setiap kutipan ayat di `textRaw` dengan placeholder. Rujukan yang offset-nya di luar teks
 * atau tumpang tindih dilewati (data rusak: teks dibiarkan, sama seperti penanda catatan kaki).
 */
export function maskAyat(textRaw: string, refs: readonly AyahRef[]): MaskedPassage {
  const sorted = refs.toSorted((a, b) => a.char_start - b.char_start);
  const slots: AyahSlot[] = [];
  let text = "";
  let at = 0;
  for (const ref of sorted) {
    if (ref.char_start < at || ref.char_end > textRaw.length || ref.char_end <= ref.char_start) {
      continue;
    }
    const placeholder = ayahPlaceholder(ref);
    text += textRaw.slice(at, ref.char_start) + placeholder;
    slots.push({ placeholder, ref, original: textRaw.slice(ref.char_start, ref.char_end) });
    at = ref.char_end;
  }
  return { text: text + textRaw.slice(at), slots };
}

/** Kembalikan teks bertanda ke text_raw semula (uji round-trip; urutan slot = urutan teks). */
export function unmaskAyat(masked: MaskedPassage): string {
  let i = 0;
  return masked.text.replace(AYAH_PLACEHOLDER_RE, (found) => {
    const slot = masked.slots[i];
    if (slot === undefined || slot.placeholder !== found) {
      throw new Error(`placeholder ${found} tidak sesuai slot ke-${i + 1}`);
    }
    i++;
    return slot.original;
  });
}

export type PlaceholderCheck =
  | { ok: true }
  | {
      ok: false;
      /** Placeholder masukan yang tidak ada (atau kurang) di keluaran. */
      missing: string[];
      /** Placeholder keluaran yang tidak ada (atau berlebih) di masukan: buatan model, ditolak. */
      unexpected: string[];
    };

function countPlaceholders(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of text.matchAll(AYAH_PLACEHOLDER_RE)) counts.set(m[0], (counts.get(m[0]) ?? 0) + 1);
  return counts;
}

/**
 * Keluaran LLM harus memuat multiset placeholder yang sama persis dengan masukan (urutan boleh
 * berubah karena susunan kalimat Indonesia). Placeholder tambahan = model mengarang rujukan ayat.
 */
export function checkPlaceholders(output: string, masked: MaskedPassage): PlaceholderCheck {
  const want = countPlaceholders(masked.text);
  const got = countPlaceholders(output);
  const missing: string[] = [];
  const unexpected: string[] = [];
  for (const [p, n] of want) for (let i = got.get(p) ?? 0; i < n; i++) missing.push(p);
  for (const [p, n] of got) for (let i = want.get(p) ?? 0; i < n; i++) unexpected.push(p);
  return missing.length === 0 && unexpected.length === 0
    ? { ok: true }
    : { ok: false, missing, unexpected };
}

/**
 * Label segmen. `ai_translation` = terjemahan buatan model (UI: "terjemahan AI");
 * `kemenag` = terjemahan resmi Kemenag untuk kutipan ayat utuh; `kemenag_full_ayah` = kutipan
 * hanya sebagian ayat, jadi yang ditampilkan adalah terjemahan AYAT LENGKAP (UI: "terjemahan ayat
 * lengkap (Kemenag)"). UI memetakan kode ini ke teks Indonesia.
 */
export type TranslationLabel = "ai_translation" | "kemenag" | "kemenag_full_ayah";

export type TranslationSegment =
  | { kind: "ai"; label: "ai_translation"; text: string }
  | {
      kind: "ayah";
      label: "kemenag" | "kemenag_full_ayah";
      placeholder: string;
      ref: AyahRef;
      /** Terjemahan Kemenag per ayat, verbatim. */
      ayat: { ayah: number; text: string; footnotes: { marker: string; text: string }[] }[];
      /** Atribusi terjemahan (nama sumber + versi). */
      attribution: string;
    }
  | {
      /**
       * Placeholder yang tidak dikenal paragraf ini, atau terjemahannya tidak ada: TIDAK dirender
       * sebagai terjemahan apa pun (UI menampilkan rujukan saja atau melewatinya).
       */
      kind: "invalid";
      placeholder: string;
    };

/**
 * Pecah teks terjemahan bertanda menjadi segmen AI dan segmen ayat. Placeholder dicocokkan ke
 * `slots` paragraf itu (kunci = placeholder; rujukan yang sama boleh muncul lebih dari sekali);
 * terjemahan diambil dari `quran` (verbatim dari DB).
 */
export function translationSegments(
  text: string,
  slots: readonly Pick<AyahSlot, "placeholder" | "ref">[],
  quran: QuranView | null,
): TranslationSegment[] {
  const byPlaceholder = new Map<string, AyahRef>();
  for (const s of slots) {
    const known = byPlaceholder.get(s.placeholder);
    // Rujukan sama dengan status sebagian berbeda: label "ayat lengkap" lebih jujur untuk keduanya.
    byPlaceholder.set(s.placeholder, known === undefined || s.ref.partial ? s.ref : known);
  }
  const source = quran?.sources.find((s) => s.kind === "translation");
  const attribution = source === undefined ? "" : `${source.name} (${source.version})`;
  const segments: TranslationSegment[] = [];
  let at = 0;
  for (const m of text.matchAll(AYAH_PLACEHOLDER_RE)) {
    const start = m.index ?? 0;
    if (start > at)
      segments.push({ kind: "ai", label: "ai_translation", text: text.slice(at, start) });
    at = start + m[0].length;
    const ref = byPlaceholder.get(m[0]);
    const ayat =
      ref === undefined
        ? []
        : (quran?.ayat ?? []).filter(
            (a) => a.surah === ref.surah && a.ayah >= ref.ayah_from && a.ayah <= ref.ayah_to,
          );
    const complete =
      ref !== undefined &&
      ayat.length === ref.ayah_to - ref.ayah_from + 1 &&
      ayat.every((a) => a.translation !== null);
    if (ref === undefined || !complete || source === undefined) {
      segments.push({ kind: "invalid", placeholder: m[0] });
      continue;
    }
    segments.push({
      kind: "ayah",
      label: ref.partial ? "kemenag_full_ayah" : "kemenag",
      placeholder: m[0],
      ref,
      ayat: ayat.map((a) => ({
        ayah: a.ayah,
        text: a.translation?.text ?? "",
        footnotes: a.translation?.footnotes ?? [],
      })),
      attribution,
    });
  }
  if (at < text.length)
    segments.push({ kind: "ai", label: "ai_translation", text: text.slice(at) });
  return segments;
}
