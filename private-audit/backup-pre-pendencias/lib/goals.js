export function getTodayKey(now = Date.now()) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysToKey(dateKey, deltaDays) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function defaultDailyGoals() {
  return [
    { id: 'goal-read', title: 'Ler páginas do e-book', target: 3, current: 0, unit: 'páginas', custom: false },
    { id: 'goal-practice', title: 'Praticar uma receita ou técnica', target: 1, current: 0, unit: 'prática', custom: false },
    { id: 'goal-note', title: 'Registrar anotação no caderno', target: 1, current: 0, unit: 'anotação', custom: false },
  ];
}

export function normalizeDailyState(raw, todayKey = getTodayKey()) {
  const baseGoals = Array.isArray(raw?.goals) && raw.goals.length
    ? raw.goals.map((g) => ({
        id: String(g.id || `goal-${Math.random().toString(36).slice(2, 8)}`),
        title: String(g.title || 'Meta diária').trim() || 'Meta diária',
        target: Math.max(1, Math.min(99, Number.parseInt(g.target, 10) || 1)),
        current: Math.max(0, Number.parseInt(g.current, 10) || 0),
        unit: String(g.unit || 'vez').trim() || 'vez',
        custom: Boolean(g.custom),
      }))
    : defaultDailyGoals();

  if (raw?.date === todayKey) {
    return {
      date: todayKey,
      streak: Math.max(0, Number.parseInt(raw?.streak, 10) || 0),
      lastCompletedDate: raw?.lastCompletedDate || null,
      goals: baseGoals.map((g) => ({ ...g, current: Math.min(g.target, g.current) })),
    };
  }

  const yesterday = addDaysToKey(todayKey, -1);
  const lastDone = raw?.lastCompletedDate || null;
  const keepStreak = lastDone === yesterday || lastDone === todayKey;

  return {
    date: todayKey,
    streak: keepStreak ? Math.max(0, Number.parseInt(raw?.streak, 10) || 0) : 0,
    lastCompletedDate: lastDone,
    goals: baseGoals.map((g) => ({ ...g, current: 0 })),
  };
}

function finalizeStreak(state, goals, todayKey) {
  const completedCount = goals.filter((g) => g.current >= g.target).length;
  const allDone = goals.length > 0 && completedCount === goals.length;
  if (allDone && state.lastCompletedDate !== todayKey) {
    const yesterday = addDaysToKey(todayKey, -1);
    const nextStreak = state.lastCompletedDate === yesterday ? (state.streak || 0) + 1 : 1;
    return {
      ...state,
      date: todayKey,
      streak: nextStreak,
      lastCompletedDate: todayKey,
      goals,
    };
  }
  return {
    ...state,
    date: todayKey,
    goals,
  };
}

export function incrementDailyGoal(rawState, goalId, delta = 1, todayKey = getTodayKey()) {
  const state = normalizeDailyState(rawState, todayKey);
  const goals = state.goals.map((g) => {
    if (g.id !== goalId) return g;
    const nextVal = Math.max(0, Math.min(g.target, g.current + delta));
    return { ...g, current: nextVal };
  });
  return finalizeStreak(state, goals, todayKey);
}

export function toggleDailyGoal(rawState, goalId, todayKey = getTodayKey()) {
  const state = normalizeDailyState(rawState, todayKey);
  const goals = state.goals.map((g) => {
    if (g.id !== goalId) return g;
    return { ...g, current: g.current >= g.target ? 0 : g.target };
  });
  return finalizeStreak(state, goals, todayKey);
}

export function addDailyGoal(rawState, { id, title, target = 1, unit = 'vez' }, todayKey = getTodayKey()) {
  const state = normalizeDailyState(rawState, todayKey);
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return state;
  const cleanTarget = Math.max(1, Math.min(99, Number.parseInt(target, 10) || 1));
  const cleanUnit = String(unit || '').trim() || (cleanTarget === 1 ? 'vez' : 'vezes');
  const nextGoal = {
    id: id || `goal-${Date.now().toString(36)}`,
    title: cleanTitle.slice(0, 80),
    target: cleanTarget,
    current: 0,
    unit: cleanUnit.slice(0, 20),
    custom: true,
  };
  return {
    ...state,
    goals: [...state.goals, nextGoal],
  };
}

export function removeDailyGoal(rawState, goalId, todayKey = getTodayKey()) {
  const state = normalizeDailyState(rawState, todayKey);
  return {
    ...state,
    goals: state.goals.filter((g) => g.id !== goalId),
  };
}

export function getDailyGoalsSummary(rawState, todayKey = getTodayKey()) {
  const state = normalizeDailyState(rawState, todayKey);
  const total = state.goals.length;
  const completed = state.goals.filter((g) => g.current >= g.target).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return {
    date: state.date,
    total,
    completed,
    pct,
    streak: state.streak,
    allDone: total > 0 && completed === total,
  };
}

export function getCircularProgressMetrics(pct, radius = 26) {
  const safePct = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  const r = Math.max(4, Number(radius) || 26);
  const circumference = Number((2 * Math.PI * r).toFixed(2));
  const dashOffset = Number((circumference * (1 - safePct / 100)).toFixed(2));
  return {
    pct: safePct,
    radius: r,
    circumference,
    dashOffset,
    isComplete: safePct === 100,
  };
}

function csvCell(value) {
  const str = String(value ?? '').replace(/\r?\n/g, ' ');
  if (/[;"\n,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function recipesToCsv(recipes, practicedIds = []) {
  const practicedSet = new Set(Array.isArray(practicedIds) ? practicedIds : []);
  const header = ['Nome', 'Descrição', 'Porções', 'Tempo', 'Favorita', 'Praticada', 'Ingredientes'];
  const rows = (Array.isArray(recipes) ? recipes : []).map((r) => [
    r.name || '',
    r.description || '',
    r.servings || '',
    r.time || '',
    r.favorite ? 'Sim' : 'Não',
    practicedSet.has(r.id) ? 'Sim' : 'Não',
    Array.isArray(r.ingredients) ? r.ingredients.join(' | ') : '',
  ]);
  return '\uFEFF' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
}
