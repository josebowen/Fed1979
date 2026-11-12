# Fed1979

A short living-history simulation for college classes. Players sit in on three real meetings of the Federal Open Market Committee:

1. **September 18, 1979.** The 8 to 4 directive, with dissents in both directions, and the Board's 4 to 3 discount rate vote.
2. **October 6, 1979.** The Saturday meeting that switched to reserve targeting, 12 to 0.
3. **June 30 and July 1, 1982.** Keep going or ease, 8 to 4 again, with an epilogue on October 5, 1982.

In each session players hear five real speakers one at a time, in speech bubbles over the table, and place each by how they voted. They then predict the split, make an unscored recommendation, see the real roll call, play back the real monthly data, and then match evidence to the positions in a debate that is still contested. The game takes no side in that debate.

Play: https://josebowen.github.io/Fed1979/

## What is real
- Members and votes: FOMC Records of Policy Actions and the Board of Governors' 1979 Annual Report.
- Quotations: verbatim from FOMC transcripts (lightly edited by the FOMC Secretariat). See `data/sources-verified.md`.
- Data: FRED, St. Louis Fed, monthly, current vintage (`data/fred-monthly-1978-1984.json`).
- No counterfactual model. The lit board on the table shows the real data and plays back the real monthly record.
- Member cards show only each person's role, recorded votes and words from these meetings.

## Build
```
npm install
node build.mjs                   # writes index.html, a single self-contained file
node test/walk.mjs 1600 900 d    # headless walkthrough with screenshots (needs Chrome)
```
Three.js r0.187. Fonts from Google Fonts are the only external request.

Built for the Teaching with AI vibe coding collection, https://weteachwithai.com/vibe-coding/


## Navigation
The bar at the top jumps to any session or the debrief, and each session has a row of step buttons, so a player can go back and forth without losing answers. Tap a figure for that member's record so far. Tap a number on the table for its definition and history up to that month.
