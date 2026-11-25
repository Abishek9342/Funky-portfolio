import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { NameDust } from './NameDust';
import { Wanderer } from './Wanderer';
import { cursor } from './cursor';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { isPhone, reducedMotion } from '../store';
import { clayMaterial, useShaded, useViewport, Wire } from './materials';
import { glowTexture, monolithGeometry, rockGeometry } from './procedural';
import { rng } from './noise';
import { look } from './Rig';
import { rockMaterial, type StoneSet } from './rockMaterial';

/** A floating stone that drifts and slowly turns. */
function Floater({
  geometry,
  position,
  rotation = [0, 0, 0],
  drift = 0.25,
  spin = 0.02,
  seed = 1,
  material,
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  drift?: number;
  spin?: number;
  seed?: number;
  material: THREE.Material;
}) {
  const ref = useRef<THREE.Group>(null);
  const reduce = useMemo(reducedMotion, []);
  const mat = useShaded(material);
  useFrame(({ clock }) => {
    if (!ref.current || reduce) return;
    const t = clock.elapsedTime + seed * 10;
    ref.current.position.y = position[1] + Math.sin(t * 0.32) * drift;
    ref.current.rotation.y = rotation[1] + t * spin;
  });
  return (
    <group ref={ref} position={position} rotation={rotation}>
      <mesh geometry={geometry} material={mat} />
      <Wire geometry={geometry} />
    </group>
  );
}

function Monoliths({ rock }: { rock: StoneSet }) {
  const mat = useMemo(() => rockMaterial({ set: rock, color: '#c3c9cf', scale: 0.16, normalStrength: 1.35, envIntensity: 0.55 }), [rock]);
  const far = useMemo(() => rockMaterial({ set: rock, color: '#b9bfc6', scale: 0.22, normalStrength: 1.1, envIntensity: 0.5 }), [rock]);
  const g = useMemo(
    () => ({
      left: monolithGeometry(3, 7, 30, 6, 2.2, 0.75),
      right: monolithGeometry(8, 8, 34, 7, 2.2, 0.75),
      midA: monolithGeometry(11, 3.2, 12, 2.8, 2, 0.8),
      midB: monolithGeometry(15, 2.6, 9, 2.4, 2, 0.8),
      midC: monolithGeometry(21, 4.5, 15, 3.6, 1.6, 0.8),
      rockA: rockGeometry(4, 2.4, 4),
      rockB: rockGeometry(9, 3.2, 4),
      rockC: rockGeometry(13, 1.8, 4),
      tower: monolithGeometry(31, 6, 60, 6, 0.6, 0.6),
      towerTop: monolithGeometry(33, 4.5, 14, 4.2, 0.8),
    }),
    [],
  );
  return (
    <group>
      {/* the two giants framing the shot, close to camera; left one cut by the frame edge */}
      <Floater geometry={g.left} material={mat} position={[-12.2, 15, 1]} rotation={[0.04, 0.5, 0.09]} drift={0.35} spin={0.006} seed={1} />
      <Floater geometry={g.right} material={mat} position={[11.5, 19, -6]} rotation={[-0.05, -0.3, -0.07]} drift={0.45} spin={-0.005} seed={2} />
      {/* mid-distance floaters framing the name */}
      <Floater geometry={g.midA} material={far} position={[-6.5, 21, -24]} rotation={[0.2, 0.3, 0.35]} seed={3} spin={0.015} />
      <Floater geometry={g.midB} material={far} position={[7.5, 22.5, -36]} rotation={[-0.3, 0.1, -0.5]} seed={4} spin={-0.02} />
      <Floater geometry={g.midC} material={far} position={[-17, 22, -46]} rotation={[0.1, 0.8, 0.15]} seed={5} spin={0.01} />
      <Floater geometry={g.rockA} material={far} position={[4.6, 5.0, -16]} seed={6} spin={0.05} drift={0.4} />
      <Floater geometry={g.rockB} material={far} position={[18, 9, -30]} seed={7} spin={0.03} />
      <Floater geometry={g.rockC} material={far} position={[-4.8, 4.4, -13]} seed={8} spin={0.06} />
      <Floater geometry={g.rockA} material={far} position={[14, 27, -52]} seed={9} spin={0.02} />
      <Floater geometry={g.rockB} material={far} position={[-12, 30, -70]} seed={10} spin={0.02} />
      {/* ruined tower fading in the fog, centre-back */}
      <Floater geometry={g.tower} material={far} position={[1.5, 29, -88]} rotation={[0, 0.3, 0.02]} drift={0} spin={0} seed={11} />
      <Floater geometry={g.towerTop} material={far} position={[2.2, 66, -88]} rotation={[0.15, 0.4, 0.12]} drift={0.6} spin={0.004} seed={12} />
    </group>
  );
}

