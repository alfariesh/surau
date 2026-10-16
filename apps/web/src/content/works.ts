// Nama tampilan berhuruf Latin untuk sitasi berbahasa Indonesia ("Salin sitasi", S09). DB korpus
// menyimpan nama pengarang lengkap (name_id) dan nama penerbit berhuruf Arab; sitasi ringkas
// memakai bentuk yang lazim di catatan kaki Indonesia. Bila karya/edisi belum ada di sini, sitasi
// memakai data DB apa adanya (ADR-034).

export const CITE_AUTHOR: Readonly<Record<string, string>> = {
  ihya: "al-Ghazali",
};

/** Kunci: `<slug karya>/<slug edisi>`. */
export const CITE_PUBLISHER: Readonly<Record<string, string>> = {
  "ihya/dar-al-marifah": "Dar al-Ma'rifah",
};
