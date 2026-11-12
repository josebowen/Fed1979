// Fed1979. App shell: renderer, camera rig, state machine, panels, HUD.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import DATA from '../data/fred-monthly-1978-1984.json';
import { createRoom } from './scene.js';
import * as C from './content.js';
import { clamp, lerp, ease, mulberry } from './fx.js';

const $ = (s) => document.querySelector(s);
const qs = new URLSearchParams(location.search);
const DTCAP = parseFloat(qs.get('dtcap')) || 0.05;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lite = Math.min(innerWidth, innerHeight) < 700;
const isPhone = () => innerWidth < 820;

// ---------- renderer ----------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 400);
const room = createRoom(lite);
const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: lite ? 0 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(room.scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.6, 0.5, 0.9);
composer.addPass(bloom); composer.addPass(new OutputPass());
let W = 1, H = 1;
function resize() {
  W = innerWidth; H = innerHeight;
  const pr = Math.min(devicePixelRatio || 1, lite ? 1.5 : 2);
  renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
  composer.setPixelRatio(pr); composer.setSize(W, H);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  chartDirty = true;
}
addEventListener('resize', resize);

// ---------- data (monthly, FRED) ----------
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mLabel = (m) => `${MON[((Math.round(m) % 12) + 12) % 12]} ${1978 + Math.floor(Math.round(m) / 12)}`;
function val(k, m) { // fractional month interpolation; cpi series starts Jan 1979
  const a = DATA[k], off = k === 'cpi' ? 12 : 0, x = clamp(m - off, 0, a.length - 1), i = Math.floor(x), f = x - i;
  return i >= a.length - 1 ? a[a.length - 1] : lerp(a[i], a[i + 1], f);
}
const SES = C.SESSIONS;
const dataMonth = (s) => s.dm; // latest month of data the members had in hand

