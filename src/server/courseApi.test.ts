import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { PDFDocument } from 'pdf-lib';
import { registerCourseApiRoutes } from './courseApi';
import { resetDeveloperLatchForTests } from './developerAuth';
import { exam } from '../data/courseData';

type Row = Record<string, unknown>;

// Minimal stateful Supabase mock with strict per-user RLS semantics matching PostgreSQL tables
function createMockSupabaseDb() {
  const courseId = '8a3c38ad-d5de-424a-868d-325420b7470b';
  const frenchCourseId = '10703c7c-464d-40c2-8d14-4098494bf53a';
  const brazilCourseId = '22203c7c-464d-40c2-8d14-4098494bf53b';
  const storageUploads: Array<{ bucket: string; path: string; size: number; userId: string }> = [];
  const db: Record<string, Row[]> = {
    courses: [
      {
        id: courseId,
        slug: 'massas-italianas',
        title: 'Massas Italianas',
        cuisine: 'italiana',
        subtitle: 'A arte clássica das massas',
        description: 'Curso de 6 módulos',
        chef_name: 'Chef CREMONESE',
        level: 'Iniciante a intermediário',
      },
      {
        id: frenchCourseId,
        slug: 'cozinha-francesa',
        title: 'Cozinha Francesa',
        cuisine: 'francesa',
        subtitle: 'Bases clássicas e molhos franceses',
        description: 'Módulo em preparação',
        chef_name: 'Chef CREMONESE',
        level: 'Intermediário',
        estimated_minutes: 90,
      },
      {
        id: brazilCourseId,
        slug: 'cozinha-brasileira',
        title: 'Cozinha Brasileira',
        cuisine: 'brasileira',
        subtitle: 'Sabores regionais',
        description: 'Curso adicional',
        chef_name: 'Chef CREMONESE',
        level: 'Iniciante',
        estimated_minutes: 120,
      },
    ],
    course_modules: [
      { id: 'm1', course_id: courseId, module_key: 'carbonara', module_order: 1, title: 'Tipos de Massas', recipe_title: 'Carbonara', total_steps: 6, duration_label: '25–30 min', level: 'Iniciante' },
      { id: 'm2', course_id: courseId, module_key: 'alfredo', module_order: 2, title: 'Massas Frescas', recipe_title: 'Alfredo', total_steps: 7, duration_label: '25–35 min', level: 'Intermediária' },
      { id: 'm3', course_id: courseId, module_key: 'arrabbiata', module_order: 3, title: 'Massas Recheadas', recipe_title: 'Arrabbiata', total_steps: 7, duration_label: '30–40 min', level: 'Fácil' },
      { id: 'm4', course_id: courseId, module_key: 'pesto', module_order: 4, title: 'Molhos I', recipe_title: 'Pesto', total_steps: 7, duration_label: '20–30 min', level: 'Fácil' },
      { id: 'm5', course_id: courseId, module_key: 'ragù', module_order: 5, title: 'Molhos II', recipe_title: 'Ragù', total_steps: 8, duration_label: '90–120 min', level: 'Avançada' },
      { id: 'm6', course_id: courseId, module_key: 'sauces', module_order: 6, title: 'Especiais', recipe_title: 'Pomodoro & Burro', total_steps: 6, duration_label: '20–30 min', level: 'Iniciante' },
    ],
    profiles: [
      {
        id: 'user-a',
        full_name: 'Ana Carolina Souza',
        cpf_masked: '***.456.789-**',
        cpf_hash: 'hash-a',
        birth_date: '10/05/1995',
        age: 31,
        email: 'ana@fervec.test',
        ddd: '11',
        phone: '98888-7777',
        whatsapp_opt_in: true,
        email_opt_in: true,
      },
      {
        id: 'user-b',
        full_name: 'Bruno Henrique Lima',
        cpf_masked: '***.111.222-**',
        cpf_hash: 'hash-b',
        birth_date: '20/08/1992',
        age: 34,
        email: 'bruno@fervec.test',
        ddd: '21',
        phone: '97777-6666',
        whatsapp_opt_in: false,
        email_opt_in: false,
      },
      {
        id: 'dev-user',
        full_name: 'Desenvolvedor FerveC',
        cpf_masked: '***.722.209-**',
        cpf_hash: '14be35054df0cc5de11bc8a02374f8efc4f49aa6d273cce14c1404ce386f71cc',
        birth_date: '01/01/1995',
        age: 31,
        email: 'dev@fervec.test',
        ddd: '11',
        phone: '99999-0000',
        whatsapp_opt_in: true,
        email_opt_in: true,
      },
      {
        id: 'spoof-user',
        full_name: 'Tentativa Spoof',
        cpf_masked: '***.722.209-**',
        cpf_hash: '14be35054df0cc5de11bc8a02374f8efc4f49aa6d273cce14c1404ce386f71cc',
        birth_date: '01/01/1998',
        age: 28,
        email: 'spoof@fervec.test',
        ddd: '11',
        phone: '91111-0000',
        whatsapp_opt_in: false,
        email_opt_in: false,
      },
      {
        id: 'owner-email',
        full_name: 'FerveC Gastronomia',
        cpf_masked: '***.***.***-**',
        cpf_hash: null,
        birth_date: '01/01/2000',
        age: 18,
        email: 'fervecrgastronomia@gmail.com',
        ddd: '11',
        phone: '98888-0000',
        whatsapp_opt_in: true,
        email_opt_in: true,
      },
      {
        id: 'revoked-gabriel',
        full_name: 'Gabriel Cremonese',
        cpf_masked: '***.333.444-**',
        cpf_hash: 'old-admin-hash',
        birth_date: '01/01/1995',
        age: 31,
        email: 'gabrielcremonesee@gmail.com',
        ddd: '11',
        phone: '97777-0000',
        whatsapp_opt_in: false,
        email_opt_in: false,
      },
    ],
    student_enrollments: [],
    module_progress: [],
    assessment_attempts: [],
    certificates: [],
    orders: [
      {
        id: 'ord-paid-a',
        user_id: 'user-a',
        course_id: courseId,
        status: 'paid',
        amount_cents: 1290,
        asaas_payment_id: 'pay_seed_a',
        paid_at: '2026-11-15T12:00:00.000Z',
        created_at: '2026-11-15T11:55:00.000Z',
      },
      {
        id: 'ord-paid-b',
        user_id: 'user-b',
        course_id: courseId,
        status: 'paid',
        amount_cents: 1290,
        asaas_payment_id: 'pay_seed_b',
        paid_at: '2026-11-15T12:00:00.000Z',
        created_at: '2026-11-15T11:55:00.000Z',
      },
    ],
    payments: [],
  };

  let idSeq = 1;

  function makeClientForUser(userId: string) {
    function from(table: string) {
      const filters: Array<(r: Row) => boolean> = [];
      let orderCol: string | null = null;
      let orderAsc = true;
      let limitNum: number | null = null;
      let op: 'select' | 'insert' | 'update' | 'upsert' = 'select';
      let payloadData: Row | null = null;

      function applyRls(rows: Row[]): Row[] {
        if (table === 'courses' || table === 'course_modules') return rows;
        if (table === 'profiles') return rows.filter((r) => r.id === userId);
        return rows.filter((r) => r.user_id === userId);
      }

      const builder: Record<string, unknown> = {
        select() {
          return builder;
        },
        eq(col: string, val: unknown) {
          filters.push((r) => r[col] === val);
          return builder;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          orderCol = col;
          orderAsc = opts?.ascending !== false;
          return builder;
        },
        limit(n: number) {
          limitNum = n;
          return builder;
        },
        insert(row: Row) {
          op = 'insert';
          payloadData = { id: `${table}-${idSeq++}`, ...row };
          db[table].push(payloadData);
          return builder;
        },
        update(patch: Row) {
          op = 'update';
          payloadData = patch;
          return builder;
        },
        upsert(row: Row) {
          op = 'upsert';
          const idx = db[table].findIndex((r) => r.id === row.id);
          if (idx >= 0) {
            db[table][idx] = { ...db[table][idx], ...row };
            payloadData = db[table][idx];
          } else {
            payloadData = { ...row };
            db[table].push(payloadData);
          }
          return builder;
        },
        maybeSingle() {
          const rows = execute();
          return Promise.resolve({ data: rows.data[0] ?? null, error: null });
        },
        single() {
          const rows = execute();
          return Promise.resolve({
            data: rows.data[0] ?? null,
            error: rows.data[0] ? null : { message: 'Row not found' },
          });
        },
        then(resolve: (val: { data: Row[]; error: null }) => void) {
          resolve(execute());
        },
      };

      function execute(): { data: Row[]; error: null } {
        if (op === 'insert' || op === 'upsert') {
          return { data: payloadData ? [payloadData] : [], error: null };
        }
        if (op === 'update' && payloadData) {
          const targets = applyRls(db[table]).filter((r) => filters.every((f) => f(r)));
          for (const t of targets) {
            Object.assign(t, payloadData);
          }
          return { data: targets, error: null };
        }
        let rows = applyRls(db[table]).filter((r) => filters.every((f) => f(r)));
        if (orderCol) {
          const col = orderCol;
          rows = rows.slice().sort((a, b) => {
            const av = String(a[col] ?? '');
            const bv = String(b[col] ?? '');
            return orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
          });
        }
        if (limitNum !== null) rows = rows.slice(0, limitNum);
        return { data: rows, error: null };
      }

      return builder;
    }

    return {
      from,
      storage: {
        from(bucket: string) {
          return {
            async upload(path: string, bytes: Uint8Array) {
              storageUploads.push({
                bucket,
                path,
                size: bytes.byteLength,
                userId,
              });
              return { data: { path }, error: null };
            },
          };
        },
      },
    };
  }

  return { db, storageUploads, makeClientForUser };
}

