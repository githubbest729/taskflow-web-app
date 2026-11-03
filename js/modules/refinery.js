// CDU-01: furnace COT, column profile, mass balance & rundown, F-101 BMS status
let cot = 355, sp = 360, feed = 450, rho = 845, purge = 0, chk = 0, el, ctx;
export function init(e, c) {
  el = e; ctx = c;
  el.innerHTML = `<h2>Atmospheric Distillation CDU-01 <button type="button" class="info" aria-label="About this view" data-tip="COT drives tray temperatures and yields. Move the COT slider, edit feed rate, and use Purge &amp; Reset BMS after a fuel gas trip.">ⓘ</button></h2><div class="dash">
  <article class="card s4"><h3>Column C-101 profile</h3><svg id="cd-svg" viewBox="0 0 300 300" role="img" aria-label="Column tray temperatures"></svg></article>
  <article class="card s4"><h3>Furnace F-101 <span id="cd-tag" class="tag"></span></h3><div id="cd-kv"></div>
   <label for="cd-sp">COT setpoint: <b id="cd-spl">${sp} °C</b></label><input id="cd-sp" type="range" min="340" max="390" step="1" value="${sp}"></article>
  <article class="card s4 bms"><h3>F-101 Burner Management (BMS) <span id="bm-tag" class="tag"></span></h3><div id="bm"></div><div class="row" style="margin-top:.6rem"><button class="btn pri" id="bm-rst">Purge &amp; Reset BMS</button></div><p id="bm-msg" role="status" class="s-off" style="margin-top:.4rem"></p></article>
  <article class="card s8"><h3>Crude unit mass balance &amp; product rundown</h3>
   <div class="pl-form"><div><label for="cd-f">Crude feed rate</label><div class="ig"><input id="cd-f" type="number" inputmode="decimal" value="${feed}" min="0"><span>m³/h</span></div></div>
    <div><label for="cd-r">Feed density @ 15 °C</label><div class="ig"><input id="cd-r" type="number" inputmode="decimal" value="${rho}" min="500"><span>kg/m³</span></div></div></div>
   <table style="margin-top:.6rem"><thead><tr><th>Rundown stream</th><th>Flow m³/h</th><th>SG</th><th>Destination</th></tr></thead><tbody id="cd-mb"></tbody></table><div id="cd-mbs" role="status" style="margin-top:.5rem"></div></article>
  <article class="card s4"><h3>Fraction yields (vol %)</h3><div id="cd-y"></div></article></div>`;
  c.$('cd-sp').oninput = e2 => { sp = +e2.target.value; c.$('cd-spl').textContent = sp + ' °C'; };
  c.$('cd-f').oninput = e2 => { feed = Math.max(0, +e2.target.value || 0); };
  c.$('bm-rst').onclick = () => {
    const L = ctx.s.esd.latched, m = ctx.$('bm-msg');
    if (!L.has('A6') && purge === 0) { m.className = 's-off'; m.textContent = '○ BMS healthy — no reset required.'; return; }
    if (cot < 340 || cot > 380) { m.className = 's-warn'; m.textContent = `◆ Reset inhibited: COT ${cot.toFixed(0)} °C is outside 340–380 °C. Use "Reset ESD latch" on the ESD page to re-light from cold.`; return; }
    L.delete('A6'); purge = 5; chk = 2; m.className = 's-ok'; m.textContent = '● Fuel gas trip reset — purging 5 s, burners proved on completion.';
  };
  c.$('cd-r').oninput = e2 => { rho = Math.max(500, +e2.target.value || 845); };
}
export function tick(c) {
  ctx = c; if (!el) return; const $ = c.$, trip = c.s.esd.latched.has('A6');
  if (purge > 0 && !trip) { purge--; if (!purge) { $('bm-msg').className = 's-ok'; $('bm-msg').textContent = '● Purge complete — 4/4 burners proved.'; } }
  if (chk > 0) { chk--; if (trip) { purge = 0; chk = 0; $('bm-msg').className = 's-crit'; $('bm-msg').textContent = '▲ Reset failed: trip re-latched — an initiator is still active. Clear or bypass it on the ESD page.'; } }
  cot += trip ? (150 - cot) * .004 : (sp - cot) * .08 + (Math.random() - .5) * .3;
  let st = 'ok', txt = trip ? '▲ FUEL GAS TRIPPED' : '● NORMAL';
  if (trip) st = 'crit'; else if (cot > 385) { st = 'crit'; txt = '▲ COT HH'; } else if (cot > 375) { st = 'warn'; txt = '◆ COT HIGH'; }
  if (st === 'ok') c.clear('CDU-COT'); else c.raise('CDU-COT', `F-101 COT ${cot.toFixed(0)} °C — ${txt.slice(2)}`, st);
  c.s.cduState = st; const tg = $('cd-tag'); tg.className = 'tag s-' + st; tg.textContent = txt;
  const draft = -2.5 + (Math.random() - .5) * .2, duty = Math.max(0, (cot - 150) * .11), f = Math.max(0, Math.min(1, (cot - 340) / 40));
  $('cd-kv').innerHTML = [['COT (TI-101)', cot.toFixed(1) + ' °C'], ['Heater duty', duty.toFixed(1) + ' MW'], ['Furnace draft (PI-102)', draft.toFixed(2) + ' mmH₂O'], ['Column top P', (1.1 + Math.random() * .02).toFixed(2) + ' barg']].map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');
  const tr = Array.from({ length: 8 }, (_, i) => 120 + (cot - 130) * Math.pow(i / 7, 1.1));
  $('cd-svg').innerHTML = `<rect x="90" y="10" width="90" height="280" rx="30" fill="none" stroke="var(--cy)" stroke-width="3"/>` + tr.map((t, i) => { const y = 40 + i * 32; return `<path d="M90 ${y}H180" stroke="var(--line)"/><text x="190" y="${y + 4}">Tray ${i + 1}: ${t.toFixed(0)} °C</text>`; }).join('') + `<text x="4" y="30">Overhead</text><text x="4" y="150">Draw-offs</text><text x="4" y="285">Residue</text>`;
  // mass balance (residue SG by difference)
  const S = [['Off-Gas (Fuel Gas)', 2, .55, 'FG-100 header'], ['Heavy Naphtha', 14 + 4 * f, .74, 'T-201'], ['Kerosene / Jet A-1', 16 + 3 * f, .80, 'T-202'], ['Ultra-Low Sulfur Diesel (ULSD)', 22 + 2 * f, .84, 'T-103']];
  const arPct = 100 - S.reduce((a, s) => a + s[1], 0), fm = feed * rho / 1000, rows = S.map(s => ({ n: s[0], p: s[1], q: feed * s[1] / 100, sg: s[2], d: s[3] })), mo = rows.reduce((a, r) => a + r.q * r.sg, 0), arQ = feed * arPct / 100;
  rows.push({ n: 'Atmospheric Residue (AR)', p: arPct, q: arQ, sg: arQ ? (fm - mo) / arQ : 0, d: 'T-301' });
  const trp = trip, sc = 1;
  $('cd-mb').innerHTML = rows.map(r => `<tr><td>${r.n}</td><td>${(r.q * sc).toFixed(1)}</td><td>${r.sg.toFixed(3)}</td><td>${r.d}</td></tr>`).join('') + `<tr><th>Total</th><th>${(feed * sc).toFixed(1)}</th><th>${(rho / 1000).toFixed(3)}</th><th>—</th></tr>`;
  $('cd-mbs').innerHTML = `<span class="tag s-cy">Feed ${(fm * sc).toFixed(1)} t/h</span> <span class="tag ${trp ? 's-warn' : 's-ok'}">${trp ? '◆ F-101 TRIPPED — design-basis rates shown' : '● Closure 100 % (AR by difference)'}</span>`;
  $('cd-y').innerHTML = rows.map(r => `<div class="kv"><span>${r.n.split(' (')[0]}</span><b>${r.p.toFixed(1)} %</b></div><div class="bar" role="img" aria-label="${r.n} ${r.p.toFixed(1)} percent"><i style="width:${r.p}%"></i></div>`).join('');
  // BMS
  const burn = trip || purge > 0 ? 0 : 4, ok = !trip && purge === 0, tg2 = $('bm-tag'); tg2.className = 'tag s-' + (ok ? 'ok' : purge > 0 && !trip ? 'warn' : 'crit'); tg2.textContent = ok ? '● PERMISSIVES OK' : purge > 0 && !trip ? '◆ PURGING' : '▲ BMS TRIPPED';
  const chip = (g, t) => `<span class="tag s-${g ? 'ok' : 'crit'}">${g ? '● ' : '▲ '}${t}</span>`;
  $('bm').innerHTML = [['Flame proved', chip(burn === 4, `${burn}/4 Burners ON`)], ['Pilot gas pressure', chip(true, '0.35 barg Healthy')], ['Damper position', `<span class="tag ${ok ? 's-cy' : 's-warn'}">${ok ? '42' : '100'} % Open</span>`], ['Fuel gas SSV (XV-F101)', chip(ok, ok ? 'OPEN' : 'CLOSED')], ['Purge / permissive', chip(ok, ok ? 'COMPLETE' : purge > 0 ? 'PURGING ' + purge + ' s' : 'LOST')]].map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');
}

export function reset() { cot = sp = 360; purge = chk = 0; if (el) { ctx.$('cd-sp').value = sp; ctx.$('cd-spl').textContent = sp + ' °C'; ctx.$('bm-msg').textContent = ''; } }
