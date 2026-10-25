// Target sorotan kalimat (X18, ADR-102): untuk setiap kalimat skrip audio (urut, datar), teks di
// halaman Intisari yang dibacakannya: kunci `data-say` elemen + rentang [start, end) di teks field
// itu. Dihitung server dari `DigestScript.sources` (modul murni, tanpa impor nilai core: aman untuk
// klien). null = kalimat buatan kode (label, "Gagasan pertama", pengantar kutipan) yang tidak
// tampil sebagai teks: tidak disorot.
import type { DigestScript, ScriptSource } from "@surau/core";

import { MEDIA_ORIGIN } from "./track";

export interface FollowTarget {
  say: string;
  start: number;
  end: number;
}

/** Kunci `data-say` elemen yang menampilkan sebuah field Intisari. */
export function sayKey(field: ScriptSource["field"], ord: number | null): string {
  switch (field) {
    case "point_title":
      return `point-title-${ord}`;
    case "point_body":
      return `point-body-${ord}`;
    case "quote":
      return `quote-${ord}`;
    default:
      return field;
  }
}

export function followTargets(script: Pick<DigestScript, "sources">): (FollowTarget | null)[] {
  return script.sources
    .flat()
    .map((s) => (s === null ? null : { say: sayKey(s.field, s.ord), start: s.start, end: s.end }));
}

/** Data sorotan halaman: objek timestamps di bucket media + target kalimatnya. */
export interface FollowData {
  /** Kunci objek audio (`ListenTrack.key`): sorotan hanya saat audio INI yang dimuat pemutar. */
  trackKey: string;
  /** sha skrip halaman: objek timestamps dengan `script_sha256` lain ditolak. */
  scriptSha: string;
  src: string;
  targets: (FollowTarget | null)[];
}

export const followSrc = (alignmentKey: string, mediaOrigin = MEDIA_ORIGIN): string =>
  `${mediaOrigin}/${alignmentKey}`;

/**
 * Paragraf teks AI multi-paragraf (pembuka, ringkasan, penutup) seperti dirender `Prose`: dipecah di
 * baris kosong dan dipangkas, dengan posisi awal tiap paragraf di teks aslinya (`data-say-at`).
 */
export function proseParagraphs(text: string): { text: string; at: number }[] {
  const out: { text: string; at: number }[] = [];
  let last = 0;
  const push = (from: number, to: number) => {
    const raw = text.slice(from, to);
    const trimmed = raw.trim();
    out.push({ text: trimmed, at: from + (raw.length - raw.trimStart().length) });
  };
  for (const m of text.matchAll(/\n\s*\n/gu)) {
    push(last, m.index);
    last = m.index + m[0].length;
  }
  push(last, text.length);
  return out;
}
