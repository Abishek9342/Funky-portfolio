import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as THREE from 'three';
import { isPhone, reducedMotion } from '../store';
import { useShaded, useViewport, Wire } from './materials';
import { glowTexture, monolithGeometry, rockGeometry } from './procedural';
import { rng } from './noise';
import { ARTEFACTS, CORRIDOR_Z, GALLERY } from './shots';
import { rockMaterial, type StoneSet } from './rockMaterial';
import { look, pointer } from './Rig';

// ---------------------------------------------------------------- experience artefacts

/** Band of engraved runes, drawn once to a canvas (emissive, transparent). */
function runeTexture(seed: number) {
  const w = 1024, h = 64;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const R = rng(seed);
  ctx.strokeStyle = 'rgba(205,230,255,0.95)';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.lineTo(w, 6);
  ctx.moveTo(0, h - 6);
  ctx.lineTo(w, h - 6);
  for (let x = 18; x < w - 18; x += 30) {
    const cx = x, cy = h / 2;
    const strokes = 2 + Math.floor(R() * 3);
    for (let s = 0; s < strokes; s++) {
      const ax = cx + (R() - 0.5) * 16, ay = cy + (R() - 0.5) * 30;
      const bx = cx + (R() - 0.5) * 16, by = cy + (R() - 0.5) * 30;
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    if (R() < 0.3) ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  }
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SLAB = new RoundedBoxGeometry(3.0, 4.6, 0.55, 6, 0.14);
const FRAME = (() => {
  const w = 2.5, h = 4.1;
  const pts = [new THREE.Vector3(-w / 2, -h / 2, 0), new THREE.Vector3(w / 2, -h / 2, 0), new THREE.Vector3(w / 2, h / 2, 0), new THREE.Vector3(-w / 2, h / 2, 0), new THREE.Vector3(-w / 2, -h / 2, 0)];
  return new THREE.BufferGeometry().setFromPoints(pts);
})();

/** Polished obsidian monolith with an engraved glowing numeral, an inlaid frame and a floating rune band. */
function Artefact({ i, position, obsidian }: { i: number; position: [number, number, number]; obsidian: THREE.Material }) {
  const ref = useRef<THREE.Group>(null);
  const band = useRef<THREE.Mesh>(null);
  const reduce = useMemo(reducedMotion, []);
  const vp = useViewport();
  const mat = useShaded(obsidian);
  const runes = useMemo(() => runeTexture(300 + i), [i]);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#cfe8ff', toneMapped: false, fog: true }), []);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#9fd0ff', toneMapped: false, transparent: true, opacity: 0.8 }), []);
  const bandMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: runes, transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false, color: '#bfe2ff', blending: THREE.AdditiveBlending }),
    [runes],
  );
  const halo = useMemo(() => glowTexture(128), []);
  const side = Math.sign(position[0]);
  useFrame(({ clock }) => {
    if (reduce) return;
    const t = clock.elapsedTime + i * 2;
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(t * 0.45) * 0.3;
      ref.current.rotation.y = Math.sin(t * 0.16) * 0.18 - side * 0.3;
      ref.current.rotation.z = Math.sin(t * 0.21) * 0.035;
    }
    if (band.current) band.current.rotation.y = t * 0.12;
  });
  return (
    <group ref={ref} position={position} scale={1.3}>
      <mesh geometry={SLAB} material={mat} />
      <Wire geometry={SLAB} />
      <group visible={!vp}>
        <lineLoop geometry={FRAME} material={lineMat} position={[0, 0, 0.281]} />
        <mesh ref={band} position={[0, -0.6, 0]} rotation={[0.22, 0, side * 0.12]} material={bandMat}>
          <cylinderGeometry args={[2.35, 2.35, 0.32, 96, 1, true]} />
        </mesh>
        <sprite position={[0, 0.2, -0.4]} scale={[9, 9, 1]}>
          <spriteMaterial map={halo} color="#7fb2ff" transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      </group>
      <Text font="/fonts/Syncopate-Bold.ttf" fontSize={1.2} position={[0, 0.35, 0.29]} anchorX="center" anchorY="middle" material={vp ? undefined : glow} color={vp ? '#cccccc' : undefined}>
        {String(i + 1).padStart(2, '0')}
      </Text>
    </group>
  );
}

