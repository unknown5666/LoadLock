# Mobile Crane Outrigger Loads — Physics, Calculations & Simulator Spec

> **Purpose:** A self-contained engineering brief for building an outrigger-load / ground-bearing / stability module inside a crane lift simulator.
> **Audience:** Claude Code (implementation) + the lift planner (verification).
> **Status of numbers:** Every number in the worked example (§10) was computed and cross-checked with the reference implementation in §12.
> **In this repo:** implemented in `src/outrig.js`, checked by `node test_outrig.js` (every §10 number, the §9 invariants). Supplied by Saad, 2026-10-22.

> ⚠️ **Safety boundary.** This is a physics model for simulation, planning education and sanity-checking. For a real lift, the manufacturer's outrigger-load data (load-chart pad loads, LICCON/Tadano/Grove planning software, or the manufacturer's outrigger-force tables) and a competent person's ground assessment always govern. The simulator should display this disclaimer and must never present its output as a substitute for manufacturer data.

---

## 0. TL;DR — the whole thing in 8 lines

1. Model the crane as a set of point masses (carrier, superstructure, counterweight, boom, hook load).
2. Rotate the slewing masses by slew angle θ, then find the **combined centre of gravity (CoG)** of everything.
3. The outrigger pads are the **only** vertical supports. The ground pushes back with reactions R₁…R₄ that must balance the total weight and its moments.
4. Four supports, three equilibrium equations → statically indeterminate → assume a **rigid, flat chassis** (reactions vary linearly across the pads) to get a unique answer.
5. If any reaction comes out negative, that pad has **lifted off** → drop it, re-solve on 3 pads (now exact).
6. If the CoG leaves the polygon formed by the pads → the crane **tips**. Rated capacity on outriggers = typically **85 % of tipping load**.
7. Sweep θ through 360° → the biggest single reaction is the **max outrigger load**. It usually occurs with the boom over (or near) a pad corner, and sometimes in the unloaded/min-radius case.
8. **Ground bearing pressure = max outrigger load ÷ effective mat area.** Must be ≤ allowable ground bearing capacity. Required mat area = P ÷ q_allow.

---

## 1. Units, axes & sign conventions

| Quantity | Unit | Notes |
|---|---|---|
| Mass | t (tonne) | 1 t = 1000 kg |
| Force | kN | W = m · g, g = 9.81 m/s² → 1 t ≈ 9.81 kN |
| Length | m | |
| Moment | kN·m | (load charts often use t·m — convert ×9.81) |
| Pressure | kPa = kN/m² | 1 t/m² ≈ 9.81 kPa; 1 psf ≈ 0.0479 kPa; 1 psi ≈ 6.895 kPa |

**Coordinate frame (crane-fixed, plan view):**
- Origin **O** = slew centre (centre of rotation of the superstructure), at ground level.
- **+x** = toward the front of the carrier (cab end), **+y** = carrier's left, **+z** = up.
- **Slew angle θ** measured counter-clockwise from +x. θ = 0° → boom over the front; 90° → over the left side; 180° → over the rear.
- Slewing masses at radius r (signed — negative r means behind the slew centre, e.g. counterweight) sit at **(r·cosθ, r·sinθ)**.
- Non-slewing masses (carrier/chassis) are fixed in the crane frame.

**Note:** The outrigger box centre is generally **not** at the slew centre (offset `ex`, `ey`). This offset matters — it makes front and rear capacities differ.

---

## 2. Physics fundamentals

### 2.1 Static equilibrium (rigid body, no acceleration)

```
ΣFz = 0   →   Σ Rᵢ = W                         (vertical force balance)
ΣMx = 0   →   Σ Rᵢ · yᵢ = W · y_cg             (moment about x-axis)
ΣMy = 0   →   Σ Rᵢ · xᵢ = W · x_cg             (moment about y-axis)
```

