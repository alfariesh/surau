// Tambahan tipe binding yang tidak dibuat `wrangler types` (worker-configuration.d.ts): secret tidak
// ditulis di wrangler.jsonc. Opsional: tanpa secret, setiap tool menjawab `unavailable` (ADR-049).
declare namespace Cloudflare {
  interface Env {
    /** Kunci HMAC jaringan IP untuk batas pemakaian. Produksi: `wrangler secret put IP_HMAC_KEY`. */
    IP_HMAC_KEY?: string;
  }
}
