// Potret gaya terhitung semua elemen (+ ::before/::after) di 42 keadaan UI (ADR-035).
//
//   pnpm dev                                   # server di :3004 (atau BASE_URL=...)
//   node apps/web/scripts/heroui-css/potret-gaya.mjs <out.json>
//
// Ganti CSS (mis. globals.css lama ↔ baru), tunggu HMR, potret lagi, lalu banding dengan
// banding-gaya.mjs. Keadaan memakai label UI bahasa Indonesia (src/i18n/id.ts); bila label berubah,
// sesuaikan di sini. Butuh D1 lokal berisi Ihya (pnpm corpus:load:local).
import fs from "node:fs";

import { chromium, devices } from "@playwright/test";

const [out] = process.argv.slice(2);
if (!out) {
  console.error("pakai: potret-gaya.mjs <out.json>");
  process.exit(2);
}
const BASE = process.env.BASE_URL ?? "http://localhost:3004";
const R = "/kitab/ihya/1/200";

async function retryClick(page, locator, opened) {
  for (let i = 0; i < 20; i++) {
    await locator.click();
    try {
      await opened.waitFor({ state: "visible", timeout: 700 });
      return;
    } catch {
      // Klik sebelum hidrasi tidak berbuat apa-apa: ulangi.
    }
  }
  throw new Error(`tidak terbuka: ${locator}`);
}
const marker = (p) => p.getByRole("button", { name: "Catatan kaki (٤)" });
const markerDialog = (p) => p.getByRole("dialog", { name: "Catatan kaki (٤)" });
const desktop = [
  ["home", "/"],
  ["tentang", "/tentang"],
  ["kitab", "/kitab"],
  ["karya", "/kitab/ihya"],
  ["baca", R],
  ["baca-target", `${R}#p2826`],
  ["404", "/kitab-tidak-ada-xyz"],
  [
    "hovercard",
    R,
    async (p) => {
      await marker(p).hover();
      await markerDialog(p)
        .waitFor({ timeout: 5000 })
        .catch(() => retryClick(p, marker(p), markerDialog(p)));
    },
  ],
  [
    "lompat",
    R,
    (p) => retryClick(p, p.getByRole("button", { name: "Lompat" }), p.getByRole("dialog")),
  ],
  [
    "menu-paragraf",
    R,
    (p) =>
      retryClick(p, p.getByRole("button", { name: /^Aksi paragraf/ }).first(), p.getByRole("menu")),
  ],
  [
    "laporan",
    R,
    (p) =>
      retryClick(p, p.getByRole("button", { name: "Laporkan kesalahan" }), p.getByRole("dialog")),
  ],
  [
    "tooltip-lapor",
    R,
    async (p) => {
      const button = p.getByRole("button", { name: "Laporkan kesalahan" });
      for (let i = 0; i < 10; i++) {
        await p.mouse.move(5, 400);
        await button.hover();
        try {
          await p.getByRole("tooltip").waitFor({ timeout: 1500 });
          return;
        } catch {
          // Tooltip belum muncul (hover sebelum hidrasi): ulangi.
        }
      }
      throw new Error("tooltip tidak muncul");
    },
  ],
  [
    "toast",
    R,
    (p) =>
      retryClick(p, p.getByRole("button", { name: "Salin sitasi" }), p.locator(".toast").first()),
  ],
  [
    "sidebar-tutup",
    "/",
    (p) => p.getByRole("button", { name: "Buka atau tutup panel samping" }).click(),
  ],
  [
    "fokus-keyboard",
    R,
    async (p) => {
      for (let i = 0; i < 3; i++) await p.keyboard.press("Tab");
    },
  ],
];
const mobile = [
  ["m-home", "/"],
  [
    "m-menu",
    "/",
    (p) => retryClick(p, p.getByRole("button", { name: "Buka menu" }), p.getByRole("dialog")),
  ],
  ["m-baca", R],
  [
    "m-daftar-isi",
    R,
    (p) => retryClick(p, p.getByRole("button", { name: "Daftar isi" }), p.getByRole("dialog")),
  ],
  ["m-penanda", R, (p) => retryClick(p, marker(p), markerDialog(p))],
  ["m-karya", "/kitab/ihya"],
];

// Dijalankan di halaman: gaya unik disimpan sekali, elemen merujuk indeksnya.
function snapshot() {
  const styles = [];
  const index = new Map();
  const intern = (cs) => {
    let s = "";
    for (let i = 0; i < cs.length; i++) s += `${cs[i]}:${cs.getPropertyValue(cs[i])};`;
    let id = index.get(s);
    if (id === undefined) {
      id = styles.length;
      styles.push(s);
      index.set(s, id);
    }
    return id;
  };
  const elems = [];
  const visit = (el, key) => {
    if (["SCRIPT", "STYLE", "NEXTJS-PORTAL", "TEMPLATE"].includes(el.tagName)) return;
    elems.push([
      key,
      String(el.className?.baseVal ?? el.className ?? ""),
      intern(getComputedStyle(el)),
      intern(getComputedStyle(el, "::before")),
      intern(getComputedStyle(el, "::after")),
    ]);
    const counts = {};
    for (const c of el.children) {
      const t = c.tagName.toLowerCase();
      counts[t] = (counts[t] ?? 0) + 1;
      visit(c, `${key}>${t}[${counts[t]}]`);
    }
  };
  visit(document.documentElement, "html");
  return { styles, elems };
}

const browser = await chromium.launch();
const result = {};
for (const [device, states] of [
  ["desktop", desktop],
  ["mobile", mobile],
]) {
  for (const scheme of ["light", "dark"]) {
    const ctx = await browser.newContext({
      ...(device === "mobile" ? devices["Pixel 7"] : { viewport: { width: 1280, height: 800 } }),
      colorScheme: scheme,
      permissions: ["clipboard-read", "clipboard-write"],
    });
    await ctx.addInitScript((s) => {
      try {
        localStorage.setItem("theme", s);
      } catch {
        // Penyimpanan diblokir: tema mengikuti colorScheme.
      }
    }, scheme);
    for (const [name, url, act] of states) {
      const page = await ctx.newPage();
      await page.goto(BASE + url, { waitUntil: "load" });
      await page.waitForTimeout(600);
      if (act) await act(page);
      // Tunggu animasi selesai (yang tak berujung, mis. spinner, diabaikan).
      await page.waitForTimeout(250);
      await page
        .waitForFunction(
          () =>
            document
              .getAnimations()
              .every(
                (a) =>
                  a.playState !== "running" ||
                  a.effect?.getComputedTiming().iterations === Infinity,
              ),
          null,
          { timeout: 4000 },
        )
        .catch(() => {});
      await page.waitForTimeout(250);
      const snap = await page.evaluate(snapshot);
      result[[device, scheme, name].join("/")] = snap;
      console.log(device, scheme, name, snap.elems.length, "elemen");
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(out, JSON.stringify(result));
