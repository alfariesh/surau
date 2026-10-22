// Teks /tinjau/terjemahan (X08, ADR-081): koreksi terjemahan Indonesia oleh editor terdaftar.
import type { TranslationIssueCode } from "@surau/core";

export const translationReviewText = {
  title: "Koreksi terjemahan",
  eyebrow: "Ruang editor",
  intro:
    "Setiap butir adalah satu paragraf Ihya dengan terjemahan AI-nya. Nyatakan sudah benar, atau perbaiki terjemahannya. Teks Arab diambil dari kitab dan tidak bisa diubah.",
  notRegisteredTitle: "Akun ini belum terdaftar sebagai editor terjemahan",
  notRegisteredBody:
    "Kirim kode di bawah kepada pemilik Surau lewat jalur yang biasa Anda pakai, misalnya WhatsApp pribadinya. Setelah akun didaftarkan, muat ulang halaman ini. Kode ini bukan email dan bukan kata sandi; ia hanya menandai akun masuk Anda.",
  code: "Kode akun",
  copy: "Salin kode",
  copied: "Kode tersalin.",
  roleDeniedTitle: "Ruang ini bukan untuk akun Anda",
  roleDeniedBody:
    "Akun ini terdaftar sebagai editor terjemahan. Bagian ini belum dibuka untuk akun Anda. Bila perlu, minta pemilik membukanya.",
  openTranslations: "Buka Koreksi terjemahan",
  howTitle: "Cara mengoreksi",
  how: [
    "Baca teks Arab (dari kitab), lalu terjemahan di bawahnya.",
    "Sudah benar: maknanya setia. Gaya bahasa yang kurang halus bukan alasan memperbaiki.",
    "Perbaiki: tulis ulang terjemahannya dan alasan singkat, misalnya istilah wara' kurang tepat.",
    "⟦QS 2:255⟧ adalah tempat terjemahan ayat dari Kemenag. Jangan diubah, dihapus, atau diterjemahkan sendiri.",
    "(١) adalah penanda catatan kaki. Boleh dipindah ke kata yang tepat, atau ditambahkan bila ada di teks Arab.",
    "Kata tambahan Anda yang tidak ada di teks Arab ditulis dalam kurung siku, misalnya [yaitu shalat]. Di pembaca, semua kurung siku di teks perbaikan tampil redup sebagai tambahan penerjemah; kurung siku dari terjemahan AI yang bukan tambahan, misalnya [ayat 26], ubah menjadi kurung biasa (ayat 26).",
    "Tanpa huruf Arab: tulis istilah dengan huruf Latin.",
    "Koreksi tersimpan langsung, lalu tampil di situs setelah korpus berikutnya dibangun (sekitar sebulan sekali), dengan label nama Anda.",
    "Salah tekan? Tombol Batalkan mengembalikan keadaan sebelumnya. Riwayat tidak pernah dihapus.",
  ],
  filter: "Tampilkan",
  filters: {
    todo: "Belum ditinjau",
    done: "Sudah ditinjau",
    stale: "Perlu ditinjau ulang",
  },
  progress: (done: number, total: number) =>
    `Sudah ditinjau ${done.toLocaleString("id-ID")} dari ${total.toLocaleString("id-ID")} paragraf berterjemahan.`,
  daily: (used: number, limit: number) =>
    `Simpanan Anda hari ini: ${used.toLocaleString("id-ID")} dari ${limit.toLocaleString("id-ID")} (hitungan mulai lagi pukul 07.00 WIB).`,
  list: "Pilih paragraf",
  reasons: {
    laporan: "laporan pembaca",
    maknaz: "dikutip Maknaz",
    catatan_kaki: "catatan kaki",
  },
  itemOption: (location: string, reasons: readonly string[], by: string | null) =>
    [location, ...reasons, by === null ? "" : `oleh ${by}`].filter((s) => s !== "").join(" · "),
  previous: "Sebelumnya",
  next: "Berikutnya",
  openLabel: "Buka paragraf lain",
  openHint:
    "Tempel tautan paragraf dari pembaca (menu ⋮ paragraf → Bagikan tautan) atau kodenya, misalnya p2824.",
  open: "Buka",
  openInvalid: "Tautan atau kode paragraf tidak dikenali.",
  notFound: "Paragraf tidak ditemukan atau belum punya terjemahan.",
  empty: "Tidak ada paragraf di daftar ini.",
  loading: "Memuat paragraf…",
  failed: "Tidak berhasil memuat. Coba muat ulang halaman.",
  openReader: "Buka di pembaca",
  arabic: "Teks Arab (dari kitab)",
  current: "Terjemahan sekarang",
  state: {
    ai: "Terjemahan AI, belum ditinjau",
    confirmed: (by: string) => `Diperiksa ${by}: sudah benar`,
    revised: (by: string) => `Dikoreksi ${by}`,
    corpus: "Sudah ditinjau di korpus",
  },
  stale: {
    source: "Teks Arab paragraf ini berubah sejak ditinjau. Tinjau ulang.",
    draft: "Terjemahan AI paragraf ini sudah diganti sejak dinyatakan benar. Tinjau ulang.",
  },
  notLive: "Belum tampil di pembaca: koreksi tayang lewat korpus berikutnya.",
  aiMeta: (model: string, prompt: string, date: string) =>
    `Draf AI: ${model} · ${prompt} · ${date}`,
  reported: (n: number) => `Dilaporkan pembaca ${n}×`,
  cited: (n: number) => `Dikutip Maknaz ${n}×`,
  check: "Pemeriksaan otomatis teks sekarang",
  checkOk: "Tidak ada masalah format.",
  actions: "Keputusan",
  confirm: "Sudah benar",
  confirmDisabled:
    "Sudah benar hanya untuk terjemahan AI yang belum ditinjau dan lolos pemeriksaan otomatis; selain itu pilih Perbaiki.",
  revise: "Perbaiki",
  revert: "Batalkan perubahan terakhir",
  revertTo: (target: string) => `Kembali ke: ${target}`,
  targetAi: "terjemahan AI",
  textLabel: "Terjemahan perbaikan",
  textHint:
    "Teks polos. ⟦QS …⟧ = terjemahan ayat Kemenag (jangan diubah). (١) = penanda catatan kaki. [ … ] = kata tambahan Anda.",
  preview: "Pratinjau seperti di pembaca",
  reason: "Alasan singkat",
  reasonHint: "Wajib untuk perbaikan. Huruf Latin, tanpa data pribadi.",
  note: "Catatan (opsional)",
  noteHint: "Huruf Latin, tanpa data pribadi.",
  saveRevise: "Simpan perbaikan",
  saveConfirm: "Simpan: sudah benar",
  saveRevert: "Ya, batalkan",
  cancel: "Tutup",
  saved: "Tersimpan.",
  conflict:
    "Paragraf ini baru saja diubah. Muat ulang untuk melihat versi terbaru, lalu ulangi bila perlu.",
  limit: "Batas simpanan hari ini sudah tercapai. Lanjutkan besok.",
  unchanged: "Teks belum diubah.",
  notAllowed: "Aksi ini tidak berlaku untuk keadaan paragraf sekarang. Muat ulang halaman.",
  invalidText: "Perbaikan belum bisa disimpan:",
  saveFailed: "Belum tersimpan. Periksa isian atau masuk ulang bila sesi berakhir.",
  history: "Riwayat",
  noHistory: "Belum ada riwayat.",
  kinds: { confirmed: "sudah benar", revised: "perbaikan", reverted: "pembatalan" },
  statuses: {
    active: "berlaku",
    superseded: "digantikan",
    proposed: "usulan",
    approved: "disetujui",
    rejected: "ditolak",
  },
  restores: (id: number | null) =>
    id === null ? "kembali ke terjemahan AI" : `kembali ke riwayat #${id}`,
  issues: {
    empty: () => "Teks kosong.",
    too_long: () => "Teks terlalu panjang (maksimal 8.000 karakter).",
    control_chars: () =>
      "Ada karakter tak terlihat (misalnya pembalik arah teks). Ketik ulang bagian yang ditempel.",
    markup: () => "Tanpa format: hapus tanda HTML, Markdown (**, _, #, -), atau tautan.",
    arabic_letters: () => "Ada huruf Arab. Tulis istilah dengan huruf Latin.",
    placeholder_missing: (d?: string) =>
      `Penanda ayat ${d ?? ""} hilang. Kembalikan persis seperti semula.`,
    placeholder_unexpected: (d?: string) =>
      `Penanda ayat ${d ?? ""} tidak ada di teks Arab paragraf ini, atau tertulis dua kali.`,
    marker_unknown: (d?: string) =>
      `Penanda catatan kaki ${d ?? ""} tidak ada di teks Arab, atau tertulis terlalu banyak.`,
    marker_missing: (d?: string) =>
      `Penanda catatan kaki ${d ?? ""} belum ada di terjemahan (boleh ditambahkan).`,
    brackets_unbalanced: () => "Kurung siku [ ] belum berpasangan.",
    quotes_unbalanced: () => "Tanda petik ganda belum berpasangan.",
  } satisfies Record<TranslationIssueCode, (detail?: string) => string>,
} as const;
