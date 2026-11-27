import test from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '@supabase/supabase-js';
import {
  resetDeveloperLatchForTests,
  resolveDeveloperCertificateAdmin,
} from './developerAuth';

const DEV_CPF_HASH = '14be35054df0cc5de11bc8a02374f8efc4f49aa6d273cce14c1404ce386f71cc';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'dev-user-uuid',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-11-15T12:00:00.000Z',
    email_confirmed_at: '2026-11-15T12:05:00.000Z',
    email: 'dev@fervec.test',
    ...overrides,
  } as User;
}

test('resolveDeveloperCertificateAdmin grants exclusive permission to existing confirmed developer CPF account', () => {
  resetDeveloperLatchForTests();
  const res = resolveDeveloperCertificateAdmin({
    user: makeUser(),
    profile: {
      id: 'dev-user-uuid',
      cpf_masked: '***.722.209-**',
      cpf_hash: DEV_CPF_HASH,
      email: 'dev@fervec.test',
    },
    profileExistedInDb: true,
  });

  assert.equal(res.isDeveloperAdmin, true);
  assert.equal(res.canBypassExamForCertificates, true);
  assert.equal(res.grantSource, 'verified_existing_cpf_account');
});

test('resolveDeveloperCertificateAdmin blocks non-developer students and unconfirmed or post-cutoff spoofed accounts', () => {
  resetDeveloperLatchForTests();

  // Normal student
  const normal = resolveDeveloperCertificateAdmin({
    user: makeUser({ id: 'student-1' }),
    profile: {
      id: 'student-1',
      cpf_masked: '***.456.789-**',
      cpf_hash: 'some-other-hash',
    },
    profileExistedInDb: true,
  });
  assert.equal(normal.isDeveloperAdmin, false);

  // Unconfirmed email trying to use developer hash
  const unconfirmed = resolveDeveloperCertificateAdmin({
    user: makeUser({ id: 'spoof-unconfirmed', email_confirmed_at: undefined }),
    profile: {
      id: 'spoof-unconfirmed',
      cpf_masked: '***.722.209-**',
      cpf_hash: DEV_CPF_HASH,
    },
    profileExistedInDb: false,
  });
  assert.equal(unconfirmed.isDeveloperAdmin, false);

  // Post-cutoff new account trying to register with developer CPF
  const newAccountSpoof = resolveDeveloperCertificateAdmin({
    user: makeUser({
      id: 'spoof-new-account',
      created_at: '2026-11-17T10:00:00.000Z',
    }),
    profile: {
      id: 'spoof-new-account',
      cpf_masked: '***.722.209-**',
      cpf_hash: DEV_CPF_HASH,
    },
    profileExistedInDb: true,
  });
  assert.equal(newAccountSpoof.isDeveloperAdmin, false);

  // Mismatched masked CPF even with hash
  const maskedMismatch = resolveDeveloperCertificateAdmin({
    user: makeUser({ id: 'spoof-mismatch' }),
    profile: {
      id: 'spoof-mismatch',
      cpf_masked: '***.111.222-**',
      cpf_hash: DEV_CPF_HASH,
    },
    profileExistedInDb: true,
  });
  assert.equal(maskedMismatch.isDeveloperAdmin, false);
});

test('resolveDeveloperCertificateAdmin supports server-only app_metadata claim and single-user latch', () => {
  resetDeveloperLatchForTests();

  // Latch first developer account
  const first = resolveDeveloperCertificateAdmin({
    user: makeUser({ id: 'real-dev-1' }),
    profile: {
      id: 'real-dev-1',
      cpf_masked: '***.722.209-**',
      cpf_hash: DEV_CPF_HASH,
    },
    profileExistedInDb: true,
  });
  assert.equal(first.isDeveloperAdmin, true);

  // Second user attempting to match via CPF hash is blocked by single-owner latch
  const second = resolveDeveloperCertificateAdmin({
    user: makeUser({ id: 'attacker-2' }),
    profile: {
      id: 'attacker-2',
      cpf_masked: '***.722.209-**',
      cpf_hash: DEV_CPF_HASH,
    },
    profileExistedInDb: true,
  });
  assert.equal(second.isDeveloperAdmin, false);

  // Server-controlled app_metadata works independently
  const adminMeta = resolveDeveloperCertificateAdmin({
    user: makeUser({
      id: 'admin-meta-user',
      app_metadata: { role: 'developer_admin' },
    }),
    profile: { id: 'admin-meta-user', cpf_masked: '***.000.000-**' },
    profileExistedInDb: true,
  });
  assert.equal(adminMeta.isDeveloperAdmin, true);
  assert.equal(adminMeta.grantSource, 'app_metadata');
});

