#!/usr/bin/env bash
# Uji Worker MCP Surau dengan MCP Inspector CLI di KEDUA era protokol (S16, ADR-049):
# `--protocol-era modern` (2026-07-28, server/discover) dan `legacy` (2025-11-25, initialize).
# Dipakai preview.yml (Preview per PR, data staging) dan deploy.yml (produksi, mcp.surau.org).
#
# Pakai: uji-mcp.sh <URL endpoint, mis. https://mcp.surau.org/mcp> [lengkap|daftar]
#   lengkap (bawaan): tools/list + tools/call ketujuh tool (data Ihya edisi 1) + kasus error
#   daftar: tools/list + satu tools/call (list_works) saja (smoke produksi)
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

ALAT='["list_works","get_table_of_contents","read_page","read_section","search_text","verify_quote","get_hadith_takhrij"]'
for era in modern legacy; do
  echo "== era $era"
  jalan --protocol-era "$era" --method tools/list || gagal "$era tools/list keluar $?"
  jq -e --argjson alat "$ALAT" '[.result.tools[].name] == $alat' "$TMP/out" >/dev/null ||
    gagal "$era tools/list: daftar tool berbeda: $(jq -c '[.result.tools[].name]' "$TMP/out")"
  jq -e 'all(.result.tools[]; .annotations.readOnlyHint == true and .outputSchema.type == "object")' \
    "$TMP/out" >/dev/null || gagal "$era tools/list: anotasi/outputSchema"
  echo "  ✓ $era tools/list (7 tool)"

  panggil "$era" list_works '(.works | length) >= 1 and .license.name == "CC BY-NC-SA 4.0"'
  [ "$MODE" = "daftar" ] && continue

  panggil "$era" get_table_of_contents '(.nodes | length) >= 1 and (.citation.permalink | startswith("https://"))' \
    '{"edition_id":1}'
  panggil "$era" read_page '.citation.label == "Ihya'"'"' '"'"'Ulum ad-Din, j. 1, h. 200" and (.body | length) > 0 and (.license.attribution | length) > 0' \
    '{"edition_id":1,"juz":1,"page_no":200}'
  panggil "$era" read_section '(.passages | length) > 0 and .next_cursor != null' '{"section_id":100074}'
  panggil "$era" search_text '(.results | length) > 0 and all(.results[]; (.hits | length) <= 3)' \
    '{"query":"الصبر","limit":3}'
  panggil "$era" search_text '(.results | length) > 0' '{"query":"sabar","limit":2}'
  panggil "$era" verify_quote '.verified == false and .match == null' \
    '{"passage_id":10002826,"quote":"قول لم يقله أحد"}'
  panggil "$era" get_hadith_takhrij '.status == "linked" and (.takhrij | length) > 0' '{"passage_id":10002826}'
  panggil_error "$era" read_page "not_found:" '{"edition_id":1,"juz":9,"page_no":1}'
  panggil_error "$era" search_text "Input validation error" '{"query":""}'
done

# Origin asing → 403 (spec: server MUST memvalidasi Origin).
kode=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL" -H 'Origin: https://evil.example' \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{}')
[ "$kode" = "403" ] || gagal "Origin asing → $kode, seharusnya 403"
echo "  ✓ Origin asing → 403"
echo "Uji MCP ($MODE) lolos: $URL"
