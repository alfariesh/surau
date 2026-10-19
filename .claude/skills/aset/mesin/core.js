/* ============================================================
   Mesin aset Surau: turunan Colorfigures (lihat lisensi MIT di bawah dan mesin/LICENSE).
   Proyeksi isometrik, bentuk 3D, bayangan warna datar, tinta, label, dan cangkang halaman.
   Halaman figur memuat file ini (skrip/bangun.mjs menyisipkannya), lalu memanggil mountFigure({...}).
   Kontrak gambar ada di .claude/skills/aset/REFERENSI.md; aturan Surau di SKILL.md.
   Satu sudut pandang tetap (depan-kiri-atas) dan satu cahaya tetap.

   Perubahan Surau dari Colorfigures asli: palet Zaitun, font Plus Jakarta Sans, teks UI bahasa
   Indonesia, tema terang/gelap/sepia (?tema=), mode sematan (?sematan=1) dan sampul (?sampul=1),
   "kurangi gerakan" dihormati, tanpa penggeser wobble/palet, dan tanpa tautan kredit di gambar
   (kredit ada di halaman /lisensi).

   MIT License

   Copyright (c) 2026 April Zhu (Colorfigures: colour, hand-drawn style, 3D props, template, examples)
   Copyright (c) 2026 April Zhu (iso-glow, on which Colorfigures is based)
   Copyright (c) 2026 Tolga Cohce (iso-figure, on which iso-glow is based)

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE.
   ============================================================ */

/* ---------- palet Surau (body {l, m, d} = terang / tengah / gelap) ----------
   zaitun = aksen Surau (globals.css --accent, oklch .47 .085 150) dinaikkan terangnya untuk badan benda.
   Ganti di sini, jangan di figur: semua aset ikut berubah bersama. */
const PALS = {
  zaitun: { l:'#6f9d77', m:'#4f8059', d:'#1f4128' },
  kayu:   { l:'#d6a56b', m:'#b9874f', d:'#7d5530' },
  tanah:  { l:'#d4825c', m:'#b56645', d:'#5c2f1e' },
  nila:   { l:'#7d93c4', m:'#5f74a6', d:'#232f52' },
  emas:   { l:'#e9c46a', m:'#cda24a', d:'#6b5420' },
};
const METAL   = { l:'#eef0f0', m:'#c6ccce', d:'#8f989b' };
const CLEAR   = { l:'#e4f2f4', m:'#c4dfe4', d:'#97b9c0' };
const CERAMIC = { l:'#fbfaf3', m:'#e3e0d2', d:'#bdb8a6' };
const DARK    = { l:'#55504a', m:'#3d3935', d:'#272421' };
// kertas halaman kitab (krem, sedikit lebih hangat dari CERAMIC)
const KERTAS  = { l:'#fbf5e4', m:'#ecdfbf', d:'#c9b98f' };
const INK = '#231e16';
// warna bayangan diatur CSS (.bayang), supaya ikut tema; nilai ini hanya cadangan
const SHADOW = '#8a977f';
const FONT = '"Plus Jakarta Sans",Inter,ui-sans-serif,system-ui,sans-serif';

/* ---------- projection (x = depth toward viewer-right, y = toward viewer-left, z = up) ---------- */
const C = Math.cos(Math.PI/6), S = Math.sin(Math.PI/6);
let OX = 0, OY = 0;
/* VIEW turns the object in 90° steps about a vertical axis through its centre (RC):
   0 = front (+x) and left (+y) faces toward the viewer, 1 = turned once (the +y side becomes the front)…
   Figures keep modelling in their own coordinates; P / Dv / vis / tone / depthOf all apply the turn. */
let VIEW = 0, RC = [0, 0];
const VIEW_NAMES = ['front', 'left side', 'back', 'right side'];
const TURNS = [0, 2];                 // sisa mesin asli (pemutar sudut pandang); UI Surau tidak memutar benda
const rotV = ([x,y,z]) => { switch (VIEW & 3){ case 1: return [y,-x,z]; case 2: return [-x,-y,z]; case 3: return [-y,x,z]; default: return [x,y,z]; } };
const rotXY = (x,y) => { const r = rotV([x-RC[0], y-RC[1], 0]); return [r[0]+RC[0], r[1]+RC[1]]; };
const P0 = (x,y,z) => [(x-y)*C + OX, (x+y)*S - z + OY];                       // raw iso, no turn
const P  = (x,y,z) => { const [a,b] = rotXY(x,y); return [(a-b)*C + OX, (a+b)*S - z + OY]; };
const Dv = (x,y,z) => { const [a,b,c] = rotV([x,y,z]); return [(a-b)*C, (a+b)*S - c]; };
// distance toward the viewer in the current view: draw parts with smaller depth first
const depthOf = p => { const [a,b] = rotXY(p[0],p[1]); return a + b + p[2]; };
// sort [{at:[x,y,z], svg}] back-to-front for the current view and join
const byDepth = parts => parts.filter(Boolean).sort((p,q) => depthOf(p.at) - depthOf(q.at)).map(p => p.svg).join('');
const f  = v => v.toFixed(1);
const pd = (pts, close=true) => 'M' + pts.map(p => { const q = P(p[0],p[1],p[2]); return f(q[0])+' '+f(q[1]); }).join('L') + (close ? 'Z' : '');
const sp = pts => 'M' + pts.map(q => f(q[0])+' '+f(q[1])).join('L') + 'Z';

