// Teks /tinjau/takhrij (X07): antrean tinjauan label status hadits untuk penilai.
export const takhrijReviewText = {
  title: "Tinjau label status hadits",
  eyebrow: "Ruang penilai",
  intro:
    "Setiap butir adalah satu catatan kaki takhrij al-'Iraqi. Labelnya disusun otomatis dari istilah yang tertulis di teks takhrij. Setujui bila tepat, atau koreksi jenis istilahnya.",
  howTitle: "Cara meninjau",
  how: [
    "Istilah yang disorot dikenali kode dari kata kuncinya. Arti di sampingnya adalah arti baku yang dipakai label.",
    "Setujui bila semua istilah yang disorot memang penilaian takhrij dan artinya tepat.",
    'Koreksi bila ada istilah yang keliru (misalnya kata itu bagian dari lafaz hadits) atau ada penilaian yang terlewat. Pilih jenis istilah yang benar; teks takhrij tidak perlu diketik ulang. Jenis yang tidak tertulis sebagai istilah di teks tampil di Jawab sebagai "menurut peninjau", bukan isi takhrij.',
    "Koreksi berlaku per jenis istilah: bila satu jenis muncul dua kali (satu di lafaz, satu penilaian), keduanya ikut dipilih atau dibuang. Jelaskan kasus seperti ini di catatan.",
    "Pilih ragu bila perlu dibahas. Label otomatis tetap dipakai sampai ada keputusan.",
    "Keputusan ustadz peninjau dipakai Jawab: label yang disetujui tampil sebagai ditinjau ustadz, dan koreksi menggantikan label otomatis.",
  ],
  filter: "Tampilkan",
  filters: {
    todo: "Belum ditinjau",
    unsure: "Perlu dibahas",
    done: "Sudah ditinjau",
  },
  progress: (done: number, total: number) =>
    `Sudah ditinjau ${done.toLocaleString("id-ID")} dari ${total.toLocaleString("id-ID")} catatan kaki takhrij.`,
  list: "Pilih catatan kaki",
  itemOption: (location: string, cites: number, mixed: boolean) =>
    [location, cites > 0 ? `dikutip ${cites}×` : "", mixed ? "berbeda per jalur" : ""]
      .filter((s) => s !== "")
      .join(" · "),
  previous: "Sebelumnya",
  next: "Berikutnya",
  empty: "Tidak ada catatan kaki di daftar ini.",
  loading: "Memuat catatan kaki…",
  failed: "Tidak berhasil memuat. Coba muat ulang halaman.",
  footnote: "Catatan kaki takhrij",
  openReader: "Buka di pembaca",
  hadithAt: "Hadits di matan",
  cites: (n: number) => `Dikutip Jawab ${n}×`,
  mixed: "Berbeda per jalur",
  weak: "Memuat istilah kelemahan",
  staleReview: "Label berubah sejak ditinjau; tinjau ulang",
  takhrijText: "Teks takhrij dari kitab (istilah yang dikenali disorot)",
  autoLabel: "Label otomatis",
  terms: "Istilah yang dikenali",
  noTerms:
    "Tidak ada istilah penilaian yang dikenali; takhrij ini hanya menyebut sumber atau merujuk takhrij lain.",
  currentLabel: "Yang dipakai Jawab sekarang",
  current: {
    rule: "dikenali otomatis, belum ditinjau",
    approved: "ditinjau ustadz",
    corrected: "dikoreksi ustadz",
  },
  added: "Ditetapkan peninjau (tanpa istilah baku di teks)",
  reviewer: "Nama penilai",
  reviewerHint:
    "Isi nama Anda sendiri dengan huruf Latin. Keputusan dipakai Jawab hanya dari akun ustadz peninjau yang didaftarkan pemilik dengan nama Anas; nama atau akun lain tersimpan sebagai uji.",
  notUstadz:
    "Akun ini belum terdaftar sebagai ustadz peninjau: keputusan tersimpan, tetapi belum dipakai Jawab. Setelah Anas menyimpan keputusan pertamanya, pemilik meminta agent mendaftarkan akunnya (T-24).",
  decision: "Keputusan",
  decisions: {
    approved: "Setujui label",
    corrected: "Koreksi jenis istilah",
    unsure: "Ragu, perlu dibahas",
  },
  kinds: "Jenis istilah yang benar",
  kindsHint:
    "Centang semua penilaian yang memang disebut takhrij ini. Yang terdeteksi kode sudah dicentang.",
  detected: "terdeteksi",
  preview: "Label sesudah koreksi",
  note: "Catatan (tidak tampil di Jawab)",
  noteHint:
    "Opsional, huruf Latin (rujuk istilah dengan transliterasi). Jelaskan alasan koreksi atau keraguan. Jangan memasukkan data pribadi.",
  save: "Simpan dan lanjut",
  saved: "Keputusan tersimpan.",
  saveFailed: "Keputusan belum tersimpan. Periksa isian atau masuk ulang bila sesi berakhir.",
  stale:
    "Label catatan kaki ini sudah berubah. Muat ulang halaman, lalu tinjau labelnya yang baru.",
  past: "Keputusan tersimpan",
  noReviews: "Belum ada keputusan.",
  pastStale: "untuk label lama",
  rules: (v: number) => `Aturan istilah versi ${v}.`,
} as const;
