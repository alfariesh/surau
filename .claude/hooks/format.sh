#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit): format file yang baru disunting dengan Oxfmt (`vp fmt`).
# Diam bila sukses, dan selalu exit 0 supaya tidak pernah menghalangi agent.
set -u
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
vp="$root/node_modules/.bin/vp"
[ -x "$vp" ] || exit 0

# jq belum tentu terpasang; ambil tool_input.file_path dengan node.
file="$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).tool_input?.file_path??"")}catch{}})' 2>/dev/null)"
[ -n "$file" ] || exit 0

case "$file" in
  *.ts | *.tsx | *.js | *.mjs | *.json | *.css) ;;
  *) exit 0 ;;
esac

# Hanya file di dalam repo yang masih ada.
case "$file" in
  "$root"/*) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

(cd "$root" && "$vp" fmt "$file" >/dev/null 2>&1) || true
exit 0
