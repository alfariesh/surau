#!/bin/zsh
# Gerbang a ADR-119: pnpm ukur:lcp berselang-seling (n=1 per panggilan, 5 putaran) untuk tiga basis.
cd /Users/salmanalfariesh/Documents/Surau/.claude/worktrees/vinext-tahap1
G=/private/tmp/claude-501/-Users-salmanalfariesh-Documents-Surau/b1432329-35cb-4484-a589-8158f60a1a9d/scratchpad/gerbang/lcp
typeset -A BASE
BASE=(vinext https://surau-web-vinext.alfarieshsalman.workers.dev produksi https://surau.org next-wdev https://53635bd6-surau-web.alfarieshsalman.workers.dev)
for i in 1 2 3 4 5; do
  if (( i % 2 )); then urut=(vinext produksi next-wdev); else urut=(next-wdev produksi vinext); fi
  for k in $urut; do
    pnpm -s ukur:lcp ${BASE[$k]} baru 1 --json $G/$k-$i.json > $G/$k-$i.log 2>&1 || echo "gagal $k-$i"
  done
done
echo selesai