/* ---------- 2D shapes in a plane's (u,v) coords (v up), mapped to 3D by a plane ---------- */
const arcUV  = (cu,cv,r,a0,a1,n=7) => { const o=[]; for (let i=0;i<=n;i++){ const a=(a0+(a1-a0)*i/n)*Math.PI/180; o.push([cu+r*Math.cos(a), cv+r*Math.sin(a)]); } return o; };
const rrUV   = (u0,v0,u1,v1,r,n=7) => r <= 0 ? rectUV(u0,v0,u1,v1) : [...arcUV(u1-r,v0+r,r,-90,0,n), ...arcUV(u1-r,v1-r,r,0,90,n), ...arcUV(u0+r,v1-r,r,90,180,n), ...arcUV(u0+r,v0+r,r,180,270,n)];
const rectUV = (u0,v0,u1,v1) => [[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
const ellUV  = (cu,cv,ru,rv,n=24) => Array.from({length:n}, (_,i) => { const a=i/n*2*Math.PI; return [cu+ru*Math.cos(a), cv+rv*Math.sin(a)]; });
const PX = x => ([u,v]) => [x,u,v];      // front-facing plane x = const   (u = y, v = z)
const PY = y => ([u,v]) => [u,y,v];      // side plane y = const           (u = x, v = z)
const PZ = z => ([u,v]) => [u,v,z];      // horizontal plane z = const     (u = x, v = y)
const on = (plane, uv) => uv.map(plane);

/* ---------- vectors + shading ---------- */
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm=a=>{ const l=Math.hypot(...a)||1; return a.map(v=>v/l); };
const avg=ps=>ps.reduce((s,p)=>[s[0]+p[0]/ps.length,s[1]+p[1]/ps.length,s[2]+p[2]/ps.length],[0,0,0]);
const vis = n => { const r = rotV(n); return r[0]+r[1]+r[2] > 1e-6; };   // viewer looks from (+1,+1,+1) after the turn
const facing = vis;                                                       // readable alias: is this face toward the viewer?
const SHADOW_K = 0.85, AZ_MIN = 20, AZ_MAX = 160;
// cast shadows are drawn shorter than the shading light implies (0.45 × height instead of 0.85 ×): long shadows of tall
// parts on thin supports (a lamp shade, a fan head) land far from the object and read as separate blobs
const SHADOW_LEN = 0.45;
let L = [0,0,1], SH = [0,0];
function setLight(deg){ const a=deg*Math.PI/180; SH=[SHADOW_K*Math.cos(a), SHADOW_K*Math.sin(a)]; L=norm([-SH[0],-SH[1],1]); }
const LIN = norm([.6,.2,1]);                       // fixed light for interiors / small props
const tone  = (n,m) => { const d=dot(rotV(n),L);   return d>-.15 ? m.l : d>-.45 ? m.m : m.d; };   // exterior, follows the sun
const toneI = (n,m) => { const d=dot(rotV(n),LIN); return d>.6 ? m.l : d>.05 ? m.m : m.d; };      // interior / props
const mix = (a,b,t) => '#' + [1,3,5].map(i => Math.round(parseInt(a.substr(i,2),16)*(1-t) + parseInt(b.substr(i,2),16)*t).toString(16).padStart(2,'0')).join('');
const matOf = hex => ({ l:hex, m:mix(hex,'#000000',.16), d:mix(hex,'#000000',.42) });
const ease = t => t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;

/* ---------- drawing primitives (all return SVG strings) ---------- */
const ink   = (d,w=1.0) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const fill  = (d,c,extra='') => `<path d="${d}" fill="${c}" ${extra}/>`;
const face  = (d,c) => `<path d="${d}" fill="${c}" stroke="${c}" stroke-width=".7" stroke-linejoin="round"/>`;
const shape = (pts,c,w=.9) => fill(pd(pts),c) + (w ? ink(pd(pts),w) : '');
const line  = (pts,w=.9) => ink(pd(pts,false),w);
// Loft between two rings of equal length (closed). colour(n) picks each strip's fill; flip = seen from inside.
function loft(A, B, colour, flip=false){
  const n=A.length, cen=avg(A.concat(B)); let s='';
  for (let i=0;i<n;i++){
    const a0=A[i], a1=A[(i+1)%n], b1=B[(i+1)%n], b0=B[i];
    let nr = norm(cross(sub(a1,a0), sub(b0,a0)));
    if (!isFinite(nr[0])) continue;
    if (dot(nr, sub(avg([a0,a1,b1,b0]), cen)) < 0) nr = nr.map(v=>-v);
    if (flip) nr = nr.map(v=>-v);
    if (vis(nr)) s += face(pd([a0,a1,b1,b0]), colour(nr));
  }
  return s;
}
function hull(pts){
  pts = pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]); const lo=[], up=[];
  for (const p of pts){ while(lo.length>=2 && cr(lo[lo.length-2],lo[lo.length-1],p)<=0) lo.pop(); lo.push(p); }
  for (const p of pts.reverse()){ while(up.length>=2 && cr(up[up.length-2],up[up.length-1],p)<=0) up.pop(); up.push(p); }
  lo.pop(); up.pop(); return lo.concat(up);
}
// Silhouette ink, weighted by how thick the part is on screen (like a hand inker): the w you pass is the most it gets.
// Thickness = 2 × area / perimeter of the outline (a rod's diameter, about half a box's width), as a share of the
// frame width. A long thin rod, a handle or a knob stays light (~1–1.5); a grinder, kettle or machine body gets the
// heavy ~2.4–2.8. Thin parts stay thin and parts keep air between them.
const hullInk = (pts3, w=1.4) => { const h = hull(pts3.map(p=>P(...p))); let a = 0, per = 0;
  for (let i = 0; i < h.length; i++){ const p = h[i], q = h[(i+1) % h.length]; a += p[0]*q[1] - q[0]*p[1]; per += Math.hypot(q[0]-p[0], q[1]-p[1]); }
  const thick = per ? Math.abs(a) / per / (INK_K * INK_REF_VB) : 0;
  return ink(sp(h), Math.min(w, .9 + 20*thick)); };
