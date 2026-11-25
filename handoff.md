# Portfolio v3: Handoff Log

Newest entry first.

## 2026-11-25 (night): chrome removed, wizard figure

- Removed per user: "Scroll to render" cue (App.tsx), the letterbox bars (`.letterbox` div gone, `--bar: 0px`
  so everything that offset by it now sits flush), the visible scrollbar (CSS `scrollbar-width: none` +
  `::-webkit-scrollbar`).
- Figure: user called the hooded figure "a doll", then sent a reference: a dark WIZARD silhouette (tall pointed
  hat, long robe, one arm raised high with a staff) in a swirling cloud vortex with thorny tendrils.
  New `src/scene/Wanderer.tsx` (replaces Hero's Figure): flared robe with folds + torn hem, wide drooping brim
  + cone hat with the tip bent sideways, raised arm + hanging sleeve, cape, gnarled staff held high with an amber
  lantern + point light. Cloth/hat move in the wind (onBeforeCompile). Materials `fog: false` = hard silhouette.
  Scale 1.45 at z -4.6. Reference links (Reddit, YouTube Music "Judas") could not be fetched.
- User then said "use exact image what I gave": I did NOT put the image file on the site (192 px, unknown
  owner). Answered with the 3D match; open: whether to also build the swirling vortex sky + tendrils.
- Posters re-rendered. Checked: tsc + build clean, 0 console errors, 2x close-up screenshots reviewed.

## 2026-11-25 (evening): HUD + Viewport switch removed, living headings

- User: remove the bottom HUD bar (CYCLES/timecode/SHOT/spp) and the Viewport/Rendered switch from the site.
  Done: `<Hud>` and `<ShadingSwitch>` no longer rendered in App.tsx (components still exist in ui/Chrome.tsx;
  Viewport-mode code in the scene is now unreachable but harmless).
- User: "still ordinary, bring something novel". Built `src/scene/HeadingDust.tsx`: ONE dust cloud (16k desktop,
  7k phone) that IS every `<h2 data-dust>` in turn. Word boxes come from DOM Ranges (exact layout, per-run colour
  so the amber "talk." stays amber), sampled into document-pixel points, drawn in view space at a fixed depth.
  When the nearest heading changes the dust leaves the old word, streams across the page and rebuilds the new
  one (2.2 s). Cursor scatters + burns amber. Dark rim per grain keeps light headings readable over mist.
  HTML h2s stay for layout/SEO but go transparent via `html.dust-on` (only once dust is measured, so no-WebGL
  keeps normal text). `html.dust-measuring` strips reveal transforms while measuring; re-measures on resize.
- Checked: tsc + build clean, 0 console errors; screenshots of Experience/Skills/Freelance/Contact desktop +
  phone and cursor burn reviewed. Real-GPU smoothness still unverified.

## 2026-11-25 (later): "extraordinary" pass 1: stone-dust name, mist wake, cloak wind

User: "your wish, do whatever" + "my name on the homepage looks ordinary". Built:
- `src/scene/NameDust.tsx` replaces the troika `Name`: ~46k (phone 18k) GPU points sampled from the Syncopate
  glyphs (FontFace + canvas, suspends via React `use`). Intro: grains fly in and lock into letters (3.4 s after
  live). Cursor: grains pushed/swirled away and burn amber (HDR, bloom). Scroll: letters blow away upward as ash
  when the camera rises, re-form on the way back. depthTest off while formed (phone: a rock covered the "A").
- `src/scene/cursor.ts` + `<CursorTracker/>` in World: one damped cursor (NDC, velocity, energy, 10-point wake).
  Phones: touch drives it; when idle a ghost cursor sweeps the name.
- Fog sheets (Hero FOG_FS) part along the cursor wake (`uTrail[10]`, `uRes`).
- Figure cloak hem flutters (onBeforeCompile wind, `customProgramCacheKey 'cloak-wind'`).
- Posters re-rendered (dust name). Checked: tsc + build clean, 0 console errors, screenshots of assemble /
  cursor burn / ash dissolve / phone reviewed; perf LCP 0.76 s, 3D live 2.8 s (perf.mjs first_paint_js
  read 425 KB this run because the deferred chunk started <50 ms after FCP; index.html still preloads only react).
- Open: real-GPU fps; next "extraordinary" ideas not yet built: particle transitions between later shots,
  mirror water caustics. HUD bar / Viewport switch keep-or-remove still unanswered.

## 2026-11-25: hero card removed + Blender-portfolio R&D

- User didn't want the hero glass card (pill, "I build AI systems that ship" headline, intro, Download
  resume / View my work). Removed from `App.tsx` Hero; an sr-only h1 stays for screen readers/SEO. The 3D
  ABISHEK title now carries the hero. `.hero-copy` CSS is now unused (left in place).
