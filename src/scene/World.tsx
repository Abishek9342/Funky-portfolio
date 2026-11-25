import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { updateCursor } from './cursor';
import { HeadingDust } from './HeadingDust';
import { AdaptiveDpr, Grid, PerformanceMonitor } from '@react-three/drei';
import { Bloom, ChromaticAberration, EffectComposer, GodRays, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, KernelSize, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { isPhone, posterMode, store, useStore } from '../store';
import { Rig } from './Rig';
import { HeroWorld } from './Hero';
import { CursorLight, DeepWorld } from './Deep';
import { makeShots } from './shots';
import { patchHeightFog, useAssets } from './assets';

patchHeightFog();

/** Blender viewport helpers: infinite grid + red X / green Y axis lines on the floor. */
function ViewportHelpers() {
  const vp = useStore((s) => s.shading === 'viewport');
  const axes = useMemo(() => {
    const mk = (a: THREE.Vector3, b: THREE.Vector3, c: string) => {
      const g = new THREE.BufferGeometry().setFromPoints([a, b]);
      return new THREE.Line(g, new THREE.LineBasicMaterial({ color: c }));
    };
    return [mk(new THREE.Vector3(-400, 0.02, 0), new THREE.Vector3(400, 0.02, 0), '#d9485a'), mk(new THREE.Vector3(0, 0.02, 400), new THREE.Vector3(0, 0.02, -800), '#7ab33c')];
  }, []);
  if (!vp) return null;
  return (
    <>
      <Grid infiniteGrid position={[0, 0.01, 0]} cellSize={2} sectionSize={10} cellColor="#4a4a4a" sectionColor="#5c5c5c" cellThickness={0.6} sectionThickness={1} fadeDistance={260} fadeStrength={1.5} />
      {axes.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
    </>
  );
}

function Effects({ sun, quality }: { sun: THREE.Mesh | null; quality: number }) {
  const vp = useStore((s) => s.shading === 'viewport');
  const phone = useMemo(isPhone, []);
  const ca = useMemo(() => new THREE.Vector2(0.0006, 0.0004), []);
  if (vp) return null;
  const rich = quality > 0.35 && !phone;
  return (
    <EffectComposer multisampling={rich ? 4 : 0} enableNormalPass={false}>
      {sun && rich ? (
        <GodRays sun={sun} samples={56} density={0.96} decay={0.94} weight={0.62} exposure={0.48} clampMax={1} kernelSize={KernelSize.SMALL} blur />
      ) : (
        <></>
      )}
      <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.82} luminanceSmoothing={0.22} radius={0.72} />
      {rich ? <ChromaticAberration offset={ca} radialModulation modulationOffset={0.4} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.5} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.12} />
    </EffectComposer>
  );
}

/** Updates the shared cursor (mist wake, name dust) once per frame, before everything else. */
function CursorTracker() {
  useFrame(({ clock }, dt) => updateCursor(Math.min(dt, 1 / 20), clock.elapsedTime));
  return null;
}

/** Loads textures (suspends), sets IBL, compiles every shader off-screen, then reports "live". */
function Scene() {
  const { rock, strata, env } = useAssets();
  const { gl, scene, camera } = useThree();
  const [sun, setSun] = useState<THREE.Mesh | null>(null);
  const quality = useStore((s) => s.quality);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromEquirectangular(env);
    scene.environment = rt.texture;
    pmrem.dispose();
    return () => rt.dispose();
  }, [gl, scene, env]);
  useEffect(() => {
    let cancelled = false;
    // compile all programs before showing the canvas, so the fade-in never hitches
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            store.set({ live: true });
            (window as unknown as { __live3d?: number }).__live3d = performance.now();
          }),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera]);
  return (
    <>
      <CursorTracker />
      <Rig />
      <HeroWorld rock={rock} low={quality < 0.35} onSun={setSun} />
      <DeepWorld rock={rock} strata={strata} />
      <CursorLight />
      {!posterMode() && <HeadingDust />}
      <ViewportHelpers />
      <Effects sun={sun} quality={quality} />
    </>
  );
}

export default function World() {
  const phone = useMemo(isPhone, []);
  const hero = useMemo(() => makeShots(phone).hero, [phone]);
  const live = useStore((s) => s.live);
  // debug handle for scripts/probe.mjs
  const onCreated = ({ gl, scene, camera }: { gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera }) => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    scene.background = new THREE.Color('#b4bcc5');
    (window as unknown as { __scene?: unknown }).__scene = { scene, camera, THREE };
  };
  return (
    <Canvas
      className={`world ${live ? 'is-live' : ''}`}
      dpr={phone ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: phone ? 58 : 46, near: 0.1, far: 1000, position: hero.pos }}
      onCreated={onCreated}
      performance={{ min: 0.5 }}
    >
      <PerformanceMonitor
        flipflops={3}
        onChange={({ factor }) => store.set({ quality: factor })}
        onFallback={() => store.set({ quality: 0 })}
      />
      {!posterMode() && <AdaptiveDpr />}
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
