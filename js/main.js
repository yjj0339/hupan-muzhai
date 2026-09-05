// ============================================================
//  湖畔木宅 · Lakeside Timber House
//  Three.js 复刻：混凝土挑板 + 木格栅 + 玻璃幕墙 + 屋顶花园
//  临水而建，黄昏光线，池塘倒影
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import {
  mulberry32, makeTravertine, makeWood, makePlaster, makeGround,
  makeFoliage, makeReeds, makeBark, makeWaterNormals, makeSoftDot, makeArt
} from './textures.js';

// ---------- URL 参数 ----------
const QS = new URLSearchParams(location.search);
const SEED = parseInt(QS.get('seed') || '20260905', 10);
const STILL = QS.get('still') === '1';
const POSE0 = QS.get('pose');

// ---------- 关键尺寸 ----------
const WATER_Y = 0.45;          // 水面
const GROUND_Y = 1.0;          // 远处草地
const SLAB_T = 0.42;           // 挑板厚度
const SLAB_YS = [1.33, 4.35, 7.35, 10.35, 13.35, 16.35]; // 六层板底
const BLD_HW = 12.6;           // 半宽
const BLD_HD = 8.2;            // 板半深
const GLASS_Z = 5.8;           // 前后玻璃线
const GLASS_X = 10.6;          // 侧玻璃线
const SCREEN_Z = 7.45;         // 前格栅面
const SCREEN_X = 11.9;         // 侧格栅面
const STORIES = [];            // 每层 {y0,y1} 含地面层
for (let i = 0; i < 5; i++) STORIES.push({ y0: SLAB_YS[i] + SLAB_T, y1: SLAB_YS[i + 1] });

// ---------- 渲染器 / 场景 ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
} catch (e) {
  const n = document.getElementById('nogl');
  n.style.display = 'block';
  n.textContent = '这台设备的浏览器不支持 WebGL，无法显示三维场景。请换用较新的浏览器打开。';
  document.querySelector('.v-bar').style.display = 'none';
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.97;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xeee0c2, 62, 320);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 1600);

// ---------- 机位 ----------
const VIEWS = [
  { p: [-14.5, 4.2, 40.0], t: [-1.0, 7.2, 0.0] },   // 参考机位
  { p: [13.0, 2.2, 30.0], t: [-2.0, 7.5, 0.0] },    // 水岸低角
  { p: [26.0, 5.5, 22.0], t: [0.0, 6.5, -1.0] },    // 庭前侧赏
  { p: [-30.0, 8.0, 52.0], t: [0.0, 5.8, 0.0] },    // 草坪远眺
];

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 12;
controls.maxDistance = 110;
controls.maxPolarAngle = 1.53;
controls.minPolarAngle = 0.55;
controls.minAzimuthAngle = -1.45;
controls.maxAzimuthAngle = 1.45;
controls.enablePan = false;
controls.autoRotate = !STILL;
controls.autoRotateSpeed = -0.28;
controls.target.set(...VIEWS[0].t);
camera.position.set(...VIEWS[0].p);
if (POSE0 !== null && VIEWS[+POSE0]) {
  const v = VIEWS[+POSE0];
  camera.position.set(...v.p);
  controls.target.set(...v.t);
}
controls.update();

// ---------- 天空 / 太阳 ----------
const sky = new Sky();
sky.scale.setScalar(6000);
scene.add(sky);
const sunPhi = THREE.MathUtils.degToRad(90 - 24);
const sunTheta = THREE.MathUtils.degToRad(-47);
const sunPos = new THREE.Vector3().setFromSphericalCoords(1, sunPhi, sunTheta);
Object.assign(sky.material.uniforms, {});
sky.material.uniforms.turbidity.value = 10;
sky.material.uniforms.rayleigh.value = 2.2;
sky.material.uniforms.mieCoefficient.value = 0.013;
sky.material.uniforms.mieDirectionalG.value = 0.85;
sky.material.uniforms.sunPosition.value.copy(sunPos);

// 环境贴图（PMREM）
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const skyOnly = new THREE.Scene();
  const skyClone = new Sky();
  skyClone.scale.setScalar(6000);
  skyClone.material.uniforms.turbidity.value = 10;
  skyClone.material.uniforms.rayleigh.value = 2.2;
  skyClone.material.uniforms.mieCoefficient.value = 0.013;
  skyClone.material.uniforms.mieDirectionalG.value = 0.85;
  skyClone.material.uniforms.sunPosition.value.copy(sunPos);
  skyOnly.add(skyClone);
  const envRT = pmrem.fromScene(skyOnly);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();
}

