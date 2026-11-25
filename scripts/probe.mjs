// Debug: raycast a screen point and list what's hit, before and after a Viewport round-trip.
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe'), headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], protocolTimeout: 240000 });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
await p.goto('http://localhost:5186/', { waitUntil: 'networkidle0' });
await p.waitForFunction(() => window.__live3d, { timeout: 180000, polling: 250 });
await new Promise((r) => setTimeout(r, 3000));
const probe = () => p.evaluate(() => {
  const { scene, camera, THREE } = window.__scene;
  const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2((720 / 1440) * 2 - 1, -(640 / 900) * 2 + 1), camera);
  return rc.intersectObjects(scene.children, true).slice(0, 6).map((h) => `${h.object.type}:${h.object.geometry?.type}:${h.object.material?.type} d=${h.distance.toFixed(1)} pos=${h.object.getWorldPosition(new THREE.Vector3()).toArray().map((v) => v.toFixed(1))}`);
});
console.log('before', await probe());
await p.evaluate(() => [...document.querySelectorAll('.shading-pills button')][1].click()); await new Promise((r) => setTimeout(r, 1500));
console.log('viewport', await probe());
await p.evaluate(() => [...document.querySelectorAll('.shading-pills button')][3].click()); await new Promise((r) => setTimeout(r, 2500));
console.log('after', await probe());
await b.close();
