import * as tank from './modules/tankFarm.js';
import * as esd from './modules/esdMatrix.js';
import * as lpg from './modules/lpgPumps.js';
import * as pipe from './modules/pipeline.js';
import * as cdu from './modules/refinery.js';
import * as loop from './modules/loopCheck.js';

const $ = id => document.getElementById(id);
const SYM = { ok: '●', warn: '◆', crit: '▲', off: '○' };
const alarms = new Map();
const ctx = {
  $, SYM,
  s: { esd: { latched: new Set() }, tankState: 'ok', pumpsRun: 0, plState: 'ok', cduState: 'ok', flowIn: 0, flowOut: 0 },
  raise(id, msg, sev = 'warn') {
    const a = alarms.get(id);
    if (!a) { alarms.set(id, { msg, sev, ts: new Date(), ack: false }); drawAlarms(); }
    else if (a.sev !== sev) { a.msg = msg; a.ack = false; a.sev = sev; drawAlarms(); }
    else if (a.msg !== msg) { a.msg = msg; const n = document.querySelector(`[data-msg="${id}"]`); if (n) n.textContent = msg; drawBanner(); }
  },
  clear(id) { if (alarms.delete(id)) drawAlarms(); },
  confirm(text) {
    return new Promise(res => {
      const d = $('dlg'); $('dlg-text').textContent = text; d.returnValue = '';
      d.addEventListener('close', () => res(d.returnValue === 'ok'), { once: true }); d.showModal();
    });
  },
  keep(fn) { const k = document.activeElement?.dataset?.k; fn(); if (k) document.querySelector(`[data-k="${k}"]`)?.focus(); }
};

const rank = a => (a.ack ? 2 : 0) + (a.sev === 'crit' ? 0 : 1);
const sorted = () => [...alarms.entries()].sort((x, y) => rank(x[1]) - rank(y[1]));
function drawBanner() {
  const list = sorted(), un = list.filter(([, a]) => !a.ack).length, c = $('alarm-count');
  c.className = 'tag ' + (un ? 's-crit' : 's-off'); c.textContent = `${un ? '▲' : '○'} UNACK ${un}`;
  const b = $('alarm-banner'), top = list[0];
  if (!top) { b.className = 'banner s-off'; b.textContent = '○ No active alarms'; b.removeAttribute('title'); return; }
  const a = top[1]; b.className = `banner s-${a.sev}${a.ack ? ' ack' : ''}`; b.tabIndex = 0; b.title = a.ack ? '' : 'Click to acknowledge';
  b.textContent = `${SYM[a.sev]} ${a.sev === 'crit' ? 'CRIT' : 'ADV'}${a.ack ? ' (ACKED)' : ''}: ${a.msg} (${list.length} active, ${un} unack)`;
}
function drawAlarms() {
  const list = sorted();
  $('alarm-list').innerHTML = list.length ? list.map(([id, a]) =>
    `<li class="al ${a.sev} ${a.ack ? 'ack' : 'unack'}"><span class="tag s-${a.sev}">${SYM[a.sev]} ${a.sev === 'crit' ? 'CRITICAL' : 'ADVISORY'}</span><span><b data-msg="${id}">${a.msg}</b> <small>${a.ts.toLocaleTimeString()}${a.ack ? ' · ACKED' : ' · UNACKED'}</small></span>${a.ack ? '' : `<button class="btn" data-ack="${id}">ACK</button>`}</li>`).join('')
    : '<li><span class="s-off">○ No active alarms</span></li>';
  drawBanner();
}
$('alarm-list').addEventListener('click', e => { const k = e.target.dataset.ack; if (k && alarms.has(k)) { alarms.get(k).ack = true; drawAlarms(); } });
const ackTop = () => { const t = sorted()[0]; if (t && !t[1].ack) { t[1].ack = true; drawAlarms(); } };
$('alarm-banner').addEventListener('click', ackTop);
$('alarm-banner').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ackTop(); } });

