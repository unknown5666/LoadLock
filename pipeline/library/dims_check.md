# Crane records vs the maker's spec PDFs (for Habib to review)

Nothing in this list has been changed in `src/data.js` (only one missing field was filled, see the last section).
"Current" = the value in `DEFAULT_CRANES`. "PDF" = what the library file prints. Files are in `LoadLock Crane Library/<crane folder>/Load Charts/`.
A dash means the library has no readable value for that field (dimension drawings carry numbers without labels, or the PDF is a picture).
Weights are the maker's "overall weight" in travel trim, so they can differ from `mass` (which the engine uses as carrier + superstructure mass).

## Differences

| Crane | Field | Current | PDF | File, page |
|---|---|---|---|---|
| STC500 | carrierLen | 11.9 m | overall length 13.75 m | Cranepedia - Sany STC500 - STC500 - Load Chart - Metric - English.pdf p.5 |
| STC500 | mass | 38 t | overall weight 42 t | same, p.5 |
| STC500 | boomMax | 43 m | full-extended boom 42.5 m (42.5 + 16 m jib) | same, p.5-6 |
| STC500 | tail | 3.5 m | tail slewing radius 4.0 m | same, p.5 |
| STC500 | outLong / outTrans | 6.0 / 7.2 m | prints "7.2 x 6.0" under the heading "Longitudinal x Transversal" (the STC750 sheet uses the same heading with 6.1 x 7.6, so the STC500 order looks swapped) | same, p.5 |
| STC750 | mass | 42 t | overall weight 46 t | Cranepedia product guide.pdf p.6 |
| STC1000 | axles | 4 | 5 (STC1000C brochure, drive 10x6x6) or 6 (STC1000 spec sheet) | STC1000C ... English.pdf p.3; Cranepedia spec sheet.pdf p.6 |
| STC1000 | carrierLen | 14.99 m | 15.396 m (STC1000C) / 15.961 m (STC1000) | same |
| STC1000 | width | 2.75 m | 3.0 m (both) | same |
| STC1000 | mass | 50 t | 54.95 t (STC1000C) / 55 t (STC1000) | same |
| STC1000 | outLong / outTrans | 6.63 / 8.3 m | 7.6 x 7.6 m (STC1000C), 7.56 x 7.6 m (STC1000) | same |
| STC1000 | cwt | 21.5 t | 32.5 t (STC1000C chart); STC1000 sheet: 8.5 / 14.5 / 19.5 t blocks | same, p.5-6 / p.4 |
| STC1000 | boomMin-boomMax | 13-60 m | 13.25-60 m (STC1000C); 13.5-52 m (STC1000) | same |
| AC100 | axles | 4 | 5 (5 x 12 t axle loads; "shortest 5-axle crane") | Bigge AC 100 - Demag-AC100.pdf p.2, p.6 |
| AC100 | carrierLen | 13.1 m | "carrier length of just 11 m" (highlights text; exact figure is on the drawing page) | same, p.2 |
| AC100 | boomMin-boomMax | 11.1-50 m | telescoping 12.5-50.2 m | same, p.6, p.9 |
| AC100 | mass | 48 t | 48 t with 2 t ballast (matches), 60 t with 13.3 t ballast | same, p.6 |
| SAC2600 | carrierLen | 16.69 m | overall length 18.2 m | Cranepedia - Sany SAC2600 - SAC2600 - Metric - Chinese.pdf p.9 |
| SAC2600 | outLong / outTrans | 9.49 / 8.3 m | 8.95 long x 8.6 across (8.6 / 5.6 = full / half) | same, p.9 |
| SAC2600 | boomMin-boomMax, sections | 13.4-80 m, 7 | 15.65-73 m, 6 sections (115 m with jib) | same, p.9 |
| SAC2600 | cwt | 67 t | chart in the brochure is for 100 t | same, p.10-11 |
| SAC2600 | note | | the record's 8.3 x 9.49 m legs match the SAC2600C8-8 (8.3 x 9.47 m, 88 m boom, 16.585 m long), which may be the machine the sheet came from | Cranepedia - Sany SAC2600C8-8 ... .pdf p.5-6 |
| LTM1160 | cwt | 46.5 t | LTM 1160-5.2 carries up to 54 t of ballast (the 46.5 t chart is the biggest in the app) | Cranepedia - Liebherr LTM 1160-5.2 ... Technical Data - Metric - EN.pdf p.4, p.10 |
| LTM1500 | cwt | 135 t | 135 t base + 30 t = 165 t (the app already has the 165 t charts) | Cranepedia - Liebherr LTM 1500-8.1 ... Brochure - English.pdf p.7 |
| AC500 | boomMin | 15.7 m | 14.7-56.0 m | Cranepedia - Demag AC500-2 ... Load Chart - Metric - English.pdf p.6 |
| LTM1650 | boomMin | 16.6 m | T3 16.7-54 m, T5 17.4-80 m | Liebherr asset (LTM 1650-8.1).pdf p.5, p.81 |
| AC700 | boomMin | 15.7 m | 15.4-60.0 m (charts start at 15.5 m) | Cranepedia - Demag AC700 ... Load Chart - Metric - English.pdf p.6 |
| ZAT4000V | cwt | 100 t | the brochure chart is for 92 t (the app keeps the 100 t sheet chart and now also has the 92 t one) | Cranepedia - Zoomlion ZAT4000VS863-1 ... Brochure ... Chinese.pdf p.10 |

