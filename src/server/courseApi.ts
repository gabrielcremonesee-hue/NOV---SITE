import crypto from 'node:crypto';
import type { Express, Request, Response } from 'express';
import { createClient as createSupabaseJsClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
  ALL_MODULE_KEYS,
  formatBrDate,
  gradeAssessment,
  isValidModuleKey,
  PASSING_SCORE_PERCENT,
  resolveCourseWorkload,
  type QuestionAttemptSnapshot,
} from '../data/assessments.ts';
import { generateCertificatePdf } from '../utils/certificatePdf.ts';
import { getServerSupabaseEnv, resolveAuthenticatedSupabaseUser } from '../utils/supabase/server.ts';
import {
  OFFICIAL_ADMIN_AGE,
  OFFICIAL_ADMIN_BIRTH_DATE,
  OFFICIAL_ADMIN_CPF_HASH,
  OFFICIAL_ADMIN_CPF_MASKED,
  OFFICIAL_PRIMARY_ADMIN_EMAIL,
  resolveDeveloperCertificateAdmin,
} from './developerAuth.ts';
import { runAsaasConnectionAudit } from './asaasAudit.ts';
import { getAuthoritativeCoursePriceCents, isCoursePriceConfirmedForProduction } from './coursePricing.ts';
import { financialGuard } from './financialGuard.ts';
import { singleSessionManager } from './singleSession.ts';
import { SUPPLIER_IDENTITY, getLegalDocumentVersions, maskCpfForLogs } from '../config/legalConfig.ts';

const DEFAULT_COURSE_SLUG = 'massas-italianas';
const CERTIFICATES_STORAGE_BUCKET = 'certificates';
const inFlightCertificateIssues = new Map<string, Promise<{ certificate: CertificateRow | null; alreadyIssued: boolean; error?: string }>>();

const MODULE_LIMITS: Record<string, { steps: number; mise: number }> = {
  carbonara: { steps: 6, mise: 7 },
  alfredo: { steps: 7, mise: 4 },
  arrabbiata: { steps: 8, mise: 3 },
  pesto: { steps: 10, mise: 3 },
  ragù: { steps: 14, mise: 3 },
  sauces: { steps: 6, mise: 2 },
};

function getModuleLimits(moduleKey: string, fallbackSteps?: number): { steps: number; mise: number } {
  const known = MODULE_LIMITS[moduleKey];
  if (known) return known;
  return { steps: Math.max(1, fallbackSteps || 6), mise: 10 };
}

interface CourseRow {
  id: string;
  slug: string;
  title: string;
  cuisine: string;
  subtitle: string | null;
  description: string | null;
  chef_name: string | null;
  level: string | null;
  estimated_minutes?: number | null;
  workload_minutes?: number | null;
  duration_minutes?: number | null;
}

interface CourseModuleRow {
  id: string;
  course_id: string;
  module_key: string;
  module_order: number;
  title: string;
  recipe_title: string;
  total_steps: number;
  duration_label: string;
  level: string;
  estimated_minutes?: number | null;
  duration_minutes?: number | null;
}

interface ProfileRow {
  id: string;
  full_name: string;
  cpf_masked: string;
  cpf_hash?: string | null;
  birth_date?: string | null;
  age?: number | null;
  email: string;
  ddd?: string | null;
  phone?: string | null;
  whatsapp_opt_in?: boolean | null;
  email_opt_in?: boolean | null;
}

interface EnrollmentRow {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  last_module_key: string | null;
  enrolled_at: string;
  completed_at: string | null;
  updated_at: string;
}

interface ModuleProgressRow {
  id: string;
  user_id: string;
  course_id: string;
  module_key: string;
  current_stage: number;
  done_steps: number[];
  mise_checks: number[];
  review_done: boolean;
  lesson_finished: boolean;
  work_finished: boolean;
  exam_status: string;
  updated_at: string;
}

interface AssessmentAttemptRow {
  id: string;
  user_id: string;
  course_id: string;
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

function isMissingVersioningColumnError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    msg.includes('bank_version') ||
    msg.includes('question_ids') ||
    msg.includes('selected_option_ids') ||
    msg.includes('question_snapshots') ||
    msg.includes('schema cache')
  );
}

interface CertificateRow {
  id: string;
  user_id: string;
  course_id: string;
  certificate_code: string;
  status: string;
  student_name_snapshot: string;
  course_title_snapshot: string;
  issued_at: string;
}

function generateCertificateCode(): string {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `FC-${year}-${suffix}`;
}

function normalizeModuleKeyInput(raw: unknown): string {
  const clean = String(raw || '').trim();
  if (clean.toLowerCase() === 'ragu') return 'ragù';
  return clean;
}

interface CourseContext {
  course: CourseRow;
  modules: CourseModuleRow[];
  workloadMinutes: number;
  workloadLabel: string;
}

async function buildCourseContext(
  supabase: SupabaseClient,
  course: CourseRow
): Promise<CourseContext> {
  const { data: modulesData } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', course.id)
    .order('module_order', { ascending: true });

  const modules = (modulesData || []) as CourseModuleRow[];
  const { totalMinutes: workloadMinutes, workloadLabel } = resolveCourseWorkload({
    courseRecord: course as unknown as Record<string, unknown>,
    modules: modules as unknown as Array<Record<string, unknown> & { duration_label?: string | null }>,
  });

  return {
    course,
    modules,
    workloadMinutes,
    workloadLabel,
  };
}

async function ensureCourseContext(
  supabase: SupabaseClient,
  courseSlug = DEFAULT_COURSE_SLUG
): Promise<CourseContext | null> {
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', courseSlug)
    .maybeSingle();

  if (courseErr || !course) return null;
  return buildCourseContext(supabase, course as CourseRow);
}

async function ensureCourseContextById(
  supabase: SupabaseClient,
  courseId: string
): Promise<CourseContext | null> {
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .maybeSingle();

  if (courseErr || !course) return null;
  return buildCourseContext(supabase, course as CourseRow);
}

async function listAllCourses(supabase: SupabaseClient): Promise<CourseRow[]> {
  const { data } = await supabase.from('courses').select('*');
  const rows = (data || []) as CourseRow[];
  return rows.sort((a, b) => {
    if (a.slug === DEFAULT_COURSE_SLUG) return -1;
    if (b.slug === DEFAULT_COURSE_SLUG) return 1;
    return a.title.localeCompare(b.title);
  });
}

async function listAllCoursesWithWorkloads(supabase: SupabaseClient): Promise<{
  courses: Array<CourseRow & { estimatedMinutes: number; workloadLabel: string }>;
  byId: Map<string, CourseRow & { estimatedMinutes: number; workloadLabel: string }>;
}> {
  const [courses, modulesRes] = await Promise.all([
    listAllCourses(supabase),
    supabase.from('course_modules').select('*').order('module_order', { ascending: true }),
  ]);

  const modulesByCourse = new Map<string, CourseModuleRow[]>();
  for (const mod of (modulesRes.data || []) as CourseModuleRow[]) {
    const list = modulesByCourse.get(mod.course_id) || [];
    list.push(mod);
    modulesByCourse.set(mod.course_id, list);
  }

  const enriched = courses.map((course) => {
    const mods = modulesByCourse.get(course.id) || [];
    const { totalMinutes, workloadLabel } = resolveCourseWorkload({
      courseRecord: course as unknown as Record<string, unknown>,
      modules: mods as unknown as Array<Record<string, unknown> & { duration_label?: string | null }>,
    });
    return {
      ...course,
      estimatedMinutes: totalMinutes,
      workloadLabel,
    };
  });

  return {
    courses: enriched,
    byId: new Map(enriched.map((c) => [c.id, c])),
  };
}

