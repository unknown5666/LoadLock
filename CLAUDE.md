# FHE Lift Planner: handoff for Claude Code

> **Read this whole file before touching code.** The handoff package includes the repo, the current build, the test scripts and the CAD pipeline. The section "Changes I want" is filled in by Saad (the owner). Do those first, then work through the backlog in order.

---

## ✍️ Changes I want (Saad, fill this in before handing over)

> Write each change as one line: **what** should change, **where** you see it, and **why** if it isn't obvious. Screenshots help, so drop them in `/requests` and name them here.

1. _…_
2. _…_
3. _…_

Examples of the right level of detail:
- "Deck: the LOAD box is too small on my phone, make it full width on the second row."
- "Sheet: add a GROUND BEARING row under OUTRIGGER and fill it from the outrigger table."
- "Fleet: add Tadano ATF 220G-5 with the chart from `/requests/atf220.pdf`."

**Agent:** if a request is ambiguous, pick the most reasonable reading and say which reading you took in your summary. Ask before making any change you can't undo (data migrations, deleting cranes or charts).

---

## 0. TL;DR

- **What:** A web app that produces **A1 crane lifting plans** for **Friendship Hall Est (FHE)**, a crane-hire company in Abu Dhabi. The main user is **Habib**, the company's Appointed Person (AP). Built by **Saad Khan**.
- **Form:** one **self-contained HTML file** (`dist/index.html`, ~4.75 MB) with plain JS, no framework, and no bundler. `build.py` concatenates `src/*.js` in a fixed order into one `<script>`.
- **Where it runs:**
  - (a) A private **claude.ai artifact**: `https://claude.ai/artifact/PJyECQvosuERbkpo4uP2RY` (currently v6). Claude Code can't publish there. Build `dist/index.html` and Saad takes it back to a Claude chat to republish.
  - (b) **Offline**: the same file opened locally (`FHE Lift Planner.html`).
- **Build:** `python3 build.py` → `dist/index.html`. **Test:** `npm test` (Playwright + SwiftShader). Screenshots land in `out/`, and you must **look at them**.
- **Login:** username `Habib`, access code `12911`. This is a **client-side soft gate** (salted SHA-256 in `login.js`). It is **not security**, so don't describe it as security. Tests bypass it with `authSave(false)`.

---

## 1. Repo layout

```
CLAUDE.md                  ← this file
build.py                   ← concatenates gen/ + src/ into dist/index.html (module order matters)
package.json               ← dev deps for tests only (Playwright 1.56.1, three 0.147.0, jspdf, svg2pdf, jszip…)
src/
  shell.html     105 KB    ← all HTML skeleton + ALL CSS (design tokens in :root)
  data.js         22 KB    ← DEFAULT_CRANES (16 cranes), CHART_SRC text charts, CRANE_EXTRAS, DEFAULT_SETTINGS
  engine.js       43 KB    ← chart parsing/lookup, boom geometry, loads/totals/DAF/tackles, checks, computePlan
  env.js          15 KB    ← client drawings import (DXF via dxf-parser, PDF via pdf.js, images) + scaling
  draw.js        111 KB    ← drawing primitives (P), elevation, dimensions, A1 sheet composer, SVG + DXF writers
  crane2d.js      22 KB    ← 2D crane bodies: CAD (Habib's DWG blocks, v2) or procedural brand bodies; telescoping sections
  samples.js       6 KB    ← blankPlan() + SAMPLE_PLANS recreated from FHE sample sheets
  weather.js       7 KB    ← Open-Meteo forecast, wind scaled to boom-tip height
  three3d.js      56 KB    ← three.js r147: login hero scene + live 3D twin (C3D.*)
  scene.js        27 KB    ← 2D canvas model space (elevation / site plan / sheet preview), drag handles, measure tool
  wizard.js       15 KB    ← "Quick setup" questionnaire + "Which crane?" ranking
  login.js        14 KB    ← cinematic sign-in + soft gate
  app.js          20 KB    ← global state, storage (window.claude db/assets/downloads or localStorage), exports, F form helpers, normalizePlan, multi-crane helpers
  studio.js      114 KB    ← shell render, rail/drawer sections (Job, Crane, Lift, Site, Weather, Sheet), inspector, events, actions
  deck.js         34 KB    ← the "cab" control deck under the canvas (dials, chips, popovers, help line)
  pages.js        36 KB    ← Plans library, Fleet editor (cranes/charts/custom DXF bodies), Settings
  tour.js         25 KB    ← guided tutorial ("site induction"), spotlight, hands-on tasks, certificate
  main.js          1 KB    ← boot: draft → login gate → studio
gen/
  assets.js      4.0 MB    ← GENERATED: CRANE_DRAWINGS (20 CAD bodies), DRAWING_ALIAS, DIMS_IMG (dimension PNGs), IMPORTED_CHARTS (Liebherr LICCON tables)
  fonts.js                 ← embedded sheet fonts (for PDF)
dist/index.html            ← current v6 build (baseline to diff against)
*.js (root)                ← Playwright test/screenshot scripts (see §3)
pipeline/                  ← how gen/assets.js was made (CAD + charts); see §9
```

