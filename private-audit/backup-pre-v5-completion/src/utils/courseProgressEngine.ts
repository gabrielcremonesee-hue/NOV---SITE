export type ModuleProgressStatus = 'available' | 'in_progress' | 'completed' | 'locked';

export interface CourseModuleBlueprint {
  id: string;
  index: number;
  title: string;
  recipeTitle: string;
  desc: string;
  photo: string;
  duration: string;
  level: string;
  totalLessonSteps: number;
  totalWorkQuestions: number;
  passingScorePercent?: number;
  prerequisiteModuleId?: string;
}

export interface ModuleRuntimeProgress {
  doneLessonSteps: number[];
  lessonCompleted: boolean;
  workAnsweredCount: number;
  workCompleted: boolean;
  workScore?: number;
  reviewCompleted: boolean;
  examPassed: boolean;
  latestExamScore?: number;
  certificateUnlockedOverride?: boolean;
}

export interface CourseBlueprint {
  slug: string;
  title: string;
  subtitle: string;
  available: boolean;
  requiresEnrollment?: boolean;
  isEnrolled?: boolean;
  modules: CourseModuleBlueprint[];
}

export interface EvaluatedModuleProgress extends CourseModuleBlueprint {
  doneStepsCount: number;
  lessonCompleted: boolean;
  workAnsweredCount: number;
  workCompleted: boolean;
  canCompleteWork: boolean;
  reviewCompleted: boolean;
  examUnlocked: boolean;
  examPassed: boolean;
  latestExamScore?: number;
  certificateUnlocked: boolean;
  isLocked: boolean;
  lockReason?: string;
  status: ModuleProgressStatus;
  statusLabel: string;
  unitsTotal: number;
  unitsDone: number;
  modulePct: number;
}

export interface EvaluatedCourseProgress {
  slug: string;
  title: string;
  subtitle: string;
  available: boolean;
  isLocked: boolean;
  modules: EvaluatedModuleProgress[];
  totalLessonSteps: number;
  completedLessonSteps: number;
  totalUnits: number;
  completedUnits: number;
  overallPct: number;
  completedModulesCount: number;
  inProgressModulesCount: number;
  availableModulesCount: number;
  lockedModulesCount: number;
  courseCertificateUnlocked: boolean;
  activeModule: EvaluatedModuleProgress;
}

export function canCompleteModuleWork(
  workAnsweredCount: number,
  totalWorkQuestions: number
): boolean {
  if (!Number.isFinite(totalWorkQuestions) || totalWorkQuestions <= 0) return true;
  return workAnsweredCount >= totalWorkQuestions;
}