// Axis-aligned box: three visible faces, shaded, each outlined. shade = tone (sunlit) or toneI (interior).
function box(x0,y0,z0,x1,y1,z1,m,shade=toneI,w=.9){
  // all six faces, drawn only when they face the viewer (sides first, then top) — correct in every VIEW
  const F = [
    [[0,1,0],  [[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]]],
    [[1,0,0],  [[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]]],
    [[0,-1,0], [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]],
    [[-1,0,0], [[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]]],
    [[0,0,1],  [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]]] ];
  return F.filter(([n]) => vis(n)).map(([n,q]) => shape(q, shade(n,m), w)).join('');
}
// Rounded-profile extrusion: profile (u=y, v=z) swept along x from x0 to x1. Body of most machines.
function extrude(profileUV, x0, x1, m, shade=tone){ return loft(on(PX(x0),profileUV), on(PX(x1),profileUV), n=>shade(n,m)); }
// Vertical cylinder (axis z) centred (x,y), radius r from z0 to z1, with top cap.
function cyl(x,y,z0,z1,r,m,shade=toneI,w=1.2,n=24){
  const A=on(PZ(z0),ellUV(x,y,r,r,n)), B=on(PZ(z1),ellUV(x,y,r,r,n));
  return loft(A,B,nr=>shade(nr,m)) + fill(pd(B),shade([0,0,1],m)) + hullInk([...A,...B],w) + ink(pd(B),w*.8);
}
// Cylinder lying along x (e.g. a knob or dial sticking out of a front face): centred (y,z), from x0 to x1.
function cylX(x0,x1,y,z,r,m,shade=toneI,w=1.1,n=20){
  const A=on(PX(x0),ellUV(y,z,r,r,n)), B=on(PX(x1),ellUV(y,z,r,r,n));
  // cap on whichever end faces the viewer (the +x end in VIEW 0)
  const capB = vis([1,0,0]), cap = capB ? B : A, cn = capB ? [1,0,0] : [-1,0,0];
  return loft(A,B,nr=>shade(nr,m)) + (vis(cn) ? fill(pd(cap),shade(cn,m)) : '') + hullInk([...A,...B],w) + (vis(cn) ? ink(pd(cap),w*.8) : '');
}
// Cylinder between any two 3D points a and b (a lamp arm, a rod, a pipe at an angle, a handle bar), radius r.
// The end facing the viewer gets a cap. For a tapered part (a cone, a lamp shade) pass r1 for the radius at b.
function rod(a, b, r, m, shade=toneI, w=1, r1=r, n=16){
  const d = norm(sub(b, a)), u = norm(cross(d, Math.abs(d[2]) < .9 ? [0,0,1] : [1,0,0])), v = cross(d, u);
  const ring = (p, rr) => Array.from({length:n}, (_,i) => { const t = i/n*2*Math.PI, c = Math.cos(t)*rr, s2 = Math.sin(t)*rr;
    return [p[0] + u[0]*c + v[0]*s2, p[1] + u[1]*c + v[1]*s2, p[2] + u[2]*c + v[2]*s2]; });
  const A = ring(a, r), B = ring(b, r1), capB = vis(d), cap = capB ? B : A, cn = capB ? d : d.map(x => -x);
  return loft(A, B, nr => shade(nr, m)) + (Math.max(r, r1) > 0 ? fill(pd(cap), shade(cn, m)) + ink(pd(cap), w*.8) : '') + hullInk([...A, ...B], w);
}
// Text lying flat on a front plane x = const, centred at (y,z) baseline; reads left-to-right on screen.
// Hanya huruf Latin dan angka. Huruf Arab TIDAK PERNAH ditulis di figur (aturan keras 1 Surau).
const txM = (o, U, V) => `matrix(${U[0].toFixed(4)} ${U[1].toFixed(4)} ${V[0].toFixed(4)} ${V[1].toFixed(4)} ${f(o[0])} ${f(o[1])})`;
const tx = (x,y,z,str,size,col=INK,weight=700) => { const o=P(x,y,z);
  return `<text transform="${txM(o, Dv(0,-1,0), Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family='${FONT}' font-weight="${weight}" letter-spacing=".02em">${str}</text>`; };
