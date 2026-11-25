import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fbm, noise3, ridged, rng } from './noise';

/**
 * A rough stone slab: a subdivided box, rounded toward a superellipsoid, displaced by fbm along the
 * outward direction, with horizontal strata and chipped edges. Vertex colours darken crevices.
 */
export function monolithGeometry(seed: number, w: number, h: number, d: number, seg = 1, rough = 1) {
  const sx = Math.max(4, Math.round(w * 2.2 * seg));
  const sy = Math.max(8, Math.round(h * 1.6 * seg));
  const sz = Math.max(4, Math.round(d * 2.2 * seg));
  let g: THREE.BufferGeometry = new THREE.BoxGeometry(w, h, d, sx, sy, sz);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const o = seed * 17.31;
  const scale = Math.min(w, d);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // taper: top and bottom slightly narrower, broken ends
    const ty = v.y / (h / 2);
    const taper = 1 - 0.18 * rough * Math.abs(ty) ** 3 + 0.08 * rough * fbm(v.y * 0.15 + o, o, 0.3, 3);
    v.x *= taper;
    v.z *= taper;
    dir.set(v.x / (w / 2), v.y / (h / 2) * 0.25, v.z / (d / 2)).normalize();
    const n = fbm(v.x * 0.22 + o, v.y * 0.16, v.z * 0.22 - o, 5);
    const strata = ridged(v.x * 0.05 + o, v.y * 0.55, v.z * 0.05, 3) * 0.55;
    const chip = Math.max(0, noise3(v.x * 0.5 + o, v.y * 0.45, v.z * 0.5) - 0.25) * 2.2;
    const disp = (n * 0.55 + strata * 0.35 - chip * 0.45) * scale * 0.42 * rough;
    v.addScaledVector(dir, disp);
    // ragged broken top/bottom
    if (Math.abs(ty) > 0.92) v.y += Math.sign(ty) * fbm(v.x * 0.4 + o, v.z * 0.4, o, 3) * h * 0.06;
    pos.setXYZ(i, v.x, v.y, v.z);
    const ao = THREE.MathUtils.clamp(0.62 + disp / (scale * 0.42 * rough) * 0.5 + fbm(v.x * 0.9, v.y * 0.9, v.z * 0.9 + o, 3) * 0.25, 0.25, 1);
    colors[i * 3] = ao * 0.93;
    colors[i * 3 + 1] = ao * 0.95;
    colors[i * 3 + 2] = ao;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** Lumpy rock / debris chunk from an icosphere. */
export function rockGeometry(seed: number, r = 1, detail = 3, sharp = 0.6) {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(r, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const o = seed * 9.7;
  const R = rng(seed);
  const stretch = new THREE.Vector3(0.7 + R() * 0.8, 0.6 + R() * 0.9, 0.7 + R() * 0.8);
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = fbm(v.x * 1.2 + o, v.y * 1.2, v.z * 1.2 - o, 4);
    const cut = ridged(v.x * 0.8 + o, v.y * 0.8, v.z * 0.8, 2) * sharp;
    v.multiplyScalar(1 + n * 0.45 - cut * 0.35).multiply(stretch);
    pos.setXYZ(i, v.x, v.y, v.z);
    const c = THREE.MathUtils.clamp(0.7 + n * 0.5, 0.35, 1);
    colors[i * 3] = c * 0.93;
    colors[i * 3 + 1] = c * 0.95;
    colors[i * 3 + 2] = c;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

// ---------- canvas textures (fast: layered upscaled random noise, no per-pixel perlin) ----------

function canvas(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!] as const;
}

/** Draws soft multi-octave noise into ctx using upscaled random tiles. */
function softNoise(ctx: CanvasRenderingContext2D, size: number, seed: number, base = 0.5, octaves = [8, 16, 32, 64, 128]) {
  const R = rng(seed);
  ctx.fillStyle = `rgb(${base * 255},${base * 255},${base * 255})`;
  ctx.fillRect(0, 0, size, size);
  octaves.forEach((cells, k) => {
    const [t, tc] = canvas(cells);
    const img = tc.createImageData(cells, cells);
    for (let i = 0; i < cells * cells; i++) {
      const v = R() * 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    tc.putImageData(img, 0, 0);
    ctx.globalAlpha = 0.42 / (k + 1) ** 0.55;
    ctx.globalCompositeOperation = 'overlay';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(t, 0, 0, size, size);
  });
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/** Cracked wet stone plain: colour map + roughness map (dark = wet puddle = mirror). */
export function groundTextures(size = 1024) {
  const [c, ctx] = canvas(size);
  softNoise(ctx, size, 7, 0.55);
  // cracks: random-walk polylines with branches
  const R = rng(42);
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    let x = R() * size, y = R() * size, a = R() * Math.PI * 2;
    const len = 30 + R() * 120;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < len; s++) {
      a += (R() - 0.5) * 0.7;
      x += Math.cos(a) * 3;
      y += Math.sin(a) * 3;
      ctx.lineTo(x, y);
      if (R() < 0.02) {
        ctx.moveTo(x, y);
        a += (R() - 0.5) * 2.4;
      }
    }
    ctx.strokeStyle = `rgba(20,24,28,${0.35 + R() * 0.4})`;
    ctx.lineWidth = 0.7 + R() * 1.6;
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;

  // roughness: smooth blobs of puddles
  const [rc, rctx] = canvas(size / 2);
  softNoise(rctx, size / 2, 99, 0.62, [4, 8, 16, 32]);
  const img = rctx.getImageData(0, 0, size / 2, size / 2);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = img.data[i] / 255;
    const wet = THREE.MathUtils.smoothstep(v, 0.38, 0.5); // low noise -> puddle (0 = mirror)
    const out = 0.08 + wet * 0.92;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = out * 255;
  }
  rctx.putImageData(img, 0, 0);
  const rough = new THREE.CanvasTexture(rc);
  for (const t of [map, rough]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(7, 7);
    t.anisotropy = 4;
  }
  return { map, rough };
}

/** Soft cloud puff for ground mist / fog banks. */
export function puffTexture(size = 256, seed = 3) {
  const [c, ctx] = canvas(size);
  softNoise(ctx, size, seed, 0.5, [4, 8, 16, 32]);
  const img = ctx.getImageData(0, 0, size, size);
  const h = size / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const d = Math.hypot(x - h, y - h) / h;
      const fall = Math.max(0, 1 - d) ** 1.6;
      const n = img.data[i] / 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.max(0, Math.min(255, fall * (0.35 + n * 0.9) * 255));
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Radial glow (sun through fog). */
export function glowTexture(size = 256, warm = false) {
  const [c, ctx] = canvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const col = warm ? '255,190,120' : '255,255,255';
  g.addColorStop(0, `rgba(${col},1)`);
  g.addColorStop(0.12, `rgba(${col},0.85)`);
  g.addColorStop(0.35, `rgba(${col},0.28)`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Light shaft: bright at the top, fading down and to the sides. */
export function shaftTexture() {
  const [c, ctx] = canvas(128);
  const gx = ctx.createLinearGradient(0, 0, 128, 0);
  gx.addColorStop(0, 'rgba(255,255,255,0)');
  gx.addColorStop(0.5, 'rgba(255,255,255,1)');
  gx.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gx;
  ctx.fillRect(0, 0, 128, 128);
  ctx.globalCompositeOperation = 'destination-in';
  const gy = ctx.createLinearGradient(0, 0, 0, 128);
  gy.addColorStop(0, 'rgba(0,0,0,0.9)');
  gy.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gy;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Blender-like grey clay matcap for Viewport (Solid) mode. */
export function clayMatcap() {
  const [c, ctx] = canvas(256);
  const g = ctx.createRadialGradient(96, 80, 10, 128, 128, 140);
  g.addColorStop(0, '#e6e6e6');
  g.addColorStop(0.5, '#a9a9a9');
  g.addColorStop(1, '#3c3c3c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
