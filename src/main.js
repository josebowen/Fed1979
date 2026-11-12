// Fed1979. App shell: renderer, fixed camera, state machine, panel, speech bubbles, data board, cards.
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
composer.addPass(new UnrealBloomPass(new THREE.Vector2(4, 4), 0.5, 0.5, 0.92)); composer.addPass(new OutputPass());
let W = 1, H = 1;
function resize() {
  W = innerWidth; H = innerHeight;
  const pr = Math.min(devicePixelRatio || 1, lite ? 1.5 : 2);
  renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
  composer.setPixelRatio(pr); composer.setSize(W, H);
  camera.aspect = W / H; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---------- data (monthly, FRED) ----------
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const mLabel = (m, short) => { const k = ((Math.round(m) % 12) + 12) % 12; return `${short ? MON[k].slice(0, 3) : MON[k]} ${1978 + Math.floor(Math.round(m) / 12)}`; };
function val(k, m) { // fractional month interpolation; the cpi series starts January 1979
  const a = DATA[k], off = k === 'cpi' ? 12 : 0, x = clamp(m - off, 0, a.length - 1), i = Math.floor(x), f = x - i;
  return i >= a.length - 1 ? a[a.length - 1] : lerp(a[i], a[i + 1], f);
}
const firstMonth = (k) => (k === 'cpi' ? 12 : 0);
const SES = C.SESSIONS;
const STAGES = ['record', 'predict', 'call', 'roll', 'run', 'contest'];
const STAGE_NAME = { record: 'The room', predict: 'Predict', call: 'Your call', roll: 'Roll call', run: 'Aftermath', contest: 'The debate' };
const TILES = [['cpi', '#ff9b6a'], ['un', '#9fc0ff'], ['ff', '#e8bd6a'], ['mort', '#c7a6ff']];

// ---------- state ----------
const fresh = () => SES.map(() => ({ qi: -1, sort: {}, pred: undefined, predChecked: false, call: undefined, callDone: false, rolled: false, ran: false, ev: {}, evChecked: false, max: 0 }));
const S = { name: 'title', s: 0, step: 'record', T: 0, ans: fresh(), run: null, titleT: 0, month: 19, rollT: -1, card: null };
const A = () => S.ans[S.s];
const X = () => SES[S.s];
const sortDone = (a, x) => x.quotes.every((_, i) => a.sort[i] !== undefined);
function order(n, seed) { const r = mulberry(seed), a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- camera: fixed views, no orbit ----------
const VIEWS = {
  window: { t: [0, 2.6, -6.2], w: 24, h: 9.5, yaw: 0.0, pitch: 0.1 },
  room: { t: [0, 1.5, -0.7], w: 20.4, h: 9.2, yaw: 0, pitch: 0.5 },
};
const rig = { t: new THREE.Vector3(), d: 30, yaw: 0, pitch: 0.2, view: VIEWS.room, ox: 0, oy: 0 };
const tf = () => Math.tan(camera.fov * Math.PI / 360);
function layout() {
  const ph = isPhone();
  if (S.name === 'title') return ph ? { ox: 0, oy: -H * 0.18, fw: W, fh: H * 0.5 } : { ox: -W * 0.2, oy: 0, fw: W * 0.58, fh: H };
  if (S.name === 'debrief') return { ox: 0, oy: 0, fw: W, fh: H };
  if (ph) { const pb = $('#panel').offsetHeight; return { ox: 0, oy: (pb - 50) / 2, fw: W, fh: Math.max(150, H - pb - 50) }; }
  const P = $('#panel').offsetWidth + 24; return { ox: P / 2, oy: -H * 0.1, fw: W - P, fh: H - 52 };
}
function fitDist(v, L) { const w = v.w * (W < H ? 0.92 : 1); return Math.max(v.h * H / (2 * tf() * L.fh), w * H / (2 * tf() * L.fw)); }
function snapRig() { const v = rig.view, L = layout(); rig.t.fromArray(v.t); rig.yaw = v.yaw; rig.pitch = v.pitch; rig.d = fitDist(v, L); rig.ox = L.ox; rig.oy = L.oy; }
const tmpV = new THREE.Vector3(), tmpA = new THREE.Vector3();
function updateRig(dt) {
  const L = layout();
  if (S.name === 'title') { // push from the window down to the table
    const u = reduce ? 1 : ease(clamp((S.titleT - 0.6) / 7, 0, 1)), a = VIEWS.window, b = VIEWS.room;
    rig.t.fromArray(a.t).lerp(tmpA.fromArray(b.t), u); rig.yaw = 0; rig.pitch = lerp(a.pitch, b.pitch, u); rig.d = lerp(fitDist(a, L), fitDist(b, L) * 0.82, u);
    room.st.power = reduce ? 1 : clamp((S.titleT - 2.5) / 4, 0.05, 1);
  } else {
    const v = rig.view, k = reduce ? 1 : 1 - Math.exp(-2.4 * dt);
    rig.t.lerp(tmpV.fromArray(v.t), k); rig.yaw = lerp(rig.yaw, v.yaw, k); rig.pitch = lerp(rig.pitch, v.pitch, k); rig.d = lerp(rig.d, fitDist(v, L), k);
    room.st.power = S.name === 'debrief' ? 0.35 : 1;
  }
  const ko = reduce ? 1 : 1 - Math.exp(-5 * dt); rig.ox = lerp(rig.ox, L.ox, ko); rig.oy = lerp(rig.oy, L.oy, ko);
  const d = rig.d, yaw = rig.yaw, pitch = rig.pitch;
  camera.position.set(rig.t.x + d * Math.sin(yaw) * Math.cos(pitch), rig.t.y + d * Math.sin(pitch), rig.t.z + d * Math.cos(yaw) * Math.cos(pitch));
  camera.lookAt(rig.t); camera.setViewOffset(W, H, rig.ox, rig.oy, W, H); camera.updateMatrixWorld();
  const fd = Math.min(0.02, 0.45 / d); room.scene.fog.density = fd;
  room.glow.mat.uniforms.uScale.value = H * renderer.getPixelRatio() * 0.5 / tf(); room.glow.mat.uniforms.uFog.value = fd;
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

// ---------- people helpers ----------
const surname = (id) => C.PEOPLE[id][0].split(' ').pop();
const who = (id) => { const [n, r] = C.PEOPLE[id]; return `<b>${n}</b> <small>${r}</small>`; };
const VOTE_TXT = { maj: 'For', tight: 'Against, firmer', easy: 'Against, easier' };
const SEATCOL = { maj: '#6fdc9c', tight: '#ff8a5c', easy: '#8fb4ff' };
const seatOf = (id) => X().members.indexOf(id);

// ---------- labels, speech bubble ----------
const labelBox = $('#labels');
const seatLabels = Array.from({ length: 12 }, (_, i) => { const el = document.createElement('button'); el.className = 'lab seat'; el.dataset.seat = i; labelBox.appendChild(el); return el; });
const bubble = $('#bubble');
function project(v) { v.project(camera); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, ok: v.z < 1 && v.z > -1 }; }
function revealCount() { // how many seats have declared in the roll call so far
  if (S.name !== 'meet') return 0; const a = A(); if (!a.rolled) return 0;
  return S.step === 'roll' && S.rollT >= 0 ? Math.min(12, Math.floor(S.rollT / 0.34)) : 12;
}
function updateLabels() {
  const meet = S.name === 'meet', x = meet ? X() : SES[0], n = revealCount(), ph = isPhone();
  seatLabels.forEach((el, i) => {
    const p = project(room.anchors.seat(i)), on = meet && p.ok;
    el.style.opacity = on ? 1 : 0; el.style.pointerEvents = on ? 'auto' : 'none'; if (!on) return;
    const up = i > 0 && i < 11 && i % 2 ? (ph ? -18 : -44) : 0;
    el.style.transform = `translate(${p.x.toFixed(1)}px,${(p.y + up).toFixed(1)}px) translate(-50%,-100%)`;
  });
  // speech bubble follows the current speaker
  const sp = S.speaker;
  if (meet && sp != null && S.step === 'record') {
    const p = project(room.anchors.seat(sp)), L = layout(), bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    const left = ph ? 8 : 16, right = (ph ? W : W - ($('#panel').offsetWidth + 40)) - bw - 8;
    const bx = clamp(p.x - bw / 2, left, Math.max(left, right)), by = Math.max(60, p.y - bh - 58);
    bubble.style.transform = `translate(${bx.toFixed(1)}px,${by.toFixed(1)}px)`; bubble.classList.add('on');
    bubble.style.setProperty('--tail', clamp(p.x - bx, 28, bw - 28).toFixed(0) + 'px');
  } else bubble.classList.remove('on');
}
function refreshSeats() {
  const meet = S.name === 'meet', x = meet ? X() : SES[0], n = revealCount();
  x.members.forEach((id, i) => {
    const shown = meet && i < n, p = x.votes[id], speaking = meet && S.step === 'record' && S.speaker === i;
    room.setSeat(i, shown ? SEATCOL[p] : null, speaking);
    seatLabels[i].innerHTML = `<b>${surname(id)}</b>${shown ? `<small class="${p}">${VOTE_TXT[p]}</small>` : ''}`;
    seatLabels[i].setAttribute('aria-label', `${C.PEOPLE[id][0]}, ${C.PEOPLE[id][1]}. Open member card.`);
    seatLabels[i].classList.toggle('speaking', speaking);
  });
}

// ---------- the data board on the table ----------
let boardDirty = true;
function tileRects() { const cw = room.board.canvas.width, ch = room.board.canvas.height, pad = 28, top = 100, w = (cw - pad * 5) / 4; return TILES.map((_, i) => ({ x: pad + i * (w + pad), y: top, w, h: ch - top - pad })); }
function drawBoard() {
  const { ctx: g, canvas: cv, tex } = room.board, cw = cv.width, ch = cv.height, m = S.month, meet = S.name === 'meet', x = meet ? X() : SES[0];
  g.fillStyle = '#070b16'; g.fillRect(0, 0, cw, ch);
  const running = meet && S.step === 'run', n = revealCount(), rolling = meet && S.step === 'roll';
  // header
  g.textBaseline = 'middle'; g.fillStyle = '#e8bd6a'; g.font = '600 38px Inter, sans-serif';
  g.fillText(running ? 'WHAT HAPPENED NEXT' : 'THE NUMBERS IN THE ROOM', 30, 52);
  g.fillStyle = '#f3eee4'; g.font = '600 52px Fraunces, Georgia, serif'; g.textAlign = 'center';
  g.fillText(running ? mLabel(m) : `Data through ${mLabel(m)}`, cw / 2, 52);
  g.textAlign = 'right'; g.font = '600 36px Inter, sans-serif';
  if (rolling || (meet && A().rolled && !running)) { const yes = x.members.slice(0, n).filter((id) => x.votes[id] === 'maj').length; g.fillStyle = '#6fdc9c'; g.fillText(`FOR ${yes}`, cw - 290, 52); g.fillStyle = '#ffb08a'; g.fillText(`AGAINST ${n - yes}`, cw - 30, 52); }
  else { g.fillStyle = 'rgba(232,220,195,.7)'; g.fillText('Tap a number for detail', cw - 30, 52); }
  g.textAlign = 'left';
  // tiles
  const a0 = meet ? x.dm - 12 : 7, b0 = running ? x.runTo : m;
  tileRects().forEach((r, i) => {
    const [k, col] = TILES[i], info = C.DATAINFO[k], v = val(k, m), hot = S.hoverTile === i;
    g.fillStyle = hot ? '#141c33' : '#0d1325'; g.strokeStyle = hot ? col : 'rgba(226,184,110,.35)'; g.lineWidth = hot ? 5 : 2;
    g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 22); g.fill(); g.stroke();
    g.fillStyle = col; g.font = '600 46px Inter, sans-serif'; g.fillText(info.name, r.x + 26, r.y + 52);
    g.fillStyle = '#ffffff'; g.font = '600 190px Fraunces, Georgia, serif'; g.fillText(v.toFixed(1), r.x + 22, r.y + 190);
    const tw = g.measureText(v.toFixed(1)).width; g.font = '600 84px Fraunces, Georgia, serif'; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('%', r.x + 32 + tw, r.y + 212);
    // change over the past year
    const prev = Math.max(firstMonth(k), m - 12), dv = v - val(k, prev);
    if (m - prev >= 6) { g.font = '500 36px Inter, sans-serif'; g.fillStyle = 'rgba(232,220,195,.9)'; g.fillText(`${dv >= 0 ? 'up' : 'down'} ${Math.abs(dv).toFixed(1)} pts in a year`, r.x + 26, r.y + 316); }
    // sparkline
    const sx = r.x + 26, sw = r.w - 52, sy = r.y + r.h - 22, sh = r.h - 390, A0 = Math.max(a0, firstMonth(k)), span = Math.max(1, b0 - A0);
    if (sh > 30) {
      let lo = 1e9, hi = -1e9; for (let t = A0; t <= b0; t += 0.5) { const q = val(k, t); lo = Math.min(lo, q); hi = Math.max(hi, q); } if (hi - lo < 1) { hi += 0.5; lo -= 0.5; }
      const X2 = (t) => sx + (t - A0) / span * sw, Y2 = (q) => sy - (q - lo) / (hi - lo) * sh;
      if (running) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(X2(x.m), sy - sh); g.lineTo(X2(x.m), sy); g.stroke(); g.setLineDash([]); }
      g.strokeStyle = col; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath();
      for (let t = A0; t <= Math.min(b0, m) + 1e-6; t += 0.5) { const px = X2(t), py = Y2(val(k, t)); t === A0 ? g.moveTo(px, py) : g.lineTo(px, py); }
      g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(X2(Math.min(b0, m)), Y2(v), 9, 0, 7); g.fill();
    }
  });
  tex.needsUpdate = true; boardDirty = false;
}
function setMonth(m) { if (Math.abs(m - S.month) > 1e-4) { S.month = m; boardDirty = true; } }

