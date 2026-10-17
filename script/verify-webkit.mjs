// Run after the desktop web build. Uses the release CSP and rejects all external requests.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(resolve(root, 'apps/desktop/package.json'));
const { webkit } = require('playwright');
const dist = resolve(root, 'apps/desktop/dist');
const config = JSON.parse(await readFile(resolve(root, 'apps/desktop/src-tauri/tauri.conf.json')));
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.wasm':'application/wasm', '.png':'image/png', '.woff':'font/woff', '.woff2':'font/woff2', '.data':'application/octet-stream' };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(dist + '/')) { res.writeHead(403).end(); return; }
  try {
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type':mime[extname(file)] || 'application/octet-stream', 'Content-Security-Policy':config.app.security.csp }).end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const output = resolve(root, 'build/verification');
mkdirSync(output, { recursive: true });
try {
  browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ viewport:{ width:1280, height:850 } });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const external = [], errors = [], failures = [], logs = [];
  await context.route('**/*', route => {
    if (route.request().url().startsWith(origin + '/')) return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); else logs.push(msg.text()); });
  page.on('requestfailed', req => failures.push(req.url()));
  await page.goto(origin);
  await page.waitForFunction(() => globalThis.__MICROPOLIS_SINGLETON__?.simulator?.mapData?.length === 12000);
  await page.waitForFunction(() => document.querySelector('canvas')?.width > 500);
  const initialTime = await page.evaluate(() => globalThis.__MICROPOLIS_SINGLETON__.simulator.micropolis.cityTime);
  await page.waitForFunction(time => globalThis.__MICROPOLIS_SINGLETON__.simulator.micropolis.cityTime > time, initialTime);
  await page.screenshot({ path:resolve(output, 'micropolis-webkit.png') });

  // Set up an empty construction site, then exercise the ORIGINAL toolbar and mouse handlers.
  await page.evaluate(() => {
    const s = globalThis.__MICROPOLIS_SINGLETON__.simulator;
    s.setPaused(true);
    s.micropolis.clearMap();
    s.micropolis.totalFunds = 20000;
    s.syncMapViews();
    s.render();
  });
  await page.getByRole('button', { name:'U: Residential ($100)', exact:true }).click();
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const construction = await page.evaluate(() => {
    const s = globalThis.__MICROPOLIS_SINGLETON__.simulator;
    return { built:Array.from(s.mapData).filter(v => v !== 0).length, funds:s.micropolis.totalFunds };
  });
  assert.equal(construction.built, 9, 'Mouse click should build a 3x3 residential zone');
  assert.equal(construction.funds, 19900);

  const roundtrip = await page.evaluate(() => {
    const s = globalThis.__MICROPOLIS_SINGLETON__.simulator, c = s.micropolis, fs = s.micropolisengine.FS;
    const time = c.cityTime, funds = c.totalFunds;
    const before = Array.from(s.mapData, v => v & 1023);
    if (!c.saveFile('/verify.mop')) throw new Error('saveFile failed');
    const saved = fs.readFile('/verify.mop').slice();
    c.clearMap(); c.totalFunds = 1;
    fs.writeFile('/verify-load.mop', saved);
    if (!c.loadCity('/verify-load.mop')) throw new Error('loadCity failed');
    s.syncMapViews();
    const ok = JSON.stringify(Array.from(s.mapData, v => v & 1023)) === JSON.stringify(before);
    fs.unlink('/verify.mop'); fs.unlink('/verify-load.mop');
    return { bytes:saved.length, mapRestored:ok, fundsRestored:c.totalFunds === funds, timeRestored:c.cityTime === time };
  });
  assert.deepEqual(roundtrip, { bytes:51120, mapRestored:true, fundsRestored:true, timeRestored:true });
  assert.deepEqual(errors, [], 'No runtime errors / CSP violations');
  assert.deepEqual(external, [], 'All runtime assets must be local');
  assert.deepEqual(failures, [], 'No missing or blocked assets');
  console.log(JSON.stringify({ webkit:'passed', releaseCSP:true, externalNetworkBlocked:true,
    mapTiles:12000, simulationAdvanced:true, construction, roundtrip,
    renderer:logs.find(line => line.includes('tile renderer')), screenshot:resolve(output, 'micropolis-webkit.png') }, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
