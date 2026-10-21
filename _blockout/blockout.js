/* ==========================================
   灵感补给站 · 3D 灰模 v0.4
   空间仍以灰模验证体块与机位；店员已接入带 PBR 贴图的网页模型。
   ========================================== */
import * as THREE from './three.module.min.js';
import { createClerk, createTableBadge } from './clerk.js';
import { loadGlbModel } from './glb-loader.js';

const stage = document.getElementById('stage');
const labelLayer = document.getElementById('labels');
const loader = document.getElementById('loader');
const bubbleEl = document.getElementById('bubble');
const backBtn = document.getElementById('back');
const fadeEl = document.getElementById('fade');

const W = 1920;
const H = 1080;
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
  wall: new THREE.MeshStandardMaterial({ color: 0x393431, roughness: 0.95, metalness: 0.02 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x6f4b31, roughness: 0.9 }),
  prop: new THREE.MeshStandardMaterial({ color: 0x9a7546, roughness: 0.82 }),
  propLo: new THREE.MeshStandardMaterial({ color: 0x76583a, roughness: 0.88 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xc3a269, roughness: 0.5, metalness: 0.28 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xffdda7, roughness: 0.12, metalness: 0.08,
    transparent: true, opacity: 0.18, depthWrite: false }),
  glow: new THREE.MeshStandardMaterial({ color: 0x8e5f31, emissive: 0xffc56a, emissiveIntensity: 1.15 }),
  glowSoft: new THREE.MeshStandardMaterial({ color: 0x6a4b2d, emissive: 0xffd287, emissiveIntensity: 0.75 }),
  accent: new THREE.MeshStandardMaterial({ color: 0xb96435, emissive: 0x3b1a0a, emissiveIntensity: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x42342b, roughness: 0.95 })
};
const edgeMat = new THREE.LineBasicMaterial({ color: 0x211710, transparent: true, opacity: 0.7 });

/* ---------- 工具 ---------- */
const world = new THREE.Group();
scene.add(world);
/* 人物保持 2m 建模尺度；店铺采用约 6m × 4m 的紧凑尺度。 */
const MODEL_SCALE = 0.86;
world.scale.setScalar(MODEL_SCALE);
const shell = new THREE.Group();
const props = new THREE.Group();
const facade = new THREE.Group();
const street = new THREE.Group();
world.add(shell, props, facade, street);

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
  new THREE.MeshStandardMaterial({ color: 0xd8913f, roughness: 0.68 }),
  new THREE.MeshStandardMaterial({ color: 0xb85b35, roughness: 0.72 }),
  new THREE.MeshStandardMaterial({ color: 0x6b8f62, roughness: 0.78 }),
  new THREE.MeshStandardMaterial({ color: 0xe0be72, roughness: 0.66 }),
  new THREE.MeshStandardMaterial({ color: 0x8f6a94, roughness: 0.74 }),
  new THREE.MeshStandardMaterial({ color: 0xd47b55, roughness: 0.7 })
];

/* 用低面数商品堆出连续的货架密度，避免场景只剩大块空墙。 */
function shelfUnit(x, z, width, height, rotY = 0, levels = 4) {
  const unit = new THREE.Group();
  unit.position.set(x, 0, z);
  unit.rotation.y = rotY;
  props.add(unit);

  box(width, height, 0.36, M.propLo, 0, height / 2, 0, unit);
  box(width + 0.06, 0.08, 0.42, M.prop, 0, 0.12, 0.01, unit);
  box(width + 0.06, 0.08, 0.42, M.prop, 0, height - 0.06, 0.01, unit);
  for (let level = 0; level < levels; level++) {
    const shelfY = 0.38 + level * ((height - 0.55) / (levels - 1));
    box(width, 0.035, 0.4, M.metal, 0, shelfY - 0.1, 0.04, unit, { edges: false });
    const slots = Math.max(4, Math.floor(width / 0.18));
    for (let slot = 0; slot < slots; slot++) {
      const itemHeight = 0.12 + ((slot + level) % 3) * 0.035;
      const itemWidth = 0.095 + ((slot * 2 + level) % 4) * 0.012;
      const item = box(
        itemWidth,
        itemHeight,
        0.14,
        stockMats[(slot + level * 2) % stockMats.length],
        -width / 2 + 0.12 + slot * ((width - 0.24) / Math.max(1, slots - 1)),
        shelfY + itemHeight / 2 - 0.06,
        0.08,
        unit,
        { edges: false }
      );
      if (level % 2 === 0) item.rotation.y = (slot % 2 ? -1 : 1) * 0.08;
    }
  }
  groupPick(unit, 'vending');
  return unit;
}