// ---------- picking: figures and data tiles ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickAt(cx, cy) {
  if (S.name !== 'meet') return null;
  ndc.set(cx / W * 2 - 1, -(cy / H * 2 - 1)); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects([...room.pickables, room.board.mesh], false)[0]; if (!hit) return null;
  if (hit.object === room.board.mesh) { const u = hit.uv.x * room.board.canvas.width, v = (1 - hit.uv.y) * room.board.canvas.height; const i = tileRects().findIndex((r) => u >= r.x && u <= r.x + r.w && v >= r.y && v <= r.y + r.h); return i >= 0 ? { tile: i } : null; }
  return { seat: hit.object.userData.seat };
}
canvas.addEventListener('pointermove', (e) => { const h = pickAt(e.clientX, e.clientY); canvas.style.cursor = h ? 'pointer' : 'default'; const t = h && h.tile != null ? h.tile : -1; if (t !== S.hoverTile) { S.hoverTile = t; boardDirty = true; } });
canvas.addEventListener('click', (e) => { const h = pickAt(e.clientX, e.clientY); if (!h) return; if (h.tile != null) openCard({ tile: TILES[h.tile][0] }); else openCard({ member: X().members[h.seat] }); });
labelBox.addEventListener('click', (e) => { const b = e.target.closest('[data-seat]'); if (b && S.name === 'meet') openCard({ member: X().members[+b.dataset.seat] }); });

