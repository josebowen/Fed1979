// Fed1979. All on-screen teaching text. Quotes are verbatim from FOMC transcripts (lightly edited by the
// FOMC Secretariat). Summaries of positions are paraphrase and are labeled as such. No dashes in UI copy.

const F = 'https://www.federalreserve.gov/monetarypolicy/files/';
export const SRC = {
  t0918: ['FOMC transcript, September 18, 1979', F + 'FOMC19790918meeting.pdf'],
  r0918: ['FOMC Record of Policy Actions, September 18, 1979', F + 'fomcropa19790918.pdf'],
  ar79: ['Board of Governors, 66th Annual Report (1979), Board policy actions', 'https://fraser.stlouisfed.org/title/annual-report-board-governors-federal-reserve-system-117/1979-2443'],
  t1006: ['FOMC transcript, October 6, 1979', F + 'FOMC19791006meeting.pdf'],
  r1006: ['FOMC Record of Policy Actions, October 6, 1979', F + 'fomcropa19791006.pdf'],
  t0701: ['FOMC transcript, June 30 and July 1, 1982', F + 'FOMC19820701meeting.pdf'],
  r0701: ['FOMC Record of Policy Actions, June 30 and July 1, 1982', F + 'fomcropa19820701.pdf'],
  t1005: ['FOMC transcript, October 5, 1982', F + 'FOMC19821005meeting.pdf'],
  r1005: ['FOMC Record of Policy Actions, October 5, 1982', F + 'fomcropa19821005.pdf'],
  lor: ['Lindsey, Orphanides and Rasche, The Reform of October 1979, St. Louis Fed Review (2005; reprinted 2013)', 'https://files.stlouisfed.org/files/htdocs/publications/review/13/11/lindsey.pdf'],
  gk: ['Goodfriend and King, The Incredible Volcker Disinflation, Journal of Monetary Economics 52 (2005)', 'https://www.nber.org/papers/w11562'],
  bm: ['Bernanke and Mihov, Measuring Monetary Policy, Quarterly Journal of Economics 113 (1998)', 'https://www.nber.org/papers/w5145'],
  greider: ['William Greider, Secrets of the Temple (Simon and Schuster, 1987)', ''],
  ball: ['Laurence Ball, What Determines the Sacrifice Ratio? in Mankiw, ed., Monetary Policy (University of Chicago Press, 1994)', 'https://www.nber.org/papers/w4306'],
  frh: ['Federal Reserve History, Volcker\'s Announcement of Anti-Inflation Measures', 'https://www.federalreservehistory.org/essays/anti-inflation-measures'],
  coyne: ['Joseph Coyne, recollection of October 6, 1979, St. Louis Fed Review (2005)', 'https://files.stlouisfed.org/research/publications/review/05/03/part2/Coyne.pdf'],
  moaf: ['Museum of American Finance, a two-by-four mailed to Volcker', 'https://moaf.org/exhibits/fed/100/volckerwood'],
  hist79: ['FOMC meeting materials, 1979', 'https://www.federalreserve.gov/monetarypolicy/fomchistorical1979.htm'],
  hist82: ['FOMC meeting materials, 1982', 'https://www.federalreserve.gov/monetarypolicy/fomchistorical1982.htm'],
};
export const cite = (k) => { const [t, u] = SRC[k]; return u ? `<a class="cite" href="${u}" target="_blank" rel="noopener">${t}</a>` : `<span class="cite">${t}</span>`; };
export const fred = (id) => `<a class="cite fred" href="https://fred.stlouisfed.org/series/${id}" target="_blank" rel="noopener">FRED ${id}</a>`;

