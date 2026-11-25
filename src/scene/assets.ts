import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { StoneSet } from './rockMaterial';

/**
 * CC0 Poly Haven textures (converted to 1k WebP, ORM packed: R=AO, G=roughness):
 *   rock_*   <- rock_face_03 (desaturated to cool grey), used for monoliths, debris and the plain
 *   strata_* <- dry_riverbed_rock (kept warm), used for the torch corridor
 *   env_overcast <- overcast_soil_puresky HDRI (LDR 512x256, lighting/reflections only)
 */
const FILES = {
  rockA: '/tex/rock_albedo.webp',
  rockN: '/tex/rock_normal.webp',
  rockO: '/tex/rock_orm.webp',
  strA: '/tex/strata_albedo.webp',
  strN: '/tex/strata_normal.webp',
  strO: '/tex/strata_orm.webp',
  env: '/tex/env_overcast.webp',
};

export function useAssets() {
  const t = useTexture(FILES);
  const gl = useThree((s) => s.gl);
  return useMemo(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    for (const [k, tex] of Object.entries(t)) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = aniso;
      tex.colorSpace = k.endsWith('A') ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.needsUpdate = true;
    }
    t.env.mapping = THREE.EquirectangularReflectionMapping;
    t.env.colorSpace = THREE.SRGBColorSpace;
    const rock: StoneSet = { albedo: t.rockA, normal: t.rockN, orm: t.rockO };
    const strata: StoneSet = { albedo: t.strA, normal: t.strN, orm: t.strO };
    return { rock, strata, env: t.env, raw: t };
  }, [t, gl]);
}

export const ASSET_FILES = FILES;

let patched = false;
/**
 * Height fog: FogExp2 whose density thins with world height, so the plain sits in mist while the
 * upper stones keep their contrast (closer to Blender's volumetric look than a flat grey wash).
 * Uses the view-space position every built-in shader has at fog_vertex, so sprites/troika work too.
 */
export function patchHeightFog() {
  if (patched) return;
  patched = true;
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = '#ifdef USE_FOG\n  varying float vFogDepth;\n  varying float vFogY;\n#endif';
  C.fog_vertex = '#ifdef USE_FOG\n  vFogDepth = - mvPosition.z;\n  vFogY = (inverse(viewMatrix) * mvPosition).y;\n#endif';
  C.fog_pars_fragment = `#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying float vFogY;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;
  C.fog_fragment = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogH = exp(-max(vFogY, 0.0) * 0.045);
    float fogD = fogDensity * (0.42 + 0.58 * fogH);
    float fogFactor = 1.0 - exp(-fogD * fogD * vFogDepth * vFogDepth);
  #else
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif`;
}
