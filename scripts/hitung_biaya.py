#!/usr/bin/env python3
"""Kalkulator biaya Surau. Ubah tabel HARGA atau SKENARIO, lalu jalankan ulang:

    python3 scripts/hitung_biaya.py

Harga dalam USD per 1 juta token, dicek 2026-10-15 (lihat docs/08-biaya.md dan
implementasi/STACK.md). Jumlah token diukur dengan tokenizer o200k (OpenAI) pada
teks Ihya. FAKTOR_TOKEN_ARAB = token Claude ÷ token o200k untuk teks Arab Ihya,
diukur di S13 dengan count_tokens (Claude Haiku 5.5, 200 paragraf acak:
0,716 token/karakter vs 0,39; data/reports/ihya-9472-token.md). Model lain belum
diukur; ubah faktor untuk uji sensitivitas.
"""

FAKTOR_TOKEN_ARAB = 1.84  # terukur S13 untuk Claude Haiku 5.5 (sebelumnya asumsi 1,0–2,0)

# Sumber harga (USD per 1 juta token), semua dicek 2026-10-15:
# - Claude Haiku/Sonnet/Opus 5.5: https://platform.claude.com/docs/en/about-claude/pricing
#   Baca cache Sonnet 5.5 = 0.10 (dikoreksi dari 0.20 setelah dicek ke halaman resmi);
#   Opus 5.5 = 0.20. Haiku 5.5 di atas 100k token prompt (termasuk token cache):
#   0.50 / 0.05 / 2.50. Tulis cache 5 menit (Haiku 0.125, Sonnet 2.50, Opus 5.00)
#   tidak dimodelkan di sini.
# - Model lain: halaman harga resmi tiap penyedia (Google ai.google.dev, OpenAI,
#   DeepSeek, Alibaba Model Studio, DeepInfra), dikumpulkan 2026-10-15; rinciannya di
#   docs/riset/2026-10-15-catatan-riset.md.
# - Jev: https://docs.typesafe.ai/models.md (dicek 2026-10-15).
# nama: (input, cache_read, output)
HARGA = {
    "Qwen3.7-Flash (≤32k)":      (0.03, 0.03, 0.13),
    "DeepSeek V4 Flash (DeepInfra)": (0.06, 0.015, 0.18),
    "Claude Haiku 5.5 (≤100k)":  (0.10, 0.01, 0.50),
    "GPT-6 Luna":                (0.10, 0.01, 0.50),
    "Gemini 3.1 Flash-Lite":     (0.25, 0.025, 1.50),
    "Gemini 3.8 Flash":          (0.75, 0.075, 3.75),
    "Gemini 3.8 Flash (Jan 2027)": (1.50, 0.15, 7.50),
    "Claude Sonnet 5.5":         (2.00, 0.10, 10.00),
    "Gemini 3.1 Pro":            (2.00, 0.20, 12.00),
    "Claude Opus 5.5":           (4.00, 0.20, 20.00),
    "GPT-5.5":                   (5.00, 0.50, 30.00),
}
JEV_PER_M = 0.042  # TypeSafe Jev: hanya token input yang dibayar
# Fase 2: mode Cari = FTS5 di D1 tanpa LLM/Jev (biaya marginal ±$0). Ubah ke True hanya untuk
# simulasi bila Jev kelak diuji sebagai gerbang "tidak ditemukan" (belum dijadwalkan).
CARI_PAKAI_JEV = False

# Token per pertanyaan (ribuan). "arab" = bagian yang dipengaruhi tokenizer Arab.
SKENARIO = {
    # Agen bebas: 3 putaran, daftar isi + sistem di-cache, bagian kitab dibaca di putaran akhir.
    "A. Agen (3 putaran)": dict(cache=20.0, baru=24.0, arab_frac=0.8, keluar=1.8, jev=0.0),
    # Pipeline hemat: Jev memilih bagian, lalu 1 panggilan LLM. Kutipan Arab disisipkan
    # oleh kode, jadi LLM hanya menulis penjelasan + ID kutipan.
    "B. Pipeline hemat": dict(cache=2.0, baru=10.0, arab_frac=0.9, keluar=0.8, jev=30.0),
    # Pilihan v1: model yang sama memilih bagian dari daftar isi yang di-cache, lalu menjawab
    # dengan Citations (teks kutipan tidak ditagih sebagai output). Keluaran termasuk thinking
    # di effort "low".
    "C. Haiku + Citations": dict(cache=10.5, baru=10.6, arab_frac=0.9, keluar=1.4, jev=0.0),
}

