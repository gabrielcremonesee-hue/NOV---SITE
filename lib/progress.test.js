import test from 'node:test';
import assert from 'node:assert/strict';
import { EBOOK_CHAPTERS, computeChapterProgress, computeEvolutionSummary } from './progress.js';

test('EBOOK_CHAPTERS covers all 74 pages continuously', () => {
  assert.equal(EBOOK_CHAPTERS[0].start, 1);
  assert.equal(EBOOK_CHAPTERS[EBOOK_CHAPTERS.length - 1].end, 74);
  const total = EBOOK_CHAPTERS.reduce((acc, ch) => acc + (ch.end - ch.start + 1), 0);
  assert.equal(total, 74);
});

test('computeChapterProgress calculates unique pages read per chapter', () => {
  const chapters = computeChapterProgress([1, 2, 12, 12, 13, 49]);
  assert.equal(chapters[0].read, 2);
  assert.equal(chapters[0].total, 11);
  assert.equal(chapters[1].read, 2);
  assert.equal(chapters[4].read, 1);
});

test('computeEvolutionSummary aggregates overall reading, study, and practice metrics', () => {
  const sum = computeEvolutionSummary({
    visited: [1, 2, 3, 4, 5, 6, 7],
    totalPages: 74,
    completed: [7, 8, 9],
    practiced: ['rec-carbonara'],
    recipesCount: 3,
    bookmarksCount: 2,
    notesCount: 4,
    reviewCount: 1,
    totalStudyTargets: 33,
  });
  assert.equal(sum.visitedUnique, 7);
  assert.equal(sum.bookPct, 9);
  assert.equal(sum.completedCount, 3);
  assert.equal(sum.practicedCount, 1);
  assert.ok(sum.overallScore > 0);
  assert.equal(sum.chapters.length, 6);
});