// Text on a side plane y = const, centred at (x,z).
const txY = (x,y,z,str,size,col=INK,weight=700) => { const o=P(x,y,z);
  return `<text transform="${txM(o, Dv(1,0,0), Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family='${FONT}' font-weight="${weight}" letter-spacing=".02em">${str}</text>`; };
// Cast shadow of a set of 3D points (any outline of the object), pushed along the light onto z = 0.
// the light stays put relative to the viewer, so the shadow is cast in turned coordinates
// z0: the surface it falls on (a board, a counter); clip it to that surface with clipTo(...) if it could spill off.
// clip: the 3D outline of the surface it falls on (e.g. boardTop(...)), so it can't spill over the edge.
const castShadow = (pts3, z0=0, clip=null) => { const k = SHADOW_LEN / SHADOW_K;
  const s = fill(sp(hull(pts3.map(([x,y,z]) => { const [a,b] = rotXY(x,y); return P0(a+(z-z0)*SH[0]*k, b+(z-z0)*SH[1]*k, z0); }))), SHADOW, 'class="bayang"');
  return clip ? clipTo(clip, s) : s; };
// A board for the object to stand on (a tray, a desk top, a counter): a rounded slab from (x0,y0) to (x1,y1), h thick.
// Draw it first; then castShadow(points, h, boardTop(x0,y0,x1,y1,h,r)) so shadows lie on it and stop at its edge.
const BOARD = { l:'#e6e1d4', m:'#cfc8b8', d:'#aaa293' }, WOOD = { l:'#d9a86c', m:'#bf8a4f', d:'#8e6236' };
const boardTop = (x0,y0,x1,y1,h=3,r=5) => on(PZ(h), rrUV(x0,y0,x1,y1,r));
function board(x0,y0,x1,y1,h=3,r=5,m=BOARD){
  const A = on(PZ(0), rrUV(x0,y0,x1,y1,r)), B = boardTop(x0,y0,x1,y1,h,r);
  return loft(A, B, n => toneI(n, m)) + fill(pd(B), m.l) + ink(pd(B), 1) + hullInk([...A, ...B], 1.8);
}
// Group helpers: clickable target, clip to an opening.
const act  = (name, inner, data='') => `<g data-act="${name}" ${data}>${inner}</g>`;
let _clipN = 0;
// Part label (for "how does it work" figures): a cream pill with a leader line to a 3D point on the part.
// dx, dy = where the pill sits, in screen units at the reference zoom (they scale with the figure like stroke widths).
// on = that part is working right now (the pill turns the accent colour). Labels can be hidden with the Labels switch.
function tag(p3, dx, dy, text, on=false){
  const k = INK_K, [X,Y] = P(...p3), fs = 8.6*k, w = text.length*fs*.64 + fs*1.5, h = fs*1.8, cx = X + dx*k, cy = Y + dy*k;
  return `<g class="tag${on ? ' on' : ''}"><path d="M${f(X)} ${f(Y)}L${f(cx)} ${f(cy)}" fill="none" stroke="${INK}" stroke-width="1"/>`
    + `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(1.3*k)}" fill="${INK}"/>`
    + `<rect x="${f(cx-w/2)}" y="${f(cy-h/2)}" width="${f(w)}" height="${f(h)}" rx="${f(h/2)}" fill="${on ? PALS.emas.l : '#fbf5e4'}" stroke="${INK}" stroke-width="1.2"/>`
    + `<text x="${f(cx)}" y="${f(cy+fs*.36)}" font-size="${f(fs)}" text-anchor="middle" font-family='${FONT}' font-weight="800" letter-spacing=".04em" fill="${INK}">${text}</text></g>`;
}
const clipTo = (pts3, inner) => { const id = 'k' + (++_clipN); return `<clipPath id="${id}"><path d="${pd(pts3)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`; };

/* ---------- constant on-screen line weight ----------
   Stroke widths are written in model units, and each figure is zoomed to fill the frame, so a small
   object would get fat lines. INK_K rescales every stroke-width (and the wobble/grain filter) so all
   figures match the reference zoom of the booth / vending machine (viewBox ≈ 585 units wide). */
const INK_REF_VB = 585;
let INK_K = 1;
const inkScale = svg => INK_K === 1 ? svg : svg.replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(+w * INK_K).toFixed(2)}"`);


/* ---------- cangkang halaman ----------
   Token warna = palet situs Surau (apps/web/src/app/globals.css), dalam hex karena halaman ini berdiri
   sendiri. Tema: data-tema="terang|gelap|sepia" di <html>, dari ?tema= atau preferensi sistem. */
