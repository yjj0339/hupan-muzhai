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
const texFloorIn = makeWood(rng, '#c8a271', '#9a6c3e');
texFloorIn.repeat.set(14, 8);
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
  floorWood: new THREE.MeshStandardMaterial({ map: texFloorIn, roughness: 0.85 }),
  fabricA: new THREE.MeshStandardMaterial({ color: 0xcdbb99, roughness: 0.95 }),
  fabricB: new THREE.MeshStandardMaterial({ color: 0xb3765a, roughness: 0.95 }),
  fabricC: new THREE.MeshStandardMaterial({ color: 0x8b8560, roughness: 0.95 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0x2a2018, emissive: 0xffd9a2, emissiveIntensity: 1.3 }),
  bark: new THREE.MeshStandardMaterial({ map: texBark, roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x8a8172, roughness: 1, flatShading: true }),
  soil: new THREE.MeshStandardMaterial({ color: 0x46402c, roughness: 1 }),
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

// 每层主题家具
const M2 = {
  bedWhite: new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.9 }),
  linen: new THREE.MeshStandardMaterial({ color: 0xd8cdb4, roughness: 0.95 }),
  throw: new THREE.MeshStandardMaterial({ color: 0xb3765a, roughness: 0.95 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xcfc8b8, roughness: 0.85 }),
  tvDark: new THREE.MeshStandardMaterial({ color: 0x201d18, roughness: 0.4 }),
  cushionG: new THREE.MeshStandardMaterial({ color: 0x8b8b5e, roughness: 0.95 }),
  lantern: new THREE.MeshStandardMaterial({ color: 0x2a2018, emissive: 0xffd9a2, emissiveIntensity: 0.9 }),
  mirror: new THREE.MeshStandardMaterial({ color: 0xc7d8dc, metalness: 0.7, roughness: 0.12 }),
  book: ['#a4703a', '#5d6b4a', '#b8a06a', '#7b6a4f', '#9a5a4a', '#4e5c66'],
};
function pottedPlant(g, x, z, s = 1) {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.24 * s, 0.46 * s, 10), M.travDark);
  pot.position.set(x, 0.23 * s, z); pot.castShadow = true;
  const sh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 * s, 1), new THREE.MeshLambertMaterial({ color: 0x5c6b3d, flatShading: true }));
  sh.position.set(x, 0.85 * s, z); sh.castShadow = true;
  g.add(pot, sh);
}
function floorLamp(g, x, z) {
  g.add(box(0.05, 1.5, 0.05, M.mullion, x, 0.83, z));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), M.lamp);
  bulb.position.set(x, 1.62, z);
  g.add(bulb);
}
function pendantRow(g, xs, z, fh) {
  for (const px of xs) {
    g.add(box(0.012, 0.55, 0.012, M.mullion, px, fh - 0.28, z, false));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.2, 10), M.lamp);
    shade.position.set(px, fh - 0.6, z);
    g.add(shade);
  }
}
function chair(g, x, z, ry, mat) {
  const c = new THREE.Group();
  c.position.set(x, 0, z); c.rotation.y = ry;
  c.add(box(0.46, 0.07, 0.46, mat, 0, 0.46, 0));
  c.add(box(0.46, 0.55, 0.07, mat, 0, 0.75, -0.2));
  for (const lx of [-0.18, 0.18]) for (const lz of [-0.18, 0.18]) c.add(box(0.05, 0.46, 0.05, M.mullion, lx, 0.23, lz));
  g.add(c);
}
function interiorTheme(si, g, irng, fh) {
  const rug = (w, d, x, z) => g.add(box(w, 0.02, d, new THREE.MeshStandardMaterial({ color: 0xd9c9a8, roughness: 1 }), x, 0.09, z, false));
  // 卫浴小间（二层起，靠后墙左侧）
  if (si >= 1) {
    g.add(box(2.3, fh - 0.08, 1.8, M.plaster, -8.6, (fh - 0.08) / 2 + 0.03, -5.0));
    g.add(box(0.07, 1.95, 0.8, M.mullion, -7.42, 1.02, -5.0));
    g.add(box(0.04, 1.75, 0.62, new THREE.MeshStandardMaterial({ color: 0x8a6b42, roughness: 0.7 }), -7.37, 1.0, -5.0));
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.lamp);
    knob.position.set(-7.31, 1.05, -4.72);
    g.add(knob);
  }
  if (si === 1) { // 客厅
    rug(5.4, 3.8, -1.6, -0.6);
    const sx = -1.6, sz = -1.9;
    g.add(box(3.3, 0.45, 1.05, M.fabricA, sx, 0.28, sz));
    g.add(box(3.3, 0.55, 0.25, M.fabricA, sx, 0.66, sz - 0.4));
    g.add(box(0.26, 0.6, 1.05, M.fabricA, sx - 1.52, 0.34, sz));
    g.add(box(0.26, 0.6, 1.05, M.fabricA, sx + 1.52, 0.34, sz));
    g.add(box(1.1, 0.45, 2.0, M.fabricA, sx - 2.2, 0.28, sz + 0.5));       // 贵妃位
    g.add(box(1.5, 0.36, 0.85, M.trav, sx + 0.3, 0.24, sz + 1.9));          // 石面茶几
    g.add(box(3.6, 1.85, 0.09, M.tvDark, sx, 1.1, -5.78, false));           // 电视墙
    g.add(box(2.6, 0.5, 0.45, M.wood, sx, 0.25, -5.55));                    // 电视柜
    chair(g, sx + 3.6, sz + 0.6, -2.2, M.fabricC);                          // 单人椅
    // 书架
    const bsx = 10.1;
    g.add(box(0.36, 2.3, 3.4, M.wood, bsx, 1.15, -2.2));
    for (let b = 0; b < 16; b++) {
      const bz = -3.6 + irng() * 3.0, bh = 0.24 + irng() * 0.12;
      g.add(box(0.26, bh, 0.06, new THREE.MeshStandardMaterial({ color: M2.book[(irng() * 6) | 0], roughness: 0.9 }), bsx - 0.06, 0.35 + ((b / 6) | 0) * 0.75 + bh / 2, bz, false));
    }
    floorLamp(g, sx - 3.6, sz - 0.9);
    pottedPlant(g, 5.6, -4.9, 1.2);
    // 靠枕 / 搭毯 / 茶几书
    for (const [cx, cz, cm] of [[-2.6, -1.55, M2.throw], [-1.4, -1.55, M.fabricB], [-0.4, -1.55, M.cushionG]]) {
      const p = box(0.42, 0.4, 0.15, cm, cx, 0.66, cz);
      p.rotation.x = -0.15;
      g.add(p);
    }
    const bk1 = box(0.3, 0.05, 0.22, new THREE.MeshStandardMaterial({ color: 0x9a5a4a, roughness: 0.9 }), sx + 0.2, 0.47, sz + 1.95);
    const bk2 = box(0.26, 0.045, 0.19, new THREE.MeshStandardMaterial({ color: 0x4e5c66, roughness: 0.9 }), sx + 0.24, 0.52, sz + 1.92);
    bk2.rotation.y = 0.4;
    g.add(bk1, bk2);
  } else if (si === 2) { // 餐厨
    rug(4.6, 3.0, -1.5, -1.5);
    const tx = -1.5, tz = -1.5;
    g.add(box(2.9, 0.1, 1.35, M.wood, tx, 0.76, tz));
    for (const lx of [-1.3, 1.3]) for (const lz of [-0.5, 0.5]) g.add(box(0.09, 0.71, 0.09, M.mullion, tx + lx, 0.36, tz + lz));
    chair(g, tx - 0.8, tz + 1.05, 0, M.fabricA);
    chair(g, tx + 0.8, tz + 1.05, 0, M.fabricA);
    chair(g, tx - 0.8, tz - 1.05, Math.PI, M.fabricA);
    chair(g, tx + 0.8, tz - 1.05, Math.PI, M.fabricA);
    chair(g, tx - 1.85, tz, Math.PI / 2, M.fabricA);
    chair(g, tx + 1.85, tz, -Math.PI / 2, M.fabricA);
    pendantRow(g, [tx - 0.7, tx, tx + 0.7], tz, fh);
    g.add(box(3.0, 0.85, 0.5, M.wood, tx, 0.43, -5.6));                     // 餐边柜
    g.add(box(2.8, 0.06, 1.15, M.trav, 5.6, 0.95, -3.6));                   // 岛台
    g.add(box(2.6, 0.92, 1.0, M.travDark, 5.6, 0.46, -3.6));
    for (const sx of [4.9, 5.6, 6.3]) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.62, 10), M.wood);
      st.position.set(sx, 0.31, -2.4); g.add(st);
    }
    pottedPlant(g, -7.5, -4.9, 1.1);
    // 餐具
    for (let pi = 0; pi < 6; pi++) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.02, 12), M2.bedWhite);
      plate.position.set(tx + [-0.8, 0.8, -0.8, 0.8, -1.7, 1.7][pi], 0.825, tz + [0.55, 0.55, -0.55, -0.55, 0, 0][pi]);
      g.add(plate);
    }
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.24, 10), M.trav);
    vase.position.set(tx, 0.93, tz);
    g.add(vase);
    for (const gx of [-0.35, 0.35]) {
      const glassC = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.14, 8), M2.mirror);
      glassC.position.set(tx + gx, 0.87, tz + 0.25);
      g.add(glassC);
    }
  } else if (si === 3) { // 卧室
    rug(4.4, 3.2, -2.2, -0.9);
    const bx = -2.2, bz = -2.7;
    g.add(box(2.4, 0.95, 0.12, M.wood, bx, 0.55, bz - 1.25));               // 床头板
    g.add(box(2.1, 0.32, 2.3, M.wood, bx, 0.22, bz));
    g.add(box(2.0, 0.18, 2.2, M2.bedWhite, bx, 0.47, bz));
    g.add(box(0.8, 0.13, 0.42, M2.linen, bx - 0.5, 0.62, bz - 0.85));
    g.add(box(0.8, 0.13, 0.42, M2.linen, bx + 0.5, 0.62, bz - 0.85));
    g.add(box(2.0, 0.06, 0.8, M2.throw, bx, 0.58, bz + 0.65));              // 搭毯
    for (const nx of [bx - 1.5, bx + 1.5]) {
      g.add(box(0.52, 0.45, 0.52, M.wood, nx, 0.23, bz - 0.9));
      const lb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M.lamp);
      lb.position.set(nx, 0.62, bz - 0.9); g.add(lb);
    }
    g.add(box(1.6, 0.12, 0.45, M.fabricC, bx, 0.5, bz + 1.5));              // 床尾凳
    for (const lx of [-0.65, 0.65]) g.add(box(0.06, 0.44, 0.35, M.mullion, bx + lx, 0.22, bz + 1.5));
    g.add(box(2.3, 2.25, 0.6, M.wood, 4.8, 1.13, -5.6));                    // 衣柜
    chair(g, 6.8, 2.6, -2.6, M.fabricB);                                     // 读椅
    floorLamp(g, 7.8, 2.2);
    pottedPlant(g, -8.5, -4.9, 1.0);
    // 穿衣镜
    g.add(box(0.06, 1.65, 0.48, M2.mirror, 6.6, 1.02, -5.55));
    g.add(box(0.09, 1.75, 0.54, M.wood, 6.6, 1.02, -5.58));
  } else if (si === 4) { // 茶室
    g.add(box(4.8, 0.22, 3.4, M.deck, -1.5, 0.11, -2.8));                   // 榻平台
    g.add(box(1.5, 0.3, 0.85, M.wood, -1.5, 0.37, -2.8));                   // 矮桌
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), M.travDark);
    pot.scale.set(1, 0.7, 1); pot.position.set(-1.8, 0.58, -2.8); g.add(pot);
    for (const cx of [-1.1, -1.5, -0.9]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.06, 8), M2.bedWhite);
      cup.position.set(cx, 0.56, -2.6); g.add(cup);
    }
    for (const [cx, cz] of [[-3.2, -2.0], [-3.2, -3.6], [0.2, -2.0], [0.2, -3.6]]) {
      const cu = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.15, 10), irng() > 0.5 ? M.fabricB : M.cushionG);
      cu.position.set(cx, 0.35, cz); g.add(cu);                              // 蒲团
    }
    // 盆景
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.28, 10), M.travDark)).children;
    const bp = g.children[g.children.length - 1]; bp.position.set(1.6, 0.49, -1.6); bp.castShadow = true;
    const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.5, 6), M.bark);
    bt.position.set(1.6, 0.85, -1.6); bt.rotation.z = 0.25; g.add(bt);
    const bs = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), new THREE.MeshLambertMaterial({ color: 0x5c6b3d, flatShading: true }));
    bs.position.set(1.75, 1.15, -1.6); g.add(bs);
    // 茶架
    for (const sy of [1.35, 1.9]) g.add(box(2.6, 0.05, 0.35, M.wood, 4.5, sy, -5.7));
    for (let c = 0; c < 6; c++) {
      const tc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 8), M2.bedWhite);
      tc.position.set(3.5 + c * 0.4, 1.44 + (c % 2) * 0.55, -5.7); g.add(tc);
    }
    // 纸灯笼
    for (const lx of [-4.5, -1.5, 1.5]) {
      const la = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), M2.lantern);
      la.position.set(lx, fh - 0.75, -2.8); g.add(la);
      g.add(box(0.012, 0.5, 0.012, M.mullion, lx, fh - 0.4, -2.8, false));
    }
    chair(g, 5.0, 1.2, -2.9, M.fabricA);
    chair(g, 6.6, 1.2, -2.9, M.fabricA);
    g.add(box(0.5, 0.45, 0.5, M.wood, 5.8, 0.23, 1.2));
    pottedPlant(g, -8.8, -4.9, 1.2);
    // 壁挂卷轴 + 铁壶
    const scroll = box(0.75, 1.7, 0.04, new THREE.MeshStandardMaterial({ map: texArt[1], roughness: 0.9 }), -4.8, 1.5, -5.88);
    g.add(scroll);
    g.add(box(0.85, 0.05, 0.1, M.mullion, -4.8, 2.4, -5.88));
    const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.15, 10), M.mullion);
    kettle.position.set(-1.2, 0.62, -2.55);
    g.add(kettle);
  }
}

