import * as THREE from './three.module.min.js';
import { MeshoptDecoder } from './meshopt_decoder.module.js?v=20261026-perf';


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

function readAccessor(gltf, binary, index, decodedViews) {
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
  const decoded = decodedViews.get(accessor.bufferView);
  const stride = decoded?.byteStride || bufferView.byteStride || itemBytes;
  const start = decoded
    ? decoded.data.byteOffset + (accessor.byteOffset || 0)
    : binary.byteOffset + (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  const source = decoded?.data || binary;
  if (stride === itemBytes) {
    return new ArrayType(source.buffer, start, accessor.count * componentCount);
  }

  const packed = new ArrayBuffer(accessor.count * itemBytes);
  const target = new Uint8Array(packed);
  for (let item = 0; item < accessor.count; item++) {
    const from = item * stride;
    target.set(new Uint8Array(source.buffer, start + from, itemBytes), item * itemBytes);
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

async function readResponseBuffer(response, onProgress) {
  const total = Number(response.headers.get('content-length')) || 0;
  if (!onProgress || !response.body?.getReader) {
    const buffer = await response.arrayBuffer();
    onProgress?.(buffer.byteLength, total || buffer.byteLength);
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress(received, total);
  }
  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  onProgress(received, total || received);
  return buffer.buffer;
}

async function loadTexture(gltf, binary, textureIndex, colorSpace) {
  const textureDef = gltf.textures[textureIndex];
  const sourceIndex = textureDef.source ??
    textureDef.extensions?.EXT_texture_webp?.source;
  const imageDef = gltf.images[sourceIndex];
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

async function loadPrimitive(gltf, binary, primitive, materials, materialCache, decodedViews) {
  const geometry = new THREE.BufferGeometry();
  const attributes = primitive.attributes || {};

  for (const [name, accessorIndex] of Object.entries(attributes)) {
    const values = readAccessor(gltf, binary, accessorIndex, decodedViews);
    const count = COMPONENT_COUNT[gltf.accessors[accessorIndex].type];
    const attributeName = {
      POSITION: 'position',
      NORMAL: 'normal',
      TEXCOORD_0: 'uv',
      TEXCOORD_1: 'uv1',
      COLOR_0: 'color'
    }[name];
    if (attributeName) {
      geometry.setAttribute(
        attributeName,
        new THREE.BufferAttribute(values, count, gltf.accessors[accessorIndex].normalized === true)
      );
    }
  }

  if (primitive.indices != null) {
    geometry.setIndex(new THREE.BufferAttribute(
      readAccessor(gltf, binary, primitive.indices, decodedViews),
      1
    ));
  }
  const positionCount = attributes.POSITION != null
    ? gltf.accessors[attributes.POSITION].count
    : 0;
  if (decodedViews.size && positionCount > 5000 && geometry.getAttribute('normal')) {
    geometry.computeVertexNormals();
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

async function buildNode(gltf, binary, nodeIndex, materials, materialCache, decodedViews) {
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
      node.add(await loadPrimitive(
        gltf, binary, primitive, materials, materialCache, decodedViews
      ));
    }
  }
  for (const childIndex of def.children || []) {
    node.add(await buildNode(gltf, binary, childIndex, materials, materialCache, decodedViews));
  }
  return node;
}

async function decodeMeshoptViews(gltf, binary) {
  const decodedViews = new Map();
  if (!gltf.extensionsUsed?.includes('EXT_meshopt_compression')) return decodedViews;
  await MeshoptDecoder.ready;
  for (let index = 0; index < (gltf.bufferViews?.length || 0); index++) {
    const view = gltf.bufferViews[index];
    const ext = view.extensions?.EXT_meshopt_compression;
    if (!ext) continue;
    if (ext.buffer !== 0) {
      throw new Error('External Meshopt buffers are not supported');
    }
    const compressed = binary.subarray(ext.byteOffset || 0, (ext.byteOffset || 0) + ext.byteLength);
    const decoded = new Uint8Array(ext.count * ext.byteStride);
    MeshoptDecoder.decodeGltfBuffer(
      decoded,
      ext.count,
      ext.byteStride,
      compressed,
      ext.mode,
      ext.filter
    );
    decodedViews.set(index, { data: decoded, byteStride: ext.byteStride });
  }
  return decodedViews;
}

export async function loadGlbModel(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url}: HTTP ${response.status}`);
  }

  const { gltf, binary } = parseContainer(await readResponseBuffer(response, onProgress));
  const decodedViews = await decodeMeshoptViews(gltf, binary);
  const sceneIndex = gltf.scene ?? 0;
  const sceneDef = gltf.scenes?.[sceneIndex];
  if (!sceneDef) throw new Error('GLB has no default scene');

  const root = new THREE.Group();
  root.name = 'glb-scene';
  const materials = [];
  const materialCache = new Map();
  for (const nodeIndex of sceneDef.nodes || []) {
    root.add(await buildNode(gltf, binary, nodeIndex, materials, materialCache, decodedViews));
  }
  root.userData.glbMaterials = materials;
  return root;
}
