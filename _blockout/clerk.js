import * as THREE from './three.module.min.js';

const C = {
  skin: 0xF2C8B7,
  skinLight: 0xF7D8C8,
  hairBlack: 0x17171D,
  hairTeal: 0x1E8792,
  hairTealLight: 0x4FB7BF,
  jacket: 0x17171B,
  sleeve: 0x273A31,
  gold: 0xD9A640,
  white: 0xEEE9E1,
  pants: 0x121216,
  silver: 0xBFC4C8,
  eye: 0x8F4D22,
  mouth: 0xD6634A
};

function material(color, roughness = 0.72, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const MAT = {
  skin: material(C.skin, 0.82),
  skinLight: material(C.skinLight, 0.78),
  hairBlack: material(C.hairBlack, 0.63),
  hairTeal: material(C.hairTeal, 0.56),
  hairTealLight: material(C.hairTealLight, 0.52),
  jacket: material(C.jacket, 0.74),
  sleeve: material(C.sleeve, 0.8),
  gold: material(C.gold, 0.45, 0.45),
  white: material(C.white, 0.7),
  pants: material(C.pants, 0.88),
  silver: material(C.silver, 0.32, 0.72),
  eye: material(C.eye, 0.36),
  mouth: material(C.mouth, 0.68),
  badgePink: material(0xFF69B4, 0.48, 0.08),
  lens: new THREE.MeshStandardMaterial({
    color: 0xB86D32,
    roughness: 0.2,
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  })
};

function roundedRectShape(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

function roundedPanel(width, height, depth, radius, mat) {
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape(width, height, radius), {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: Math.min(radius * 0.24, 0.009),
    bevelThickness: Math.min(depth * 0.28, 0.006),
    curveSegments: 10
  });
  geometry.center();
  return new THREE.Mesh(geometry, mat);
}

function ellipsoid(radius, mat, sx = 1, sy = 1, sz = 1, widthSegments = 24, heightSegments = 18) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, widthSegments, heightSegments), mat);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

function cylinderBetween(start, end, radius, mat, segments = 12) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function roundedFrame(width, height, radius, thickness, depth, mat) {
  const outer = roundedRectShape(width, height, radius);
  const hole = new THREE.Path();
  const iw = width - thickness * 2;
  const ih = height - thickness * 2;
  const ir = Math.max(0.01, radius - thickness);
  const x = -iw / 2;
  const y = -ih / 2;

  /* 顺时针内孔，避免 ExtrudeGeometry 把镜片区域也填满。 */
  hole.moveTo(x + ir, y);
  hole.quadraticCurveTo(x, y, x, y + ir);
  hole.lineTo(x, y + ih - ir);
  hole.quadraticCurveTo(x, y + ih, x + ir, y + ih);
  hole.lineTo(x + iw - ir, y + ih);
  hole.quadraticCurveTo(x + iw, y + ih, x + iw, y + ih - ir);
  hole.lineTo(x + iw, y + ir);
  hole.quadraticCurveTo(x + iw, y, x + iw - ir, y);
  hole.lineTo(x + ir, y);
  outer.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.003,
    bevelThickness: 0.003,
    curveSegments: 12
  });
  geometry.center();
  return new THREE.Mesh(geometry, mat);
}

function addHairLock(parent, mat, x, y, z, length, radius, rz = 0, rx = 0, ry = 0) {
  const lock = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 8, 1, false), mat);
  lock.position.set(x, y, z);
  lock.rotation.set(rx, ry, Math.PI + rz);
  parent.add(lock);
  return lock;
}

function makeBadgeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#453849');
  gradient.addColorStop(0.55, '#2B2431');
  gradient.addColorStop(1, '#17141C');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,105,180,.55)';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(260, 128, 125, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#2A1D27';
  ctx.beginPath();
  ctx.arc(42, 46, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FF69B4';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#FFB3D1';
  ctx.font = '700 28px -apple-system, "PingFang SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('晨', 42, 47);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#F5E9F2';
  ctx.font = '700 18px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText('陈芷曦设计工作室', 78, 38);
  ctx.fillStyle = '#C9A8BC';
  ctx.font = '600 11px -apple-system, sans-serif';
  ctx.fillText('ZHI XI DESIGN', 78, 57);

  ctx.strokeStyle = 'rgba(245,233,242,.16)';
  ctx.beginPath();
  ctx.moveTo(26, 84);
  ctx.lineTo(294, 84);
  ctx.stroke();

  ctx.fillStyle = '#1A171D';
  ctx.beginPath();
  ctx.arc(88, 188, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FF69B4';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#F2C8B7';
  ctx.beginPath();
  ctx.arc(88, 178, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#15151A';
  ctx.beginPath();
  ctx.arc(88, 164, 32, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1E8792';
  ctx.beginPath();
  ctx.arc(64, 172, 16, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#F5E9F2';
  ctx.font = '800 30px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText('陈芷曦', 164, 170);
  ctx.fillStyle = '#C9A8BC';
  ctx.font = '600 16px -apple-system, sans-serif';
  ctx.fillText('ZHIXI CHEN', 164, 202);

  ctx.fillStyle = '#FF8FC8';
  ctx.font = '800 28px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText('设计部', 28, 298);
  ctx.fillStyle = '#F5E9F2';
  ctx.font = '600 18px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText('UI 设计师', 28, 330);

  ctx.fillStyle = '#FF69B4';
  ctx.font = '700 15px -apple-system, sans-serif';
  ctx.fillText('✦  ✦  ✦  ✦', 28, 404);
  ctx.fillStyle = '#C9A8BC';
  ctx.textAlign = 'right';
  ctx.font = '600 14px "SFMono-Regular", Consolas, monospace';
  ctx.fillText('NO.072', 292, 404);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function addBadge(root, withCord = true) {
  const badge = new THREE.Group();
  badge.position.set(0.17, 1.11, 0.58);
  badge.rotation.z = -0.03;
  badge.scale.setScalar(0.85);
  root.add(badge);

  const badgeRim = roundedPanel(0.202, 0.296, 0.018, 0.02, MAT.badgePink);
  badge.add(badgeRim);

  const card = roundedPanel(0.188, 0.282, 0.024, 0.018, MAT.jacket);
  card.position.z = 0.008;
  badge.add(card);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.17, 0.252),
    new THREE.MeshBasicMaterial({
      map: makeBadgeTexture(),
      toneMapped: false,
      side: THREE.DoubleSide
    })
  );
  face.position.z = 0.026;
  badge.add(face);

  const clip = roundedPanel(0.064, 0.032, 0.018, 0.006, MAT.silver);
  clip.position.set(0, 0.15, 0.004);
  badge.add(clip);

  if (withCord) {
    const cordMat = material(0xE8D8E1, 0.72);
    const leftCord = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.15, 1.42, -0.05),
      new THREE.Vector3(-0.07, 1.27, 0.12),
      new THREE.Vector3(0.12, 1.22, 0.57)
    ]);
    const rightCord = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.15, 1.42, -0.05),
      new THREE.Vector3(0.11, 1.27, 0.12),
      new THREE.Vector3(0.22, 1.22, 0.57)
    ]);
    root.add(
      new THREE.Mesh(new THREE.TubeGeometry(leftCord, 20, 0.008, 6, false), cordMat),
      new THREE.Mesh(new THREE.TubeGeometry(rightCord, 20, 0.008, 6, false), cordMat)
    );
  }
  return badge;
}

