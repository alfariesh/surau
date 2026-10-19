#!/usr/bin/env node
// Ikon Surau: salin ikon dari set lokal Hugeicons (stroke-standard) lalu hasilkan komponen React.
//   node scripts/ikon.mjs tambah <nama-ikon>...   salin SVG ke apps/web/src/icons/svg lalu hasilkan ulang
//   node scripts/ikon.mjs tambah --duotone <nama>...  sama, dari duotone-standard (komponen berakhiran Duotone)
//   node scripts/ikon.mjs hasilkan                hasilkan ulang apps/web/src/icons/index.tsx
// Folder sumber: env SURAU_IKON_DIR, bawaan ~/Documents/huge-icons/svg/stroke-standard;
// duotone-standard ada di sebelahnya (atau env SURAU_IKON_DUOTONE_DIR).
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const akar = join(dirname(fileURLToPath(import.meta.url)), "..");
const folderSvg = join(akar, "apps/web/src/icons/svg");
const folderDuotone = join(folderSvg, "duotone");
const fileKeluaran = join(akar, "apps/web/src/icons/index.tsx");
const sumber =
  process.env.SURAU_IKON_DIR ?? join(homedir(), "Documents/huge-icons/svg/stroke-standard");
const sumberDuotone =
  process.env.SURAU_IKON_DUOTONE_DIR ?? join(dirname(sumber), "duotone-standard");

const namaKomponen = (nama) =>
  nama
    .split("-")
    .map((bagian) => bagian[0].toUpperCase() + bagian.slice(1))
    .join("");

const atributJsx = (nama) => nama.replace(/-([a-z])/g, (_, huruf) => huruf.toUpperCase());

function cariSvg(nama, folder) {
  for (const kategori of readdirSync(folder, { withFileTypes: true })) {
    if (!kategori.isDirectory()) continue;
    const jalur = join(folder, kategori.name, `${nama}.svg`);
    if (existsSync(jalur)) return jalur;
  }
  throw new Error(`Ikon "${nama}" tidak ada di ${folder}`);
}

function isiSvg(teks) {
  const dalam = teks.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!dalam) throw new Error("Bukan SVG yang valid");
  return dalam[1]
    .replace(/\s+/g, " ")
    .trim()
    .replace(/([a-z]+(?:-[a-z]+)+)=/g, (_, nama) => `${atributJsx(nama)}=`);
}

function daftarSvg(folder, akhiran) {
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((nama) => nama.endsWith(".svg"))
    .sort()
    .map((nama) => ({
      folder,
      nama,
      komponen: namaKomponen(nama.replace(/\.svg$/, "")) + akhiran,
    }));
}

function hasilkan() {
  const berkas = [...daftarSvg(folderSvg, ""), ...daftarSvg(folderDuotone, "Duotone")];
  const komponen = berkas.map(({ folder, nama, komponen }) => {
    const isi = isiSvg(readFileSync(join(folder, nama), "utf8"));
    return `export function ${komponen}(props: IconProps) {\n  return <Ikon {...props}>${isi}</Ikon>;\n}`;
  });
  const kepala = `// DIHASILKAN oleh scripts/ikon.mjs dari apps/web/src/icons/svg. Jangan sunting tangan.
// Sumber: Hugeicons Pro stroke-standard (berlisensi; lihat CLAUDE.md).
import type { ReactNode, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

function Ikon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}
`;
  writeFileSync(fileKeluaran, `${kepala}\n${komponen.join("\n\n")}\n`);
  console.log(`${berkas.length} ikon dihasilkan di apps/web/src/icons/index.tsx`);
}

const [perintah, ...argumen] = process.argv.slice(2);
const duotone = argumen.includes("--duotone");
const nama = argumen.filter((a) => a !== "--duotone");
if (perintah === "tambah" && nama.length > 0) {
  const tujuan = duotone ? folderDuotone : folderSvg;
  mkdirSync(tujuan, { recursive: true });
  for (const n of nama) {
    copyFileSync(cariSvg(n, duotone ? sumberDuotone : sumber), join(tujuan, `${n}.svg`));
    console.log(`+ ${n}${duotone ? " (duotone)" : ""}`);
  }
  hasilkan();
} else if (perintah === "hasilkan") {
  hasilkan();
} else {
  console.error("Pemakaian: node scripts/ikon.mjs tambah [--duotone] <nama>... | hasilkan");
  process.exit(1);
}
