import * as THREE from './three.module.min.js';


const COMPONENT_COUNT = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16
};

const COMPONENT_ARRAY = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array
};

function parseContainer(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const magic = view.getUint32(0, true);
  if (magic !== 0x46546c67) {
    throw new Error('Invalid GLB header');
  }

  let offset = 12;
  let gltf = null;
  let binary = null;
  while (offset < arrayBuffer.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const chunk = new Uint8Array(arrayBuffer, offset + 8, length);
    if (type === 0x4e4f534a) {
      gltf = JSON.parse(new TextDecoder().decode(chunk).replace(/\u0000+$/g, '').trim());
    } else if (type === 0x004e4942) {
      binary = chunk;
    }
    offset += 8 + length;
  }

  if (!gltf || !binary) {
    throw new Error('GLB is missing its JSON or binary chunk');
  }
  return { gltf, binary };
}

function readAccessor(gltf, binary, index) {
  const accessor = gltf.accessors[index];
  const bufferView = gltf.bufferViews[accessor.bufferView];
  const ArrayType = COMPONENT_ARRAY[accessor.componentType];
  const componentCount = COMPONENT_COUNT[accessor.type];
  if (!ArrayType || !componentCount) {
    throw new Error(`Unsupported accessor ${index}`);
  }
  if (accessor.sparse) {
    throw new Error('Sparse accessors are not supported');
  }

  const itemBytes = ArrayType.BYTES_PER_ELEMENT * componentCount;
  const stride = bufferView.byteStride || itemBytes;
  const start = binary.byteOffset + (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  if (stride === itemBytes) {
    return new ArrayType(binary.buffer, start, accessor.count * componentCount);
  }

  const packed = new ArrayBuffer(accessor.count * itemBytes);
  const target = new Uint8Array(packed);
  for (let item = 0; item < accessor.count; item++) {
    const from = item * stride;
    target.set(new Uint8Array(binary.buffer, start + from, itemBytes), item * itemBytes);
  }
  return new ArrayType(packed);
}

function imageFromBlob(blob) {
  if ('createImageBitmap' in window) {
    return createImageBitmap(blob, {
      colorSpaceConversion: 'none',
      premultiplyAlpha: 'none'
    });
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode embedded GLB texture'));
    };
    image.src = url;
  });
}

async function loadTexture(gltf, binary, textureIndex, colorSpace) {
  const textureDef = gltf.textures[textureIndex];
  const imageDef = gltf.images[textureDef.source];
  const bufferView = gltf.bufferViews[imageDef.bufferView];
  const start = bufferView.byteOffset || 0;
  const bytes = binary.slice(start, start + bufferView.byteLength);
  const image = await imageFromBlob(new Blob([bytes], { type: imageDef.mimeType || 'image/png' }));
  const texture = new THREE.Texture(image);
  const sampler = gltf.samplers?.[textureDef.sampler] || {};

  texture.flipY = false;
  texture.colorSpace = colorSpace;
  texture.wrapS = sampler.wrapS === 33071
    ? THREE.ClampToEdgeWrapping
    : sampler.wrapS === 33648 ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
  texture.wrapT = sampler.wrapT === 33071
    ? THREE.ClampToEdgeWrapping
    : sampler.wrapT === 33648 ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
  texture.magFilter = sampler.magFilter === 9728 ? THREE.NearestFilter : THREE.LinearFilter;
  texture.minFilter = sampler.minFilter === 9728
    ? THREE.NearestFilter
    : sampler.minFilter === 9729
      ? THREE.LinearFilter
      : THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = ![9728, 9729].includes(sampler.minFilter);
  texture.needsUpdate = true;
  return texture;
}

