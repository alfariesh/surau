import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { responseStoreAdapter } from "@vinext/cloudflare/cache/response-store-adapter";
import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";

// `pnpm dev:remote` (ADR-089): CORPUS_DB dibaca dari D1 di Cloudflare (remote binding), binding lain
// tetap lokal; korpus hanya dibaca oleh kode web. Dev memakai `preview_database_id` =
// `surau-corpus-staging` (korpus Preview), bukan korpus produksi. Konfigurasi turunan dibangkitkan
// dari wrangler.jsonc (satu sumber), di-gitignore.
function devRemoteConfig(): string | undefined {
  if (process.env.SURAU_DEV_REMOTE !== "1") return undefined;
  const source = readFileSync(join(import.meta.dirname, "wrangler.jsonc"), "utf8");
  const corpus = /("binding": "CORPUS_DB",[^}]*?"preview_database_id": "[^"]+",)/;
  if (/"remote":\s*true/.test(source))
    throw new Error(
      'dev:remote: wrangler.jsonc sudah memuat "remote": true; periksa konfigurasinya',
    );
  if (!corpus.test(source))
    throw new Error("dev:remote: binding CORPUS_DB + preview_database_id tidak ditemukan");
  const target = join(import.meta.dirname, "wrangler.dev-remote.jsonc");
  writeFileSync(target, source.replace(corpus, '$1\n      "remote": true,'));
  return target;
}

// Worker uji ADR-119 tahap 1 (`SURAU_VINEXT_UJI=1`): binding staging + cache Workers Response Store
// (self-contained), lihat wrangler.vinext-uji.jsonc.
const uji = process.env.SURAU_VINEXT_UJI === "1";

export default defineConfig({
  plugins: [
    vinext(uji ? { cache: responseStoreAdapter({ mode: "self-contained" }) } : {}),
    cloudflare({
      configPath: uji ? join(import.meta.dirname, "wrangler.vinext-uji.jsonc") : devRemoteConfig(),
      // Entri Worker berjalan di environment RSC, SSR sebagai anaknya.
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
});