const CORE_CSS = `
  :root{--kertas:#f9f7f1;--tinta:#201c15;--redup:#605a4e;--garis:#dedbd2;--aksen:#346841;--aksen-isi:#fdfcf8;--bayang:#8a977f;--tombol:#fdfcf8;color-scheme:light}
  :root[data-tema=sepia]{--kertas:#f6efe5;--tinta:#312317;--redup:#634e3c;--garis:#dacfc0;--aksen:#2e5f3a;--tombol:#fbf6ee;--bayang:#a39581}
  :root[data-tema=gelap]{--kertas:#110f0b;--tinta:#f0eee9;--redup:#aeaba0;--garis:#302d28;--aksen:#8bcd99;--aksen-isi:#16261a;--bayang:#000000;--tombol:#1c1914;color-scheme:dark}
  *{box-sizing:border-box} html,body{margin:0;height:100%}
  body{background-color:var(--kertas);
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .42  0 0 0 0 .39  0 0 0 0 .33  .12 0 0 0 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>");
    overflow-x:hidden;color:var(--tinta);font:14px/1.45 ${FONT};display:flex;flex-direction:column;align-items:center;padding:24px 16px 32px}
  .bayang{fill:var(--bayang)} :root[data-tema=gelap] .bayang{fill-opacity:.55}
  header{width:100%;max-width:760px;display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
  header h1{font-size:15px;font-weight:700;margin:0} header span{color:var(--redup);font-size:13px}
  #fig{width:100%;max-width:760px;height:auto;display:block;margin:4px 0 8px;user-select:none;overflow:visible}
  #fig [data-act]{cursor:pointer}
  #readout{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .stage{position:relative;width:100%;max-width:760px}
  .actions{position:absolute;top:4px;left:0;display:flex;flex-direction:column;align-items:flex-start;gap:8px;z-index:2;max-width:220px}
  .actions .cap{color:var(--redup);font-size:12px;font-weight:600;margin:0 0 2px}
  html.nolabels #fig .tag{display:none}
  .ctl[hidden]{display:none}
  .toast{position:absolute;left:0;z-index:3;font-size:13px;background:var(--tombol);color:var(--tinta);
    border:1.5px solid var(--tinta);border-radius:10px;padding:5px 10px;opacity:0;transition:opacity .2s;pointer-events:none;max-width:260px}
  .toast.show{opacity:1}
  .stats{position:absolute;top:4px;right:0;display:flex;flex-direction:column;align-items:flex-end;gap:10px;z-index:2;text-align:right}
  .stat .k{font-size:12px;font-weight:600;color:var(--redup)}
  .stat .v{font-size:32px;font-weight:800;line-height:1.05;letter-spacing:-.01em;font-variant-numeric:tabular-nums;color:var(--tinta)}
  .stat.small .v{font-size:20px}
  .stat .v.bump{animation:bump .35s ease-out}
  @keyframes bump{0%{transform:scale(1.18)}100%{transform:none}}
  .stepwrap{position:relative;display:flex;align-items:center;gap:8px}
  button{font:inherit;color:var(--tinta);background:var(--tombol);border:1.5px solid var(--tinta);border-radius:999px;padding:6px 15px;cursor:pointer;white-space:nowrap;font-weight:600;font-size:13.5px}
  button:hover{background:color-mix(in srgb,var(--tombol) 88%,var(--tinta))}
  button:focus-visible{outline:2px solid var(--aksen);outline-offset:3px}
  .act .car{margin-left:6px;font-size:10px}
  .chips{display:none;flex-wrap:wrap;gap:6px;background:var(--tombol);border:1.5px solid var(--tinta);border-radius:12px;
    padding:8px;width:max-content;max-width:min(300px,62vw);position:absolute;left:calc(100% + 10px);top:-4px;z-index:3}
  .stepwrap.open .chips{display:flex}
  .chip{border-radius:8px;padding:4px 9px;font-size:12.5px}
  .chip.current{background:var(--aksen);color:var(--aksen-isi);border-color:var(--aksen)}
  .chip.off{opacity:.5}
  @media (max-width:560px){body{padding:14px 12px 24px}header span,.actions .cap{display:none}.actions{flex-direction:row;flex-wrap:wrap;gap:6px}button{font-size:12.5px;padding:5px 12px}.stats{position:static;flex-direction:row;justify-content:flex-end;gap:18px;margin-bottom:4px}.actions{position:static;max-width:none;margin:6px 0 4px}.chips{left:0;top:calc(100% + 8px)}}
  .controls{width:100%;max-width:760px;display:flex;gap:14px 28px;border-top:1px solid var(--garis);padding-top:14px}
  .controls:not(:has(.ctl:not([hidden]))){display:none}
  .ctl{display:flex;align-items:center;gap:10px}
  .ctl label{color:var(--redup);font-size:12.5px;font-weight:600}
  /* sematan: tanpa judul, latar transparan (ikut bagian halaman yang menyematkannya) */
  html.sematan body{background:transparent;padding:0} html.sematan header, html.sematan .controls{display:none}
  html.sematan .stage, html.sematan #fig{max-width:none}
  /* polos: gambar saja (tanpa judul, tombol, angka) untuk konten media sosial atau ilustrasi diam */
  html.polos body{padding:0;justify-content:center;overflow:hidden} html.polos header, html.polos .controls, html.polos .actions, html.polos .stats, html.polos .toast{display:none}
  html.polos .stage, html.polos #fig{max-width:none}
  /* sampul: 1200 x 630 untuk Open Graph / cover blog; tanpa tombol */
  html.sampul body{width:1200px;height:630px;padding:56px 64px;display:grid;grid-template-columns:430px 1fr;align-items:center;gap:24px;overflow:hidden}
  html.sampul header, html.sampul .controls, html.sampul .actions, html.sampul .stats, html.sampul .toast{display:none}
  html.sampul .stage, html.sampul #fig{max-width:none} html.sampul #fig{margin:0}
  .sampul-teks{display:flex;flex-direction:column;gap:18px}
  .sampul-teks .kecil{margin:0;font-size:20px;font-weight:700;color:var(--aksen);letter-spacing:.01em}
  .sampul-teks h1{margin:0;font-size:50px;line-height:1.08;font-weight:800;letter-spacing:-.02em;text-wrap:balance}
  .sampul-teks .situs{margin:0;font-size:18px;color:var(--redup);font-weight:600}`;

