import {
  DEFAULT_MAP_CENTER,
  matchesOsmCuisine,
  normalizeOverpassElement,
  buildOverpassQuery,
  computeDistanceKm,
  formatDistanceLabel,
} from './restaurants.js';

export const OPENFREEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_TTL_MS = 5 * 60 * 1000;
const SESSION_CACHE_PREFIX = 'fervec-osm-cache-v1:';
const MIN_UPSTREAM_INTERVAL_MS = 1100;

const memoryCache = new Map();
let activeSearchController = null;
let lastUpstreamAt = 0;
let maplibreglPromise = null;

async function getMapLibre() {
  if (maplibreglPromise) return maplibreglPromise;
  maplibreglPromise = import('/vendor/maplibre-gl/maplibre-gl.mjs').then((mod) => {
    if (typeof mod.setWorkerUrl === 'function') {
      mod.setWorkerUrl('/vendor/maplibre-gl/maplibre-gl-worker.mjs');
    }
    return mod;
  });
  return maplibreglPromise;
}

function makeCacheKey({ lat, lng, radiusMeters, query = '' }) {
  const rLat = Math.round(Number(lat) * 200) / 200; // ~550m grid
  const rLng = Math.round(Number(lng) * 200) / 200;
  const cleanQ = String(query || '').trim().toLowerCase();
  return `${rLat}:${rLng}:${radiusMeters}:${cleanQ}`;
}

function readCache(key) {
  const now = Date.now();
  const mem = memoryCache.get(key);
  if (mem && now - mem.ts < CACHE_TTL_MS) {
    return mem.value;
  }
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && now - parsed.ts < CACHE_TTL_MS && parsed.value) {
      memoryCache.set(key, parsed);
      return parsed.value;
    }
    sessionStorage.removeItem(SESSION_CACHE_PREFIX + key);
  } catch {}
  return null;
}

function writeCache(key, value) {
  const entry = { ts: Date.now(), value };
  memoryCache.set(key, entry);
  try {
    sessionStorage.setItem(SESSION_CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {}
}

async function waitRespectfulThrottle(signal) {
  const elapsed = Date.now() - lastUpstreamAt;
  if (elapsed < MIN_UPSTREAM_INTERVAL_MS) {
    const waitMs = MIN_UPSTREAM_INTERVAL_MS - elapsed;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, waitMs);
      if (signal) {
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new DOMException('Busca cancelada', 'AbortError'));
          },
          { once: true }
        );
      }
    });
  }
  lastUpstreamAt = Date.now();
}

function withTimeoutSignal(parentSignal, timeoutMs = 8000) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener('abort', onParentAbort, { once: true });
    }
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
      if (parentSignal) {
        parentSignal.removeEventListener('abort', onParentAbort);
      }
    },
  };
}

export async function geocodeLocationNominatim(text, signal) {
  const clean = String(text || '').trim();
  if (!clean) return null;
  const geoKey = `geo:${clean.toLowerCase()}`;
  const cached = readCache(geoKey);
  if (cached) return cached;

  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '3');
  url.searchParams.set('countrycodes', 'br');
  url.searchParams.set('accept-language', 'pt-BR');
  url.searchParams.set('q', clean);

  const reqTimeout = withTimeoutSignal(signal, 8000);
  try {
    const res = await fetch(url.toString(), {
      signal: reqTimeout.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const arr = await res.json().catch(() => []);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const top = arr[0];
    const lat = Number(top.lat);
    const lng = Number(top.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const result = {
      lat,
      lng,
      displayName: String(top.display_name || clean),
      type: String(top.type || ''),
      category: String(top.category || ''),
    };
    writeCache(geoKey, result);
    return result;
  } finally {
    reqTimeout.cleanup();
  }
}

async function fetchOverpassElements(overpassQl, signal) {
  let lastError = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const reqTimeout = withTimeoutSignal(signal, 8000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        signal: reqTimeout.signal,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Accept: 'application/json',
        },
        body: 'data=' + encodeURIComponent(overpassQl),
      });
      if (res.status === 429 || res.status === 504 || res.status >= 500) {
        lastError = new Error('Servidor Overpass temporariamente ocupado (' + res.status + ').');
        continue;
      }
      if (!res.ok) {
        lastError = new Error('Falha ao consultar OpenStreetMap (' + res.status + ').');
        continue;
      }
      const data = await res.json();
      return Array.isArray(data?.elements) ? data.elements : [];
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err;
    } finally {
      reqTimeout.cleanup();
    }
  }
  throw lastError || new Error('Não foi possível acessar os dados abertos do OpenStreetMap no momento.');
}

