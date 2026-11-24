import test from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '@supabase/supabase-js';
import { mapSupabaseUserToProfile } from './profileSync';

test('mapSupabaseUserToProfile maps Supabase auth user metadata into StoredUserProfile', () => {
  const fakeUser = {
    id: 'user-123',
    email: 'Chef.Test@Fervec.com.br',
    email_confirmed_at: '2026-11-16T12:00:00Z',
    created_at: '2026-11-16T12:00:00Z',
    user_metadata: {
      full_name: 'Gabriel Cremonese',
      cpf_masked: '***.982.247-**',
      birth_date: '15/05/1996',
      age: 30,
      ddd: '11',
      phone: '98765-4321',
      promo_whatsapp: true,
      promo_email: false,
    },
  } as unknown as User;

  const profile = mapSupabaseUserToProfile(fakeUser);
  assert.ok(profile);
  assert.equal(profile.id, 'user-123');
  assert.equal(profile.supabaseUserId, 'user-123');
  assert.equal(profile.authSource, 'supabase');
  assert.equal(profile.emailConfirmed, true);
  assert.equal(profile.email, 'chef.test@fervec.com.br');
  assert.equal(profile.fullName, 'Gabriel Cremonese');
  assert.equal(profile.cpfMasked, '***.982.247-**');
  assert.equal(profile.age, 30);
  assert.equal(profile.promoWhatsapp, true);
  assert.equal(profile.promoEmail, false);
});

test('mapSupabaseUserToProfile prefers DB profile row and isolates fallback across users', () => {
  const fakeUser = {
    id: 'user-b',
    email: 'b@fervec.com.br',
    email_confirmed_at: '2026-11-16T12:00:00Z',
    created_at: '2026-11-16T12:00:00Z',
    user_metadata: {},
  } as unknown as User;

  const wrongUserFallback = {
    id: 'user-a',
    fullName: 'Outro Aluno',
    cpfMasked: '***.111.222-**',
    birthDate: '01/01/1990',
    age: 36,
    email: 'a@fervec.com.br',
    ddd: '11',
    phone: '91111-2222',
    promoWhatsapp: true,
    promoEmail: true,
    createdAt: '2026-11-15T10:00:00Z',
  };

  const mapped = mapSupabaseUserToProfile(fakeUser, wrongUserFallback, {
    id: 'user-b',
    full_name: 'Maria Clara',
    cpf_masked: '***.555.666-**',
    whatsapp_opt_in: false,
    email_opt_in: true,
  });

  assert.ok(mapped);
  assert.equal(mapped.fullName, 'Maria Clara');
  assert.equal(mapped.cpfMasked, '***.555.666-**');
  assert.equal(mapped.promoWhatsapp, false);
  assert.equal(mapped.promoEmail, true);
});
