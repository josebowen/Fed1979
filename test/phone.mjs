// Phone pass and briefing taps, with real mouse clicks on the 3D view and on name labels.
import puppeteer from 'puppeteer-core';
const [w, h, tag] = [+process.argv[2] || 390, +process.argv[3] || 844, process.argv[4] || 'ph'];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 820, hasTouch: w < 820 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_|font/i.test(m.text())) errs.push(m.text()); });
await p.goto('file://' + process.cwd() + '/index.html?dtcap=0.3');
const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const D = (f, ...a) => p.evaluate(f, ...a);
const shot = async (n) => { await wait(1500); await p.screenshot({ path: `test/out/${tag}-${n}.png` }); };
const tap = async (x, y) => { if (w < 820) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); await wait(500); };
const log = {};
await wait(3000); await D(() => __demo.act('begin')); await wait(3500); await shot('1-brief');
// briefing: tap a number on the table, then a member's name
let [tx, ty] = await D(() => __demo.tileScreen(0)); await tap(tx, ty); log.briefTile = await D(() => document.querySelector('#cardH')?.textContent); await shot('2-brief-datacard');
await D(() => __demo.closeCard());
const lab = await D(() => { const r = document.querySelector('.lab.seat[data-seat="4"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, r.width, r.height]; });
await tap(lab[0], lab[1]); log.briefMember = await D(() => document.querySelector('#cardH')?.textContent); log.labelSize = lab.slice(2); await shot('3-brief-membercard'); await D(() => __demo.closeCard());
await D(() => __demo.go('meet', 0)); await shot('4-setting');
await D(() => __demo.act('hear')); await wait(1500); await shot('5-speaker');
log.bubble = await D(() => { const r = document.querySelector('#bubble').getBoundingClientRect(), pn = document.querySelector('#panel').getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom), panelTop: Math.round(pn.top), vw: innerWidth }; });
await D(() => { __demo.go('meet', 1); __demo.act('hear'); }); await wait(2000); await shot('6-volcker-speaks');
await D(() => { __demo.go('meet', 0); __demo.answer({ call: 0, callDone: true, sort: { 0: 'easy', 1: 'maj', 2: 'tight', 3: 'maj', 4: 'tight' }, qi: 5, pred: 0, predChecked: true, max: 3 }); __demo.step('roll'); __demo.advance(6); }); await shot('7-roll');
const fig = await D(() => __demo.seatScreen(6)); await tap(fig[0], fig[1] + 16); log.figureTap = await D(() => document.querySelector('#cardH')?.textContent); await shot('8-membercard'); await D(() => __demo.closeCard());
await D(() => { __demo.step('run'); __demo.advance(3); }); await shot('9-run');
await D(() => { __demo.advance(14); }); await shot('10-contest');
await D(() => __demo.nav(4)); await shot('11-debrief');
log.overflow = await D(() => document.documentElement.scrollWidth > innerWidth + 1);
log.topFits = await D(() => { const t = document.querySelector('#top .tools').getBoundingClientRect(); return Math.round(t.right) <= innerWidth; });
console.log(JSON.stringify(log)); console.log('errs', JSON.stringify(errs)); await b.close();
