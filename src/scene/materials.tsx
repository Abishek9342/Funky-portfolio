import { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { clayMatcap } from './procedural';

let clay: THREE.MeshMatcapMaterial | null = null;
export function clayMaterial() {
  if (!clay) clay = new THREE.MeshMatcapMaterial({ matcap: clayMatcap(), color: '#d0d0d0' });
  return clay;
}

export const useViewport = () => useStore((s) => s.shading === 'viewport');

/** Returns the clay matcap in Viewport mode, the real material otherwise. */
export function useShaded<M extends THREE.Material>(rendered: M): THREE.Material {
  const vp = useViewport();
  return vp ? clayMaterial() : rendered;
}

const wireMat = new THREE.LineBasicMaterial({ color: '#111111', transparent: true, opacity: 0.32 });

/** Blender-style wireframe overlay, shown only in Viewport mode. */
export function Wire({ geometry }: { geometry: THREE.BufferGeometry }) {
  const vp = useViewport();
  const wire = useMemo(() => (vp ? new THREE.WireframeGeometry(geometry) : null), [vp, geometry]);
  if (!wire) return null;
  return <lineSegments geometry={wire} material={wireMat} renderOrder={2} />;
}