// ---------- state ----------
const fresh = () => SES.map(() => ({ sort: {}, sortChecked: false, pred: undefined, predChecked: false, call: undefined, callDone: false, ev: {}, evChecked: false }));
const S = { name: 'title', s: 0, step: 'record', T: 0, ans: fresh(), run: null, titleT: 0 };
const A = () => S.ans[S.s];
const X = () => SES[S.s];
function order(n, seed) { const r = mulberry(seed), a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- camera rig (from the sibling build) ----------
const VIEWS = {
  window: { t: [0, 2.5, -6.2], w: 24, h: 9.5, yaw: 0.0, pitch: 0.1 },
  cityTitle: { t: [0.2, 0.45, 0], w: 9.4, h: 4.4, yaw: 0.42, pitch: 0.6 },
  room: { t: [-0.4, 0.9, -1.0], w: 19.5, h: 8.4, yaw: 0.14, pitch: 0.36 },
  members: { t: [0, 1.0, -2.0], w: 23.5, h: 6.4, yaw: 0.0, pitch: 0.26 },
  city: { t: [0, 0.55, 0.15], w: 9.8, h: 4.6, yaw: 0.24, pitch: 0.6 },
  chain: { t: [0, 0.4, 1.0], w: 15.5, h: 5.8, yaw: 0.1, pitch: 0.66 },
};
const rig = { t: new THREE.Vector3(), d: 30, yaw: 0, pitch: 0.2, view: VIEWS.window, uy: 0, up: 0, zoom: 1, ox: 0, oy: 0 };
const tf = () => Math.tan(camera.fov * Math.PI / 360);
function layout() {
  const ph = isPhone();
  if (S.name === 'title') return ph ? { ox: 0, oy: -H * 0.18, fw: W, fh: H * 0.5 } : { ox: -W * 0.2, oy: 0, fw: W * 0.58, fh: H };
  if (ph) { const pb = $('#panel').offsetHeight, top = $('#hud').offsetHeight + 56; return { ox: 0, oy: (pb - top) / 2, fw: W, fh: Math.max(150, H - pb - top) }; }
  const P = $('#panel').offsetWidth + 24, hudH = $('#hud').offsetHeight;
  return { ox: P / 2, oy: -Math.min(hudH, H * 0.3) * 0.25, fw: W - P, fh: H - hudH * 0.5 };
}
function fitDist(v, L) { const w = v.w * (W < H ? 0.62 : 1); return Math.max(v.h * H / (2 * tf() * L.fh), w * H / (2 * tf() * L.fw)); }
function setView(name, snap) { rig.view = VIEWS[name]; rig.uy *= 0.3; rig.up *= 0.3; rig.zoom = 1; if (snap || reduce) snapRig(); }
function snapRig() { const v = rig.view, L = layout(); rig.t.fromArray(v.t); rig.yaw = v.yaw; rig.pitch = v.pitch; rig.d = fitDist(v, L); rig.ox = L.ox; rig.oy = L.oy; }
const tmpV = new THREE.Vector3(), tmpA = new THREE.Vector3();
function updateRig(dt) {
  const L = layout();
  if (S.name === 'title') { // push from the window, over the table, down into the city
    const u = reduce ? 1 : ease(clamp((S.titleT - 0.6) / 7.5, 0, 1));
    const a = VIEWS.window, b = VIEWS.cityTitle;
    rig.t.fromArray(a.t).lerp(tmpA.fromArray(b.t), u);
    rig.yaw = lerp(a.yaw, b.yaw, u) + (reduce ? 0 : Math.max(0, S.titleT - 8) * 0.02);
    rig.pitch = lerp(a.pitch, b.pitch, u);
    rig.d = lerp(fitDist(a, L), fitDist(b, L), u);
    room.st.power = reduce ? 1 : clamp((S.titleT - 2.5) / 5, 0.04, 1);
  } else {
    const v = rig.view, k = 1 - Math.exp(-2.4 * dt);
    rig.t.lerp(tmpV.fromArray(v.t), k); rig.yaw = lerp(rig.yaw, v.yaw, k); rig.pitch = lerp(rig.pitch, v.pitch, k); rig.d = lerp(rig.d, fitDist(v, L), k);
    room.st.power = 1;
  }
  const ko = reduce ? 1 : 1 - Math.exp(-5 * dt); rig.ox = lerp(rig.ox, L.ox, ko); rig.oy = lerp(rig.oy, L.oy, ko);
  const sway = reduce || S.name === 'title' ? 0 : Math.sin(S.T * 0.12) * 0.05;
  const yaw = rig.yaw + rig.uy + sway, pitch = clamp(rig.pitch + rig.up, -0.1, 1.2), d = rig.d * rig.zoom;
  camera.position.set(rig.t.x + d * Math.sin(yaw) * Math.cos(pitch), rig.t.y + d * Math.sin(pitch), rig.t.z + d * Math.cos(yaw) * Math.cos(pitch));
  camera.lookAt(rig.t);
  camera.setViewOffset(W, H, rig.ox, rig.oy, W, H);
  const fd = Math.min(0.02, 0.45 / d); room.scene.fog.density = fd;
  room.glow.mat.uniforms.uScale.value = H * renderer.getPixelRatio() * 0.5 / tf();
  room.glow.mat.uniforms.uFog.value = fd;
}
{ // pointer and keyboard look
  let drag = null; const pts = new Map(); let pinch = 0;
  canvas.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, e); drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e);
    if (pts.size === 2) { const [a, b] = [...pts.values()], dd = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (pinch) rig.zoom = clamp(rig.zoom * pinch / dd, 0.45, 1.8); pinch = dd; return; }
    if (!drag) return; rig.uy = clamp(rig.uy - (e.clientX - drag.x) * 0.004, -0.9, 0.9); rig.up = clamp(rig.up + (e.clientY - drag.y) * 0.003, -0.3, 0.45); drag = { x: e.clientX, y: e.clientY };
  });
  const end = (e) => { pts.delete(e.pointerId); pinch = 0; drag = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); rig.zoom = clamp(rig.zoom * (1 + Math.sign(e.deltaY) * 0.08), 0.45, 1.8); }, { passive: false });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAbout();
    if (/^(INPUT|BUTTON|A|SELECT)$/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowLeft') rig.uy = clamp(rig.uy - 0.08, -0.9, 0.9); if (e.key === 'ArrowRight') rig.uy = clamp(rig.uy + 0.08, -0.9, 0.9);
    if (e.key === 'ArrowUp') rig.up = clamp(rig.up + 0.05, -0.3, 0.45); if (e.key === 'ArrowDown') rig.up = clamp(rig.up - 0.05, -0.3, 0.45);
    if (e.key === '+' || e.key === '=') rig.zoom = clamp(rig.zoom * 0.92, 0.45, 1.8); if (e.key === '-') rig.zoom = clamp(rig.zoom * 1.08, 0.45, 1.8);
  });
}