// ---------- cards: a member, or one number ----------
const card = $('#card'), cardBody = $('#cardBody');
const visibleMonth = () => { if (S.name !== 'meet') return 19; const x = X(), a = A(); return a.ran ? x.runTo : S.step === 'run' ? S.month : x.dm; };
function openCard(c) {
  S.card = c; let h = '';
  if (c.member) {
    const id = c.member, [name, role] = C.PEOPLE[id];
    const seen = (s) => S.ans[s].rolled, heard = (s) => sortDone(S.ans[s], SES[s]) || seen(s);
    const votes = C.VOTELOG.filter((v) => seen(v.s) && (v.yes.includes(id) || id in v.no));
    const quotes = [];
    SES.forEach((x, s) => { if (heard(s)) x.quotes.forEach((q) => { if (q[0] === id) quotes.push([q[1], q[2]]); }); });
    C.MORE_QUOTES.forEach((q) => { if (q[0] === id && seen(q[3])) quotes.push([q[1], q[2]]); });
    const firmer = votes.filter((v) => /firmer/.test(v.no[id] || '')).length, easier = votes.filter((v) => /easier|no firming|steady/.test(v.no[id] || '')).length, yes = votes.filter((v) => v.yes.includes(id)).length;
    h = `<p class="kick">Voting member</p><h2 id="cardH" tabindex="-1">${name}</h2><p class="role">${role}</p>`;
    if (!votes.length && !quotes.length) h += `<p>No votes have been called yet. Come back to this card after a roll call to see how ${surname(id)} voted and what ${surname(id)} said.</p>`;
    if (votes.length) {
      h += `<h3>Recorded votes so far</h3><p class="tallyline">For the motion: ${yes}. Against, wanting firmer policy: ${firmer}. Against, wanting easier or steady policy: ${easier}.</p><ul class="votes">` +
        votes.map((v) => { const y = v.yes.includes(id); return `<li class="${y ? 'yes' : 'no'}"><span class="mark" aria-hidden="true">${y ? '✓' : '✕'}</span><div><b>${y ? 'For' : 'Against' + (v.no[id] ? ': ' + v.no[id] : '')}</b><small>${v.label}. ${C.cite(v.src)}</small></div></li>`; }).join('') + '</ul>';
    }
    if (quotes.length) h += '<h3>In the meetings</h3>' + quotes.map(([t, src]) => `<blockquote>“${t}”<cite>${C.cite(src)}</cite></blockquote>`).join('');
    h += '<p class="src">This card shows only the record of the meetings in Fed1979. It does not describe a member\'s views beyond those words and votes.</p>';
  } else {
    const k = c.tile, info = C.DATAINFO[k], m = visibleMonth(), v = val(k, m), col = TILES.find((t) => t[0] === k)[1];
    h = `<p class="kick">On the table</p><h2 id="cardH" tabindex="-1">${info.name}: ${v.toFixed(1)}%</h2><p class="role">${info.unit}, ${mLabel(m)}</p><p>${info.def}</p>
      <canvas id="cardChart" aria-label="${info.name}, monthly, from ${mLabel(firstMonth(k))} to ${mLabel(m)}" role="img"></canvas>
      <div class="kv"><span>A year earlier</span><span>${m - 12 >= firstMonth(k) ? val(k, m - 12).toFixed(1) + '%' : 'not in this series'}</span><span>Highest so far in this record</span><span>${(() => { let hi = -1, at = 0; for (let t = firstMonth(k); t <= m; t++) { const q = val(k, t); if (q > hi) { hi = q; at = t; } } return hi.toFixed(1) + '% in ' + mLabel(at); })()}</span></div>
      <p class="src">${C.DATANOTE} ${C.fred(info.sid)}. The chart stops at the month you have reached, so it does not give away what comes next.</p>`;
    S.cardChart = { k, m, col };
  }
  cardBody.innerHTML = h; card.hidden = false; S.cardFocus = document.activeElement; $('#cardClose').focus();
  if (c.tile) requestAnimationFrame(drawCardChart);
}
function closeCard() { if (card.hidden) return; card.hidden = true; S.card = null; if (S.cardFocus && S.cardFocus.focus) S.cardFocus.focus(); }
function drawCardChart() {
  const cv = $('#cardChart'), o = S.cardChart; if (!cv || !o) return; const r = Math.min(2, devicePixelRatio || 1), w = cv.offsetWidth, h = cv.offsetHeight; cv.width = w * r; cv.height = h * r;
  const g = cv.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0); const a = firstMonth(o.k), b = Math.max(o.m, a + 6), top = 20;
  const Xp = (m) => 44 + (m - a) / (b - a) * (w - 60), Yp = (v) => h - 28 - clamp(v, 0, top) / top * (h - 44);
  g.font = '13px Inter, sans-serif'; g.fillStyle = 'rgba(232,220,195,.75)'; g.strokeStyle = 'rgba(232,210,170,.16)';
  for (const y of [0, 5, 10, 15, 20]) { g.beginPath(); g.moveTo(44, Yp(y)); g.lineTo(w - 12, Yp(y)); g.stroke(); g.fillText(y + '%', 8, Yp(y) + 4); }
  for (let m = Math.ceil(a / 12) * 12; m <= b; m += 12) { g.fillText(String(1978 + m / 12), Xp(m) - 14, h - 8); g.beginPath(); g.moveTo(Xp(m), Yp(0)); g.lineTo(Xp(m), Yp(0) + 5); g.stroke(); }
  SES.forEach((x, i) => { if (x.m <= o.m && (i <= S.s)) { g.strokeStyle = 'rgba(255,255,255,.4)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(Xp(x.m), 8); g.lineTo(Xp(x.m), Yp(0)); g.stroke(); g.setLineDash([]); g.fillText(x.short, Xp(x.m) + 4, 16); } });
  g.strokeStyle = o.col; g.lineWidth = 2.6; g.beginPath(); for (let m = a; m <= o.m + 1e-6; m += 0.5) { const px = Xp(m), py = Yp(val(o.k, m)); m === a ? g.moveTo(px, py) : g.lineTo(px, py); } g.stroke();
}

// ---------- panel ----------
const panel = $('#panelBody');
const cites = (list) => `<p class="src">Source: ${list.map((k) => C.cite(k)).join('; ')}</p>`;
const recKey = (x) => (x.id === 's1' ? 'r0918' : x.id === 's2' ? 'r1006' : 'r0701');
const kick = (x) => `<p class="kick">Session ${S.s + 1} of 3 · ${x.date}</p>`;
function stageNav() {
  const a = A(), i = STAGES.indexOf(S.step);
  return `<nav class="stages" aria-label="Steps in this session">${STAGES.map((st, k) => `<button data-stage="${st}" class="${k === i ? 'cur' : ''}" ${k <= a.max ? '' : 'disabled'}>${STAGE_NAME[st]}</button>`).join('')}</nav>`;
}
const backBtn = () => { const i = STAGES.indexOf(S.step); return i > 0 ? `<button class="btn ghost" data-stage="${STAGES[i - 1]}">Back</button>` : S.s > 0 ? '<button class="btn ghost" data-act="prevSession">Back to the last session</button>' : '<button class="btn ghost" data-act="toBrief">Back to the briefing</button>'; };
function stepIndex() { return S.name === 'brief' ? 0 : S.name === 'meet' ? 1 + S.s : S.name === 'debrief' ? 4 : -1; }

function render() {
  document.body.dataset.state = S.name; document.body.dataset.step = S.name === 'meet' ? S.step : '';
  const cur = stepIndex();
  document.querySelectorAll('#steps button').forEach((b, i) => { b.className = i === cur ? 'cur' : i < cur ? 'done' : ''; b.setAttribute('aria-current', i === cur ? 'step' : 'false'); });
  let h = '';
  if (S.name === 'brief') h = `<p class="kick">Briefing</p><h2 tabindex="-1">${C.BRIEF.title}</h2>${C.BRIEF.body}<p class="hint">In the room: tap a member to see their record so far. Tap a number on the table for detail. The bar at the top takes you to any session.</p><div class="row"><button class="btn pri" data-act="startMeeting">Session 1: September 18, 1979</button></div>`;
  else if (S.name === 'meet') h = stageNav() + renderMeeting();
  else if (S.name === 'debrief') h = renderDebrief();
  panel.innerHTML = h; panel.parentElement.scrollTop = 0;
  const h2 = panel.querySelector('h2'); if (h2 && S.focusNext !== false) h2.focus({ preventScroll: true }); S.focusNext = true;
}
function sortOpts(x) { return x.sortOpts || C.POS; }
function sortFb(x, i) { const q = x.quotes[i]; return Array.isArray(x.quoteFb) ? x.quoteFb[i] : x.quoteFb[q[0]]; }
function setSpeaker() { // which figure is speaking, and what the bubble says
  const x = X(), a = A();
  if (S.name === 'meet' && S.step === 'record' && a.qi >= 0 && a.qi < x.quotes.length) {
    const q = x.quotes[a.qi]; S.speaker = seatOf(q[0]);
    bubble.innerHTML = `<p class="bwho">${who(q[0])}</p><p class="bsay">“${q[1]}”</p><p class="bsrc">${C.SRC[q[2]][0]}</p>`;
  } else S.speaker = null;
}
function renderMeeting() {
  const x = X(), a = A();
  if (S.step === 'record') {
    const opts = sortOpts(x), n = x.quotes.length;
    if (a.qi < 0) return `${kick(x)}<h2 tabindex="-1">${x.title}</h2>${x.setting}<p class="prop">${x.question}</p>
      <p class="hint">The numbers on the table are what the members had in hand. Next you will hear five of them speak, one at a time.</p>
      <div class="row"><button class="btn pri" data-act="hear">Hear the room</button>${backBtn()}</div>`;
    if (a.qi >= n) { const right = x.quotes.filter((q, i) => a.sort[i] === q[3]).length;
      return `${kick(x)}<h2 tabindex="-1">${right} of ${n} placed</h2><ul class="recap">${x.quotes.map((q, i) => `<li class="${a.sort[i] === q[3] ? 'ok' : 'no'}"><span class="mark" aria-hidden="true">${a.sort[i] === q[3] ? '✓' : '✕'}</span><div><b>${surname(q[0])}</b>: ${opts.find((o) => o[0] === q[3])[1]}</div></li>`).join('')}</ul>${cites([x.quotes[0][2], recKey(x)])}
      <div class="row"><button class="btn pri" data-stage="predict">Next: predict the vote</button><button class="btn ghost" data-act="rehear">Hear them again</button></div>`; }
    const i = a.qi, q = x.quotes[i], pick = a.sort[i], done = pick !== undefined, ok = pick === q[3];
    let h = `${kick(x)}<p class="count">Speaker ${i + 1} of ${n}</p><h2 tabindex="-1">${x.sortOpts ? x.sortTitle : `How did ${surname(q[0])} vote?`}</h2>
      <p class="prop">${x.question}</p><p class="hint">${x.sortOpts ? x.sortHint : `${C.PEOPLE[q[0]][0]}'s words are over the table, from the transcript. Choose how ${surname(q[0])} voted on this motion.`}</p>
      <fieldset class="q"><legend class="sr">Your answer</legend><div class="seg one cards">${opts.map(([v, l]) => `<label><input type="radio" name="sort" value="${v}" ${pick === v ? 'checked' : ''} ${done ? 'disabled' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>`;
    if (done) h += `<p class="fb ${ok ? 'ok' : 'no'}" role="status"><b>${ok ? 'Right.' : 'Not this one.'}</b> ${opts.find((o) => o[0] === q[3])[1]}. ${sortFb(x, i)}</p>`;
    return h + `<div class="row"><button class="btn pri" data-act="nextSpeaker" ${done ? '' : 'disabled'}>${i < n - 1 ? 'Next speaker' : 'See the five'}</button><button class="btn ghost" data-act="prevSpeaker">Back</button></div>`;
  }
  if (S.step === 'predict') {
    const ord = order(x.predict.length, 50 + S.s), p = a.pred, chk = a.predChecked;
    let h = `${kick(x)}<h2 tabindex="-1">Predict the split</h2><p class="prop">${x.question}</p>
      <fieldset class="q"><legend>How will the twelve voting members split?</legend><div class="seg one cards">${ord.map((i) => `<label><input type="radio" name="pred" value="${i}" ${p === i ? 'checked' : ''} ${chk ? 'disabled' : ''}><span>${x.predict[i][0]}</span></label>`).join('')}</div></fieldset>`;
    if (!chk) return h + `<div class="row"><button class="btn pri" data-act="checkPred" ${p !== undefined ? '' : 'disabled'}>Lock in</button>${backBtn()}</div>`;
    const ok = x.predict[p][1];
    return h + `<p class="fb ${ok ? 'ok' : 'no'}"><b>${ok ? 'Right.' : 'Not what happened.'}</b> ${x.predictFb}</p>${cites(x.predictCites)}<div class="row"><button class="btn pri" data-stage="call">Next: your recommendation</button>${backBtn()}</div>`;
  }
  if (S.step === 'call') {
    const ord = order(x.calls.length, 80 + S.s), c = a.call;
    return `${kick(x)}<h2 tabindex="-1">Your recommendation</h2><p class="hint">The chairman asks the staff for a view before the vote. There is no right answer here and it is not scored. You will see who at the table stood where you stand.</p>
      <fieldset class="q"><legend>You recommend</legend><div class="seg one cards">${ord.map((i) => `<label><input type="radio" name="call" value="${i}" ${c === i ? 'checked' : ''}><span>${x.calls[i][0]}</span></label>`).join('')}</div></fieldset>
      <div class="row"><button class="btn pri" data-act="toRoll" ${c !== undefined ? '' : 'disabled'}>Call the roll</button>${backBtn()}</div>`;
  }
  if (S.step === 'roll') {
    const pos = x.calls[a.call][1], with_ = x.members.filter((id) => x.votes[id] === pos);
    let h = `${kick(x)}<h2 tabindex="-1">The roll call: ${x.tally}</h2><p class="prop">${x.question}</p>
      <p class="legendline"><span class="maj">For the motion</span><span class="tight">Against: wanted firmer</span><span class="easy">Against: wanted easier</span></p>`;
    if (x.extraVote) { const e = x.extraVote; h += `<h3>${e.label}: ${e.tally}</h3><div class="roll">${[...e.yes.map((id) => [id, 'maj', 'For']), ...e.no.map((id) => [id, 'easy', 'Against'])].map(([id, c, l]) => `<div class="${c}"><b>${surname(id)}</b><small>${l}</small></div>`).join('')}</div>${cites([e.cite])}`; }
    h += `<h3>Who stood with you</h3><p>You recommended: <i>${x.calls[a.call][0]}</i></p>`;
    if (with_.length) h += `<p>${with_.length === x.members.length ? 'Every voting member.' : with_.map((id) => C.PEOPLE[id][0]).join(', ') + '.'}</p>`;
    else h += `<p class="fb">${(x.callNotes || {})[pos] || 'No voting member took this position.'}</p>`;
    if (x.id === 's1' && pos === 'easy') h += '<p class="hint">On the discount rate that afternoon, Partee and Teeters also voted to stand pat.</p>';
    return h + `${cites([recKey(x)])}<div class="row"><button class="btn pri" data-stage="run">Play the record: ${mLabel(x.m, 1)} to ${mLabel(x.runTo, 1)}</button>${backBtn()}</div>`;
  }
  if (S.step === 'run') return `${kick(x)}<h2 tabindex="-1">What happened next</h2><div class="prog"><i id="runbar"></i></div><ul class="log" id="runlog"></ul><p class="hint">Real monthly data, playing on the table.</p><div class="row"><button class="btn pri" data-act="skipRun">Skip ahead</button>${backBtn()}</div>`;
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
  if (!chk) return h + `<div class="row"><button class="btn pri" data-act="checkEv" ${ready ? '' : 'disabled'}>Check</button>${backBtn()}</div>`;
  return h + `<p class="hint">Bearing on an argument is not the same as settling it. Each side has a reply to the other's evidence.</p><div class="row"><button class="btn pri" data-act="next">${S.s < 2 ? `Session ${S.s + 2}: ${SES[S.s + 1].date}` : 'Debrief'}</button>${backBtn()}</div>`;
}
function score() {
  let sort = 0, sortN = 0, pred = 0, ev = 0, evN = 0, withMaj = 0, done = 0;
  S.ans.forEach((a, i) => { const x = SES[i];
    x.quotes.forEach((q, j) => { sortN++; if (a.sort[j] === q[3]) sort++; });
    if (a.predChecked && x.predict[a.pred][1]) pred++;
    x.contest.evidence.forEach((e, j) => { evN++; if (a.evChecked && a.ev[j] === e[1]) ev++; });
    if (a.callDone) { done++; if (x.calls[a.call][1] === 'maj') withMaj++; } });
  return { sort, sortN, pred, ev, evN, withMaj, done };
}
function renderDebrief() {
  const s = score();
  return `<div class="deb"><div class="debhead"><p class="kick">Debrief</p><h2 tabindex="-1">Reading the record</h2>
    <div class="scorebar"><span><b>${s.sort}</b> of ${s.sortN}<small>speakers placed</small></span><span><b>${s.pred}</b> of 3<small>splits predicted</small></span><span><b>${s.ev}</b> of ${s.evN}<small>evidence matched</small></span></div>
    <p class="hint">Scored only on reading the evidence. Your recommendations matched the majority ${s.withMaj} of ${s.done} times, and that is not scored.</p></div>
    <div class="debcol"><h3>The three votes</h3><div class="tw"><table><thead><tr><th>Session</th><th>Your call</th><th>The vote</th><th>Dissents</th></tr></thead><tbody>` +
    SES.map((x, i) => { const a = S.ans[i], d = x.members.filter((id) => x.votes[id] !== 'maj'); return `<tr><th><button class="link" data-nav="${i + 1}">${x.short}</button></th><td>${a.callDone ? x.calls[a.call][0].split(':')[0] : 'Not played'}</td><td>${a.rolled ? x.tally : 'Not seen'}</td><td>${!a.rolled ? '' : d.length ? d.map((id) => `${surname(id)} (${x.votes[id] === 'tight' ? 'firmer' : 'easier'})`).join(', ') : 'None'}</td></tr>`; }).join('') +
    `</tbody></table></div><p class="contest"><b>Still contested.</b> Whether the policy was necessary, whether it could have cost less, and who paid for it remain open. See the sources in About.</p></div>
    <div class="debcol"><h3>Three things to carry out of the room</h3><ul class="try"><li>The same data produced dissents in both directions at the first and last meetings. Disagreement was about lags, expectations and who bears the cost, not arithmetic.</li><li>The unanimous vote changed the method, not just the rate. Members who disagreed in September could each read the new method as their own.</li><li>By 1982 the money target itself was in doubt. Velocity fell when several members expected it to rise.</li></ul>
    <div class="row"><button class="btn pri" data-act="restart">Start over</button><button class="btn ghost" data-nav="3">Back to July 1982</button><button class="btn ghost" data-act="about">Sources and method</button></div></div></div>`;
}

// ---------- events ----------
panel.addEventListener('change', (e) => {
  const t = e.target, a = S.name === 'meet' ? A() : null; if (!a) return;
  const en = (sel, on) => { const b = panel.querySelector(sel); if (b) b.disabled = !on; };
  if (t.name === 'sort') { const x = X(); a.sort[a.qi] = t.value; audio.chime(t.value === x.quotes[a.qi][3]); S.focusNext = false; render(); const fb = panel.querySelector('.fb'); if (fb) fb.scrollIntoView({ block: 'nearest' }); }
  else if (t.name === 'pred') { a.pred = +t.value; en('[data-act=checkPred]', true); }
  else if (t.name === 'call') { a.call = +t.value; en('[data-act=toRoll]', true); }
  else if (t.name.startsWith('e-')) { a.ev[+t.name.slice(2)] = +t.value; en('[data-act=checkEv]', X().contest.evidence.every((_, i) => a.ev[i] !== undefined)); }
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act],[data-stage],[data-nav]'); if (!b || b.disabled) return;
  if (b.dataset.stage) step(b.dataset.stage); else if (b.dataset.nav) nav(+b.dataset.nav); else act(b.dataset.act);
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!card.hidden) closeCard(); else closeAbout(); } });
function nav(i) { if (S.name === 'title') return; closeCard(); if (i === 0) go('brief'); else if (i === 4) go('debrief'); else go('meet', i - 1); }
function act(k) {
  const a = S.name === 'meet' ? A() : null;
  if (k === 'begin') { audio.init(); go('brief'); }
  else if (k === 'startMeeting') go('meet', 0);
  else if (k === 'toBrief') go('brief');
  else if (k === 'prevSession') go('meet', S.s - 1);
  else if (k === 'hear') { a.qi = 0; audio.tick(); step('record'); }
  else if (k === 'rehear') { a.qi = 0; step('record'); }
  else if (k === 'nextSpeaker') { a.qi++; audio.tick(); step('record'); }
  else if (k === 'prevSpeaker') { a.qi--; step('record'); }
  else if (k === 'checkPred') { a.predChecked = true; audio.chime(X().predict[a.pred][1]); S.focusNext = false; render(); const fb = panel.querySelector('.fb'); if (fb) fb.scrollIntoView({ block: 'center' }); }
  else if (k === 'toRoll') { a.callDone = true; step('roll'); }
  else if (k === 'skipRun') { if (S.run) S.run.t = S.run.dur; }
  else if (k === 'checkEv') { a.evChecked = true; audio.chime(X().contest.evidence.every((e, i) => a.ev[i] === e[1])); S.focusNext = false; render(); const fb = panel.querySelector('.fb'); if (fb) fb.scrollIntoView({ block: 'center' }); }
  else if (k === 'next') { if (S.s < 2) go('meet', S.s + 1); else go('debrief'); }
  else if (k === 'restart') { S.ans = fresh(); go('brief'); }
  else if (k === 'about') openAbout();
  else if (k === 'closeAbout') closeAbout();
  else if (k === 'closeCard') closeCard();
  else if (k === 'sound') { audio.toggle(); if (audio.on) audio.init(); $('#soundBtn').setAttribute('aria-pressed', audio.on); $('#soundBtn').textContent = audio.on ? 'Sound on' : 'Sound off'; }
}
let lastFocus = null;
function openAbout() { lastFocus = document.activeElement; $('#modal').hidden = false; $('#modalClose').focus(); }
function closeAbout() { if ($('#modal').hidden) return; $('#modal').hidden = true; if (lastFocus) lastFocus.focus(); }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeAbout(); });
$('#aboutBody').innerHTML = '<h2 id="aboutH">About Fed1979</h2>' + C.ABOUT;
const caption = $('#caption');
function say(t) { caption.textContent = t || ''; caption.classList.toggle('on', !!t); }

