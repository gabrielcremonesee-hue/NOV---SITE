import type { User } from '@supabase/supabase-js';
import {
  ProfileFieldKey,
  ProfileFormValues,
  StoredUserProfile,
  calculateAge,
  createStoredProfile,
  formatCep,
  formatFullAddress,
  formatUf,
  saveProfile,
  sha256Cpf,
} from '../profile';
import { getSupabaseClient } from './client';
import { claimActiveServerSession, logoutServerSession } from './courseSync';

export interface ProfileSyncResult {
  ok: boolean;
  profile?: StoredUserProfile;
  syncedToSupabase: boolean;
  emailConfirmed?: boolean;
  fieldError?: {
    field: ProfileFieldKey;
    message: string;
  };
  message?: string;
}

export interface SignInResult {
  ok: boolean;
  profile?: StoredUserProfile;
  needsEmailConfirmation?: boolean;
  message?: string;
}

interface SupabaseProfileRow {
  id: string;
  full_name?: string | null;
  cpf_masked?: string | null;
  cpf_hash?: string | null;
  birth_date?: string | null;
  age?: number | null;
  email?: string | null;
  ddd?: string | null;
  phone?: string | null;
  postal_code?: string | null;
  street?: string | null;
  street_number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  full_address?: string | null;
  whatsapp_opt_in?: boolean | null;
  email_opt_in?: boolean | null;
  created_at?: string | null;
}

function isMissingAddressColumnErr(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    msg.includes('postal_code') ||
    msg.includes('street') ||
    msg.includes('neighborhood') ||
    msg.includes('full_address') ||
    msg.includes('schema cache')
  );
}

function sameUserFallback(
  userId: string,
  fallback?: StoredUserProfile | null
): StoredUserProfile | null {
  if (!fallback) return null;
  const fallbackId = fallback.supabaseUserId || fallback.id;
  return fallbackId === userId ? fallback : null;
}