// ---- Mimic ----
const NODES = [['t', 'T-101', 'tank', 10], ['xv1', 'XV-101', 'valve', 140], ['p', 'P-A/B', 'pump', 270], ['xv2', 'MOV-301', 'valve', 400], ['pl', 'PIPELINE', 'pipe', 530], ['cdu', 'CDU-01', 'column', 690]];
$('mimic').innerHTML = `<g stroke="var(--cy)" stroke-width="3"><path d="M66 70H140M196 70H270M326 70H400M456 70H530M586 70H690"/></g>` +
  NODES.map(([id, l, ic, x]) => `<g id="m-${id}" style="color:var(--off)"><use href="assets/icons.svg#${ic}" x="${x}" y="42" width="56" height="56"/><text x="${x + 28}" y="116" text-anchor="middle">${l}</text><text id="m-st-${id}" x="${x + 28}" y="136" text-anchor="middle" font-weight="700">○</text></g>`).join('');
function setN(id, st, txt) { const g = $('m-' + id); g.style.color = `var(--${st === 'off' ? 'off' : st === 'ok' ? 'ok' : st})`; $('m-st-' + id).textContent = `${SYM[st]} ${txt}`; $('m-st-' + id).style.fill = g.style.color; }
function mimic() {
  const s = ctx.s, L = s.esd.latched;
  setN('t', s.tankState, s.tankState === 'ok' ? 'NORMAL' : 'ALARM');
  setN('xv1', L.has('A1') ? 'crit' : 'ok', L.has('A1') ? 'CLOSED' : 'OPEN');
  setN('p', s.pumpsRun ? 'ok' : 'off', s.pumpsRun ? 'RUN ×' + s.pumpsRun : 'STOP');
  setN('xv2', L.has('A4') ? 'crit' : 'ok', L.has('A4') ? 'CLOSED' : 'OPEN');
  setN('pl', s.plState, `${Math.round(s.flowOut)} m³/h`);
  setN('cdu', s.cduState, s.cduState === 'ok' ? 'NORMAL' : 'ALARM');
}