export function evaluateCourseProgress(
  blueprint: CourseBlueprint,
  progressByModuleId: Record<string, ModuleRuntimeProgress>,
  preferredActiveModuleId?: string
): EvaluatedCourseProgress {
  const courseLocked =
    !blueprint.available ||
    (Boolean(blueprint.requiresEnrollment) && !blueprint.isEnrolled);

  const preliminary = new Map<string, EvaluatedModuleProgress>();
  const evaluatedModules: EvaluatedModuleProgress[] = [];

  for (const mod of blueprint.modules) {
    const rt = progressByModuleId[mod.id] || {
      doneLessonSteps: [],
      lessonCompleted: false,
      workAnsweredCount: 0,
      workCompleted: false,
      reviewCompleted: false,
      examPassed: false,
    };

    const uniqueDoneSteps = Array.from(
      new Set(
        (rt.doneLessonSteps || []).filter(
          (idx) => Number.isInteger(idx) && idx >= 0 && idx < mod.totalLessonSteps
        )
      )
    );
    const doneStepsCount = uniqueDoneSteps.length;
    const lessonCompleted = Boolean(
      rt.lessonCompleted || (mod.totalLessonSteps > 0 && doneStepsCount >= mod.totalLessonSteps)
    );

    const safeAnswered = Math.max(0, Math.min(mod.totalWorkQuestions, rt.workAnsweredCount || 0));
    const canFinishWork = canCompleteModuleWork(safeAnswered, mod.totalWorkQuestions);
    const workCompleted = Boolean(rt.workCompleted && canFinishWork);
    const reviewCompleted = Boolean(rt.reviewCompleted);
    const examUnlocked = lessonCompleted && reviewCompleted;
    const examPassed = Boolean(rt.examPassed);
    const certificateUnlocked = Boolean(
      rt.certificateUnlockedOverride || (lessonCompleted && reviewCompleted && examPassed)
    );

    let isLocked = courseLocked;
    let lockReason = !blueprint.available
      ? 'Módulo previsto para lançamento futuro'
      : courseLocked
        ? 'Acesso bloqueado até a liberação do curso'
        : undefined;

    if (!isLocked && mod.prerequisiteModuleId) {
      const prereq = preliminary.get(mod.prerequisiteModuleId);
      if (prereq && prereq.status !== 'completed') {
        isLocked = true;
        lockReason = `Conclua o Módulo ${prereq.index} (${prereq.recipeTitle}) para desbloquear`;
      }
    }

    // Discrete units per module:
    // N lesson steps + 1 Trabalho + 1 Revisão + 1 Prova
    const unitsTotal = Math.max(1, mod.totalLessonSteps + 3);
    const unitsDone =
      doneStepsCount +
      (workCompleted ? 1 : 0) +
      (reviewCompleted ? 1 : 0) +
      (examPassed ? 1 : 0);

    const modulePct = Math.max(0, Math.min(100, Math.round((unitsDone / unitsTotal) * 100)));

    let status: ModuleProgressStatus;
    if (isLocked) {
      status = 'locked';
    } else if (lessonCompleted && workCompleted && reviewCompleted && examPassed) {
      status = 'completed';
    } else if (
      doneStepsCount > 0 ||
      lessonCompleted ||
      safeAnswered > 0 ||
      workCompleted ||
      reviewCompleted ||
      examPassed
    ) {
      status = 'in_progress';
    } else {
      status = 'available';
    }

    const statusLabelMap: Record<ModuleProgressStatus, string> = {
      completed: 'Concluído',
      in_progress: 'Em andamento',
      available: 'Disponível',
      locked: 'Bloqueado',
    };

    const evaluated: EvaluatedModuleProgress = {
      ...mod,
      doneStepsCount,
      lessonCompleted,
      workAnsweredCount: safeAnswered,
      workCompleted,
      canCompleteWork: canFinishWork,
      reviewCompleted,
      examUnlocked,
      examPassed,
      latestExamScore: rt.latestExamScore,
      certificateUnlocked,
      isLocked,
      lockReason,
      status,
      statusLabel: statusLabelMap[status],
      unitsTotal,
      unitsDone,
      modulePct,
    };

    preliminary.set(mod.id, evaluated);
    evaluatedModules.push(evaluated);
  }

  const totalLessonSteps = evaluatedModules.reduce((acc, m) => acc + m.totalLessonSteps, 0);
  const completedLessonSteps = evaluatedModules.reduce((acc, m) => acc + m.doneStepsCount, 0);
  const totalUnits = evaluatedModules.reduce((acc, m) => acc + m.unitsTotal, 0);
  const completedUnits = evaluatedModules.reduce((acc, m) => acc + m.unitsDone, 0);
  const overallPct =
    totalUnits > 0 ? Math.max(0, Math.min(100, Math.round((completedUnits / totalUnits) * 100))) : 0;

  const completedModulesCount = evaluatedModules.filter((m) => m.status === 'completed').length;
  const inProgressModulesCount = evaluatedModules.filter((m) => m.status === 'in_progress').length;
  const availableModulesCount = evaluatedModules.filter((m) => m.status === 'available').length;
  const lockedModulesCount = evaluatedModules.filter((m) => m.status === 'locked').length;

  const courseCertificateUnlocked =
    evaluatedModules.length > 0 && evaluatedModules.some((m) => m.certificateUnlocked);

  const activeModule =
    (preferredActiveModuleId &&
      evaluatedModules.find((m) => m.id === preferredActiveModuleId && !m.isLocked)) ||
    evaluatedModules.find((m) => m.status === 'in_progress') ||
    evaluatedModules.find((m) => m.status === 'available') ||
    evaluatedModules[0];

  return {
    slug: blueprint.slug,
    title: blueprint.title,
    subtitle: blueprint.subtitle,
    available: blueprint.available,
    isLocked: courseLocked,
    modules: evaluatedModules,
    totalLessonSteps,
    completedLessonSteps,
    totalUnits,
    completedUnits,
    overallPct,
    completedModulesCount,
    inProgressModulesCount,
    availableModulesCount,
    lockedModulesCount,
    courseCertificateUnlocked,
    activeModule,
  };
}