// ---- 木楼梯（右侧楼板洞内，四段直跑） ----
const stairTreads = [];
for (let si = 0; si < 4; si++) {
  const y0 = STORIES[si].y0, y1 = STORIES[si + 1].y0;
  const n = 15;
  for (let i = 0; i < n; i++) {
    stairTreads.push({
      p: [9.3, y0 + 0.3 + (i + 1) * ((y1 - y0 - 0.3) / n), -1.0 - (i + 0.5) * 0.293],
      s: [1, 1, 1],
    });
  }
}
const stairMesh = instancedFrom(new THREE.BoxGeometry(1.5, 0.09, 0.293), M.deck, stairTreads);
house.add(stairMesh);

// ---- 六层挑板（1~4 层楼板留出楼梯洞） ----
const HOLE = { x0: 8.55, x1: 10.05, z0: -5.5, z1: -0.6 }; // 楼梯洞口
const revealMat = new THREE.MeshStandardMaterial({ color: 0x5e5240, roughness: 1 });
for (let li = 0; li < SLAB_YS.length; li++) {
  const yb = SLAB_YS[li];
  const yc = yb + SLAB_T / 2;
  if (li >= 1 && li <= 4) {
    house.add(box(BLD_HW * 2, SLAB_T, HOLE.z0 - (-BLD_HD), M.trav, 0, yc, (-BLD_HD + HOLE.z0) / 2));
    house.add(box(BLD_HW * 2, SLAB_T, BLD_HD - HOLE.z1, M.trav, 0, yc, (HOLE.z1 + BLD_HD) / 2));
    house.add(box(HOLE.x0 - (-BLD_HW), SLAB_T, HOLE.z1 - HOLE.z0, M.trav, (-BLD_HW + HOLE.x0) / 2, yc, (HOLE.z0 + HOLE.z1) / 2));
    house.add(box(BLD_HW - HOLE.x1, SLAB_T, HOLE.z1 - HOLE.z0, M.trav, (HOLE.x1 + BLD_HW) / 2, yc, (HOLE.z0 + HOLE.z1) / 2));
    // 楼板底阴影缝（深色收边条）
    house.add(box(BLD_HW * 2 - 0.06, 0.055, BLD_HD * 2 - 0.06, revealMat, 0, yb + 0.028, 0, false));
  } else {
    house.add(box(BLD_HW * 2, SLAB_T, BLD_HD * 2, M.trav, 0, yc, 0));
  }
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
  if (axis === 'z') {
    backings.push({ p: [mid, cy, fixed - 0.16], s: [len + 0.3, h, 1] });
    house.add(box(len + 0.2, 0.07, 0.17, M.wood, mid, cy, fixed)); // 中横档
  } else {
    backings.push({ p: [fixed - (fixed > 0 ? 0.16 : -0.16), cy, mid], s: [1, h, len + 0.3] });
    house.add(box(0.17, 0.07, len + 0.2, M.wood, fixed, cy, mid));
  }
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

  // ---------- 室内（每层一个主题） ----------
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
    const ax = -6 + irng() * 12;
    const art = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.45, 0.05),
      new THREE.MeshStandardMaterial({ map: texArt[(irng() * 3) | 0], roughness: 0.9 }));
    art.position.set(ax, 1.55, -5.88);
    g.add(art);
    g.add(box(1.3, 1.6, 0.03, M.mullion, ax, 1.55, -5.92));
  }
  // 主题家具
  interiorTheme(si, g, irng, fh);
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

