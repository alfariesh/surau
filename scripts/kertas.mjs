#!/usr/bin/env node
// Panggang tekstur kertas Surau (ADR-058). Shader PaperTexture (@paper-design/shaders) dirender SEKALI
// di browser pada kanvas persegi, tepinya disambung jadi tile mulus, lalu sharp mengecilkannya dan
// menyimpannya sebagai AVIF abu-abu di apps/web/public/kertas/serat.avif. Web memakai tile itu sebagai
// mask CSS (globals.css `body::before`), jadi tidak ada WebGL atau JavaScript saat halaman dibuka.
//   pnpm kertas       buka http://127.0.0.1:3010, atur slider, lalu klik "Simpan ke web"
// "Simpan ke web" juga memperbarui `?v=` di globals.css supaya cache browser memuat tile baru.
// Setelah menyimpan, salin parameter yang tercetak ke PARAM di bawah (nilai yang sedang dipakai web).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { dirname, extname, isAbsolute, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const akar = join(dirname(fileURLToPath(import.meta.url)), "..");
const folderShader = dirname(createRequire(import.meta.url).resolve("@paper-design/shaders"));
const fileTile = join(akar, "apps/web/public/kertas/serat.avif");
const fileCss = join(akar, "apps/web/src/app/globals.css");
const port = Number(process.env.PORT ?? 3010);

// Parameter shader (lihat PaperTexture). Lipatan, kerutan, bercak tetap 0: hanya serat kertas.
const PARAM = {
  roughness: 0.2,
  roughnessSize: 0.8,
  roughnessRows: 0,
  fiber: 0.35,
  fiberSize: 0.7,
  angle: 300,
  seed: 4,
};
// Ukuran render shader (px) dan lebar tumpang-tindih untuk menyambung tepi. Hasil render dikecilkan
// ke KELUARAN px; web menampilkannya selebar SISI_CSS px (globals.css `--paper-tile`).
const RENDER = 1536;
const SAMBUNG = 192;
const KELUARAN = 1024;
const SISI_CSS = 768;
const AVIF = { quality: 40, effort: 9 };

// Kecilkan tile tanpa merusak sambungan: tambah tepi berulang (repeat), resize, lalu potong kembali.
async function olah(png) {
  const tepi = RENDER / 32;
  const lebar = await sharp(png)
    .extend({ top: tepi, bottom: tepi, left: tepi, right: tepi, extendWith: "repeat" })
    .toBuffer();
  const skala = KELUARAN / RENDER;
  const sisi = Math.round((RENDER + 2 * tepi) * skala);
  const potong = Math.round(tepi * skala);
  return sharp(lebar)
    .resize(sisi, sisi, { kernel: "lanczos3" })
    .extract({ left: potong, top: potong, width: KELUARAN, height: KELUARAN })
    .removeAlpha()
    .toColourspace("b-w")
    .avif(AVIF)
    .toBuffer();
}

