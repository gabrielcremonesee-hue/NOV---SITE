import { CourseState, ExamAttempt, QuestionAttempt, RecipeProgressEntry } from '../progress';
import type { QuestionAttemptSnapshot } from '../../data/assessments';
import type { ProtectedCourseContentPayload, PublicQuizQuestion } from '../../data/coursePublicData';
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

const CLIENT_SESSION_KEY = 'fervec-client-session-id';
const CLIENT_SESSION_UID_KEY = 'fervec-client-session-uid';
let inMemoryFallbackSessionId: string | null = null;
let inMemoryFallbackUid: string | null = null;

async function getCurrentSessionInfo(): Promise<{ accessToken: string | null; userId: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { accessToken: null, userId: null };
  try {
    const { data } = await supabase.auth.getSession();
    return {
      accessToken: data?.session?.access_token ?? null,
      userId: data?.session?.user?.id ? String(data.session.user.id).trim().toLowerCase() : null,
    };
  } catch {
    return { accessToken: null, userId: null };
  }
}

async function getAccessToken(): Promise<string | null> {
  const info = await getCurrentSessionInfo();
  return info.accessToken;
}

function readStoredSessionId(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const fromLocal = localStorage.getItem(CLIENT_SESSION_KEY);
      if (fromLocal && fromLocal.trim()) {
        inMemoryFallbackSessionId = fromLocal.trim();
        return fromLocal.trim();
      }
    }
  } catch {
    // ignore storage errors
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      const fromSession = sessionStorage.getItem(CLIENT_SESSION_KEY);
      if (fromSession && fromSession.trim()) {
        inMemoryFallbackSessionId = fromSession.trim();
        return fromSession.trim();
      }
    }
  } catch {
    // ignore
  }
  return inMemoryFallbackSessionId || '';
}

function readStoredSessionUid(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const uid = localStorage.getItem(CLIENT_SESSION_UID_KEY);
      if (uid && uid.trim()) return uid.trim().toLowerCase();
    }
  } catch {
    // ignore
  }
  return inMemoryFallbackUid || '';
}

export function setClientSessionId(sessionId: string, userId?: string | null): void {
  const cleanSid = String(sessionId || '').trim();
  const cleanUid = userId ? String(userId).trim().toLowerCase() : null;
  if (!cleanSid) return;
  inMemoryFallbackSessionId = cleanSid;
  if (cleanUid) inMemoryFallbackUid = cleanUid;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CLIENT_SESSION_KEY, cleanSid);
      if (cleanUid) localStorage.setItem(CLIENT_SESSION_UID_KEY, cleanUid);
    }
  } catch {
    // ignore
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(CLIENT_SESSION_KEY, cleanSid);
    }
  } catch {
    // ignore
  }
}

export function getOrCreateClientSessionId(): string {
  return readStoredSessionId();
}

