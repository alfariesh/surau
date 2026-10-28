#!/bin/zsh
# Kriteria 1 ADR-124: pnpm ukur:lcp berselang-seling (n=1 per panggilan, 5 putaran), Preview PR #206 vs produksi.
# Jalankan dari dalam repo: zsh lcp-seling.sh <folder-keluaran>
cd "${REPO:-$(git rev-parse --show-toplevel)}"
G="${1:?pakai: lcp-seling.sh <folder-keluaran>}"; mkdir -p "$G"
typeset -A BASE
BASE=(preview https://pr-206.surau.org produksi https://surau.org)
for i in 1 2 3 4 5; do
  if (( i % 2 )); then urut=(preview produksi); else urut=(produksi preview); fi
  for k in $urut; do pnpm -s ukur:lcp ${BASE[$k]} baru 1 --json $G/$k-$i.json > $G/$k-$i.log 2>&1 || echo "gagal $k-$i"; done
done
echo selesai
