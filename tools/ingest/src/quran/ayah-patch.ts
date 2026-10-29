// Patch ayat (X29, ADR-133): kutipan Al-Qur'an yang terlewat pencocok (`matcher.ts`) tetapi sudah
// diverifikasi ditambahkan ke `passage_ayah_ref` lewat berkas yang di-commit,
// `data/patches/<kitab>-ayat.yaml`. Berkas hanya memuat ID, offset, sha256 potongan, dan nomor ayat,
// tanpa teks kitab. Kode tetap yang menentukan: potongan text_raw dicocokkan ulang ke mushaf dengan
// fungsi pencocok yang sama (persis, lalu mirip ≥ SIMILAR_MIN_SCORE), dan nomor ayat di patch hanya
// MEMILIH di antara letak yang ditemukan kode. Satu entri yang tidak lolos membuat ingest gagal.
import { createHash } from "node:crypto";
import { join } from "node:path";

import { passageAyahRefRow } from "@surau/db";
import type { PassageAyahRefRow } from "@surau/db";
import { normalizeArabic } from "@surau/text";
import { z } from "zod";

import { readStrictYaml } from "../patch.ts";
import { IHYA } from "../works/ihya.ts";
import { exactHits, fuzzyMatch, locate, SIMILAR_MIN_SCORE } from "./matcher.ts";
import type { QuranIndex } from "./matcher.ts";

const id = z.number().int().positive();

export const ayahPatch = z.strictObject({
  /** Kitab Shamela yang dipatch; dicek sama dengan sumber yang dibaca. */
  shamela_book: id,
  ayat: z
    .array(
      z.strictObject({
        passage_id: id,
        /** [char_start, char_end) di text_raw, seperti `passage_ayah_ref`. */
        char_start: z.number().int().nonnegative(),
        char_end: id,
        /** sha256 potongan text_raw: patch gagal keras bila teks sumber berubah. */
        span_sha256: z.string().regex(/^[0-9a-f]{64}$/),
        surah: z.number().int().min(1).max(114),
        ayah_from: id,
        ayah_to: id,
        /** Asal entri, mis. `audit-2026-10-29`. */
        sumber: z.string().regex(/^[a-z0-9-]+$/),
        /** Catatan peninjau, tanpa huruf Arab. */
        catatan: z
          .string()
          .max(300)
          .refine((s) => !/\p{Script=Arabic}/u.test(s), "catatan tanpa huruf Arab")
          .optional(),
      }),
    )
    .default([]),
});
export type AyahPatch = z.infer<typeof ayahPatch>;
export type AyahPatchEntry = AyahPatch["ayat"][number];

export const spanSha256 = (raw: string, start: number, end: number): string =>
  createHash("sha256").update(raw.slice(start, end)).digest("hex");

/** Satu letak mushaf untuk potongan teks, dihitung kode. */
export interface AyahCandidate {
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  partial: boolean;
  match: "exact" | "similar";
  /** Letak lain di mushaf dengan lafaz yang sama. */
  alt: number;
}

/** Huruf atau harakat: potongan tidak boleh mulai/berakhir di tengah kata. */
const WORD_CHAR = /[\p{L}\p{M}]/u;

/**
 * Semua letak mushaf untuk potongan `raw[start, end)`: cocok persis lebih dulu, lalu mirip.
 * Kosong bila tidak cocok, lebih pendek dari 2 kata, atau melintasi batas surah.
 */
export function ayahCandidates(
  index: QuranIndex,
  raw: string,
  start: number,
  end: number,
): AyahCandidate[] {
  const tokens = normalizeArabic(raw.slice(start, end)).text.split(" ").filter(Boolean);
  if (tokens.length < 2) return [];
  let hits = exactHits(index, tokens);
  let match: AyahCandidate["match"] = "exact";
  if (hits.length === 0) {
    const fuzzy = fuzzyMatch(index, tokens);
    if (fuzzy === null || fuzzy.score < SIMILAR_MIN_SCORE) return [];
    hits = fuzzy.hits;
    match = "similar";
  }
  const locs = hits.map((hit) => locate(index, hit)).filter((l) => l !== null);
  return locs.map((loc) => ({ ...loc, match, alt: locs.length - 1 }));
}

export interface PatchPassage {
  text_raw: string;
  kind: string;
}

/**
 * Terapkan patch ayat ke rujukan pencocok. Mengembalikan baris baru (tanpa rujukan lama) dan
 * daftar masalah; pemanggil menggagalkan ingest bila masalah tidak kosong.
 */