/** Hundreds of small textured chunks drifting upward between the stones (instanced). */
function Debris({ rock }: { rock: StoneSet }) {
  const phone = useMemo(isPhone, []);
  const reduce = useMemo(reducedMotion, []);
  const count = phone ? 150 : 460;
  const geos = useMemo(() => [rockGeometry(101, 1, 2, 0.9), rockGeometry(202, 1, 2, 0.9), rockGeometry(303, 1, 2, 0.7)], []);
  const base = useMemo(() => rockMaterial({ set: rock, color: '#aab1b8', scale: 0.9, normalStrength: 1.2, envIntensity: 0.45 }), [rock]);
  const mat = useShaded(base);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const data = useMemo(() => {
    const R = rng(77);
    return Array.from({ length: count }, () => {
      const far = R();
      let x = (R() - 0.5) * (30 + far * 40);
      const y = R() * 34;
      const z = 1 - R() * 64;
      if (Math.abs(x) < 13 && y > 8.5 && y < 16 && z < -20 && z > -44) x = Math.sign(x || 1) * (13 + R() * 6);
      return {
        x,
        y,
        z,
        s: 0.05 + R() ** 3 * 0.8,
        v: 0.12 + R() * 0.45,
        r: [R() * 6, R() * 6, R() * 6] as [number, number, number],
        rv: (R() - 0.5) * 0.7,
        geo: Math.floor(R() * 3),
      };
    });
  }, [count]);
  const m = useMemo(() => new THREE.Object3D(), []);
  const tick = (dt: number) => {
    const counters = [0, 0, 0];
    for (const d of data) {
      if (!reduce) {
        d.y += d.v * dt;
        d.r[0] += d.rv * dt;
        d.r[1] += d.rv * 0.7 * dt;
        if (d.y > 38) d.y = -1;
      }
      m.position.set(d.x, d.y, d.z);
      m.rotation.set(...d.r);
      m.scale.setScalar(d.s);
      m.updateMatrix();
      const im = refs.current[d.geo];
      if (im) im.setMatrixAt(counters[d.geo]++, m.matrix);
    }
    refs.current.forEach((im) => im && (im.instanceMatrix.needsUpdate = true));
  };
  useLayoutEffect(() => tick(0));
  useFrame((_, dt) => tick(Math.min(dt, 0.05)));
  const per = [0, 1, 2].map((k) => data.filter((d) => d.geo === k).length);
  return (
    <group>
      {geos.map((g, k) => (
        <instancedMesh key={k} ref={(el) => void (refs.current[k] = el)} args={[g, undefined, per[k]]} material={mat} frustumCulled={false} />
      ))}
    </group>
  );
}

