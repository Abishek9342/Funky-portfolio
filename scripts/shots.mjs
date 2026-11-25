// Screenshots every camera shot at desktop + phone, the Viewport mode and the Rendered reveal.
// Usage: npm run build && npx vite preview --port 5186 (background) && node scripts/shots.mjs [only=desktop|phone]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const out = join(root, 'screenshots');
mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'http://localhost:5186/';
const only = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe'),
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  protocolTimeout: 240000,
});
const problems = [];
const shots = ['hero', 'rise', 'exp-0', 'exp-1', 'exp-5', 'skills', 'pubs', 'freelance', 'contact'];

for (const [label, vp] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }],
]) {
  if (only && only !== label) continue;
  const p = await browser.newPage();
  p.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' || (m.type() === 'warning' && !/GPU stall|ReadPixels|performance/i.test(t))) problems.push(`${label} ${m.type()}: ${t}`);
  });
  p.on('pageerror', (e) => problems.push(`${label} pageerror: ${e.message}`));
  await p.setViewport(vp);
  await p.goto(base, { waitUntil: 'networkidle0', timeout: 120000 });
  await p.waitForFunction(() => window.__live3d, { timeout: 180000, polling: 250 }).catch(() => problems.push(`${label}: 3D never went live`));
  await sleep(7000); // intro tiles + push-in
  for (const s of shots) {
    await p.evaluate((s) => {
      const el = document.querySelector(`[data-shot="${s}"]`);
      const r = el.getBoundingClientRect();
      const y = r.top + window.scrollY + r.height / 2 - innerHeight / 2;
      const l = window.__lenis;
      if (l) l.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
    }, s);
    await sleep(s === 'hero' ? 2500 : 4500);
    await p.screenshot({ path: join(out, `${label}-${s}.png`) });
  }
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (over > 0) problems.push(`${label}: sideways scroll ${over}px`);
  // Viewport mode at the hero
  await p.evaluate(() => (window.__lenis ? window.__lenis.scrollTo(0, { immediate: true, force: true }) : window.scrollTo(0, 0)));
  await sleep(3000);
  await p.evaluate(() => [...document.querySelectorAll('.shading-pills button')][1].click());
  await sleep(2500);
  await p.screenshot({ path: join(out, `${label}-viewport.png`) });
  await p.evaluate(() => [...document.querySelectorAll('.shading-pills button')][3].click());
  await sleep(350);
  await p.screenshot({ path: join(out, `${label}-reveal.png`) });
  await sleep(2500);
  await p.screenshot({ path: join(out, `${label}-rendered-again.png`) });
  await p.close();
}
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'OK: 0 console errors, no sideways scroll');
