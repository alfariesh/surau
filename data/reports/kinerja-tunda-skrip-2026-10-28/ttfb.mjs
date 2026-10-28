// Diagnostik ADR-124: TTFB HTML (fetch Node, n=10 per basis per halaman, bergantian, jeda 0,5 dtk).
const bases = JSON.parse(
  process.env.BASES ?? '{"preview":"https://pr-206.surau.org","produksi":"https://surau.org"}',
);
const pages = ["/kitab/ihya/1/200", "/kitab/ihya/3/202"];
const res = {};
for (let i = 0; i < 10; i++)
  for (const p of pages)
    for (const [k, b] of Object.entries(bases)) {
      const t0 = performance.now();
      const r = await fetch(b + p, { headers: { "accept-encoding": "br" } });
      const ttfb = performance.now() - t0;
      await r.arrayBuffer();
      (res[`${p} ${k}`] ??= []).push(ttfb);
      await new Promise((s) => setTimeout(s, 500));
    }
const med = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor((s.length - 1) / 2)];
};
for (const [k, v] of Object.entries(res))
  console.log(
    k.padEnd(32),
    "TTFB median",
    Math.round(med(v)),
    "ms | min",
    Math.round(Math.min(...v)),
    "max",
    Math.round(Math.max(...v)),
  );