export async function createInteractiveRestaurantMap(container, center = DEFAULT_MAP_CENTER) {
  const maplibregl = await getMapLibre();

  const map = new maplibregl.Map({
    container,
    style: OPENFREEMAP_STYLE_URL,
    center: [center.lng, center.lat],
    zoom: 14,
    attributionControl: false,
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(
    new maplibregl.AttributionControl({
      compact: true,
      customAttribution: 'Mapas: OpenFreeMap · Dados: © OpenStreetMap contributors (ODbL)',
    })
  );

  // Fallback gracefully to OSM raster tiles only if OpenFreeMap vector style is unreachable
  map.on('error', (e) => {
    const status = e?.error?.status;
    if (status && status >= 400 && !map.__fervecRasterFallback) {
      map.__fervecRasterFallback = true;
      try {
        map.setStyle({
          version: 8,
          sources: {
            'osm-raster': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'osm-raster-layer', type: 'raster', source: 'osm-raster' }],
        });
      } catch {}
    }
  });

  return { map, maplibregl };
}

export async function searchRestaurantsOsm({
  center = DEFAULT_MAP_CENTER,
  query = '',
  cuisineId = 'all',
  radiusMeters = 3500,
  maxResultCount = 24,
} = {}) {
  if (activeSearchController) {
    activeSearchController.abort();
  }
  const controller = new AbortController();
  activeSearchController = controller;

  const safeRadius = Math.min(15000, Math.max(500, Math.round(Number(radiusMeters) || 3500)));
  const safeMaxResults = Math.min(30, Math.max(1, Math.round(Number(maxResultCount) || 24)));
  const cleanQuery = String(query || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 120);
  const validCoords =
    center &&
    Number.isFinite(center.lat) &&
    Number.isFinite(center.lng) &&
    Number(center.lat) >= -90 &&
    Number(center.lat) <= 90 &&
    Number(center.lng) >= -180 &&
    Number(center.lng) <= 180;
  let searchCenter = validCoords
    ? { lat: Number(center.lat), lng: Number(center.lng) }
    : { ...DEFAULT_MAP_CENTER };
  radiusMeters = safeRadius;
  maxResultCount = safeMaxResults;
  let geocodedPlace = null;

  // Step 1: If user entered text, check Nominatim to see if it refers to a city/neighborhood/address
  if (cleanQuery) {
    try {
      const geo = await geocodeLocationNominatim(cleanQuery, controller.signal);
      if (geo) {
        const isVenueSearch = /restaurant|cafe|fast_food|bar|pub/.test(geo.type);
        if (!isVenueSearch) {
          searchCenter = { lat: geo.lat, lng: geo.lng };
          geocodedPlace = geo;
        } else {
          // Specific restaurant matched by Nominatim — search near it
          searchCenter = { lat: geo.lat, lng: geo.lng };
          geocodedPlace = geo;
        }
      }
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      // Non-fatal: continue searching around current center and filtering by name
    }
  }

  // Step 2: Check client TTL cache for raw OSM elements around searchCenter
  const areaCacheKey = makeCacheKey({
    lat: searchCenter.lat,
    lng: searchCenter.lng,
    radiusMeters,
    query: 'all-venues',
  });

  let rawElements = readCache(areaCacheKey);
  let fromCache = Boolean(rawElements);

  if (!rawElements) {
    await waitRespectfulThrottle(controller.signal);
    const ql = buildOverpassQuery({
      center: searchCenter,
      radiusMeters,
      cuisineId: 'all',
    });
    rawElements = await fetchOverpassElements(ql, controller.signal);
    writeCache(areaCacheKey, rawElements);
  }

  // Step 3: Filter & normalize cleanly for the active cuisine & search text
  const normalizedAll = rawElements
    .map((el) => normalizeOverpassElement(el, center || searchCenter))
    .filter((item) => item.location);

  let filtered = normalizedAll.filter((item) => matchesOsmCuisine(item.tags, cuisineId));

  // If query is not solely a city/neighborhood name, also allow filtering by venue/cuisine keywords when matches exist
  if (cleanQuery) {
    const qLower = cleanQuery.toLowerCase();
    const byNameOrCuisine = filtered.filter((item) => {
      const hay = `${item.name} ${item.primaryTypeLabel} ${item.address} ${item.cuisineRaw}`.toLowerCase();
      return hay.includes(qLower);
    });
    if (byNameOrCuisine.length > 0) {
      filtered = byNameOrCuisine;
    } else if (!geocodedPlace) {
      // Nothing matched by name and Nominatim didn't locate a place
      filtered = [];
    }
  }

  // Recompute distance from user center (or searched city if far away)
  const cityShiftKm = geocodedPlace ? computeDistanceKm(center, searchCenter) : 0;
  const originForDistance = geocodedPlace && cityShiftKm != null && cityShiftKm > 25 ? searchCenter : center || searchCenter;
  filtered = filtered.map((item) => {
    const distanceKm = computeDistanceKm(originForDistance, item.location);
    return {
      ...item,
      distanceKm,
      distanceLabel: formatDistanceLabel(distanceKm),
    };
  });

  return {
    items: filtered.slice(0, maxResultCount),
    totalAreaMatches: filtered.length,
    searchCenter,
    geocodedLabel: geocodedPlace?.displayName || '',
    fromCache,
  };
}

let activePopup = null;

export async function renderRestaurantMarkers({
  map,
  restaurants = [],
  existingMarkers = [],
  userLocation = null,
  onSelect = () => {},
} = {}) {
  const maplibregl = await getMapLibre();

  for (const m of existingMarkers) {
    try {
      m.remove();
    } catch {}
  }
  if (activePopup) {
    try {
      activePopup.remove();
    } catch {}
    activePopup = null;
  }

  const nextMarkers = [];
  const markerById = new Map();
  const bounds = new maplibregl.LngLatBounds();
  let hasPoint = false;

  if (userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)) {
    const userEl = document.createElement('div');
    userEl.className = 'osm-user-pin';
    userEl.title = 'Sua localização atual';
    userEl.textContent = 'Eu';

    const userMarker = new maplibregl.Marker({ element: userEl })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);
    nextMarkers.push(userMarker);
    bounds.extend([userLocation.lng, userLocation.lat]);
    hasPoint = true;
  }

  restaurants.forEach((place, idx) => {
    if (!place.location) return;
    const pinEl = document.createElement('button');
    pinEl.type = 'button';
    pinEl.className = 'osm-rest-pin';
    pinEl.textContent = String(idx + 1);
    pinEl.setAttribute('aria-label', `${place.name} (${place.distanceLabel})`);

    const marker = new maplibregl.Marker({ element: pinEl })
      .setLngLat([place.location.lng, place.location.lat])
      .addTo(map);

    pinEl.addEventListener('click', (ev) => {
      ev.stopPropagation();
      openPlacePopup({ map, marker, place });
      onSelect(place.id);
    });

    nextMarkers.push(marker);
    markerById.set(place.id, { marker, place });
    bounds.extend([place.location.lng, place.location.lat]);
    hasPoint = true;
  });

  if (restaurants.length > 0 && hasPoint) {
    map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 550 });
  }

  return { markers: nextMarkers, markerById };
}