// ---- 入口玻璃门（虚掩） ----
{
  const gY = STORIES[0];
  const dh = gY.y1 - gY.y0 - 0.25;
  for (const s of [-1, 1]) {
    const door = box(0.95, dh, 0.05, M.glass, s * 1.38, gY.y0 + dh / 2 + 0.06, 5.2, false);
    door.rotation.y = s * -0.18;
    house.add(door);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.05, 8), M.wood);
    handle.position.set(s * 0.98, gY.y0 + 1.35, 5.12);
    house.add(handle);
  }
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
  const shrubCols = ['#7a8a50', '#8c9a58', '#a0a862', '#b0b470'];
  for (let i = 0; i < 135; i++) {
    const edge = rng();
    let x, z;
    if (edge < 0.62) { // 后 / 左右三边密
      const side = (rng() * 3) | 0;
      if (side === 0) { x = -11 + rng() * 22; z = -7.0 + rng() * 2.6; }
      else { x = (rng() - 0.5) * 2.4 + (rng() > 0.5 ? 10.6 : -10.6); z = -7 + rng() * 13.4; }
    } else { x = -9.5 + rng() * 19; z = -6.5 + rng() * 11.5; }
    x = THREE.MathUtils.clamp(x, -11.3, 11.3);
    z = THREE.MathUtils.clamp(z, -7.1, 6.4);
    if (x > 8.1 && x < 10.5 && z > -5.9 && z < -0.2) continue; // 让开楼梯洞口
    const sy = 0.24 + rng() * 0.3;
    shrubItems.push({
      p: [x, top + 0.2 + sy * 0.4, z],
      s: [0.55 + rng() * 0.65, sy, 0.55 + rng() * 0.65],
      r: [rng() * 3, rng() * 3, rng() * 3],
    });
  }
  const shrubs = instancedFrom(shrubGeo, new THREE.MeshLambertMaterial({ flatShading: true }), shrubItems, { colors: shrubCols });
  house.add(shrubs);
  // 屋顶草丛（前沿一排草穗压住女儿墙，像参考图的草甸屋面）
  const roofReedItems = [];
  for (let i = 0; i < 420; i++) {
    let x, z;
    if (rng() < 0.4) { // 前沿密排
      x = -12 + rng() * 24; z = 6.2 + rng() * 1.4;
    } else { x = -11 + rng() * 22; z = -6.8 + rng() * 13.2; }
    if (x > 8.1 && x < 10.5 && z > -5.9 && z < -0.2) continue; // 让开楼梯洞口
    roofReedItems.push({
      p: [x, top + 0.28, z],
      s: [0.5 + rng() * 0.5, 0.35 + rng() * 0.45, 1],
      r: [0, rng() * Math.PI, 0],
    });
  }
  const roofReedMat = reedMat.clone();
  roofReedMat.color = new THREE.Color(0xa9c67d);
  const roofReeds = instancedFrom(new THREE.PlaneGeometry(1, 1.4).translate(0, 0.7, 0), roofReedMat, roofReedItems);
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
buildTree(rng, { pos: [21.5, groundHeight(21.5, 5.5), 5.5], len0: 3.2, r0: 0.3, lean: -0.25, lean2: 0.15, leaf: 1.4, rot: 1.1 });

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
//  屋外场景
// ============================================================
// ---- 木码头（从踏步延伸进水里） ----
const animated = { canoes: [], ripples: [], birds: [], ducks: [] };
{
  const deckY = 0.92;
  for (let i = 0; i < 14; i++) {
    const plank = box(2.2, 0.07, 0.36, M.deck, 0, deckY, 10.9 + i * 0.42);
    plank.rotation.y = (rng() - 0.5) * 0.014;
    scene.add(plank);
  }
  for (const pz of [11.2, 13.6, 16.0]) for (const px of [-1.0, 1.0]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.7, 8), M.bark);
    post.position.set(px, 0.15, pz); post.castShadow = true;
    scene.add(post);
  }
  // 系船柱
  const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.35, 8), M.mullion);
  bollard.position.set(-0.85, 1.13, 15.8); scene.add(bollard);
}

