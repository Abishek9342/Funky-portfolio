import { useSyncExternalStore } from 'react';

/** Tiny global store shared by the 3D scene and the HTML layer. */
export type Shading = 'rendered' | 'viewport';

type State = {
  shading: Shading;
  /** bumps every time the user switches back to Rendered: drives the sample/denoise reveal */
  revealId: number;
  /** canvas compiled and drawing frames: cross-fade from the poster */
  live: boolean;
  webgl: boolean;
  /** 0..1 from PerformanceMonitor; below 0.35 the heavy passes switch off */
  quality: number;
  stats: { verts: number; faces: number };
};

let state: State = { shading: 'rendered', revealId: 0, live: false, webgl: true, quality: 1, stats: { verts: 0, faces: 0 } };
const subs = new Set<() => void>();

export const store = {
  get: () => state,
  set(patch: Partial<State>) {
    state = { ...state, ...patch };
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
};

export function useStore<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => pick(store.get()));
}

export function setShading(s: Shading) {
  const cur = store.get();
  if (cur.shading === s) return;
  store.set({ shading: s, revealId: s === 'rendered' ? cur.revealId + 1 : cur.revealId });
}

export const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;
export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Poster capture mode (?poster): no UI, no intro, used to render the LCP still. */
export const posterMode = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('poster');
