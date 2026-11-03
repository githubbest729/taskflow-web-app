// 5-point 4-20 mA test bench with error calculator + loop punchlist (localStorage) + CSV export
const KP = 'scada-loop-punchlist-v2', KB = 'scada-loop-bench-v1';
const PTS = [0, 25, 50, 75, 100], SUBS = ['Tank', 'LPG', 'Pipeline', 'CDU'], STS = ['Cold Checked', 'Live Tested', 'Punched', 'Approved'];
let list = [], bench = { lo: 0, hi: 100, u: '°C', tol: 0.1, res: {} }, mem = false;
const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { mem = true; return d; } };
const wr = (k, v) => { if (mem) return; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem = true; } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ma = p => 4 + p * .16;

export function init(el, ctx) {
  list = rd(KP, []); bench = { ...bench, ...rd(KB, {}) };
  let sel = 50;
  el.innerHTML = `<h2>Field Commissioning &amp; Loop Check</h2><div class="dash">
  <article class="card s6"><h3>4–20 mA test bench</h3>
   <div class="pts" role="group" aria-label="Test points">${PTS.map(p => `<button class="btn" data-p="${p}" aria-pressed="${p === sel}">${p}% (${ma(p)}mA)</button>`).join('')}</div>
   <div class="pl-form"><div><label for="lc-lo">LRV</label><input id="lc-lo" type="number" inputmode="decimal"></div><div><label for="lc-hi">URV</label><input id="lc-hi" type="number" inputmode="decimal"></div>
   <div><label for="lc-u">Unit</label><input id="lc-u"></div><div><label for="lc-tol">Tolerance (± % span)</label><input id="lc-tol" type="number" step="0.01" inputmode="decimal"></div></div>
   <div class="card" style="margin:.75rem 0 0;background:#0c1015"><div id="lc-exp"></div>
    <label for="lc-m">Measured mA (Fluke 789 / Trex)</label><div class="ig"><input id="lc-m" type="number" step="0.001" inputmode="decimal" placeholder="e.g. 12.004"><span>mA</span></div>
    <div class="row" style="margin-top:.5rem"><span id="lc-dev" role="status"></span><button class="btn pri" id="lc-rec" style="margin-left:auto">Record point</button></div></div></article>
  <article class="card s6"><h3>Recorded results</h3><table><thead><tr><th>Span</th><th>Exp mA</th><th>Meas mA</th><th>Dev %</th><th>Result</th></tr></thead><tbody id="lc-t"></tbody></table><button class="btn" id="lc-clr" style="margin-top:.6rem">Clear results</button></article>
  <article class="card s12"><h3>Loop punchlist</h3><div class="pl-form">
   <div><label for="lc-tag">Tag No</label><input id="lc-tag" placeholder="PT-101" autocapitalize="characters"></div>
   <div><label for="lc-svc">Service description</label><input id="lc-svc" placeholder="Tank T-101 inlet pressure"></div>
   <div><label for="lc-sub">Subsystem</label><select id="lc-sub">${SUBS.map(s => `<option>${s}</option>`).join('')}</select></div>
   <div><label for="lc-st">Status</label><select id="lc-st">${STS.map(s => `<option>${s}</option>`).join('')}</select></div>
   <div><label for="lc-ini">Engineer initials</label><input id="lc-ini" maxlength="4" placeholder="AB" autocapitalize="characters"></div></div>
   <div class="row" style="margin:.6rem 0"><button class="btn pri" id="lc-add">Add item</button><button class="btn" id="lc-exp-csv">Export report (CSV)</button></div>
   <p id="lc-msg" role="status" class="s-warn"></p><ul class="list" id="lc-l"></ul></article></div>`;
  const g = id => el.querySelector('#' + id);
  g('lc-lo').value = bench.lo; g('lc-hi').value = bench.hi; g('lc-u').value = bench.u; g('lc-tol').value = bench.tol;
  const read = () => { bench.lo = +g('lc-lo').value; bench.hi = +g('lc-hi').value; bench.u = g('lc-u').value; bench.tol = Math.abs(+g('lc-tol').value) || 0.1; };
  const dev = () => { const m = g('lc-m').value; if (m === '') return null; const d = (+m - ma(sel)) / 16 * 100; return { m: +m, d, pass: Math.abs(d) <= bench.tol + 1e-9 }; };
  const tagH = r => r.pass ? '<span class="tag s-ok pf">● PASS</span>' : '<span class="tag s-crit pf">▲ FAIL</span>';
  const upd = () => {
    read(); const ev = bench.lo + (bench.hi - bench.lo) * sel / 100, r = dev();
    g('lc-exp').innerHTML = `<div class="kv"><span>Test point</span><b>${sel} %</b></div><div class="kv"><span>Expected mA</span><b>${ma(sel).toFixed(3)} mA</b></div><div class="kv"><span>Expected value</span><b>${ev.toFixed(2)} ${esc(bench.u)}</b></div>`;
    g('lc-dev').innerHTML = r ? `Deviation <b>${r.d >= 0 ? '+' : ''}${r.d.toFixed(3)} %</b> (±${bench.tol} %) ${tagH(r)}` : '<span class="s-off">○ Enter measured mA</span>';
    g('lc-t').innerHTML = PTS.map(p => { const x = bench.res[p]; return `<tr><td>${p} %</td><td>${ma(p).toFixed(2)}</td><td>${x ? x.m.toFixed(3) : '–'}</td><td>${x ? x.d.toFixed(3) : '–'}</td><td>${x ? (x.pass ? '<span class="tag s-ok">● PASS</span>' : '<span class="tag s-crit">▲ FAIL</span>') : '<span class="s-off">○</span>'}</td></tr>`; }).join('');
    wr(KB, bench);
  };
  el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { sel = +b.dataset.p; el.querySelectorAll('[data-p]').forEach(x => x.setAttribute('aria-pressed', x === b)); g('lc-m').value = bench.res[sel]?.m ?? ''; upd(); });
  ['lc-lo', 'lc-hi', 'lc-u', 'lc-tol', 'lc-m'].forEach(id => g(id).addEventListener('input', upd));
  g('lc-rec').onclick = () => { const r = dev(); if (!r) { g('lc-m').focus(); return; } bench.res[sel] = r; upd(); };
  g('lc-clr').onclick = () => { bench.res = {}; upd(); };
  const draw = () => {
    g('lc-l').innerHTML = list.length ? list.map((it, i) => `<li><span><b>${esc(it.tag)}</b> — ${esc(it.svc)} <small>${esc(it.sub)} · ${esc(it.ini)} · ${esc(it.ts)}</small></span>
     <select data-i="${i}" aria-label="Status for ${esc(it.tag)}">${STS.map(s => `<option${s === it.st ? ' selected' : ''}>${s}</option>`).join('')}</select>
     <span class="tag ${it.st === 'Approved' ? 's-ok' : it.st === 'Punched' ? 's-warn' : 's-cy'}">${it.st === 'Approved' ? '●' : it.st === 'Punched' ? '◆' : '○'} ${esc(it.st)}</span>
     <button class="btn" data-d="${i}" aria-label="Delete ${esc(it.tag)}">✕</button></li>`).join('') : '<li><span class="s-off">○ No punch items</span></li>';
    g('lc-msg').textContent = mem ? '◆ Storage unavailable — items kept in memory only.' : '';
  };
  list = list.map(it => ({ tag: it.tag, svc: it.svc ?? it.note ?? '-', sub: it.sub ?? 'Tank', st: it.st ?? (it.done ? 'Approved' : 'Punched'), ini: it.ini ?? '-', ts: it.ts }));
  g('lc-add').onclick = () => {
    const tag = g('lc-tag').value.trim().toUpperCase(); if (!tag) { g('lc-tag').focus(); return; }
    list.push({ tag, svc: g('lc-svc').value.trim() || '-', sub: g('lc-sub').value, st: g('lc-st').value, ini: g('lc-ini').value.trim().toUpperCase() || '-', ts: new Date().toLocaleString() });
    g('lc-tag').value = g('lc-svc').value = g('lc-ini').value = ''; wr(KP, list); draw();
  };
  g('lc-l').onchange = e => { if (e.target.dataset.i) { list[+e.target.dataset.i].st = e.target.value; wr(KP, list); draw(); } };
  g('lc-l').onclick = e => { const b = e.target.closest('[data-d]'); if (b) { list.splice(+b.dataset.d, 1); wr(KP, list); draw(); } };
  g('lc-exp-csv').onclick = () => {
    read(); const q = s => '"' + String(s).replace(/"/g, '""') + '"';
    const rows = [['Loop Check Report', new Date().toISOString()], ['LRV', bench.lo, 'URV', bench.hi, 'Unit', bench.u, 'Tolerance %', bench.tol], [], ['Span %', 'Expected mA', 'Measured mA', 'Deviation %', 'Result'],
      ...PTS.map(p => { const x = bench.res[p]; return [p, ma(p).toFixed(3), x ? x.m : '', x ? x.d.toFixed(3) : '', x ? (x.pass ? 'PASS' : 'FAIL') : 'NOT TESTED']; }),
      [], ['Tag No', 'Service', 'Subsystem', 'Status', 'Engineer', 'Logged'], ...list.map(i => [i.tag, i.svc, i.sub, i.st, i.ini, i.ts])];
    const url = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'loop-check-report.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  upd(); draw();
}
export function tick() {}
