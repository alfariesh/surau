// Diagnostik ADR-124: Preview j1/200 diulang 10× dengan throttling ponsel; catat kapan CSS selesai,
// skrip mulai/selesai, hidrasi, dan unduhan > 5 dtk. Jalankan dari apps/web (butuh @playwright/test).
import { chromium } from "@playwright/test";
const URL_ = process.env.URL ?? "https://pr-206.surau.org/kitab/ihya/1/200";
const b = await chromium.launch();
for (let i = 0; i < 10; i++) {
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
  const failed = [];
  p.on("requestfailed", (r) => failed.push(r.url().slice(-40) + " " + r.failure()?.errorText));
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
  });
  await p.goto(URL_, { waitUntil: "load", timeout: 90000 });
  await p.waitForFunction(() => window.__t.hyd, null, { timeout: 40000 }).catch(() => {});
  const r = await p.evaluate(() => {
    const res = performance.getEntriesByType("resource");
    const js = res.filter((x) => x.name.includes("/_next/static/") && x.name.endsWith(".js"));
    const css = res.filter((x) => x.name.endsWith(".css"));
    const slow = res
      .filter((x) => x.duration > 5000)
      .map(
        (x) =>
          `${x.name.split("/").pop().slice(0, 30)} ${Math.round(x.startTime)}+${Math.round(x.duration)}`,
      );
    return {
      hyd: window.__t.hyd,
      jsStart: Math.min(...js.map((x) => x.startTime)),
      jsEnd: Math.max(...js.map((x) => x.responseEnd)),
      cssEnd: Math.max(...css.map((x) => x.responseEnd)),
      load: performance.getEntriesByType("navigation")[0].loadEventStart,
      slow,
    };
  });
  console.log(
    i,
    `hidrasi=${Math.round(r.hyd)} cssSelesai=${Math.round(r.cssEnd)} jsMulai=${Math.round(r.jsStart)} jsSelesai=${Math.round(r.jsEnd)} load=${Math.round(r.load)}`,
    r.slow.length ? "LAMA:" + r.slow.join(" | ") : "",
    failed.length ? "GAGAL:" + failed.join(" | ") : "",
  );
  await ctx.close();
}
await b.close();
