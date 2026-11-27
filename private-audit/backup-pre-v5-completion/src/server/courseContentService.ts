import {
  carbonaraTechSheet,
  course,
  ingredients,
  prep,
  reviewItems,
  stages,
  type QuizQuestion,
} from '../data/courseData.ts';
import { extraRecipes } from '../data/recipesData.ts';
import {
  ASSESSMENT_BANK_VERSION,
  getModuleQuestions,
  isValidModuleKey,
  PASSING_SCORE_PERCENT,
  type AttemptType,
  type ModuleKey,
} from '../data/assessments.ts';
import type { PublicQuizQuestion } from '../data/coursePublicData.ts';

export function getProtectedCourseContent(moduleKey?: string | null) {
  const normalized = String(moduleKey || '').trim().toLowerCase();
  if (normalized && normalized !== 'all') {
    if (!isValidModuleKey(normalized)) {
      return null;
    }
    if (normalized === 'carbonara') {
      return {
        ok: true as const,
        course,
        carbonara: {
          stages,
          ingredients,
          prep,
          reviewItems,
          techSheet: carbonaraTechSheet,
        },
        extraRecipes: [],
      };
    }
    const found = extraRecipes.find((r) => r.id === normalized);
    return {
      ok: true as const,
      course,
      carbonara: null,
      extraRecipes: found ? [found] : [],
    };
  }

  return {
    ok: true as const,
    course,
    carbonara: {
      stages,
      ingredients,
      prep,
      reviewItems,
      techSheet: carbonaraTechSheet,
    },
    extraRecipes,
  };
}

export function sanitizeQuizQuestion(q: QuizQuestion): PublicQuizQuestion {
  return {
    id: q.id,
    optionIds: q.optionIds,
    q: q.q,
    a: q.a,
    tip: q.tip,
  };
}

export function getSanitizedAssessmentQuestions(
  moduleKey: ModuleKey,
  attemptType: AttemptType
): {
  bankVersion: string;
  moduleKey: ModuleKey;
  attemptType: AttemptType;
  passingScorePercent: number;
  questions: PublicQuizQuestion[];
} {
  const rawBank = getModuleQuestions(moduleKey, attemptType) || [];
  return {
    bankVersion: ASSESSMENT_BANK_VERSION,
    moduleKey,
    attemptType,
    passingScorePercent: PASSING_SCORE_PERCENT,
    questions: rawBank.map(sanitizeQuizQuestion),
  };
}

export function evaluateWorkSingleAnswer(
  moduleKey: ModuleKey,
  questionIndex: number,
  selectedAnswer: number
): {
  ok: true;
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  tip: string;
} | {
  ok: false;
  error: string;
} {
  const bank = getModuleQuestions(moduleKey, 'work') || [];
  if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= bank.length) {
    return { ok: false, error: 'Índice de pergunta inválido.' };
  }
  const q = bank[questionIndex];
  const normalizedChoice = Number.isInteger(selectedAnswer) ? selectedAnswer : -1;
  if (normalizedChoice < 0 || normalizedChoice >= q.a.length) {
    return { ok: false, error: 'Alternativa selecionada inválida.' };
  }
  return {
    ok: true,
    isCorrect: normalizedChoice === q.correct,
    correctIndex: q.correct,
    explanation: q.why,
    tip: q.tip,
  };
}
