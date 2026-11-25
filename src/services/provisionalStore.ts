import {
  CouponRecord,
  CouponRedemptionRecord,
  createCouponRecord,
  CreateCouponInput,
  redeemCouponProvisional,
} from '../utils/coupons';
import { StoredUserProfile } from '../utils/profile';

export const PROVISIONAL_ACCOUNTS_KEY = 'fervec-accounts-v1';
export const PROVISIONAL_COUPONS_KEY = 'fervec-coupons-v1';
export const PROVISIONAL_DEMO_ORDERS_KEY = 'fervec-demo-orders-v1';
export const PROVISIONAL_ADMIN_MODE_KEY = 'fervec-phase1-admin-mode-v1';
export const PROVISIONAL_ACTIVITY_KEY = 'fervec-provisional-activity-v1';

export type AccountRole = 'student' | 'admin';

export interface UnifiedAccountRecord {
  id: string;
  fullName: string;
  email: string;
  cpfMasked: string;
  cpfHash?: string;
  birthDate: string;
  age: number;
  ddd: string;
  phone: string;
  promoWhatsapp: boolean;
  promoEmail: boolean;
  passwordDigest: string;
  role: AccountRole;
  entitledCourses: string[];
  createdAt: string;
  updatedAt: string;
  isProvisional: true;
}

export interface ProvisionalDemoOrder {
  id: string;
  courseSlug: string;
  courseTitle: string;
  studentEmail: string;
  studentName: string;
  subtotalCents: number;
  discountPercent: number;
  discountCents: number;
  totalCents: number;
  couponCode: string | null;
  status: 'demo_free_enrolled' | 'awaiting_asaas_phase2';
  paymentMethod: 'PIX' | 'BOLETO' | 'CARD' | 'COUPON_100';
  createdAt: string;
  isDemo: true;
}

