// ESD Cause & Effect matrix (IEC 61511 / SIL-3 style) with latching, bypass, and reset permissive
const INIT = ['FD-101 Fire detector (2oo3)', 'GD-201 Gas detector HH', 'LSHH-101 Tank overfill', 'PT-301 Pipeline rupture', 'PB-001 Manual ESD (CCR)', 'PB-002 Manual ESD (Field)'];
const ACT = ['XV-101 Tank inlet close', 'XV-102 Tank outlet close', 'P-A/B Pump trip', 'MOV-301 Pipeline SDV close', 'BDV-401 Depressurise open', 'F-101 Fuel gas trip'];
const MAP = [[0, 1, 2, 5], [0, 1, 2, 4, 5], [0], [2, 3, 4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5]];
const active = INIT.map(() => false), bypass = INIT.map(() => false);
let el, ctx, lastSize = -1;

export function init(e, c) {
  el = e; ctx = c;
  el.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-a]'); if (!b) return; const i = +b.dataset.i;
    if (b.dataset.a === 'trip') active[i] = !active[i];
    if (b.dataset.a === 'byp') { if (!bypass[i] && !(await ctx.confirm(`Bypass ${INIT[i].split(' ')[0]}? Bypass is logged and reduces SIL-3 protection.`))) return; bypass[i] = !bypass[i]; }
    if (b.dataset.a === 'reset') { if (INIT.some((_, k) => active[k] && !bypass[k])) ctx.raise('ESD-RST', 'Reset blocked: initiator still active', 'warn'); else { ctx.s.esd.latched.clear(); ctx.clear('ESD-RST'); } }
    evaluate(); draw();
  });
  draw();
}
function evaluate() {
  const L = ctx.s.esd.latched;
  const lv = ctx.s.tank101 && ctx.s.tank101.lvl >= 95;
  INIT.forEach((n, i) => {
    const on = (active[i] || (i === 2 && lv)) && !bypass[i], id = 'ESD-' + i;
    if (on) { MAP[i].forEach(a => L.add('A' + (a + 1))); ctx.raise(id, `ESD initiated by ${n}`, 'crit'); } else ctx.clear(id);
  });
}
export function tick(c) { ctx = c; evaluate(); if (c.s.esd.latched.size !== lastSize) { lastSize = c.s.esd.latched.size; draw(); } }
function draw() {
  if (!el) return; const L = ctx.s.esd.latched, cols = `grid-template-columns:44px repeat(${ACT.length},minmax(0,1fr))`;
  ctx.keep(() => {
    el.innerHTML = `<h2>ESD Cause &amp; Effect <span class="tag ${L.size ? 's-crit' : 's-ok'}">${L.size ? '▲ ESD TRIPPED' : '● HEALTHY'}</span></h2>
  <article class="card"><div class="mx" style="${cols}" role="table" aria-label="Cause and effect matrix">
   <div class="h" role="columnheader">Cause</div>${ACT.map((_, a) => `<div class="h" role="columnheader">A${a + 1}</div>`).join('')}
   ${INIT.map((n, i) => `<div class="h" role="rowheader">I${i + 1}</div>${ACT.map((_, a) => { const m = MAP[i].includes(a), t = L.has('A' + (a + 1)) && m; return `<div role="cell" class="${t ? 's-crit' : m ? 's-cy' : 's-off'}">${t ? '▲' : m ? '✕' : '–'}</div>`; }).join('')}`).join('')}
   <div class="h">Out</div>${ACT.map((_, a) => `<div class="${L.has('A' + (a + 1)) ? 's-crit' : 's-ok'}">${L.has('A' + (a + 1)) ? '▲' : '●'}</div>`).join('')}</div>
   <small>✕ mapped · ▲ tripped/de-energised · ● normal · – none</small></article>
  <div class="grid"><article class="card"><h3>Initiators (simulate)</h3><ul class="list">${INIT.map((n, i) => `<li><span>I${i + 1} ${n}</span>
   <button class="btn danger" data-k="t${i}" data-a="trip" data-i="${i}" aria-pressed="${active[i]}">${active[i] ? '▲ ACTIVE' : 'Trip'}</button>
   <button class="btn" data-k="b${i}" data-a="byp" data-i="${i}" aria-pressed="${bypass[i]}">${bypass[i] ? '◆ BYPASSED' : 'Bypass'}</button></li>`).join('')}</ul></article>
  <article class="card"><h3>Executive actions</h3><ul class="list">${ACT.map((n, a) => `<li><span>A${a + 1} ${n}</span><b class="tag ${L.has('A' + (a + 1)) ? 's-crit' : 's-ok'}">${L.has('A' + (a + 1)) ? '▲ TRIPPED' : '● NORMAL'}</b></li>`).join('')}</ul>
  <button class="btn pri" data-k="rst" data-a="reset" data-i="0" style="margin-top:.6rem">Reset ESD latch</button></article></div>`;
  });
}