/** Large-scale puddle mask (white = dry/rough, black = wet mirror), tiled at a much lower rate than the rock. */
function puddleTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const R = rng(99);
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 60; i++) {
    const x = R() * size, y = R() * size, r = 14 + R() ** 2 * 54;
    for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, 'rgba(18,18,18,0.95)');
      g.addColorStop(0.55, 'rgba(30,30,30,0.7)');
      g.addColorStop(1, 'rgba(216,216,216,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x + ox, y + oy, r * (1.2 + R()), r, R() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function Ground({ rock, low }: { rock: StoneSet; low: boolean }) {
  const phone = useMemo(isPhone, []);
  const vp = useViewport();
  const plane = useMemo(() => {
    const g = new THREE.PlaneGeometry(360, 760, 1, 1);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -220);
    return g;
  }, []);
  // per-texture UV transforms: rock detail every ~7 m, puddles every ~70 m (no visible repeat)
  const maps = useMemo(() => {
    const map = rock.albedo.clone();
    const normal = rock.normal.clone();
    const puddle = puddleTexture();
    map.repeat.set(52, 110);
    normal.repeat.set(52, 110);
    puddle.repeat.set(5, 11);
    puddle.offset.set(0.37, 0.11);
    for (const t of [map, normal]) t.needsUpdate = true;
    return { map, normal, puddle };
  }, [rock]);
  // Both stay mounted (remounting the reflector after Viewport mode left it white); only visibility flips.
  return (
    <>
      {/* clay sits 1 cm above the reflector so it wins the depth test in Viewport mode */}
      <mesh geometry={plane} material={clayMaterial()} visible={vp} position={[0, 0.01, 0]} />
      <mesh geometry={plane} visible={!vp}>
        <MeshReflectorMaterial
          map={maps.map}
          normalMap={maps.normal}
          normalScale={new THREE.Vector2(0.9, 0.9)}
          roughnessMap={maps.puddle}
          color="#5f666d"
          roughness={1}
          metalness={0.05}
          envMapIntensity={0.6}
          blur={phone || low ? [40, 12] : [90, 26]}
          resolution={phone || low ? 256 : 768}
          mixBlur={0.4}
          mixStrength={1.9}
          mixContrast={1}
          mirror={0.72}
        />
      </mesh>
    </>
  );
}