export interface ProvisionalActivityItem {
  id: string;
  kind: 'registration' | 'coupon' | 'demo_order' | 'certificate' | 'progress' | 'demo_sample';
  title: string;
  detail: string;
  timestamp: string;
  isDemo: boolean;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export async function digestPasswordProvisional(email: string, password: string): Promise<string> {
  const normalized = `fervec-p1:${email.trim().toLowerCase()}:${password}`;
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoded = new TextEncoder().encode(normalized);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv-${(hash >>> 0).toString(16)}`;
}

// ---------- Accounts Repository (Fase 1 Provisório -> Fase 2 Supabase Auth & Profiles) ----------

export function listUnifiedAccounts(): UnifiedAccountRecord[] {
  const list = readJson<UnifiedAccountRecord[]>(PROVISIONAL_ACCOUNTS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function findUnifiedAccountByEmail(email: string): UnifiedAccountRecord | null {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return null;
  return listUnifiedAccounts().find((a) => a.email === clean) || null;
}

export async function upsertUnifiedAccountFromProfile(
  profile: StoredUserProfile,
  password: string,
  options?: { role?: AccountRole }
): Promise<UnifiedAccountRecord> {
  const accounts = listUnifiedAccounts();
  const cleanEmail = profile.email.trim().toLowerCase();
  const existing = accounts.find((a) => a.email === cleanEmail);
  const passwordDigest = password
    ? await digestPasswordProvisional(cleanEmail, password)
    : existing?.passwordDigest || '';

  const next: UnifiedAccountRecord = {
    id: existing?.id || profile.id,
    fullName: profile.fullName,
    email: cleanEmail,
    cpfMasked: profile.cpfMasked,
    cpfHash: profile.cpfHash,
    birthDate: profile.birthDate,
    age: profile.age,
    ddd: profile.ddd,
    phone: profile.phone,
    promoWhatsapp: profile.promoWhatsapp,
    promoEmail: profile.promoEmail,
    passwordDigest,
    role:
      options?.role ||
      existing?.role ||
      (cleanEmail === 'fervecrgastronomia@gmail.com' ? 'admin' : 'student'),
    entitledCourses: existing?.entitledCourses || [],
    createdAt: existing?.createdAt || profile.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isProvisional: true,
  };

  const filtered = accounts.filter((a) => a.email !== cleanEmail);
  filtered.unshift(next);
  writeJson(PROVISIONAL_ACCOUNTS_KEY, filtered);
  appendProvisionalActivity({
    kind: 'registration',
    title: existing ? 'Cadastro atualizado (local)' : 'Novo aluno cadastrado (local)',
    detail: `${next.fullName} · ${next.email}`,
    isDemo: false,
  });
  return next;
}

export async function authenticateUnifiedProvisional(
  email: string,
  password: string
): Promise<{ ok: boolean; account?: UnifiedAccountRecord; error?: string }> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { ok: false, error: 'Informe seu e-mail e senha cadastrados no FerveC.' };
  }
  const account = findUnifiedAccountByEmail(cleanEmail);
  if (!account) {
    return {
      ok: false,
      error:
        'Conta não encontrada neste navegador. Utilize o Cadastro Principal do FerveC para criar sua conta única.',
    };
  }
  const digest = await digestPasswordProvisional(cleanEmail, password);
  if (!account.passwordDigest || account.passwordDigest !== digest) {
    return { ok: false, error: 'E-mail ou senha incorretos.' };
  }
  return { ok: true, account };
}

export function hasProvisionalCourseEntitlement(
  email: string | undefined | null,
  courseSlug: string
): boolean {
  if (!email) return false;
  const acc = findUnifiedAccountByEmail(email);
  return Boolean(acc?.entitledCourses.includes(courseSlug));
}

export function grantProvisionalCourseEntitlement(
  email: string,
  courseSlug: string
): void {
  const clean = email.trim().toLowerCase();
  const accounts = listUnifiedAccounts();
  const idx = accounts.findIndex((a) => a.email === clean);
  if (idx < 0) return;
  const cur = accounts[idx];
  if (!cur.entitledCourses.includes(courseSlug)) {
    accounts[idx] = {
      ...cur,
      entitledCourses: [...cur.entitledCourses, courseSlug],
      updatedAt: new Date().toISOString(),
    };
    writeJson(PROVISIONAL_ACCOUNTS_KEY, accounts);
  }
}

// ---------- Coupons Repository (Fase 1 Provisório -> Fase 2 Supabase Tables + Server Edge Validation) ----------

export function listProvisionalCoupons(): CouponRecord[] {
  const list = readJson<CouponRecord[]>(PROVISIONAL_COUPONS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function createProvisionalCoupon(input: CreateCouponInput): CouponRecord {
  const existing = listProvisionalCoupons();
  const created = createCouponRecord(input, existing);
  writeJson(PROVISIONAL_COUPONS_KEY, [created, ...existing]);
  appendProvisionalActivity({
    kind: 'coupon',
    title: `Cupom ${created.code} gerado (${created.discountPercent}%)`,
    detail: `Validade ${created.validityDays} dia(s) · limite ${created.maxUses} uso(s) · provisório`,
    isDemo: false,
  });
  return created;
}

export function toggleProvisionalCouponActive(code: string, active: boolean): CouponRecord[] {
  const existing = listProvisionalCoupons();
  const next = existing.map((c) => (c.code === code ? { ...c, active } : c));
  writeJson(PROVISIONAL_COUPONS_KEY, next);
  appendProvisionalActivity({
    kind: 'coupon',
    title: active ? `Cupom ${code} reativado` : `Cupom ${code} desativado`,
    detail: 'Alteração provisória no painel administrativo',
    isDemo: false,
  });
  return next;
}

export function recordProvisionalCouponRedemption(params: {
  couponCode: string;
  orderId: string;
  courseSlug: string;
  studentEmail: string;
  studentName: string;
  originalCents: number;
  finalCents: number;
}): { ok: boolean; error?: string; coupon?: CouponRecord } {
  const existing = listProvisionalCoupons();
  const idx = existing.findIndex((c) => c.code === params.couponCode);
  if (idx < 0) return { ok: false, error: 'Cupom não encontrado.' };

  const res = redeemCouponProvisional(existing[idx], {
    orderId: params.orderId,
    courseSlug: params.courseSlug,
    studentEmail: params.studentEmail,
    studentName: params.studentName,
    originalCents: params.originalCents,
    finalCents: params.finalCents,
  });
  if (!res.ok) return { ok: false, error: res.error };

  existing[idx] = res.coupon;
  writeJson(PROVISIONAL_COUPONS_KEY, existing);
  return { ok: true, coupon: res.coupon };
}

// ---------- Demo Orders Repository (Fase 1 Provisório -> Fase 2 Asaas + Supabase Orders) ----------

export function listProvisionalDemoOrders(): ProvisionalDemoOrder[] {
  const list = readJson<ProvisionalDemoOrder[]>(PROVISIONAL_DEMO_ORDERS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveProvisionalDemoOrder(order: ProvisionalDemoOrder): ProvisionalDemoOrder {
  const existing = listProvisionalDemoOrders();
  if (existing.some((o) => o.id === order.id)) return order;
  const next = [order, ...existing];
  writeJson(PROVISIONAL_DEMO_ORDERS_KEY, next);
  appendProvisionalActivity({
    kind: 'demo_order',
    title:
      order.totalCents === 0
        ? `Aquisição demonstrativa gratuita (${order.couponCode || 'Cupom 100%'})`
        : `Pedido demonstrativo ${order.id}`,
    detail: `${order.courseTitle} · ${order.studentName || order.studentEmail} · Pedido ${order.id}`,
    isDemo: true,
  });
  return order;
}

// ---------- Activity Feed & Phase 1 Admin Preview Toggle ----------

export function listProvisionalActivities(): ProvisionalActivityItem[] {
  const list = readJson<ProvisionalActivityItem[]>(PROVISIONAL_ACTIVITY_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function appendProvisionalActivity(
  item: Omit<ProvisionalActivityItem, 'id' | 'timestamp'>
): void {
  const existing = listProvisionalActivities();
  const entry: ProvisionalActivityItem = {
    ...item,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  writeJson(PROVISIONAL_ACTIVITY_KEY, [entry, ...existing].slice(0, 30));
}

export function isPhase1AdminPreviewEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(PROVISIONAL_ADMIN_MODE_KEY) === '1';
}

export function setPhase1AdminPreviewEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (enabled) localStorage.setItem(PROVISIONAL_ADMIN_MODE_KEY, '1');
    else localStorage.removeItem(PROVISIONAL_ADMIN_MODE_KEY);
  } catch {
    // ignore
  }
}
