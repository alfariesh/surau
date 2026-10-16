#!/usr/bin/env bash
# Ringkasan request/error Worker Preview dari GraphQL Analytics (`workersInvocationsAdaptive`,
# `isPreview: 1`). Pengganti `wrangler tail`, yang belum mendukung Previews. Keputusan: ADR-031.
#
# Env wajib: CLOUDFLARE_API_TOKEN (izin Account Analytics Read, T-21), CLOUDFLARE_ACCOUNT_ID,
# PREVIEW_SLUG (mis. pr-16), SINCE (ISO 8601 UTC, awal jendela waktu).
# Env opsional: WORKER (default surau-web), RINGKASAN_MD (file Markdown tujuan ringkasan),
# MAX_COBA (default 9), JEDA (detik, default 20), GRAPHQL_URL (untuk uji lokal).
#
# Keluar 1 bila ada invocation gagal (exception, melebihi batas, error internal) atau GraphQL
# menolak query karena alasan selain izin (mis. skema berubah). Token tanpa izin, jaringan, atau
# data yang belum masuk hanya memberi peringatan (keluar 0).
set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?}" "${CLOUDFLARE_ACCOUNT_ID:?}" "${PREVIEW_SLUG:?}" "${SINCE:?}"
WORKER="${WORKER:-surau-web}"
RINGKASAN_MD="${RINGKASAN_MD:-/dev/null}"
MAX_COBA="${MAX_COBA:-9}"
JEDA="${JEDA:-20}"
GRAPHQL_URL="${GRAPHQL_URL:-https://api.cloudflare.com/client/v4/graphql}"

# previewSlug tidak dipakai sebagai filter server (belum terdokumentasi sebagai filter), jadi
# disaring di jq. Teramati di PR #16 (2026-10-16): Cloudflare mengisi previewSlug `__unknown__`
# untuk Preview dari `wrangler preview`. Bila tidak ada baris dengan slug persis, baris
# `__unknown__` dipakai sebagai cadangan (bisa tercampur trafik Preview lain yang masih hidup di
# jendela waktu yang sama, termasuk status gagal yang membuat job merah). Status non-sukses yang dikenal: clientDisconnected, scriptThrewException,
# exceededResources, internalError.
read -r -d '' QUERY <<'GQL' || true
query PreviewLog($accountTag: String!, $since: Time!, $script: String!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workersInvocationsAdaptive(
        limit: 100
        filter: { datetime_geq: $since, isPreview: 1, scriptName: $script }
      ) {
        dimensions { previewSlug status }
        sum { requests errors }
      }
    }
  }
}
GQL

tanya() {
  jq -n --arg q "$QUERY" --arg a "$CLOUDFLARE_ACCOUNT_ID" --arg s "$SINCE" --arg w "$WORKER" \
    '{query: $q, variables: {accountTag: $a, since: $s, script: $w}}' |
    curl -sS --fail-with-body --retry 3 --retry-all-errors -X POST "$GRAPHQL_URL" \
      -H @<(printf 'Authorization: Bearer %s\n' "$CLOUDFLARE_API_TOKEN") -H "Content-Type: application/json" \
      --data-binary @-
}

md() { printf '%s\n' "$@" >> "$RINGKASAN_MD"; }

# Pesan dari API masuk ke komentar PR publik: satu baris, tanpa backtick, maks 300 karakter.
bersihkan() { tr '\n`' '  ' | sed 's/ *$//' | cut -c1-300; }

