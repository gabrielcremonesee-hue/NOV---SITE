import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAge,
  createStoredProfile,
  formatBirthDate,
  formatCpf,
  formatDdd,
  formatPhone,
  getSaoPauloCivilDate,
  maskCpf,
  validateCpf,
  validateEmail,
  validateProfileForm,
  ProfileFormValues,
} from './profile';

function makeValidForm(overrides: Partial<ProfileFormValues> = {}): ProfileFormValues {
  return {
    fullName: 'Gabriel Cremonese',
    cpf: '529.982.247-25',
    birthDate: '15/05/1996',
    email: 'gabriel@fervec.com.br',
    age: '30',
    ddd: '11',
    phone: '98765-4321',
    password: 'chef1234',
    confirmPassword: 'chef1234',
    acceptTerms: true,
    promoWhatsapp: true,
    promoEmail: false,
    ...overrides,
  };
}

test('formatCpf and validateCpf handle formatting and check digits', () => {
  assert.equal(formatCpf('52998224725'), '529.982.247-25');
  assert.equal(validateCpf('529.982.247-25'), true);
  assert.equal(validateCpf('111.111.111-11'), false);
  assert.equal(validateCpf('529.982.247-26'), false);
  assert.equal(maskCpf('529.982.247-25'), '***.982.247-**');
});

test('birth date formatting, Sao Paulo civil date, and age calculation work deterministically', () => {
  assert.equal(formatBirthDate('15051996'), '15/05/1996');
  const refDate = new Date(2026, 10, 16); // 16 Nov 2026
  assert.equal(calculateAge('15/05/1996', refDate), 30);
  assert.equal(calculateAge('20/12/1996', refDate), 29);
  assert.equal(calculateAge('31/02/2000', refDate), null);

  // Near UTC midnight: 2026-11-27T01:30:00Z is still 26/11/2026 22:30 in America/Sao_Paulo
  const spDate = getSaoPauloCivilDate(new Date('2026-11-27T01:30:00.000Z'));
  assert.equal(spDate.getFullYear(), 2026);
  assert.equal(spDate.getMonth(), 10);
  assert.equal(spDate.getDate(), 26);
});

test('phone and email helpers format and validate cleanly', () => {
  assert.equal(formatDdd('119'), '11');
  assert.equal(formatPhone('987654321'), '98765-4321');
  assert.equal(formatPhone('33445566'), '3344-5566');
  assert.equal(validateEmail('chef@fervec.com.br'), true);
  assert.equal(validateEmail('invalid-email'), false);
});

test('validateProfileForm catches invalid inputs and enforces 18+ minimum age', () => {
  const refDate = new Date(2026, 10, 26); // 26 Nov 2026
  const validErrors = validateProfileForm(makeValidForm(), refDate);
  assert.deepEqual(validErrors, {});

  // 17 years old (turns 18 tomorrow: 27/11/2008) must be blocked
  const underageErrors = validateProfileForm(
    makeValidForm({
      birthDate: '27/11/2008',
      age: '17',
    }),
    refDate
  );
  assert.match(underageErrors.birthDate || '', /18 anos/);
  assert.match(underageErrors.age || '', /18 anos/);

  // Exactly 18 years old today (26/11/2008) must pass
  const just18Errors = validateProfileForm(
    makeValidForm({
      birthDate: '26/11/2008',
      age: '18',
    }),
    refDate
  );
  assert.equal(just18Errors.birthDate, undefined);
  assert.equal(just18Errors.age, undefined);

  const invalidErrors = validateProfileForm(
    makeValidForm({
      fullName: 'Gabriel',
      cpf: '00000000000',
      birthDate: '01/01/2020',
      email: 'bad',
      ddd: '1',
      phone: '123',
      password: '123',
      confirmPassword: '456',
      acceptTerms: false,
    }),
    refDate
  );

  assert.ok(invalidErrors.fullName);
  assert.ok(invalidErrors.cpf);
  assert.ok(invalidErrors.birthDate);
  assert.ok(invalidErrors.email);
  assert.ok(invalidErrors.ddd);
  assert.ok(invalidErrors.phone);
  assert.ok(invalidErrors.password);
  assert.ok(invalidErrors.confirmPassword);
  assert.ok(invalidErrors.acceptTerms);
});

test('createStoredProfile normalizes fields and masks CPF without keeping password', () => {
  const stored = createStoredProfile(makeValidForm({ email: '  GABRIEL@FERVEC.COM.BR ' }));
  assert.equal(stored.fullName, 'Gabriel Cremonese');
  assert.equal(stored.email, 'gabriel@fervec.com.br');
  assert.equal(stored.cpfMasked, '***.982.247-**');
  assert.equal('password' in stored, false);
});

test('validateProfileForm blocks registration unless acceptTerms is explicitly true', () => {
  const refDate = new Date(2026, 10, 16);
  const blocked = validateProfileForm(makeValidForm({ acceptTerms: false }), refDate);
  assert.ok(blocked.acceptTerms);
  assert.match(blocked.acceptTerms, /Concordo com os Termos de Condições e Política de Privacidade/);

  const allowed = validateProfileForm(makeValidForm({ acceptTerms: true }), refDate);
  assert.equal(allowed.acceptTerms, undefined);
});

test('validateProfileForm and createStoredProfile reject inconsistent age vs birthDate and underage birthDate', () => {
  const refDate = new Date(2026, 10, 26);
  const mismatch = validateProfileForm(
    makeValidForm({
      birthDate: '15/05/1996',
      age: '45',
    }),
    refDate
  );
  assert.match(mismatch.age || '', /não confere com a data de nascimento/i);

  assert.throws(
    () => createStoredProfile(makeValidForm({ birthDate: '01/01/2012', age: '14' })),
    /18 anos/
  );
  assert.throws(
    () => createStoredProfile(makeValidForm({ birthDate: '15/05/1996', age: '45' })),
    /não confere com a data de nascimento/i
  );
});