- Checked: build clean, hero screenshots at 1440 and 390, 0 console errors. Poster unaffected (`?poster` has no UI).
- User asked if the bottom HUD (CYCLES / timecode / SHOT x/06 / 128 spp / shot label) and the Viewport/Rendered
  switch would show on the live site: yes, both are site UI. Awaiting keep/remove decision.
- First R&D shortlist (Bruno Simon, Igloo, Henry Heffernan, Giulio, Mr Panda) REJECTED by user as "basic, no
  awesome 3D effects". Second list (award-tier): Lusion v3 (SOTY 2023), Messenger by abeto (Dev SOTY 2025),
  Samsy Gen-02 (SOTD + Dev Award 2025, WebGPU), Jordan Breton floating island (FWA SOTD), Hubtown by Unseen
  Studio (monolith over reflective landscape). Proposed effects: cursor-driven GPU fog/fluid sim, particle
  dissolve between shots, wind/cloth on figure + fog, mirror water with caustics. Awaiting user's pick.

## 2026-11-24 (round 2): live-site content, real materials, smooth + fast load, film chrome (local only)

User verdict on round 1: "ordinary, not outstanding", "effects have to be smoother", "takes too long to
load", "take the content from the ORIGINAL portfolio site". Coordinator review: soft clay rocks, fog
washing out the 3D name, ground seam at screen centre, low-poly artefacts.

Changed:
- Content: `src/data/content.ts` = copy of `../portfolio-site/src/data/content.ts`. Sections now follow the
  live site: hero (live-site headline/sub/CTAs), Experience (title card + 11 project shots, one obsidian
  artefact each, all 3 companies), Skills (ring), Publications + 4 Kaggle datasets (ring flank), Freelance
  (5 sample sites as lit 3D frames, cards link to https://abisheksridharan.netlify.app/work/<slug>/, thumbs
  copied as small WebP), Contact (torch corridor, "Let's talk.", email copy/WhatsApp/resume/socials).
- Materials: Poly Haven CC0 rock_face_03 (cool-grey) + dry_riverbed_rock (corridor) as 1k WebP with packed
  AO/roughness, applied TRIPLANAR in object space (`rockMaterial.ts`); IBL from overcast_soil_puresky via
  PMREM. Ground = textured MeshReflectorMaterial with large-scale puddle roughness mask; seam gone.
  Artefacts are polished obsidian RoundedBox slabs with an inlaid glowing frame, engraved numeral and a
  floating additive rune band.
- Fog: global height-fog ShaderChunk patch + animated noise fog sheets (custom shader) + GodRays from a
  sun disc placed top-left by unprojecting the hero camera; 3D name drawn unfogged after the sheets
  (renderOrder) and faded out as the camera rises.
- Smoothness: Lenis smooth scroll read once per frame; maath critically damped camera/target/atmosphere;
  damped pointer parallax; PerformanceMonitor drives quality (drops GodRays/CA/MSAA/reflector res) +
  AdaptiveDpr; instanced debris/greebles/blocks; CSS-only reveals (motion removed).