/* 文字牌：灰模里用来认出招牌 */
function makeSign(text, w, h, bg = '#1d1d24', fg = '#f2ead9', size = 54) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = `700 ${size}px -apple-system, "PingFang SC", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h),
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
// 6.4m × 4.0m 的紧凑切面店铺，三侧货架包住中央动线。
box(6.4, 0.12, 4.0, M.floor, 0, -0.06, 0, shell, { edges: false });
box(6.28, 0.02, 3.88, M.dark, 0, 0.005, 0, shell, { edges: false });
// 后墙 + 左右墙（前墙切开）
box(6.4, 2.65, 0.12, M.wall, 0, 1.325, -2.06, shell);
box(0.12, 2.65, 4.0, M.wall, -3.26, 1.325, 0, shell);
box(0.12, 2.65, 4.0, M.wall, 3.26, 1.325, 0, shell);
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
vm.position.set(1.5, 0, -1.48);
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
    box(0.17, h, 0.16, r % 2 ? M.propLo : M.metal, -0.55 + i * 0.27, y + h / 2 - 0.09, 0.1, vm, { edges: false });
  }
}
groupPick(vm, 'vending');
labels.push({ el: null, text: '售货机 · 5 层', anchor: new THREE.Vector3(1.5, 2.38, -1.4), layer: 'int', station: 'vending' });

/* ---------- L 形柜台 + 店员 ---------- */
const counter = new THREE.Group();
counter.position.set(0, 0, 0);
props.add(counter);
// 长边：面对门口
box(2.1, 0.78, 0.68, M.prop, -1.65, 0.39, 0.95, counter);
box(2.25, 0.06, 0.8, M.metal, -1.65, 0.81, 0.95, counter);
// 短边：向店内折回，和长边拼成 L
box(0.68, 0.78, 1.05, M.prop, -2.345, 0.39, 0.35, counter);
box(0.8, 0.06, 1.2, M.metal, -2.345, 0.81, 0.35, counter);
// 转角立柱，让 L 更结实
box(0.68, 0.82, 0.68, M.propLo, -2.345, 0.41, 0.95, counter);
groupPick(counter, 'counter');
labels.push({ el: null, text: 'L 形柜台', anchor: new THREE.Vector3(-1.65, 1.02, 0.95), layer: 'int', station: 'counter' });

// 小本子
const note = box(0.3, 0.04, 0.23, M.accent, -2.42, 0.86, 0.98, props, { edges: true });
pick(note, 'notebook', null, new THREE.Vector3(), 'int');
labels.push({ el: null, text: '小本子', anchor: new THREE.Vector3(-2.42, 1.0, 0.98), layer: 'int', station: 'notebook' });

// 收银机
const reg = new THREE.Group();
reg.position.set(-0.98, 0.84, 1.02);
reg.scale.setScalar(0.82);
props.add(reg);
box(0.52, 0.24, 0.42, M.metal, 0, 0.12, 0, reg);
box(0.44, 0.2, 0.06, M.dark, 0, 0.34, -0.12, reg, { edges: false });
box(0.4, 0.02, 0.3, M.glowSoft, 0, 0.37, -0.08, reg, { edges: false });
groupPick(reg, 'register');
labels.push({ el: null, text: '收银机', anchor: new THREE.Vector3(-0.98, 1.17, 1.02), layer: 'int', station: 'register' });

// 店员：先用程序化模型占位，网页专用 GLB 加载成功后无缝替换。
const clerk = createClerk();
clerk.position.set(-1.65, 0, -0.02);
props.add(clerk);
groupPick(clerk, 'clerk');

// 工牌离身，平放在收银台靠近小本子的位置。
const tableBadge = createTableBadge();
tableBadge.position.set(-2.12, 0.855, 0.92);
tableBadge.scale.setScalar(0.65);
props.add(tableBadge);
groupPick(tableBadge, 'badge');
labels.push({ el: null, text: '工牌', anchor: new THREE.Vector3(-2.12, 1.0, 0.92), layer: 'int', station: 'badge' });

loadGlbModel('../assets/models/clerk-optimized.glb').then(model => {
  model.name = 'clerk-chen-zhixi-textured';
  model.traverse(object => {
    if (!object.isMesh) return;
    object.userData.station = 'clerk';
    object.userData.root = clerk;
  });
  clerk.add(model);
  clerk.userData.body.visible = false;
  clerk.userData.texturedModel = model;
  document.body.dataset.clerkModel = 'textured';
}).catch(error => {
  console.warn('Textured clerk could not load; using procedural fallback.', error);
  document.body.dataset.clerkModel = 'fallback';
});

/* ---------- 墙面证书 ---------- */
[-1.2, -0.55, 0.1].forEach((x, i) => {
  const f = box(0.52, 0.38, 0.05, i === 0 ? M.accent : M.prop, x, 1.72, -1.96, props);
  f.userData.station = 'wall';
  f.userData.root = f;
  pickables.push(f);
});
labels.push({ el: null, text: '学历 / 荣誉 / 技能', anchor: new THREE.Vector3(-0.55, 2.05, -1.88), layer: 'int', station: 'wall' });

/* 证书墙下方的档案矮架，填补后墙空区并保持人物背后的工作区层次。 */
const archive = new THREE.Group();
props.add(archive);
box(1.7, 0.62, 0.34, M.propLo, -0.55, 0.31, -1.78, archive);
for (let i = 0; i < 4; i++) {
  box(0.28, 0.23, 0.24, i === 0 ? M.accent : M.prop,
    -1.15 + i * 0.4, 0.525, -1.7, archive, { edges: false });
}
groupPick(archive, 'wall');

/* ---------- 杂物（密度） ---------- */
box(0.52, 0.4, 0.42, M.propLo, 2.7, 0.2, 1.15, props);
box(0.42, 0.3, 0.34, M.propLo, 2.55, 0.15, 1.55, props);
const plant = new THREE.Group();
plant.position.set(-2.83, 0, 1.45);
props.add(plant);
box(0.34, 0.34, 0.34, M.propLo, 0, 0.17, 0, plant);
const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), M.prop);
leaf.position.y = 0.66; plant.add(leaf);

/* ---------- 满铺货架 + 前场陈列 ---------- */
shelfUnit(-2.52, -1.82, 1.4, 2.0, 0, 4);
shelfUnit(3.0, -0.48, 1.45, 2.0, Math.PI / 2, 4);

const displayCase = new THREE.Group();
displayCase.position.set(1.22, 0, 1.18);
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
groupPick(displayCase, 'vending');

const runner = new THREE.Mesh(
  new THREE.PlaneGeometry(2.2, 1.35),
  new THREE.MeshBasicMaterial({ color: 0xc18a55, transparent: true, opacity: 0.2 })
);
runner.rotation.x = -Math.PI / 2;
runner.position.set(-0.15, 0.015, 0.35);
shell.add(runner);

/* ---------- 店面（外景时显示） ---------- */
// 墙体分段（留出窗与门洞）
box(0.45, 2.65, 0.12, M.wall, -2.98, 1.325, 2.06, facade);   // 左
box(1.5, 0.9, 0.12, M.wall, -2.0, 0.45, 2.06, facade);       // 窗下
box(1.5, 0.65, 0.12, M.wall, -2.0, 2.325, 2.06, facade);     // 窗上
box(0.36, 2.65, 0.12, M.wall, -1.07, 1.325, 2.06, facade);   // 窗与门之间
box(0.96, 0.49, 0.12, M.wall, -0.42, 2.405, 2.06, facade);   // 门上
box(3.14, 2.65, 0.12, M.wall, 1.63, 1.325, 2.06, facade);    // 门右
// 窗玻璃（暖光）
const winGlass = box(1.46, 1.06, 0.04, M.glowSoft, -2.0, 1.45, 2.0, facade, { edges: false });
winGlass.userData.station = 'window'; winGlass.userData.root = winGlass;
pickables.push(winGlass);
labels.push({ el: null, text: '开放窗', anchor: new THREE.Vector3(-2.0, 2.08, 2.0), layer: 'ext', station: 'window' });
// 门（可开合）
const doorPivot = new THREE.Group();
doorPivot.position.set(-0.9, 0, 2.0);
facade.add(doorPivot);
const doorMesh = box(0.96, 2.16, 0.06, M.propLo, 0.48, 1.08, 0, doorPivot);
box(0.88, 1.85, 0.02, M.glowSoft, 0.48, 1.12, 0.04, doorPivot, { edges: false });
/* 整扇门（门框 + 玻璃）都能点，点到中间发光的部分也算 */
doorPivot.traverse(o => {
  if (o.isMesh) { o.userData.station = 'door'; o.userData.root = doorPivot; }
});
pickables.push(doorPivot);
labels.push({ el: null, text: '玻璃门', anchor: new THREE.Vector3(-0.42, 2.28, 2.0), layer: 'ext', station: 'door' });
// 雨棚 + 招牌
box(2.6, 0.12, 0.72, M.propLo, -1.7, 2.15, 2.4, facade, { edges: true });
const facadeSign = makeSign('灵感补给站 · 24H', 2.4, 0.56);
facadeSign.position.set(1.63, 2.28, 2.135);
facade.add(facadeSign);

/* ---------- 街道 ---------- */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), M.floor);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.03, 8.0);
street.add(ground);
box(6.4, 0.16, 0.35, M.propLo, 0, 0.08, 2.36, street); // 路缘
// 路灯
const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 4.2, 10), M.metal);
post.position.set(-3.35, 2.1, 3.85); street.add(post);
const arm = box(1.4, 0.08, 0.08, M.metal, -2.7, 4.12, 3.85, street, { edges: false });
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), M.glow);
bulb.position.set(-2.05, 3.98, 3.85); street.add(bulb);
const lampLight = new THREE.PointLight(0xffc98a, 2.2, 12, 2);
lampLight.position.set(-2.05, 3.9, 3.85); street.add(lampLight);
// 路牌
const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.0, 8), M.metal);
signPost.position.set(-4.25, 1.5, 4.55); street.add(signPost);
const roadSign = makeSign('设计路 07 →', 1.05, 0.4, '#22302a', '#cfe8d6', 46);
roadSign.position.set(-4.25, 2.9, 4.58);
street.add(roadSign);

/* ---------- 机位 ---------- */
const stations = {
  /* 外景：站在路边平视，像路过一家便利店 */
  street:   { pos: [0.25, 1.5, 6.05],  target: [-0.35, 1.14, 1.76], ext: true },
  window:   { pos: [-1.75, 1.48, 3.55], target: [-1.75, 1.18, 1.76], ext: true },
  door:     { pos: [-0.4, 1.48, 3.55], target: [-0.4, 1.08, 1.76], ext: true },
  /* 进门后默认站在门内右侧，斜向看完整店铺。 */
  inside:   { pos: [3.2, 3.1, 3.85], target: [0, 0.82, -0.45], ext: false },
  /* 正视售货机，完整展示五层货架，方便逐层挑选作品。 */
  vending:  { pos: [1.5 * MODEL_SCALE, 1.36, 0.9], target: [1.5 * MODEL_SCALE, 0.9, -1.48 * MODEL_SCALE], ext: false },
  counter:  { pos: [-0.15, 1.38, 1.62], target: [-1.5, 0.7, 0.75], ext: false },
  clerk:    { pos: [-1.65, 1.42, 2.6],  target: [-1.65, 1.08, -0.02], ext: false },
  badge:    { pos: [-1.62, 1.16, 1.82], target: [-1.82, 0.74, 0.79], ext: false },
  wall:     { pos: [-0.2, 1.5, 0.5], target: [-0.55, 1.4, -1.62], ext: false },
  register: { pos: [-0.18, 1.25, 1.62], target: [-0.84, 0.98, 0.88], ext: false },
  notebook: { pos: [-1.08, 1.2, 1.52], target: [-2.08, 0.76, 0.84], ext: false }
};

let mode = 'inside';
let tween = null;
let current = 'inside';
const orbit = { yaw: 0, pitch: 0 };

function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function applyMode(isExt) {
  facade.visible = isExt;
  labels.forEach(l => { if (l.el) l.el.style.opacity = l.layer === (isExt ? 'ext' : 'int') ? '' : '0'; });
}

function go(name, opts = {}) {
  const st = stations[name];
  if (!st) return;
  current = name;
  outline.visible = false;
  orbit.yaw = 0; orbit.pitch = 0;
  document.body.dataset.station = name;
  const isExt = !!st.ext;
  applyMode(isExt);
  document.body.dataset.mode = isExt ? 'ext' : 'int';
  const navStation = name === 'register' || name === 'notebook' || name === 'badge' ? 'counter' : name;
  document.querySelectorAll('.st').forEach(b => b.classList.toggle('is-active', b.dataset.go === navStation));
  backBtn.classList.toggle('is-on', name !== 'inside');
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
    const visibleLayer = l.layer === (facade.visible ? 'ext' : 'int');
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
function showBubble(text, anchor) {
  bubbleEl.innerHTML = text;
  const v = anchor.clone().multiplyScalar(MODEL_SCALE).project(camera);
  const x = (v.x * 0.5 + 0.5) * W;
  const y = (-v.y * 0.5 + 0.5) * H;
  bubbleEl.style.left = x + 'px';
  bubbleEl.style.top = (y - 10) + 'px';
  bubbleEl.classList.add('is-on');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(hideBubble, 3600);
}
function hideBubble() { bubbleEl.classList.remove('is-on'); }

/* ---------- 开门：只播一次，播完自动进店 ---------- */
let doorBusy = false;
function enterThroughDoor() {
  if (doorBusy) return;
  doorBusy = true;

  // 先站到门口，门板绕合页转开（只转门板，不转门框）
  go('door', { dur: 0.45 });
  const t0 = performance.now();
  const open = now => {
    const k = Math.min(1, (now - t0) / 600);
    const e = 1 - Math.pow(1 - k, 3);
    doorPivot.rotation.y = -e * 1.75;
    if (k < 1) requestAnimationFrame(open);
  };
  requestAnimationFrame(open);

  // 门开到一半开始压黑，黑场里切到店内，外墙/街道全部收起
  setTimeout(() => fadeEl.classList.add('is-on'), 380);
  setTimeout(() => {
    doorPivot.rotation.y = 0;
    facade.visible = false;
    applyMode(false);
    go('inside', { dur: 0.01 });
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
    if (!facade.visible) {
      let n = h.object;
      let inFacade = false;
      while (n) { if (n === facade) { inFacade = true; break; } n = n.parent; }
      if (inFacade) continue;
    }
    const root = rootOf(h.object);
    if (root) return root;
  }
  return null;
}

const canvas = renderer.domElement;
let drag = null;
let downAt = null;

canvas.addEventListener('pointerdown', e => {
  drag = { x: e.clientX, y: e.clientY, moved: false };
  downAt = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
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
  const wasDrag = drag && drag.moved;
  const travel = downAt ? Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) : 0;
  drag = null;
  downAt = null;
  /* 位移超过 6px 一律当拖拽，不触发点击，免得转完视角误跳到某个物件 */
  if (wasDrag || travel > 6) return;
  const hit = hitAt(e.clientX, e.clientY);
  if (!hit) return;
  const station = hit.userData.station;
  if (station === 'window') {
    go('window');
    setTimeout(() => showBubble('<b>店员：</b>欢迎来到我的灵感便利店 ✦', new THREE.Vector3(-2.75, 2.3, 3.1)), 900);
  } else if (station === 'door') {
    enterThroughDoor();
  } else {
    go(station);
    if (station === 'badge') setTimeout(() => showBubble('<b>工牌：</b>姓名 / 职位 / 联系方式（待接入）', new THREE.Vector3(-2.12, 1.12, 0.92)), 900);
  }
});
canvas.addEventListener('pointerleave', () => { outline.visible = false; drag = null; });

/* ---------- HUD ---------- */
document.querySelectorAll('.st').forEach(b => {
  b.addEventListener('click', () => {
    if (b.dataset.go === 'door') enterThroughDoor();
    else go(b.dataset.go);
  });
});
backBtn.addEventListener('click', () => go(facade.visible ? 'street' : 'inside'));
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') go(facade.visible ? 'street' : 'inside');
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

  camera.lookAt(camTarget);
  updateLabels();
  renderer.render(scene, camera);
}

/* ---------- 初始化 ---------- */
function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  frame.style.setProperty('--s', s.toFixed(5));
  camera.aspect = W / H;
  camera.fov = CAMERA_FOV;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
}
window.addEventListener('resize', resize);

const query = new URLSearchParams(location.search);
if (query.has('embed')) document.body.dataset.embed = '1';
const asked = query.get('shot');
const startName = asked && stations[asked] ? asked : 'street';
const startStation = stations[startName];
camera.position.set(...startStation.pos);
camTarget.set(...startStation.target);
applyMode(!!startStation.ext);
document.body.dataset.mode = startStation.ext ? 'ext' : 'int';
resize();
render();
setTimeout(() => loader.classList.add('is-off'), 350);
setTimeout(() => loader.remove(), 1200);
if (asked && stations[asked]) {
  setTimeout(() => go(asked, { dur: 0.01 }), 120);
} else {
  setTimeout(() => go('inside', { dur: 1.6 }), 900);
}
