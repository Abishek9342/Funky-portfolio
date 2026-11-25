import { use, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { isPhone, posterMode, reducedMotion, store } from '../store';
import { rng } from './noise';
import { cursor } from './cursor';
import { useViewport } from './materials';

/**
 * The name as a monument of stone dust: ~30k GPU points sampled from the Syncopate glyphs.
 *  - intro: grains fly in from the mist and lock into the letters (staggered, 3.4 s)
 *  - cursor: grains near the pointer are pushed and swirled away and burn amber (bloom catches them)
 *  - scroll: as the camera rises the letters blow away upward like ash, and re-form on the way back
 * Everything is in the vertex shader; the CPU only updates a handful of uniforms per frame.
 */

let fontPromise: Promise<void> | null = null;
function fontReady() {
  fontPromise ??= (async () => {
    const f = new FontFace('SyncopateDust', 'url(/fonts/syncopate-700-latin.woff2)', { weight: '700' });
    await f.load();
    document.fonts.add(f);
  })();
  return fontPromise;
}

/** Sample `count` points inside the rendered glyphs; returns local positions centred on the text, in world units. */
function sampleText(text: string, fontSize: number, count: number, seed: number) {
  const px = 200;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const font = `700 ${px}px SyncopateDust`;
  ctx.font = font;
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px * 0.08}px`;
  const w = Math.ceil(ctx.measureText(text).width + px);
  const h = Math.ceil(px * 1.6);
  c.width = w;
  c.height = h;
  ctx.font = font;
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px * 0.08}px`;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, px / 2, h / 2);
  const data = ctx.getImageData(0, 0, w, h).data;
  const filled: number[] = [];
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 140) {
        filled.push(x, y);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const k = fontSize / px;
  const R = rng(seed);
  const pos = new Float32Array(count * 3);
  const n = filled.length / 2;
  for (let i = 0; i < count; i++) {
    const j = Math.floor(R() * n) * 2;
    pos[i * 3] = (filled[j] + R() - cx) * k;
    pos[i * 3 + 1] = -(filled[j + 1] + R() - cy) * k;
    pos[i * 3 + 2] = (R() - 0.5) * fontSize * 0.09;
  }
  return pos;
}

const VS = /* glsl */ `
attribute vec4 aRand;
attribute vec3 aFrom;
uniform float uTime, uAssemble, uDissolve, uEnergy, uSize, uScale, uRadius;
uniform vec3 uMouse;
uniform vec2 uMouseVel;
varying float vAlpha;
varying float vHeat;
varying float vSpark;
void main() {
  vec3 p = position;
  float t = uTime;
  // the stone breathes: tiny per-grain drift
  p += uSize * 0.45 * vec3(sin(t * 1.3 + aRand.x * 40.0), cos(t * 1.1 + aRand.y * 40.0), sin(t * 0.8 + aRand.z * 40.0));

  // intro: staggered flight from the mist into the letters
  float a = clamp(uAssemble * 1.7 - aRand.w * 0.7, 0.0, 1.0);
  a = 1.0 - pow(1.0 - a, 3.0);
  vec3 from = aFrom + vec3(sin(t * 0.6 + aRand.x * 9.0), cos(t * 0.5 + aRand.y * 9.0), 0.0) * 0.6;
  p = mix(from, p, a);

  // cursor: push out + swirl + drag with the pointer's motion, and lift toward the camera
  vec2 d = p.xy - uMouse.xy;
  float r2 = dot(d, d);
  float f = exp(-r2 / (uRadius * uRadius)) * uEnergy;
  vec2 dir = d * inversesqrt(r2 + 1e-4);
  vec2 tang = vec2(-dir.y, dir.x);
  p.xy += dir * f * uRadius * (0.45 + aRand.x * 0.7)
        + tang * f * uRadius * (aRand.y - 0.5) * 1.1
        + uMouseVel * f * 0.18 * aRand.z;
  p.z += f * uRadius * (aRand.z * 1.4 - 0.3);

  // scroll: letters blow away upward like ash
  float dz = clamp(uDissolve * 1.6 - aRand.w * 0.6, 0.0, 1.0);
  dz *= dz;
  p += vec3((aRand.x - 0.5) * 12.0 + sin(t * 0.7 + aRand.y * 30.0) * 1.5, 2.0 + aRand.y * 18.0, (aRand.z - 0.5) * 12.0) * dz;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float sz = uSize * (0.55 + aRand.z * 0.9) * (1.0 + f * 0.9);
  gl_PointSize = max(sz * uScale / -mv.z, 1.0);
  vAlpha = (0.35 + 0.65 * a) * (1.0 - dz) * smoothstep(0.0, 0.08, uAssemble);
  vHeat = f;
  vSpark = step(0.955, aRand.y) * (0.5 + 0.5 * sin(t * 2.6 + aRand.x * 60.0));
}`;

