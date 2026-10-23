import * as THREE from './three.module.min.js';


function material(color, roughness = 0.72, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const MAT = {
  jacket: material(0x17171B, 0.74),
  silver: material(0xBFC4C8, 0.32, 0.72),
  badgePink: material(0xFF69B4, 0.48, 0.08)
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

export function createTableBadge() {
  const root = new THREE.Group();
  root.name = 'table-badge';

  const badge = new THREE.Group();
  badge.rotation.z = -0.03;
  root.add(badge);

  badge.add(roundedPanel(0.202, 0.296, 0.018, 0.02, MAT.badgePink));

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

  root.rotation.set(-Math.PI / 2, 0, 0.08);
  root.userData.card = badge;
  return root;
}
