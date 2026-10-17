# Token Arab Ihya di tokenizer Claude (S13)

Diukur 2026-10-17 dengan `messages.countTokens` (model `claude-haiku-5-5`, gratis) pada 200 paragraf badan acak (seed 9472, `samplePages`). Teks = `text_raw` persis; overhead pembungkus pesan (8 token) dikurangkan. Pembanding: o200k ±0.39 token/karakter (riset 2026-10-15).

| Ukuran | Nilai |
|---|---|
| Karakter sampel | 51.967 |
| Token Claude | 37.198 |
| Token Claude per karakter (total) | 0.716 |
| Token Claude per karakter (median per paragraf) | 0.675 |
| **Faktor terhadap o200k** (`FAKTOR_TOKEN_ARAB`) | **1.84** |
| Prompt sistem `translate-passage@2` | 4338 token |
| Prompt sistem `summarize-section@2` | 3885 token |

Prompt sistem ≥512 token = prefix bisa di-cache (minimum Haiku 5.5).
