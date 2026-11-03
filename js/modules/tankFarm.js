// Tank farm telemetry (API 2350 overfill levels) + NSV strapping calculator
const LV = { HH: 95, H: 90, L: 10, LL: 5 };
const T = [
  { id: 'T-101', prod: 'Crude', h: 14000, lvl: 62, t: 31, w: 120, mode: 'fill' },
  { id: 'T-102', prod: 'Crude', h: 14000, lvl: 48, t: 29, w: 90, mode: 'drain' },
  { id: 'T-103', prod: 'Diesel', h: 12000, lvl: 20, t: 27, w: 40, mode: 'hold' }
];
const STRAP = [[0, 0], [1000, 700], [3000, 2150], [5000, 3600], [7000, 5050], [9000, 6500], [11000, 8000], [13000, 9500], [14000, 10000]]; // mm -> m³ (T-101 reference)
const strap = mm => { for (let i = 1; i < STRAP.length; i++) if (mm <= STRAP[i][0]) { const [a, b] = STRAP[i - 1], [c, d] = STRAP[i]; return b + (d - b) * (mm - a) / (c - a); } return STRAP.at(-1)[1]; };
const state = l => l >= LV.HH ? ['crit', 'HH ▲'] : l >= LV.H ? ['warn', 'H ◆'] : l <= LV.LL ? ['crit', 'LL ▲'] : l <= LV.L ? ['warn', 'L ◆'] : ['ok', 'NORMAL ●'];
let ctxRef;

export function init(el, ctx) {
  ctxRef = ctx;
  el.innerHTML = `<h2>Tank Farm — API 2350</h2><div class="grid">${T.map((t, i) => `
  <article class="card"><h3>${t.id} · ${t.prod} <span id="tk-tag${i}" class="tag"></span></h3>
  <div class="row" style="flex-wrap:nowrap"><div class="gauge" aria-hidden="true"><i id="tk-f${i}"></i>
   ${Object.entries(LV).map(([k, v]) => `<b style="bottom:${v}%">${k}</b>`).join('')}</div>
   <div style="flex:1;min-width:0" id="tk-r${i}"></div></div>
  <div class="row" role="group" aria-label="${t.id} mode" style="margin-top:.5rem">${['fill', 'hold', 'drain'].map(m => `<button class="btn" data-i="${i}" data-m="${m}" aria-pressed="${t.mode === m}">${m.toUpperCase()}</button>`).join('')}</div></article>`).join('')}</div>
  <article class="card" style="margin-top:.75rem"><h3>NSV Strapping Calculator</h3>
  <div class="grid"><div><label for="n-lv">Observed level (mm)</label><input id="n-lv" type="number" inputmode="decimal" value="8000" min="0" max="14000"></div>
  <div><label for="n-t">Temperature (°C)</label><input id="n-t" type="number" inputmode="decimal" value="30"></div>
  <div><label for="n-d">Density @15 °C (kg/m³)</label><input id="n-d" type="number" inputmode="decimal" value="860"></div>
  <div><label for="n-w">Free water level (mm)</label><input id="n-w" type="number" inputmode="decimal" value="100"></div></div>
  <div id="n-out" role="status" style="margin-top:.6rem"></div><small>Indicative: linear strapping table, VCF per API 11.1 form (K0=341.0957), no roof/TOV corrections. Verify against certified tables.</small></article>`;
  el.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; T[b.dataset.i].mode = b.dataset.m; el.querySelectorAll(`[data-i="${b.dataset.i}"]`).forEach(x => x.setAttribute('aria-pressed', x === b)); });
  const calc = () => {
    const g = id => +el.querySelector('#' + id).value, lv = g('n-lv'), tt = g('n-t'), d = g('n-d'), w = g('n-w');
    const gov = strap(lv), fw = strap(w), a = 341.0957 / (d * d), dt = tt - 15, vcf = Math.exp(-a * dt * (1 + 0.8 * a * dt)), nsv = (gov - fw) * vcf;
    el.querySelector('#n-out').innerHTML = ['GOV (m³)|' + gov.toFixed(1), 'Free water (m³)|' + fw.toFixed(1), 'VCF|' + vcf.toFixed(5), 'NSV (m³)|<span class="s-cy">' + nsv.toFixed(1) + '</span>'].map(r => { const [k, v] = r.split('|'); return `<div class="kv"><span>${k}</span><b>${v}</b></div>`; }).join('');
  };
  el.querySelectorAll('input').forEach(i => i.addEventListener('input', calc)); calc();
}

export function tick(ctx) {
  const L = ctx.s.esd.latched; let worst = 'ok';
  T.forEach((t, i) => {
    const r = (Math.random() - .5);
    if (t.mode === 'fill' && !L.has('A1')) t.lvl += .12;
    if (t.mode === 'drain' && !L.has('A2')) t.lvl -= .12;
    t.lvl = Math.min(100, Math.max(0, t.lvl)); t.t += r * .05; t.w += Math.random() * .02;
    const [sv, txt] = state(t.lvl), id = 'TK-' + t.id;
    if (sv === 'ok') ctx.clear(id); else ctx.raise(id, `${t.id} level ${t.lvl.toFixed(1)} % — ${txt}`, sv);
    if (sv === 'crit') worst = 'crit'; else if (sv === 'warn' && worst === 'ok') worst = 'warn';
    if (t.id === 'T-101' && t.lvl >= LV.HH) ctx.raise('ESD-LSHH', 'T-101 LSHH overfill (API 2350 Cat. 3)', 'crit');
    const $ = ctx.$;
    $(`tk-f${i}`).style.height = t.lvl + '%';
    const tg = $(`tk-tag${i}`); tg.className = 'tag s-' + sv; tg.textContent = txt;
    $(`tk-r${i}`).innerHTML = [['Level', t.lvl.toFixed(1) + ' %'], ['Level', (t.lvl / 100 * t.h).toFixed(0) + ' mm'], ['Volume', strap(t.lvl / 100 * 14000).toFixed(0) + ' m³'], ['Temp', t.t.toFixed(1) + ' °C'], ['Water intf.', t.w.toFixed(0) + ' mm'], ['Mode', t.mode.toUpperCase()]].map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');
  });
  ctx.s.tankState = worst;
  ctx.s.tank101 = T[0];
}
export function esdOverfill() { return T[0].lvl >= LV.HH; }
