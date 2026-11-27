// Data tampilan per karya/edisi yang tidak ada di DB korpus (S09, ADR-034). Karya atau edisi yang
// belum terdaftar di sini tetap tampil dengan data DB apa adanya dan teks umum.

/**
 * Nama tampilan berhuruf Latin untuk sitasi berbahasa Indonesia ("Salin sitasi"). DB korpus
 * menyimpan nama pengarang lengkap (name_id) dan nama penerbit berhuruf Arab; sitasi ringkas
 * memakai bentuk yang lazim di catatan kaki Indonesia.
 */
export const CITE_AUTHOR: Readonly<Record<string, string>> = {
  ihya: "al-Ghazali",
  "bidayat-al-hidayah": "al-Ghazali",
  "at-tibyan": "an-Nawawi",
  "al-ajurrumiyyah": "Ibnu Ajurrum",
  "al-munqidz-min-adh-dhalal": "al-Ghazali",
  "al-waraqat": "al-Juwaini",
};

/** Keterangan singkat karya di daftar /kitab (ditulis tangan, bahasa Indonesia). */
export const WORK_BLURB: Readonly<Record<string, string>> = {
  ihya: "Ensiklopedia ibadah, adab, dan penyucian jiwa dalam empat bagian: ibadah, kebiasaan sehari-hari, hal yang membinasakan, dan hal yang menyelamatkan.",
  "bidayat-al-hidayah": "Panduan adab dan ibadah harian, pintu masuk sebelum Ihya.",
  "at-tibyan":
    "Adab membaca, menghafal, dan mengajarkan Al-Qur'an bagi penghafal, guru, dan murid.",
  "al-ajurrumiyyah":
    "Matan ringkas ilmu nahwu: kalimat, i'rab, dan kedudukan kata, kitab pertama tata bahasa Arab di pesantren.",
  "al-munqidz-min-adh-dhalal":
    "Otobiografi intelektual al-Ghazali: keraguan, kajian atas ilmu kalam, filsafat, kaum Batiniyah, dan jalan tasawuf.",
  "al-waraqat":
    "Matan ringkas ushul fiqh: hukum, perintah dan larangan, umum dan khusus, nasakh, ijma', qiyas, dan ijtihad.",
};

/** Kunci: `<slug karya>/<slug edisi>`. */
export const CITE_PUBLISHER: Readonly<Record<string, string>> = {
  "ihya/dar-al-marifah": "Dar al-Ma'rifah",
  "bidayat-al-hidayah/maktabat-madbuli": "Maktabat Madbuli",
  "at-tibyan/dar-ibn-hazm": "Dar Ibn Hazm",
  "al-ajurrumiyyah/dar-ash-shumaii": "Dar ash-Shumai'i",
  "al-munqidz-min-adh-dhalal/dar-al-kutub-al-haditsah": "Dar al-Kutub al-Haditsah",
  "al-waraqat/tahqiq-al-abd": "tahqiq 'Abd al-Lathif al-'Abd",
};

