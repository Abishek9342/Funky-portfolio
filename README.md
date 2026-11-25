# Portfolio v3 · a real-time rendered world

Abishek S's portfolio as one scroll-driven three.js scene: a misty field of floating monoliths, eleven
obsidian artefacts (one per project), a ring megastructure, a gallery of freelance sites and a torch-lit
corridor. Content mirrors the live portfolio (`src/data/content.ts` is a copy of
`../portfolio-site/src/data/content.ts`).

```bash
npm install
npm run dev        # http://localhost:5176
npm run build
npx vite preview --port 5186
node scripts/shots.mjs [desktop|phone]   # screenshots + console / sideways-scroll check
node scripts/poster.mjs                  # re-render the LCP poster stills (then build again)
node scripts/perf.mjs                    # load timing + byte budget
```

## Load strategy

1. HTML + CSS + the hero **poster still** (`public/poster-*.webp`, rendered from the real scene by
   `scripts/poster.mjs`) paint first: the poster is the LCP; content is readable immediately.
2. After first paint, on idle, the 3D chunks load (`three`, `r3f`, `post`, `World`), textures load, every
   shader is compiled off-screen (`renderer.compileAsync`), then the canvas cross-fades over the poster.
3. Fonts are self-hosted woff2 (preloaded, `font-display: swap`).

## Third-party assets (all CC0)

| File | Source | Licence | Size |
|---|---|---|---|
| `public/tex/rock_albedo.webp`, `rock_normal.webp`, `rock_orm.webp` | Poly Haven **rock_face_03** (desaturated to cool grey; AO+roughness packed) | CC0 | 171 + 211 + 92 KB |
| `public/tex/strata_albedo.webp`, `strata_normal.webp`, `strata_orm.webp` | Poly Haven **dry_riverbed_rock** | CC0 | 225 + 151 + 109 KB |
| `public/tex/env_overcast.webp` | Poly Haven HDRI **overcast_soil_puresky** (LDR 512x256, lighting/reflections only) | CC0 | 3 KB |
| `public/fonts/syncopate-700-latin.woff2`, `Syncopate-Bold.ttf` | Google Fonts Syncopate | OFL 1.1 | 17 + 60 KB |
| `public/fonts/geist-latin.woff2` | Google Fonts Geist | OFL 1.1 | 29 KB |
| `public/work/*.webp` | Screenshots of Abishek's own freelance sample sites | own work | 18-31 KB each |

Poly Haven assets are CC0 (no attribution required); credited here anyway: https://polyhaven.com
