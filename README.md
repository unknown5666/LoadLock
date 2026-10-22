# FHE Lift Planner

Crane lifting plans for Friendship Hall Est. Pick the crane, set the load, reach and lift side, check it is safe, see the load on every outrigger leg (full or half out) and the ground pressure, and print an A1 lifting plan (PDF or AutoCAD DXF). Built for phones first.

Version 8.0 — outrigger leg loads, half / full legs, and every value on the A1 sheet can be typed over.

Designed and built by Saad Khan.

## Deploy (Vercel)

Import this repo in Vercel. There is no build step: `vercel.json` serves `public/index.html` as it is.

## Change it

```bash
python build.py v7        # writes dist/v7.html and public/index.html
node v7_e2e.js            # end-to-end test (W=390 H=844 for the phone layout)
node test_outrig.js       # outrigger engine: worked example + invariants
```

Test setup: `npm install`, then `npx playwright install chromium`. The full handoff, data model and house rules are in [CLAUDE.md](CLAUDE.md).

Sign-in is a soft gate that keeps casual visitors out. It is not security.
