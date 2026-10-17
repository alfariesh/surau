// Tes pembaca sumber Qur'an dengan berkas BUATAN (test/quran-fixture.ts): XML Tanzil (atribut
// bismillah terpisah, entitas XML, urutan ketat) dan JSON Kemenag (sha256 dipin, cek silang).
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { normalizeArabic } from "@surau/text";
import { describe, expect, test } from "vite-plus/test";

import { FIXTURE_AYAT, FIXTURE_BISMILLAH, writeQuranFixture } from "../../test/quran-fixture.ts";
import { loadQuran, parseTanzilXml, sha256, tanzilNotice } from "./source.ts";

const norm = (s: string) => normalizeArabic(s).text;
const fixture = () => writeQuranFixture(mkdtempSync(join(tmpdir(), "surau-quran-")));

describe("parseTanzilXml", () => {
  test("bismillah pembuka surah dipisah dari teks ayat; entitas XML diurai", () => {
    const xml = `<quran>
  <sura index="1" name="أ">
    <aya index="1" text="كلمة &amp; أخرى" />
  </sura>
  <sura index="2" name="ب">
    <aya index="1" text="ثانية" bismillah="${FIXTURE_BISMILLAH}" />
    <aya index="2" text="ثالثة" />
  </sura>
</quran>`;
    const t = parseTanzilXml(xml, { surahs: 2, ayat: 3 });
    expect(t.ayat).toEqual([
      { surah: 1, ayah: 1, text: "كلمة & أخرى", bismillah: null },
      { surah: 2, ayah: 1, text: "ثانية", bismillah: FIXTURE_BISMILLAH },
      { surah: 2, ayah: 2, text: "ثالثة", bismillah: null },
    ]);
    expect([...t.surahNames.values()]).toEqual(["أ", "ب"]);
  });

  test("nomor ayat melompat, <aya> tak terbaca, atau jumlah salah → gagal", () => {
    const sura = (body: string) => `<quran><sura index="1" name="أ">${body}</sura></quran>`;
    expect(() =>
      parseTanzilXml(sura('<aya index="2" text="س" />'), { surahs: 1, ayat: 1 }),
    ).toThrow(/diharapkan ayat 1/);
    expect(() =>
      parseTanzilXml(sura('<aya index="1" text="س" /><aya index="2" text="ص" extra="x" />'), {
        surahs: 1,
        ayat: 2,
      }),
    ).toThrow(/2 <aya>, terbaca 1/);
    expect(() =>
      parseTanzilXml(sura('<aya index="1" text="س" />'), { surahs: 114, ayat: 6236 }),
    ).toThrow(/1 surah \/ 1 ayat/);
  });
});

describe("tanzilNotice", () => {
  test("blok hak cipta dari komentar XML disalin tanpa awalan #; tanpa blok = null", () => {
    const xml = `<?xml version="1.0"?>
<!--
# JANGAN DIHAPUS
#=====
#
#  Tanzil Quran Text (Uji, Version 0)
#  Baris dua
#
#  - Butir satu
#    lanjutan
#
#  Please check updates at: http://contoh.test/
#
#=====
-->
<quran></quran>`;
    expect(tanzilNotice(xml)).toBe(
      "Tanzil Quran Text (Uji, Version 0)\nBaris dua\n\n- Butir satu\nlanjutan\n\nPlease check updates at: http://contoh.test/",
    );
    expect(tanzilNotice("<quran></quran>")).toBeNull();
  });
});

describe("loadQuran", () => {
  test("menyatukan teks Tanzil, terjemahan + catatan kaki, transliterasi, juz, dan sumber", () => {
    const q = loadQuran(fixture(), norm);
    expect(q.ayat).toHaveLength(FIXTURE_AYAT.length);
    expect(q.numberingMismatch).toEqual([]);
    expect(q.ayat[1]).toEqual({
      surah: 1,
      ayah: 2,
      juz: 1,
      uthmani: "وَالصَّبْرُ نُورُ الْقُلُوبِ فِي الظُّلُمَاتِ",
      simpleClean: "والصبر نور القلوب في الظلمات",
      translation: {
        text: "Terjemahan uji dua1) dengan catatan.",
        footnotes: [{ marker: "1)", text: "Catatan kaki uji." }],
      },
      transliteration: "Translit 1:2",
    });
    expect(q.surahs.map((s) => [s.surah, s.nameAr, s.nameLatin, s.ayahCount])).toEqual([
      [1, "الأولى", "Al-Ula", 3],
      [2, "الثانية", "Ats-Tsaniyah", 3],
    ]);
    expect(q.sources.map((s) => [s.id, s.kind, s.sha256.length])).toEqual([
      ["kemenag-id", "translation", 64],
      ["kemenag-latin", "transliteration", 64],
      ["tanzil-simple-clean", "text", 64],
      ["tanzil-uthmani", "text", 64],
    ]);
  });

  test("berkas berubah (sha256 beda) atau tidak ada → gagal keras", () => {
    const cfg = fixture();
    writeFileSync(join(cfg.root, cfg.files.kemenagSurah.path), "[]");
    expect(() => loadQuran(cfg, norm)).toThrow(/sha256 .* ≠ /);
    expect(() => loadQuran({ ...cfg, root: join(cfg.root, "tidak-ada") }, norm)).toThrow(
      /tidak ada/,
    );
  });

  test("jumlah ayat per surah Kemenag ≠ Tanzil → gagal", () => {
    const cfg = fixture();
    const path = join(cfg.root, "kemenag/surah.json");
    const surahs = [
      {
        surah_id: "1",
        name_arabic: "أ",
        name_latin: "A",
        revelation_type: "makkah",
        ayah_count: "2",
      },
      {
        surah_id: "2",
        name_arabic: "ب",
        name_latin: "B",
        revelation_type: "madinah",
        ayah_count: "4",
      },
    ];
    const content = JSON.stringify(surahs);
    writeFileSync(path, content);
    const files = {
      ...cfg.files,
      kemenagSurah: { path: "kemenag/surah.json", sha256: sha256(content) },
    };
    expect(() => loadQuran({ ...cfg, files }, norm)).toThrow(/2 ayat \(Kemenag\) ≠ 3 \(Tanzil\)/);
  });
});
