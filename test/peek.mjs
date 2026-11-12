import puppeteer from 'puppeteer-core';
const [w, h] = [+process.argv[3] || 1600, +process.argv[4] || 900];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: w, height: h });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_|font/i.test(m.text())) errs.push(m.text()); });
await p.goto('file://' + process.cwd() + '/index.html?dtcap=0.3');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(2500);
for (const [n, f] of JSON.parse(process.argv[2])) { await p.evaluate(f); await wait(2200); await p.screenshot({ path: `test/out/peek-${n}.png` }); }
console.log('errs', errs); await b.close();
