// Tank farm telemetry (API 2350 levels) + NSV strapping calculator
const LV = { HH: 95, H: 90, L: 10, LL: 5 };
const T = [
  { id: 'T-101', prod: 'Crude', h: 14000, lvl: 62, t: 31, w: 120, mode: 'fill' },
  { id: 'T-102', prod: 'Crude', h: 14000, lvl: 48, t: 29, w: 90, mode: 'drain' },
  { id: 'T-103', prod: 'Diesel', h: 12000, lvl: 20, t: 27, w: 40, mode: 'hold' }
];
const STRAP = [[0, 0], [1000, 700], [3000, 2150], [5000, 3600], [7000, 5050], [9000, 6500], [11000, 8000], [13000, 9500], [14000, 10000]];
const strap = mm => { for (let i = 1; i < STRAP.length; i++) if (mm <= STRAP[i][0]) { const [a, b] = STRAP[i - 1], [c, d] = STRAP[i]; return b + (d - b) * (mm - a) / (c - a); } return STRAP.at(-1)[1]; };
const vols = (mm, w) => { const tov = strap(mm), fw = Math.min(strap(w), tov); return { tov, fw, gov: tov - fw }; }; // API MPMS Ch.12: GOV = TOV - FW
const state = l => l >= LV.HH ? ['crit', 'HH ▲'] : l >= LV.H ? ['warn', 'H ◆'] : l <= LV.LL ? ['crit', 'LL ▲'] : l <= LV.L ? ['warn', 'L ◆'] : ['ok', 'NORMAL ●'];
const Y = p => 195 - p * 1.8;

const vessel = i => `<svg class="vessel" viewBox="0 0 130 210" role="img" aria-label="${T[i].id} level gauge">
 <path d="M40 15h40v180H40z" fill="#0c1015" stroke="var(--line)" stroke-width="2"/>
 <rect id="tk-f${i}" x="41" y="195" width="38" height="0" fill="var(--cy)" opacity=".75"/>
 <path id="tk-pl${i}" d="M40 195H80" stroke="#fff" stroke-width="2"/>
 ${[0, 25, 50, 75, 100].map(p => `<path d="M33 ${Y(p)}h7" stroke="var(--mut)"/><text x="30" y="${Y(p) + 3}" text-anchor="end">${p}</text>`).join('')}
 <text x="30" y="209" text-anchor="end">% LEVEL</text>
 ${Object.entries(LV).map(([k, v]) => `<path d="M80 ${Y(v)}h9" stroke="${v > 50 ? 'var(--crit)' : 'var(--warn)'}"/><text class="${k.length > 1 && k[0] === k[1] || k === 'LL' ? 'hh' : 'hl'}" x="92" y="${Y(v) + 3}">${k} ${v}%</text>`).join('')}
</svg>`;