// People. Roles are as of the meeting. Colors are only for telling seats apart.
export const PEOPLE = {
  volcker: ['Paul Volcker', 'Chairman'],
  schultz: ['Frederick Schultz', 'Vice Chairman, Board'],
  wallich: ['Henry Wallich', 'Governor'],
  coldwell: ['Philip Coldwell', 'Governor'],
  partee: ['Charles Partee', 'Governor'],
  teeters: ['Nancy Teeters', 'Governor'],
  rice: ['Emmett Rice', 'Governor'],
  timlen: ['Thomas Timlen', 'New York Fed, voting alternate'],
  balles: ['John Balles', 'President, San Francisco Fed'],
  black: ['Robert Black', 'President, Richmond Fed'],
  kimbrel: ['Monroe Kimbrel', 'President, Atlanta Fed'],
  mayo: ['Robert Mayo', 'President, Chicago Fed'],
  martin: ['Preston Martin', 'Vice Chairman, Board'],
  gramley: ['Lyle Gramley', 'Governor'],
  solomon: ['Anthony Solomon', 'President, New York Fed'],
  ford: ['William Ford', 'President, Atlanta Fed'],
  keehn: ['Silas Keehn', 'President, Chicago Fed, voting alternate'],
};
export const isGov = (id) => /Governor|Chairman|Board/.test(PEOPLE[id][1]);

// Positions used in the "where did they land" task and in the roll call.
export const POS = [['tight', 'Against: wanted firmer'], ['maj', 'Voted for the motion'], ['easy', 'Against: wanted easier']];

export const BRIEF = {
  title: 'Three meetings, one argument',
  body: `<p>August 1979. Consumer prices are up 11.8 percent from a year earlier. Paul Volcker has been Fed chairman for six weeks. The economy may already be sliding into recession.</p>
  <p>You sit along the wall as a staff economist. The twelve voting members at the table are real people, and every vote you will see is the real roll call. Before each vote you read the record, predict how the room splits, and make your own recommendation. Then the room votes as it really did.</p>
  <p>You are scored on reading the evidence: who argued what, and how the votes fell. You are never scored on agreeing with the Fed.</p>
  <p class="contest"><b>Contested.</b> Economists still disagree about whether this policy was necessary, whether it could have cost less, and who paid for it. Fed1979 presents those arguments with their sources and takes no side.</p>`,
};

