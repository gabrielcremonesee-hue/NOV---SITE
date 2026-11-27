import { CourseState, ExamAttempt, QuestionAttempt, RecipeProgressEntry } from '../progress';
import type { QuestionAttemptSnapshot } from '../../data/assessments';
import { getSupabaseClient } from './client';

export interface ServerCertificateRecord {
  id: string;
  user_id: string;
  course_id: string;
  certificate_code: string;
  status: string;
  student_name_snapshot: string;
  studentName?: string;
  course_title_snapshot: string;
  issued_at: string;
  courseSlug?: string;
  cpfMasked: string;
  workloadMinutes?: number;
  workloadLabel: string;
  completionDate: string;
  completionIso?: string;
  issuedDate: string;
  pdfUrl?: string;
}

export interface ServerModuleProgressRow {
  module_key: string;
  current_stage: number;
  done_steps: number[];
  mise_checks: number[];
  review_done: boolean;
  lesson_finished: boolean;
  work_finished: boolean;
  exam_status: string;
}

export interface ServerAttemptRow {
  id: string;
  module_key: string;
  attempt_type: 'work' | 'exam';
  score: number;
  passed: boolean;
  answers: number[];
  attempted_at: string;
  bank_version?: string | null;
  question_ids?: string[] | null;
  selected_option_ids?: string[] | null;
  question_snapshots?: QuestionAttemptSnapshot[] | null;
}

export interface WorkspaceCourseSummary {
  id: string;
  slug: string;
  title: string;
  cuisine: string;
  level: string | null;
  estimatedMinutes?: number;
  workloadLabel?: string;
}

export interface WorkspaceHydrationResponse {
  profile: {
    id: string;
    full_name: string;
    cpf_masked: string;
    email: string;
  };
  permissions?: {
    isDeveloperAdmin: boolean;
    canBypassExamForCertificates: boolean;
    canAccessAdminPanel?: boolean;
  };
  course: {
    id: string;
    slug: string;
    title: string;
  };
  courses?: WorkspaceCourseSummary[];
  workloadMinutes?: number;
  workloadLabel: string;
  passingScorePercent: number;
  enrollment: {
    status: string;
    last_module_key: string | null;
    completed_at: string | null;
  } | null;
  moduleProgress: ServerModuleProgressRow[];
  attempts: ServerAttemptRow[];
  eligibleForCertificate: boolean;
  completionDate: string | null;
  certificates?: ServerCertificateRecord[];
  certificate: ServerCertificateRecord | null;
}

async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });
}

export async function fetchWorkspaceState(
  courseSlug?: string
): Promise<WorkspaceHydrationResponse | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const qs = courseSlug ? `?courseSlug=${encodeURIComponent(courseSlug)}` : '';
    const res = await authFetch(`/api/workspace/state${qs}`);
    if (!res.ok) return null;
    return (await res.json()) as WorkspaceHydrationResponse;
  } catch {
    return null;
  }
}

export async function syncModuleProgressToServer(payload: {
  moduleKey: string;
  currentStage: number;
  doneSteps: number[];
  miseChecks?: number[];
  reviewDone: boolean;
  lessonFinished: boolean;
  workFinished: boolean;
  lastModuleKey?: string;
}): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) return false;
    const res = await authFetch('/api/progress/sync', {
      method: 'POST',
      body: JSON.stringify({
        courseSlug: 'massas-italianas',
        ...payload,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface SubmitAssessmentResponse {
  ok: boolean;
  status: number;
  error?: string;
  score?: number;
  correctCount?: number;
  totalQuestions?: number;
  passed?: boolean;
  bankVersion?: string;
  questionIds?: string[];
  selectedOptionIds?: string[];
  questionSnapshots?: QuestionAttemptSnapshot[];
  certificateUnlocked?: boolean;
  certificate?: ServerCertificateRecord | null;
  certificates?: ServerCertificateRecord[];
  attempt?: ServerAttemptRow;
}

export async function submitAssessmentToServer(payload: {
  moduleKey: string;
  attemptType: 'work' | 'exam';
  answers: number[];
  bankVersion?: string;
  questionIds?: string[];
  selectedOptionIds?: string[];
  displayedOptionOrders?: string[][];
}): Promise<SubmitAssessmentResponse> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return {
        ok: false,
        status: 401,
        error: 'Entre na sua conta antes de enviar a avaliação.',
      };
    }

    const res = await authFetch('/api/assessments/submit', {
      method: 'POST',
      body: JSON.stringify({
        courseSlug: 'massas-italianas',
        ...payload,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data?.error || 'Erro ao registrar avaliação.',
      };
    }
    return {
      ok: true,
      status: res.status,
      score: data.score,
      correctCount: data.correctCount,
      totalQuestions: data.totalQuestions,
      passed: Boolean(data.passed),
      bankVersion: typeof data.bankVersion === 'string' ? data.bankVersion : undefined,
      questionIds: Array.isArray(data.questionIds) ? data.questionIds : undefined,
      selectedOptionIds: Array.isArray(data.selectedOptionIds) ? data.selectedOptionIds : undefined,
      questionSnapshots: Array.isArray(data.questionSnapshots)
        ? (data.questionSnapshots as QuestionAttemptSnapshot[])
        : undefined,
      certificateUnlocked: Boolean(data.certificateUnlocked),
      certificate: data.certificate || null,
      certificates: Array.isArray(data.certificates)
        ? (data.certificates as ServerCertificateRecord[])
        : undefined,
      attempt: data.attempt,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      error: 'Erro de conexão ao registrar sua avaliação.',
    };
  }
}

export async function fetchUserCertificates(): Promise<{
  ok: boolean;
  certificates: ServerCertificateRecord[];
}> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { ok: false, certificates: [] };
    }
    const res = await authFetch('/api/certificates', { method: 'GET' });
    if (!res.ok) {
      return { ok: false, certificates: [] };
    }
    const data = await res.json().catch(() => ({}));
    return {
      ok: true,
      certificates: Array.isArray(data?.certificates)
        ? (data.certificates as ServerCertificateRecord[])
        : [],
    };
  } catch {
    return { ok: false, certificates: [] };
  }
}