async function loadMaterial(gltf, binary, materialIndex) {
  const def = gltf.materials[materialIndex] || {};
  const pbr = def.pbrMetallicRoughness || {};
  const transparent = def.alphaMode === 'BLEND';
  const material = new THREE.MeshStandardMaterial({
    color: pbr.baseColorFactor
      ? new THREE.Color().fromArray(pbr.baseColorFactor.slice(0, 3))
      : 0xffffff,
    roughness: pbr.roughnessFactor ?? 1,
    metalness: pbr.metallicFactor ?? 1,
    side: def.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    opacity: pbr.baseColorFactor?.[3] ?? 1,
    transparent,
    depthWrite: !transparent,
    alphaTest: def.alphaMode === 'MASK' ? (def.alphaCutoff ?? 0.5) : 0
  });
  material.name = def.name || '';

  if (pbr.baseColorTexture) {
    material.map = await loadTexture(
      gltf,
      binary,
      pbr.baseColorTexture.index,
      THREE.SRGBColorSpace
    );
  }
  if (pbr.metallicRoughnessTexture) {
    material.roughnessMap = await loadTexture(
      gltf,
      binary,
      pbr.metallicRoughnessTexture.index,
      THREE.NoColorSpace
    );
    material.metalnessMap = material.roughnessMap;
  }
  if (def.normalTexture) {
    material.normalMap = await loadTexture(
      gltf,
      binary,
      def.normalTexture.index,
      THREE.NoColorSpace
    );
    if (def.normalTexture.scale) material.normalScale.setScalar(def.normalTexture.scale);
  }
  if (def.emissiveFactor) {
    material.emissive = new THREE.Color().fromArray(def.emissiveFactor.slice(0, 3));
    material.emissiveIntensity =
      def.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? 1;
  }
  material.needsUpdate = true;
  return material;
}

async function loadPrimitive(gltf, binary, primitive, materials, materialCache) {
  const geometry = new THREE.BufferGeometry();
  const attributes = primitive.attributes || {};

  for (const [name, accessorIndex] of Object.entries(attributes)) {
    const values = readAccessor(gltf, binary, accessorIndex);
    const count = COMPONENT_COUNT[gltf.accessors[accessorIndex].type];
    const attributeName = {
      POSITION: 'position',
      NORMAL: 'normal',
      TEXCOORD_0: 'uv',
      TEXCOORD_1: 'uv1',
      COLOR_0: 'color'
    }[name];
    if (attributeName) {
      geometry.setAttribute(attributeName, new THREE.BufferAttribute(values, count));
    }
  }

  if (primitive.indices != null) {
    geometry.setIndex(new THREE.BufferAttribute(readAccessor(gltf, binary, primitive.indices), 1));
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  let material;
  if (primitive.material != null) {
    material = materialCache.get(primitive.material);
    if (!material) {
      material = await loadMaterial(gltf, binary, primitive.material);
      materialCache.set(primitive.material, material);
      materials.push(material);
    }
  } else {
    material = new THREE.MeshStandardMaterial();
    materials.push(material);
  }
  return new THREE.Mesh(geometry, material);
}

async function buildNode(gltf, binary, nodeIndex, materials, materialCache) {
  const def = gltf.nodes[nodeIndex];
  const node = new THREE.Group();
  node.name = def.name || `node-${nodeIndex}`;

  if (def.matrix) {
    node.applyMatrix4(new THREE.Matrix4().fromArray(def.matrix));
  } else {
    if (def.translation) node.position.fromArray(def.translation);
    if (def.rotation) node.quaternion.fromArray(def.rotation);
    if (def.scale) node.scale.fromArray(def.scale);
  }

  if (def.mesh != null) {
    for (const primitive of gltf.meshes[def.mesh].primitives) {
      node.add(await loadPrimitive(gltf, binary, primitive, materials, materialCache));
    }
  }
  for (const childIndex of def.children || []) {
    node.add(await buildNode(gltf, binary, childIndex, materials, materialCache));
  }
  return node;
}

export async function loadGlbModel(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url}: HTTP ${response.status}`);
  }

  const { gltf, binary } = parseContainer(await response.arrayBuffer());
  const sceneIndex = gltf.scene ?? 0;
  const sceneDef = gltf.scenes?.[sceneIndex];
  if (!sceneDef) throw new Error('GLB has no default scene');

  const root = new THREE.Group();
  root.name = 'glb-scene';
  const materials = [];
  const materialCache = new Map();
  for (const nodeIndex of sceneDef.nodes || []) {
    root.add(await buildNode(gltf, binary, nodeIndex, materials, materialCache));
  }
  root.userData.glbMaterials = materials;
  return root;
}
