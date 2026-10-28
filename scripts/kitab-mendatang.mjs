#!/usr/bin/env node
// Salin judul Arab, nama pengarang Arab, dan tahun wafat kandidat kitab "Segera hadir" (ADR-115)
// dari master Shamela lokal pemilik (hanya dibaca) ke apps/web/src/content/kitab-mendatang.data.json.
// Teks Arab di kartu kandidat tidak pernah diketik model (.claude/rules/teks-arab.md aturan 1).
// Daftar ID berasal dari laporan pencocokan pemilik (dkislamiyah_db_match_report.csv, status
// SAME_NORMALIZED), tanpa karya modern yang masih berhak cipta (Tarikh at-Tasyri', w. 1420 H).
//
//   node scripts/kitab-mendatang.mjs [--shamela /Volumes/Elfariesh/database]
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { DatabaseSync } from "node:sqlite";

const IDS = [12718, 9246, 28168, 12876, 1969, 6146, 6125, 6297, 11371, 4234, 9904, 3284, 7312];

const { values } = parseArgs({ options: { shamela: { type: "string" } } });
const root = values.shamela ?? process.env.SURAU_SHAMELA_ROOT ?? "/Volumes/Elfariesh/database";
const master = join(root, "update/master");

const book = new DatabaseSync(join(master, "book.sqlite"), { readOnly: true });
const author = new DatabaseSync(join(master, "author.sqlite"), { readOnly: true });
const getBook = book.prepare("SELECT id, name, author FROM book WHERE id = ?");
const getAuthor = author.prepare("SELECT name, death_number FROM author WHERE id = ?");

const out = IDS.map((id) => {
  const b = getBook.get(id);
  if (!b) throw new Error(`buku ${id} tidak ada di master Shamela`);
  const authors = String(b.author)
    .split(",")
    .map((s) => Number(s.trim()))
    .map((aid) => {
      const a = getAuthor.get(aid);
      if (!a) throw new Error(`pengarang ${aid} (buku ${id}) tidak ada di master Shamela`);
      const death = Number(a.death_number);
      return { name_ar: a.name, death_hijri: Number.isInteger(death) && death > 0 ? death : null };
    });
  return { shamela_id: id, title_ar: b.name, authors };
});

const target = new URL("../apps/web/src/content/kitab-mendatang.data.json", import.meta.url);
writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`);
console.log(`${out.length} kandidat ditulis ke ${target.pathname}`);
