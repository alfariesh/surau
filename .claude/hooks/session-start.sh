#!/usr/bin/env bash
# Menyuntikkan ringkasan status proyek ke konteks agent di awal setiap sesi Claude Code.
# Keluaran stdout dari hook SessionStart ditambahkan ke konteks. Gagal diam-diam bila file tidak ada.
set -u
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
status="$root/implementasi/STATUS.md"
[ -f "$status" ] || exit 0

echo "=== Ringkasan implementasi/STATUS.md (otomatis, dari hook SessionStart) ==="
# Bagian dari "## Sekarang" sampai sebelum "## Progres" saja, supaya ringkas.
awk '/^## Sekarang/{f=1} /^## Progres/{f=0} f' "$status" | head -n 40
branch="$(git -C "$root" branch --show-current 2>/dev/null || true)"
dirty="$(git -C "$root" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
echo "Git: branch=${branch:-?} · file berubah belum di-commit=${dirty:-?}"
if [ -f "$root/.node-version" ]; then
  want="$(cut -d. -f1 < "$root/.node-version" | tr -d 'v[:space:]')"
  have="$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v')"
  if [ -n "$want" ] && [ "$want" != "$have" ]; then
    echo "PERINGATAN: node di PATH = v${have:-?}, repo butuh v${want} (.node-version). Lihat TUGAS-PEMILIK T-02 sebelum menjalankan perintah pnpm."
  fi
fi
echo "Pemilik ingin lanjut? Ikuti skill /sesi. Ditanya posisi proyek? Ikuti skill /posisi."
exit 0
