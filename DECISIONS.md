# Decisions, v11.1

Calls made while building, including the owner's answers.

## From the owner
- **Service name:** none. Reports carry the crane operator's brand (City Star Cranes). Prepared-by reads "name, for operator".
- **Fleet:** keep every crane. No "unverified" wording anywhere.
- **Scanned charts:** read by eye and added.
- **Typed-over values:** the typed value prints unmarked and wins in the report, including its % and verdict. The app itself still shows a warning.
- **Over 100 %:** red warning only. Exports stay open.
- **Report pages:** permit, briefing and emergency come after risk when on. Data panel and fitted A1 are on by default.
- **Exclusion zone:** radius + half the load + 2 m. Barrier: tail swing + 1 m. Both can be typed in `plan.site.exR` and `plan.site.barrierR`, which have no screen field yet.
- **Sign-in:** left as it is.

## Made during the build
- **100 t SANY:** the brochure STC1000 (13.5–52 m) is a new fleet entry, `stc1000m`. The old record holds STC1000C charts and is now labelled STC1000C, so saved plans keep working. **Check City Star's plate:** STC1000, 1000C and 1000S have different charts.
- **150 t SANY:** taken as the STC1500S, the only 150 t SANY truck crane found. **Check City Star's plate.** Source: SANY's brochure at sanyglobal.com.
- **Telescoping status:** the STC1500S prints a telescoping table per column. Stored charts keep each column as boom length; where lengths repeat, the lower capacity is read.
- **ZAT4000V, one blank cell:** R 36 m at 90.1 m in `s92mj` prints 16 t, above its neighbours. Left blank.
- **ZAT4000V p.19:** a sixth column group has a repeated header (82.2 / 20.5), so it was not entered.
- **Reduced bases:** LTM1500 10×6.3, AC500 8×7.3 and AC700 9×8.8 are stored as "half" outriggers because that is the nearest of the four choices. They come from Mammoet reference sheets, not maker charts.
- **Dimensions:** corrected from maker PDFs where clear: STC500 length and tail; STC1000C length, width, outriggers, axles and counterweight; AC100 axles. Maker's maximum leg force added for LTM1160 and LTM1650. Saved plans on these cranes may redraw and their leg loads may change. SAC2600 left alone because its record may match another variant.
- **Leg weights:** no PDF prints carrier, superstructure or boom weights, so every crane still uses estimated weights and prints that note, as chosen. The engine's maths passes its worked-example test.
- **Crane outlines:** no AutoCAD file found for the SANY cranes. Exact DWGs exist for AC500-2, LTM1160, LTM1650 and AC700, but no converter on this machine reads them. Per the owner, no note is printed.
- **Report design:** the ui-ux-pro-max skill was loaded, but its search database is not installed, so the design follows the skill's priority rules rather than a database match.
- **Printed sources:** chart source lines show make and model only. Original file names are kept in `sourceRaw`, inside the app code.
- **Reference documents:** removed from the report because they name websites. Still listed in Fleet.
- **Margin micro text and page marks:** removed from PDFs. The print-only lock stays.
- **Storage:** profiles, clients and plans stay in each browser, so a phone and a laptop do not share them.
- **Limits:** colours fixed at 75 and 90 %. The interpolation choice and limit fields are gone from Settings.

## Open risks
- The GitHub repo is public, including charts, code and sign-in hashes. The owner set sign-in aside; making the repo private takes one setting.
- Typed values that clear an over-limit lift print with no mark. The plan's history is only what the app warns about on screen.