export function init(el, ctx) {
  el.innerHTML = `<h2>Tank Farm — API 2350 <button type="button" class="info" aria-label="About this view" data-tip="Live levels against API 2350 HH/H/L/LL setpoints. Press FILL, HOLD or DRAIN on a tank, then use the calculator below to get NSV from gauge data.">ⓘ</button></h2><div class="dash">${T.map((t, i) => `
  <article class="card s4"><h3>${t.id} · ${t.prod} <span id="tk-tag${i}" class="tag"></span></h3>
   <div class="tk">${vessel(i)}<table class="tel"><tbody id="tk-r${i}"></tbody></table></div>
   <div class="row" role="group" aria-label="${t.id} mode" style="margin-top:.6rem">${['fill', 'hold', 'drain'].map(m => `<button class="btn" data-i="${i}" data-m="${m}" aria-pressed="${t.mode === m}">${m.toUpperCase()}</button>`).join('')}</div></article>`).join('')}
  <h3 style="margin-top:.4rem">NSV Strapping Calculator <small>(indicative)</small></h3>
  <article class="card s6"><h3>Gauge inputs</h3>
   ${[['n-lv', 'Observed level', 8000, 'mm'], ['n-t', 'Observed temperature', 30, '°C'], ['n-d', 'Density @ 15 °C', 860, 'kg/m³'], ['n-w', 'Free water level', 100, 'mm']].map(([id, l, v, u]) => `<label for="${id}">${l}</label><div class="ig"><input id="${id}" type="number" inputmode="decimal" value="${v}"><span>${u}</span></div>`).join('')}</article>
  <article class="card s6"><h3>Calculation breakdown</h3><table class="res"><thead><tr><th>Item</th><th>Value</th><th>Basis</th></tr></thead><tbody id="n-out"></tbody></table>
   <small style="margin-top:.5rem">Linear strapping table, VCF per API 11.1 form (K0 = 341.0957). No roof/TOV corrections — verify against certified tables.</small></article></div>`;
  el.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; T[b.dataset.i].mode = b.dataset.m; el.querySelectorAll(`[data-i="${b.dataset.i}"]`).forEach(x => x.setAttribute('aria-pressed', x === b)); });
  const q = id => el.querySelector('#' + id);
  const calc = () => {
    const lv = +q('n-lv').value, tt = +q('n-t').value, d = +q('n-d').value, w = +q('n-w').value;
    const { tov, fw, gov } = vols(lv, w), a = 341.0957 / (d * d), dt = tt - 15, vcf = Math.exp(-a * dt * (1 + .8 * a * dt)), nsv = gov * vcf;
    q('n-out').innerHTML = [['TOV', tov.toFixed(1) + ' m³', 'Strap table'], ['Free water', fw.toFixed(1) + ' m³', 'Strap table'], ['GOV', gov.toFixed(1) + ' m³', 'TOV − FW'], ['ΔT', dt.toFixed(1) + ' °C', 'T − 15'], ['α₁₅', a.toExponential(3) + ' /°C', 'K0 / ρ²'], ['VCF', vcf.toFixed(5), 'API 11.1'], ['NSV', nsv.toFixed(1) + ' m³', 'GOV × VCF']]
      .map(([k, v, b], i, arr) => `<tr><td>${k}</td><td class="${i === arr.length - 1 ? 'big' : ''}">${v}</td><td><span class="badge">${b}</span></td></tr>`).join('');
  };
  el.querySelectorAll('input').forEach(i => i.addEventListener('input', calc)); calc();
}

export function tick(ctx) {
  const L = ctx.s.esd.latched, $ = ctx.$; let worst = 'ok';
  T.forEach((t, i) => {
    if (t.mode === 'fill' && !L.has('A1')) t.lvl += .12;
    if (t.mode === 'drain' && !L.has('A2')) t.lvl -= .12;
    t.lvl = Math.min(100, Math.max(0, t.lvl)); t.t += (Math.random() - .5) * .05; t.w += Math.random() * .02;
    const [sv, txt] = state(t.lvl), id = 'TK-' + t.id;
    if (sv === 'ok') ctx.clear(id); else ctx.raise(id, `${t.id} level ${t.lvl.toFixed(1)} % — ${txt}`, sv);
    if (sv === 'crit') worst = 'crit'; else if (sv === 'warn' && worst === 'ok') worst = 'warn';
    const f = $(`tk-f${i}`), h = t.lvl * 1.8; f.setAttribute('y', 195 - h); f.setAttribute('height', h);
    $(`tk-pl${i}`).setAttribute('d', `M40 ${195 - h}H80`);
    const tg = $(`tk-tag${i}`); tg.className = 'tag s-' + sv; tg.textContent = txt;
    const mm = t.lvl / 100 * t.h, { tov, fw, gov } = vols(mm, t.w);
    $(`tk-r${i}`).innerHTML = [['Level', t.lvl.toFixed(1) + ' %'], ['Level', (t.lvl / 100 * t.h).toFixed(0) + ' mm'], ['TOV (total obs. vol.)', tov.toFixed(1) + ' m³'], ['Free water vol.', fw.toFixed(1) + ' m³'], ['GOV (TOV − FW)', gov.toFixed(1) + ' m³'], ['Temperature', t.t.toFixed(1) + ' °C'], ['Water interface', t.w.toFixed(0) + ' mm'], ['Mode', t.mode.toUpperCase()]].map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
  });
  ctx.s.tankState = worst; ctx.s.tank101 = T[0];
}

const syncBtns = () => document.querySelectorAll('#v-tank [data-m]').forEach(b => b.setAttribute('aria-pressed', T[b.dataset.i].mode === b.dataset.m));
export function reset() { [[62, 31, 120], [48, 29, 90], [20, 27, 40]].forEach(([l, t, w], i) => Object.assign(T[i], { lvl: l, t, w, mode: 'hold' })); syncBtns(); }
export function overfill() { T[0].lvl = 95.5; T[0].mode = 'fill'; syncBtns(); }
