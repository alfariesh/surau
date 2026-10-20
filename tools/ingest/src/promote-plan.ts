// Keputusan `corpus:promote` tanpa efek samping (#78): dari argumen dan keadaan remote yang sudah
// dibaca, tentukan rencana tindakan. `promote.ts` hanya membaca keadaan, memanggil `decidePromote`,
// lalu menjalankan rencananya (wrangler, smoke, tulis wrangler.jsonc). Urutan pemeriksaan: format
// versi → korpus staging → --switch-only → korpus terlindungi → sudah ada tanpa --reload → tanpa
// --confirm (rencana saja) → muat. Beda dengan sebelum dipisah: info build (`buildInfo`) kini dibaca
// SESUDAH penolakan, jadi build yang hilang tidak lagi mendahului pesan tolak.
import { CORPUS_SCHEMA_VERSION } from "@surau/db";

import type { CorpusBinding } from "./corpus.ts";

export interface RemoteDb {
  uuid: string;
  name: string;
}

export interface PromoteArgs {
  version: string;
  confirm: boolean;
  switchOnly: boolean;
  reload: boolean;
}

export interface PromoteState {
  /** DB remote bernama `surau-corpus-<versi>`, bila ada. */
  existing: RemoteDb | undefined;
  /** ID D1 korpus staging (tidak pernah boleh jadi produksi). */
  stagingId: string;
  /** DB sedang/pernah melayani produksi (working tree, origin/main, data/SOURCES.md). */
  isProtected: (db: CorpusBinding) => boolean;
}

export type PromotePlan =
  /** Argumen salah: cetak cara pakai, keluar 2. */
  | { kind: "usage" }
  /** Ditolak: cetak pesan, keluar 1, tidak ada yang diubah. */
  | { kind: "refuse"; message: string }
  /** Rollback/maju ke DB yang sudah ada: smoke (skema lama boleh) lalu ganti binding. */
  | { kind: "switch"; name: string; db: RemoteDb }
  /** Tanpa --confirm: cetak rencana saja. */
  | { kind: "preview"; name: string; create: boolean }
  /** --confirm: (buat bila belum ada) → migrasi + muat → smoke ketat → ganti binding. */
  | { kind: "load"; name: string; create: boolean };

export const VERSION_PATTERN = /^[a-z][a-z0-9]*-v\d+$/;

export function corpusName(version: string): string {
  return `surau-corpus-${version}`;
}

export function decidePromote(args: PromoteArgs, state: PromoteState): PromotePlan {
  if (!VERSION_PATTERN.test(args.version)) return { kind: "usage" };
  const name = corpusName(args.version);
  const { existing } = state;
  if (existing !== undefined && existing.uuid === state.stagingId) {
    return {
      kind: "refuse",
      message: `${name} adalah korpus staging: tidak pernah dijadikan produksi.`,
    };
  }
  if (args.switchOnly) {
    if (existing === undefined) {
      return {
        kind: "refuse",
        message: `${name} tidak ada di akun Cloudflare: tidak bisa dijadikan produksi.`,
      };
    }
    return { kind: "switch", name, db: existing };
  }
  if (existing !== undefined && state.isProtected({ name, id: existing.uuid })) {
    const nextVersion = args.version.replace(/\d+$/, (n) => String(Number(n) + 1));
    return {
      kind: "refuse",
      message: `${name} sedang atau pernah melayani produksi (working tree, origin/main, atau data/SOURCES.md): tidak boleh dimuat ulang. Korpus baru = versi baru (mis. ${nextVersion}).`,
    };
  }
  if (existing !== undefined && !args.reload) {
    return {
      kind: "refuse",
      message: `${name} sudah ada (${existing.uuid}). Pakai --reload untuk memuat ulang (menimpa isinya), atau --switch-only untuk langsung memakainya.`,
    };
  }
  const create = existing === undefined;
  return args.confirm ? { kind: "load", name, create } : { kind: "preview", name, create };
}

/**
 * Rollback ke korpus berskema LEBIH LAMA diizinkan (keputusan S14, ADR-044): kode memeriksa
 * meta.schema_version dan menyembunyikan fitur yang tabelnya belum ada (ARSITEKTUR-TEKNIS §7
 * aturan 5). Skema yang LEBIH BARU dari kode, atau tidak terbaca, ditolak.
 */
export function rollbackSchemaProblem(schemaVersion: string | undefined): string | null {
  const schema = Number(schemaVersion ?? 0);
  return schema >= 1 && schema <= CORPUS_SCHEMA_VERSION
    ? null
    : `meta.schema_version ${schemaVersion ?? "–"}, kode mendukung 1–${CORPUS_SCHEMA_VERSION}`;
}

/** Versi baru dibangun kode ini: batasan skema pun dianggap kegagalan (binding tidak diubah). */
export function loadSmokeFailures(smoke: { problems: string[]; limitations: string[] }): string[] {
  return [...smoke.problems, ...smoke.limitations];
}
