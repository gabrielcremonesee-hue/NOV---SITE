import { exam, questions, type QuizQuestion } from './courseData.ts';
import { extraRecipes, type ExtraRecipe } from './recipesData.ts';

export const PASSING_SCORE_PERCENT = 70;

export const ALL_MODULE_KEYS = [
  'carbonara',
  'alfredo',
  'arrabbiata',
  'pesto',
  'ragù',
  'sauces',
] as const;

export type ModuleKey = (typeof ALL_MODULE_KEYS)[number];
export type AttemptType = 'work' | 'exam';

export function isValidModuleKey(value: string): value is ModuleKey {
  return (ALL_MODULE_KEYS as readonly string[]).includes(value);
}

export function recipeQuestionSet(r: ExtraRecipe, count: number): QuizQuestion[] {
  return Array.from({ length: count }, (_, i) => {
    const idx = i % r.steps.length;
    const step = r.steps[idx];
    const wrong = r.steps.filter((_, j) => j !== idx).map((x) => x[1]);
    const opts = wrong.slice(
      (i * 2) % Math.max(1, wrong.length),
      ((i * 2) % Math.max(1, wrong.length)) + 3
    );
    while (opts.length < 3) opts.push(wrong[opts.length % wrong.length] || r.chefTip);
    const correct = i % 4;
    opts.splice(correct, 0, step[1]);
    return {
      q: `Na etapa “${step[0]}”, qual orientação corresponde ao conteúdo desta aula?`,
      a: opts.slice(0, 4),
      correct,
      why: step[2],
      tip: r.chefTip,
    };
  });
}

export function getModuleQuestions(
  moduleKey: string,
  attemptType: AttemptType
): QuizQuestion[] | null {
  if (moduleKey === 'carbonara') {
    return attemptType === 'exam' ? exam : questions;
  }
  const recipe = extraRecipes.find((r) => r.id === moduleKey);
  if (!recipe) return null;
  return recipeQuestionSet(recipe, attemptType === 'exam' ? 8 : 6);
}

export interface GradedAssessment {
  ok: boolean;
  error?: string;
  moduleKey: ModuleKey;
  attemptType: AttemptType;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  answers: number[];
}

export function gradeAssessment(
  moduleKey: string,
  attemptType: AttemptType,
  rawAnswers: unknown[]
): GradedAssessment {
  if (!isValidModuleKey(moduleKey)) {
    return {
      ok: false,
      error: 'Módulo de avaliação inválido.',
      moduleKey: 'carbonara',
      attemptType,
      score: 0,
      correctCount: 0,
      totalQuestions: 0,
      passed: false,
      answers: [],
    };
  }

  const bank = getModuleQuestions(moduleKey, attemptType);
  if (!bank || bank.length === 0) {
    return {
      ok: false,
      error: 'Banco de questões não encontrado para este módulo.',
      moduleKey,
      attemptType,
      score: 0,
      correctCount: 0,
      totalQuestions: 0,
      passed: false,
      answers: [],
    };
  }

  if (!Array.isArray(rawAnswers) || rawAnswers.length !== bank.length) {
    return {
      ok: false,
      error: `Responda todas as ${bank.length} questões antes de enviar.`,
      moduleKey,
      attemptType,
      score: 0,
      correctCount: 0,
      totalQuestions: bank.length,
      passed: false,
      answers: [],
    };
  }

  const normalizedAnswers: number[] = [];
  for (let i = 0; i < bank.length; i++) {
    const val = rawAnswers[i];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val >= bank[i].a.length) {
      return {
        ok: false,
        error: `A questão ${i + 1} precisa de uma alternativa válida.`,
        moduleKey,
        attemptType,
        score: 0,
        correctCount: 0,
        totalQuestions: bank.length,
        passed: false,
        answers: [],
      };
    }
    normalizedAnswers.push(val);
  }

  const correctCount = normalizedAnswers.filter((ans, idx) => ans === bank[idx].correct).length;
  const percentScore = Math.round((correctCount / bank.length) * 100);
  const score = attemptType === 'exam' ? percentScore : correctCount;
  const passed = attemptType === 'exam' ? percentScore >= PASSING_SCORE_PERCENT : true;

  return {
    ok: true,
    moduleKey,
    attemptType,
    score,
    correctCount,
    totalQuestions: bank.length,
    passed,
    answers: normalizedAnswers,
  };
}

