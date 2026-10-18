// Fixture BUATAN yang meniru struktur Shamela dan OpenITI (span judul, `\r`, 9 garis bawah,
// penanda (١), takhrij menempel `//`, penanda halaman OpenITI di akhir halaman, segmen ` + ` JK),
// plus satu kutipan "ayat" berkurung dari mushaf buatan (quran-fixture.ts).
// Isinya kalimat karangan dan frasa hadits umum yang pendek, BUKAN teks Shamela atau OpenITI.
// Semua file dibuat di folder sementara; tidak ada yang ditulis ke /Volumes atau ke repo.
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { PipelinePaths } from "../src/pipeline.ts";
import type { WorkConfig } from "../src/works/ihya.ts";
import { writeQuranFixture } from "./quran-fixture.ts";

export const BOOK_ID = 1234;

/** Halaman kitab buatan: [page.id, juz, halaman cetak, content]. */
export const PAGES: [number, number, number, string][] = [
  [
    1,
    1,
    1,
    '<span data-type="title" id=toc-2>بَابُ الْعِلْمِ</span>\r' +
      "الْعِلْمُ نُورٌ (١) وَالْجَهْلُ ظُلْمَةٌ.\r" +
      "_________\r" +
      "(١) حديث العلم نور أخرجه فلان بإسناد حسن",
  ],
  [
    2,
    1,
    2,
    "فصل في العمل\r" +
      "قال الشيخ الصبر ضياء // حديث الصبر ضياء أخرجه مسلم من حديث فلان\r" +
      "والعمل ثمرة العلم (١).\r" +
      "_________\r" +
      "(١) هذا كلام مصنوع للتجربة\r" +
      "وله تتمة في سطر ثان",
  ],
  [
    3,
    1,
    3,
    '<span data-type="title" id=toc-3>بَابُ الْعَمَلِ</span>\r' +
      "وقال النبي الطهور شطر الايمان (١) حديث الطهور شطر الايمان رواه احمد // ثم رجع الكلام",
  ],
  [
    4,
    2,
    1,
    'كتاب الصبر وهو الكتاب الأول من <span data-type="title" id=toc-4>ربع ثان</span>\r' +
      '<span data-type="title" id=toc-5>كتاب الصبر</span>\r' +
      "الصبر مفتاح الفرج قال تعالى {وَالصَّبْرُ نور القلوب في الظلمات}",
  ],
  [5, 2, 2, "يتلوه كتاب الذكر\rكتاب الذكر وهو الكتاب الثاني\rالذكر حياة القلوب // وقال تعالى كذا"],
];

/** Judul: [id, content, page.id, parent]. Judul 3 sengaja salah induk (dibetulkan patch). */
export const TITLES: [number, string, number, number][] = [
  [1, "ربع أول", 1, 0],
  [2, "باب العلم", 1, 1],
  [3, "باب العمل", 3, 2],
  [4, "ربع ثان", 4, 0],
  [5, "كتاب الصبر", 4, 4],
];

export const PATCH = `# patch buatan untuk tes
shamela_book: ${BOOK_ID}
add:
  - id: dzikr
    parent: 4
    page: 5
    heading: كتاب الذكر
move:
  - titles: [3]
    parent: 1
`;

/** Teks badan bersih per halaman (seperti hasil cleanShamelaHtml), untuk versi OpenITI "matan". */
const MATAN = [
  "بَابُ الْعِلْمِ\nالْعِلْمُ نُورٌ (1) وَالْجَهْلُ ظُلْمَةٌ.",
  "فصل في العمل\nقال الشيخ الصبر ضياء // حديث الصبر ضياء أخرجه مسلم من حديث فلان\nوالعمل ثمرة العلم (1).",
  "بَابُ الْعَمَلِ\nوقال النبي الطهور شطر الايمان (1) حديث الطهور شطر الايمان رواه احمد // ثم رجع الكلام",
  "كتاب الصبر وهو الكتاب الأول من ربع ثان\nكتاب الصبر\nالصبر مفتاح الفرج قال تعالى {وَالصَّبْرُ نور القلوب في الظلمات}",
  "يتلوه كتاب الذكر\nكتاب الذكر وهو الكتاب الثاني\nالذكر حياة القلوب // وقال تعالى كذا",
];

/** Versi "JK": takhrij di dalam baris diapit ` + `. Takhrij halaman 2 (catatan f0) sengaja tidak ada. */
const JK = [
  "الْعِلْمُ نُورٌ + حديث العلم نور أخرجه فلان بإسناد حسن + وَالْجَهْلُ ظُلْمَةٌ.",
  "قال الشيخ الصبر ضياء + حديث الصبر ضياء أخرجه مسلم من حديث فلان + والعمل ثمرة العلم",
  "وقال النبي الطهور شطر الايمان + حديث الطهور شطر الايمان رواه احمد + ثم رجع الكلام",
  "كتاب الصبر\nالصبر مفتاح الفرج قال تعالى {وَالصَّبْرُ نور القلوب في الظلمات}",
  "الذكر حياة القلوب",
];

