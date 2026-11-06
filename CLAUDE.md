# Portfolio v2 (swarm build)

Read `handoff.md` first; add a dated entry at the top after every session.

A second, separate version of Abishek's portfolio in the style of saai.pro (noir and crimson, giant
outlined PORTFOLIO hero, code-style section labels), with a "swarm" intro: the page starts blank and
named cursors rebuild it live. The current site (`../portfolio-site`, Netlify) is separate; if the
user prefers v2 it may replace it later. Repo: https://github.com/Abishek9342/Funky-portfolio (main). No hosting yet.

- React 19 + TypeScript + Vite. `npm install`, `npm run dev` -> http://localhost:5175, `npm run build`.
- Content: `src/data/content.ts` is a COPY (plus `playroom`, v2 only) of `../portfolio-site/src/data/content.ts` (same facts as the
  resume). Keep the two in sync if either changes. No Gemini mentions, no location.
- Sections are in `src/App.tsx`; styles in `src/index.css`.
- Swarm engine: `src/swarm/swarm.ts` + `swarm.css`, written from scratch. Do NOT copy saai.pro's
  `swarm.js`: its header says it's vendored from an unlicensed repo adapting Joel Califa's Swarm, and
  asks people not to reuse it. (User asked to drop the footer credit line, 2026-11-06.)
- No name tags on the cursors (user). Every load, refresh included, scrolls to the top and builds from
  the start (scrollRestoration manual, #hash dropped).
  - Mark elements with `data-build="box"` (drawn as a rectangle, then shown) or `data-build="text"`
    (typed in). A target waits for its nearest marked ancestor. Unmarked elements appear with their parent.
  - Typing keeps React's original text nodes aside and puts them back untouched (React owns them);
    the not-yet-typed rest sits in `.sw-ghost` (visibility hidden) so layout never shifts.
  - `html.sw-pre` (set inline in index.html) hides the page before React paints; a 4 s safety timer
    removes it if the engine never starts. Skipped with `?swarm=off` or prefers-reduced-motion.
  - Builds only what's near the screen; scrolling continues it. Bar: speed 1x/2x/4x, sound, skip.
  - After the build (or Skip) the cursors keep following the pointer (`follow()`; phones: the touch point).
- Hero has no image or side cards (user removed the "AS" monogram card and the floating card, 2026-11-06).
- Check 360 and 390px widths (no sideways scroll) and a full build with the swarm on before handing over.
