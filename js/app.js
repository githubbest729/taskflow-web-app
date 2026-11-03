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
  const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  VIEWS.forEach(n => { $('v-' + n).hidden = n !== v; });
  document.querySelectorAll('#nav a').forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + v) || a.removeAttribute('aria-current'));
  document.querySelectorAll('#nav a').forEach(a => { if (a.getAttribute('href') === '#' + v) a.setAttribute('aria-current', 'page'); });
  document.title = 'SCADA I&C – ' + v.toUpperCase();
}
addEventListener('hashchange', route); route();

// ---- Simulation loop ----
function tick() {
  esd.tick(ctx); tank.tick(ctx); lpg.tick(ctx); pipe.tick(ctx); cdu.tick(ctx); mimic();
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
