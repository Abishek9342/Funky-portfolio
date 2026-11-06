import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { datasets, experience, playroom, profile, publications, skillGroups, whatsappUrl } from './data/content'
import { startSwarm } from './swarm/swarm'

// data-build marks what the swarm rebuilds on load: "box" = drawn as a rectangle, then shown;
// "text" = typed in character by character. Anything unmarked appears with its parent.

// **bold** in content strings
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  )
}

const pothys = experience[0]
const cobuild = experience[1]
const find = (title: string) => experience.flatMap((e) => e.projects).find((p) => p.title.startsWith(title))!

function SecHead({ n, code, kicker, title, sub }: { n: number; code: string; kicker: string; title: string; sub?: string }) {
  return (
    <>
      <div className="sec-rule" aria-hidden="true">
        <span data-build="text">// {String(n).padStart(2, '0')}.00 {code}</span>
        <i />
        <span data-build="text">INDEX [{String(n).padStart(2, '0')} / 05]</span>
      </div>
      <p className="kicker" data-build="text">{kicker}</p>
      <h2 className="h2" data-build="text">{title}</h2>
      {sub && <p className="sec-sub" data-build="text">{sub}</p>}
    </>
  )
}

function Nav() {
  return (
    <header className="nav" data-build="box">
      <a className="nav-logo" href="#top" aria-label="Back to top">
        <span className="nav-mark" data-build="box">AS</span>
        <span className="nav-name" data-build="text">ABISHEK.</span>
      </a>
      <nav className="nav-links" aria-label="Sections">
        {[['About', '#about'], ['Work', '#work'], ['Matrix', '#matrix'], ['Contact', '#contact']].map(([l, h]) => (
          <a key={h} href={h} data-build="text">{l}</a>
        ))}
      </nav>
      <div className="nav-cta">
        <span className="nav-status" data-build="text"><i /> Available</span>
        <a href="#contact" className="nav-dispatch" data-build="text">CONTACT →</a>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-word" aria-hidden="true" data-build="text">PORTFOLIO</div>
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="hello" data-build="text">Hello, I’m</p>
          <h1 className="hero-name" data-build="box"><span data-build="text">ABISHEK.</span></h1>
          <div className="hero-role" data-build="box"><i /><span data-build="text">AI ENGINEER</span><b className="caret" /></div>
          <p className="hero-intro" data-build="text">
            I build <b>production LLM platforms</b>, <b>agentic tools</b> and <b>full-stack applications</b>: from a
            Claude-integrated MCP server to a finance operations platform used daily by a retailer’s finance team.
          </p>
          <div className="hero-ctas">
            <a className="btn-ghost" href="#contact" data-build="text">GET IN TOUCH →</a>
            <a className="btn-outline" href="#work" data-build="box">VIEW MY WORK</a>
          </div>
          <dl className="stats" data-build="box">
            {[['~20', 'Finance modules', 'in daily use'], ['500+', 'Automated', 'tests'], ['8', 'MCP tools', 'for Claude']].map(([v, a, b]) => (
              <div key={a} data-build="box"><dt data-build="text">{v}</dt><dd data-build="text">{a}<br />{b}</dd></div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}

function Status() {
  const cards = [
    ['Finance automation', 'Reconciliation and GST engines the finance team runs every day, with tests and production deploys.'],
    ['Agents and MCP', 'Claude tools over MCP, function-calling assistants, and a maker/checker agent that verifies its own findings.'],
    ['Side projects and research', 'Playroom, a live multiplayer games app; truScanner on PyPI; an IEEE paper; four public Kaggle datasets.'],
  ]
  return (
    <section className="status">
      <p className="kicker kicker-dot" data-build="text">SYSTEMS ONLINE</p>
      <div className="status-grid">
        {cards.map(([t, d], i) => (
          <article key={t} className="panel status-card" data-build="box">
            <span className="mono-n" data-build="text">0{i + 1}.</span>
            <h3 data-build="text">{t}</h3>
            <p data-build="text">{d}</p>
          </article>
        ))}
      </div>
      <ul className="tags">
        {['Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL', 'Claude', 'MCP', 'GCP', 'AWS', 'Cloudflare'].map((t) => (
          <li key={t} data-build="box">{t}</li>
        ))}
      </ul>
    </section>
  )
}

function About() {
  const principles = [
    ['Ship it to production', 'Real users, real data, automated tests and a deploy pipeline. A demo is the start, not the finish.'],
    ['People confirm the actions', 'Assistants prepare emails and reports; nothing is sent until a person approves it.'],
    ['Verify against the source', 'Totals checked against statement summaries, a second model re-checking the first, results matched to manual work.'],
  ]
  return (
    <section className="section" id="about">
      <SecHead n={1} code="SEC_ABOUT" kicker="ENGINEER PROFILE" title="Background & Approach" />
      <div className="panel about" data-build="box">
        <div className="about-text">
          <p data-build="text">
            I’m Abishek S, an AI engineer with a <b>B.Tech in Artificial Intelligence and Data Science</b> from Mepco
            Schlenk Engineering College.
          </p>
          <p data-build="text">
            At <b>{cobuild.company}</b> ({cobuild.dates}) I built a Claude-integrated MCP server, a legal RAG platform and an
            open-source PII scanner. Since {pothys.dates.split(' –')[0]} I build and own the <b>finance operations platform</b> at {pothys.company}.
          </p>
          <blockquote data-build="text">“I build AI systems that ship, not just demos.”</blockquote>
        </div>
        <ol className="principles">
          {principles.map(([t, d], i) => (
            <li key={t}>
              <span className="mono-n" data-build="text">0{i + 1}</span>
              <div><h3 data-build="text">{t}</h3><p data-build="text">{d}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// The finance platform's modules, picked like layers.
function Layers() {
  const [i, setI] = useState(0)
  const p = pothys.projects[i]
  return (
    <div className="layers">
      <div className="layer-tabs" role="tablist" aria-label="Platform modules">
        {pothys.projects.map((m, k) => (
          <button key={m.title} role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => setI(k)} data-build="box">
            M{k + 1}
          </button>
        ))}
      </div>
      <div className="layer-body" key={i} role="tabpanel">
        <h4>{p.title}</h4>
        <p><Rich text={p.description} /></p>
        <ul className="chips">{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
    </div>
  )
}

function Flagship({ tag, title, meta, children, link, links }: { tag: string; title: string; meta: string; children: ReactNode; link?: string; links?: [string, string][] }) {
  return (
    <article className="panel flag" data-build="box">
      <div className="flag-top">
        <span className="flag-tag" data-build="box">{tag}</span>
        <span className="flag-meta" data-build="text">{meta}</span>
      </div>
      <h3 className="flag-title" data-build="text">{title}</h3>
      {children}
      {link && <a className="flag-link" href={link} target="_blank" rel="noreferrer" data-build="text">VIEW SOURCE ↗</a>}
      {links && (
        <div className="flag-links">
          {links.map(([l, h]) => <a key={h} className="flag-link" href={h} target="_blank" rel="noreferrer" data-build="text">{l}</a>)}
        </div>
      )}
    </article>
  )
}

function Work() {
  const mcp = find('Lead Management'), rag = find('truAI'), scan = find('truScanner')
  return (
    <section className="section" id="work">
      <SecHead n={2} code="SEC_WORK" kicker="PRODUCTION SHOWCASE" title="Flagship Builds"
        sub="Systems in daily use by a finance team, sales automation on AWS, a live multiplayer games app, and open source on PyPI." />
      <div className="flags">
        <Flagship tag="CORE" title="PRPL Finance Operations Platform" meta={`${pothys.company} · ${pothys.dates}`}>
          <p className="flag-desc" data-build="text">
            The company’s finance automation platform: <b>~20 reconciliation and GST modules used daily</b> by the finance
            team, <b>500+ automated tests</b>, deployed on Google Cloud. Pick a module:
          </p>
          <Layers />
        </Flagship>
        <Flagship tag="AGENTS" title={mcp.title} meta={`${cobuild.company} · MCP`} link={mcp.link}>
          <p className="flag-desc" data-build="text"><Rich text={mcp.description} /></p>
          <ul className="chips">{mcp.tags.map((t) => <li key={t} data-build="box">{t}</li>)}</ul>
        </Flagship>
        <Flagship tag="RAG" title={rag.title} meta={`${cobuild.company} · Legal AI`}>
          <p className="flag-desc" data-build="text"><Rich text={rag.description} /></p>
          <ul className="chips">{rag.tags.map((t) => <li key={t} data-build="box">{t}</li>)}</ul>
        </Flagship>
        <Flagship tag="PERSONAL · LIVE" title={playroom.title} meta="Personal project · Cloudflare"
          links={[['PLAY IT LIVE ↗', playroom.live], ['VIEW SOURCE ↗', playroom.source]]}>
          <p className="flag-desc" data-build="text"><Rich text={playroom.description} /></p>
          <ul className="chips">{playroom.tags.map((t) => <li key={t} data-build="box">{t}</li>)}</ul>
        </Flagship>
        <Flagship tag="OPEN SOURCE" title={scan.title} meta="PyPI · v0.2.10" link={scan.link}>
          <p className="flag-desc" data-build="text"><Rich text={scan.description} /></p>
          <ul className="chips">{scan.tags.map((t) => <li key={t} data-build="box">{t}</li>)}</ul>
        </Flagship>
      </div>
    </section>
  )
}

type Cat = 'ai' | 'data' | 'open'
const MATRIX: { cat: Cat; title: string; text: string; tags: string[]; link?: string; label?: string }[] = [
  { cat: 'ai', title: find('WarpX').title, text: find('WarpX').description, tags: find('WarpX').tags },
  { cat: 'ai', title: find('Enterprise Email').title, text: find('Enterprise Email').description, tags: find('Enterprise Email').tags },
  ...datasets.map((d) => ({ cat: 'data' as Cat, title: d.title, text: d.detail, tags: ['Kaggle'], link: d.link, label: 'KAGGLE ↗' })),
  ...publications.filter((p) => !p.title.startsWith('truScanner')).map((p) => ({ cat: 'open' as Cat, title: p.title, text: p.detail, tags: [p.link?.includes('ieee') ? 'IEEE' : 'PyPI'], link: p.link, label: p.link?.includes('ieee') ? 'IEEE XPLORE ↗' : 'PYPI ↗' })),
]

function Matrix() {
  const [f, setF] = useState<'all' | Cat>('all')
  const filters: [typeof f, string][] = [['all', 'All'], ['ai', 'AI & Agents'], ['data', 'Datasets'], ['open', 'Research & Open Source']]
  return (
    <section className="section" id="matrix">
      <SecHead n={3} code="SEC_MATRIX" kicker="SYSTEMS MATRIX" title="More Builds & Research" />
      <div className="filters" role="group" aria-label="Filter">
        {filters.map(([k, l]) => (
          <button key={k} className={f === k ? 'on' : ''} aria-pressed={f === k} onClick={() => setF(k)} data-build="box">{l}</button>
        ))}
      </div>
      <div className="matrix">
        {MATRIX.map((m) => (
          <article key={m.title} className={`panel cell${f === 'all' || f === m.cat ? '' : ' off'}`} data-build="box">
            <span className="cell-cat" data-build="text">{m.tags.join(' · ')}</span>
            <h3 data-build="text">{m.title}</h3>
            <p data-build="text"><Rich text={m.text} /></p>
            {m.link && <a href={m.link} target="_blank" rel="noreferrer" data-build="text">{m.label}</a>}
          </article>
        ))}
      </div>
    </section>
  )
}

function Stack() {
  return (
    <section className="section" id="stack">
      <SecHead n={4} code="SEC_STACK" kicker="TOOLCHAIN" title="Stack" />
      <div className="panel stack" data-build="box">
        {skillGroups.map((g) => (
          <div key={g.label} className="stack-row">
            <span className="mono-n" data-build="text">{g.label}</span>
            <ul className="chips">{g.items.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function Contact() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(profile.email) } catch {
      const t = document.createElement('textarea'); t.value = profile.email; document.body.append(t); t.select(); document.execCommand('copy'); t.remove()
    }
    setCopied(true); setTimeout(() => setCopied(false), 2200)
  }
  return (
    <section className="section" id="contact">
      <SecHead n={5} code="SEC_CONTACT" kicker="DIRECT CONNECT" title="Let’s Build Something That Ships." />
      <div className="panel contact" data-build="box">
        <p className="contact-sub" data-build="text">
          Reach out directly by email, or find me on WhatsApp, LinkedIn, GitHub and Kaggle.
        </p>
        <a className="contact-mail" href={`mailto:${profile.email}`} data-build="text">{profile.email}</a>
        <div className="contact-actions">
          <button className="btn-red" onClick={copy} data-build="box">{copied ? 'COPIED ✓' : 'COPY EMAIL ADDRESS'}</button>
          <a className="btn-outline" href={profile.resumeUrl} download data-build="box">DOWNLOAD RESUME</a>
        </div>
        <p className="copied" role="status" aria-live="polite">{copied ? 'Email address copied to your clipboard.' : ''}</p>
        <ul className="socials">
          {[['WhatsApp', whatsappUrl], ['LinkedIn', profile.linkedin], ['GitHub', profile.github], ['Kaggle', profile.kaggle]].map(([l, h]) => (
            <li key={l}><a href={h} target="_blank" rel="noreferrer" data-build="box">{l} ↗</a></li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function App() {
  useEffect(() => startSwarm(document.getElementById('page')!), [])
  return (
    <div className="page" id="page">
      <div className="op-bg" aria-hidden="true" />
      <Nav />
      <main>
        <Hero />
        <Status />
        <About />
        <Work />
        <Matrix />
        <Stack />
        <Contact />
      </main>
      <footer className="footer">
        <span data-build="text">© 2026 Abishek S</span>
        <button className="replay" onClick={() => { scrollTo(0, 0); location.reload() }} data-build="text">↻ Replay the build</button>
      </footer>
    </div>
  )
}
