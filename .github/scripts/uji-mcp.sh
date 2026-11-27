#!/usr/bin/env bash
# Uji Worker MCP Surau dengan MCP Inspector CLI di KEDUA era protokol (S16, ADR-049):
# `--protocol-era modern` (2026-07-28, server/discover) dan `legacy` (2025-11-25, initialize).
# Dipakai preview.yml (Preview per PR, data staging) dan deploy.yml (produksi, mcp.surau.org).
#
# Pakai: uji-mcp.sh <URL endpoint, mis. https://mcp.surau.org/mcp> [lengkap|daftar|tutup|redaksi]
#   lengkap (bawaan): tools/list + tools/call kedelapan tool + kasus error. Data uji dipilih dari
#     list_works (X31a langkah 8a): Bidayat al-Hidayah (edisi 2) bila ada, selain itu Ihya (edisi 1)
#   daftar: tools/list + satu tools/call (list_works) saja (smoke produksi)
#   tutup: tools/list + list_works harus menjawab `corpus_closed` (korpus ditutup, KITAB_OPEN "0",
#     ADR-142); URL /redaksi atau /mcp
#   redaksi: endpoint /redaksi (X23, X27): 12 tool + check_content_draft dan check_translation_draft
#     (draf rusak, galat pasti), list_faedah_candidates dan list_translation_units (data uji yang sama);
#     URL diakhiri /redaksi
# Env opsional: INSPECTOR (versi paket, bawaan dipin di bawah), MAX_COBA (bawaan 12), JEDA (5 dtk).
#
# Exit code Inspector (2.11): 0 sukses, 4 tidak terjangkau, 5 hasil `isError` / tool tidak ada.
# Keluar 1 pada kegagalan pertama, dengan keluaran Inspector di log.
set -euo pipefail

URL="${1:?URL endpoint MCP}"
MODE="${2:-lengkap}"
INSPECTOR="${INSPECTOR:-@modelcontextprotocol/inspector@2.11.0}"
MAX_COBA="${MAX_COBA:-12}"
JEDA="${JEDA:-5}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
# Isolasi penyimpanan token Inspector (server ini tanpa auth; jangan menyentuh ~/.mcp-inspector).
export MCP_STORAGE_DIR="$TMP/store" MCP_INSPECTOR_OAUTH_STATE_PATH="$TMP/oauth.json"

inspector() {
  pnpm dlx "$INSPECTOR" --cli --transport http --server-url "$URL" --connect-timeout 15000 \
    --stored-auth-only --format json "$@"
}

gagal() {
  echo "::error title=Uji MCP gagal::$1"
  [ -f "$TMP/err" ] && tail -5 "$TMP/err"
  exit 1
}

# Jalankan Inspector; stdout JSON ke $TMP/out. Status asli disimpan (pipefail + jq menimpanya).
jalan() {
  local status=0
  inspector "$@" >"$TMP/out" 2>"$TMP/err" || status=$?
  return "$status"
}

# tools/call yang harus sukses lalu lolos filter jq `$3` (harus bernilai true).
panggil() {
  local era="$1" tool="$2" cek="$3" args="${4:-{\}}"
  jalan --protocol-era "$era" --method tools/call --tool-name "$tool" --tool-args-json "$args" ||
    gagal "$era $tool keluar $?"
  jq -e ".result.isError != true and (.result.structuredContent | $cek)" "$TMP/out" >/dev/null ||
    gagal "$era $tool: hasil tidak lolos cek ($cek)"
  echo "  ✓ $era $tool"
}

# tools/call yang harus menjadi hasil error (exit 5) dengan teks yang diawali `$3`.
panggil_error() {
  local era="$1" tool="$2" awalan="$3" args="$4" status=0
  jalan --protocol-era "$era" --method tools/call --tool-name "$tool" --tool-args-json "$args" ||
    status=$?
  [ "$status" = "5" ] || gagal "$era $tool $args: exit $status, seharusnya 5 (isError)"
  jq -e --arg a "$awalan" '.result.isError == true and (.result.content[0].text | startswith($a))' \
    "$TMP/out" >/dev/null || gagal "$era $tool $args: teks error tidak diawali \"$awalan\""
  echo "  ✓ $era $tool → $awalan"
}

