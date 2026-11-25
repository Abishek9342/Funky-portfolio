# Portfolio v3 (real-time "Blender render" world)

Read `handoff.md` first; add a dated entry at the top after every session.

Third version of Abishek's portfolio: one full-screen three.js world behind the HTML, a scroll-driven
camera, film-title chrome and a Blender-style Viewport/Rendered switch. Git: branch `v3-blender` of GitHub `Abishek9342/Funky-portfolio`
(own history; `main` there is portfolio-v2). Not hosted yet. `../portfolio-site` (live, Netlify) and `../portfolio-v2` must not be modified from here.

- React 19 + TS + Vite 8 (rolldown); three 0.187, @react-three/fiber 9, drei 10, @react-three/postprocessing 3
  (+ postprocessing 6), lenis 1.3.28, maath 0.10.8. Versions pinned exactly. No animation library: HTML
  motion is CSS (`[data-reveal]` + IntersectionObserver).
- `npm install`, `npm run dev` -> http://localhost:5176 (5174 is Playroom), `npm run build`,
  `npx vite preview --port 5186`.
- Content: `src/data/content.ts` is a COPY of `../portfolio-site/src/data/content.ts` (the LIVE site, user's
  choice 2026-11-24). Re-copy when the live site's facts change. No Gemini, no location.
- Load order (keep it): index.html paints `public/poster-*.webp` (LCP) + content; the 3D chunks load on
  idle after first paint (`useDeferred3D`), textures suspend, `renderer.compileAsync` compiles every shader,
  then `.world.is-live` cross-fades over the poster. First-load JS is only entry + react (~85 KB gz):
  `vite.config.ts` advancedChunks with `includeDependenciesRecursively: false` (without it rolldown pulled
  three + post into the entry's preloads).
- Re-render the poster after ANY hero change: `npm run build`, preview, `node scripts/poster.mjs`
  (`?poster` = render only, no UI, no intro), `npm run build` again.
- Camera: HTML elements with `data-shot` anchor shots in `src/scene/shots.ts`; `Rig.tsx` reads the Lenis
  scroll once per frame (`src/scroll.ts`, no scroll listeners), blends the two anchors and moves the camera
  with maath critically-damped springs + small pointer parallax + a 6 s intro push-in.
- Materials: Poly Haven CC0 textures in `public/tex` (see README), triplanar in object space via
  `rockMaterial.ts` (onBeforeCompile, WebGL2). IBL from `env_overcast.webp` through PMREM. Height fog is a
  global ShaderChunk patch (`patchHeightFog` in `assets.ts`); fog sheets are custom shader planes in Hero.
- Viewport mode: `useShaded()` swaps to clay matcap; `<Wire>` adds wireframes; fog/post off; grid + axes.
  Instanced meshes take `material` as a prop, never in `args` (remount loses instance matrices). The
  reflector stays mounted with `visible` toggled; the clay ground sits 1 cm above it.
- Hero name = `NameDust.tsx` (GPU points from glyphs; cursor via shared `cursor.ts`, updated once per frame by
  `<CursorTracker/>`). Fog sheets read `cursor.trail` for the mist wake.
- Section headings = `HeadingDust.tsx`: every `<h2 data-dust>` is drawn by one morphing dust cloud; the HTML
  text is transparent under `html.dust-on`. New headings just need `data-dust`. No HUD / Viewport switch (user).
- 3D text uses `public/fonts/Syncopate-Bold.ttf` (troika needs ttf/woff); HTML uses self-hosted woff2.
- Checks: `scripts/shots.mjs [desktop|phone]`, `scripts/perf.mjs` (FCP/LCP/3D-live + bytes),
  `scripts/probe.mjs` (raycast debug). SwiftShader is slow; read the screenshots, a clean build is not proof.
