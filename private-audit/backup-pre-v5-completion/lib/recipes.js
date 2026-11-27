export const RECIPE_QUICK_CATEGORIES = [
  { id: 'all', label: 'Todas', icon: '🍽️' },
  { id: 'massas', label: 'Massas', icon: '🍝' },
  { id: 'molhos', label: 'Molhos', icon: '🥣' },
  { id: 'recheios', label: 'Recheios', icon: '🥟' },
  { id: 'frescas', label: 'Massas Frescas', icon: '🌾' },
  { id: 'favoritas', label: 'Favoritas', icon: '★' },
  { id: 'praticadas', label: 'Praticadas', icon: '✓' },
];

export const EXPLICIT_RECIPE_CATEGORIES = ['massas', 'molhos', 'recheios', 'frescas'];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function getRecipeCategories(recipe, practicedIds = []) {
  const r = recipe || {};
  const titleAndDesc = normalizeText(`${r.name || ''} ${r.description || ''}`);
  const ingText = normalizeText(Array.isArray(r.ingredients) ? r.ingredients.join(' ') : '');
  const fullText = `${titleAndDesc} ${ingText}`.trim();
  const categories = new Set();

  if (EXPLICIT_RECIPE_CATEGORIES.includes(r.category)) {
    categories.add(r.category);
  }

  // Massas (geral)
  if (
    /\b(massa|espaguete|spaghetti|fettuccine|tagliatelle|pappardelle|tagliolini|pici|orecchiette|cavatelli|strozzapreti|maltagliati|gnocchi|nhoque|ravioli|tortelloni|cappelletti|lasagn[ae]|macarrao|penne|rigatoni|fusilli)\b/.test(
      fullText,
    )
  ) {
    categories.add('massas');
  }

  // Molhos (focando em receitas cujo título/descrição destaca molho ou técnica de molho)
  if (
    /\b(molho|ragu|pesto|sugo|alfredo|bechamel|bolonhesa|bolognese|puttanesca|amatriciana|pomodoro|arrabbiata|cacio|emulsao|cremoso)\b/.test(
      titleAndDesc,
    ) ||
    /\b(molho|ragu|pesto|bechamel|sugo)\b/.test(normalizeText(r.name || ''))
  ) {
    categories.add('molhos');
  }

  // Recheios (massas recheadas ou receitas de recheio)
  if (
    /\b(recheio|rechead[oa]s?|ravioli|tortelloni|tortellini|cappelletti|agnolotti|cannelloni|conchiglioni|lasagn[ae])\b/.test(
      titleAndDesc,
    )
  ) {
    categories.add('recheios');
  }

  // Massas Frescas (ingredientes/preparo com massa fresca ou laminada)
  if (/\b(fresc[oa]s?|laminada|ovos|semolina)\b/.test(fullText) && categories.has('massas')) {
    if (/\b(massa fresca|fettuccine fresco|laminada|tagliatelle fresco)\b/.test(fullText)) {
      categories.add('frescas');
    }
  }

  if (r.favorite) {
    categories.add('favoritas');
  }
  if (Array.isArray(practicedIds) && practicedIds.includes(r.id)) {
    categories.add('praticadas');
  }

  if (categories.size === 0) {
    categories.add('massas');
  }

  return Array.from(categories);
}

export function getPrimaryRecipeCategoryLabel(recipe, practicedIds = []) {
  const cats = getRecipeCategories(recipe, practicedIds);
  if (recipe?.category) {
    const found = RECIPE_QUICK_CATEGORIES.find((c) => c.id === recipe.category);
    if (found) return found.label;
  }
  if (cats.includes('recheios')) return 'Recheios';
  if (cats.includes('molhos')) return 'Molhos';
  if (cats.includes('frescas')) return 'Massas Frescas';
  return 'Massas';
}

export function filterRecipesByQuickJump(recipes, { search = '', category = 'all', practicedIds = [] } = {}) {
  const list = Array.isArray(recipes) ? recipes : [];
  const q = normalizeText(search);
  const cat = RECIPE_QUICK_CATEGORIES.some((c) => c.id === category) ? category : 'all';

  return list.filter((r) => {
    if (q) {
      const hay = normalizeText(`${r.name || ''} ${r.description || ''} ${(r.ingredients || []).join(' ')}`);
      if (!hay.includes(q)) return false;
    }
    if (cat === 'all') return true;
    return getRecipeCategories(r, practicedIds).includes(cat);
  });
}

export function getQuickJumpCounts(recipes, { search = '', practicedIds = [] } = {}) {
  const list = Array.isArray(recipes) ? recipes : [];
  const q = normalizeText(search);
  const searchMatched = q
    ? list.filter((r) =>
        normalizeText(`${r.name || ''} ${r.description || ''} ${(r.ingredients || []).join(' ')}`).includes(q),
      )
    : list;

  const counts = {};
  for (const cat of RECIPE_QUICK_CATEGORIES) {
    if (cat.id === 'all') {
      counts.all = searchMatched.length;
    } else {
      counts[cat.id] = searchMatched.filter((r) => getRecipeCategories(r, practicedIds).includes(cat.id)).length;
    }
  }
  return counts;
}
