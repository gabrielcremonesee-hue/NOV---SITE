import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUISINE_FILTERS,
  getCuisineFilter,
  sanitizeExternalHttpUrl,
  buildPlaceTextQuery,
  computeDistanceKm,
  formatDistanceLabel,
  buildDirectionsUrl,
  matchesOsmCuisine,
  formatOsmAddress,
  normalizeOverpassElement,
  buildOverpassQuery,
  rankRestaurantsByOsm,
} from './restaurants.js';

test('CUISINE_FILTERS includes all required culinary categories', () => {
  const labels = CUISINE_FILTERS.map((c) => c.label);
  ['Todas', 'Italiana', 'Japonesa', 'Brasileira', 'Francesa', 'Pizzas', 'Cafeterias', 'Outras'].forEach((l) => {
    assert.ok(labels.includes(l), `Missing filter ${l}`);
  });
  assert.equal(getCuisineFilter('italian').id, 'italian');
});

test('buildPlaceTextQuery combines city/neighborhood query with active cuisine filter', () => {
  assert.equal(buildPlaceTextQuery({ query: 'Moema, São Paulo', cuisineId: 'italian' }), 'restaurante italiano Moema, São Paulo');
  assert.equal(buildPlaceTextQuery({ query: 'Cantina Italiana Pinheiros', cuisineId: 'italian' }), 'Cantina Italiana Pinheiros');
  assert.equal(buildPlaceTextQuery({ query: '', cuisineId: 'pizza' }), 'pizzaria');
});

test('computeDistanceKm and formatDistanceLabel compute accurate metric strings', () => {
  const a = { lat: -23.55052, lng: -46.633308 };
  const b = { lat: -23.55852, lng: -46.633308 };
  const km = computeDistanceKm(a, b);
  assert.ok(km > 0.8 && km < 1.0);
  assert.match(formatDistanceLabel(0.42), /420 m/);
  assert.equal(formatDistanceLabel(2.35), '2,4 km');
});

test('buildDirectionsUrl produces external Google Maps Directions link', () => {
  const url = buildDirectionsUrl({
    name: 'Trattoria Roma',
    location: { lat: -23.55, lng: -46.63 },
  });
  assert.match(url, /^https:\/\/www\.google\.com\/maps\/dir\/\?/);
  assert.match(url, /destination=-23\.550000%2C-46\.630000/);
});

test('sanitizeExternalHttpUrl rejects javascript: URLs and preserves https URLs', () => {
  assert.equal(sanitizeExternalHttpUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeExternalHttpUrl('https://www.openstreetmap.org/node/123'), 'https://www.openstreetmap.org/node/123');
});

test('matchesOsmCuisine filters OSM tags accurately across categories', () => {
  assert.equal(matchesOsmCuisine({ amenity: 'restaurant', cuisine: 'italian;pasta', name: 'Osteria Nonna' }, 'italian'), true);
  assert.equal(matchesOsmCuisine({ amenity: 'restaurant', cuisine: 'sushi', name: 'Sushi Yama' }, 'japanese'), true);
  assert.equal(matchesOsmCuisine({ amenity: 'cafe', name: 'Café do Centro' }, 'cafe'), true);
  assert.equal(matchesOsmCuisine({ amenity: 'restaurant', cuisine: 'sushi', name: 'Sushi Yama' }, 'italian'), false);
  assert.equal(matchesOsmCuisine({ amenity: 'restaurant', cuisine: 'mediterranean', name: 'Bistrô Sul' }, 'other'), true);
});

test('formatOsmAddress and normalizeOverpassElement produce clean OSM restaurant records without ratings or commercial photos', () => {
  const el = {
    type: 'node',
    id: 987654,
    lat: -23.552,
    lon: -46.634,
    tags: {
      amenity: 'restaurant',
      name: 'Cantina Bella Pasta',
      cuisine: 'italian',
      'addr:street': 'Rua Augusta',
      'addr:housenumber': '1200',
      'addr:suburb': 'Consolação',
      opening_hours: 'Mo-Su 11:30-23:00',
      website: 'https://cantinabella.example.com',
    },
  };
  assert.equal(formatOsmAddress(el.tags), 'Rua Augusta, 1200 — Consolação');
  const norm = normalizeOverpassElement(el, { lat: -23.55052, lng: -46.633308 });
  assert.equal(norm.id, 'osm-node-987654');
  assert.equal(norm.primaryTypeLabel, 'Culinária Italiana');
  assert.equal(norm.openingHours, 'Mo-Su 11:30-23:00');
  assert.equal(norm.osmUrl, 'https://www.openstreetmap.org/node/987654');
  assert.equal(norm.rating, undefined);
});

test('buildOverpassQuery produces valid Overpass QL around center coordinates', () => {
  const q = buildOverpassQuery({ center: { lat: -23.55, lng: -46.63 }, radiusMeters: 3000, cuisineId: 'all' });
  assert.match(q, /\[out:json\]/);
  assert.match(q, /around:3000,-23\.55000,-46\.63000/);
});

test('rankRestaurantsByOsm prioritizes nearby complete places in featured mode and alphabetical in name mode', () => {
  const list = [
    { id: 'far', name: 'Cantina Z', distanceKm: 5.5, openingHours: '', address: 'Endereço não informado no OpenStreetMap' },
    { id: 'near-complete', name: 'Trattoria B', distanceKm: 0.6, openingHours: '11:00-22:00', address: 'Rua A, 10', cuisineRaw: 'italian' },
    { id: 'mid', name: 'Cantina A', distanceKm: 2.0, openingHours: '', address: 'Rua B, 20' },
  ];
  assert.equal(rankRestaurantsByOsm(list, 'featured')[0].id, 'near-complete');
  assert.equal(rankRestaurantsByOsm(list, 'distance')[0].id, 'near-complete');
  assert.equal(rankRestaurantsByOsm(list, 'name')[0].name, 'Cantina A');
});
