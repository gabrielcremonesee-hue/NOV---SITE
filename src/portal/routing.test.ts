import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSiteStylesheetDescriptor,
  resolveInitialEnvironment,
} from './routing';

test('resolveInitialEnvironment defaults directly to main portal (site) on root path', () => {
  assert.deepEqual(resolveInitialEnvironment('', ''), {
    env: 'site',
    libraryEntry: 'default',
  });
  assert.deepEqual(resolveInitialEnvironment('', '#/'), {
    env: 'site',
    libraryEntry: 'default',
  });
  assert.deepEqual(resolveInitialEnvironment('?autostart=portal', ''), {
    env: 'site',
    libraryEntry: 'default',
  });
});

test('resolveInitialEnvironment honors autostart parameters for testing and deep links', () => {
  assert.deepEqual(resolveInitialEnvironment('?autostart=site', ''), {
    env: 'site',
    libraryEntry: 'default',
  });
  assert.deepEqual(resolveInitialEnvironment('?autostart=1', ''), {
    env: 'library',
    libraryEntry: 'demo',
  });
  assert.deepEqual(resolveInitialEnvironment('?autostart=auth', ''), {
    env: 'library',
    libraryEntry: 'auth',
  });
});

test('resolveInitialEnvironment opens Site directly for Site deep hash routes and memorial query', () => {
  assert.deepEqual(resolveInitialEnvironment('', '#/pagamentos'), {
    env: 'site',
    libraryEntry: 'default',
  });
  assert.deepEqual(resolveInitialEnvironment('', '#/memorial/massas-italianas'), {
    env: 'site',
    libraryEntry: 'default',
  });
  assert.deepEqual(resolveInitialEnvironment('?memorial=massas-italianas', ''), {
    env: 'site',
    libraryEntry: 'default',
  });
});

test('isSiteStylesheetDescriptor isolates Vite/Site CSS without disabling portal, library, maplibre, or font stylesheets', () => {
  assert.equal(
    isSiteStylesheetDescriptor({
      tagName: 'LINK',
      id: 'fervec-portal-css',
      rel: 'stylesheet',
      href: '/portal.css',
    }),
    false
  );
  assert.equal(
    isSiteStylesheetDescriptor({
      tagName: 'LINK',
      id: 'fervec-library-css',
      rel: 'stylesheet',
      href: '/library-styles.css',
    }),
    false
  );
  assert.equal(
    isSiteStylesheetDescriptor({
      tagName: 'LINK',
      id: 'fervec-maplibre-css',
      rel: 'stylesheet',
      href: '/vendor/maplibre-gl/maplibre-gl.css',
    }),
    false
  );
  assert.equal(
    isSiteStylesheetDescriptor({
      tagName: 'LINK',
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=DM+Sans',
    }),
    false
  );
  assert.equal(
    isSiteStylesheetDescriptor({
      tagName: 'STYLE',
      viteDevId: '/app/applet/src/styles/fervec.css',
      textContent: 'body { background: #eed6ad; }',
    }),
    true
  );
  assert.equal(
    isSiteStylesheetDescriptor({
      tagName: 'LINK',
      rel: 'stylesheet',
      href: '/assets/index-Abc123.css',
    }),
    true
  );
  assert.equal(
    isSiteStylesheetDescriptor({
      tagName: 'STYLE',
      textContent: '@layer theme { :root { --coffee: #382F29; } }',
    }),
    true
  );
});

