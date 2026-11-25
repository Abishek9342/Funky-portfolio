import * as THREE from 'three';
import { isPhone, posterMode, reducedMotion } from '../store';

/**
 * Shared cursor state for the interactive effects (name dust, mist wake).
 * Updated once per frame by `updateCursor` (called from <CursorTracker/>), never by listeners in effects.
 *  - `ndc`: fast-damped pointer in NDC; `vel`: its velocity (NDC/s, smoothed)
 *  - `energy`: 0..1, rises while the cursor moves, decays when idle
 *  - `trail`: last N positions in NDC with a strength (z) that decays: the mist wake
 * On phones (no hover) touch drags drive it, and when idle a slow "ghost" cursor sweeps the name.
 */
const N = 10;
export const cursor = {
  ndc: new THREE.Vector2(0, 0.2),
  vel: new THREE.Vector2(),
  energy: 0,
  trail: Array.from({ length: N }, () => new THREE.Vector3(0, 0, 0)),
  TRAIL: N,
};

const raw = new THREE.Vector2(0, 0.2);
let lastMove = -1e9;
let listening = false;
const prev = new THREE.Vector2();
let trailClock = 0;
let head = 0;

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  const set = (x: number, y: number) => {
    raw.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    lastMove = performance.now();
  };
  window.addEventListener('pointermove', (e) => set(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', (e) => e.touches[0] && set(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
}

export function updateCursor(dt: number, t: number) {
  listen();
  if (posterMode() || reducedMotion()) {
    cursor.energy = 0;
    cursor.trail.forEach((p) => (p.z = 0));
    return;
  }
  const idle = (performance.now() - lastMove) / 1000;
  // phones: a slow ghost sweep across the name once the visitor stops touching
  if (isPhone() && idle > 2.5) {
    raw.set(Math.sin(t * 0.45) * 0.75, 0.33 + Math.sin(t * 0.9) * 0.06);
  }
  prev.copy(cursor.ndc);
  const k = 1 - Math.exp(-dt / 0.06);
  cursor.ndc.lerp(raw, k);
  const v = prev.sub(cursor.ndc).multiplyScalar(-1 / Math.max(dt, 1e-3));
  cursor.vel.lerp(v, 1 - Math.exp(-dt / 0.12));
  const speed = cursor.vel.length();
  const ghost = isPhone() && idle > 2.5;
  const target = ghost ? 0.55 : idle < 1.8 ? THREE.MathUtils.clamp(0.35 + speed * 0.4, 0, 1) : 0;
  cursor.energy = THREE.MathUtils.damp(cursor.energy, target, target > cursor.energy ? 6 : 1.2, dt);

  // wake: drop a point every ~45 ms, all points fade
  for (const p of cursor.trail) p.z *= Math.exp(-dt / 0.7);
  trailClock += dt;
  if (trailClock > 0.045) {
    trailClock = 0;
    head = (head + 1) % N;
    cursor.trail[head].set(cursor.ndc.x, cursor.ndc.y, THREE.MathUtils.clamp(0.25 + speed * 0.5, 0, 1) * (cursor.energy > 0.05 ? 1 : 0));
  }
}
