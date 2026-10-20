// Tambahan tipe binding yang tidak dibuat `wrangler types` (worker-configuration.d.ts): secret tidak
// ditulis di wrangler.jsonc. Opsional: tanpa secret, /jawab menjawab 503 `not_configured`.
declare namespace Cloudflare {
  interface Env {
    /** Token AI Gateway `surau-gw` (T-14). `wrangler secret put CF_AIG_TOKEN --name surau-api`. */
    CF_AIG_TOKEN?: string;
    /** Hanya mode `LLM_MODE = "direct"` (dev lokal/uji); tidak dipasang di produksi. */
    ANTHROPIC_API_KEY?: string;
  }
}