export function mapSupabaseUserToProfile(
  user: User,
  fallback?: StoredUserProfile | null,
  dbRow?: SupabaseProfileRow | null
): StoredUserProfile | null {
  const safeFallback = sameUserFallback(user.id, fallback);
  const email = (dbRow?.email || user.email || safeFallback?.email || '').trim().toLowerCase();
  if (!email) return null;
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const fullName =
    (dbRow?.full_name && dbRow.full_name.trim()) ||
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    safeFallback?.fullName ||
    email.split('@')[0];
  const ageVal = Number(dbRow?.age ?? meta.age);
  const age = Number.isInteger(ageVal) && ageVal >= 18 ? ageVal : safeFallback?.age && safeFallback.age >= 18 ? safeFallback.age : 0;

  const whatsappOptIn =
    typeof dbRow?.whatsapp_opt_in === 'boolean'
      ? dbRow.whatsapp_opt_in
      : typeof meta.whatsapp_opt_in === 'boolean'
        ? meta.whatsapp_opt_in
        : typeof meta.promo_whatsapp === 'boolean'
          ? meta.promo_whatsapp
          : safeFallback?.promoWhatsapp ?? false;

  const emailOptIn =
    typeof dbRow?.email_opt_in === 'boolean'
      ? dbRow.email_opt_in
      : typeof meta.email_opt_in === 'boolean'
        ? meta.email_opt_in
        : typeof meta.promo_email === 'boolean'
          ? meta.promo_email
          : safeFallback?.promoEmail ?? false;

  const cepRaw =
    (dbRow?.postal_code && dbRow.postal_code.trim()) ||
    (typeof meta.postal_code === 'string' && meta.postal_code.trim()) ||
    safeFallback?.cep ||
    '';
  const cep = cepRaw ? formatCep(cepRaw) : '';
  const street =
    (dbRow?.street && dbRow.street.trim()) ||
    (typeof meta.street === 'string' && meta.street.trim()) ||
    safeFallback?.street ||
    '';
  const streetNumber =
    (dbRow?.street_number && dbRow.street_number.trim()) ||
    (typeof meta.street_number === 'string' && meta.street_number.trim()) ||
    safeFallback?.streetNumber ||
    '';
  const complement =
    (dbRow?.complement && dbRow.complement.trim()) ||
    (typeof meta.complement === 'string' && meta.complement.trim()) ||
    safeFallback?.complement ||
    '';
  const neighborhood =
    (dbRow?.neighborhood && dbRow.neighborhood.trim()) ||
    (typeof meta.neighborhood === 'string' && meta.neighborhood.trim()) ||
    safeFallback?.neighborhood ||
    '';
  const city =
    (dbRow?.city && dbRow.city.trim()) ||
    (typeof meta.city === 'string' && meta.city.trim()) ||
    safeFallback?.city ||
    '';
  const stateRaw =
    (dbRow?.state && dbRow.state.trim()) ||
    (typeof meta.state === 'string' && meta.state.trim()) ||
    safeFallback?.state ||
    '';
  const state = stateRaw ? formatUf(stateRaw) : '';
  const fullAddress =
    (dbRow?.full_address && dbRow.full_address.trim()) ||
    (typeof meta.full_address === 'string' && meta.full_address.trim()) ||
    safeFallback?.fullAddress ||
    formatFullAddress({
      street,
      streetNumber,
      complement,
      neighborhood,
      city,
      state,
      cep,
    });

  return {
    id: user.id,
    supabaseUserId: user.id,
    authSource: 'supabase',
    emailConfirmed: Boolean(user.email_confirmed_at),
    fullName,
    cpfMasked:
      (dbRow?.cpf_masked && dbRow.cpf_masked.trim()) ||
      (typeof meta.cpf_masked === 'string' && meta.cpf_masked) ||
      safeFallback?.cpfMasked ||
      '***.***.***-**',
    cpfHash:
      (dbRow?.cpf_hash && dbRow.cpf_hash.trim()) ||
      (typeof meta.cpf_hash === 'string' && meta.cpf_hash) ||
      safeFallback?.cpfHash ||
      undefined,
    birthDate:
      (dbRow?.birth_date && dbRow.birth_date.trim()) ||
      (typeof meta.birth_date === 'string' && meta.birth_date) ||
      safeFallback?.birthDate ||
      '',
    age,
    email,
    ddd:
      (dbRow?.ddd && dbRow.ddd.trim()) ||
      (typeof meta.ddd === 'string' && meta.ddd) ||
      safeFallback?.ddd ||
      '11',
    phone:
      (dbRow?.phone && dbRow.phone.trim()) ||
      (typeof meta.phone === 'string' && meta.phone) ||
      safeFallback?.phone ||
      '90000-0000',
    ...(cep ? { cep } : {}),
    ...(street ? { street } : {}),
    ...(streetNumber ? { streetNumber } : {}),
    ...(complement ? { complement } : {}),
    ...(neighborhood ? { neighborhood } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(fullAddress ? { fullAddress } : {}),
    promoWhatsapp: whatsappOptIn,
    promoEmail: emailOptIn,
    createdAt: dbRow?.created_at || user.created_at || safeFallback?.createdAt || new Date().toISOString(),
  };
}

function buildMetadata(profile: StoredUserProfile): Record<string, unknown> {
  return {
    full_name: profile.fullName,
    cpf_masked: profile.cpfMasked,
    cpf_hash: profile.cpfHash || null,
    birth_date: profile.birthDate,
    age: profile.age,
    ddd: profile.ddd,
    phone: profile.phone,
    postal_code: profile.cep || null,
    street: profile.street || null,
    street_number: profile.streetNumber || null,
    complement: profile.complement || null,
    neighborhood: profile.neighborhood || null,
    city: profile.city || null,
    state: profile.state || null,
    full_address: profile.fullAddress || null,
    whatsapp_opt_in: profile.promoWhatsapp,
    email_opt_in: profile.promoEmail,
  };
}

async function tryUpsertProfilesTable(userId: string, profile: StoredUserProfile): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const existing = await fetchProfilesRow(userId);
    const addressFields: Record<string, unknown> = {
      postal_code: profile.cep || null,
      street: profile.street || null,
      street_number: profile.streetNumber || null,
      complement: profile.complement || null,
      neighborhood: profile.neighborhood || null,
      city: profile.city || null,
      state: profile.state || null,
      full_address: profile.fullAddress || null,
    };

    if (existing) {
      const basePatch: Record<string, unknown> = {
        full_name: profile.fullName,
        birth_date: profile.birthDate,
        age: profile.age,
        email: profile.email,
        ddd: profile.ddd,
        phone: profile.phone,
        whatsapp_opt_in: profile.promoWhatsapp,
        email_opt_in: profile.promoEmail,
        updated_at: new Date().toISOString(),
      };
      if (
        (!existing.cpf_masked || existing.cpf_masked === '***.***.***-**') &&
        profile.cpfMasked &&
        profile.cpfMasked !== '***.***.***-**'
      ) {
        basePatch.cpf_masked = profile.cpfMasked;
      }
      if (!existing.cpf_hash && profile.cpfHash) {
        basePatch.cpf_hash = profile.cpfHash;
      }
      const res = await supabase
        .from('profiles')
        .update({ ...basePatch, ...addressFields })
        .eq('id', userId);
      if (res.error && isMissingAddressColumnErr(res.error)) {
        await supabase.from('profiles').update(basePatch).eq('id', userId);
      }
      return;
    }

    const baseInsert: Record<string, unknown> = {
      id: userId,
      full_name: profile.fullName,
      cpf_masked: profile.cpfMasked,
      cpf_hash: profile.cpfHash || null,
      birth_date: profile.birthDate,
      age: profile.age,
      email: profile.email,
      ddd: profile.ddd,
      phone: profile.phone,
      whatsapp_opt_in: profile.promoWhatsapp,
      email_opt_in: profile.promoEmail,
      updated_at: new Date().toISOString(),
    };

    const insertRes = await supabase.from('profiles').insert({
      ...baseInsert,
      ...addressFields,
    });
    if (insertRes.error && isMissingAddressColumnErr(insertRes.error)) {
      await supabase.from('profiles').insert(baseInsert);
    }
  } catch {
    // Non-blocking if session is not yet confirmed
  }
}