function addFaceAndHair(root) {
  const head = ellipsoid(0.275, MAT.skin, 1, 1.02, 0.88, 32, 24);
  head.position.set(0, 1.68, 0.015);
  root.add(head);

  const hairBack = ellipsoid(0.3, MAT.hairBlack, 1.04, 0.78, 0.78, 28, 22);
  hairBack.position.set(0, 1.82, -0.09);
  root.add(hairBack);

  const tealBack = ellipsoid(0.24, MAT.hairTeal, 1.18, 1.42, 0.74, 24, 18);
  tealBack.position.set(0, 1.48, -0.11);
  root.add(tealBack);

  [-0.235, -0.16, -0.08, 0.08, 0.16, 0.235].forEach((x, i) => {
    addHairLock(root, i % 2 ? MAT.hairTeal : MAT.hairTealLight,
      x, 1.38 - Math.abs(x) * 0.35, -0.03, 0.62 - Math.abs(x) * 0.45,
      0.075 + Math.abs(x) * 0.05, x < 0 ? 0.16 : -0.16);
  });

  [-0.245, 0.245].forEach(x => {
    addHairLock(root, MAT.hairBlack, x, 1.64, 0.06, 0.44, 0.095, x < 0 ? -0.12 : 0.12, 0.05);
    addHairLock(root, MAT.hairTeal, x * 0.92, 1.44, 0.1, 0.68, 0.082, x < 0 ? -0.2 : 0.2, 0.04);
    addHairLock(root, MAT.hairTealLight, x * 1.05, 1.38, 0.11, 0.57, 0.055, x < 0 ? -0.24 : 0.24, 0.03);
  });

  [-0.2, -0.1, 0, 0.1, 0.2].forEach((x, i) => {
    addHairLock(root, i % 2 ? MAT.hairTeal : MAT.hairBlack,
      x, 1.9, 0.16, 0.26, 0.068, x * 1.35, -0.08, 0.05);
  });

  [-0.11, 0, 0.11].forEach((x, i) => {
    addHairLock(root, i === 1 ? MAT.hairTeal : MAT.hairBlack,
      x, 1.86, 0.215, 0.22, 0.052, x * 1.35, -0.12, 0);
  });

  [-0.305, 0.305].forEach(x => {
    const ear = ellipsoid(0.065, MAT.skinLight, 0.62, 1, 0.72, 16, 12);
    ear.position.set(x, 1.66, 0.02);
    root.add(ear);
    for (let i = 0; i < 3; i++) {
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), MAT.silver);
      stud.position.set(x + (x < 0 ? -0.012 : 0.012), 1.69 - i * 0.045, 0.058);
      root.add(stud);
    }
  });

  [-0.105, 0.105].forEach(x => {
    const eye = ellipsoid(0.033, MAT.eye, 0.72, 1.12, 0.28, 16, 12);
    eye.position.set(x, 1.685, 0.252);
    root.add(eye);
  });

  [-0.11, 0.11].forEach(x => {
    const frame = roundedFrame(0.205, 0.145, 0.035, 0.018, 0.026, MAT.hairBlack);
    frame.position.set(x, 1.685, 0.264);
    root.add(frame);

    const lens = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(0.168, 0.108, 0.025)), MAT.lens);
    lens.position.set(x, 1.685, 0.249);
    root.add(lens);
  });

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.018, 0.028), MAT.hairBlack);
  bridge.position.set(0, 1.7, 0.267);
  root.add(bridge);

  [-0.225, 0.225].forEach(x => {
    const temple = cylinderBetween(
      [x, 1.69, 0.24],
      [x * 1.14, 1.68, 0.03],
      0.009,
      MAT.hairBlack,
      8
    );
    root.add(temple);
  });

  const nose = ellipsoid(0.027, MAT.skinLight, 0.8, 0.8, 0.62, 12, 10);
  nose.position.set(0, 1.61, 0.257);
  root.add(nose);

  const smileCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.035, 1.54, 0.252),
    new THREE.Vector3(0, 1.52, 0.262),
    new THREE.Vector3(0.035, 1.54, 0.252)
  );
  root.add(new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 12, 0.005, 6, false), MAT.mouth));

  /* 店员站在暖光边缘，补一盏很弱的面光照亮脸和工牌。 */
  const faceFill = new THREE.PointLight(0xffd7c8, 0.48, 2.8, 2);
  faceFill.position.set(0.2, 1.72, 0.95);
  root.add(faceFill);
}

