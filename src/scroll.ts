import Lenis from 'lenis';
import { reducedMotion } from './store';

/**
 * Smooth scrolling (Lenis) plus a shared frame-cached scroll reading. The camera rig reads
 * `scroll.y` once per frame instead of listening to scroll events, so there is no layout thrash.
 */
export const scroll = { y: 0, velocity: 0, lenis: null as Lenis | null };

export function startScroll() {
  if (reducedMotion()) {
    const upd = () => (scroll.y = window.scrollY);
    window.addEventListener('scroll', upd, { passive: true });
    upd();
    return;
  }
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.1, anchors: { offset: 0 } });
  scroll.lenis = lenis;
  (window as unknown as { __lenis?: Lenis }).__lenis = lenis; // used by scripts/shots.mjs
  lenis.on('scroll', (l: Lenis) => {
    scroll.y = l.animatedScroll;
    scroll.velocity = l.velocity;
  });
  const raf = (t: number) => {
    lenis.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  scroll.y = window.scrollY;
}