const filterFor = k => `<filter id="hand" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${(0.045/k).toFixed(4)}" numOctaves="2" seed="4" result="warp"/>
  <feDisplacementMap id="wob" in="SourceGraphic" in2="warp" scale="${(2.4*k).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="wob"/>
  <feTurbulence type="fractalNoise" baseFrequency="${(0.9/k).toFixed(4)}" numOctaves="3" seed="11" result="n1"/>
  <feColorMatrix in="n1" type="matrix" values=".3 0 0 0 .84  .3 0 0 0 .84  .3 0 0 0 .84  0 0 0 0 1" result="grain"/>
  <feTurbulence type="fractalNoise" baseFrequency="${(0.012/k).toFixed(4)}" numOctaves="2" seed="7" result="n2"/>
  <feColorMatrix in="n2" type="matrix" values=".3 0 0 0 .85  .3 0 0 0 .85  .3 0 0 0 .85  0 0 0 0 1" result="blot"/>
  <feBlend in="wob" in2="grain" mode="multiply" result="g1"/><feBlend in="g1" in2="blot" mode="multiply" result="g2"/>
  <feComposite in="g2" in2="wob" operator="in"/></filter>`;

/* mountFigure({
     title:'Kitab di atas rehal', hint:'ketuk kitab untuk membalik halaman',
     alt:'…',                       // deskripsi untuk pembaca layar (bila kosong: title)
     size:[W,D,H],                 // bounding box, used to frame the view (shadow range included)
     palette:'zaitun',             // default PALS key
     state:{...},                  // figure state (st.pal is built in)
     scene: (st, m) => svgString,  // m = current palette {l,m,d}
     readout: st => 'text',        // status untuk pembaca layar (aria-live), tidak tampil
     buttons: [{label, onClick(st, ui)}      // listed in the order the user should do them
               | {label, choices: st => [{label, onClick(st,ui), current?, disabled?, why?}]}],   // opens a picker
     buttonsLabel:'Coba',          // judul kecil di atas tombol
     stats: st => [{label, value, small?}],   // optional: big numbers top-right
     acts: { name(st, el, ui){} },  // clicks on act(name, …) groups; el has dataset
     params(st, q){}               // optional: read URLSearchParams for screenshot states
   })  -> ui = { st, render, animate(stepFn), flash(text,ms) }
   animate(step): calls step(dt seconds) every frame and re-renders until step returns false.
   Parameter URL bawaan: ?tema=terang|gelap|sepia · ?sematan=1 · ?polos=1 · ?sampul=1&judul=…&kecil=… ·
   ?labels=0 · ?gerak=0 (paksa tanpa animasi) · ?press=Label@ms,… (uji). */
