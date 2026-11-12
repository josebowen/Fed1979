// Full walkthrough: clicks real radio buttons and buttons, screenshots each step.
import puppeteer from 'puppeteer-core';
const [w, h, tag] = [+process.argv[2] || 1600, +process.argv[3] || 900, process.argv[4] || 'd'];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${w},${h}`] });
const p = await b.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + process.cwd() + '/index.html?dtcap=0.3');
const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const D = (f, ...a) => p.evaluate(f, ...a);
const shot = async (n) => { await wait(1300); await p.screenshot({ path: `test/out/${tag}-${n}.png` }); };
const click = (sel) => D((s) => { const e = document.querySelector(s); if (!e) throw new Error('missing ' + s); e.click(); }, sel);
const pick = (name, value) => D(([n, v]) => { const i = document.querySelector(`input[name="${n}"][value="${v}"]`); i.click(); }, [name, String(value)]);
await wait(6000); await shot('00-title');
await click('[data-act=begin]'); await shot('01-brief');
await click('[data-act=startMeeting]');
for (let s = 0; s < 3; s++) {
  const x = await D((s) => { const x = __demo.SES[s]; return { quotes: x.quotes.map((q) => q[3]), wrong: s === 0 ? 1 : -1, predict: x.predict.map((p) => p[1]), ev: x.contest.evidence.map((e) => e[1]), calls: x.calls.length }; }, s);
  await shot(`s${s}-1-record`);
  for (let i = 0; i < x.quotes.length; i++) await pick('s-' + i, i === x.wrong ? (x.quotes[i] === 'maj' ? 'tight' : 'maj') : x.quotes[i]);
  await click('[data-act=checkSort]'); await shot(`s${s}-2-sorted`);
  await click('[data-act=toPredict]'); await pick('pred', x.predict.indexOf(true)); await click('[data-act=checkPred]'); await shot(`s${s}-3-pred`);
  await click('[data-act=toCall]'); await pick('call', s === 1 ? 1 : 0); await shot(`s${s}-4-call`);
  await click('[data-act=toRoll]'); await shot(`s${s}-5-roll`);
  await click('[data-act=run]'); await wait(2500); await shot(`s${s}-6-run`);
  await D(() => __demo.advance(16)); await shot(`s${s}-7-contest`);
  for (let i = 0; i < x.ev.length; i++) await pick('e-' + i, x.ev[i]);
  await click('[data-act=checkEv]'); await shot(`s${s}-8-ev`);
  await click('[data-act=next]');
}
await shot('90-debrief');
console.log(JSON.stringify(await D(() => __demo.state().score)));
await click('[data-act=about]'); await shot('91-about');
console.log('errs', JSON.stringify(errs)); await b.close();
