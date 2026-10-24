// Bagian `id.mcp` dari kamus UI (src/i18n/id.ts), dipisah per bagian (X09) supaya komponen
// klien hanya membawa string yang dipakainya.

export const mcp = {
  pageTitle: "Pakai Surau dengan AI",
  eyebrow: "Untuk pengguna Claude, ChatGPT, dan asisten AI lain",
  heading: "Pakai Surau dari AI Anda",
  lead: "Hubungkan asisten AI Anda ke perpustakaan Surau untuk mencari dan membaca Ihya karya al-Ghazali, dengan teks Arab asli dan tautan ke halaman cetaknya.",
  endpointHeading: "Satu alamat, tanpa akun Surau",
  endpointLead:
    "MCP adalah cara asisten AI mengakses sumber tambahan. Salin alamat ini saat diminta URL server atau connector:",
  cost: "Akses Surau gratis dan tanpa login. Paket, kuota, atau biaya asisten AI yang Anda gunakan tetap berlaku. Surau tidak menjalankan model AI saat Anda memakai koneksi ini.",
  connectHeading: "Hubungkan asisten Anda",
  officialGuide: "Panduan resmi",
  clients: [
    {
      id: "claude",
      name: "Claude.ai dan Claude Desktop",
      steps: [
        "Buka Customize → Connectors → + Add → Add custom connector. Pada tampilan lain, buka Settings → Connectors. Di akun organisasi, pengelola mungkin perlu mengaktifkan connector terlebih dahulu.",
        "Beri nama Surau, masukkan alamat di atas, lalu pilih No sign in sebagai metode autentikasi dan simpan. Claude Desktop memakai menu connector yang sama untuk server jarak jauh.",
        "Mulai percakapan baru, aktifkan Surau dari menu + → Connectors, lalu coba pertanyaan di bawah. Bila diminta, izinkan pencarian dan pembacaan dari Surau.",
      ],
      docs: "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp",
    },
    {
      id: "claude-code",
      name: "Claude Code",
      steps: [
        "Di aplikasi Terminal, jalankan perintah di bawah dari folder proyek Anda.",
        "Buka Claude Code, ketik /mcp untuk memeriksa koneksi Surau, lalu coba salah satu pertanyaan contoh. Izinkan tool Surau saat diminta.",
      ],
      command: "claude mcp add --transport http surau https://mcp.surau.org/mcp",
      docs: "https://code.claude.com/docs/en/mcp",
    },
    {
      id: "chatgpt",
      name: "ChatGPT",
      steps: [
        "Buka halaman Plugins di ChatGPT, lalu + → Add custom MCP server bila tersedia untuk akun Anda. Ketersediaan fitur mengikuti akun dan kebijakan organisasi; Developer mode mungkin perlu diaktifkan di Settings → Security and login.",
        "Isi nama Surau, deskripsi singkat perpustakaan Ihya, dan alamat server di atas. Pilih autentikasi tanpa login, tinjau izin baca tool, lalu buat dan pasang plugin.",
        "Di percakapan baru, ketik @ dan pilih Surau, lalu ajukan pertanyaan contoh. Ikuti panduan resmi bila nama menu di akun Anda berbeda.",
      ],
      docs: "https://developers.openai.com/api/docs/guides/custom-mcp-server",
    },
    {
      id: "klien-lain",
      name: "Klien MCP lain",
      steps: [
        "Tambahkan server jarak jauh dengan transport Streamable HTTP, alamat di atas, dan tanpa autentikasi. Pilih klien yang mendukung pemanggilan tool MCP.",
        "Untuk mencoba di Cloudflare AI Playground, buka Model mode → Custom MCP → Add server, isi Server URL, lalu Add server. Biaya atau kuota model mengikuti layanan yang Anda pilih.",
      ],
      docs: "https://developers.cloudflare.com/agents/model-context-protocol/guides/test-remote-mcp-server/",
    },
  ],
  examplesHeading: "Coba pertanyaan ini",
  examplesLead:
    "Sebut Surau supaya asisten memakai sumber yang baru Anda hubungkan. Anda bisa menyalin contoh berikut:",
  examples: [
    "Gunakan Surau untuk mencari adab murid kepada guru dalam Ihya. Baca salah satu halaman hasilnya dan sertakan edisi, jilid, halaman, serta tautan sumber.",
    "Gunakan Surau untuk membaca Ihya jilid 1 halaman 200. Jelaskan isinya dalam bahasa Indonesia, tandai terjemahan AI, dan sertakan sumbernya.",
    "Ambil satu kutipan pendek dari halaman Ihya yang tadi dibaca melalui Surau. Periksa dengan verify_quote sebelum menampilkannya, lalu sertakan teks yang cocok dan tautan paragraf. Jika membahas status hadits, periksa get_hadith_takhrij; bila tidak ada takhrij, katakan status belum diketahui.",
  ],
  checkHeading: "Periksa jawaban yang Anda terima",
  checkLead:
    "Jawaban akhir ditulis oleh asisten AI Anda. Koneksi ke Surau memberi sumber, tetapi asisten masih bisa salah memahami atau mengabaikan instruksi. Alur yang bisa Anda minta:",
  checks: [
    "Cari pembahasan dengan search_text, lalu baca konteksnya dengan read_page atau read_section. Potongan hasil pencarian belum tentu mewakili pendapat penulis secara utuh.",
    "Untuk kutipan Arab, minta verify_quote dan gunakan teks hasil verifikasi. Kecocokan kutipan membuktikan teksnya ada, bukan membuktikan penafsiran AI benar.",
    "Pastikan ada nama karya dan edisi, jilid, halaman cetak, serta tautan yang bisa dibuka di Surau. Bedakan pendapat al-Ghazali dari pendapat yang ia nukil atau bantah.",
  ],
  readerLink: "Coba periksa halaman tentang adab belajar di pembaca Surau",
  limitsHeading: "Yang perlu diketahui",
  limits: [
    "Korpus saat ini hanya Ihya 'Ulum ad-Din, edisi Dar al-Ma'rifah, empat jilid. Bila rujukan tidak ditemukan, minta AI mengatakannya dengan jelas.",
    "Terjemahan dan ringkasan berlabel AI bisa keliru. Kutipan ayat yang dikenali sistem menyediakan teks Tanzil serta terjemahan Kemenag; pencocokan ayat belum sempurna.",
    "Status hadits mengikuti teks takhrij al-'Iraqi yang tertaut. Tanpa takhrij, status belum diketahui. Surau membantu riset dan belajar; keputusan hukum pribadi tetap perlu dibahas dengan ulama.",
    "Satu halaman cetak dapat menghasilkan jawaban tool yang panjang. Untuk bacaan bertahap, minta read_section dan lanjutkan dengan next_cursor bila tersedia.",
    "Pertanyaan Anda mengikuti kebijakan layanan AI yang dipakai. Surau membatasi frekuensi permintaan agar akses bersama tetap tersedia.",
  ],
  troubleHeading: "Jika belum tersambung",
  troubles: [
    {
      title: "Menu connector atau plugin tidak tersedia",
      body: "Periksa panduan resmi dan izin akun atau organisasi Anda. Nama menu dan ketersediaan fitur bisa berubah. Anda tetap bisa memakai pembaca dan pencarian di situs Surau.",
    },
    {
      title: "Diminta login ke Surau",
      body: "Periksa bahwa alamatnya berakhir dengan /mcp dan metode autentikasinya tanpa login (No sign in atau padanannya). Surau tidak meminta API key.",
    },
    {
      title: "Terlalu banyak permintaan atau rate_limited",
      body: "Tunggu sekitar satu menit, lalu coba lagi dengan satu pertanyaan. Pengguna layanan AI yang sama dapat berbagi batas jaringan.",
    },
    {
      title: "Halaman tidak ditemukan atau hasil terlalu panjang",
      body: "Minta AI mencari dengan search_text terlebih dahulu dan memakai alamat dari hasilnya. Untuk bacaan panjang, gunakan read_section per potongan.",
    },
  ],
  licenseHeading: "Sumber dan lisensi tetap ikut",
  license:
    "Saat memakai ulang hasil Surau, pertahankan sitasi dan atribusi sumbernya. Konten kitab memakai CC BY-NC-SA 4.0: sebut sumber, gunakan untuk tujuan nonkomersial, dan bagikan adaptasi dengan lisensi yang sama. Teks Tanzil dan terjemahan Kemenag memiliki ketentuan sumber masing-masing yang ikut di hasil tool.",
  licenseMore: "Baca lisensi, atribusi, dan cara meminta koreksi",
} as const;