# Ingest batch: harga Message Batches = 50% dari harga biasa (berlaku juga untuk cache).
# Per 1 juta token teks utama (o200k):
#   baca   = masukan tanpa cache (teks Arab + konteks), kelipatan teks; dikali FAKTOR_TOKEN_ARAB
#   sistem = juta token prompt sistem yang diulang per request (dibaca dari cache, atau ditulis
#            ulang bila cache meleset; cache batch best-effort)
#   keluar = juta token keluaran termasuk thinking (bahasa Indonesia/Inggris, tanpa faktor Arab)
# Terjemahan dan ringkasan TERUKUR di S13 (rencana batch: count_tokens semua request, keluaran dari
# uji kecil 20 paragraf + 10 ringkasan). Ekstraksi wiki masih asumsi (belum dijadwalkan).
INGEST = {
    "Ringkasan ID+EN per bagian":     dict(baca=2.13, sistem=1.83, keluar=0.33),
    "Terjemahan Indonesia lengkap":   dict(baca=2.49, sistem=39.4, keluar=2.42),
    "Ekstraksi wiki (2 putaran)":     dict(baca=2.0, sistem=0.0, keluar=0.33),
}
# Porsi prompt sistem yang terbaca dari cache di batch (S13: ±96% pada batch ringkasan pertama).
CACHE_BACA_SISTEM = 0.95
# Tulis cache 1 jam Claude Haiku 5.5 (≤100k), USD per 1 juta token; batch = 50%.
TULIS_CACHE_1J_HAIKU = 0.20
KORPUS = {"Ihya": 1.8, "±92 kitab kurikulum": 98.0}  # juta token o200k

# Sesi X04 (mutu baca): judul daftar isi Indonesia. Token ABSOLUT, bukan per juta token korpus.
# Karakter judul Arab diukur dari korpus ihya-v7 (2026-10-21, node:sqlite): 313 node daftar isi =
# 11.651 karakter, 106 di antaranya tanpa paragraf judul berterjemahan = 3.825 karakter; 271 calon
# subjudul "bayan" (paragraf pendek di teks, belum masuk daftar isi) = 11.294 karakter.
# Asumsi (belum diukur): satu request per rub' (5), prompt sistem + glosarium ±2 ribu token per
# request, keluaran ±30 token per judul (teks + ID dalam JSON) ditambah thinking ±40%.
X04_O200K_PER_KARAKTER = 0.39
X04_SISTEM_PER_REQUEST = 2_000
X04_REQUEST = 5
X04_KELUAR_PER_JUDUL = 30 * 1.4
X04_JUDUL = {
    "106 node tanpa terjemahan judul": dict(karakter=3_825, judul=106),
    "semua 313 node daftar isi": dict(karakter=11_651, judul=313),
    "313 node + 271 subjudul bayan": dict(karakter=22_945, judul=584),
}
# Pembanding untuk keputusan terjemahan ulang (T-17 tahap 3): tulis cache 1 jam Sonnet 5.5
# diasumsikan 2× harga input (USD per 1 juta token); batch = 50%.
TULIS_CACHE_1J_SONNET = 4.00


def biaya(model: str, s: dict) -> float:
    inp, cr, out = HARGA[model]
    baru = s["baru"] * (1 + (FAKTOR_TOKEN_ARAB - 1) * s["arab_frac"])
    return (s["cache"] * cr + baru * inp + s["keluar"] * out) / 1000 + s["jev"] * JEV_PER_M / 1000


