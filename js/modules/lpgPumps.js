// LPG pump skids A/B: duty/standby, VFD, vibration, interlocks, 60 s trend & operating curve
const P = ['A', 'B'].map((n, i) => ({ n, role: i ? 'STANDBY' : 'DUTY', run: false, hz: 0, sp: 48, suc: 3.2, dis: 0, amps: 0, vib: .1, ovr: false, fault: '', trip: '' }));
const H = { A: { a: [], d: [] }, B: { a: [], d: [] } };
const FAULTS = [['', 'None'], ['vib', 'High vibration'], ['suc', 'Low suction'], ['seal', 'Seal flush loss'], ['ovl', 'Motor overload']];
const RULES = [['Low Suction Trip (< 1.0 barg)', p => p.suc >= 1], ['High Vibration Trip (> 7.1 mm/s)', p => p.vib <= 7.1], ['Seal Flush Plan 53B Pressure Normal', p => p.fault !== 'seal'], ['Motor Overload Relay Healthy', p => p.amps <= 78]];
let el, ctx, sel = 0;
const $q = id => el.querySelector('#' + id);

export function init(e, c) {
  el = e; ctx = c;
  el.innerHTML = `<h2>LPG Pumping Station <button type="button" class="info" aria-label="About this view" data-tip="Skid A/B duty-standby control. Start or Stop a skid, set VFD speed, swap duty, or pick a fault to watch interlocks and auto-standby changeover.">ⓘ</button></h2><div class="grid" id="lp-sk"></div>
  <div class="row" id="lp-ctl" style="margin:.75rem 0"><button class="btn" data-k="sw" data-a="swap" data-i="0">⇄ Swap duty / standby</button><small>Alarm: vib &gt; 4.5 mm/s · Trip: &gt; 7.1 mm/s, suction &lt; 1.0 barg, seal flush loss, overload &gt; 78 A</small></div>
  <div class="dash"><article class="card s8"><div class="row"><h3 style="margin:0">Trend (60 s) &amp; operating curve</h3><div class="row" role="group" aria-label="Skid for trend" style="margin-left:auto">${P.map((p, i) => `<button class="btn" data-sk="${i}" aria-pressed="${i === sel}">Skid ${p.n}</button>`).join('')}</div></div>
   <div class="lp-charts"><svg id="lp-tr" viewBox="0 0 480 220" role="img" aria-label="Motor amps and discharge pressure, last 60 seconds"></svg><svg id="lp-oc" viewBox="0 0 240 220" role="img" aria-label="Discharge pressure versus speed curve"></svg></div></article>
  <article class="card s4"><h3>Interlock status</h3><ul class="list il" id="lp-il"></ul></article></div>`;
  el.addEventListener('click', async ev => {
    const sk = ev.target.closest('[data-sk]'); if (sk) { sel = +sk.dataset.sk; el.querySelectorAll('[data-sk]').forEach(x => x.setAttribute('aria-pressed', x === sk)); charts(); return; }
    const b = ev.target.closest('[data-a]'); if (!b) return; const p = P[+b.dataset.i], a = b.dataset.a, L = ctx.s.esd.latched;
    if (a === 'start') { if (L.has('A3')) ctx.raise('LPG-ESD', 'Start blocked: ESD latched', 'warn'); else if (!p.trip) p.run = true; }
    if (a === 'stop') p.run = false;
    if (a === 'rst' && !L.has('A3')) { p.trip = ''; p.fault = ''; }
    if (a === 'swap') { P[0].role = P[0].role === 'DUTY' ? 'STANDBY' : 'DUTY'; P[1].role = P[1].role === 'DUTY' ? 'STANDBY' : 'DUTY'; }
    if (a === 'ovr') { if (!p.ovr && !(await ctx.confirm(`Override interlocks on Skid ${p.n}? Trips will be inhibited.`))) return; p.ovr = !p.ovr; }
    draw();
  });
  el.addEventListener('change', ev => { if (ev.target.dataset.f !== undefined) { P[+ev.target.dataset.f].fault = ev.target.value; } });
  el.addEventListener('input', ev => { if (ev.target.dataset.sp) { P[+ev.target.dataset.sp].sp = +ev.target.value; ev.target.nextElementSibling.textContent = ev.target.value + ' Hz'; } });
  draw(); charts(); interlocks();
}
export function tick(c) {
  ctx = c; const L = c.s.esd.latched;
  P.forEach(p => {
    if (L.has('A3') && p.run) { p.run = false; p.trip = 'ESD'; }
    if (p.run && p.suc < 1 && !p.ovr) { p.run = false; p.trip = 'LOW SUCTION'; }
    if (p.run && p.vib > 7.1 && !p.ovr) { p.run = false; p.trip = 'HIGH VIB'; }
    if (p.run && p.fault === 'seal' && !p.ovr) { p.run = false; p.trip = 'SEAL FLUSH 53B'; }
    if (p.run && p.amps > 78 && !p.ovr) { p.run = false; p.trip = 'MOTOR OVERLOAD'; }
    const tgt = p.run ? p.sp : 0; p.hz += Math.max(-3, Math.min(3, tgt - p.hz));
    p.suc = (p.fault === 'suc' ? .6 : 3.2) + (Math.random() - .5) * .05;
    const f = p.hz / 50; p.dis = p.hz ? p.suc + f * f * 18 : 0; p.amps = p.hz ? 20 + f ** 3 * 55 + (p.fault === 'ovl' ? 25 : 0) : 0;
    p.vib = p.hz ? 1.5 + f * 1.2 + Math.random() * .3 + (p.fault === 'vib' ? 5 : 0) : .1;
    const id = 'LPG-V' + p.n;
    if (p.vib > 7.1) c.raise(id, `Skid ${p.n} vibration HIGH-HIGH`, 'crit'); else if (p.vib > 4.5) c.raise(id, `Skid ${p.n} vibration HIGH`, 'warn'); else c.clear(id);
    if (p.trip) c.raise('LPG-T' + p.n, `Skid ${p.n} tripped: ${p.trip}`, 'crit'); else c.clear('LPG-T' + p.n);
    const h = H[p.n]; h.a.push(p.amps); h.d.push(p.dis); if (h.a.length > 60) { h.a.shift(); h.d.shift(); }
  });
  const duty = P.find(p => p.role === 'DUTY'), sb = P.find(p => p !== duty);
  if (duty.trip && !L.has('A3') && !sb.run && !sb.trip) { sb.run = true; c.raise('LPG-AUTO', `Standby Skid ${sb.n} auto-started`, 'warn'); }
  if (duty.run) c.clear('LPG-AUTO');
  c.s.pumpsRun = P.filter(p => p.run).length;
  const f = document.activeElement; if (!(f && el.contains(f) && (f.tagName === 'SELECT' || f.type === 'range'))) draw();
  charts(); interlocks();
}
function charts() {
  if (!el) return; const p = P[sel], h = H[p.n], N = h.a.length, X = i => 44 + (i + 60 - N) / 59 * 360, Y1 = v => 176 - Math.min(v, 100) / 100 * 150, Y2 = v => 176 - Math.min(v, 25) / 25 * 150;
  let s = [0, 25, 50, 75, 100].map(v => `<path d="M44 ${Y1(v)}H404" stroke="var(--line)"/><text x="40" y="${Y1(v) + 3}" text-anchor="end">${v}</text><text x="408" y="${Y1(v) + 3}">${v / 4}</text>`).join('');
  s += [0, 15, 30, 45, 60].map(t => `<text x="${44 + t / 60 * 360}" y="192" text-anchor="middle">${t - 60 || 0}s</text>`).join('');
  s += `<text x="224" y="212" text-anchor="middle" style="font-weight:700">Time (last 60 s)</text><text transform="translate(8 100) rotate(-90)" text-anchor="middle" style="font-weight:700">Motor current (A)</text><text transform="translate(472 100) rotate(90)" text-anchor="middle" style="font-weight:700">Discharge (barg)</text>`;
  s += `<path d="M60 12h24" stroke="var(--cy)" stroke-width="3"/><text x="88" y="16">Amps — Skid ${p.n}</text><path d="M230 12h24" stroke="var(--warn)" stroke-width="3" stroke-dasharray="6 3"/><text x="258" y="16">Discharge P</text>`;
  if (N > 1) s += `<polyline fill="none" stroke="var(--cy)" stroke-width="2.5" points="${h.a.map((v, i) => `${X(i)},${Y1(v)}`).join(' ')}"/><polyline fill="none" stroke="var(--warn)" stroke-width="2.5" stroke-dasharray="6 3" points="${h.d.map((v, i) => `${X(i)},${Y2(v)}`).join(' ')}"/>`;
  $q('lp-tr').innerHTML = s;
  const cx = hz => 40 + (hz - 30) / 20 * 180, cy = v => 176 - v / 25 * 150, pts = []; for (let z = 30; z <= 50; z += 2) pts.push(`${cx(z)},${cy(p.suc + (z / 50) ** 2 * 18)}`);
  let o = [0, 10, 20].map(v => `<path d="M40 ${cy(v)}H220" stroke="var(--line)"/><text x="36" y="${cy(v) + 3}" text-anchor="end">${v}</text>`).join('') + [30, 35, 40, 45, 50].map(z => `<text x="${cx(z)}" y="192" text-anchor="middle">${z}</text>`).join('');
  o += `<text x="130" y="212" text-anchor="middle" style="font-weight:700">Speed (Hz)</text><text transform="translate(8 100) rotate(-90)" text-anchor="middle" style="font-weight:700">Discharge P (barg)</text><polyline fill="none" stroke="var(--cy)" stroke-width="2.5" points="${pts.join(' ')}"/>`;
  if (p.hz > 1) o += `<circle cx="${cx(Math.max(30, p.hz))}" cy="${cy(p.dis)}" r="6" fill="var(--ok)" stroke="#fff"/><text x="220" y="${cy(p.dis) + 20}" text-anchor="end" style="font-weight:700">● OP ${p.hz.toFixed(0)} Hz / ${p.dis.toFixed(1)} bar</text>`; else o += `<text x="130" y="100" text-anchor="middle">○ Skid ${p.n} stopped</text>`;
  $q('lp-oc').innerHTML = o;
}
function interlocks() {
  $q('lp-il').innerHTML = RULES.map(([l, ok]) => `<li><span>${l}</span><div class="chips">${P.map(p => { const g = ok(p), t = g ? ['ok', '● OK'] : p.ovr ? ['warn', '◆ OVERRIDDEN'] : ['crit', '▲ ACTIVE']; return `<span class="tag s-${t[0]}">Skid ${p.n}: ${t[1]}</span>`; }).join('')}</div></li>`).join('');
}
function draw() {
  if (!el || !ctx) return; const vs = v => v > 7.1 ? ['crit', '▲'] : v > 4.5 ? ['warn', '◆'] : ['ok', '●'];
  ctx.keep(() => {
    $q('lp-sk').innerHTML = P.map((p, i) => { const [vc, vs_] = vs(p.vib), st = p.trip ? ['crit', '▲ TRIPPED: ' + p.trip] : p.run ? ['ok', '● RUNNING'] : ['off', '○ STOPPED'];
      return `<article class="card"><h3>Skid ${p.n} <span class="tag s-cy">${p.role}</span> <span class="tag s-${st[0]}">${st[1]}</span></h3>
  ${[['Suction', p.suc.toFixed(2) + ' barg', p.suc < 1 ? 's-crit' : ''], ['Discharge', p.dis.toFixed(2) + ' barg', ''], ['VFD freq', p.hz.toFixed(1) + ' Hz', ''], ['Motor current', p.amps.toFixed(1) + ' A', p.amps > 78 ? 's-crit' : ''], ['Bearing vib', `${vs_} ${p.vib.toFixed(2)} mm/s RMS`, 's-' + vc]].map(([k, v, c]) => `<div class="kv"><span>${k}</span><b class="${c}">${v}</b></div>`).join('')}
  <label for="sp${i}">Speed setpoint</label><div class="row" style="flex-wrap:nowrap"><input id="sp${i}" type="range" min="30" max="50" step="1" value="${p.sp}" data-sp="${i}" data-k="sp${i}"><b style="min-width:52px">${p.sp} Hz</b></div>
  <div class="row" style="margin-top:.5rem"><button class="btn pri" data-k="s${i}" data-a="start" data-i="${i}">Start</button><button class="btn" data-k="x${i}" data-a="stop" data-i="${i}">Stop</button><button class="btn" data-k="r${i}" data-a="rst" data-i="${i}">Reset trip</button>
  <button class="btn danger" data-k="o${i}" data-a="ovr" data-i="${i}" aria-pressed="${p.ovr}">${p.ovr ? '◆ OVERRIDE ON' : 'Interlock override'}</button></div>
  <label for="f${i}">Fault simulation</label><select id="f${i}" data-f="${i}" data-k="f${i}">${FAULTS.map(([v, l]) => `<option value="${v}"${p.fault === v ? ' selected' : ''}>${l}</option>`).join('')}</select></article>`; }).join('');
  });
}

export function reset() { P.forEach((p, i) => Object.assign(p, { role: i ? 'STANDBY' : 'DUTY', run: i === 0, hz: i === 0 ? 48 : 0, sp: 48, trip: '', fault: '', ovr: false, vib: i === 0 ? 2.8 : .1 })); H.A.a.length = H.A.d.length = H.B.a.length = H.B.d.length = 0; if (el && ctx) draw(); }
export function vibFault(n) { P.find(p => p.n === n).fault = 'vib'; if (el && ctx) draw(); }
