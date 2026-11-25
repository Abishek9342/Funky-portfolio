import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { easing } from 'maath';
import * as THREE from 'three';
import { isPhone, posterMode, reducedMotion, store, useStore } from '../store';
import { scroll } from '../scroll';
import { blendShots, makeShots, type Look } from './shots';

/** Current blended atmosphere, read by lights/fog/materials each frame. */
export const look: Look = {
  pos: new THREE.Vector3(),
  target: new THREE.Vector3(),
  fog: new THREE.Color('#b4bcc5'),
  density: 0.02,
  sun: 3.4,
  amb: 1,
  env: 0.9,
};
/** Pointer in NDC (-1..1), damped; also used by the cursor light. */
export const pointer = new THREE.Vector2();

type Anchor = { name: string; y: number };

function readAnchors(): Anchor[] {
  const sy = window.scrollY;
  return [...document.querySelectorAll<HTMLElement>('[data-shot]')].map((el) => {
    const r = el.getBoundingClientRect();
    return { name: el.dataset.shot!, y: r.top + sy + r.height / 2 };
  });
}

/**
 * Scroll-driven camera. Anchors are measured only on resize/layout change; each frame reads the
 * (Lenis-smoothed) scroll value once, blends the two shots around the viewport centre and moves the
 * camera with critically damped springs (maath easing). Pointer adds a small damped parallax.
 */
export function Rig() {
  const { camera, scene } = useThree();
  const viewport = useStore((s) => s.shading === 'viewport');
  const live = useStore((s) => s.live);
  const phone = useMemo(isPhone, []);
  const shots = useMemo(() => makeShots(phone), [phone]);
  const anchors = useRef<Anchor[]>([]);
  const rawPointer = useRef(new THREE.Vector2());
  const goal = useMemo<Look>(
    () => ({ pos: new THREE.Vector3(), target: new THREE.Vector3(), fog: new THREE.Color(), density: 0, sun: 1, amb: 1, env: 1 }),
    [],
  );
  const target = useRef(new THREE.Vector3(...shots.hero.target));
  const reduce = useMemo(reducedMotion, []);
  const intro = useRef({ start: -1 });
  const fogRef = useRef(new THREE.FogExp2('#b4bcc5', 0.02));
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const update = () => (anchors.current = readAnchors());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    const onMove = (e: PointerEvent) => rawPointer.current.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  useEffect(() => {
    scene.fog = viewport ? null : fogRef.current;
    scene.background = viewport ? new THREE.Color('#3a3a3a') : look.fog;
  }, [viewport, scene]);

  // start the slow push-in once the canvas is live (skipped for reduced motion / poster capture)
  useEffect(() => {
    if (live && intro.current.start < 0) intro.current.start = performance.now();
  }, [live]);

  // first frame: snap so the canvas fades in already framed
  const snapped = useRef(false);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const list = anchors.current;
    if (!list.length) return;
    const c = scroll.y + innerHeight / 2;
    let i = 0;
    while (i < list.length - 1 && list[i + 1].y <= c) i++;
    const j = Math.min(i + 1, list.length - 1);
    const a = shots[list[i].name];
    const b = shots[list[j].name];
    if (!a || !b) return;
    let t = THREE.MathUtils.clamp((c - list[i].y) / Math.max(1, list[j].y - list[i].y), 0, 1);
    if (c < list[0].y) t = 0;
    t = t * t * (3 - 2 * t);
    blendShots(a, b, t, goal);

    // intro push-in: start ~7 units further back and glide in over 6 s
    const still = reduce || posterMode();
    if (!still && intro.current.start > 0) {
      const k = THREE.MathUtils.clamp((performance.now() - intro.current.start) / 6000, 0, 1);
      const e = 1 - (1 - k) ** 3;
      const away = Math.max(0, 1 - scroll.y / innerHeight);
      goal.pos.z += (1 - e) * 7 * away;
      goal.pos.y += (1 - e) * 0.8 * away;
    }

    // damped pointer parallax (phones: gentle scroll-velocity sway instead)
    if (!still) {
      if (phone) rawPointer.current.set(Math.sin(state.clock.elapsedTime * 0.25) * 0.3, THREE.MathUtils.clamp(scroll.velocity * -0.02, -0.4, 0.4));
      easing.damp2(pointer, rawPointer.current, 0.35, dt);
      tmp.set(pointer.x * 0.7, pointer.y * 0.35, 0).applyQuaternion(camera.quaternion);
      goal.pos.add(tmp);
    }

    if (!snapped.current || still) {
      camera.position.copy(goal.pos);
      target.current.copy(goal.target);
      look.fog.copy(goal.fog);
      look.density = goal.density;
      look.sun = goal.sun;
      look.amb = goal.amb;
      look.env = goal.env;
      snapped.current = true;
    } else {
      easing.damp3(camera.position, goal.pos, 0.42, dt);
      easing.damp3(target.current, goal.target, 0.36, dt);
      easing.dampC(look.fog, goal.fog, 0.4, dt);
      look.density = THREE.MathUtils.damp(look.density, goal.density, 3, dt);
      look.sun = THREE.MathUtils.damp(look.sun, goal.sun, 3, dt);
      look.amb = THREE.MathUtils.damp(look.amb, goal.amb, 3, dt);
      look.env = THREE.MathUtils.damp(look.env, goal.env, 3, dt);
    }
    camera.lookAt(target.current);

    if (!viewport) {
      fogRef.current.color.copy(look.fog);
      fogRef.current.density = look.density;
      scene.environmentIntensity = look.env;
    } else {
      scene.environmentIntensity = 0.6;
    }
    if (store.get().stats.verts === 0 && state.clock.elapsedTime > 1) {
      let verts = 0, faces = 0;
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.geometry?.attributes.position) return;
        const n = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1;
        verts += m.geometry.attributes.position.count * n;
        faces += ((m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3) * n;
      });
      store.set({ stats: { verts: Math.round(verts), faces: Math.round(faces) } });
    }
  });
  return null;
}
