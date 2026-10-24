# Crane library -> app (v10)

Source: the folder `LoadLock Crane Library/` (16 crane folders, each with `CAD/*.dwg` and `Load Charts/*.pdf`, plus `manifest.json`).
The library itself is not part of the repo. Third-party documents are reference only: check every value against the maker's chart for the exact machine before a lift.

## What goes into the app

| What | Where | Made by |
|---|---|---|
| Index of the library: name, publisher, public link, CAD match (no local paths, no file contents) | `src/library.js` (`CRANE_LIBRARY[crane.id] = { folder, docs:[{ kind, name, source, url, match?, login? }] }`) | `python3 pipeline/library/gen_library.py "<library>/manifest.json"` |
| Fleet page "Documents" group per crane (links open in a new tab, rel=noopener; a note when the 2D body is a borrowed drawing) | `src/v7/pages.js` (`fleetDocsGrp`) | by hand |
| Gap-filling load charts, all `verify:true`, flagged UNVERIFIED, appended after the crane's own charts (saved plans keep their chart number) | `src/data.js` (`LIB_CHARTS`) | `extract/gen_all.py` then `extract/inject_data_js.py` |
| Differences between the crane records and the spec PDFs, for Habib | `pipeline/library/dims_check.md` | by hand |

`kind`: `chart` = load chart / technical data / datasheet, `spec` = brochure / spec sheet, `cad` = DWG. `match` (CAD only): `exact`, `variant`, `nearest`, `collection`. `login:true` = the link needs a free CADforum account.
Other modules read `CRANE_LIBRARY[crane.id]?.docs` (for example the report's reference list).

## Charts added (all tonnes, copied as printed, "-" where the table has no value)

| Crane | Added | Source (library file, page) | Gap it fills |
|---|---|---|---|
| STC1000 | main boom 32.5 t CWT, 13.25-60 m (29 columns, falls from the "number of lines" row) | Cranepedia - Sany STC1000C - ... Load Chart - Metric - English.pdf p.5-6 | the 21.5 t chart only covers 13-26 m. The brochure prints 26.8 over the three 21.8 m columns (its boom list and line counts say 21.8), the chart uses 21.8 |
| ZTC1000V | main boom, full outriggers, 32 / 28 / 20 / 6 / 0 t CWT, 13.5-63 m | Cranepedia - Zoomlion ZTC1000 - ... Load Chart - Metric - EN.pdf p.3-4 | the 23 t chart only covers 51-70 m. This is the ZTC1000 (not the V) chart, the only one in the library, named so in the chart title |
| SAC2600 | main boom 100 t CWT, full outriggers, 15.65-52.58 m | Cranepedia - Sany SAC2600 - ... Metric - Chinese.pdf p.10-11 | the 67 t chart only covers 62.5-71.3 m |
| ZAT4000V | main boom 92 t CWT, 9.38 x 8.6 m, 15-90.1 m | Cranepedia - Zoomlion ZAT4000VS863-1 - ... Brochure.pdf p.10 | the 100 t chart only covers 77-90 m. The text is outlined (no text layer): read with a glyph decoder, see below |
| AC100 | HA 32 / 25 / 13.3 t CWT, 7.1 x 7.0 m, 12.5-50.2 m | Bigge AC 100 - Demag-AC100.pdf p.8, 9, 10 | the crane had no chart (25 t is the record's CWT) |
| AC500 | HA 160 / 120 / 60 t CWT, 14.7-56 m | Cranepedia - Demag AC500-2 - ... Load Chart - Metric - English.pdf p.8, 9, 11 | the crane only had the WIHI luffing chart |
| AC700 | HA 140 / 100 / 60 t CWT, 15.5-60 m | Cranepedia - Demag AC700 - ... Load Chart - Metric - English.pdf p.11-13 | more counterweights next to the existing 160 t chart |

Rules used for every table:
- Only printed numbers. Nothing interpolated or estimated; units stay tonnes.
- A cell the maker marks with a star (another boom length, or over-rear only) is left blank, and so are columns the maker marks as a different configuration (AC500 "1)" 180 t + central outriggers, AC700 "*" central jack leg + 160 t). The over-rear-only 3 m value of the AC100 is left out.
- AC100: where the 2011 edition (also in the library) prints a lower number for the same cell, the lower number is used (one cell, 13.3 t chart, 4 m radius).
- Each chart is checked by `node` (parseChart): no parse errors, capacity never rises with radius in a column, nothing above the crane's class, source and UNVERIFIED present.

How the numbers were read:
- `extract/asm.py` rebuilds a table from the PDF text layer (words with positions): header row = boom lengths, left column = radius, each cell goes to the nearest header column.
- `extract/demag.py`: Demag / Terex tables have a garbled text layer (a spurious leading 1 on one-digit radii, "-,0" for a dash, stars as separate words, shaded rows that split "165,0" into "165" "0"); it fixes those.
- `extract/glyph.py`: the ZAT4000V brochure has its text turned into outlines. Each digit is a vector shape; the shapes are mapped to characters with the printed radius column (known strings) and every cell is then decoded the same way. Result checked by eye against a rendering of the page.
- Run: `LL_LIB="/path/to/LoadLock Crane Library" LL_CHART_OUT=chart_out python3 pipeline/library/extract/gen_all.py` then `python3 pipeline/library/extract/inject_data_js.py chart_out/all_charts.json` (needs PyMuPDF. Run it from a folder that is not the library, as the PDFs are untrusted input; `python3 -I` is safest but also hides a PyMuPDF installed in the user site-packages, so use it only if PyMuPDF is installed system-wide).

## Not added (and why)

- LTM1650 (no chart in the app): the Liebherr tables colour each cell by the ballast set-up (155 t / 175 t at 6.4, 7.4, 8.4 m radius) that gives that number. Flattening them into one chart needs the maker's legend rules; reading them wrongly could overstate a capacity. The only other source (Cranepedia metric chart) is a scanned dimension brochure. Needs the LICCON export, as for the other Liebherr cranes.
- STC1000 spec-sheet chart (52 m, 6-axle "STC1000"), ZTC1000 "intermediate outriggers" tables (span not given), AC100 12 t / 2 t / 0 t, AC500-2 superlift (HASSL) and AC700 superlift tables, all jib tables: other configurations, not gaps.
- SAC2600T (scanned, image only) and the Chinese STC500S / STC750S / STC1000T copies: the English tables were already used.
- Liebherr LICCON charts (LTM1080, 1160, 1200, 1250, 1300, 1500): already full range. 94-100 % of their values are printed in the library PDFs (see `dims_check.md`).

## CAD (not converted: no DWG converter installed)

For a future run of `pipeline/cad` (libredwg `dwg2dxf` -> `extract2.py` -> `norm2.py` -> `gen_assets.py`):
- Exact-model DWGs in the library folders: Demag AC 500-2 (replaces the borrowed AC700 body: `CRANE_EXTRAS.ac500.drawProxy`), Liebherr LTM 1160 (DWGmodels), LTM 1650-8.1, Demag AC 700.
- Exact DWGs that need a free CADforum login (links in `src/library.js`, `login:true`): LTM 1200-5.1 (replaces the LTM1220 body now borrowed by the LTM1200), LTM 1250-6.1, LTM 1300-6.2, LTM 1500-8.1.
- Variants: LTM 1250-5.1, LTM 1300-6.1 (3D), LTM 1300-6.3.
- Still borrowed, nearest only: STC500, STC750, STC1000, AC100, SAC2600, LTM1080, ZAT4000V (no public DWG for SANY or Zoomlion: use the dimension drawings in their spec PDFs).

## v11: jib charts and the LTM1650

- `extract/gen_jibs.py` writes `LIB_JIBS` into `src/data.js` (fly-jib tables, all `verify:true`): STC500 and STC750 (jib on the fully extended boom, rows = main-boom angle, kg → t, over rear and side), ZTC1000V (ZTC1000 tables 10, 11 + 12 merged at the lower value, 13; outriggers fully extended; rows = main-boom angle), AC100 HAV (pp.14-17, 32 / 25 / 13.3 / 12 t, 38.0 / 42.2 / 46.4 / 50.2 m, 9.2 / 17 m; starred cells blank), AC700 HAV (p.17, 60 m boom, 100 / 60 t).
- `extract/gen_ltm1650.py` writes `LIB_1650`: Nordic Crane LTM 1650-8.1.pdf p.29 (T3) and p.31 (T3Y). Liebherr's max tables colour every cell by the VarioBallast set-up; each cell's colour is read from the rendered page (pixels round the number, majority vote against the five legend colours, the legend itself checked) and the cell goes only into the chart of that set-up. `LL_OVERLAY=1` writes a picture with the reading over each number.
- Both run like `gen_all.py`: `LL_LIB=… LL_CHART_OUT=… python3 pipeline/library/extract/gen_jibs.py` (PyMuPDF), from a folder that is not the library.
- Not taken: AC500-2 jib tables (colour-coded by counterweight, same treatment as the LTM1650 would be needed), AC700 HAVSSL (superlift), Zoomlion intermediate-outrigger jib tables, all luffing-jib tables of the non-Liebherr cranes.
- CAD: LibreDWG 0.13.3 (built from the GNU release) converts the library DWGs, but its DXF writer stops part-way for most of them and `dwg2SVG` misses blocks; `dwgread -O JSON` output is complete and is the route for a future body import.