function ArtefactField({ rock }: { rock: StoneSet }) {
  const obsidian = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#030405',
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 0.75,
        specularIntensity: 1,
      }),
    [],
  );
  const base = useMemo(() => rockMaterial({ set: rock, color: '#8d959e', scale: 0.4 }), [rock]);
  const mat = useShaded(base);
  const rocks = useMemo(() => {
    const R = rng(404);
    return Array.from({ length: 22 }, (_, k) => ({
      g: rockGeometry(500 + (k % 6), 0.7 + R() * 2.2, 3),
      p: [(R() < 0.5 ? -1 : 1) * (14 + R() * 18), 9 + R() * 26, -50 - R() * 190] as [number, number, number],
    }));
  }, []);
  return (
    <group>
      {ARTEFACTS.map((p, i) => (
        <Artefact key={i} i={i} position={p} obsidian={obsidian} />
      ))}
      {rocks.map((r, k) => (
        <mesh key={k} geometry={r.g} material={mat} position={r.p} rotation={[k, k * 0.7, 0]} />
      ))}
      <pointLight position={[0, 32, -110]} color="#9cc2ff" intensity={80} distance={120} decay={1.5} />
    </group>
  );
}

// ---------------------------------------------------------------- ring megastructure (skills / publications)

function Ring() {
  const ref = useRef<THREE.Group>(null);
  const reduce = useMemo(reducedMotion, []);
  const vp = useViewport();
  const phone = useMemo(isPhone, []);
  const torus = useMemo(() => new THREE.TorusGeometry(34, 3.4, 24, 200), []);
  const inner = useMemo(() => new THREE.TorusGeometry(22, 1.6, 16, 160), []);
  const hullBase = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a5563', roughness: 0.42, metalness: 0.75, envMapIntensity: 1.2 }), []);
  const hull = useShaded(hullBase);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const lightMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#d8ecff', toneMapped: false }), []);
  const n = phone ? 300 : 900;
  const greebles = useMemo(() => {
    const R = rng(808);
    const m = new THREE.Object3D();
    const mats: THREE.Matrix4[] = [];
    const lights: THREE.Matrix4[] = [];
    for (let k = 0; k < n; k++) {
      const a = R() * Math.PI * 2;
      const b = R() * Math.PI * 2;
      const r = 34 + Math.cos(b) * 3.5;
      m.position.set(Math.cos(a) * r, Math.sin(a) * r, Math.sin(b) * 3.5);
      m.lookAt(Math.cos(a) * 34, Math.sin(a) * 34, 0);
      m.rotateX(Math.PI);
      if (R() < 0.32) {
        m.scale.set(0.12 + R() * 0.6, 0.07, 0.07);
        m.updateMatrix();
        lights.push(m.matrix.clone());
      } else {
        m.scale.set(0.4 + R() * 1.6, 0.4 + R() * 1.4, 0.3 + R() * 1.6);
        m.updateMatrix();
        mats.push(m.matrix.clone());
      }
    }
    return { mats, lights };
  }, [n]);
  const gRef = useRef<THREE.InstancedMesh>(null);
  const lRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    greebles.mats.forEach((mx, k) => gRef.current?.setMatrixAt(k, mx));
    greebles.lights.forEach((mx, k) => lRef.current?.setMatrixAt(k, mx));
    if (gRef.current) gRef.current.instanceMatrix.needsUpdate = true;
    if (lRef.current) lRef.current.instanceMatrix.needsUpdate = true;
  }, [greebles]);
  useFrame((_, dt) => {
    if (ref.current && !reduce) ref.current.rotation.z += dt * 0.015;
  });
  return (
    <group position={[0, 40, -262]} rotation={[-0.35, 0.25, 0]}>
      <group ref={ref}>
        <mesh geometry={torus} material={hull} />
        <Wire geometry={torus} />
        <instancedMesh ref={gRef} args={[box, undefined, greebles.mats.length]} material={hull} frustumCulled={false} />
        <instancedMesh ref={lRef} args={[box, undefined, greebles.lights.length]} material={lightMat} frustumCulled={false} visible={!vp} />
      </group>
      <mesh geometry={inner} material={hull} rotation={[0.5, 0.2, 0]} />
      <pointLight position={[0, 0, 12]} color="#a9d2ff" intensity={160} distance={130} decay={1.5} />
    </group>
  );
}

// ---------------------------------------------------------------- freelance gallery

const SLUGS = ['cafe', 'shop', 'foodcart', 'nursery', 'clinic'];

