import { lazy, Suspense, useEffect, useState, type MouseEvent } from 'react';
import { datasets, experience, freelanceProjects, freelanceWhatsappUrl, profile, publications, skillGroups, whatsappUrl } from './data/content';
import { posterMode, store, useStore } from './store';
import { scroll } from './scroll';
import { CHAPTERS, ChapterCard, IntroTiles, RenderReveal, useActiveChapter } from './ui/Chrome';

const World = lazy(() => import('./scene/World'));
const LIVE_SITE = 'https://abisheksridharan.netlify.app';

/** **bold** in content strings. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((p, i) => (p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}
    </>
  );
}

/** Adds .in to [data-reveal] elements when they enter (CSS does the motion; no animation lib). */
function useReveals() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }),
      { rootMargin: '0px 0px -12% 0px' },
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/** Load the 3D world after first paint, when the browser is idle. */
function useDeferred3D() {
  const [go, setGo] = useState(posterMode());
  useEffect(() => {
    if (go) return;
    // after the poster, fonts and first paint are done (window load), then on idle
    let idle = 0;
    const start = () => {
      const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 120));
      idle = ric(() => setGo(true), { timeout: 800 }) as number;
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      window.cancelIdleCallback?.(idle);
    };
  }, [go]);
  return go;
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

function Nav({ active }: { active: string }) {
  const light = active === 'top';
  const go = (id: string) => (e: MouseEvent) => {
    if (!scroll.lenis) return;
    e.preventDefault();
    scroll.lenis.scrollTo(`#${id}`, { duration: 2.2 });
  };
  return (
    <header className={`nav ${light ? 'on-light' : ''}`}>
      <a href="#top" className="nav-logo" onClick={go('top')} aria-label="Back to top">
        ABISHEK<span>.</span>
      </a>
      <nav aria-label="Sections" className="nav-links">
        {CHAPTERS.slice(1).map(([id, label], i) => (
          <a key={id} href={`#${id}`} onClick={go(id)} className={active === id ? 'on' : ''}>
            <i>{String(i + 1).padStart(2, '0')}</i>
            {label}
          </a>
        ))}
      </nav>
      <div className="nav-progress" aria-hidden="true">
        {CHAPTERS.map(([id]) => (
          <span key={id} className={active === id ? 'on' : ''} />
        ))}
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="sec hero" data-shot="hero">
      {/* Hero card removed (user 2026-11-25): the 3D title carries the hero. h1 kept for screen readers + SEO. */}
      <h1 className="sr-only">Abishek, AI engineer</h1>
    </section>
  );
}

