#!/usr/bin/env node
// Menjadikan satu figur aset Surau satu file HTML mandiri: mesin disisipkan, token warna diambil
// langsung dari apps/web/src/app/globals.css (jadi aset ikut bila warna situs berubah).
//
//   node .claude/skills/aset/skrip/bangun.mjs aset/figur/kitab-rehal.html [--situs]
//
// Keluaran: aset/keluaran/<nama>.html (mesin disisipkan, berdiri sendiri). Dengan --situs juga
// apps/web/public/aset/<nama>.html yang memuat mesin dari satu berkas bersama
// apps/web/public/aset-mesin/iso-<hash>.js (di-cache immutable, sekali unduh untuk semua ilustrasi).
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const root = join(here, "../../../..");

// Ambil variabel CSS dari blok :root, :root.dark, dan :root.sepia di globals.css situs.
export function tokenSurau() {
  const css = readFileSync(join(root, "apps/web/src/app/globals.css"), "utf8");
  const blok = (sel) => {
    const m = new RegExp(`^${sel.replace(".", "\\.")}\\s*\\{([^}]*)\\}`, "m").exec(css);
    if (!m) throw new Error(`blok ${sel} tidak ditemukan di globals.css`);
    return [...m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
      .filter(([, name]) => !name.startsWith("--font") && !name.startsWith("--arabic"))
      .map(([, name, value]) => `${name}:${value.trim()}`)
      .join(";");
  };
  return (
    `:root{${blok(":root")}}` +
    `:root[data-tema=gelap]{${blok(":root.dark")}}` +
    `:root[data-tema=sepia]{${blok(":root.sepia")}}`
  );
}

const mesin = () => readFileSync(join(here, "../mesin/iso.js"), "utf8");
export const namaMesin = () =>
  `iso-${createHash("sha256").update(mesin()).digest("hex").slice(0, 10)}.js`;

// mesinUrl kosong → mesin disisipkan (berkas mandiri); diisi → <script src="mesinUrl"> (berkas situs)
export function bangunHtml(src, mesinUrl = "") {
  const page = readFileSync(src, "utf8");
  const isi = mesin();
  const tag = /<script\s+src=["'][^"']*iso\.js["']\s*>\s*<\/script>/.exec(page);
  if (!tag) throw new Error(`tidak ada <script src="…iso.js"></script> di ${src}`);
  if (isi.toLowerCase().includes("</script")) throw new Error('iso.js memuat "</script"');
  const skrip = mesinUrl ? `<script src="${mesinUrl}"></script>` : `<script>\n${isi}\n</script>`;
  const sisip = `<style id="token-surau">${tokenSurau()}</style>\n${skrip}`;
  return page.slice(0, tag.index) + sisip + page.slice(tag.index + tag[0].length);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const src = args.find((a) => !a.startsWith("--"));
  if (!src) {
    console.error("pakai: node .claude/skills/aset/skrip/bangun.mjs <figur.html> [--situs]");
    process.exit(1);
  }
  const tulis = (out, isi) => {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, isi);
    console.log(`ditulis ${out} (${Math.round(isi.length / 1024)} KiB)`);
  };
  tulis(join(root, "aset/keluaran", basename(src)), bangunHtml(src));
  if (args.includes("--situs")) {
    // mesin bersama: nama berisi hash isi, versi lama dihapus (jadi cache immutable aman)
    const dir = join(root, "apps/web/public/aset-mesin"),
      nama = namaMesin();
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(dir))
      if (/^iso-[0-9a-f]+\.js$/.test(f) && f !== nama) rmSync(join(dir, f));
    tulis(join(dir, nama), mesin());
    // semua figur situs dibangun ulang, supaya tidak ada yang merujuk mesin lama yang baru dihapus
    const situs = join(root, "apps/web/public/aset");
    mkdirSync(situs, { recursive: true });
    const daftar = new Set([
      basename(src),
      ...readdirSync(situs).filter((f) => f.endsWith(".html")),
    ]);
    for (const f of daftar) {
      const sumber = f === basename(src) ? src : join(root, "aset/figur", f);
      tulis(join(situs, f), bangunHtml(sumber, `/aset-mesin/${nama}`));
    }
  }
}
