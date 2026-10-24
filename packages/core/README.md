# @surau/core

**Core tools baca** Surau ([ARSITEKTUR-TEKNIS §4](../../implementasi/ARSITEKTUR-TEKNIS.md#4-core-tools-packagescore), [ADR-033](../../implementasi/KEPUTUSAN.md)): satu-satunya pintu ke data untuk membaca. Fungsinya dipakai bersama oleh web (S09), MCP (S16), dan Jawab (S19), jadi **bentuk keluarannya adalah kontrak**: perubahan hanya boleh menambah field.

Prinsipnya:

- Setiap teks adalah `text_raw` **persis** dari DB. Core tidak mengubah, memangkas, atau menormalisasi teks; satu-satunya "transformasi" adalah pemisahan struktur (badan vs catatan kaki, potongan per bagian).
- Setiap keluaran yang memuat teks atau letak membawa **`citation` lengkap**: karya, edisi, juz, halaman cetak, permalink, lisensi, dan atribusi. Setiap paragraf membawa `location` (juz, halaman, permalink ke jangkar paragraf `#p<seq>`, label). Sitasi penuh satu paragraf = `citation.source` keluaran itu + `location` paragraf, atau panggil `buildCitation`.
- Metadata karya (`listWorks`/`getWork`) tidak berhalaman, jadi tidak punya `citation`; lisensi dan atribusi ada di setiap edisi.
- Permalink berupa path tanpa origin (domain belum diputuskan, P-2). Web dan MCP menambahkan origin.
- Tanpa `next/*`, `cloudflare:*`, atau `node:*`. Semua fungsi menerima D1 bertipe struktural `D1Db` dari `@surau/db` (binding `env.CORPUS` memenuhinya).

## Fungsi

| Fungsi | Tool MCP (S16) | Isi |
|---|---|---|
| `listWorks(db)` / `getWork(db, slug)` | `list_works` | Karya, penulis, dan edisi (default dulu) dengan lisensi, atribusi, permalink |
| `getToc(db, editionId, { nodeId?, depth? })` | `get_table_of_contents` | Pohon daftar isi dari akar atau dari satu node, `depth` bawaan 2 (maks. 10). `child_count` menandai anak yang tidak dikirim |
| `readPage(db, editionId, juz, pageNo)` | `read_page` | Satu halaman cetak: `body`, `footnotes`, tautan penanda → catatan kaki, halaman sebelum/sesudah, `source_url` (halaman yang sama di Shamela untuk atribusi ADR-018; field tambahan S09), `quran` (ayat yang dikutip di halaman itu, S12), `translation` per paragraf dan `summaries` bagian yang mulai di halaman itu (S14) |
| `readSection(db, nodeId, cursor?)` | `read_section` | Paragraf bagian **beserta sub-bagiannya**, dipaginasi ±4–6 ribu token dengan `next_cursor` |
| `buildCitation(db, passageId)` | (di setiap hasil) | Sitasi lengkap satu paragraf |
| `searchText(db, query, { edition_id?, section_id?, limit?, offset?, expand? }, { digest? })` | `search_text` | Pencarian Arab (S11) dan Indonesia (S14): halaman cetak berperingkat dengan paragraf cocok, sorotan dan potongan di `text_raw`, terjemahan/ringkasan AI berlabel, asal kecocokan. `digest: true` (Cari situs, MCP, eval retrieval; bukan Jawab) menambah jalur gagasan Intisari → jangkar pertama gagasan (`digest_point`, X16, ADR-099). Lihat [Pencarian](#pencarian-searchtext) |
| `searchCacheKey(query, opts)` | (web) | Kunci cache hasil: rencana kueri ternormalisasi + opsi + versi normalisasi; `null` bila kueri tidak sah/kosong (S14) |
| `getAyahRefs(db, passageId)` | (bahan `read_page`/S16) | Kutipan ayat di satu paragraf + ayat utuh, terjemahan Kemenag, transliterasi, sumber (S12). Lihat [Ayat](#ayat-al-quran-s12) |
| `verifyQuote(db, passageId, quote)` | `verify_quote` | Apakah kutipan Arab ada di paragraf itu (batas kata, setelah normalisasi; S16). `match.text` = substring **mentah** persis (`text_raw.slice(char_start, char_end)`), bukan masukan. Lihat [Kutipan dan takhrij](#kutipan-dan-takhrij-s16) |
| `getHadithTakhrij(db, passageId)` | `get_hadith_takhrij` | Catatan kaki takhrij yang dirujuk penanda paragraf, verbatim, dengan tanda tinjau ingest; `status` `linked`/`none`/`is_footnote` (S16) |
| `readDigest(db, nodeId, lang?)` | (`get_section_digest`, X16) | Intisari satu node (X15, ADR-097): pembuka/abstrak/penutup, gagasan berjangkar (`location` paragraf), kutipan yang teks Arabnya disalin dari `text_raw` (hanya bila sidiknya cocok dan tidak menyentuh ayat; yang ditahan dicatat di `withheld_quotes`), istilah, pertanyaan ingatan, audio, dan dalil (`evidence`, X16, ADR-099): ayat yang beririsan dengan jangkar gagasan (teks Tanzil + terjemahan Kemenag) dan takhrij yang penandanya milik jangkar (teks asli + label kode `rule_extracted`), dihitung saat dibaca. Gagasan yang ditolak atau tanpa jangkar tidak dikirim; teks AI berhuruf Arab tidak pernah dikirim. `null` bila tidak ada, ditolak, atau skema korpus < 9 |
| `ipKey(secret, ip)` / `ipNetwork(ip)` | (web + MCP) | Kunci rate limit HMAC-SHA256 atas jaringan IP (IPv6 dipotong ke /64), tanpa IP mentah (ADR-014, ADR-034; dipindah dari web di S16) |

Skema Zod masukan (`readPageInput`, `readSectionInput`, `getTocInput`, `getWorkInput`, `buildCitationInput`, `searchTextInput`, `getAyahRefsInput`, `verifyQuoteInput`, `getHadithTakhrijInput`, `readDigestInput`) dan keluaran (`pageView`, `sectionView`, `tocView`, `workList`, `workView`, `citation`, `passage`, `ayahRef`, `quranView`, `ayahRefsView`, `searchView`, `quoteVerification`, `takhrijView`, `digestView`) diekspor untuk route, tool MCP, dan tes. `uintSegment` memvalidasi angka dari segmen URL (`/kitab/ihya/1/200`). Semua skema bisa diubah ke JSON Schema (`z.toJSONSchema`), sudah diuji.

```ts
import { readPage, readSection, isCoreError } from "@surau/core";

const page = await readPage(env.CORPUS, 1, 1, 200); // Ihya j.1 h.200, edisi 1 (default)
let chunk = await readSection(env.CORPUS, 100074);
while (chunk.next_cursor) chunk = await readSection(env.CORPUS, 100074, chunk.next_cursor);
```

## Error

| Kelas | `code` | Kapan | Peta di apps/* |
|---|---|---|---|
| `NotFound` | `not_found` | Alamat sah tetapi tidak ada: karya, edisi, halaman, node (termasuk node edisi lain di `getToc`), paragraf | 404 |
| `InvalidCitation` | `invalid_citation` | Alamat salah bentuk: juz/halaman/ID bukan bilangan bulat positif, `depth` di luar 1–10, slug salah, cursor rusak atau milik node lain | 400 |
| `InvalidQuery` | `invalid_query` | Kueri pencarian salah bentuk: kosong, >200 karakter, >32 kata, `limit` di luar 1–50, `offset` di luar 0–1000, `edition_id` di luar 1–899.999 (S11) | 400 |
| `Unavailable` | `unavailable` | Fitur belum ada di korpus terpasang: pencarian di korpus tanpa indeks (skema < 4, `ihya-v1`) atau indeks dengan `NORM_VERSION` lain (S11) | 503 |

Semuanya turunan `CoreError` (`isCoreError`). Pesannya berbahasa Inggris dan hanya menyebut alamat yang diminta (`Page not found: juz 1, page 999`), tanpa SQL, nama tabel, atau isi DB; UI memetakan `code` ke string Indonesia. Error lain (baris DB salah bentuk, D1 gagal) sengaja tidak dibungkus dan ditampilkan apps/* sebagai galat umum.

## Paginasi `readSection`

- Satuan potong adalah **blok**: satu paragraf badan + catatan kaki di halaman yang sama yang pertama kali dirujuknya. Catatan kaki yang tidak dirujuk (yatim, takhrij yang dipotong dari matan) ikut blok terakhir halamannya. Jadi paragraf tidak pernah dipotong, dan penanda selalu satu potongan dengan catatan kakinya.
- Ukuran diperkirakan dengan **1 token ≈ 1,4 karakter JSON keluaran** (`estimateTokens`). Dikalibrasi di S16 dengan `count_tokens` Claude atas potongan `read_section` lewat MCP: sebelum (81 potongan, 2 karakter/token) median 7.690 token sebenarnya, JSON `passages` median 1,63 karakter/token, min. 1,38; sesudah (84 potongan, [laporan](../../data/reports/mcp-token.md)) token `passages` / perkiraan median 0,88, maks. 1,11.
- Potongan diisi selama ≤ 5.000 token (blok pertama selalu ikut), lalu dipotong di **batas halaman cetak terakhir yang sudah ≥ 3.500 token**. Bila tidak ada batas halaman di rentang itu, halaman terbelah di antara blok. Di dalam satu potongan, setiap halaman tampil badan dulu, lalu catatan kakinya. Sisa ±1.000 token untuk `citation`, `node`, `ancestors`, dan blok lisensi MCP, jadi seluruh hasil tool `read_section` ≤ ±6 ribu token (diukur: median 5.037, p95 5.557, maks. 6.193).
- Label edisi non-default memakai slug edisi (`Kitab, j. 1, h. 5 (openiti)`). `estimated_tokens` hanya menghitung `passages`, tanpa `citation`, `node`, dan `ancestors` (lewat MCP, bersama blok lisensi, median ±1.020 token).
- `next_cursor` opak (base64url, menyimpan node, juz, halaman, dan `ord` paragraf badan berikutnya) dan selalu divalidasi ulang.
- Bagian terpanjang Ihya (Rub' al-Munjiyat, 1,68 juta karakter, 4.608 paragraf): 523 potongan, median 4.425 token perkiraan, maks. 5.524 (potongan satu paragraf panjang), 64 potongan di bawah 3.500 (sebelum S16: 278 potongan dengan heuristik lama).

## Pencarian `searchText`

- **Kueri:** Arab, boleh bervokal. Normalisasi + stem dari `@surau/text` (`planFtsQuery`): satu kata dicari beserta bentuk berklitiknya (الصبر = صبر, والصبر, بالصبر, وصبر …, kunyah أبو/أبي/أبا disamakan); dua kata atau lebih = frasa berurutan. `expand: true` (satu kata) juga mencocokkan bentuk bersufiks (صبره, نيته). Kueri yang kosong setelah normalisasi (hanya tanda baca) → hasil kosong tanpa kueri DB.
- **Hasil per halaman cetak:** paragraf cocok diranking bm25 (badan 1,0, catatan kaki 0,5), halaman diurutkan menurut paragraf terbaiknya lalu jumlah paragraf cocok. Setiap halaman membawa `citation` dan **semua** paragraf cocoknya dalam urutan baca. `score` = −bm25 (makin besar makin cocok). `total_pages`/`total_hits` = seluruh hasil; `limit` (1–50, bawaan 20) dan `offset` (0–1000) dihitung per halaman.
- **Sorotan dan potongan:** `highlights` (maks. 50 per paragraf) dan `snippet` adalah rentang di `text_raw` (indeks string JS, akhir eksklusif, sama dengan `footnote_refs`): `text_raw.slice(char_start, char_end)` selalu teks sumber verbatim dengan harakatnya. `snippet.text` (±160 karakter) dipotong di batas spasi. `text_raw` penuh tidak dikirim: pakai `readPage` atau `location.permalink`.
- **Kata sangat umum:** bila **setiap** kata kueri mengenai `term_stat` (stem di >10% paragraf, mis. الله, من, قال), termasuk lewat bentuk berklitiknya (سلم → وسلم) atau awalan `expand` (الل → الله), hasilnya `ranked: false` + `warning: "common_terms"`: `limit` **paragraf** pertama dalam urutan kitab (dikelompokkan per halaman; `hit_count` halaman terakhir bisa sebagian), tanpa total dan tanpa halaman lanjut. `common_terms` menyebut kata umum yang dikenai kueri beserta jumlah paragrafnya (juga untuk kueri campuran, yang tetap diranking).
- **Korpus:** butuh skema korpus ≥ 4 (`SEARCH_SCHEMA_VERSION`, migrasi 0004) dan `meta.norm_version` = `NORM_VERSION`; selain itu `Unavailable`. Filter `edition_id` memakai rentang rowid paragraf.
- **Bahasa kueri (S14, ADR-044):** huruf Arab saja → jalur Arab di atas (`paths: ["arabic"]`, `fusion: null`). Huruf Latin → kata Indonesia dicari di terjemahan AI (`translation_fts`) dan ringkasan AI (`summary_fts`): token Latin → bentuk normal → tanpa kata fungsi → ejaan baku (taubat = tobat) → stem ringan (kesabaran = sabar), `latin_terms` = stem yang dicari. Semua kata harus ada; bila terjemahan + ringkasan bersama-sama punya < 5 kecocokan semua kata, kecocokan sebagian kata menyusul (`all_terms: false`). Campuran → tiga jalur; bagian Arab yang semua katanya umum tidak dicari (`warning: "common_terms_ignored"`). Butuh skema ≥ 6 dan `meta.latin_norm_version` = `LATIN_NORM_VERSION`, selain itu `Unavailable`.
- **Gabungan:** Reciprocal Rank Fusion, `score` paragraf = Σ 1/(60 + peringkat) atas 100 paragraf teratas per jalur (ringkasan: 30 bagian teratas, dipetakan ke paragraf awal bagiannya). Halaman = skor paragraf terbaiknya; `total_pages`/`total_hits` dihitung di atas kandidat itu (`fusion`). `matched_by` menjelaskan skor: jalur + peringkat paragraf di jalur itu.
- **Teks AI di hasil:** `translation` (setiap hasil, juga kueri Arab) dan `summary` (bila jalur ringkasan cocok) membawa label, model, versi prompt, status tinjauan, `highlights` + `snippet` (±240 karakter) di teks AI. Teks terjemahan memuat placeholder `⟦QS s:a⟧` untuk kutipan ayat; potongan tidak pernah memotongnya, dan terjemahan ayatnya adalah Kemenag (lewat `getAyahRefs`/`readPage`), bukan teks model. Hasil yang hanya cocok di jalur Indonesia: `highlights` Arab kosong, `snippet` Arab dari awal paragraf.
- **Filter bagian:** `section_id` = node daftar isi beserta turunannya (mis. satu rub' atau kitab), berlaku di semua jalur; node tidak ada atau milik edisi lain → `NotFound`.
- **Biaya D1:** satu bolak-balik (`searchCorpus` @surau/db: konteks + kueri berperingkat + kueri urutan kitab dalam satu `batch`; pengaman ada di ekspresi MATCH sehingga hanya satu yang memindai indeks). Ihya: الصبر ±2.900 baris dibaca, الله (pengaman) ±140 baris termasuk konteks (ADR-039).

## Kutipan dan takhrij (S16)

- **`verifyQuote`**: kutipan (boleh bervokal atau tidak, ≤2.000 karakter) dicari dengan `findQuote` (@surau/text) di `text_raw` satu paragraf: cocok di batas kata setelah normalisasi (harakat, varian alif/ya/ta marbuta, tanda baca), tidak di tengah ekspansi satu karakter (ﷺ). `verified: false` + `match: null` = kutipan tidak ada di sumber, jangan ditampilkan sebagai kutipan. `exact` = masukan sama persis dengan `match.text`. Satu bolak-balik D1 (paragraf + edisi bersamaan; edisi terbaca dari ID paragraf).
- **`getHadithTakhrij`**: paragraf + catatan kaki yang dirujuk penanda `(١)`-nya, urut penanda, sebagai `Passage` lengkap (`needs_review` = tanda ingest seperti `takhrij_unmatched`, bukan hasil tinjauan). `review_status: "unreviewed"` untuk setiap tautan: penanda → catatan kaki dibuat kode ingest dan belum dicek manusia (S18 menambah nilai lain). `status: "none"` = tidak ada takhrij tertaut, jadi derajat hadits **tidak diketahui** (aturan teks-arab no. 6, tidak ditebak). `unlinked_footnote_ids` = catatan kaki halaman itu yang tidak dirujuk penanda mana pun (mis. takhrij yang dipotong dari matan): mungkin terkait, mungkin tidak. Untuk Ihya, catatan kaki adalah takhrij al-'Iraqi.

## Contoh keluaran (Ihya, DB lokal)

`text_raw` diganti `"…"` dan sebagian larik dipotong: teks kitab tidak disalin ke git. Selain itu, bentuknya persis keluaran fungsi.

### `readPage(db, 1, 1, 200)` (satu paragraf badan dan satu catatan kaki ditampilkan)

```json
{
  "citation": {
    "source": {
      "work": {
        "slug": "ihya",
        "title_ar": "إحياء علوم الدين",
        "title_id": "Ihya' 'Ulum ad-Din",
        "author": {
          "name_ar": "أبو حامد الغزالي",
          "name_id": "Abu Hamid al-Ghazali",
          "death_hijri": 505
        },
        "attribution_status": "authentic"
      },
      "edition": {
        "id": 1,
        "slug": "dar-al-marifah",
        "is_default": true,
        "publisher": "دار المعرفة",
        "city": "بيروت"
      },
      "license": "CC BY-NC-SA 4.0",
      "attribution": "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0009472 & JK000001; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar al-Ma'rifah, Beirut 1402/1982"
    },
    "juz": 1,
    "page_no": 200,
    "permalink": "/kitab/ihya/1/200",
    "label": "Ihya' 'Ulum ad-Din, j. 1, h. 200"
  },
  "body": [
    {
      "id": 10002826,
      "anchor": "p2826",
      "kind": "body",
      "ord": 3,
      "toc_node_id": 100074,
      "text_raw": "…",
      "footnote_refs": [
        {
          "marker": "٤",
          "char_start": 255,
          "char_end": 258,
          "footnote_id": 10002834
        },
        {
          "marker": "٥",
          "char_start": 528,
          "char_end": 531,
          "footnote_id": 10002835
        },
        {
          "marker": "٦",
          "char_start": 632,
          "char_end": 635,
          "footnote_id": 10002836
        }
      ],
      "needs_review": [],
      "location": {
        "juz": 1,
        "page_no": 200,
        "permalink": "/kitab/ihya/1/200#p2826",
        "label": "Ihya' 'Ulum ad-Din, j. 1, h. 200"
      }
    }
  ],
  "footnotes": [
    {
      "id": 10002834,
      "anchor": "p2834",
      "kind": "foot",
      "ord": 4,
      "toc_node_id": 100074,
      "text_raw": "…",
      "footnote_refs": [],
      "needs_review": [],
      "location": {
        "juz": 1,
        "page_no": 200,
        "permalink": "/kitab/ihya/1/200#p2834",
        "label": "Ihya' 'Ulum ad-Din, j. 1, h. 200"
      }
    }
  ],
  "prev": {
    "juz": 1,
    "page_no": 199,
    "permalink": "/kitab/ihya/1/199",
    "label": "Ihya' 'Ulum ad-Din, j. 1, h. 199"
  },
  "next": {
    "juz": 1,
    "page_no": 201,
    "permalink": "/kitab/ihya/1/201",
    "label": "Ihya' 'Ulum ad-Din, j. 1, h. 201"
  },
  "source_url": "https://shamela.ws/book/9472/200"
}
```

### `readSection(db, 100074)` (paragraf pertama saja; `citation.source` sama dengan di atas)

```json
{
  "citation": {
    "source": "(sama dengan readPage)",
    "juz": 1,
    "page_no": 197,
    "permalink": "/kitab/ihya/1/197",
    "label": "Ihya' 'Ulum ad-Din, j. 1, h. 197"
  },
  "node": {
    "id": 100074,
    "title_ar": "القسم الثاني ما يتكرر بتكرر الأسابيع",
    "level": 4,
    "permalink": "/kitab/ihya/bab/100074",
    "start": {
      "juz": 1,
      "page_no": 197,
      "permalink": "/kitab/ihya/1/197",
      "label": "Ihya' 'Ulum ad-Din, j. 1, h. 197"
    }
  },
  "ancestors": [
    {
      "id": 100002,
      "title_ar": "ربع العبادات",
      "level": 1,
      "permalink": "/kitab/ihya/bab/100002"
    },
    {
      "id": 100044,
      "title_ar": "كتاب أسرار الصلاة ومهماتها",
      "level": 2,
      "permalink": "/kitab/ihya/bab/100044"
    },
    {
      "id": 100072,
      "title_ar": "الباب السابع في النوافل من الصلوات",
      "level": 3,
      "permalink": "/kitab/ihya/bab/100072"
    }
  ],
  "passages": [
    {
      "id": 10002789,
      "anchor": "p2789",
      "kind": "body",
      "ord": 6,
      "toc_node_id": 100074,
      "text_raw": "…",
      "footnote_refs": [],
      "needs_review": [],
      "location": {
        "juz": 1,
        "page_no": 197,
        "permalink": "/kitab/ihya/1/197#p2789",
        "label": "Ihya' 'Ulum ad-Din, j. 1, h. 197"
      }
    }
  ],
  "estimated_tokens": 4691,
  "next_cursor": "eyJ2IjoxLCJuIjoxMDAwNzQsImoiOjEsInAiOjE5OSwibyI6MX0"
}
```

### `getToc(db, 1, { nodeId: 100002, depth: 2 })` (satu anak ditampilkan)

```json
{
  "citation": {
    "source": "(sama dengan readPage)",
    "juz": 1,
    "page_no": 4,
    "permalink": "/kitab/ihya/1/4",
    "label": "Ihya' 'Ulum ad-Din, j. 1, h. 4"
  },
  "ancestors": [],
  "depth": 2,
  "nodes": [
    {
      "id": 100002,
      "title_ar": "ربع العبادات",
      "level": 1,
      "permalink": "/kitab/ihya/bab/100002",
      "ord": 2,
      "start": {
        "juz": 1,
        "page_no": 4,
        "permalink": "/kitab/ihya/1/4",
        "label": "Ihya' 'Ulum ad-Din, j. 1, h. 4"
      },
      "patched": false,
      "child_count": 10,
      "children": [
        {
          "id": 100003,
          "title_ar": "كتاب العلم",
          "level": 2,
          "permalink": "/kitab/ihya/bab/100003",
          "ord": 1,
          "start": {
            "juz": 1,
            "page_no": 4,
            "permalink": "/kitab/ihya/1/4",
            "label": "Ihya' 'Ulum ad-Din, j. 1, h. 4"
          },
          "patched": false,
          "child_count": 7,
          "children": []
        }
      ]
    }
  ]
}
```

### `listWorks(db)`

```json
{
  "works": [
    {
      "slug": "ihya",
      "title_ar": "إحياء علوم الدين",
      "title_id": "Ihya' 'Ulum ad-Din",
      "author": {
        "name_ar": "أبو حامد الغزالي",
        "name_id": "Abu Hamid al-Ghazali",
        "death_hijri": 505
      },
      "attribution_status": "authentic",
      "original_language": "ar",
      "period": "abad ke-5 H",
      "openiti_uri": "0505Ghazali.IhyaCulumDin",
      "editions": [
        {
          "id": 1,
          "slug": "dar-al-marifah",
          "is_default": true,
          "source": "shamela",
          "source_ref": "9472",
          "publisher": "دار المعرفة",
          "city": "بيروت",
          "volumes": 4,
          "license": "CC BY-NC-SA 4.0",
          "attribution": "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0009472 & JK000001; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar al-Ma'rifah, Beirut 1402/1982",
          "permalink": "/kitab/ihya"
        }
      ]
    }
  ]
}
```

### `buildCitation(db, 10002826)`

```json
{
  "source": "(sama dengan readPage)",
  "juz": 1,
  "page_no": 200,
  "permalink": "/kitab/ihya/1/200#p2826",
  "label": "Ihya' 'Ulum ad-Din, j. 1, h. 200"
}
```


### `searchText(db, "الصبر", { limit: 1 })` (satu paragraf dan dua sorotan ditampilkan; `snippet.text` diganti `"…"`)

```json
{
  "query": "الصبر",
  "terms": ["صبر"],
  "edition_id": null,
  "ranked": true,
  "warning": null,
  "common_terms": [],
  "total_pages": 205,
  "total_hits": 323,
  "limit": 1,
  "offset": 0,
  "results": [
    {
      "citation": {
        "source": "(sama dengan readPage)",
        "juz": 4,
        "page_no": 72,
        "permalink": "/kitab/ihya/4/72",
        "label": "Ihya' 'Ulum ad-Din, j. 4, h. 72"
      },
      "score": 14.999897141892628,
      "hit_count": 4,
      "hits": [
        {
          "id": 10016275,
          "anchor": "p16275",
          "kind": "body",
          "ord": 1,
          "toc_node_id": 100202,
          "section": {
            "id": 100202,
            "title_ar": "بيان مظان الحاجة إلى الصبر وأن العبد لا يستغني عنه في حال من الأحوال",
            "level": 4,
            "permalink": "/kitab/ihya/bab/100202"
          },
          "location": {
            "juz": 4,
            "page_no": 72,
            "permalink": "/kitab/ihya/4/72#p16275",
            "label": "Ihya' 'Ulum ad-Din, j. 4, h. 72"
          },
          "score": 6.903101045015238,
          "highlights": [
            { "char_start": 89, "char_end": 95 },
            { "char_start": 106, "char_end": 112 }
          ],
          "snippet": { "char_start": 12, "char_end": 167, "text": "…" }
        }
      ]
    }
  ]
}
```

`searchText(db, "الله")` → `ranked: false`, `warning: "common_terms"`, `common_terms: [{ "term": "الله", "passage_count": 9242 }]`, `total_pages: null`, `results` = 20 paragraf pertama dalam urutan kitab.

Sejak S14 setiap hasil juga membawa `latin_terms: []`, `paths: ["arabic"]`, `fusion: null`, `section_id: null`, dan per paragraf `matched_by: [{ "path": "arabic", "rank": 1, "all_terms": true }]`, `translation` (potongan dari awal, tanpa sorotan), `summary: null`.

### `searchText(db, "kesabaran", { limit: 1 })` (S14; satu paragraf, potongan diganti `"…"`)

```json
{
  "query": "kesabaran",
  "edition_id": null,
  "section_id": null,
  "limit": 1,
  "terms": [],
  "latin_terms": ["sabar"],
  "paths": ["translation", "summary"],
  "fusion": { "method": "rrf", "k": 60, "depth": 100, "summary_depth": 30 },
  "ranked": true,
  "warning": null,
  "common_terms": [],
  "total_pages": 71,
  "total_hits": 114,
  "offset": 0,
  "results": [
    {
      "citation": { "source": "(sama dengan readPage)", "juz": 4, "page_no": 61, "permalink": "/kitab/ihya/4/61", "label": "Ihya' 'Ulum ad-Din, j. 4, h. 61" },
      "score": 0.031544957774465976,
      "hit_count": 4,
      "hits": [
        {
          "id": 10016206,
          "anchor": "p16206",
          "kind": "body",
          "ord": 2,
          "toc_node_id": 100197,
          "section": { "id": 100197, "title_ar": "بيان فضيلة الصبر", "level": 4, "permalink": "/kitab/ihya/bab/100197" },
          "location": { "juz": 4, "page_no": 61, "permalink": "/kitab/ihya/4/61#p16206", "label": "Ihya' 'Ulum ad-Din, j. 4, h. 61" },
          "score": 0.031544957774465976,
          "highlights": [],
          "snippet": { "char_start": 0, "char_end": 89, "text": "…" },
          "matched_by": [
            { "path": "translation", "rank": 6, "all_terms": true },
            { "path": "summary", "rank": 1, "all_terms": true }
          ],
          "translation": {
            "label": "ai_translation",
            "lang": "id",
            "model": "claude-haiku-5-5",
            "prompt_version": "translate-passage@2",
            "created_at": "2026-10-17T02:29:39.122198+00:00",
            "review_status": "ai_generated",
            "highlights": [{ "char_start": 29, "char_end": 34 }],
            "snippet": { "char_start": 0, "char_end": 131, "text": "…" }
          },
          "summary": {
            "label": "ai_summary",
            "section": { "id": 100197, "title_ar": "بيان فضيلة الصبر", "level": 4, "permalink": "/kitab/ihya/bab/100197" },
            "lang": "id",
            "model": "claude-haiku-5-5",
            "prompt_version": "summarize-section@2",
            "created_at": "2026-10-17T01:54:20.281406+00:00",
            "review_status": "ai_generated",
            "highlights": [{ "char_start": 40, "char_end": 45 }],
            "snippet": { "char_start": 0, "char_end": 237, "text": "…" }
          }
        }
      ]
    }
  ]
}
```

## Ayat Al-Qur'an (S12)

- **`Passage.ayah_refs`** (setiap paragraf, juga di `readSection`): kutipan ayat yang dikenali ingest secara deterministik (ADR-040). `text_raw.slice(char_start, char_end)` = kutipan persis di kitab. `match`: `exact`/`similar` (beda ejaan kecil); `partial`: hanya sebagian ayat; `bracketed`: bertanda `{…}` di sumber (false = dikenali sesudah frasa pengantar seperti قال تعالى); `alt_count`: letak lain dengan lafaz sama; `label`: "QS Al-Baqarah [2]: 255" (rentang "255–257").
- **`PageView.quran`** (null bila halaman tidak mengutip ayat): ayat **utuh** untuk semua rujukan halaman (juga kutipan sebagian), `text` Tanzil Uthmani, `translation` Kemenag + `footnotes`, `transliteration`, `surahs`, dan `sources` (nama, versi, lisensi, atribusi, url). Semua verbatim dari DB, satu bolak-balik D1 tambahan hanya bila ada rujukan.
- **Korpus lama** (skema < 5, mis. produksi `ihya-v1`): `ayah_refs` kosong dan `quran` null (kueri gagal → cek `meta.schema_version`); galat lain diteruskan. `getAyahRefs` → `Unavailable`.
- **Penanda ayat untuk batch terjemahan (S13)**, `ayah-placeholder.ts`: `maskAyat(text_raw, ayah_refs)` mengganti kutipan dengan `⟦QS s:a⟧`/`⟦QS s:a-b⟧` (round-trip `unmaskAyat`); `checkPlaceholders(keluaranLLM, masked)` menolak placeholder yang hilang, ganda, atau dikarang; `translationSegments(text, slots, quran)` memecah terjemahan tersimpan (berisi placeholder) menjadi segmen `ai` (label `ai_translation`) dan `ayah` (label `kemenag`, atau `kemenag_full_ayah` untuk kutipan sebagian = terjemahan ayat lengkap) berisi terjemahan Kemenag verbatim + atribusi; placeholder asing = `invalid`. Indeks terjemahan (S14) hanya mengindeks segmen `ai`.

## Tes

- `pnpm exec vp test --project core`: tes unit di workerd terhadap D1 lokal sementara, dengan migrasi korpus dari `packages/db` dan fixture buatan (fixture S06 + satu bagian panjang sintetis, `test/fixture.ts`).
- `packages/core/test/local/ihya-search.test.ts` (project `node`, S11): regresi recall 18 kueri riset ([queries.json](../../docs/riset/2026-10-15-pencarian-arab/queries.json)); gold dibangun ulang dari D1 lokal dengan definisi regex di file itu, recall per kueri harus ≥ angka riset dan total halaman di luar gold ≤ 10. Juga الصبر (halaman teratas j. 4 h. 72) dan الله (pengaman). Dilewati bila korpus lokal belum punya indeks (`pnpm ingest ihya && pnpm corpus:load:local`).
- `packages/core/test/local/ihya.test.ts` (project `node`, ikut `pnpm test`): tes integrasi terhadap D1 lokal berisi Ihya penuh lewat `getPlatformProxy`, pada **salinan** `.wrangler/state/v3` di folder sementara. Dilewati otomatis bila state D1 lokal tidak ada (CI), DB korpus belum dimigrasi, atau Ihya belum dimuat (`pnpm corpus:load:local`).
- Cakupan baris belum terukur: tes D1 berjalan di workerd, tempat coverage v8 belum didukung plugin 1.4.2 (sama dengan `packages/db`, ADR-029).