export async function issueOrFetchCertificate(courseSlug = 'massas-italianas'): Promise<{
  ok: boolean;
  status: number;
  alreadyIssued?: boolean;
  grantedByDeveloperAdmin?: boolean;
  storagePath?: string | null;
  certificate?: ServerCertificateRecord;
  certificates?: ServerCertificateRecord[];
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return {
        ok: false,
        status: 401,
        error: 'Entre na sua conta para emitir ou baixar seu certificado.',
      };
    }

    const res = await authFetch('/api/certificates/issue', {
      method: 'POST',
      body: JSON.stringify({ courseSlug }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.certificate) {
      return {
        ok: false,
        status: res.status,
        error: data?.error || 'Não foi possível liberar o certificado.',
      };
    }
    return {
      ok: true,
      status: res.status,
      alreadyIssued: Boolean(data.alreadyIssued),
      grantedByDeveloperAdmin: Boolean(data.grantedByDeveloperAdmin),
      storagePath: typeof data.storagePath === 'string' ? data.storagePath : null,
      certificate: data.certificate as ServerCertificateRecord,
      certificates: Array.isArray(data.certificates)
        ? (data.certificates as ServerCertificateRecord[])
        : undefined,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      error: 'Falha de conexão ao validar o certificado.',
    };
  }
}

export async function downloadCertificatePdfBlob(certificateCode: string): Promise<{
  ok: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return {
        ok: false,
        error: 'Autenticação necessária para baixar o certificado.',
      };
    }

    const res = await authFetch(`/api/certificates/${encodeURIComponent(certificateCode)}/pdf`, {
      method: 'GET',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: errData?.error || 'Não foi possível gerar o PDF do certificado.',
      };
    }

    const blob = await res.blob();
    return {
      ok: true,
      blob,
      filename: `certificado-fervec-${certificateCode}.pdf`,
    };
  } catch {
    return {
      ok: false,
      error: 'Erro de rede ao baixar o PDF.',
    };
  }
}

function mergeAttemptVersionMetadata<T extends { score: number; answers: (number | null)[]; date: string; bankVersion?: string; questionIds?: string[]; selectedOptionIds?: string[]; questionSnapshots?: QuestionAttemptSnapshot[] }>(
  mapped: T,
  row: ServerAttemptRow,
  previousList?: T[]
): T {
  const localMatch = Array.isArray(previousList)
    ? previousList.find(
        (prev) =>
          prev.date === row.attempted_at ||
          (prev.score === row.score &&
            JSON.stringify(prev.answers || []) === JSON.stringify(row.answers || []))
      )
    : undefined;

  const bankVersion =
    typeof row.bank_version === 'string' && row.bank_version
      ? row.bank_version
      : localMatch?.bankVersion;
  const questionIds = Array.isArray(row.question_ids)
    ? row.question_ids
    : localMatch?.questionIds;
  const selectedOptionIds = Array.isArray(row.selected_option_ids)
    ? row.selected_option_ids
    : localMatch?.selectedOptionIds;
  const questionSnapshots = Array.isArray(row.question_snapshots)
    ? row.question_snapshots
    : localMatch?.questionSnapshots;

  return {
    ...mapped,
    ...(bankVersion ? { bankVersion } : {}),
    ...(questionIds ? { questionIds } : {}),
    ...(selectedOptionIds ? { selectedOptionIds } : {}),
    ...(questionSnapshots ? { questionSnapshots } : {}),
  };
}

