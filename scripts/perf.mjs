// Load-performance probe: gzip JS bytes, total bytes, time to content visible (FCP/LCP) and to 3D live.
// Usage: node scripts/perf.mjs [url=http://localhost:5186/]   (preview must be running; cache disabled)
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import puppeteer from 'puppeteer-core';
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const url = process.argv[2] || 'http://localhost:5186/';
const b = await puppeteer.launch({ executablePath: join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe'), headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], protocolTimeout: 240000 });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.setCacheEnabled(false);
const reqs = [];
p.on('requestfinished', (r) => reqs.push({ url: r.url(), t: performance.now() }));
const t0 = performance.now();
await p.goto(url, { waitUntil: 'domcontentloaded' });
const paint = await p.evaluate(() => new Promise((res) => {
  const out = {};
  new PerformanceObserver((l) => { for (const e of l.getEntries()) out[e.name] = e.startTime; }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((l) => { const e = l.getEntries().at(-1); out.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  setTimeout(() => res(out), 2500);
}));
let live = null;
try {
  await p.waitForFunction(() => window.__live3d || !document.querySelector('.loader'), { timeout: 90000, polling: 100 });
  live = await p.evaluate(() => window.__live3d ?? performance.now());
} catch {}
await new Promise((r) => setTimeout(r, 1500));
const local = (u) => { const path = new URL(u).pathname; const f = join(root, 'dist', path === '/' ? 'index.html' : path); return existsSync(f) ? readFileSync(f) : null; };
let js = 0, jsGz = 0, all = 0, allGz = 0, firstJsGz = 0;
const firstWindow = paint.lcp ?? paint['first-contentful-paint'] ?? 0;
for (const r of reqs) {
  const buf = local(r.url); if (!buf) continue;
  const gz = /\.(js|css|html|svg|json)$/.test(new URL(r.url).pathname) || new URL(r.url).pathname === '/' ? gzipSync(buf).length : buf.length;
  all += buf.length; allGz += gz;
  if (r.url.endsWith('.js')) { js += buf.length; jsGz += gz; }
}
const firstJs = await p.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.js') && e.startTime < (performance.getEntriesByType('paint').find((x) => x.name === 'first-contentful-paint')?.startTime ?? 0) + 50).map((e) => e.name));
for (const u of firstJs) { const buf = local(u); if (buf) firstJsGz += gzipSync(buf).length; }
console.log(JSON.stringify({ fcp_ms: Math.round(paint['first-contentful-paint'] ?? -1), lcp_ms: Math.round(paint.lcp ?? -1), live3d_ms: live && Math.round(live), js_kb: Math.round(js / 1024), js_gzip_kb: Math.round(jsGz / 1024), first_paint_js_gzip_kb: Math.round(firstJsGz / 1024), total_kb: Math.round(all / 1024), total_transfer_gzip_kb: Math.round(allGz / 1024), requests: reqs.length }, null, 1));
await b.close();
