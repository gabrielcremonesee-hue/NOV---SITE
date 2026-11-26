import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_MODULE_KEYS,
  ASSESSMENT_BANK_VERSION,
  PASSING_SCORE_PERCENT,
  computeCourseWorkloadLabel,
  formatWorkloadFromMinutes,
  getModuleQuestions,
  gradeAssessment,
  resolveCourseWorkload,
} from './assessments';
import { carbonaraTechSheet } from './courseData';
import { extraRecipes } from './recipesData';

test('gradeAssessment preserves 70% passing threshold for all modules', () => {
  assert.equal(PASSING_SCORE_PERCENT, 70);
  assert.ok(ASSESSMENT_BANK_VERSION.length > 0);

  for (const modKey of ALL_MODULE_KEYS) {
    const bank = getModuleQuestions(modKey, 'exam');
    assert.ok(bank && bank.length === 8, `Expected 8 exam questions for ${modKey}`);

    // 6 of 8 correct = 75% >= 70% -> approved
    const answersPass = bank.map((q, idx) => (idx < 6 ? q.correct : (q.correct + 1) % 4));
    const resPass = gradeAssessment(modKey, 'exam', answersPass);
    assert.equal(resPass.ok, true);
    assert.equal(resPass.score, 75);
    assert.equal(resPass.passed, true);

    // 5 of 8 correct = 63% < 70% -> not approved
    const answersFail = bank.map((q, idx) => (idx < 5 ? q.correct : (q.correct + 1) % 4));
    const resFail = gradeAssessment(modKey, 'exam', answersFail);
    assert.equal(resFail.ok, true);
    assert.equal(resFail.score, 63);
    assert.equal(resFail.passed, false);
  }
});

test('all 6 modules have independent work (6) and exam (8) banks without duplicates, invalid options, or predictable answer patterns', () => {
  for (const modKey of ALL_MODULE_KEYS) {
    const work = getModuleQuestions(modKey, 'work');
    const exam = getModuleQuestions(modKey, 'exam');
    assert.ok(work && work.length === 6, `Expected 6 work questions for ${modKey}`);
    assert.ok(exam && exam.length === 8, `Expected 8 exam questions for ${modKey}`);

    const seenWorkQ = new Set<string>();
    const seenExamQ = new Set<string>();

    work.forEach((q, idx) => {
      const normalizedQ = q.q.trim().toLowerCase();
      assert.ok(normalizedQ.length > 10, `Empty work prompt in ${modKey}[${idx}]`);
      assert.equal(seenWorkQ.has(normalizedQ), false, `Duplicate work question in ${modKey}[${idx}]`);
      seenWorkQ.add(normalizedQ);

      assert.equal(q.a.length, 4, `Expected 4 options in ${modKey} work[${idx}]`);
      const uniqueOpts = new Set(q.a.map((opt) => opt.trim().toLowerCase()));
      assert.equal(uniqueOpts.size, 4, `Duplicate option detected in ${modKey} work[${idx}]`);
      assert.ok(
        Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4,
        `Invalid correct index in ${modKey} work[${idx}]`
      );
      assert.ok(q.why.trim().length > 10 && q.tip.trim().length > 5);
    });

    exam.forEach((q, idx) => {
      const normalizedQ = q.q.trim().toLowerCase();
      assert.ok(normalizedQ.length > 10, `Empty exam prompt in ${modKey}[${idx}]`);
      assert.equal(seenExamQ.has(normalizedQ), false, `Duplicate exam question in ${modKey}[${idx}]`);
      assert.equal(
        seenWorkQ.has(normalizedQ),
        false,
        `Exam question overlaps with work question in ${modKey}[${idx}]`
      );
      seenExamQ.add(normalizedQ);

      assert.equal(q.a.length, 4, `Expected 4 options in ${modKey} exam[${idx}]`);
      const uniqueOpts = new Set(q.a.map((opt) => opt.trim().toLowerCase()));
      assert.equal(uniqueOpts.size, 4, `Duplicate option detected in ${modKey} exam[${idx}]`);
      assert.ok(
        Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4,
        `Invalid correct index in ${modKey} exam[${idx}]`
      );
      assert.ok(q.why.trim().length > 10 && q.tip.trim().length > 5);
    });

    // Reject all-zero or strict i % 4 patterns
    const workAllZero = work.every((q) => q.correct === 0);
    const workModulo4 = work.every((q, i) => q.correct === i % 4);
    assert.equal(workAllZero, false, `Predictable all-zero pattern in ${modKey} work`);
    assert.equal(workModulo4, false, `Predictable i%4 pattern in ${modKey} work`);

    const examAllZero = exam.every((q) => q.correct === 0);
    const examModulo4 = exam.every((q, i) => q.correct === i % 4);
    assert.equal(examAllZero, false, `Predictable all-zero pattern in ${modKey} exam`);
    assert.equal(examModulo4, false, `Predictable i%4 pattern in ${modKey} exam`);
  }
});

