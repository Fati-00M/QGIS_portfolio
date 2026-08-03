# GLOF risk product — the 2-day plan

You have two days and you want the analysis to be genuinely yours. This is
scoped for that. The earlier version of this document assumed 3–5 days; the
hydrology step in it (HAND rasters via GRASS `r.watershed` / `r.stream.distance`)
is where that time goes, and it is the step most likely to strand you halfway.

**It has been cut.** What replaces it is simpler, defensible, and — critically —
finishable. Read §6 before you start: it is the paragraph that makes the simpler
method honest rather than sloppy.

---

## What you are building

> A settlement-level GLOF risk ranking for the Hunza valley, combining glacial
> lake hazard, downstream population exposure, and access-based vulnerability
> into one score — delivered as a print sheet and an interactive web map.

Two artefacts, one dataset, one valley.

**Why Hunza / Shishper:** the glacier surged repeatedly from 2019, and the May
2022 GLOF destroyed the Hassanabad bridge on the Karakoram Highway. That gives
you a validation check almost no portfolio has — you can show the 2022 damage
falling inside your modelled corridor. It is also the CPEC route, so nobody on
the panel needs the significance explained.

---

## The key simplification

Instead of modelling flood depth, you model a **potential impact corridor**:
the drainage path downstream of each hazardous lake, buffered.

This is a *screening* method. It tells you who is in the path and in what order
of priority. It does not tell you how deep the water gets. That is a completely
normal thing for a screening product to do — provided you say so, which §6 covers.

The analysis unit is the **settlement**, not the district. This matters for your
deadline: settlement points come straight from OSM, so you skip census joins and
admin-boundary matching entirely. That decision alone saves you most of a day.

---

## Day 1 — analysis

### Morning: collect (2–3 hrs)

| Layer | Where | Notes |
| ----- | ----- | ----- |
| Glacial lakes | **ICIMOD RDS** (rds.icimod.org) — HKH inventory | If it fights you, digitise them yourself — see below |
| Rivers / streams | **QuickOSM** → `waterway = river, stream` | Faster than deriving from a DEM |
| Settlements | **QuickOSM** → `place = city, town, village, hamlet` | These are your analysis units |
| Hospitals | **QuickOSM** → `amenity = hospital, clinic` | For the vulnerability score |
| Roads | **QuickOSM** → `highway = primary, secondary, trunk` | KKH is the one that matters |
| Population | **GHS-POP** | You already know this dataset |
| Glaciers | **RGI v7** | You already have it clipped |

**Bound the whole job to the Hunza basin before you do anything else.** Clip
every layer to it. Everything downstream is faster on a small extent.

> **If the lake inventory is slow to get, digitise the lakes yourself.** Load Esri
> World Imagery, find the proglacial lakes below Shishper and its neighbours, and
> draw ~10 polygons. Thirty to forty minutes. You have already proven you can
> digitise cleanly — the Wah Cantt sheet is entirely hand-digitised — and this
> route makes the hazard layer unambiguously your own work. It is the option I
> would pick.

### Afternoon: the overlay (3–4 hrs)

This is the actual analysis. Six QGIS operations:

1. **Select the source lakes.** Filter to lakes above a size threshold — `> 0.02 km²`
   is a common cut. Add an `area_km2` field with `$area / 1000000`.

2. **Trace the corridor.** Select the `waterway` lines running downstream from
   your lakes to the Hunza River confluence. Selecting them by hand is fine and
   takes ten minutes. Merge into one line layer.

3. **Buffer it.** `Vector → Geoprocessing → Buffer`, **500 m**, dissolved.
   That polygon is your **potential impact corridor**. Write the 500 m on the map.

4. **Exposure — population.** `Raster → Zonal Statistics` with GHS-POP over the
   corridor gives total population exposed. For per-settlement figures, buffer
   each settlement point by 1 km and run zonal statistics on those.

5. **Vulnerability — two indicators, both native QGIS, no external data:**
   - `Processing → Join attributes by nearest` — settlements → hospitals. Gives
     each settlement a distance to the nearest hospital.
   - `Join attributes by nearest` again — settlements → roads. Distance to the
     road network, i.e. how reachable relief is.

   Two indicators is enough. Do not go hunting for census tables today.

6. **Score it.** Add fields via the field calculator, normalising each to 0–1:

   ```
   haz  = 1 - ("dist_to_lake"  / maximum("dist_to_lake"))
   exp  =      "pop_1km"       / maximum("pop_1km")
   vul  = (   "dist_hospital"  / maximum("dist_hospital")
            + "dist_road"      / maximum("dist_road") ) / 2

   risk_score = "haz" * "exp" * "vul"
   ```

   Then `risk_class` = 1–5 via graduated symbology, natural breaks.

   Sort descending on `risk_score` → **that is your top-10 table.**

### Evening: export for the web (1 hr)

Reproject to **EPSG:4326**, simplify at `0.0001`, drop unused columns, export
GeoJSON at coordinate precision 6, into `assets/data/`:

