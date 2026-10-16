// Kunci rate limit per klien tanpa menyimpan atau mengirim IP mentah (ADR-034): HMAC(kunci,
// jaringan IP). Dipakai /api/feedback (S09) dan /api/search (S11).

/**
 * Jaringan klien untuk rate limit: IPv4 apa adanya, IPv6 dipotong ke /64 (satu pelanggan biasanya
 * memegang satu /64 utuh, jadi alamat penuh mudah diganti-ganti). Masukan tak dikenal dikembalikan.
 */
export function ipNetwork(ip: string): string {
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.toLowerCase().split("::", 2) as [string, string?];
  const h = head === "" ? [] : head.split(":");
  const t = ip.includes("::") ? (tail === "" ? [] : tail.split(":")) : [];
  // IPv4 tersemat (`::ffff:1.2.3.4`) dikembalikan utuh, supaya tidak berbagi satu kunci /64.
  if (h.length + t.length > 8 || [...h, ...t].some((g) => g.includes("."))) return ip;
  const groups = ip.includes("::")
    ? [...h, ...Array<string>(8 - h.length - t.length).fill("0"), ...t]
    : h;
  if (groups.length !== 8) return ip;
  return `${groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

/** HMAC-SHA256(kunci, ip) → 32 karakter hex. Kunci rate limit tanpa menyimpan/mengirim IP mentah. */
export async function ipKey(secret: string, ip: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(ip)));
  return Array.from(sig.subarray(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}
