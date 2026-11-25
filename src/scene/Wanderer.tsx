import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { posterMode, reducedMotion } from '../store';

/**
 * The wizard on the plain (user reference 2026-11-25: a dark silhouette with a tall pointed hat, long robe,
 * one arm raised high holding a staff). Seen from behind, facing the monoliths. All procedural:
 * flared robe with folds and a ragged hem, wide drooping brim + bent cone hat, raised arm with a hanging
 * sleeve, cape, gnarled staff with an amber lantern (the only colour). Cloth moves in the wind in the
 * vertex shader. Unfogged near-black cloth = a hard silhouette like the reference; the low fog sheets still veil the hem.
 */

const wind = { value: 0 };

/** Inject a wind displacement into a standard/physical material. */
function windy<M extends THREE.MeshStandardMaterial>(m: M, key: string, body: string): M {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${body}`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}

/** Robe: lathe from a smooth radius profile, then folds, broad shoulders and a torn hem. */
function robeGeometry() {
  const ctrl: [number, number][] = [
    [0.0, 0.0],
    [0.5, 0.02],
    [0.42, 0.2],
    [0.32, 0.58],
    [0.26, 0.92],
    [0.25, 1.12],
    [0.27, 1.28],
    [0.24, 1.37],
    [0.15, 1.43],
    [0.08, 1.47],
    [0.0, 1.49],
  ];
  const curve = new THREE.CatmullRomCurve3(ctrl.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal');
  const pts = curve.getPoints(70).map((p) => new THREE.Vector2(Math.max(p.x, 0), p.y));
  const g = new THREE.LatheGeometry(pts, 112);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const th = Math.atan2(v.z, v.x);
    const hem = THREE.MathUtils.smoothstep(1.0 - v.y / 1.1, 0, 1);
    const fold = 0.075 * Math.sin(th * 9 + Math.sin(th * 3) * 1.4) + 0.035 * Math.sin(th * 19 + 1.3) + 0.02 * Math.sin(th * 31);
    const k = 1 + fold * (0.25 + hem * 0.95);
    const shoulder = THREE.MathUtils.smoothstep(v.y, 1.05, 1.32) * (1 - THREE.MathUtils.smoothstep(v.y, 1.38, 1.47));
    v.x *= k * (1 + shoulder * 0.28);
    v.z *= k * 0.74;
    if (v.y < 0.06) v.y += 0.05 * Math.sin(th * 7.0) + 0.03 * Math.sin(th * 13 + 2.0) - 0.05 * Math.max(0, Math.sin(th));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Wizard hat: a wide drooping brim and a tall cone whose tip bends back. */
function hatGeometry() {
  const brim = new THREE.CylinderGeometry(0.33, 0.33, 0.014, 72, 1);
  const bp = brim.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), z = bp.getZ(i);
    const r = Math.hypot(x, z) / 0.33;
    const th = Math.atan2(z, x);
    bp.setY(i, bp.getY(i) - 0.07 * r * r - 0.018 * Math.sin(th * 5) * r - 0.03 * r * Math.max(0, -Math.sin(th)));
  }
  brim.computeVertexNormals();
  const prof: THREE.Vector2[] = [];
  for (let k = 0; k <= 40; k++) {
    const t = k / 40;
    prof.push(new THREE.Vector2(0.125 * (1 - t) ** 1.15 + 0.002, t * 0.66));
  }
  const cone = new THREE.LatheGeometry(prof, 40);
  const cp = cone.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cp.count; i++) {
    const t = cp.getY(i) / 0.66;
    cp.setZ(i, cp.getZ(i) + 0.08 * t ** 2.6);
    cp.setX(i, cp.getX(i) - 0.24 * t ** 2.8 + 0.012 * Math.sin(t * 9));
    cp.setY(i, cp.getY(i) - 0.08 * t ** 3);
  }
  cone.computeVertexNormals();
  return { brim, cone };
}

/** A hanging strip; uv.y = 1 at the top (pinned), 0 at the free end. Gathered at the top, bowed across. */
function stripGeometry(w: number, h: number, sx: number, sy: number, bow: number) {
  const g = new THREE.PlaneGeometry(w, h, sx, sy);
  g.translate(0, -h / 2, 0);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const t = -pos.getY(i) / h;
    const x0 = pos.getX(i);
    pos.setX(i, x0 * (0.55 + 0.45 * t));
    pos.setZ(i, bow * 0.5 * (1 - ((2 * x0) / w) ** 2));
  }
  g.computeVertexNormals();
  return g;
}

function staffGeometry() {
  const pts = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.02, 0.45, 0.01),
    new THREE.Vector3(-0.012, 0.9, -0.012),
    new THREE.Vector3(0.018, 1.35, 0.008),
    new THREE.Vector3(-0.008, 1.75, 0.0),
    new THREE.Vector3(0.0, 1.98, 0.0),
    new THREE.Vector3(-0.08, 2.08, 0.0),
    new THREE.Vector3(-0.13, 2.0, 0.0),
  ];
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.024, 8, false);
}

export function Wanderer() {
  const reduce = useMemo(reducedMotion, []);
  const lantern = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const body = useRef<THREE.Group>(null);

  const geo = useMemo(() => {
    // right arm raised high, gripping the staff above the head
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.2, 1.33, 0.0),
      new THREE.Vector3(0.33, 1.48, -0.03),
      new THREE.Vector3(0.39, 1.66, -0.05),
      new THREE.Vector3(0.41, 1.82, -0.06),
    ]);
    return {
      robe: robeGeometry(),
      ...hatGeometry(),
      head: new THREE.SphereGeometry(0.1, 20, 16),
      arm: new THREE.TubeGeometry(armCurve, 32, 0.055, 14, false),
      sleeve: stripGeometry(0.2, 0.5, 6, 20, 0.08),
      cape: stripGeometry(0.62, 1.4, 16, 48, 0.2),
      hand: new THREE.SphereGeometry(0.04, 12, 10),
      staff: staffGeometry(),
      gem: new THREE.OctahedronGeometry(0.055, 0),
    };
  }, []);

  const mats = useMemo(() => {
    const cloth = (color: string) =>
      new THREE.MeshPhysicalMaterial({ color, roughness: 1, sheen: 0.6, sheenColor: new THREE.Color('#58616b'), sheenRoughness: 0.5, side: THREE.DoubleSide, fog: false });
    const robe = windy(
      cloth('#0b0d10'),
      'wanderer-robe',
      `float hem = pow(clamp(1.0 - position.y / 1.1, 0.0, 1.0), 1.6);
       float gust = 0.6 + 0.4 * sin(uWind * 0.37);
       transformed.x += hem * gust * (0.07 * sin(uWind * 2.1 + position.y * 3.0 + position.z * 6.0) + 0.09);
       transformed.z += hem * gust * 0.05 * sin(uWind * 2.7 + position.x * 7.0);`,
    );
    const flow = (amp: number, lift: number, key: string) =>
      windy(
        cloth('#0d0f12'),
        key,
        `float w = pow(1.0 - uv.y, 1.25);
         float gust = 0.55 + 0.45 * sin(uWind * 0.37) + 0.15 * sin(uWind * 1.3);
         float wave = sin(uWind * 2.6 - uv.y * 7.0 + uv.x * 2.0);
         transformed.x += w * gust * ${amp.toFixed(2)} + w * 0.08 * wave;
         transformed.z += w * (0.22 * gust + 0.1 * sin(uWind * 2.1 - uv.y * 6.0 + uv.x * 3.0));
         transformed.y += w * w * gust * ${lift.toFixed(2)};`,
      );
    const hat = windy(
      cloth('#0b0d10'),
      'wanderer-hat',
      `float tip = clamp(position.y / 0.66, 0.0, 1.0);
       transformed.x += tip * tip * 0.03 * sin(uWind * 1.7);`,
    );
    return {
      robe,
      hat,
      cape: flow(0.38, 0.14, 'wanderer-cape'),
      sleeve: flow(0.22, 0.1, 'wanderer-sleeve'),
      dark: new THREE.MeshStandardMaterial({ color: '#0d0f12', roughness: 0.9, fog: false }),
      wood: new THREE.MeshStandardMaterial({ color: '#15110d', roughness: 0.85, fog: false }),
      gem: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb066').multiplyScalar(3.4), toneMapped: false, fog: false }),
    };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!reduce && !posterMode()) wind.value = t;
    if (body.current && !reduce) body.current.scale.y = 1 + Math.sin(t * 1.1) * 0.004;
    const f = 0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
    if (light.current) light.current.intensity = 6 * f;
    if (lantern.current) lantern.current.rotation.y = t * 0.6;
  });

  return (
    <group position={[0, 0, -4.6]} rotation={[0, 0.3, 0]} scale={1.45}>
      <group ref={body}>
        <mesh geometry={geo.robe} material={mats.robe} />
        <mesh geometry={geo.head} material={mats.dark} position={[0, 1.55, -0.02]} />
        <group position={[0, 1.62, 0]} rotation={[0.1, 0, -0.06]}>
          <mesh geometry={geo.brim} material={mats.hat} />
          <mesh geometry={geo.cone} material={mats.hat} />
        </group>
        <mesh geometry={geo.arm} material={mats.robe} />
        <mesh geometry={geo.sleeve} material={mats.sleeve} position={[0.36, 1.62, -0.02]} />
        <mesh geometry={geo.hand} material={mats.dark} position={[0.41, 1.84, -0.06]} />
        {/* cape from the shoulders down the back (+z is toward the camera) */}
        <mesh geometry={geo.cape} material={mats.cape} position={[0, 1.42, 0.12]} />
      </group>
      {/* staff held high: base off the ground, crook + lantern well above the hat */}
      <group position={[0.42, 0.62, -0.06]} rotation={[0, 0, -0.03]}>
        <mesh geometry={geo.staff} material={mats.wood} />
        <mesh ref={lantern} geometry={geo.gem} material={mats.gem} position={[-0.13, 1.9, 0]} />
        <pointLight ref={light} position={[-0.13, 1.9, 0.05]} color="#ffa45c" intensity={6} distance={5} decay={1.8} />
      </group>
    </group>
  );
}
