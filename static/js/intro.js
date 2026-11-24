// Cinematic intro: cubes stream in from every direction, assemble into the
// TeleArms data cube, which then keeps twisting like a puzzle.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const root = document.getElementById('intro');
const canvas = document.getElementById('intro-canvas');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 1.5, powerPreference: 'high-performance' });
} catch (e) {
  root.classList.add('no-webgl', 'done');
  throw e;
}
let dpr = Math.min(devicePixelRatio, 1.5);
renderer.setPixelRatio(dpr);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);
scene.fog = new THREE.Fog(0x05070d, 26, 70);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 300);

// ---------- lights ----------
scene.add(new THREE.HemisphereLight(0x9bb8ff, 0x0a0c14, 0.6));
const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(10, 18, 8);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
scene.add(key);
const rim = new THREE.PointLight(0x3b7bf6, 60, 40, 1.6); rim.position.set(-9, 4, -8); scene.add(rim);
const rim2 = new THREE.PointLight(0xe9682c, 40, 40, 1.6); rim2.position.set(10, 6, -10); scene.add(rim2);

// ---------- floor ----------
const N = 7, S = 1.06, HALF = (N - 1) / 2;
const floorY = -HALF * S - 0.55;
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(60, 64),
  new THREE.MeshStandardMaterial({ color: 0x070a12, roughness: 0.85, metalness: 0, envMapIntensity: 0.15 })
);
floor.rotation.x = -Math.PI / 2; floor.position.y = floorY; floor.receiveShadow = true;
scene.add(floor);

// dotted globe ring on the floor (players around the world)
{
  const pts = [];
  for (let i = 0; i < 1200; i++) {
    const r = 9 + Math.sqrt(Math.random()) * 26, a = Math.random() * Math.PI * 2;
    pts.push(Math.cos(a) * r, floorY + 0.02, Math.sin(a) * r);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x2a4a8a, size: 0.07, transparent: true, opacity: 0.7 })));
}

// ---------- cubes ----------
const PALETTE = [0x2463eb, 0x2463eb, 0xe9682c, 0x22a06b, 0xf2b705, 0xe5484d, 0x6e56cf];
const geo = new RoundedBoxGeometry(0.94, 0.94, 0.94, 2, 0.12);
const mat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0, envMapIntensity: 0.6 });
const COUNT = N * N * N;
const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
mesh.castShadow = true; mesh.receiveShadow = true;
scene.add(mesh);

const grid = [], quat = [], start = [], startQ = [], delay = [], flight = [];
const col = new THREE.Color();
let i = 0;
for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) for (let z = 0; z < N; z++, i++) {
  grid.push(new THREE.Vector3(x - HALF, y - HALF, z - HALF));
  quat.push(new THREE.Quaternion());
  // start far away on a sphere, mostly above the horizon
  const dir = new THREE.Vector3().randomDirection(); dir.y = Math.abs(dir.y) * 0.8 + 0.15; dir.normalize();
  start.push(dir.multiplyScalar(45 + Math.random() * 35));
  startQ.push(new THREE.Quaternion().random());
  // bottom layers first, so the cube is "stacked" up
  delay.push(0.1 + (y / N) * 1.6 + Math.random() * 0.6);
  flight.push(0.9 + Math.random() * 0.4);
  mesh.setColorAt(i, col.set(PALETTE[(Math.random() * PALETTE.length) | 0]));
}
mesh.instanceColor.needsUpdate = true;

// ---------- data stream particles ----------
const P = 600;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(P * 3), pCol = new Float32Array(P * 3);
const pFrom = [], pTo = [], pPhase = [], pSpeed = [], pBase = [];
for (let k = 0; k < P; k++) {
  const d = new THREE.Vector3().randomDirection(); d.y = Math.abs(d.y) * 0.6 + 0.05;
  pFrom.push(d.clone().normalize().multiplyScalar(40 + Math.random() * 30));
  pTo.push(new THREE.Vector3().randomDirection().multiplyScalar(HALF * S * 1.2));
  pPhase.push(Math.random()); pSpeed.push(0.12 + Math.random() * 0.18);
  pBase.push(new THREE.Color(PALETTE[(Math.random() * PALETTE.length) | 0]).multiplyScalar(1.6));
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const stream = new THREE.Points(pGeo, new THREE.PointsMaterial({
  size: 0.16, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
}));
scene.add(stream);

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.5, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const w = root.clientWidth, h = root.clientHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w / 2, h / 2);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 46 : 32; // phones need a wider lens
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- animation helpers ----------
const ease3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), tq = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
const right = new THREE.Vector3(), target = new THREE.Vector3();
const AX = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
const KEYS = ['x', 'y', 'z'];

