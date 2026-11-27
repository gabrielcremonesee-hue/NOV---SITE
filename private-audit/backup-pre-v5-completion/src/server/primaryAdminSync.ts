import crypto from 'node:crypto';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { getServerSupabaseEnv } from '../utils/supabase/server.ts';
import {
  OFFICIAL_ADMIN_AGE,
  OFFICIAL_ADMIN_BIRTH_DATE,
  OFFICIAL_ADMIN_CPF_HASH,
  OFFICIAL_ADMIN_CPF_MASKED,
  OFFICIAL_PRIMARY_ADMIN_EMAIL,
} from './developerAuth.ts';

const REVOKED_EMAILS = ['gabrielcremonesee@gmail.com', 'vaquinhavaq@gmail.com'] as const;

export interface PrimaryAdminSyncResult {
  executed: boolean;
  reason: string;
  primaryAdminUserId: string | null;
  primaryAdminCreated: boolean;
  primaryAdminMetadataUpdated: boolean;
  primaryAdminProfileSynced: boolean;
  revokedAccountsUpdated: string[];
}

async function findUsersByEmails(
  adminClient: SupabaseClient,
  targetEmails: ReadonlySet<string>
): Promise<Map<string, User>> {
  const found = new Map<string, User>();
  const perPage = 200;

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users) {
      throw new Error(error?.message || 'Falha ao consultar auth.users no Supabase.');
    }

    for (const user of data.users) {
      const email = (user.email || '').trim().toLowerCase();
      if (email && targetEmails.has(email)) {
        found.set(email, user);
      }
    }

    if (data.users.length < perPage || found.size === targetEmails.size) {
      break;
    }
  }

  return found;
}

