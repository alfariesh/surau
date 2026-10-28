#!/bin/zsh
# Gerbang 2 kriteria 1: pnpm ukur:lcp berselang-seling, 15 putaran, Preview PR #206 vs produksi.
# Putaran yang gagal dijalankan diulang sekali (dicatat di ulang.log). Jalankan: zsh lcp-seling-15.sh <folder-keluaran>
cd "${REPO:-$(git rev-parse --show-toplevel)}"
G="${1:?pakai: lcp-seling-15.sh <folder-keluaran>}"; mkdir -p "$G"
typeset -A BASE
BASE=(preview https://pr-206.surau.org produksi https://surau.org)
for i in $(seq 1 15); do
  if (( i % 2 )); then urut=(preview produksi); else urut=(produksi preview); fi
  for k in $urut; do
    if ! pnpm -s ukur:lcp ${BASE[$k]} baru 1 --json $G/$k-$i.json > $G/$k-$i.log 2>&1; then
      echo "$(date -u +%FT%TZ) ulang $k-$i" >> $G/ulang.log
      pnpm -s ukur:lcp ${BASE[$k]} baru 1 --json $G/$k-$i.json > $G/$k-$i.log 2>&1 || echo "$(date -u +%FT%TZ) gagal lagi $k-$i" >> $G/ulang.log
    fi
  done
done
echo selesai
