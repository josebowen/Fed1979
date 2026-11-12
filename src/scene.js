// The boardroom at night and the tabletop model economy. The city is the gauge:
//   borrowing  -> cranes rise and new buildings go up
//   demand     -> lit windows, lit shop fronts, delivery vans
//   prices     -> glowing price tags float higher over the shops
//   jobs       -> a queue of figures outside one building
//   rate       -> the brass column at the center of the table
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

// Buildings: instanced boxes with procedural lit windows (uLit) and shop fronts (uShop).
function buildingMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uLit: { value: 0.5 }, uShop: { value: 0.5 }, uFog: { value: new THREE.Color(0x05070d) } },
    vertexShader: `attribute float aSeed; attribute float aBase; varying vec3 vW; varying vec3 vN; varying float vSeed; varying float vBase;
      void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vSeed = aSeed; vBase = aBase; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uLit; uniform float uShop; varying vec3 vW; varying vec3 vN; varying float vSeed; varying float vBase;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      void main(){
        vec3 n = normalize(vN); float ndl = max(dot(n, normalize(vec3(0.2,1.0,0.35))), 0.0);
        vec3 base = mix(vec3(0.055,0.07,0.11), vec3(0.09,0.10,0.14), vSeed);
        vec3 col = base * (0.55 + 0.9 * ndl);
        if (abs(n.y) < 0.5) {
          vec2 t = vec2(dot(vW.xz, vec2(-n.z, n.x)), vW.y - vBase);
          vec2 g = vec2(t.x * 9.0, t.y * 11.0); vec2 f = fract(g); vec2 id = floor(g);
          float win = step(0.28, f.x) * step(f.x, 0.72) * step(0.3, f.y) * step(f.y, 0.75);
          if (t.y < 0.09) {
            float shop = step(0.12, fract(t.x * 3.0)) * step(fract(t.x * 3.0), 0.88) * step(0.012, t.y);
            col += shop * uShop * vec3(1.25, 0.82, 0.42);
          } else {
            float lit = step(h(vec3(id, vSeed * 91.0)), uLit);
            vec3 wc = mix(vec3(1.2, 0.78, 0.38), vec3(0.55, 0.75, 1.1), step(0.86, h(vec3(id.yx, vSeed))));
            col += win * lit * wc * 0.85 + win * (1.0 - lit) * vec3(0.02, 0.03, 0.05);
          }
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// Dark figure with a soft rim of the member's color, so it reads against the night windows.
function rimMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uRim: { value: new THREE.Color(0.4, 0.4, 0.45) } },
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uRim; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); float f = pow(1.0 - max(dot(n, v), 0.0), 2.6);
        float top = max(n.y, 0.0) * 0.08; gl_FragColor = vec4(vec3(0.03,0.035,0.05) + uRim * (f * 0.9 + top), 1.0); }`,
  });
}