async function fetchProfilesRow(userId: string): Promise<SupabaseProfileRow | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, cpf_masked, cpf_hash, birth_date, age, email, ddd, phone, postal_code, street, street_number, complement, neighborhood, city, state, full_address, whatsapp_opt_in, email_opt_in, created_at'
      )
      .eq('id', userId)
      .maybeSingle();
    if (!error) {
      return (data as SupabaseProfileRow | null) ?? null;
    }
    if (isMissingAddressColumnErr(error)) {
      const legacy = await supabase
        .from('profiles')
        .select(
          'id, full_name, cpf_masked, cpf_hash, birth_date, age, email, ddd, phone, whatsapp_opt_in, email_opt_in, created_at'
        )
        .eq('id', userId)
        .maybeSingle();
      if (legacy.error || !legacy.data) return null;
      return legacy.data as SupabaseProfileRow;
    }
    return null;
  } catch {
    return null;
  }
}

export async function registerOrUpdateSupabaseProfile(
  values: ProfileFormValues,
  existingProfile: StoredUserProfile | null
): Promise<ProfileSyncResult> {
  if (values.acceptTerms !== true) {
    return {
      ok: false,
      syncedToSupabase: false,
      fieldError: {
        field: 'acceptTerms',
        message:
          'É obrigatório marcar "Concordo com os Termos de Condições e Política de Privacidade" para concluir o cadastro.',
      },
      message:
        'Marque a opção "Concordo com os Termos de Condições e Política de Privacidade" antes de criar sua conta.',
    };
  }

  const computedAge = calculateAge(values.birthDate);
  if (computedAge === null || computedAge < 18 || computedAge > 115) {
    return {
      ok: false,
      syncedToSupabase: false,
      fieldError: {
        field: 'birthDate',
        message: 'É necessário informar uma data de nascimento válida (mínimo 18 anos).',
      },
      message: 'Cadastro permitido apenas para maiores de 18 anos com data de nascimento válida.',
    };
  }
  const selectedAge = Number(values.age);
  if (values.age && (!Number.isInteger(selectedAge) || selectedAge < 18 || Math.abs(selectedAge - computedAge) > 1)) {
    return {
      ok: false,
      syncedToSupabase: false,
      fieldError: {
        field: 'age',
        message: 'A idade selecionada não confere com a data de nascimento informada.',
      },
      message: 'Idade selecionada incompatível com a data de nascimento.',
    };
  }

  const baseProfile = createStoredProfile(values);
  baseProfile.cpfHash = (await sha256Cpf(values.cpf)) || existingProfile?.cpfHash;
  const supabase = getSupabaseClient();

  if (!supabase) {
    saveProfile({ ...baseProfile, authSource: 'local' });
    return {
      ok: true,
      profile: { ...baseProfile, authSource: 'local' },
      syncedToSupabase: false,
    };
  }

  try {
    const metadata = buildMetadata(baseProfile);
    const { data: sessionData } = await supabase.auth.getUser();
    const activeUser = sessionData?.user ?? null;

    if (activeUser) {
      const existingDbRow = await fetchProfilesRow(activeUser.id);
      const dbCpfMasked = existingDbRow?.cpf_masked?.trim();
      const metaCpfMasked =
        typeof activeUser.user_metadata?.cpf_masked === 'string'
          ? activeUser.user_metadata.cpf_masked.trim()
          : '';
      const lockedCpfMasked =
        (dbCpfMasked && dbCpfMasked !== '***.***.***-**' ? dbCpfMasked : '') ||
        (metaCpfMasked && metaCpfMasked !== '***.***.***-**' ? metaCpfMasked : '') ||
        baseProfile.cpfMasked;
      const lockedCpfHash =
        (existingDbRow?.cpf_hash && existingDbRow.cpf_hash.trim()) ||
        (typeof activeUser.user_metadata?.cpf_hash === 'string' &&
          activeUser.user_metadata.cpf_hash.trim()) ||
        baseProfile.cpfHash;

      const finalProfile: StoredUserProfile = {
        ...baseProfile,
        id: activeUser.id,
        supabaseUserId: activeUser.id,
        authSource: 'supabase',
        cpfMasked: lockedCpfMasked,
        cpfHash: lockedCpfHash,
        emailConfirmed: Boolean(activeUser.email_confirmed_at),
        createdAt: existingProfile?.createdAt || activeUser.created_at || baseProfile.createdAt,
      };
      const lockedMetadata = buildMetadata(finalProfile);

      const { data: updated, error: updateErr } = await supabase.auth.updateUser({
        data: lockedMetadata,
      });

      if (updateErr) {
        return {
          ok: false,
          syncedToSupabase: false,
          message: updateErr.message || 'Não foi possível atualizar sua conta no Supabase.',
        };
      }

      finalProfile.emailConfirmed = Boolean(
        updated.user?.email_confirmed_at ?? activeUser.email_confirmed_at
      );
      await tryUpsertProfilesTable(activeUser.id, finalProfile);
      saveProfile(finalProfile);
      return {
        ok: true,
        profile: finalProfile,
        syncedToSupabase: true,
        emailConfirmed: finalProfile.emailConfirmed,
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: baseProfile.email,
      password: values.password,
      options: {
        data: metadata,
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists')) {
        const signInAttempt = await supabase.auth.signInWithPassword({
          email: baseProfile.email,
          password: values.password,
        });

        if (!signInAttempt.error && signInAttempt.data.user) {
          await supabase.auth.updateUser({ data: metadata });
          const finalProfile: StoredUserProfile = {
            ...baseProfile,
            id: signInAttempt.data.user.id,
            supabaseUserId: signInAttempt.data.user.id,
            authSource: 'supabase',
            emailConfirmed: Boolean(signInAttempt.data.user.email_confirmed_at),
          };
          await tryUpsertProfilesTable(signInAttempt.data.user.id, finalProfile);
          saveProfile(finalProfile);
          return {
            ok: true,
            profile: finalProfile,
            syncedToSupabase: true,
            emailConfirmed: finalProfile.emailConfirmed,
          };
        }

        return {
          ok: false,
          syncedToSupabase: false,
          fieldError: {
            field: 'email',
            message:
              'Este e-mail já possui cadastro. Use a mesma senha para atualizar ou entre em Minha conta.',
          },
          message: 'Este e-mail já está cadastrado no Supabase.',
        };
      }

      if (msg.includes('password')) {
        return {
          ok: false,
          syncedToSupabase: false,
          fieldError: {
            field: 'password',
            message: error.message,
          },
          message: error.message,
        };
      }

      if (msg.includes('email')) {
        return {
          ok: false,
          syncedToSupabase: false,
          fieldError: {
            field: 'email',
            message: 'Informe um e-mail válido aceito pelo cadastro.',
          },
          message: error.message,
        };
      }

      return {
        ok: false,
        syncedToSupabase: false,
        message: error.message || 'Erro ao cadastrar conta no Supabase.',
      };
    }

    const user = data.user;
    if (user) {
      const hasSession = Boolean(data.session?.access_token);
      const finalProfile: StoredUserProfile = {
        ...baseProfile,
        id: user.id,
        supabaseUserId: user.id,
        authSource: hasSession ? 'supabase' : 'local',
        emailConfirmed: Boolean(user.email_confirmed_at || hasSession),
      };
      if (hasSession) {
        await tryUpsertProfilesTable(user.id, finalProfile);
        await claimActiveServerSession().catch(() => false);
      }
      saveProfile(finalProfile);
      return {
        ok: true,
        profile: finalProfile,
        syncedToSupabase: true,
        emailConfirmed: finalProfile.emailConfirmed,
      };
    }

    saveProfile({ ...baseProfile, authSource: 'local' });
    return {
      ok: true,
      profile: { ...baseProfile, authSource: 'local' },
      syncedToSupabase: false,
    };
  } catch {
    saveProfile({ ...baseProfile, authSource: 'local' });
    return {
      ok: true,
      profile: { ...baseProfile, authSource: 'local' },
      syncedToSupabase: false,
      message: 'Conexão indisponível no momento. Perfil salvo localmente neste navegador.',
    };
  }
}

export async function signInSupabaseAccount(
  email: string,
  password: string,
  fallbackProfile?: StoredUserProfile | null
): Promise<SignInResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      message: 'Supabase não está configurado neste ambiente.',
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.user || !data.session?.access_token) {
      const rawMsg = (error?.message || '').toLowerCase();
      const isUnconfirmed =
        rawMsg.includes('email not confirmed') ||
        (error as { code?: string } | null)?.code === 'email_not_confirmed';
      return {
        ok: false,
        needsEmailConfirmation: isUnconfirmed,
        message:
          rawMsg.includes('invalid login credentials')
            ? 'E-mail ou senha inválidos.'
            : isUnconfirmed
              ? 'Este e-mail ainda não foi confirmado no Supabase. Reenvie a confirmação ou confirme o usuário no painel Authentication > Users.'
              : error?.message || 'Não foi possível entrar na sua conta.',
      };
    }

    const dbRow = await fetchProfilesRow(data.user.id);
    const mapped = mapSupabaseUserToProfile(data.user, fallbackProfile, dbRow);
    if (!mapped) {
      return {
        ok: false,
        message: 'Não foi possível carregar os dados da conta.',
      };
    }

    if (!dbRow) {
      await tryUpsertProfilesTable(data.user.id, mapped);
    }

    await claimActiveServerSession().catch(() => false);
    saveProfile(mapped);
    return { ok: true, profile: mapped };
  } catch {
    return {
      ok: false,
      message: 'Erro de conexão ao autenticar com o Supabase.',
    };
  }
}

