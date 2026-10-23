/* ==========================================
   灵感补给站 · 3D 灰模 v0.8
   空间仍以灰模验证体块与机位；店员已接入带 PBR 贴图的网页模型。
   ========================================== */
import * as THREE from './three.module.min.js';
import { createTableBadge } from './badge.js';
import { loadGlbModel } from './glb-loader.js?v=20261023-model-compress-3';

const stage = document.getElementById('stage');
const labelLayer = document.getElementById('labels');
const loader = document.getElementById('loader');
const bubbleEl = document.getElementById('bubble');
const backBtn = document.getElementById('back');
const fadeEl = document.getElementById('fade');

let W = window.innerWidth;
let H = window.innerHeight;
const CAMERA_FOV = 48;
const frame = document.getElementById('frame');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(W, H);
renderer.setClearColor(0x0b0b0e, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0b0e, 22, 46);

const camera = new THREE.PerspectiveCamera(CAMERA_FOV, W / H, 0.1, 120);
const camTarget = new THREE.Vector3(0, 0.9, -0.8);
window.__blk = { camera, camTarget };

/* ---------- 灯光 ---------- */
scene.add(new THREE.HemisphereLight(0xffe3b5, 0x2a1c13, 1.8));
const sun = new THREE.DirectionalLight(0xffd0a0, 1.65);
sun.position.set(7, 10, 8);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9fc4e0, 0.55);
fill.position.set(-2, 6, 10);
scene.add(fill);
const warm = new THREE.PointLight(0xffb65f, 2.0, 11, 2);
warm.position.set(-1.9, 2.65, 0.7);
scene.add(warm);
const cool = new THREE.PointLight(0x86b6d8, 0.8, 10, 2);
cool.position.set(3.2, 2.2, -1.4);
scene.add(cool);

/* ---------- 材质 ---------- */
const M = {
  wall: new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.92, metalness: 0.01 }),
  facadeWall: new THREE.MeshStandardMaterial({ color: 0x8e887e, roughness: 0.96, metalness: 0.01 }),
  facadeSide: new THREE.MeshBasicMaterial({ color: 0x716d66, side: THREE.DoubleSide }),
  floor: new THREE.MeshStandardMaterial({ color: 0xc9beab, roughness: 0.88 }),
  streetFloor: new THREE.MeshStandardMaterial({ color: 0x6f4b31, roughness: 0.9 }),
  tile: new THREE.MeshStandardMaterial({ color: 0xd8cfbd, roughness: 0.82 }),
  prop: new THREE.MeshStandardMaterial({ color: 0xe6dece, roughness: 0.8 }),
  propLo: new THREE.MeshStandardMaterial({ color: 0xc9baa0, roughness: 0.84 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x203b36, roughness: 0.52, metalness: 0.2 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x77736c, roughness: 0.94 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x2f2b27, roughness: 0.72, metalness: 0.06 }),
  awning: new THREE.MeshStandardMaterial({ color: 0x8d4136, roughness: 0.84 }),
  navy: new THREE.MeshStandardMaterial({ color: 0x263a3b, roughness: 0.66, metalness: 0.08 }),
  cream: new THREE.MeshStandardMaterial({ color: 0xe8e0d2, roughness: 0.78 }),
  teal: new THREE.MeshStandardMaterial({ color: 0x328e96, roughness: 0.72 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xe59a45, roughness: 0.72 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xffdda7, roughness: 0.12, metalness: 0.08,
    transparent: true, opacity: 0.18, depthWrite: false }),
  windowGlass: new THREE.MeshStandardMaterial({ color: 0xd8ba91, roughness: 0.2, metalness: 0.03,
    transparent: true, opacity: 0.13, depthWrite: false }),
  doorGlass: new THREE.MeshStandardMaterial({ color: 0xcda274, roughness: 0.2, metalness: 0.04,
    transparent: true, opacity: 0.2, depthWrite: false }),
  glow: new THREE.MeshStandardMaterial({ color: 0x8e5f31, emissive: 0xffc56a, emissiveIntensity: 1.15 }),
  glowSoft: new THREE.MeshStandardMaterial({ color: 0x6a4b2d, emissive: 0xffd287, emissiveIntensity: 0.75 }),
  accent: new THREE.MeshStandardMaterial({ color: 0xb96435, emissive: 0x3b1a0a, emissiveIntensity: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x42342b, roughness: 0.95 })
};
const edgeMat = new THREE.LineBasicMaterial({ color: 0x211710, transparent: true, opacity: 0.7 });

/* ---------- 工具 ---------- */
const world = new THREE.Group();
scene.add(world);
/* 人物保持 2m 建模尺度；室内净空间约 5m × 3.8m。 */
const MODEL_SCALE = 0.86;
world.scale.setScalar(MODEL_SCALE);
const shell = new THREE.Group();
const props = new THREE.Group();
const facade = new THREE.Group();
const street = new THREE.Group();
const modeledExterior = new THREE.Group();
modeledExterior.name = 'modeled-store-exterior';
world.add(shell, props, facade, street, modeledExterior);
let exteriorMode = true;
let modeledExteriorReady = false;
const modeledDoorPivots = [];
/* 最终外观：收窄约 22%，增高约 30%，内部空间尺寸保持不变。 */
const FACADE_X_SCALE = 0.78;
const FACADE_Y_SCALE = 1.30;
facade.scale.set(FACADE_X_SCALE, FACADE_Y_SCALE, 1);

const pickables = [];
const labels = [];

function box(w, h, d, mat, x, y, z, parent = props, opts = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  if (opts.edges !== false) {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
    mesh.add(edges);
  }
  parent.add(mesh);
  return mesh;
}

const stockMats = [
  new THREE.MeshStandardMaterial({ color: 0xe58a35, roughness: 0.68 }),
  new THREE.MeshStandardMaterial({ color: 0xc94e43, roughness: 0.72 }),
  new THREE.MeshStandardMaterial({ color: 0x78a15e, roughness: 0.78 }),
  new THREE.MeshStandardMaterial({ color: 0xdfbf56, roughness: 0.66 }),
  new THREE.MeshStandardMaterial({ color: 0x8b75ad, roughness: 0.74 }),
  new THREE.MeshStandardMaterial({ color: 0xd66e79, roughness: 0.7 })
];

