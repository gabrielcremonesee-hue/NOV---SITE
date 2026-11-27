import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeCheckedMap,
  toggleIngredientCheck,
  resetIngredientChecks,
  getIngredientChecklistProgress,
  categorizeIngredient,
  toggleIngredientCategory,
  sortIngredientsForChecklist,
} from './ingredients.js';

test('toggleIngredientCheck toggles valid ingredient indices and ignores out-of-range indices', () => {
  let map = {};
  map = toggleIngredientCheck(map, 0, 3);
  assert.deepEqual(map, { 0: true });

  map = toggleIngredientCheck(map, 2, 3);
  assert.deepEqual(map, { 0: true, 2: true });

  map = toggleIngredientCheck(map, 0, 3);
  assert.deepEqual(map, { 2: true });

  map = toggleIngredientCheck(map, 9, 3);
  assert.deepEqual(map, { 2: true });
});

test('sanitizeCheckedMap removes stale indices when ingredients shrink', () => {
  const sanitized = sanitizeCheckedMap({ 0: true, 1: true, 4: true }, 2);
  assert.deepEqual(sanitized, { 0: true, 1: true });
});

test('getIngredientChecklistProgress computes counts, percentage, and allReady state', () => {
  const ings = ['Farinha', 'Ovos', 'Sal'];
  assert.deepEqual(getIngredientChecklistProgress(ings, {}), {
    total: 3,
    checked: 0,
    pct: 0,
    allReady: false,
  });

  assert.deepEqual(getIngredientChecklistProgress(ings, { 0: true, 2: true }), {
    total: 3,
    checked: 2,
    pct: 67,
    allReady: false,
  });

  assert.deepEqual(getIngredientChecklistProgress(ings, { 0: true, 1: true, 2: true }), {
    total: 3,
    checked: 3,
    pct: 100,
    allReady: true,
  });

  assert.deepEqual(getIngredientChecklistProgress(ings, resetIngredientChecks()), {
    total: 3,
    checked: 0,
    pct: 0,
    allReady: false,
  });
});

test('categorizeIngredient distinguishes pantry staples from fresh ingredients', () => {
  assert.equal(categorizeIngredient('400g de espaguete'), 'pantry');
  assert.equal(categorizeIngredient('Pimenta-do-reino moída na hora'), 'pantry');
  assert.equal(categorizeIngredient('Molho de tomate rústico'), 'pantry');
  assert.equal(categorizeIngredient('150g de pancetta em cubos'), 'fresh');
  assert.equal(categorizeIngredient('4 gemas e 1 ovo inteiro'), 'fresh');
  assert.equal(categorizeIngredient('250g de ricota fresca'), 'fresh');
  assert.equal(categorizeIngredient('Manjericão e ervas frescas'), 'fresh');
  assert.equal(categorizeIngredient('400g de espaguete', 'fresh'), 'fresh');
});

test('sortIngredientsForChecklist orders by pantry-first or fresh-first while preserving originalIndex', () => {
  const ings = [
    '150g de pancetta em cubos',
    '400g de espaguete',
    '4 gemas e 1 ovo inteiro',
    'Pimenta-do-reino moída',
  ];

  const pantryFirst = sortIngredientsForChecklist(ings, 'pantry-first');
  assert.deepEqual(
    pantryFirst.map((x) => [x.originalIndex, x.category]),
    [
      [1, 'pantry'],
      [3, 'pantry'],
      [0, 'fresh'],
      [2, 'fresh'],
    ],
  );

  const freshFirst = sortIngredientsForChecklist(ings, 'fresh-first');
  assert.deepEqual(
    freshFirst.map((x) => [x.originalIndex, x.category]),
    [
      [0, 'fresh'],
      [2, 'fresh'],
      [1, 'pantry'],
      [3, 'pantry'],
    ],
  );

  const overrides = toggleIngredientCategory({}, 1, 'pantry', ings.length);
  const afterOverride = sortIngredientsForChecklist(ings, 'pantry-first', overrides);
  assert.equal(afterOverride[0].originalIndex, 3);
  assert.equal(afterOverride.find((x) => x.originalIndex === 1).category, 'fresh');
});
