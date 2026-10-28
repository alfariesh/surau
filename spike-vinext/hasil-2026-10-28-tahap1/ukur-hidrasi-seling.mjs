// Gerbang b ADR-119: kapan tombol Tampilan halaman kitab bisa ditekan (props React terpasang),
// throttling ponsel (CPU 4x, RTT 150 ms, 1,6 Mbps), berselang-seling antarbasis. Juga FCP dan LCP.
import { chromium } from "@playwright/test";
const BASES = Object.fromEntries(process.env.BASES.split(",").map((x) => x.split("=")));
const PAGES = (process.env.PAGES ?? "/kitab/ihya/1/200,/kitab/ihya/3/202").split(",");
const N = Number(process.env.N ?? 5);
const b = await chromium.launch();
const out = {};
for (let i = 0; i < N; i++)
  for (const path of PAGES) {
    const names = Object.keys(BASES);
    for (const name of i % 2 ? names.reverse() : names) {
      const ctx = await b.newContext({
        viewport: { width: 412, height: 823 },
        isMobile: true,
        hasTouch: true,
      });
      const p = await ctx.newPage();
      const cdp = await ctx.newCDPSession(p);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: 1.6e6 / 8,
        uploadThroughput: 750e3 / 8,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await p.addInitScript(() => {
        window.__t = {};
        const poll = () => {
          const el = [...document.querySelectorAll("button")].find((x) =>
            /Tampilan/.test(x.getAttribute("aria-label") ?? x.textContent ?? ""),
          );
          if (el && !window.__t.hyd && Object.keys(el).some((k) => k.startsWith("__reactProps")))
            window.__t.hyd = performance.now();
          if (!window.__t.hyd) requestAnimationFrame(poll);
        };
        document.addEventListener("DOMContentLoaded", () => poll());
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) window.__t.lcp = e.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
      });
      let t = {};
      try {
        await p.goto(BASES[name] + path, { waitUntil: "load", timeout: 90000 });
        await p.waitForFunction(() => window.__t.hyd, null, { timeout: 30000 }).catch(() => {});
        t = await p.evaluate(() => ({
          ...window.__t,
          fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime,
        }));
      } catch (e) {
        t = { err: String(e).slice(0, 80) };
      }
      (out[`${path} ${name}`] ??= []).push(t);
      await ctx.close();
    }
  }
await b.close();
const med = (a) => {
  const s = a.filter((x) => x != null).sort((x, y) => x - y);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN;
};
for (const [k, rows] of Object.entries(out)) {
  const f = (key) => (med(rows.map((r) => r[key])) / 1000).toFixed(2);
  console.log(
    `${k.padEnd(30)} FCP=${f("fcp")} LCP=${f("lcp")} hidrasi=${f("hyd")} [hidrasi: ${rows.map((r) => (r.hyd ? (r.hyd / 1000).toFixed(2) : "x")).join(" ")}]${rows.some((r) => r.err) ? " ERR " + rows.find((r) => r.err).err : ""}`,
  );
}