// Each session. Month index m is months since January 1978 in data/fred-monthly-1978-1984.json.
export const SESSIONS = [
  {
    id: 's1', short: 'Sept 1979', date: 'Tuesday, September 18, 1979', m: 20, dm: 19, runTo: 21, cpiNote: 'August',
    title: 'A small rise, or a bigger one?',
    setting: `<p>The funds rate is near 11.4 percent, up about a point since early summer. The staff forecasts a mild recession. Money growth has run well above the Committee's targets all summer, and the dollar is weak abroad.</p>`,
    question: 'The motion: nudge the funds rate up to about 11.5 percent, inside a range of 11.25 to 11.75 percent.',
    members: ['volcker', 'schultz', 'wallich', 'coldwell', 'partee', 'teeters', 'rice', 'black', 'balles', 'kimbrel', 'mayo', 'timlen'],
    votes: { volcker: 'maj', schultz: 'maj', wallich: 'maj', coldwell: 'tight', partee: 'maj', teeters: 'maj', rice: 'easy', black: 'tight', balles: 'tight', kimbrel: 'maj', mayo: 'maj', timlen: 'maj' },
    tally: '8 to 4',
    quotes: [
      ['rice', 'Whatever tightening of policy might be adopted today would be largely symbolic. … I would want to stand pat.', 't0918', 'easy'],
      ['teeters', 'We have really gone very far, very fast in the past 6 to 8 weeks. I think it\'s time that we slow down and see what we are doing.', 't0918', 'maj'],
      ['coldwell', 'If there is anything certain in this world right now it seems to be that inflation will continue.', 't0918', 'tight'],
      ['wallich', 'It seems to me that we face basically a question of timing.', 't0918', 'maj'],
      ['black', 'To me dealing with inflation means getting a hand on the aggregates.', 't0918', 'tight'],
    ],
    quoteFb: {
      teeters: 'Teeters sounded like a dove and voted for the directive anyway. The same day, on the Board, she voted against raising the discount rate.',
      wallich: 'Wallich saw recession coming but judged that the signs still pointed toward restraint for now.',
      rice: 'Rice was the only dissent for an easier policy. His argument was the lag: nothing done today would touch inflation within six to nine months.',
      coldwell: 'Coldwell, Black and Balles agreed with a small rise but wanted room to go to 12 percent if money kept growing.',
      black: 'Black tied policy to the money aggregates, a view that would win the day three weeks later.',
    },
    predict: [
      ['8 to 4, three wanting firmer policy and one wanting none', true],
      ['8 to 4, with all four dissenters wanting a firmer policy', false],
      ['12 to 0, every voting member backing a small rise', false],
      ['7 to 5, with five dissenters wanting no rise at all', false],
    ],
    predictFb: 'The directive passed 8 to 4, with dissents from both directions. The same afternoon the Board raised the discount rate to 11 percent by 4 to 3: Volcker, Schultz, Wallich and Coldwell for; Partee, Teeters and Rice against.',
    predictCites: ['r0918', 'ar79'],
    calls: [
      ['Firm a little: funds rate to about 11.5%, discount rate to 11%', 'maj'],
      ['Firm more: let the funds rate climb to 12% if money keeps growing', 'tight'],
      ['Stand pat: hold the funds rate where it is and wait for data', 'easy'],
    ],
    extraVote: { label: 'Board of Governors, discount rate to 11 percent', tally: '4 to 3', yes: ['volcker', 'schultz', 'wallich', 'coldwell'], no: ['partee', 'teeters', 'rice'], cite: 'ar79' },
    after: `<p>Two votes on one day, both split. The Board's 4 to 3 discount vote was public. Over the next three weeks gold and other commodities surged and the dollar fell. At the Saturday meeting that followed, Governor Partee described a mood of wanting "to get into goods and out of money."</p>`,
    afterCites: ['t1006', 'lor'],
    events: { 20: 'September 18: the directive passes 8 to 4; the discount rate rises 4 to 3.', 21: 'Early October: gold, silver and copper surge. Volcker flies home early from the IMF meetings in Belgrade and calls a Saturday meeting.' },
    contest: {
      q: 'Did the split votes make things worse?',
      positions: [
        ['Signal', 'Small, split moves told markets the Fed lacked resolve, and the reaction in gold and the dollar forced a bigger break within three weeks.', ['lor', 'gk']],
        ['Prudence', 'A recession was forecast and policy works with long lags. Waiting for evidence was a defensible reading of the data in hand.', ['r0918', 't0918']],
      ],
      evidence: [
        ['Real retail sales had been falling since May and industrial production had turned down.', 1, 'Rice cited these in the meeting. They speak to the recession risk, which is the prudence case.'],
        ['Within three weeks gold, silver and copper prices surged and the dollar weakened.', 0, 'Market moves after the vote are what the signal argument rests on. They do not prove the votes caused them.'],
      ],
    },
  },
  {
    id: 's2', short: 'Oct 1979', date: 'Saturday, October 6, 1979', m: 21, dm: 20, runTo: 53, cpiNote: 'September',
    title: 'Change the method?',
    setting: `<p>The meeting is called on a weekend and kept quiet. Volcker reports that markets are as nervous as he has ever seen them: the rumors on Friday were "first that I had resigned and then that I had died."</p>
    <p>On the table is a change of method. Instead of setting the funds rate, the Desk would aim at a path for bank reserves consistent with the money targets, and let the funds rate go where the market takes it, within a wide range.</p>`,
    question: 'The motion: target bank reserves, let the funds rate move between 11.5 and 15.5 percent, raise the discount rate to 12 percent, and add an 8 percent marginal reserve requirement.',
    members: ['volcker', 'schultz', 'wallich', 'coldwell', 'partee', 'teeters', 'rice', 'black', 'balles', 'kimbrel', 'mayo', 'timlen'],
    votes: { volcker: 'maj', schultz: 'maj', wallich: 'maj', coldwell: 'maj', partee: 'maj', teeters: 'maj', rice: 'maj', black: 'maj', balles: 'maj', kimbrel: 'maj', mayo: 'maj', timlen: 'maj' },
    tally: '12 to 0',
    sortTitle: 'Reasons and risks',
    sortHint: 'Volcker laid out both sides himself. Sort each line: is it a reason to switch methods, or a risk of switching?',
    sortOpts: [['for', 'A reason to switch'], ['risk', 'A risk of switching']],
    quotes: [
      ['volcker', 'There may be something to [be gained in] a change in the psychological atmosphere that in some sense will give us more bang for the buck.', 't1006', 'for'],
      ['volcker', 'There is no apparent encore for the Federal Reserve; we will have in effect shot our bolt.', 't1006', 'risk'],
      ['volcker', 'It has some built-in pressure to move interest rates downward more promptly if the money supply begins running low.', 't1006', 'for'],
      ['wallich', 'All over the world they would be saying the new procedure really is a form of easing.', 't1006', 'risk'],
      ['volcker', 'It\'s an easier political sale.', 't1006', 'for'],
    ],
    quoteFb: [
      'A sharper break in method might buy credibility that another quarter point could not.',
      'If the new method failed, the Fed would have nothing new to try. Volcker added that he did not think this was necessarily a minus.',
      'The method cuts both ways. That two way flexibility is part of why the September dissenters on both sides could sign on.',
      'Wallich worried that a wide range with a low floor would read abroad as softness, the opposite of the intent.',
      'Rates set by the market, not voted each time, are harder to blame on the Fed. Critics later called this cover; see the contested section.',
    ],
    predict: [
      ['12 to 0, with every voting member backing the new method', true],
      ['9 to 3, with three doves dissenting against higher rates', false],
      ['8 to 4, with the September hawks calling it too timid', false],
      ['7 to 5, with the Board\'s governors outvoted by presidents', false],
    ],
    predictFb: 'Unanimous. Rice, the September dove, asked for an even wider range, "9 percent on the low side and 15 to 16 percent on the high side." Coldwell thought the money target too high and said he would not dissent. The Board approved the 12 percent discount rate unanimously.',
    predictCites: ['r1006', 't1006', 'ar79'],
    calls: [
      ['Switch: target reserves, let the funds rate move 11.5% to 15.5%', 'maj'],
      ['Stay: keep setting the funds rate, and raise it a full point', 'alt'],
      ['Wait: hold rates steady and lean on fiscal restraint instead', 'none'],
    ],
    callNotes: {
      alt: 'No one voted for this, but it was live. Volcker said he could "go with either of these broad approaches," and the Administration was uneasy about a shift in technique.',
      none: 'No one at the table argued for this. Volcker said the Committee could not "walk away today without a program that is strong in fact and perceived as strong."',
    },
    after: `<p>Volcker announced the package at an unusual Saturday evening press conference. The funds rate swung harder than it ever had: 17.6 percent in April 1980, 9 percent by July, 19 percent by January 1981. Credit controls imposed in March 1980 at the Carter Administration's request coincided with a short, sharp recession, and rates fell before rising again. Mortgage rates passed 18 percent in 1981. Builders mailed two by fours to the Fed and auto dealers sent the keys of unsold cars.</p>`,
    afterCites: ['frh', 'moaf', 'coyne'],
    events: { 21: 'October 6: the new method is announced on a Saturday night.', 26: 'March 1980: credit controls. Inflation peaks at 14.6 percent.', 28: 'May 1980: recession. The funds rate falls with money demand.', 30: 'July 1980: the funds rate is down to 9 percent.', 36: 'January 1981: the funds rate is back above 19 percent.', 41: 'June 1981: mortgage rates near 17 percent.', 44: 'Fall 1981: mortgage rates above 18 percent. A second recession.', 51: 'Spring 1982: unemployment passes 9 percent.', 53: 'June 1982: inflation is down to 7 percent; unemployment is 9.6 percent.' },
    contest: {
      q: 'What was October 6, really?',
      positions: [
        ['Real change', 'A genuine change of operating procedure. Statistical work finds that reserve measures, not the funds rate, best describe Fed policy after 1979.', ['bm', 'lor']],
        ['Political cover', 'A way to let rates rise far higher than a committee could vote for openly, while pointing to money growth as the reason.', ['greider', 't1006']],
        ['Not yet credible', 'Markets did not believe it at first. Long rates kept rising, and the real disinflation began only in late 1980 or 1981.', ['gk']],
      ],
      evidence: [
        ['In the meeting, Volcker said the new technique was "an easier political sale."', 1, 'This is the core of the cover reading. Supporters reply that political feasibility and real control are not exclusive.'],
        ['The funds rate swung from 17.6 to 9 to 19 percent within a year, as reserve targets let it move.', 0, 'Wild swings in the funds rate are what you expect if the Desk really followed a reserve path rather than a rate.'],
        ['Thirty year mortgage rates rose from about 13 to over 18 percent between late 1979 and fall 1981.', 2, 'Rising long rates suggest markets still expected inflation, the heart of the credibility argument.'],
      ],
    },
  },
  {
    id: 's3', short: 'July 1982', date: 'June 30 and July 1, 1982', m: 54, dm: 52, runTo: 71, cpiNote: 'May',
    title: 'Keep going, or ease?',
    setting: `<p>Unemployment is 9.5 percent, as reported at the time. Inflation has fallen by half since 1980, to about 7 percent. The funds rate is still above 14 percent. Farm and thrift failures are mounting. In Congress there is talk of credit controls, usury ceilings and a tax on interest.</p>
    <p>M1 has run above its target range. Is that a sign of inflation ahead, or are frightened people simply holding more cash? If the second, sticking to the target means squeezing harder in a deep recession.</p>`,
    question: 'The motion: aim for M1 growth of about 5 percent through September, and accept somewhat faster growth if it reflects precautionary demand for money.',
    members: ['volcker', 'martin', 'wallich', 'gramley', 'partee', 'teeters', 'rice', 'black', 'balles', 'ford', 'keehn', 'solomon'],
    votes: { volcker: 'maj', martin: 'maj', wallich: 'tight', gramley: 'maj', partee: 'maj', teeters: 'easy', rice: 'maj', black: 'tight', balles: 'maj', ford: 'tight', keehn: 'maj', solomon: 'maj' },
    tally: '8 to 4',
    quotes: [
      ['teeters', 'I want to get interest rates down. I\'m not worrying about them going up, because I think that\'s intolerable.', 't0701', 'easy'],
      ['wallich', 'Historically, we\'ve been fooled more often by underestimating velocity gains than by overestimating them.', 't0701', 'tight'],
      ['gramley', 'We may be in a state close to paralysis in terms of finding our way out of this fiscal box. It\'s a very frightening situation.', 't0701', 'maj'],
      ['ford', 'I certainly am not a fan of high interest rates, but I very strongly oppose any shift in policy toward putting on a maximum rate cap.', 't0701', 'tight'],
      ['volcker', 'I go back to the very first lesson of central banking, which is that in a crisis you lend freely.', 't0701', 'maj'],
    ],
    quoteFb: {
      teeters: 'Teeters wanted a clear signal of easing, with explicitly higher money targets. She was the lone dissent for easier policy.',
      wallich: 'Wallich bet that velocity would rise as recovery came, so faster money growth meant inflation ahead. M1 velocity in fact fell through 1982.',
      gramley: 'Gramley stressed downside risks and voted with the majority to tolerate faster money growth.',
      ford: 'Ford, Black and Wallich wanted M1 brought back to its range, fearing renewed inflation expectations.',
      volcker: 'Volcker separated a crisis, where the Fed lends freely, from forcing rates down in a way the market would not see as sustainable.',
    },
    predict: [
      ['8 to 4, three wanting firmer policy and one wanting easier', true],
      ['12 to 0, every member backing easier policy at 9.5% jobless', false],
      ['9 to 3, with three doves dissenting for faster rate cuts', false],
      ['10 to 2, with two hawks dissenting against any easing', false],
    ],
    predictFb: 'The directive passed 8 to 4, split both ways, the same shape as September 1979. Black, Ford and Wallich dissented for a firmer policy; Teeters dissented for an easier one.',
    predictCites: ['r0701'],
    calls: [
      ['Tolerate it: accept faster M1 growth and let rates drift down', 'maj'],
      ['Hold the line: firm up to bring M1 back inside its range', 'tight'],
      ['Ease openly: raise the money targets and signal lower rates', 'easy'],
    ],
    after: `<p>Rates fell fast. The funds rate dropped from 14.2 percent in June to 10.1 percent in August. Mexico announced it could not pay its debts that month. M1 velocity, which had been rising 3 to 4 percent a year, fell instead. On October 5 the Committee voted 9 to 3 to give M1 much less weight for the rest of the year. Governor Martin warned that the first reading would be "that we caved in, the election is coming, and here they go again."</p>`,
    afterCites: ['t1005', 'r1005'],
    events: { 54: 'July 1982: the Committee tolerates faster money growth.', 55: 'August 1982: Mexico cannot pay. The funds rate is near 10 percent.', 57: 'October 5: M1 given much less weight, 9 to 3.', 58: 'November 1982: unemployment peaks at 10.8 percent.', 63: 'Spring 1983: recovery is under way.', 65: 'June 1983: inflation is down to 2.5 percent.', 71: 'December 1983: unemployment is 8.3 percent. Mortgage rates are still above 13 percent.' },
    contest: {
      q: 'Was the recession the price of ending inflation?',
      positions: [
        ['Necessary price', 'Disinflation is costly everywhere. Across 65 episodes, fast ones cost less output per point of inflation removed than gradual ones. The costs bought decades of low inflation.', ['ball']],
        ['Avoidable cost', 'The costs were larger because policy lacked credibility. A believed commitment would have lowered expectations faster and more cheaply.', ['gk']],
        ['Who paid', 'The costs fell on builders, farmers, factory towns, thrifts and borrowing countries, not on the economy evenly.', ['greider', 'frh']],
      ],
      evidence: [
        ['Inflation fell from 14.6 percent in March 1980 to 2.5 percent by mid 1983 and stayed low.', 0, 'The size and durability of the fall is the core of the necessary price case.'],
        ['Mortgage rates stayed above 13 percent through 1983, long after inflation fell below 4 percent.', 1, 'High long rates after inflation fell suggest markets still did not trust the Fed, the credibility argument.'],
        ['Home builders mailed two by fours and car dealers sent keys to the Fed in protest.', 2, 'Protests by particular industries speak to where the costs landed.'],
      ],
    },
  },
];