const halaman = /* html */ `<!doctype html>
<html lang="id">
<meta charset="utf-8" />
<title>Panggang tekstur kertas</title>
<style>
  body { margin: 0; font: 14px/1.5 system-ui, sans-serif; display: grid; grid-template-columns: 300px 1fr; height: 100vh; }
  aside { padding: 16px; overflow: auto; border-right: 1px solid #0001; background: #fff; color: #1d1b16; }
  label { display: block; margin: 10px 0 2px; }
  input[type=range] { width: 100%; }
  output { float: right; font-variant-numeric: tabular-nums; }
  button { margin-top: 12px; width: 100%; padding: 8px; font: inherit; }
  #status { margin-top: 8px; white-space: pre-wrap; color: #555; }
  main { position: relative; overflow: auto; background: #f9f7f1; color: #201c15; }
  main.gelap { background: #15130f; color: #e9e3d6; }
  main.sepia { background: #f1e7d3; color: #3b2d1e; }
  .lapisan { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: multiply; mask-mode: luminance; }
  main.gelap .lapisan { mix-blend-mode: screen; }
  article { max-width: 640px; margin: 48px auto; padding: 0 24px; font-size: 18px; line-height: 1.75; }
  #kerja { position: absolute; left: -99999px; top: 0; }
</style>
<aside>
  <strong>Parameter shader</strong>
  <div id="kontrol"></div>
  <label>Mode pratinjau</label>
  <select id="mode"><option value="terang">Terang</option><option value="gelap">Gelap</option><option value="sepia">Sepia</option></select>
  <label>Kekuatan (opacity CSS) <output id="o-kekuatan"></output></label>
  <input id="kekuatan" type="range" min="0" max="1" step="0.01" value="0.55" />
  <label>Zoom pratinjau <output id="o-zoom"></output></label>
  <input id="zoom" type="range" min="1" max="4" step="1" value="1" />
  <button id="simpan">Simpan ke web</button>
  <div id="status"></div>
</aside>
<main id="pratinjau">
  <article>
    <h1>Kitab al-'Ilm</h1>
    <p>Pratinjau ini menampilkan tile tekstur persis seperti di web: mask CSS sewarna bayangan kertas,
    dicampur multiply (terang, sepia) atau screen (gelap), diulang tiap ${SISI_CSS} px. Perhatikan apakah
    sambungan tile terlihat, apakah serat mengganggu bentuk huruf, dan apakah teksturnya terasa seperti
    kertas, bukan noda.</p>
  </article>
  <div class="lapisan" id="lapisan"></div>
</main>
<div id="kerja"></div>
<script type="module">
  import { ShaderMount, ShaderFitOptions, emptyPixel, getShaderColorFromString, getShaderNoiseTexture, paperTextureFragmentShader } from "/shaders/index.js";

  const PARAM = ${JSON.stringify(PARAM)};
  const RENDER = ${RENDER}, SAMBUNG = ${SAMBUNG}, SISI_CSS = ${SISI_CSS};
  const SLIDER = {
    roughness: [0, 1, 0.01], roughnessSize: [0, 1, 0.01], roughnessRows: [0, 1, 0.01],
    fiber: [0, 1, 0.01], fiberSize: [0, 1, 0.01], angle: [0, 360, 1], seed: [0, 1000, 1],
  };
  // Warna bayangan sama dengan --paper-shadow di globals.css.
  const WARNA = { terang: "#CDC8BB", gelap: "#3A362E", sepia: "#C4B396" };
  const $ = (id) => document.getElementById(id);
  const status = (t) => ($("status").textContent = t);

  for (const [nama, [min, max, step]] of Object.entries(SLIDER)) {
    $("kontrol").insertAdjacentHTML("beforeend",
      '<label>' + nama + ' <output id="o-' + nama + '"></output></label>' +
      '<input type="range" id="' + nama + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + PARAM[nama] + '">');
  }

  const muat = (src) => new Promise((ok, gagal) => { const img = new Image(); img.onload = () => ok(img); img.onerror = gagal; img.src = src; });
  const noise = getShaderNoiseTexture();
  await new Promise((ok) => (noise.complete ? ok() : (noise.onload = ok)));
  const kosong = await muat(emptyPixel);

  let png = null, urlTile = null, param = null, giliran = 0;

  // Render shader pada kanvas persegi n px (kertas putih, bayangan hitam: piksel = 1 - p), ambil p.
  async function renderPola(p, n) {
    const wadah = document.createElement("div");
    const dpr = Math.max(1, devicePixelRatio);
    wadah.style.cssText = "width:" + n / dpr + "px;height:" + n / dpr + "px";
    $("kerja").replaceChildren(wadah);
    const putih = getShaderColorFromString("#ffffff"), hitam = getShaderColorFromString("#000000");
    const mount = new ShaderMount(wadah, paperTextureFragmentShader, {
      u_image: kosong, u_isImage: false,
      u_colorBack: putih, u_colorPaper: putih, u_colorShadow: hitam,
      u_blending: 1, u_distortion: 0, u_clip: false, u_angle: p.angle, u_seed: p.seed,
      u_roughness: p.roughness, u_roughnessSize: p.roughnessSize, u_roughnessRows: p.roughnessRows,
      u_fiber: p.fiber, u_fiberSize: p.fiberSize,
      u_folds: 0, u_foldSizeX: 1, u_foldSizeY: 1, u_foldOffsetX: 0, u_foldOffsetY: 0,
      u_wrinkles: 0, u_wrinkleSize: 0.5, u_crumples: 0, u_crumpleCount: 6, u_drops: 0,
      u_noiseTexture: noise,
      u_fit: ShaderFitOptions.cover, u_scale: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0,
      u_originX: 0.5, u_originY: 0.5, u_worldWidth: 0, u_worldHeight: 0,
    }, { preserveDrawingBuffer: true }, 0, 0, 1, 1e9);
    const kanvas = mount.canvasElement;
    const ctx = Object.assign(document.createElement("canvas"), { width: n, height: n }).getContext("2d", { willReadFrequently: true });
    try {
      for (let i = 0; i < 120; i++) {
        await new Promise(requestAnimationFrame);
        // Ukuran kanvas bisa lebih 1 px dari n karena pembulatan dpr pecahan; ambil n x n kiri atas.
        if (kanvas.width < n || kanvas.height < n) continue;
        ctx.drawImage(kanvas, 0, 0);
        const data = ctx.getImageData(0, 0, n, n).data;
        let ada = false;
        for (let j = 0; j < data.length; j += 4 * 997) if (data[j] !== 255) { ada = true; break; }
        if (!ada && (p.roughness > 0 || p.fiber > 0)) continue;
        const pola = new Float32Array(n * n);
        for (let j = 0; j < n * n; j++) pola[j] = 1 - data[j * 4] / 255;
        return pola;
      }
      throw new Error("Shader tidak merender (kanvas " + kanvas.width + "x" + kanvas.height + ")");
    } finally {
      mount.dispose();
    }
  }

  // Sambung tepi: jalur selebar B di awal tile dicampur dengan piksel sejauh N di depannya. Campuran
  // menjaga varians (dibagi sqrt(a^2 + b^2)) supaya jalur sambungan tidak tampak lebih pudar.
  function mulus(pola, n, N, B) {
    let rata = 0;
    for (const v of pola) rata += v;
    rata /= pola.length;
    const campur = (a, b, t) => rata + ((a - rata) * (1 - t) + (b - rata) * t) / Math.hypot(1 - t, t);
    const datar = new Float32Array(N * n);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < N; x++) {
        const v = pola[y * n + x];
        datar[y * N + x] = x < B ? campur(pola[y * n + x + N], v, x / B) : v;
      }
    const hasil = new Float32Array(N * N);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const v = datar[y * N + x];
        hasil[y * N + x] = y < B ? campur(datar[(y + N) * N + x], v, y / B) : v;
      }
    return hasil;
  }

  async function panggang() {
    const saya = ++giliran;
    const p = { ...PARAM };
    for (const nama of Object.keys(SLIDER)) {
      p[nama] = Number($(nama).value);
      $("o-" + nama).textContent = p[nama];
    }
    status("Merender…");
    const pola = await renderPola(p, RENDER + SAMBUNG);
    if (saya !== giliran) return;
    const tile = mulus(pola, RENDER + SAMBUNG, RENDER, SAMBUNG);
    const kanvas = Object.assign(document.createElement("canvas"), { width: RENDER, height: RENDER });
    const ctx = kanvas.getContext("2d");
    const img = ctx.createImageData(RENDER, RENDER);
    let jumlah = 0;
    for (let j = 0; j < tile.length; j++) {
      const g = Math.round(Math.min(1, Math.max(0, tile[j])) * 255);
      jumlah += g;
      img.data[j * 4] = img.data[j * 4 + 1] = img.data[j * 4 + 2] = g;
      img.data[j * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    png = await new Promise((ok) => kanvas.toBlob(ok, "image/png"));
    const avif = await (await fetch("/olah", { method: "POST", body: png })).blob();
    if (saya !== giliran) return;
    if (urlTile) URL.revokeObjectURL(urlTile);
    urlTile = URL.createObjectURL(avif);
    param = p;
    tampil();
    status("AVIF " + Math.round(avif.size / 1024) + " KB, rata-rata p " + (jumlah / tile.length / 255).toFixed(3));
  }

  function tampil() {
    if (!urlTile) return;
    const mode = $("mode").value;
    const sisi = SISI_CSS * Number($("zoom").value) + "px";
    $("pratinjau").className = mode;
    Object.assign($("lapisan").style, {
      background: WARNA[mode], opacity: $("kekuatan").value,
      maskImage: "url(" + urlTile + ")", maskSize: sisi + " " + sisi,
    });
    $("o-kekuatan").textContent = $("kekuatan").value;
    $("o-zoom").textContent = $("zoom").value + "x";
  }

  let jeda;
  for (const nama of Object.keys(SLIDER)) $(nama).addEventListener("input", () => { clearTimeout(jeda); jeda = setTimeout(panggang, 250); });
  for (const id of ["mode", "kekuatan", "zoom"]) $(id).addEventListener("input", tampil);
  $("simpan").addEventListener("click", async () => {
    if (!png) return;
    const r = await fetch("/simpan", { method: "POST", body: png, headers: { "x-param": JSON.stringify(param) } });
    status(await r.text());
  });
  window.panggang = panggang;
  await panggang();
</script>
</html>`;

