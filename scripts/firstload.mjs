// What JS is downloaded before first contentful paint? (resource timing, real responseEnd)
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import puppeteer from 'puppeteer-core';
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const b = await puppeteer.launch({ executablePath: join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe'), headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 }); await p.setCacheEnabled(false);
await p.goto('http://localhost:5186/', { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 1500));
const r = await p.evaluate(() => {
  const fcp = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint')?.startTime ?? 0;
  return { fcp, js: performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.js')).map((e) => ({ n: new URL(e.name).pathname, start: Math.round(e.startTime), end: Math.round(e.responseEnd) })) };
});
let before = 0;
for (const j of r.js) { const gz = gzipSync(readFileSync(join(root, 'dist', j.n))).length; const pre = j.start <= r.fcp; if (pre) before += gz; console.log(pre ? 'BEFORE-FCP' : 'after     ', j.n, Math.round(gz / 1024) + 'KB gz', 'start', j.start); }
console.log('FCP', Math.round(r.fcp), 'ms; JS requested before FCP:', Math.round(before / 1024), 'KB gzip');
await b.close();