export const ABOUT = `<h3>What is real</h3>
<ul><li>Every person at the table is a real voting member of the Federal Open Market Committee at that meeting, and every vote shown is the real roll call from the Record of Policy Actions or the Board's Annual Report.</li>
<li>Every quotation is verbatim from the FOMC transcript of that meeting. The Fed's note on these transcripts says the Secretariat lightly edited the raw transcript, that errors remain, and that members never reviewed it. The quotation used for each speaker appears on screen with its source.</li>
<li>Descriptions of a member's reasons that are not in quotation marks are paraphrase, drawn from the Record of Policy Actions or the transcript. Summaries of the scholarly positions are also paraphrase, with their sources listed.</li>
<li>Data are monthly from FRED, the Federal Reserve Bank of St. Louis, current vintage. Members saw earlier, unrevised numbers, so their figures differ slightly.</li></ul>
<h3>What is not modeled</h3>
<p>Fed1979 does not simulate what would have happened under a different decision. Your recommendation is compared with the real votes, and the board on the table plays back the real monthly record.</p>
<p>The member cards show only what is in the record of these meetings: each person's role, recorded votes and words. Fed1979 does not characterize a member's views beyond that.</p>
<h3>Contested history</h3>
<p>Whether the 1979 to 1982 policy was necessary, whether it could have cost less, and who bore its costs remain open questions. Fed1979 presents several positions with their sources and does not choose among them. The scored questions ask only which argument a piece of evidence bears on.</p>
<h3>Sources</h3>
<ul class="srcs">${Object.keys(SRC).map((k) => `<li>${cite(k)}</li>`).join('')}
<li>FRED series: ${['FEDFUNDS', 'UNRATE', 'CPIAUCSL', 'MORTGAGE30US', 'M1V'].map(fred).join(', ')}</li></ul>
<p class="hint">Built with Three.js. No tracking, no data collected. Source code is in the repository.</p>`;

