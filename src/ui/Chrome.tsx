import { useEffect, useMemo, useRef, useState } from 'react';
import { reducedMotion, setShading, useStore } from '../store';

/** Chapters in scroll order; ids match the section ids. */
export const CHAPTERS = [
  ['top', 'Render'],
  ['experience', 'Experience'],
  ['skills', 'Skills'],
  ['publications', 'Publications'],
  ['freelance', 'Freelance'],
  ['contact', 'Contact'],
] as const;

export function useActiveChapter() {
  const [active, setActive] = useState('top');
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), {
      rootMargin: '-45% 0px -50% 0px',
    });
    CHAPTERS.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return active;
}

/**
 * Cycles-style intro: the poster "renders in" bucket by bucket (dark tiles resolve from the centre
 * outward) in ~1.4 s. Purely decorative: the HTML content is already readable above it.
 */
export function IntroTiles() {
  const [gone, setGone] = useState(reducedMotion());
  const cols = 12, rows = 7;
  const delays = useMemo(() => {
    const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
    const cells = Array.from({ length: cols * rows }, (_, i) => i);
    const order = [...cells].sort((a, b) => Math.hypot((a % cols) - cx, ((a / cols) | 0) - cy) - Math.hypot((b % cols) - cx, ((b / cols) | 0) - cy));
    const d = new Array(cells.length);
    order.forEach((cell, k) => (d[cell] = 80 + k * 15));
    return d as number[];
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => setGone(true), 2100);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div className="intro" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {delays.map((d, i) => (
        <span key={i} style={{ animationDelay: `${d}ms` }} />
      ))}
      <p className="intro-meta">
        <span>Rendering</span> Sample 128/128 · Tiles {cols * rows}/{cols * rows}
      </p>
    </div>
  );
}

function SphereIcon({ kind }: { kind: 'wire' | 'solid' | 'material' | 'rendered' }) {
  return (
    <svg viewBox="0 0 20 20" className="sph" aria-hidden="true">
      <defs>
        <radialGradient id={`g-${kind}`} cx="35%" cy="32%" r="70%">
          <stop offset="0" stopColor={kind === 'rendered' ? '#ffffff' : kind === 'material' ? '#f2d2c4' : '#eeeeee'} />
          <stop offset="1" stopColor={kind === 'rendered' ? '#3b5168' : kind === 'material' ? '#7a4a3a' : '#555'} />
        </radialGradient>
      </defs>
      {kind === 'wire' ? (
        <g fill="none" stroke="currentColor" strokeWidth="1.1">
          <circle cx="10" cy="10" r="7.5" />
          <ellipse cx="10" cy="10" rx="7.5" ry="3" />
          <ellipse cx="10" cy="10" rx="3" ry="7.5" />
        </g>
      ) : (
        <circle cx="10" cy="10" r="7.5" fill={`url(#g-${kind})`} />
      )}
    </svg>
  );
}

/** Blender header-style shading pills. Wireframe/Solid = Viewport, Material/Rendered = Rendered. */
export function ShadingSwitch() {
  const shading = useStore((s) => s.shading);
  const live = useStore((s) => s.live);
  if (!live) return null;
  const items = [
    { k: 'wire' as const, mode: 'viewport' as const, label: 'Viewport (wireframe)' },
    { k: 'solid' as const, mode: 'viewport' as const, label: 'Viewport' },
    { k: 'material' as const, mode: 'rendered' as const, label: 'Material preview' },
    { k: 'rendered' as const, mode: 'rendered' as const, label: 'Rendered' },
  ];
  const on = (k: string, mode: string) => shading === mode && (k === 'solid' || k === 'rendered');
  return (
    <div className="shading" role="group" aria-label="Viewport shading">
      <button type="button" className={`shading-label ${shading === 'viewport' ? 'on' : ''}`} onClick={() => setShading('viewport')}>
        Viewport
      </button>
      <div className="shading-pills">
        {items.map((it) => (
          <button key={it.k} type="button" title={it.label} aria-label={it.label} aria-pressed={on(it.k, it.mode)} className={on(it.k, it.mode) ? 'on' : ''} onClick={() => setShading(it.mode)}>
            <SphereIcon kind={it.k} />
          </button>
        ))}
      </div>
      <button type="button" className={`shading-label ${shading === 'rendered' ? 'on' : ''}`} onClick={() => setShading('rendered')}>
        Rendered
      </button>
    </div>
  );
}