export async function openPlacePopup({ map, place }) {
  if (!map || !place?.location) return;
  const maplibregl = await getMapLibre();

  if (activePopup) {
    try {
      activePopup.remove();
    } catch {}
  }

  const wrap = document.createElement('div');
  wrap.className = 'gmp-iw-card';

  const title = document.createElement('strong');
  title.className = 'gmp-iw-title';
  title.textContent = place.name;

  const meta = document.createElement('div');
  meta.className = 'gmp-iw-meta';
  meta.textContent = `${place.primaryTypeLabel} · ${place.distanceLabel}`;

  const addr = document.createElement('div');
  addr.className = 'gmp-iw-addr';
  addr.textContent = place.address;

  const actions = document.createElement('div');
  actions.className = 'gmp-iw-actions';

  const dirLink = document.createElement('a');
  dirLink.href = place.directionsUrl;
  dirLink.target = '_blank';
  dirLink.rel = 'noopener noreferrer';
  dirLink.className = 'gmp-iw-btn';
  dirLink.textContent = 'Como Chegar';
  actions.appendChild(dirLink);

  const osmLink = document.createElement('a');
  osmLink.href = place.osmUrl;
  osmLink.target = '_blank';
  osmLink.rel = 'noopener noreferrer';
  osmLink.className = 'gmp-iw-link';
  osmLink.textContent = 'Ver no OSM';
  actions.appendChild(osmLink);

  wrap.append(title, meta, addr, actions);

  activePopup = new maplibregl.Popup({ offset: 22, closeButton: true, maxWidth: '250px' })
    .setLngLat([place.location.lng, place.location.lat])
    .setDOMContent(wrap)
    .addTo(map);
}