**Module load order (build.py `MODULES`):**
`data, engine, env, draw, crane2d, samples, weather, three3d, scene, wizard, login, app, studio, deck, pages, tour, main`.
Every module shares **one global scope**, so function and const names must be unique across all files. `build.py` strips any trailing `if (typeof module …` block, so `engine.js`/`draw.js` can also be `require`d from Node for tests.

**External libs** are loaded from the CDN in `build.py`, with exact versions:
- `jspdf@2.5.2`, `svg2pdf.js@2.2.4` and `jszip@3.10.1`.
- `three@0.147.0` plus its `examples/js` postprocessing scripts. Those scripts are r147-only, so **don't bump three**.
- `env.js` lazy-loads `dxf-parser@1.1.2` and `pdf.js@3.11.174`.

The artifact sandbox allows scripts only from `cdn.jsdelivr.net/npm`, `cdnjs.cloudflare.com`, `unpkg.com` and `code.jquery.com`, plus CSS from Google Fonts. Pin exact versions. Nothing else can load, and **`fetch` to other sites is blocked in the artifact**, which is why live weather only works offline.

---

## 2. Setup

```bash
npm install                       # Playwright 1.56.1 (pinned: its Chromium build must match), three 0.147.0 for test routing
npx playwright install chromium   # only if Playwright says the browser is missing
mkdir -p out
python3 build.py                  # prints the byte size, writes dist/index.html
```

Syntax-check the whole bundle after any edit. One stray brace breaks everything, and the only symptom is an unrelated "X is not defined" error:

```bash
node -e "const fs=require('fs');const h=fs.readFileSync('dist/index.html','utf8');fs.writeFileSync('/tmp/bundle.js',[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n'))" && node --check /tmp/bundle.js
```

Optional fonts for pixel-accurate screenshots: set `FONTS_DIR` to a folder containing `fontsource-variable-archivo-5.3.0/` and `fontsource-variable-martian-mono-5.3.0/` (the npm tarballs unpacked). Without it the tests use system fonts and still pass.

---

## 3. Tests and screenshots

The scripts are Playwright and run with SwiftShader (WebGL in headless mode). `shot_login.js` exports `routes(page)`, which serves the CDN libs from `node_modules`, stubs Google Fonts and **blocks open-meteo** so the artifact behaviour is reproduced.

| Script | What it checks | Run |
|---|---|---|
| `render_test.js` | Engine + sheet for all 6 sample plans (prims count, scale, status, util) | `node render_test.js` |
| `e2e5.js` | Login (wrong/right code), drawer, manual telescoping, presets, jibs, superlift, weather blocked/manual/live-stub, **A1 PDF download** | `node e2e5.js` |
| `e2e_mobile.js` | 390 px: no horizontal scroll on login + studio | `node e2e_mobile.js` |
| `tour_test.js` | Whole tutorial incl. hands-on tasks + restore of the user's plan | `node tour_test.js` and `W=390 H=844 node tour_test.js` |
| `a11y_audit.js` | Unnamed controls, touch targets < 44 px, text < 10 px, per drawer section, 1440 + 390 | `node a11y_audit.js` |
| `deck_shot.js` | Cab deck: popovers (tackles, crane), typed dial values, sections panel, empty hook | `node deck_shot.js` / `W=390 H=844 …` |
| `drawer_shot.js` | Lift drawer (tackles, height mode, DAF), Crane drawer (rigs), Sheet row manager | `node drawer_shot.js` |
| `sheet_png.js` | Renders the A1 sheet to `out/sheet.png` (`EXTRAS=1` adds tackles, DAF and custom rows; `SAMPLE=n` picks a sample plan) | `EXTRAS=1 node sheet_png.js` |
| `fleet_shots.js` | Elevation of every fleet crane → `out/fl_<id>.png` (`ONLY=id1,id2`) | `node fleet_shots.js` |
| `test_eng2.js` | Engine in Node **with** CAD assets (pivots/sheave offsets) | `node test_eng2.js` |

⚠️ **Most scripts print values and do not assert anything.** Read the output and look at the PNGs. Turning them into real assertions is backlog item P0-1.

Expected noise: `Failed to load resource: net::ERR_BLOCKED_BY_CLIENT` (the weather block) is fine. Anything else in `errors [...]` is a bug.

---

## 4. Data model

### 4.1 Plan (`state.plan`, defaults in `blankPlan()`; **always pass through `normalizePlan()` in app.js**)