// ---------- 光照 ----------
const sun = new THREE.DirectionalLight(0xffd49e, 2.05);
sun.position.copy(sunPos).multiplyScalar(120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 320;
sun.shadow.camera.left = -34;
sun.shadow.camera.right = 34;
sun.shadow.camera.top = 36;
sun.shadow.camera.bottom = -24;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.target.position.set(0, 4, 2);
scene.add(sun, sun.target);

scene.add(new THREE.HemisphereLight(0xd8e6ef, 0xb7a67e, 0.5));
const fill = new THREE.DirectionalLight(0xf2e2c4, 0.28);
fill.position.set(40, 18, 30);
scene.add(fill);

// ---------- 贴图 / 材质 ----------
const rng = mulberry32(SEED);
const texTrav = makeTravertine(rng);
texTrav.repeat.set(5, 1);
const texWood = makeWood(rng, '#b0824e', '#7c5026');
texWood.repeat.set(1, 2);
const texDeck = makeWood(rng, '#c09a68', '#96683a');
texDeck.repeat.set(3, 3);
const texPlaster = makePlaster(rng);
const texGround = makeGround(rng);
texGround.repeat.set(26, 26);
const texBark = makeBark(rng);
texBark.repeat.set(2, 3);
const texWaterN = makeWaterNormals();
const texDot = makeSoftDot();
const leafPalettes = [
  { dark: '#5c6034', mid: '#7d8342', mid2: '#94884a', lit: '#c2b264' },
  { dark: '#4e5c33', mid: '#6d7c40', mid2: '#8c8c4e', lit: '#b5ad68' },
  { dark: '#63683a', mid: '#8a8a4a', mid2: '#a89a58', lit: '#d0bc78' },
];
const texLeaves = leafPalettes.map(p => makeFoliage(rng, p));
const texReeds = makeReeds(rng);
const texArt = [makeArt(rng), makeArt(rng), makeArt(rng)];

const M = {
  trav: new THREE.MeshStandardMaterial({ map: texTrav, roughness: 0.94 }),
  travDark: new THREE.MeshStandardMaterial({ map: texTrav, color: 0xa89a80, roughness: 0.96 }),
  wood: new THREE.MeshStandardMaterial({ map: texWood, roughness: 0.68 }),
  deck: new THREE.MeshStandardMaterial({ map: texDeck, roughness: 0.8 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xd7e8e0, metalness: 0, roughness: 0.06, transparent: true, opacity: 0.22,
    envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false,
  }),
  mullion: new THREE.MeshStandardMaterial({ color: 0x4c3b26, roughness: 0.5, metalness: 0.35 }),
  plaster: new THREE.MeshStandardMaterial({ map: texPlaster, roughness: 0.95 }),
  curtain: new THREE.MeshStandardMaterial({ color: 0xf0e6d0, roughness: 1, side: THREE.DoubleSide }),
  floorWood: new THREE.MeshStandardMaterial({ map: texDeck, color: 0xd9b98c, roughness: 0.85 }),
  fabricA: new THREE.MeshStandardMaterial({ color: 0xcdbb99, roughness: 0.95 }),
  fabricB: new THREE.MeshStandardMaterial({ color: 0xb3765a, roughness: 0.95 }),
  fabricC: new THREE.MeshStandardMaterial({ color: 0x8b8560, roughness: 0.95 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0x2a2018, emissive: 0xffd9a2, emissiveIntensity: 1.3 }),
  bark: new THREE.MeshStandardMaterial({ map: texBark, roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x8a8172, roughness: 1, flatShading: true }),
  soil: new THREE.MeshStandardMaterial({ color: 0x4c3f2c, roughness: 1 }),
  ground: new THREE.MeshStandardMaterial({ map: texGround, color: 0xd8d2b0, roughness: 1, vertexColors: true, side: THREE.DoubleSide }),
  cypress: new THREE.MeshLambertMaterial({ color: 0x3f4c2e }),
};
const leafMats = texLeaves.map(t => new THREE.MeshLambertMaterial({
  map: t, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.9,
}));
const reedMat = new THREE.MeshLambertMaterial({ map: texReeds, alphaTest: 0.45, side: THREE.DoubleSide });

// ---------- 风（顶点摆动） ----------
const uTime = { value: 0 };
function addWind(mat, amp, freq) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float wPh = instanceMatrix[3][0] * 0.7 + instanceMatrix[3][2] * 0.9;
      #else
        float wPh = position.x * 0.35 + position.z * 0.21;
      #endif
      transformed.x += sin(uTime * ${freq.toFixed(3)} + wPh) * ${amp.toFixed(3)} * uv.y;
      transformed.z += cos(uTime * ${(freq * 0.83).toFixed(3)} + wPh * 1.3) * ${(amp * 0.6).toFixed(3)} * uv.y;`
    );
  };
}
addWind(leafMats[0], 0.1, 1.15); addWind(leafMats[1], 0.12, 0.95); addWind(leafMats[2], 0.09, 1.35);
addWind(reedMat, 0.16, 1.6);

// ---------- 小工具 ----------
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function box(w, h, d, mat, x, y, z, shadows = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (shadows) { m.castShadow = true; m.receiveShadow = true; }
  return m;
}
function instancedFrom(geo, mat, items, { shadow = true, colors = null } = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  items.forEach((it, i) => {
    p.set(...it.p); s.set(...(it.s || [1, 1, 1]));
    q.setFromEuler(new THREE.Euler(...(it.r || [0, 0, 0])));
    mesh.setMatrixAt(i, new THREE.Matrix4().compose(p, q, s));
    if (colors) mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  });
  if (shadow) { mesh.castShadow = true; }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

// ============================================================
//  建筑
// ============================================================
const house = new THREE.Group();
scene.add(house);

// ---- 六层挑板 ----
for (const yb of SLAB_YS) {
  const slab = box(BLD_HW * 2, SLAB_T, BLD_HD * 2, M.trav, 0, yb + SLAB_T / 2, 0);
  house.add(slab);
  // 板底浅色顶棚内衬（分层线脚）
  const soffit = box(BLD_HW * 2 - 0.5, 0.06, BLD_HD * 2 - 0.5, M.plaster, 0, yb + 0.035, 0, false);
  house.add(soffit);
}
// 底座石墙（伸入水中）
house.add(box(BLD_HW * 2 + 0.5, 1.9, BLD_HD * 2 + 0.6, M.travDark, 0, 0.38, 0));

// ---- 前踏步（四级，降至水面） ----
{
  for (let st = 0; st < 4; st++) {
    const yTop = 1.75 - 0.36 * (st + 1);
    const z0 = BLD_HD + 0.7 * st;
    const step = box(10, 0.36, 0.72, M.travDark, 0, yTop + 0.18, z0 + 0.36);
    house.add(step);
  }
  const cheekL = box(0.3, 1.5, 3.0, M.travDark, -5.15, 1.05, BLD_HD + 1.5);
  const cheekR = box(0.3, 1.5, 3.0, M.travDark, 5.15, 1.05, BLD_HD + 1.5);
  house.add(cheekL, cheekR);
}

// ---- 格栅鳍片（InstancedMesh 收集） ----
const finGeo = new THREE.BoxGeometry(0.10, 1, 0.10);
const fins = [];
const backings = []; // 格栅后面衬一层暗色，让缝隙读作阴影
function louverScreen(axis, fixed, a0, a1, y0, y1) {
  const h = y1 - y0 - 0.1;
  const cy = (y0 + y1) / 2;
  const len = a1 - a0;
  const mid = (a0 + a1) / 2;
  if (axis === 'z') backings.push({ p: [mid, cy, fixed - 0.16], s: [len + 0.3, h, 1] });
  else backings.push({ p: [fixed - (fixed > 0 ? 0.16 : -0.16), cy, mid], s: [1, h, len + 0.3] });
  for (let a = a0; a <= a1 + 0.001; a += 0.245) {
    const jitter = (rng() - 0.5) * 0.02;
    const ry = (rng() - 0.5) * 0.06;
    if (axis === 'z') fins.push({ p: [a + jitter, cy, fixed], s: [1, h, 1], r: [0, ry, 0] });
    else fins.push({ p: [fixed, cy, a + jitter], s: [1, h, 1], r: [0, ry, 0] });
  }
  // 端柱
  const postS = [1.1, h + 0.1, 1.1];
  if (axis === 'z') {
    fins.push({ p: [a0 - 0.1, cy, fixed], s: postS });
    fins.push({ p: [a1 + 0.1, cy, fixed], s: postS });
  } else {
    fins.push({ p: [fixed, cy, a0 - 0.1], s: postS });
    fins.push({ p: [fixed, cy, a1 + 0.1], s: postS });
  }
}

// ---- 玻璃 + 窗棂收集 ----
const mulGeo = new THREE.BoxGeometry(0.06, 1, 0.08);
const mullions = [];
function glassWall(w, h, cx, cy, cz, ry = 0) {
  const g = box(w, h, 0.06, M.glass, cx, cy, cz, false);
  g.receiveShadow = false;
  house.add(g);
  const n = Math.floor(w / 1.85);
  for (let i = 0; i <= n; i++) {
    const off = -w / 2 + (w / n) * i;
    mullions.push({
      p: [cx + Math.cos(ry) * off, cy, cz + Math.sin(ry) * off],
      s: [1, h - 0.06, 1], r: [0, ry, 0],
    });
  }
}

// ---- 每层立面 ----
for (let si = 0; si < 5; si++) {
  const { y0, y1 } = STORIES[si];
  const h = y1 - y0;
  const cy = (y0 + y1) / 2;
  const ground = si === 0;
  const glassLine = ground ? 5.2 : GLASS_Z;

  // 前后玻璃
  if (ground) {
    glassWall(8.4, h, -6.3, cy, glassLine);          // 左段
    glassWall(8.4, h, 6.3, cy, glassLine);           // 右段（中间为入口开口）
  } else {
    glassWall(21.0, h, 0, cy, GLASS_Z);
  }
  glassWall(21.0, h, 0, cy, -GLASS_Z);

  // 侧玻璃
  const sideW = ground ? 9.8 : 11.4;
  {
    const g1 = box(0.06, h, sideW, M.glass, GLASS_X * (ground ? 0.92 : 1), cy, 0, false);
    const g2 = box(0.06, h, sideW, M.glass, -GLASS_X * (ground ? 0.92 : 1), cy, 0, false);
    house.add(g1, g2);
    for (let i = 0; i <= 7; i++) {
      const off = -sideW / 2 + (sideW / 7) * i;
      mullions.push({ p: [GLASS_X, cy, off], s: [1, h - 0.06, 1] });
      mullions.push({ p: [-GLASS_X, cy, off], s: [1, h - 0.06, 1] });
    }
  }

  // 木格栅屏（四层同款；地面层同样布置）
  louverScreen('z', SCREEN_Z, -12.2, -6.9, y0, y1);
  louverScreen('z', SCREEN_Z, 6.9, 12.2, y0, y1);
  louverScreen('x', SCREEN_X, -6.8, 6.8, y0, y1);
  louverScreen('x', -SCREEN_X, -6.8, 6.8, y0, y1);

  // 玻璃转角柱
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    mullions.push({ p: [sx * (GLASS_X + 0.02), cy, sz * GLASS_Z], s: [1.4, h, 1.4] });
  }

  // ---------- 室内 ----------
  const irng = mulberry32(SEED + si * 97);
  const g = new THREE.Group();
  g.position.y = y0;
  house.add(g);
  const fh = h;
  // 地板 / 墙
  g.add(box(21.0, 0.06, 11.6, M.floorWood, 0, 0.05, 0));
  g.add(box(21.4, fh, 0.16, M.plaster, 0, fh / 2, -6.0));
  g.add(box(0.16, fh, 11.6, M.plaster, 10.45, fh / 2, 0));
  g.add(box(0.16, fh, 11.6, M.plaster, -10.45, fh / 2, 0));
  // 天花灯带
  const strip = box(14, 0.03, 0.32, M.lamp, 0, fh - 0.05, 1.2, false);
  g.add(strip);
  // 挂画
  for (let a = 0; a < 2; a++) {
    const ax = -5 + irng() * 10;
    const art = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.45, 0.05),
      new THREE.MeshStandardMaterial({ map: texArt[(irng() * 3) | 0], roughness: 0.9 }));
    art.position.set(ax, 1.55, -5.88);
    g.add(art);
    g.add(box(1.3, 1.6, 0.03, M.mullion, ax, 1.55, -5.92));
  }
  // 家具（每层随机变化）
  const fx = -6 + irng() * 6, fz = -1.5 + irng() * 2.5;
  const fab = [M.fabricA, M.fabricB, M.fabricC][(irng() * 3) | 0];
  const sofa = new THREE.Group();
  sofa.position.set(fx, 0.08, fz);
  sofa.add(box(2.5, 0.42, 0.95, fab, 0, 0.21, 0));
  sofa.add(box(2.5, 0.55, 0.24, fab, 0, 0.66, -0.36));
  sofa.add(box(0.24, 0.6, 0.95, fab, -1.13, 0.34, 0));
  sofa.add(box(0.24, 0.6, 0.95, fab, 1.13, 0.34, 0));
  g.add(sofa);
  g.add(box(1.25, 0.06, 0.65, M.wood, fx + 0.1, 0.4, fz + 1.15));
  for (const lx of [-0.55, 0.55]) g.add(box(0.06, 0.4, 0.06, M.mullion, fx + 0.1 + lx, 0.2, fz + 1.15));
  // 地毯
  const rug = box(3.4, 0.02, 2.3, new THREE.MeshStandardMaterial({ color: 0xd9c9a8, roughness: 1 }), fx + 0.1, 0.09, fz + 0.7, false);
  g.add(rug);
  // 落地灯
  g.add(box(0.05, 1.5, 0.05, M.mullion, fx - 1.7, 0.83, fz - 0.2));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), M.lamp);
  bulb.position.set(fx - 1.7, 1.62, fz - 0.2);
  g.add(bulb);
  // 吊灯
  for (let pd = 0; pd < 3; pd++) {
    const px = -3 + pd * 3 + irng() * 0.6;
    const wire = box(0.012, 0.55, 0.012, M.mullion, px, fh - 0.28, fz + 0.4, false);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.2, 10), M.lamp);
    shade.position.set(px, fh - 0.6, fz + 0.4);
    g.add(wire, shade);
  }
  // 窗帘（前端两侧）
  for (const cxs of [-1, 1]) {
    const cg = new THREE.PlaneGeometry(1.7, fh - 0.15, 12, 1);
    const pos = cg.attributes.position;
    for (let vi = 0; vi < pos.count; vi++) {
      pos.setZ(vi, Math.sin(pos.getX(vi) * 4.2) * 0.1);
    }
    cg.computeVertexNormals();
    const cm = new THREE.Mesh(cg, M.curtain);
    cm.position.set(cxs * 9.4, (fh - 0.15) / 2 + 0.05, 5.5);
    g.add(cm);
  }
  // 楼内暖光
  const pl = new THREE.PointLight(0xffd9a4, si === 0 ? 10 : 7, 11, 2);
  pl.position.set(0, 1.4, 0);
  g.add(pl);
}

// ---- 门厅大堂地面层陈设 ----
{
  const g = new THREE.Group();
  g.position.y = STORIES[0].y0;
  house.add(g);
  g.add(box(2.9, 1.05, 0.8, M.wood, 2.6, 0.56, -3.6));       // 接待台
  g.add(box(3.0, 0.05, 0.9, M.trav, 2.6, 1.11, -3.6));
  g.add(box(5.5, 0.02, 3.6, new THREE.MeshStandardMaterial({ color: 0xcbbb97, roughness: 1 }), -2.5, 0.09, 0.6, false)); // 地毯
  // 沙发椅
  for (const chx of [-3.6, -1.6]) {
    const ch = new THREE.Group();
    ch.position.set(chx, 0.08, 1.1);
    ch.add(box(0.9, 0.4, 0.9, M.fabricB, 0, 0.2, 0));
    ch.add(box(0.9, 0.5, 0.2, M.fabricB, 0, 0.6, -0.35));
    g.add(ch);
  }
  // 盆栽
  for (const px of [-9.2, 9.2]) {
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.5, 10), M.travDark)).children;
    const pot = g.children[g.children.length - 1];
    pot.position.set(px, 0.29, -4.6);
    pot.castShadow = true;
    const sh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), new THREE.MeshLambertMaterial({ color: 0x5c6b3d, flatShading: true }));
    sh.position.set(px, 0.95, -4.6);
    sh.castShadow = true;
    g.add(sh);
  }
}

// ---- 顶层：柱廊入口（地面层前廊木柱） ----
{
  const y0 = STORIES[0].y0, y1 = STORIES[0].y1, h = y1 - y0;
  for (let i = 0; i <= 6; i++) {
    const x = -10.8 + i * 3.6;
    fins.push({ p: [x, (y0 + y1) / 2, 7.3], s: [1.3, h, 1.3] });
  }
}

// ---- 屋顶花园 ----
{
  const top = SLAB_YS[5] + SLAB_T; // 16.77
  // 女儿墙
  house.add(box(BLD_HW * 2, 0.55, 0.26, M.trav, 0, top + 0.275, BLD_HD - 0.13));
  house.add(box(BLD_HW * 2, 0.55, 0.26, M.trav, 0, top + 0.275, -BLD_HD + 0.13));
  house.add(box(0.26, 0.55, BLD_HD * 2, M.trav, BLD_HW - 0.13, top + 0.275, 0));
  house.add(box(0.26, 0.55, BLD_HD * 2, M.trav, -BLD_HW + 0.13, top + 0.275, 0));
  // 种植土
  house.add(box(BLD_HW * 2 - 0.9, 0.16, BLD_HD * 2 - 0.9, M.soil, 0, top + 0.08, 0, false));
  // 灌木（避开前沿，防止低角度悬挑投影到玻璃上）
  const shrubGeo = new THREE.IcosahedronGeometry(1, 1);
  const shrubItems = [];
  const shrubCols = ['#6d7c46', '#83904e', '#9aa05c', '#a8ab68'];
  for (let i = 0; i < 100; i++) {
    const edge = rng();
    let x, z;
    if (edge < 0.62) { // 后 / 左右三边密
      const side = (rng() * 3) | 0;
      if (side === 0) { x = -11 + rng() * 22; z = -7.0 + rng() * 2.6; }
      else { x = (rng() - 0.5) * 2.4 + (rng() > 0.5 ? 10.6 : -10.6); z = -7 + rng() * 13.4; }
    } else { x = -9.5 + rng() * 19; z = -6.5 + rng() * 11.5; }
    x = THREE.MathUtils.clamp(x, -11.3, 11.3);
    z = THREE.MathUtils.clamp(z, -7.1, 6.4);
    const sy = 0.45 + rng() * 0.5;
    shrubItems.push({
      p: [x, top + 0.24 + sy * 0.35, z],
      s: [0.45 + rng() * 0.6, sy, 0.45 + rng() * 0.6],
      r: [rng() * 3, rng() * 3, rng() * 3],
    });
  }
  const shrubs = instancedFrom(shrubGeo, new THREE.MeshLambertMaterial({ flatShading: true }), shrubItems, { colors: shrubCols });
  house.add(shrubs);
  // 屋顶草丛（前沿一排草穗压住女儿墙，像参考图的草甸屋面）
  const roofReedItems = [];
  for (let i = 0; i < 240; i++) {
    let x, z;
    if (rng() < 0.45) { // 前沿密排
      x = -12 + rng() * 24; z = 6.2 + rng() * 1.4;
    } else { x = -11 + rng() * 22; z = -6.8 + rng() * 13.2; }
    roofReedItems.push({
      p: [x, top + 0.3, z],
      s: [0.6 + rng() * 0.6, 0.7 + rng() * 0.9, 1],
      r: [0, rng() * Math.PI, 0],
    });
  }
  const roofReeds = instancedFrom(new THREE.PlaneGeometry(1, 1.4).translate(0, 0.7, 0), reedMat, roofReedItems);
  house.add(roofReeds);
}

// ---- 合并格栅 / 窗棂实例 ----
{
  const finMesh = instancedFrom(finGeo, M.wood, fins);
  house.add(finMesh);
  const mulMesh = instancedFrom(mulGeo, M.mullion, mullions);
  house.add(mulMesh);
  const backMat = new THREE.MeshStandardMaterial({ color: 0x372a1b, roughness: 0.92 });
  for (const b of backings) {
    const w = b.s[0], hh = b.s[1], d = b.s[2];
    const m = d === 1 ? box(w, hh, 0.05, backMat, b.p[0], b.p[1], b.p[2], false)
                      : box(0.05, hh, d, backMat, b.p[0], b.p[1], b.p[2], false);
    house.add(m);
  }
}

// ============================================================
//  地形与水塘
// ============================================================
function pondT(x, z) {
  const dx = x / 16.5, dz = (z - 14.2) / 8.4;
  return Math.pow(Math.abs(dx), 2.2) + Math.pow(Math.abs(dz), 2.2);
}
function smooth01(a, b, x) { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function groundHeight(x, z) {
  let h = GROUND_Y
    + Math.sin(x * 0.055) * Math.cos(z * 0.047) * 0.3
    + Math.sin(x * 0.021 + 3.1) * Math.cos(z * 0.017) * 0.45;
  // 建筑周边压平
  const fb = smooth01(-17, -14.5, x) * (1 - smooth01(14.5, 17, x)) * smooth01(-12.5, -10.5, z) * (1 - smooth01(9.0, 10.5, z));
  h = THREE.MathUtils.lerp(h, GROUND_Y, fb);
  // 水塘凹陷（岸坡收窄更利落）
  const t = pondT(x, z);
  const dip = 1 - smooth01(0.62, 1.04, t);
  h = THREE.MathUtils.lerp(h, -0.9, dip);
  return h;
}
{
  const geo = new THREE.PlaneGeometry(340, 340, 170, 170);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)));
  }
  // 按高度上色：池底湿土 → 岸边沙土 → 草地
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i);
    const mix = (a, b, t) => a + (b - a) * THREE.MathUtils.clamp(t, 0, 1);
    let r, g, b;
    if (h < 0.6) {
      const t = smooth01(-0.9, 0.6, h);
      r = mix(0.22, 0.40, t); g = mix(0.20, 0.35, t); b = mix(0.16, 0.27, t);   // 湿土
    } else if (h < 1.0) {
      const t = smooth01(0.6, 1.0, h);
      r = mix(0.40, 0.78, t); g = mix(0.35, 0.71, t); b = mix(0.27, 0.56, t);   // 岸沙→草
    } else {
      r = 0.80; g = 0.73; b = 0.58;
    }
    cols[i * 3] = r; cols[i * 3 + 1] = g; cols[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const groundMesh = new THREE.Mesh(geo, M.ground);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
}

// ---------- 水面 ----------
const water = new Water(new THREE.PlaneGeometry(33, 16.2), {
  textureWidth: 512,
  textureHeight: 512,
  waterNormals: texWaterN,
  sunDirection: sunPos.clone(),
  sunColor: 0xffe8c0,
  waterColor: 0x283a30,
  distortionScale: 0.15,
  fog: true,
});
water.rotation.x = -Math.PI / 2;
water.position.set(0, WATER_Y, 14.2);
water.material.uniforms.size.value = 9;
scene.add(water);

// ---------- 岩石 ----------
{
  const rockGeos = [];
  const rockDefs = [
    [13.1, 14.0, 1.5], [14.0, 12.2, 0.9], [-12.2, 17.6, 1.3], [13.0, 20.4, 1.1],
    [-13.4, 10.9, 2.1], [11.4, 17.8, 0.7], [-8.0, 21.4, 0.9], [14.8, 15.6, 1.2], [-14.6, 14.6, 0.8],
  ];
  for (const [rx, rz, rs] of rockDefs) {
    const g = new THREE.IcosahedronGeometry(rs, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
      const h = Math.sin(vx * 12.9898 + vy * 78.233 + vz * 37.719) * 43758.5453;
      const k = 0.75 + (h - Math.floor(h)) * 0.5;
      p.setXYZ(i, vx * k, vy * k * 0.75, vz * k);
    }
    g.computeVertexNormals();
    const gy = groundHeight(rx, rz);
    g.translate(rx, Math.max(gy, WATER_Y - 0.25) + rs * 0.12, rz);
    rockGeos.push(g);
  }
  const rocks = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(rockGeos), M.rock);
  rocks.castShadow = true; rocks.receiveShadow = true;
  scene.add(rocks);
}

// ============================================================
//  植物
// ============================================================
const randVec = (r) => V3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);

// ---- 大树（左侧，枝干探向水面） ----
function buildTree(r2, opt) {
  const barkGeos = [];
  const cardGeos = [[], [], []]; // 三个叶材质 variant
  function branch(origin, dir, len, r0, r1, depth) {
    const end = origin.clone().addScaledVector(dir, len);
    const geo = new THREE.CylinderGeometry(r1, r0, len, 6, 1);
    geo.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir);
    geo.applyMatrix4(new THREE.Matrix4().compose(origin, q, V3(1, 1, 1)));
    barkGeos.push(geo);
    if (depth >= 2 || len < 1.0) {
      const n = 4 + (r2() * 3 | 0);
      for (let i = 0; i < n; i++) {
        const s = opt.leaf * (1.0 + r2() * 1.2);
        const cp = end.clone().addScaledVector(randVec(r2).normalize(), len * 0.45 * r2());
        const pg = new THREE.PlaneGeometry(s, s * (0.8 + r2() * 0.3));
        pg.rotateY(r2() * Math.PI * 2);
        pg.rotateX((r2() - 0.5) * 0.6);
        pg.translate(cp.x, cp.y, cp.z);
        cardGeos[(r2() * 3) | 0].push(pg);
      }
      return;
    }
    // 枝干中段也点缀少量叶片，避免光杆
    if (depth >= 1) {
      for (let i = 0; i < 2; i++) {
        const s = opt.leaf * (0.8 + r2() * 0.9);
        const cp = origin.clone().lerp(end, 0.35 + r2() * 0.4).addScaledVector(randVec(r2).normalize(), 0.5);
        const pg = new THREE.PlaneGeometry(s, s * (0.8 + r2() * 0.3));
        pg.rotateY(r2() * Math.PI * 2);
        pg.rotateX((r2() - 0.5) * 0.6);
        pg.translate(cp.x, cp.y, cp.z);
        cardGeos[(r2() * 3) | 0].push(pg);
      }
    }
    const kids = depth === 0 ? 3 : 2;
    for (let i = 0; i < kids; i++) {
      const nd = dir.clone();
      if (i === 0) nd.applyAxisAngle(randVec(r2).normalize(), 0.22 + r2() * 0.25);
      else nd.applyAxisAngle(randVec(r2).normalize(), 0.65 + r2() * 0.7);
      nd.y = Math.abs(nd.y) * 0.4 + 0.16;
      nd.normalize();
      branch(end.clone().addScaledVector(dir, -len * 0.05), nd, len * (0.62 + r2() * 0.14), r1, r1 * 0.62, depth + 1);
    }
  }
  branch(V3(0, 0, 0), V3(opt.lean, 1, opt.lean2).normalize(), opt.len0, opt.r0, opt.r0 * 0.72, 0);
  const grp = new THREE.Group();
  const barkMesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(barkGeos), M.bark);
  barkMesh.castShadow = true;
  grp.add(barkMesh);
  cardGeos.forEach((arr, vi) => {
    if (!arr.length) return;
    const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(arr), leafMats[vi]);
    m.castShadow = true;
    grp.add(m);
  });
  grp.position.set(...opt.pos);
  grp.rotation.y = opt.rot || 0;
  scene.add(grp);
  return grp;
}

buildTree(rng, { pos: [-18.5, groundHeight(-18.5, 15.5), 15.5], len0: 4.4, r0: 0.4, lean: 0.3, lean2: -0.06, leaf: 1.7, rot: 0.4 });
buildTree(rng, { pos: [-26, groundHeight(-26, 4), 4], len0: 3.6, r0: 0.34, lean: -0.12, lean2: 0.3, leaf: 1.5, rot: 2.4 });

// ---- 柏树 ----
{
  const cyGeos = [];
  function cypress(x, z, hgt) {
    const yBase = groundHeight(x, z);
    const segs = 5;
    for (let i = 0; i < segs; i++) {
      const f0 = i / segs, f1 = (i + 1) / segs;
      const r0 = 0.72 * (1 - f0) + 0.07, r1 = 0.72 * (1 - f1) + 0.07;
      const sh = hgt / segs * 1.18;
      const g = new THREE.ConeGeometry(i === segs - 1 ? r1 : (r0 + r1) / 2, sh, 7);
      g.scale(1, 1, 1);
      g.translate(x, yBase + f0 * hgt + sh / 2, z);
      cyGeos.push(g);
    }
    const trunk = new THREE.CylinderGeometry(0.1, 0.14, 1.4, 6);
    trunk.translate(x, yBase + 0.7, z);
    cyGeos.push(trunk);
  }
  cypress(-14.8, 3.6, 11.5);
  cypress(15.6, -2.2, 9.5);
  cypress(-19.5, -5.5, 8);
  const cm = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(cyGeos), M.cypress);
  cm.castShadow = true;
  scene.add(cm);
}

// ---- 远景树带（广告牌卡片） ----
{
  const farMat = new THREE.MeshLambertMaterial({ map: texLeaves[1], alphaTest: 0.4, side: THREE.DoubleSide });
  const items = [];
  const defs = [
    [-34, -22, 15, 10], [-18, -30, 18, 12], [0, -34, 20, 13], [18, -30, 17, 11],
    [34, -24, 15, 10], [46, -12, 14, 9], [-46, -14, 16, 10], [50, 4, 13, 8],
    [-52, 2, 14, 9], [26, 22, 12, 8], [-36, 20, 13, 8], [42, 16, 15, 9],
    [10, -40, 22, 13], [-12, -38, 19, 12], [58, -4, 12, 8], [-58, -4, 13, 8],
  ];
  for (const [x, z, w, h] of defs) {
    items.push({ p: [x, groundHeight(x, z) + h * 0.42, z], s: [w, h, 1], r: [0, Math.atan2(camera.position.x - x, camera.position.z - z), 0] });
  }
  const far = instancedFrom(new THREE.PlaneGeometry(1, 1), farMat, items, { shadow: false });
  scene.add(far);
}

// ---- 岸边芦苇 + 草坪草丛 ----
{
  const reedGeo = new THREE.PlaneGeometry(1.05, 1.6).translate(0, 0.8, 0);
  const items = [];
  // [x, z, 高度下限, 高度上限]
  const clumps = [
    [14.6, 13.8, 0.6, 1.1], [14.0, 17.4, 0.6, 1.2], [-12.6, 17.4, 0.7, 1.3], [17.4, 19.4, 0.6, 1.1],
    [-13.6, 10.6, 0.6, 1.1], [15.2, 18.8, 0.6, 1.1], [-2.6, 23.2, 0.7, 1.1], [16.6, 21.6, 0.6, 1.0],
    [-15.2, 20.6, 1.0, 1.5], [-16.6, 17.0, 1.2, 1.9], [15.8, 8.4, 0.6, 1.0], [-10.2, 22.8, 0.9, 1.4],
    [-6.4, 22.8, 0.8, 1.3], [-18.0, 12.4, 1.1, 1.8],
  ];
  for (const [cx, cz, h0, h1] of clumps) {
    const n = 20 + (rng() * 12 | 0);
    for (let i = 0; i < n; i++) {
      const x = cx + (rng() - 0.5) * 2.0, z = cz + (rng() - 0.5) * 1.5;
      items.push({
        p: [x, groundHeight(x, z) - 0.05, z],
        s: [0.7 + rng() * 0.7, h0 + rng() * (h1 - h0), 1],
        r: [(rng() - 0.5) * 0.24, rng() * Math.PI, (rng() - 0.5) * 0.2],
      });
    }
  }
  // 草坪零散草丛
  for (let i = 0; i < 240; i++) {
    const x = -60 + rng() * 120, z = -40 + rng() * 75;
    if (pondT(x, z) < 1.12) continue;
    if (x > -15.5 && x < 15.5 && z > -10.5 && z < 9.5) continue;
    items.push({
      p: [x, groundHeight(x, z) - 0.03, z],
      s: [0.5 + rng() * 0.6, 0.4 + rng() * 0.7, 1],
      r: [0, rng() * Math.PI, 0],
    });
  }
  const reeds = instancedFrom(reedGeo, reedMat, items);
  reeds.receiveShadow = true;
  scene.add(reeds);
}

// ---- 尘埃 / 飞絮 ----
const dust = (() => {
  const n = 80;
  const pos = new Float32Array(n * 3);
  const seeds = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = -10 + rng() * 16;
    pos[i * 3 + 1] = 1.4 + rng() * 7.5;
    pos[i * 3 + 2] = 8 + rng() * 13;
    seeds[i] = rng() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    map: texDot, size: 0.22, transparent: true, opacity: 0.22,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const pts = new THREE.Points(g, m);
  pts.userData.seeds = seeds;
  scene.add(pts);
  return pts;
})();

// ============================================================
//  UI 交互
// ============================================================
let tween = null;
function goView(i, instant = false) {
  const v = VIEWS[i];
  document.querySelectorAll('.views button').forEach((b, bi) => b.classList.toggle('on', bi === i));
  if (instant) {
    camera.position.set(...v.p);
    controls.target.set(...v.t);
    controls.update();
    return;
  }
  tween = {
    p0: camera.position.clone(), p1: V3(...v.p),
    t0: controls.target.clone(), t1: V3(...v.t),
    k: 0,
  };
  controls.autoRotate = false;
}
document.querySelectorAll('.views button').forEach((b) => {
  b.addEventListener('click', () => goView(+b.dataset.v));
});
const hint = document.getElementById('hint');
let hinted = false;
controls.addEventListener('start', () => {
  controls.autoRotate = false;
  if (!hinted) { hinted = true; hint.style.opacity = '0.75'; setTimeout(() => hint.style.opacity = '0', 2600); }
});
if (POSE0 !== null) goView(+POSE0 || 0, true);

// ---------- 调试 / 截图钩子 ----------
window.__shot = (label = 'shot') => {
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  return { label, url };
};
window.__cam = {
  set(x, y, z, tx, ty, tz) {
    camera.position.set(x, y, z);
    if (tx !== undefined) controls.target.set(tx, ty, tz);
    controls.update();
  },
  get() { return { p: camera.position.toArray(), t: controls.target.toArray() }; },
};
window.__view = (i) => goView(i, true);
window.__world = { scene, house, THREE };

// ---------- 主循环 ----------
const clock = new THREE.Clock();
let elapsed = 0;
let veilHidden = false;
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  uTime.value = elapsed;
  water.material.uniforms.time.value += dt * 0.6;

  // 尘埃漂浮
  {
    const p = dust.geometry.attributes.position;
    const seeds = dust.userData.seeds;
    for (let i = 0; i < p.count; i++) {
      const s = seeds[i];
      p.setX(i, p.getX(i) + Math.sin(elapsed * 0.24 + s) * 0.0022);
      p.setY(i, p.getY(i) + Math.sin(elapsed * 0.17 + s * 2.1) * 0.0016);
      p.setZ(i, p.getZ(i) + Math.cos(elapsed * 0.2 + s) * 0.0022);
    }
    p.needsUpdate = true;
  }

  if (tween) {
    tween.k = Math.min(1, tween.k + dt / 1.7);
    const s = tween.k * tween.k * (3 - 2 * tween.k);
    camera.position.lerpVectors(tween.p0, tween.p1, s);
    controls.target.lerpVectors(tween.t0, tween.t1, s);
    if (tween.k >= 1) tween = null;
  }
  controls.update();

  renderer.render(scene, camera);

  if (!veilHidden) {
    veilHidden = true;
    setTimeout(() => document.getElementById('veil').classList.add('hide'), 350);
  }
}
tick();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 0.8 ? 55 : 42;   // 竖屏加大视野
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
