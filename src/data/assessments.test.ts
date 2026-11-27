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
  resolveQuestionOptions,
} from './assessments';
import { carbonaraTechSheet, type TechnicalSheet } from './courseData';
import { extraRecipes } from './recipesData';
import { hydrateCourseStateFromWorkspace } from '../utils/supabase/courseSync';
import type { CourseState } from '../utils/progress';

function assertFullTechnicalSheet23Categories(sheet: TechnicalSheet, label: string) {
  // 1. originalName
  assert.ok(sheet.originalName.trim().length > 0, `${label}: missing originalName`);
  // 2. portugueseExplanation
  assert.ok(sheet.portugueseExplanation.trim().length > 10, `${label}: missing portugueseExplanation`);
  // 3. region
  assert.ok(sheet.region.trim().length > 0, `${label}: missing region`);
  // 4. yield
  assert.ok(sheet.yield.trim().length > 0, `${label}: missing yield`);
  // 5. portionQuantity (honest, never inventing commercial shelf/cooked weights)
  assert.ok(sheet.portionQuantity.trim().length > 10, `${label}: missing portionQuantity`);
  // 6. prepTime
  assert.ok(sheet.prepTime.trim().length > 0, `${label}: missing prepTime`);
  // 7. cookTime
  assert.ok(sheet.cookTime.trim().length > 0, `${label}: missing cookTime`);
  // 8. totalEstimatedTime + workloadDistinction
  assert.ok(sheet.totalEstimatedTime.trim().length > 0, `${label}: missing totalEstimatedTime`);
  assert.ok(sheet.workloadDistinction.trim().length > 10, `${label}: missing workloadDistinction`);
  // 9. difficulty
  assert.ok(sheet.difficulty.trim().length > 0, `${label}: missing difficulty`);
  // 10. ingredients
  assert.ok(Array.isArray(sheet.ingredients) && sheet.ingredients.length >= 3, `${label}: missing ingredients`);
  // 11. utensils
  assert.ok(Array.isArray(sheet.utensils) && sheet.utensils.length >= 3, `${label}: missing utensils`);
  // 12. miseEnPlace
  assert.ok(Array.isArray(sheet.miseEnPlace) && sheet.miseEnPlace.length >= 2, `${label}: missing miseEnPlace`);
  // 13. detailedSteps
  assert.ok(Array.isArray(sheet.detailedSteps) && sheet.detailedSteps.length >= 5, `${label}: missing detailedSteps`);
  // 14. techniques
  assert.ok(Array.isArray(sheet.techniques) && sheet.techniques.length >= 3, `${label}: missing techniques`);
  // 15. controlPoints
  assert.ok(Array.isArray(sheet.controlPoints) && sheet.controlPoints.length >= 3, `${label}: missing controlPoints`);
  // 16. expectedResult
  assert.ok(sheet.expectedResult.trim().length > 10, `${label}: missing expectedResult`);
  // 17. errorsAndFixes
  assert.ok(Array.isArray(sheet.errorsAndFixes) && sheet.errorsAndFixes.length >= 3, `${label}: missing errorsAndFixes`);
  // 18. chefTips
  assert.ok(Array.isArray(sheet.chefTips) && sheet.chefTips.length >= 1, `${label}: missing chefTips`);
  // 19. allergens
  assert.ok(sheet.allergens.trim().length > 10, `${label}: missing allergens`);
  // 20. conservation + foodSafetyNotes
  assert.ok(sheet.conservation.trim().length > 10, `${label}: missing conservation`);
  assert.ok(Array.isArray(sheet.foodSafetyNotes) && sheet.foodSafetyNotes.length >= 1, `${label}: missing foodSafetyNotes`);
  // 21. references
  assert.ok(
    Array.isArray(sheet.references) &&
      sheet.references.length >= 2 &&
      sheet.references.every((ref) => ref.label.trim().length > 0 && /^https?:\/\//.test(ref.url)),
    `${label}: invalid references`
  );
  // 22. didacticAdaptations
  assert.ok(sheet.didacticAdaptations.trim().length > 10, `${label}: missing didacticAdaptations`);
  // 23. practicalValidationStatus
  assert.ok(sheet.practicalValidationStatus.trim().length > 10, `${label}: missing practicalValidationStatus`);
}

test('gradeAssessment preserves 70% passing threshold and emits versioned snapshots for all modules', () => {
  assert.equal(PASSING_SCORE_PERCENT, 70);
  assert.equal(ASSESSMENT_BANK_VERSION, 'v2-2026-11');

  for (const modKey of ALL_MODULE_KEYS) {
    const bank = getModuleQuestions(modKey, 'exam');
    assert.ok(bank && bank.length === 8, `Expected 8 exam questions for ${modKey}`);

    // 6 of 8 correct = 75% >= 70% -> approved
    const answersPass = bank.map((q, idx) => (idx < 6 ? q.correct : (q.correct + 1) % 4));
    const resPass = gradeAssessment(modKey, 'exam', answersPass);
    assert.equal(resPass.ok, true);
    assert.equal(resPass.score, 75);
    assert.equal(resPass.passed, true);
    assert.equal(resPass.bankVersion, 'v2-2026-11');
    assert.equal(resPass.questionIds.length, 8);
    assert.equal(resPass.selectedOptionIds.length, 8);
    assert.equal(resPass.questionSnapshots.length, 8);

    // 5 of 8 correct = 63% < 70% -> not approved
    const answersFail = bank.map((q, idx) => (idx < 5 ? q.correct : (q.correct + 1) % 4));
    const resFail = gradeAssessment(modKey, 'exam', answersFail);
    assert.equal(resFail.ok, true);
    assert.equal(resFail.score, 63);
    assert.equal(resFail.passed, false);
  }
});

test('all 84 questions across 6 modules have globally unique IDs, stable optionIds, no duplicates, and unique non-predictable answer-key sequences', () => {
  const allQuestionIds = new Set<string>();
  const allGlobalPrompts = new Set<string>();
  const workSequences = new Map<string, string>();
  const examSequences = new Map<string, string>();

  let totalWork = 0;
  let totalExam = 0;

  for (const modKey of ALL_MODULE_KEYS) {
    const work = getModuleQuestions(modKey, 'work');
    const exam = getModuleQuestions(modKey, 'exam');
    assert.ok(work && work.length === 6, `Expected 6 work questions for ${modKey}`);
    assert.ok(exam && exam.length === 8, `Expected 8 exam questions for ${modKey}`);

    totalWork += work.length;
    totalExam += exam.length;

    const seenWorkQ = new Set<string>();
    const seenExamQ = new Set<string>();

    const inspectBank = (bank: typeof work, kind: 'work' | 'exam') => {
      bank.forEach((q, idx) => {
        // Stable unique ID + 4 optionIds matching correctOptionId
        assert.ok(q.id && q.id.trim().length >= 5, `Missing id in ${modKey} ${kind}[${idx}]`);
        assert.equal(allQuestionIds.has(q.id), false, `Duplicate question id ${q.id}`);
        allQuestionIds.add(q.id);

        assert.equal(q.optionIds.length, 4, `Expected 4 optionIds in ${q.id}`);
        assert.equal(new Set(q.optionIds).size, 4, `Duplicate optionId in ${q.id}`);
        assert.ok(
          Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4,
          `Invalid correct index in ${q.id}`
        );
        assert.equal(
          q.correctOptionId,
          q.optionIds[q.correct],
          `correctOptionId mismatch in ${q.id}`
        );

        const normalizedQ = q.q.trim().toLowerCase();
        assert.ok(normalizedQ.length > 20, `Prompt too short in ${q.id}`);
        assert.equal(allGlobalPrompts.has(normalizedQ), false, `Globally duplicated prompt in ${q.id}`);
        allGlobalPrompts.add(normalizedQ);

        if (kind === 'work') {
          assert.equal(seenWorkQ.has(normalizedQ), false, `Duplicate work question in ${q.id}`);
          seenWorkQ.add(normalizedQ);
        } else {
          assert.equal(seenExamQ.has(normalizedQ), false, `Duplicate exam question in ${q.id}`);
          assert.equal(seenWorkQ.has(normalizedQ), false, `Exam overlaps work in ${q.id}`);
          seenExamQ.add(normalizedQ);
        }

        assert.equal(q.a.length, 4, `Expected 4 options in ${q.id}`);
        const uniqueOpts = new Set(q.a.map((opt) => opt.trim().toLowerCase()));
        assert.equal(uniqueOpts.size, 4, `Duplicate option detected in ${q.id}`);
        assert.ok(q.why.trim().length > 15 && q.tip.trim().length > 8, `Weak rationale/tip in ${q.id}`);
      });
    };

    inspectBank(work, 'work');
    inspectBank(exam, 'exam');

    // Reject all-same, strict i % 4, or [0,1,2,3] ascending runs
    assert.equal(new Set(work.map((q) => q.correct)).size >= 3, true, `Low diversity in ${modKey} work`);
    assert.equal(work.every((q, i) => q.correct === i % 4), false, `Predictable i%4 in ${modKey} work`);
    assert.equal(
      work.map((q) => q.correct).join(',').includes('0,1,2,3'),
      false,
      `Ascending 0,1,2,3 run in ${modKey} work`
    );

    // Every exam (8 Qs) should use all 4 letters equally (2 each) with zero immediate consecutive 0,1,2,3 run and zero i % 4
    const examSeq = exam.map((q) => q.correct).join(',');
    assert.equal(exam.every((q, i) => q.correct === i % 4), false, `Predictable i%4 in ${modKey} exam`);
    assert.equal(examSeq.includes('0,1,2,3'), false, `Ascending 0,1,2,3 run in ${modKey} exam`);
    const counts = [0, 1, 2, 3].map((k) => exam.filter((q) => q.correct === k).length);
    assert.deepEqual(counts, [2, 2, 2, 2], `Unbalanced A/B/C/D count in ${modKey} exam: ${counts}`);

    // No consecutive identical correct letters in exam
    for (let i = 1; i < exam.length; i++) {
      assert.notEqual(
        exam[i].correct,
        exam[i - 1].correct,
        `Consecutive repeated letter in ${modKey} exam at ${i}`
      );
    }

    const workSeq = work.map((q) => q.correct).join(',');
    assert.equal(
      workSequences.has(workSeq),
      false,
      `Identical work sequence between ${modKey} and ${workSequences.get(workSeq)}`
    );
    workSequences.set(workSeq, modKey);

    assert.equal(
      examSequences.has(examSeq),
      false,
      `Identical exam sequence between ${modKey} and ${examSequences.get(examSeq)}`
    );
    examSequences.set(examSeq, modKey);
  }

  assert.equal(totalWork, 36);
  assert.equal(totalExam, 48);
  assert.equal(allQuestionIds.size, 84);
});

test('all 6 modules and Module 5 independent Technical Sheets A & B satisfy all 23 categories and documentary accuracy', () => {
  const baseSheets: Array<[string, TechnicalSheet]> = [
    ['carbonara', carbonaraTechSheet],
    ...extraRecipes.map((r): [string, TechnicalSheet] => [r.id, r.techSheet]),
  ];
  assert.equal(baseSheets.length, 6);

  for (const [label, sheet] of baseSheets) {
    assertFullTechnicalSheet23Categories(sheet, label);
  }

  // Module 2 Alfredo proportions
  const alfredo = extraRecipes.find((r) => r.id === 'alfredo')!;
  assert.ok(alfredo.ingredients.some((i) => i.includes('100 g de manteiga')));
  assert.ok(alfredo.ingredients.some((i) => i.includes('240 g de Parmigiano-Reggiano')));

  // Module 4 Pesto VisitGenoa documentary accuracy & ingredients
  const pesto = extraRecipes.find((r) => r.id === 'pesto')!;
  assert.equal(pesto.steps.length, 10);
  assert.ok(pesto.ingredients.some((i) => i.includes('60 g de folhas de manjericão')));
  assert.ok(pesto.ingredients.some((i) => i.includes('50 g de Parmigiano-Reggiano')));
  assert.ok(pesto.ingredients.some((i) => i.includes('25 g de Pecorino Sardo')));
  assert.ok(pesto.ingredients.some((i) => i.includes('70 ml de azeite')));
  assert.equal(
    /VisitGenoa.*\b600\s*g\b/i.test(pesto.adaptation) && !/sem fixar 600\s*g/i.test(pesto.adaptation),
    false,
    'Pesto adaptation must not erroneously claim VisitGenoa requires 600 g pasta'
  );
  assert.ok(
    pesto.techSheet.portionQuantity.includes('sem fixar 600 g'),
    'Pesto portionQuantity should explicitly clarify VisitGenoa documentary finding'
  );

  // Module 5 Tagliatelle al Ragù dual independent Technical Sheets (A & B) + Assembly Guide
  const ragu = extraRecipes.find((r) => r.id === 'ragù')!;
  assert.ok(Array.isArray(ragu.technicalSheets) && ragu.technicalSheets.length === 2);
  const sheetA = ragu.technicalSheets.find((s) => s.code === 'A')!;
  const sheetB = ragu.technicalSheets.find((s) => s.code === 'B')!;
  assert.ok(sheetA && sheetB);
  assertFullTechnicalSheet23Categories(sheetA.sheet, 'ragu-ficha-A-massa');
  assertFullTechnicalSheet23Categories(sheetB.sheet, 'ragu-ficha-B-molho');
  assert.ok(sheetA.sheet.yield.includes('4 porções'));
  assert.ok(sheetA.sheet.ingredients.some((i) => i.includes('400 g de farinha de trigo tipo 00')));
  assert.ok(sheetA.sheet.ingredients.some((i) => i.includes('4 ovos médios')));
  assert.ok(sheetB.sheet.yield.includes('6 porções'));
  assert.ok(sheetB.sheet.ingredients.some((i) => i.includes('400 g de carne bovina moída grossa')));
  assert.ok(sheetB.sheet.ingredients.some((i) => i.includes('150 g de pancetta fresca')));
  assert.ok(ragu.assemblyGuide && ragu.assemblyGuide.points.length >= 5);
  assert.ok(ragu.assemblyGuide.points.some((p) => p.includes('400 g')));
});

test('stable optionId resolution handles shuffled option orders and protects legacy assessment history', () => {
  const bank = getModuleQuestions('pesto', 'exam')!;
  const q0 = bank[0];
  const shuffledOrder = [q0.optionIds[3], q0.optionIds[2], q0.optionIds[1], q0.optionIds[0]];
  const resolved = resolveQuestionOptions(q0, shuffledOrder);
  assert.equal(resolved.orderedOptionIds[0], q0.optionIds[3]);
  assert.equal(resolved.orderedTexts[0], q0.a[3]);

  // Passing the display index corresponding to q0.correctOptionId must grade as correct
  const displayedOrders = bank.map((q) => [
    q.optionIds[3],
    q.optionIds[2],
    q.optionIds[1],
    q.optionIds[0],
  ]);
  const selectedShuffledIndices = bank.map((q, idx) => displayedOrders[idx].indexOf(q.correctOptionId));
  const gradedShuffled = gradeAssessment('pesto', 'exam', selectedShuffledIndices, {
    displayedOptionOrders: displayedOrders,
  });
  assert.equal(gradedShuffled.ok, true);
  assert.equal(gradedShuffled.score, 100);
  assert.equal(gradedShuffled.passed, true);
  assert.deepEqual(
    gradedShuffled.selectedOptionIds,
    bank.map((q) => q.correctOptionId)
  );

  // Legacy attempts stored without bank_version keep exact historical score, passed, and answers upon hydration
  const initialState: CourseState = {
    demo: false,
    stage: 0,
    done: [],
    mise: false,
    miseChecks: [],
    questionsAnswers: [],
    questionsFinished: false,
    questionAttempts: [],
    examAnswers: [],
    examCurrent: 0,
    examReview: false,
    examAttempts: [],
    examStatus: 'intro',
    questionCurrent: 0,
    voiceVolume: 0.82,
    lessonFinished: false,
  };

  const hydrated = hydrateCourseStateFromWorkspace(initialState, {
    profile: { id: 'u1', full_name: 'Aluno Teste', cpf_masked: '***.000.000-**', email: 'a@b.com' },
    course: { id: 'c1', slug: 'massas-italianas', title: 'Massas Italianas' },
    workloadLabel: '4 horas e 8 minutos',
    passingScorePercent: 70,
    enrollment: { status: 'completed', last_module_key: 'sauces', completed_at: '2026-01-10T10:00:00Z' },
    moduleProgress: [],
    attempts: [
      {
        id: 'att-legacy',
        module_key: 'sauces',
        attempt_type: 'exam',
        score: 75,
        passed: true,
        answers: [1, 0, 2, 3, 0, 1, 2, 3], // old v1 pattern B,A,C,D,A,B,C,D must NOT be regraded to fail!
        attempted_at: '2026-01-10T09:50:00Z',
        bank_version: null,
      },
      {
        id: 'att-v2',
        module_key: 'pesto',
        attempt_type: 'exam',
        score: 100,
        passed: true,
        answers: bank.map((q) => q.correct),
        attempted_at: '2026-11-26T12:00:00Z',
        bank_version: 'v2-2026-11',
        question_ids: bank.map((q) => q.id),
        selected_option_ids: bank.map((q) => q.correctOptionId),
      },
    ],
    eligibleForCertificate: true,
    completionDate: '10/01/2026',
    certificate: null,
  });

  const legacyAttempt = hydrated.recipeProgress?.sauces?.examAttempts?.[0];
  assert.ok(legacyAttempt);
  assert.equal(legacyAttempt.score, 75);
  assert.equal(legacyAttempt.passed, true);
  assert.deepEqual(legacyAttempt.answers, [1, 0, 2, 3, 0, 1, 2, 3]);
  assert.equal(legacyAttempt.bankVersion, undefined);

  const v2Attempt = hydrated.recipeProgress?.pesto?.examAttempts?.[0];
  assert.ok(v2Attempt);
  assert.equal(v2Attempt.bankVersion, 'v2-2026-11');
  assert.equal(v2Attempt.questionIds?.length, 8);
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
