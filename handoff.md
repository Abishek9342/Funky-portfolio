# Portfolio v2: Handoff Log

Newest entry first.

## 2026-11-06 (later): hero cards removed
- Removed the "AS" monogram card and the floating "Finance Ops Platform" card (user didn't want them);
  hero is one column now, CSS for both gone. Checked 1440/390: no sideways scroll, swarm skip leaves 0 hidden.

## 2026-11-06 (later): cursors follow the pointer after the build
- When the build finishes (or Skip), the page goes live and the cursors stay as a loose flock trailing
  the visitor's pointer (screen space, each on its own spring and orbit slot). Phones: they stay put until
  the first touch, then gather at the finger. Layer is pointer-events: none, so clicks pass through.
- Checked (headless Edge): after skip / after a full build / after scrolling, 14/14 cursors within 110px of
  the pointer; phone tap 7/7 (0/7 before); real mouse click on Copy email under the flock works; 0 errors.

## 2026-11-06 (later): Playroom added
- New flagship card "Playroom: Multiplayer Games App" (PERSONAL · LIVE) with Play it live + View source
  links (both public, checked 200). Data in `content.ts` as `playroom` (v2 only: the live
  portfolio-site doesn't list it yet). Systems Online card 3 now "Side projects and research"; Cloudflare tag.
- Checked: card at 1440 and 390 (screenshots), no sideways scroll, links right, full phone build completes.

## 2026-11-06 (later): user tweaks
- Footer line crediting Joel Califa's "Swarm" removed (user's request).
- Cursor name tags removed; cursors only (initials stay in the control bar).
- Refresh always restarts at the top: `history.scrollRestoration = 'manual'`, scroll to 0 when the engine
  starts, and a #section in the URL is dropped on load. Checked: refresh from scrollY 3200 -> 0, build
  restarts (16/188 layers at 1.5 s); fresh load of /#contact starts at the top; 0 tags, 0 errors.

## 2026-11-06: first version built (local only)

- User asked for "the exact same thing" as https://saai.pro for their portfolio, as a NEW site, keeping
  the current one untouched. Chosen (user): same style + swarm effect; new local folder, nothing online.
- Built `Projects/portfolio-v2` (React 19 + TS + Vite, port 5175): pill nav, outlined PORTFOLIO hero,
  "Hello, I'm / ABISHEK." block, role line, stats (~20 modules, 500+ tests, 8 MCP tools), monogram card +
  floating "Finance Ops Platform" card, Systems Online cards + tags, About (bio + 3 principles), Flagship
  builds (PRPL with clickable modules M1-M6, Lead MCP server, truAI, truScanner), filterable Matrix
  (WarpX, email integration, 4 Kaggle datasets, IEEE paper), Stack, Contact (copy email, resume,
  WhatsApp/LinkedIn/GitHub/Kaggle), footer with "Replay the build".
- Own swarm engine (`src/swarm/`): 14 cursors on desktop, 7 on phones; boxes drawn with selection frame,
  size badge, ruler marks and dashed guides; text typed with caret-following I-beam; scroll-gated;
  bar with layers count, progress, Building / "Scroll to build" / Live, speed, sound, skip.
- Checked (headless Edge): build at 1440x900 over time (screenshots), full build after scrolling ends
  with bar gone and nothing hidden; 390 and 360 widths: no sideways scroll; phone full build at 4x
  completes; skip leaves 0 hidden elements and 0 leftover typing spans; module tabs, filters and copy
  email work; 0 console errors; `tsc -b` clean.
- OPEN: user to review on http://localhost:5175 (`npm run dev`). Decide later: real photo for the hero,
  hosting (new Netlify site or replace the current one), git repo, Buddy assistant (not ported).
