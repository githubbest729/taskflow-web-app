// CDU-01: furnace F-101 COT, column tray profile, draft pressure and yields
let cot = 355, sp = 360, el, ctx;
export function init(e, c) {
  el = e; ctx = c;
  el.innerHTML = `<h2>Atmospheric Distillation CDU-01</h2><div class="grid">
  <article class="card"><h3>Column C-101 profile</h3><svg id="cd-svg" viewBox="0 0 300 300" role="img" aria-label="Column tray temperatures"></svg></article>
  <article class="card"><h3>Furnace F-101 <span id="cd-tag" class="tag"></span></h3><div id="cd-kv"></div>
   <label for="cd-sp">COT setpoint: <b id="cd-spl">${sp} °C</b></label><input id="cd-sp" type="range" min="340" max="390" step="1" value="${sp}"></article>
  <article class="card"><h3>Fraction yields (vol %)</h3><div id="cd-y"></div></article></div>`;
  c.$('cd-sp').oninput = e2 => { sp = +e2.target.value; c.$('cd-spl').textContent = sp + ' °C'; };
}
export function tick(c) {
  ctx = c; if (!el) return; const $ = c.$, trip = c.s.esd.latched.has('A6');
  cot += trip ? (150 - cot) * .03 : (sp - cot) * .08 + (Math.random() - .5) * .3;
  let st = 'ok', txt = trip ? '▲ FUEL GAS TRIPPED' : '● NORMAL';
  if (trip) st = 'crit'; else if (cot > 385) { st = 'crit'; txt = '▲ COT HH'; } else if (cot > 375) { st = 'warn'; txt = '◆ COT HIGH'; }
  if (st === 'ok') c.clear('CDU-COT'); else c.raise('CDU-COT', `F-101 COT ${cot.toFixed(0)} °C — ${txt.slice(2)}`, st);
  c.s.cduState = st; const tg = $('cd-tag'); tg.className = 'tag s-' + st; tg.textContent = txt;
  const draft = -2.5 + (Math.random() - .5) * .2, duty = Math.max(0, (cot - 150) * .11), f = Math.max(0, Math.min(1, (cot - 340) / 40));
  $('cd-kv').innerHTML = [['COT (TI-101)', cot.toFixed(1) + ' °C'], ['Heater duty', duty.toFixed(1) + ' MW'], ['Furnace draft (PI-102)', draft.toFixed(2) + ' mmH₂O'], ['Column top P', (1.1 + Math.random() * .02).toFixed(2) + ' barg']].map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');
  const tr = Array.from({ length: 8 }, (_, i) => 120 + (cot - 130) * Math.pow(i / 7, 1.1));
  $('cd-svg').innerHTML = `<rect x="90" y="10" width="90" height="280" rx="30" fill="none" stroke="var(--cy)" stroke-width="3"/>` +
    tr.map((t, i) => { const y = 40 + i * 32; return `<path d="M90 ${y}H180" stroke="var(--line)"/><text x="190" y="${y + 4}">Tray ${i + 1}: ${t.toFixed(0)} °C</text>`; }).join('') +
    `<text x="4" y="30">Overhead</text><text x="4" y="150">Draw-offs</text><text x="4" y="285">Residue</text>`;
  const y = [['Naphtha', 14 + 4 * f], ['Kerosene', 16 + 3 * f], ['Diesel', 22 + 2 * f]]; y.push(['Residue', 100 - y.reduce((a, b) => a + b[1], 0)]);
  $('cd-y').innerHTML = y.map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v.toFixed(1)} %</b></div><div class="bar" role="img" aria-label="${k} ${v.toFixed(1)} percent"><i style="width:${v}%"></i></div>`).join('');
}