export function resetClientSessionId(): void {
  inMemoryFallbackSessionId = null;
  inMemoryFallbackUid = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CLIENT_SESSION_KEY);
      localStorage.removeItem(CLIENT_SESSION_UID_KEY);
    }
  } catch {
    // ignore
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(CLIENT_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const activeSid = readStoredSessionId();
  if (activeSid && !headers.has('x-fervec-session-id')) {
    headers.set('x-fervec-session-id', activeSid);
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

export async function claimActiveServerSession(options?: { forceNew?: boolean }): Promise<boolean> {
  try {
    const info = await getCurrentSessionInfo();
    if (!info.accessToken) return false;
    const currentSid = readStoredSessionId();
    const storedUid = readStoredSessionUid();
    const preserveIfValid =
      !options?.forceNew &&
      Boolean(currentSid) &&
      (!storedUid || !info.userId || storedUid === info.userId);

    const res = await authFetch('/api/session/claim', {
      method: 'POST',
      headers: preserveIfValid && currentSid ? { 'x-fervec-session-id': currentSid } : {},
      body: JSON.stringify({
        preserveIfValid,
        ...(preserveIfValid && currentSid ? { sessionId: currentSid } : {}),
        deviceLabel: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : '',
      }),
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; sessionId?: string };
    if (data?.sessionId) {
      setClientSessionId(data.sessionId, info.userId);
    }
    return true;
  } catch {
    return false;
  }
}

export async function logoutServerSession(): Promise<void> {
  try {
    const token = await getAccessToken();
    if (token) {
      await authFetch('/api/session/logout', { method: 'POST' });
    }
  } catch {
    // ignore
  } finally {
    resetClientSessionId();
  }
}

export async function recordLegalAcceptance(payload: {
  termsVersion: string;
  privacyVersion: string;
  courseSlug?: string;
  orderId?: string;
  acceptanceKind?: 'signup' | 'checkout';
  marketingWhatsapp?: boolean;
  marketingEmail?: boolean;
  preContractAccepted?: boolean;
  source?: string;
}): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) return false;
    const res = await authFetch('/api/legal/accept', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function requestOrderWithdrawal(
  orderId: string,
  reason?: string
): Promise<{
  ok: boolean;
  message?: string;
  status?: string;
  withdrawalStatus?: string;
  protocolCode?: string | null;
  refundError?: string | null;
  orderId?: string;
}> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { ok: false, message: 'Entre na sua conta para solicitar o arrependimento (Art. 49 CDC).' };
    }
    const res = await authFetch(`/api/orders/${encodeURIComponent(orderId)}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Desistência em até 7 dias (Art. 49 CDC).' }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      message?: string;
      status?: string;
      withdrawalStatus?: string;
      protocolCode?: string | null;
      refundError?: string | null;
      orderId?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        status: data.status,
        protocolCode: data.protocolCode ?? null,
        message: data.error || data.message || 'Não foi possível processar o arrependimento.',
      };
    }
    return {
      ok: true,
      message: data.message || 'Solicitação de arrependimento (Art. 49 CDC) registrada.',
      status: data.status,
      withdrawalStatus: data.withdrawalStatus,
      protocolCode: data.protocolCode ?? null,
      refundError: data.refundError ?? null,
      orderId: data.orderId || orderId,
    };
  } catch {
    return { ok: false, message: 'Falha de comunicação ao solicitar arrependimento.' };
  }
}

export interface ServerAdminTelemetry {
  ok?: boolean;
  financialGuard?: {
    dateKey: string;
    allowPaidAi: boolean;
    allowExternalTts: boolean;
    dailyBudgetUsd: number;
    estimatedSpendUsd: number;
    paidAiCallsToday: number;
    localFallbackCallsToday: number;
    externalTtsCallsToday: number;
    blockedCallsToday: number;
    circuitOpenUntilIso: string | null;
    lastBlockedReason: string | null;
  };
  priceConfirmation?: {
    confirmed: boolean;
    envVarName?: string;
    note?: string | null;
  };
  launchLock?: {
    productionAllowed: boolean;
    priceConfirmed: boolean;
    commercialLaunchApproved: boolean;
    legalPendingCleared: boolean;
    supplierAddressPending: boolean;
    officialPriceCents: number;
    blockers: string[];
    summaryNote: string;
  };
  supplierMaskedCpf?: string;
  addressPending?: boolean;
  singleSessionActiveCount?: number;
}

export async function fetchAdminTelemetry(): Promise<ServerAdminTelemetry | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const res = await authFetch('/api/admin/telemetry');
    if (!res.ok) return null;
    return (await res.json()) as ServerAdminTelemetry;
  } catch {
    return null;
  }
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

export async function fetchProtectedCourseContent(moduleKey?: string): Promise<{
  ok: boolean;
  status: number;
  code?: string;
  error?: string;
  data?: ProtectedCourseContentPayload;
}> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { ok: false, status: 401, code: 'AUTH_REQUIRED', error: 'Autenticação necessária.' };
    }
    const qs = moduleKey ? `?moduleKey=${encodeURIComponent(moduleKey)}` : '';
    const res = await authFetch(`/api/course/content${qs}`);
    const data = (await res.json().catch(() => ({}))) as Partial<ProtectedCourseContentPayload> & {
      code?: string;
      error?: string;
    };
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        status: res.status,
        code: data?.code,
        error: data?.error || 'Não foi possível carregar o conteúdo do curso.',
      };
    }
    return {
      ok: true,
      status: res.status,
      data: data as ProtectedCourseContentPayload,
    };
  } catch {
    return { ok: false, status: 0, error: 'Falha de conexão ao carregar o conteúdo do curso.' };
  }
}

export async function fetchSanitizedAssessmentQuestions(
  moduleKey: string,
  attemptType: 'work' | 'exam'
): Promise<{
  ok: boolean;
  status: number;
  code?: string;
  error?: string;
  bankVersion?: string;
  passingScorePercent?: number;
  questions?: PublicQuizQuestion[];
}> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { ok: false, status: 401, code: 'AUTH_REQUIRED', error: 'Autenticação necessária.' };
    }
    const qs = `?moduleKey=${encodeURIComponent(moduleKey)}&attemptType=${encodeURIComponent(attemptType)}`;
    const res = await authFetch(`/api/assessments/questions${qs}`);
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      code?: string;
      error?: string;
      bankVersion?: string;
      passingScorePercent?: number;
      questions?: PublicQuizQuestion[];
    };
    if (!res.ok || !Array.isArray(data?.questions)) {
      return {
        ok: false,
        status: res.status,
        code: data?.code,
        error: data?.error || 'Não foi possível carregar as questões.',
      };
    }
    return {
      ok: true,
      status: res.status,
      bankVersion: data.bankVersion,
      passingScorePercent: data.passingScorePercent,
      questions: data.questions,
    };
  } catch {
    return { ok: false, status: 0, error: 'Falha de conexão ao carregar as questões.' };
  }
}

export async function checkWorkAnswerOnServer(
  moduleKey: string,
  questionIndex: number,
  selectedAnswer: number
): Promise<{
  ok: boolean;
  status: number;
  code?: string;
  isCorrect?: boolean;
  correctIndex?: number;
  explanation?: string;
  tip?: string;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return { ok: false, status: 401, code: 'AUTH_REQUIRED', error: 'Autenticação necessária.' };
    }
    const res = await authFetch('/api/assessments/work-feedback', {
      method: 'POST',
      body: JSON.stringify({ moduleKey, questionIndex, selectedAnswer }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      code?: string;
      isCorrect?: boolean;
      correctIndex?: number;
      explanation?: string;
      tip?: string;
      error?: string;
    };
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        status: res.status,
        code: data?.code,
        error: data?.error || 'Não foi possível validar a resposta.',
      };
    }
    return {
      ok: true,
      status: res.status,
      isCorrect: Boolean(data.isCorrect),
      correctIndex: typeof data.correctIndex === 'number' ? data.correctIndex : -1,
      explanation: String(data.explanation || ''),
      tip: String(data.tip || ''),
    };
  } catch {
    return { ok: false, status: 0, error: 'Falha de conexão ao validar a resposta.' };
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