/** Teks lisensi resmi per nama lisensi di `edition.license` (CC BY-NC-SA 4.0 §3(a)(1)). */
export const LICENSE_URL: Readonly<Record<string, string>> = {
  "CC BY-NC-SA 4.0": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

/** Materi berlisensi yang menjadi dasar hak pakai teks edisi (data/ATTRIBUTION.md, ADR-018). */
export const EDITION_SOURCE: Readonly<Record<string, { label: string; url: string }>> = {
  "ihya/dar-al-marifah": {
    label: "OpenITI 2025.1.9 (Zenodo)",
    url: "https://zenodo.org/records/17767721",
  },
  "bidayat-al-hidayah/maktabat-madbuli": {
    label: "OpenITI 2025.1.9 (Zenodo)",
    url: "https://zenodo.org/records/17767721",
  },
  "at-tibyan/dar-ibn-hazm": {
    label: "OpenITI 2025.1.9 (Zenodo)",
    url: "https://zenodo.org/records/17767721",
  },
  "al-ajurrumiyyah/dar-ash-shumaii": {
    label: "OpenITI 2025.1.9 (Zenodo)",
    url: "https://zenodo.org/records/17767721",
  },
  "al-munqidz-min-adh-dhalal/dar-al-kutub-al-haditsah": {
    label: "OpenITI 2025.1.9 (Zenodo)",
    url: "https://zenodo.org/records/17767721",
  },
  "al-waraqat/tahqiq-al-abd": {
    label: "OpenITI 2025.1.9 (Zenodo)",
    url: "https://zenodo.org/records/17767721",
  },
};

/**
 * Isi catatan kaki edisi, bila diketahui. Catatan kaki edisi Dar al-Ma'rifah berisi takhrij
 * al-'Iraqi; karya lain tidak boleh ikut diatribusikan ke beliau, jadi tanpa entri = "Catatan kaki".
 */
export const FOOTNOTE_NOTE: Readonly<Record<string, { heading: string; lead: string }>> = {
  "ihya/dar-al-marifah": {
    heading: "Catatan kaki · takhrij hadits al-'Iraqi",
    lead: "Catatan kaki edisi ini berisi takhrij al-Hafiz al-'Iraqi atas hadits-hadits Ihya. Status hadits hanya diambil dari teks takhrij ini, tanpa tebakan AI.",
  },
};

export interface EditionCredit {
  /** `<slug karya>/<slug edisi>`; slug karya juga dipakai untuk tautan baca. */
  key: string;
  workSlug: string;
  title: string;
  author: string;
  /** Sama persis dengan `edition.attribution` di DB dan data/ATTRIBUTION.md (dites). */
  attribution: string;
  parties: readonly { name: string; role: string; link?: { label: string; url: string } }[];
  changes: readonly string[];
}

const OPENITI_PARTY = {
  name: "OpenITI (Open Islamicate Texts Initiative), rilis 2025.1.9",
  role: "Rilis berlisensi CC BY-NC-SA 4.0 yang menjadi dasar hak pakai teks.",
  link: { label: "Zenodo", url: "https://zenodo.org/records/17767721" },
} as const;

/**
 * Rincian atribusi per edisi untuk halaman /lisensi (S10, ADR-018, ADR-021). Halaman itu statis
 * (tanpa baca D1), jadi isinya diringkas dari data/ATTRIBUTION.md. Tes menjaga kalimat atribusi dan
 * semua tautannya sama persis; teks peran dan perubahan disunting tangan bila ATTRIBUTION.md berubah.
 * Ihya diarsipkan dan tidak tayang (ADR-142), jadi tidak tercantum; atribusinya tetap di ATTRIBUTION.md.
 */
export const EDITION_CREDITS: readonly EditionCredit[] = [
  {
    key: "bidayat-al-hidayah/maktabat-madbuli",
    workSlug: "bidayat-al-hidayah",
    title: "Bidayat al-Hidayah",
    author: "al-Ghazali (w. 505 H)",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0012718; digitalisasi asal: al-Maktaba al-Shamela; edisi: Maktabat Madbuli, Kairo 1413/1993",
    parties: [
      OPENITI_PARTY,
      {
        name: "al-Maktaba al-Shamela",
        role: "Digitalisasi asal edisi ini (kitab no. 12718). Teks utama dan struktur judul dibangun dari salinan Shamela, lalu diverifikasi identik dengan rilis OpenITI di atas. Setiap halaman Surau menautkan halaman yang sama di Shamela.",
        link: { label: "shamela.ws", url: "https://shamela.ws/book/12718" },
      },
      {
        name: "Maktabat Madbuli, Kairo",
        role: "Penerbit edisi cetak: satu jilid, cetakan pertama 1413 H / 1993 M, tahqiq Muhammad Zainhum Muhammad 'Azab. Nomor halaman di Surau mengikuti cetakan ini.",
      },
    ],
    changes: [
      "HTML Shamela dibersihkan secara otomatis dan teks dibagi per paragraf; huruf teks Arab tidak diubah.",
    ],
  },
  {
    key: "at-tibyan/dar-ibn-hazm",
    workSlug: "at-tibyan",
    title: "at-Tibyan fi Adab Hamalat al-Qur'an",
    author: "an-Nawawi (w. 676 H)",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0001969; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar Ibn Hazm, Beirut 1414/1994, tahqiq Muhammad al-Hajjar; catatan kaki, mukadimah, faedah tambahan, dan kata penutup pentahqiq tidak disertakan",
    parties: [
      OPENITI_PARTY,
      {
        name: "al-Maktaba al-Shamela",
        role: "Digitalisasi asal edisi ini (kitab no. 1969). Teks utama dan struktur judul dibangun dari salinan Shamela, lalu diverifikasi identik dengan rilis OpenITI di atas. Setiap halaman Surau menautkan halaman yang sama di Shamela.",
        link: { label: "shamela.ws", url: "https://shamela.ws/book/1969" },
      },
      {
        name: "Dar Ibn Hazm, Beirut",
        role: "Penerbit edisi cetak: satu jilid, cetakan ketiga 1414 H / 1994 M, tahqiq Muhammad al-Hajjar. Nomor halaman di Surau mengikuti cetakan ini.",
      },
    ],
    changes: [
      "HTML Shamela dibersihkan secara otomatis dan teks dibagi per paragraf; huruf teks Arab tidak diubah.",
      "Catatan kaki pentahqiq tidak disertakan; penanda nomor catatan di teks utama tetap ada sebagai teks biasa.",
      "Tulisan pentahqiq di badan edisi (mukadimah, faedah tambahan, dan kata penutup) tidak disertakan.",
    ],
  },
  {
    key: "al-ajurrumiyyah/dar-ash-shumaii",
    workSlug: "al-ajurrumiyyah",
    title: "al-Ajurrumiyyah",
    author: "Ibnu Ajurrum (w. 723 H)",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0011371; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar ash-Shumai'i, 1419/1998; catatan kaki penyunting tidak disertakan",
    parties: [
      OPENITI_PARTY,
      {
        name: "al-Maktaba al-Shamela",
        role: "Digitalisasi asal edisi ini (kitab no. 11371). Teks utama dan struktur judul dibangun dari salinan Shamela, lalu diverifikasi identik dengan rilis OpenITI di atas. Setiap halaman Surau menautkan halaman yang sama di Shamela.",
        link: { label: "shamela.ws", url: "https://shamela.ws/book/11371" },
      },
      {
        name: "Dar ash-Shumai'i",
        role: "Penerbit edisi cetak: satu jilid, 1419 H / 1998 M. Nomor halaman di Surau mengikuti cetakan ini (halaman 5–23).",
      },
    ],
    changes: [
      "HTML Shamela dibersihkan secara otomatis dan teks dibagi per paragraf; huruf teks Arab tidak diubah.",
      "Potongan halaman Shamela berurutan dengan nomor cetak sama digabung menjadi satu halaman cetak; urutan dan isi paragraf tidak berubah.",
      "Catatan kaki penyunting tidak disertakan; penanda nomor catatan di teks utama tetap ada sebagai teks biasa.",
    ],
  },
  {
    key: "al-munqidz-min-adh-dhalal/dar-al-kutub-al-haditsah",
    workSlug: "al-munqidz-min-adh-dhalal",
    title: "al-Munqidz min adh-Dhalal",
    author: "al-Ghazali (w. 505 H)",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0009246; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar al-Kutub al-Haditsah, Mesir, disertai Dr. 'Abd al-Halim Mahmud",
    parties: [
      OPENITI_PARTY,
      {
        name: "al-Maktaba al-Shamela",
        role: "Digitalisasi asal edisi ini (kitab no. 9246). Teks utama dan struktur judul dibangun dari salinan Shamela, lalu diverifikasi dengan rilis OpenITI di atas. Setiap halaman Surau menautkan halaman yang sama di Shamela.",
        link: { label: "shamela.ws", url: "https://shamela.ws/book/9246" },
      },
      {
        name: "Dar al-Kutub al-Haditsah, Mesir",
        role: "Penerbit edisi cetak, disertai kajian Dr. 'Abd al-Halim Mahmud (kajian itu tidak dimuat). Nomor halaman di Surau mengikuti cetakan ini (halaman 101–207).",
      },
    ],
    changes: [
      "HTML Shamela dibersihkan secara otomatis dan teks dibagi per paragraf; huruf teks Arab tidak diubah.",
    ],
  },
  {
    key: "al-waraqat/tahqiq-al-abd",
    workSlug: "al-waraqat",
    title: "al-Waraqat",
    author: "Imam al-Haramain al-Juwaini (w. 478 H)",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0006297; digitalisasi asal: al-Maktaba al-Shamela; edisi: tahqiq Dr. 'Abd al-Lathif Muhammad al-'Abd",
    parties: [
      OPENITI_PARTY,
      {
        name: "al-Maktaba al-Shamela",
        role: "Digitalisasi asal edisi ini (kitab no. 6297). Teks utama dan struktur judul dibangun dari salinan Shamela, lalu diverifikasi dengan rilis OpenITI di atas. Setiap halaman Surau menautkan halaman yang sama di Shamela.",
        link: { label: "shamela.ws", url: "https://shamela.ws/book/6297" },
      },
      {
        name: "Edisi tahqiq Dr. 'Abd al-Lathif Muhammad al-'Abd",
        role: "Edisi cetak satu jilid. Nomor halaman di Surau mengikuti cetakan ini (halaman 7–31).",
      },
    ],
    changes: [
      "HTML Shamela dibersihkan secara otomatis dan teks dibagi per paragraf; huruf teks Arab tidak diubah.",
      "Basmalah pembuka menjadi butir daftar isi tersendiri; teksnya tidak diubah.",
    ],
  },
];

/**
 * Sumber ayat Al-Qur'an untuk /lisensi (S12, ADR-040), ringkasan data/ATTRIBUTION.md bagian Ayat
 * (tes menjaga semua tautannya ada di sana). Halaman statis: tetap benar walau korpus produksi
 * belum memuat tabel ayat.
 */
export const QURAN_CREDITS: readonly {
  name: string;
  role: string;
  links: readonly { label: string; url: string }[];
}[] = [
  {
    name: "Tanzil Project",
    role: "Teks ayat: Tanzil Quran Text versi 1.1 (Uthmani untuk tampilan, Simple Clean untuk mencocokkan kutipan), CC BY 3.0. Disalin verbatim, tidak diubah.",
    links: [
      { label: "tanzil.net", url: "https://tanzil.net" },
      { label: "lisensi teks Tanzil", url: "https://tanzil.net/docs/text_license" },
    ],
  },
  {
    name: "Kementerian Agama Republik Indonesia (LPMQ)",
    role: "Terjemahan Al-Qur'an berbahasa Indonesia beserta catatan kakinya, dan transliterasi Latin. Ditampilkan verbatim.",
    links: [{ label: "quran.kemenag.go.id", url: "https://quran.kemenag.go.id" }],
  },
];
