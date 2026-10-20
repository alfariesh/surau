// Tambahan tipe binding yang tidak dibuat `wrangler types` (worker-configuration.d.ts): secret tidak
// ditulis di wrangler.jsonc. Opsional: tanpa secret, /jawab menjawab 503 `not_configured`.
declare namespace Cloudflare {
  interface Env {
    /** Token AI Gateway `surau-gw` (T-14). `wrangler secret put CF_AIG_TOKEN --name surau-api`. */
    CF_AIG_TOKEN?: string;
    /** Hanya mode `LLM_MODE = "direct"` (dev lokal/uji); tidak dipasang di produksi. */
    ANTHROPIC_API_KEY?: string;
    /** Secret widget Turnstile `Surau` (T-14). Staging: secret uji resmi. */
    TURNSTILE_SECRET_KEY?: string;
    /** Acak ≥32 karakter (S20, ADR-065): sumber kunci HMAC cookie anon, cache, kuota harian. */
    SURAU_API_SECRET?: string;
  }
}
