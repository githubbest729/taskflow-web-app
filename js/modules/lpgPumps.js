// LPG pump skids A/B: duty/standby, VFD, vibration (ISO 10816 style limits), interlocks
const P = ['A', 'B'].map((n, i) => ({ n, role: i ? 'STANDBY' : 'DUTY', run: false, hz: 0, sp: 48, suc: 3.2, dis: 0, amps: 0, vib: .1, ovr: false, fault: '', trip: '' }));
let el, ctx;
export function init(e, c) {
  el = e; ctx = c;
  el.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-a]'); if (!b) return; const p = P[+b.dataset.i], a = b.dataset.a, L = ctx.s.esd.latched;
    if (a === 'start') { if (L.has('A3')) ctx.raise('LPG-ESD', 'Start blocked: ESD latched', 'warn'); else if (!p.trip) p.run = true; }
    if (a === 'stop') p.run = false;
    if (a === 'rst' && !L.has('A3')) p.trip = '';
    if (a === 'swap') { P[0].role = P[0].role === 'DUTY' ? 'STANDBY' : 'DUTY'; P[1].role = P[1].role === 'DUTY' ? 'STANDBY' : 'DUTY'; }
    if (a === 'ovr') { if (!p.ovr && !(await ctx.confirm(`Override interlocks on Skid ${p.n}? Trips on low suction/high vibration will be inhibited.`))) return; p.ovr = !p.ovr; }
    if (a === 'fvib') p.fault = p.fault === 'vib' ? '' : 'vib';
    if (a === 'fsuc') p.fault = p.fault === 'suc' ? '' : 'suc';
    draw();
  });
  el.addEventListener('input', ev => { if (ev.target.dataset.sp) { P[+ev.target.dataset.sp].sp = +ev.target.value; ev.target.nextElementSibling.textContent = ev.target.value + ' Hz'; } });
  draw();
}
export function tick(c) {
  ctx = c; const L = c.s.esd.latched;
  P.forEach(p => {
    if (L.has('A3') && p.run) { p.run = false; p.trip = 'ESD'; }
    if (p.run && p.suc < 1 && !p.ovr) { p.run = false; p.trip = 'LOW SUCTION'; }
    if (p.run && p.vib > 7.1 && !p.ovr) { p.run = false; p.trip = 'HIGH VIB'; }
    const tgt = p.run ? p.sp : 0; p.hz += Math.max(-3, Math.min(3, tgt - p.hz));
    p.suc = (p.fault === 'suc' ? .6 : 3.2) + (Math.random() - .5) * .05;
    const f = p.hz / 50; p.dis = p.hz ? p.suc + f * f * 18 : 0; p.amps = p.hz ? 20 + f ** 3 * 55 : 0;
    p.vib = p.hz ? 1.5 + f * 1.2 + Math.random() * .3 + (p.fault === 'vib' ? 5 : 0) : .1;
    const id = 'LPG-V' + p.n;
    if (p.vib > 7.1) c.raise(id, `Skid ${p.n} vibration ${p.vib.toFixed(1)} mm/s HIGH-HIGH`, 'crit'); else if (p.vib > 4.5) c.raise(id, `Skid ${p.n} vibration ${p.vib.toFixed(1)} mm/s HIGH`, 'warn'); else c.clear(id);
    if (p.trip) c.raise('LPG-T' + p.n, `Skid ${p.n} tripped: ${p.trip}`, 'crit'); else c.clear('LPG-T' + p.n);
  });
  const duty = P.find(p => p.role === 'DUTY'), sb = P.find(p => p !== duty);
  if (duty.trip && !L.has('A3') && !sb.run && !sb.trip) { sb.run = true; c.raise('LPG-AUTO', `Standby Skid ${sb.n} auto-started`, 'warn'); }
  if (duty.run) c.clear('LPG-AUTO');
  c.s.pumpsRun = P.filter(p => p.run).length; draw();
}
function draw() {
  if (!el || !ctx) return; const vs = v => v > 7.1 ? ['crit', '▲'] : v > 4.5 ? ['warn', '◆'] : ['ok', '●'];
  ctx.keep(() => {
    el.innerHTML = `<h2>LPG Pumping Station</h2><div class="grid">${P.map((p, i) => { const [vc, vs_] = vs(p.vib), st = p.trip ? ['crit', '▲ TRIPPED: ' + p.trip] : p.run ? ['ok', '● RUNNING'] : ['off', '○ STOPPED'];
      return `<article class="card"><h3>Skid ${p.n} <span class="tag s-cy">${p.role}</span> <span class="tag s-${st[0]}">${st[1]}</span></h3>
  ${[['Suction', p.suc.toFixed(2) + ' barg', p.suc < 1 ? 's-crit' : ''], ['Discharge', p.dis.toFixed(2) + ' barg', ''], ['VFD freq', p.hz.toFixed(1) + ' Hz', ''], ['Motor current', p.amps.toFixed(1) + ' A', ''], ['Bearing vib', `${vs_} ${p.vib.toFixed(2)} mm/s RMS`, 's-' + vc]].map(([k, v, c]) => `<div class="kv"><span>${k}</span><b class="${c}">${v}</b></div>`).join('')}
  <label for="sp${i}">Speed setpoint</label><div class="row" style="flex-wrap:nowrap"><input id="sp${i}" type="range" min="30" max="50" step="1" value="${p.sp}" data-sp="${i}" data-k="sp${i}"><b style="min-width:52px">${p.sp} Hz</b></div>
  <div class="row" style="margin-top:.5rem"><button class="btn pri" data-k="s${i}" data-a="start" data-i="${i}">Start</button><button class="btn" data-k="x${i}" data-a="stop" data-i="${i}">Stop</button><button class="btn" data-k="r${i}" data-a="rst" data-i="${i}">Reset trip</button>
  <button class="btn danger" data-k="o${i}" data-a="ovr" data-i="${i}" aria-pressed="${p.ovr}">${p.ovr ? '◆ OVERRIDE ON' : 'Interlock override'}</button></div>
  <div class="row" style="margin-top:.5rem"><small>Fault sim:</small><button class="btn" data-k="fv${i}" data-a="fvib" data-i="${i}" aria-pressed="${p.fault === 'vib'}">High vib</button><button class="btn" data-k="fs${i}" data-a="fsuc" data-i="${i}" aria-pressed="${p.fault === 'suc'}">Low suction</button></div></article>`; }).join('')}</div>
  <div class="row" style="margin-top:.75rem"><button class="btn" data-k="sw" data-a="swap" data-i="0">⇄ Swap duty / standby</button><small>Alarm: vib &gt; 4.5 mm/s · Trip: &gt; 7.1 mm/s or suction &lt; 1.0 barg</small></div>`;
  });
}