export async function resendSupabaseSignupConfirmation(
  email: string
): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, message: 'Supabase não está configurado neste ambiente.' };
  }
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { ok: false, message: 'Informe o e-mail da conta.' };
  }
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) {
      return {
        ok: false,
        message: error.message || 'Não foi possível reenviar o e-mail de confirmação.',
      };
    }
    return {
      ok: true,
      message: `E-mail de confirmação reenviado para ${cleanEmail}. Confira sua caixa de entrada e spam.`,
    };
  } catch {
    return {
      ok: false,
      message: 'Erro de conexão ao reenviar o e-mail de confirmação.',
    };
  }
}

export async function verifySupabaseSignupCode(
  email: string,
  token: string,
  fallbackProfile?: StoredUserProfile | null
): Promise<SignInResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, message: 'Supabase não está configurado neste ambiente.' };
  }
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();
  if (!cleanEmail || !cleanToken) {
    return { ok: false, message: 'Informe o e-mail e o código de confirmação.' };
  }
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'signup',
    });
    if (error || !data.user || !data.session?.access_token) {
      return {
        ok: false,
        message: error?.message || 'Código inválido ou expirado.',
      };
    }
    const dbRow = await fetchProfilesRow(data.user.id);
    const mapped = mapSupabaseUserToProfile(data.user, fallbackProfile, dbRow);
    if (!mapped) {
      return { ok: false, message: 'Não foi possível carregar os dados da conta.' };
    }
    if (!dbRow) {
      await tryUpsertProfilesTable(data.user.id, mapped);
    }
    await claimActiveServerSession().catch(() => false);
    saveProfile(mapped);
    return { ok: true, profile: mapped };
  } catch {
    return {
      ok: false,
      message: 'Erro de conexão ao validar o código de confirmação.',
    };
  }
}

export async function fetchCurrentSupabaseProfile(
  fallbackProfile?: StoredUserProfile | null
): Promise<StoredUserProfile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.access_token) return null;

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const dbRow = await fetchProfilesRow(data.user.id);
    const mapped = mapSupabaseUserToProfile(data.user, fallbackProfile, dbRow);
    if (mapped) {
      if (!dbRow) {
        await tryUpsertProfilesTable(data.user.id, mapped);
      }
      saveProfile(mapped);
    }
    return mapped;
  } catch {
    return null;
  }
}

export function subscribeSupabaseAuthChanges(
  onSignedIn: () => void
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.access_token) {
      onSignedIn();
    }
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

export async function signOutSupabaseAccount(): Promise<void> {
  await logoutServerSession().catch(() => {});
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore signout errors
  }
}
