import * as THREE from 'three';

/**
 * Triplanar PBR stone. Our shapes are procedural (no UVs), so albedo / normal / ORM (R=AO, G=rough)
 * are sampled on three axes in OBJECT space (texture stays glued to a rotating stone), blended by the
 * object normal, normals combined with the whiteout method. One value-noise term adds large-scale
 * tone variation so repeats don't read. Works for plain and instanced meshes (WebGL2).
 */
export type StoneSet = { albedo: THREE.Texture; normal: THREE.Texture; orm: THREE.Texture };

const NOISE = /* glsl */ `
float rk_h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float rk_noise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(rk_h(i),rk_h(i+vec3(1,0,0)),f.x),mix(rk_h(i+vec3(0,1,0)),rk_h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(rk_h(i+vec3(0,0,1)),rk_h(i+vec3(1,0,1)),f.x),mix(rk_h(i+vec3(0,1,1)),rk_h(i+vec3(1,1,1)),f.x),f.y),f.z); }
`;

export type RockOpts = {
  set: StoneSet;
  color?: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
  scale?: number; // texture repeats per object unit
  normalStrength?: number;
  ao?: number;
  variation?: number; // large-scale tone variation
  physical?: boolean;
  clearcoat?: number;
  envIntensity?: number;
};

export function rockMaterial(o: RockOpts) {
  const params = {
    color: o.color ?? '#ffffff',
    roughness: o.roughness ?? 1,
    metalness: o.metalness ?? 0,
    envMapIntensity: o.envIntensity ?? 0.6,
  };
  const mat = o.physical
    ? new THREE.MeshPhysicalMaterial({ ...params, clearcoat: o.clearcoat ?? 0.5, clearcoatRoughness: 0.3 })
    : new THREE.MeshStandardMaterial(params);
  const uniforms = {
    tAlb: { value: o.set.albedo },
    tNor: { value: o.set.normal },
    tOrm: { value: o.set.orm },
    uTri: { value: o.scale ?? 0.18 },
    uNs: { value: o.normalStrength ?? 1.15 },
    uAo: { value: o.ao ?? 0.85 },
    uVar: { value: o.variation ?? 0.35 },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nout vec3 vRkP;\nout vec3 vRkN;\nout mat3 vRkV;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vRkP = position;
        vRkN = normal;
        mat4 rkMV = modelViewMatrix;
        #ifdef USE_INSTANCING
          rkMV = modelViewMatrix * instanceMatrix;
          vRkP = position + vec3(instanceMatrix[3].x, 0.0, instanceMatrix[3].z) * 0.37;
        #endif
        vRkV = mat3(rkMV);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        in vec3 vRkP; in vec3 vRkN; in mat3 vRkV;
        uniform sampler2D tAlb; uniform sampler2D tNor; uniform sampler2D tOrm;
        uniform float uTri; uniform float uNs; uniform float uAo; uniform float uVar;
        ${NOISE}
        vec3 rkW; vec3 rkTp; vec4 rkOrm;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 rkn = normalize(vRkN);
        rkW = pow(abs(rkn), vec3(5.0)); rkW /= (rkW.x + rkW.y + rkW.z + 1e-5);
        rkTp = vRkP * uTri;
        vec3 rkAlb = texture(tAlb, rkTp.zy).rgb * rkW.x + texture(tAlb, rkTp.xz).rgb * rkW.y + texture(tAlb, rkTp.xy).rgb * rkW.z;
        rkOrm = texture(tOrm, rkTp.zy) * rkW.x + texture(tOrm, rkTp.xz) * rkW.y + texture(tOrm, rkTp.xy) * rkW.z;
        float rkV = rk_noise(vRkP * 0.09) * 0.65 + rk_noise(vRkP * 0.31) * 0.35;
        diffuseColor.rgb *= rkAlb * mix(1.0 - uVar, 1.0 + uVar * 0.5, rkV) * mix(1.0, rkOrm.r, uAo);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor *= mix(0.55, 1.0, rkOrm.g);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          vec3 n = normalize(vRkN);
          vec3 tx = texture(tNor, rkTp.zy).xyz * 2.0 - 1.0;
          vec3 ty = texture(tNor, rkTp.xz).xyz * 2.0 - 1.0;
          vec3 tz = texture(tNor, rkTp.xy).xyz * 2.0 - 1.0;
          tx.xy *= uNs; ty.xy *= uNs; tz.xy *= uNs;
          vec3 s = sign(n);
          tx = vec3(tx.xy + n.zy, abs(tx.z) * n.x);
          ty = vec3(ty.xy + n.xz, abs(ty.z) * n.y);
          tz = vec3(tz.xy + n.xy, abs(tz.z) * n.z);
          vec3 wn = normalize(tx.zyx * rkW.x + ty.xzy * rkW.y + tz.xyz * rkW.z);
          normal = normalize(vRkV * wn);
        }`,
      );
  };
  mat.customProgramCacheKey = () => `tri-stone-${o.physical ? 'p' : 's'}`;
  return mat;
}
