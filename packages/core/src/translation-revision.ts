// Koreksi terjemahan oleh editor terdaftar (X08, ADR-081). Modul murni: daftar editor dari var
// Worker `TRANSLATION_EDITORS`, peran ruang tinjau, masukan POST, dan resolusi keadaan paragraf dari
// riwayat revisi (DB app). Teks Arab tidak pernah ditulis editor; nama tampil hanya dari daftar
// terdaftar (bukan ketikan), dan gelar ustadz hanya untuk akun yang didaftarkan sebagai ustadz.
import { TRANSLATION_REASON_MAX } from "@surau/db";
import type { TranslationAuthorRole, TranslationRevisionRow } from "@surau/db";
import { z } from "zod";

import { TRANSLATION_TEXT_MAX } from "./translation-text.ts";

/** SHA-256 heksadesimal teks UTF-8 (sama dengan `sha256` tools/ingest). */
export async function textSha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

const latinName = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .refine((s) => !/[\p{Cc}\p{Cf}]/u.test(s) && !/\p{Script=Arabic}/u.test(s));

/** Gelar keulamaan (Ust., Ustadz, KH, Kiai, Syaikh, Habib, Buya, Tuan Guru). */
const RELIGIOUS_TITLE =
  /(?:^|[\s.,])(?:ust(?:adz|az|adzah|azah)?|kh|k\.h|kiai|kyai|syaikh|syekh|syeikh|habib|buya|tuan guru)(?:$|[\s.,])/iu;

/** Ruang tinjau lain (selain terjemahan) yang juga boleh dibuka akun editor ini. */
export const TINJAU_ROOMS = ["jawaban", "takhrij"] as const;
export type TinjauRoom = (typeof TINJAU_ROOMS)[number];

const editorEntry = z
  .strictObject({
    /** Kunci akun = hash issuer + subjek Access (`reviewIdentity`), bukan email. */
    key: z.string().regex(/^[a-f0-9]{64}$/u),
    name: latinName,
    /** Gelar di depan nama ("Ust."), hanya untuk akun ustadz. */
    prefix: latinName.optional(),
    /** Gelar akademik di belakang nama ("Lc."), tampil di nama lengkap. */
    suffix: latinName.optional(),
    ustadz: z.boolean(),
    /** Nama boleh dikirim ke AI lain lewat MCP (persetujuan orangnya); bila tidak, hanya peran. */
    mcp_name: z.boolean(),
    also: z.array(z.enum(TINJAU_ROOMS)).max(2).default([]),
  })
  .refine((e) => e.ustadz || e.prefix === undefined, "gelar depan hanya untuk ustadz")
  // Gelar keulamaan tidak boleh diselipkan di nama atau gelar belakang akun bukan ustadz.
  .refine(
    (e) => e.ustadz || ![e.name, e.suffix ?? ""].some((s) => RELIGIOUS_TITLE.test(s)),
    "gelar ustadz hanya untuk akun ustadz",
  )
  // Sama dengan batas kolom author_short (80) / author_name (120) DB app.
  .refine((e) => [e.prefix, e.name].filter(Boolean).join(" ").length <= 80, "nama pendek ≤80")
  .refine(
    (e) => [e.prefix, e.name, e.suffix].filter(Boolean).join(" ").length <= 120,
    "nama lengkap ≤120",
  );

export interface TranslationEditor {
  key: string;
  /** Nama di label pembaca ("Ust. Anas"). */
  short: string;
  /** Nama lengkap dengan gelar akademik ("Ust. Anas Lc."). */
  full: string;
  role: Extract<TranslationAuthorRole, "ustadz" | "editor">;
  mcpName: boolean;
  also: readonly TinjauRoom[];
}

/**
 * `TRANSLATION_EDITORS` = array JSON entri editor (string var Worker, sama dengan pola
 * `TAKHRIJ_USTADZ_KEYS`). Gagal tertutup: JSON rusak atau entri tidak sah = tidak ada editor sama
 * sekali (bukan sebagian), kunci ganda juga ditolak.
 */
export function parseTranslationEditors(
  value: string | undefined,
): ReadonlyMap<string, TranslationEditor> {
  const empty = new Map<string, TranslationEditor>();
  if (value === undefined || value.trim() === "") return empty;
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return empty;
  }
  const parsed = z.array(editorEntry).max(40).safeParse(raw);
  if (!parsed.success) return empty;
  const out = new Map<string, TranslationEditor>();
  for (const e of parsed.data) {
    if (out.has(e.key)) return empty;
    const short = [e.prefix, e.name].filter((s) => s !== undefined).join(" ");
    out.set(e.key, {
      key: e.key,
      short,
      full: [short, e.suffix].filter((s) => s !== undefined).join(" "),
      role: e.ustadz ? "ustadz" : "editor",
      mcpName: e.mcp_name,
      also: e.also,
    });
  }
  return out;
}

/**
 * Peran ruang tinjau (gagal tertutup, diperiksa di server). Terjemahan: hanya akun terdaftar di
 * `TRANSLATION_EDITORS`. Jawaban eval dan label takhrij: akun Access yang belum terdaftar tetap
 * memakai akses lama (ADR-052/070); akun editor terdaftar hanya bila ruangnya ada di `also`.
 */
export function canUseTinjauRoom(
  identity: string,
  room: TinjauRoom | "terjemahan",
  editors: ReadonlyMap<string, TranslationEditor>,
): boolean {
  const editor = editors.get(identity);
  if (room === "terjemahan") return editor !== undefined;
  return editor === undefined || editor.also.includes(room);
}

const hex64 = z.string().regex(/^[a-f0-9]{64}$/u);
const clean = (s: string) => !/[\p{Cc}\p{Cf}]/u.test(s.replaceAll(/[\n\t]/g, " "));
const reason = z
  .string()
  .trim()
  .max(TRANSLATION_REASON_MAX)
  .refine(clean)
  .refine((s) => !/\p{Script=Arabic}/u.test(s));
