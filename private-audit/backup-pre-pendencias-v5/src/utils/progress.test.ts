import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadProgress,
  saveProgress,
  clearProgress,
  isMicroDone,
  setMicroDone,
  setActiveProgressScope,
} from './progress';
import { getIngredientsForModuleStage } from '../data/ingredientsCatalog';

function installMockLocalStorage() {
  const store: Record<string, string> = {};
  const methods = {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      for (const k of Object.keys(store)) delete store[k];
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
  const proxy = new Proxy(store, {
    get(target, prop) {
      if (typeof prop === 'string' && prop in methods) {
        return (methods as Record<string, unknown>)[prop];
      }
      return typeof prop === 'string' ? target[prop] : undefined;
    },
  }) as unknown as Storage;
  Object.defineProperty(globalThis, 'localStorage', {
    value: proxy,
    configurable: true,
    writable: true,
  });
  return proxy;
}

test('loadProgress returns clean defaults when storage is empty', () => {
  installMockLocalStorage();
  const state = loadProgress();
  assert.equal(state.stage, 0);
  assert.deepEqual(state.done, []);
  assert.equal(state.mise, false);
  assert.equal(state.examStatus, 'intro');
  assert.equal(state.voiceVolume, 0.82);
});

test('saveProgress and loadProgress roundtrip state and clearProgress resets it', () => {
  installMockLocalStorage();
  const state = loadProgress();
  state.stage = 3;
  state.done = [0, 1, 2];
  state.mise = true;
  assert.equal(saveProgress(state), true);

  const loaded = loadProgress();
  assert.equal(loaded.stage, 3);
  assert.deepEqual(loaded.done, [0, 1, 2]);
  assert.equal(loaded.mise, true);

  setMicroDone(1, 0, true);
  assert.equal(isMicroDone(1, 0), true);

  assert.equal(clearProgress(), true);
  assert.equal(isMicroDone(1, 0), false);
  assert.equal(loadProgress().stage, 0);
});

test('loadProgress and clearProgress do not collide with Biblioteca fervec-demo-v1 storage', () => {
  const store = installMockLocalStorage();
  const librarySentinel = JSON.stringify({ lastPage: 12, bookmarks: [{ page: 5 }] });
  store.setItem('fervec-demo-v1', librarySentinel);

  const state = loadProgress();
  assert.equal(state.stage, 0);
  assert.equal(store.getItem('fervec-demo-v1'), librarySentinel);

  clearProgress();
  assert.equal(store.getItem('fervec-demo-v1'), librarySentinel);
});

test('getIngredientsForModuleStage returns module-specific ingredients and safe fallbacks', () => {
  const carbonaraStage3 = getIngredientsForModuleStage('carbonara', 3);
  assert.deepEqual(
    carbonaraStage3.map((item) => item.id),
    ['ovos', 'gema', 'pecorino', 'pimenta']
  );

  const fallback = getIngredientsForModuleStage('unknown-module', 0);
  assert.ok(fallback.length > 0);
});

test('setActiveProgressScope isolates course progress across different users', () => {
  installMockLocalStorage();

  setActiveProgressScope('user-a');
  const stateA = loadProgress();
  stateA.done = [0, 1, 2, 3, 4, 5];
  stateA.lessonFinished = true;
  saveProgress(stateA);

  setActiveProgressScope('user-b');
  const stateB = loadProgress();
  assert.deepEqual(stateB.done, []);
  assert.equal(stateB.lessonFinished, false);

  setActiveProgressScope('user-a');
  assert.equal(loadProgress().lessonFinished, true);

  setActiveProgressScope(null);
});
