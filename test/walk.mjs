// Full walkthrough with real clicks: every step of every session, navigation back and forth,
// a member card and a data card opened by real mouse clicks on the 3D view. Screenshots each step.
import puppeteer from 'puppeteer-core';
const [w, h, tag] = [+process.argv[2] || 1600, +process.argv[3] || 900, process.argv[4] || 'd'];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${w},${h}`] });
const p = await b.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_|font/i.test(m.text())) errs.push(m.text()); });
await p.goto('file://' + process.cwd() + '/index.html?dtcap=0.3');
const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const D = (f, ...a) => p.evaluate(f, ...a);
const shot = async (n) => { await wait(1300); await p.screenshot({ path: `test/out/${tag}-${n}.png` }); };
const click = (sel) => D((s) => { const e = document.querySelector(s); if (!e) throw new Error('missing ' + s); if (e.disabled) throw new Error('disabled ' + s); e.click(); }, sel);
const pick = (name, value) => D(([n, v]) => { const i = document.querySelector(`input[name="${n}"][value="${v}"]`); if (!i) throw new Error('no input ' + n + '=' + v); i.click(); }, [name, String(value)]);
const log = {};
await wait(6000); await shot('00-title');
await click('[data-act=begin]'); await shot('01-brief');
await click('[data-act=startMeeting]');
for (let s = 0; s < 3; s++) {
  const x = await D((s) => { const x = __demo.SES[s]; return { quotes: x.quotes.map((q) => q[3]), predict: x.predict.map((p) => p[1]), ev: x.contest.evidence.map((e) => e[1]) }; }, s);
  await shot(`s${s}-0-setting`);
  await click('[data-act=hear]');
  for (let i = 0; i < x.quotes.length; i++) {
    if (i === 0) await shot(`s${s}-1-speaker`);
    const wrong = s === 0 && i === 1; await pick('sort', wrong ? (x.quotes[i] === 'maj' ? 'tight' : 'maj') : x.quotes[i]);
    if (i === 1) await shot(`s${s}-2-feedback`);
    await click('[data-act=nextSpeaker]');
  }
  await shot(`s${s}-3-recap`);
  await click('.row [data-stage=predict]'); await pick('pred', x.predict.indexOf(true)); await click('[data-act=checkPred]'); await shot(`s${s}-4-pred`);
  await click('.row [data-stage=call]'); await pick('call', s === 1 ? 1 : 0);
  await click('[data-act=toRoll]'); await wait(1200); await shot(`s${s}-5-rolling`); await D(() => __demo.advance(6)); await shot(`s${s}-6-roll`);
  if (s === 0) { // real mouse clicks on the 3D view: a figure, then a number on the table
    const [sx, sy] = await D(() => __demo.seatScreen(5)); await p.mouse.click(sx, sy + 30); await wait(500);
    log.memberCard = await D(() => ({ card: __demo.state().card, h: document.querySelector('#cardH')?.textContent, votes: document.querySelectorAll('#card .votes li').length })); await shot('s0-6b-membercard');
    await click('#cardClose');
    const [tx, ty] = await D(() => __demo.tileScreen(2)); await p.mouse.click(tx, ty); await wait(500);
    log.dataCard = await D(() => ({ card: __demo.state().card, h: document.querySelector('#cardH')?.textContent })); await shot('s0-6c-datacard');
    await p.keyboard.press('Escape');
  }
  await click('.row [data-stage=run]'); await wait(2500); await shot(`s${s}-7-run`);
  await D(() => __demo.advance(16)); await shot(`s${s}-8-contest`);
  for (let i = 0; i < x.ev.length; i++) await pick('e-' + i, x.ev[i]);
  await click('[data-act=checkEv]');
  if (s === 1) { // navigation: back to session 1 from session 2, around the stages, and forward again
    await click('#steps [data-nav="1"]'); const a = await D(() => { const s = __demo.state(); return { s: s.s, step: s.step, kept: s.ans[0].predChecked && s.ans[0].rolled }; });
    await click('.stages [data-stage=roll]'); const b2 = await D(() => __demo.state().step); await shot('nav-back-s0-roll');
    await click('.row [data-stage=call]'); const c = await D(() => __demo.state().step);
    await click('#steps [data-nav="2"]'); await click('.stages [data-stage=contest]'); const d = await D(() => { const s = __demo.state(); return { s: s.s, step: s.step, ev: s.ans[1].evChecked }; });
    log.nav = { a, b2, c, d };
  }
  await click('[data-act=next]');
}
await shot('90-debrief');
log.score = await D(() => __demo.state().score);
await click('.deb [data-nav="3"]'); log.fromDebrief = await D(() => { const s = __demo.state(); return [s.name, s.s]; }); await click('#steps [data-nav="4"]');
await click('[data-act=about]'); await shot('91-about');
console.log(JSON.stringify(log)); console.log('errs', JSON.stringify(errs)); await b.close();