- W = total weight (kN) = g · Σ mⱼ
- (x_cg, y_cg) = combined CoG of crane + load
- (xᵢ, yᵢ) = pad i centre; Rᵢ = vertical ground reaction at pad i (≥ 0 — the ground can push, never pull)

Three equations. **3 pads** in contact → statically determinate. **4 pads** → statically indeterminate; closed with the rigid-plane assumption (§4).

### 2.2 Combined centre of gravity

```
M = Σ mⱼ      x_cg = Σ (mⱼ · xⱼ) / M      y_cg = Σ (mⱼ · yⱼ) / M      W = M · g
```

### 2.3 Load moment

`Load moment = hook load × radius` — 5 t at 8 m = 40 t·m = 10 t at 4 m.

### 2.4 Tipping line & stability moment

- A **tipping line** is the line through two adjacent pads (an edge of the support polygon).
- Stability moment = Σ weight × perpendicular distance inside the line; overturning moment = Σ weight × distance outside it.
- Stable while stability moment > overturning moment ⇔ **the combined CoG lies inside the support polygon.**

### 2.5 Lift-off ≠ tipping

| State | Condition | Display |
|---|---|---|
| 4-point support | all Rᵢ > 0 | normal (green) |
| 3-point support | one Rᵢ = 0, CoG still inside polygon | warning (amber) — "pad lifted / light" |
| Tipping limit | CoG on polygon edge | red — stability = 0 |
| Tipped | CoG outside polygon | failure |

---

## 3. Inputs (data model)

Point masses (carrier, superstructure, counterweight, boom, hook load) — slewing ones by signed radius, fixed ones by position; pads with position (depends on beam extension), float/mat area, optional stiffness weight and maker's max outrigger force; boom pivot radius/height, length, mass, CoG fraction (telescopic ~0.35–0.45); scenario: slew, radius, gross hook load, dynamic factor, optional wind/slope, allowable ground pressure.

**Gross hook load** = net load + hook block + slings/shackles/spreader + any jib allowance. Charts are gross capacity; use gross load in the physics.

---

## 4. Calculation pipeline

1. **Boom geometry → boom CoG:** `cos β = (R − r_p)/L`, `r_bcg = r_p + f·L·cos β`, `z_bcg = h_p + f·L·sin β`.
2. **Place masses** for the slew angle: slewing `x = r cos θ − lat sin θ`, `y = r sin θ + lat cos θ`; hook load at `(R cos θ, R sin θ)` with mass × dynamic factor.
3. **Combined CoG & weight** (§2.2).
4. (Optional) **CoG shift** from wind and slope (§6).
5. **Stability check:** CoG outside the pad polygon → TIPPED.
6. **Reactions:**
   - 6a closed form, symmetric box at (eₓ ± a, e_y ± b): `u = (x_cg − eₓ)/a`, `v = (y_cg − e_y)/b`, `Rᵢ = W/4 · (1 + sxᵢ u + syᵢ v)` (sx +1 front, sy +1 left). Valid while |u| + |v| ≤ 1.
   - 6b general rigid plane: `Rᵢ = kᵢ (c₀ + c₁xᵢ + c₂yᵢ)`, solve
     `[Σk Σkx Σky; Σkx Σkx² Σkxy; Σky Σkxy Σky²]·[c₀ c₁ c₂]ᵀ = W·[1 x_cg y_cg]ᵀ`.
   - 6c lift-off: solve on the active pads; if any R < 0 drop the most negative and re-solve; with 3 pads and still negative → TIPPED.
7. **Slew sweep:** θ = 0…359° (1° for planning, 5–15° live); per pad max R and its θ; global max = **max outrigger load**. Also run the **unloaded case** (no hook load; boom at min radius and at the planned radius) — it can be the bigger one.
8. **Structural check per pad:** Rᵢ ≤ maker's max outrigger force.
9. **Ground bearing** (§7). 10. **Rated capacity** (§5).

---

## 5. Tipping load & rated capacity