// ---------- transitions ----------
function step(s) {
  const a = A(), x = X(); S.step = s; say(''); S.run = null; S.rollT = -1;
  a.max = Math.max(a.max, STAGES.indexOf(s));
  if (s === 'roll') { if (!a.rolled) { a.rolled = true; if (!reduce) S.rollT = 0; audio.gavel(); } }
  if (s === 'run') { S.run = { t: 0, dur: clamp((x.runTo - x.m) * 0.42, 5, 13), m: -1 }; setMonth(x.m); }
  else setMonth(a.ran && (s === 'contest') ? x.runTo : x.dm);
  setSpeaker(); render(); refreshSeats(); boardDirty = true;
}
function go(name, arg) {
  S.name = name; say(''); S.run = null; S.rollT = -1; S.speaker = null;
  if (name === 'brief') setMonth(19);
  if (name === 'meet') { S.s = arg; S.step = 'record'; setMonth(X().dm); setSpeaker(); }
  rig.view = VIEWS.room; if (reduce) snapRig();
  render(); refreshSeats(); boardDirty = true;
}
function runFrame(dt) {
  const R = S.run, x = X(); R.t += dt;
  const mf = x.m + clamp((R.t - 0.4) / (R.dur - 0.8), 0, 1) * (x.runTo - x.m), m = Math.floor(mf + 1e-6);
  setMonth(mf);
  if (m !== R.m) { for (let k = R.m + 1; k <= m; k++) { if (k < x.m) continue; const ev = x.events[k]; if (ev) { const li = document.createElement('li'); li.textContent = ev; const lg = $('#runlog'); if (lg) lg.appendChild(li); say(ev); audio.tick(); } } R.m = m; }
  const bar = $('#runbar'); if (bar) bar.style.width = clamp(R.t / R.dur * 100, 0, 100) + '%';
  if (R.t >= R.dur) { S.run = null; A().ran = true; step('contest'); }
}

