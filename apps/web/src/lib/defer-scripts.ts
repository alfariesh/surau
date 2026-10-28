// Skrip Next ditunda sampai CSS selesai (ADR-122, gerbang ADR-121 butir 2). Next menulis 30-an
// `<script src async>` + satu `<link rel="preload" as="script">` di <head>. Di ponsel lambat skrip itu
// (±340–410 KB) berebut jaringan dengan CSS render-blocking, sehingga teks baru tampil sesudah
// sebagian besar JS terunduh (FCP produksi ±3,2 dtk dengan throttling ponsel). Worker (`worker.ts`)
// memindahkan tag itu ke pemuat kecil di akhir <head> yang baru menyisipkan skrip sesudah setiap
// stylesheet selesai dimuat (atau gagal), dengan urutan dan atribut yang sama. Hidrasi bergeser
// sesudah cat pertama; harganya diukur di ADR-122.
//
// Hanya respons HTML tanpa content-encoding (server Next di OpenNext tidak mengompres; kompresi oleh
// edge sesudah Worker). Payload RSC navigasi klien (`text/x-component`) tidak tersentuh, dan tanpa
// JavaScript halaman tetap tampil dari HTML server.

/** Awalan berkas JS hasil build Next: hanya skrip ini yang ditunda. */
const NEXT_STATIC = "/_next/static/";

export type DeferredScript = { src: string; crossOrigin: string | null; integrity: string | null };

/**
 * Pemuat inline: sisipkan skrip sesudah semua `<link rel="stylesheet">` yang belum dimuat selesai
 * (load/error). Event `load` jendela menjadi cadangan. Satu kali saja, tanpa global. `<` di-escape
 * supaya isi atribut tidak bisa menutup elemen <script> saat HTML diurai.
 */
export function deferLoaderScript(scripts: readonly DeferredScript[]): string {
  const data = JSON.stringify(scripts).replaceAll("<", "\\u003c");
  return `(function(){var s=${data},d=document,done=0,n=0;function go(){if(done)return;done=1;for(var i=0;i<s.length;i++){var e=d.createElement("script");e.src=s[i].src;e.async=true;if(s[i].crossOrigin!==null)e.crossOrigin=s[i].crossOrigin;if(s[i].integrity!==null)e.integrity=s[i].integrity;d.head.appendChild(e)}}function one(){if(--n<=0)go()}var ls=d.querySelectorAll('link[rel="stylesheet"]');for(var i=0;i<ls.length;i++){if(!ls[i].sheet){n++;ls[i].addEventListener("load",one);ls[i].addEventListener("error",one)}}if(!n)go();addEventListener("load",go)})();`;
}

/** Respons yang boleh ditulis ulang: HTML ber-body tanpa kompresi. */
export function shouldDeferScripts(res: Response): boolean {
  const type = res.headers.get("content-type") ?? "";
  const encoding = res.headers.get("content-encoding");
  return res.body !== null && type.includes("text/html") && (!encoding || encoding === "identity");
}

/** Tulis ulang HTML lewat HTMLRewriter (runtime Workers). Respons lain dikembalikan apa adanya. */
export function deferNextScripts(res: Response): Response {
  if (!shouldDeferScripts(res)) return res;
  const scripts: DeferredScript[] = [];
  const headers = new Headers(res.headers);
  // Panjang body berubah; ETag lama tidak lagi mewakili isi yang dikirim.
  headers.delete("content-length");
  headers.delete("etag");
  return new HTMLRewriter()
    .on(`head script[src^="${NEXT_STATIC}"][async]`, {
      element(el) {
        scripts.push({
          src: el.getAttribute("src") ?? "",
          crossOrigin: el.getAttribute("crossorigin"),
          integrity: el.getAttribute("integrity"),
        });
        el.remove();
      },
    })
    .on(`head link[rel="preload"][as="script"][href^="${NEXT_STATIC}"]`, {
      element(el) {
        el.remove();
      },
    })
    .on("head", {
      element(el) {
        el.onEndTag((end) => {
          if (scripts.length > 0)
            end.before(`<script>${deferLoaderScript(scripts)}</script>`, { html: true });
        });
      },
    })
    .transform(new Response(res.body, { status: res.status, statusText: res.statusText, headers }));
}
