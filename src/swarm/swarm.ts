// Swarm build: on load the page starts blank and a crew of named cursors rebuilds it in place.
// Boxes ([data-build="box"]) are drawn corner to corner with a selection frame, size badge and ruler
// guides, then shown; text ([data-build="text"]) is typed into the real DOM (the rest of the text
// stays laid out but invisible, so nothing on the page shifts). Building follows the scroll.
// Concept after Joel Califa's "Swarm"; this implementation is original.
import './swarm.css'

type Kind = 'box' | 'text'
type State = 'pending' | 'claimed' | 'done'
interface Target { el: HTMLElement; kind: Kind; parent: Target | null; state: State; i: number }
type Cursor = 'arrow' | 'cross' | 'text'
interface Agent {
  name: string; color: string; x: number; y: number; el: HTMLDivElement; cursor: Cursor; busy: boolean
  idleUntil: number
}
// a typed text node: the original node is kept aside and put back untouched (React owns it)
interface Typing { orig: Text; typed: Text; ghost: HTMLSpanElement }

const NAMES = ['Ada', 'Linus', 'Grace', 'Alan', 'Hedy', 'Ken', 'Barbara', 'Dennis', 'Radia', 'Guido', 'Frances', 'Bjarne', 'Katherine', 'Edsger', 'Joan', 'Donald']
const COLORS = ['#F24E1E', '#A259FF', '#1ABCFE', '#0ACF83', '#FF7262', '#FFC700', '#E8467C', '#14AE5C', '#0D99FF', '#FF8A00', '#00B5CE', '#9747FF']

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const ARROW = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l15 7.2-6.6 1.8-2.6 6.5z" fill="var(--c)" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>'
const CROSS = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M11 3v16M3 11h16" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M11 3v16M3 11h16" stroke="var(--c)" stroke-width="2" stroke-linecap="round"/></svg>'
const BEAM = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M7 3h3l1 1 1-1h3M7 19h3l1-1 1 1h3M11 4v14" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/><path d="M7 3h3l1 1 1-1h3M7 19h3l1-1 1 1h3M11 4v14" fill="none" stroke="var(--c)" stroke-width="1.8" stroke-linecap="round"/></svg>'