/* 文字牌：灰模里用来认出招牌 */
function makeSign(text, w, h, bg = '#1d1d24', fg = '#f2ead9', size = 54) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  let fontSize = size;
  do {
    ctx.font = `700 ${fontSize}px -apple-system, "PingFang SC", sans-serif`;
    fontSize -= 2;
  } while (ctx.measureText(text).width > 468 && fontSize > 28);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

/* 竖招使用单独的竖向画布，避免把横排文字压扁。 */
function makeVerticalSign(text, w, h, bg = '#e2d4bc', fg = '#31251e', size = 74) {
  const cv = document.createElement('canvas');
  cv.width = 160; cv.height = 512;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 160, 512);
  ctx.fillStyle = fg;
  ctx.font = `700 ${size}px "Songti SC", "STSong", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...text].forEach((char, i) => {
    ctx.fillText(char, 80, 116 + i * 140);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

function makeStoreSign() {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0e6cb'; ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = '#a5322d';
  ctx.font = '700 112px "Songti SC", "STSong", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('販賣 · 靈感', 512, 118);
  ctx.fillStyle = '#263a3b';
  ctx.font = '700 31px "PingFang SC", sans-serif';
  ctx.fillText('24H  靈感便利店', 512, 188);
  ctx.strokeStyle = '#263a3b'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(116, 190); ctx.lineTo(390, 190);
  ctx.moveTo(634, 190); ctx.lineTo(908, 190); ctx.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(4.08, 0.82),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

function makeOpenSign() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 320;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f0e6cb'; ctx.fillRect(0, 0, 256, 320);
  ctx.fillStyle = '#a5322d';
  ctx.font = '700 54px "PingFang SC", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('營業中', 128, 108);
  ctx.strokeStyle = '#263a3b'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(42, 150); ctx.lineTo(214, 150); ctx.stroke();
  ctx.font = '700 46px "PingFang SC", sans-serif';
  ctx.fillText('24H', 128, 220);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.56),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

function pick(mesh, station, label, anchor, layer) {
  mesh.userData.station = station;
  mesh.userData.root = mesh;
  pickables.push(mesh);
  if (label) labels.push({ el: null, text: label, anchor: anchor.clone(), layer, station });
  return mesh;
}

function groupPick(group, station) {
  group.traverse(o => { if (o.isMesh) { o.userData.station = station; o.userData.root = group; } });
  pickables.push(group);
  return group;
}

/* ---------- 房间 ---------- */
// 约 5.0m × 3.8m 的净空间，完整收进新外景壳体，避免墙体和货架穿模。
box(5.0, 0.12, 3.8, M.floor, 0, -0.06, 0, shell, { edges: false });
box(4.88, 0.02, 3.68, M.tile, 0, 0.005, 0, shell, { edges: false });
// 后墙 + 左右墙（前墙切开）
box(5.0, 2.65, 0.12, M.wall, 0, 1.325, -1.90, shell);
box(0.12, 2.65, 3.8, M.wall, -2.50, 1.325, 0, shell);
const interiorRightWall = box(0.12, 2.65, 3.8, M.wall, 2.50, 1.325, 0, shell);
// 天花板灯管
box(1.6, 0.06, 0.16, M.glow, -1.05, 2.59, 0.2, shell, { edges: false });
box(1.6, 0.06, 0.16, M.glowSoft, 1.25, 2.59, -0.35, shell, { edges: false });
// 吊灯 + 灯罩
box(0.03, 0.4, 0.03, M.metal, -1.4, 2.44, 0.5, shell, { edges: false });
const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 18, 1, true), M.metal);
shade.position.set(-1.4, 2.2, 0.5);
shell.add(shade);
// 地面光池（装饰圆）
const pool = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40),
  new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0.055, depthWrite: false }));
pool.rotation.x = -Math.PI / 2;
pool.position.set(-1.5, 0.02, 0.65);
shell.add(pool);

/* ---------- 售货机（作品货架） ---------- */
const vm = new THREE.Group();
vm.position.set(1.5, 0, -1.38);
props.add(vm);
/* 机身做成一圈壳，前面留空，才能看见里面的五层货 */
box(1.75, 2.15, 0.08, M.prop, 0, 1.075, -0.41, vm);         // 背板
box(0.08, 2.15, 0.9, M.prop, -0.835, 1.075, 0, vm);         // 左侧板
box(0.08, 2.15, 0.9, M.prop, 0.835, 1.075, 0, vm);          // 右侧板
box(1.75, 0.08, 0.9, M.prop, 0, 2.11, 0, vm);               // 顶板
box(1.75, 0.1, 0.9, M.prop, 0, 0.05, 0, vm);                // 底板
box(1.6, 1.95, 0.04, M.propLo, 0, 1.15, -0.37, vm);         // 内腔背板
box(1.42, 1.72, 0.02, M.glowSoft, 0, 1.15, -0.34, vm, { edges: false }); // 内腔背光
box(1.5, 1.85, 0.03, M.glass, 0, 1.15, 0.5, vm, { edges: false }); // 玻璃
box(1.7, 0.16, 0.92, M.metal, 0, 2.22, 0, vm);              // 顶盖
box(0.34, 0.22, 0.1, M.glow, 0.56, 1.9, 0.47, vm, { edges: false }); // 小屏幕
box(0.9, 0.22, 0.06, M.dark, 0.1, 0.32, 0.47, vm);          // 取货口
// 五层货架 + 每层小商品
for (let r = 0; r < 5; r++) {
  const y = 0.55 + r * 0.31;
  box(1.45, 0.03, 0.34, M.metal, 0, y - 0.11, 0.12, vm, { edges: false });
  for (let i = 0; i < 5; i++) {
    const h = 0.14 + (r % 2) * 0.03;
    box(0.17, h, 0.16, stockMats[(r * 5 + i) % stockMats.length],
      -0.55 + i * 0.27, y + h / 2 - 0.09, 0.1, vm, { edges: false });
  }
}
groupPick(vm, 'vending');
labels.push({ el: null, text: '售货机 · 5 层', anchor: new THREE.Vector3(1.5, 2.38, -1.30), layer: 'int', station: 'vending' });

/* ---------- L 形柜台 + 店员 ---------- */
const counter = new THREE.Group();
counter.position.set(0, 0, 0);
props.add(counter);
// 长边沿左侧动线摆放，正面朝向右侧入口；短边向后墙折回。
box(0.68, 0.78, 1.95, M.prop, -1.02, 0.39, 0.15, counter);
box(0.80, 0.06, 2.08, M.cream, -1.02, 0.81, 0.15, counter);
box(1.55, 0.78, 0.68, M.prop, -1.64, 0.39, -0.78, counter);
box(1.68, 0.06, 0.80, M.cream, -1.64, 0.81, -0.78, counter);
box(0.68, 0.82, 0.68, M.propLo, -1.02, 0.41, -0.78, counter);
groupPick(counter, 'counter');
labels.push({ el: null, text: 'L 形柜台', anchor: new THREE.Vector3(-1.02, 1.02, 0.15), layer: 'int', station: 'counter' });

/* 柜台朝门口的折叠延长板：展开补足工作台，向下翻收后让出店员进出通道。 */
const counterExtension = new THREE.Group();
counterExtension.name = 'counter-folding-extension';
counterExtension.position.set(-1.02, 0.81, 1.13);
props.add(counterExtension);
box(0.66, 0.075, 0.075, M.metal, 0, 0.015, 0, counterExtension);
for (const x of [-0.26, 0.26]) {
  box(0.10, 0.09, 0.11, M.metal, x, 0.015, 0.075, counterExtension);
}
const extensionLeaf = new THREE.Group();
extensionLeaf.position.set(0, 0, 0.08);
counterExtension.add(extensionLeaf);
box(0.80, 0.06, 0.72, M.cream, 0, -0.03, 0.36, extensionLeaf);
box(0.70, 0.055, 0.62, M.propLo, 0, -0.075, 0.36, extensionLeaf);
box(0.68, 0.08, 0.055, M.navy, 0, -0.075, 0.69, extensionLeaf);
groupPick(counterExtension, 'counter-extension');
labels.push({
  el: null,
  text: '活动延长板 · 点击收起',
  anchor: new THREE.Vector3(-1.02, 1.0, 1.64),
  layer: 'int',
  station: 'counter-extension'
});
let extensionOpen = true;
let extensionAngle = 0;
function toggleCounterExtension() {
  extensionOpen = !extensionOpen;
  const extensionLabel = labels.find(label => label.station === 'counter-extension');
  if (extensionLabel?.el) {
    extensionLabel.el.textContent = extensionOpen
      ? '活动延长板 · 点击收起'
      : '活动延长板 · 点击展开';
  }
}

// 小本子
const note = box(0.3, 0.04, 0.23, M.accent, -1.08, 0.86, 0.74, props, { edges: true });
pick(note, 'notebook', null, new THREE.Vector3(), 'int');
labels.push({ el: null, text: '小本子', anchor: new THREE.Vector3(-1.08, 1.0, 0.74), layer: 'int', station: 'notebook' });

// 收银机
const reg = new THREE.Group();
reg.position.set(-1.02, 0.84, -0.42);
reg.scale.setScalar(0.82);
reg.rotation.y = -Math.PI / 2;
props.add(reg);
box(0.52, 0.24, 0.42, M.cream, 0, 0.12, 0, reg);
box(0.44, 0.2, 0.06, M.dark, 0, 0.34, -0.12, reg, { edges: false });
box(0.4, 0.02, 0.3, M.glowSoft, 0, 0.37, -0.08, reg, { edges: false });
groupPick(reg, 'register');
labels.push({ el: null, text: '收银机', anchor: new THREE.Vector3(-1.02, 1.17, -0.42), layer: 'int', station: 'register' });

// 店员：只使用当前高精度 PBR 模型，正面朝向柜台和入口。
const clerk = new THREE.Group();
clerk.name = 'clerk-chen-zhixi';
clerk.position.set(-1.62, 0, 0.18);
const COUNTER_FACING_YAW = Math.PI / 2;
clerk.rotation.y = COUNTER_FACING_YAW;
window.__blk.clerk = clerk;
props.add(clerk);

// 工牌离身，平放在收银台靠近小本子的位置。
const tableBadge = createTableBadge();
tableBadge.position.set(-1.02, 0.855, 0.52);
tableBadge.scale.setScalar(0.65);
tableBadge.rotation.z += Math.PI / 2;
props.add(tableBadge);
groupPick(tableBadge, 'badge');
labels.push({ el: null, text: '工牌', anchor: new THREE.Vector3(-1.02, 1.0, 0.52), layer: 'int', station: 'badge' });

loadGlbModel('../assets/models/clerk-optimized.glb?v=20261023-clerk-quality-3').then(model => {
  model.name = 'clerk-chen-zhixi-textured';
  model.traverse(object => {
    if (!object.isMesh) return;
    object.userData.station = 'clerk';
    object.userData.root = clerk;
  });
  clerk.add(model);
  clerk.userData.texturedModel = model;
  document.body.dataset.clerkModel = 'textured';
}).catch(error => {
  console.warn('Textured clerk could not load.', error);
  document.body.dataset.clerkModel = 'unavailable';
});

/* ---------- 墙面证书 ---------- */
[-1.2, -0.55, 0.1].forEach((x, i) => {
  const f = box(0.52, 0.38, 0.05, i === 0 ? M.accent : M.prop, x, 1.72, -1.82, props);
  f.userData.station = 'wall';
  f.userData.root = f;
  pickables.push(f);
});
labels.push({ el: null, text: '学历 / 荣誉 / 技能', anchor: new THREE.Vector3(-0.55, 2.05, -1.72), layer: 'int', station: 'wall' });

/* 证书墙下方的档案矮架，填补后墙空区并保持人物背后的工作区层次。 */
const archive = new THREE.Group();
props.add(archive);
box(1.7, 0.62, 0.34, M.propLo, -0.55, 0.31, -1.66, archive);
for (let i = 0; i < 4; i++) {
  box(0.28, 0.23, 0.24, i === 0 ? M.accent : M.prop,
    -1.15 + i * 0.4, 0.525, -1.58, archive, { edges: false });
}
groupPick(archive, 'wall');

/* ---------- 前场陈列 ---------- */
const displayCase = new THREE.Group();
// 陈列柜靠右侧墙布置，避开双开门后的进门动线。
displayCase.position.set(1.90, 0, 0.95);
displayCase.scale.setScalar(0.88);
props.add(displayCase);
box(1.15, 0.58, 0.58, M.prop, 0, 0.29, 0, displayCase);
box(1.22, 0.06, 0.64, M.metal, 0, 0.61, 0, displayCase);
box(1.04, 0.34, 0.5, M.glass, 0, 0.79, 0, displayCase, { edges: false });
box(1.08, 0.04, 0.54, M.glowSoft, 0, 0.64, 0, displayCase, { edges: false });
for (let i = 0; i < 4; i++) {
  const pastry = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    stockMats[(i + 2) % stockMats.length]
  );
  pastry.position.set(-0.38 + i * 0.25, 0.69, 0.08);
  pastry.scale.z = 0.72;
  displayCase.add(pastry);
}

const runner = new THREE.Mesh(
  new THREE.PlaneGeometry(2.2, 1.35),
  new THREE.MeshBasicMaterial({ color: 0xc18a55, transparent: true, opacity: 0.2 })
);
runner.rotation.x = -Math.PI / 2;
runner.position.set(0.55, 0.015, 0.35);
shell.add(runner);

/* ---------- 店面（外景时显示） ---------- */
// 程序化后备立面：左侧为大橱窗，右侧为入口；正常状态使用外景 GLB 双门。
const WINDOW_X = -1.55;
const WINDOW_W = 3.10;
const WINDOW_BOTTOM = 0.56;
const WINDOW_TOP = 2.13;
const DOOR_X = 1.62;
const DOOR_W = 0.97;

// 石质墙脚、顶部压顶与两侧墙垛。
box(6.42, 0.24, 0.18, M.stone, 0, 0.12, 2.12, facade);
box(6.62, 0.26, 0.38, M.navy, 0, 2.74, 2.10, facade);
box(0.28, 2.65, 0.16, M.facadeWall, -3.06, 1.325, 2.06, facade);
box(0.64, 2.65, 0.12, M.facadeWall, 0.32, 1.325, 2.06, facade);
box(1.60, 2.65, 0.12, M.facadeWall, 2.40, 1.325, 2.06, facade);

// 橱窗上下墙体。
box(WINDOW_W + 0.12, WINDOW_BOTTOM, 0.12, M.facadeWall, WINDOW_X, WINDOW_BOTTOM / 2, 2.06, facade);
box(WINDOW_W + 0.12, 2.65 - WINDOW_TOP, 0.12, M.facadeWall, WINDOW_X,
  WINDOW_TOP + (2.65 - WINDOW_TOP) / 2, 2.06, facade);

// 深色橱窗框与可见店内的大玻璃。
box(WINDOW_W + 0.16, 0.08, 0.18, M.navy, WINDOW_X, WINDOW_TOP, 2.01, facade);
box(WINDOW_W + 0.16, 0.11, 0.20, M.navy, WINDOW_X, WINDOW_BOTTOM, 2.01, facade);
box(0.08, WINDOW_TOP - WINDOW_BOTTOM, 0.18, M.navy, -3.06, 1.345, 2.01, facade);
box(0.08, WINDOW_TOP - WINDOW_BOTTOM, 0.18, M.navy, -0.04, 1.345, 2.01, facade);
box(WINDOW_W + 0.12, 0.11, 0.26, M.propLo, WINDOW_X, WINDOW_BOTTOM, 2.19, facade);
const winGlass = box(WINDOW_W - 0.08, WINDOW_TOP - WINDOW_BOTTOM - 0.08, 0.025,
  M.windowGlass, WINDOW_X, (WINDOW_TOP + WINDOW_BOTTOM) / 2, 1.985, facade, { edges: false });
winGlass.userData.decorative = true;

// 门洞上方的墙体。
box(DOOR_W + 0.10, 2.65 - 2.16, 0.12, M.facadeWall, DOOR_X, 2.16 + (2.65 - 2.16) / 2, 2.06, facade);

// 后备单门；正常状态由外景 GLB 的左右两扇门共同承担开门动画。
const doorPivot = new THREE.Group();
doorPivot.position.set(DOOR_X - DOOR_W / 2, 0, 2.0);
facade.add(doorPivot);
box(0.075, 2.16, 0.10, M.navy, 0.038, 1.08, 0, doorPivot);
box(0.075, 2.16, 0.10, M.navy, DOOR_W - 0.038, 1.08, 0, doorPivot);
box(DOOR_W, 0.10, 0.10, M.navy, DOOR_W / 2, 2.11, 0, doorPivot);
box(DOOR_W, 0.12, 0.10, M.navy, DOOR_W / 2, 0.06, 0, doorPivot);
box(DOOR_W - 0.16, 1.82, 0.025, M.doorGlass, DOOR_W / 2, 1.10, 0.005, doorPivot, { edges: false });
box(0.035, 0.42, 0.07, M.metal, DOOR_W - 0.18, 1.02, 0.08, doorPivot, { edges: false });
const doorSignGroup = new THREE.Group();
doorSignGroup.position.set(DOOR_W / 2, 1.54, 0.09);
doorSignGroup.scale.set(1 / FACADE_X_SCALE, 1 / FACADE_Y_SCALE, 1);
doorPivot.add(doorSignGroup);
box(0.50, 0.60, 0.03, M.cream, 0, 0, 0, doorSignGroup, { edges: false });
const openSign = makeOpenSign();
openSign.position.set(0, 0, 0.022);
doorSignGroup.add(openSign);
box(0.012, 0.21, 0.012, M.navy, -0.10, 0.40, 0.005, doorSignGroup, { edges: false });
box(0.012, 0.21, 0.012, M.navy, 0.10, 0.40, 0.005, doorSignGroup, { edges: false });
/* 整扇门（门框 + 玻璃）都能点，点到玻璃也算。 */
doorPivot.traverse(object => {
  if (!object.isMesh) return;
  object.userData.station = 'door';
  object.userData.root = doorPivot;
});
pickables.push(doorPivot);
labels.push({ el: null, text: '玻璃双门', anchor: new THREE.Vector3(
  DOOR_X * FACADE_X_SCALE, 2.20 * FACADE_Y_SCALE, 2.0), layer: 'ext', station: 'door' });

// 横向大招牌与左侧椭圆竖招。
box(4.30, 0.96, 0.13, M.navy, 0.66, 2.24, 2.11, facade);
const facadeSign = makeStoreSign();
facadeSign.position.set(0.66, 2.24, 2.185);
facade.add(facadeSign);

const bladeSignFrame = box(0.50, 1.46, 0.11, M.navy, -3.50, 2.12, 2.88, facade);
const bladeSign = makeVerticalSign('設計', 0.38, 1.30, '#f0e6cb', '#a5322d');
bladeSign.position.set(-3.50, 2.12, 2.945);
bladeSignFrame.userData.station = 'door';
facade.add(bladeSign);
box(0.055, 0.055, 0.76, M.frame, -3.23, 2.47, 2.50, facade, { edges: false });
box(0.055, 0.055, 0.76, M.frame, -3.23, 1.77, 2.50, facade, { edges: false });

// 右侧外墙随正立面一起收窄，挡住外部视角中按原店内尺寸延伸的侧墙。
box(0.14, 2.65, 4.0, M.facadeSide, 3.2, 1.325, 0, facade);
box(0.18, 0.16, 4.0, M.navy, 3.2, 2.71, 0, facade, { edges: false });

// 一体式深红布棚，让横向线条更完整。
const awningGroup = new THREE.Group();
awningGroup.position.set(0, 1.80, 2.39);
facade.add(awningGroup);
box(5.98, 0.12, 0.88, M.awning, 0, 0, 0, awningGroup, { rotX: 0.20 });
box(5.98, 0.18, 0.08, M.awning, 0, -0.11, 0.43, awningGroup);
box(0.12, 0.22, 0.92, M.awning, -3.01, -0.09, 0, awningGroup);
box(0.12, 0.22, 0.92, M.awning, 3.01, -0.09, 0, awningGroup);

// 右侧墙面的落水管与电箱。
box(0.075, 2.30, 0.08, M.navy, 3.20, 1.18, 2.03, facade);
box(0.14, 0.10, 0.32, M.navy, 3.20, 2.31, 1.88, facade);
box(0.26, 0.34, 0.10, M.navy, 3.15, 1.52, 1.95, facade);

// 门前外摆：冰柜、绿植和可嵌套的购物篮。
const curbFreezer = new THREE.Group();
curbFreezer.position.set(-2.48, 0, 3.15);
facade.add(curbFreezer);
box(0.92, 0.50, 0.58, M.cream, 0, 0.26, 0, curbFreezer);
box(0.82, 0.06, 0.48, M.awning, 0, 0.54, 0, curbFreezer);
box(0.72, 0.025, 0.38, M.glass, 0, 0.575, 0, curbFreezer, { edges: false });
box(0.66, 0.025, 0.32, M.navy, 0, 0.588, 0, curbFreezer, { edges: false });

const outsidePlant = new THREE.Group();
outsidePlant.position.set(-3.16, 0, 3.42);
facade.add(outsidePlant);
box(0.24, 0.28, 0.24, M.facadeWall, 0, 0.14, 0, outsidePlant);
box(0.08, 0.38, 0.08, M.propLo, 0, 0.43, 0, outsidePlant);
const outsideLeaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), M.prop);
outsideLeaf.position.set(0, 0.69, 0);
outsidePlant.add(outsideLeaf);

const basketStack = new THREE.Group();
basketStack.position.set(2.56, 0, 3.20);
facade.add(basketStack);
for (let i = 0; i < 5; i++) {
  const basket = box(0.52 - i * 0.018, 0.13, 0.36 - i * 0.012,
    M.accent, 0, 0.10 + i * 0.12, 0, basketStack);
  basket.rotation.y = i * 0.06;
}
box(0.55, 0.04, 0.39, M.frame, 0, 0.03, 0, basketStack);

/*
 * 完整店外模型替换程序化立面；模型中的空室内体块会隐藏，
 * 玻璃后的内容继续由本文件原有的带人物室内场景提供。
 */
function makeModeledDoorPivot(door, hinge) {
  if (!door) return null;
  door.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(door);
  const center = bounds.getCenter(new THREE.Vector3());
  const hingeX = hinge === 'left' ? bounds.min.x : bounds.max.x;
  const pivot = new THREE.Group();
  pivot.name = `${door.name} pivot`;
  modeledExterior.add(pivot);
  pivot.position.set(hingeX, door.position.y, center.z);
  pivot.attach(door);
  modeledDoorPivots.push({
    pivot,
    angle: hinge === 'left' ? 1.15 : -1.15
  });
  return pivot;
}

loadGlbModel('../assets/models/store-exterior.glb?v=20261023-model-compress-3').then(model => {
  model.name = 'store-exterior-model';
  model.traverse(object => {
    const name = object.name || '';
    const placeholder = /^(Back wall|Back tile joint|Back mid rail|Interior |Inner glass darkness)/.test(name);
    if (placeholder) object.visible = false;
  });

  modeledExterior.add(model);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.y -= bounds.min.y;
  model.position.z += 0.07;
  model.updateMatrixWorld(true);

  const leftDoorPivot = makeModeledDoorPivot(model.getObjectByName('Left door'), 'left');
  const rightDoorPivot = makeModeledDoorPivot(model.getObjectByName('Right door'), 'right');
  window.__blk.modeledExterior = model;
  window.__blk.modeledDoorPivots = modeledDoorPivots;

  if (leftDoorPivot) groupPick(leftDoorPivot, 'door');
  if (rightDoorPivot) groupPick(rightDoorPivot, 'door');
  for (const name of ['vending_source', 'freezer_source']) {
    const prop = model.getObjectByName(name);
    if (prop) groupPick(prop, 'vending');
  }

  modeledExteriorReady = true;
  const entryBounds = new THREE.Box3();
  for (const name of ['Left door', 'Right door']) {
    const door = model.getObjectByName(name);
    if (door) entryBounds.expandByObject(door);
  }
  if (!entryBounds.isEmpty()) {
    const entryX = entryBounds.getCenter(new THREE.Vector3()).x;
    stations.door.pos[0] = entryX;
    stations.door.target[0] = entryX;
    labels.forEach(label => {
      if (label.station === 'door') label.anchor.set(entryX / MODEL_SCALE, 2.34, 1.92);
    });
  }
  labels.forEach(label => {
    if (label.station === 'door') label.anchor.y = 2.34;
  });
  applyMode(exteriorMode);
  if (current === 'street' && !tween) {
    const streetView = stationFor('street');
    camera.position.set(...streetView.pos);
    camTarget.set(...streetView.target);
  }
  document.body.dataset.exteriorModel = 'textured';
}).catch(error => {
  console.warn('Modeled exterior could not load; using the procedural storefront.', error);
  document.body.dataset.exteriorModel = 'fallback';
});

/* ---------- 街道 ---------- */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), M.streetFloor);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.03, 8.0);
street.add(ground);

// 左侧多留一列铺砖，完整承托外移后的路灯底座。
box(8.05, 0.14, 1.72, M.stone, -0.44, 0.08, 3.05, street, { edges: true });
box(8.09, 0.18, 0.24, M.stone, -0.44, 0.08, 3.91, street);
for (let x = -4.0; x <= 3.2; x += 0.8) {
  box(0.015, 0.012, 1.58, M.dark, x, 0.155, 3.04, street, { edges: false });
}
for (let z = 2.45; z <= 3.70; z += 0.42) {
  box(7.05, 0.012, 0.015, M.dark, 0, 0.155, z, street, { edges: false });
}

// 左侧 T 形路灯：一根立杆、一根横梁与两盏方块灯。
const STREETLIGHT_X = -4.00;
const streetLight = new THREE.Group();
streetLight.position.set(STREETLIGHT_X, 0, 3.08);
street.add(streetLight);
box(0.48, 0.16, 0.48, M.navy, 0, 0.08, 0, streetLight);
box(0.20, 0.30, 0.20, M.navy, 0, 0.30, 0, streetLight);
const lightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 2.36, 10), M.navy);
lightPost.position.y = 1.48;
streetLight.add(lightPost);
box(0.82, 0.09, 0.10, M.navy, 0.37, 2.69, 0, streetLight, { edges: false });
[-0.04, 0.78].forEach(x => {
  box(0.16, 0.18, 0.16, M.navy, x, 2.57, 0, streetLight);
  box(0.13, 0.11, 0.13, M.glow, x, 2.47, 0, streetLight, { edges: false });
});
const lampLight = new THREE.PointLight(0xffc98a, 2.1, 8, 2);
lampLight.position.set(STREETLIGHT_X, 2.46, 3.08);
street.add(lampLight);

// 橱窗内侧补一盏低强度暖光，避免深色玻璃把人物和柜台吃掉。
const displayLight = new THREE.PointLight(0xffc47b, 1.35, 5.5, 2);
displayLight.position.set(WINDOW_X, 1.72, 1.34);
facade.add(displayLight);

/* ---------- 机位 ---------- */
const stations = {
  /* 外景：正对店门，只保留很轻的侧向透视；实际机位会按视口宽高比重新计算。 */
  street:   { pos: [1.10, 1.60, 7.00], target: [-0.05, 1.18, 1.78], ext: true },
  door:     { pos: [DOOR_X * FACADE_X_SCALE, 1.48 * FACADE_Y_SCALE, 4.05],
              target: [DOOR_X * FACADE_X_SCALE, 1.13 * FACADE_Y_SCALE, 1.90], ext: true },
  /* 进门后采用图一的正面平视构图，不做侧后方俯视。 */
  inside:   { pos: [0.78, 1.70, 3.55], target: [-0.30, 1.08, -0.58], ext: false },
  /* 所有物件特写都让镜头落在物体正面的法线方向上。 */
  vending:  { pos: [1.29, 1.05, 1.55], target: [1.29, 0.95, -0.76], ext: false },
  counter:  { pos: [0.78, 1.12, 0.13], target: [-0.88, 0.70, 0.13], ext: false },
  clerk:    { pos: [0.30, 1.32, 0.16], target: [-1.39, 1.02, 0.16], ext: false },
  badge:    { pos: [-0.93, 1.30, 0.82], target: [-0.93, 0.76, 0.45], roll: -Math.PI / 2, ext: false },
  wall:     { pos: [-0.47, 1.46, 0.20], target: [-0.47, 1.24, -1.57], ext: false },
  register: { pos: [0.42, 1.10, -0.36], target: [-0.88, 0.84, -0.36], ext: false },
  notebook: { pos: [-0.93, 1.30, 0.90], target: [-0.93, 0.76, 0.64], ext: false }
};

let mode = 'inside';
let tween = null;
let current = 'inside';
let stationRoll = 0;
const orbit = { yaw: 0, pitch: 0 };

function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function getStreetView() {
  const aspect = Math.max(0.35, W / H);
  const portrait = aspect < 0.82;
  const fov = portrait ? 60 : CAMERA_FOV;
  const target = new THREE.Vector3(portrait ? 0.18 : -0.05, portrait ? 1.27 : 1.32, 1.78);
  // 桌面保留左侧路灯；手机隐藏路灯，优先完整保留招牌、橱窗与贴右双门。
  const desiredHalfWidth = portrait ? 3.45 : 4.15;
  const halfVertical = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const halfHorizontal = halfVertical * aspect;
  const distance = desiredHalfWidth / Math.max(0.18, halfHorizontal);
  return {
    pos: [portrait ? 0.30 : 1.22, portrait ? 1.64 : 1.70, target.z + distance],
    target: target.toArray(),
    fov
  };
}

function stationFor(name) {
  if (name !== 'street') return stations[name];
  return { ...stations.street, ...getStreetView() };
}

function applyMode(isExt) {
  exteriorMode = isExt;
  facade.visible = isExt && !modeledExteriorReady;
  street.visible = isExt && !modeledExteriorReady;
  modeledExterior.visible = isExt && modeledExteriorReady;
  interiorRightWall.visible = !isExt;
  labels.forEach(l => { if (l.el) l.el.style.opacity = l.layer === (isExt ? 'ext' : 'int') ? '' : '0'; });
}

function go(name, opts = {}) {
  const st = stationFor(name);
  if (!st) return;
  current = name;
  stationRoll = st.roll || 0;
  outline.visible = false;
  orbit.yaw = 0; orbit.pitch = 0;
  document.body.dataset.station = name;
  const isExt = !!st.ext;
  applyMode(isExt);
  document.body.dataset.mode = isExt ? 'ext' : 'int';
  const navStation = name === 'register' || name === 'notebook' || name === 'badge' ? 'counter' : name;
  document.querySelectorAll('.st').forEach(b => b.classList.toggle('is-active', b.dataset.go === navStation));
  backBtn.textContent = name === 'inside'
    ? '← 回到店外'
    : st.ext ? '进店 →' : '← 回到店内';
  backBtn.classList.add('is-on');
  tween = {
    t: 0,
    dur: opts.dur || 1.0,
    fromPos: camera.position.clone(),
    toPos: new THREE.Vector3(...st.pos),
    fromTgt: camTarget.clone(),
    toTgt: new THREE.Vector3(...st.target)
  };
  hideBubble();
}

/* ---------- 标签 ---------- */
labels.forEach(l => {
  const el = document.createElement('div');
  el.className = 'tag';
  el.textContent = l.text;
  labelLayer.appendChild(el);
  l.el = el;
});

const tmpV = new THREE.Vector3();
function updateLabels() {
  labels.forEach(l => {
    if (!l.el) return;
    const visibleLayer = l.layer === (exteriorMode ? 'ext' : 'int');
    tmpV.copy(l.anchor).multiplyScalar(MODEL_SCALE).project(camera);
    const behind = tmpV.z > 1;
    const x = (tmpV.x * 0.5 + 0.5) * W;
    const y = (-tmpV.y * 0.5 + 0.5) * H;
    const on = visibleLayer && !behind && x > 0 && x < W && y > 0 && y < H;
    l.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    l.el.classList.toggle('is-on', on);
  });
}

/* ---------- 对话气泡 ---------- */
let bubbleTimer = 0;
function greetFromInside() {
  showBubble('<b>店员：</b>欢迎来到我的灵感便利店 ✦',
    new THREE.Vector3(-1.62, 2.32, 0.18), 5200);
}

function showBubble(text, anchor, duration = 3600) {
  bubbleEl.innerHTML = text;
  const v = anchor.clone().multiplyScalar(MODEL_SCALE).project(camera);
  const x = (v.x * 0.5 + 0.5) * W;
  const y = (-v.y * 0.5 + 0.5) * H;
  bubbleEl.style.left = THREE.MathUtils.clamp(x, 142, W - 142) + 'px';
  bubbleEl.style.top = THREE.MathUtils.clamp(y - 10, 86, H - 86) + 'px';
  bubbleEl.classList.add('is-on');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(hideBubble, duration);
}
function hideBubble() { bubbleEl.classList.remove('is-on'); }

/* ---------- 开门：只播一次，播完自动进店 ---------- */
let doorBusy = false;
function enterThroughDoor() {
  if (doorBusy) return;
  doorBusy = true;
  hideBubble();

  // 先站到双开门前，两扇门同步向内打开。
  go('door', { dur: 0.45 });
  const t0 = performance.now();
  const open = now => {
    const k = Math.min(1, (now - t0) / 600);
    const e = 1 - Math.pow(1 - k, 3);
    doorPivot.rotation.y = -e * 1.75;
    for (const { pivot, angle } of modeledDoorPivots) pivot.rotation.y = e * angle;
    if (k < 1) requestAnimationFrame(open);
  };
  requestAnimationFrame(open);

  // 门开到一半开始压黑，黑场里切到店内，外墙/街道全部收起
  setTimeout(() => fadeEl.classList.add('is-on'), 380);
  setTimeout(() => {
    doorPivot.rotation.y = 0;
    for (const { pivot } of modeledDoorPivots) pivot.rotation.y = 0;
    facade.visible = false;
    applyMode(false);
    go('inside', { dur: 0.01 });
    setTimeout(greetFromInside, 180);
  }, 720);
  setTimeout(() => fadeEl.classList.remove('is-on'), 860);
  setTimeout(() => { doorBusy = false; }, 1300);
}

/* ---------- 悬停 / 点击 ---------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const outline = new THREE.BoxHelper(new THREE.Object3D(), 0xe8a24a);
outline.visible = false;
scene.add(outline);

function rootOf(o) {
  let n = o;
  while (n && !n.userData.station) n = n.parent;
  return n;
}

function hitAt(clientX, clientY) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, true);
  for (const h of hits) {
    /* 在店内时，外墙上的窗/门不参与点击，避免挡住柜台 */
    if (!exteriorMode) {
      let n = h.object;
      let inExterior = false;
      while (n) {
        if (n === facade || n === modeledExterior) {
          inExterior = true;
          break;
        }
        n = n.parent;
      }
      if (inExterior) continue;
    }
    const root = rootOf(h.object);
    /* 店外只允许双门进入；透过玻璃看到的货架和柜台不抢点击。 */
    if (exteriorMode && root?.userData.station !== 'door') continue;
    if (root) return root;
  }
  return null;
}

const canvas = renderer.domElement;
let drag = null;
let downAt = null;
const touchPoints = new Map();
let pinch = null;
let suppressTap = false;
const MIN_ZOOM_DISTANCE = 0.28;
const MAX_ZOOM_DISTANCE = 9;

function dollyCamera(scale) {
  const offset = camera.position.clone().sub(camTarget);
  const distance = THREE.MathUtils.clamp(
    offset.length() * scale,
    MIN_ZOOM_DISTANCE,
    MAX_ZOOM_DISTANCE
  );
  offset.setLength(distance);
  camera.position.copy(camTarget).add(offset);
  tween = null;
}

function touchDistance() {
  const points = [...touchPoints.values()];
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

canvas.style.touchAction = 'none';

canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') {
    touchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touchPoints.size >= 2) {
      pinch = { distance: touchDistance() };
      suppressTap = true;
      drag = null;
      downAt = null;
    }
  }
  drag = { x: e.clientX, y: e.clientY, moved: false };
  downAt = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch' && touchPoints.has(e.pointerId)) {
    touchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touchPoints.size >= 2) {
      const distance = touchDistance();
      if (pinch?.distance > 0 && distance > 0) dollyCamera(pinch.distance / distance);
      pinch = { distance };
      suppressTap = true;
      return;
    }
  }
  if (drag) {
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) {
      outline.visible = false;
      orbit.yaw -= dx * 0.003;
      orbit.pitch = Math.max(-0.2, Math.min(0.24, orbit.pitch - dy * 0.0025));
      drag.x = e.clientX; drag.y = e.clientY;
      tween = null;
    }
    return;
  }
  const hit = hitAt(e.clientX, e.clientY);
  canvas.style.cursor = hit ? 'pointer' : 'grab';
  if (hit) {
    outline.setFromObject(hit);
    outline.visible = true;
  } else {
    outline.visible = false;
  }
});
canvas.addEventListener('pointerup', e => {
  const wasPinching = pinch || suppressTap;
  if (e.pointerType === 'touch') {
    touchPoints.delete(e.pointerId);
    if (touchPoints.size < 2) pinch = null;
  }
  const wasDrag = drag && drag.moved;
  const travel = downAt ? Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) : 0;
  drag = null;
  downAt = null;
  if (wasPinching) {
    if (touchPoints.size === 0) {
      setTimeout(() => { suppressTap = false; }, 80);
    }
    return;
  }
  /* 位移超过 6px 一律当拖拽，不触发点击，免得转完视角误跳到某个物件 */
  if (wasDrag || travel > 6) return;
  const hit = hitAt(e.clientX, e.clientY);
  if (!hit) return;
  const station = hit.userData.station;
  if (station === 'door') {
    enterThroughDoor();
  } else if (station === 'counter-extension') {
    toggleCounterExtension();
  } else {
    go(station);
    if (station === 'badge') setTimeout(() => showBubble('<b>工牌：</b>姓名 / 职位 / 联系方式（待接入）', new THREE.Vector3(-1.02, 1.12, 0.52)), 900);
  }
});
canvas.addEventListener('pointercancel', e => {
  touchPoints.delete(e.pointerId);
  if (touchPoints.size < 2) pinch = null;
  suppressTap = false;
  drag = null;
  downAt = null;
});
canvas.addEventListener('pointerleave', () => {
  if (touchPoints.size === 0) drag = null;
  outline.visible = false;
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = Math.exp(THREE.MathUtils.clamp(e.deltaY, -180, 180) * 0.0015);
  dollyCamera(factor);
}, { passive: false });

/* ---------- HUD ---------- */
document.querySelectorAll('.st').forEach(b => {
  b.addEventListener('click', () => {
    if (b.dataset.go === 'door') enterThroughDoor();
    else go(b.dataset.go);
  });
});
backBtn.addEventListener('click', () => {
  if (exteriorMode) enterThroughDoor();
  else if (current === 'inside') go('street');
  else go('inside');
});
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (exteriorMode) enterThroughDoor();
  else if (current === 'inside') go('street');
  else go('inside');
});

/* ---------- 渲染循环 ---------- */
const clock = new THREE.Clock();
function render() {
  requestAnimationFrame(render);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (tween) {
    tween.t += dt / tween.dur;
    const k = ease(Math.min(1, tween.t));
    camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
    camTarget.lerpVectors(tween.fromTgt, tween.toTgt, k);
    if (tween.t >= 1) tween = null;
  } else if (orbit.yaw || orbit.pitch) {
    const offset = camera.position.clone().sub(camTarget);
    const sph = new THREE.Spherical().setFromVector3(offset);
    sph.theta += orbit.yaw;
    sph.phi = Math.max(0.35, Math.min(1.45, sph.phi + orbit.pitch));
    camera.position.copy(camTarget).add(new THREE.Vector3().setFromSpherical(sph));
    /* orbit 存的是"这一帧要转多少"的增量，用完必须清零，
       否则每帧都会再叠加一次，镜头就会一直转下去 */
    orbit.yaw = 0;
    orbit.pitch = 0;
  }

  const extensionTarget = extensionOpen ? 0 : Math.PI / 2;
  extensionAngle += (extensionTarget - extensionAngle) * (1 - Math.exp(-dt * 11));
  extensionLeaf.rotation.x = extensionAngle;

  camera.lookAt(camTarget);
  if (stationRoll) camera.rotateZ(stationRoll);
  updateLabels();
  renderer.render(scene, camera);
}

/* ---------- 初始化 ---------- */
function resize() {
  W = Math.max(1, frame.clientWidth);
  H = Math.max(1, frame.clientHeight);
  camera.aspect = W / H;
  camera.fov = current === 'street' ? getStreetView().fov : CAMERA_FOV;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H, false);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  streetLight.visible = !modeledExteriorReady && W / H >= 0.82;
  if (current === 'street' && !tween) {
    const streetView = getStreetView();
    camera.position.set(...streetView.pos);
    camTarget.set(...streetView.target);
  }
}
window.addEventListener('resize', resize);

const query = new URLSearchParams(location.search);
if (query.has('embed')) document.body.dataset.embed = '1';
const asked = query.get('shot');
const startName = asked && stations[asked] ? asked : 'street';
const startStation = stationFor(startName);
current = startName;
camera.position.set(...startStation.pos);
camTarget.set(...startStation.target);
applyMode(!!startStation.ext);
document.body.dataset.mode = startStation.ext ? 'ext' : 'int';
document.body.dataset.station = startName;
resize();
render();
setTimeout(() => loader.classList.add('is-off'), 350);
setTimeout(() => loader.remove(), 1200);
if (asked && stations[asked]) {
  setTimeout(() => go(asked, { dur: 0.01 }), 120);
}