export function hydrateCourseStateFromWorkspace(
  current: CourseState,
  ws: WorkspaceHydrationResponse
): CourseState {
  const next: CourseState = {
    ...current,
    demo: true,
    lastModuleId: ws.enrollment?.last_module_key || current.lastModuleId || 'carbonara',
    recipeProgress: { ...(current.recipeProgress || {}) },
  };

  const carbProg = ws.moduleProgress.find((m) => m.module_key === 'carbonara');
  if (carbProg) {
    next.stage = carbProg.current_stage ?? next.stage;
    next.done = Array.isArray(carbProg.done_steps) ? carbProg.done_steps : next.done;
    next.miseChecks = Array.isArray(carbProg.mise_checks)
      ? carbProg.mise_checks
      : next.miseChecks;
    next.mise = next.miseChecks.length > 0 || next.done.length > 0;
    next.reviewDone = Boolean(carbProg.review_done);
    next.lessonFinished = Boolean(carbProg.lesson_finished);
    next.questionsFinished = Boolean(carbProg.work_finished);
    if (carbProg.exam_status === 'passed' || carbProg.exam_status === 'failed') {
      next.examStatus = 'intro';
    }
  }

  const carbExams: ExamAttempt[] = ws.attempts
    .filter((a) => a.module_key === 'carbonara' && a.attempt_type === 'exam')
    .map((a) =>
      mergeAttemptVersionMetadata(
        {
          score: a.score,
          passed: a.passed,
          answers: Array.isArray(a.answers) ? a.answers : [],
          date: a.attempted_at,
        },
        a,
        current.examAttempts
      )
    );
  if (carbExams.length > 0) {
    next.examAttempts = carbExams;
  }

  const carbWorks: QuestionAttempt[] = ws.attempts
    .filter((a) => a.module_key === 'carbonara' && a.attempt_type === 'work')
    .map((a) =>
      mergeAttemptVersionMetadata(
        {
          score: a.score,
          answers: Array.isArray(a.answers) ? a.answers : [],
          date: a.attempted_at,
        },
        a,
        current.questionAttempts
      )
    );
  if (carbWorks.length > 0) {
    next.questionAttempts = carbWorks;
  }

  const recipeIds = ['alfredo', 'arrabbiata', 'pesto', 'ragù', 'sauces'];
  for (const rId of recipeIds) {
    const dbMod = ws.moduleProgress.find((m) => m.module_key === rId);
    const prevProg = current.recipeProgress?.[rId];
    const dbExams: ExamAttempt[] = ws.attempts
      .filter((a) => a.module_key === rId && a.attempt_type === 'exam')
      .map((a) =>
        mergeAttemptVersionMetadata(
          {
            score: a.score,
            passed: a.passed,
            answers: Array.isArray(a.answers) ? a.answers : [],
            date: a.attempted_at,
          },
          a,
          prevProg?.examAttempts
        )
      );
    const dbWorks: QuestionAttempt[] = ws.attempts
      .filter((a) => a.module_key === rId && a.attempt_type === 'work')
      .map((a) =>
        mergeAttemptVersionMetadata(
          {
            score: a.score,
            answers: Array.isArray(a.answers) ? a.answers : [],
            date: a.attempted_at,
          },
          a,
          prevProg?.workAttempts
        )
      );

    if (dbMod || dbExams.length > 0 || dbWorks.length > 0) {
      const prev: RecipeProgressEntry = next.recipeProgress?.[rId] || {
        stage: 0,
        done: [],
        workAnswers: [],
        workCurrent: 0,
        workFinished: false,
        workAttempts: [],
        examAnswers: [],
        examCurrent: 0,
        examStatus: 'intro',
        examAttempts: [],
        reviewDone: false,
      };
      next.recipeProgress![rId] = {
        ...prev,
        stage: dbMod?.current_stage ?? prev.stage,
        done: Array.isArray(dbMod?.done_steps) ? dbMod.done_steps : prev.done,
        reviewDone: dbMod ? Boolean(dbMod.review_done) : prev.reviewDone,
        workFinished: dbMod ? Boolean(dbMod.work_finished) : prev.workFinished,
        workAttempts: dbWorks.length > 0 ? dbWorks : prev.workAttempts,
        examAttempts: dbExams.length > 0 ? dbExams : prev.examAttempts,
      };
    }
  }

  return next;
}
