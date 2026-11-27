export const ZOOM_LEVELS = [1, 1.5, 2];

export function clampReaderZoom(zoom) {
  const n = Number(zoom);
  if (!Number.isFinite(n) || n <= 1) return 1;
  if (n >= 2.5) return 2.5;
  return Math.round(n * 100) / 100;
}

export function nextReaderZoom(currentZoom) {
  const current = clampReaderZoom(currentZoom);
  const idx = ZOOM_LEVELS.findIndex((z) => Math.abs(z - current) < 0.05);
  if (idx === -1 || idx === ZOOM_LEVELS.length - 1) return ZOOM_LEVELS[0];
  return ZOOM_LEVELS[idx + 1];
}

export function isSpreadLayout({ viewportWidth, viewportHeight, fullscreen, pageMode = 'auto' }) {
  if (!fullscreen) return false;
  if (pageMode === 'single') return false;
  if (pageMode === 'double') return true;
  const w = Number(viewportWidth) || 0;
  const h = Number(viewportHeight) || 0;
  return w >= 768 && w > h;
}

export function getReaderSpreadLabel({ page, total, isSpread }) {
  const p = Math.max(1, Number.parseInt(page, 10) || 1);
  const t = Math.max(p, Number.parseInt(total, 10) || 74);
  if (!isSpread || p >= t) {
    return `Pág. ${p} / ${t}`;
  }
  return `Págs. ${p}–${Math.min(t, p + 1)} / ${t}`;
}

export function computePdfRenderParams({
  containerWidth,
  containerHeight,
  pageWidth,
  pageHeight,
  devicePixelRatio = 1,
  fullscreen = false,
  zoom = 1,
}) {
  const cw = Number.isFinite(containerWidth) && containerWidth > 0 ? containerWidth : 400;
  const ch = Number.isFinite(containerHeight) && containerHeight > 0 ? containerHeight : 600;
  const pw = Number.isFinite(pageWidth) && pageWidth > 0 ? pageWidth : 595;
  const ph = Number.isFinite(pageHeight) && pageHeight > 0 ? pageHeight : 842;
  const dprInput = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;

  const fitScale = Math.min(cw / pw, ch / ph);
  const clampedZoom = clampReaderZoom(zoom);
  const effectiveDpr =
    fullscreen || clampedZoom > 1
      ? Math.min(Math.max(dprInput, 2), 3)
      : Math.min(Math.max(dprInput, 1), 1.75);

  const cssWidth = Math.max(1, Math.floor(pw * fitScale * clampedZoom));
  const cssHeight = Math.max(1, Math.floor(ph * fitScale * clampedZoom));
  const renderScale = fitScale * clampedZoom * effectiveDpr;

  return {
    fitScale,
    zoom: clampedZoom,
    effectiveDpr,
    renderScale,
    cssWidth,
    cssHeight,
  };
}