## Checked and equal (no action)

- STC500: width 2.75 m, axles 4, cwt 3.5 t, boomMin 11.5 m. STC750: carrierLen 14.1 m, width 2.75 m, axles 4, outLong 6.1 m, outTrans 7.6 m, cwt 4.5 t, boom 11.8-45 m.
- AC100: outrigger 7.10 x 7.00 m, 25 t chart. SAC2600: width 3.0 m, axles 6, mass 72 t. ZAT4000V: outrigger 9.38 x 8.6 m, boom 15-90.1 m.
- LTM1080: axles 4, mass 48 t, ballast 8.5 + 7.5 = 16 t, boom 10.8-48 m. LTM1160: axles 5, mass 60 t, boom 13.1-62 m.
- LTM1200: axles 5, ballast 72 t, boom 13.2-72 m. LTM1250: legs 8.8 x 8.5 m, axles 6, ballast 72.5 t, boom 15.5-72 m. LTM1300: axles 6, boom 14.7-78 m.
- AC500: axles 8, mass 96 t. LTM1500: axles 8, mass 96 t. LTM1650: ballast 175 t. AC700: axles 9, mass 108 t, boomMax 60 m.

## Not checkable from the library

- ZTC1000V: the library holds only the ZTC1000 load chart (no spec sheet; the ZTC1000V532 / 753 downloads failed).
- Liebherr, Demag and Zoomlion carrier length, hook-block, pivot and tail numbers sit on dimension drawings (numbers without labels in the PDF text), so they were not compared.
- Leg widths at half out, and the leg-load weights (`omCarrier`, `omBoom` ...), were not found in the text of the Liebherr / Demag PDFs of the library (Liebherr mentions "securing positions 0 / 50 / 75 / 100 %" without giving the spans).

## Chart cross-checks done while adding the library charts

- STC500 (183 values) and STC750 (154 values): every value of the app's chart is printed on the maker's load-chart page (values in kg there).
- AC700 160 t chart (164 values): every value is on pages 11-14 of the Cranepedia AC700 chart. Its first three columns are the "central jack leg + 160 t" columns of the 140 t table.
- Liebherr charts from LICCON (main boom, all ballast sizes) against the library PDFs: LTM1080 100 %, LTM1160 97 %, LTM1200 94-100 %, LTM1250 95-100 %, LTM1300 100 %, LTM1500 94-99 % of values found. Misses are edition differences, not gaps.
- AC100: the Bigge (2008) 32 t and 13.3 t tables equal the Cranepedia 2011 tables cell for cell except one cell (4 m, 12.5 m boom, 13.3 t: 73.7 vs 73.6); the lower value is used.

## Field filled

- `sac2600.outTransHalf = 5.6` m, from the SANY brochure "lateral outrigger span 8.6 / 5.6 m" (src/data.js, `CRANE_EXTRAS`). Before this the half-out span was estimated.