// ---- 小船 ----
{
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), M.bark);
  hull.scale.set(2.3, 0.5, 0.72);
  hull.position.y = 0.18;
  hull.castShadow = true;
  const inner = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x3a2c1c, roughness: 1 }));
  inner.position.y = 0.42;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.6), M.deck);
  seat.position.set(-0.4, 0.5, 0);
  boat.add(hull, inner, seat);
  boat.position.set(4.6, WATER_Y - 0.06, 14.6);
  boat.rotation.y = 0.55;
  scene.add(boat);
  animated.canoes.push(boat);
  // 船桨
  const paddle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.5, 6), M.wood);
  paddle.position.set(5.6, 0.55, 13.9);
  paddle.rotation.z = 0.9; paddle.rotation.y = 0.6;
  scene.add(paddle);
}

// ---- 睡莲与浮萍 ----
{
  const padMat = new THREE.MeshLambertMaterial({ color: 0x4a5c38 });
  const padGeo = new THREE.CircleGeometry(1, 10);
  padGeo.rotateX(-Math.PI / 2);
  const items = [];
  for (let i = 0; i < 11; i++) {
    items.push({ p: [-4 - rng() * 8.5, WATER_Y + 0.02, 11.5 + rng() * 8], s: [0.22 + rng() * 0.3, 1, 0.22 + rng() * 0.3], r: [0, rng() * Math.PI, 0] });
  }
  scene.add(instancedFrom(padGeo, padMat, items, { shadow: false }));
  // 浮萍
  const duckMat = new THREE.MeshLambertMaterial({ color: 0x6d8248 });
  const dGeo = new THREE.CircleGeometry(1, 8);
  dGeo.rotateX(-Math.PI / 2);
  const dItems = [];
  for (const [dx, dz] of [[-1.5, 17.5], [2.5, 16], [-7.5, 13.5]]) {
    for (let i = 0; i < 14; i++) {
      dItems.push({ p: [dx + (rng() - 0.5) * 1.6, WATER_Y + 0.015, dz + (rng() - 0.5) * 1.4], s: [0.05 + rng() * 0.08, 1, 0.05 + rng() * 0.08] });
    }
  }
  scene.add(instancedFrom(dGeo, duckMat, dItems, { shadow: false }));
}

// ---- 汀步石径 + 草坪灯 ----
{
  const path = [[14.6, 11.0], [13.9, 10.0], [13.2, 9.2], [12.6, 8.4], [12.1, 7.2]];
  for (const [px, pz] of path) {
    const slab = box(1.15, 0.14, 0.85, M.travDark, px, groundHeight(px, pz) + 0.07, pz);
    slab.rotation.y = (rng() - 0.5) * 0.5;
    scene.add(slab);
  }
  for (const [px, pz] of [[14.9, 11.8], [12.9, 9.6], [11.6, 6.8], [-6.2, 10.8], [6.4, 10.8]]) {
    const postH = 0.85;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, postH, 8), M.mullion);
    post.position.set(px, groundHeight(px, pz) + postH / 2, pz);
    post.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), M.lamp);
    head.position.set(px, groundHeight(px, pz) + postH + 0.05, pz);
    scene.add(post, head);
  }
}

// ---- 平台户外家具：躺椅 + 遮阳伞餐桌 ----
{
  const deckTop = STORIES[0].y0; // 1.75
  for (const lx of [-8.2, -6.6]) {
    const l = new THREE.Group();
    l.position.set(lx, deckTop, 6.9);
    l.rotation.y = -0.25;
    l.add(box(0.66, 0.22, 1.75, M.fabricA, 0, 0.24, 0));
    const back = box(0.66, 0.75, 0.09, M.fabricA, 0, 0.62, -0.92);
    back.rotation.x = -0.45;
    l.add(back);
    for (const lx2 of [-0.26, 0.26]) l.add(box(0.06, 0.24, 0.06, M.mullion, lx2, 0.11, 0.55));
    scene.add(l);
  }
  const t = new THREE.Group();
  t.position.set(7.6, deckTop, 6.9);
  t.add(box(1.7, 0.08, 0.95, M.wood, 0, 0.72, 0));
  for (const lx of [-0.7, 0.7]) for (const lz of [-0.35, 0.35]) t.add(box(0.07, 0.68, 0.07, M.mullion, lx, 0.34, lz));
  chair(t, -0.55, 0.95, 0, M.fabricB); chair(t, 0.55, 0.95, 0, M.fabricB);
  chair(t, -0.55, -0.95, Math.PI, M.fabricB); chair(t, 0.55, -0.95, Math.PI, M.fabricB);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.6, 8), M.mullion);
  pole.position.set(0, 1.3, 0);
  const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.55, 0.5, 10), M.curtain);
  umbrella.position.set(0, 2.5, 0);
  umbrella.castShadow = true;
  t.add(pole, umbrella);
  scene.add(t);
}