test('all 6 modules carry complete technical sheets and corrected gastronomic specifications', () => {
  const sheets = [carbonaraTechSheet, ...extraRecipes.map((r) => r.techSheet)];
  assert.equal(sheets.length, 6);

  for (const sheet of sheets) {
    assert.ok(sheet.originalName.length > 0);
    assert.ok(sheet.portugueseExplanation.length > 10);
    assert.ok(sheet.region.length > 0);
    assert.ok(sheet.yield.length > 0);
    assert.ok(sheet.portionQuantity.length > 0);
    assert.ok(sheet.prepTime.length > 0);
    assert.ok(sheet.cookTime.length > 0);
    assert.ok(sheet.totalEstimatedTime.length > 0);
    assert.ok(sheet.workloadDistinction.length > 10);
    assert.ok(sheet.utensils.length >= 3);
    assert.ok(sheet.miseEnPlace.length >= 2);
    assert.ok(sheet.detailedSteps.length >= 6);
    assert.ok(sheet.techniques.length >= 3);
    assert.ok(sheet.controlPoints.length >= 3);
    assert.ok(sheet.expectedResult.length > 10);
    assert.ok(sheet.errorsAndFixes.length >= 3);
    assert.ok(sheet.chefTips.length >= 1);
    assert.ok(sheet.allergens.length > 10);
    assert.ok(sheet.conservation.length > 10);
    assert.ok(sheet.references.length >= 2);
    assert.ok(sheet.didacticAdaptations.length > 10);
    assert.ok(sheet.practicalValidationStatus.length > 10);
  }

  const alfredo = extraRecipes.find((r) => r.id === 'alfredo')!;
  assert.ok(alfredo.ingredients.some((i) => i.includes('100 g de manteiga')));
  assert.ok(alfredo.ingredients.some((i) => i.includes('240 g de Parmigiano-Reggiano')));

  const pesto = extraRecipes.find((r) => r.id === 'pesto')!;
  assert.equal(pesto.steps.length, 10);
  assert.ok(pesto.ingredients.some((i) => i.includes('60 g de folhas de manjericão')));
  assert.ok(pesto.ingredients.some((i) => i.includes('50 g de Parmigiano-Reggiano')));
  assert.ok(pesto.ingredients.some((i) => i.includes('25 g de Pecorino Sardo')));
  assert.ok(pesto.ingredients.some((i) => i.includes('70 ml de azeite')));
});

test('gradeAssessment rejects incomplete or out-of-range answers', () => {
  const incomplete = gradeAssessment('carbonara', 'exam', [0, 1, 2]);
  assert.equal(incomplete.ok, false);

  const invalidChoice = gradeAssessment('carbonara', 'exam', [0, 0, 0, 0, 0, 0, 0, 99]);
  assert.equal(invalidChoice.ok, false);

  const invalidModule = gradeAssessment('unknown', 'exam', [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(invalidModule.ok, false);
});

test('formatWorkloadFromMinutes and computeCourseWorkloadLabel convert exact minutes without undue rounding', () => {
  assert.equal(formatWorkloadFromMinutes(120), '2 horas');
  assert.equal(formatWorkloadFromMinutes(180), '3 horas');
  assert.equal(formatWorkloadFromMinutes(240), '4 horas');
  assert.equal(formatWorkloadFromMinutes(90), '1 hora e 30 minutos');
  assert.equal(formatWorkloadFromMinutes(60), '1 hora');
  assert.equal(formatWorkloadFromMinutes(45), '45 minutos');

  const dbDurations = ['25–30 min', '25–35 min', '30–40 min', '20–30 min', '90–120 min', '20–30 min'];
  assert.equal(computeCourseWorkloadLabel(dbDurations), '4 horas e 8 minutos');
  assert.equal(computeCourseWorkloadLabel(['45 min']), '45 minutos');
  assert.equal(computeCourseWorkloadLabel(['1 hora']), '1 hora');
});

test('resolveCourseWorkload prioritizes course/module explicit estimated_minutes over duration labels', () => {
  const fromCourse = resolveCourseWorkload({
    courseRecord: { estimated_minutes: 90 },
    modules: [{ duration_label: '30 min' }],
  });
  assert.equal(fromCourse.totalMinutes, 90);
  assert.equal(fromCourse.workloadLabel, '1 hora e 30 minutos');

  const fromModules = resolveCourseWorkload({
    courseRecord: {},
    modules: [{ estimated_minutes: 60 }, { estimated_minutes: 60 }],
  });
  assert.equal(fromModules.totalMinutes, 120);
  assert.equal(fromModules.workloadLabel, '2 horas');
});
