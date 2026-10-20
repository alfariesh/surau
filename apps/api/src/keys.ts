// Kunci turunan dari SATU secret Worker `SURAU_API_SECRET` (S20, ADR-065): HKDF-SHA256 dengan label
// berbeda per kegunaan, jadi satu kunci yang bocor tidak membuka kegunaan lain dan pemilik cukup
// memasang satu secret. Kegunaan: tanda tangan cookie anon, HMAC kunci `answer_cache`, dan HMAC
// subjek kuota per HARI (label memuat tanggal; tanpa secret, baris hari berbeda tidak bisa
// ditautkan). Kunci turunan tidak pernah keluar dari Worker dan tidak pernah di-log.
import { ipNetwork } from "@surau/core";

const enc = new TextEncoder();

/** Panjang minimal secret (32 karakter acak, mis. `openssl rand -base64 32`). */
export const SECRET_MIN_LENGTH = 32;

export const ANON_COOKIE = "surau_anon";
export const ANON_TTL_SECONDS = 24 * 60 * 60;
const ANON_ID = /^[A-Za-z0-9_-]{22}$/u;

// Memo per isolate: derivasi HKDF tidak diulang tiap request. Label harian membuat peta tumbuh
// satu entri per hari, jadi dibatasi.
const memo = new Map<string, Promise<CryptoKey>>();

function deriveKey(secret: string, label: string): Promise<CryptoKey> {
  const id = `${label}\n${secret}`;
  const hit = memo.get(id);
  if (hit) return hit;
  if (memo.size >= 16) memo.clear();
  const key = (async () => {
    const base = await crypto.subtle.importKey("raw", enc.encode(secret), "HKDF", false, [
      "deriveKey",
    ]);
    return crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: enc.encode("surau-api"), info: enc.encode(label) },
      base,
      { name: "HMAC", hash: "SHA-256", length: 256 },
      false,
      ["sign", "verify"],
    );
  })();
  memo.set(id, key);
  return key;
}

export const anonKey = (secret: string) => deriveKey(secret, "surau/anon-cookie/v1");
export const cacheKey = (secret: string) => deriveKey(secret, "surau/answer-cache/v1");
const quotaKey = (secret: string, day: string) => deriveKey(secret, `surau/quota/v1/${day}`);

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(s)) return null;
  try {
    const bin = atob(s.replaceAll("-", "+").replaceAll("_", "/"));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacHex(key: CryptoKey, data: string): Promise<string> {
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  return Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** ID anon acak 128 bit (22 karakter base64url). Bukan data pribadi; hanya hidup 24 jam. */
export function newAnonId(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(16)));
}

/** Nilai cookie `v1.<id>.<kedaluwarsa detik>.<HMAC>`. */
export async function signAnon(secret: string, id: string, expSeconds: number): Promise<string> {
  const payload = `v1.${id}.${expSeconds}`;
  const mac = await crypto.subtle.sign("HMAC", await anonKey(secret), enc.encode(payload));
  return `${payload}.${b64url(new Uint8Array(mac))}`;
}

/** ID anon dari nilai cookie yang sah dan belum kedaluwarsa; selain itu `null`. */
export async function verifyAnon(
  secret: string,
  value: string | null,
  nowSeconds: number,
): Promise<string | null> {
  if (value === null || value.length > 200) return null;
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [, id = "", exp = "", sig = ""] = parts;
  if (!ANON_ID.test(id) || !/^[1-9][0-9]{0,11}$/u.test(exp)) return null;
  const expSeconds = Number(exp);
  if (expSeconds <= nowSeconds || expSeconds > nowSeconds + ANON_TTL_SECONDS + 60) return null;
  const mac = fromB64url(sig);
  if (mac === null || mac.byteLength !== 32) return null;
  // `verify` membandingkan dalam waktu konstan.
  const ok = await crypto.subtle.verify(
    "HMAC",
    await anonKey(secret),
    mac,
    enc.encode(`v1.${id}.${exp}`),
  );
  return ok ? id : null;
}

/** Header Set-Cookie: hanya dikirim ke /api/jawab, tidak bisa dibaca JavaScript. */
export function anonSetCookie(value: string, maxAge = ANON_TTL_SECONDS): string {
  return `${ANON_COOKIE}=${value}; Max-Age=${maxAge}; Path=/api/jawab; HttpOnly; Secure; SameSite=Strict`;
}

/**
 * Subjek kuota hari `day`: HMAC anon-id dan HMAC jaringan IP (IPv6 per /64) dengan kunci harian.
 * IP mentah hanya hidup di fungsi ini; yang disimpan hanya hex 64 karakter.
 */
export async function quotaSubjects(
  secret: string,
  day: string,
  anonId: string,
  ip: string | null,
): Promise<{ anon: string; ip: string }> {
  const key = await quotaKey(secret, day);
  return {
    anon: await hmacHex(key, `anon:${anonId}`),
    ip: await hmacHex(key, `ip:${ipNetwork(ip ?? "unknown")}`),
  };
}