// ---- 远山 ----
{
  const hillMat = new THREE.MeshLambertMaterial({ color: 0x8f8a58 });
  const hill1 = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), hillMat);
  hill1.scale.set(75, 11, 32);
  hill1.position.set(-55, -0.5, -95);
  const hill2 = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), hillMat);
  hill2.scale.set(90, 13, 38);
  hill2.position.set(60, -0.6, -100);
  scene.add(hill1, hill2);
}

// ---- 右岸柏树 ----
{
  const cyGeos = [];
  function cypress2(x, z, hgt) {
    const yBase = groundHeight(x, z);
    const segs = 5;
    for (let i = 0; i < segs; i++) {
      const f0 = i / segs, f1 = (i + 1) / segs;
      const r0 = 0.72 * (1 - f0) + 0.07, r1 = 0.72 * (1 - f1) + 0.07;
      const sh = hgt / segs * 1.18;
      const gco = new THREE.ConeGeometry(i === segs - 1 ? r1 : (r0 + r1) / 2, sh, 7);
      gco.translate(x, yBase + f0 * hgt + sh / 2, z);
      cyGeos.push(gco);
    }
  }
  cypress2(17.5, 21.0, 8.5);
  cypress2(19.8, 17.5, 7);
  const cm2 = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(cyGeos), M.cypress);
  cm2.castShadow = true;
  scene.add(cm2);
}

// ---- 岸边更多芦苇 ----
{
  const reedGeo2 = new THREE.PlaneGeometry(1.05, 1.6).translate(0, 0.8, 0);
  const items = [];
  const more = [[16.8, 15.8, 0.6, 1.1], [-14.2, 8.6, 0.6, 1.0], [12.2, 21.2, 0.7, 1.2], [-17.4, 20.8, 0.9, 1.5], [18.6, 12.2, 0.6, 1.0], [-12.0, 20.2, 0.8, 1.3]];
  for (const [cx, cz, h0, h1] of more) {
    for (let i = 0; i < 14; i++) {
      const x = cx + (rng() - 0.5) * 2.0, z = cz + (rng() - 0.5) * 1.5;
      items.push({
        p: [x, groundHeight(x, z) - 0.05, z],
        s: [0.7 + rng() * 0.7, h0 + rng() * (h1 - h0), 1],
        r: [(rng() - 0.5) * 0.24, rng() * Math.PI, (rng() - 0.5) * 0.2],
      });
    }
  }
  scene.add(instancedFrom(reedGeo2, reedMat, items));
}

// ---- 飞鸟 ----
{
  const birdMat = new THREE.MeshLambertMaterial({ color: 0x3a3226, side: THREE.DoubleSide });
  for (let b = 0; b < 4; b++) {
    const bird = new THREE.Group();
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.3), birdMat);
    const wr = wl.clone();
    wl.position.x = -0.45; wr.position.x = 0.45;
    bird.add(wl, wr);
    bird.userData = {
      r: 36 + b * 7, h: 27 + b * 3.5,
      speed: 0.05 + b * 0.012, phase: b * 1.7,
      wl, wr,
    };
    scene.add(bird);
    animated.birds.push(bird);
  }
}

// ---- 水面涟漪 ----
{
  for (const [i, [rx, rz]] of [[-3, 12], [6.5, 17.5], [-8.5, 16.5]].entries()) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 1.0, 40),
      new THREE.MeshBasicMaterial({ color: 0xe8f2e6, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(rx, WATER_Y + 0.03, rz);
    ring.userData.phase = i * 1.8;
    scene.add(ring);
    animated.ripples.push(ring);
  }
}

// ---- 对岸凉亭 ----
{
  const gx = 9, gz = 23.5;
  const gy = groundHeight(gx, gz);
  const pav = new THREE.Group();
  pav.position.set(gx, gy, gz);
  pav.add(box(3.6, 0.3, 3.6, M.trav, 0, 0.15, 0));
  for (const px of [-1.4, 1.4]) for (const pz of [-1.4, 1.4]) {
    pav.add(box(0.15, 2.5, 0.15, M.wood, px, 1.55, pz));
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.25, 4), M.travDark);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.45;
  roof.castShadow = true;
  pav.add(roof);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M.mullion);
  finial.position.y = 4.14;
  pav.add(finial);
  pav.add(box(2.2, 0.06, 0.4, M.wood, 0, 0.62, -1.1));   // 亭内长凳
  pav.add(box(0.4, 0.35, 0.4, M.wood, 0, 0.48, 0));       // 石桌
  const lanternG = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), M.lamp);
  lanternG.position.set(0, 2.85, 0);
  pav.add(lanternG);
  scene.add(pav);
}

// ---- 湖上鸭群 ----
{
  const duckMat = new THREE.MeshLambertMaterial({ color: 0x4a3a28 });
  for (const [dx, dz, r, sp] of [[-4, 16, 1.8, 0.1], [-6.5, 14, 1.2, 0.13], [2.5, 17.5, 2.4, 0.08]]) {
    const duck = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), duckMat);
    body.scale.set(0.85, 0.7, 1.35);
    body.position.y = 0.1;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), duckMat);
    head.position.set(0, 0.26, 0.18);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 6), new THREE.MeshLambertMaterial({ color: '#c98a3a' }));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.24, 0.3);
    duck.add(body, head, beak);
    duck.userData = { x: dx, z: dz, r, speed: sp, phase: rng() * 6 };
    duck.position.set(dx, WATER_Y + 0.05, dz);
    scene.add(duck);
    animated.ducks.push(duck);
  }
}

// ---- 野火盆（草坪上） ----
{
  const fx = 18, fz = 26;
  const fy = groundHeight(fx, fz);
  const stones = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const g2 = new THREE.IcosahedronGeometry(0.17, 0);
    g2.translate(fx + Math.cos(a) * 1.0, fy + 0.1, fz + Math.sin(a) * 1.0);
    stones.push(g2);
  }
  const ring = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(stones), M.rock);
  ring.castShadow = true;
  scene.add(ring);
  for (let l = 0; l < 3; l++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.15, 7), M.bark);
    log.position.set(fx, fy + 0.14, fz);
    log.rotation.set(Math.PI / 2 - 0.15, (l / 3) * Math.PI * 2, 0, 'YXZ');
    scene.add(log);
  }
  const ember = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: 0xe07030, transparent: true, opacity: 0.7 }));
  ember.rotation.x = -Math.PI / 2;
  ember.position.set(fx, fy + 0.09, fz);
  scene.add(ember);
  animated.embers = ember;
}

