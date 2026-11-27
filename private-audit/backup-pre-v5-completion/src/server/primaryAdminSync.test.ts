import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { syncPrimaryAdminAccount } from './primaryAdminSync';
import {
  OFFICIAL_ADMIN_AGE,
  OFFICIAL_ADMIN_BIRTH_DATE,
  OFFICIAL_ADMIN_CPF_HASH,
  OFFICIAL_ADMIN_CPF_MASKED,
  OFFICIAL_PRIMARY_ADMIN_EMAIL,
} from './developerAuth';

test('syncPrimaryAdminAccount creates new admin securely (never CPF password), syncs profile, and revokes old admin claims without deleting account', async () => {
  const authUsers: Array<{
    id: string;
    email: string;
    password?: string;
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
  }> = [
    {
      id: 'old-gabriel-id',
      email: 'gabrielcremonesee@gmail.com',
      app_metadata: {
        role: 'developer_admin',
        fervec_developer: true,
        certificate_bypass: true,
        permissions: ['certificate:bypass_exam'],
        preserved_claim: 'keep_me',
      },
      user_metadata: {},
    },
  ];
  const profiles: Array<Record<string, unknown>> = [
    {
      id: 'old-gabriel-id',
      email: 'gabrielcremonesee@gmail.com',
      full_name: 'Gabriel Cremonese',
    },
  ];

  const mockAdminClient = {
    auth: {
      admin: {
        async listUsers() {
          return { data: { users: authUsers as unknown as User[] }, error: null };
        },
        async updateUserById(id: string, attrs: { app_metadata?: Record<string, unknown> }) {
          const u = authUsers.find((x) => x.id === id);
          if (!u) return { data: { user: null }, error: { message: 'not found' } };
          if (attrs.app_metadata) u.app_metadata = attrs.app_metadata;
          return { data: { user: u as unknown as User }, error: null };
        },
        async createUser(attrs: {
          email: string;
          password: string;
          app_metadata: Record<string, unknown>;
          user_metadata: Record<string, unknown>;
        }) {
          // Never use raw or unformatted CPF as password
          assert.doesNotMatch(attrs.password, /102\.?722\.?209-?90/);
          assert.ok(attrs.password.length >= 20);
          const created = {
            id: 'new-fervec-admin-id',
            email: attrs.email,
            password: attrs.password,
            app_metadata: attrs.app_metadata,
            user_metadata: attrs.user_metadata,
          };
          authUsers.push(created);
          return { data: { user: created as unknown as User }, error: null };
        },
      },
    },
    from(table: string) {
      assert.equal(table, 'profiles');
      let targetId = '';
      return {
        select() {
          return this;
        },
        eq(_col: string, val: string) {
          targetId = val;
          return this;
        },
        async maybeSingle() {
          return { data: profiles.find((p) => p.id === targetId) ?? null, error: null };
        },
        async upsert(row: Record<string, unknown>) {
          const idx = profiles.findIndex((p) => p.id === row.id);
          if (idx >= 0) profiles[idx] = { ...profiles[idx], ...row };
          else profiles.push(row);
          return { data: [row], error: null };
        },
      };
    },
  } as unknown as SupabaseClient;

  const result = await syncPrimaryAdminAccount({ adminClient: mockAdminClient });

  assert.equal(result.executed, true);
  assert.equal(result.primaryAdminCreated, true);
  assert.equal(result.primaryAdminProfileSynced, true);
  assert.deepEqual(result.revokedAccountsUpdated, ['gabrielcremonesee@gmail.com']);

  // Old admin account and profile preserved, but admin metadata removed
  const oldUser = authUsers.find((u) => u.email === 'gabrielcremonesee@gmail.com');
  assert.ok(oldUser);
  assert.equal(oldUser.app_metadata.role, undefined);
  assert.equal(oldUser.app_metadata.fervec_developer, undefined);
  assert.equal(oldUser.app_metadata.certificate_bypass, undefined);
  assert.equal(oldUser.app_metadata.preserved_claim, 'keep_me');
  assert.ok(profiles.find((p) => p.id === 'old-gabriel-id'));

  // New primary admin account created & bound
  const newUser = authUsers.find((u) => u.email === OFFICIAL_PRIMARY_ADMIN_EMAIL);
  assert.ok(newUser);
  assert.equal(newUser.app_metadata.role, 'developer_admin');
  assert.deepEqual(newUser.app_metadata.permissions, ['certificate:bypass_exam', 'admin:asaas_audit']);

  const newProfile = profiles.find((p) => p.id === 'new-fervec-admin-id');
  assert.ok(newProfile);
  assert.equal(newProfile.email, OFFICIAL_PRIMARY_ADMIN_EMAIL);
  assert.equal(newProfile.cpf_masked, OFFICIAL_ADMIN_CPF_MASKED);
  assert.equal(newProfile.cpf_hash, OFFICIAL_ADMIN_CPF_HASH);
  assert.equal(newProfile.birth_date, OFFICIAL_ADMIN_BIRTH_DATE);
  assert.equal(newProfile.age, OFFICIAL_ADMIN_AGE);
});
