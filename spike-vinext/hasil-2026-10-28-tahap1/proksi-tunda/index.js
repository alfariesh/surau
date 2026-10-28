// Gerbang f ADR-119 (sementara): proksi di depan produksi Next (surau.org). TUNDA=1 memindahkan
// `<script src async>` dan `<link rel=preload as=script>` dari HTML ke pemuat kecil yang baru
// menyisipkan skrip sesudah semua CSS render-blocking selesai (urutan unduh seperti vinext).
// TUNDA=0 = kontrol: proksi yang sama tanpa perubahan HTML. Hanya GET/HEAD.
const ORIGIN = "https://surau.org";

const LOADER = (srcs) =>
  `(function(){var s=${JSON.stringify(srcs)};var go=function(){if(go.d)return;go.d=1;s.forEach(function(u){var e=document.createElement("script");e.src=u;e.async=true;document.head.appendChild(e)})};var ls=[].slice.call(document.querySelectorAll('link[rel="stylesheet"]')).filter(function(l){return!l.sheet});var n=ls.length;if(!n)return go();ls.forEach(function(l){var f=function(){if(--n<=0)go()};l.addEventListener("load",f);l.addEventListener("error",f)})})();`;

export default {
  async fetch(req, env) {
    if (req.method !== "GET" && req.method !== "HEAD")
      return new Response("hanya GET", { status: 405 });
    const url = new URL(req.url);
    const up = await fetch(ORIGIN + url.pathname + url.search, {
      headers: {
        accept: req.headers.get("accept") ?? "*/*",
        "accept-encoding": "br, gzip",
        "user-agent": req.headers.get("user-agent") ?? "",
      },
      redirect: "manual",
    });
    const type = up.headers.get("content-type") ?? "";
    if (env.TUNDA !== "1" || !type.includes("text/html")) return new Response(up.body, up);
    const srcs = [];
    const rewritten = new HTMLRewriter()
      .on("head script[src][async]", {
        element(e) {
          srcs.push(e.getAttribute("src"));
          e.remove();
        },
      })
      .on('head link[rel="preload"][as="script"]', {
        element(e) {
          e.remove();
        },
      })
      .on("head", {
        element(e) {
          e.onEndTag((end) => {
            end.before(`<script>${LOADER(srcs)}</script>`, { html: true });
          });
        },
      })
      .transform(new Response(up.body, up));
    const res = new Response(rewritten.body, rewritten);
    res.headers.set("x-uji-tunda", "1");
    return res;
  },
};