// ---- 岸边长椅 ----
{
  for (const [bx, bz, ry] of [[-4.5, 21.2, 0], [3.5, 21.6, 0.15]]) {
    const by = groundHeight(bx, bz);
    const bench = new THREE.Group();
    bench.position.set(bx, by, bz);
    bench.rotation.y = ry + Math.PI;
    bench.add(box(1.75, 0.07, 0.46, M.deck, 0, 0.45, 0));
    const back = box(1.75, 0.42, 0.06, M.deck, 0, 0.68, 0.2);
    back.rotation.x = -0.18;
    bench.add(back);
    for (const lx of [-0.72, 0.72]) bench.add(box(0.07, 0.45, 0.4, M.mullion, lx, 0.22, 0));
    scene.add(bench);
  }
}

// ---- 花境 ----
{
  const fGeo = new THREE.IcosahedronGeometry(0.055, 0);
  const fItems = [];
  const fCols = ['#c96f4a', '#d9a441', '#e8e0c8', '#b8524a', '#c96f4a', '#d9a441'];
  for (const [px, pz] of [[13.6, 10.4], [6.2, 24.6], [-15.2, 17.8], [-3.2, 10.9], [16.5, 14.5]]) {
    for (let i = 0; i < 42; i++) {
      const x = px + (rng() - 0.5) * 1.7, z = pz + (rng() - 0.5) * 1.4;
      if (pondT(x, z) < 1.06) continue;
      fItems.push({ p: [x, groundHeight(x, z) + 0.1, z], s: [0.8 + rng() * 0.8, 0.9 + rng() * 0.9, 0.8 + rng() * 0.8] });
    }
  }
  const flowers = new THREE.InstancedMesh(fGeo, new THREE.MeshLambertMaterial(), fItems.length);
  fItems.forEach((it, i) => {
    flowers.setMatrixAt(i, new THREE.Matrix4().compose(
      V3(...it.p), new THREE.Quaternion(), V3(...it.s)));
    flowers.setColorAt(i, new THREE.Color(fCols[i % fCols.length]));
  });
  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  scene.add(flowers);
}

// ---- 竹丛 ----
{
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x93b06b });
  const poles = [];
  for (const [cx, cz] of [[-14.5, 8.0], [15.2, 5.6], [11.5, 24.2]]) {
    const cy0 = groundHeight(cx, cz);
    for (let i = 0; i < 8; i++) {
      const h = 3.2 + rng() * 2.0;
      const g2 = new THREE.CylinderGeometry(0.024, 0.03, h, 6);
      g2.translate(cx + (rng() - 0.5) * 0.9, cy0 + h / 2, cz + (rng() - 0.5) * 0.9);
      poles.push(g2);
    }
  }
  const bamboo = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(poles), poleMat);
  bamboo.castShadow = true;
  scene.add(bamboo);
  // 竹叶
  const leafItems = [];
  for (const [cx, cz] of [[-14.5, 8.0], [15.2, 5.6], [11.5, 24.2]]) {
    for (let i = 0; i < 7; i++) {
      leafItems.push({
        p: [cx + (rng() - 0.5) * 1.0, groundHeight(cx, cz) + 3.0 + rng() * 2.2, cz + (rng() - 0.5) * 1.0],
        s: [0.5 + rng() * 0.4, 0.4 + rng() * 0.3, 1],
        r: [0, rng() * Math.PI, 0],
      });
    }
  }
  const bambooLeafMat = reedMat.clone();
  bambooLeafMat.color = new THREE.Color(0x9dbb6e);
  scene.add(instancedFrom(new THREE.PlaneGeometry(1, 1.4).translate(0, 0.7, 0), bambooLeafMat, leafItems));
}

// ---- 右岸石墙 ----
{
  for (let i = 0; i < 6; i++) {
    const wx = 14.8 + i * 0.42, wz = 9.0 + i * 0.78;
    const wall = box(0.5, 0.5 + rng() * 0.15, 1.05, M.travDark, wx, groundHeight(wx, wz) + 0.2, wz);
    wall.rotation.y = 0.45;
    scene.add(wall);
  }
}

// ---- 绕湖步径（石板延伸到凉亭） ----
{
  const route = [[12.6, 12.2], [11.6, 14.4], [10.8, 16.8], [10.2, 19.2], [9.8, 21.4]];
  for (const [px, pz] of route) {
    const slab = box(1.1, 0.13, 0.8, M.travDark, px, groundHeight(px, pz) + 0.065, pz);
    slab.rotation.y = (rng() - 0.5) * 0.4;
    scene.add(slab);
  }
}

// ---- 草坪矮灌木 ----
{
  const items = [];
  for (let i = 0; i < 90; i++) {
    const x = -45 + rng() * 95, z = -30 + rng() * 65;
    if (pondT(x, z) < 1.15) continue;
    if (x > -15.5 && x < 15.5 && z > -10.5 && z < 9.5) continue;
    items.push({
      p: [x, groundHeight(x, z), z],
      s: [0.28 + rng() * 0.34, 0.2 + rng() * 0.24, 0.28 + rng() * 0.34],
      r: [rng() * 3, rng() * 3, rng() * 3],
    });
  }
  scene.add(instancedFrom(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ flatShading: true }), items,
    { colors: ['#7a8a50', '#8c9a58', '#9a9a58', '#6d7c46'] }));
}

// ---- 补树与更密的远景 ----
buildTree(rng, { pos: [-6.5, groundHeight(-6.5, 25.5), 25.5], len0: 3.4, r0: 0.3, lean: 0.1, lean2: 0.2, leaf: 1.5, rot: 1.8 });
buildTree(rng, { pos: [4.5, groundHeight(4.5, 29.0), 29.0], len0: 3.2, r0: 0.28, lean: -0.15, lean2: -0.2, leaf: 1.4, rot: 0.6 });
buildTree(rng, { pos: [26.0, groundHeight(26.0, 16.0), 16.0], len0: 3.6, r0: 0.32, lean: -0.3, lean2: 0.1, leaf: 1.5, rot: 2.9 });
{
  const farMat2 = new THREE.MeshLambertMaterial({ map: texLeaves[0], alphaTest: 0.4, side: THREE.DoubleSide });
  const items = [];
  for (let i = 0; i < 12; i++) {
    const x = -70 + i * 13 + (rng() - 0.5) * 8;
    const z = -52 - rng() * 18;
    const w = 13 + rng() * 8, h = 8 + rng() * 5;
    items.push({ p: [x, groundHeight(x, z) + h * 0.42, z], s: [w, h, 1], r: [0, Math.atan2(camera.position.x - x, camera.position.z - z), 0] });
  }
  scene.add(instancedFrom(new THREE.PlaneGeometry(1, 1), farMat2, items, { shadow: false }));
  const hill3 = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshLambertMaterial({ color: 0x8f8a58 }));
  hill3.scale.set(70, 9, 30);
  hill3.position.set(-90, -0.4, -70);
  scene.add(hill3);
}