export function createRoom(lite) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060c);
  scene.fog = new THREE.FogExp2(0x04060c, 0.018);
  const glow = new GlowPoints(lite ? 900 : 1600);
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
  // pendant lamps
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x1b1a17, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide });
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.9) });
  lamps.forEach((l) => {
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.5, 32, 1, true), shadeMat); sh.position.set(l.position.x, 4.55, 0); scene.add(sh);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), bulbMat); b.position.set(l.position.x, 4.32, 0); scene.add(b);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 4), shadeMat); cord.position.set(l.position.x, 6.8, 0); scene.add(cord);
  });

  // seats: the chair (you) at the head, four members facing the windows' glow
  const figMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.75, metalness: 0.1 });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x22150d, roughness: 0.5 });
  const seats = [];
  // twelve voting members: the chairman at the head, ten along the window side, one at the foot
  const seatPos = [[-9.4, 0, 0, Math.PI / 2], ...Array.from({ length: 10 }, (_, k) => [-6.75 + k * 1.5, 0, -3.5, 0]), [9.4, 0, 0, -Math.PI / 2]];
  seatPos.forEach(([x, , z, ry], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.18), chairMat); back.position.set(0, 0.4, -0.55); g.add(back);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 1.0), chairMat); seat.position.set(0, -0.62, 0); g.add(seat);
    let rim = null;
    g.scale.setScalar(i === 0 || i === 11 ? 1 : 0.84);
    {
      rim = rimMaterial();
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.75, 6, 16), rim); torso.position.set(0, 0.55, -0.15); torso.scale.set(1.2, 1.15, 0.8); g.add(torso);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), rim); head.position.set(0, 1.72, -0.1); g.add(head);
    }
    // nameplate on the table
    const plate = new THREE.Group();
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.08), new THREE.MeshStandardMaterial({ color: 0x0d0a07, roughness: 0.4 }));
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.035, 0.09), new THREE.MeshBasicMaterial({ color: 0x888888 }));
    strip.position.y = 0.06; plate.add(p); plate.add(strip);
    plate.scale.x = i === 0 || i === 11 ? 1 : 0.9;
    if (i === 0) { plate.position.set(-7.9, 0.11, 0); plate.rotation.y = Math.PI / 2; } else if (i === 11) { plate.position.set(7.9, 0.11, 0); plate.rotation.y = -Math.PI / 2; } else { plate.position.set(x, 0.11, -2.35); }
    plate.rotation.x = i === 0 || i === 11 ? 0 : -0.2; scene.add(plate);
    seats.push({ group: g, strip, plate, rim, head: new THREE.Vector3(x, i === 0 || i === 11 ? 2.2 : 1.95, z + (i === 0 || i === 11 ? 0 : -0.1)) });
  });

  // ---------- the tabletop city ----------
  const city = new THREE.Group(); scene.add(city);
  const CW = 8.4, CD = 3.4, COLS = 7, ROWS = 4;
  const base = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.5, 0.14, CD + 0.5), new THREE.MeshStandardMaterial({ color: 0x0a0f1a, roughness: 0.7, metalness: 0.2 }));
  base.position.y = 0.07; city.add(base);
  const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(CW + 0.58, 0.04, CD + 0.58), frameMat); baseTrim.position.y = 0.02; city.add(baseTrim);
  const roadMat = new THREE.MeshBasicMaterial({ color: 0x151b28 });
  const Y0 = 0.145;
  const lotW = CW / COLS, lotD = CD / ROWS;
  for (let c = 0; c <= COLS; c++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.1, CD + 0.3), roadMat); s.rotation.x = -Math.PI / 2; s.position.set(-CW / 2 + c * lotW, Y0 + 0.001, 0); city.add(s); }
  for (let r = 0; r <= ROWS; r++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(CW + 0.3, 0.1), roadMat); s.rotation.x = -Math.PI / 2; s.position.set(0, Y0 + 0.001, -CD / 2 + r * lotD); city.add(s); }
  const rnd = mulberry(42);
  const lots = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cx = -CW / 2 + (c + 0.5) * lotW, cz = -CD / 2 + (r + 0.5) * lotD;
    if (c === 3 && (r === 1 || r === 2)) continue; // plaza for the brass column
    lots.push({ cx, cz, c, r });
  }
  // 26 lots: 4 construction sites, 1 job centre, the rest buildings
  const sites = [lots[2], lots[9], lots[16], lots[22]].filter(Boolean);
  const jobCentre = lots[24] || lots[lots.length - 1];
  const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
  const bMat = buildingMaterial();
  const nB = lots.length;
  const blds = new THREE.InstancedMesh(bGeo, bMat, nB);
  const seedA = new Float32Array(nB), baseA = new Float32Array(nB);
  const dummy = new THREE.Object3D();
  const bInfo = [];
  lots.forEach((L, i) => {
    const isSite = sites.includes(L);
    const w = lotW * (0.55 + rnd() * 0.2), d = lotD * (0.55 + rnd() * 0.2);
    const near = Math.abs(L.c - 3) <= 1 && L.r >= 1 && L.r <= 2;
    const h = L === jobCentre ? 0.42 : near ? 0.28 + rnd() * 0.25 : 0.35 + Math.pow(rnd(), 1.5) * (L.r === 0 ? 0.6 : 0.95);
    seedA[i] = rnd(); baseA[i] = Y0;
    bInfo.push({ x: L.cx, z: L.cz, w, d, h, site: isSite, shop: !isSite && L !== jobCentre && rnd() < 0.55 });
  });
  blds.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seedA, 1));
  blds.geometry.setAttribute('aBase', new THREE.InstancedBufferAttribute(baseA, 1));
  city.add(blds);
  function placeBuildings(build) {
    bInfo.forEach((b, i) => {
      const hh = b.site ? b.h * clamp(build, 0.04, 1) : b.h;
      dummy.position.set(b.x, Y0, b.z); dummy.scale.set(b.w, hh, b.d); dummy.updateMatrix(); blds.setMatrixAt(i, dummy.matrix);
    });
    blds.instanceMatrix.needsUpdate = true;
  }
  // cranes over the construction sites
  const craneMat = new THREE.MeshStandardMaterial({ color: 0xd8a23a, metalness: 0.3, roughness: 0.5, emissive: 0x2a1a00 });
  const cranes = sites.map((s) => {
    const g = new THREE.Group(); g.position.set(s.cx + lotW * 0.32, Y0, s.cz - lotD * 0.25);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1, 0.035), craneMat); mast.geometry.translate(0, 0.5, 0); g.add(mast);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.03), craneMat); jib.geometry.translate(-0.25, 0, 0); g.add(jib);
    const light = new THREE.Vector3();
    city.add(g); return { g, mast, jib, light, phase: rnd() * 6 };
  });
  // the brass column (federal funds rate)
  const colMat = new THREE.MeshStandardMaterial({ color: BRASS, metalness: 0.92, roughness: 0.22, emissive: 0x1a1004 });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1, 40), colMat); column.geometry.translate(0, 0.5, 0);
  column.position.set(-CW / 2 + 3.5 * lotW, Y0, 0); city.add(column);
  const colTop = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 12, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.45, 0.65) }));
  colTop.rotation.x = Math.PI / 2; city.add(colTop);
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.02, 40), frameMat); plaza.position.set(column.position.x, Y0, 0); city.add(plaza);
  // vans
  const MAXV = lite ? 26 : 44;
  const vans = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.065, 0.07), new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.5, emissive: 0x111111 }), MAXV);
  city.add(vans);
  const vanData = Array.from({ length: MAXV }, (_, i) => ({ lane: i % (ROWS + 1 + COLS + 1), u: rnd(), dir: rnd() < 0.5 ? 1 : -1, sp: 0.6 + rnd() * 0.5 }));
  // queue at the job centre
  const MAXQ = lite ? 30 : 40;
  const qMat = new THREE.MeshStandardMaterial({ color: 0x9fb4d8, roughness: 0.6, emissive: 0x0b1424 });
  const queue = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.022, 0.06, 4, 8), qMat, MAXQ);
  city.add(queue);
  const jcSign = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.75, 1.3) }));
  jcSign.position.set(jobCentre.cx, Y0 + 0.5, jobCentre.cz + lotD * 0.36); city.add(jcSign);

  // ---------- the causal chain along the table edge ----------
  const CHAIN_X = [-6.25, -3.75, -1.25, 1.25, 3.75, 6.25];
  const nodeGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.06, 48);
  const nodes = CHAIN_X.map((x) => {
    const m = new THREE.Mesh(nodeGeo, new THREE.MeshStandardMaterial({ color: 0x141826, emissive: new THREE.Color(0, 0, 0), metalness: 0.4, roughness: 0.4 }));
    m.position.set(x, 0.03, 2.25); scene.add(m);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.025, 8, 48), frameMat); ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.06, 2.25); scene.add(ring);
    return { m, x, on: 0, target: 0, color: new THREE.Color(1.6, 1.15, 0.5) };
  });
  const links = CHAIN_X.slice(0, -1).map((x, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(CHAIN_X[i + 1] - x - 0.9, 0.02, 0.05), new THREE.MeshBasicMaterial({ color: 0x2a2f40 }));
    m.position.set((x + CHAIN_X[i + 1]) / 2, 0.04, 2.25); scene.add(m); return m;
  });

  // ---------- state and update ----------
  const st = { rate: 5, build: 0.5, demand: 0.5, price: 3, jobs: 6, power: 1 };
  const cur = { ...st };
  placeBuildings(cur.build);
  const tmp = new THREE.Vector3();
  function update(dt, T, reduce) {
    const k = 1 - Math.exp(-3 * dt);
    for (const key in st) cur[key] = lerp(cur[key], st[key], k);
    const pw = cur.power; // city lights up during the title push
    bMat.uniforms.uLit.value = clamp(cur.demand, 0.06, 0.96) * pw;
    bMat.uniforms.uShop.value = clamp(cur.demand * 1.15 - 0.1, 0, 1) * pw;
    placeBuildings(cur.build);
    // column
    const ch = 0.15 + clamp(cur.rate, 0, 20) * 0.13;
    column.scale.y = ch; colTop.position.set(column.position.x, Y0 + ch + 0.02, 0);
    // cranes
    cranes.forEach((c, i) => {
      const s = clamp(cur.build * 1.3 - 0.15, 0, 1);
      c.g.visible = s > 0.04; c.mast.scale.y = 0.2 + s * 1.3; c.jib.position.y = 0.2 + s * 1.3;
      c.jib.rotation.y = reduce ? 0.6 : Math.sin(T * 0.25 + c.phase) * 0.9;
      tmp.set(c.g.position.x, Y0 + 0.2 + s * 1.3 + 0.03, c.g.position.z);
      c.light.copy(tmp);
    });
    // vans
    const nv = Math.round(MAXV * clamp(cur.demand, 0, 1) * pw);
    vans.count = nv;
    vanData.forEach((v, i) => {
      if (i >= nv) return;
      v.u = (v.u + dt * v.sp * 0.08 * (0.4 + cur.demand) * v.dir + 1) % 1;
      if (v.lane <= ROWS) { dummy.position.set(-CW / 2 + v.u * CW, Y0 + 0.035, -CD / 2 + v.lane * lotD + (v.dir > 0 ? 0.025 : -0.025)); dummy.rotation.set(0, 0, 0); }
      else { const c = v.lane - ROWS - 1; dummy.position.set(-CW / 2 + c * lotW + (v.dir > 0 ? 0.025 : -0.025), Y0 + 0.035, -CD / 2 + v.u * CD); dummy.rotation.set(0, Math.PI / 2, 0); }
      dummy.scale.set(1, 1, 1); dummy.updateMatrix(); vans.setMatrixAt(i, dummy.matrix);
    });
    vans.instanceMatrix.needsUpdate = true;
    // queue: about 3.5 figures per point of unemployment
    const nq = Math.min(MAXQ, Math.round(cur.jobs * 3.6));
    queue.count = nq;
    for (let i = 0; i < nq; i++) {
      const row = Math.floor(i / 20), col = i % 20;
      dummy.position.set(jobCentre.cx - lotW * 0.45 + col * 0.065 + (reduce ? 0 : Math.sin(T * 1.3 + i) * 0.004), Y0 + 0.05, jobCentre.cz + lotD * 0.52 + row * 0.07);
      dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); queue.setMatrixAt(i, dummy.matrix);
    }
    queue.instanceMatrix.needsUpdate = true;
    // chain nodes
    nodes.forEach((n) => { n.on = lerp(n.on, n.target, 1 - Math.exp(-5 * dt)); n.m.material.emissive.copy(n.color).multiplyScalar(n.on * 0.9); });
    links.forEach((l, i) => { const a = Math.min(nodes[i].on, nodes[i + 1].on); l.material.color.setRGB(0.16 + a * 1.4, 0.18 + a * 1.0, 0.25 + a * 0.4); });
    // glow: crane lights, price tags, column ring sparkle, lamps
    glow.begin();
    cranes.forEach((c) => { if (c.g.visible) { const b = 0.5 + 0.5 * Math.sin(T * 3 + c.phase); glow.add(c.light.x, c.light.y, c.light.z, 1.6 * b, 0.25 * b, 0.1 * b, 0.07); } });
    const tagH = clamp(cur.price, -2, 16);
    bInfo.forEach((b, i) => {
      if (!b.shop) return;
      const y = Y0 + b.h + 0.12 + Math.max(0, tagH) * 0.06 + (reduce ? 0 : Math.sin(T * 1.4 + i) * 0.02);
      const neg = tagH < 0 ? 1 : 0;
      glow.add(b.x, y, b.z, (neg ? 0.5 : 1.7) * pw, (neg ? 0.9 : 1.05) * pw, (neg ? 1.6 : 0.35) * pw, 0.11 + Math.abs(tagH) * 0.004);
    });
    if (!lite) for (let i = 0; i < 26; i++) { const a = T * 0.6 + i * 0.24; glow.add(column.position.x + Math.cos(a) * 0.24, Y0 + ch * ((i * 0.37 + T * 0.1) % 1), Math.sin(a) * 0.24, 0.5, 0.35, 0.12, 0.035); }
    glow.end();
  }

  // label anchors (world positions)
  const anchors = {
    column: () => tmp.set(column.position.x, Y0 + column.scale.y + 0.35, 0).clone(),
    cranes: () => cranes[1].light.clone().add(new THREE.Vector3(0, 0.2, 0)),
    shops: () => { const b = bInfo.find((x) => x.shop && x.x > 1.5); return new THREE.Vector3(b.x, Y0 + b.h + 0.6, b.z); },
    queue: () => new THREE.Vector3(jobCentre.cx, Y0 + 0.62, jobCentre.cz + lotD * 0.5),
    node: (i) => new THREE.Vector3(CHAIN_X[i], 0.05, 2.25 + 0.75),
    seat: (i) => seats[i].head.clone().add(new THREE.Vector3(0, 0.75, 0)),
  };

  function setSeatColor(i, hex, lit) { seats[i].strip.material.color.set(hex).multiplyScalar(lit ? 1.6 : 0.55); if (seats[i].rim) { seats[i].rim.uniforms.uRim.value.set(hex).multiplyScalar(lit ? 1.1 : 0.55); } }
  function setNode(i, on, hex) { nodes[i].target = on; if (hex) nodes[i].color.set(hex).multiplyScalar(1.4); }

  return { scene, st, cur, update, anchors, setSeatColor, setNode, glow, nodes, windows, lamps };
}
