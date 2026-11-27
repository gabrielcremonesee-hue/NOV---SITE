import type { User } from '@supabase/supabase-js';

/**
 * Official sole primary administrator account for FerveC Gastronomia.
 */
export const OFFICIAL_PRIMARY_ADMIN_EMAIL = 'fervecrgastronomia@gmail.com';
export const OFFICIAL_ADMIN_CPF_MASKED = '***.722.209-**';
export const OFFICIAL_ADMIN_CPF_HASH =
  '14be35054df0cc5de11bc8a02374f8efc4f49aa6d273cce14c1404ce386f71cc';
export const OFFICIAL_ADMIN_BIRTH_DATE = '09/11/2000';
export const OFFICIAL_ADMIN_AGE = 26;

/**
 * Previously authorized emails whose administrative privileges have been permanently revoked.
 * Their user accounts and student records remain untouched, but admin access is always denied.
 */
const REVOKED_ADMIN_EMAILS = new Set<string>([
  'gabrielcremonesee@gmail.com',
  'vaquinhavaq@gmail.com',
]);

/**
 * Cryptographic SHA-256 digests representing the authorized developer CPF.
 * Evaluated strictly on the server against verified Supabase auth + DB profile records;
 * client-supplied CPF values, headers, or role flags are never trusted.
 */
const DEVELOPER_CPF_SHA256_HASHES = new Set<string>([
  // sha256("fervec-cpf:10272220990") — current profile.ts convention
  OFFICIAL_ADMIN_CPF_HASH,
  // sha256("10272220990") — raw 11-digit legacy convention
  '786cbe68fa172c80c0eb33b3fdc473b3fd386fe81cd398aa2db6e46ab041350a',
  // sha256("102.722.209-90") — formatted legacy convention
  'b644e13bee0377f715af702c0b3fb26bb49c2f927b53d4d311bc22d0d44c6ff8',
]);

const DEVELOPER_MASKED_CPF_VALUES = new Set<string>([
  OFFICIAL_ADMIN_CPF_MASKED,
  '102.722.209-90',
]);

// Accounts registered after this cutoff cannot claim developer privileges via signup CPF matching alone
const DEFAULT_EXISTING_ACCOUNT_CUTOFF_MS = Date.parse('2026-11-16T23:59:59.000Z');

export interface DeveloperProfileSnapshot {
  id: string;
  cpf_masked?: string | null;
  cpf_hash?: string | null;
  email?: string | null;
}

export interface DeveloperPermissionResult {
  isDeveloperAdmin: boolean;
  canBypassExamForCertificates: boolean;
  canAccessAdminPanel: boolean;
  grantSource:
    | 'app_metadata'
    | 'env_user_id'
    | 'authorized_admin_email'
    | 'verified_existing_cpf_account'
    | null;
}