- Tipping hook load: the hook load that puts the CoG on the governing polygon edge — bisection on the hook mass, minimum over all edges.
- Rated = **≤ 85 %** of tipping on outriggers (75 % crawlers). Chart rated capacity = min(structural limit, stability limit); structural limits come from the maker.
- `stability_utilisation = hook_load / (0.85 × W_tip)`.
- Backward stability: no load, boom short and high — the counterweight pulls the CoG towards the rear tipping line (ISO 4305).
- 360° charts = minimum over all slew angles; the box is strongest over a corner diagonal, weakest over the narrowest side.

---

## 6. Secondary effects (configurable)

- **Dynamic factor** ≥ 1 on the hook mass (user setting; never hard-code).
- **Wind:** `q = ½ρv²`, `F = q·C_d·A`, `M_w = F·h`, CoG shift `Δ = M_w / W` downwind; respect the maker's in-service wind limit.
- **Slope** α in direction φ: `Δx = (Σmz/M)·tan α·cos φ`, `Δy = (Σmz/M)·tan α·sin φ`, plus the hook load shifts by z_tip·tan α.
- **Side load / off-lead:** outside chart validity — flag it.

---

## 7. Ground bearing pressure & mat sizing

```
q_applied = P_max / A_effective   ≤ q_allowable
A_req = P_max / q_allowable        square mat side s = √A_req
```

Use the **maximum outrigger reaction** for the lift — not crane weight ÷ 4.

Indicative allowable bearing (BS 8004 presumed values — preliminary only):

| Ground | Allowable (kPa) |
|---|---|
| Dense gravel / dense sand & gravel | > 600 |
| Medium-dense gravel / sand & gravel | 200 – 600 |
| Loose gravel / sand & gravel | < 200 |
| Compact sand | > 300 |
| Medium-dense sand | 100 – 300 |
| Very stiff boulder clay / hard clay | 300 – 600 |
| Stiff clay | 150 – 300 |
| Firm clay *(Ontario Building Code table)* | ~75 |
| Soft clay & silt | < 75 |

Presets only — default to a site-specific value. Water table, made ground, buried services, voids, trench edges and slabs override any table. UAE: reclaimed land, sabkha and loose dune sand can be far weaker than they look; compacted road base is much better.

Rules of thumb (sanity only): Queensland code / CICA ≈ 0.65 × (crane + load); US heuristic 0.70–0.85 × (crane + load).

Mats: `A_effective = width × length × efficiency` (1.0 for stiff engineered mats centred under the float; lower for flexible or off-centre). Optional mat check: cantilever `c = (mat − float)/2`, `M = q c²/2`, `V = q c` per metre.

---

## 8. Behaviour the simulator must reproduce

1. Boom over a pad/corner → that pad peaks; over a side, two pads share.
2. Longer radius, same load → peak pad load rises toward ~W/2 at the tipping limit.
3. Narrower outrigger spread → higher pad loads, lower capacity.
4. Counterweight stabilises with load, but loads the rear pads when unloaded.
5. Slew centre offset from the box centre → front ≠ rear capacity.
6. Partial extension on one side → asymmetric polygon; capacity depends strongly on slew sector.

---

## 9. Validation tests

1. Equilibrium residuals < 1e-6·W (force) and < 1e-6·W·span (moments).
2. Symmetric crane, CoG at the base centre → each pad = W/4.
3. 6b on a symmetric rectangle = closed form 6a.
4. Lift-off continuity: as the hook load rises at a corner angle, the opposite pad goes to exactly 0 and stays 0 (never negative).
5. At W_tip the CoG lies on the edge (< 1 mm) and only the two edge pads carry load.
6. Increasing radius at constant load never lowers the peak pad load before tipping.
7. Worked example (§10) reproduced to ±0.1 kN.

---

## 10. Worked example (computed & verified)

### 10.1 Example crane (generic ~60 t total-mass AT/RT type — illustrative, not a real model)