// ---------- sound (synthesized, starts only after a click) ----------
const audio = { ctx: null, on: true,
  init() { if (this.ctx || !this.on) return; try { const Ctx = window.AudioContext || window.webkitAudioContext; this.ctx = new Ctx(); this.master = this.ctx.createGain(); this.master.gain.value = 0.45; this.master.connect(this.ctx.destination);
    this.amb = this.ctx.createGain(); this.amb.gain.value = 0.0; const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; f.connect(this.amb); this.amb.connect(this.master);
    [65.4, 98, 130.8].forEach((hz) => { const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz; o.connect(f); o.start(); });
    this.amb.gain.setTargetAtTime(0.025, this.ctx.currentTime, 2); } catch (e) { this.ctx = null; } },
  tone(hz, g, dur, type = 'sine') { if (!this.ctx || !this.on) return; const t = this.ctx.currentTime, o = this.ctx.createOscillator(), a = this.ctx.createGain(); o.type = type; o.frequency.value = hz; a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(a); a.connect(this.master); o.start(t); o.stop(t + dur); },
  gavel() { this.tone(180, 0.18, 0.18, 'triangle'); setTimeout(() => this.tone(150, 0.14, 0.25, 'triangle'), 140); },
  tick() { this.tone(880, 0.03, 0.12, 'triangle'); },
  chime(ok) { this.tone(ok ? 784 : 330, 0.05, 0.4); if (ok) setTimeout(() => this.tone(1175, 0.04, 0.45), 90); },
  toggle() { this.on = !this.on; if (this.ctx) this.amb.gain.setTargetAtTime(this.on ? 0.025 : 0, this.ctx.currentTime, 0.3); },
};

// ---------- labels ----------
const labelBox = $('#labels');
const mkLabel = (cls) => { const el = document.createElement('div'); el.className = 'lab ' + (cls || ''); labelBox.appendChild(el); return el; };
const L = { column: mkLabel('small'), cranes: mkLabel('small'), shops: mkLabel('small'), queue: mkLabel('small'), seats: Array.from({ length: 12 }, () => mkLabel('seat')) };
L.cranes.textContent = 'Construction (mortgage rates)'; L.shops.textContent = 'Shop lights (inflation)'; L.queue.textContent = 'Job seekers (unemployment)';
function place(el, v, show, dy = 0) {
  v.project(camera); const on = show && v.z < 1 && v.z > -1 && (1 - v.y) / 2 * H > 58;
  el.style.opacity = on ? 1 : 0; if (on) el.style.transform = `translate(${((v.x + 1) / 2 * W).toFixed(1)}px,${((1 - v.y) / 2 * H + dy).toFixed(1)}px) translate(-50%,-50%)`;
}
function updateLabels() {
  const n = S.name, st = S.step, ph = isPhone();
  const cityOn = n === 'meet' && (st === 'run' || st === 'record');
  L.column.textContent = `Federal funds rate ${room.cur.rate.toFixed(1)}%`;
  place(L.column, room.anchors.column(), cityOn);
  place(L.cranes, room.anchors.cranes(), cityOn && !ph);
  place(L.shops, room.anchors.shops(), cityOn && !ph);
  place(L.queue, room.anchors.queue(), cityOn && !ph);
  const seatsOn = n === 'meet' && (st === 'predict' || st === 'call' || st === 'roll') && !ph;
  L.seats.forEach((el, i) => place(el, room.anchors.seat(i), seatsOn, i > 0 && i < 11 && i % 2 ? -20 : 0));
}

