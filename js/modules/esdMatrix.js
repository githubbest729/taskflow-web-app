// ESD Cause & Effect matrix (IEC 61511 / SIL-3 style): latching, bypass, first-out, reset guidance
const INIT = [['FD-101', 'Fire detector (2oo3)'], ['GD-201', 'Gas detector HH'], ['LSHH-101', 'Tank overfill'], ['PT-301', 'Pipeline rupture'], ['PB-001', 'Manual ESD (CCR)'], ['PB-002', 'Manual ESD (Field)']];
const ACT = [['XV-101', 'Tank inlet close'], ['XV-102', 'Tank outlet close'], ['P-A/B', 'Pump trip'], ['MOV-301', 'Pipeline SDV close'], ['BDV-401', 'Depressurise open'], ['F-101', 'Fuel gas trip']];
const MAP = [[0, 1, 2, 5], [0, 1, 2, 4, 5], [0, 1], [2, 3, 4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5]];
const active = INIT.map(() => false), bypass = INIT.map(() => false), eff = INIT.map(() => false), firstOut = new Set();
let el, ctx, sig = '', foTs = '', flashUntil = 0;

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'alert'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 6000);
}
export function init(e, c) {
  el = e; ctx = c;
  el.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-a]'); if (!b) return; const i = +b.dataset.i;
    if (b.dataset.a === 'trip') active[i] = !active[i];
    if (b.dataset.a === 'byp') { if (!bypass[i] && !(await ctx.confirm(`Bypass ${INIT[i][0]}? Bypass is logged and reduces SIL-3 protection.`))) return; bypass[i] = !bypass[i]; }
    evaluate();
    if (b.dataset.a === 'reset') {
      const cul = eff.map((v, k) => v ? k : -1).filter(k => k >= 0);
      if (cul.length) {
        const tags = cul.map(k => INIT[k][0]).join(', '); flashUntil = Date.now() + 6000; setTimeout(draw, 6100);
        toast(`Cannot reset: Initiator${cul.length > 1 ? 's' : ''} ${tags} ${cul.length > 1 ? 'are' : 'is'} still in TRIP state. Clear or Bypass field trigger first.`);
        ctx.raise('ESD-RST', `Reset blocked: ${tags} still in TRIP`, 'warn');
      } else { ctx.s.esd.latched.clear(); firstOut.clear(); ctx.clear('ESD-RST'); flashUntil = 0; }
    }
    draw();
  });
  draw();
}
function evaluate() {
  const L = ctx.s.esd.latched, lv = ctx.s.tank101 && ctx.s.tank101.lvl >= 95;
  const on = INIT.map((_, i) => !!((active[i] || (i === 2 && lv)) && !bypass[i]));
  if (L.size === 0 && !firstOut.size && on.some(Boolean)) { on.forEach((v, i) => v && firstOut.add(i)); foTs = new Date().toLocaleTimeString(); }
  INIT.forEach(([tag, n], i) => {
    eff[i] = on[i]; const id = 'ESD-' + i;
    if (on[i]) { MAP[i].forEach(a => L.add('A' + (a + 1))); ctx.raise(id, `ESD initiated by ${tag} ${n}`, 'crit'); } else ctx.clear(id);
  });
  if (!eff.some(Boolean)) ctx.clear('ESD-RST');
}
export function tick(c) { ctx = c; evaluate(); const s = c.s.esd.latched.size + eff.join() + firstOut.size; if (s !== sig) { sig = s; draw(); } }
function draw() {
  if (!el) return; const L = ctx.s.esd.latched, colOn = a => L.has('A' + (a + 1)), flash = Date.now() < flashUntil;
  ctx.keep(() => {
    el.innerHTML = `<h2>ESD Cause &amp; Effect <button type="button" class="info" aria-label="About this view" data-tip="Rows are initiators, columns are shutdown actions. Press Trip to simulate an initiator, Bypass (with confirmation) to inhibit it, then Reset ESD latch once all initiators are clear.">ⓘ</button> <span class="tag ${L.size ? 's-crit' : 's-ok'}">${L.size ? '▲ ESD TRIPPED' : '● HEALTHY'}</span></h2>
  <div class="dash"><article class="card s8"><div class="mx" style="grid-template-columns:72px repeat(${ACT.length},minmax(0,1fr))" role="table" aria-label="Cause and effect matrix">
   <div class="h hdrx" role="columnheader">Cause ↓ / Effect →</div>${ACT.map(([t, n], a) => `<div class="h ${colOn(a) ? 'ch' : ''}" role="columnheader" title="A${a + 1}: ${t} — ${n}" aria-label="A${a + 1} ${t} ${n}">A${a + 1}<small>${t}</small></div>`).join('')}
   ${INIT.map(([t, n], i) => `<div class="h ${eff[i] ? 'rh' : ''}" role="rowheader" title="I${i + 1}: ${t} — ${n}" aria-label="I${i + 1} ${t} ${n}">I${i + 1}${bypass[i] ? ' ◆' : ''}${firstOut.has(i) ? ' ①' : ''}<small>${t}</small></div>${ACT.map((_, a) => { const m = MAP[i].includes(a), hit = eff[i] && m, cls = hit ? 'x' : eff[i] ? 'r' : colOn(a) ? 'c' : ''; return `<div role="cell" class="${cls}" title="${t} → ${ACT[a][0]}">${hit ? '▲' : m ? '✕' : '–'}</div>`; }).join('')}`).join('')}
   <div class="h">Out</div>${ACT.map((_, a) => `<div class="${colOn(a) ? 'x' : ''}">${colOn(a) ? '▲' : '●'}</div>`).join('')}</div>
   <small>✕ mapped · ▲ tripped · ● normal · – none · ◆ bypassed · ① first-out · amber row = active initiator · red column = tripped action</small></article>
  <div class="s4 stack"><article class="card"><h3>Initiators (simulate)</h3><ul class="list">${INIT.map(([t, n], i) => `<li class="${flash && eff[i] ? 'flash' : ''}"><span>I${i + 1} <b>${t}</b> ${n} ${firstOut.has(i) ? `<span class="tag s-crit">① FIRST-OUT ${foTs}</span>` : ''}${eff[i] ? ' <span class="tag s-crit">▲ TRIP</span>' : ''}</span>
   <button class="btn danger" data-k="t${i}" data-a="trip" data-i="${i}" aria-pressed="${active[i]}">${active[i] ? '▲ ACTIVE' : 'Trip'}</button>
   <button class="btn" data-k="b${i}" data-a="byp" data-i="${i}" aria-pressed="${bypass[i]}">${bypass[i] ? '◆ BYPASSED' : 'Bypass'}</button></li>`).join('')}</ul></article>
  <article class="card"><h3>Executive actions</h3><ul class="list">${ACT.map(([t, n], a) => `<li><span>A${a + 1} <b>${t}</b> ${n}</span><b class="tag ${colOn(a) ? 's-crit' : 's-ok'}">${colOn(a) ? '▲ TRIPPED' : '● NORMAL'}</b></li>`).join('')}</ul>
  <button class="btn pri" data-k="rst" data-a="reset" data-i="0" style="margin-top:.6rem">Reset ESD latch</button></article></div></div>`;
  });
}

export function reset() { active.fill(false); bypass.fill(false); eff.fill(false); firstOut.clear(); if (ctx) { ctx.s.esd.latched.clear(); flashUntil = 0; sig = ''; draw(); } }