const FS = /* glsl */ `
uniform vec3 uColor, uHot;
uniform float uOpacity, uHotOn;
varying float vAlpha;
varying float vHeat;
varying float vSpark;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float m = smoothstep(0.5, 0.12, length(c));
  float h = clamp(vHeat * 1.35 + vSpark * 0.7, 0.0, 1.0) * uHotOn;
  vec3 col = mix(uColor, uHot * (1.6 + 1.8 * h), h);
  float alpha = m * vAlpha * uOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}`;

export function NameDust({ text = 'ABISHEK' }: { text?: string }) {
  use(fontReady());
  const vp = useViewport();
  const { size } = useThree();
  const phone = useMemo(isPhone, []);
  const reduce = useMemo(reducedMotion, []);
  const aspect = size.width / size.height;
  const fontSize = THREE.MathUtils.clamp(4.7 * (aspect / 1.6), 2.6, 4.7);
  const position = useMemo(() => new THREE.Vector3(0, aspect < 1 ? 17.2 : 12.2, -32), [aspect]);
  const count = phone ? 18000 : 46000;

  const geometry = useMemo(() => {
    const pos = sampleText(text, fontSize, count, 5);
    const rand = new Float32Array(count * 4);
    const from = new Float32Array(count * 3);
    const R = rng(11);
    for (let i = 0; i < count; i++) {
      rand.set([R(), R(), R(), R()], i * 4);
      // start scattered through the mist around the letters, mostly below and behind
      const ang = R() * Math.PI * 2;
      const rad = fontSize * (1.2 + R() * 3.2);
      from[i * 3] = pos[i * 3] * 1.4 + Math.cos(ang) * rad;
      from[i * 3 + 1] = pos[i * 3 + 1] + Math.sin(ang) * rad * 0.6 - fontSize * 0.8;
      from[i * 3 + 2] = pos[i * 3 + 2] - fontSize * (0.5 + R() * 2.5);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
    g.setAttribute('aFrom', new THREE.BufferAttribute(from, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), fontSize * 12);
    return g;
  }, [text, fontSize, count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uAssemble: { value: 0 },
          uDissolve: { value: 0 },
          uEnergy: { value: 0 },
          uSize: { value: fontSize * 0.02 },
          uScale: { value: 1000 },
          uRadius: { value: fontSize * 0.5 },
          uMouse: { value: new THREE.Vector3(0, 0, 0) },
          uMouseVel: { value: new THREE.Vector2() },
          uColor: { value: new THREE.Color('#252c33') },
          uHot: { value: new THREE.Color('#ffae66') },
          uOpacity: { value: 0.95 },
          uHotOn: { value: 1 },
        },
        vertexShader: VS,
        fragmentShader: FS,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    [fontSize],
  );

  const state = useRef({ start: -1, mouse: new THREE.Vector3(), prevMouse: new THREE.Vector3(), vel: new THREE.Vector2() });
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const tmpV = useMemo(() => new THREE.Vector2(), []);

  useFrame(({ camera, clock, gl }, delta) => {
    const u = material.uniforms;
    const dt = Math.min(delta, 1 / 20);
    const still = reduce || posterMode();
    u.uTime.value = still ? 0 : clock.elapsedTime;
    // assemble once the canvas is live (instant for poster / reduced motion)
    if (still) u.uAssemble.value = 1;
    else if (store.get().live) {
      if (state.current.start < 0) state.current.start = clock.elapsedTime;
      u.uAssemble.value = THREE.MathUtils.clamp((clock.elapsedTime - state.current.start) / 3.4, 0, 1);
    }
    u.uDissolve.value = THREE.MathUtils.clamp((camera.position.y - 2.6) / 6, 0, 1);
    // the formed name always reads over the stones; once it blows away the ash sits in the scene's depth
    material.depthTest = u.uDissolve.value > 0.2;

    // cursor onto the name's plane (local coords)
    plane.constant = -position.z;
    ray.setFromCamera(cursor.ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) {
      hit.sub(position);
      const s = state.current;
      s.prevMouse.copy(s.mouse);
      s.mouse.lerp(hit, 1 - Math.exp(-dt / 0.05));
      s.vel.lerp(tmpV.set(s.mouse.x - s.prevMouse.x, s.mouse.y - s.prevMouse.y).divideScalar(Math.max(dt, 1e-3)), 1 - Math.exp(-dt / 0.15));
      (u.uMouse.value as THREE.Vector3).copy(s.mouse);
      (u.uMouseVel.value as THREE.Vector2).copy(s.vel).clampLength(0, 40);
    }
    u.uEnergy.value = vp ? 0 : cursor.energy;

    const fov = (camera as THREE.PerspectiveCamera).fov;
    u.uScale.value = (size.height * gl.getPixelRatio() * 0.5) / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    (u.uColor.value as THREE.Color).set(vp ? '#a8a8a8' : '#252c33');
    u.uHotOn.value = vp ? 0 : 1;
  });

  return <points geometry={geometry} material={material} position={position} renderOrder={10} frustumCulled={false} />;
}
