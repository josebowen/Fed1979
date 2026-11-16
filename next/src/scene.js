// The boardroom at night. Twelve figures sit at the table. They start neutral and take a
// color only when they vote. The middle of the table is a lit data board that main.js draws on.
import * as THREE from 'three';
import { GlowPoints, mulberry, clamp, lerp } from './fx.js';

const BRASS = 0xc99a4e;

function skylineTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d'), r = mulberry(7);
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#04070f'); g.addColorStop(0.55, '#0b1630'); g.addColorStop(1, '#1b2340');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(220,230,255,${0.2 + r() * 0.5})`; x.fillRect(r() * 1024, r() * 220, 1.4, 1.4); }
  x.fillStyle = 'rgba(235,228,200,.85)'; x.beginPath(); x.arc(820, 90, 26, 0, Math.PI * 2); x.fill();
  for (let layer = 0; layer < 3; layer++) {
    let px = -20;
    while (px < 1024) {
      const w = 30 + r() * 70, h = 90 + r() * (200 - layer * 40) + layer * 30, y = 512 - h;
      x.fillStyle = ['#0a1020', '#0d1428', '#111a33'][layer]; x.fillRect(px, y, w, h);
      for (let wy = y + 8; wy < 505; wy += 10) for (let wx = px + 5; wx < px + w - 5; wx += 8)
        if (r() < 0.33 - layer * 0.06) { x.fillStyle = r() < 0.8 ? 'rgba(255,205,130,.75)' : 'rgba(170,210,255,.7)'; x.fillRect(wx, wy, 3, 4); }
      px += w + r() * 10;
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function woodTexture(dark) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d'), r = mulberry(dark ? 3 : 11);
  x.fillStyle = dark ? '#1a110b' : '#3a2213'; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 90; i++) {
    x.strokeStyle = `rgba(${dark ? '60,38,22' : '95,58,32'},${0.15 + r() * 0.3})`; x.lineWidth = 0.6 + r() * 2;
    const y0 = r() * 256; x.beginPath(); x.moveTo(0, y0);
    for (let px = 0; px <= 512; px += 32) x.lineTo(px, y0 + Math.sin(px * 0.01 + i) * 4 + (r() - 0.5) * 2);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// Figure material: a plain lit body color plus a soft rim. Neutral is off-white; a vote sets both colors.
const NEUTRAL = 0xb9bcc6, NEUTRAL_RIM = 0x8d92a3;
function figureMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uBase: { value: new THREE.Color(NEUTRAL) }, uRim: { value: new THREE.Color(NEUTRAL_RIM) } },
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uBase; uniform vec3 uRim; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float f = pow(1.0 - max(dot(n, v), 0.0), 2.4);
        float ndl = max(dot(n, normalize(vec3(0.15, 1.0, 0.55))), 0.0);
        gl_FragColor = vec4(uBase * (0.2 + 0.62 * ndl) + uRim * f * 0.7, 1.0); }`,
  });
}

export function createRoom(lite) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  scene.fog = new THREE.FogExp2(0x04060c, 0.018);
  const glow = new GlowPoints(300);
  scene.add(glow.points);

  // light
  scene.add(new THREE.HemisphereLight(0x3c4660, 0x24170c, 0.5));
  const lamps = [-5.2, 0, 5.2].map((x) => { const l = new THREE.PointLight(0xffc583, 34, 0, 2); l.position.set(x, 4.2, 0); scene.add(l); return l; });
  const moon = new THREE.DirectionalLight(0x9fb0d8, 0.28); moon.position.set(2, 5, -10); scene.add(moon);

  // floor, walls, windows
  const floorTex = woodTexture(true); floorTex.repeat.set(6, 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.6; scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b1222, roughness: 0.85 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), wallMat); back.position.set(0, 4.4, -8); scene.add(back);
  const side = (x, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), wallMat); m.position.set(x, 4.4, 4); m.rotation.y = ry; scene.add(m); };
  side(-15, Math.PI / 2); side(15, -Math.PI / 2);
  const skyTex = skylineTexture();
  const winMat = new THREE.MeshBasicMaterial({ map: skyTex, color: 0xb0b8d0, fog: false });
  const frameMat = new THREE.MeshStandardMaterial({ color: BRASS, metalness: 0.85, roughness: 0.35 });
  const windows = [];
  [-9, -3, 3, 9].forEach((x, i) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 7.2), winMat.clone()); w.material.map = skyTex.clone(); w.material.map.needsUpdate = true;
    w.material.map.repeat.set(0.25, 1); w.material.map.offset.set(i * 0.25, 0);
    w.position.set(x, 3.6, -7.96); scene.add(w); windows.push(w);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(4.9, 7.5, 0.08), frameMat); fr.position.set(x, 3.6, -8.0); fr.scale.z = 0.5; scene.add(fr);
    const mull = new THREE.Mesh(new THREE.BoxGeometry(0.06, 7.2, 0.1), frameMat); mull.position.set(x, 3.6, -7.92); scene.add(mull);
    const tr = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.06, 0.1), frameMat); tr.position.set(x, 4.8, -7.92); scene.add(tr);
  });
  // window light falling across the floor
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(30, 9), new THREE.MeshBasicMaterial({ color: 0x223358, transparent: true, opacity: 0.18, depthWrite: false }));
  spill.rotation.x = -Math.PI / 2; spill.position.set(0, -2.58, -4); scene.add(spill);

  // table
  const tableTex = woodTexture(false); tableTex.repeat.set(3, 1);
  const tableMat = new THREE.MeshStandardMaterial({ map: tableTex, color: 0xc89a78, roughness: 0.32, metalness: 0.05 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(17, 0.22, 5.6), tableMat); table.position.y = -0.11; scene.add(table);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(17.12, 0.06, 5.72), frameMat); trim.position.y = -0.23; scene.add(trim);
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(12, 2.4, 2.4), new THREE.MeshStandardMaterial({ color: 0x150d07, roughness: 0.6 })); pedestal.position.y = -1.4; scene.add(pedestal);
  // (the pendant lamp shades were removed: from the fixed camera they sat in front of the members' heads)
  // seats: the chair (you) at the head, four members facing the windows' glow
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x22150d, roughness: 0.5 });
  const seats = [], pickables = [];
  // twelve voting members: the chairman at the head, ten along the window side, one at the foot
  const seatPos = [[-9.0, 0, 0.2, Math.PI / 2], ...Array.from({ length: 10 }, (_, k) => [-6.75 + k * 1.5, 0, -3.9, 0]), [9.0, 0, 0.2, -Math.PI / 2]];
  const FS = 1.45;
  seatPos.forEach(([x, , z, ry], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.18), chairMat); back.position.set(0, 0.4, -0.55); g.add(back);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 1.0), chairMat); seat.position.set(0, -0.62, 0); g.add(seat);
    g.scale.setScalar(FS);
    const fig = figureMaterial();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.75, 6, 16), fig); torso.position.set(0, 0.55, -0.15); torso.scale.set(1.0, 1.15, 0.8); g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), fig); head.position.set(0, 1.72, -0.1); g.add(head);
    torso.userData.seat = head.userData.seat = i; pickables.push(torso, head);
    // nameplate on the table
    const plate = new THREE.Group();
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.08), new THREE.MeshStandardMaterial({ color: 0x0d0a07, roughness: 0.4 }));
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.035, 0.09), new THREE.MeshBasicMaterial({ color: 0x888888 }));
    strip.position.y = 0.06; plate.add(p); plate.add(strip);
    plate.scale.x = i === 0 || i === 11 ? 1 : 0.9;
    if (i === 0) { plate.position.set(-7.9, 0.11, 0); plate.rotation.y = Math.PI / 2; } else if (i === 11) { plate.position.set(7.9, 0.11, 0); plate.rotation.y = -Math.PI / 2; } else { plate.position.set(x, 0.11, -2.35); }
    plate.rotation.x = i === 0 || i === 11 ? 0 : -0.2; scene.add(plate);
    seats.push({ group: g, strip, plate, fig, base: new THREE.Color(NEUTRAL), rim: new THREE.Color(NEUTRAL_RIM), tb: new THREE.Color(NEUTRAL), tr: new THREE.Color(NEUTRAL_RIM),
      head: new THREE.Vector3(x, 1.72 * FS + 0.2, z), platePos: plate.position.clone() });
  });


  // ---------- the data board: a lit panel standing on the table, tilted toward the viewer ----------
  const BW = 13.6, BD = 4.6, BZ = 0.7, TILT = 0.48;
  const bc = document.createElement('canvas'); bc.width = 2048; bc.height = Math.round(2048 * BD / BW);
  const btex = new THREE.CanvasTexture(bc); btex.colorSpace = THREE.SRGBColorSpace; btex.anisotropy = 8;
  const boardMat = new THREE.MeshBasicMaterial({ map: btex, toneMapped: false });
  const boardGroup = new THREE.Group(); boardGroup.position.set(0, 0.05 + Math.sin(TILT) * BD / 2, BZ); boardGroup.rotation.x = -Math.PI / 2 + TILT; scene.add(boardGroup);
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(BW, BD), boardMat); boardMesh.position.z = 0.03; boardGroup.add(boardMesh);
  const bFrame = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.18, BD + 0.18, 0.05), frameMat); boardGroup.add(bFrame);
  const board = { canvas: bc, ctx: bc.getContext('2d'), tex: btex, mesh: boardMesh, W: BW, D: BD, z: BZ };

  // dust in the lamp light
  const rnd = mulberry(42), motes = [];
  for (let i = 0; i < 70; i++) motes.push((rnd() - 0.5) * 16, 0.6 + rnd() * 3.2, (rnd() - 0.5) * 5, rnd() * 6.28);

  // ---------- state and update ----------
  const st = { power: 1 };
  const cur = { ...st };
  const tmp = new THREE.Vector3();
  function update(dt, T, reduce) {
    const k = 1 - Math.exp(-3 * dt), kc = reduce ? 1 : 1 - Math.exp(-6 * dt);
    cur.power = lerp(cur.power, st.power, k);
    boardMat.color.setScalar(clamp(cur.power, 0.05, 1) * 0.88); // kept under the bloom threshold so small text does not smear
    for (const s of seats) { s.base.lerp(s.tb, kc); s.rim.lerp(s.tr, kc); s.fig.uniforms.uBase.value.copy(s.base); s.fig.uniforms.uRim.value.copy(s.rim); }
    glow.begin();
    for (let i = 0; i < motes.length; i += 4) { const ph = motes[i + 3], b = 0.1 + 0.07 * Math.sin(T * 0.7 + ph * 3);
      glow.add(motes[i] + (reduce ? 0 : Math.sin(T * 0.1 + ph) * 0.4), motes[i + 1] + (reduce ? 0 : Math.cos(T * 0.08 + ph) * 0.2), motes[i + 2], 1.2 * b, 0.9 * b, 0.5 * b, 0.05); }
    glow.end();
  }

  // label anchors (world positions)
  const anchors = {
    seat: (i) => tmp.copy(seats[i].head).add(new THREE.Vector3(0, 0.45, 0)).clone(),
    plate: (i) => seats[i].platePos.clone(),
    board: () => boardGroup.position.clone(),
  };

  // hex = null returns a figure to neutral. glow lifts the rim for the current speaker.
  const C1 = new THREE.Color();
  function setSeat(i, hex, glowRim) {
    const s = seats[i];
    if (hex) { C1.set(hex); s.tb.copy(C1).multiplyScalar(0.85); s.tr.copy(C1).multiplyScalar(1.15); s.strip.material.color.copy(C1).multiplyScalar(1.5); }
    else { s.tb.set(NEUTRAL); s.tr.set(NEUTRAL_RIM); s.strip.material.color.set(0x8a8a8a); }
    if (glowRim) { s.tr.set(0xffd58a).multiplyScalar(1.5); s.tb.set(0xe9e2d2); s.strip.material.color.set(0xffd58a).multiplyScalar(1.4); }
  }

  return { scene, st, cur, update, anchors, setSeat, glow, windows, lamps, board, pickables };
}
