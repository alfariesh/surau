// Entri Worker web Surau: pembungkus Worker hasil build OpenNext (custom worker, docs OpenNext
// "Custom Worker"). Satu tambahan: skrip Next di HTML ditunda sampai CSS selesai
// (src/lib/defer-scripts.ts, ADR-124). `ctx` diteruskan apa adanya karena OpenNext menyimpan konteks
// Cloudflare per permintaan di dalam `fetch`-nya.
// @ts-ignore: berkas dibuat `opennextjs-cloudflare build`, belum ada sebelum build.
import { default as handler } from "./.open-next/worker.js";

import { deferNextScripts } from "./src/lib/defer-scripts";

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    const res = await handler.fetch(request, env, ctx);
    return request.method === "GET" ? deferNextScripts(res) : res;
  },
} satisfies ExportedHandler<CloudflareEnv>;

// Kelas yang diekspor Worker OpenNext (Surau belum memakainya: cache R2 + antrean no-op, ADR-038).
// @ts-ignore: idem.
export { BucketCachePurge, DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