```js
{
  id, name, layout: 'chart'|'full'|'elev2'|'rigging',
  meta: { client, project, title, drawingNo, sheetNo, scale, drawnBy, checkedBy, date, revs:[{rev,desc,date}], titleRed? },

  // ── ACTIVE CRANE fields (CRANE_KEYS in engine.js) ──
  craneId, chartIdx, colIdx, cwt, config, outriggerTxt, boomOverride,
  tele: { mode:'auto'|'manual', fr:[0..1 per telescopic section] },
  attach: { type:'none'|'fly'|'luff', ext, jibLen, offset, boomAngle, swl },
  acc: { yguy, superlift, runner, slRadius, slBallast },
  falls, matSize, modelTxt, hookAllowance, wind,
  outExt: { left:'full'|'half', right:'full'|'half' },   // v8: outrigger beams per side
  padMan: { FR?, FL?, RL?, RR? },                         // v8: leg loads typed by hand (t) — ILLUSTRATION ONLY, flagged everywhere

  // ── several cranes on one plan ("swap" model) ──
  cranes: [ {…CRANE_KEYS snapshot…}, … ],   // parked copies; index = crane number
  activeCrane: 0,                           // which one is currently in the top-level fields

  loads: [{
    name, w, cont, contOn, hb, tk, extra,           // weight (t), contingency %, on/off, hook block, lump tackle weight, other
    by:'radius'|'angle'|'height', R, angle, tipH,   // which quantity is HELD when the boom telescopes
    l, h, rigH, shape, landY, capOverride, colIdx,  // size, landing level, manual capacity, per-load boom column
    side:'left'|'right'|'rear',                     // which side of the crane the load is lifted over (default 'rear'; never the front) — see Lift side below
    liftType, notes, rigType, slingL, slingAng, slingWLL,
    empty,                                          // show hook empty (no load, no tackles in total)
    crane,                                          // index into plan.cranes
    tackles: [{ name, type:'sling'|'shackle'|'spreader'|'beam'|'chain'|'hook'|'other', L, w, legs, wll? }], // top = hangs from hook
    daf: { on, mode:'auto'|'manual', cls:'HC1'..'HC4', vh, v }
  }],
  activeLoad, secondLoad, mergeHook,
  site: { groundType:'ground'|'barge', stepX, targetGround, obstacles:[{ type, x, y, w, h, d, label, … }] },
  env: [{ id, kind:'dxf'|'pdf'|'img', view:'elev'|'plan', sc, rot, opacity, unit, N, mono, hidden, assetId|data }],
  sitePlan: { enabled, cx, cy, rot, carrierRot },   // rot = boom heading, carrierRot = the way the cab faces ('' = carrier follows the boom); headings °, CCW from east, north up
  weather: null | { place, lat, lon, tz, date, start, hours, limit, manual:{wind,gust,rain,note}, hourly, fetched, print },
  outrigger: { enabled, maxLoad, matSelf, mat, allow, matEff, basis:'full'|'side', ground },   // maxLoad = the maker's leg load (wins); ground = GROUND_PRESETS key
  rigging: { enabled, loadIdx, legs, effLegs, slingL, spread, slingWLL, shackleWLL, slingDesc, shackleDesc, height },
  sheetRows: { hide:{'load.sf':true,…}, show:{'load.angle':true,…}, custom:[{ label, value, sec:'crane'|'load'|'extra', load:''|index }], ov:{ rowId:'TEXT' } },  // ov (v8): values typed over the printed ones
  sheetView: null | { x0, x1, y0, y1 },    // locked sheet framing
  extraNotes
}
```

**Lift side (`load.side`):** the load is lifted over the `'left'`, `'right'` or `'rear'` of the carrier, never the front. Engine (engine.js): `sideOf(load)`, `chartCoversSide(chart, side)`, `bestChartForSide(crane, side, currentIdx)`, `boomHeadingFor(plan, load)` / `carrierHeadingFor(plan, load)` (boom = carrier + 180 rear / +90 left / −90 right; with `sitePlan.carrierRot` empty the carrier follows `sitePlan.rot`), `computeLoad` adds `res.side` / `res.sideOk` and a FAIL check when the chart does not cover the side. Charts carry `sectors: ['360']` or any of `'rear'`, `'side'` (data.js `inferChartSectors` fills it from the chart name). After changing `load.side` the UI sets `plan.chartIdx = bestChartForSide(crane, side, plan.chartIdx)` (and resets colIdx like any chart change). Drawing: elevation glyph + mirrored carrier (draw.js `CAD_CARRIER`, `liftBodyCrane`, `drawSideGlyph`), site plan / 3D headings, sheet row `load.side`. Tests: `node test_side.js`, `node side_shots.js`, `node side_e2e.js`.

**Multi-crane swap model:** the top-level CRANE_KEYS always hold the *active* crane, and the others are parked in `plan.cranes[i]`.
- **Switching:** use `switchRig(i)`. It parks the current crane and unparks crane `i`.
- **Selecting a lift:** use `selectLoad(li)`, which also switches to that lift's crane.
- **Adding and removing:** use `addRig()`, `removeRig(i)` and `setLoadRig(li, i)` (all in app.js).
- **Computing:** `computePlan()` builds a per-crane view (`calc.rigs`) and computes each load with its own crane (`res.crane`, `res.rigI`).
- **New per-crane fields go in `CRANE_KEYS`**, or multi-crane plans will mix up settings between cranes.

**New plan or load fields need a default in `normalizePlan()`** so old saved plans and drafts still load.

### 4.2 Crane record (`DEFAULT_CRANES` in data.js, merged with `CRANE_EXTRAS`, overridden by user cranes from the db)