| Item | Mass (t) | Slews? | Position |
|---|---|---|---|
| Carrier/chassis | 28 | no | (0.8, 0.0) m |
| Superstructure | 8 | yes | r = −1.2 m |
| Counterweight | 12 | yes | r = −3.2 m |
| Boom (25 m, CoG at 40 % from foot, foot at r = −1.5 m) | 9 | yes | r_bcg = −1.5 + 0.4 × 25 × cosβ |
| Hook load (gross) | varies | yes | r = 12 m |

Outrigger base: eₓ = 0.3 m, a = 3.6 m (7.2 m long), b = 3.5 m (7.0 m wide). Pads: FR (3.9, −3.5), FL (3.9, 3.5), RL (−3.3, 3.5), RR (−3.3, −3.5). At R = 12 m: cosβ = 0.54 → r_bcg = **3.9 m**.

### 10.2 Hand calculation, θ = 0°, hook load 6.9 t

```
M = 63.9 t   W = 626.9 kN   Σm·x = 92.3 t·m   x_cg = 1.444 m   u = 0.318
Front pads 206.5 kN each, rear pads 106.9 kN each
```

### 10.3 Hook load 6.9 t at 12 m (W = 626.9 kN), reactions in kN

| θ | x_cg | y_cg | FR | FL | RL | RR | Support |
|---|---|---|---|---|---|---|---|
| 0° | 1.444 | 0.000 | 206.5 | 206.5 | 106.9 | 106.9 | 4-pt |
| 45° | 1.124 | 0.774 | 158.0 | **227.2** | 155.5 | 86.2 | 4-pt |
| 90° | 0.351 | 1.094 | 109.9 | 207.9 | 203.5 | 105.5 | 4-pt |
| 135° | −0.423 | 0.774 | 90.6 | 159.9 | 222.8 | 153.6 | 4-pt |
| 180° | −0.743 | 0.000 | 111.3 | 111.3 | 202.1 | 202.1 | 4-pt |

### 10.4 Hook load 21.0 t at 12 m (W = 765.2 kN)

| θ | x_cg | y_cg | FR | FL | RL | RR | Support |
|---|---|---|---|---|---|---|---|
| 0° | 3.353 | 0.000 | 353.5 | 353.5 | 29.1 | 29.1 | 4-pt |
| 45° | 2.455 | 2.168 | 145.7 | **465.9** | 153.6 | 0.0 | 3-pt (RR lifted) |
| 90° | 0.287 | 3.065 | 23.1 | 358.2 | 359.5 | 24.4 | 4-pt |
| 135° | −1.880 | 2.168 | 0.0 | 150.9 | **468.7** | 145.7 | 3-pt (FR lifted) |
| 180° | −2.778 | 0.000 | 27.7 | 27.7 | 354.9 | 354.9 | 4-pt |

360° sweep (5°): **P_max = 468.7 kN at θ = 135°** (= 0.61 W; under the 0.65 W rule of thumb, 497 kN). Corner direction = strongest for stability, worst for single-pad load.

### 10.5 Tipping & rated capacity at 12 m

| Slew | Tipping hook load | 85 % rated |
|---|---|---|
| 0° | 26.27 t | 22.33 t |
| 45° | 41.85 t | 35.57 t |
| 90° / 270° | **24.99 t** | **21.24 t** |
| 180° | 25.68 t | 21.83 t |

### 10.6 Ground bearing for P_max = 468.7 kN

| Support | Area (m²) | Pressure (kPa) |
|---|---|---|
| Steel float only, 0.6 × 0.6 m | 0.36 | 1,302 |
| Mat 1.0 × 1.0 m | 1.00 | 469 |
| Mat 1.5 × 1.5 m | 2.25 | 208 |
| Mat 2.0 × 2.0 m | 4.00 | 117 |

| Ground (allowable) | A_req (m²) | Side (m) |
|---|---|---|
| Stiff clay — 150 kPa | 3.12 | 1.77 |
| Medium-dense sand — 100 kPa | 4.69 | 2.17 |
| Soft clay — 50 kPa | 9.37 | 3.06 |

---

## 11. Simulator brief (summary)