| File | Geometry | Attributes |
| ---- | -------- | ---------- |
| `glacial-lakes.geojson` | polygon | `name`, `area_km2`, `hazard_class` |
| `impact-zone.geojson` | polygon | `lake`, `method` |
| `settlements.geojson` | point | `name`, `population`, `type` |
| `critical-facilities.geojson` | point | `name`, `amenity` |
| `risk-units.geojson` | point or polygon | `name`, `pop_exposed`, `risk_score`, `risk_class` |

Names differ? Do not rename anything in QGIS — the viewer's `CONFIG` declares
field names, see §7.

---

## Day 2 — delivery

### Morning: the print sheet (3 hrs)

Same treatment as your glacier inventory sheet, so the two read as a family:
neatline, graticule, declared CRS, north arrow, scale bar, date, legend.

Two boxes your other sheets do not have, and which are the whole point:

- **Method box** — "Potential impact corridor: 500 m buffer on mapped drainage
  downstream of glacial lakes > 0.02 km². Risk = Hazard × Exposure ×
  Vulnerability, each normalised 0–1, equal weights."
- **Data sources box** — every layer, its source and its vintage.

Plus the **top-10 ranked settlement table**, styled like your top-10 glaciers
table. Panels remember tables.

### Afternoon: wire up the web map (2 hrs)

1. Drop your GeoJSON into `assets/data/`. The orange "sample data" banner clears
   itself — it is triggered by a `"sample": true` key your exports will not have.
2. Open `http://localhost:8000/maps/glof-risk.html` and check every layer draws.
3. Screenshot it for the portfolio card thumbnail → `assets/img/glof-risk.jpg`.
4. Paste the card from §7 into `index.html`.

---

## §6 — The paragraph that makes this honest

Put this on the print sheet **and** in the portfolio card. Verbatim, or close:

> Potential impact corridor derived from a fixed-width buffer on mapped drainage
> downstream of inventoried glacial lakes. This is a screening and prioritisation
> product, not a hydrodynamic flood model, and is not suitable for engineering
> design or evacuation planning without further modelling.

Stating a method's limits is what separates an analyst from someone who made a
map. A technical reviewer who sees that sentence trusts everything above it more,
not less — and the panel for a disaster-management post is exactly the audience
that knows the difference.

---

## §7 — Adapting the viewer

`maps/glof-risk.html` is built and working. Everything configurable sits at the
top of `assets/js/glof-map.js`:

```js
{
  id: 'risk',
  file: '../assets/data/risk-units.geojson',
  label: 'Risk classification',
  kind: 'choropleth',          // or 'polygon' / 'point'
  field: 'risk_class',         // ← your 1..5 column
  scoreField: 'risk_score',    // ← or a 0..1 score
  popup: [
    ['name', 'Unit'],          // ← [ your column, popup label ]
    ['pop_exposed', 'Population exposed']
  ]
}
```

Missing layers degrade to a greyed-out "not found" row rather than breaking the
page, so you can add files one at a time as you finish them.

### The portfolio card

```html
<article class="card card--wide reveal" data-tags="hazard exposure carto">
  <a class="card__media" href="maps/glof-risk.html">
    <img src="assets/img/glof-risk.jpg" alt="Interactive GLOF risk map of the Hunza valley"
         loading="lazy" width="1000" height="707">
    <span class="card__zoom" aria-hidden="true">Open live map</span>
  </a>
  <div class="card__body">
    <div class="card__tags">
      <span class="tag tag--haz">Hazard</span>
      <span class="tag tag--exp">Vulnerability</span>
      <span class="tag">Web-GIS</span>
    </div>
    <h3>GLOF Risk Explorer — Hunza Valley</h3>
    <p>Glacial lake hazard, downstream population exposure and access-based
       vulnerability combined into a settlement-level risk ranking, delivered as
       a print sheet and an interactive Leaflet map over QGIS-derived GeoJSON.
       Screening product, not a hydrodynamic flood model.</p>
    <dl class="meta">
      <div><dt>Stack</dt><dd>QGIS &rarr; GeoJSON &rarr; Leaflet</dd></div>
      <div><dt>Framing</dt><dd>Hazard &times; Exposure &times; Vulnerability</dd></div>
      <div><dt>CRS</dt><dd class="mono">EPSG:4326 · WGS 84</dd></div>
    </dl>
  </div>
</article>
```

---

## If you fall behind

Cut in this order — each cut still leaves a complete product:

1. **Drop the validation check.** Nice to have, not load-bearing.
2. **Drop `dist_road`.** One vulnerability indicator instead of two.
3. **Drop the print sheet, keep the web map.** The interactive map is the rarer
   skill and the one the job description names.

Do **not** cut: the corridor, the population exposure, or the limitations
paragraph. Those three are what make it a risk product rather than another
overlay.

---

## What to send me when you are done

The five GeoJSON files, and the names of any columns that differ from the table
above. I will wire the card in, adjust the config and check it renders on
mobile — the plumbing, not the analysis.