function markdown(pages: readonly string[]): string {
  const body = pages
    .map((text, i) => {
      const [juz, page] = PAGES[i] ? [PAGES[i][1], PAGES[i][2]] : [1, i + 1];
      const lines = text.split("\n");
      const marker = `PageV${String(juz).padStart(2, "0")}P${String(page).padStart(3, "0")}`;
      // Baris pertama "# …", baris lanjutan "~~…"; penanda halaman di AKHIR halaman, dan satu
      // milestone ms di tengah.
      return lines
        .map((l, j) => (j === 0 ? `# ${l}` : `~~${l}`))
        .join("\n")
        .replace(/$/, i === 1 ? ` ms0001 ${marker}` : ` ${marker}`);
    })
    .join("\n");
  return `######OpenITI#\n\n#META# 000.SortField\t:: buatan\n\n#META#Header#End#\n\n${body}\n`;
}

const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

export interface Fixture {
  paths: PipelinePaths;
  config: WorkConfig;
}

/** Buat pohon Shamela + OpenITI + patch buatan di folder sementara. `matan` menimpa teks OpenITI. */
export function createFixture(opts: { matan?: string[] } = {}): Fixture {
  const root = mkdtempSync(join(tmpdir(), "surau-ingest-"));
  const shamela = join(root, "shamela");
  const bookDir = join(shamela, "book", String(BOOK_ID % 1000).padStart(3, "0"));
  mkdirSync(bookDir, { recursive: true });
  mkdirSync(join(shamela, "update", "master"), { recursive: true });

  const book = new DatabaseSync(join(bookDir, `${BOOK_ID}.db`));
  book.exec(
    "CREATE TABLE page(id INTEGER PRIMARY KEY,content TEXT, part TEXT, page TEXT, number TEXT, services TEXT, is_deleted TEXT);" +
      "CREATE TABLE title (id INTEGER PRIMARY KEY, content TEXT, page TEXT, parent TEXT, is_deleted TEXT);",
  );
  const pageStmt = book.prepare(
    "INSERT INTO page (id, content, part, page, is_deleted) VALUES (?, ?, ?, ?, '0')",
  );
  for (const [id, juz, no, content] of PAGES) pageStmt.run(id, content, String(juz), String(no));
  const titleStmt = book.prepare("INSERT INTO title VALUES (?, ?, ?, ?, '0')");
  for (const [id, content, page, parent] of TITLES)
    titleStmt.run(id, content, String(page), String(parent));
  book.close();

  const master = new DatabaseSync(join(shamela, "update", "master", "book.sqlite"));
  master.exec(
    "CREATE TABLE book (id INTEGER, name TEXT, is_deleted TEXT, author TEXT, bibliography TEXT)",
  );
  master
    .prepare("INSERT INTO book VALUES (?, ?, '0', '9', ?)")
    .run(BOOK_ID, "كتاب تجريبي", "الكتاب: كتاب تجريبي\rالناشر: دار التجربة - مدينة\rعدد الأجزاء: ٢");
  master.close();
  const authors = new DatabaseSync(join(shamela, "update", "master", "author.sqlite"));
  authors.exec("CREATE TABLE author (id INTEGER, is_deleted TEXT, name TEXT, death_number TEXT)");
  authors.prepare("INSERT INTO author VALUES (9, '0', 'مؤلف تجريبي', '505')").run();
  authors.close();

  const openiti = join(root, "openiti");
  mkdirSync(openiti);
  const matanText = markdown(opts.matan ?? MATAN);
  const jkText = markdown(JK);
  writeFileSync(join(openiti, "matan.md"), matanText);
  writeFileSync(join(openiti, "jk.md"), jkText);

  const repo = join(root, "repo");
  mkdirSync(join(repo, "patches"), { recursive: true });
  writeFileSync(join(repo, "patches", "uji.yaml"), PATCH);

  const config: WorkConfig = {
    shamelaBook: BOOK_ID,
    patch: "patches/uji.yaml",
    ids: "ids/uji.json",
    reportPrefix: "reports/uji",
    corpusVersion: "uji-v1",
    output: "uji.sqlite",
    expect: {
      pages: 5,
      volumes: [3, 2],
      titles: 5,
      rub: [1, 4],
      kitabPerRub: 2,
      matanMinPages: 5,
      llmCoverage: 0,
    },
    author: { id: 1, nameId: "Penulis Uji", wikidataId: null },
    work: {
      id: 1,
      slug: "uji",
      openitiUri: "0505Uji.KitabUji",
      titleId: "Kitab Uji",
      attributionStatus: "authentic",
      period: "klasik",
    },
    edition: { id: 7, slug: "uji", license: "CC BY-NC-SA 4.0", attribution: "Atribusi uji" },
    openiti: {
      release: "uji",
      commit: "0".repeat(40),
      matan: { file: "matan.md", sha256: sha256(matanText) },
      takhrij: { file: "jk.md", sha256: sha256(jkText) },
    },
  };
  return {
    config,
    paths: {
      repo,
      shamela,
      openiti,
      build: join(root, "build"),
      migrations: resolve(import.meta.dirname, "../../../packages/db/migrations/corpus"),
      quran: writeQuranFixture(join(root, "quran")),
    },
  };
}