// ---------- main loop ----------
let last = performance.now(), lastN = -1;
function frame(now) {
  const dt = Math.min(DTCAP, Math.max(0.001, (now - last) / 1000)); last = now; S.T += dt;
  if (S.name === 'title') S.titleT += dt;
  if (S.name === 'meet' && S.step === 'run' && S.run) { let left = dt; while (left > 1e-6 && S.run) { const d = Math.min(0.05, left); runFrame(d); left -= d; } }
  if (S.name === 'meet' && S.step === 'roll' && S.rollT >= 0) { S.rollT += dt; if (S.rollT > 0.34 * 13) S.rollT = -1; }
  const n = revealCount(); if (n !== lastN) { if (n > lastN && S.rollT >= 0) audio.tick(); lastN = n; refreshSeats(); boardDirty = true; }
  room.update(dt, S.T, reduce);
  updateRig(dt); updateLabels();
  if (boardDirty) drawBoard();
  composer.render();
  requestAnimationFrame(frame);
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { boardDirty = true; });

// ---------- test hook ----------
window.__demo = {
  state: () => ({ name: S.name, s: S.s, step: S.step, ans: S.ans, score: score(), month: S.month, speaker: S.speaker, reveal: revealCount(), card: S.card }),
  go: (name, arg) => { go(name, arg); snapRig(); },
  step: (s) => { step(s); snapRig(); },
  answer: (o) => Object.assign(A(), o),
  render: () => render(),
  act, nav, openCard, closeCard,
  advance: (sec) => { for (let i = 0; i < sec * 20; i++) { if (S.name === 'meet' && S.step === 'run' && S.run) runFrame(0.05); if (S.rollT >= 0) { S.rollT += 0.05; if (S.rollT > 0.34 * 13) S.rollT = -1; } room.update(0.05, S.T += 0.05, reduce); } },
  seatScreen: (i) => { const p = project(room.anchors.seat(i)); return [p.x, p.y + 40]; },
  tileScreen: (i) => { const r = tileRects()[i], cv = room.board.canvas; const v = new THREE.Vector3((r.x + r.w / 2) / cv.width * room.board.W - room.board.W / 2, room.board.D / 2 - (r.y + r.h / 2) / cv.height * room.board.D, 0); room.board.mesh.localToWorld(v); const p = project(v); return [p.x, p.y]; },
  SES,
};

resize(); snapRig(); render(); refreshSeats();
requestAnimationFrame(frame);
