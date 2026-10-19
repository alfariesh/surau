#!/usr/bin/env node
// Menjadikan satu figur aset Surau satu file HTML mandiri: mesin disisipkan, token warna diambil
// langsung dari apps/web/src/app/globals.css (jadi aset ikut bila warna situs berubah).
//
//   node .claude/skills/aset/skrip/bangun.mjs aset/figur/kitab-rehal.html [--situs]
//
// Keluaran: aset/keluaran/<nama>.html; dengan --situs juga apps/web/public/aset/<nama>.html
// (disajikan di /aset/<nama>.html dan disematkan lewat iframe).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

export function bangunHtml(src) {
  const page = readFileSync(src, "utf8");
  const mesin = readFileSync(join(here, "../mesin/iso.js"), "utf8");
  const tag = /<script\s+src=["'][^"']*iso\.js["']\s*>\s*<\/script>/.exec(page);
  if (!tag) throw new Error(`tidak ada <script src="…iso.js"></script> di ${src}`);
  if (mesin.toLowerCase().includes("</script")) throw new Error('iso.js memuat "</script"');
  const sisip = `<style id="token-surau">${tokenSurau()}</style>\n<script>\n${mesin}\n</script>`;
  return page.slice(0, tag.index) + sisip + page.slice(tag.index + tag[0].length);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const src = args.find((a) => !a.startsWith("--"));
  if (!src) {
    console.error("pakai: node .claude/skills/aset/skrip/bangun.mjs <figur.html> [--situs]");
    process.exit(1);
  }
  const built = bangunHtml(src);
  const targets = [join(root, "aset/keluaran", basename(src))];
  if (args.includes("--situs")) targets.push(join(root, "apps/web/public/aset", basename(src)));
  for (const out of targets) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, built);
    console.log(`ditulis ${out} (${Math.round(built.length / 1024)} KiB)`);
  }
}
