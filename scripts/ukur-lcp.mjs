#!/usr/bin/env node
// Ukur LCP ponsel halaman baca per mode baca (X13; cara X11). Lighthouse (bawaan ponsel = simulasi
// Lantern) dijalankan lewat halaman Puppeteer supaya mode baca bisa diisi di localStorage sebelum
// halaman dimuat; cache HTTP dikosongkan sebelum tiap putaran; hasilnya median + sebaran.
//
//   pnpm ukur:lcp <base> [mode,...] [n] [jalur,...]
//   pnpm ukur:lcp https://surau.org baru,ar,both,tr 5
//   pnpm ukur:lcp https://<preview>.workers.dev both,tr 5 /kitab/ihya/1/200
//
// Mode: `baru` = pengunjung baru (localStorage kosong: petunjuk mode baca tampil, mode Keduanya),
// `ar` / `both` / `tr` = mode tersimpan (petunjuk tidak tampil). Bawaan: semua mode, n = 5,
// jalur j1/200 dan j3/202 (pembanding X09–X11). `--json <berkas>` menyimpan hasil mentah.
//
// Lighthouse dan puppeteer-core TIDAK menjadi dependensi repo (berat, hanya untuk ukur manual): versi
// yang dipatok di bawah dipasang sekali dengan npm ke folder cache pengguna (`SURAU_LCP_DIR`, bawaan
// ~/.cache/surau/ukur-lcp). Chrome = Chromium Playwright yang sama dengan e2e
// (`pnpm --filter @surau/web exec playwright install chromium`), atau `CHROME_PATH`.
//
// Angka antarmesin tidak sebanding (X11: mesin Linux agen vs Mac X09/X10): skrip mencetak model
// mesin, CPU, dan versi Chrome/Lighthouse; catat semuanya bersama angkanya.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { cpus, homedir, platform, release, totalmem } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const LIGHTHOUSE = "13.5.0";
const PUPPETEER = "25.14.0";
// Dependensi transitif dibatasi ke rilis sebelum tanggal ini (setara `minimumReleaseAge` repo, yang
// tidak berlaku untuk npm di luar workspace). Naikkan bersama dua versi di atas.
const BEFORE = "2026-10-17";
const MODES = ["baru", "ar", "both", "tr"];
const PATHS = ["/kitab/ihya/1/200", "/kitab/ihya/3/202"];
// Sama dengan READ_MODE_KEY (apps/web/src/lib/reader/scale.ts).
const READ_MODE_KEY = "surau:read-mode";

const akar = join(dirname(fileURLToPath(import.meta.url)), "..");

function args() {
  const rest = process.argv.slice(2);
  let json = null;
  const i = rest.indexOf("--json");
  if (i > -1) {
    json = rest[i + 1] ?? null;
    rest.splice(i, 2);
  }
  const [base, modes = MODES.join(","), n = "5", paths = PATHS.join(",")] = rest;
  if (!base || !/^https?:\/\//.test(base)) {
    console.error(
      "Pakai: pnpm ukur:lcp <base https://…> [mode,...] [n] [jalur,...] [--json berkas]",
    );
    process.exit(2);
  }
  const modeList = modes.split(",");
  const salah = modeList.filter((m) => !MODES.includes(m));
  if (salah.length > 0) {
    console.error(`Mode tidak dikenal: ${salah.join(", ")} (pilih dari ${MODES.join(", ")})`);
    process.exit(2);
  }
  const count = Number(n);
  if (!Number.isInteger(count) || count < 1) {
    console.error(`n harus bilangan bulat ≥ 1, bukan "${n}"`);
    process.exit(2);
  }
  return {
    base: base.replace(/\/$/, ""),
    modes: modeList,
    n: count,
    paths: paths.split(","),
    json,
  };
}

/** Pasang Lighthouse + puppeteer-core (versi terpatok) di folder cache, sekali. */
function deps() {
  const dir = process.env.SURAU_LCP_DIR ?? join(homedir(), ".cache/surau/ukur-lcp");
  const tanda = join(dir, `.terpasang-${LIGHTHOUSE}-${PUPPETEER}-${BEFORE}`);
  if (!existsSync(tanda)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), '{"private":true,"type":"module"}\n');
    console.error(`Memasang lighthouse@${LIGHTHOUSE} + puppeteer-core@${PUPPETEER} di ${dir} …`);
    execFileSync(
      "npm",
      [
        "install",
        "--no-audit",
        "--no-fund",
        "--save-exact",
        // Tanpa postinstall paket transitif: Chrome diambil dari Playwright, bukan diunduh puppeteer.
        "--ignore-scripts",
        `--before=${BEFORE}`,
        `lighthouse@${LIGHTHOUSE}`,
        `puppeteer-core@${PUPPETEER}`,
      ],
      { cwd: dir, stdio: ["ignore", "ignore", "inherit"] },
    );
    writeFileSync(tanda, "");
  }
  const req = createRequire(join(dir, "package.json"));
  return {
    lighthouse: pathToFileURL(req.resolve("lighthouse")).href,
    puppeteer: pathToFileURL(req.resolve("puppeteer-core")).href,
  };
}

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const req = createRequire(join(akar, "apps/web/package.json"));
  const path = req("@playwright/test").chromium.executablePath();
  if (!existsSync(path)) {
    console.error(
      `Chromium Playwright belum ada (${path}). Jalankan: pnpm --filter @surau/web exec playwright install chromium`,
    );
    process.exit(2);
  }
  return path;
}

