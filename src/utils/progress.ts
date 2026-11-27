import type { QuestionAttemptSnapshot } from '../data/assessments';

export interface ExamAttempt {
  score: number;
  passed: boolean;
  answers: (number | null)[];
  date: string;
  bankVersion?: string;
  questionIds?: string[];
  selectedOptionIds?: string[];
  questionSnapshots?: QuestionAttemptSnapshot[];
}

export interface QuestionAttempt {
  score: number;
  answers: number[];
  date: string;
  bankVersion?: string;
  questionIds?: string[];
  selectedOptionIds?: string[];
  questionSnapshots?: QuestionAttemptSnapshot[];
}

export interface RecipeProgressEntry {
  stage: number;
  done: number[];
  lessonCompleted?: boolean;
  workAnswers: number[];
  workCurrent: number;
  workFinished: boolean;
  workCompleted?: boolean;
  workAttempts: QuestionAttempt[];
  examAnswers: (number | null)[];
  examCurrent: number;
  examStatus: string;
  examAttempts: ExamAttempt[];
  reviewDone: boolean;
}

export interface CourseState {
  demo: boolean;
  stage: number;
  done: number[];
  mise: boolean;
  miseChecks: number[];
  questionsAnswers: number[];
  questionsFinished: boolean;
  questionsCompleted?: boolean;
  questionAttempts: QuestionAttempt[];
  examAnswers: (number | null)[];
  examCurrent: number;
  examReview: boolean;
  examAttempts: ExamAttempt[];
  examStatus: string;
  questionCurrent: number;
  voiceVolume: number;
  lessonFinished: boolean;
  reviewDone?: boolean;
  lastModuleId?: string;
  recipeProgress?: Record<string, RecipeProgressEntry>;
}

const BASE_KEY = 'fervec-course-v2';
let activeScope: string | null = null;

export function setActiveProgressScope(scope?: string | null): void {
  const clean = typeof scope === 'string' ? scope.trim() : '';
  activeScope = clean ? clean : null;
}

export function getActiveProgressKey(): string {
  return activeScope ? `${BASE_KEY}:${activeScope}` : BASE_KEY;
}

function getMicroPrefix(): string {
  return activeScope ? `fc-micro-${activeScope}-` : 'fc-micro-';
}

export function loadProgress(): CourseState {
  const key = getActiveProgressKey();
  const base: CourseState = {
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
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    if (v && typeof v === 'object') return Object.assign(base, v);
  } catch {
    // ignore storage errors
  }
  return base;
}

export function saveProgress(state: CourseState): boolean {
  try {
    localStorage.setItem(getActiveProgressKey(), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(): boolean {
  try {
    localStorage.removeItem(getActiveProgressKey());
    const prefix = getMicroPrefix();
    Object.keys(localStorage)
      .filter((k) => k.indexOf(prefix) === 0)
      .forEach((k) => localStorage.removeItem(k));
    return true;
  } catch {
    return false;
  }
}

export function isMicroDone(stage: number, index: number): boolean {
  try {
    return localStorage.getItem(`${getMicroPrefix()}${stage}-${index}`) === '1';
  } catch {
    return false;
  }
}

export function setMicroDone(stage: number, index: number, value: boolean): boolean {
  try {
    localStorage.setItem(`${getMicroPrefix()}${stage}-${index}`, value ? '1' : '0');
    return true;
  } catch {
    return false;
  }
}