`id, model, make, cls (t), type, axles, carrierLen, carrierH, width, outrigger, outLong, outTrans, pivotX, pivotH, tail, boomMin, boomMax, sections, boomDepth, mass, cwt, hookBlock, color, charts[], drawing, drawProxy, tint, acc[], jib{fly:[min,max], luff:[min,max]}, dimsImg, customBody`

v8 optional leg-load fields (Fleet → "Leg loads — maker's weights"): `outTransHalf` (width across at half out), `outEx` (legs centre ahead of the slew centre), `omCarrier`, `omCarrierX`, `omSuper`, `omBoom`, `omCwtR`, `padMax`. Without `omCarrier` + `omBoom` the leg model uses estimated weights (`O.est`).

- `drawing` = key into `CRANE_DRAWINGS` (with `DRAWING_ALIAS`). When `drawProxy:true`, the body belongs to a *different* model because no DWG exists for this one. The Fleet page says so.
- `charts[]`: `{ id, name, kind:'main'|'fixedjib'|'luffing', config, cwt, outrigger, src, verify?, source, mainLen?, jibLen?, mainLabel? }`.

**Chart text format** (`parseChart` in engine.js):
```
H: 13.0 | 17.4/a | 17.4/b | 26.1        ← boom lengths; "/a" = label, "/8" (≤16) = falls
3: 100 80 72.5 -                         ← radius: capacity per column, "-" = not allowed
3.5: 80 75 71 60
```
Lookup is conservative by default (next radius up, lower of two neighbouring boom lengths when between columns).

### 4.3 CAD crane body (`CRANE_DRAWINGS[key]`, v2, generated)
`{ v:2, label, theta0, pivot:[x,y] m, tip:[s,n] m (head sheave in the boom frame), tipR, mirror, lattice, body:[items], bbox, secs:[{s0,s1,n0,n1,items}], cyl:{C,B,…}, hook:{items,h,w}, pal }`.
Each item is `[filled?1:0, colourIdx, [x1,y1,x2,y2,…]]` with coordinates in **cm integers**. The telescopic sections are drawn sliding by their extension fractions (`cadSections` / `drawCadCrane` in crane2d.js).