// ============================================================
//  参观模式
// ============================================================
let tween = null;
const TOUR = [
  { p: [-26, 6, 46], t: [0, 7, 0], s: '湖畔木宅', d: '五层临水而建：混凝土挑板、木格栅与玻璃幕墙，屋顶是一片草甸花园。', hold: 3.6, p2: [-23.5, 6.1, 44.5], t2: [0, 6.8, 0] },
  { p: [-8, 2.4, 29], t: [0, 6, 4], s: '一池静水', d: '门前水面倒映着整栋房子，木码头、小船和鸭群就在水上。', hold: 3.6, p2: [-6.5, 2.5, 27.5], t2: [0, 6, 6] },
  { p: [-1.8, 2.9, 15.8], t: [0, 3.4, 6], s: '踏上石阶', d: '穿过虚掩的玻璃门和木柱门廊，就是挑空的玻璃大堂。', hold: 2.8 },
  { p: [1.5, 3.1, -2.0], t: [-2.5, 2.5, 0.8], s: '一层 · 大堂', d: '从入口望进去：休憩沙发、绿植与挂画墙。', hold: 3.4, p2: [0.8, 3.1, -1.2], t2: [-2.5, 2.5, 1.2] },
  { p: [-3.0, 3.1, 1.6], t: [2.6, 2.6, -3.6], s: '一层 · 接待台', d: '木饰接待台与长椅，落地玻璃外就是池水。', hold: 3.0, p2: [-2.4, 3.1, 1.0], t2: [2.6, 2.6, -3.6] },
  { p: [5.5, 3.3, -1.0], t: [9.3, 4.0, -3.4], s: '走向木梯', d: '沿右侧的木楼梯逐层而上。', hold: 1.4 },
  { p: [9.3, 6.3, -3.6], t: [1, 6.6, 2], s: '上到二层', d: '', hold: 1.2 },
  { p: [0.5, 6.2, 1.8], t: [-3.5, 5.8, -2.5], s: '二层 · 客厅', d: '围合式沙发、石面茶几与整墙书架，电视墙上方的灯带正好。', hold: 3.8, p2: [-1.6, 6.15, 0.6], t2: [-4.5, 5.8, -3.2] },
  { p: [4.0, 6.2, -1.5], t: [2, 7, 28], s: '二层 · 看湖', d: '从客厅望出去，水面一直铺到远处的树林。', hold: 3.0, p2: [3.2, 6.2, -0.8], t2: [2, 7, 30] },
  { p: [5.5, 6.4, -1.0], t: [9.3, 7.2, -3.4], s: '走向木梯', d: '', hold: 1.1 },
  { p: [9.3, 9.3, -3.6], t: [0, 9.6, 2], s: '上到三层', d: '', hold: 1.2 },
  { p: [-1.0, 9.2, 1.5], t: [4.0, 8.9, -3.4], s: '三层 · 餐厨', d: '长桌朝湖，岛台与吊灯备好——朋友的座位就留在窗边。', hold: 3.6, p2: [-2.2, 9.2, 0.8], t2: [4.5, 8.9, -3.6] },
  { p: [4.0, 9.2, -0.6], t: [5.6, 9.0, -3.8], s: '三层 · 岛台', d: '清晨在这里煮咖啡，看雾从水面升起来。', hold: 2.6, p2: [4.6, 9.2, -1.4], t2: [5.6, 9.0, -3.8] },
  { p: [5.5, 9.4, -1.0], t: [9.3, 10.2, -3.4], s: '走向木梯', d: '', hold: 1.1 },
  { p: [9.3, 12.3, -3.6], t: [-1, 12.6, 2], s: '上到四层', d: '', hold: 1.2 },
  { p: [-0.5, 12.2, 1.6], t: [-2.5, 11.9, -3.2], s: '四层 · 卧室', d: '床正对水面，床头灯、床尾凳、衣柜与穿衣镜一应俱全。', hold: 3.6, p2: [-1.8, 12.2, 0.9], t2: [-2.8, 11.9, -3.6] },
  { p: [5.5, 12.2, 0.8], t: [2, 12.4, 28], s: '四层 · 晨光', d: '拉开窗帘，整面湖景从床头铺到脚边。', hold: 2.8, p2: [4.6, 12.2, 1.4], t2: [2, 12.6, 30] },
  { p: [5.5, 12.4, -1.0], t: [9.3, 13.2, -3.4], s: '走向木梯', d: '', hold: 1.1 },
  { p: [9.3, 15.3, -3.6], t: [-1, 15.6, 2], s: '上到五层', d: '', hold: 1.2 },
  { p: [-0.8, 15.2, 1.4], t: [-1.5, 14.9, -2.9], s: '五层 · 茶室', d: '榻上矮桌与蒲团，一壶茶的下午，纸灯笼微微发亮。', hold: 3.6, p2: [-2.0, 15.2, 0.6], t2: [-1.5, 14.9, -3.4] },
  { p: [9.3, 15.6, -3.5], t: [-1, 16, 2], s: '', d: '', hold: 0.8 },
  { p: [9.3, 17.6, -3.4], t: [0, 17.4, 0], s: '穿出屋顶', d: '', hold: 0.9 },
  { p: [9.3, 19.6, -3.0], t: [0, 17.6, 0], s: '', d: '', hold: 1.0 },
  { p: [8.5, 21.8, 17.0], t: [0, 16.4, 0], s: '屋顶 · 草甸花园', d: '整层屋顶都是花园，草木在檐口之上生长。', hold: 3.4, p2: [6.5, 21.4, 14.5], t2: [0, 16.6, -2] },
  { p: [-11.0, 22.0, 14.0], t: [0, 16.8, 2.0], s: '屋顶 · 远望', d: '从最高处看池水、码头、凉亭与更远的丘陵。', hold: 3.2, p2: [-9.5, 21.6, 12.5], t2: [0, 17.2, 4] },
  { p: [-20.5, 3.4, 23.5], t: [9, 3.4, 23.5], s: '绕到对岸', d: '从屋顶落到湖的西岸——芦苇、花境和一条绕湖的小径。', hold: 2.8 },
  { p: [13.2, 3.1, 27.8], t: [9, 3.4, 23.5], s: '岸边凉亭', d: '四柱攒尖的小凉亭，是看整栋房子最好的座位。', hold: 3.4, p2: [12.0, 3.1, 27.0], t2: [9, 3.6, 23.5] },
  { p: [-14.5, 4.2, 40.0], t: [-1.0, 7.2, 0.0], s: '参观结束', d: '现在交给你——拖动旋转，随时再走进任何一层。', hold: 2.8 },
];
let tour = null;
const tourCard = document.getElementById('tourCard');
const tourStepEl = document.getElementById('tourStep');
const tourDescEl = document.getElementById('tourDesc');
const tourStartBtn = document.getElementById('tourStart');
function tourSetCaption(stop) {
  tourStepEl.textContent = stop.s || '…';
  tourDescEl.textContent = stop.d || '';
}
function tourGoStop(i) {
  if (!tour) return;
  const idx = THREE.MathUtils.clamp(i, 0, TOUR.length - 1);
  tour.i = idx;
  const stop = TOUR[idx];
  const from = camera.position.clone();
  const to = V3(...stop.p);
  const dist = from.distanceTo(to);
  const c = from.clone().lerp(to, 0.5);
  c.y += 0.35 + dist * 0.045;
  tour.p0 = from; tour.pc = c; tour.p1 = to;
  tour.t0 = controls.target.clone(); tour.t1 = V3(...stop.t);
  tour.k = 0;
  tour.dur = THREE.MathUtils.clamp(dist / 7, 1.5, 4.0);
  tour.phase = 'leg';
  if (stop.s) tourSetCaption(stop);
}
function tourStart() {
  tween = null;
  controls.autoRotate = false;
  controls.enabled = false;
  tourCard.classList.remove('hide');
  tourStartBtn.style.display = 'none';
  document.getElementById('hint').style.opacity = '0';
  tour = { i: -1, phase: 'dwell', hold: 0.01, paused: false };
}
function tourStop() {
  tour = null;
  controls.enabled = true;
  tourCard.classList.add('hide');
  tourStartBtn.style.display = '';
}
function tourNext() { if (tour) tourGoStop(Math.min(tour.i + 1, TOUR.length - 1)); }
function tourPrev() { if (tour) tourGoStop(Math.max(tour.i - 1, 0)); }
function tourPauseToggle() {
  if (!tour) return;
  tour.paused = !tour.paused;
  document.getElementById('tourPause').textContent = tour.paused ? '继 续' : '暂 停';
}
tourStartBtn.addEventListener('click', () => { tourStart(); tourNext(); });
document.getElementById('tourNext').addEventListener('click', tourNext);
document.getElementById('tourPrev').addEventListener('click', tourPrev);
document.getElementById('tourPause').addEventListener('click', tourPauseToggle);
document.getElementById('tourExit').addEventListener('click', tourStop);
function tourUpdate(dt) {
  if (!tour || tour.paused) return;
  const stop = TOUR[tour.i];
  if (!stop) return;
  if (tour.phase === 'leg') {
    tour.k = Math.min(1, tour.k + dt / tour.dur);
    const s = tour.k * tour.k * (3 - 2 * tour.k);
    // 二次贝塞尔
    const it = 1 - s;
    camera.position.set(
      it * it * tour.p0.x + 2 * it * s * tour.pc.x + s * s * tour.p1.x,
      it * it * tour.p0.y + 2 * it * s * tour.pc.y + s * s * tour.p1.y,
      it * it * tour.p0.z + 2 * it * s * tour.pc.z + s * s * tour.p1.z,
    );
    controls.target.lerpVectors(tour.t0, tour.t1, s);
    camera.lookAt(controls.target);
    if (tour.k >= 1) { tour.phase = 'dwell'; tour.hold = stop.hold; }
  } else {
    tour.hold -= dt;
    // 驻留期缓慢滑移（比静止更有"运镜"感）
    const dRaw = THREE.MathUtils.clamp(1 - Math.max(0, tour.hold) / Math.max(0.001, stop.hold), 0, 1);
    const sGlide = dRaw * dRaw * (3 - 2 * dRaw);
    if (stop.p2) {
      camera.position.lerpVectors(tour.p1, V3(...stop.p2), sGlide);
      const t2 = stop.t2 ? V3(...stop.t2) : tour.t1;
      controls.target.lerpVectors(tour.t1, t2, sGlide);
      camera.lookAt(controls.target);
    } else {
      camera.position.y += Math.sin(elapsed * 0.8) * 0.0012;
    }
    if (tour.hold <= 0) {
      if (tour.i >= TOUR.length - 1) tourStop();
      else tourNext();
    }
  }
}
window.__tour = { start: () => { tourStart(); tourNext(); }, go: (i) => { tourStart(); tourGoStop(i); tour.phase = 'dwell'; tour.hold = 1e9; camera.position.set(...TOUR[i].p); controls.target.set(...TOUR[i].t); camera.lookAt(...TOUR[i].t); tourSetCaption(TOUR[i]); }, next: tourNext, exit: tourStop, state: () => tour ? { i: tour.i, phase: tour.phase, k: tour.k, dur: tour.dur, hold: tour.hold, p0: tour.p0 && tour.p0.toArray(), pc: tour.pc && tour.pc.toArray(), p1: tour.p1 && tour.p1.toArray(), cam: camera.position.toArray() } : null };
if (QS.get('tour') === '1') { tourStart(); tourNext(); }

