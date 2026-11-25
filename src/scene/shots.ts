import * as THREE from 'three';

/**
 * Camera "shots". Each HTML element with data-shot="<name>" anchors a shot; scrolling blends
 * between consecutive anchors. The world darkens along the path: misty silver day at the hero,
 * dusk among the experience artefacts, night at the ring, gallery dusk, torch-lit corridor.
 */
export type Shot = {
  pos: [number, number, number];
  target: [number, number, number];
  fog: string; // fog + background colour
  density: number; // FogExp2 base density (height fog thins it with altitude)
  sun: number; // key light strength
  amb: number; // hemisphere fill
  env: number; // IBL intensity
};

/** One artefact per experience project (11), zig-zagging deeper and higher. */
export const ARTEFACT_COUNT = 11;
export const ARTEFACTS: [number, number, number][] = Array.from({ length: ARTEFACT_COUNT }, (_, i) => [
  i % 2 === 0 ? 8.2 : -8.2,
  20 + Math.sin(i * 1.3) * 1.6 + i * 0.35,
  -58 - i * 16,
]);

/** Freelance sample sites hang as 5 lit frames in a shallow arc. */
export const GALLERY = { z: -330, y: 14 };
/** Contact corridor offset (corridor geometry is authored around z -238..-294). */
export const CORRIDOR_Z = -190;

const fogs = ['#4b5561', '#46505c', '#414b57', '#3c4652', '#37414d', '#323c48', '#2d3743', '#28323e', '#232d39', '#1f2834', '#1b2430'];

const art = (i: number, phone: boolean): Shot => {
  const [x, y, z] = ARTEFACTS[i];
  const side = Math.sign(x);
  return {
    pos: phone ? [x * 0.95, y + 0.4, z + 12.5] : [x * 0.4 - side * 0.6, y + 1.0, z + 9.5],
    target: phone ? [x * 0.95, y - 3.6, z] : [x - side * 4.6, y - 0.2, z],
    fog: fogs[i],
    density: 0.016,
    sun: 1.1,
    amb: 0.4,
    env: 0.5,
  };
};

export function makeShots(phone: boolean): Record<string, Shot> {
  const shots: Record<string, Shot> = {
    hero: {
      pos: [0, 1.25, phone ? 17 : 14],
      target: [0, phone ? 7.5 : 6.4, -30],
      fog: '#b4bcc5',
      density: 0.02,
      sun: 3.4,
      amb: 1.0,
      env: 0.9,
    },
    rise: {
      pos: [2.5, 14, -16],
      target: [-2, 19, -60],
      fog: '#6c7783',
      density: 0.024,
      sun: 2.2,
      amb: 0.8,
      env: 0.7,
    },
    skills: {
      pos: [0, 26, -196],
      target: [0, 38, -262],
      fog: '#0e1520',
      density: 0.0115,
      sun: 0.8,
      amb: 0.28,
      env: 0.3,
    },
    pubs: {
      pos: [-28, 34, -228],
      target: [6, 40, -262],
      fog: '#0c121b',
      density: 0.012,
      sun: 0.7,
      amb: 0.25,
      env: 0.3,
    },
    freelance: {
      pos: [0, GALLERY.y + 0.5, GALLERY.z + (phone ? 26 : 23)],
      target: [0, GALLERY.y + 0.6, GALLERY.z],
      fog: '#141a24',
      density: 0.022,
      sun: 0.5,
      amb: 0.35,
      env: 0.35,
    },
    contact: {
      pos: [0, 1.75, -238 + CORRIDOR_Z],
      target: [0, 1.6, -280 + CORRIDOR_Z],
      fog: '#07080b',
      density: 0.055,
      sun: 0,
      amb: 0.05,
      env: 0.06,
    },
  };
  for (let i = 0; i < ARTEFACT_COUNT; i++) shots[`exp-${i}`] = art(i, phone);
  return shots;
}

export type Look = { pos: THREE.Vector3; target: THREE.Vector3; fog: THREE.Color; density: number; sun: number; amb: number; env: number };
const ca = new THREE.Color(), cb = new THREE.Color(), vb = new THREE.Vector3();
export function blendShots(a: Shot, b: Shot, t: number, out: Look) {
  out.pos.set(...a.pos).lerp(vb.set(...b.pos), t);
  out.target.set(...a.target).lerp(vb.set(...b.target), t);
  out.fog.copy(ca.set(a.fog)).lerp(cb.set(b.fog), t);
  out.density = THREE.MathUtils.lerp(a.density, b.density, t);
  out.sun = THREE.MathUtils.lerp(a.sun, b.sun, t);
  out.amb = THREE.MathUtils.lerp(a.amb, b.amb, t);
  out.env = THREE.MathUtils.lerp(a.env, b.env, t);
}
