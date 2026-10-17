// Data tampilan per karya/edisi yang tidak ada di DB korpus (S09, ADR-034). Karya atau edisi yang
// belum terdaftar di sini tetap tampil dengan data DB apa adanya dan teks umum.

/**
 * Nama tampilan berhuruf Latin untuk sitasi berbahasa Indonesia ("Salin sitasi"). DB korpus
 * menyimpan nama pengarang lengkap (name_id) dan nama penerbit berhuruf Arab; sitasi ringkas
 * memakai bentuk yang lazim di catatan kaki Indonesia.
 */
export const CITE_AUTHOR: Readonly<Record<string, string>> = {
  ihya: "al-Ghazali",
};

/** Kunci: `<slug karya>/<slug edisi>`. */
export const CITE_PUBLISHER: Readonly<Record<string, string>> = {
  "ihya/dar-al-marifah": "Dar al-Ma'rifah",
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

/**
 * Rincian atribusi per edisi untuk halaman /lisensi (S10, ADR-018, ADR-021). Halaman itu statis
 * (tanpa baca D1), jadi isinya diringkas dari data/ATTRIBUTION.md. Tes menjaga kalimat atribusi dan
 * semua tautannya sama persis; teks peran dan perubahan disunting tangan bila ATTRIBUTION.md berubah.
 */
export const EDITION_CREDITS: readonly EditionCredit[] = [
  {
    key: "ihya/dar-al-marifah",
    workSlug: "ihya",
    title: "Ihya' 'Ulum ad-Din",
    author: "al-Ghazali (w. 505 H)",
    attribution:
      "Teks: OpenITI 2025.1.9 (CC BY-NC-SA 4.0), versi Shamela0009472 & JK000001; digitalisasi asal: al-Maktaba al-Shamela; edisi: Dar al-Ma'rifah, Beirut 1402/1982",
    parties: [
      {
        name: "OpenITI (Open Islamicate Texts Initiative), rilis 2025.1.9",
        role: "Rilis berlisensi CC BY-NC-SA 4.0 yang menjadi dasar hak pakai teks.",
        link: { label: "Zenodo", url: "https://zenodo.org/records/17767721" },
      },
      {
        name: "al-Maktaba al-Shamela",
        role: "Digitalisasi asal edisi ini (kitab no. 9472). Teks utama, struktur judul, dan catatan kaki dibangun dari salinan Shamela, lalu diverifikasi identik dengan rilis OpenITI di atas. Setiap halaman Surau menautkan halaman yang sama di Shamela.",
        link: { label: "shamela.ws", url: "https://shamela.ws/book/9472" },
      },
      {
        name: "Dar al-Ma'rifah, Beirut",
        role: "Penerbit edisi cetak: 4 jilid, 1402 H / 1982 M. Nomor jilid dan halaman di Surau mengikuti cetakan ini.",
        link: {
          label: "pindaian di archive.org (hanya ditautkan)",
          url: "https://archive.org/details/ihya-ghazali",
        },
      },
      {
        name: "Zain ad-Din al-'Iraqi (w. 806 H)",
        role: "Penulis takhrij al-Mughni 'an Haml al-Asfar yang menjadi catatan kaki edisi ini.",
      },
    ],
    changes: [
      "HTML Shamela dibersihkan secara otomatis dan teks dibagi per paragraf; huruf teks Arab tidak diubah.",
      "Takhrij yang tercampur ke teks utama dipindah ke catatan kaki dan ditandai “perlu ditinjau”.",
      "Daftar isi diperbaiki lewat patch yang tercatat: dua kitab Rub' al-Munjiyat yang hilang ditambahkan dan satu bayan dikembalikan ke levelnya.",
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
