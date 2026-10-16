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
