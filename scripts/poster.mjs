// Renders the hero shot with no UI (?poster) and saves the LCP stills public/poster-{desktop,phone}.webp.
// Usage: npm run build && preview on 5186 && node scripts/poster.mjs && npm run build (to ship the new stills)
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const b = await puppeteer.launch({ executablePath: join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe'), headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], protocolTimeout: 300000 });
for (const [name, vp] of [['desktop', { width: 1920, height: 1080 }], ['phone', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true }]]) {
  const p = await b.newPage();
  await p.setViewport(vp);
  await p.goto('http://localhost:5186/?poster', { waitUntil: 'networkidle0', timeout: 120000 });
  await p.waitForFunction(() => window.__live3d, { timeout: 180000, polling: 200 });
  await new Promise((r) => setTimeout(r, 6000));
  const png = join(root, 'screenshots', `poster-${name}.png`);
  await p.screenshot({ path: png });
  await p.close();
  execFileSync('python', ['-I', '-c', `
from PIL import Image; import os, sys
src, dst, q = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGB')
im.save(dst, 'WEBP', quality=q, method=6)
print(os.path.basename(dst), os.path.getsize(dst)//1024, 'KB', im.size)
`, png, join(root, 'public', `poster-${name}.webp`), name === 'desktop' ? '74' : '70'], { stdio: 'inherit' });
}
await b.close();