Pure physics functions (shared by live view, report and tests). Per frame: total weight, CoG, pad reactions and status, support state, stability margin and utilisation, bearing pressure and utilisation per pad, warnings. Visuals: plan view with support polygon, inner diamond and live CoG dot; pads sized/coloured by reaction and bearing; polar plot of pad load vs slew; capacity vs slew; ground panel. Must-have warnings: pad lifted, stability > 90 % / > 100 %, bearing over allowable, pad over maker's max force, out-of-level, wind over limit, unloaded case worse than loaded, and "Simulation only — verify against manufacturer outrigger-load data and ground assessment". To match a real crane: maker's carrier / superstructure / counterweight / boom masses and CoGs, slew-centre position, pad coordinates per extension, float size, max outrigger force; calibrate until tipping ÷ 0.85 brackets the stability-governed chart values.

---

## 12. Reference implementation (Python — verified)

```python
import math
import numpy as np
G = 9.81

def system_cog(masses):
    m = sum(mi for mi, _, _ in masses)
    xc = sum(mi * x for mi, x, _ in masses) / m
    yc = sum(mi * y for mi, _, y in masses) / m
    return m * G, xc, yc

def plane_reactions(pads, W, xc, yc, k=None):
    P = np.array(pads, dtype=float)
    k = np.ones(len(P)) if k is None else np.asarray(k, float)
    x, y = P[:, 0], P[:, 1]
    A = np.array([[k.sum(), (k*x).sum(), (k*y).sum()],
                  [(k*x).sum(), (k*x*x).sum(), (k*x*y).sum()],
                  [(k*y).sum(), (k*x*y).sum(), (k*y*y).sum()]])
    c = np.linalg.solve(A, W * np.array([1.0, xc, yc]))
    return k * (c[0] + c[1]*x + c[2]*y)

def point_in_convex_polygon(pt, poly):
    px, py = pt
    for i in range(len(poly)):
        x1, y1 = poly[i]; x2, y2 = poly[(i+1) % len(poly)]
        if (x2-x1)*(py-y1) - (y2-y1)*(px-x1) < -1e-12:
            return False
    return True

def solve_outriggers(pads_ccw, W, xc, yc, k=None):
    if not point_in_convex_polygon((xc, yc), pads_ccw):
        return None, "TIPPING - CoG outside support polygon"
    active = list(range(len(pads_ccw)))
    kk = [1.0]*len(pads_ccw) if k is None else list(k)
    while True:
        R = plane_reactions([pads_ccw[i] for i in active], W, xc, yc, [kk[i] for i in active])
        if R.min() >= -1e-9:
            out = [0.0]*len(pads_ccw)
            for i, r in zip(active, R): out[i] = float(r)
            lifted = len(pads_ccw) - len(active)
            return out, "OK" if lifted == 0 else f"OK - {lifted} pad(s) lifted"
        if len(active) <= 3:
            return None, "TIPPING - no non-negative solution"
        active.pop(int(np.argmin(R)))

def bearing_pressure(P_kN, w, l, efficiency=1.0):
    return P_kN / (w * l * efficiency)

def required_mat_side(P_kN, q_allow_kPa, efficiency=1.0):
    return math.sqrt(P_kN / (q_allow_kPa * efficiency))
```

---

## 13. Model limitations (show in the app)

Rigid chassis (real carriers twist); ground stiffness ignored; point-mass model (boom CoG moves as it telescopes); no boom deflection; static unless dynamic/wind factors applied; structural limits not derived; table ground values are preliminary only.

## 14. Standards & guidance

ISO 4305 (stability), EN 13000 (mobile cranes), BS 7121-3 (safe use of mobile cranes), CPA *Ground Conditions for Construction Plant*, Temporary Works forum guidance on outrigger loads and mats, BS 8004 (presumed bearing values), ASME B30.5, CICA / Queensland Mobile Crane Code of Practice (0.65 rule of thumb), SAE J765 (85 % tipping basis on outriggers).