// ---------- every recorded vote used in the game, for the member cards ----------
// s = the session whose roll call must be seen before this vote is shown.
export const VOTELOG = [
  { label: 'Sept 18, 1979. FOMC directive: small rise in the funds rate', s: 0, src: 'r0918', yes: ['volcker', 'kimbrel', 'mayo', 'partee', 'schultz', 'teeters', 'wallich', 'timlen'], no: { balles: 'wanted firmer', black: 'wanted firmer', coldwell: 'wanted firmer', rice: 'wanted no firming' } },
  { label: 'Sept 18, 1979. Board: discount rate to 11 percent', s: 0, src: 'ar79', yes: ['volcker', 'schultz', 'wallich', 'coldwell'], no: { partee: 'preferred a steady course', teeters: 'preferred a steady course', rice: 'preferred a steady course' } },
  { label: 'Oct 6, 1979. FOMC: the new reserves method', s: 1, src: 'r1006', yes: ['volcker', 'balles', 'black', 'coldwell', 'kimbrel', 'mayo', 'partee', 'rice', 'schultz', 'teeters', 'wallich', 'timlen'], no: {} },
  { label: 'July 1, 1982. FOMC directive: tolerate faster money growth', s: 2, src: 'r0701', yes: ['volcker', 'solomon', 'balles', 'gramley', 'martin', 'partee', 'rice', 'keehn'], no: { black: 'wanted firmer', ford: 'wanted firmer', wallich: 'wanted firmer', teeters: 'wanted easier' } },
  { label: 'Oct 5, 1982. FOMC: give M1 much less weight', s: 2, src: 'r1005', yes: ['volcker', 'solomon', 'balles', 'gramley', 'martin', 'partee', 'rice', 'teeters', 'wallich'], no: { black: '', ford: '' } },
];
// Further verbatim lines from the transcripts, shown on member cards once that session's roll is called.
export const MORE_QUOTES = [
  ['volcker', 'There is a very strong possibility of recession on the one side.', 't0918', 0],
  ['volcker', 'There is clearly no risk-free course for us here; there are risks on both sides.', 't1006', 1],
  ['rice', '9 percent on the low side and 15 to 16 percent on the high side.', 't1006', 1],
  ['coldwell', 'I\'m not going to dissent … I must admit that I think the M1 target is too high.', 't1006', 1],
  ['black', 'it would preserve our credibility by coming in at the top of our target', 't0701', 2],
  ['teeters', 'I think we need a signal in the market that we have eased or rates won\'t come down', 't0701', 2],
  ['wallich', 'I don\'t think this is the time to make a fundamental change in policy.', 't0701', 2],
  ['martin', 'the first thoughts will be that we caved in, the election is coming, and here they go again.', 't1005', 2],
];
// ---------- the four numbers on the table ----------
export const DATAINFO = {
  cpi: { name: 'Inflation', unit: 'CPI, change from a year earlier', sid: 'CPIAUCSL', def: 'The Consumer Price Index for all urban consumers, seasonally adjusted. The figure is the percent change over the previous 12 months.' },
  un: { name: 'Unemployment', unit: 'share of the labor force', sid: 'UNRATE', def: 'The share of the labor force without a job and looking for one. Monthly, seasonally adjusted.' },
  ff: { name: 'Federal funds rate', unit: 'monthly average', sid: 'FEDFUNDS', def: 'The rate banks charge each other for overnight loans of reserves, as a monthly average. Until October 6, 1979 the Committee steered it within a narrow band. After that it let the rate move within a wide range.' },
  mort: { name: '30 year mortgage', unit: 'average new fixed rate', sid: 'MORTGAGE30US', def: 'The average rate on a new 30 year fixed rate home mortgage, from the Freddie Mac survey, as a monthly figure.' },
};
export const DATANOTE = 'Current vintage from FRED. Members saw the figures as first published, so theirs differ slightly.';
