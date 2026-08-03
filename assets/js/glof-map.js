/* ============================================================
   GLOF Risk Explorer — Leaflet viewer
   ------------------------------------------------------------
   Everything you normally need to change lives in CONFIG below.
   Attribute names are declared here, so you do NOT have to rename
   columns in QGIS — just point each `field` at whatever your layer
   actually calls it.
   ============================================================ */
(function () {
  'use strict';

  /* ─────────────────────────── CONFIG ─────────────────────────── */

  var CONFIG = {
    // Opening view. Once your data loads the map fits to it automatically,
    // so this only matters if every layer fails to load.
    center: [36.34, 74.62],
    zoom: 11,

    // Colour ramp for the 5 risk classes, low → very high.
    riskColors: ['#2c7fb8', '#7fcdbb', '#fed976', '#fd8d3c', '#bd0026'],

    layers: [
      {
        id: 'risk',
        file: '../assets/data/risk-units.geojson',
        label: 'Risk classification',
        kind: 'choropleth',
        on: true,
        // field holding a 1..5 class, or a 0..1 score (either works)
        field: 'risk_class',
        scoreField: 'risk_score',
        nameField: 'name',
        popup: [
          ['name', 'Unit'],
          ['risk_class', 'Risk class'],
          ['risk_score', 'Risk score'],
          ['pop_exposed', 'Population exposed']
        ]
      },
      {
        id: 'zone',
        file: '../assets/data/impact-zone.geojson',
        label: 'Potential impact zone',
        kind: 'polygon',
        on: true,
        style: { color: '#c2571e', weight: 1.6, fillColor: '#c2571e', fillOpacity: 0.22, dashArray: '5,4' },
        popup: [['lake', 'Source lake'], ['method', 'Method']]
      },
      {
        id: 'lakes',
        file: '../assets/data/glacial-lakes.geojson',
        label: 'Glacial lakes',
        kind: 'point',
        on: true,
        marker: { radius: 7, color: '#0b4f6c', weight: 2, fillColor: '#3fb9e8', fillOpacity: 0.85 },
        popup: [['name', 'Lake'], ['area_km2', 'Area (km²)'], ['hazard_class', 'Hazard class']]
      },
      {
        id: 'settlements',
        file: '../assets/data/settlements.geojson',
        label: 'Settlements',
        kind: 'point',
        on: true,
        marker: { radius: 5, color: '#10192b', weight: 1.6, fillColor: '#f7f5f1', fillOpacity: 1 },
        countField: 'population',
        popup: [['name', 'Settlement'], ['population', 'Population'], ['type', 'Type']]
      },
      {
        id: 'facilities',
        file: '../assets/data/critical-facilities.geojson',
        label: 'Critical facilities',
        kind: 'point',
        on: true,
        marker: { radius: 5, color: '#a8071a', weight: 2, fillColor: '#ff4d4f', fillOpacity: 0.9 },
        popup: [['name', 'Facility'], ['amenity', 'Type']]
      }
    ],

    basemaps: [
      {
        id: 'topo', label: 'Terrain', on: true,
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        opts: { maxZoom: 17, attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a> · © OpenStreetMap contributors' }
      },
      {
        id: 'osm', label: 'Street',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        opts: { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }
      },
      {
        id: 'sat', label: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        opts: { maxZoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' }
      }
    ]
  };

  /* ─────────────────────────── helpers ────────────────────────── */

  var $ = function (s) { return document.querySelector(s); };

  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function fmt(n) {
    if (n === null) return '—';
    return n >= 1000 ? Math.round(n).toLocaleString('en-GB') : (Math.round(n * 100) / 100).toLocaleString('en-GB');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ─────────────────────────── theme ──────────────────────────── */

  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem('fm-theme'); } catch (e) {}
  root.setAttribute('data-theme', stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  $('#themeToggle').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('fm-theme', next); } catch (e) {}
  });

  $('#panelToggle').addEventListener('click', function () {
    var open = document.body.classList.toggle('panel-open');
    this.setAttribute('aria-expanded', String(open));
    setTimeout(function () { map.invalidateSize(); }, 320);
  });

  /* ─────────────────────────── map ────────────────────────────── */

  var map = L.map('map', { center: CONFIG.center, zoom: CONFIG.zoom, zoomControl: false });
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

  // basemaps
  var baseLayers = {};
  var baseList = $('#baseList');
  CONFIG.basemaps.forEach(function (b) {
    baseLayers[b.id] = L.tileLayer(b.url, b.opts);
    if (b.on) baseLayers[b.id].addTo(map);

    var lbl = document.createElement('label');
    lbl.className = 'baseopt';
    lbl.innerHTML = '<input type="radio" name="basemap" value="' + b.id + '"' +
      (b.on ? ' checked' : '') + '><span>' + esc(b.label) + '</span>';
    lbl.querySelector('input').addEventListener('change', function () {
      CONFIG.basemaps.forEach(function (o) { map.removeLayer(baseLayers[o.id]); });
      baseLayers[b.id].addTo(map);
      baseLayers[b.id].bringToBack();
    });
    baseList.appendChild(lbl);
  });

  // live coordinate readout
  var coords = L.control({ position: 'bottomright' });
  coords.onAdd = function () {
    var d = L.DomUtil.create('div', 'coordbox mono');
    d.innerHTML = '—';
    map.on('mousemove', function (e) {
      d.innerHTML = e.latlng.lat.toFixed(4) + ', ' + e.latlng.lng.toFixed(4);
    });
    return d;
  };
  coords.addTo(map);

  /* ─────────────────────── layer construction ─────────────────── */

  function riskColor(cfg, props) {
    var cls = num(props[cfg.field]);
    if (cls !== null && cls >= 1 && cls <= CONFIG.riskColors.length) {
      return CONFIG.riskColors[Math.round(cls) - 1];
    }
    var score = num(props[cfg.scoreField]);
    if (score !== null) {
      var i = Math.min(CONFIG.riskColors.length - 1, Math.max(0, Math.floor(score * CONFIG.riskColors.length)));
      return CONFIG.riskColors[i];
    }
    return '#9aa8bd';
  }

  function popupHtml(cfg, props) {
    var rows = (cfg.popup || []).map(function (pair) {
      var v = props[pair[0]];
      if (v === undefined || v === null || v === '') return '';
      var shown = typeof v === 'number' ? fmt(v) : esc(v);
      return '<tr><th>' + esc(pair[1]) + '</th><td>' + shown + '</td></tr>';
    }).filter(Boolean).join('');
    if (!rows) return '<div class="pop"><em>No attributes</em></div>';
    return '<div class="pop"><table>' + rows + '</table></div>';
  }

  function buildLayer(cfg, geojson) {
    var opts = {
      onEachFeature: function (f, lyr) {
        lyr.bindPopup(popupHtml(cfg, f.properties || {}), { maxWidth: 300 });
      }
    };

    if (cfg.kind === 'point') {
      opts.pointToLayer = function (f, latlng) { return L.circleMarker(latlng, cfg.marker); };
    } else if (cfg.kind === 'choropleth') {
      opts.style = function (f) {
        return {
          color: '#ffffff', weight: 1, fillOpacity: 0.72,
          fillColor: riskColor(cfg, f.properties || {})
        };
      };
    } else {
      opts.style = function () { return cfg.style; };
    }

    return L.geoJSON(geojson, opts);
  }

  /* ─────────────────────────── loading ────────────────────────── */

  var loaded = {};
  var isSample = false;
  var bounds = L.latLngBounds([]);

  function loadLayer(cfg) {
    return fetch(cfg.file)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
        return r.json();
      })
      .then(function (gj) {
        if (gj.sample === true) isSample = true;
        var layer = buildLayer(cfg, gj);
        loaded[cfg.id] = { cfg: cfg, layer: layer, geojson: gj, ok: true };
        if (cfg.on) layer.addTo(map);
        var b = layer.getBounds();
        if (b.isValid()) bounds.extend(b);
      })
      .catch(function (err) {
        loaded[cfg.id] = { cfg: cfg, ok: false, error: err.message };
      });
  }

  Promise.all(CONFIG.layers.map(loadLayer)).then(function () {
    $('#loading').style.display = 'none';
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
    if (isSample) $('#sampleWarn').hidden = false;
    buildLayerList();
    buildLegend();
    computeStats();
    // keep drawing order sensible
    ['risk', 'zone', 'settlements', 'facilities', 'lakes'].forEach(function (id) {
      if (loaded[id] && loaded[id].ok && map.hasLayer(loaded[id].layer)) loaded[id].layer.bringToFront();
    });
  });

  /* ─────────────────────── panel: layer list ──────────────────── */

  function buildLayerList() {
    var host = $('#layerList');
    host.innerHTML = '';

    CONFIG.layers.forEach(function (cfg) {
      var rec = loaded[cfg.id];
      var row = document.createElement('label');
      row.className = 'layeropt' + (rec.ok ? '' : ' is-missing');

      if (!rec.ok) {
        row.innerHTML = '<input type="checkbox" disabled><span>' + esc(cfg.label) +
          '</span><em class="layeropt__miss">not found</em>';
        host.appendChild(row);
        return;
      }

      var count = rec.layer.getLayers().length;
      row.innerHTML = '<input type="checkbox"' + (cfg.on ? ' checked' : '') + '><span>' +
        esc(cfg.label) + '</span><em class="layeropt__n mono">' + count + '</em>';

      row.querySelector('input').addEventListener('change', function () {
        if (this.checked) { rec.layer.addTo(map); rec.layer.bringToFront(); }
        else map.removeLayer(rec.layer);
        computeStats();
      });

      host.appendChild(row);
    });
  }

  /* ───────────────────────── panel: legend ────────────────────── */

  function buildLegend() {
    var host = $('#legend');
    host.innerHTML = '';

    if (loaded.risk && loaded.risk.ok) {
      var names = ['Low', 'Moderate', 'High', 'Very high', 'Extreme'];
      var block = document.createElement('div');
      block.className = 'legend__block';
      block.innerHTML = '<h3>Risk class</h3>';
      CONFIG.riskColors.forEach(function (c, i) {
        block.innerHTML += '<div class="legend__row"><span class="sw" style="background:' + c + '"></span>' +
          (names[i] || ('Class ' + (i + 1))) + '</div>';
      });
      host.appendChild(block);
    }

    var other = document.createElement('div');
    other.className = 'legend__block';
    other.innerHTML = '<h3>Features</h3>';
    var any = false;

    if (loaded.zone && loaded.zone.ok) {
      other.innerHTML += '<div class="legend__row"><span class="sw sw--zone"></span>Potential impact zone</div>';
      any = true;
    }
    [['lakes', 'Glacial lake', '#3fb9e8', '#0b4f6c'],
     ['settlements', 'Settlement', '#f7f5f1', '#10192b'],
     ['facilities', 'Critical facility', '#ff4d4f', '#a8071a']].forEach(function (d) {
      if (loaded[d[0]] && loaded[d[0]].ok) {
        other.innerHTML += '<div class="legend__row"><span class="sw sw--dot" style="background:' +
          d[2] + ';border-color:' + d[3] + '"></span>' + d[1] + '</div>';
        any = true;
      }
    });

    if (any) host.appendChild(other);
    if (!host.children.length) host.innerHTML = '<p class="panel__empty">No layers loaded.</p>';
  }

  /* ───────────────────────── panel: stats ─────────────────────── */

  function sumField(rec, field) {
    if (!rec || !rec.ok) return null;
    var total = 0, seen = false;
    rec.layer.eachLayer(function (l) {
      var v = num((l.feature && l.feature.properties || {})[field]);
      if (v !== null) { total += v; seen = true; }
    });
    return seen ? total : null;
  }

  function computeStats() {
    // population: prefer the aggregated column on the risk units, fall back to settlements
    var pop = sumField(loaded.risk, 'pop_exposed');
    if (pop === null) pop = sumField(loaded.settlements, 'population');
    $('#statPop').textContent = fmt(pop);

    $('#statSet').textContent = loaded.settlements && loaded.settlements.ok
      ? loaded.settlements.layer.getLayers().length : '—';
    $('#statFac').textContent = loaded.facilities && loaded.facilities.ok
      ? loaded.facilities.layer.getLayers().length : '—';
    $('#statLake').textContent = loaded.lakes && loaded.lakes.ok
      ? loaded.lakes.layer.getLayers().length : '—';
  }
})();