export function shouldRun() {
  if (typeof window === 'undefined') return false
  if (/[?&]swarm=off/.test(location.search)) return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function startSwarm(root: HTMLElement): () => void {
  const html = document.documentElement
  if (!shouldRun()) { html.classList.remove('sw-pre'); return () => {} }
  ;(window as unknown as { __swarmStarted?: boolean }).__swarmStarted = true
  // the build always starts at the top of the page (a refresh mid-page too)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  scrollTo({ top: 0, left: 0, behavior: 'instant' })

  let dead = false
  let speed = 1
  let sound = false
  let audio: AudioContext | null = null
  let lastTick = 0
  const typings = new Map<HTMLElement, Typing[]>()

  // ---- targets, in document order; a target waits for its nearest target ancestor
  const els = [...root.querySelectorAll<HTMLElement>('[data-build]')]
  const byEl = new Map<HTMLElement, Target>()
  const targets: Target[] = els.map((el, i) => {
    const t: Target = { el, kind: el.dataset.build === 'text' ? 'text' : 'box', parent: null, state: 'pending', i }
    byEl.set(el, t)
    return t
  })
  for (const t of targets) {
    let p = t.el.parentElement
    while (p && p !== root && !byEl.has(p)) p = p.parentElement
    t.parent = p && byEl.has(p) ? byEl.get(p)! : null
  }
  // nothing visible to build (display:none on this screen size): count it as done
  for (const t of targets) if (!t.el.getClientRects().length) t.state = 'done'
  const total = targets.length
  let built = targets.filter((t) => t.state === 'done').length

  root.classList.add('sw-on')
  html.classList.remove('sw-pre')
  for (const t of targets) if (t.state === 'done') t.el.classList.add('sw-done')

  // ---- overlay: rulers (screen space) + world (page space, follows the scroll)
  const layer = document.createElement('div')
  layer.className = 'sw-layer'
  layer.setAttribute('aria-hidden', 'true')
  const world = document.createElement('div')
  world.className = 'sw-world'
  const rulerTop = document.createElement('div')
  rulerTop.className = 'sw-ruler sw-ruler-top'
  const rulerLeft = document.createElement('div')
  rulerLeft.className = 'sw-ruler sw-ruler-left'
  const markTop = document.createElement('i')
  const markLeft = document.createElement('i')
  rulerTop.append(markTop)
  rulerLeft.append(markLeft)
  layer.append(world, rulerTop, rulerLeft)
  document.body.append(layer)
  const numbers = () => {
    rulerTop.querySelectorAll('span').forEach((s) => s.remove())
    rulerLeft.querySelectorAll('span').forEach((s) => s.remove())
    for (let x = 100; x < innerWidth; x += 100) { const s = document.createElement('span'); s.textContent = String(x); s.style.left = x + 'px'; rulerTop.append(s) }
    const y0 = Math.ceil(scrollY / 100) * 100
    for (let y = y0; y < scrollY + innerHeight; y += 100) { const s = document.createElement('span'); s.textContent = String(y); s.style.top = y - scrollY + 'px'; rulerLeft.append(s) }
  }
  numbers()

  // ---- control bar
  const bar = document.createElement('div')
  bar.className = 'sw-bar'
  bar.innerHTML = `
    <span class="sw-faces"></span><span class="sw-count"><b></b> agents</span><span class="sw-sep"></span>
    <span class="sw-layers"><b>0</b> / ${total} layers</span><span class="sw-prog"><i></i></span>
    <span class="sw-state">Building</span>
    <button type="button" class="sw-speed" aria-label="Build speed">1×</button>
    <button type="button" class="sw-sound" aria-pressed="false">Tap for sound</button>
    <button type="button" class="sw-skip" aria-label="Skip the build and show the page">✕</button>`
  document.body.append(bar)
  const q = <T extends Element>(s: string) => bar.querySelector(s) as T
  const elBuilt = q<HTMLElement>('.sw-layers b'), elProg = q<HTMLElement>('.sw-prog i'), elState = q<HTMLElement>('.sw-state')
  q<HTMLButtonElement>('.sw-speed').onclick = (e) => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; (e.currentTarget as HTMLElement).textContent = speed + '×' }
  q<HTMLButtonElement>('.sw-sound').onclick = (e) => {
    sound = !sound
    const b = e.currentTarget as HTMLButtonElement
    b.setAttribute('aria-pressed', String(sound)); b.textContent = sound ? 'Sound on' : 'Tap for sound'
    if (sound && !audio) { try { audio = new AudioContext() } catch { sound = false } }
    if (audio && audio.state === 'suspended') audio.resume()
    blip(660, 0.05)
  }
  q<HTMLButtonElement>('.sw-skip').onclick = () => finish(true)

  // ---- sound: tiny clicks while typing, a blip per box
  function blip(freq: number, dur: number, vol = 0.04) {
    if (!sound || !audio) return
    const o = audio.createOscillator(), g = audio.createGain()
    o.type = 'triangle'; o.frequency.value = freq
    g.gain.setValueAtTime(vol, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur)
    o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur)
  }
  const keyClick = () => { const n = performance.now(); if (n - lastTick > 45) { lastTick = n; blip(rand(1500, 2300), 0.018, 0.025) } }

  // ---- agents
  const nAgents = innerWidth < 700 ? 7 : 14
  const agents: Agent[] = []
  for (let k = 0; k < nAgents; k++) {
    const el = document.createElement('div')
    el.className = 'sw-agent'
    const color = COLORS[k % COLORS.length]
    el.style.setProperty('--c', color)
    el.innerHTML = `<span class="sw-cur">${ARROW}</span>`
    world.append(el)
    // fly in from the edges of the screen
    const side = k % 4
    const x = side === 0 ? -30 : side === 1 ? innerWidth + 30 : rand(0, innerWidth)
    const y = scrollY + (side === 2 ? -30 : side === 3 ? innerHeight + 30 : rand(0, innerHeight))
    agents.push({ name: NAMES[k], color, x, y, el, cursor: 'arrow', busy: false, idleUntil: 0 })
  }
  q<HTMLElement>('.sw-count b').textContent = String(nAgents)
  q<HTMLElement>('.sw-faces').innerHTML = agents.slice(0, 5).map((a) => `<i style="background:${a.color}">${a.name[0]}</i>`).join('')

  const setCursor = (a: Agent, c: Cursor) => {
    if (a.cursor === c) return
    a.cursor = c
    a.el.querySelector('.sw-cur')!.innerHTML = c === 'cross' ? CROSS : c === 'text' ? BEAM : ARROW
    a.el.classList.toggle('centered', c !== 'arrow')
  }
  const place = (a: Agent) => { a.el.style.transform = `translate(${a.x}px, ${a.y}px)` }
  agents.forEach(place)

  // smooth move, page coordinates; returns when it arrives (or the build was torn down)
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms / speed))
  function moveTo(a: Agent, x: number, y: number, ms?: number) {
    const x0 = a.x, y0 = a.y
    const d = Math.hypot(x - x0, y - y0)
    const dur = (ms ?? Math.min(900, 240 + d * 0.55)) / speed
    const t0 = performance.now()
    return new Promise<void>((resolve) => {
      const step = (now: number) => {
        if (dead) return resolve()
        const t = Math.min(1, (now - t0) / dur)
        const e = ease(t)
        a.x = x0 + (x - x0) * e; a.y = y0 + (y - y0) * e
        place(a)
        if (t < 1) requestAnimationFrame(step); else resolve()
      }
      requestAnimationFrame(step)
    })
  }

  const pageRect = (el: Element) => {
    const r = el.getBoundingClientRect()
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }
  }
  const div = (cls: string) => { const d = document.createElement('div'); d.className = cls; world.append(d); return d }

  // ---- building one target
  async function buildBox(a: Agent, t: Target) {
    let r = pageRect(t.el)
    await moveTo(a, r.x, r.y)
    if (dead) return
    setCursor(a, 'cross')
    r = pageRect(t.el)
    const sel = div('sw-sel'), badge = div('sw-badge'), gx = div('sw-guide sw-guide-x'), gy = div('sw-guide sw-guide-y')
    sel.innerHTML = '<i></i><i></i><i></i><i></i>'
    gx.style.cssText = `left:${r.x}px;top:0;height:${document.documentElement.scrollHeight}px`
    gy.style.cssText = `top:${r.y}px;left:0;width:${document.documentElement.scrollWidth}px`
    const dur = Math.min(1100, 420 + (r.w + r.h) * 0.35) / speed
    const t0 = performance.now()
    blip(520, 0.06)
    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        if (dead) return resolve()
        const k = ease(Math.min(1, (now - t0) / dur))
        const w = r.w * k, h = r.h * k
        a.x = r.x + w; a.y = r.y + h; place(a)
        sel.style.cssText = `left:${r.x}px;top:${r.y}px;width:${w}px;height:${h}px`
        badge.textContent = `${Math.round(w)} × ${Math.round(h)}`
        badge.style.cssText = `left:${r.x + w / 2}px;top:${r.y + h + 8}px`
        markTop.style.cssText = `left:${r.x - scrollX}px;width:${w}px`
        markLeft.style.cssText = `top:${r.y - scrollY}px;height:${h}px`
        if (k < 1) requestAnimationFrame(step); else resolve()
      }
      requestAnimationFrame(step)
    })
    if (dead) return
    t.el.classList.add('sw-done', 'sw-pop')
    blip(880, 0.07)
    await wait(260)
    for (const d of [sel, badge, gx, gy]) d.classList.add('sw-fade')
    setTimeout(() => [sel, badge, gx, gy].forEach((d) => d.remove()), 400)
    setCursor(a, 'arrow')
  }

  // Splits every text node of `el` (not inside nested targets) into typed + invisible rest.
  function prepareText(el: HTMLElement) {
    const list: Typing[] = []
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        for (let p = n.parentElement; p && p !== el; p = p.parentElement) if (byEl.has(p)) return NodeFilter.FILTER_REJECT
        return n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
      },
    })
    const nodes: Text[] = []
    while (walker.nextNode()) nodes.push(walker.currentNode as Text)
    for (const orig of nodes) {
      const typed = document.createTextNode('')
      const ghost = document.createElement('span')
      ghost.className = 'sw-ghost'
      ghost.textContent = orig.nodeValue
      orig.parentNode!.insertBefore(typed, orig)
      orig.parentNode!.insertBefore(ghost, orig)
      orig.remove()
      list.push({ orig, typed, ghost })
    }
    typings.set(el, list)
    return list
  }
  function restoreText(el: HTMLElement) {
    const list = typings.get(el)
    if (!list) return
    for (const { orig, typed, ghost } of list) {
      if (ghost.parentNode) { ghost.parentNode.insertBefore(orig, ghost); ghost.remove() }
      typed.remove()
    }
    typings.delete(el)
  }

  async function buildText(a: Agent, t: Target) {
    const r0 = pageRect(t.el)
    await moveTo(a, r0.x, r0.y + Math.min(r0.h, 24) / 2)
    if (dead) return
    setCursor(a, 'text')
    const list = prepareText(t.el)
    t.el.classList.add('sw-typing')
    const frame = div('sw-frame')
    const len = list.reduce((s, x) => s + (x.ghost.textContent || '').length, 0)
    const cps = Math.max(45, len / 2.4) // long paragraphs still take about 2.5 s at 1x
    let last = performance.now(), carry = 0
    for (const item of list) {
      while (!dead && item.ghost.textContent) {
        await new Promise((r) => requestAnimationFrame(r))
        const now = performance.now()
        carry += ((now - last) / 1000) * cps * speed
        last = now
        const n = Math.floor(carry)
        if (!n) continue
        carry -= n
        const rest = item.ghost.textContent
        item.typed.nodeValue += rest.slice(0, n)
        item.ghost.textContent = rest.slice(n)
        keyClick()
        // follow the caret: the start of what's left to type
        const range = document.createRange()
        const target = item.ghost.firstChild || item.ghost
        range.setStart(target, 0); range.setEnd(target, 0)
        const cr = range.getClientRects()[0] || item.ghost.getBoundingClientRect()
        if (cr) { a.x = cr.left + scrollX; a.y = cr.top + scrollY + cr.height / 2; place(a) }
        const r = pageRect(t.el)
        frame.style.cssText = `left:${r.x - 3}px;top:${r.y - 2}px;width:${r.w + 6}px;height:${r.h + 4}px`
      }
    }
    if (dead) return
    restoreText(t.el)
    t.el.classList.remove('sw-typing')
    t.el.classList.add('sw-done')
    frame.classList.add('sw-fade')
    setTimeout(() => frame.remove(), 400)
    setCursor(a, 'arrow')
  }

  // ---- scheduling: next pending target near the screen whose container is built
  const near = (t: Target) => t.el.getBoundingClientRect().top < innerHeight * 1.15
  function next(a: Agent): Target | null {
    let best: Target | null = null, bestD = Infinity
    let seen = 0
    for (const t of targets) {
      if (t.state !== 'pending' || (t.parent && t.parent.state !== 'done') || !near(t)) continue
      // prefer the top of the queue, then whatever is closest to this agent
      const r = t.el.getBoundingClientRect()
      const d = Math.hypot(r.left + scrollX - a.x, r.top + scrollY - a.y) + t.i * 4
      if (d < bestD) { bestD = d; best = t }
      if (++seen > 12) break
    }
    return best
  }

  let finished = false
  async function run(a: Agent) {
    await wait(rand(0, 500))
    while (!dead && !finished) {
      const t = next(a)
      if (!t) { await wander(a); continue }
      t.state = 'claimed'
      a.busy = true
      if (t.kind === 'box') await buildBox(a, t); else await buildText(a, t)
      a.busy = false
      if (dead) return
      t.state = 'done'
      built++
      progress()
    }
  }
  async function wander(a: Agent) {
    setCursor(a, 'arrow')
    const x = rand(40, innerWidth - 80), y = scrollY + rand(innerHeight * 0.45, innerHeight - 90)
    await moveTo(a, x, y, rand(700, 1300))
    await wait(rand(150, 500))
  }
  function progress() {
    elBuilt.textContent = String(built)
    elProg.style.width = (built / total) * 100 + '%'
    const waiting = !targets.some((t) => t.state !== 'done' && near(t))
    elState.textContent = built >= total ? 'Live' : waiting ? 'Scroll to build ↓' : 'Building'
    elState.classList.toggle('wait', waiting && built < total)
    if (built >= total) finish(false)
  }

  // ---- keep page-space layers in step with the scroll
  let raf = 0
  const sync = () => { world.style.transform = `translate(${-scrollX}px, ${-scrollY}px)` }
  const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { sync(); numbers(); progress() }) }
  sync()
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', onScroll)

  // where the visitor's pointer is (screen space), tracked from the start so the crew knows on finish
  let pointer: { x: number; y: number } | null = null
  const onPointer = (e: PointerEvent) => { pointer = { x: e.clientX, y: e.clientY } }
  addEventListener('pointermove', onPointer, { passive: true })
  addEventListener('pointerdown', onPointer, { passive: true })

  // ---- end: everything built (or skipped): the page goes live and the crew follows the pointer
  function finish(skip: boolean) {
    if (finished) return
    finished = true
    elState.textContent = 'Live'
    bar.classList.add('sw-done-bar')
    setTimeout(() => { reveal(); follow() }, skip ? 0 : 700)
  }
  // Page back to normal: stop building, put every text node back, drop rulers/frames/bar.
  let revealed = false
  function reveal() {
    if (revealed) return
    revealed = true
    dead = true
    for (const el of [...typings.keys()]) restoreText(el)
    for (const t of targets) t.el.classList.remove('sw-done', 'sw-pop', 'sw-typing')
    root.classList.remove('sw-on')
    bar.remove(); rulerTop.remove(); rulerLeft.remove()
    removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll)
    cancelAnimationFrame(raf)
    if (audio) audio.close().catch(() => {})
  }

  // Follow mode: cursors live in screen space and trail the pointer as a loose flock, each on its own
  // spring and slot around it. Until the visitor moves (phones: until they touch) they stay put.
  let followRaf = 0
  function follow() {
    const crew = agents.map((a, k) => {
      setCursor(a, 'arrow')
      layer.append(a.el)
      return {
        a, x: a.x - scrollX, y: a.y - scrollY, vx: 0, vy: 0,
        k: rand(0.018, 0.045), damp: rand(0.8, 0.86),
        ang: (k / agents.length) * Math.PI * 2, r: rand(26, 64), spin: rand(0.25, 0.6) * (k % 2 ? 1 : -1),
      }
    })
    world.remove()
    const step = (now: number) => {
      const t = now / 1000
      for (const c of crew) {
        if (pointer) {
          const tx = pointer.x + Math.cos(c.ang + t * c.spin) * c.r + 6
          const ty = pointer.y + Math.sin(c.ang + t * c.spin) * c.r * 0.75 + 8
          c.vx = (c.vx + (tx - c.x) * c.k) * c.damp
          c.vy = (c.vy + (ty - c.y) * c.k) * c.damp
          c.x += c.vx; c.y += c.vy
        }
        c.a.el.style.transform = `translate(${c.x}px, ${c.y}px)`
      }
      followRaf = requestAnimationFrame(step)
    }
    followRaf = requestAnimationFrame(step)
  }

  // full stop (also React's effect cleanup)
  function teardown() {
    reveal()
    cancelAnimationFrame(followRaf)
    removeEventListener('pointermove', onPointer); removeEventListener('pointerdown', onPointer)
    layer.remove(); bar.remove()
  }

  progress()
  // wait a beat for fonts so the first boxes are measured in the right typeface
  const go = () => { if (!dead) agents.forEach((a) => run(a)) }
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
  if (fonts) Promise.race([fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(go); else go()

  return teardown
}