test('resolveDeveloperCertificateAdmin handles legacy Phase 5 pre-hash developer profile materialized on first login', () => {
  resetDeveloperLatchForTests();
  const res = resolveDeveloperCertificateAdmin({
    user: makeUser({ id: 'legacy-dev-uuid', created_at: '2026-11-16T18:00:00.000Z' }),
    profile: {
      id: 'legacy-dev-uuid',
      cpf_masked: '***.722.209-**',
      cpf_hash: null,
      email: 'dev@fervec.test',
    },
    profileExistedInDb: false,
  });
  assert.equal(res.isDeveloperAdmin, true);
  assert.equal(res.canBypassExamForCertificates, true);
});

test('resolveDeveloperCertificateAdmin grants exclusive admin access to confirmed primary admin fervecrgastronomia@gmail.com and blocks unconfirmed', () => {
  resetDeveloperLatchForTests();

  const confirmedOwner = resolveDeveloperCertificateAdmin({
    user: makeUser({
      id: 'owner-uuid-123',
      email: 'fervecrgastronomia@gmail.com',
      created_at: '2026-11-18T10:00:00.000Z',
    }),
    profile: {
      id: 'owner-uuid-123',
      cpf_masked: '***.722.209-**',
      cpf_hash: DEV_CPF_HASH,
      email: 'fervecrgastronomia@gmail.com',
    },
    profileExistedInDb: true,
  });
  assert.equal(confirmedOwner.isDeveloperAdmin, true);
  assert.equal(confirmedOwner.canBypassExamForCertificates, true);
  assert.equal(confirmedOwner.canAccessAdminPanel, true);
  assert.equal(confirmedOwner.grantSource, 'authorized_admin_email');

  const preCutoffExistingOwner = resolveDeveloperCertificateAdmin({
    user: makeUser({
      id: 'owner-pre-cutoff-unconfirmed',
      email: 'fervecrgastronomia@gmail.com',
      created_at: '2026-11-15T12:00:00.000Z',
      email_confirmed_at: undefined,
    }),
    profile: {
      id: 'owner-pre-cutoff-unconfirmed',
      cpf_masked: '***.722.209-**',
      email: 'fervecrgastronomia@gmail.com',
    },
    profileExistedInDb: true,
  });
  assert.equal(preCutoffExistingOwner.isDeveloperAdmin, true);
  assert.equal(preCutoffExistingOwner.canBypassExamForCertificates, true);
  assert.equal(preCutoffExistingOwner.canAccessAdminPanel, true);
  assert.equal(preCutoffExistingOwner.grantSource, 'authorized_admin_email');

  const unconfirmedOwner = resolveDeveloperCertificateAdmin({
    user: makeUser({
      id: 'owner-unconfirmed',
      email: 'fervecrgastronomia@gmail.com',
      created_at: '2026-11-18T10:00:00.000Z',
      email_confirmed_at: undefined,
    }),
    profile: {
      id: 'owner-unconfirmed',
      cpf_masked: '***.722.209-**',
    },
    profileExistedInDb: false,
  });
  assert.equal(unconfirmedOwner.isDeveloperAdmin, false);
  assert.equal(unconfirmedOwner.canAccessAdminPanel, false);
});

test('resolveDeveloperCertificateAdmin permanently revokes gabrielcremonesee@gmail.com and vaquinhavaq@gmail.com across all paths', () => {
  resetDeveloperLatchForTests();

  for (const revokedEmail of ['gabrielcremonesee@gmail.com', 'vaquinhavaq@gmail.com']) {
    const revokedWithClaims = resolveDeveloperCertificateAdmin({
      user: makeUser({
        id: `revoked-${revokedEmail}`,
        email: revokedEmail,
        created_at: '2026-11-14T10:00:00.000Z',
        app_metadata: {
          role: 'developer_admin',
          fervec_developer: true,
          certificate_bypass: true,
          permissions: ['certificate:bypass_exam'],
        },
      }),
      profile: {
        id: `revoked-${revokedEmail}`,
        cpf_masked: '***.722.209-**',
        cpf_hash: DEV_CPF_HASH,
        email: revokedEmail,
      },
      profileExistedInDb: true,
    });

    assert.equal(revokedWithClaims.isDeveloperAdmin, false);
    assert.equal(revokedWithClaims.canBypassExamForCertificates, false);
    assert.equal(revokedWithClaims.canAccessAdminPanel, false);
    assert.equal(revokedWithClaims.grantSource, null);
  }
});
