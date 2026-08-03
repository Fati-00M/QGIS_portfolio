# Fatima Mahmood — Geospatial Portfolio

A single-page portfolio showcasing QGIS cartography, satellite-derived hazard and exposure
mapping, animated map products and public web-GIS dashboards.

**Live site:** https://fati-00m.github.io/QGIS_portfolio/

---

## Enabling GitHub Pages

1. Push this branch to GitHub.
2. Repository → **Settings** → **Pages**.
3. **Source:** `Deploy from a branch` → **Branch:** `main` → **Folder:** `/ (root)` → **Save**.
4. Wait ~1 minute, then open the URL above.

---

## Repository layout

```
index.html                     the portfolio page
maps/glof-risk.html            interactive Leaflet web-GIS viewer
GLOF-WORKFLOW.md               how to build the GLOF risk product + wire it up
assets/
  css/style.css                styles (light + dark themes)
  css/map.css                  map-tool chrome
  js/main.js                   nav, filters, video players, lightbox
  js/glof-map.js               Leaflet viewer (config-driven, edit the top)
  data/                        GeoJSON layers for the viewer
  img/                         web-optimised map JPGs + video poster frames
  video/                       web-optimised H.264 MP4s
.nojekyll                      serve files as-is, no Jekyll processing
.gitignore                     keeps raw QGIS exports out of the repo
```

## Media pipeline

The originals exported from QGIS stay **local only** (see `.gitignore`); the repo carries
only the small web-ready derivatives the site actually serves.

| Source (local)             | Published                              |
| -------------------------- | -------------------------------------- |
| `urban_extent_growth.mp4`  | `assets/video/urban-extent-growth.mp4`  |
| `glacier_velocity.mp4`     | `assets/video/glacier-velocity.mp4`     |
| `Pakistan_builtup_growth.mp4` | `assets/video/builtup-growth.mp4`    |
| `population_growth.mp4`    | `assets/video/population-growth.mp4`    |
| `Pakistan_Urban_Extent.png`| `assets/img/urban-extent-2030[-full].jpg` |
| `Top_glaciers.png`         | `assets/img/glacier-inventory[-full].jpg` |
| `Wah_Cantt_map.png`        | `assets/img/wah-cantt-services[-full].jpg` |

Two things were fixed during conversion:

- **Codec.** The QGIS exports were **HEVC / H.265**, which does not play in Chrome or
  Firefox on desktop. They were re-encoded to **H.264 (yuv420p, faststart)**, which plays
  everywhere. Total media dropped from ~31 MB to ~3 MB with no visible quality loss.
- **Typo.** `glacier_velocity.mp4` had **"Pakistan Galciers Velocity"** burnt into the
  title. The published copy is corrected to "Glaciers". Re-render the title in QGIS when
  convenient so the source file matches.

### Regenerating the derivatives

If you re-export a map or animation, drop the new file in the repo root and run:

```bash
# animation → web-safe H.264 + poster frame
ffmpeg -i SOURCE.mp4 -c:v libx264 -profile:v high -pix_fmt yuv420p \
       -crf 23 -preset slow -an -movflags +faststart assets/video/NAME.mp4
ffmpeg -ss 5 -i assets/video/NAME.mp4 -frames:v 1 -q:v 4 assets/img/poster-NAME.jpg

# map PNG → display + full-resolution JPG
python3 - <<'PY'
from PIL import Image
im = Image.open('SOURCE.png').convert('RGB')
for w, suffix, q in [(2200, '-full', 86), (1000, '', 84)]:
    im.resize((w, round(im.height * w / im.width)), Image.LANCZOS) \
      .save(f'assets/img/NAME{suffix}.jpg', quality=q, optimize=True, progressive=True)
PY
```

---

## Adding a new project

Copy an existing `<article class="card">` block in `index.html` and edit it. The pieces:

- `data-tags="hazard exposure motion carto"` — drives the filter chips (space-separated).
- `class="card--wide"` — makes the card span the full grid width with the media on the left.
- For a **map**: `<button class="card__media" data-lightbox="…-full.jpg" data-caption="…">`.
- For an **animation**: `<div class="card__media card__media--video">` wrapping a
  `<video poster="…" muted loop playsinline preload="none">`. Add `card__media--dark`
  as well if the animation has a black background.

---

## Verify before applying for a role

A few descriptive details on the site were inferred from the map graphics themselves.
Confirm they match your actual workflow, and edit `index.html` if not:

- The urbanisation class names (`urban_centre`, `dense_cluster`, `semi_dense`, `suburban`)
  are described as **GHSL degree-of-urbanisation** classes.
- The **Glaciers Velocity** animation is described generically ("surface-velocity signal")
  because the source dataset isn't labelled on the graphic — name it if you want the credit.
- Project counts in the hero (`7` products, `3` dashboards) — update if you add more.
- The three GHSL animations are labelled **1975–2030**; the glaciers velocity clip has no
  span shown because its period wasn't confirmed. Add one if you know it.

---

## Local preview

```bash
python3 -m http.server 8000
# → http://localhost:8000
```
