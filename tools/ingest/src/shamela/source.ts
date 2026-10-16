// Membaca satu kitab Shamela (ekspor desktop Shamela 4) secara hanya-baca:
// book/{id % 1000}/{id}.db (tabel page, title) + update/master/{book,author}.sqlite (metadata).
// Struktur dan jebakannya: docs/03-sumber-data.md. Baris divalidasi Zod di batas sistem ini.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { openReadOnly } from "../sqlite.ts";

// page.part dan page.page bertipe TEXT di Shamela: dicek berupa angka, lalu di-cast.
const digits = z.string().regex(/^\d+$/, "harus berupa angka");

const pageRow = z.object({
  id: z.number().int().positive(),
  part: digits,
  page: digits,
  content: z.string().nullable(),
});

const titleRow = z.object({
  id: z.number().int().positive(),
  content: z.string(),
  page: digits,
  parent: digits,
});

const bookRow = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  author: digits,
  bibliography: z.string().nullable(),
});

const authorRow = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  death_number: z.string().nullable(),
});

export interface ShamelaPage {
  id: number;
  juz: number;
  pageNo: number;
  content: string;
}

export interface ShamelaTitle {
  id: number;
  content: string;
  /** `page.id` (BUKAN halaman cetak). */
  page: number;
  /** `title.id` induk, 0 = akar. */
  parent: number;
}

export interface ShamelaBook {
  id: number;
  name: string;
  authorId: number;
  bibliography: string;
}

export interface ShamelaAuthor {
  id: number;
  name: string;
  deathHijri: number | null;
}

export interface ShamelaSource {
  book: ShamelaBook;
  author: ShamelaAuthor;
  pages: ShamelaPage[];
  titles: ShamelaTitle[];
  /** sha256 file `{id}.db` (heksadesimal). */
  sha256: string;
}

/** Lokasi file kitab: `book/{id % 1000, 3 digit}/{id}.db`. */
export function bookDbPath(root: string, bookId: number): string {
  return join(root, "book", String(bookId % 1000).padStart(3, "0"), `${bookId}.db`);
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** Baca kitab + metadata Shamela. Baris yang ditandai terhapus (`is_deleted` ≠ 0) dilewati. */
export function readShamelaBook(root: string, bookId: number): ShamelaSource {
  const path = bookDbPath(root, bookId);
  const db = openReadOnly(path);
  let pages: ShamelaPage[];
  let titles: ShamelaTitle[];
  try {
    pages = db
      .prepare(
        "SELECT id, part, page, content FROM page WHERE coalesce(is_deleted, '0') = '0' ORDER BY id",
      )
      .all()
      .map((r) => {
        const p = pageRow.parse(r);
        return { id: p.id, juz: Number(p.part), pageNo: Number(p.page), content: p.content ?? "" };
      });
    titles = db
      .prepare(
        "SELECT id, content, page, parent FROM title WHERE coalesce(is_deleted, '0') = '0' ORDER BY id",
      )
      .all()
      .map((r) => {
        const t = titleRow.parse(r);
        return { id: t.id, content: t.content, page: Number(t.page), parent: Number(t.parent) };
      });
  } finally {
    db.close();
  }

  const master = join(root, "update", "master");
  const bookDb = openReadOnly(join(master, "book.sqlite"));
  let book: ShamelaBook;
  try {
    const b = bookRow.parse(
      bookDb.prepare("SELECT id, name, author, bibliography FROM book WHERE id = ?").get(bookId),
    );
    book = {
      id: b.id,
      name: b.name,
      authorId: Number(b.author),
      bibliography: b.bibliography ?? "",
    };
  } finally {
    bookDb.close();
  }
  const authorDb = openReadOnly(join(master, "author.sqlite"));
  let author: ShamelaAuthor;
  try {
    const a = authorRow.parse(
      authorDb.prepare("SELECT id, name, death_number FROM author WHERE id = ?").get(book.authorId),
    );
    const death = a.death_number !== null && /^\d+$/.test(a.death_number);
    author = { id: a.id, name: a.name, deathHijri: death ? Number(a.death_number) : null };
  } finally {
    authorDb.close();
  }

  return { book, author, pages, titles, sha256: sha256File(path) };
}

export interface Imprint {
  publisher: string | null;
  city: string | null;
}

/**
 * Penerbit dan kota dari baris `الناشر: <penerbit> - <kota>` di `book.bibliography` (dipisah `\r`).
 * Teksnya disalin dari sumber; `null` bila baris itu tidak ada.
 */
export function parseImprint(bibliography: string): Imprint {
  const line = bibliography
    .split(/\r\n?|\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith("الناشر:"));
  if (line === undefined) return { publisher: null, city: null };
  const value = line.slice("الناشر:".length).trim();
  const dash = value.lastIndexOf(" - ");
  if (dash < 0) return { publisher: value || null, city: null };
  return {
    publisher: value.slice(0, dash).trim() || null,
    city: value.slice(dash + 3).trim() || null,
  };
}
