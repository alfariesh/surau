// Gerbang e ADR-119: fungsi Worker vinext dibanding produksi Next (GET saja ke produksi).
const P = "https://surau.org",
  V = process.env.V;
const SEC = [
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "strict-transport-security",
  "x-frame-options",
  "content-security-policy",
];
const get = async (base, path, init = {}) => {
  const r = await fetch(base + path, { redirect: "manual", ...init });
  const body = await r.text();
  return { s: r.status, h: r.headers, body, loc: r.headers.get("location") };
};
const sec = (h) => SEC.map((k) => `${k}=${h.get(k) ?? "-"}`).join(" | ");
const out = [];
const row = (name, p, v, ok) =>
  out.push(`${ok ? "OK  " : "BEDA"} ${name}\n      next:   ${p}\n      vinext: ${v}`);
for (const path of ["/", "/kitab/ihya/1/200", "/cari", "/tentang"]) {
  const [a, b] = await Promise.all([get(P, path), get(V, path)]);
  row(
    `header keamanan ${path}`,
    `${a.s} ${sec(a.h)}`,
    `${b.s} ${sec(b.h)}`,
    a.s === b.s && sec(a.h) === sec(b.h),
  );
}
// Berkas statis: aset ilustrasi, tekstur kertas, chunk JS pertama dari HTML.
for (const path of ["/aset/cara-mencari.html", "/kertas/serat.avif"]) {
  const [a, b] = await Promise.all([get(P, path), get(V, path)]);
  const f = (x) => `${x.s} cc=${x.h.get("cache-control")} | ${sec(x.h)}`;
  row(
    `statis ${path}`,
    f(a),
    f(b),
    f(a).replace(/\d{3}/, "") === f(b).replace(/\d{3}/, "") && a.s === b.s,
  );
}
for (const base of [P, V]) {
  const html = (await get(base, "/tentang")).body;
  const js = html.match(/src="(\/_next\/static\/[^"]+\.js)"/)?.[1];
  const r = await get(base, js);
  out.push(
    `INFO chunk ${base === P ? "next" : "vinext"} ${js} → ${r.s} cc=${r.h.get("cache-control")}`,
  );
}
// API dan rute data.
const api = [
  ["/api/version", (r) => r.s === 200],
  [
    "/api/search?q=" + encodeURIComponent("صلاة الجمعة"),
    (r) => r.s === 200 && JSON.parse(r.body).results?.length > 0,
  ],
  ["/api/search?q=shalat", (r) => r.s === 200],
  ["/api/halaman?work=ihya&juz=1&page=201", (r) => r.s === 200],
  ["/api/kutipan?r=abc", (r) => r.s === 400],
  ["/kitab/ihya/daftar-isi.json", (r) => r.s === 200 && r.body.startsWith("{")],
  ["/api/jawab", (r) => r.s === 200],
  ["/sitemap.xml", (r) => r.s === 200],
  ["/robots.txt", (r) => r.s === 200],
  ["/kitab/ihya/9/999", (r) => r.s === 404],
  ["/tidak-ada-halaman", (r) => r.s === 404],
];
for (const [path, ok] of api) {
  const [a, b] = await Promise.all([get(P, path), get(V, path)]);
  const f = (r) =>
    `${r.s} ${(r.h.get("content-type") ?? "").split(";")[0]} ${r.body.slice(0, 90).replace(/\s+/g, " ")}`;
  let okA = false,
    okB = false;
  try {
    okA = ok(a);
  } catch {}
  try {
    okB = ok(b);
  } catch {}
  row(`api ${path}`, f(a), f(b), okA && okB);
}
// Access: gagal tertutup tanpa JWT.
for (const path of [
  "/tinjau",
  "/tinjau/takhrij",
  "/admin",
  "/api/admin",
  "/api/review",
  "/api/review/export",
]) {
  const [a, b] = await Promise.all([get(P, path), get(V, path)]);
  const f = (r) =>
    `${r.s}${r.loc ? " → " + r.loc.slice(0, 60) : ""} ${r.body.slice(0, 60).replace(/\s+/g, " ")}`;
  row(`access ${path}`, f(a), f(b), a.s === b.s);
}
// Laporan kesalahan honeypot (hanya ke vinext: tidak ditulis ke DB).
const fb = await fetch(V + "/api/feedback", {
  method: "POST",
  headers: { "content-type": "application/json", origin: V },
  body: JSON.stringify({
    kind: "typo",
    message: "Uji gerbang ADR-119: abaikan.",
    path: "/kitab/ihya/1/200",
    passage_id: null,
    website: "https://bot.example",
  }),
});
out.push(
  `${fb.status === 201 ? "OK  " : "BEDA"} feedback honeypot vinext → ${fb.status} ${(await fb.text()).slice(0, 80)}`,
);
// Rate limit pencarian (hanya vinext): 70 permintaan beruntun.
const codes = {};
for (let i = 0; i < 70; i++) {
  const r = await fetch(`${V}/api/search?q=uji${i % 5}`);
  codes[r.status] = (codes[r.status] ?? 0) + 1;
  await r.arrayBuffer();
}
out.push(
  `${codes[429] ? "OK  " : "BEDA"} rate limit /api/search vinext, 70 permintaan: ${JSON.stringify(codes)}`,
);
console.log(out.join("\n"));
