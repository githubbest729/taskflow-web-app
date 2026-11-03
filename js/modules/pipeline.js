// Crude pipeline: hydraulic gradient KM0-120, CPM mass-balance leak detection (API 1130), batches, sectional valves
const KM = Array.from({ length: 13 }, (_, i) => i * 10);
const V = [{ id: 'SV-1', km: 40, open: true }, { id: 'SV-2', km: 80, open: true }, { id: 'SV-3', km: 120, open: true }];
let batches = [{ id: 'B-17', prod: 'Arab Light', head: 95, tail: 60 }, { id: 'B-18', prod: 'Basrah Medium', head: 55, tail: 20 }, { id: 'B-19', prod: 'Arab Light', head: 15, tail: 0 }];
let leak = false, leakKm = 70, el, ctx, seq = 20;
const P0 = 55;
export function init(e, c) {
  el = e; ctx = c;
  el.innerHTML = `<h2>Crude Pipeline CPM <small>(API 1130)</small></h2>
  <article class="card"><svg id="pl-svg" viewBox="0 0 600 250" role="img" aria-label="Hydraulic gradient profile KM 0 to 120"></svg></article>
  <div class="grid"><article class="card"><h3>Flow balance</h3><div id="pl-kv"></div><div id="pl-tag" role="status" style="margin-top:.5rem"></div></article>
  <article class="card"><h3>Leak simulation</h3><button class="btn danger" id="pl-leak" aria-pressed="false">Simulate leak</button><label for="pl-km">Leak location: <span id="pl-kml">KM 70</span></label><input id="pl-km" type="range" min="5" max="115" step="5" value="70"></article>
  <article class="card"><h3>Sectional valves</h3><div class="row" id="pl-v"></div></article>
  <article class="card"><h3>Batch tracking</h3><table><thead><tr><th>Batch</th><th>Product</th><th>Head km</th><th>Tail km</th></tr></thead><tbody id="pl-b"></tbody></table></article></div>`;
  const $ = ctx.$;
  $('pl-leak').onclick = e2 => { leak = !leak; e2.target.setAttribute('aria-pressed', leak); e2.target.textContent = leak ? '▲ LEAK ACTIVE' : 'Simulate leak'; };
  $('pl-km').oninput = e2 => { leakKm = +e2.target.value; $('pl-kml').textContent = 'KM ' + leakKm; };
  $('pl-v').innerHTML = V.map((v, i) => `<button class="btn" data-i="${i}" aria-pressed="true">${v.id} KM${v.km}: OPEN</button>`).join('');
  $('pl-v').onclick = e2 => { const b = e2.target.closest('button'); if (!b) return; const v = V[b.dataset.i]; v.open = !v.open; b.setAttribute('aria-pressed', v.open); b.textContent = `${v.id} KM${v.km}: ${v.open ? 'OPEN' : '▲ CLOSED'}`; };
}
export function tick(c) {
  ctx = c; if (!el) return; const $ = c.$, L = c.s.esd.latched;
  const blocked = L.has('A4') || V.some(v => !v.open) || c.s.pumpsRun === 0 && false;
  const fin = blocked ? 0 : 1200 + (Math.random() - .5) * 6, lk = leak && !blocked ? 36 : 0, fout = blocked ? 0 : fin - lk + (Math.random() - .5) * 4;
  const imb = fin ? (fin - fout) / fin * 100 : 0; c.s.flowIn = fin; c.s.flowOut = fout;
  let st = 'ok', txt = '● CPM NORMAL';
  if (imb > 1.5) { st = 'crit'; txt = `▲ LEAK SUSPECTED ~KM ${leakKm}`; c.raise('PL-LEAK', `CPM leak alarm: imbalance ${imb.toFixed(1)} % near KM ${leakKm}`, 'crit'); }
  else { c.clear('PL-LEAK'); if (blocked) { st = 'warn'; txt = '◆ LINE ISOLATED'; c.raise('PL-ISO', 'Pipeline isolated (valve closed / ESD)', 'warn'); } else c.clear('PL-ISO'); }
  c.s.plState = st;
  $('pl-kv').innerHTML = [['Flow IN (FT-301)', fin.toFixed(0) + ' m³/h'], ['Flow OUT (FT-399)', fout.toFixed(0) + ' m³/h'], ['Imbalance', imb.toFixed(2) + ' %']].map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');
  $('pl-tag').innerHTML = `<span class="tag s-${st}">${txt}</span>`;
  // gradient
  const g1 = .4 + (lk ? .15 : 0), g2 = lk ? .25 : .4, pr = km => blocked ? P0 - .05 * km : (!lk || km <= leakKm ? P0 - g1 * km : P0 - g1 * leakKm - g2 * (km - leakKm));
  const X = km => 40 + km / 120 * 540, Y = p => 220 - p / 60 * 200;
  let s = [0, 10, 20, 30, 40, 50, 60].map(p => `<path d="M40 ${Y(p)}H580" stroke="var(--line)"/><text x="4" y="${Y(p) + 4}">${p}</text>`).join('') + KM.map(k => `<text x="${X(k)}" y="240" text-anchor="middle">${k}</text>`).join('') + '<text x="4" y="12">bar</text>';
  s += `<polyline fill="none" stroke="var(--cy)" stroke-width="3" points="${KM.map(k => `${X(k)},${Y(pr(k))}`).join(' ')}"/>`;
  s += V.map(v => `<g><path d="M${X(v.km)} 20V220" stroke="${v.open ? 'var(--ok)' : 'var(--crit)'}" stroke-dasharray="4"/><text x="${X(v.km)}" y="30" text-anchor="middle" fill="currentColor">${v.id} ${v.open ? '●' : '▲'}</text></g>`).join('');
  if (lk) s += `<path d="M${X(leakKm)} 20V220" stroke="var(--crit)" stroke-width="2"/><text x="${X(leakKm)}" y="48" text-anchor="middle" style="fill:var(--crit);font-weight:700">▲ LEAK</text>`;
  $('pl-svg').innerHTML = s;
  const dv = blocked ? 0 : .5; batches.forEach(b => { b.head += dv; b.tail += dv; });
  batches = batches.filter(b => b.tail < 120); if (batches.at(-1).tail >= 20) batches.push({ id: 'B-' + (seq++), prod: seq % 2 ? 'Arab Light' : 'Basrah Medium', head: 0, tail: -20 + 0 });
  $('pl-b').innerHTML = batches.map(b => `<tr><td>${b.id}</td><td>${b.prod}</td><td>${Math.min(120, b.head).toFixed(1)}</td><td>${Math.max(0, b.tail).toFixed(1)}</td></tr>`).join('');
}