# Deploy/Preview baru bisa butuh beberapa detik sebelum melayani: ulangi tools/list modern.
for i in $(seq 1 "$MAX_COBA"); do
  if jalan --protocol-era modern --method tools/list; then break; fi
  [ "$i" = "$MAX_COBA" ] && gagal "tools/list modern tidak terjangkau setelah $MAX_COBA percobaan"
  sleep "$JEDA"
done

# Data uji per kitab (X31a langkah 8a, ADR-142): korpus Gelombang 1 tanpa Ihya memakai Bidayah.
# KATA_ID kosong = cari Indonesia dilewati (Bidayah belum punya terjemahan sampai X31b).
pilih_data() {
  jalan --protocol-era modern --method tools/call --tool-name list_works --tool-args-json '{}' ||
    gagal "list_works (pilih data uji) keluar $?"
  if jq -e '[.result.structuredContent.works[].slug] | index("bidayat-al-hidayah")' "$TMP/out" >/dev/null; then
    KITAB="bidayat-al-hidayah" EDISI=2 HAL=25 LABEL="Bidayat al-Hidayah, j. 1, h. 25" SEKSI=200002
    PASAL=20000001 TAKHRIJ=none KATA="الهداية" KATA_ID=""
  elif jq -e '[.result.structuredContent.works[].slug] | index("ihya")' "$TMP/out" >/dev/null; then
    KITAB="ihya" EDISI=1 HAL=200 LABEL="Ihya' 'Ulum ad-Din, j. 1, h. 200" SEKSI=100074
    PASAL=10002826 TAKHRIJ=linked KATA="الصبر" KATA_ID="sabar"
  else
    gagal "list_works tanpa kitab uji (bidayat-al-hidayah atau ihya): $(jq -c '[.result.structuredContent.works[].slug]' "$TMP/out")"
  fi
  echo "Data uji: $KITAB (edisi $EDISI)"
}
if [ "$MODE" = "lengkap" ] || [ "$MODE" = "redaksi" ]; then pilih_data; fi

ALAT='["list_works","get_table_of_contents","read_page","read_section","search_text","verify_quote","get_hadith_takhrij","get_section_digest"]'
JUMLAH=8
# Mode tutup: versi Worker lama (belum tertutup) bisa masih melayani beberapa detik sesudah deploy,
# dan tools/list-nya sama. Ulangi list_works sampai menjawab corpus_closed sebelum uji per era.
if [ "$MODE" = "tutup" ]; then
  for i in $(seq 1 "$MAX_COBA"); do
    jalan --protocol-era modern --method tools/call --tool-name list_works --tool-args-json '{}' || true
    jq -e '.result.isError == true and (.result.content[0].text | startswith("corpus_closed:"))' \
      "$TMP/out" >/dev/null && break
    [ "$i" = "$MAX_COBA" ] && gagal "list_works belum menjawab corpus_closed setelah $MAX_COBA percobaan"
    sleep "$JEDA"
  done
fi

if [ "$MODE" = "redaksi" ] || { [ "$MODE" = "tutup" ] && [[ "$URL" == */redaksi ]]; }; then
  ALAT=$(jq -c '. + ["check_content_draft","list_faedah_candidates","list_translation_units","check_translation_draft"]' <<<"$ALAT")
  JUMLAH=12
