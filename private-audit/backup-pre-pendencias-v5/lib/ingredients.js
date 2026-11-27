export function sanitizeCheckedMap(checkedMap, totalIngredients) {
  const count = Math.max(0, Number.parseInt(totalIngredients, 10) || 0);
  const next = {};
  if (!checkedMap || typeof checkedMap !== 'object' || count === 0) return next;
  for (let i = 0; i < count; i++) {
    if (checkedMap[i] === true || checkedMap[String(i)] === true) {
      next[i] = true;
    }
  }
  return next;
}

export function toggleIngredientCheck(checkedMap, index, totalIngredients) {
  const idx = Number.parseInt(index, 10);
  const count = Math.max(0, Number.parseInt(totalIngredients, 10) || 0);
  const clean = sanitizeCheckedMap(checkedMap, count);
  if (!Number.isInteger(idx) || idx < 0 || idx >= count) return clean;
  if (clean[idx]) {
    delete clean[idx];
  } else {
    clean[idx] = true;
  }
  return clean;
}

export function resetIngredientChecks() {
  return {};
}

export function getIngredientChecklistProgress(ingredients, checkedMap) {
  const list = Array.isArray(ingredients) ? ingredients : [];
  const total = list.length;
  if (total === 0) {
    return { total: 0, checked: 0, pct: 0, allReady: false };
  }
  const clean = sanitizeCheckedMap(checkedMap, total);
  const checked = Object.keys(clean).length;
  const pct = Math.round((checked / total) * 100);
  return {
    total,
    checked,
    pct,
    allReady: checked === total,
  };
}

export const INGREDIENT_SORT_MODES = ['default', 'pantry-first', 'fresh-first'];

const PANTRY_PATTERNS = [
  'molho de tomate',
  'extrato',
  'passata',
  'espaguete',
  'spaghetti',
  'macarr',
  'farinha',
  'semolina',
  'trigo',
  'azeite',
  'oleo',
  'vinagre',
  'pimenta',
  'sal ',
  ' sal',
  'acucar',
  'fermento',
  'noz-moscada',
  'oregano',
  'paprica',
  'grao-de-bico',
  'azeitona',
  'caldo',
  'vinho',
  'agua',
  'flour',
  'salt',
  'pepper',
  'olive oil',
  'oil',
  'sugar',
  'dry',
  'seco',
  'seca',
  'pantry',
];

const FRESH_PATTERNS = [
  'fresc',
  'ovo',
  'gema',
  'clara',
  'queijo',
  'parmes',
  'pecorino',
  'ricota',
  'mussarela',
  'mozzarella',
  'burrata',
  'manteiga',
  'creme de leite',
  'leite',
  'nata',
  'pancetta',
  'guanciale',
  'bacon',
  'presunto',
  'carne',
  'frango',
  'peixe',
  'camar',
  'manjeric',
  'erva',
  'salsa',
  'salvia',
  'cebolinha',
  'coentro',
  'alecrim',
  'tomilho',
  'tomate',
  'alho',
  'cebola',
  'limao',
  'batata',
  'abobora',
  'espinafre',
  'brocolis',
  'cogumelo',
  'abobrinha',
  'legume',
  'fruta',
  'massa fresca',
  'folha',
  'fresh',
  'egg',
  'cheese',
  'butter',
  'herb',
  'basil',
  'meat',
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function categorizeIngredient(text, overrideCategory) {
  if (overrideCategory === 'pantry' || overrideCategory === 'fresh') {
    return overrideCategory;
  }
  const normalized = normalizeText(text);
  if (!normalized) return 'pantry';

  // Specific pantry sauces/condiments that contain fresh ingredient words (e.g. "molho de tomate")
  if (
    normalized.includes('molho de tomate') ||
    normalized.includes('extrato de tomate') ||
    normalized.includes('passata')
  ) {
    return 'pantry';
  }

  for (const kw of FRESH_PATTERNS) {
    if (normalized.includes(kw)) return 'fresh';
  }
  for (const kw of PANTRY_PATTERNS) {
    if (normalized.includes(kw)) return 'pantry';
  }
  return 'pantry';
}

export function sanitizeCategoryMap(categoryMap, totalIngredients) {
  const count = Math.max(0, Number.parseInt(totalIngredients, 10) || 0);
  const next = {};
  if (!categoryMap || typeof categoryMap !== 'object' || count === 0) return next;
  for (let i = 0; i < count; i++) {
    const val = categoryMap[i] ?? categoryMap[String(i)];
    if (val === 'pantry' || val === 'fresh') {
      next[i] = val;
    }
  }
  return next;
}

export function toggleIngredientCategory(categoryMap, index, currentCategory, totalIngredients) {
  const idx = Number.parseInt(index, 10);
  const count = Math.max(0, Number.parseInt(totalIngredients, 10) || 0);
  const clean = sanitizeCategoryMap(categoryMap, count);
  if (!Number.isInteger(idx) || idx < 0 || idx >= count) return clean;
  clean[idx] = currentCategory === 'fresh' ? 'pantry' : 'fresh';
  return clean;
}

export function sortIngredientsForChecklist(ingredients, sortMode = 'default', categoryOverrides = {}) {
  const list = Array.isArray(ingredients) ? ingredients : [];
  const mode = INGREDIENT_SORT_MODES.includes(sortMode) ? sortMode : 'default';
  const items = list.map((text, originalIndex) => {
    const override = categoryOverrides?.[originalIndex] ?? categoryOverrides?.[String(originalIndex)];
    return {
      text,
      originalIndex,
      category: categorizeIngredient(text, override),
    };
  });

  if (mode === 'default') return items;

  const firstCat = mode === 'fresh-first' ? 'fresh' : 'pantry';
  return items.slice().sort((a, b) => {
    if (a.category === b.category) return a.originalIndex - b.originalIndex;
    return a.category === firstCat ? -1 : 1;
  });
}
