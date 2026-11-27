export const EBOOK_CHAPTERS = [
  { id: 'start', label: 'Base & Sova', start: 1, end: 11 },
  { id: 'science', label: 'Ingredientes', start: 12, end: 18 },
  { id: 'shapes', label: 'Formatos', start: 19, end: 33 },
  { id: 'sauces', label: 'Recheios & Molhos', start: 34, end: 46 },
  { id: 'recipes', label: '14 Receitas', start: 47, end: 62 },
  { id: 'mastery', label: 'Prática & Guia', start: 63, end: 74 },
];

export function computeChapterProgress(visitedPages = []) {
  const visitedSet = new Set(
    (Array.isArray(visitedPages) ? visitedPages : [])
      .map((n) => Number.parseInt(n, 10))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 74)
  );

  return EBOOK_CHAPTERS.map((ch) => {
    const total = ch.end - ch.start + 1;
    let read = 0;
    for (let p = ch.start; p <= ch.end; p++) {
      if (visitedSet.has(p)) read++;
    }
    const pct = total > 0 ? Math.round((read / total) * 100) : 0;
    return {
      ...ch,
      total,
      read,
      pct,
    };
  });
}

export function computeEvolutionSummary({
  visited = [],
  totalPages = 74,
  completed = [],
  practiced = [],
  recipesCount = 0,
  bookmarksCount = 0,
  notesCount = 0,
  reviewCount = 0,
  totalStudyTargets = 33,
} = {}) {
  const safeTotal = Math.max(1, Number(totalPages) || 74);
  const visitedUnique = new Set(
    (Array.isArray(visited) ? visited : []).filter((n) => Number.isFinite(Number(n)))
  ).size;
  const bookPct = Math.min(100, Math.round((visitedUnique / safeTotal) * 100));
  const completedCount = Array.isArray(completed) ? completed.length : 0;
  const studyPct = totalStudyTargets > 0 ? Math.min(100, Math.round((completedCount / totalStudyTargets) * 100)) : 0;
  const practicedCount = Array.isArray(practiced) ? practiced.length : 0;
  const practicePct = recipesCount > 0 ? Math.min(100, Math.round((practicedCount / recipesCount) * 100)) : 0;
  const overallScore = Math.round(bookPct * 0.5 + studyPct * 0.3 + practicePct * 0.2);

  return {
    visitedUnique,
    totalPages: safeTotal,
    bookPct,
    completedCount,
    studyPct,
    practicedCount,
    practicePct,
    bookmarksCount: Number(bookmarksCount) || 0,
    notesCount: Number(notesCount) || 0,
    reviewCount: Number(reviewCount) || 0,
    overallScore,
    chapters: computeChapterProgress(visited),
  };
}
