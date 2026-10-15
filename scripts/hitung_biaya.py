#!/usr/bin/env python3
"""Kalkulator biaya Surau. Ubah tabel HARGA atau SKENARIO, lalu jalankan ulang:

    python3 scripts/hitung_biaya.py

Harga dalam USD per 1 juta token, dicek 2026-10-15 (lihat docs/08-biaya.md).
Jumlah token diukur dengan tokenizer o200k (OpenAI) pada teks Ihya; tokenizer
lain bisa menghitung teks Arab lebih banyak, jadi pakai FAKTOR_TOKEN_ARAB untuk
uji sensitivitas.
"""

FAKTOR_TOKEN_ARAB = 1.0  # ubah ke 1.5 atau 2.0 untuk skenario tokenizer boros

# nama: (input, cache_read, output)
HARGA = {
    "Qwen3.7-Flash (≤32k)":      (0.03, 0.03, 0.13),
    "DeepSeek V4 Flash (DeepInfra)": (0.06, 0.015, 0.18),
    "Claude Haiku 5.5 (≤100k)":  (0.10, 0.01, 0.50),
    "GPT-6 Luna":                (0.10, 0.01, 0.50),
    "Gemini 3.1 Flash-Lite":     (0.25, 0.025, 1.50),
    "Gemini 3.8 Flash":          (0.75, 0.075, 3.75),
    "Gemini 3.8 Flash (Jan 2027)": (1.50, 0.15, 7.50),
    "Claude Sonnet 5.5":         (2.00, 0.20, 10.00),
    "Gemini 3.1 Pro":            (2.00, 0.20, 12.00),
    "Claude Opus 5.5":           (4.00, 0.20, 20.00),
    "GPT-5.5":                   (5.00, 0.50, 30.00),
}
JEV_PER_M = 0.042  # TypeSafe Jev: hanya token input yang dibayar

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
# Per 1 juta token teks utama (o200k): masukan dibaca sekian kali, keluaran sekian juta token.
INGEST = {
    "Ringkasan ID+EN per bagian":     dict(baca=1.0, keluar=0.07),
    "Terjemahan Indonesia lengkap":   dict(baca=1.0, keluar=0.85),
    "Ekstraksi wiki (2 putaran)":     dict(baca=2.0, keluar=0.33),
}
KORPUS = {"Ihya": 1.8, "±92 kitab kurikulum": 98.0}  # juta token o200k


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
    campuran = {"jawaban terverifikasi (cache)": 0.30, "mode Cari (DB + Jev)": 0.30, "mode Jawab (C)": 0.40}
    print("\nBiaya bulanan dengan campuran:", campuran)
    print(f"{'Model untuk mode Jawab':32} {'1rb/bln':>10} {'10rb/bln':>10} {'100rb/bln':>11}")
    cari = 15.0 * JEV_PER_M / 1000  # Jev saja
    for m in ["Claude Haiku 5.5 (≤100k)", "Gemini 3.1 Flash-Lite", "Gemini 3.8 Flash", "Claude Sonnet 5.5", "Gemini 3.1 Pro"]:
        per_q = campuran["mode Cari (DB + Jev)"] * cari + campuran["mode Jawab (C)"] * biaya(m, SKENARIO["C. Haiku + Citations"])
        print(f"{m:32} " + " ".join(f"{'$%.2f' % (per_q * n):>10}" for n in (1_000, 10_000)) + f" {'$%.2f' % (per_q * 100_000):>11}")

    model_ingest = "Claude Haiku 5.5 (≤100k)"
    inp, _, out = HARGA[model_ingest]
    print(f"\nIngest batch dengan {model_ingest} (diskon 50%):")
    print(f"{'Pekerjaan':32} " + " ".join(f"{k:>22}" for k in KORPUS))
    total = {k: 0.0 for k in KORPUS}
    for nama, t in INGEST.items():
        sel = []
        for k, juta in KORPUS.items():
            c = juta * (t["baca"] * FAKTOR_TOKEN_ARAB * inp + t["keluar"] * out) * 0.5
            total[k] += c
            sel.append(f"{'$%.2f' % c:>22}")
        print(f"{nama:32} " + " ".join(sel))
    print(f"{'TOTAL':32} " + " ".join(f"{'$%.2f' % v:>22}" for v in total.values()))


if __name__ == "__main__":
    main()