/** Model perangkat (bukan hostname, yang bisa memuat nama pribadi): DMI di Linux, hw.model di Mac. */
function modelMesin() {
  try {
    if (platform() === "linux") {
      const baca = (f) => readFileSync(`/sys/class/dmi/id/${f}`, "utf8").trim();
      return `${baca("sys_vendor")} ${baca("product_name")}`;
    }
    if (platform() === "darwin")
      return execFileSync("sysctl", ["-n", "hw.model"], { encoding: "utf8" }).trim();
  } catch {}
  return "?";
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const detik = (ms) => (ms / 1000).toFixed(2).replace(".", ",");

const opsi = args();
const mod = deps();
const { default: lighthouse } = await import(mod.lighthouse);
const { default: puppeteer } = await import(mod.puppeteer);

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: true,
  args: ["--no-sandbox"],
});
const results = {};
try {
  // Pemanasan: halaman ISR sudah pernah dibuka (seperti X09–X11), jadi yang diukur HTML dari cache.
  const warm = await browser.newPage();
  for (const p of opsi.paths) await warm.goto(opsi.base + p, { waitUntil: "load" });
  await warm.close();
  for (let i = 0; i < opsi.n; i++) {
    for (const p of opsi.paths) {
      for (const mode of opsi.modes) {
        const page = await browser.newPage();
        // localStorage satu origin: diisi dari berkas kecil yang sama originnya.
        await page.goto(opsi.base + "/robots.txt");
        await page.evaluate(
          (key, m) => {
            localStorage.clear();
            if (m !== "baru") localStorage.setItem(key, m);
          },
          READ_MODE_KEY,
          mode,
        );
        const cdp = await page.createCDPSession();
        await cdp.send("Network.clearBrowserCache");
        const r = await lighthouse(
          opsi.base + p,
          {
            output: "json",
            onlyCategories: ["performance"],
            disableStorageReset: true,
            logLevel: "error",
          },
          undefined,
          page,
        );
        const lcp = Math.round(r.lhr.audits["largest-contentful-paint"].numericValue);
        const key = `${p} ${mode}`;
        (results[key] ??= []).push(lcp);
        console.error(`putaran ${i + 1}/${opsi.n} ${key}: ${detik(lcp)} dtk`);
        await page.close();
      }
    }
  }
  const versiChrome = await browser.version();
  const mesin = {
    model: modelMesin(),
    os: `${platform()} ${release()}`,
    cpu: `${cpus()[0]?.model ?? "?"} (${cpus().length} utas)`,
    ram: `${Math.round(totalmem() / 2 ** 30)} GiB`,
    chrome: versiChrome,
    lighthouse: LIGHTHOUSE,
  };
  const tanggal = new Date().toISOString();
  console.log(
    `\nLCP ponsel (Lighthouse ${LIGHTHOUSE}, simulasi Lantern), n=${opsi.n}, ${opsi.base}, ${tanggal}`,
  );
  console.log(
    `Mesin: ${mesin.model} · ${mesin.cpu} · ${mesin.ram} · ${mesin.os} · ${mesin.chrome}\n`,
  );
  console.log("| Jalur | Mode | Median | Sebaran | Semua (ms) |");
  console.log("|---|---|---|---|---|");
  for (const [key, v] of Object.entries(results)) {
    const [p, mode] = key.split(" ");
    console.log(
      `| ${p} | ${mode} | ${detik(median(v))} dtk | ${detik(Math.min(...v))}–${detik(Math.max(...v))} | ${v.join(", ")} |`,
    );
  }
  if (opsi.json) {
    writeFileSync(
      opsi.json,
      JSON.stringify({ base: opsi.base, tanggal, n: opsi.n, mesin, results }, null, 2),
    );
    console.error(`Hasil mentah: ${opsi.json}`);
  }
} finally {
  await browser.close();
}