export function applyAyahPatch(
  index: QuranIndex,
  passages: ReadonlyMap<number, PatchPassage>,
  existing: readonly Pick<PassageAyahRefRow, "passage_id" | "char_start" | "char_end">[],
  patch: AyahPatch,
): { refs: PassageAyahRefRow[]; problems: string[] } {
  const taken = new Map<number, [number, number][]>();
  for (const r of existing) {
    taken.set(r.passage_id, [...(taken.get(r.passage_id) ?? []), [r.char_start, r.char_end]]);
  }
  const refs: PassageAyahRefRow[] = [];
  const problems: string[] = [];
  for (const e of patch.ayat) {
    const at = `${e.passage_id}@${e.char_start}`;
    const p = passages.get(e.passage_id);
    if (p === undefined) {
      problems.push(`${at}: paragraf tidak ada`);
      continue;
    }
    if (p.kind !== "body") {
      problems.push(`${at}: bukan paragraf badan (${p.kind})`);
      continue;
    }
    const raw = p.text_raw;
    if (e.char_end <= e.char_start || e.char_end > raw.length) {
      problems.push(`${at}: rentang di luar teks (${raw.length} karakter)`);
      continue;
    }
    if (spanSha256(raw, e.char_start, e.char_end) !== e.span_sha256) {
      problems.push(`${at}: span_sha256 tidak cocok (teks sumber berubah?)`);
      continue;
    }
    const before = raw[e.char_start - 1];
    const after = raw[e.char_end];
    if (
      !WORD_CHAR.test(raw[e.char_start] ?? "") ||
      !WORD_CHAR.test(raw[e.char_end - 1] ?? "") ||
      (before !== undefined && WORD_CHAR.test(before)) ||
      (after !== undefined && WORD_CHAR.test(after))
    ) {
      problems.push(`${at}: rentang memotong kata`);
      continue;
    }
    const spans = taken.get(e.passage_id) ?? [];
    if (spans.some(([a, b]) => e.char_start < b && e.char_end > a)) {
      problems.push(`${at}: menimpa rujukan ayat lain`);
      continue;
    }
    const cands = ayahCandidates(index, raw, e.char_start, e.char_end);
    const pick = cands.find(
      (c) => c.surah === e.surah && c.ayahFrom === e.ayah_from && c.ayahTo === e.ayah_to,
    );
    if (pick === undefined) {
      const found = cands.map((c) => `${c.surah}:${c.ayahFrom}-${c.ayahTo}`).join(", ");
      problems.push(
        `${at}: lafaz tidak cocok QS ${e.surah}:${e.ayah_from}-${e.ayah_to} (letak kode: ${found || "tidak ada"})`,
      );
      continue;
    }
    taken.set(e.passage_id, [...spans, [e.char_start, e.char_end]]);
    refs.push(
      passageAyahRefRow.parse({
        passage_id: e.passage_id,
        char_start: e.char_start,
        char_end: e.char_end,
        surah: pick.surah,
        ayah_from: pick.ayahFrom,
        ayah_to: pick.ayahTo,
        match: pick.match,
        partial: pick.partial ? 1 : 0,
        bracketed: 0,
        alt_count: pick.alt,
      }),
    );
  }
  return { refs, problems };
}

/**
 * Rujukan pencocok saja, tanpa entri patch ayat (ADR-134 butir 5, opsi b). Ringkasan AI dan Intisari
 * dibuat dari teks bertanda rujukan ini, sehingga hash-nya tidak berubah oleh patch: patch hanya
 * berlaku untuk terjemahan per paragraf. Entri dikenali dari berkas patch (passage_id + char_start),
 * sehingga hasilnya sama untuk baris build maupun baris yang dibaca dari D1.
 */
export function matcherRefs<T extends { passage_id: number; char_start: number }>(
  refs: readonly T[],
  patchPath: string = DEFAULT_PATCH,
): T[] {
  const keys = patchKeys(patchPath);
  return keys.size === 0
    ? [...refs]
    : refs.filter((r) => !keys.has(`${r.passage_id}@${r.char_start}`));
}

const DEFAULT_PATCH = join(import.meta.dirname, "../../../..", IHYA.ayahPatch ?? "");
const keyCache = new Map<string, Set<string>>();
function patchKeys(path: string): Set<string> {
  let keys = keyCache.get(path);
  if (keys === undefined) {
    keys =
      IHYA.ayahPatch === undefined && path === DEFAULT_PATCH
        ? new Set()
        : new Set(
            readStrictYaml(path, ayahPatch).ayat.map((e) => `${e.passage_id}@${e.char_start}`),
          );
    keyCache.set(path, keys);
  }
  return keys;
}