const BATAS_BODY = 20 * 1024 * 1024;

function baca(req) {
  return new Promise((ok, gagal) => {
    const potongan = [];
    let ukuran = 0;
    req.on("data", (c) => {
      ukuran += c.length;
      if (ukuran > BATAS_BODY) {
        gagal(new Error("Body terlalu besar"));
        req.destroy();
      } else potongan.push(c);
    });
    req.on("end", () => ok(Buffer.concat(potongan)));
    req.on("error", gagal);
  });
}

// Hanya halaman alat ini sendiri yang boleh POST: Host dan Origin harus localhost:port, body PNG.
// Menahan situs lain di browser yang sama (fetch no-cors) dan DNS rebinding.
const asal = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);
function postSah(req) {
  const origin = req.headers.origin ?? "";
  return (
    asal.has(req.headers.host ?? "") &&
    asal.has(origin.replace(/^http:\/\//, "")) &&
    req.headers["content-type"] === "image/png"
  );
}

async function simpan(png, param) {
  const avif = await olah(png);
  mkdirSync(dirname(fileTile), { recursive: true });
  writeFileSync(fileTile, avif);
  const versi = createHash("sha256").update(avif).digest("hex").slice(0, 8);
  const css = readFileSync(fileCss, "utf8");
  const baru = css.replace(/serat\.avif\?v=[0-9a-f]+/, `serat.avif?v=${versi}`);
  if (baru === css && !css.includes(`serat.avif?v=${versi}`))
    throw new Error("Tidak menemukan `serat.avif?v=` di globals.css");
  writeFileSync(fileCss, baru);
  return `Tersimpan serat.avif (${Math.round(avif.length / 1024)} KB, v=${versi}).\nSalin ke PARAM di scripts/kertas.mjs: ${param}`;
}

const tipe = { ".js": "text/javascript", ".map": "application/json" };

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  try {
    if (req.method === "POST" && !postSah(req)) return res.writeHead(403).end();
    if (req.method === "POST" && url.pathname === "/olah") {
      return res.writeHead(200, { "content-type": "image/avif" }).end(await olah(await baca(req)));
    }
    if (req.method === "POST" && url.pathname === "/simpan") {
      const pesan = await simpan(await baca(req), req.headers["x-param"]);
      console.log(pesan);
      return res.end(pesan);
    }
    if (url.pathname.startsWith("/shaders/")) {
      const jalur = normalize(join(folderShader, url.pathname.slice("/shaders/".length)));
      const rel = relative(folderShader, jalur);
      if (rel.startsWith("..") || isAbsolute(rel)) return res.writeHead(403).end();
      const isi = readFileSync(jalur);
      return res
        .writeHead(200, { "content-type": tipe[extname(jalur)] ?? "application/octet-stream" })
        .end(isi);
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(halaman);
  } catch (galat) {
    res.writeHead(500).end(String(galat));
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Panggang tekstur kertas: http://127.0.0.1:${port}`),
);
