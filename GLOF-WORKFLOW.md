# Building the GLOF risk product

A step-by-step plan for the one thing this portfolio is missing: a product that
overlays **hazard × exposure × vulnerability** instead of showing them separately.

---

## 0. Pick one valley, not the whole country

Do **Hunza — Shishper / Hassanabad** first.

Why this one:

- Shishper glacier surged and produced repeated GLOFs from 2019 onward.
- The **May 2022 event destroyed the Hassanabad bridge on the Karakoram Highway**
  and damaged two small power houses. It is well documented in news and literature.
- That gives you something almost no portfolio piece has: a **hindcast you can
  validate**. You model the potential impact zone, then show the 2022 damage
  falling inside it. "Model reproduces observed damage" is a far stronger claim
  than "here is a map".
- It is also a national-interest corridor — the KKH is the CPEC route — so the
  significance needs no explaining to a Pakistani panel.

One valley done rigorously beats a national map done thinly. You can extend later.

---

## 1. Data to collect

| Layer | Source | Notes |
| ----- | ------ | ----- |
| Glacial lakes | **ICIMOD Regional Database System** (rds.icimod.org) — HKH glacial lake inventory | Has potentially dangerous glacial lake (PDGL) attributes |
| Glaciers | **RGI** (GLIMS / NSIDC) | You already have this layer |
| DEM | **Copernicus GLO-30** (30 m) via OpenTopography, or NASADEM / SRTM | Copernicus GLO-30 is the best free option |
| Population | **GHS-POP** (100 m) or **WorldPop** Pakistan constrained 100 m | You already work with GHSL |
| Buildings | **Microsoft Global ML Building Footprints**, or OSM buildings | Pakistan is covered |
| Critical facilities | **OSM** via the QuickOSM plugin | hospitals, schools, bridges, power |
| Roads | OSM | KKH is the one that matters here |
| Rivers | **HydroSHEDS / HydroRIVERS** | for the drainage network |
| Admin boundaries | **OCHA COD** on HDX (Pakistan admin 0–3) | authoritative, and what humanitarian agencies use |
| District vulnerability indicators | **PBS Census 2023** district tables; **Pakistan MPI** (UNDP/PBS) | for the vulnerability index |

Record source, vintage and licence for every layer as you download it — you will
need a data-sources box on the final sheet, and it is exactly the "data quality
and documentation" the job description asks for.

---

## 2. Hazard — where could the flood go?

You are **not** building a hydrodynamic model. Say so plainly on the map; calling
the output a *potential impact zone* rather than a *flood model* is a credibility
signal, not a weakness.

1. **Select the source lakes.** From the ICIMOD inventory, take moraine-dammed
   lakes above a size threshold (a common cut is > 0.02 km²) in the Hunza basin.
   Keep the PDGL flag as an attribute.

2. **Condition the DEM.** `Fill sinks` (SAGA or GRASS `r.fill.dir`).

3. **Derive the drainage network.** GRASS `r.watershed` on the filled DEM →
   gives flow accumulation and drainage direction.

4. **Trace the downstream path.** GRASS `r.drain`, starting at each lake outlet,
   following the drainage direction raster. That is your flood routing line.

5. **Build the impact envelope.** Two options, easiest first:

   - **HAND threshold (recommended).** Compute *Height Above Nearest Drainage*
     (GRASS `r.stream.distance` with `-d`, using the stream network from step 3).
     Reclassify to keep valley floor below roughly **10–25 m** above the channel.
     Intersect with a downstream distance limit from each lake. That envelope is
     your potential impact zone.
   - **Angle-of-reach rule.** Debris flows generally stop where the straight-line
     slope from the source drops below about **5–11°**. Build it from the DEM and
     the lake elevation. More defensible in the literature, more work in QGIS.

   Whichever you use, **state the parameter values on the map.** A reviewer who
   can see your threshold trusts the map more than one who cannot.

6. **Validate.** Overlay the 2022 Hassanabad damage locations (bridge, power
   houses — georeference them from news imagery or OSM). Show them inside your
   envelope. This single step is what turns the piece from a graphic into
   analysis.

---

## 3. Exposure — what is inside the zone?

Clip everything to the impact zone and count:

- **Population** — `Zonal statistics` (sum) on GHS-POP / WorldPop.
- **Buildings** — `Count points in polygon` on building centroids.
- **Critical facilities** — hospitals, schools, bridges, power infrastructure.
- **Roads** — `Sum line lengths` for km of KKH and link roads affected.

These numbers are your headline. *"N people, M buildings and X km of the KKH sit
inside the potential impact zone of K hazardous lakes."*

---

## 4. Vulnerability — the part almost everyone skips

Exposure is *who is there*. Vulnerability is *who gets hurt worst*. Most portfolio
maps stop at exposure — doing this step is the whole reason this product is worth
building.

Pick 4–6 indicators you can actually source per union council or district:

- Travel time or distance to the nearest hospital
- Single-access settlements (one road in, cut by the flood path = stranded)
- Multidimensional poverty rate (Pakistan MPI, district level)
- Dependency ratio — under-15 and over-64 share (Census 2023)
- Building material / construction type, if you can get it
- Literacy rate, as an early-warning-reach proxy

Then:

