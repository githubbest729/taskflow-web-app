// 4-20 mA calibrator + loop punchlist (localStorage with in-memory fallback) + CSV report export
const KEY = 'scada-loop-punchlist-v1';
let list = [], mem = false;
const load = () => { try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { mem = true; list = []; } };
const save = () => { if (mem) return; try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { mem = true; } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function init(el, ctx) {
  load();
  el.innerHTML = `<h2>Field Commissioning &amp; Loop Check</h2><div class="grid">
  <article class="card"><h3>4–20 mA calibrator</h3>
   <label for="lc-lo">LRV</label><input id="lc-lo" type="number" inputmode="decimal" value="0">
   <label for="lc-hi">URV</label><input id="lc-hi" type="number" inputmode="decimal" value="100">
   <label for="lc-u">Engineering unit</label><input id="lc-u" value="°C">
   <label for="lc-pct">Simulate output: <b id="lc-pl">50 %</b></label><input id="lc-pct" type="range" min="0" max="100" step="1" value="50">
   <div id="lc-sim" role="status" style="margin-top:.4rem"></div></article>
  <article class="card"><h3>Span step table (±0.016 mA = ±0.1 % tol.)</h3><table><thead><tr><th>Span</th><th>mA</th><th>Value</th></tr></thead><tbody id="lc-t"></tbody></table></article>
  <article class="card"><h3>Loop punchlist</h3><label for="lc-tag">Loop tag</label><input id="lc-tag" placeholder="e.g. LT-101">
   <label for="lc-note">Finding</label><input id="lc-note" placeholder="e.g. Fail at 50 % step">
   <div class="row" style="margin-top:.5rem"><button class="btn pri" id="lc-add">Add item</button><button class="btn" id="lc-exp">Export report (CSV)</button></div>
   <p id="lc-msg" role="status" class="s-off"></p><ul class="list" id="lc-l"></ul></article></div>`;
  const $ = ctx.$, g = id => $(id);
  const calc = () => {
    const lo = +g('lc-lo').value, hi = +g('lc-hi').value, u = esc(g('lc-u').value), p = +g('lc-pct').value;
    g('lc-pl').textContent = p + ' %';
    g('lc-sim').innerHTML = `<span class="tag s-cy">${(4 + p * .16).toFixed(3)} mA</span> = <b>${(lo + (hi - lo) * p / 100).toFixed(2)} ${u}</b>`;
    g('lc-t').innerHTML = [0, 25, 50, 75, 100].map(s => `<tr><td>${s} %</td><td>${(4 + s * .16).toFixed(2)}</td><td>${(lo + (hi - lo) * s / 100).toFixed(2)} ${u}</td></tr>`).join('');
  };
  ['lc-lo', 'lc-hi', 'lc-u', 'lc-pct'].forEach(id => g(id).addEventListener('input', calc)); calc();
  const draw = () => {
    g('lc-l').innerHTML = list.length ? list.map((it, i) => `<li><span><b>${esc(it.tag)}</b> — ${esc(it.note)} <small>${esc(it.ts)}</small></span><span class="tag ${it.done ? 's-ok' : 's-warn'}">${it.done ? '● CLOSED' : '◆ OPEN'}</span><button class="btn" data-a="t" data-i="${i}" aria-label="Toggle ${esc(it.tag)}">${it.done ? 'Reopen' : 'Close'}</button><button class="btn" data-a="d" data-i="${i}" aria-label="Delete ${esc(it.tag)}">✕</button></li>`).join('') : '<li><span class="s-off">○ No punch items</span></li>';
    g('lc-msg').textContent = mem ? '◆ Storage unavailable — items kept in memory only.' : '';
  };
  g('lc-add').onclick = () => { const tag = g('lc-tag').value.trim(); if (!tag) { g('lc-tag').focus(); return; } list.push({ tag, note: g('lc-note').value.trim() || '-', done: false, ts: new Date().toLocaleString() }); g('lc-tag').value = g('lc-note').value = ''; save(); draw(); };
  g('lc-l').onclick = e => { const b = e.target.closest('button'); if (!b) return; const i = +b.dataset.i; if (b.dataset.a === 't') list[i].done = !list[i].done; else list.splice(i, 1); save(); draw(); };
  g('lc-exp').onclick = () => {
    const q = s => '"' + String(s).replace(/"/g, '""') + '"', lo = +g('lc-lo').value, hi = +g('lc-hi').value;
    const rows = [['Loop Check Report', new Date().toISOString()], ['LRV', lo, 'URV', hi, 'Unit', g('lc-u').value], [], ['Span %', 'mA', 'Value'], ...[0, 25, 50, 75, 100].map(s => [s, (4 + s * .16).toFixed(2), (lo + (hi - lo) * s / 100).toFixed(2)]), [], ['Tag', 'Finding', 'Status', 'Logged'], ...list.map(i => [i.tag, i.note, i.done ? 'CLOSED' : 'OPEN', i.ts])];
    const url = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'loop-check-report.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  draw();
}
export function tick() {}