function Gallery() {
  const vp = useViewport();
  const reduce = useMemo(reducedMotion, []);
  const maps = useTexture(SLUGS.map((s) => `/work/${s}.webp`));
  useMemo(() => maps.forEach((m) => (m.colorSpace = THREE.SRGBColorSpace)), [maps]);
  const frameBase = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1b1f25', roughness: 0.35, metalness: 0.8, envMapIntensity: 1.2 }), []);
  const frame = useShaded(frameBase);
  const frameGeo = useMemo(() => new RoundedBoxGeometry(5.3, 3.7, 0.18, 4, 0.06), []);
  const halo = useMemo(() => glowTexture(128), []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const phone = useMemo(isPhone, []);
  useFrame(({ clock }) => {
    if (reduce) return;
    refs.current.forEach((g, k) => {
      if (g) g.position.y = GALLERY.y + (phone ? (2 - k) * 4.1 : 0) + Math.sin(clock.elapsedTime * 0.5 + k) * 0.18;
    });
  });
  // phones show the HTML cards (with thumbnails) instead; stacked 3D frames would double up
  if (phone) return <pointLight position={[0, GALLERY.y + 4, GALLERY.z + 8]} color="#ffe2c2" intensity={60} distance={40} decay={1.4} />;
  return (
    <group position={[0, 0, GALLERY.z]}>
      {SLUGS.map((s, k) => {
        const x = phone ? 0 : (k - 2) * 6.2;
        const y = GALLERY.y + (phone ? (2 - k) * 4.1 : 0);
        const z = phone ? 0 : -Math.abs(k - 2) * 1.6;
        const ry = phone ? 0 : -(k - 2) * 0.16;
        return (
          <group key={s} ref={(el) => void (refs.current[k] = el)} position={[x, y, z]} rotation={[0, ry, 0]}>
            <mesh geometry={frameGeo} material={frame} />
            <mesh position={[0, 0, 0.1]}>
              <planeGeometry args={[4.9, 3.3]} />
              {vp ? <meshMatcapMaterial color="#bbbbbb" /> : <meshBasicMaterial map={maps[k]} toneMapped={false} color="#e8e8e8" />}
            </mesh>
            {!vp && (
              <sprite position={[0, 0, -0.5]} scale={[11, 8, 1]}>
                <spriteMaterial map={halo} color="#ffd6a8" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
              </sprite>
            )}
          </group>
        );
      })}
      <pointLight position={[0, GALLERY.y + 4, 8]} color="#ffe2c2" intensity={60} distance={40} decay={1.4} />
    </group>
  );
}

// ---------------------------------------------------------------- torch-lit corridor (contact)

function Flame({ position, seed, light = true }: { position: [number, number, number]; seed: number; light?: boolean }) {
  const vp = useViewport();
  const tex = useMemo(() => glowTexture(128, true), []);
  const sRef = useRef<THREE.Sprite>(null);
  const lRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 9 + seed * 13;
    const f = 0.82 + Math.sin(t) * 0.07 + Math.sin(t * 2.3) * 0.05 + Math.sin(t * 5.1) * 0.04;
    if (sRef.current) sRef.current.scale.set(1.3 * f, 1.9 * f, 1);
    if (lRef.current) lRef.current.intensity = 28 * f;
  });
  return (
    <group position={position}>
      {!vp && (
        <sprite ref={sRef} position={[0, 0.25, 0]}>
          <spriteMaterial map={tex} color="#ffb060" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      )}
      {light && <pointLight ref={lRef} color="#ff9a4a" intensity={28} distance={22} decay={1.7} position={[0, 0.3, 0.4]} />}
    </group>
  );
}

