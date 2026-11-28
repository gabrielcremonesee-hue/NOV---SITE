export interface ProfileFormValues {
  fullName: string;
  cpf: string;
  birthDate: string;
  email: string;
  age: string;
  ddd: string;
  phone: string;
  cep: string;
  street: string;
  streetNumber: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  promoWhatsapp: boolean;
  promoEmail: boolean;
}

export interface StoredUserProfile {
  id: string;
  fullName: string;
  cpfMasked: string;
  birthDate: string;
  age: number;
  email: string;
  ddd: string;
  phone: string;
  cep?: string;
  street?: string;
  streetNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  fullAddress?: string;
  promoWhatsapp: boolean;
  promoEmail: boolean;
  createdAt: string;
  authSource?: 'local' | 'supabase';
  supabaseUserId?: string;
  emailConfirmed?: boolean;
  cpfHash?: string;
}

export type ProfileFieldKey = keyof ProfileFormValues;
export type ProfileValidationErrors = Partial<Record<ProfileFieldKey, string>>;

export const BRAZILIAN_UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

const PROFILE_STORAGE_KEY = 'fervec-profile-v1';

export function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

export async function sha256Cpf(cpf: string): Promise<string> {
  const digits = digitsOnly(cpf);
  if (!digits) return '';
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoded = new TextEncoder().encode(`fervec-cpf:${digits}`);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  const nodeCrypto = await import('node:crypto');
  return nodeCrypto.createHash('sha256').update(`fervec-cpf:${digits}`).digest('hex');
}