function addBody(root) {
  const hip = roundedPanel(0.43, 0.24, 0.28, 0.1, MAT.pants);
  hip.position.set(0, 0.78, 0);
  root.add(hip);

  [-0.16, 0.16].forEach(x => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.34, 6, 12), MAT.pants);
    leg.position.set(x, 0.53, 0);
    root.add(leg);

    const shoe = roundedPanel(0.21, 0.16, 0.36, 0.075, MAT.white);
    shoe.position.set(x, 0.11, 0.065);
    root.add(shoe);
  });

  const jacket = roundedPanel(0.48, 0.59, 0.31, 0.13, MAT.jacket);
  jacket.position.set(0, 1.08, 0);
  root.add(jacket);

  const shirt = roundedPanel(0.16, 0.37, 0.035, 0.035, MAT.white);
  shirt.position.set(0, 1.1, 0.17);
  root.add(shirt);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.077, 0.083, 0.12, 14), MAT.skin);
  neck.position.set(0, 1.42, 0.01);
  root.add(neck);

  [-1, 1].forEach(side => {
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.35, 6, 12), MAT.sleeve);
    sleeve.position.set(side * 0.285, 1.08, 0.015);
    sleeve.rotation.z = side * -0.09;
    root.add(sleeve);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.067, 16, 12), MAT.skin);
    hand.position.set(side * 0.315, 0.82, 0.04);
    root.add(hand);

    [0.88, 0.93].forEach(y => {
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.009, 6, 18), MAT.gold);
      cuff.position.set(side * 0.3, y, 0.02);
      cuff.rotation.x = Math.PI / 2;
      root.add(cuff);
    });

    const sleeveStripe = cylinderBetween(
      [side * 0.31, 1.26, 0.08],
      [side * 0.3, 0.89, 0.08],
      0.007,
      MAT.gold,
      8
    );
    root.add(sleeveStripe);
  });

  [-1, 1].forEach(side => {
    const collar = cylinderBetween(
      [side * 0.155, 1.37, 0.16],
      [side * 0.055, 1.23, 0.205],
      0.011,
      MAT.gold,
      8
    );
    root.add(collar);
  });

  for (let i = 0; i < 3; i++) {
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), MAT.silver);
    button.position.set(0.045, 1.25 - i * 0.115, 0.192);
    root.add(button);
  }

  [-0.14, 0.14].forEach(x => {
    const pocket = roundedPanel(0.055, 0.17, 0.018, 0.006, MAT.gold);
    pocket.position.set(x, 0.91, 0.18);
    pocket.rotation.z = x < 0 ? -0.1 : 0.1;
    root.add(pocket);
  });

  [0.72, 0.69].forEach(y => {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.013, 0.012), MAT.gold);
    band.position.set(0, y, 0.17);
    root.add(band);
  });

  /* 左袖上的金色连环纹样，对应三视图中的棒球夹克装饰。 */
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 16), MAT.gold);
    ring.position.set(-0.31, 1.15 - i * 0.065, 0.09);
    root.add(ring);
  }
}

export function createClerk() {
  const root = new THREE.Group();
  root.name = 'clerk-chen-zhixi';
  const body = new THREE.Group();
  body.name = 'procedural-clerk-fallback';
  addBody(body);
  addFaceAndHair(body);
  root.add(body);
  root.userData.body = body;
  return root;
}

export function createTableBadge() {
  const root = new THREE.Group();
  root.name = 'table-badge';
  const badge = addBadge(root, false);
  badge.position.set(0, 0, 0);
  badge.scale.setScalar(1);
  root.rotation.set(-Math.PI / 2, 0, 0.08);
  root.userData.card = badge;
  return root;
}