- Load: poster still (rendered from the real scene by `scripts/poster.mjs`) painted from index.html as
  the LCP; fonts self-hosted woff2 preloaded; 3D chunks load after window load + idle; textures suspend;
  `renderer.compileAsync` before the canvas cross-fades in. Vendor chunks: react / three / r3f / post /
  World. Bug found and fixed: `includeDependenciesRecursively:false` broke the three chunk ("he is not a
  function", no canvas); now documented in vite.config.ts.
- Film chrome: letterbox bars, "SHOT 0n / 06" chapter cards per section, HH:MM:SS:FF timecode HUD, Cycles
  bucket-tile intro over the poster (~1.4 s) then a 6 s camera push-in (skipped with reduced motion).
  Cursor as light: a pointer-ray point light fades in in the dark shots, warm near the torches.
- Viewport mode fix: clay ground now sits 1 cm above the reflector (the mirror showed through before).

Perf (headless Chromium + SwiftShader, local preview, cache disabled; before -> after):
- JS needed for first paint (gzip): 451 KB (everything) -> 81 KB (entry 15 + react 66); the 3D stack
  (three 183 + post 99 + r3f 46 + World 13 KB gz) loads after `load` + idle.
- First contentful paint / LCP: 1.68 s / 1.68 s -> ~0.9 s / ~0.9 s (poster + hero copy; 1.5 s cold run).
- 3D live: ~20 s (old tile loader) -> ~2.9 s.
- Total shipped (dist): ~1.6 MB -> ~2.9 MB (adds ~970 KB of CC0 textures + 145 KB posters, loaded lazily).

Open:
- Real-GPU frame rate unverified (SwiftShader only); PerformanceMonitor should adapt, but check on a laptop
  and a phone.
- Poster must be re-rendered (`scripts/poster.mjs`) after any hero change, or the cross-fade will jump.
- No git repo / hosting; ask the user first.

## 2026-11-24: first version built (local only, no git, not hosted)

User asked for a new portfolio version that looks like a "super duper Blender creator site, graphics top
notch", from 5 reference screenshots of dark cinematic Blender renders. They then said the floating-monoliths
render is THE hero look: high-key, bright misty silver, light blooming top-left, two giant slabs framing,
a tower in the fog, lots of rising debris, a wet cracked plain with puddles, low ground mist, and a tiny
cloaked figure dead centre. References were used as mood only; no artist scenes, names or watermarks copied.
Content is portfolio-v2's (`src/data/content.ts` copied; About/Systems/Principles copy from v2's App.tsx).

Built:
- One fixed R3F canvas behind the HTML; scroll-driven camera blends shots anchored by `data-shot`
  (hero, about, work-0..4, matrix, contact). Fog colour/density and light levels blend too, so the world
  goes silver day -> dusk -> night -> torch-lit black.
- Hero: procedural monoliths/rocks (`procedural.ts`) with a per-pixel rock shader (`rockMaterial.ts`),
  420 instanced debris chunks rising (140 on phones), MeshReflectorMaterial wet ground with canvas cracks +
  puddle roughness, billboard ground mist, additive sun glow + light shafts, cloaked figure with a staff,
  "ABISHEK" as a 3D monument (local Syncopate TTF), fading out as the camera rises.
- Work: 5 obsidian artefacts with glowing index + rune ring, one per flagship (PRPL, Lead MCP, truAI,
  truScanner, Playroom); card on the opposite side on desktop, below the artefact on phones.
- Matrix: ring megastructure with instanced greebles + light strips; remaining projects, publications,
  Kaggle datasets and the stack as glass panels.
- Contact: torch-lit corridor (instanced stone blocks, pillars, iron chains, flickering flames with
  point lights, embers, a torch-bearer walking away), "Let's build something that ships." + email copy,
  WhatsApp, resume, LinkedIn/GitHub/Kaggle.
- Post: Bloom, chromatic aberration, ACES tone mapping, vignette, film noise.
- Signature: Blender-style shading pills (Viewport/Rendered). Viewport = clay matcap + wireframes, grid +
  red/green axes, no fog/post, "User Perspective / Verts / Faces" overlay; back to Rendered plays a
  "Sample n/128 · Denoising" noise reveal. Small Cycles HUD (frame counter, samples, time).
- Loader: Cycles-style bucket tiles filling from the centre until the canvas has rendered.
- Perf: dpr [1,1.75] desktop / [1,1.25] phone, fewer debris/mist/greebles/embers on phones, no MSAA on
  phones, lazy-loaded scene chunk; prefers-reduced-motion = no drift, camera snaps; no WebGL = static
  gradient backdrop with all content readable.

Checked (scripts/shots.mjs, headless Chromium + SwiftShader, preview on :5186): every shot at 1440x900 and
390x844, Viewport mode, the reveal and the Rendered round trip: 0 console errors, no sideways scroll.
Screenshots reviewed and iterated (rock shader, lighting, name placement/legibility, mist intersection
lines, phone framing, nav scrim). Fixed a real bug: shading switch remounted instanced meshes (instance
matrices lost -> corridor blocks piled at the origin) and the reflector (came back white).

Open:
- A thin band at the very bottom edge of the hero ground is the reflector's texture clamp at steep angles;
  minor, left as is.
- SwiftShader is slow, so real-GPU smoothness/FPS is unverified; check on a real laptop and phone.
- No git repo / hosting yet; ask the user before creating either.
