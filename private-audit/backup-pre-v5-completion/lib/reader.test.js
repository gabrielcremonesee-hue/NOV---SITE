import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ZOOM_LEVELS,
  clampReaderZoom,
  nextReaderZoom,
  isSpreadLayout,
  getReaderSpreadLabel,
  computePdfRenderParams,
} from './reader.js';

test('nextReaderZoom cycles through zoom presets cleanly', () => {
  assert.deepEqual(ZOOM_LEVELS, [1, 1.5, 2]);
  assert.equal(nextReaderZoom(1), 1.5);
  assert.equal(nextReaderZoom(1.5), 2);
  assert.equal(nextReaderZoom(2), 1);
  assert.equal(nextReaderZoom(0.5), 1.5);
});

test('clampReaderZoom bounds invalid and extreme values', () => {
  assert.equal(clampReaderZoom(undefined), 1);
  assert.equal(clampReaderZoom(-3), 1);
  assert.equal(clampReaderZoom(1.5), 1.5);
  assert.equal(clampReaderZoom(5), 2.5);
});

test('isSpreadLayout respects explicit single and double pageMode choices regardless of viewport', () => {
  assert.equal(isSpreadLayout({ viewportWidth: 1440, viewportHeight: 900, fullscreen: false }), false);
  assert.equal(isSpreadLayout({ viewportWidth: 1440, viewportHeight: 900, fullscreen: true, pageMode: 'single' }), false);
  assert.equal(isSpreadLayout({ viewportWidth: 390, viewportHeight: 844, fullscreen: true, pageMode: 'double' }), true);
  assert.equal(isSpreadLayout({ viewportWidth: 390, viewportHeight: 844, fullscreen: true, pageMode: 'auto' }), false);
  assert.equal(isSpreadLayout({ viewportWidth: 1440, viewportHeight: 900, fullscreen: true, pageMode: 'auto' }), true);
});

test('getReaderSpreadLabel formats single and double page labels accurately', () => {
  assert.equal(getReaderSpreadLabel({ page: 1, total: 74, isSpread: false }), 'Pág. 1 / 74');
  assert.equal(getReaderSpreadLabel({ page: 2, total: 74, isSpread: true }), 'Págs. 2–3 / 74');
  assert.equal(getReaderSpreadLabel({ page: 74, total: 74, isSpread: true }), 'Pág. 74 / 74');
});

test('computePdfRenderParams boosts resolution in fullscreen or when zoomed and applies zoom in both modes', () => {
  const normal = computePdfRenderParams({
    containerWidth: 360,
    containerHeight: 500,
    pageWidth: 600,
    pageHeight: 850,
    devicePixelRatio: 1,
    fullscreen: false,
    zoom: 1,
  });
  assert.equal(normal.zoom, 1);
  assert.equal(normal.effectiveDpr, 1);

  const inlineZoomed = computePdfRenderParams({
    containerWidth: 360,
    containerHeight: 500,
    pageWidth: 600,
    pageHeight: 850,
    devicePixelRatio: 1,
    fullscreen: false,
    zoom: 1.5,
  });
  assert.equal(inlineZoomed.zoom, 1.5);
  assert.equal(inlineZoomed.effectiveDpr, 2);
  assert.ok(inlineZoomed.cssWidth > normal.cssWidth);

  const fs = computePdfRenderParams({
    containerWidth: 390,
    containerHeight: 740,
    pageWidth: 600,
    pageHeight: 850,
    devicePixelRatio: 1,
    fullscreen: true,
    zoom: 1,
  });
  assert.equal(fs.effectiveDpr, 2);
  assert.ok(fs.renderScale > normal.renderScale * 2);
  assert.equal(fs.cssWidth, 390);

  const zoomed = computePdfRenderParams({
    containerWidth: 390,
    containerHeight: 740,
    pageWidth: 600,
    pageHeight: 850,
    devicePixelRatio: 2,
    fullscreen: true,
    zoom: 1.5,
  });
  assert.equal(zoomed.zoom, 1.5);
  assert.equal(zoomed.cssWidth, 585);
  assert.ok(zoomed.renderScale > fs.renderScale);
});
