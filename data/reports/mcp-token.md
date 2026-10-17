# Token keluaran tool MCP Surau (S16)

Diukur 2026-10-17 dengan `messages.countTokens` (model `claude-haiku-5-5`, gratis) atas teks `content` hasil tool dari Worker MCP lokal (D1 lokal, korpus Ihya), `pnpm llm mcp-tokens`. Sampel: 25 bagian daftar isi acak (level ≥ 2, seed 16), ≤4 potongan `read_section` pertama per bagian, halaman awal bagian yang sama untuk `read_page`, dan 6 kueri tetap. Overhead pembungkus pesan (8 token) dikurangkan.

| Tool | n | Median token | p95 | Maks. | Maks. karakter |
|---|---|---|---|---|---|
| read_section | 84 | 5037 | 5557 | 6193 | 10448 |
| read_page | 25 | 11095 | 13825 | 14751 | 27553 |
| get_hadith_takhrij | 25 | 936 | 1605 | 2284 | 4075 |
| verify_quote | 25 | 743 | 746 | 748 | 1495 |
| search_text limit 3 | 6 | 5609 | 6342 | 7143 | 13871 |
| search_text limit 5 | 6 | 7317 | 10518 | 10907 | 21135 |
| list_works {} | 1 | 695 | 695 | 695 | 1420 |
| get_table_of_contents {"edition_id":1} | 1 | 7784 | 7784 | 7784 | 14404 |
| get_table_of_contents {"edition_id":1,"node_id":100002,"depth":3} | 1 | 10126 | 10126 | 10126 | 18631 |

## Kalibrasi `readSection` (ADR-033)

| Ukuran | Nilai |
|---|---|
| Potongan diukur | 84 |
| `estimated_tokens` maks. (heuristik saat diukur) | 5866 |
| Token Claude `passages` / `estimated_tokens` (median · maks.) | 0.88 · 1.11 |
| Karakter JSON `passages` per token Claude (median · p5 · min.) | 1.63 · 1.5 · 1.26 |
| Token Claude seluruh hasil (median · maks.) | 5037 · 6193 |
| Overhead di luar `passages` (citation, node, ancestors, license; median) | 1021 |
