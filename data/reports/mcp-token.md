# Token keluaran tool MCP Surau (S16)

Diukur 2026-10-17 dengan `messages.countTokens` (model `claude-haiku-5-5`, gratis) atas teks `content` hasil tool dari Worker MCP lokal (D1 lokal, korpus Ihya), `pnpm llm mcp-tokens`. Sampel: 25 bagian daftar isi acak (level ≥ 2, seed 16), ≤4 potongan `read_section` pertama per bagian, halaman awal bagian yang sama untuk `read_page`, dan 6 kueri tetap. Overhead pembungkus pesan (8 token) dikurangkan.

| Tool | n | Median token | p95 | Maks. | Maks. karakter |
|---|---|---|---|---|---|
| read_section | 84 | 4983 | 5503 | 6139 | 10292 |
| read_page | 25 | 10592 | 13322 | 14248 | 26352 |
| search_text limit 5 | 6 | 7263 | 10464 | 10853 | 20979 |
| search_text limit 10 | 6 | 14195 | 18953 | 19893 | 38045 |
| list_works {} | 1 | 641 | 641 | 641 | 1264 |
| get_table_of_contents {"edition_id":1} | 1 | 7730 | 7730 | 7730 | 14248 |
| get_table_of_contents {"edition_id":1,"node_id":100002,"depth":3} | 1 | 10072 | 10072 | 10072 | 18475 |

## Kalibrasi `readSection` (ADR-033)

| Ukuran | Nilai |
|---|---|
| Potongan diukur | 84 |
| `estimated_tokens` maks. (heuristik saat diukur) | 5866 |
| Token Claude `passages` / `estimated_tokens` (median · maks.) | 0.88 · 1.11 |
| Karakter JSON `passages` per token Claude (median · p5 · min.) | 1.63 · 1.5 · 1.26 |
| Token Claude seluruh hasil (median · maks.) | 4983 · 6139 |
| Overhead di luar `passages` (citation, node, ancestors, license; median) | 967 |
