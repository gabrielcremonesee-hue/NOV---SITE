export const CUISINE_FILTERS = [
  { id: 'all', label: 'Todas', primaryType: 'restaurant', textTerm: 'restaurantes', icon: '🍽️' },
  { id: 'italian', label: 'Italiana', primaryType: 'italian_restaurant', textTerm: 'restaurante italiano', icon: '🍝' },
  { id: 'japanese', label: 'Japonesa', primaryType: 'japanese_restaurant', textTerm: 'restaurante japonês', icon: '🍣' },
  { id: 'brazilian', label: 'Brasileira', primaryType: 'brazilian_restaurant', textTerm: 'restaurante brasileiro', icon: '🍲' },
  { id: 'french', label: 'Francesa', primaryType: 'french_restaurant', textTerm: 'restaurante francês', icon: '🥐' },
  { id: 'pizza', label: 'Pizzas', primaryType: 'pizza_restaurant', textTerm: 'pizzaria', icon: '🍕' },
  { id: 'cafe', label: 'Cafeterias', primaryType: 'cafe', textTerm: 'cafeteria', icon: '☕' },
  { id: 'other', label: 'Outras', primaryType: 'restaurant', textTerm: 'bistrô gastronomia restaurante', icon: '🍷' },
];

export const DEFAULT_MAP_CENTER = { lat: -23.55052, lng: -46.633308 };

const OSM_CUISINE_LABELS = {
  italian: 'Culinária Italiana',
  pasta: 'Massas',
  pizza: 'Pizzaria',
  japanese: 'Culinária Japonesa',
  sushi: 'Sushi e Japonesa',
  ramen: 'Lámen / Japonesa',
  brazilian: 'Culinária Brasileira',
  regional: 'Culinária Regional',
  french: 'Culinária Francesa',
  crepe: 'Creperia / Francesa',
  coffee_shop: 'Cafeteria',
  cafe: 'Cafeteria',
  bakery: 'Padaria / Confeitaria',
  pastry: 'Confeitaria',
  burger: 'Hamburgueria',
  steak_house: 'Churrascaria / Carnes',
  barbecue: 'Churrasco',
  seafood: 'Frutos do Mar',
  mediterranean: 'Mediterrânea',
  vegetarian: 'Vegetariana',
  vegan: 'Vegana',
  arab: 'Árabe',
  arabic: 'Árabe',
  lebanese: 'Libanesa',
  mexican: 'Mexicana',
  spanish: 'Espanhola',
  portuguese: 'Portuguesa',
  chinese: 'Chinesa',
  asian: 'Asiática',
  ice_cream: 'Sorveteria',
};

const AMENITY_LABELS = {
  restaurant: 'Restaurante',
  cafe: 'Cafeteria',
  fast_food: 'Lanchonete / Rápido',
  bistro: 'Bistrô',
  pub: 'Pub Gastronômico',
  ice_cream: 'Sorveteria',
};

export function getCuisineFilter(id = 'all') {
  return CUISINE_FILTERS.find((c) => c.id === id) || CUISINE_FILTERS[0];
}

export function sanitizeExternalHttpUrl(rawUrl = '') {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export function buildPlaceTextQuery({ query = '', cuisineId = 'all' } = {}) {
  const clean = String(query || '').trim();
  const filter = getCuisineFilter(cuisineId);
  if (clean && cuisineId !== 'all') {
    const lower = clean.toLowerCase();
    const term = filter.textTerm.toLowerCase();
    if (lower.includes(filter.label.toLowerCase()) || lower.includes(term)) {
      return clean;
    }
    return `${filter.textTerm} ${clean}`.trim();
  }
  if (clean) {
    return clean;
  }
  return filter.textTerm;
}

export function computeDistanceKm(a, b) {
  if (!a || !b) return null;
  const lat1 = typeof a.lat === 'function' ? a.lat() : Number(a.lat);
  const lng1 = typeof a.lng === 'function' ? a.lng() : Number(a.lng);
  const lat2 = typeof b.lat === 'function' ? b.lat() : Number(b.lat);
  const lng2 = typeof b.lng === 'function' ? b.lng() : Number(b.lng);
  if (![lat1, lng1, lat2, lng2].every((v) => Number.isFinite(v))) return null;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return 6371 * c;
}

export function formatDistanceLabel(km) {
  if (km == null || !Number.isFinite(km)) return 'Distância indisponível';
  if (km < 1) {
    return `${Math.max(10, Math.round(km * 1000))} m`;
  }
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function buildDirectionsUrl({ name = '', address = '', location = null, placeId = '' } = {}) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  if (location && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng))) {
    url.searchParams.set('destination', `${Number(location.lat).toFixed(6)},${Number(location.lng).toFixed(6)}`);
  } else {
    const destText = [name, address].filter(Boolean).join(', ');
    if (destText) url.searchParams.set('destination', destText);
  }
  if (placeId) {
    url.searchParams.set('destination_place_id', String(placeId));
  }
  return url.toString();
}