test('End-to-end DB, exam grading, certificate auto-release, PDF, failed student block, 2nd copy, and cross-user isolation', async () => {
  const { db, storageUploads, makeClientForUser } = createMockSupabaseDb();
  const app = express();
  app.use(express.json());

  resetDeveloperLatchForTests();
  registerCourseApiRoutes(app, {
    resolveAuth: async (req) => {
      const uid = req.headers['x-test-user'] as string | undefined;
      if (!uid) return null;
      return {
        supabase: makeClientForUser(uid) as never,
        user: {
          id: uid,
          email:
            uid === 'dev-user'
              ? 'dev@fervec.test'
              : uid === 'owner-email'
                ? 'fervecrgastronomia@gmail.com'
                : uid === 'revoked-gabriel'
                  ? 'gabrielcremonesee@gmail.com'
                  : uid === 'spoof-user'
                    ? 'spoof@fervec.test'
                    : uid === 'user-a'
                      ? 'ana@fervec.test'
                      : uid === 'user-unpaid'
                        ? 'unpaid@fervec.test'
                        : 'bruno@fervec.test',
          created_at:
            uid === 'spoof-user' || uid === 'owner-email'
              ? '2026-11-18T10:00:00.000Z'
              : '2026-11-15T12:00:00.000Z',
          email_confirmed_at: '2026-11-18T10:05:00.000Z',
          app_metadata:
            uid === 'revoked-gabriel'
              ? { role: 'developer_admin', fervec_developer: true }
              : {},
          user_metadata: {},
        } as never,
      };
    },
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Test 1: Registration/profile data recovered per authenticated user + exact non-rounded workload
    const wsA = await fetch(`${baseUrl}/api/workspace/state`, {
      headers: { 'x-test-user': 'user-a' },
    });
    assert.equal(wsA.status, 200);
    const wsAData = (await wsA.json()) as Record<string, any>;
    assert.equal(wsAData.profile.full_name, 'Ana Carolina Souza');
    assert.equal(wsAData.profile.cpf_masked, '***.456.789-**');
    assert.equal(wsAData.workloadMinutes, 248);
    assert.equal(wsAData.workloadLabel, '4 horas e 8 minutos');
    assert.equal(wsAData.eligibleForCertificate, false);
    assert.equal(wsAData.certificate, null);
    assert.deepEqual(wsAData.certificates, []);

    // Sync Student A module steps & review
    const syncA = await fetch(`${baseUrl}/api/progress/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'user-a' },
      body: JSON.stringify({
        moduleKey: 'carbonara',
        currentStage: 5,
        doneSteps: [0, 1, 2, 3, 4, 5],
        reviewDone: true,
        lessonFinished: true,
        workFinished: false,
      }),
    });
    assert.equal(syncA.status, 200);

    // Test 2 & 3: Student A completes exam & passes (>= 70%) -> DB graded + auto certificate unlocked
    const passingAnswers = exam.map((q) => q.correct);
    const passRes = await fetch(`${baseUrl}/api/assessments/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'user-a' },
      body: JSON.stringify({
        moduleKey: 'carbonara',
        attemptType: 'exam',
        answers: passingAnswers,
      }),
    });
    assert.equal(passRes.status, 200);
    const passJson = (await passRes.json()) as Record<string, any>;
    assert.equal(passJson.score, 100);
    assert.equal(passJson.passed, true);
    assert.equal(passJson.certificateUnlocked, true);
    assert.ok(passJson.certificate?.certificate_code);
    assert.equal(passJson.certificate.student_name_snapshot, 'Ana Carolina Souza');
    assert.equal(passJson.certificate.course_title_snapshot, 'Massas Italianas');
    assert.equal(passJson.certificate.cpfMasked, '***.456.789-**');
    assert.equal(passJson.certificate.workloadMinutes, 248);
    assert.equal(passJson.certificate.workloadLabel, '4 horas e 8 minutos');

    const certCodeA = passJson.certificate.certificate_code as string;
    assert.equal(db.certificates.length, 1);

    // Verify GET /api/certificates returns Student A's certificate list (regular student, not just admin)
    const listCertsARes = await fetch(`${baseUrl}/api/certificates`, {
      headers: { 'x-test-user': 'user-a' },
    });
    assert.equal(listCertsARes.status, 200);
    const listCertsA = (await listCertsARes.json()) as Record<string, any>;
    assert.equal(listCertsA.certificates.length, 1);
    assert.equal(listCertsA.certificates[0].certificate_code, certCodeA);
    assert.equal(listCertsA.certificates[0].workloadLabel, '4 horas e 8 minutos');

    // Backdate Student A completion_at in DB to verify completionDate != issued_at is preserved
    const enrollA = db.student_enrollments.find((e) => e.user_id === 'user-a');
    assert.ok(enrollA);
    enrollA.completed_at = '2026-10-05T15:30:00.000Z';

    const listCertsAAfterDate = await fetch(`${baseUrl}/api/certificates`, {
      headers: { 'x-test-user': 'user-a' },
    });
    const listCertsADated = (await listCertsAAfterDate.json()) as Record<string, any>;
    assert.equal(listCertsADated.certificates[0].completionDate, '05/10/2026');

    // Test 4: Generate & download real PDF certificate for Student A + verify Storage upload invocation
    const pdfRes = await fetch(`${baseUrl}/api/certificates/${certCodeA}/pdf`, {
      headers: { 'x-test-user': 'user-a' },
    });
    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');
    const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
    assert.equal(pdfBuf.subarray(0, 5).toString('ascii'), '%PDF-');
    const parsedPdf = await PDFDocument.load(pdfBuf);
    assert.equal(parsedPdf.getPageCount(), 1);
    assert.ok(
      storageUploads.some(
        (u) => u.bucket === 'certificates' && u.path === `user-a/${certCodeA}.pdf` && u.size > 50_000
      )
    );

    // Test 6: 2nd copy (2ª via) & concurrent requests return existing certificate WITHOUT duplicates
    const [concurrent1, concurrent2] = await Promise.all([
      fetch(`${baseUrl}/api/certificates/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-user': 'user-a' },
        body: JSON.stringify({ courseSlug: 'massas-italianas' }),
      }),
      fetch(`${baseUrl}/api/certificates/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-user': 'user-a' },
        body: JSON.stringify({ courseSlug: 'massas-italianas' }),
      }),
    ]);
    assert.equal(concurrent1.status, 200);
    assert.equal(concurrent2.status, 200);
    const secondIssueJson = (await concurrent1.json()) as Record<string, any>;
    assert.equal(secondIssueJson.alreadyIssued, true);
    assert.equal(secondIssueJson.certificate.certificate_code, certCodeA);
    assert.equal(db.certificates.length, 1);
    assert.equal(secondIssueJson.certificates.length, 1);

    // Test 5: Student B completes module & FAILS exam (< 70%) -> blocked from issuing/downloading certificate
    await fetch(`${baseUrl}/api/progress/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'user-b' },
      body: JSON.stringify({
        moduleKey: 'carbonara',
        currentStage: 5,
        doneSteps: [0, 1, 2, 3, 4, 5],
        reviewDone: true,
        lessonFinished: true,
        workFinished: false,
      }),
    });
    const failingAnswers = exam.map((q) => (q.correct + 1) % 4); // 0%
    const failRes = await fetch(`${baseUrl}/api/assessments/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'user-b' },
      body: JSON.stringify({
        moduleKey: 'carbonara',
        attemptType: 'exam',
        answers: failingAnswers,
      }),
    });
    assert.equal(failRes.status, 200);
    const failJson = (await failRes.json()) as Record<string, any>;
    assert.equal(failJson.score, 0);
    assert.equal(failJson.passed, false);
    assert.equal(failJson.certificateUnlocked, false);
    assert.equal(failJson.certificate, null);

    const blockedIssueB = await fetch(`${baseUrl}/api/certificates/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'user-b' },
      body: JSON.stringify({ courseSlug: 'massas-italianas' }),
    });
    assert.equal(blockedIssueB.status, 403);
    assert.equal(db.certificates.length, 1);

    // Test 7: Student B CANNOT view/download Student A's certificate PDF, and unauthenticated user gets 401
    const crossUserPdf = await fetch(`${baseUrl}/api/certificates/${certCodeA}/pdf`, {
      headers: { 'x-test-user': 'user-b' },
    });
    assert.equal(crossUserPdf.status, 403);

    const unauthPdf = await fetch(`${baseUrl}/api/certificates/${certCodeA}/pdf`);
    assert.equal(unauthPdf.status, 401);

    const unauthIssue = await fetch(`${baseUrl}/api/certificates/issue`, { method: 'POST' });
    assert.equal(unauthIssue.status, 401);

    // Test 8: Normal user sending spoofed CPF/flags in request body CANNOT gain developer privileges
    const spoofBodyRes = await fetch(`${baseUrl}/api/certificates/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user': 'user-b',
        'x-cpf': '102.722.209-90',
      },
      body: JSON.stringify({
        courseSlug: 'cozinha-francesa',
        cpf: '102.722.209-90',
        isDeveloper: true,
        bypassExam: true,
      }),
    });
    assert.equal(spoofBodyRes.status, 403);

    // Test 9: Exclusive developer account (CPF 102.722.209-90) can emit & download PDF for ANY course without exam
    const devWsRes = await fetch(`${baseUrl}/api/workspace/state`, {
      headers: { 'x-test-user': 'dev-user' },
    });
    assert.equal(devWsRes.status, 200);
    const devWs = (await devWsRes.json()) as Record<string, any>;
    assert.equal(devWs.permissions.isDeveloperAdmin, true);
    assert.equal(devWs.permissions.canBypassExamForCertificates, true);
    assert.equal(devWs.eligibleForCertificate, true);
    assert.equal(devWs.courses.length, 3);

    // Concurrent emission on Cozinha Francesa (90 min -> "1 hora e 30 minutos") prevents duplicate DB inserts
    const [devFrenchIssue, devFrenchConcurrent] = await Promise.all([
      fetch(`${baseUrl}/api/certificates/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-user': 'dev-user' },
        body: JSON.stringify({ courseSlug: 'cozinha-francesa' }),
      }),
      fetch(`${baseUrl}/api/certificates/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-user': 'dev-user' },
        body: JSON.stringify({ courseSlug: 'cozinha-francesa' }),
      }),
    ]);
    assert.equal(devFrenchIssue.status, 200);
    assert.equal(devFrenchConcurrent.status, 200);
    const devFrenchJson = (await devFrenchIssue.json()) as Record<string, any>;
    const devFrenchConcurrentJson = (await devFrenchConcurrent.json()) as Record<string, any>;
    assert.equal(devFrenchJson.grantedByDeveloperAdmin, true);
    assert.equal(devFrenchJson.certificate.course_title_snapshot, 'Cozinha Francesa');
    assert.equal(devFrenchJson.certificate.cpfMasked, '***.722.209-**');
    assert.equal(devFrenchJson.certificate.workloadMinutes, 90);
    assert.equal(devFrenchJson.certificate.workloadLabel, '1 hora e 30 minutos');
    assert.equal(
      devFrenchConcurrentJson.certificate.certificate_code,
      devFrenchJson.certificate.certificate_code
    );
    assert.equal(
      db.certificates.filter((c) => c.user_id === 'dev-user' && c.course_id === '10703c7c-464d-40c2-8d14-4098494bf53a').length,
      1
    );

    // Admin issues Cozinha Brasileira (120 min -> "2 horas")
    const devBrazilIssue = await fetch(`${baseUrl}/api/certificates/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'dev-user' },
      body: JSON.stringify({ courseSlug: 'cozinha-brasileira' }),
    });
    assert.equal(devBrazilIssue.status, 200);
    const devBrazilJson = (await devBrazilIssue.json()) as Record<string, any>;
    assert.equal(devBrazilJson.certificate.workloadMinutes, 120);
    assert.equal(devBrazilJson.certificate.workloadLabel, '2 horas');
    assert.equal(devBrazilJson.certificates.length, 2);

    const devFrenchPdf = await fetch(
      `${baseUrl}/api/certificates/${devFrenchJson.certificate.certificate_code}/pdf`,
      { headers: { 'x-test-user': 'dev-user' } }
    );
    assert.equal(devFrenchPdf.status, 200);
    const devPdfBytes = Buffer.from(await devFrenchPdf.arrayBuffer());
    assert.equal(devPdfBytes.subarray(0, 5).toString('ascii'), '%PDF-');

    // Second issue for same course returns 2ª via without duplicate row
    const devFrench2 = await fetch(`${baseUrl}/api/certificates/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'dev-user' },
      body: JSON.stringify({ courseSlug: 'cozinha-francesa' }),
    });
    assert.equal(devFrench2.status, 200);
    const devFrench2Json = (await devFrench2.json()) as Record<string, any>;
    assert.equal(devFrench2Json.alreadyIssued, true);
    assert.equal(
      devFrench2Json.certificate.certificate_code,
      devFrenchJson.certificate.certificate_code
    );

    // Other users cannot download developer's certificate PDF or claim developer privilege via post-cutoff signup
    const crossDevPdf = await fetch(
      `${baseUrl}/api/certificates/${devFrenchJson.certificate.certificate_code}/pdf`,
      { headers: { 'x-test-user': 'user-b' } }
    );
    assert.equal(crossDevPdf.status, 403);

    const spoofAccountRes = await fetch(`${baseUrl}/api/certificates/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'spoof-user' },
      body: JSON.stringify({ courseSlug: 'cozinha-francesa' }),
    });
    assert.equal(spoofAccountRes.status, 403);

    // Test 10: Official primary admin (fervecrgastronomia@gmail.com) gets bound profile (masked/hashed CPF + 09/11/2000), Admin Panel permission & revokes old admin gabrielcremonesee@gmail.com
    const ownerWsRes = await fetch(`${baseUrl}/api/workspace/state`, {
      headers: { 'x-test-user': 'owner-email' },
    });
    assert.equal(ownerWsRes.status, 200);
    const ownerWs = (await ownerWsRes.json()) as Record<string, any>;
    assert.equal(ownerWs.permissions.isDeveloperAdmin, true);
    assert.equal(ownerWs.permissions.canBypassExamForCertificates, true);
    assert.equal(ownerWs.permissions.canAccessAdminPanel, true);
    assert.equal(ownerWs.eligibleForCertificate, true);
    assert.equal(ownerWs.profile.cpf_masked, '***.722.209-**');
    assert.equal(ownerWs.profile.cpf_hash, '14be35054df0cc5de11bc8a02374f8efc4f49aa6d273cce14c1404ce386f71cc');
    assert.equal(ownerWs.profile.birth_date, '09/11/2000');
    assert.equal(ownerWs.profile.age, 26);
    assert.doesNotMatch(JSON.stringify(ownerWs), /102\.?722\.?209-?90/);

    const ownerIssueRes = await fetch(`${baseUrl}/api/certificates/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'owner-email' },
      body: JSON.stringify({ courseSlug: 'massas-italianas' }),
    });
    assert.equal(ownerIssueRes.status, 200);
    const ownerIssueJson = (await ownerIssueRes.json()) as Record<string, any>;
    assert.equal(ownerIssueJson.grantedByDeveloperAdmin, true);
    assert.equal(ownerIssueJson.certificate.studentName, 'FerveC Gastronomia');
    assert.equal(ownerIssueJson.certificates.length, 1);

    const ownerPdfRes = await fetch(
      `${baseUrl}/api/certificates/${ownerIssueJson.certificate.certificate_code}/pdf`,
      { headers: { 'x-test-user': 'owner-email' } }
    );
    assert.equal(ownerPdfRes.status, 200);
    const ownerPdfBuf = Buffer.from(await ownerPdfRes.arrayBuffer());
    assert.equal(ownerPdfBuf.subarray(0, 5).toString('ascii'), '%PDF-');

    // Old admin gabrielcremonesee@gmail.com retains account/profile data but loses ALL admin privileges
    const revokedWsRes = await fetch(`${baseUrl}/api/workspace/state`, {
      headers: { 'x-test-user': 'revoked-gabriel' },
    });
    assert.equal(revokedWsRes.status, 200);
    const revokedWs = (await revokedWsRes.json()) as Record<string, any>;
    assert.equal(revokedWs.profile.email, 'gabrielcremonesee@gmail.com');
    assert.equal(revokedWs.permissions.isDeveloperAdmin, false);
    assert.equal(revokedWs.permissions.canAccessAdminPanel, false);
    assert.equal(revokedWs.permissions.canBypassExamForCertificates, false);

    const revokedCertBlock = await fetch(`${baseUrl}/api/certificates/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'revoked-gabriel' },
      body: JSON.stringify({ courseSlug: 'massas-italianas' }),
    });
    assert.equal(revokedCertBlock.status, 403);

    // Test 11: Regular student with pre-existing completed status in module_progress / student_enrollments
    db.profiles.push({
      id: 'user-completed-db',
      full_name: 'Carla Beatriz Nunes',
      cpf_masked: '***.999.888-**',
      cpf_hash: 'hash-carla',
      email: 'carla@fervec.test',
    });
    db.student_enrollments.push({
      id: 'enr-carla',
      user_id: 'user-completed-db',
      course_id: '8a3c38ad-d5de-424a-868d-325420b7470b',
      status: 'completed',
      last_module_key: 'carbonara',
      enrolled_at: '2026-10-01T10:00:00.000Z',
      completed_at: '2026-10-12T18:00:00.000Z',
      updated_at: '2026-10-12T18:00:00.000Z',
    });
    db.module_progress.push({
      id: 'mp-carla',
      user_id: 'user-completed-db',
      course_id: '8a3c38ad-d5de-424a-868d-325420b7470b',
      module_key: 'carbonara',
      current_stage: 5,
      done_steps: [0, 1, 2, 3, 4, 5],
      mise_checks: [0, 1, 2],
      review_done: true,
      lesson_finished: true,
      work_finished: true,
      exam_status: 'passed',
      updated_at: '2026-10-12T18:00:00.000Z',
    });

    const carlaWsRes = await fetch(`${baseUrl}/api/workspace/state`, {
      headers: { 'x-test-user': 'user-completed-db' },
    });
    assert.equal(carlaWsRes.status, 200);
    const carlaWs = (await carlaWsRes.json()) as Record<string, any>;
    assert.equal(carlaWs.eligibleForCertificate, true);

    const carlaIssueRes = await fetch(`${baseUrl}/api/certificates/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'user-completed-db' },
      body: JSON.stringify({ courseSlug: 'massas-italianas' }),
    });
    assert.equal(carlaIssueRes.status, 200);
    const carlaIssueJson = (await carlaIssueRes.json()) as Record<string, any>;
    assert.equal(carlaIssueJson.certificate.studentName, 'Carla Beatriz Nunes');
    assert.equal(carlaIssueJson.certificate.completionDate, '12/10/2026');

    // Test 12: Unpaid student CANNOT sync progress, submit exams, or issue certificates, and transitions cleanly upon paid order
    db.profiles.push({
      id: 'user-unpaid',
      full_name: 'Pedro Sem Pagamento',
      cpf_masked: '***.555.444-**',
      cpf_hash: 'hash-unpaid',
      birth_date: '10/10/1994',
      age: 32,
      email: 'unpaid@fervec.test',
      ddd: '11',
      phone: '96666-5555',
      whatsapp_opt_in: false,
      email_opt_in: false,
    });

    const unpaidWsRes = await fetch(`${baseUrl}/api/workspace/state`, {
      headers: { 'x-test-user': 'user-unpaid' },
    });
    assert.equal(unpaidWsRes.status, 200);
    const unpaidWs = (await unpaidWsRes.json()) as Record<string, any>;
    assert.equal(unpaidWs.isEnrolled, false);
    assert.equal(unpaidWs.enrollment, null);

    const unpaidSyncBlock = await fetch(`${baseUrl}/api/progress/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'user-unpaid' },
      body: JSON.stringify({ moduleKey: 'carbonara', currentStage: 1, doneSteps: [0] }),
    });
    assert.equal(unpaidSyncBlock.status, 403);

    const unpaidExamBlock = await fetch(`${baseUrl}/api/assessments/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user': 'user-unpaid' },
      body: JSON.stringify({ moduleKey: 'carbonara', attemptType: 'exam', answers: exam.map((q) => q.correct) }),
    });
    assert.equal(unpaidExamBlock.status, 403);

    const unpaidSummaryRes = await fetch(`${baseUrl}/api/payments/course-summary?courseSlug=massas-italianas`, {
      headers: { 'x-test-user': 'user-unpaid' },
    });
    assert.equal(unpaidSummaryRes.status, 200);
    const unpaidSummary = (await unpaidSummaryRes.json()) as Record<string, any>;
    assert.equal(unpaidSummary.isEnrolled, false);
    assert.equal(unpaidSummary.customerProfile.hasAsaasCustomerId, false);
    assert.equal(unpaidSummary.priceCents, 1290);

    db.orders.push({
      id: '11111111-1111-4111-8111-111111111111',
      user_id: 'user-unpaid',
      course_id: '8a3c38ad-d5de-424a-868d-325420b7470b',
      status: 'paid',
      amount_cents: 1290,
      asaas_payment_id: 'pay_sandbox_unpaid',
      paid_at: '2026-11-16T12:00:00.000Z',
      created_at: '2026-11-16T11:55:00.000Z',
    });
    db.payments.push({
      id: 'p-1',
      order_id: '11111111-1111-4111-8111-111111111111',
      user_id: 'user-unpaid',
      asaas_payment_id: 'pay_sandbox_unpaid',
      status: 'RECEIVED',
      billing_type: 'PIX',
      value_cents: 1290,
      due_date: '2026-11-19',
      created_at: '2026-11-16T11:55:00.000Z',
    });
    const profUnpaid = db.profiles.find((p) => p.id === 'user-unpaid');
    if (profUnpaid) profUnpaid.asaas_customer_id = 'cus_000005492817';

    const paidStatusRes = await fetch(`${baseUrl}/api/payments/status/11111111-1111-4111-8111-111111111111`, {
      headers: { 'x-test-user': 'user-unpaid' },
    });
    assert.equal(paidStatusRes.status, 200);
    const paidStatus = (await paidStatusRes.json()) as Record<string, any>;
    assert.equal(paidStatus.orderStatus, 'paid');
    assert.equal(paidStatus.isEnrolled, true);

    const paidSummaryRes = await fetch(`${baseUrl}/api/payments/course-summary?courseSlug=massas-italianas`, {
      headers: { 'x-test-user': 'user-unpaid' },
    });
    const paidSummary = (await paidSummaryRes.json()) as Record<string, any>;
    assert.equal(paidSummary.isEnrolled, true);
    assert.equal(paidSummary.customerProfile.hasAsaasCustomerId, true);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