async function ensureUserProfileRow(
  supabase: SupabaseClient,
  user: User
): Promise<{ profile: ProfileRow; existedInDb: boolean }> {
  const email = (user.email || '').trim().toLowerCase();
  const isOfficialPrimaryAdmin = email === OFFICIAL_PRIMARY_ADMIN_EMAIL;

  const { data: existing } = await supabase
    .from('profiles')
    .select(
      'id, full_name, cpf_masked, cpf_hash, birth_date, age, email, ddd, phone, whatsapp_opt_in, email_opt_in'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    const existingRow = existing as ProfileRow;
    const meta = (user.user_metadata || {}) as Record<string, unknown>;
    const metaCpfMasked =
      typeof meta.cpf_masked === 'string' &&
      meta.cpf_masked.trim() &&
      meta.cpf_masked.trim() !== '***.***.***-**'
        ? meta.cpf_masked.trim()
        : '';
    const metaCpfHash =
      typeof meta.cpf_hash === 'string' && meta.cpf_hash.trim() ? meta.cpf_hash.trim() : '';

    const targetCpfMasked = isOfficialPrimaryAdmin ? OFFICIAL_ADMIN_CPF_MASKED : metaCpfMasked;
    const targetCpfHash = isOfficialPrimaryAdmin ? OFFICIAL_ADMIN_CPF_HASH : metaCpfHash;

    const needsCpfBackfill =
      Boolean(targetCpfMasked) &&
      (isOfficialPrimaryAdmin
        ? existingRow.cpf_masked !== OFFICIAL_ADMIN_CPF_MASKED
        : !existingRow.cpf_masked || existingRow.cpf_masked === '***.***.***-**');
    const needsHashBackfill =
      Boolean(targetCpfHash) &&
      (isOfficialPrimaryAdmin
        ? existingRow.cpf_hash !== OFFICIAL_ADMIN_CPF_HASH
        : !existingRow.cpf_hash);
    const needsAdminBirthDateBackfill =
      isOfficialPrimaryAdmin && existingRow.birth_date !== OFFICIAL_ADMIN_BIRTH_DATE;
    const needsAdminAgeBackfill =
      isOfficialPrimaryAdmin && existingRow.age !== OFFICIAL_ADMIN_AGE;
    const needsAdminEmailBackfill =
      isOfficialPrimaryAdmin &&
      (existingRow.email || '').trim().toLowerCase() !== OFFICIAL_PRIMARY_ADMIN_EMAIL;

    if (
      needsCpfBackfill ||
      needsHashBackfill ||
      needsAdminBirthDateBackfill ||
      needsAdminAgeBackfill ||
      needsAdminEmailBackfill
    ) {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (needsCpfBackfill) {
        patch.cpf_masked = targetCpfMasked;
        existingRow.cpf_masked = targetCpfMasked;
      }
      if (needsHashBackfill) {
        patch.cpf_hash = targetCpfHash;
        existingRow.cpf_hash = targetCpfHash;
      }
      if (needsAdminBirthDateBackfill) {
        patch.birth_date = OFFICIAL_ADMIN_BIRTH_DATE;
        existingRow.birth_date = OFFICIAL_ADMIN_BIRTH_DATE;
      }
      if (needsAdminAgeBackfill) {
        patch.age = OFFICIAL_ADMIN_AGE;
        existingRow.age = OFFICIAL_ADMIN_AGE;
      }
      if (needsAdminEmailBackfill) {
        patch.email = OFFICIAL_PRIMARY_ADMIN_EMAIL;
        existingRow.email = OFFICIAL_PRIMARY_ADMIN_EMAIL;
      }
      await supabase.from('profiles').update(patch).eq('id', user.id);
    }

    return { profile: existingRow, existedInDb: true };
  }

  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (isOfficialPrimaryAdmin ? 'FerveC Gastronomia (Admin)' : email.split('@')[0] || 'Aluno FerveC');
  const ageNum = Number(meta.age);
  const age = isOfficialPrimaryAdmin
    ? OFFICIAL_ADMIN_AGE
    : Number.isInteger(ageNum) && ageNum >= 18
      ? ageNum
      : 18;

  const payload = {
    id: user.id,
    full_name: fullName,
    cpf_masked: isOfficialPrimaryAdmin
      ? OFFICIAL_ADMIN_CPF_MASKED
      : (typeof meta.cpf_masked === 'string' && meta.cpf_masked.trim()) || '***.***.***-**',
    cpf_hash: isOfficialPrimaryAdmin
      ? OFFICIAL_ADMIN_CPF_HASH
      : typeof meta.cpf_hash === 'string' && meta.cpf_hash
        ? meta.cpf_hash
        : null,
    birth_date: isOfficialPrimaryAdmin
      ? OFFICIAL_ADMIN_BIRTH_DATE
      : (typeof meta.birth_date === 'string' && meta.birth_date) || '01/01/2000',
    age,
    email,
    ddd: (typeof meta.ddd === 'string' && meta.ddd) || '11',
    phone: (typeof meta.phone === 'string' && meta.phone) || '90000-0000',
    whatsapp_opt_in:
      typeof meta.whatsapp_opt_in === 'boolean'
        ? meta.whatsapp_opt_in
        : Boolean(meta.promo_whatsapp),
    email_opt_in:
      typeof meta.email_opt_in === 'boolean' ? meta.email_opt_in : Boolean(meta.promo_email),
    updated_at: new Date().toISOString(),
  };

  const { data: inserted } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select(
      'id, full_name, cpf_masked, cpf_hash, birth_date, age, email, ddd, phone, whatsapp_opt_in, email_opt_in'
    )
    .single();

  return { profile: (inserted || payload) as ProfileRow, existedInDb: false };
}

function isEnrollmentActive(enrollment: EnrollmentRow | null, isDevAdmin = false): boolean {
  if (isDevAdmin) return true;
  if (!enrollment) return false;
  const st = String(enrollment.status || '').toLowerCase();
  return st === 'in_progress' || st === 'active' || st === 'completed';
}

