import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      configPath: devRemoteConfig(),
      // Entri Worker berjalan di environment RSC, SSR sebagai anaknya.
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
});