function Embers() {
  const vp = useViewport();
  const reduce = useMemo(reducedMotion, []);
  const count = useMemo(() => (isPhone() ? 60 : 160), []);
  const ref = useRef<THREE.Points>(null);
  const { geo, vel } = useMemo(() => {
    const R = rng(31);
    const p = new Float32Array(count * 3);
    const v = new Float32Array(count);
    for (let k = 0; k < count; k++) {
      p[k * 3] = (R() - 0.5) * 5;
      p[k * 3 + 1] = R() * 5;
      p[k * 3 + 2] = -244 - R() * 34;
      v[k] = 0.3 + R() * 0.8;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return { geo: g, vel: v };
  }, [count]);
  useFrame(({ clock }, dt) => {
    if (!ref.current || reduce) return;
    const a = geo.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < count; k++) {
      let y = a.getY(k) + vel[k] * dt;
      if (y > 5.5) y = 0.8;
      a.setY(k, y);
      a.setX(k, a.getX(k) + Math.sin(clock.elapsedTime * 1.3 + k) * 0.004);
    }
    a.needsUpdate = true;
  });
  if (vp) return null;
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#ffae5c" size={0.05} sizeAttenuation transparent opacity={0.9} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function Corridor({ strata }: { strata: StoneSet }) {
  const base = useMemo(() => rockMaterial({ set: strata, color: '#e6d5c4', scale: 0.42, normalStrength: 1.3, envIntensity: 0.15 }), [strata]);
  const mat = useShaded(base);
  const iron = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2725', roughness: 0.55, metalness: 0.85, envMapIntensity: 0.3 }), []);
  const ironM = useShaded(iron);
  const pillar = useMemo(() => monolithGeometry(600, 1.5, 7.5, 1.5, 2, 0.45), []);
  const block = useMemo(() => monolithGeometry(601, 2.1, 1.15, 1.2, 2.4, 0.22), []);
  const link = useMemo(() => new THREE.TorusGeometry(0.13, 0.035, 6, 12), []);
  const linkRef = useRef<THREE.InstancedMesh>(null);
  const blockRef = useRef<THREE.InstancedMesh>(null);
  const zs = useMemo(() => Array.from({ length: 9 }, (_, k) => -240 - k * 6.5), []);
  const blocks = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const m = new THREE.Object3D();
    const R = rng(66);
    for (const side of [-1, 1])
      for (let k = 0; k < 26; k++)
        for (let row = 0; row < 6; row++) {
          m.position.set(side * (3.6 + R() * 0.25), 0.6 + row * 1.2, -238 - k * 2.15 - (row % 2) * 1.05);
          m.rotation.set(0, Math.PI / 2 + (R() - 0.5) * 0.08, (R() - 0.5) * 0.05);
          m.scale.setScalar(0.96 + R() * 0.08);
          m.updateMatrix();
          out.push(m.matrix.clone());
        }
    return out;
  }, []);
  const links = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const m = new THREE.Object3D();
    zs.slice(0, -1).forEach((z, k) => {
      const z2 = zs[k + 1];
      for (const side of [-1, 1]) {
        const steps = 26;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const sag = Math.sin(t * Math.PI) * 1.4;
          m.position.set(side * 2.75, 6.3 - sag, z + (z2 - z) * t);
          m.rotation.set(0, s % 2 ? Math.PI / 2 : 0, Math.PI / 2);
          m.updateMatrix();
          out.push(m.matrix.clone());
        }
      }
    });
    return out;
  }, [zs]);
  useLayoutEffect(() => {
    blocks.forEach((mx, k) => blockRef.current?.setMatrixAt(k, mx));
    links.forEach((mx, k) => linkRef.current?.setMatrixAt(k, mx));
    if (blockRef.current) blockRef.current.instanceMatrix.needsUpdate = true;
    if (linkRef.current) linkRef.current.instanceMatrix.needsUpdate = true;
  }, [blocks, links]);
  return (
    <group position={[0, 0, CORRIDOR_Z]}>
      <instancedMesh ref={blockRef} args={[block, undefined, blocks.length]} material={mat} frustumCulled={false} />
      {zs.map((z, k) => (
        <group key={k}>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 2.7, 3.75, z]}>
              <mesh geometry={pillar} material={mat} />
              {k % 2 === 0 && <Flame position={[-side * 0.95, 0.6, 0]} seed={k * 2 + side} light={k < 6} />}
            </group>
          ))}
        </group>
      ))}
      <instancedMesh ref={linkRef} args={[link, undefined, links.length]} material={ironM} frustumCulled={false} />
      <group position={[0.2, 0, -266]}>
        <mesh material={ironM}>
          <latheGeometry args={[[new THREE.Vector2(0, 0), new THREE.Vector2(0.36, 0), new THREE.Vector2(0.28, 0.5), new THREE.Vector2(0.21, 1.0), new THREE.Vector2(0.17, 1.3), new THREE.Vector2(0.12, 1.5), new THREE.Vector2(0.05, 1.66), new THREE.Vector2(0, 1.7)], 9]} />
        </mesh>
        <Flame position={[0.45, 1.85, 0]} seed={99} />
      </group>
      <Embers />
    </group>
  );
}

// ---------------------------------------------------------------- cursor light

/**
 * "Cursor as light": a soft light ~9 units in front of the camera along the pointer ray. It fades
 * in only in the dark shots (artefacts, ring, gallery, corridor) and warms up near the torches.
 */
export function CursorLight() {
  const ref = useRef<THREE.PointLight>(null);
  const ray = useMemo(() => new THREE.Vector3(), []);
  const warm = useMemo(() => new THREE.Color('#ffb27a'), []);
  const cool = useMemo(() => new THREE.Color('#cfe2ff'), []);
  const vp = useViewport();
  useFrame(({ camera }) => {
    const l = ref.current;
    if (!l) return;
    ray.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
    l.position.copy(camera.position).addScaledVector(ray, 9);
    const dark = THREE.MathUtils.clamp(1 - look.sun / 1.6, 0, 1);
    l.intensity = vp ? 0 : dark * 55;
    l.color.copy(cool).lerp(warm, THREE.MathUtils.clamp(1 - look.amb / 0.12, 0, 1));
  });
  return <pointLight ref={ref} distance={26} decay={1.6} intensity={0} />;
}

export function DeepWorld({ rock, strata }: { rock: StoneSet; strata: StoneSet }) {
  return (
    <group>
      <ArtefactField rock={rock} />
      <Ring />
      <Gallery />
      <Corridor strata={strata} />
    </group>
  );
}