/** Soft fbm noise texture (tiling) for the fog sheets. */
function fogNoise() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(s, s);
  const R = rng(17);
  const grid = (n: number) => Array.from({ length: n * n }, () => R());
  const layers = [4, 8, 16, 32].map((n) => ({ n, g: grid(n) }));
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      let v = 0, a = 0.5, sum = 0;
      for (const { n, g } of layers) {
        const fx = (x / s) * n, fy = (y / s) * n;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = fx - x0, ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const at = (i: number, j: number) => g[((j % n) + n) % n * n + (((i % n) + n) % n)];
        const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
        const bot = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
        v += (top * (1 - sy) + bot * sy) * a;
        sum += a;
        a *= 0.55;
      }
      const o = (y * s + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = (v / sum) * 255;
      img.data[o + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const FOG_VS = /* glsl */ `
varying vec2 vUv; varying float vDepth;
void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`;
const FOG_FS = /* glsl */ `
uniform sampler2D tNoise; uniform float uTime; uniform vec3 uColor; uniform float uOpacity; uniform vec2 uSeed;
uniform vec3 uTrail[10]; uniform vec2 uRes;
varying vec2 vUv; varying float vDepth;
void main(){
  // cursor wake: the mist parts along the pointer's recent path and curls at the edges
  vec2 q = (gl_FragCoord.xy / uRes) * 2.0 - 1.0;
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float clear = 0.0; vec2 push = vec2(0.0);
  for (int i = 0; i < 10; i++) {
    vec2 d = (q - uTrail[i].xy) * asp;
    float w = exp(-dot(d, d) / 0.045) * uTrail[i].z;
    clear = max(clear, w);
    push += d * w;
  }
  vec2 p = vUv * vec2(2.2, 1.0) + uSeed + push * 0.35;
  float n = texture2D(tNoise, p + vec2(uTime * 0.012, 0.0)).r * 0.6 + texture2D(tNoise, p * 2.3 - vec2(uTime * 0.02, uTime * 0.004)).r * 0.4;
  float edgeX = smoothstep(0.0, 0.28, vUv.x) * smoothstep(1.0, 0.72, vUv.x);
  float edgeY = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
  float near = smoothstep(2.0, 9.0, vDepth);           // fade when the camera flies through
  float a = smoothstep(0.32, 0.85, n) * edgeX * edgeY * near * uOpacity * (1.0 - clear * 0.92);
  gl_FragColor = vec4(uColor, a);
}`;

/** Layered volumetric-style fog: wide noise sheets drifting at different depths, coloured by the shot. */
function FogLayers() {
  const vp = useViewport();
  const phone = useMemo(isPhone, []);
  const reduce = useMemo(reducedMotion, []);
  const tex = useMemo(fogNoise, []);
  const trail = useMemo(() => Array.from({ length: 10 }, () => new THREE.Vector3()), []);
  const res = useMemo(() => new THREE.Vector2(1, 1), []);
  const layers = useMemo(() => {
    const R = rng(23);
    const n = phone ? 9 : 16;
    return Array.from({ length: n }, (_, i) => {
      const low = i % 3 !== 0;
      const mat = new THREE.ShaderMaterial({
        uniforms: { tNoise: { value: tex }, uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uOpacity: { value: low ? 0.85 : 0.45 }, uSeed: { value: new THREE.Vector2(R() * 10, R() * 10) }, uTrail: { value: trail }, uRes: { value: res } },
        vertexShader: FOG_VS,
        fragmentShader: FOG_FS,
        transparent: true,
        depthWrite: false,
        fog: false,
      });
      return {
        mat,
        p: [(R() - 0.5) * 30, low ? 0 : 7 + R() * 16, 2 - i * 5.2 - R() * 3] as [number, number, number],
        w: 46 + R() * 30,
        h: low ? 5 + R() * 4 : 14 + R() * 10,
      };
    });
  }, [phone, tex, trail, res]);
  useFrame(({ clock, gl }) => {
    gl.getDrawingBufferSize(res);
    cursor.trail.forEach((t, i) => trail[i].copy(t));
    for (const l of layers) {
      if (!reduce) l.mat.uniforms.uTime.value = clock.elapsedTime;
      (l.mat.uniforms.uColor.value as THREE.Color).copy(look.fog).offsetHSL(0, 0, 0.04);
    }
  });
  if (vp) return null;
  return (
    <group>
      {layers.map((l, i) => (
        <mesh key={i} material={l.mat} position={[l.p[0], l.p[1] + l.h / 2 - 0.4, l.p[2]]} renderOrder={6}>
          <planeGeometry args={[l.w, l.h]} />
        </mesh>
      ))}
    </group>
  );
}

/** Sun blooming through the fog top-left; its disc feeds the GodRays pass. */
function Sky({ onSun }: { onSun: (m: THREE.Mesh | null) => void }) {
  const vp = useViewport();
  const glow = useMemo(() => glowTexture(256), []);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const phone = useMemo(isPhone, []);
  // placed by unprojecting a top-left screen point from the hero camera (desktop / phone framing)
  const sunPos: [number, number, number] = phone ? [-11, 61, -103] : [-46, 51, -103];
  const discMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, transparent: true, toneMapped: false }), []);
  useFrame(() => {
    if (sunRef.current) sunRef.current.intensity = look.sun;
    if (keyRef.current) keyRef.current.intensity = look.sun * 0.38;
    if (hemiRef.current) hemiRef.current.intensity = look.amb * 0.5;
    const o = THREE.MathUtils.clamp(look.sun / 3.4, 0, 1);
    if (glowRef.current) (glowRef.current.material as THREE.SpriteMaterial).opacity = o;
    discMat.opacity = o;
  });
  return (
    <>
      <hemisphereLight ref={hemiRef} args={['#dfe6ee', '#3b4046', 1]} />
      <directionalLight ref={sunRef} position={[sunPos[0] * 0.7, sunPos[1] * 0.7, -70]} color="#f6f8ff" intensity={3} />
      <directionalLight ref={keyRef} position={[-26, 30, 34]} color="#cdd6e0" intensity={1.2} />
      <group visible={!vp}>
        <sprite ref={glowRef} position={sunPos} scale={[phone ? 120 : 190, phone ? 120 : 190, 1]} renderOrder={1}>
          <spriteMaterial map={glow} color="#ffffff" transparent depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <mesh ref={onSun} position={[sunPos[0], sunPos[1], sunPos[2] - 4]} material={discMat}>
          <circleGeometry args={[6.5, 48]} />
        </mesh>
      </group>
    </>
  );
}

export function HeroWorld({ rock, low, onSun }: { rock: StoneSet; low: boolean; onSun: (m: THREE.Mesh | null) => void }) {
  return (
    <group>
      <Sky onSun={onSun} />
      <Ground rock={rock} low={low} />
      <Monoliths rock={rock} />
      <Debris rock={rock} />
      <Wanderer />
      <NameDust />
      <FogLayers />
    </group>
  );
}
