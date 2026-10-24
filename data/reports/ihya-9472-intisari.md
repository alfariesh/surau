# Intisari: laporan pilot (X15b)

Sumber korpus: staging ihya-v8 (SELECT) · dibuat 2026-10-24T17:36:40.923Z · node dalam cakupan: 21, dengan Intisari: 21.

| Node | Tingkat | Asal | Status | Model | Gagasan | Kutipan | Istilah | Dibuang |
|---|---|---|---|---|---|---|---|---|
| 100003 | book | mixed | lolos | claude-sonnet-5-5 | 8 | 3 | 8 | 0 |
| 100004 | section | children | lolos | claude-haiku-5-5 | 7 | 2 | 5 | 0 |
| 100005 | section | text | lolos | claude-haiku-5-5 | 5 | 1 | 4 | 0 |
| 100006 | section | text | lolos | claude-haiku-5-5 | 4 | 0 | 4 | 1 |
| 100007 | section | text | lolos | claude-haiku-5-5 | 7 | 1 | 4 | 0 |
| 100008 | section | text | lolos | claude-haiku-5-5 | 6 | 2 | 2 | 0 |
| 100009 | section | mixed | lolos | claude-haiku-5-5 | 7 | 2 | 5 | 0 |
| 100010 | section | text | lolos | claude-haiku-5-5 | 7 | 2 | 4 | 0 |
| 100011 | section | mixed | lolos | claude-haiku-5-5 | 7 | 0 | 3 | 0 |
| 100012 | section | text | lolos | claude-haiku-5-5 | 5 | 2 | 5 | 6 |
| 100013 | section | text | lolos | claude-haiku-5-5 | 7 | 1 | 5 | 0 |
| 100014 | section | mixed | lolos | claude-haiku-5-5 | 7 | 2 | 5 | 0 |
| 100015 | section | text | lolos | claude-haiku-5-5 | 6 | 1 | 5 | 0 |
| 100016 | section | text | lolos | claude-haiku-5-5 | 6 | 1 | 5 | 0 |
| 100017 | section | mixed | lolos | claude-haiku-5-5 | 7 | 2 | 5 | 0 |
| 100018 | section | text | lolos | claude-haiku-5-5 | 6 | 1 | 4 | 0 |
| 100019 | section | text | lolos | claude-haiku-5-5 | 6 | 1 | 4 | 0 |
| 100020 | section | children | lolos | claude-haiku-5-5 | 7 | 2 | 5 | 0 |
| 100021 | section | text | lolos | claude-haiku-5-5 | 7 | 1 | 3 | 1 |
| 100022 | section | text | lolos | claude-haiku-5-5 | 6 | 1 | 2 | 0 |
| 100023 | section | text | lolos | claude-haiku-5-5 | 7 | 1 | 5 | 0 |

## Butir yang dibuang validator (hasil yang berlaku)

- over_limit: 5
- banned: 3
- ayah: 2
- basis_over_limit: 1

## Respons yang ditolak / gagal (semua percobaan)

- stale_input: 10
- invalid:abstract: 1

## Ukuran blok

Kutipan tahap leaf yang lolos: 21; terpotong 1, > 300 karakter 0; bermasalah 1 (4.8%; ambang cadangan ADR-097: > 10%).

## Biaya aktual

| Batch | Jenis | Model | Request | Biaya |
|---|---|---|---|---|
| 01-digest-leaf | digest-leaf | claude-haiku-5-5 | 22 | $0.0670 |
| 02-digest-merge | digest-merge | claude-haiku-5-5 | 7 | $0.0215 |
| 03-digest-merge | digest-merge | claude-haiku-5-5 | 1 | $0.0021 |
| 04-digest-book | digest-book | mixed | 2 | $0.0764 |
| 05-digest-leaf | digest-leaf | claude-haiku-5-5 | 22 | $0.0571 |
| 06-digest-leaf-retry | digest-leaf | claude-haiku-5-5 | 1 | $0.0009 |
| 07-digest-merge | digest-merge | claude-haiku-5-5 | 7 | $0.0175 |
| 08-digest-merge | digest-merge | claude-haiku-5-5 | 1 | $0.0025 |
| 09-digest-book | digest-book | mixed | 2 | $0.0660 |
| glosarium (API biasa) | definisi | claude-sonnet-5-5 | 2 | $0.1292 |

**Total: $0.4400** (batch $0.3109 + glosarium $0.1292); definisi glosarium berlaku: 144.

## Intisari Kitab: Sonnet 5.5 dibanding Haiku 5.5

| Node | Model | Gagasan | Kata/gagasan | Kutipan | Istilah | Dibuang | Biaya |
|---|---|---|---|---|---|---|---|
| 100003 | claude-sonnet-5-5 | 8 | 140 | 3 | 8 | 0 | $0.0599 |
| 100003 | claude-haiku-5-5 | 10 | 141 | 3 | 8 | 0 | $0.0060 |