const target = {
  passage_id: z.number().int().positive(),
  /** sha256 teks yang dilihat editor; berbeda dengan keadaan sekarang = 409. */
  base_sha256: hex64,
  /** Revisi aktif yang dilihat editor (`null` = belum ada). */
  active_id: z.number().int().positive().nullable(),
};

/** Masukan POST `/api/review/terjemahan` (teks divalidasi lagi terhadap Arab di server). */
export const translationRevisionInput = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("confirm"), ...target, reason }),
  z.strictObject({
    action: z.literal("revise"),
    ...target,
    text: z.string().min(1).max(TRANSLATION_TEXT_MAX),
    reason: reason.refine((s) => s.length > 0),
  }),
  z.strictObject({ action: z.literal("revert"), ...target, reason }),
]);
export type TranslationRevisionInput = z.infer<typeof translationRevisionInput>;

/** Terjemahan korpus aktif satu paragraf, dasar resolusi keadaan. */
export interface CorpusTranslation {
  /** Teks yang tampil di korpus (draf AI, atau revisi manusia di korpus skema 8). */
  text: string;
  /** Draf AI (sama dengan `text` bila korpus belum memuat revisi manusia). */
  draft: string;
  draftSha256: string;
  /** sha256 `text_raw` Arab paragraf di korpus ini. */
  sourceSha256: string;
  /** Korpus sudah memuat tinjauan manusia untuk paragraf ini. */
  reviewed: boolean;
}

/** Keadaan terjemahan satu paragraf sesudah riwayat revisi diterapkan. */
export interface TranslationState {
  /**
   * `ai` = draf AI tanpa tinjauan; `confirmed` = draf AI "sudah benar"; `revised` = teks perbaikan;
   * `corpus` = belum ada revisi di DB app tetapi korpus sudah memuat tinjauan (korpus uji).
   */
  kind: "ai" | "confirmed" | "revised" | "corpus";
  /** Teks yang tampil (dasar perbaikan berikutnya). */
  text: string;
  /** Revisi yang menentukan teks + label (confirmed/revised; bukan baris pembatalan). */
  source: TranslationRevisionRow | null;
  /**
   * Revisi usang (dihitung, tidak disimpan): teks Arab berubah sejak ditinjau (`source`), atau draf
   * AI yang dinyatakan benar sudah diganti (`draft`). Revisi usang tidak masuk korpus berikutnya.
   */
  stale: "source" | "draft" | null;
}

/** Revisi yang menentukan keadaan baris ini: diri sendiri, atau yang dipulihkan pembatalan. */
export function underlyingRevision(
  row: TranslationRevisionRow,
  byId: ReadonlyMap<number, TranslationRevisionRow>,
): TranslationRevisionRow | null {
  if (row.kind !== "reverted") return row;
  return row.restores_id === null ? null : (byId.get(row.restores_id) ?? null);
}

/** Keadaan dari satu baris revisi (atau `null` = keadaan korpus). */
export function stateOf(
  row: TranslationRevisionRow | null,
  byId: ReadonlyMap<number, TranslationRevisionRow>,
  corpus: CorpusTranslation,
): TranslationState {
  if (row === null)
    return corpus.reviewed
      ? { kind: "corpus", text: corpus.text, source: null, stale: null }
      : { kind: "ai", text: corpus.draft, source: null, stale: null };
  const source = underlyingRevision(row, byId);
  if (source === null) return { kind: "ai", text: corpus.draft, source: null, stale: null };
  const staleSource = source.source_sha256 !== corpus.sourceSha256 ? "source" : null;
  if (source.kind === "revised" && source.text !== null)
    return { kind: "revised", text: source.text, source, stale: staleSource };
  return {
    kind: "confirmed",
    text: corpus.draft,
    source,
    stale: staleSource ?? (source.base_sha256 !== corpus.draftSha256 ? "draft" : null),
  };
}

/**
 * Keadaan yang dipulihkan "Batalkan": versi sebelum versi yang berlaku sekarang (mundur seperti
 * riwayat urung; menekan Batalkan lagi mundur satu versi lagi, bukan mengulang pembatalan). Versi
 * = revisi confirmed/revised; versi sebelumnya = keadaan baris yang digantikannya, atau draf AI.
 * `restores_id` baris pembatalan = `source` keadaan ini (tidak pernah baris pembatalan lain).
 */
export function previousState(
  active: TranslationRevisionRow,
  byId: ReadonlyMap<number, TranslationRevisionRow>,
  corpus: CorpusTranslation,
): TranslationState {
  const ai: TranslationState = { kind: "ai", text: corpus.draft, source: null, stale: null };
  const version = underlyingRevision(active, byId);
  if (version === null || version.supersedes_id === null) return ai;
  const prev = byId.get(version.supersedes_id);
  return prev === undefined ? ai : stateOf(prev, byId, corpus);
}

/** Ada versi yang bisa dibatalkan (keadaan sekarang bukan draf AI). */
export const canRevert = (
  active: TranslationRevisionRow | null,
  byId: ReadonlyMap<number, TranslationRevisionRow>,
): boolean => active !== null && underlyingRevision(active, byId) !== null;

/** ID revisi yang harus dimuat untuk menyelesaikan keadaan dan pembatalan baris-baris ini. */
export function referencedRevisionIds(rows: readonly TranslationRevisionRow[]): number[] {
  const ids = new Set<number>();
  for (const r of rows) {
    if (r.restores_id !== null) ids.add(r.restores_id);
    if (r.supersedes_id !== null) ids.add(r.supersedes_id);
  }
  return [...ids];
}