const AUTHORIZED_ADMIN_EMAILS = new Set<string>([
  OFFICIAL_PRIMARY_ADMIN_EMAIL,
  ...(process.env.FERVEC_DEV_ADMIN_EMAILS || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter((v) => Boolean(v) && !REVOKED_ADMIN_EMAILS.has(v)),
]);

// Single-owner runtime latch: once a legacy pre-cutoff CPF developer account is verified, no second user ID can claim it
let latchedDeveloperUserId: string | null = null;

export function resetDeveloperLatchForTests(): void {
  latchedDeveloperUserId = null;
}

function normalizeHash(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeMaskedCpf(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hasServerAdminAppMetadata(user: User): boolean {
  const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
  if (appMeta.role === 'developer_admin' || appMeta.role === 'admin') return true;
  if (appMeta.fervec_developer === true) return true;
  if (appMeta.certificate_bypass === true) return true;
  if (Array.isArray(appMeta.permissions) && appMeta.permissions.includes('certificate:bypass_exam')) {
    return true;
  }
  return false;
}

export function resolveDeveloperCertificateAdmin(params: {
  user: User;
  profile: DeveloperProfileSnapshot | null;
  profileExistedInDb: boolean;
  cutoffTimestampMs?: number;
  envDeveloperUserId?: string;
}): DeveloperPermissionResult {
  const { user, profile } = params;
  const denied: DeveloperPermissionResult = {
    isDeveloperAdmin: false,
    canBypassExamForCertificates: false,
    canAccessAdminPanel: false,
    grantSource: null,
  };

  if (!user || !user.id) return denied;

  const authEmail = normalizeEmail(user.email);
  const profileEmail = normalizeEmail(profile?.email);

  // 0. Explicitly revoked legacy accounts can NEVER retain admin access through any path
  if (
    (authEmail && REVOKED_ADMIN_EMAILS.has(authEmail)) ||
    (profileEmail && REVOKED_ADMIN_EMAILS.has(profileEmail))
  ) {
    return denied;
  }

  // 1. Authoritative Supabase server-only app_metadata claim (cannot be modified by client users)
  if (hasServerAdminAppMetadata(user)) {
    return {
      isDeveloperAdmin: true,
      canBypassExamForCertificates: true,
      canAccessAdminPanel: true,
      grantSource: 'app_metadata',
    };
  }

  // 2. Explicit server environment user lock (if configured)
  const configuredUserId = (
    params.envDeveloperUserId ??
    process.env.FERVEC_DEV_ADMIN_USER_ID ??
    ''
  ).trim();
  if (configuredUserId) {
    if (user.id === configuredUserId) {
      return {
        isDeveloperAdmin: true,
        canBypassExamForCertificates: true,
        canAccessAdminPanel: true,
        grantSource: 'env_user_id',
      };
    }
    return denied;
  }

  // 3. Verified official primary admin e-mail (confirmed account, or pre-cutoff existing DB profile)
  const confirmedAt = user.email_confirmed_at || (user as { confirmed_at?: string }).confirmed_at;
  const createdMs = Date.parse(user.created_at || '');
  const cutoffMs = params.cutoffTimestampMs ?? DEFAULT_EXISTING_ACCOUNT_CUTOFF_MS;
  const isPreCutoffExistingProfile =
    params.profileExistedInDb && Number.isFinite(createdMs) && createdMs <= cutoffMs;

  if (!confirmedAt && !isPreCutoffExistingProfile) return denied;

  if (authEmail && AUTHORIZED_ADMIN_EMAILS.has(authEmail)) {
    return {
      isDeveloperAdmin: true,
      canBypassExamForCertificates: true,
      canAccessAdminPanel: true,
      grantSource: 'authorized_admin_email',
    };
  }

  if (!confirmedAt) return denied;

  // 4. Verified pre-cutoff legacy developer CPF account match (certificate emission compatibility only; does NOT grant Admin Panel access)
  if (!Number.isFinite(createdMs) || createdMs > cutoffMs) {
    return denied;
  }

  // Enforce single-account exclusivity if another user already holds the latched developer slot
  if (latchedDeveloperUserId && latchedDeveloperUserId !== user.id) {
    return denied;
  }

  // Authoritative profile check: when DB profile exists, ignore client user_metadata completely
  const dbHash = normalizeHash(profile?.cpf_hash);
  const dbMasked = normalizeMaskedCpf(profile?.cpf_masked);

  const hashMatches = Boolean(dbHash && DEVELOPER_CPF_SHA256_HASHES.has(dbHash));
  const maskedIsExplicitlyOther =
    Boolean(dbMasked) &&
    dbMasked !== '***.***.***-**' &&
    !DEVELOPER_MASKED_CPF_VALUES.has(dbMasked);

  if (maskedIsExplicitlyOther) {
    return denied;
  }

  const legacyMaskedOnlyMatch = !dbHash && DEVELOPER_MASKED_CPF_VALUES.has(dbMasked);

  if (!hashMatches && !legacyMaskedOnlyMatch) {
    return denied;
  }

  latchedDeveloperUserId = user.id;
  return {
    isDeveloperAdmin: true,
    canBypassExamForCertificates: true,
    canAccessAdminPanel: false,
    grantSource: 'verified_existing_cpf_account',
  };
}
