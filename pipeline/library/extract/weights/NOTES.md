# Weights and non-full-outrigger setups (text layers only)

Scripts: `weights.py` (writes weights.json by hand-checked entries), `gen_ztc.py`, `gen_mammoet.py` (word-position parsers; set LL_LIB for the library path).

## Weights (weights.json)
Printed values only, each with file + page. Derived entries carry `derived:true` (sums of printed items). Non-standard keys: `axleLoads` (t), `outTransRetracted` (transverse span with beams retracted, not half), `padMaxFront` / `padMaxOther`.
- `padMax`: only Liebherr LTM1160-5.2 (107.3 t rear, 76.3 t front) and LTM1650 (242.6 t rear, 189.6 t front, 114.2 t third support) print max supporting forces, in kN and t (no conversion). Icon meaning (front / rear) read from the page symbols.
- NOT printed in any text layer: `omCarrier`, `omSuper`, `omBoom`, `omCarrierX`, `outEx`, `outTransHalf`. Nothing was estimated.
- AC100: the AC 100 spec table (2011 metric p.7) mixes several configurations (48/60/63/75 t) without a clear mapping, so no gross was recorded. AC100-4 variants are a different (4-axle) model.
- LTM1500 gross 96 t is "incl. 50 m telescopic boom and permanent outriggers" (brochure p.2), not the bare carrier.
- ltm1160 values are 5.2 where printed (fleet charts are 5.1); ltm1250/ltm1300 retracted spans come from 6.1 brochures.
- ZAT4000V, SAC2600T and the LTM1650 Cranepedia metric chart are image-only: skipped. STC500T5 / STC500E / STC750S / SAC2600C8-8 are other models; their weights were not used.

## Setups (setups_<id>.json)
Only these crane/setup tables exist as text and are not already in data.js:
- ztc1000v: intermediate outriggers, 32 / 28 / 20 / 6 t counterweight, main boom (ZTC1000 PDF p.4-5). The intermediate jib tables on p.6 were not extracted.
- ltm1500: reduced base 10x6.3 m, T6, 15 t ballast (Mammoet reference sheet, Antbuildz copy, p.12). The 10x6.3 table on p.3 prints no ballast, so it was skipped.
- ac500: reduced base 8x7.3 m, 100 t ballast (Mammoet reference sheet p.3). Demag says reduced-base charts are "on request".
- ac700: reduced base 9x8.8 m, 120 t ballast (Mammoet p.3).
Reduced bases are tagged `setup:"half"` (nearest of half/retracted/tyres); the makers do not say "50 %". Mammoet sheets say "reference use only"; all charts have `verify:true`.
Candidate not extracted: STC500T5 "half extension" chart (STC500T5 tech data p.11, kg, 4.8 t counterweight) - a different model from fleet STC500.
No on-tyres, retracted or over-rear/side-only tables exist as text in the library (Liebherr/Demag brochures only print full-base tables; the AC100-4 "free on wheels" table is an image).
