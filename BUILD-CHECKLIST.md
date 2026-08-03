# Build checklist — GLOF risk product + web map

Work top to bottom. Tick as you go. Times are budgets, not targets — if a block
overruns badly, jump to **§ If you're running out of time** at the bottom.

Total: **~11 hours**, which fits two days with slack.

For *why* any of this is shaped the way it is, see [GLOF-WORKFLOW.md](GLOF-WORKFLOW.md).
This file is just the doing.

---

## ⚠ Read this before you open QGIS

**Set the project CRS to `EPSG:32643` (WGS 84 / UTM zone 43N).**

`Project → Properties → CRS → EPSG:32643`

This is not optional. Buffers and areas must be calculated in **metres**. If you
work in EPSG:4326 your 500 m buffer becomes 500 *degrees* and `$area` returns
square degrees — both silently wrong, and you won't notice until the map looks
absurd. UTM 43N covers 72–78°E, which contains Hunza.

You only convert to EPSG:4326 at the very end, for the web export.

---

## Block A — Setup · 30 min

- [ ] Create a new QGIS project, save as `hunza-glof.qgz`
- [ ] Set project CRS to **EPSG:32643** (see above)
- [ ] `Plugins → Manage and Install Plugins` → install **QuickOSM**
- [ ] Add basemap: `XYZ Tiles → OpenStreetMap` (right-click → New Connection for
      Esri imagery: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`)
- [ ] Zoom to Hunza — search `Karimabad` or pan to roughly **36.32 N, 74.65 E**
- [ ] Draw a rough **study-area polygon** covering the Hunza basin
      (`Layer → Create Layer → New Shapefile Layer`, polygon). Everything gets
      clipped to this. Keeps every later step fast.

---

## Block B — Collect data · 2 hrs

### B1 · Glacial lakes ← **this is your own work**

- [ ] `Layer → Create Layer → New Shapefile Layer`, geometry **Polygon**, CRS 32643
- [ ] Add fields: `name` (text), `hazard_class` (text)
- [ ] Switch to Esri World Imagery, zoom to the Shishper / Batura / Passu glacier
      snouts
- [ ] Toggle editing, digitise **~10 proglacial lakes** — the meltwater ponds sitting
      at or just below the glacier termini
- [ ] Name them as you go; set `hazard_class` to `Potentially dangerous` for the
      larger moraine-dammed ones, `Moderate` for the rest
- [ ] Save edits, toggle editing off

> 30–40 minutes. You already hand-digitised the entire Wah Cantt sheet, so this is
> familiar work — and it makes the hazard layer unambiguously yours rather than a
> download. If you'd rather use the published inventory, ICIMOD's HKH glacial lake
> data is at **rds.icimod.org**, but don't let a download portal eat your morning.

### B2 · OSM layers via QuickOSM

`Vector → QuickOSM → QuickOSM`. Set extent to **Layer extent → your study area**.
Run each of these:

- [ ] `waterway` = `river` — and again for `stream`
- [ ] `place` = `city` · `town` · `village` · `hamlet`  → these are your **analysis units**
- [ ] `amenity` = `hospital` · `clinic`
- [ ] `highway` = `primary` · `secondary` · `trunk`

- [ ] Save each result as a real file (right-click → `Export → Save Features As…`
      → GeoPackage). QuickOSM output is temporary and will vanish.

> **If OSM waterways are sparse up there** — quite possible in high Karakoram —
> digitise the river centreline yourself from imagery instead. One polyline from
> the lakes down to the Hunza River. 20 minutes.

### B3 · Population

- [ ] Download **GHS-POP** for the tile covering northern Pakistan
- [ ] `Raster → Extraction → Clip Raster by Mask Layer` → clip to your study area
- [ ] Check the CRS matches your project; reproject if not

---

## Block C — Hazard corridor · 1 hr

- [ ] Add `area_km2` to the lakes layer — field calculator (`Ctrl+I`), Decimal:
      ```
      $area / 1000000
      ```
- [ ] Filter out the tiny ones: right-click layer → `Filter…`
      ```
      "area_km2" > 0.02
      ```
- [ ] Select the waterway lines running **downstream from your lakes to the Hunza
      River confluence**. Selecting by hand is fine — ten minutes, and you get to
      exercise judgement about which channels actually route a flood.
- [ ] `Processing → Vector general → Merge vector layers` on the selection
- [ ] `Vector → Geoprocessing Tools → Buffer`
      - Distance: **500** (metres — this is why the CRS matters)
      - ✔ **Dissolve result**
- [ ] Rename the output layer `impact-zone`
- [ ] Add a `method` field, set it to `500 m buffer on mapped drainage`
- [ ] **Sanity check:** does the corridor follow the valley floor and reach the
      settlements? If it's a blob or runs uphill, you selected the wrong lines.

---

## Block D — Exposure · 1 hr

- [ ] `Processing → Vector selection → Extract by location`
      — settlements **that intersect** `impact-zone` → save as `settlements-at-risk`
- [ ] `Vector → Geoprocessing Tools → Buffer` on `settlements-at-risk`, **1000 m**,
      **do not dissolve** → gives one catchment polygon per settlement
- [ ] `Processing → Raster analysis → Zonal statistics`
      - Raster: GHS-POP · Vector: the 1 km buffers · Statistics: **Sum**
      - Output column prefix: `pop_`
      → produces `pop_sum` = population per settlement
- [ ] `Processing → Vector general → Join attributes by nearest`
      — the 1 km buffers back onto `settlements-at-risk`, so the points carry `pop_sum`
- [ ] Also run Zonal statistics over the **whole corridor** for your headline
      number: *"N people inside the potential impact corridor"*

---

## Block E — Vulnerability · 45 min

Two indicators. Both native QGIS. **No external data hunting today.**

- [ ] `Processing → Vector general → Join attributes by nearest`
      - Input: `settlements-at-risk` · Join: hospitals · Max nearest neighbours: 1
- [ ] ⚠ **Immediately rename the new `distance` field to `dist_hosp`** (Layer
      Properties → Fields, toggle edit). If you skip this the second join collides
      with it and you'll spend twenty minutes working out why your scores are wrong.
- [ ] Run `Join attributes by nearest` again — this time against **roads**
- [ ] Rename that `distance` field to `dist_road`
- [ ] One more: `Join attributes by nearest` against your **lakes** → rename to
      `dist_lake`

You now have, per settlement: `pop_sum`, `dist_hosp`, `dist_road`, `dist_lake`.

---

## Block F — Risk score · 45 min

Field calculator, Decimal (double), one field at a time. Order matters.

- [ ] `haz` — closer to a source lake = higher hazard
      ```
      1 - ("dist_lake" / maximum("dist_lake"))
      ```
- [ ] `exp` — more people = higher exposure
      ```
      "pop_sum" / maximum("pop_sum")
      ```
- [ ] `vul` — further from a hospital or a road = more vulnerable
      ```
      (("dist_hosp" / maximum("dist_hosp")) + ("dist_road" / maximum("dist_road"))) / 2
      ```
- [ ] `risk_score`
      ```
      "haz" * "exp" * "vul"
      ```
- [ ] `risk_class` — 1 to 5, Integer
      ```
      CASE
        WHEN "risk_score" >= 0.30 THEN 5
        WHEN "risk_score" >= 0.15 THEN 4
        WHEN "risk_score" >= 0.07 THEN 3
        WHEN "risk_score" >= 0.02 THEN 2
        ELSE 1
      END
      ```
      > Check the spread in the attribute table first and adjust the breaks so the
      > classes aren't all 1. Or use graduated symbology with natural breaks and
      > read the boundaries off it.
- [ ] Rename `pop_sum` → `pop_exposed` (the viewer looks for this, and it reads
      better in a popup)
- [ ] Sort the attribute table descending on `risk_score` → **that's your top-10 table**

---

## Block G — Export for the web · 45 min

For **each** of the five layers below:

1. `Processing → Vector general → Reproject layer` → **EPSG:4326**
2. `Vector → Geometry Tools → Simplify` → tolerance `0.0001` *(polygons only)*
3. Right-click → `Export → Save Features As…`
   - Format **GeoJSON** · CRS **EPSG:4326** · Layer Options → `COORDINATE_PRECISION` = **6**
   - Deselect every field you don't need

Save into `assets/data/` with **exactly** these names:

- [ ] `glacial-lakes.geojson` — polygon — `name`, `area_km2`, `hazard_class`
- [ ] `impact-zone.geojson` — polygon — `lake`, `method`
- [ ] `settlements.geojson` — point — `name`, `population`, `type`
- [ ] `critical-facilities.geojson` — point — `name`, `amenity`
- [ ] `risk-units.geojson` — point — `name`, `pop_exposed`, `risk_score`, `risk_class`

- [ ] Check the total is under **5 MB**

> Column names different? **Don't rename anything in QGIS.** The viewer declares
> its field names in `CONFIG` — see Block H.

---

## Block H — Web map · 1 hr  ← *do this before the print sheet*

The interactive map is the rarer skill and the one the job description names.
Get it finished before you spend three hours on cartography.

- [ ] Copy your five GeoJSON files into `assets/data/`, overwriting the samples
- [ ] Run `python3 -m http.server 8000` in the repo root
- [ ] Open `http://localhost:8000/maps/glof-risk.html`
- [ ] Confirm the orange **"sample data"** banner is gone — it clears itself once
      the placeholder files are replaced. If it's still there, you missed a file.
- [ ] Check each layer draws and toggles; click features to test the popups
- [ ] If a layer says **"not found"** or a popup is blank, open
      `assets/js/glof-map.js` and edit the `CONFIG.layers` array at the top —
      `field`, `scoreField` and each `popup` pair map to *your* column names:
      ```js
      popup: [
        ['name', 'Settlement'],        // ['your_column', 'Label shown']
        ['pop_exposed', 'Population']
      ]
      ```
- [ ] Screenshot the map → save as `assets/img/glof-risk.jpg`
- [ ] Paste the portfolio card from **§7 of GLOF-WORKFLOW.md** into `index.html`,
      inside `<div class="work-grid">`
- [ ] Reload the portfolio page and check the card looks right

---

## Block I — Print sheet · 3 hrs

`Project → New Print Layout`. Match your glacier inventory sheet so the two read
as a family.

- [ ] Map frame + **neatline**
- [ ] **Graticule** (Layout → Item Properties → Grids)
- [ ] North arrow, scale bar, date
- [ ] **Declared CRS** in the corner, as on your other sheets
- [ ] Legend — risk classes, lakes, corridor, settlements
- [ ] **Top-10 ranked settlement table** — same styling as your top-10 glaciers table
- [ ] **Method box:**
      > Potential impact corridor: 500 m buffer on mapped drainage downstream of
      > glacial lakes > 0.02 km². Risk = Hazard × Exposure × Vulnerability, each
      > normalised 0–1, equal weights.
- [ ] **Data sources box** — every layer, source and vintage
- [ ] **Limitations line** *(do not skip this one)*:
      > Screening and prioritisation product, not a hydrodynamic flood model.
- [ ] Export PNG at 300 dpi → run it through the resize snippet in `README.md` →
      add as a second portfolio card

---

## Optional · 30 min — the thing that lifts it above everyone else's

- [ ] Drop a point at the **Hassanabad bridge** (~36.32 N, 74.60 E), destroyed by
      the May 2022 Shishper GLOF
- [ ] Show it falling **inside** your modelled corridor
- [ ] Add one line to the map and the portfolio card:
      > *Validation: the modelled corridor contains the site of the May 2022
      > Hassanabad bridge destruction.*

"My model reproduces observed damage" is a far stronger claim than "here is a
map", and it costs half an hour.

---

## § If you're running out of time

Cut in this order. Each cut still leaves a complete, defensible product:

1. ~~The validation check~~ — nice to have, not load-bearing
2. ~~`dist_road`~~ — one vulnerability indicator instead of two; drop the second
   term from `vul`
3. ~~The print sheet (Block I)~~ — keep the web map

**Never cut:** the corridor, the population exposure, or the limitations line.
Those three are what make it a *risk* product instead of another overlay.

---

## When you're done

Send me the five GeoJSON files and any column names that differ from the list in
Block G. I'll wire the card in properly and check it renders on mobile.
