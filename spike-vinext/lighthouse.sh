#!/bin/zsh
# Lighthouse 13.5 ponsel (Lantern), berselang-seling next/vinext, n=$N per halaman.
CHROME="$HOME/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
export CHROME_PATH="$CHROME"
N=${N:-5}
mkdir -p out
for i in $(seq 1 $N); do
  for page in /kitab/ihya/1/200 /kitab/ihya/3/202; do
    if (( i % 2 )); then order=(next:4422 vinext:4421); else order=(vinext:4421 next:4422); fi
    for v in $order; do
      name=${v%%:*}; port=${v##*:}; f="out/${name}$(echo $page | tr / _)-$i.json"
      ./node_modules/.bin/lighthouse "https://localhost:$port$page" --only-categories=performance --output=json --output-path="$f" --quiet --chrome-flags="--headless=new --ignore-certificate-errors" >/dev/null 2>&1 || echo "gagal $f"
    done
  done
done
node -e '
const fs=require("fs");const rows={};
for(const f of fs.readdirSync("out")){const j=JSON.parse(fs.readFileSync("out/"+f));const k=f.replace(/-\d+\.json$/,"");const a=j.audits;(rows[k]??=[]).push({lcp:a["largest-contentful-paint"].numericValue,fcp:a["first-contentful-paint"].numericValue,tbt:a["total-blocking-time"].numericValue,si:a["speed-index"].numericValue,cls:a["cumulative-layout-shift"].numericValue,kb:a["total-byte-weight"].numericValue/1024,score:j.categories.performance.score*100});}
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor((s.length-1)/2)]};
for(const [k,r] of Object.entries(rows).sort()){const m=key=>med(r.map(x=>x[key]));console.log(k.padEnd(26),"n="+r.length,"skor="+m("score").toFixed(0),"FCP="+(m("fcp")/1000).toFixed(2),"LCP="+(m("lcp")/1000).toFixed(2),"[LCP semua: "+r.map(x=>(x.lcp/1000).toFixed(2)).join(" ")+"]","TBT="+m("tbt").toFixed(0),"SI="+(m("si")/1000).toFixed(2),"CLS="+m("cls").toFixed(3),"total="+m("kb").toFixed(0)+"KB")}'
