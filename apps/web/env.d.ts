// Tambahan tipe binding yang tidak dibuat `wrangler types` (cloudflare-env.d.ts): secret tidak
// ditulis di wrangler.jsonc. Opsional karena belum tentu dipasang di setiap lingkungan (ADR-034).
interface CloudflareEnv {
  /** Kunci HMAC untuk IP di rate limit /api/feedback. Produksi: `wrangler secret put IP_HMAC_KEY`. */
  IP_HMAC_KEY?: string;
}