### 4.4 Settings (`DEFAULT_SETTINGS`, stored in db `config/settings` or `localStorage lp.settings`)
Company block, logo, copyright line, default notes, `utilWarn`, `utilMax` (**both default 100**, see Known issues), `minClearance` 1.0 m, `lookup:'conservative'`, `outriggerFactor` 0.8, `headerStyle:'yellow'|'classic'`, `canvas:'paper'|dark`, `tackleLib[]` (the user's saved tackles).

### 4.5 Storage
`initStorage()` in app.js uses the artifact runtime when it's present:
- `window.claude.use('db')` → collections `cranes`, `plans`, doc `config/settings` (shared, live via `onSnapshot`).
- `use('assets')` → uploaded logos, chart images and client drawings (`/_blob/<id>`).
- `use('downloads')` → PDF/DXF/SVG/JSON exports.

**Offline fallback:** localStorage keys `lp.settings`, `lp.cranes`, `lp.hidden`, `lp.plans`, `lp.draft`, `lp.sec`, `lp.view`, `lp.page`, `lp.toured`, `fhe.auth.v1`. **Always keep the fallback path working.**

---

## 5. Engine rules (engine.js)

- **Geometry with head-sheave offset:** `R = Px + L·cosθ − n·sinθ`. The tip uses rho/phi, and jibs start at the head sheave.
  - Functions: `solveGeometry`, `tipFromAngle`, `radiusFromAngle`, `angleFromRadius`, `angleFromHeight`.
  - Pivot and offsets come from the CAD drawing when one exists (`geoPivot`), otherwise from the crane record.
- **Drive modes:** `load.by` = `radius` (R fixed, so telescoping changes the angle), `angle` (θ fixed), or `height` (tip height fixed). The deck's **Hold** buttons set this.
- **Boom:** `boomSpec(crane, chartLengths)` gives Lmin, Lmax, the number of telescopic sections and the stroke E. Auto mode snaps to chart columns (`setBoomLength`), and manual mode uses per-section fractions.
- **Totals:**
  - `W` is the load weight, or 0 when the hook is empty.
  - `contW = W·cont%` when `contOn`.
  - `hb` is the hook block.
  - `tk` is the **sum of tackle weights if any tackle has a weight, otherwise the lump `load.tk`**. This is deliberate so tackle weight can never silently drop to zero.
  - `ex` is other deductions, and `total = W + contW + hb + tk + ex`.
- **DAF** (EN 13001-2 φ₂): `φ₂ = φ₂,min + β₂·v_h`, with HC1 1.05/0.17, HC2 1.10/0.34, HC3 1.15/0.51 and HC4 1.20/0.68 (`DAF_HC`, `dafAuto`). Manual mode uses `daf.v`. With a DAF, **utilisation is computed on `design = total × DAF`**.
- **Tackles stack** (`tackleStack`): each item adds vertical height (slings use leg geometry against the beam above and below or the pick points), giving the rig height `stack.H` and the tension per leg. Items carry `j` = their index in `load.tackles`.
- **Checks** (`res.checks`): capacity utilisation, headroom (tip ≥ landing + load + rigging + hook allowance), boom clearance to obstacles (min `minClearance`), sling tension, ground pressure (outrigger table), weather (gust at tip vs limit), geometry, unverified chart, and manual telescoping notice.
- `computePlan(plan, cranes, settings)` → `{ crane, loads:[res…], rigs, status:'ok'|'warn'|'fail', ground, rig, weather }`.

---

## 6. The A1 sheet (draw.js)

- **Paper and coordinates:** `SHEET` is 841 × 594 mm. The right data panel is at `x = 712, w = 121`, inside the frame from y = 10 to y = 584.
- **Layouts:** `chart` (load chart + crane dimensions + overview), `full`, `elev2` (two lifts side by side) and `rigging`.
- **Primitives and output:** all drawing goes through primitives `P.line/rect/text/circle/image…` tagged with DXF layers. The same primitives produce the **SVG** (`toSVG`), the **PDF** (svg2pdf into jsPDF, A1 or A3) and the **DXF** (`toDXF`, model space at true size).
- **Text must fit:** use `cellText` / `fitSize` / `textW` (canvas measureText) for every table and margin string, and never place raw text in a fixed box.
- **Dimensions:** use `dimA(P, a, b, off, label, {side, gap, over, size, extA, extB, bg})`. Dimension lines stop on extension lines and their text is knocked out.
- **Data panel rows** are defined in `SHEET_ROWS` (keys `crane.*`, `load.*`, `extra.*`).
  - `SHEET_ROWS_OFF` lists rows that are off by default (angle, tip height, hook height).
  - `sheetRowOn(plan, key)` decides visibility. Add new rows there and gate them with `on('load.key')` in `drawTitleBlock`.
  - Row height shares the free space. The sign-off box, notes and drawing history absorb the rest, so the column always fills.
- **Multi-crane output:** one `M.CRANE DATA n` block per crane and one `LOAD DATA n` block per lift, then the `LIFTING TACKLES` schedule and an `ADDITIONAL DATA` block for custom rows.

---

## 7. UI map

- **Top bar:** plan name and save state, view switch (**Elevation / Site plan / 3D / Sheet**, keys `1–4`), weather chip, status chip, help `?` (starts the tour), **Quick setup** (wizard), Save (`Ctrl S`), Export menu (PDF A1/A3, DXF, SVG, JSON).
- **Rail** (left): sections **Job → Crane → Lift → Site → Weather → Sheet**, plus pages **Plans / Fleet / Settings**. On mobile it becomes a bottom tab bar and the drawer becomes a bottom sheet.
- **Drawer** (studio.js `secJob/secCrane/secLift/secSite/secWeather/secSheet`):
  - **Crane:** "Cranes on this plan" (C1, C2… with Add a crane), crane card, load chart, telescopic boom (by-hand sections tucked under *Advanced*), accessories, counterweight.
  - **Lift:** lift tabs, the load (weight, contingency on/off, hook empty, "Lifted by" crane), position (Hold radius / angle / tip height, with all three typeable), lifting tackles, deductions, DAF, rigging, size and landing.
  - **Sheet:** layout, *What prints in the data panel* (row chips + your own rows), outrigger table, rigging detail, drawing history, notes, export.
- **Canvas** (scene.js): to scale. Drag the amber dot (crane), magenta diamond (load radius) and objects. `M` measures, `F` fits, scroll zooms, `[` `]` nudge the radius.
- **Cab deck** (deck.js, under the canvas):
  - **Top row:** lift tabs, crane chip (popover: rigs, picker, chart, CWT, outriggers, falls), LOAD (t), EMPTY HOOK, CONTINGENCY, DAF, TACKLES (popover editor + library), accessory toggles.
  - **Dials:** **Boom length / Boom angle / Radius / Tip height**. Each takes a typed value or a slider and has ± steps. The **Hold** button sets `load.by`, and **Secs** opens per-section telescoping.
  - **Help line:** `#dkHelp` shows plain-English help for whatever is hovered or focused (`data-help` attribute → `DECK_HELP` map).
- **Inspector** (right): utilisation gauge, verdict, readouts (with tooltips) and the checks list.
- **Tour** (tour.js `TOUR_STEPS`, 18 steps): spotlight + hands-on tasks (radius, boom length, LMI-in-the-red challenge, add an object, open 3D) + certificate. It stashes and restores the user's plan.

**Design system** (`:root` in shell.html): a dark "control room" look with amber `--amber` for active/held states, cyan `--cyan` for info/help, and green/amber/red for ok/warn/fail. Fonts are **Archivo** (UI) and **Martian Mono** (numbers). Icons are inline SVG paths in `ICO` (studio.js), never emoji. Mobile breakpoint is ≤ 900 px. Touch targets should be ≥ 40–44 px and text ≥ 10 px.

---

## 8. House rules for changes

1. **Plain English first.** Saad's rule is that "a 15-year-old should have no trouble with it". Every new control gets a visible label, a `data-help` entry in `DECK_HELP` (deck) or a hint line (drawer), and a one-line explanation of any jargon.
2. **Everything in one place.** Lift controls belong in the cab deck or its popovers, mirrored in the drawer. Never make the user scroll pages to change boom, radius or weight.
3. **Safety-relevant numbers must never silently drop.** Weights, capacities and DAF fall back conservatively, and anything estimated is labelled as estimated.
4. **Keep it a single file.** No new runtime dependencies unless they're on the allowed CDNs with pinned versions. No network calls in the artifact build.
5. **After every change:** `python3 build.py`, run the bundle syntax check, run the relevant test scripts, **open the screenshots**, and check 1440 × 900 **and** 390 × 844.
6. **Back-compat:** old plans in the db and localStorage must load. Add defaults in `normalizePlan` and never rename stored keys without a migration.
7. **Don't touch** `gen/assets.js` by hand. Regenerate it with the pipeline (§9).
8. **Write a short changelog** at the bottom of this file for every session (what changed, which tests ran, known gaps).

---

## 9. Asset pipeline (only needed to add or replace crane bodies, dimension images or Liebherr charts)

`pipeline/` holds the scripts that produced `gen/assets.js`. Paths inside them are **hard-coded to the original machine** (`/home/claude/lun_in`, `/home/claude/lc`), so adjust them before running.

1. **DWG → DXF:** `pipeline/cad/conv.sh` uses **libredwg** `dwg2dxf` (built from source). Source DWGs are Habib's 42-file Russian dynamic-block crane library (`lun.zip`, not included — ask Saad).
2. **DXF → classified JSON:** run `extract2.py` (ezdxf frontend capture), then `norm2.py` (classifies body, telescopic sections in the boom frame, cylinder, hook block and head-sheave offset; output in metres, item coordinates in cm). `pose2.py` and `prev2.py` render previews for checking.
   - Results are in `pipeline/data/cad_json/`.
   - That includes **unused crawler/lattice bodies**: `cc2400`, `lr1200`, `lr1400`, `lr1600`, `lr1700`, `lr1800`, `lr11000`, plus several unused Liebherr/Zoomlion ATs.
3. **Liebherr LICCON charts:** `pipeline/charts/lieb_charts.py` → `charts_to_app.py` → `pipeline/data/liebherr_app/app_*.json`.
4. **Dimension drawings:** `pipeline/data/dims_png/*.png`.
5. **Writing the assets file:** `pipeline/cad/gen_assets.py` writes `gen/assets.js`. The `NAMES` map labels the drawings, and the script also writes `DRAWING_ALIAS`.

---

## 10. Known issues and limitations (as of v6)

| # | Issue | Where |
|---|---|---|
| K1 | `[` / `]` keyboard nudge does nothing in **tip-height** mode (`setPosition` writes `R`) | studio.js keydown → `setPosition` |
| K2 | **Resolved 2026-10-19:** Saad set the defaults to Careful above **75 %** (`utilWarn`) and Stop above **90 %** (`utilMax`). v7 moves saved settings still on the old 100/100 to 75/90 once (`settings.limitsV7`) | data.js `DEFAULT_SETTINGS`, src/v7/main.js |
| K3 | **Borrowed (proxy) bodies**: STC500/STC750 → ZTC600V, STC1000 → ZTC1000V, AC100 and LTM1080 → LTM1090, LTM1200 → LTM1220, SAC2600 and ZAT4000V → ZAT2000V, AC500 → AC700 | data.js `CRANE_EXTRAS` |
| K4 | **Partial charts**: STC1000 covers 13–26 m booms only and ZTC1000V covers 51–70 m only. Charts marked `verify` were transcribed from public sheets | data.js |
| K5 | **Crawler and tower-crane** bodies from the DWG set are extracted but unused. There is no crawler geometry (tracks, lattice boom, track bearing pressure) | engine / crane2d |
| K6 | **No tandem lift** (two cranes on one load). Multi-crane = separate lifts, each with its own crane | engine |
| K7 | Crane drawer "rigSel": selecting a crane no lift uses leaves the active lift on its own crane, so the deck and drawer can show different cranes until a lift is assigned | studio.js `rigSel` |
| K8 | Empty hook draws the hook at the *landed-load* height, not a free-hanging position | engine `hookY` |
| K9 | Deck top row wraps to two lines at ≤ ~1500 px wide. On mobile it scrolls sideways with only a fade as a hint, and the deck takes ~45 % of the screen height | deck.js / shell.html |
| K10 | No **undo/redo** | — |
| K11 | Tests mostly print rather than assert | root *.js |
| K12 | `studio.js` and `draw.js` are > 100 KB each, and `gen/assets.js` (4 MB) is inlined, so first load is heavy | — |
| K13 | Live weather can't load inside the claude.ai artifact (CSP). Manual entry works there, and live works offline | weather.js |

---

## 11. Improvement backlog (do after "Changes I want", in this order)

**P0: correctness and safety**
1. Turn `render_test`, `e2e5`, `tour_test`, `e2e_mobile` and `a11y_audit` into **asserting** tests (non-zero exit on failure). Add Node unit tests for chart lookup, geometry (sheave offset, all three drive modes), totals (contingency on/off, empty hook, tackles vs lump), DAF auto/manual and multi-crane swap/compute.
2. Fix K1 (height-mode nudge) and K7 (rig selection should also pick or assign a lift).
3. Put an **"UNVERIFIED CHART"** stamp on the sheet whenever the chart has `verify`, and block "All checks pass" for it.
4. Settle K2 thresholds with Saad/Habib and expose them clearly in Settings.

**P1: ease of use** (Saad's bar: a first-timer gets through without help)
5. **Undo/redo** (plan snapshots on every committed change; `Ctrl Z`, `Ctrl Shift Z`, and buttons in the top bar).
6. **Mobile deck:** a collapsed one-line summary (R · L · θ · t · util) that expands to the full deck, with popovers as bottom sheets.
7. **Desktop deck:** keep the top row on one line by moving accessories into a "Bolt-ons" popover below ~1500 px.
8. **Inline validation:** red text right under a dial or field when a value is out of range, saying what range is allowed (today it's a toast).
9. A first-run **"Start a new plan"** flow that asks 4 questions (what, how heavy, how far, how high), then drops the user in the deck. The existing wizard can be reused.
10. **Tandem lift** (K6) if Saad confirms it's needed: two cranes, one load, share split by pick-point geometry, both cranes checked.
11. **Crawler cranes** (K5) using the extracted bodies.

**P2: code health and performance**
12. Split `studio.js` and `draw.js` into smaller files (same global build, or move to ES modules + esbuild emitting one file).
13. Shrink first load: compress `gen/assets.js` (gzip + base64 + `DecompressionStream`) or decode CAD bodies lazily per crane.
14. Add a plan `version` with step-wise migrations in `normalizePlan`.

---

## 12. Definition of done (per change)

- [ ] Change works at **1440 × 900** and **390 × 844** (screenshots looked at, not just generated)
- [ ] `python3 build.py` plus the bundle syntax check pass
- [ ] `render_test`, `e2e5`, `e2e_mobile` and `tour_test` (both sizes) are clean, with no new entries in `errors [...]`
- [ ] `a11y_audit` has no new unnamed controls, tiny text or small touch targets
- [ ] The A1 sheet still fills and fits (`EXTRAS=1 node sheet_png.js`, then look at `out/sheet.png`)
- [ ] Old plans still load (open each `SAMPLE_PLANS` entry, plus a plan saved by v6 if you have one)
- [ ] New controls have plain-English help
- [ ] Changelog entry added below

---

## Changelog

- **v6 (2026-10-19):**
  - New cab control deck with typed values, hold modes (radius, angle, tip height), sections tucked away and a plain-English help line.
  - Real CAD crane bodies from Habib's DWGs, with the head-sheave rope fixed.
  - Clean dimensions.
  - Multi-crane plans.
  - Named tackles with variable length and a library.
  - Empty hook, contingency on/off, and DAF auto (EN 13001-2) or manual.
  - Sheet row manager with custom rows; fitted margin text; balanced data panel.
  - Tutorial updated to the deck.
  - Changing crane auto-picks a boom that reaches the radius.
- **Head-sheave fix (2026-10-19, later session):**
  - Hook rope was leaving the rear/top head sheave on `ltm1500`, `ztc300v`, `ltm1230`; `ltm1160` had its tip 0.26 m ahead of the real sheave and `ltm11200` (no sheave in the block) hung the rope in mid-air. All 20 bodies were checked against the CAD circles.
  - New `src/fixes.js` (build.py CORE, right after crane2d): `SHEAVE_FIX` table patches `CRANE_DRAWINGS[k].tip/tipR` at load time (each entry only applies while the generated tip still equals its `was` value). `gen/assets.js` untouched. Remove the table after re-running the pipeline with the `pipeline/cad/norm2.py` fix described in the comment there.
  - Radius geometry follows `tip` (R = Px + L·cosθ − n·sinθ), so for a fixed radius the boom angle goes up by 2 to 4° on those cranes (e.g. LTM1500 at R 14 m, L 25.9 m: 53.9° to 57.5°). The `tc` sample (LTM1500) boom angles move 49.7→51.9° and 42.1→44.3°.
  - `ltm11200` tip is an approximation (front/lower lug of its head frame); that body has no sheave drawn.
  - Tools: `node sheave_audit.js` (CAD head crops), `node sheave_elev.js` (real elevation, `NOFIX=1` for before), `node sheave_radius.js`, `HEAD=1 ALL=1 node fleet_shots.js` (head zoom, every body). `fleet_shots.js` now uses `pathToFileURL` (Windows). `render_test.js` and `test_eng2.js` load `fixes.js`.

- **Lift side (2026-10-19):** per-load `side` (left / right / rear, default rear; v6 plans migrate in `normalizePlan`), chart `sectors` + FAIL check when a chart does not cover the side, site plan / 3D / elevation follow the side (carrier mirrored for rear lifts and end-on for side lifts on the CAD bodies, plan-view glyph on the elevation), `LIFT SIDE` row on the A1 data panel. Tests: `test_side.js` (118 asserts), `side_shots.js`, `side_e2e.js`, `render_test.js`. Known gaps: side lifts show the carrier end-on with a generic body (no cab), the CAD split is verified only for the 20 listed bodies, v6 UI has no side control.
- **v7 interface (2026-10-19):** new Apple-style, phone-first UI for operators who don't read much. Engine, drawing, CAD and storage are unchanged and shared with v6.
  - Build: `python build.py v7` writes `dist/v7.html` and `public/index.html` (Windows: use `python`; build.py now reads/writes UTF-8). `python build.py` still builds the v6 UI to `dist/index.html`.
  - Hosting: GitHub `unknown5666/LoadLock` → Vercel. `vercel.json` has no install/build step and serves `public/` as-is, so **rebuild and commit `public/index.html`** with every change.
  - Source: `src/v7/` holds `shell.html` (all CSS, tokens on `:root`, light/dark), `core.js` (actions, refresh, undo/redo, views), `ui.js` (top bar, capacity ring, tiles, dock, canvas controls, coach marks), `sheets.js` (every editor as a bottom sheet / side card), `pages.js` (plans, fleet, settings), `login.js`, `main.js`.
  - Sign-in: Saeed / 911, Saad / 786, Habib / 12911 (salted SHA-256 in `src/v7/login.js`, key `fhe.auth.v7`). Still a soft gate, not security.
  - New: undo/redo (`histGo`), boom-to-building gap pill on the canvas (`settings.showGap`, threshold `minClearance`), lift-side picker, "Find a crane" (findCranes on the current lift), theme Auto/Light/Dark (`settings.theme`), home-screen icon + manifest.
  - Tests: `node v7_e2e.js` and `W=390 H=844 node v7_e2e.js` (asserting, exit 1 on failure), `node v7_shot.js` (screenshots to `out/v7_*`).
  - Not ported from v6: the guided tour (replaced by 3 coach marks) and the "Quick setup" wizard (replaced by "Find a crane").
  - Utilisation limits now default to Careful > 75 %, Stop > 90 % (Saad's decision, K2 closed).
- **v8 — outrigger leg loads (2026-10-22, major):** built from the outrigger brief (physics, worked example, data).
  - Engine `src/outrig.js` (build CORE right after engine): point-mass model (carrier, superstructure, counterweight, boom/jib, hook load incl. DAF), rigid-plane pad reactions (3×3 solve), lift-off iteration (3-point support), tipping check (CoG vs pad polygon), tipping hook load by bisection (rated = 85 %), 360° slew sweep (5°) plus the unloaded / boom-steep case, ground pressure and smallest square mat. Frame: +x cab, +y carrier's left, θ CCW (rear 180, left 90, right 270). Tonnes; kN = × 9.81.
  - Per crane (`CRANE_KEYS`): `outExt` left/right full or half (half span = `crane.outTransHalf` or halfway between carrier side and full), `padMan` hand-typed leg loads — **illustration only**: red banner in the app, ILLUSTRATIVE row + `*` on the A1 sheet, warn check.
  - `computePlan` → `calc.outrigs[]` (one per crane) and `calc.outr` (active crane). Checks: half legs with a full-leg chart = FAIL (warn if capacity typed by hand; a chart named "half / 50 % / partial" counts as a half chart), leg lift-off, model tipping, backward stability (warn/info when the crane weights are estimated, fail/warn with the maker's weights), maker's max leg force. `calc.ground` uses the maker's leg load, else the busiest leg (360° or lift side, `outrigger.basis`), and is checked whenever `allow` is set.
  - Sheet: pressure table shows beams (FULL/HALF), the four leg loads, CALC./ILLUSTRATIVE labels; OUTRIGGER row adds the half info. Top view, end-on carrier and 3D draw each side at its real spread.
  - **Typed-over sheet values:** `sheetBlocks()` (draw.js) builds every data-panel row with a stable id (`c<crane>.<key>#n`, `l<lift>.<key>#n`, `t<lift>.<tackle>`, `g.*` pressure table, `w.*` weather); `plan.sheetRows.ov[id]` replaces the printed value. Safety rows (weights, capacity, %, SF, radius, ground) raise a warn check; others info.
  - v7 UI: new **Legs** dock button / sheet (`src/v7/legs.js`: top-view picture with leg loads, half/full per side, 360° vs lift-side basis, mats and BS 8004 ground presets, maker's leg load, hand-typed legs, tipping estimate) and **Print → Change values on the sheet**. Fleet: leg-load crane fields. Version shown as 8.0 (`APP_VERSION`).
  - Tests: `node test_outrig.js` (357 asserts: every §10 worked-example number to ±0.1 kN, §9 invariants, half legs, illustration values, sheet overrides, samples, fleet), `node v7_e2e.js` + `W=390 H=844 node v7_e2e.js` (Legs and sheet-values flows added), `render_test.js`, `test_side.js`. No screenshots were taken this session (code-only run).
  - Known gaps: wind/slope CoG shift and mat bending not modelled; estimated crane weights are rough (chart ÷ (85 % × model tipping) is 0.8–0.9 for most of the fleet, 1.0–1.16 for STC750/STC1000 at full reach); v6 UI has no Legs screen (sheet output is shared).