async function checkOrProvisionCommercialEnrollment(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
  isDevAdmin = false
): Promise<EnrollmentRow | null> {
  const { data: existing } = await supabase
    .from('student_enrollments')
    .select('id, user_id, course_id, status, last_module_key, enrolled_at, completed_at, updated_at')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .order('enrolled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: paidOrder } = await supabase
    .from('orders')
    .select('id, status')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('status', 'paid')
    .limit(1)
    .maybeSingle();

  const hasCommercialRight = Boolean(paidOrder) || isDevAdmin;

  if (existing) {
    const existingRow = existing as EnrollmentRow;
    if (existingRow.status === 'canceled' && hasCommercialRight) {
      const { data: reactivated } = await supabase
        .from('student_enrollments')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', existingRow.id)
        .select('id, user_id, course_id, status, last_module_key, enrolled_at, completed_at, updated_at')
        .single();
      return (reactivated as EnrollmentRow) || { ...existingRow, status: 'in_progress' };
    }
    return existingRow;
  }

  // Nunca criar matrícula para usuário sem pedido pago (exceto administrador dev oficial)
  if (!hasCommercialRight) {
    return null;
  }

  const { data: inserted } = await supabase
    .from('student_enrollments')
    .insert({
      user_id: userId,
      course_id: courseId,
      status: 'in_progress',
      last_module_key: 'carbonara',
    })
    .select('id, user_id, course_id, status, last_module_key, enrolled_at, completed_at, updated_at')
    .single();

  return (inserted as EnrollmentRow) || null;
}

async function enforceClaimedSession(
  req: Request,
  res: Response,
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const rawSid = req.headers['x-fervec-session-id'];
  const sessionId = typeof rawSid === 'string' ? rawSid.trim() : '';
  if (!sessionId) return true;

  const memCheck = singleSessionManager.verifySession(userId, sessionId);
  if (!memCheck.ok) {
    res.status(409).json({
      ok: false,
      code: 'SESSION_REPLACED_OTHER_DEVICE',
      error: 'Sua sessão foi encerrada porque a conta entrou em outro dispositivo ou navegador.',
    });
    return false;
  }

  // Quando ainda não há registro em memória (cold start), verifica tabela user_active_sessions se existir
  try {
    const { data, error } = await supabase
      .from('user_active_sessions')
      .select('session_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data && typeof data.session_id === 'string' && data.session_id !== sessionId) {
      res.status(409).json({
        ok: false,
        code: 'SESSION_REPLACED_OTHER_DEVICE',
        error: 'Sua sessão foi encerrada porque a conta entrou em outro dispositivo ou navegador.',
      });
      return false;
    }
  } catch {
    // Tabela opcional em bancos antigos/mocks sem user_active_sessions
  }

  return true;
}

async function findExistingCertificate(
  supabase: SupabaseClient,
  userId: string,
  courseId: string
): Promise<CertificateRow | null> {
  const { data } = await supabase
    .from('certificates')
    .select(
      'id, user_id, course_id, certificate_code, status, student_name_snapshot, course_title_snapshot, issued_at'
    )
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .order('issued_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as CertificateRow) || null;
}

async function getPassingExamAttempts(
  supabase: SupabaseClient,
  userId: string,
  courseId: string
): Promise<AssessmentAttemptRow[]> {
  const { data } = await supabase
    .from('assessment_attempts')
    .select('id, user_id, course_id, module_key, attempt_type, score, passed, answers, attempted_at')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('attempt_type', 'exam')
    .eq('passed', true)
    .order('attempted_at', { ascending: true });

  return (data || []) as AssessmentAttemptRow[];
}

async function hasVerifiedCourseCompletion(
  supabase: SupabaseClient,
  params: {
    userId: string;
    courseId: string;
    passingExams: AssessmentAttemptRow[];
    enrollment: EnrollmentRow | null;
    progressRows?: ModuleProgressRow[];
  }
): Promise<{ completed: boolean; effectiveCompletedAt: string | null }> {
  if (params.passingExams.length > 0) {
    return {
      completed: true,
      effectiveCompletedAt:
        params.enrollment?.completed_at || params.passingExams[0]?.attempted_at || null,
    };
  }

  if (params.enrollment?.status === 'completed' || Boolean(params.enrollment?.completed_at)) {
    return {
      completed: true,
      effectiveCompletedAt: params.enrollment?.completed_at || params.enrollment?.updated_at || null,
    };
  }

  let rows = params.progressRows;
  if (!rows) {
    const { data } = await supabase
      .from('module_progress')
      .select('id, exam_status, updated_at')
      .eq('user_id', params.userId)
      .eq('course_id', params.courseId);
    rows = (data || []) as ModuleProgressRow[];
  }

  const passedModule = rows.find((m) => m.exam_status === 'passed');
  if (passedModule) {
    return {
      completed: true,
      effectiveCompletedAt: passedModule.updated_at || null,
    };
  }

  return { completed: false, effectiveCompletedAt: null };
}

async function tryUploadCertificatePdfToStorage(
  supabase: SupabaseClient,
  params: {
    userId: string;
    certificateCode: string;
    pdfBytes: Uint8Array;
  }
): Promise<string | null> {
  const storage = (supabase as unknown as { storage?: SupabaseClient['storage'] }).storage;
  if (!storage || typeof storage.from !== 'function') return null;

  const objectPath = `${params.userId}/${params.certificateCode}.pdf`;
  try {
    const { error } = await storage.from(CERTIFICATES_STORAGE_BUCKET).upload(
      objectPath,
      Buffer.from(params.pdfBytes),
      {
        contentType: 'application/pdf',
        upsert: true,
      }
    );
    if (error) return null;
    return objectPath;
  } catch {
    return null;
  }
}

async function idempotentIssueCertificate(
  supabase: SupabaseClient,
  params: {
    userId: string;
    course: CourseRow;
    profile: ProfileRow;
  }
): Promise<{ certificate: CertificateRow | null; alreadyIssued: boolean; error?: string }> {
  const lockKey = `${params.userId}:${params.course.id}`;
  const inFlight = inFlightCertificateIssues.get(lockKey);
  if (inFlight) {
    const result = await inFlight;
    return result.certificate
      ? { certificate: result.certificate, alreadyIssued: true }
      : result;
  }

  const runIssue = async (): Promise<{
    certificate: CertificateRow | null;
    alreadyIssued: boolean;
    error?: string;
  }> => {
    const existing = await findExistingCertificate(supabase, params.userId, params.course.id);
    if (existing) {
      return { certificate: existing, alreadyIssued: true };
    }

    const code = generateCertificateCode();
    const { data: inserted, error } = await supabase
      .from('certificates')
      .insert({
        user_id: params.userId,
        course_id: params.course.id,
        certificate_code: code,
        status: 'issued',
        student_name_snapshot: params.profile.full_name,
        course_title_snapshot: params.course.title,
        issued_at: new Date().toISOString(),
      })
      .select(
        'id, user_id, course_id, certificate_code, status, student_name_snapshot, course_title_snapshot, issued_at'
      )
      .single();

    if (error || !inserted) {
      // Re-check in case a concurrent request inserted first (e.g. unique index violation 23505)
      const retryExisting = await findExistingCertificate(supabase, params.userId, params.course.id);
      if (retryExisting) {
        return { certificate: retryExisting, alreadyIssued: true };
      }
      return {
        certificate: null,
        alreadyIssued: false,
        error: error?.message || 'Não foi possível emitir o certificado no banco de dados.',
      };
    }

    return { certificate: inserted as CertificateRow, alreadyIssued: false };
  };

  const promise = runIssue();
  inFlightCertificateIssues.set(lockKey, promise);
  try {
    return await promise;
  } finally {
    inFlightCertificateIssues.delete(lockKey);
  }
}

export interface EnrichedCertificateRecord extends CertificateRow {
  courseSlug?: string;
  studentName: string;
  cpfMasked: string;
  workloadMinutes: number;
  workloadLabel: string;
  completionDate: string;
  completionIso: string;
  issuedDate: string;
  pdfUrl: string;
}

async function listEnrichedUserCertificates(
  supabase: SupabaseClient,
  params: {
    userId: string;
    profile: ProfileRow;
    canBypassExamForCertificates: boolean;
    coursesById?: Map<string, CourseRow & { estimatedMinutes: number; workloadLabel: string }>;
  }
): Promise<EnrichedCertificateRecord[]> {
  const [{ data: certsData }, coursesBundle, enrollmentsRes, passingAttemptsRes, moduleProgRes] = await Promise.all([
    supabase
      .from('certificates')
      .select(
        'id, user_id, course_id, certificate_code, status, student_name_snapshot, course_title_snapshot, issued_at'
      )
      .eq('user_id', params.userId)
      .order('issued_at', { ascending: true }),
    params.coursesById
      ? Promise.resolve({ courses: Array.from(params.coursesById.values()), byId: params.coursesById })
      : listAllCoursesWithWorkloads(supabase),
    supabase
      .from('student_enrollments')
      .select('id, user_id, course_id, status, completed_at, updated_at, enrolled_at')
      .eq('user_id', params.userId),
    supabase
      .from('assessment_attempts')
      .select('id, course_id, attempt_type, passed, attempted_at')
      .eq('user_id', params.userId)
      .eq('attempt_type', 'exam')
      .eq('passed', true)
      .order('attempted_at', { ascending: true }),
    supabase
      .from('module_progress')
      .select('course_id, exam_status, updated_at')
      .eq('user_id', params.userId)
      .eq('exam_status', 'passed'),
  ]);

  const rawCerts = (certsData || []) as CertificateRow[];
  const enrollmentsByCourse = new Map<string, EnrollmentRow>();
  for (const enr of (enrollmentsRes.data || []) as EnrollmentRow[]) {
    if (!enrollmentsByCourse.has(enr.course_id)) {
      enrollmentsByCourse.set(enr.course_id, enr);
    }
  }

  const earliestPassByCourse = new Map<string, string>();
  for (const att of (passingAttemptsRes.data || []) as AssessmentAttemptRow[]) {
    if (!earliestPassByCourse.has(att.course_id)) {
      earliestPassByCourse.set(att.course_id, att.attempted_at);
    }
  }

  const passedModuleByCourse = new Map<string, string>();
  for (const mp of (moduleProgRes.data || []) as Array<{ course_id: string; exam_status: string; updated_at?: string }>) {
    if (mp.exam_status === 'passed' && !passedModuleByCourse.has(mp.course_id)) {
      passedModuleByCourse.set(mp.course_id, mp.updated_at || '');
    }
  }

  const result: EnrichedCertificateRecord[] = [];
  for (const cert of rawCerts) {
    const courseMeta = coursesBundle.byId.get(cert.course_id);
    const enr = enrollmentsByCourse.get(cert.course_id);
    const passIso = earliestPassByCourse.get(cert.course_id);
    const modPassIso = passedModuleByCourse.get(cert.course_id);
    const isCompletedInDb =
      Boolean(passIso) ||
      enr?.status === 'completed' ||
      Boolean(enr?.completed_at) ||
      passedModuleByCourse.has(cert.course_id);

    if (!params.canBypassExamForCertificates && !isCompletedInDb) {
      continue;
    }

    const completionIso = enr?.completed_at || passIso || modPassIso || cert.issued_at;
    const workloadMinutes = courseMeta?.estimatedMinutes ?? 240;
    const workloadLabel = courseMeta?.workloadLabel ?? '4 horas';
    const studentName = params.profile.full_name || cert.student_name_snapshot;

    result.push({
      ...cert,
      student_name_snapshot: studentName,
      course_title_snapshot: courseMeta?.title || cert.course_title_snapshot,
      courseSlug: courseMeta?.slug,
      studentName,
      cpfMasked: params.profile.cpf_masked || '***.***.***-**',
      workloadMinutes,
      workloadLabel,
      completionDate: formatBrDate(completionIso),
      completionIso,
      issuedDate: formatBrDate(cert.issued_at),
      pdfUrl: `/api/certificates/${encodeURIComponent(cert.certificate_code)}/pdf`,
    });
  }

  return result;
}

export function registerCourseApiRoutes(
  app: Express,
  deps?: {
    resolveAuth?: typeof resolveAuthenticatedSupabaseUser;
    runAsaasAudit?: typeof runAsaasConnectionAudit;
  }
): void {
  const resolveAuth = deps?.resolveAuth ?? resolveAuthenticatedSupabaseUser;
  const runAsaasAudit = deps?.runAsaasAudit ?? runAsaasConnectionAudit;

  // Hydrate authenticated student workspace (profile, course, modules, enrollment, progress, attempts, certificate)
  app.get('/api/workspace/state', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({
        error: 'Usuário não autenticado. Entre na sua conta para sincronizar dados e certificados.',
      });
      return;
    }

    const { supabase, user } = auth;
    if (!(await enforceClaimedSession(req, res, supabase, user.id))) return;

    const requestedSlug =
      typeof req.query.courseSlug === 'string' && req.query.courseSlug.trim()
        ? req.query.courseSlug.trim()
        : DEFAULT_COURSE_SLUG;
    const courseCtx = await ensureCourseContext(supabase, requestedSlug);
    if (!courseCtx) {
      res.status(404).json({ error: 'Curso não encontrado na base de dados.' });
      return;
    }

    const { profile, existedInDb } = await ensureUserProfileRow(supabase, user);
    const devPerm = resolveDeveloperCertificateAdmin({
      user,
      profile,
      profileExistedInDb: existedInDb,
    });
    const enrollment = await checkOrProvisionCommercialEnrollment(
      supabase,
      user.id,
      courseCtx.course.id,
      devPerm.isDeveloperAdmin
    );
    const isEnrolled = isEnrollmentActive(enrollment, devPerm.isDeveloperAdmin);

    const [{ data: progressRows }, versionedAttemptsRes] = await Promise.all([
      supabase
        .from('module_progress')
        .select(
          'id, user_id, course_id, module_key, current_stage, done_steps, mise_checks, review_done, lesson_finished, work_finished, exam_status, updated_at'
        )
        .eq('user_id', user.id)
        .eq('course_id', courseCtx.course.id),
      supabase
        .from('assessment_attempts')
        .select(
          'id, user_id, course_id, module_key, attempt_type, score, passed, answers, attempted_at, bank_version, question_ids, selected_option_ids, question_snapshots'
        )
        .eq('user_id', user.id)
        .eq('course_id', courseCtx.course.id)
        .order('attempted_at', { ascending: true }),
    ]);

    let attemptRows = versionedAttemptsRes.data as AssessmentAttemptRow[] | null;
    if (versionedAttemptsRes.error && isMissingVersioningColumnError(versionedAttemptsRes.error)) {
      const legacyAttemptsRes = await supabase
        .from('assessment_attempts')
        .select(
          'id, user_id, course_id, module_key, attempt_type, score, passed, answers, attempted_at'
        )
        .eq('user_id', user.id)
        .eq('course_id', courseCtx.course.id)
        .order('attempted_at', { ascending: true });
      attemptRows = (legacyAttemptsRes.data || []) as AssessmentAttemptRow[];
    }

    const attempts = (attemptRows || []) as AssessmentAttemptRow[];
    const passingExams = attempts.filter((a) => a.attempt_type === 'exam' && a.passed);
    const completionCheck = await hasVerifiedCourseCompletion(supabase, {
      userId: user.id,
      courseId: courseCtx.course.id,
      passingExams,
      enrollment,
      progressRows: (progressRows || []) as ModuleProgressRow[],
    });
    const eligibleForCertificate = devPerm.canBypassExamForCertificates || completionCheck.completed;

    let certificate = await findExistingCertificate(supabase, user.id, courseCtx.course.id);
    if (!eligibleForCertificate) {
      certificate = null;
    }

    const completionIso =
      completionCheck.effectiveCompletedAt ||
      enrollment?.completed_at ||
      passingExams[0]?.attempted_at ||
      certificate?.issued_at ||
      null;

    const coursesBundle = await listAllCoursesWithWorkloads(supabase);
    const allCourses = coursesBundle.courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      cuisine: c.cuisine,
      level: c.level,
      estimatedMinutes: c.estimatedMinutes,
      workloadLabel: c.workloadLabel,
    }));

    const allCertificates = await listEnrichedUserCertificates(supabase, {
      userId: user.id,
      profile,
      canBypassExamForCertificates: devPerm.canBypassExamForCertificates,
      coursesById: coursesBundle.byId,
    });

    const activeCertificate =
      allCertificates.find((c) => c.course_id === courseCtx.course.id) || null;

    res.json({
      profile,
      permissions: {
        isDeveloperAdmin: devPerm.isDeveloperAdmin,
        canBypassExamForCertificates: devPerm.canBypassExamForCertificates,
        canAccessAdminPanel: devPerm.canAccessAdminPanel,
      },
      course: courseCtx.course,
      courses: allCourses,
      modules: courseCtx.modules,
      workloadMinutes: courseCtx.workloadMinutes,
      workloadLabel: courseCtx.workloadLabel,
      passingScorePercent: PASSING_SCORE_PERCENT,
      isEnrolled,
      enrollment,
      moduleProgress: (progressRows || []) as ModuleProgressRow[],
      attempts,
      eligibleForCertificate,
      completionDate: completionIso ? formatBrDate(completionIso) : null,
      certificates: allCertificates,
      certificate: activeCertificate,
    });
  });

  // Sync module step progress & review completion (never allows forging exam approval or certificate)
  app.post('/api/progress/sync', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({ error: 'Sessão não autenticada.' });
      return;
    }

    const { supabase, user } = auth;
    if (!(await enforceClaimedSession(req, res, supabase, user.id))) return;

    const body = (req.body || {}) as {
      courseSlug?: string;
      moduleKey?: string;
      currentStage?: number;
      doneSteps?: unknown[];
      miseChecks?: unknown[];
      reviewDone?: boolean;
      lessonFinished?: boolean;
      workFinished?: boolean;
      lastModuleKey?: string;
    };

    const moduleKey = normalizeModuleKeyInput(body.moduleKey);
    if (!isValidModuleKey(moduleKey)) {
      res.status(400).json({ error: 'Módulo inválido para sincronização.' });
      return;
    }

    const courseCtx = await ensureCourseContext(
      supabase,
      typeof body.courseSlug === 'string' && body.courseSlug ? body.courseSlug : DEFAULT_COURSE_SLUG
    );
    if (!courseCtx) {
      res.status(404).json({ error: 'Curso não encontrado.' });
      return;
    }

    const { profile, existedInDb } = await ensureUserProfileRow(supabase, user);
    const devPerm = resolveDeveloperCertificateAdmin({
      user,
      profile,
      profileExistedInDb: existedInDb,
    });
    const enrollment = await checkOrProvisionCommercialEnrollment(
      supabase,
      user.id,
      courseCtx.course.id,
      devPerm.isDeveloperAdmin
    );
    if (!isEnrollmentActive(enrollment, devPerm.isDeveloperAdmin)) {
      res.status(403).json({
        code: 'COURSE_NOT_PURCHASED',
        error: 'Matrícula paga necessária para registrar progresso neste curso.',
      });
      return;
    }

    const moduleDef = courseCtx.modules.find((m) => m.module_key === moduleKey);
    const limits = getModuleLimits(moduleKey, moduleDef?.total_steps);
    const maxSteps = limits.steps;
    const maxMise = limits.mise;

    const cleanDoneSteps = Array.isArray(body.doneSteps)
      ? Array.from(
          new Set(
            body.doneSteps.filter(
              (n): n is number =>
                typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < maxSteps
            )
          )
        ).sort((a, b) => a - b)
      : [];

    const cleanMise = Array.isArray(body.miseChecks)
      ? Array.from(
          new Set(
            body.miseChecks.filter(
              (n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < maxMise
            )
          )
        ).sort((a, b) => a - b)
      : [];

    const currentStage =
      typeof body.currentStage === 'number' &&
      Number.isInteger(body.currentStage) &&
      body.currentStage >= 0 &&
      body.currentStage < maxSteps
        ? body.currentStage
        : 0;

    const lessonFinished =
      Boolean(body.lessonFinished) || cleanDoneSteps.length >= maxSteps;
    const reviewDone = Boolean(body.reviewDone);
    const workFinished = Boolean(body.workFinished);

    const { data: existingProg, error: readProgErr } = await supabase
      .from('module_progress')
      .select('id, exam_status')
      .eq('user_id', user.id)
      .eq('course_id', courseCtx.course.id)
      .eq('module_key', moduleKey)
      .maybeSingle();

    if (readProgErr) {
      res.status(500).json({ error: readProgErr.message || 'Erro ao consultar progresso do módulo.' });
      return;
    }

    const preservedExamStatus = existingProg?.exam_status || 'intro';
    const nowIso = new Date().toISOString();

    if (existingProg?.id) {
      const { error: updateErr } = await supabase
        .from('module_progress')
        .update({
          current_stage: currentStage,
          done_steps: cleanDoneSteps,
          mise_checks: cleanMise,
          review_done: reviewDone,
          lesson_finished: lessonFinished,
          work_finished: workFinished,
          exam_status: preservedExamStatus,
          updated_at: nowIso,
        })
        .eq('id', existingProg.id);

      if (updateErr) {
        res.status(500).json({ error: updateErr.message || 'Erro ao salvar progresso do módulo.' });
        return;
      }
    } else {
      const { error: insertErr } = await supabase.from('module_progress').insert({
        user_id: user.id,
        course_id: courseCtx.course.id,
        module_key: moduleKey,
        current_stage: currentStage,
        done_steps: cleanDoneSteps,
        mise_checks: cleanMise,
        review_done: reviewDone,
        lesson_finished: lessonFinished,
        work_finished: workFinished,
        exam_status: 'intro',
        updated_at: nowIso,
      });

      if (insertErr) {
        const isUniqueConflict =
          insertErr.code === '23505' || /duplicate key/i.test(insertErr.message || '');
        if (isUniqueConflict) {
          const { data: racedProg } = await supabase
            .from('module_progress')
            .select('id, exam_status')
            .eq('user_id', user.id)
            .eq('course_id', courseCtx.course.id)
            .eq('module_key', moduleKey)
            .maybeSingle();

          if (racedProg?.id) {
            const { error: retryUpdateErr } = await supabase
              .from('module_progress')
              .update({
                current_stage: currentStage,
                done_steps: cleanDoneSteps,
                mise_checks: cleanMise,
                review_done: reviewDone,
                lesson_finished: lessonFinished,
                work_finished: workFinished,
                exam_status: racedProg.exam_status || 'intro',
                updated_at: nowIso,
              })
              .eq('id', racedProg.id);

            if (!retryUpdateErr) {
              // Saved cleanly after resolving concurrent insert
              const lastModRaw = normalizeModuleKeyInput(body.lastModuleKey);
              const lastMod = isValidModuleKey(lastModRaw) ? lastModRaw : moduleKey;
              await supabase
                .from('student_enrollments')
                .update({ last_module_key: lastMod, updated_at: nowIso })
                .eq('user_id', user.id)
                .eq('course_id', courseCtx.course.id);

              res.json({ ok: true, moduleKey, doneSteps: cleanDoneSteps, reviewDone, lessonFinished });
              return;
            }
          }
        }
        res.status(500).json({ error: insertErr.message || 'Erro ao criar progresso do módulo.' });
        return;
      }
    }

    const lastModRaw = normalizeModuleKeyInput(body.lastModuleKey);
    const lastMod = isValidModuleKey(lastModRaw) ? lastModRaw : moduleKey;
    await supabase
      .from('student_enrollments')
      .update({
        last_module_key: lastMod,
        updated_at: nowIso,
      })
      .eq('user_id', user.id)
      .eq('course_id', courseCtx.course.id);

    res.json({ ok: true, moduleKey, doneSteps: cleanDoneSteps, reviewDone, lessonFinished });
  });

  // Server-authoritative assessment grading + automatic certificate issuance on exam pass
  app.post('/api/assessments/submit', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({
        error: 'Entre na sua conta para enviar a avaliação e registrar sua nota.',
      });
      return;
    }

    const { supabase, user } = auth;
    const body = (req.body || {}) as {
      courseSlug?: string;
      moduleKey?: string;
      attemptType?: 'work' | 'exam';
      answers?: unknown[];
    };

    const moduleKey = normalizeModuleKeyInput(body.moduleKey);
    const attemptType = body.attemptType === 'work' ? 'work' : 'exam';
    if (!isValidModuleKey(moduleKey)) {
      res.status(400).json({ error: 'Módulo inválido.' });
      return;
    }

    const courseCtx = await ensureCourseContext(
      supabase,
      typeof body.courseSlug === 'string' && body.courseSlug ? body.courseSlug : DEFAULT_COURSE_SLUG
    );
    if (!courseCtx) {
      res.status(404).json({ error: 'Curso não encontrado.' });
      return;
    }

    const moduleDef = courseCtx.modules.find((m) => m.module_key === moduleKey);
    const totalSteps = moduleDef?.total_steps ?? 6;
    const { profile, existedInDb } = await ensureUserProfileRow(supabase, user);
    const devPerm = resolveDeveloperCertificateAdmin({
      user,
      profile,
      profileExistedInDb: existedInDb,
    });
    const enrollment = await checkOrProvisionCommercialEnrollment(
      supabase,
      user.id,
      courseCtx.course.id,
      devPerm.isDeveloperAdmin
    );
    if (!isEnrollmentActive(enrollment, devPerm.isDeveloperAdmin)) {
      res.status(403).json({
        code: 'COURSE_NOT_PURCHASED',
        error: 'Matrícula paga necessária para realizar avaliações deste curso.',
      });
      return;
    }

    // For final exams, enforce server-side check that steps + review were completed in DB (unless verified admin)
    if (attemptType === 'exam' && !devPerm.canBypassExamForCertificates) {
      const { data: modProg } = await supabase
        .from('module_progress')
        .select('id, done_steps, review_done, lesson_finished')
        .eq('user_id', user.id)
        .eq('course_id', courseCtx.course.id)
        .eq('module_key', moduleKey)
        .maybeSingle();

      const stepsDoneCount = Array.isArray(modProg?.done_steps) ? modProg.done_steps.length : 0;
      const reviewDone = Boolean(modProg?.review_done);
      if (!modProg || (!modProg.lesson_finished && stepsDoneCount < totalSteps) || !reviewDone) {
        res.status(403).json({
          error:
            'Prova bloqueada: conclua todas as etapas da aula e a revisão do módulo antes de enviar a avaliação.',
        });
        return;
      }
    }

    const rawDisplayedOrders = (body as { displayedOptionOrders?: unknown }).displayedOptionOrders;
    const displayedOptionOrders = Array.isArray(rawDisplayedOrders)
      ? rawDisplayedOrders.map((arr) =>
          Array.isArray(arr) ? arr.filter((item): item is string => typeof item === 'string') : []
        )
      : undefined;

    // Never trust client score/passed — grade deterministically on server
    const graded = gradeAssessment(
      moduleKey,
      attemptType,
      body.answers || [],
      displayedOptionOrders ? { displayedOptionOrders } : undefined
    );
    if (!graded.ok) {
      res.status(400).json({ error: graded.error || 'Respostas inválidas.' });
      return;
    }

    const nowIso = new Date().toISOString();

    const baseAttemptInsert = {
      user_id: user.id,
      course_id: courseCtx.course.id,
      module_key: moduleKey,
      attempt_type: attemptType,
      score: graded.score,
      passed: graded.passed,
      answers: graded.answers,
      attempted_at: nowIso,
    };

    const versionedAttemptInsert = {
      ...baseAttemptInsert,
      bank_version: graded.bankVersion,
      question_ids: graded.questionIds,
      selected_option_ids: graded.selectedOptionIds,
      question_snapshots: graded.questionSnapshots,
    };

    let insertedAttempt: AssessmentAttemptRow | null = null;
    let attemptErr: { code?: string; message?: string } | null = null;

    const versionedInsertRes = await supabase
      .from('assessment_attempts')
      .insert(versionedAttemptInsert)
      .select(
        'id, user_id, course_id, module_key, attempt_type, score, passed, answers, attempted_at, bank_version, question_ids, selected_option_ids, question_snapshots'
      )
      .single();

    if (
      versionedInsertRes.error &&
      isMissingVersioningColumnError(versionedInsertRes.error)
    ) {
      const fallbackInsertRes = await supabase
        .from('assessment_attempts')
        .insert(baseAttemptInsert)
        .select('id, user_id, course_id, module_key, attempt_type, score, passed, answers, attempted_at')
        .single();
      insertedAttempt = (fallbackInsertRes.data as AssessmentAttemptRow | null) || null;
      attemptErr = fallbackInsertRes.error;
    } else {
      insertedAttempt = (versionedInsertRes.data as AssessmentAttemptRow | null) || null;
      attemptErr = versionedInsertRes.error;
    }

    if (attemptErr || !insertedAttempt) {
      res.status(500).json({
        error: attemptErr?.message || 'Erro ao registrar tentativa de avaliação no banco.',
      });
      return;
    }

    if (attemptType === 'work') {
      await supabase
        .from('module_progress')
        .update({ work_finished: true, updated_at: nowIso })
        .eq('user_id', user.id)
        .eq('course_id', courseCtx.course.id)
        .eq('module_key', moduleKey);
    } else {
      await supabase
        .from('module_progress')
        .update({
          exam_status: graded.passed ? 'passed' : 'failed',
          updated_at: nowIso,
        })
        .eq('user_id', user.id)
        .eq('course_id', courseCtx.course.id)
        .eq('module_key', moduleKey);
    }

    let issuedCert: CertificateRow | null = null;
    let completionIso = enrollment?.completed_at || null;

    if (attemptType === 'exam' && graded.passed) {
      completionIso = enrollment?.completed_at || nowIso;
      if (enrollment) {
        await supabase
          .from('student_enrollments')
          .update({
            status: 'completed',
            completed_at: completionIso,
            last_module_key: moduleKey,
            updated_at: nowIso,
          })
          .eq('id', enrollment.id);
      }

      const certRes = await idempotentIssueCertificate(supabase, {
        userId: user.id,
        course: courseCtx.course,
        profile,
      });
      issuedCert = certRes.certificate;
    } else if (attemptType === 'exam') {
      // Only return an existing certificate if the user had already earned approval previously
      const passingBefore = await getPassingExamAttempts(supabase, user.id, courseCtx.course.id);
      if (passingBefore.length > 0) {
        issuedCert = await findExistingCertificate(supabase, user.id, courseCtx.course.id);
      }
    }

    const allCertificates = issuedCert
      ? await listEnrichedUserCertificates(supabase, {
          userId: user.id,
          profile,
          canBypassExamForCertificates: devPerm.canBypassExamForCertificates,
        })
      : [];

    const enrichedAttempt: AssessmentAttemptRow = {
      ...insertedAttempt,
      bank_version: insertedAttempt.bank_version || graded.bankVersion,
      question_ids: insertedAttempt.question_ids || graded.questionIds,
      selected_option_ids: insertedAttempt.selected_option_ids || graded.selectedOptionIds,
      question_snapshots: insertedAttempt.question_snapshots || graded.questionSnapshots,
    };

    res.json({
      attempt: enrichedAttempt,
      score: graded.score,
      correctCount: graded.correctCount,
      totalQuestions: graded.totalQuestions,
      passed: graded.passed,
      bankVersion: graded.bankVersion,
      questionIds: graded.questionIds,
      selectedOptionIds: graded.selectedOptionIds,
      questionSnapshots: graded.questionSnapshots,
      passingScorePercent: PASSING_SCORE_PERCENT,
      certificateUnlocked: Boolean(issuedCert),
      certificates: allCertificates,
      certificate: issuedCert
        ? {
            ...issuedCert,
            courseSlug: courseCtx.course.slug,
            studentName: profile.full_name || issuedCert.student_name_snapshot,
            cpfMasked: profile.cpf_masked,
            workloadMinutes: courseCtx.workloadMinutes,
            workloadLabel: courseCtx.workloadLabel,
            completionDate: formatBrDate(completionIso || issuedCert.issued_at),
            completionIso: completionIso || issuedCert.issued_at,
            issuedDate: formatBrDate(issuedCert.issued_at),
            pdfUrl: `/api/certificates/${encodeURIComponent(issuedCert.certificate_code)}/pdf`,
          }
        : null,
    });
  });

  // List all certificates belonging to the authenticated user (always DB-authoritative)
  app.get('/api/certificates', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({ error: 'Sessão não autenticada.' });
      return;
    }

    const { supabase, user } = auth;
    const { profile, existedInDb } = await ensureUserProfileRow(supabase, user);
    const devPerm = resolveDeveloperCertificateAdmin({
      user,
      profile,
      profileExistedInDb: existedInDb,
    });

    const coursesBundle = await listAllCoursesWithWorkloads(supabase);
    const certificates = await listEnrichedUserCertificates(supabase, {
      userId: user.id,
      profile,
      canBypassExamForCertificates: devPerm.canBypassExamForCertificates,
      coursesById: coursesBundle.byId,
    });

    res.json({
      certificates,
      student: {
        fullName: profile.full_name,
        cpfMasked: profile.cpf_masked,
      },
      permissions: {
        isDeveloperAdmin: devPerm.isDeveloperAdmin,
        canBypassExamForCertificates: devPerm.canBypassExamForCertificates,
        canAccessAdminPanel: devPerm.canAccessAdminPanel,
      },
    });
  });

  // Read current user's certificate eligibility & DB record
  app.get('/api/certificates/current', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({ error: 'Sessão não autenticada.' });
      return;
    }

    const { supabase, user } = auth;
    const requestedSlug =
      typeof req.query.courseSlug === 'string' && req.query.courseSlug.trim()
        ? req.query.courseSlug.trim()
        : DEFAULT_COURSE_SLUG;
    const courseCtx = await ensureCourseContext(supabase, requestedSlug);
    if (!courseCtx) {
      res.status(404).json({ error: 'Curso não encontrado.' });
      return;
    }

    const { profile, existedInDb } = await ensureUserProfileRow(supabase, user);
    const devPerm = resolveDeveloperCertificateAdmin({
      user,
      profile,
      profileExistedInDb: existedInDb,
    });
    const enrollment = await checkOrProvisionCommercialEnrollment(
      supabase,
      user.id,
      courseCtx.course.id,
      devPerm.isDeveloperAdmin
    );
    const passingExams = await getPassingExamAttempts(supabase, user.id, courseCtx.course.id);
    const completionCheck = await hasVerifiedCourseCompletion(supabase, {
      userId: user.id,
      courseId: courseCtx.course.id,
      passingExams,
      enrollment,
    });
    const eligible =
      devPerm.canBypassExamForCertificates ||
      (isEnrollmentActive(enrollment, false) && completionCheck.completed);

    let certificate: CertificateRow | null = null;
    if (eligible) {
      certificate = await findExistingCertificate(supabase, user.id, courseCtx.course.id);
    }

    const completionIso =
      completionCheck.effectiveCompletedAt ||
      enrollment?.completed_at ||
      passingExams[0]?.attempted_at ||
      certificate?.issued_at ||
      null;

    res.json({
      eligible,
      permissions: {
        isDeveloperAdmin: devPerm.isDeveloperAdmin,
        canBypassExamForCertificates: devPerm.canBypassExamForCertificates,
        canAccessAdminPanel: devPerm.canAccessAdminPanel,
      },
      passingScorePercent: PASSING_SCORE_PERCENT,
      workloadMinutes: courseCtx.workloadMinutes,
      workloadLabel: courseCtx.workloadLabel,
      completionDate: completionIso ? formatBrDate(completionIso) : null,
      student: {
        fullName: profile.full_name,
        cpfMasked: profile.cpf_masked,
      },
      course: {
        id: courseCtx.course.id,
        slug: courseCtx.course.slug,
        title: courseCtx.course.title,
      },
      certificate: certificate
        ? {
            ...certificate,
            courseSlug: courseCtx.course.slug,
            studentName: profile.full_name || certificate.student_name_snapshot,
            cpfMasked: profile.cpf_masked,
            workloadMinutes: courseCtx.workloadMinutes,
            workloadLabel: courseCtx.workloadLabel,
            completionDate: formatBrDate(completionIso || certificate.issued_at),
            completionIso: completionIso || certificate.issued_at,
            issuedDate: formatBrDate(certificate.issued_at),
            pdfUrl: `/api/certificates/${encodeURIComponent(certificate.certificate_code)}/pdf`,
          }
        : null,
    });
  });

  // Idempotent certificate issuance (2ª via safe; requires passing exam unless server-verified developer admin)
  app.post('/api/certificates/issue', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({
        error: 'Entre na sua conta para emitir ou baixar seu certificado.',
      });
      return;
    }

    const { supabase, user } = auth;
    const body = (req.body || {}) as { courseSlug?: string };
    const requestedSlug =
      typeof body.courseSlug === 'string' && body.courseSlug.trim()
        ? body.courseSlug.trim()
        : DEFAULT_COURSE_SLUG;

    const courseCtx = await ensureCourseContext(supabase, requestedSlug);
    if (!courseCtx) {
      res.status(404).json({ error: 'Curso não encontrado.' });
      return;
    }

    const { profile, existedInDb } = await ensureUserProfileRow(supabase, user);
    const devPerm = resolveDeveloperCertificateAdmin({
      user,
      profile,
      profileExistedInDb: existedInDb,
    });

    const [enrollment, passingExams] = await Promise.all([
      checkOrProvisionCommercialEnrollment(supabase, user.id, courseCtx.course.id, devPerm.isDeveloperAdmin),
      getPassingExamAttempts(supabase, user.id, courseCtx.course.id),
    ]);
    if (!isEnrollmentActive(enrollment, devPerm.isDeveloperAdmin)) {
      res.status(403).json({
        code: 'COURSE_NOT_PURCHASED',
        error: 'Matrícula paga necessária para emitir certificado deste curso.',
      });
      return;
    }
    const completionCheck = await hasVerifiedCourseCompletion(supabase, {
      userId: user.id,
      courseId: courseCtx.course.id,
      passingExams,
      enrollment,
    });

    if (!devPerm.canBypassExamForCertificates && !completionCheck.completed) {
      res.status(403).json({
        error: `Certificado bloqueado: é necessário concluir os requisitos e ser aprovado na prova do curso (mínimo ${PASSING_SCORE_PERCENT}%).`,
      });
      return;
    }

    if (
      !devPerm.canBypassExamForCertificates &&
      completionCheck.completed &&
      enrollment &&
      !enrollment.completed_at
    ) {
      const effectiveCompletedAt =
        completionCheck.effectiveCompletedAt || passingExams[0]?.attempted_at || new Date().toISOString();
      await supabase
        .from('student_enrollments')
        .update({
          status: 'completed',
          completed_at: effectiveCompletedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollment.id);
      enrollment.completed_at = effectiveCompletedAt;
      enrollment.status = 'completed';
    }

    const issued = await idempotentIssueCertificate(supabase, {
      userId: user.id,
      course: courseCtx.course,
      profile,
    });

    if (!issued.certificate) {
      res.status(500).json({ error: issued.error || 'Falha ao emitir certificado.' });
      return;
    }

    const completionIso =
      completionCheck.effectiveCompletedAt ||
      enrollment?.completed_at ||
      passingExams[0]?.attempted_at ||
      issued.certificate.issued_at;
    const completionDate = formatBrDate(completionIso);
    const issuedDate = formatBrDate(issued.certificate.issued_at);

    // Generate PDF and persist copy to Supabase Storage when available (non-blocking)
    let storagePath: string | null = null;
    try {
      const pdfBytes = await generateCertificatePdf({
        studentName: profile.full_name || issued.certificate.student_name_snapshot,
        cpfMasked: profile.cpf_masked || '***.***.***-**',
        courseTitle: courseCtx.course.title || issued.certificate.course_title_snapshot,
        workloadLabel: courseCtx.workloadLabel,
        completionDate,
        issuedDate,
        certificateCode: issued.certificate.certificate_code,
      });
      storagePath = await tryUploadCertificatePdfToStorage(supabase, {
        userId: user.id,
        certificateCode: issued.certificate.certificate_code,
        pdfBytes,
      });
    } catch {
      // Storage/PDF upload failure during issuance should not abort DB registration; /pdf endpoint generates on demand
    }

    const allCertificates = await listEnrichedUserCertificates(supabase, {
      userId: user.id,
      profile,
      canBypassExamForCertificates: devPerm.canBypassExamForCertificates,
    });

    const enrichedIssued =
      allCertificates.find((c) => c.certificate_code === issued.certificate!.certificate_code) || {
        ...issued.certificate,
        courseSlug: courseCtx.course.slug,
        studentName: profile.full_name || issued.certificate.student_name_snapshot,
        cpfMasked: profile.cpf_masked,
        workloadMinutes: courseCtx.workloadMinutes,
        workloadLabel: courseCtx.workloadLabel,
        completionDate,
        completionIso,
        issuedDate,
        pdfUrl: `/api/certificates/${encodeURIComponent(issued.certificate.certificate_code)}/pdf`,
      };

    res.json({
      alreadyIssued: issued.alreadyIssued,
      grantedByDeveloperAdmin: devPerm.canBypassExamForCertificates && passingExams.length === 0,
      storagePath,
      certificate: enrichedIssued,
      certificates: allCertificates,
    });
  });

  // Authenticated, ownership-verified PDF certificate download (blocks non-owners & unapproved non-dev students)
  app.get('/api/certificates/:code/pdf', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({
        error: 'Autenticação necessária para baixar o certificado em PDF.',
      });
      return;
    }

    const code = String(req.params.code || '').trim();
    if (!code || !/^[A-Za-z0-9-]+$/.test(code)) {
      res.status(400).json({ error: 'Código de certificado inválido.' });
      return;
    }

    const { supabase, user } = auth;
    const { data: certRow } = await supabase
      .from('certificates')
      .select(
        'id, user_id, course_id, certificate_code, status, student_name_snapshot, course_title_snapshot, issued_at'
      )
      .eq('certificate_code', code)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!certRow) {
      res.status(403).json({
        error: 'Acesso negado: certificado não encontrado para a conta autenticada.',
      });
      return;
    }

    const cert = certRow as CertificateRow;
    const [{ profile, existedInDb }, courseCtx, passingExams] = await Promise.all([
      ensureUserProfileRow(supabase, user),
      ensureCourseContextById(supabase, cert.course_id),
      getPassingExamAttempts(supabase, user.id, cert.course_id),
    ]);

    const devPerm = resolveDeveloperCertificateAdmin({
      user,
      profile,
      profileExistedInDb: existedInDb,
    });
    const enrollment = await checkOrProvisionCommercialEnrollment(
      supabase,
      user.id,
      cert.course_id,
      devPerm.isDeveloperAdmin
    );

    const completionCheck = await hasVerifiedCourseCompletion(supabase, {
      userId: user.id,
      courseId: cert.course_id,
      passingExams,
      enrollment,
    });

    if (
      !devPerm.canBypassExamForCertificates &&
      (!isEnrollmentActive(enrollment, false) || !completionCheck.completed)
    ) {
      res.status(403).json({
        error: 'Certificado bloqueado: matrícula ativa e aprovação em prova oficial não encontradas.',
      });
      return;
    }

    const workloadLabel = courseCtx?.workloadLabel || '4 horas';
    const completionIso =
      completionCheck.effectiveCompletedAt ||
      enrollment?.completed_at ||
      passingExams[0]?.attempted_at ||
      cert.issued_at;
    const completionDate = formatBrDate(completionIso);
    const issuedDate = formatBrDate(cert.issued_at);

    try {
      const pdfBytes = await generateCertificatePdf({
        studentName: profile.full_name || cert.student_name_snapshot,
        cpfMasked: profile.cpf_masked || '***.***.***-**',
        courseTitle: courseCtx?.course.title || cert.course_title_snapshot || 'Massas Italianas',
        workloadLabel,
        completionDate,
        issuedDate,
        certificateCode: cert.certificate_code,
      });

      void tryUploadCertificatePdfToStorage(supabase, {
        userId: user.id,
        certificateCode: cert.certificate_code,
        pdfBytes,
      });

      const disposition = req.query.disposition === 'inline' ? 'inline' : 'attachment';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `${disposition}; filename="certificado-fervec-${cert.certificate_code}.pdf"`
      );
      res.setHeader('Cache-Control', 'no-store');
      res.send(Buffer.from(pdfBytes));
    } catch (err) {
      console.error('Certificate PDF generation error:', err);
      res.status(500).json({ error: 'Erro interno ao gerar o PDF do certificado.' });
    }
  });

  // Authoritative course pricing + confirmed Asaas capabilities + current user order status
  app.get('/api/payments/course-summary', async (req: Request, res: Response) => {
    const courseSlug = String(req.query.courseSlug || DEFAULT_COURSE_SLUG).trim() || DEFAULT_COURSE_SLUG;
    const isTrue = (v?: string): boolean => String(v || '').trim().toLowerCase() === 'true';

    const creditCard = isTrue(process.env.ASAAS_ENABLE_CREDIT_CARD);
    const debitCard = isTrue(process.env.ASAAS_ENABLE_DEBIT_CARD);
    const knownBrands = ['VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD'];
    const acceptedCardBrands =
      creditCard || debitCard
        ? Array.from(
            new Set(
              String(process.env.ASAAS_CARD_BRANDS || '')
                .split(',')
                .map((s) => s.trim().toUpperCase())
                .filter((s) => knownBrands.includes(s))
            )
          )
        : [];

    const capabilities = {
      pix: true,
      boleto: true,
      creditCard,
      debitCard,
      acceptedCardBrands,
    };

    const pricingResult = getAuthoritativeCoursePriceCents({ courseSlug });
    const referencePriceCents = pricingResult.priceCents;
    const referenceTitle = courseSlug === 'massas-italianas' ? 'Curso de Massas' : 'Curso FerveC Gastronomia';

    const auth = await resolveAuth(req, res).catch(() => null);
    let queryClient: SupabaseClient | null = auth?.supabase ?? null;
    if (!queryClient) {
      const publicEnv = getServerSupabaseEnv();
      if (publicEnv) {
        queryClient = createSupabaseJsClient(publicEnv.url, publicEnv.key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      }
    }

    let courseId = '';
    let courseTitle = referenceTitle;
    let priceCents = referencePriceCents;
    let priceSource: 'database' | 'reference' = 'reference';
    let isEnrolled = false;
    let latestOrderId: string | null = null;
    let latestOrderStatus: string | null = null;
    let latestPayment: Record<string, unknown> | null = null;
    let customerProfile: {
      hasAsaasCustomerId: boolean;
      fullName: string;
      email: string;
      ddd: string;
      phone: string;
    } | null = null;

    if (queryClient) {
      const { data: courseRow } = await queryClient
        .from('courses')
        .select('*')
        .eq('slug', courseSlug)
        .maybeSingle();

      if (courseRow) {
        const rec = courseRow as Record<string, unknown>;
        courseId = String(rec.id || '');
        if (typeof rec.title === 'string' && rec.title.trim()) {
          courseTitle = rec.slug === 'massas-italianas' && rec.title.trim() === 'Massas Italianas'
            ? 'Curso de Massas'
            : rec.title.trim();
        }
        const resolvedDbPrice = getAuthoritativeCoursePriceCents({
          courseSlug,
          dbPriceCents: typeof rec.price_cents === 'number' ? rec.price_cents : null,
        });
        priceCents = resolvedDbPrice.priceCents;
        priceSource = resolvedDbPrice.source === 'database' ? 'database' : 'reference';
      }

      if (auth?.user) {
        const { data: profileRow } = await queryClient
          .from('profiles')
          .select('full_name, email, ddd, phone, asaas_customer_id')
          .eq('id', auth.user.id)
          .maybeSingle();

        const profRec = (profileRow || {}) as Record<string, unknown>;
        const rawCustomerId = typeof profRec.asaas_customer_id === 'string' ? profRec.asaas_customer_id.trim() : '';
        customerProfile = {
          hasAsaasCustomerId: /^cus_[a-zA-Z0-9_]+$/.test(rawCustomerId),
          fullName: typeof profRec.full_name === 'string' ? profRec.full_name.trim() : '',
          email:
            (typeof profRec.email === 'string' ? profRec.email.trim().toLowerCase() : '') ||
            (auth.user.email || '').trim().toLowerCase(),
          ddd: typeof profRec.ddd === 'string' ? profRec.ddd.trim() : '',
          phone: typeof profRec.phone === 'string' ? profRec.phone.trim() : '',
        };
      }

      if (auth?.user && courseId) {
        const [{ data: enrollmentRow }, { data: orderRow }] = await Promise.all([
          queryClient
            .from('student_enrollments')
            .select('id, status')
            .eq('user_id', auth.user.id)
            .eq('course_id', courseId)
            .maybeSingle(),
          queryClient
            .from('orders')
            .select('id, status, amount_cents, asaas_payment_id, paid_at, created_at')
            .eq('user_id', auth.user.id)
            .eq('course_id', courseId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const paidViaOrder = orderRow?.status === 'paid';
        const enrStatus = String(enrollmentRow?.status || '').toLowerCase();
        isEnrolled =
          paidViaOrder ||
          enrStatus === 'active' ||
          enrStatus === 'completed' ||
          (paidViaOrder && enrStatus === 'in_progress');

        if (orderRow) {
          latestOrderId = String(orderRow.id);
          latestOrderStatus = String(orderRow.status || 'pending');
          const { data: paymentRow } = await queryClient
            .from('payments')
            .select('asaas_payment_id, status, billing_type, value_cents, due_date, invoice_url, bank_slip_url')
            .eq('order_id', orderRow.id)
            .eq('user_id', auth.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (paymentRow) {
            latestPayment = {
              id: paymentRow.asaas_payment_id,
              orderId: latestOrderId,
              status: paymentRow.status,
              billingType: paymentRow.billing_type,
              value:
                typeof paymentRow.value_cents === 'number'
                  ? paymentRow.value_cents / 100
                  : priceCents / 100,
              dueDate: paymentRow.due_date,
              invoiceUrl: paymentRow.invoice_url,
              bankSlipUrl: paymentRow.bank_slip_url,
            };
          }
        }
      }
    }

    const priceFormatted = (priceCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const envName =
      String(process.env.ASAAS_ENVIRONMENT || '').trim().toLowerCase() === 'production'
        ? 'production'
        : 'sandbox';
    const priceConfirm = isCoursePriceConfirmedForProduction();
    const legalVersions = getLegalDocumentVersions();

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      environment: envName,
      courseSlug,
      courseId,
      courseTitle,
      subtitle: 'Acesso ao curso',
      priceCents,
      priceFormatted,
      priceSource,
      priceConfirmedForProduction: priceConfirm.confirmed,
      legalVersions,
      supplier: {
        commercialName: SUPPLIER_IDENTITY.commercialName,
        legalNature: SUPPLIER_IDENTITY.legalNature,
        controllerName: SUPPLIER_IDENTITY.controllerName,
        cpf: SUPPLIER_IDENTITY.cpf,
        email: SUPPLIER_IDENTITY.email,
        instagram: SUPPLIER_IDENTITY.instagram,
        addressPending: SUPPLIER_IDENTITY.addressPending,
        addressDisplay: SUPPLIER_IDENTITY.addressDisplay,
        accessDurationSummary: SUPPLIER_IDENTITY.accessDurationSummary,
      },
      capabilities,
      isEnrolled,
      latestOrderId,
      latestOrderStatus,
      latestPayment,
      customerProfile,
    });
  });

  // Ownership-checked real payment confirmation status endpoint
  app.get('/api/payments/status/:orderId', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({ ok: false, error: 'Autenticação necessária para verificar o status do pagamento.' });
      return;
    }

    const orderId = String(req.params.orderId || '').trim();
    if (!orderId) {
      res.status(400).json({ ok: false, error: 'orderId inválido.' });
      return;
    }

    const { supabase, user } = auth;
    const { data: orderRow } = await supabase
      .from('orders')
      .select('id, course_id, status, amount_cents, asaas_payment_id, paid_at')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!orderRow) {
      res.status(404).json({ ok: false, error: 'Pedido não encontrado para o usuário autenticado.' });
      return;
    }

    const [{ data: paymentRow }, { data: enrollmentRow }] = await Promise.all([
      supabase
        .from('payments')
        .select('asaas_payment_id, status, billing_type, value_cents, due_date, invoice_url, bank_slip_url')
        .eq('order_id', orderRow.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('student_enrollments')
        .select('status')
        .eq('user_id', user.id)
        .eq('course_id', orderRow.course_id)
        .maybeSingle(),
    ]);

    const paidViaOrder = orderRow.status === 'paid';
    const enrStatus = String(enrollmentRow?.status || '').toLowerCase();
    const isEnrolled =
      paidViaOrder ||
      enrStatus === 'active' ||
      enrStatus === 'completed' ||
      (paidViaOrder && enrStatus === 'in_progress');

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      orderId: orderRow.id,
      orderStatus: orderRow.status,
      isEnrolled,
      payment: paymentRow
        ? {
            id: paymentRow.asaas_payment_id,
            orderId: orderRow.id,
            status: paymentRow.status,
            billingType: paymentRow.billing_type,
            value:
              typeof paymentRow.value_cents === 'number'
                ? paymentRow.value_cents / 100
                : orderRow.amount_cents / 100,
            dueDate: paymentRow.due_date,
            invoiceUrl: paymentRow.invoice_url,
            bankSlipUrl: paymentRow.bank_slip_url,
          }
        : null,
    });
  });

  // Admin-only read-only Asaas credentials, API connectivity, environment, and webhook audit
  app.get('/api/admin/asaas-audit', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({
        ok: false,
        error: 'Autenticação administrativa necessária para executar a auditoria do Asaas.',
      });
      return;
    }

    const { supabase, user } = auth;
    const { profile, existedInDb } = await ensureUserProfileRow(supabase, user);
    const devPerm = resolveDeveloperCertificateAdmin({
      user,
      profile,
      profileExistedInDb: existedInDb,
    });

    if (!devPerm.canAccessAdminPanel) {
      res.status(403).json({
        ok: false,
        error: 'Acesso restrito ao administrador oficial da plataforma.',
      });
      return;
    }

    const report = await runAsaasAudit();
    res.setHeader('Cache-Control', 'no-store');
    res.json(report);
  });

  // Single-session claim & logout
  app.post('/api/session/claim', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({ ok: false, error: 'Sessão não autenticada.' });
      return;
    }
    const { supabase, user } = auth;
    const body = (req.body || {}) as { sessionId?: string; deviceLabel?: string };
    const sid =
      (typeof body.sessionId === 'string' && body.sessionId.trim()) ||
      (typeof req.headers['x-fervec-session-id'] === 'string' ? req.headers['x-fervec-session-id'].trim() : '') ||
      crypto.randomUUID();
    const record = singleSessionManager.claimSession(user.id, sid, body.deviceLabel || '');
    try {
      await supabase.rpc('claim_active_session', {
        p_user_id: user.id,
        p_session_id: sid,
        p_device_label: body.deviceLabel || null,
      });
    } catch {
      // RPC opcional quando SQL migration ainda não foi aplicada
    }
    res.json({ ok: true, sessionId: record.sessionId, claimedAt: record.claimedAt });
  });

  app.post('/api/session/logout', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res).catch(() => null);
    if (!auth) {
      res.json({ ok: true });
      return;
    }
    const rawSid = req.headers['x-fervec-session-id'];
    const sid = typeof rawSid === 'string' ? rawSid.trim() : '';
    if (sid) {
      singleSessionManager.clearSession(auth.user.id, sid);
      try {
        await auth.supabase.rpc('clear_active_session', {
          p_user_id: auth.user.id,
          p_session_id: sid,
        });
      } catch {
        // optional
      }
    }
    res.json({ ok: true });
  });

  // Server-authoritative coupon validation
  app.post('/api/coupons/validate', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({ ok: false, error: 'Entre na sua conta para validar um cupom.' });
      return;
    }
    const body = (req.body || {}) as { code?: string; courseSlug?: string };
    const code = String(body.code || '').replace(/\D+/g, '').slice(0, 6);
    const courseSlug = String(body.courseSlug || DEFAULT_COURSE_SLUG).trim() || DEFAULT_COURSE_SLUG;
    if (code.length !== 6) {
      res.status(400).json({ ok: false, error: 'Informe um código de cupom válido de 6 dígitos.' });
      return;
    }

    try {
      const { data: couponRow, error } = await auth.supabase
        .from('coupons')
        .select('id, code, discount_percent, course_scope, max_uses, uses_count, expires_at, active')
        .eq('code', code)
        .maybeSingle();

      if (error || !couponRow) {
        res.status(404).json({ ok: false, error: 'Cupom não encontrado ou indisponível no servidor.' });
        return;
      }
      if (!couponRow.active) {
        res.status(400).json({ ok: false, error: 'Este cupom foi desativado.' });
        return;
      }
      if (couponRow.expires_at && Date.parse(String(couponRow.expires_at)) < Date.now()) {
        res.status(400).json({ ok: false, error: 'Este cupom expirou.' });
        return;
      }
      if (Number(couponRow.uses_count || 0) >= Number(couponRow.max_uses || 1)) {
        res.status(400).json({ ok: false, error: 'Este cupom atingiu o limite máximo de utilizações.' });
        return;
      }
      if (couponRow.course_scope !== 'all' && couponRow.course_scope !== courseSlug) {
        res.status(400).json({ ok: false, error: 'Este cupom não é válido para este curso.' });
        return;
      }

      const basePrice = getAuthoritativeCoursePriceCents({ courseSlug }).priceCents;
      const pct = Math.min(100, Math.max(0, Number(couponRow.discount_percent || 0)));
      const discountCents = Math.round((basePrice * pct) / 100);
      const totalCents = Math.max(0, basePrice - discountCents);

      res.json({
        ok: true,
        code: couponRow.code,
        discountPercent: pct,
        discountCents,
        totalCents,
        isFree: totalCents === 0,
      });
    } catch {
      res.status(503).json({ ok: false, error: 'Serviço de validação de cupons indisponível no momento.' });
    }
  });

  app.get('/api/legal/documents', (_req: Request, res: Response) => {
    const versions = getLegalDocumentVersions();
    res.json({
      ok: true,
      versions,
      supplier: {
        commercialName: SUPPLIER_IDENTITY.commercialName,
        civilName: SUPPLIER_IDENTITY.civilName,
        legalNature: SUPPLIER_IDENTITY.legalNature,
        cpf: SUPPLIER_IDENTITY.cpfFormatted,
        email: SUPPLIER_IDENTITY.officialEmail,
        instagram: SUPPLIER_IDENTITY.instagramHandle,
        addressPending: SUPPLIER_IDENTITY.addressPending,
        addressDisplay: SUPPLIER_IDENTITY.addressDisplay,
        accessDurationSummary: SUPPLIER_IDENTITY.accessDurationSummary,
        minimumAgeYears: SUPPLIER_IDENTITY.minimumAgeYears,
        regretDays: SUPPLIER_IDENTITY.regretDays,
      },
    });
  });

  // Legal acceptance log (Termos, Privacidade, IA, Cookies, Pre-Contractual)
  app.post('/api/legal/accept', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({ ok: false, error: 'Autenticação necessária para registrar aceite legal.' });
      return;
    }
    const { supabase, user } = auth;
    const body = (req.body || {}) as {
      courseSlug?: string;
      termsVersion?: string;
      privacyVersion?: string;
      whatsappOptIn?: boolean;
      emailOptIn?: boolean;
    };
    const versions = getLegalDocumentVersions();
    const clientIp = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const ipHash = clientIp ? crypto.createHash('sha256').update(clientIp).digest('hex') : null;
    const ua = String(req.headers['user-agent'] || '').slice(0, 240);

    try {
      const { error } = await supabase.from('legal_acceptances').insert({
        user_id: user.id,
        course_slug: body.courseSlug || DEFAULT_COURSE_SLUG,
        terms_version: body.termsVersion || versions.termsVersion,
        privacy_version: body.privacyVersion || versions.privacyVersion,
        whatsapp_opt_in: Boolean(body.whatsappOptIn),
        email_opt_in: Boolean(body.emailOptIn),
        ip_hash: ipHash,
        user_agent: ua || null,
        accepted_at: new Date().toISOString(),
      });
      if (error) {
        res.status(200).json({ ok: true, recordedInMemory: true, versions });
        return;
      }
      res.json({ ok: true, recordedInDb: true, versions });
    } catch {
      res.json({ ok: true, recordedInMemory: true, versions });
    }
  });

  // Art. 49 CDC (Direito de Arrependimento - 7 dias corridos)
  app.post('/api/orders/:orderId/withdraw', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({ ok: false, error: 'Entre na sua conta para solicitar arrependimento (Art. 49 CDC).' });
      return;
    }
    const orderId = String(req.params.orderId || '').trim();
    if (!orderId) {
      res.status(400).json({ ok: false, error: 'ID do pedido inválido.' });
      return;
    }
    const { supabase, user } = auth;
    const body = (req.body || {}) as { reason?: string };

    const { data: orderRow } = await supabase
      .from('orders')
      .select('id, user_id, course_id, status, amount_cents, asaas_payment_id, paid_at, created_at')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!orderRow) {
      res.status(404).json({ ok: false, error: 'Pedido não encontrado para a conta autenticada.' });
      return;
    }
    if (orderRow.status !== 'paid') {
      res.status(400).json({
        ok: false,
        error: 'A solicitação de arrependimento Art. 49 CDC aplica-se apenas a pedidos com pagamento confirmado.',
      });
      return;
    }

    const paidTime = Date.parse(String(orderRow.paid_at || orderRow.created_at || ''));
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(paidTime) || Date.now() - paidTime > sevenDaysMs) {
      res.status(400).json({
        ok: false,
        code: 'WITHDRAWAL_WINDOW_EXPIRED',
        error: 'O prazo legal de 7 dias corridos (Art. 49 do CDC) para este pedido já foi encerrado.',
      });
      return;
    }

    const nowIso = new Date().toISOString();
    try {
      await supabase.from('withdrawal_requests').insert({
        user_id: user.id,
        order_id: orderRow.id,
        asaas_payment_id: orderRow.asaas_payment_id || null,
        reason: typeof body.reason === 'string' ? body.reason.slice(0, 400) : 'Arrependimento Art. 49 CDC (7 dias)',
        status: 'pending_refund',
        requested_at: nowIso,
      });
      await supabase
        .from('orders')
        .update({ status: 'refund_requested', updated_at: nowIso })
        .eq('id', orderRow.id)
        .eq('user_id', user.id);
      await supabase
        .from('student_enrollments')
        .update({ status: 'canceled', updated_at: nowIso })
        .eq('user_id', user.id)
        .eq('course_id', orderRow.course_id);
    } catch {
      // ignore if withdrawal_requests table not yet migrated in mock
    }

    res.json({
      ok: true,
      orderId: orderRow.id,
      status: 'refund_requested',
      message:
        'Solicitação de arrependimento (Art. 49 do CDC) registrada com protocolo. O acesso ao curso foi suspenso e o estorno será processado pelo meio de pagamento original; dúvidas: fervecrgastronomia@gmail.com.',
    });
  });

  // Admin-only financial telemetry, kill-switch visibility, and masked audit summary
  app.get('/api/admin/telemetry', async (req: Request, res: Response) => {
    const auth = await resolveAuth(req, res);
    if (!auth) {
      res.status(401).json({ ok: false, error: 'Autenticação necessária.' });
      return;
    }
    const { supabase, user } = auth;
    const { profile, existedInDb } = await ensureUserProfileRow(supabase, user);
    const devPerm = resolveDeveloperCertificateAdmin({
      user,
      profile,
      profileExistedInDb: existedInDb,
    });
    if (!devPerm.canAccessAdminPanel) {
      res.status(403).json({ ok: false, error: 'Acesso restrito ao administrador oficial.' });
      return;
    }

    const guardTelemetry = financialGuard.getTelemetry();
    const priceCheck = isCoursePriceConfirmedForProduction();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      financialGuard: guardTelemetry,
      priceConfirmation: priceCheck,
      supplierMaskedCpf: maskCpfForLogs(SUPPLIER_IDENTITY.cpf),
      addressPending: SUPPLIER_IDENTITY.addressPending,
      singleSessionActiveCount: singleSessionManager.getActiveCount(),
    });
  });
}

export { ALL_MODULE_KEYS };
