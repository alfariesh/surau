import { chromium } from "@playwright/test";
const VARIANTS = [
  ["next", "https://localhost:4422"],
  ["vinext", "https://localhost:4421"],
];
const PAGES = [
  ["/kitab/ihya/1/200", /Tampilan/],
  ["/", null],
];
const N = Number(process.env.N ?? 6);
const THROTTLE = process.env.THROTTLE === "1";
const b = await chromium.launch({ args: ["--ignore-certificate-errors"] });
const out = {};
for (let i = 0; i < N; i++)
  for (const [path, label] of PAGES)
    for (const [name, base] of i % 2 ? VARIANTS : [...VARIANTS].reverse()) {
      const ctx = await b.newContext({
        ignoreHTTPSErrors: true,
        viewport: { width: 412, height: 823 },
        isMobile: THROTTLE,
        hasTouch: THROTTLE,
      });
      const p = await ctx.newPage();
      if (THROTTLE) {
        const cdp = await ctx.newCDPSession(p);
        await cdp.send("Network.enable");
        await cdp.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: 150,
          downloadThroughput: 1.6e6 / 8,
          uploadThroughput: 750e3 / 8,
        });
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      }
      await p.addInitScript((src) => {
        const re = src ? new RegExp(src) : null;
        window.__t = {};
        const poll = () => {
          const cands = [...document.querySelectorAll("button, a")];
          const el = re
            ? cands.find((x) => re.test(x.getAttribute("aria-label") ?? x.textContent ?? ""))
            : cands.find((x) => x.closest("header"));
          if (el && !window.__t.hyd && Object.keys(el).some((k) => k.startsWith("__reactProps")))
            window.__t.hyd = performance.now();
          if (!window.__t.hyd) requestAnimationFrame(poll);
        };
        document.addEventListener("DOMContentLoaded", () => poll());
        window.addEventListener("load", () => (window.__t.load = performance.now()));
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) window.__t.lcp = e.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
      }, label?.source ?? null);
      await p.goto(base + path, { waitUntil: "load", timeout: 90000 });
      await p.waitForFunction(() => window.__t.hyd, null, { timeout: 60000 }).catch(() => {});
      await p.waitForTimeout(500);
      const t = await p.evaluate(() => {
        const res = performance
          .getEntriesByType("resource")
          .filter(
            (r) =>
              r.initiatorType === "script" ||
              r.name.endsWith(".js") ||
              (r.initiatorType === "link" && r.name.includes(".js")),
          );
        const nav = performance.getEntriesByType("navigation")[0];
        return {
          ...window.__t,
          fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime,
          js: res.length,
          jsKB: res.reduce((s, r) => s + r.transferSize, 0) / 1024,
          proto: nav.nextHopProtocol,
        };
      });
      (out[`${path} ${name}`] ??= []).push(t);
      await ctx.close();
    }
await b.close();
const med = (a) => {
  const s = a.filter((x) => x != null).sort((x, y) => x - y);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN;
};
console.log(`throttle=${THROTTLE} n=${N}`);
for (const [k, rows] of Object.entries(out)) {
  const f = (key) => med(rows.map((r) => r[key])).toFixed(0);
  console.log(
    `${k.padEnd(28)} proto=${rows[0].proto} js=${rows[0].js} jsKB=${f("jsKB")}  FCP=${f("fcp")}  LCP=${f("lcp")}  load=${f("load")}  hidrasi=${f("hyd")}  [hidrasi semua: ${rows.map((r) => r.hyd?.toFixed(0) ?? "x").join(" ")}]`,
  );
}