/** Film timecode HUD (HH:MM:SS:FF at 24 fps) + Blender viewport overlay text in Viewport mode. */
export function Hud({ active }: { active: string }) {
  const shading = useStore((s) => s.shading);
  const stats = useStore((s) => s.stats);
  const tcRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const pad = (n: number) => String(n).padStart(2, '0');
    let last = -1;
    const loop = () => {
      const f = Math.floor(((performance.now() - t0) / 1000) * 24);
      if (f !== last && tcRef.current) {
        last = f;
        const s = Math.floor(f / 24);
        tcRef.current.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f % 24)}`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const idx = Math.max(0, CHAPTERS.findIndex(([id]) => id === active));
  const fmt = (n: number) => n.toLocaleString('en-US');
  return (
    <>
      <div className="hud" aria-hidden="true">
        <span className="hud-engine">{shading === 'rendered' ? 'Cycles' : 'Workbench'}</span>
        <b ref={tcRef}>00:00:00:00</b>
        <span className="hud-hide-sm">
          SHOT {String(idx + 1).padStart(2, '0')} / {String(CHAPTERS.length).padStart(2, '0')} · {shading === 'rendered' ? '128 spp' : 'Solid'}
        </span>
      </div>
      {shading === 'viewport' && (
        <div className="vp-overlay" aria-hidden="true">
          <p>User Perspective</p>
          <p>(1) Scene | Portfolio</p>
          <p className="vp-stats">
            Verts {fmt(stats.verts)} · Faces {fmt(stats.faces)}
          </p>
        </div>
      )}
    </>
  );
}

/** Chapter card that slides in when a new section takes over: "SHOT 03 / 06 · SKILLS". */
export function ChapterCard({ active }: { active: string }) {
  const [shown, setShown] = useState<string | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setShown(active);
    const t = window.setTimeout(() => setShown(null), 2400);
    return () => clearTimeout(t);
  }, [active]);
  const idx = CHAPTERS.findIndex(([id]) => id === shown);
  if (!shown || idx < 0) return null;
  return (
    <div className="chapter" key={shown} aria-hidden="true">
      <span className="chapter-n">
        SHOT {String(idx + 1).padStart(2, '0')} / {String(CHAPTERS.length).padStart(2, '0')}
      </span>
      <span className="chapter-name">{CHAPTERS[idx][1]}</span>
    </div>
  );
}

/** Switching back to Rendered: progressive samples with noise clearing, like Cycles denoising. */
export function RenderReveal() {
  const revealId = useStore((s) => s.revealId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const [sample, setSample] = useState(1);
  useEffect(() => {
    if (!revealId) return;
    setActive(true);
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    const w = 200, h = 120;
    if (c) {
      c.width = w;
      c.height = h;
    }
    const img = ctx?.createImageData(w, h);
    const t0 = performance.now();
    const dur = 2200;
    let raf = 0;
    const loop = () => {
      const p = Math.min(1, (performance.now() - t0) / dur);
      const e = 1 - (1 - p) ** 3;
      setSample(Math.max(1, Math.round(e * 128)));
      if (ctx && img) {
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.random() * 255;
          img.data[i] = v;
          img.data[i + 1] = v;
          img.data[i + 2] = v * 1.05;
          img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      }
      if (c) c.style.opacity = String((1 - e) * 0.85);
      if (p < 1) raf = requestAnimationFrame(loop);
      else setActive(false);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [revealId]);
  return (
    <div className={`reveal ${active ? 'on' : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} />
      {active && (
        <div className="reveal-meta">
          <span>Rendering</span>
          <span>
            Sample {sample}/128 {sample > 96 ? '· Denoising' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