function Experience() {
  let n = 0;
  return (
    <section id="experience" className="sec exp">
      <div className="title-card" data-shot="rise" data-reveal>
        <p className="kicker">Shot 02 · Work experience</p>
        <h2 data-dust>Experience</h2>
        <ul className="companies">
          {experience.map((job) => (
            <li key={job.company}>
              <b>{job.company}</b> {job.role} · {job.dates}
            </li>
          ))}
        </ul>
      </div>
      {experience.map((job) =>
        job.projects.map((p) => {
          const i = n++;
          return (
            <div key={p.title} className={`shot-slot ${i % 2 === 0 ? 'left' : 'right'}`} data-shot={`exp-${i}`}>
              <article className="panel project" data-reveal>
                <div className="project-top">
                  <span className="project-n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="project-co">
                    {job.company} · {job.dates}
                  </span>
                </div>
                <h3>{p.title}</h3>
                <p className="project-desc">
                  <Rich text={p.description} />
                </p>
                <ul className="tags">
                  {p.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                {p.link && (
                  <a className="project-link" href={p.link} target="_blank" rel="noreferrer">
                    {p.link.includes('pypi') ? 'View on PyPI' : p.link.includes('github') ? 'View source' : 'Open it live'} ↗
                  </a>
                )}
              </article>
            </div>
          );
        }),
      )}
    </section>
  );
}

function Skills() {
  return (
    <section id="skills" className="sec skills" data-shot="skills">
      <div className="title-card" data-reveal>
        <p className="kicker">Shot 03 · Technical skills</p>
        <h2 data-dust>Skills</h2>
      </div>
      <div className="skill-grid">
        {skillGroups.map((g, i) => (
          <div key={g.label} className="skill" data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
            <h3>{g.label}</h3>
            <p>{g.items.join(' · ')}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Publications() {
  return (
    <section id="publications" className="sec pubs" data-shot="pubs">
      <div className="title-card" data-reveal>
        <p className="kicker">Shot 04 · Publications &amp; open source</p>
        <h2 data-dust>Publications</h2>
      </div>
      <div className="pub-list">
        {publications.map((p) => (
          <a key={p.title} className="pub" href={p.link} target="_blank" rel="noreferrer" data-reveal>
            <span className="pub-type">Publication</span>
            <h3>{p.title}</h3>
            <p>{p.detail}</p>
            <span className="pub-go">{p.linkLabel} ↗</span>
          </a>
        ))}
      </div>
      <div className="title-card sub" data-reveal>
        <p className="kicker">Kaggle datasets</p>
        <a href={profile.kaggle} target="_blank" rel="noreferrer" className="kaggle-link">
          4 datasets · 500+ downloads ↗
        </a>
      </div>
      <div className="pub-list four">
        {datasets.map((p) => (
          <a key={p.title} className="pub" href={p.link} target="_blank" rel="noreferrer" data-reveal>
            <span className="pub-type">Dataset</span>
            <h3>{p.title}</h3>
            <p>{p.detail}</p>
            <span className="pub-go">{p.linkLabel} ↗</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function Freelance() {
  return (
    <section id="freelance" className="sec freelance" data-shot="freelance">
      <div className="title-card" data-reveal>
        <p className="kicker">Shot 05 · Freelance work</p>
        <h2 data-dust>Explore freelance projects</h2>
        <p className="sec-sub">
          Five live sample websites for small businesses. Ordering, booking and enquiries all land on WhatsApp. The businesses are fictional; the
          sites are real.
        </p>
      </div>
      <div className="fl-row">
        {freelanceProjects.map((p) => (
          <a key={p.slug} className="fl" href={`${LIVE_SITE}/work/${p.slug}/`} target="_blank" rel="noreferrer" data-reveal>
            <img src={`/work/${p.slug}.webp`} alt="" loading="lazy" width={720} height={484} />
            <span className="fl-niche">{p.niche}</span>
            <h3>{p.name}</h3>
            <span className="fl-go">Open live site ↗</span>
          </a>
        ))}
      </div>
      <a className="btn btn-torch fl-cta" href={freelanceWhatsappUrl} target="_blank" rel="noreferrer" data-reveal>
        Your business could be next · Get a website
      </a>
    </section>
  );
}

function Contact() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };
  return (
    <section id="contact" className="sec contact" data-shot="contact">
      <div className="contact-inner" data-reveal>
        <p className="kicker">Shot 06 · Get in touch</p>
        <h2 data-dust>
          Let’s <em>talk.</em>
        </h2>
        <p className="contact-sub">Reach out directly by email, or find me on GitHub, LinkedIn, WhatsApp and Kaggle.</p>
        <div className="contact-actions">
          <button type="button" className="btn btn-torch" onClick={copy}>
            {copied ? 'Email copied ✓' : profile.email}
          </button>
          <a className="btn btn-line light" href={whatsappUrl} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <a className="btn btn-line light" href={profile.resumeUrl} target="_blank" rel="noreferrer">
            Resume
          </a>
        </div>
        <ul className="socials">
          <li>
            <a href={profile.github} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
          </li>
          <li>
            <a href={profile.linkedin} target="_blank" rel="noreferrer">
              LinkedIn ↗
            </a>
          </li>
          <li>
            <a href={profile.kaggle} target="_blank" rel="noreferrer">
              Kaggle ↗
            </a>
          </li>
        </ul>
        <p className="sr-only" role="status" aria-live="polite">
          {copied ? 'Email address copied to your clipboard.' : ''}
        </p>
      </div>
      <footer className="foot">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <span>Rendered in real time · three.js · textures CC0 Poly Haven</span>
      </footer>
    </section>
  );
}

export default function App() {
  const webgl = useStore((s) => s.webgl);
  const live = useStore((s) => s.live);
  const load3d = useDeferred3D();
  const active = useActiveChapter();
  useReveals();
  useEffect(() => {
    if (!hasWebGL()) store.set({ webgl: false });
  }, []);
  // once the live canvas has faded in, the static poster can stop painting
  useEffect(() => {
    if (!live) return;
    const t = window.setTimeout(() => document.getElementById('poster')?.classList.add('done'), 1600);
    return () => clearTimeout(t);
  }, [live]);
  return (
    <>
      {webgl && load3d && (
        <Suspense fallback={null}>
          <World />
        </Suspense>
      )}
      {!posterMode() && <IntroTiles />}
      <div className="grain" aria-hidden="true" />
      <Nav active={active} />
      <ChapterCard active={active} />
      <RenderReveal />
      <main>
        <Hero />
        <Experience />
        <Skills />
        <Publications />
        <Freelance />
        <Contact />
      </main>
    </>
  );
}