def main() -> None:
    print(f"Faktor token Arab: {FAKTOR_TOKEN_ARAB}\n")
    print(f"{'Model':32} " + " ".join(f"{k:>22}" for k in SKENARIO))
    for m in HARGA:
        print(f"{m:32} " + " ".join(f"{'$%.4f' % biaya(m, s):>22}" for s in SKENARIO.values()))

    # Campuran lalu lintas: sebagian besar pertanyaan tidak perlu LLM sama sekali.
    campuran = {"jawaban terverifikasi (cache)": 0.30, "mode Cari (FTS5 D1)": 0.30, "mode Jawab (C)": 0.40}
    print("\nBiaya bulanan dengan campuran:", campuran)
    print(f"{'Model untuk mode Jawab':32} {'1rb/bln':>10} {'10rb/bln':>10} {'100rb/bln':>11}")
    # Cari = FTS5 di D1 (masuk kuota Workers Paid, ±$0). Jev hanya bila CARI_PAKAI_JEV.
    cari = 15.0 * JEV_PER_M / 1000 if CARI_PAKAI_JEV else 0.0
    for m in ["Claude Haiku 5.5 (≤100k)", "Gemini 3.1 Flash-Lite", "Gemini 3.8 Flash", "Claude Sonnet 5.5", "Gemini 3.1 Pro"]:
        per_q = campuran["mode Cari (FTS5 D1)"] * cari + campuran["mode Jawab (C)"] * biaya(m, SKENARIO["C. Haiku + Citations"])
        print(f"{m:32} " + " ".join(f"{'$%.2f' % (per_q * n):>10}" for n in (1_000, 10_000)) + f" {'$%.2f' % (per_q * 100_000):>11}")

    model_ingest = "Claude Haiku 5.5 (≤100k)"
    inp, cr, out = HARGA[model_ingest]
    sistem_per_m = CACHE_BACA_SISTEM * cr + (1 - CACHE_BACA_SISTEM) * TULIS_CACHE_1J_HAIKU
    print(f"\nIngest batch dengan {model_ingest} (diskon 50%, cache prompt sistem {CACHE_BACA_SISTEM:.0%}):")
    print(f"{'Pekerjaan':32} " + " ".join(f"{k:>22}" for k in KORPUS))
    total = {k: 0.0 for k in KORPUS}
    for nama, t in INGEST.items():
        sel = []
        for k, juta in KORPUS.items():
            c = juta * (t["baca"] * FAKTOR_TOKEN_ARAB * inp + t["sistem"] * sistem_per_m + t["keluar"] * out) * 0.5
            total[k] += c
            sel.append(f"{'$%.2f' % c:>22}")
        print(f"{nama:32} " + " ".join(sel))
    print(f"{'TOTAL':32} " + " ".join(f"{'$%.2f' % v:>22}" for v in total.values()))

    # Terjemahan ulang penuh dengan Sonnet 5.5 (batch), hanya pembanding bila T-17 tahap 3 buruk.
    s_inp, s_cr, s_out = HARGA["Claude Sonnet 5.5"]
    s_sistem = CACHE_BACA_SISTEM * s_cr + (1 - CACHE_BACA_SISTEM) * TULIS_CACHE_1J_SONNET
    t = INGEST["Terjemahan Indonesia lengkap"]
    ulang = KORPUS["Ihya"] * (t["baca"] * FAKTOR_TOKEN_ARAB * s_inp + t["sistem"] * s_sistem + t["keluar"] * s_out) * 0.5
    print(f"\nPembanding X04: terjemahan ulang Ihya penuh dengan Claude Sonnet 5.5 (batch): ${ulang:.2f}")

    print("\nX04 · judul daftar isi Indonesia (token absolut; tanpa batch = langsung, batch = 50%):")
    print(f"{'Cakupan':34} {'tok masuk':>10} {'tok keluar':>11} {'Sonnet langsung':>16} {'Haiku batch':>12}")
    for nama, j in X04_JUDUL.items():
        masuk = j["karakter"] * X04_O200K_PER_KARAKTER * FAKTOR_TOKEN_ARAB + X04_SISTEM_PER_REQUEST * X04_REQUEST
        keluar = j["judul"] * X04_KELUAR_PER_JUDUL
        sonnet = (masuk * s_inp + keluar * s_out) / 1e6
        haiku = (masuk * inp + keluar * out) / 1e6 * 0.5
        print(f"{nama:34} {masuk:>10,.0f} {keluar:>11,.0f} {'$%.3f' % sonnet:>16} {'$%.4f' % haiku:>12}")


if __name__ == "__main__":
    main()