function goView(i, instant = false) {
  if (tour) tourStop();
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
  if (tour) {
    tourUpdate(dt);
  } else {
    controls.update();
  }

  // 飞鸟
  for (const bird of animated.birds) {
    const u = bird.userData;
    const a = elapsed * u.speed + u.phase;
    bird.position.set(Math.cos(a) * u.r, u.h + Math.sin(elapsed * 0.5 + u.phase) * 1.2, 8 + Math.sin(a) * u.r);
    bird.rotation.y = -a;
    const flap = Math.sin(elapsed * 9 + u.phase * 3) * 0.55;
    u.wl.rotation.y = flap;
    u.wr.rotation.y = -flap;
  }
  // 涟漪
  for (const ring of animated.ripples) {
    const t = (elapsed * 0.25 + ring.userData.phase) % 1;
    ring.scale.setScalar(0.4 + t * 3.6);
    ring.material.opacity = 0.4 * (1 - t) * (t > 0.02 ? 1 : 0);
  }
  // 鸭群
  for (const duck of animated.ducks) {
    const u = duck.userData;
    const a = elapsed * u.speed + u.phase;
    duck.position.set(u.x + Math.cos(a) * u.r, WATER_Y + 0.05 + Math.sin(elapsed * 1.2 + u.phase * 2) * 0.018, u.z + Math.sin(a) * u.r);
    duck.rotation.y = -a + Math.PI / 2;
    duck.rotation.z = Math.sin(elapsed * 1.4 + u.phase) * 0.05;
  }
  // 炭火闪烁
  if (animated.embers) animated.embers.material.opacity = 0.55 + Math.sin(elapsed * 3.1) * 0.15;
  // 小船起伏
  for (const boat of animated.canoes) {
    boat.position.y = WATER_Y - 0.06 + Math.sin(elapsed * 0.8) * 0.035;
    boat.rotation.z = Math.sin(elapsed * 0.66) * 0.022;
    boat.rotation.x = Math.sin(elapsed * 0.5 + 1) * 0.015;
  }

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
