import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { isPhone, reducedMotion, store } from '../store';
import { scroll } from '../scroll';
import { rng } from './noise';
import { cursor } from './cursor';

/**
 * Living headings: ONE cloud of stone dust that is every section heading in turn.
 * The HTML <h2 data-dust> elements keep the layout (and stay for SEO / screen readers) but turn transparent
 * (`html.dust-on`); their exact word boxes (DOM Ranges) are rasterised and sampled into points in
 * document pixels. When the nearest heading changes, the dust leaves the old word, streams across the page
 * and rebuilds the new one. The cursor scatters it and makes it burn amber, like the hero name.
 * Points are placed straight into view space at a fixed depth, so 1 point = exact CSS pixel position.
 */

type Shape = { pos: Float32Array; col: Float32Array; cy: number };

const DEPTH = 6;

function measure(el: HTMLElement, count: number, seed: number): Shape | null {
  const box = el.getBoundingClientRect();
  if (box.width < 4 || box.height < 4) return null;
  const pad = 40;
  const W = Math.ceil(box.width + pad * 2), H = Math.ceil(box.height + pad * 2);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const colors: THREE.Color[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement!;
    const cs = getComputedStyle(parent);
    // colour is read from a data attribute set before the text went transparent
    const colStr = parent.dataset.dustColor || cs.color;
    let ci = colors.findIndex((k) => k.getStyle() === new THREE.Color(colStr).getStyle());
    if (ci < 0) ci = colors.push(new THREE.Color(colStr)) - 1;
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgb(${ci + 1}, 255, 0)`; // R channel = colour index
    const upper = cs.textTransform === 'uppercase';
    const text = node.data;
    for (const m of text.matchAll(/\S+/g)) {
      const r = document.createRange();
      r.setStart(node, m.index!);
      r.setEnd(node, m.index! + m[0].length);
      const rect = r.getClientRects()[0];
      if (!rect) continue;
      ctx.fillText(upper ? m[0].toUpperCase() : m[0], rect.left - box.left + pad, rect.top + rect.height / 2 - box.top + pad);
    }
  }
  const data = ctx.getImageData(0, 0, W, H).data;
  const filled: number[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      if (data[o + 3] > 150) filled.push(x, y, data[o] - 1);
    }
  if (!filled.length) return null;
  const R = rng(seed);
  const pos = new Float32Array(count * 2);
  const col = new Float32Array(count * 3);
  const n = filled.length / 3;
  const ox = box.left - pad, oy = box.top + window.scrollY - pad;
  for (let i = 0; i < count; i++) {
    const j = Math.floor(R() * n) * 3;
    pos[i * 2] = ox + filled[j] + R();
    pos[i * 2 + 1] = oy + filled[j + 1] + R();
    const k = colors[Math.max(0, Math.min(colors.length - 1, filled[j + 2]))] ?? new THREE.Color('#eef1f4');
    col.set([k.r, k.g, k.b], i * 3);
  }
  return { pos, col, cy: box.top + window.scrollY + box.height / 2 };
}

const VS = /* glsl */ `
attribute vec2 aFrom, aTo;
attribute vec3 aColF, aColT;
attribute vec4 aRand;
uniform float uTime, uMorph, uScroll, uK, uDepth, uPR, uEnergy, uRadius, uSize, uSpread;
uniform vec2 uRes, uMouse, uMouseVel;
varying vec3 vCol;
varying float vHeat;
varying float vSpark;
void main() {
  float m = clamp(uMorph * 1.6 - aRand.w * 0.6, 0.0, 1.0);
  float e = m * m * (3.0 - 2.0 * m);
  vec2 p = mix(aFrom, aTo, e);
  // in flight: the stream billows sideways and lags, like ash in a draught
  float fly = sin(3.14159 * e);
  p += vec2(sin(uTime * 0.9 + aRand.x * 30.0) * uSpread, cos(uTime * 0.7 + aRand.y * 30.0) * uSpread * 0.5) * fly * (0.25 + aRand.z);
  // at rest the stone breathes
  p += vec2(sin(uTime * 1.3 + aRand.x * 40.0), cos(uTime * 1.1 + aRand.y * 40.0)) * 0.6;
  // cursor scatter + swirl
  vec2 d = p - uMouse;
  float r2 = dot(d, d);
  float f = exp(-r2 / (uRadius * uRadius)) * uEnergy;
  vec2 dir = d * inversesqrt(r2 + 1.0);
  vec2 tg = vec2(-dir.y, dir.x);
  p += dir * f * uRadius * (0.45 + aRand.x * 0.7) + tg * f * uRadius * (aRand.y - 0.5) * 1.1 + uMouseVel * f * 0.04 * aRand.z;
  vec2 s = vec2(p.x, p.y - uScroll);
  vec3 v = vec3((s.x - uRes.x * 0.5) * uK, -(s.y - uRes.y * 0.5) * uK, -uDepth);
  gl_Position = projectionMatrix * vec4(v, 1.0);
  gl_PointSize = 1.4 * uSize * (0.6 + aRand.z * 0.9) * (1.0 + f * 0.9 + fly * 0.4) * uPR;
  vCol = mix(aColF, aColT, e);
  vHeat = max(f, fly * 0.35 * step(0.7, aRand.x));
  vSpark = step(0.96, aRand.y) * (0.5 + 0.5 * sin(uTime * 2.6 + aRand.x * 60.0));
}`;

const FS = /* glsl */ `
uniform vec3 uHot;
uniform float uAlpha;
varying vec3 vCol;
varying float vHeat;
varying float vSpark;
void main() {
  // light core + soft dark rim: reads like the old text-shadow, so light headings hold up over bright mist
  float r = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.34, 0.16, r);
  float rim = smoothstep(0.5, 0.3, r);
  float h = clamp(vHeat * 1.35 + vSpark * 0.6, 0.0, 1.0);
  vec3 col = mix(vec3(0.015, 0.02, 0.03), mix(vCol, uHot * (1.6 + 1.8 * h), h), core);
  float a = mix(rim * 0.4 * (1.0 - h), 1.0, core) * uAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}`;

export function HeadingDust() {
  const phone = useMemo(isPhone, []);
  const reduce = useMemo(reducedMotion, []);
  const count = phone ? 7000 : 16000;
  const { size } = useThree();
  const shapes = useRef<(Shape | null)[]>([]);
  const st = useRef({ active: -1, t0: 0, ready: false, alpha: 0, pendingSwitch: -1 });

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const R = rng(31);
    const rand = new Float32Array(count * 4).map(() => R());
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); // unused, sets draw count
    g.setAttribute('aFrom', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    g.setAttribute('aTo', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    g.setAttribute('aColF', new THREE.BufferAttribute(new Float32Array(count * 3).fill(0.93), 3));
    g.setAttribute('aColT', new THREE.BufferAttribute(new Float32Array(count * 3).fill(0.93), 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uMorph: { value: 1 },
          uScroll: { value: 0 },
          uK: { value: 0.01 },
          uDepth: { value: DEPTH },
          uPR: { value: 1 },
          uEnergy: { value: 0 },
          uRadius: { value: phone ? 50 : 80 },
          uSize: { value: phone ? 1.7 : 2.1 },
          uSpread: { value: phone ? 60 : 120 },
          uRes: { value: new THREE.Vector2(1, 1) },
          uMouse: { value: new THREE.Vector2(-1e4, -1e4) },
          uMouseVel: { value: new THREE.Vector2() },
          uHot: { value: new THREE.Color('#ffae66') },
          uAlpha: { value: 0 },
        },
        vertexShader: VS,
        fragmentShader: FS,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        fog: false,
      }),
    [phone],
  );

  // measure every heading (after fonts, and again on resize)
  useEffect(() => {
    const els = () => [...document.querySelectorAll<HTMLElement>('[data-dust]')];
    // remember each run's real colour before the text goes transparent
    for (const el of els()) {
      for (const n of [el, ...el.querySelectorAll<HTMLElement>('*')]) n.dataset.dustColor ||= getComputedStyle(n).color;
    }
    let timer = 0;
    const run = () => {
      const root = document.documentElement;
      root.classList.add('dust-measuring');
      void root.offsetHeight;
      shapes.current = els().map((el, i) => measure(el, count, 100 + i));
      root.classList.remove('dust-measuring');
      const s = st.current;
      const fa = geometry.getAttribute('aFrom') as THREE.BufferAttribute;
      const ta = geometry.getAttribute('aTo') as THREE.BufferAttribute;
      const cf = geometry.getAttribute('aColF') as THREE.BufferAttribute;
      const ct = geometry.getAttribute('aColT') as THREE.BufferAttribute;
      const first = shapes.current.find(Boolean);
      if (!first) return;
      const target = (s.active >= 0 && shapes.current[s.active]) || first;
      (ta.array as Float32Array).set(target.pos);
      (ct.array as Float32Array).set(target.col);
      (cf.array as Float32Array).set(target.col);
      if (!s.ready) {
        // before the first heading is reached, the dust waits scattered around it
        const R = rng(7);
        const from = fa.array as Float32Array;
        for (let i = 0; i < count; i++) {
          from[i * 2] = target.pos[i * 2] + (R() - 0.5) * size.width * 0.9;
          from[i * 2 + 1] = target.pos[i * 2 + 1] + (R() - 0.2) * 500;
        }
        material.uniforms.uMorph.value = 0;
      } else {
        (fa.array as Float32Array).set(target.pos);
        material.uniforms.uMorph.value = 1;
      }
      for (const a of [fa, ta, cf, ct]) a.needsUpdate = true;
      s.ready = true;
      root.classList.add('dust-on');
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = window.setTimeout(run, 250);
    };
    document.fonts.ready.then(schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    return () => {
      ro.disconnect();
      clearTimeout(timer);
      document.documentElement.classList.remove('dust-on');
    };
  }, [count, geometry, material, size.width]);

  useFrame(({ camera, clock, gl }, delta) => {
    const u = material.uniforms;
    const s = st.current;
    const t = clock.elapsedTime;
    const H = size.height, W = size.width;
    u.uTime.value = reduce ? 0 : t;
    u.uScroll.value = scroll.y;
    (u.uRes.value as THREE.Vector2).set(W, H);
    const fov = (camera as THREE.PerspectiveCamera).fov;
    u.uK.value = (2 * DEPTH * Math.tan(THREE.MathUtils.degToRad(fov / 2))) / H;
    u.uPR.value = gl.getPixelRatio();
    if (!s.ready || !store.get().live) return;

    // which heading is the dust? the nearest one to the viewport centre (within reach)
    const centre = scroll.y + H * 0.5;
    let best = -1, bestD = H * 0.8;
    shapes.current.forEach((sh, i) => {
      if (!sh) return;
      const d = Math.abs(sh.cy - centre);
      if (d < bestD) (bestD = d), (best = i);
    });
    if (best >= 0 && best !== s.active) {
      const next = shapes.current[best]!;
      const fa = geometry.getAttribute('aFrom') as THREE.BufferAttribute;
      const ta = geometry.getAttribute('aTo') as THREE.BufferAttribute;
      const cf = geometry.getAttribute('aColF') as THREE.BufferAttribute;
      const ct = geometry.getAttribute('aColT') as THREE.BufferAttribute;
      const from = fa.array as Float32Array, to = ta.array as Float32Array, cfa = cf.array as Float32Array, cta = ct.array as Float32Array;
      const rnd = geometry.getAttribute('aRand').array as Float32Array;
      const mo = u.uMorph.value as number;
      // freeze where every grain is now, then aim it at the new word
      for (let i = 0; i < count; i++) {
        const m = THREE.MathUtils.clamp(mo * 1.6 - rnd[i * 4 + 3] * 0.6, 0, 1);
        const e = m * m * (3 - 2 * m);
        from[i * 2] += (to[i * 2] - from[i * 2]) * e;
        from[i * 2 + 1] += (to[i * 2 + 1] - from[i * 2 + 1]) * e;
        for (let k = 0; k < 3; k++) cfa[i * 3 + k] += (cta[i * 3 + k] - cfa[i * 3 + k]) * e;
      }
      to.set(next.pos);
      cta.set(next.col);
      for (const a of [fa, ta, cf, ct]) a.needsUpdate = true;
      s.active = best;
      s.t0 = t;
      u.uMorph.value = 0;
    }
    if (s.active >= 0) {
      u.uMorph.value = reduce ? 1 : THREE.MathUtils.clamp((t - s.t0) / 2.2, 0, 1);
      s.alpha = THREE.MathUtils.damp(s.alpha, 1, 2.5, delta);
    }
    u.uAlpha.value = s.alpha;

    // cursor in document pixels
    const mx = ((cursor.ndc.x + 1) / 2) * W, my = ((1 - cursor.ndc.y) / 2) * H + scroll.y;
    (u.uMouse.value as THREE.Vector2).set(mx, my);
    (u.uMouseVel.value as THREE.Vector2).set((cursor.vel.x * W) / 2, (-cursor.vel.y * H) / 2);
    u.uEnergy.value = cursor.energy;
  });

  return <points geometry={geometry} material={material} renderOrder={20} frustumCulled={false} />;
}
