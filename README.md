# FHE Lift Planner

Crane lifting plans for Friendship Hall Est. Pick the crane, set the load, reach and lift side, check it is safe, see the load on every outrigger leg (full or half out) and the ground pressure, and print an A1 lifting plan (PDF or AutoCAD DXF). Built for phones first.

Version 10.0 — a full multi-sheet lift plan (A3 set: cover and drawing register, general arrangement, site layout, rigging tackle list and arrangement, load and sling calculations, crane capacity, outrigger loads and ground bearing, tandem, risk assessment and method statement, pre-lift checklist), outriggers on roads, slabs and bridges, and tandem lifts drawn on the A1 sheet.

Version 9.0 — tandem lifts (2–4 cranes, live load transfer), Fit-Filter crane finder, net capacity with deductions, wind on the load, true-scale satellite site map, one-tap RAMS pack (2 × A4), a live 3D window that follows every drag, and offline use on site. Built on v8's outrigger leg loads and typed-over sheet values.

Designed and built by Saad Khan.

## Deploy (Vercel)

Import this repo in Vercel. There is no build step: `vercel.json` serves `public/index.html` as it is.

## Change it

```bash
python build.py v7        # writes dist/v7.html and public/index.html
node v7_e2e.js            # end-to-end test (W=390 H=844 for the phone layout)
node test_outrig.js       # outrigger engine: worked example + invariants
node test_v9.js           # v9 engine: curve fit, deductions, wind, tandem, Fit-Filter, map maths
node v9_e2e.js            # v9 end-to-end (W=390 H=844 for the phone), then: node rams_check.js
node test_planset.js      # v10 engine + lift plan set: surfaces, reactions, tackle WLL, reeving, tandem sheet, every sheet
node planset_e2e.js       # v10 end-to-end: print the lift plan, the sheet viewer, ground surfaces (W=390 H=844 for the phone)
```

Test setup: `npm install`, then `npx playwright install chromium`. The full handoff, data model and house rules are in [CLAUDE.md](CLAUDE.md).

Sign-in is a soft gate that keeps casual visitors out. It is not security.
