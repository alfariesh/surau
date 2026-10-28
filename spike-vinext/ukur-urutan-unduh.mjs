import { chromium } from "@playwright/test";
const b = await chromium.launch({ args: ["--ignore-certificate-errors"] });
for (const [name, base] of [
  ["next", "https://localhost:4422"],
  ["vinext", "https://localhost:4421"],
]) {
  const ctx = await b.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 412, height: 823 },
    isMobile: true,
  });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 1.6e6 / 8,
    uploadThroughput: 750e3 / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.goto(base + "/kitab/ihya/1/200", { waitUntil: "load", timeout: 90000 });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime;
    const nav = performance.getEntriesByType("navigation")[0];
    const res = performance.getEntriesByType("resource");
    const kind = (r) =>
      r.name.match(/\.css(\?|$)/)
        ? "css"
        : r.name.match(/\.js(\?|$)/)
          ? "js"
          : r.name.match(/\.(woff2?|ttf)(\?|$)/)
            ? "font"
            : "other";
    const g = {};
    for (const x of res) {
      const k = kind(x);
      g[k] ??= { n: 0, kb: 0, beforeFcpKB: 0, lastEnd: 0 };
      g[k].n++;
      g[k].kb += x.transferSize / 1024;
      if (x.responseEnd < fcp) g[k].beforeFcpKB += x.transferSize / 1024;
      g[k].lastEnd = Math.max(g[k].lastEnd, x.responseEnd);
    }
    const css = res
      .filter((x) => kind(x) === "css")
      .map(
        (x) =>
          `${x.name.split("/").pop().slice(0, 24)} ${(x.transferSize / 1024).toFixed(0)}KB start=${x.startTime.toFixed(0)} end=${x.responseEnd.toFixed(0)} block=${x.renderBlockingStatus}`,
      );
    const fonts = res
      .filter((x) => kind(x) === "font")
      .map((x) => `${(x.transferSize / 1024).toFixed(0)}KB end=${x.responseEnd.toFixed(0)}`);
    return { fcp, htmlKB: nav.transferSize / 1024, htmlEnd: nav.responseEnd, g, css, fonts };
  });
  console.log(
    `== ${name}: FCP=${r.fcp?.toFixed(0)} HTML ${r.htmlKB.toFixed(0)}KB selesai=${r.htmlEnd.toFixed(0)}`,
  );
  for (const [k, v] of Object.entries(r.g))
    console.log(
      `   ${k}: ${v.n} berkas ${v.kb.toFixed(0)}KB, sebelum FCP ${v.beforeFcpKB.toFixed(0)}KB, terakhir selesai ${v.lastEnd.toFixed(0)}`,
    );
  for (const c of r.css) console.log("   css " + c);
  console.log("   font " + r.fonts.join(" | "));
  await ctx.close();
}
await b.close();