fi
for era in modern legacy; do
  echo "== era $era"
  jalan --protocol-era "$era" --method tools/list || gagal "$era tools/list keluar $?"
  jq -e --argjson alat "$ALAT" '[.result.tools[].name] == $alat' "$TMP/out" >/dev/null ||
    gagal "$era tools/list: daftar tool berbeda: $(jq -c '[.result.tools[].name]' "$TMP/out")"
  jq -e 'all(.result.tools[]; .annotations.readOnlyHint == true and .outputSchema.type == "object")' \
    "$TMP/out" >/dev/null || gagal "$era tools/list: anotasi/outputSchema"
  echo "  ✓ $era tools/list ($JUMLAH tool)"

  if [ "$MODE" = "tutup" ]; then
    panggil_error "$era" list_works "corpus_closed:" '{}'
    continue
  fi
  # Ihya diarsipkan (ADR-142, ADR-151): tidak boleh muncul di daftar karya mana pun yang diuji.
  panggil "$era" list_works '(.works | length) >= 1 and .license.name == "CC BY-NC-SA 4.0" and ([.works[].slug] | index("ihya") == null)'
  [ "$MODE" = "daftar" ] && continue
  if [ "$MODE" = "redaksi" ]; then
    # Draf rusak: galat skema pasti di data mana pun (Preview = staging, deploy = produksi).
    panggil "$era" check_content_draft '.ok == false and any(.errors[]; .code == "schema")' \
      '{"draft":{"format":"lain"}}'
    panggil "$era" list_faedah_candidates ".section.id == $SEKSI and (.candidates | length) >= 1" \
      "{\"section_id\":$SEKSI,\"include_ineligible\":true,\"limit\":2}"
    panggil "$era" check_translation_draft '.ok == false and any(.errors[]; .code == "schema")' \
      '{"draft":{"format":"lain"}}'
    panggil "$era" list_translation_units ".section.id == $SEKSI and (.units | length) == 2" \
      "{\"section_id\":$SEKSI,\"limit\":2}"
    continue
  fi

  panggil "$era" get_table_of_contents '(.nodes | length) >= 1 and (.citation.permalink | startswith("https://"))' \
    "{\"edition_id\":$EDISI}"
  panggil "$era" read_page "$(jq -nc --arg l "$LABEL" '"(.citation.label == \($l | tojson)) and (.body | length) > 0 and (.license.attribution | length) > 0"' | jq -r .)" \
    "{\"edition_id\":$EDISI,\"juz\":1,\"page_no\":$HAL}"
  panggil "$era" read_section '(.passages | length) > 0 and .next_cursor != null' "{\"section_id\":$SEKSI}"
  panggil "$era" search_text '(.results | length) > 0 and all(.results[]; (.hits | length) <= 3)' \
    "$(jq -nc --arg q "$KATA" '{query: $q, limit: 3}')"
  if [ -n "$KATA_ID" ]; then
    panggil "$era" search_text '(.results | length) > 0' "$(jq -nc --arg q "$KATA_ID" '{query: $q, limit: 2}')"
  fi
  panggil "$era" verify_quote '.verified == false and .match == null' \
    "{\"passage_id\":$PASAL,\"quote\":\"قول لم يقله أحد\"}"
  # Bidayah tanpa takhrij tertaut: status none = "status belum diketahui" (teks-arab aturan 6).
  if [ "$TAKHRIJ" = "linked" ]; then
    panggil "$era" get_hadith_takhrij '.status == "linked" and (.takhrij | length) > 0' "{\"passage_id\":$PASAL}"
  else
    panggil "$era" get_hadith_takhrij '.status == "none" and (.takhrij | length) == 0' "{\"passage_id\":$PASAL}"
  fi
  # Intisari (X16): null sampai korpus punya Intisari (skema < 9 atau sebelum pilot X15b).
  panggil "$era" get_section_digest '.digest == null or .digest.label == "ai_digest"' "{\"section_id\":$SEKSI}"
  panggil_error "$era" read_page "not_found:" "{\"edition_id\":$EDISI,\"juz\":9,\"page_no\":1}"
  panggil_error "$era" search_text "Input validation error" '{"query":""}'
done

# Origin asing → 403 (spec: server MUST memvalidasi Origin).
kode=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL" -H 'Origin: https://evil.example' \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{}') ||
  gagal "curl ke $URL gagal (Origin asing)"
[ "$kode" = "403" ] || gagal "Origin asing → $kode, seharusnya 403"
echo "  ✓ Origin asing → 403"
echo "Uji MCP ($MODE) lolos: $URL"