export function formatCpf(raw: string): string {
  const d = digitsOnly(raw).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function maskCpf(cpf: string): string {
  const d = digitsOnly(cpf);
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function validateCpf(cpf: string): boolean {
  const d = digitsOnly(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(d[i]) * (10 - i);
  }
  let rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== Number(d[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(d[i]) * (11 - i);
  }
  rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  return rem === Number(d[10]);
}

export function formatBirthDate(raw: string): string {
  const d = digitsOnly(raw).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`;
}

export function parseBirthDate(dateStr: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dateStr || '').trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return null;
  }
  return dt;
}

export function getSaoPauloCivilDate(date: Date = new Date()): Date {
  try {
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(formatted);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
  } catch {
    // Fallback to local date when Intl timezone data is unavailable
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function calculateAge(dateStr: string, now: Date = getSaoPauloCivilDate()): number | null {
  const dt = parseBirthDate(dateStr);
  if (!dt) return null;
  if (dt.getTime() > now.getTime()) return null;
  let age = now.getFullYear() - dt.getFullYear();
  const monthDiff = now.getMonth() - dt.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dt.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function formatDdd(raw: string): string {
  return digitsOnly(raw).slice(0, 2);
}

export function formatPhone(raw: string): string {
  const d = digitsOnly(raw).slice(0, 9);
  if (d.length <= 4) return d;
  if (d.length <= 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 9)}`;
}

export function formatCep(raw: string): string {
  const d = digitsOnly(raw).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5, 8)}`;
}

export function formatUf(raw: string): string {
  return String(raw || '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 2);
}

export function validateCep(cep: string): boolean {
  return digitsOnly(cep).length === 8;
}

export function validateUf(uf: string): boolean {
  const clean = formatUf(uf);
  return (BRAZILIAN_UFS as readonly string[]).includes(clean);
}

export function formatFullAddress(parts: {
  street?: string | null;
  streetNumber?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
}): string {
  const street = String(parts.street || '').trim().replace(/\s+/g, ' ');
  const num = String(parts.streetNumber || '').trim().replace(/\s+/g, ' ');
  const comp = String(parts.complement || '').trim().replace(/\s+/g, ' ');
  const neigh = String(parts.neighborhood || '').trim().replace(/\s+/g, ' ');
  const city = String(parts.city || '').trim().replace(/\s+/g, ' ');
  const state = formatUf(String(parts.state || ''));
  const cep = formatCep(String(parts.cep || ''));

  const line1 = [street, num].filter(Boolean).join(', ');
  const line2 = comp ? `${line1}${line1 ? ' - ' : ''}${comp}` : line1;
  const cityState = [city, state].filter(Boolean).join('/');
  const segments = [line2, neigh, cityState, cep ? `CEP ${cep}` : ''].filter(Boolean);
  return segments.join(' · ');
}

export function validateEmail(email: string): boolean {
  const trimmed = String(email || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

export function validateProfileForm(
  values: ProfileFormValues,
  now: Date = getSaoPauloCivilDate()
): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};

  const trimmedName = String(values.fullName || '').trim();
  const nameWords = trimmedName.split(/\s+/).filter(Boolean);
  if (trimmedName.length < 3 || nameWords.length < 2) {
    errors.fullName = 'Informe seu nome e sobrenome completos.';
  }

  if (!validateCpf(values.cpf)) {
    errors.cpf = 'Informe um CPF válido com 11 dígitos.';
  }

  const parsedBirth = parseBirthDate(values.birthDate);
  const computedAge = calculateAge(values.birthDate, now);
  if (!parsedBirth || computedAge === null) {
    errors.birthDate = 'Informe uma data válida no formato DD/MM/AAAA.';
  } else if (computedAge < 18) {
    errors.birthDate = 'É necessário ter pelo menos 18 anos para criar conta.';
  } else if (computedAge > 115) {
    errors.birthDate = 'Verifique o ano de nascimento informado.';
  }

  if (!validateEmail(values.email)) {
    errors.email = 'Informe um e-mail válido.';
  }

  const selectedAge = Number(values.age);
  if (!values.age || !Number.isInteger(selectedAge) || selectedAge < 18 || selectedAge > 115) {
    errors.age = 'Selecione uma idade válida (mínimo 18 anos).';
  } else if (computedAge !== null && computedAge >= 18 && Math.abs(selectedAge - computedAge) > 1) {
    errors.age = 'A idade selecionada não confere com a data de nascimento informada.';
  }

  const dddDigits = digitsOnly(values.ddd);
  if (dddDigits.length !== 2 || Number(dddDigits) < 11) {
    errors.ddd = 'DDD inválido.';
  }

  const phoneDigits = digitsOnly(values.phone);
  if (phoneDigits.length < 8 || phoneDigits.length > 9) {
    errors.phone = 'Informe um telefone com 8 ou 9 dígitos.';
  }

  if (!validateCep(values.cep)) {
    errors.cep = 'Informe um CEP válido com 8 dígitos.';
  }

  const cleanStreet = String(values.street || '').trim().replace(/\s+/g, ' ');
  if (cleanStreet.length < 2 || cleanStreet.length > 160) {
    errors.street = 'Informe o logradouro completo (rua, avenida etc.).';
  }

  const cleanNumber = String(values.streetNumber || '').trim().replace(/\s+/g, ' ');
  if (cleanNumber.length < 1 || cleanNumber.length > 20) {
    errors.streetNumber = 'Informe o número (ou S/N).';
  }

  const cleanComplement = String(values.complement || '').trim().replace(/\s+/g, ' ');
  if (cleanComplement.length > 120) {
    errors.complement = 'O complemento deve ter no máximo 120 caracteres.';
  }

  const cleanNeighborhood = String(values.neighborhood || '').trim().replace(/\s+/g, ' ');
  if (cleanNeighborhood.length < 2 || cleanNeighborhood.length > 100) {
    errors.neighborhood = 'Informe o bairro.';
  }

  const cleanCity = String(values.city || '').trim().replace(/\s+/g, ' ');
  if (cleanCity.length < 2 || cleanCity.length > 100) {
    errors.city = 'Informe a cidade.';
  }

  if (!validateUf(values.state)) {
    errors.state = 'Selecione uma UF válida.';
  }

  if (!values.password || values.password.length < 6) {
    errors.password = 'A senha deve ter pelo menos 6 caracteres.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirme sua senha.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'As senhas não coincidem.';
  }

  if (values.acceptTerms !== true) {
    errors.acceptTerms =
      'É obrigatório marcar "Concordo com os Termos de Condições e Política de Privacidade" para concluir o cadastro.';
  }

  return errors;
}

export function createStoredProfile(values: ProfileFormValues): StoredUserProfile {
  const computedAge = calculateAge(values.birthDate);
  if (computedAge === null || computedAge < 18) {
    throw new Error('É necessário informar uma data de nascimento válida de maior de 18 anos.');
  }
  const parsedAge = Number(values.age);
  if (Number.isInteger(parsedAge) && Math.abs(parsedAge - computedAge) > 1) {
    throw new Error('A idade selecionada não confere com a data de nascimento informada.');
  }
  const age = computedAge;
  const cep = formatCep(values.cep);
  const street = String(values.street || '').trim().replace(/\s+/g, ' ');
  const streetNumber = String(values.streetNumber || '').trim().replace(/\s+/g, ' ');
  const complement = String(values.complement || '').trim().replace(/\s+/g, ' ');
  const neighborhood = String(values.neighborhood || '').trim().replace(/\s+/g, ' ');
  const city = String(values.city || '').trim().replace(/\s+/g, ' ');
  const state = formatUf(values.state);
  const fullAddress = formatFullAddress({
    street,
    streetNumber,
    complement,
    neighborhood,
    city,
    state,
    cep,
  });

  return {
    id: `perfil-${Date.now()}`,
    fullName: values.fullName.trim().replace(/\s+/g, ' '),
    cpfMasked: maskCpf(values.cpf),
    birthDate: values.birthDate.trim(),
    age,
    email: values.email.trim().toLowerCase(),
    ddd: formatDdd(values.ddd),
    phone: formatPhone(values.phone),
    cep,
    street,
    streetNumber,
    complement,
    neighborhood,
    city,
    state,
    fullAddress,
    promoWhatsapp: !!values.promoWhatsapp,
    promoEmail: !!values.promoEmail,
    createdAt: new Date().toISOString(),
  };
}

export function loadProfile(): StoredUserProfile | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredUserProfile> | null;
    if (parsed && typeof parsed === 'object' && typeof parsed.fullName === 'string' && typeof parsed.email === 'string') {
      return parsed as StoredUserProfile;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function saveProfile(profile: StoredUserProfile): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function clearProfile(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