// ---- Router ----
const VIEWS = ['home', 'tank', 'esd', 'lpg', 'pipe', 'cdu', 'loop'];
const MODS = { tank, esd, lpg, pipe, cdu, loop };
for (const k in MODS) MODS[k].init($('v-' + k), ctx);
function route() {
  const h = decodeURIComponent(location.hash.slice(1)), v = VIEWS.includes(h) ? h : 'home';
  VIEWS.forEach(n => { $('v-' + n).hidden = n !== v; });
  document.querySelectorAll('#nav a').forEach(a => { if (a.getAttribute('href') === '#' + v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.title = 'SCADA I&C – ' + v.toUpperCase();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);   // nav clicks, manual edits
window.addEventListener('popstate', route);     // browser back / forward
window.addEventListener('pageshow', route);     // bfcache restores
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', route); else route(); // direct /#loop URLs

// ---- Toast, info tooltips, guide, demo scenarios ----
function toast(msg, ms = 8000) {
  let t = $('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'alert'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms);
}
const tip = $('tip'); let tipFor = null; const canHover = () => matchMedia('(hover:hover)').matches;
function showTip(b) {
  tip.textContent = b.dataset.tip; tip.hidden = false; tip.style.maxWidth = Math.min(300, innerWidth - 16) + 'px';
  const r = b.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8) + 'px';
  tip.style.top = (r.bottom + 8 + h > innerHeight - 8 ? r.top - h - 8 : r.bottom + 8) + 'px';
  tipFor?.removeAttribute('aria-describedby'); b.setAttribute('aria-describedby', 'tip'); tipFor = b;
}
function hideTip() { tip.hidden = true; tipFor?.removeAttribute('aria-describedby'); tipFor = null; }
document.addEventListener('click', e => { const b = e.target.closest('.info'); if (!b) hideTip(); else if (tipFor === b && !canHover()) hideTip(); else showTip(b); });
document.addEventListener('mouseover', e => { const b = e.target.closest('.info'); if (b && canHover()) showTip(b); });
document.addEventListener('mouseout', e => { const b = e.target.closest('.info'); if (b && canHover() && b !== document.activeElement) hideTip(); });
document.addEventListener('focusin', e => { const b = e.target.closest?.('.info'); if (b) showTip(b); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
addEventListener('scroll', hideTip, true);

const gd = $('guide'), GK = 'scada-guide-hide', tabs = [...document.querySelectorAll('#guide [role=tab]')];
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } };
function guideTab(i, focus) { tabs.forEach((t, j) => { t.setAttribute('aria-selected', i === j); t.tabIndex = i === j ? 0 : -1; $('g-p' + (j + 1)).hidden = i !== j; }); if (focus) tabs[i].focus(); }
function openGuide() { $('g-skip').checked = lsGet(GK) === '1'; guideTab(0); if (!gd.open) gd.showModal(); }
tabs.forEach((t, i) => { t.onclick = () => guideTab(i); t.onkeydown = e => { const k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: 4 }[e.key]; if (k !== undefined) { e.preventDefault(); guideTab((k + 5) % 5, true); } }; });
$('help').onclick = openGuide; $('g-close').onclick = () => gd.close();
gd.addEventListener('click', e => { if (e.target === gd) gd.close(); });
gd.addEventListener('close', () => { lsSet(GK, $('g-skip').checked ? '1' : null); $('help').focus(); });
if (lsGet(GK) !== '1') setTimeout(openGuide, 400);

function resetAll() {
  esd.reset(); tank.reset(); lpg.reset(); pipe.reset(); cdu.reset();
  alarms.clear(); ctx.s.esd.latched.clear(); drawAlarms();
}
const SCN = {
  normal: ['#home', () => {}, 'Reset to Normal Production: alarms and latches cleared, valves open, Skid A running, tanks holding.'],
  s1: ['#esd', () => tank.overfill(), 'T-101 overfill: LSHH-101 tripped, ESD A1/A2 latched (first-out I3). To recover, bypass I3 and reset the latch, or use Reset to Normal.'],
  s2: ['#pipe', () => pipe.leakAt(70), 'Leak at KM 70: CPM imbalance alarm raised. Isolate the section by closing SV-1 (KM 40) and SV-2 (KM 80).'],
  s3: ['#lpg', () => lpg.vibFault('A'), 'Skid A high vibration: it will trip above 7.1 mm/s and standby Skid B should auto-start.']
};
function runScenario(k) { const [h, fn, msg] = SCN[k]; resetAll(); fn(); tick(); tick(); if (location.hash !== h) location.hash = h; toast(msg); }
$('scn').onchange = e => { if (e.target.value) runScenario(e.target.value); e.target.value = ''; };
$('reset').onclick = () => runScenario('normal');

// ---- Simulation loop ----
function tick() {
  esd.tick(ctx); tank.tick(ctx); lpg.tick(ctx); pipe.tick(ctx); cdu.tick(ctx); mimic();
  if (tipFor && !tipFor.isConnected) hideTip();
  $('clock').textContent = new Date().toLocaleTimeString([], { hour12: false });
}
drawAlarms(); tick(); setInterval(tick, 1000);

// ---- PWA: network, install, SW ----
function net() { const n = $('net'); n.className = 'tag ' + (navigator.onLine ? 's-ok' : 's-warn'); n.textContent = navigator.onLine ? '● ONLINE' : '◆ OFFLINE'; }
addEventListener('online', net); addEventListener('offline', net); net();
let dip = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); dip = e; $('install').hidden = false; });
$('install').addEventListener('click', async () => { if (!dip) return; dip.prompt(); await dip.userChoice; dip = null; $('install').hidden = true; });
addEventListener('appinstalled', () => { $('install').hidden = true; });
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW failed', e)));