addEventListener('error', e => { document.documentElement.dataset.errors = (document.documentElement.dataset.errors || '') + ' ' + e.message + ';'; });
function mountFigure(cfg){
  const q = new URLSearchParams(location.search), root = document.documentElement;
  const tema = q.get('tema');
  root.dataset.tema = ['terang', 'gelap', 'sepia'].includes(tema) ? tema : matchMedia('(prefers-color-scheme: dark)').matches ? 'gelap' : 'terang';
  const sampul = q.get('sampul') === '1';
  root.classList.toggle('sematan', q.get('sematan') === '1');
  root.classList.toggle('sampul', sampul);
  root.classList.toggle('polos', q.get('polos') === '1');
  if (!root.lang) root.lang = 'id';
  document.title = cfg.title;
  const style = document.createElement('style'); style.textContent = CORE_CSS; document.head.appendChild(style);
  document.body.innerHTML = `
    ${sampul ? '<div class="sampul-teks"><p class="kecil"></p><h1></h1><p class="situs">surau.org</p></div>' : ''}
    <header><h1>${cfg.title}</h1><span>${cfg.hint || ''}</span></header>
    <div class="stage">
      ${cfg.buttons && cfg.buttons.length ? `<div class="actions" id="btns" role="group" aria-label="${cfg.buttonsLabel || 'Coba'}"><div class="cap" aria-hidden="true">${cfg.buttonsLabel || 'Coba'}</div></div>` : ''}
      ${cfg.stats ? '<div class="stats" id="stats"></div>' : ''}
      <div class="toast" id="toast" aria-hidden="true"></div>
      <svg id="fig" role="img"><defs id="fdefs"></defs><g id="art" filter="url(#hand)"></g></svg>
    </div>
    <div id="readout" role="status" aria-live="polite"></div>
    <div class="controls">
      <div class="ctl" id="lblctl" hidden><label for="lbl">Label</label><button id="lbl" aria-pressed="true">Tampil</button></div>
    </div>`;
  // teks sampul dari URL dipasang lewat textContent (bukan innerHTML), supaya ?judul= tidak bisa menyisipkan HTML
  if (sampul){ document.querySelector('.sampul-teks .kecil').textContent = q.get('kecil') || 'Surau';
    document.querySelector('.sampul-teks h1').textContent = q.get('judul') || cfg.title; }
  document.getElementById('fig').setAttribute('aria-label', cfg.alt || cfg.title);
  const st = cfg.state || {};            // kept as the same object, so a figure may hold on to it
  if (!st.pal) st.pal = cfg.palette || 'zaitun';
  if (st.az == null) st.az = 105;
  if (Object.hasOwn(PALS, q.get('pal') ?? '')) st.pal = q.get('pal');
  if (cfg.params) cfg.params(st, q);

  // frame on the object itself: centred, filling ~60% of the width / ~78% of the height of a 4:3 view.
  // The cast shadow is allowed to spill outside the frame (svg overflow is visible).
  const [W,D,H] = cfg.size, pts = [];
  OX = OY = 0; RC = cfg.center || [W/2, D/2];
  VIEW = 0;
  for (const x of [0,W]) for (const y of [0,D]) for (const z of [0,H]) pts.push(P(x,y,z));
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
  const bw = Math.max(...xs)-Math.min(...xs), bh = Math.max(...ys)-Math.min(...ys);
  // the object fills ~74% of the width / ~88% of the height, nudged right of centre so the buttons (top left) stay clear;
  // di sampul tidak ada tombol, jadi benda di tengah
  // sampul: bidang gambar ±650 x 520 px, jadi rasionya .8 dan benda boleh lebih penuh
  // polos: rasio mengikuti jendela (mis. 1080 x 1080 untuk media sosial), benda di tengah
  const polos = root.classList.contains('polos'), tengah = sampul || polos;
  const ar = sampul ? .8 : polos ? Math.min(1.5, Math.max(.5, innerHeight / innerWidth)) : .75;
  const fw = sampul ? .94 : polos ? .82 : .74, fh = sampul ? .94 : polos ? .82 : .88;
  const vbW = Math.max(bw/fw, bh/fh/ar), vbH = vbW*ar;
  OX = (vbW-bw)/2 + (tengah ? 0 : vbW*.06) - Math.min(...xs);
  OY = (tengah ? (vbH-bh)*.4 : vbH*.04) - Math.min(...ys);   // sit a little high: shadows fall downward
  const svg = document.getElementById('fig');
  svg.setAttribute('viewBox', `0 0 ${f(vbW)} ${f(vbH)}`);
  INK_K = vbW / INK_REF_VB;
  document.getElementById('fdefs').innerHTML = filterFor(INK_K);

  const art = document.getElementById('art'), readout = document.getElementById('readout');
  const ui = { st };
  let lastRead = '';
  ui.render = () => { _clipN = 0; art.innerHTML = inkScale(cfg.scene(st, PALS[st.pal]));
    const r = cfg.readout ? cfg.readout(st) : ''; if (!ui._flash && r !== lastRead){ lastRead = r; readout.textContent = r; }
    if (ui.drawStats) ui.drawStats(); };
  // big numbers in the top-right corner; a value that changes gets a little bump
  const statsEl = document.getElementById('stats'), prevStats = {};
  ui.drawStats = () => { if (!statsEl) return;
    const list = cfg.stats(st).filter(Boolean), html = list.map(x => `<div class="stat${x.small ? ' small' : ''}"><div class="k">${x.label}</div><div class="v" data-k="${x.label}">${x.value}</div></div>`).join('');
    if (statsEl._html !== html){ statsEl._html = html; statsEl.innerHTML = html;
      statsEl.querySelectorAll('.v').forEach(v => { if (prevStats[v.dataset.k] != null && prevStats[v.dataset.k] !== v.textContent && !diam) v.classList.add('bump'); prevStats[v.dataset.k] = v.textContent; }); } };
  let flashT = 0;
  const toast = document.getElementById('toast');
  ui.flash = (text, ms=1800) => { ui._flash = true; readout.textContent = text; toast.textContent = text;
    toast.style.top = ((document.getElementById('btns') ? document.getElementById('btns').offsetTop + document.getElementById('btns').offsetHeight : 0) + 8) + 'px'; toast.classList.add('show');
    clearTimeout(flashT); flashT = setTimeout(() => { ui._flash = false; lastRead = ''; toast.classList.remove('show'); ui.render(); }, ms); };
  // "kurangi gerakan" (atau ?gerak=0): animasi langsung lompat ke keadaan akhir
  const diam = q.get('gerak') === '0' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  // animations run on a ~60 fps timer rather than requestAnimationFrame, so they also run in headless test shots
  ui.animate = step => {
    if (diam){ for (let i = 0; i < 2000 && step(.05) !== false; i++); ui.render(); return; }
    let last = performance.now();
    const loop = () => { const now = performance.now(), dt = Math.max(0, Math.min(.05,(now-last)/1000)); last = now; const more = step(dt) !== false; ui.render(); if (more) setTimeout(loop, 16); };
    setTimeout(loop, 16); };

  // clickable parts react on press, not on click: while something animates, the scene is redrawn every frame, so the
  // element under the pointer is replaced between press and release and a 'click' would never fire
  svg.addEventListener('pointerdown', e => { if (e.button) return; const a = e.target.closest('[data-act]'); if (!a || !cfg.acts || !cfg.acts[a.dataset.act]) return;
    e.preventDefault(); cfg.acts[a.dataset.act](st, a, ui); ui.render(); });
  const btns = document.getElementById('btns');
  if (btns) cfg.buttons.forEach(b => {
    const wrap = document.createElement('div'); wrap.className = 'stepwrap';
    const el = document.createElement('button'); el.className = 'act';
    el.innerHTML = `${b.label}${b.choices ? '<span class="car" aria-hidden="true">▾</span>' : ''}`;
    if (b.choices) el.setAttribute('aria-expanded', 'false');
    wrap.appendChild(el); btns.appendChild(wrap);
    if (!b.choices){ el.onclick = () => { closeChips(); b.onClick(st, ui); ui.render(); }; return; }
    const chips = document.createElement('div'); chips.className = 'chips'; wrap.appendChild(chips);
    el.onclick = e => { e.stopPropagation(); const open = !wrap.classList.contains('open'); closeChips();
      if (!open) return;
      chips.innerHTML = '';
      // every choice stays clickable, so nothing silently ignores a press:
      //   current:true  = the one in use (shown selected); a press just says so
      //   disabled:true = not possible right now (shown faded); a press says why (c.why, or a generic note)
      for (const c of b.choices(st)){ const ch = document.createElement('button'); ch.className = 'chip' + (c.current ? ' current' : c.disabled ? ' off' : ''); ch.textContent = c.label;
        if (c.current) ch.setAttribute('aria-pressed', 'true');
        ch.onclick = ev => { ev.stopPropagation(); closeChips();
          if (c.current) return ui.flash(`${c.label} sudah dipilih`);
          if (c.disabled) return ui.flash(c.why || `${c.label} belum bisa sekarang`);
          c.onClick(st, ui); ui.render(); }; chips.appendChild(ch); }
      wrap.classList.add('open'); el.setAttribute('aria-expanded', 'true'); };
  });
  function closeChips(){ document.querySelectorAll('.stepwrap.open').forEach(w => { w.classList.remove('open'); w.querySelector('.act').setAttribute('aria-expanded', 'false'); }); }
  document.addEventListener('click', closeChips);

  // labels: the switch appears when the figure draws any tag(); ?labels=0 starts with them hidden
  const lblctl = document.getElementById('lblctl'), lbl = document.getElementById('lbl');
  const setLabels = on => { root.classList.toggle('nolabels', !on); lbl.textContent = on ? 'Tampil' : 'Sembunyi'; lbl.setAttribute('aria-pressed', on); };
  lbl.onclick = () => setLabels(root.classList.contains('nolabels'));
  if (q.get('labels') === '0') setLabels(false);
  // testing: ?press=Label@ms,Label@ms clicks the buttons whose text starts with Label at those times after load
  // (any order, repeats allowed); Label>Choice picks a choice from a picker button (?press=Speed>3@300).
  // Script errors and unknown labels are recorded on <html data-errors="…">
  window.__st = st;
  const noteErr = m => { root.dataset.errors = (root.dataset.errors || '') + ' ' + m + ';'; };
  const starts = (el, t) => el.textContent.trim().toLowerCase().startsWith(t.trim().toLowerCase());
  if (q.has('press')) q.get('press').split(',').forEach(item => { const [what, ms] = item.split('@'), [label, choice] = what.split('>');
    setTimeout(() => { const b = [...document.querySelectorAll('.act')].find(b => starts(b, label));
      if (!b) return noteErr(`no button "${label}"`);
      b.click(); if (choice == null) return;
      const c = [...b.parentElement.querySelectorAll('.chip')].find(c => starts(c, choice));
      if (c && !c.disabled) c.click(); else noteErr(`no choice "${choice}" in "${label}"`); }, +ms || 0); });
  setLight(st.az); ui.render();
  if (art.querySelector('.tag')) lblctl.hidden = false;
  return ui;
}