1. Normalise each indicator to **0–1** (field calculator; invert the ones where
   high = good).
2. Weight them — equal weights are fine and honest. **Write the weights on the map.**
3. Sum to a **Vulnerability Index** per unit.

---

## 5. Risk — combine

```
Risk = normalised(Hazard) × normalised(Exposure) × normalised(Vulnerability)
```

Classify into 5 classes (natural breaks / Jenks). This is the standard
UNDRR / IPCC framing — use those words in the legend and title, because they are
the exact words in the job description.

---

## 6. What to deliver

Three artefacts, all in the visual style you already established:

1. **One A3 print sheet.** Neatline, graticule, declared CRS, north arrow, scale
   bar, date, legend, **method box** (your thresholds and weights) and **data
   sources box**. Match the styling of your glacier inventory sheet so the two
   read as a family.
2. **A ranked table** of the top 10 most at-risk settlements — same treatment as
   the top-10 glaciers table on your inventory map. Panels remember tables.
3. **The interactive Leaflet version** — see below. Same data, clickable.

Then add a short paragraph to the portfolio card stating the limitation openly:
*"Potential impact zone derived from HAND thresholding, not hydrodynamic
modelling; intended for screening and prioritisation, not engineering design."*
That sentence will impress a technical reviewer more than any styling choice.

---

## 7. Exporting for the web map

For each layer you want interactive, in QGIS:

1. **Reproject to EPSG:4326** (`Reproject layer`). Leaflet needs lat/long.
2. **Simplify** geometry (`Vector → Geometry Tools → Simplify`, tolerance around
   `0.0001`). Detail you cannot see at web zoom is just file size.
3. **Delete attribute columns you do not need.** Keep name, population, class,
   score — drop the rest.
4. **Export → Save Features As… → GeoJSON**, coordinate precision **6**.
5. Save into `assets/data/` using these exact filenames:

   | File | Geometry | Attributes the viewer expects |
   | ---- | -------- | ----------------------------- |
   | `glacial-lakes.geojson` | point or polygon | `name`, `area_km2`, `hazard_class` |
   | `impact-zone.geojson` | polygon | `lake`, `method` |
   | `settlements.geojson` | point | `name`, `population`, `type` |
   | `critical-facilities.geojson` | point | `name`, `amenity` |
   | `risk-units.geojson` | polygon | `name`, `pop_exposed`, `risk_score`, `risk_class` |

   Attribute names are configurable at the top of `assets/js/glof-map.js` if
   yours differ — no need to rename columns in QGIS.

Keep the total under about **5 MB**. If a layer refuses to shrink, either
aggregate it to admin units or turn the raster into a PNG overlay instead.

Population raster too big for GeoJSON? Two options: aggregate it into
`risk-units.geojson` as a `pop_exposed` column (best), or export a georeferenced
PNG and add it as a Leaflet `ImageOverlay`.

---

## 8. The interactive viewer is already built

`maps/glof-risk.html` is ready and running. Open it locally with:

```bash
python3 -m http.server 8000
# → http://localhost:8000/maps/glof-risk.html
```

It currently renders **placeholder** layers so you can see it work. Every file in
`assets/data/` carries a `"sample": true` key, which is what triggers the orange
warning banner. When you overwrite them with real QGIS exports that key is gone
and **the banner disappears on its own** — nothing to remember.

What it already does: terrain / street / satellite basemaps, layer toggles with
feature counts, a risk-class choropleth, click-through attribute popups, a legend
built from whatever loaded, live exposure totals, a coordinate readout, scale bar,
light/dark themes shared with the main site, and a mobile slide-out panel. Layers
that are missing degrade to "not found" instead of breaking the page.

### If your attribute names differ

Open `assets/js/glof-map.js` and edit the `CONFIG.layers` array at the top. Each
entry declares its own field names, so you never have to rename a column in QGIS:

```js
{
  id: 'risk',
  file: '../assets/data/risk-units.geojson',
  label: 'Risk classification',
  kind: 'choropleth',
  field: 'risk_class',        // ← your 1..5 class column
  scoreField: 'risk_score',   // ← or a 0..1 score, used if class is absent
  popup: [
    ['name', 'Unit'],         // ← [ your column, label shown in the popup ]
    ['pop_exposed', 'Population exposed']
  ]
}
```

`kind` can be `choropleth`, `polygon` or `point`. Adding a sixth layer is just
another object in that array plus a GeoJSON file.

### Linking it from the portfolio

Once your real data is in, paste this card into the `work-grid` in `index.html`
(a screenshot of the viewer makes the thumbnail):

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
    <p>An interactive web-GIS map combining glacial lake hazard, downstream
       population exposure and a district vulnerability index into a single risk
       classification. Built with Leaflet over QGIS-derived GeoJSON.</p>
    <dl class="meta">
      <div><dt>Stack</dt><dd>QGIS &rarr; GeoJSON &rarr; Leaflet</dd></div>
      <div><dt>Framing</dt><dd>Hazard &times; Exposure &times; Vulnerability</dd></div>
      <div><dt>CRS</dt><dd class="mono">EPSG:4326 · WGS 84</dd></div>
    </dl>
  </div>
</article>
```

Tell me when your data is in and I'll wire the card up and adjust the config to
match your real columns.
