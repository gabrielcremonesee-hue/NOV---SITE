import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECIPE_QUICK_CATEGORIES,
  getRecipeCategories,
  getPrimaryRecipeCategoryLabel,
  filterRecipesByQuickJump,
  getQuickJumpCounts,
} from './recipes.js';

const sampleRecipes = [
  {
    id: 'rec-carbonara',
    name: 'Carbonara Clássica',
    description: 'Espaguete com ovos, queijo e pancetta.',
    favorite: true,
    ingredients: ['400g de espaguete', '150g de pancetta em cubos', '4 gemas e 1 ovo inteiro'],
  },
  {
    id: 'rec-ravioli',
    name: 'Ravioli de Ricota',
    description: 'Massa recheada com ricota e ervas.',
    favorite: true,
    ingredients: ['300g de massa fresca laminada', '250g de ricota fresca', 'Molho de tomate rústico'],
  },
  {
    id: 'rec-fettuccine',
    name: 'Fettuccine Alfredo',
    description: 'Massa ao molho cremoso de queijo.',
    favorite: false,
    ingredients: ['250g de fettuccine fresco', '60g de manteiga sem sal'],
  },
];

test('RECIPE_QUICK_CATEGORIES exposes Massas, Molhos, Recheios, and overview tabs', () => {
  const ids = RECIPE_QUICK_CATEGORIES.map((c) => c.id);
  assert.ok(ids.includes('all'));
  assert.ok(ids.includes('massas'));
  assert.ok(ids.includes('molhos'));
  assert.ok(ids.includes('recheios'));
});

test('getRecipeCategories distinguishes Massas, Molhos, Recheios, Favoritas, and Praticadas', () => {
  const carbonaraCats = getRecipeCategories(sampleRecipes[0], ['rec-carbonara']);
  assert.ok(carbonaraCats.includes('massas'));
  assert.ok(carbonaraCats.includes('favoritas'));
  assert.ok(carbonaraCats.includes('praticadas'));
  assert.ok(!carbonaraCats.includes('recheios'));

  const ravioliCats = getRecipeCategories(sampleRecipes[1], []);
  assert.ok(ravioliCats.includes('recheios'));
  assert.ok(ravioliCats.includes('massas'));
  assert.ok(ravioliCats.includes('frescas'));
  assert.equal(getPrimaryRecipeCategoryLabel(sampleRecipes[1]), 'Recheios');

  const alfredoCats = getRecipeCategories(sampleRecipes[2], []);
  assert.ok(alfredoCats.includes('molhos'));
  assert.ok(alfredoCats.includes('massas'));
  assert.ok(!alfredoCats.includes('favoritas'));
  assert.equal(getPrimaryRecipeCategoryLabel(sampleRecipes[2]), 'Molhos');
});

test('filterRecipesByQuickJump and getQuickJumpCounts compute matching recipes and category counts', () => {
  const recheios = filterRecipesByQuickJump(sampleRecipes, { category: 'recheios' });
  assert.deepEqual(
    recheios.map((r) => r.id),
    ['rec-ravioli'],
  );

  const molhos = filterRecipesByQuickJump(sampleRecipes, { category: 'molhos' });
  assert.deepEqual(
    molhos.map((r) => r.id),
    ['rec-fettuccine'],
  );

  const counts = getQuickJumpCounts(sampleRecipes, { practicedIds: ['rec-carbonara'] });
  assert.deepEqual(counts, {
    all: 3,
    massas: 3,
    molhos: 1,
    recheios: 1,
    frescas: 2,
    favoritas: 2,
    praticadas: 1,
  });

  const explicitRecipe = { id: 'custom-1', name: 'Sugo Básico', description: 'Preparo lento', category: 'molhos', ingredients: ['Tomate pelado'] };
  assert.ok(getRecipeCategories(explicitRecipe).includes('molhos'));
});