// ---------- HUD ----------
const GA = [['cpi', 'Inflation', 'CPIAUCSL', 16, '#ff9b6a'], ['un', 'Unemployment', 'UNRATE', 12, '#9fc0ff'], ['ff', 'Federal funds rate', 'FEDFUNDS', 20, '#e8bd6a']];
$('#gauges').innerHTML = GA.map(([id, name, sid, , c]) => `<div class="g"><div class="gl"><span><i class="dot" style="background:${c}"></i>${name}<small><a class="fredid" href="https://fred.stlouisfed.org/series/${sid}" target="_blank" rel="noopener">FRED ${sid}</a></small></span><b id="v-${id}">0%</b></div><div class="bar" role="img" aria-label="${name}"><i id="b-${id}" style="background:${c}"></i></div></div>`).join('');
let hud = { cpi: 0, un: 0, ff: 0 }, chartDirty = true, chartOpt = null;
function setHud(m, note) {
  hud = { cpi: val('cpi', m), un: val('un', m), ff: val('ff', m) };
  for (const [id, , , max] of GA) { $('#v-' + id).textContent = hud[id].toFixed(1) + '%'; $('#b-' + id).style.width = clamp(Math.max(0, hud[id]) / max * 100, 0, 100) + '%'; }
  $('#qtr').textContent = mLabel(m); if (note) $('#srcnote').textContent = note;
}
// chart: monthly, from a year before the meeting to the end of the playback
function drawChart(cv, opt) {
  if (!cv || !cv.offsetWidth || !opt) return; const r = Math.min(2, devicePixelRatio || 1), w = cv.offsetWidth, h = cv.offsetHeight;
  if (cv.width !== Math.round(w * r)) { cv.width = Math.round(w * r); cv.height = Math.round(h * r); }
  const x = cv.getContext('2d'); x.setTransform(r, 0, 0, r, 0, 0); x.clearRect(0, 0, w, h);
  const { a, b, mark, reveal } = opt, yMin = 0, yMax = 20;
  const Xp = (m) => 24 + (m - a) / (b - a) * (w - 30), Yp = (v) => h - 14 - (clamp(v, yMin, yMax) - yMin) / (yMax - yMin) * (h - 22);
  x.font = '10px Inter, sans-serif'; x.fillStyle = 'rgba(232,220,195,.6)'; x.strokeStyle = 'rgba(232,210,170,.12)'; x.lineWidth = 1;
  for (const g of [0, 5, 10, 15, 20]) { x.beginPath(); x.moveTo(24, Yp(g)); x.lineTo(w - 6, Yp(g)); x.stroke(); x.fillText(g + '%', 0, Yp(g) + 3); }
  x.strokeStyle = 'rgba(255,255,255,.35)'; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(Xp(mark), 4); x.lineTo(Xp(mark), h - 12); x.stroke(); x.setLineDash([]);
  x.fillText(mLabel(a), 24, h - 2); x.fillText('meeting', Xp(mark) + 3, 11); const t = mLabel(b); x.fillText(t, w - 6 - x.measureText(t).width, h - 2);
  for (const [k, , , , col] of GA) {
    x.strokeStyle = col; x.lineWidth = 1.8; x.beginPath();
    for (let m = a; m <= Math.min(b, reveal); m += 0.5) { const px = Xp(m), py = Yp(val(k, m)); m === a ? x.moveTo(px, py) : x.lineTo(px, py); }
    x.stroke();
  }
}
$('#legend').innerHTML = GA.map(([, n, , , c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('') + '<span>Monthly, FRED</span>';

// ---------- panel helpers ----------
const panel = $('#panelBody');
const cites = (list) => `<p class="src">Source: ${list.map((k) => C.cite(k)).join('; ')}</p>`;
const who = (id) => { const [n, r] = C.PEOPLE[id]; return `<b>${n}</b> <small>${r}</small>`; };
const POSN = { maj: 'With the majority', tight: 'Dissent: firmer', easy: 'Dissent: easier' };
const badge = (p) => `<span class="badge ${p}">${POSN[p]}</span>`;
const surname = (id) => C.PEOPLE[id][0].split(' ').pop();
function stepIndex() { return S.name === 'brief' ? 0 : S.name === 'meet' ? 1 + S.s : S.name === 'debrief' ? 4 : -1; }
const kick = (x) => `<p class="kick">Session ${S.s + 1} of 3 · ${x.date}</p>`;

function render() {
  document.body.dataset.state = S.name;
  const cur = stepIndex();
  document.querySelectorAll('#steps li').forEach((li, i) => { li.className = i === cur ? 'cur' : i < cur ? 'done' : ''; });
  let h = '';
  if (S.name === 'brief') h = `<p class="kick">Briefing</p><h2 tabindex="-1">${C.BRIEF.title}</h2>${C.BRIEF.body}<div class="row"><button class="btn pri" data-act="startMeeting">Session 1: September 18, 1979</button></div>`;
  else if (S.name === 'meet') h = renderMeeting();
  else if (S.name === 'debrief') h = renderDebrief();
  panel.innerHTML = h; panel.parentElement.scrollTop = 0;
  const h2 = panel.querySelector('h2'); if (h2 && S.focusNext !== false) h2.focus({ preventScroll: true }); S.focusNext = true;
}

function sortOpts(x) { return x.sortOpts || C.POS; }
function sortFb(x, i) { const q = x.quotes[i]; return Array.isArray(x.quoteFb) ? x.quoteFb[i] : x.quoteFb[q[0]]; }
function renderMeeting() {
  const x = X(), a = A();
  if (S.step === 'record') {
    const opts = sortOpts(x), ready = x.quotes.every((_, i) => a.sort[i]), chk = a.sortChecked;
    let h = `${kick(x)}<h2 tabindex="-1">${x.title}</h2>${x.setting}
      <div class="kv"><span>Inflation, 12 months to ${x.cpiNote}</span><span>${val('cpi', dataMonth(x)).toFixed(1)}%</span><span>Unemployment</span><span>${val('un', dataMonth(x)).toFixed(1)}%</span><span>Federal funds rate</span><span>${val('ff', dataMonth(x)).toFixed(1)}%</span><span>30 year mortgage</span><span>${val('mort', dataMonth(x)).toFixed(1)}%</span></div>
      <p class="src">Data: ${['CPIAUCSL', 'UNRATE', 'FEDFUNDS', 'MORTGAGE30US'].map(C.fred).join(', ')}, ${mLabel(dataMonth(x))}, current vintage.</p>
      <p class="prop">${x.question}</p>
      <h3>${x.sortTitle || 'Where did each speaker land?'}</h3><p class="hint">${x.sortHint || 'These are their words in the meeting, from the transcript. For each, choose how that member voted on the motion.'}</p>`;
    x.quotes.forEach((q, i) => {
      const pick = a.sort[i], ok = pick === q[3];
      h += `<div class="member"><div class="who">${who(q[0])}</div><p class="say">“${q[1]}”</p>
        <fieldset class="q"><legend class="sr">Your answer</legend><div class="seg ${opts.length === 2 ? 'two' : 'three'}">${opts.map(([v, l]) => `<label><input type="radio" name="s-${i}" value="${v}" ${pick === v ? 'checked' : ''} ${chk ? 'disabled' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
        ${chk ? `<p class="fb ${ok ? 'ok' : 'no'}"><b>${ok ? 'Right.' : 'Not this one.'}</b> ${opts.find((o) => o[0] === q[3])[1]}. ${sortFb(x, i)}</p>` : ''}</div>`;
    });
    if (!chk) return h + `<div class="row"><button class="btn pri" data-act="checkSort" ${ready ? '' : 'disabled'}>Check</button><span class="hint" id="shint">${ready ? '' : 'Answer all five.'}</span></div>`;
    const n = x.quotes.filter((q, i) => a.sort[i] === q[3]).length;
    return h + `<p class="result">${n} of ${x.quotes.length} right.</p>${cites([x.quotes[0][2], x.id === 's2' ? 'r1006' : x.id === 's1' ? 'r0918' : 'r0701'])}<div class="row"><button class="btn pri" data-act="toPredict">Next: predict the vote</button></div>`;
  }
  if (S.step === 'predict') {
    const ord = order(x.predict.length, 50 + S.s), p = a.pred, chk = a.predChecked;
    let h = `${kick(x)}<h2 tabindex="-1">Predict the split</h2><p class="prop">${x.question}</p>
      <fieldset class="q"><legend>How did the twelve voting members split?</legend><div class="seg one cards">${ord.map((i) => `<label><input type="radio" name="pred" value="${i}" ${p === i ? 'checked' : ''} ${chk ? 'disabled' : ''}><span>${x.predict[i][0]}</span></label>`).join('')}</div></fieldset>`;
    if (!chk) return h + `<div class="row"><button class="btn pri" data-act="checkPred" ${p !== undefined ? '' : 'disabled'}>Lock in</button></div>`;
    const ok = x.predict[p][1];
    return h + `<p class="fb ${ok ? 'ok' : 'no'}"><b>${ok ? 'Right.' : 'Not what happened.'}</b> ${x.predictFb}</p>${cites(x.predictCites)}<div class="row"><button class="btn pri" data-act="toCall">Next: your recommendation</button></div>`;
  }
  if (S.step === 'call') {
    const ord = order(x.calls.length, 80 + S.s), c = a.call;
    return `${kick(x)}<h2 tabindex="-1">Your recommendation</h2><p class="hint">The chairman asks the staff for a view before the vote. There is no right answer here and it is not scored. You will see who at the table stood where you stand.</p>
      <fieldset class="q"><legend>You recommend</legend><div class="seg one cards">${ord.map((i) => `<label><input type="radio" name="call" value="${i}" ${c === i ? 'checked' : ''}><span>${x.calls[i][0]}</span></label>`).join('')}</div></fieldset>
      <div class="row"><button class="btn pri" data-act="toRoll" ${c !== undefined ? '' : 'disabled'}>Call the roll</button></div>`;
  }
  if (S.step === 'roll') {
    const pos = x.calls[a.call][1], with_ = x.members.filter((id) => x.votes[id] === pos);
    let h = `${kick(x)}<h2 tabindex="-1">The roll call: ${x.tally}</h2><p class="prop">${x.question}</p>
      <div class="roll">${x.members.map((id) => `<div class="${x.votes[id]}${x.votes[id] === pos ? ' you' : ''}"><b>${surname(id)}</b><small>${POSN[x.votes[id]]}</small></div>`).join('')}</div>`;
    if (x.extraVote) { const e = x.extraVote; h += `<h3>${e.label}: ${e.tally}</h3><div class="roll">${[...e.yes.map((id) => [id, 'maj', 'For']), ...e.no.map((id) => [id, 'easy', 'Against'])].map(([id, c, l]) => `<div class="${c}"><b>${surname(id)}</b><small>${l}</small></div>`).join('')}</div>${cites([e.cite])}`; }
    h += `<h3>Who stood with you</h3><p>You recommended: <i>${x.calls[a.call][0]}</i></p>`;
    if (with_.length) h += `<p>${with_.length === x.members.length ? 'Every voting member.' : with_.map((id) => C.PEOPLE[id][0]).join(', ') + '.'}</p>`;
    else h += `<p class="fb">${(x.callNotes || {})[pos] || 'No voting member took this position.'}</p>`;
    if (x.id === 's1' && pos === 'easy') h += '<p class="hint">On the discount rate that afternoon, Partee and Teeters also voted to stand pat.</p>';
    return h + `${cites([x.id === 's1' ? 'r0918' : x.id === 's2' ? 'r1006' : 'r0701'])}<div class="row"><button class="btn pri" data-act="run">Play the record: ${mLabel(x.m)} to ${mLabel(x.runTo)}</button></div>`;
  }
  if (S.step === 'run') return `${kick(x)}<h2 tabindex="-1">What happened next</h2><div class="prog"><i id="runbar"></i></div><ul class="log" id="runlog"></ul><p class="hint">Real monthly data. Watch the brass column, the cranes, the shop lights and the queue.</p><div class="row"><button class="btn ghost" data-act="skipRun">Skip ahead</button></div>`;
  if (S.step === 'contest') return renderContest();
  return '';
}
function renderContest() {
  const x = X(), a = A(), c = x.contest, chk = a.evChecked, ready = c.evidence.every((_, i) => a.ev[i] !== undefined);
  let h = `${kick(x)}<h2 tabindex="-1">${c.q}</h2>${x.after}${cites(x.afterCites)}
    <h3>The contested part</h3><p class="hint">Positions as their proponents argue them, paraphrased. No verdict is offered.</p><div class="pos">` +
    c.positions.map(([t, body, src]) => `<div><b>${t}</b><p>${body}</p><p class="src">${src.map(C.cite).join('; ')}</p></div>`).join('') + `</div>
    <h3>Which argument does this evidence bear on most directly?</h3>`;
  c.evidence.forEach(([e, ans, fb], i) => {
    const pick = a.ev[i];
    h += `<div class="member"><p class="say">${e}</p><fieldset class="q"><legend class="sr">Bears most on</legend><div class="seg ${c.positions.length === 2 ? 'two' : 'three'}">${c.positions.map(([t], j) => `<label><input type="radio" name="e-${i}" value="${j}" ${pick === j ? 'checked' : ''} ${chk ? 'disabled' : ''}><span>${t}</span></label>`).join('')}</div></fieldset>
      ${chk ? `<p class="fb ${pick === ans ? 'ok' : 'no'}"><b>${pick === ans ? 'Yes.' : 'Most directly: ' + c.positions[ans][0] + '.'}</b> ${fb}</p>` : ''}</div>`;
  });
  if (!chk) return h + `<div class="row"><button class="btn pri" data-act="checkEv" ${ready ? '' : 'disabled'}>Check</button></div>`;
  return h + `<p class="hint">Bearing on an argument is not the same as settling it. Each side has a reply to the other's evidence.</p><div class="row"><button class="btn pri" data-act="next">${S.s < 2 ? `Session ${S.s + 2}: ${SES[S.s + 1].date}` : 'Debrief'}</button></div>`;
}
function score() {
  let sort = 0, sortN = 0, pred = 0, ev = 0, evN = 0, withMaj = 0, done = 0;
  S.ans.forEach((a, i) => { const x = SES[i];
    x.quotes.forEach((q, j) => { sortN++; if (a.sortChecked && a.sort[j] === q[3]) sort++; });
    if (a.predChecked && x.predict[a.pred][1]) pred++;
    x.contest.evidence.forEach((e, j) => { evN++; if (a.evChecked && a.ev[j] === e[1]) ev++; });
    if (a.callDone) { done++; if (x.calls[a.call][1] === 'maj') withMaj++; } });
  return { sort, sortN, pred, ev, evN, withMaj, done };
}
function renderDebrief() {
  const s = score();
  return `<p class="kick">Debrief</p><h2 tabindex="-1">Reading the record</h2>
    <div class="scorebar"><span>Speakers placed: ${s.sort} of ${s.sortN}</span><span>Splits predicted: ${s.pred} of 3</span><span>Evidence matched: ${s.ev} of ${s.evN}</span></div>
    <p class="hint">Scored only on reading the evidence. Your recommendations matched the majority ${s.withMaj} of ${s.done} times, and that is not scored.</p>
    <div class="tw"><table><thead><tr><th>Session</th><th>Your call</th><th>The vote</th><th>Dissents</th></tr></thead><tbody>` +
    SES.map((x, i) => { const a = S.ans[i], d = x.members.filter((id) => x.votes[id] !== 'maj'); return `<tr><th>${x.short}</th><td style="text-align:left">${a.callDone ? x.calls[a.call][0].split(':')[0] : 'Not played'}</td><td>${x.tally}</td><td style="text-align:left">${d.length ? d.map((id) => `${surname(id)} (${x.votes[id] === 'tight' ? 'firmer' : 'easier'})`).join(', ') : 'None'}</td></tr>`; }).join('') +
    `</tbody></table></div>
    <h3>Three things to carry out of the room</h3><ul class="try"><li>The same data produced dissents in both directions at the first and last meetings. Disagreement was about lags, expectations and who bears the cost, not arithmetic.</li><li>The unanimous vote changed the method, not just the rate. Members who disagreed in September could each read the new method as their own.</li><li>By 1982 the money target itself was in doubt. Velocity fell when several members expected it to rise.</li></ul>
    <p class="contest"><b>Still contested.</b> Whether the policy was necessary, whether it could have cost less, and who paid for it remain open. See the sources in About.</p>
    <div class="row"><button class="btn pri" data-act="restart">Start over</button><button class="btn ghost" data-act="about">Sources and method</button></div>`;
}

// ---------- events ----------
panel.addEventListener('change', (e) => {
  const t = e.target, a = S.name === 'meet' ? A() : null; if (!a) return;
  const en = (sel, on) => { const b = panel.querySelector(sel); if (b) b.disabled = !on; };
  if (t.name.startsWith('s-')) { a.sort[+t.name.slice(2)] = t.value; const ready = X().quotes.every((_, i) => a.sort[i]); en('[data-act=checkSort]', ready); const hn = $('#shint'); if (hn) hn.textContent = ready ? '' : 'Answer all five.'; }
  else if (t.name === 'pred') { a.pred = +t.value; en('[data-act=checkPred]', true); }
  else if (t.name === 'call') { a.call = +t.value; en('[data-act=toRoll]', true); }
  else if (t.name.startsWith('e-')) { a.ev[+t.name.slice(2)] = +t.value; en('[data-act=checkEv]', X().contest.evidence.every((_, i) => a.ev[i] !== undefined)); }
});
document.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) act(b.dataset.act); });
const scrollTo = (sel) => { const els = panel.querySelectorAll(sel); if (els.length) els[0].scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); };
function act(k) {
  const a = S.name === 'meet' ? A() : null;
  if (k === 'begin') { audio.init(); go('brief'); }
  else if (k === 'startMeeting') go('meet', 0);
  else if (k === 'checkSort') { a.sortChecked = true; const x = X(); audio.chime(x.quotes.every((q, i) => a.sort[i] === q[3])); S.focusNext = false; render(); scrollTo('.fb'); }
  else if (k === 'toPredict') step('predict');
  else if (k === 'checkPred') { a.predChecked = true; audio.chime(X().predict[a.pred][1]); S.focusNext = false; render(); scrollTo('.fb'); }
  else if (k === 'toCall') step('call');
  else if (k === 'toRoll') { a.callDone = true; audio.gavel(); step('roll'); }
  else if (k === 'run') startRun();
  else if (k === 'skipRun') { if (S.run) S.run.t = S.run.dur; }
  else if (k === 'checkEv') { a.evChecked = true; audio.chime(X().contest.evidence.every((e, i) => a.ev[i] === e[1])); S.focusNext = false; render(); scrollTo('.fb'); }
  else if (k === 'next') { if (S.s < 2) go('meet', S.s + 1); else go('debrief'); }
  else if (k === 'restart') { S.ans = fresh(); go('brief'); }
  else if (k === 'about') openAbout();
  else if (k === 'closeAbout') closeAbout();
  else if (k === 'sound') { audio.toggle(); if (audio.on) audio.init(); $('#soundBtn').setAttribute('aria-pressed', audio.on); $('#soundBtn').textContent = audio.on ? 'Sound on' : 'Sound off'; }
}
let lastFocus = null;
function openAbout() { lastFocus = document.activeElement; $('#modal').hidden = false; $('#modalClose').focus(); }
function closeAbout() { if ($('#modal').hidden) return; $('#modal').hidden = true; if (lastFocus) lastFocus.focus(); }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeAbout(); });
$('#aboutBody').innerHTML = '<h2 id="aboutH">About Fed1979</h2>' + C.ABOUT;
const caption = $('#caption');
function say(t) { caption.textContent = t || ''; caption.classList.toggle('on', !!t); }

// ---------- city and seats ----------
function cityAt(m) {
  Object.assign(room.st, { rate: val('ff', m), build: clamp(1.25 - (val('mort', m) - 9) * 0.11, 0.05, 1.1), demand: clamp(0.95 - (val('un', m) - 5) * 0.12, 0.08, 0.95), price: val('cpi', m), jobs: val('un', m) });
}
const SEATCOL = { maj: '#7fe0a8', tight: '#ff8a5c', easy: '#8fb4ff' };
function refreshSeats() {
  const x = S.name === 'meet' ? X() : SES[0], reveal = S.name === 'meet' && (S.step === 'roll' || S.step === 'run' || S.step === 'contest');
  const quoted = S.name === 'meet' && S.step === 'record' ? new Set(x.quotes.map((q) => q[0])) : new Set();
  x.members.forEach((id, i) => {
    const p = x.votes[id];
    room.setSeatColor(i, reveal ? SEATCOL[p] : quoted.has(id) ? '#f0c27a' : '#b8a07a', reveal || quoted.has(id));
    L.seats[i].textContent = surname(id);
  });
}

// ---------- transitions ----------
function step(s) {
  S.step = s; say('');
  setView({ record: 'room', predict: 'members', call: 'members', roll: 'members', run: 'city', contest: 'room' }[s]);
  render(); refreshSeats();
}
function go(name, arg) {
  S.name = name; say(''); S.run = null;
  if (name === 'brief') { setView('room'); cityAt(19); setHud(19, 'Real data, FRED'); chartOpt = { a: 7, b: 21, mark: 20, reveal: 19 }; }
  if (name === 'meet') {
    S.s = arg; const x = X(), dm = dataMonth(x); cityAt(dm);
    setHud(dm, 'Real data, FRED. Latest month before the meeting.');
    chartOpt = { a: dm - 12, b: x.runTo, mark: x.m, reveal: dm };
    S.step = 'record'; setView('room');
  }
  if (name === 'debrief') { setView('room'); }
  render(); refreshSeats(); chartDirty = true;
}
function startRun() {
  const x = X();
  S.run = { t: 0, dur: clamp((x.runTo - x.m) * 0.42, 5, 13), m: -1 };
  S.step = 'run'; setView('city'); render(); refreshSeats();
  chartOpt = { a: dataMonth(x) - 12, b: x.runTo, mark: x.m, reveal: x.m };
  setHud(x.m, 'Real data, FRED: what happened');
}
function runFrame(dt) {
  const R = S.run, x = X(); R.t += dt;
  const mf = x.m + clamp((R.t - 0.4) / (R.dur - 0.8), 0, 1) * (x.runTo - x.m), m = Math.floor(mf + 1e-6);
  cityAt(mf); setHud(mf);
  if (m !== R.m) {
    for (let k = R.m + 1; k <= m; k++) { if (k < x.m) continue; const ev = x.events[k]; if (ev) { const li = document.createElement('li'); li.textContent = ev; const lg = $('#runlog'); if (lg) lg.appendChild(li); say(ev); audio.tick(); } }
    R.m = m; chartOpt.reveal = m; chartDirty = true;
  }
  const bar = $('#runbar'); if (bar) bar.style.width = clamp(R.t / R.dur * 100, 0, 100) + '%';
  if (R.t >= R.dur) { cityAt(x.runTo); setHud(x.runTo); chartOpt.reveal = x.runTo; chartDirty = true; S.run = null; step('contest'); }
}

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(DTCAP, Math.max(0.001, (now - last) / 1000)); last = now; S.T += dt;
  if (S.name === 'title') { S.titleT += dt; cityAt(19); }
  if (S.name === 'meet' && S.step === 'run' && S.run) { let left = dt; while (left > 1e-6 && S.run) { const d = Math.min(0.05, left); runFrame(d); left -= d; } }
  room.update(dt, S.T, reduce);
  updateRig(dt); updateLabels();
  if (chartDirty && chartOpt && S.name !== 'title') { drawChart($('#chart'), chartOpt); chartDirty = false; }
  composer.render();
  requestAnimationFrame(frame);
}

// ---------- test hook ----------
window.__demo = {
  state: () => ({ name: S.name, s: S.s, step: S.step, ans: S.ans, score: score(), hud: { ...hud }, city: { ...room.st } }),
  go: (name, arg) => { go(name, arg); snapRig(); },
  step: (s) => { step(s); snapRig(); },
  answer: (o) => Object.assign(A(), o),
  render: () => render(),
  act,
  advance: (sec) => { for (let i = 0; i < sec * 20; i++) { if (S.name === 'meet' && S.step === 'run' && S.run) runFrame(0.05); room.update(0.05, S.T += 0.05, reduce); } },
  view: (n) => setView(n, true),
  SES,
};

resize(); snapRig(); render(); refreshSeats();
requestAnimationFrame(frame);