# Data analytics masuk dengan jeda: ulangi sampai jumlah request > 0 dan sama dengan putaran sebelumnya.
sebelumnya=-1
slug_terlihat=0
for ((i = 1; i <= MAX_COBA; i++)); do
  sleep "$JEDA"
  if ! jawab=$(tanya) || ! jq -e 'type == "object"' >/dev/null 2>&1 <<<"$jawab"; then
    pesan=$(jq -r '[.errors[]?.message] | join("; ")' 2>/dev/null <<<"$jawab" | bersihkan || true)
    echo "::warning title=Log Preview tidak terbaca::Permintaan ke GraphQL Cloudflare gagal: ${pesan:-tanpa pesan}"
    md "### Log Preview" "" "Tidak terbaca: permintaan ke GraphQL Cloudflare gagal (lihat log CI)."
    exit 0
  fi
  if [ "$(jq '(.errors // []) | length' <<<"$jawab")" != "0" ]; then
    pesan=$(jq -r '[.errors[].message] | unique | join("; ")' <<<"$jawab" | bersihkan)
    # Error otorisasi = izin token kurang (T-21). Error lain (validasi/skema) adalah bug skrip: merah.
    if grep -qiE 'not authori[sz]ed|authz|permission|forbidden|unauthori[sz]ed' <<<"$pesan"; then
      echo "::warning title=Log Preview tidak terbaca::${pesan}. Token CI belum punya izin Account Analytics Read (T-21 di implementasi/TUGAS-PEMILIK.md)."
      md "### Log Preview" "" "Tidak terbaca: ${pesan}. Token CI butuh izin *Account Analytics Read* (T-21)."
      exit 0
    fi
    echo "::error title=Query log Preview ditolak::${pesan}. Periksa query di .github/scripts/ringkas-log-preview.sh terhadap skema GraphQL (ADR-031)."
    md "### Log Preview" "" "Query ditolak GraphQL: ${pesan}. Skrip perlu diperbaiki (ADR-031)."
    exit 1
  fi
  semua='[.data.viewer.accounts[0].workersInvocationsAdaptive[]?]'
  per_slug=$(jq -r "$semua"' | group_by(.dimensions.previewSlug) | map("\(.[0].dimensions.previewSlug)=\(map(.sum.requests) | add)") | join(", ")' <<<"$jawab")
  # Begitu slug persis pernah terlihat, jangan kembali ke cadangan (perbandingan "stabil" antar slug).
  if jq -e --arg slug "$PREVIEW_SLUG" "$semua"' | any(.dimensions.previewSlug == $slug)' >/dev/null <<<"$jawab"; then
    slug_terlihat=1
  fi
  slug_dipakai=$PREVIEW_SLUG
  [ "$slug_terlihat" = 1 ] || slug_dipakai=__unknown__
  baris=$(jq --arg slug "$slug_dipakai" "$semua"' | map(select(.dimensions.previewSlug == $slug))' <<<"$jawab")
  total=$(jq '[.[].sum.requests] | add // 0' <<<"$baris")
  echo "Putaran ${i}/${MAX_COBA}: ${total} request (slug ${slug_dipakai}; semua Preview: ${per_slug:-kosong})"
  if [ "$total" -gt 0 ] && [ "$total" = "$sebelumnya" ]; then break; fi
  sebelumnya=$total
done

if [ "$total" = "0" ]; then
  slug_lain=$(jq -r '[.data.viewer.accounts[0].workersInvocationsAdaptive[]?.dimensions.previewSlug] | unique | join(", ")' <<<"$jawab")
  echo "::warning title=Log Preview kosong::Belum ada data analytics untuk ${PREVIEW_SLUG} sejak ${SINCE}. Preview lain di jendela ini: ${slug_lain:-tidak ada}."
  md "### Log Preview" "" "Belum ada data analytics untuk \`${PREVIEW_SLUG}\` sejak ${SINCE} (data bisa terlambat beberapa menit)."
  exit 0
fi

# Satu baris per status (dijumlahkan bila grup terpecah).
per_status=$(jq -c 'group_by(.dimensions.status) | map({status: .[0].dimensions.status,
  requests: (map(.sum.requests) | add), errors: (map(.sum.errors) | add)}) | sort_by(-.requests)' <<<"$baris")
errors=$(jq '[.[].errors] | add // 0' <<<"$per_status")
gagal=$(jq '[.[] | select(.status != "success" and .status != "clientDisconnected") | .requests] | add // 0' <<<"$per_status")
putus=$(jq '[.[] | select(.status == "clientDisconnected") | .requests] | add // 0' <<<"$per_status")

pembuka=()
asal="di ${PREVIEW_SLUG}"
if [ "$slug_dipakai" != "$PREVIEW_SLUG" ]; then
  cadangan="Slug \`${PREVIEW_SLUG}\` tidak muncul di analytics; dipakai baris \`__unknown__\` (bisa tercampur trafik Preview lain yang masih hidup di jendela waktu ini)."
  echo "::notice title=previewSlug tidak terisi::${cadangan//\`/}"
  pembuka=("$cadangan" "")
  asal="di baris __unknown__ (mungkin bukan dari ${PREVIEW_SLUG}; cocokkan waktunya di dashboard)"
fi

echo "Ringkasan ${WORKER} Preview ${PREVIEW_SLUG} sejak ${SINCE}: ${total} request, ${errors} error (gagal ${gagal}, klien putus ${putus})"
jq -r '.[] | "  \(.status): \(.requests) request, \(.errors) error"' <<<"$per_status"

md "### Log Preview \`${PREVIEW_SLUG}\`" "" \
  "Sejak ${SINCE} (GraphQL \`workersInvocationsAdaptive\`): **${total} request, ${errors} error**." "" \
  "${pembuka[@]}" "| Status | Request | Error |" "| --- | ---: | ---: |"
jq -r '.[] | "| \(.status) | \(.requests) | \(.errors) |"' <<<"$per_status" >> "$RINGKASAN_MD"
md "" "Hanya status *invocation*: respons HTTP 5xx yang ditangani Next tetap \`success\`, dan \`console.error\` tidak terhitung (ADR-031)."

if [ "$gagal" -gt 0 ]; then
  echo "::error title=Error di Worker Preview::${gagal} invocation gagal ${asal} (exception/melebihi batas/error internal). Detail pesan: dashboard Cloudflare → Workers → surau-web → Previews → ${PREVIEW_SLUG} → Logs."
  exit 1
fi
if [ "$putus" -gt 0 ]; then
  echo "::notice title=Klien memutus koneksi::${putus} request clientDisconnected (biasa terjadi saat Playwright membatalkan navigasi/prefetch)."
fi