export function extractLatLngLiteral(location) {
  if (!location) return null;
  const lat = typeof location.lat === 'function' ? location.lat() : Number(location.lat);
  const lng = typeof location.lng === 'function' ? location.lng() : Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function matchesOsmCuisine(tags = {}, cuisineId = 'all') {
  if (!cuisineId || cuisineId === 'all') return true;
  const cuisineRaw = String(tags?.cuisine || '').toLowerCase();
  const amenity = String(tags?.amenity || '').toLowerCase();
  const nameRaw = String(tags?.name || '').toLowerCase();
  const tokens = cuisineRaw.split(/[;,/]+/).map((s) => s.trim()).filter(Boolean);
  const combined = `${cuisineRaw} ${nameRaw}`;

  switch (cuisineId) {
    case 'italian':
      return tokens.some((t) => /italian|pasta/.test(t)) || /\b(italiana|trattoria|cantina|osteria|pasta)\b/.test(combined);
    case 'japanese':
      return tokens.some((t) => /japanese|sushi|ramen|izakaya|tempura/.test(t)) || /\b(japon|sushi|temaki|izakaya|ramen|washoku)\b/.test(combined);
    case 'brazilian':
      return tokens.some((t) => /brazilian|regional|mineira|baiana|gaucha|churrasco/.test(t)) || /\b(brasil|mineir|baian|feijoada|churrasc|boteco)\b/.test(combined);
    case 'french':
      return tokens.some((t) => /french|crepe|patisserie|bistro/.test(t)) || /\b(franc|bistr[oô]|creperie|brasserie)\b/.test(combined);
    case 'pizza':
      return tokens.some((t) => /pizza/.test(t)) || /\b(pizz|pizzeria|pizzaria)\b/.test(combined);
    case 'cafe':
      return amenity === 'cafe' || tokens.some((t) => /coffee|cafe|bakery|tea/.test(t)) || /\b(caf[eé]|cafeteria|padaria|confeitaria)\b/.test(nameRaw);
    case 'other': {
      const isMain =
        matchesOsmCuisine(tags, 'italian') ||
        matchesOsmCuisine(tags, 'japanese') ||
        matchesOsmCuisine(tags, 'brazilian') ||
        matchesOsmCuisine(tags, 'french') ||
        matchesOsmCuisine(tags, 'pizza') ||
        matchesOsmCuisine(tags, 'cafe');
      return !isMain;
    }
    default:
      return true;
  }
}

export function formatOsmAddress(tags = {}) {
  const street = String(tags?.['addr:street'] || '').trim();
  const houseNumber = String(tags?.['addr:housenumber'] || '').trim();
  const suburb = String(tags?.['addr:suburb'] || tags?.['addr:neighbourhood'] || '').trim();
  const city = String(tags?.['addr:city'] || '').trim();
  const full = String(tags?.['addr:full'] || '').trim();

  if (full && !street) return full;

  const line1 = [street, houseNumber].filter(Boolean).join(', ');
  const parts = [line1, suburb, city].filter(Boolean);
  return parts.length ? parts.join(' — ') : 'Endereço não informado no OpenStreetMap';
}

export function formatOsmCuisineLabel(tags = {}) {
  const raw = String(tags?.cuisine || '').trim();
  if (raw) {
    const first = raw.split(/[;,]+/)[0].trim().toLowerCase();
    if (OSM_CUISINE_LABELS[first]) return OSM_CUISINE_LABELS[first];
    if (first) return first.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  }
  const amenity = String(tags?.amenity || '').toLowerCase();
  return AMENITY_LABELS[amenity] || 'Restaurante';
}

export function normalizeOverpassElement(el, originCoords = DEFAULT_MAP_CENTER) {
  const tags = el?.tags || {};
  const lat = Number(el?.lat ?? el?.center?.lat);
  const lng = Number(el?.lon ?? el?.center?.lon);
  const location = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  const distanceKm = location && originCoords ? computeDistanceKm(originCoords, location) : null;
  const name = String(tags.name || '').trim() || 'Restaurante local';
  const address = formatOsmAddress(tags);
  const openingHours = String(tags.opening_hours || '').trim();
  const phone = String(tags.phone || tags['contact:phone'] || '').trim();
  const website = sanitizeExternalHttpUrl(tags.website || tags['contact:website'] || '');
  const amenity = String(tags.amenity || 'restaurant').toLowerCase();
  const osmType = el?.type === 'way' || el?.type === 'relation' ? el.type : 'node';
  const osmId = el?.id ?? '';

  return {
    id: `osm-${osmType}-${osmId}`,
    osmType,
    osmId,
    name,
    address,
    location,
    distanceKm,
    distanceLabel: formatDistanceLabel(distanceKm),
    cuisineRaw: String(tags.cuisine || ''),
    primaryTypeLabel: formatOsmCuisineLabel(tags),
    amenityLabel: AMENITY_LABELS[amenity] || 'Estabelecimento',
    openingHours,
    openingSummary: openingHours || 'Horário não informado no OpenStreetMap',
    phone,
    website,
    osmUrl: osmId ? `https://www.openstreetmap.org/${osmType}/${osmId}` : 'https://www.openstreetmap.org',
    directionsUrl: buildDirectionsUrl({ name, address, location }),
    tags,
  };
}

export function buildOverpassQuery({ center = DEFAULT_MAP_CENTER, radiusMeters = 3500, cuisineId = 'all' } = {}) {
  const lat = Number(center?.lat ?? DEFAULT_MAP_CENTER.lat).toFixed(5);
  const lng = Number(center?.lng ?? DEFAULT_MAP_CENTER.lng).toFixed(5);
  const radius = Math.min(8000, Math.max(800, Number(radiusMeters) || 3500));

  let amenityFilter = '"amenity"~"^(restaurant|cafe|fast_food)$"';
  if (cuisineId === 'cafe') {
    amenityFilter = '"amenity"~"^(cafe|restaurant)$"';
  }

  return `[out:json][timeout:18];
(
  node[${amenityFilter}]["name"](around:${radius},${lat},${lng});
  way[${amenityFilter}]["name"](around:${radius},${lat},${lng});
);
out center 80;`;
}

export function rankRestaurantsByOsm(items = [], sortMode = 'featured') {
  const list = Array.isArray(items) ? items.slice() : [];
  if (sortMode === 'distance') {
    return list.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }
  if (sortMode === 'name' || sortMode === 'rating') {
    return list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
  }
  // 'featured': prioritize closer places with richer OpenStreetMap metadata
  const score = (p) => {
    const dist = p.distanceKm != null && Number.isFinite(p.distanceKm) ? p.distanceKm : 5;
    const distScore = Math.max(0, 45 - dist * 7);
    const hasHours = p.openingHours ? 14 : 0;
    const hasAddr = p.address && !p.address.includes('não informado') ? 10 : 0;
    const hasContact = p.website || p.phone ? 8 : 0;
    const hasCuisine = p.cuisineRaw ? 8 : 0;
    return distScore + hasHours + hasAddr + hasContact + hasCuisine;
  };
  return list.sort((a, b) => score(b) - score(a));
}

export function rankRestaurantsByProximityAndRating(items = [], sortMode = 'featured') {
  return rankRestaurantsByOsm(items, sortMode);
}