export async function syncPrimaryAdminAccount(opts?: {
  adminClient?: SupabaseClient;
  serviceRoleKey?: string;
}): Promise<PrimaryAdminSyncResult> {
  let adminClient = opts?.adminClient;
  if (!adminClient) {
    const publicEnv = getServerSupabaseEnv();
    const serviceRoleKey = (
      opts?.serviceRoleKey ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      ''
    ).trim();

    if (!publicEnv || !serviceRoleKey) {
      return {
        executed: false,
        reason: !publicEnv ? 'missing_supabase_url' : 'missing_service_role_key',
        primaryAdminUserId: null,
        primaryAdminCreated: false,
        primaryAdminMetadataUpdated: false,
        primaryAdminProfileSynced: false,
        revokedAccountsUpdated: [],
      };
    }

    adminClient = createClient(publicEnv.url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  const targetEmails = new Set<string>([OFFICIAL_PRIMARY_ADMIN_EMAIL, ...REVOKED_EMAILS]);
  const usersByEmail = await findUsersByEmails(adminClient, targetEmails);

  // 1) Revoke administrative claims in auth.users.app_metadata for legacy accounts without deleting users or data
  const revokedAccountsUpdated: string[] = [];
  for (const oldEmail of REVOKED_EMAILS) {
    const oldUser = usersByEmail.get(oldEmail);
    if (!oldUser) continue;

    const existingAppMeta = { ...((oldUser.app_metadata || {}) as Record<string, unknown>) };
    const hadAdminClaim =
      'role' in existingAppMeta ||
      'fervec_developer' in existingAppMeta ||
      'certificate_bypass' in existingAppMeta ||
      'permissions' in existingAppMeta;

    if (hadAdminClaim) {
      delete existingAppMeta.role;
      delete existingAppMeta.fervec_developer;
      delete existingAppMeta.certificate_bypass;
      delete existingAppMeta.permissions;

      const { error: revokeErr } = await adminClient.auth.admin.updateUserById(oldUser.id, {
        app_metadata: existingAppMeta,
      });
      if (!revokeErr) {
        revokedAccountsUpdated.push(oldEmail);
      }
    }
  }

  // 2) Ensure fervecrgastronomia@gmail.com exists in Supabase Auth (never using CPF as password)
  let primaryUser = usersByEmail.get(OFFICIAL_PRIMARY_ADMIN_EMAIL) ?? null;
  let primaryAdminCreated = false;
  let primaryAdminMetadataUpdated = false;

  const expectedAdminMeta = {
    role: 'developer_admin',
    fervec_developer: true,
    certificate_bypass: true,
    permissions: ['certificate:bypass_exam', 'admin:asaas_audit'],
  };

  if (!primaryUser) {
    // Cryptographically random high-entropy temporary password (never uses CPF); owner logs in or sets password via recovery/reset
    const randomInitialPassword = `${crypto.randomBytes(24).toString('base64url')}!A9`;
    const { data: createdData, error: createErr } = await adminClient.auth.admin.createUser({
      email: OFFICIAL_PRIMARY_ADMIN_EMAIL,
      password: randomInitialPassword,
      email_confirm: true,
      app_metadata: expectedAdminMeta,
      user_metadata: {
        full_name: 'FerveC Gastronomia',
        cpf_masked: OFFICIAL_ADMIN_CPF_MASKED,
        cpf_hash: OFFICIAL_ADMIN_CPF_HASH,
        birth_date: OFFICIAL_ADMIN_BIRTH_DATE,
        age: OFFICIAL_ADMIN_AGE,
      },
    });

    if (createErr || !createdData?.user) {
      throw new Error(createErr?.message || 'Erro ao criar conta administrativa no Supabase Auth.');
    }

    primaryUser = createdData.user;
    primaryAdminCreated = true;
    primaryAdminMetadataUpdated = true;
  } else {
    const currentAppMeta = (primaryUser.app_metadata || {}) as Record<string, unknown>;
    const currentPerms = Array.isArray(currentAppMeta.permissions) ? currentAppMeta.permissions : [];
    const needsMetaUpdate =
      currentAppMeta.role !== 'developer_admin' ||
      currentAppMeta.fervec_developer !== true ||
      currentAppMeta.certificate_bypass !== true ||
      !currentPerms.includes('certificate:bypass_exam') ||
      !currentPerms.includes('admin:asaas_audit');

    if (needsMetaUpdate) {
      const { data: updatedData, error: updateErr } = await adminClient.auth.admin.updateUserById(
        primaryUser.id,
        {
          email_confirm: true,
          app_metadata: {
            ...currentAppMeta,
            ...expectedAdminMeta,
          },
        }
      );
      if (!updateErr && updatedData?.user) {
        primaryUser = updatedData.user;
        primaryAdminMetadataUpdated = true;
      }
    }
  }

  // 3) Sync official admin profile row with masked/hashed CPF + birth date 09/11/2000
  let primaryAdminProfileSynced = false;
  if (primaryUser) {
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, full_name, ddd, phone, whatsapp_opt_in, email_opt_in')
      .eq('id', primaryUser.id)
      .maybeSingle();

    const { error: upsertErr } = await adminClient.from('profiles').upsert(
      {
        id: primaryUser.id,
        full_name:
          (typeof existingProfile?.full_name === 'string' && existingProfile.full_name.trim()) ||
          'FerveC Gastronomia',
        cpf_masked: OFFICIAL_ADMIN_CPF_MASKED,
        cpf_hash: OFFICIAL_ADMIN_CPF_HASH,
        birth_date: OFFICIAL_ADMIN_BIRTH_DATE,
        age: OFFICIAL_ADMIN_AGE,
        email: OFFICIAL_PRIMARY_ADMIN_EMAIL,
        ddd: (typeof existingProfile?.ddd === 'string' && existingProfile.ddd.trim()) || '11',
        phone:
          (typeof existingProfile?.phone === 'string' && existingProfile.phone.trim()) || '90000-0000',
        whatsapp_opt_in: Boolean(existingProfile?.whatsapp_opt_in ?? false),
        email_opt_in: Boolean(existingProfile?.email_opt_in ?? false),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    primaryAdminProfileSynced = !upsertErr;
  }

  return {
    executed: true,
    reason: 'synced',
    primaryAdminUserId: primaryUser?.id ?? null,
    primaryAdminCreated,
    primaryAdminMetadataUpdated,
    primaryAdminProfileSynced,
    revokedAccountsUpdated,
  };
}