let twist = null, nextTwist = 3.6;
function startTwist(t) {
  const a = (Math.random() * 3) | 0;
  twist = { a, layer: ((Math.random() * N) | 0) - HALF, dir: Math.random() < 0.5 ? -1 : 1, t0: t, dur: 0.75 };
}
function commitTwist() {
  const rot = new THREE.Quaternion().setFromAxisAngle(AX[twist.a], twist.dir * Math.PI / 2);
  for (let k = 0; k < COUNT; k++) {
    if (Math.round(grid[k][KEYS[twist.a]]) !== twist.layer) continue;
    grid[k].applyQuaternion(rot).round();
    quat[k].premultiply(rot).normalize();
  }
  twist = null;
}

// ---------- captions timeline ----------
const caps = [...root.querySelectorAll('[data-at]')];
const T_TITLE = 5;
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });

let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(root);

const clock = new THREE.Clock();
let slow = 0, tier = 0;
function degrade() {
  tier++;
  if (tier === 1) bloom.enabled = false;
  else if (tier === 2) { renderer.shadowMap.enabled = false; key.castShadow = false; mat.needsUpdate = true; floor.material.needsUpdate = true; }
  else if (dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); }
}
let t = reduced ? 30 : 0;
root.querySelector('.intro-skip').addEventListener('click', () => { t = Math.max(t, T_TITLE); });

function frame() {
  requestAnimationFrame(frame);
  if (!visible) { clock.getDelta(); return; }
  const dt = clock.getDelta();
  t += Math.min(dt, 0.1);
  // adaptive quality: if most recent frames are slower than 40 fps, step down
  slow = slow * 0.95 + (dt > 1 / 40 && dt < 0.5 ? 0.05 : 0);
  if (slow > 0.6) { degrade(); slow = 0; }

  // captions + title
  caps.forEach((c) => {
    const a = +c.dataset.at, b = +(c.dataset.until || 1e9);
    c.classList.toggle('on', t >= a && t < b);
  });
  root.classList.toggle('done', t >= T_TITLE);

  // cubes
  const tw = twist && tq.setFromAxisAngle(AX[twist.a], twist.dir * Math.PI / 2 * easeIO(clamp01((t - twist.t0) / twist.dur)));
  for (let k = 0; k < COUNT; k++) {
    const p = clamp01((t - delay[k]) / flight[k]);
    v.copy(grid[k]).multiplyScalar(S);
    q.copy(quat[k]);
    if (tw && Math.round(grid[k][KEYS[twist.a]]) === twist.layer) { v.applyQuaternion(tw); q.premultiply(tw); }
    if (p < 1) {
      const e = ease3(p);
      const arc = Math.sin(p * Math.PI) * 6;
      v.lerpVectors(start[k], v, e); v.y += arc;
      q.slerpQuaternions(startQ[k], q, e);
    }
    if (p <= 0) m4.makeScale(0, 0, 0); else m4.compose(v, q, one);
    mesh.setMatrixAt(k, m4);
  }
  mesh.instanceMatrix.needsUpdate = true;

  if (twist && t - twist.t0 >= twist.dur) commitTwist();
  if (!twist && t >= nextTwist) { startTwist(t); nextTwist = t + 1.25 + Math.random() * 0.6; }

  // data stream: on during assembly, then a gentle trickle forever
  const intensity = Math.min(1, t * 2) * (t < 3.5 ? 1 : 0.35);
  for (let k = 0; k < P; k++) {
    const f = (pPhase[k] + t * pSpeed[k]) % 1;
    const e = f * f;
    pPos[k * 3] = pFrom[k].x + (pTo[k].x - pFrom[k].x) * e;
    pPos[k * 3 + 1] = pFrom[k].y + (pTo[k].y - pFrom[k].y) * e + Math.sin(f * Math.PI) * 5;
    pPos[k * 3 + 2] = pFrom[k].z + (pTo[k].z - pFrom[k].z) * e;
    const a = Math.sin(f * Math.PI) * intensity;
    pCol[k * 3] = pBase[k].r * a; pCol[k * 3 + 1] = pBase[k].g * a; pCol[k * 3 + 2] = pBase[k].b * a;
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;

  // camera: slow dolly-in and orbit, then ease off to the right so the title has room
  mouse.sx += (mouse.x - mouse.sx) * 0.04; mouse.sy += (mouse.y - mouse.sy) * 0.04;
  const intro = easeIO(clamp01(t / 5));
  const dist = (50 - 20 * intro) * Math.max(1, 1.25 / camera.aspect);
  const ang = -0.9 + t * 0.06 + mouse.sx * 0.35;
  const h = 14 - 8.5 * intro - mouse.sy * 3;
  camera.position.set(Math.sin(ang) * dist, h, Math.cos(ang) * dist);
  const shift = easeIO(clamp01((t - T_TITLE + 0.6) / 1.6)) * (camera.aspect > 1.1 ? -6.8 : 0);
  right.set(Math.cos(ang), 0, -Math.sin(ang));
  target.set(0, camera.aspect > 1.1 ? 0 : -2.5 * easeIO(clamp01(t - T_TITLE)), 0).addScaledVector(right, shift);
  camera.lookAt(target);
  mesh.rotation.y = t * 0.04;

  composer.render();
}
frame();
root.classList.add('ready');