export function parseDurationMinutes(label: string): { min: number; max: number } {
  const clean = String(label || '').toLowerCase().trim();
  if (!clean) return { min: 0, max: 0 };

  const nums = clean.match(/\d+(?:[.,]\d+)?/g)?.map((n) => Number(n.replace(',', '.'))) ?? [];
  if (nums.length === 0) return { min: 0, max: 0 };

  const isHours = /\bhoras?\b|\bh\b/.test(clean) && !/\bmin/.test(clean);
  const factor = isHours ? 60 : 1;

  if (nums.length >= 2) {
    const lo = Math.min(nums[0], nums[1]) * factor;
    const hi = Math.max(nums[0], nums[1]) * factor;
    return { min: lo, max: hi };
  }
  return { min: nums[0] * factor, max: nums[0] * factor };
}

export function formatWorkloadFromMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (safeMinutes <= 0) return '0 minutos';

  const hours = Math.floor(safeMinutes / 60);
  const remMinutes = safeMinutes % 60;
  const hourWord = hours === 1 ? 'hora' : 'horas';
  const minWord = remMinutes === 1 ? 'minuto' : 'minutos';

  if (hours === 0) {
    return `${safeMinutes} ${safeMinutes === 1 ? 'minuto' : 'minutos'}`;
  }
  if (remMinutes === 0) {
    return `${hours} ${hourWord}`;
  }
  return `${hours} ${hourWord} e ${remMinutes} ${minWord}`;
}

export function computeCourseWorkloadMinutes(durationLabels: string[]): number {
  if (!Array.isArray(durationLabels) || durationLabels.length === 0) {
    return 0;
  }
  let minSum = 0;
  let maxSum = 0;
  for (const label of durationLabels) {
    const parsed = parseDurationMinutes(label);
    minSum += parsed.min;
    maxSum += parsed.max;
  }
  return Math.round((minSum + maxSum) / 2);
}

export function computeCourseWorkloadLabel(durationLabels: string[]): string {
  const totalMinutes = computeCourseWorkloadMinutes(durationLabels);
  if (totalMinutes <= 0) {
    return '4 horas';
  }
  return formatWorkloadFromMinutes(totalMinutes);
}

export function extractPositiveMinutes(record: Record<string, unknown> | null | undefined): number {
  if (!record) return 0;
  const candidateKeys = [
    'estimated_minutes',
    'workload_minutes',
    'duration_minutes',
    'total_minutes',
    'carga_horaria_minutos',
  ];
  for (const key of candidateKeys) {
    const val = Number(record[key]);
    if (Number.isFinite(val) && val > 0) {
      return Math.round(val);
    }
  }
  return 0;
}

export function resolveCourseWorkload(params: {
  courseRecord?: Record<string, unknown> | null;
  modules?: Array<Record<string, unknown> & { duration_label?: string | null }>;
  fallbackMinutes?: number;
}): { totalMinutes: number; workloadLabel: string } {
  const courseExplicit = extractPositiveMinutes(params.courseRecord);
  if (courseExplicit > 0) {
    return {
      totalMinutes: courseExplicit,
      workloadLabel: formatWorkloadFromMinutes(courseExplicit),
    };
  }

  const modules = Array.isArray(params.modules) ? params.modules : [];
  if (modules.length > 0) {
    let moduleExplicitSum = 0;
    let hasAllExplicit = true;
    for (const mod of modules) {
      const mMin = extractPositiveMinutes(mod);
      if (mMin > 0) {
        moduleExplicitSum += mMin;
      } else {
        hasAllExplicit = false;
      }
    }
    if (hasAllExplicit && moduleExplicitSum > 0) {
      return {
        totalMinutes: moduleExplicitSum,
        workloadLabel: formatWorkloadFromMinutes(moduleExplicitSum),
      };
    }

    let totalFromModules = 0;
    for (const mod of modules) {
      const mMin = extractPositiveMinutes(mod);
      if (mMin > 0) {
        totalFromModules += mMin;
      } else if (typeof mod.duration_label === 'string' && mod.duration_label.trim()) {
        const parsed = parseDurationMinutes(mod.duration_label);
        totalFromModules += Math.round((parsed.min + parsed.max) / 2);
      }
    }
    if (totalFromModules > 0) {
      return {
        totalMinutes: totalFromModules,
        workloadLabel: formatWorkloadFromMinutes(totalFromModules),
      };
    }
  }

  const fallback = params.fallbackMinutes && params.fallbackMinutes > 0 ? params.fallbackMinutes : 240;
  return {
    totalMinutes: fallback,
    workloadLabel: formatWorkloadFromMinutes(fallback),
  };
}

export function formatBrDate(isoOrDate: string | Date): string {
  const dt = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(dt.getTime())) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
}
