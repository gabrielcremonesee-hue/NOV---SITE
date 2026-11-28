import { MEDIA } from '../data/mediaAssets';
import {
  BRAZILIAN_UFS,
  ProfileFieldKey,
  ProfileFormValues,
  ProfileValidationErrors,
  StoredUserProfile,
  formatFullAddress,
} from '../utils/profile';

export interface CreateProfileRenderOptions {
  draft: ProfileFormValues;
  errors: ProfileValidationErrors;
  showPassword: boolean;
  showConfirmPassword: boolean;
  savedProfile: StoredUserProfile | null;
  justCreated: boolean;
  isSubmitting?: boolean;
  supabaseConfigured?: boolean;
}

function esc(x: unknown): string {
  return String(x ?? '').replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c] || c;
  });
}

const ICONS = {
  chefHat: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 14.5h11v4a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6.5 14.5a3.8 3.8 0 0 1-1.3-7.3 4.5 4.5 0 0 1 8.8-1.4 4.2 4.2 0 0 1 5.6 3.9 3.6 3.6 0 0 1-2.1 4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 14.5v2.5M12 14.5v2.5M14.5 14.5v2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  user: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.2" r="3.6" fill="currentColor"/><path d="M5 19.8a7 7 0 0 1 14 0" fill="currentColor"/></svg>`,
  idCard: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="8.5" cy="11" r="1.8" fill="currentColor"/><path d="M6 15.5c.6-1.4 1.5-2 2.5-2s1.9.6 2.5 2M13.5 10h4.5M13.5 13.5h4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 9.5h17M8 3.2v3.3M16 3.2v3.3" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><rect x="7.5" y="12.5" width="2.4" height="2.4" rx=".5" fill="currentColor"/><rect x="11.3" y="12.5" width="2.4" height="2.4" rx=".5" fill="currentColor"/><rect x="15.1" y="12.5" width="2.4" height="2.4" rx=".5" fill="currentColor"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 4.5h3l1.4 3.8-1.9 1.5a12.4 12.4 0 0 0 5.1 5.1l1.5-1.9 3.8 1.4v3a1.8 1.8 0 0 1-2 1.8A14.5 14.5 0 0 1 4.8 6.5a1.8 1.8 0 0 1 1.8-2Z" fill="currentColor"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="currentColor"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="15" r="1.3" fill="#5e0b10"/></svg>`,
  eyeOff: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A10.7 10.7 0 0 1 12 5c5.5 0 9.4 4.3 10 7-.3 1.2-1.4 3-3.2 4.5M6.2 6.6C4.1 8.1 2.7 10.3 2 12c.7 2.7 4.6 7 10 7 1.6 0 3.1-.4 4.4-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 16.5h11l-1.4-2V10a4.1 4.1 0 1 0-8.2 0v4.5l-1.4 2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10.2 18.8a2 2 0 0 0 3.6 0M12 4.2v1.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#25a244"/><path d="M16.4 14.3c-.2-.1-1.3-.7-1.5-.7-.2-.1-.4-.1-.5.1s-.6.7-.7.9c-.1.1-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4-.1-.1-.5-1.3-.7-1.7-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.9 2.4 1 2.5c.1.2 1.7 2.6 4.1 3.6.6.2 1 .4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.4-.2Z" fill="#fff"/></svg>`,
  userPlus: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9.5" cy="8.2" r="3.6" fill="currentColor"/><path d="M2.8 19.6a6.8 6.8 0 0 1 13.4 0" fill="currentColor"/><path d="M18.5 7.5v5M16 10h5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>`,
  mapPin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.4-6-10.5a6 6 0 1 1 12 0C18 15.6 12 21 12 21Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="12" cy="10.5" r="2.2" fill="currentColor"/></svg>`,
};

function fieldErrorHtml(field: ProfileFieldKey, errors: ProfileValidationErrors): string {
  const msg = errors[field];
  return `<span class="cadastro-field-error ${msg ? 'is-visible' : ''}" data-error-for="${field}" role="alert">${msg ? esc(msg) : ''}</span>`;
}

function renderAgeOptions(selectedAge: string): string {
  const opts = ['<option value="">Idade (18+)</option>'];
  for (let age = 18; age <= 100; age++) {
    const val = String(age);
    opts.push(
      `<option value="${val}" ${selectedAge === val ? 'selected' : ''}>${age} anos</option>`
    );
  }
  return opts.join('');
}

function renderUfOptions(selectedUf: string): string {
  const normalized = String(selectedUf || '').trim().toUpperCase();
  const opts = ['<option value="">UF</option>'];
  for (const uf of BRAZILIAN_UFS) {
    opts.push(`<option value="${uf}" ${normalized === uf ? 'selected' : ''}>${uf}</option>`);
  }
  return opts.join('');
}

export function renderCreateProfilePage(opts: CreateProfileRenderOptions): string {
  const {
    draft,
    errors,
    showPassword,
    showConfirmPassword,
    savedProfile,
    justCreated,
    isSubmitting = false,
    supabaseConfigured = false,
  } = opts;

  if (justCreated && savedProfile) {
    const isSupabase = savedProfile.authSource === 'supabase';
    return `<main class="cadastro-page">
      <section class="cadastro-hero">
        <img class="cadastro-hero-scene crop-hero-chef" src="${MEDIA.heroOfficialChef}" alt="Chef Cremonese na cozinha FerveC Gastronomia">
        <div class="cadastro-hero-shade" aria-hidden="true"></div>
        <img class="cadastro-hero-produce is-left" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true" draggable="false">
        <img class="cadastro-hero-produce is-right" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true" draggable="false">
        <div class="cadastro-hero-copy">
          <span class="cadastro-eyebrow">FerveC Gastronomia</span>
          <h1>Faça parte<br><em>da nossa família!</em></h1>
          <p>${
            isSupabase
              ? 'Sua conta foi sincronizada com o banco de dados Supabase e está pronta para acompanhar aulas e receitas.'
              : 'Seu perfil local está pronto para acompanhar aulas, receitas exclusivas e progresso na cozinha.'
          }</p>
        </div>
        <div class="cadastro-hero-slogan" aria-hidden="true">
          <span>Aprenda, evolua</span>
          <span>e cozinhe melhor!</span>
        </div>
      </section>

      <section class="cadastro-stage">
        <div class="cadastro-badge-wrap">
          <div class="cadastro-badge">
            <span class="cadastro-badge-rivet" aria-hidden="true"></span>
            <span class="cadastro-badge-icon" aria-hidden="true">${ICONS.chefHat}</span>
            <h2>Perfil Criado</h2>
            <span class="cadastro-badge-rivet" aria-hidden="true"></span>
          </div>
        </div>

        <div class="cadastro-parchment">
          <div class="cadastro-success-card" role="status" aria-live="polite">
            <div class="cadastro-success-icon" aria-hidden="true">${ICONS.user}</div>
            <h3>Bem-vindo(a), ${esc(savedProfile.fullName)}!</h3>
            <p class="cadastro-lead">${
              isSupabase
                ? 'Seu cadastro foi salvo no Supabase e vinculado ao menu <strong>Minha conta</strong>.' +
                  (savedProfile.emailConfirmed === false
                    ? ' Caso a confirmação por e-mail esteja habilitada, verifique sua caixa de entrada.'
                    : '')
                : 'Seu perfil foi salvo localmente neste navegador e já está vinculado ao menu <strong>Minha conta</strong>.'
            }</p>
            <dl class="cadastro-summary-grid">
              <div><dt>Nome completo</dt><dd>${esc(savedProfile.fullName)}</dd></div>
              <div><dt>CPF</dt><dd>${esc(savedProfile.cpfMasked)}</dd></div>
              <div><dt>Nascimento / Idade</dt><dd>${esc(savedProfile.birthDate)} (${savedProfile.age} anos)</dd></div>
              <div><dt>E-mail</dt><dd>${esc(savedProfile.email)}</dd></div>
              <div><dt>Telefone</dt><dd>(${esc(savedProfile.ddd)}) ${esc(savedProfile.phone)}</dd></div>
              <div><dt>Endereço</dt><dd>${esc(
                savedProfile.fullAddress || formatFullAddress(savedProfile) || 'Não informado'
              )}</dd></div>
              <div><dt>Comunicações</dt><dd>${
                savedProfile.promoWhatsapp || savedProfile.promoEmail
                  ? [
                      savedProfile.promoWhatsapp ? 'WhatsApp' : '',
                      savedProfile.promoEmail ? 'E-mail' : '',
                    ]
                      .filter(Boolean)
                      .join(' e ')
                  : 'Somente essenciais da conta'
              }</dd></div>
            </dl>
            <div class="cadastro-success-actions">
              <button type="button" class="cadastro-submit-btn" data-action="courses">Explorar cursos</button>
              <button type="button" class="btn btn-outline-dark" data-action="edit-profile">Editar dados do perfil</button>
              <button type="button" class="btn btn-outline-dark" data-action="account">Ir para Minha conta</button>
            </div>
          </div>
        </div>

        <img class="cadastro-footer-produce" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true" draggable="false">
      </section>
    </main>`;
  }

  return `<main class="cadastro-page">
    <section class="cadastro-hero">
      <img class="cadastro-hero-scene crop-hero-chef" src="${MEDIA.heroOfficialChef}" alt="Chef Cremonese na cozinha FerveC Gastronomia">
      <div class="cadastro-hero-shade" aria-hidden="true"></div>
      <img class="cadastro-hero-produce is-left" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true" draggable="false">
      <img class="cadastro-hero-produce is-right" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true" draggable="false">
      <div class="cadastro-hero-copy">
        <span class="cadastro-eyebrow">FerveC Gastronomia</span>
        <h1>Faça parte<br><em>da nossa família!</em></h1>
        <p>Cadastre-se agora e tenha acesso a conteúdos exclusivos, receitas incríveis e muito mais!</p>
      </div>
      <div class="cadastro-hero-slogan" aria-hidden="true">
        <span>Aprenda, evolua</span>
        <span>e cozinhe melhor!</span>
      </div>
    </section>

    <section class="cadastro-stage">
      <div class="cadastro-badge-wrap">
        <div class="cadastro-badge">
          <span class="cadastro-badge-rivet" aria-hidden="true"></span>
          <span class="cadastro-badge-icon" aria-hidden="true">${ICONS.chefHat}</span>
          <h2>Cadastro</h2>
          <span class="cadastro-badge-rivet" aria-hidden="true"></span>
        </div>
      </div>

      <div class="cadastro-parchment">
        <span class="cadastro-corner-mark is-tl" aria-hidden="true"></span>
        <span class="cadastro-corner-mark is-tr" aria-hidden="true"></span>
        <span class="cadastro-corner-mark is-bl" aria-hidden="true"></span>
        <span class="cadastro-corner-mark is-br" aria-hidden="true"></span>
        <p class="cadastro-lead">Preencha os dados abaixo para criar sua conta e começar essa jornada gastronômica!</p>

        <form class="cadastro-form" id="cadastro-profile-form" novalidate>
          <div class="cadastro-fields-stack">
            <div class="cadastro-field-group">
              <div class="cadastro-row">
                <span class="cadastro-icon-badge" aria-hidden="true">${ICONS.user}</span>
                <div class="cadastro-pill ${errors.fullName ? 'has-error' : ''}">
                  <label class="sr-only" for="cadastro-fullname">Nome Completo</label>
                  <input
                    id="cadastro-fullname"
                    name="fullName"
                    type="text"
                    value="${esc(draft.fullName)}"
                    placeholder="Nome Completo*"
                    autocomplete="name"
                    required
                  />
                </div>
              </div>
              ${fieldErrorHtml('fullName', errors)}
            </div>

            <div class="cadastro-field-group">
              <div class="cadastro-row">
                <span class="cadastro-icon-badge" aria-hidden="true">${ICONS.idCard}</span>
                <div class="cadastro-pill ${errors.cpf ? 'has-error' : ''}">
                  <label class="sr-only" for="cadastro-cpf">CPF</label>
                  <input
                    id="cadastro-cpf"
                    name="cpf"
                    type="text"
                    inputmode="numeric"
                    maxlength="14"
                    value="${esc(draft.cpf)}"
                    placeholder="CPF*"
                    required
                  />
                </div>
              </div>
              ${fieldErrorHtml('cpf', errors)}
            </div>

            <div class="cadastro-field-group">
              <div class="cadastro-row">
                <span class="cadastro-icon-badge" aria-hidden="true">${ICONS.calendar}</span>
                <div class="cadastro-pill ${errors.birthDate ? 'has-error' : ''}">
                  <label class="sr-only" for="cadastro-birthdate">Data de Nascimento</label>
                  <input
                    id="cadastro-birthdate"
                    name="birthDate"
                    type="text"
                    inputmode="numeric"
                    maxlength="10"
                    value="${esc(draft.birthDate)}"
                    placeholder="Data de Nascimento*"
                    autocomplete="bday"
                    required
                  />
                  <input
                    type="date"
                    class="cadastro-native-date"
                    id="cadastro-native-date"
                    aria-label="Selecionar data de nascimento no calendário"
                    tabindex="-1"
                  />
                  <button
                    type="button"
                    class="cadastro-pill-trailing-btn"
                    data-action="open-birthdate-picker"
                    aria-label="Abrir calendário para data de nascimento"
                  >${ICONS.calendar}</button>
                </div>
              </div>
              ${fieldErrorHtml('birthDate', errors)}
            </div>

            <div class="cadastro-field-group">
              <div class="cadastro-row">
                <span class="cadastro-icon-badge" aria-hidden="true">${ICONS.mail}</span>
                <div class="cadastro-pill ${errors.email ? 'has-error' : ''}">
                  <label class="sr-only" for="cadastro-email">E-mail</label>
                  <input
                    id="cadastro-email"
                    name="email"
                    type="email"
                    value="${esc(draft.email)}"
                    placeholder="E-mail*"
                    autocomplete="email"
                    required
                  />
                </div>
              </div>
              ${fieldErrorHtml('email', errors)}
            </div>

            <div class="cadastro-field-group">
              <div class="cadastro-row cadastro-row-split">
                <span class="cadastro-icon-badge" aria-hidden="true">${ICONS.user}</span>
                <div class="cadastro-pill cadastro-pill-age ${errors.age ? 'has-error' : ''}">
                  <label class="sr-only" for="cadastro-age">Idade</label>
                  <select id="cadastro-age" name="age" aria-label="Idade" required>
                    ${renderAgeOptions(draft.age)}
                  </select>
                </div>

                <div class="cadastro-pill cadastro-pill-ddd ${errors.ddd ? 'has-error' : ''}">
                  <label class="cadastro-mini-label" for="cadastro-ddd">DDD</label>
                  <input
                    id="cadastro-ddd"
                    name="ddd"
                    type="text"
                    inputmode="numeric"
                    maxlength="2"
                    value="${esc(draft.ddd)}"
                    placeholder="99"
                    aria-label="DDD"
                    required
                  />
                </div>

                <span class="cadastro-icon-badge cadastro-phone-badge" aria-hidden="true">${ICONS.phone}</span>

                <div class="cadastro-pill cadastro-pill-phone ${errors.phone ? 'has-error' : ''}">
                  <label class="cadastro-mini-label" for="cadastro-phone">Telefone*</label>
                  <input
                    id="cadastro-phone"
                    name="phone"
                    type="tel"
                    inputmode="tel"
                    maxlength="10"
                    value="${esc(draft.phone)}"
                    placeholder="00000-0000"
                    autocomplete="tel-local"
                    required
                  />
                </div>
              </div>
              ${
                errors.age || errors.ddd || errors.phone
                  ? `<span class="cadastro-field-error is-visible" data-error-split role="alert">${esc(
                      errors.age || errors.ddd || errors.phone || ''
                    )}</span>`
                  : '<span class="cadastro-field-error" data-error-split role="alert"></span>'
              }
            </div>

            <div class="cadastro-field-group">
              <div class="cadastro-row cadastro-row-split cadastro-row-address-top">
                <span class="cadastro-icon-badge" aria-hidden="true">${ICONS.mapPin}</span>
                <div class="cadastro-pill cadastro-pill-labeled cadastro-pill-cep ${errors.cep ? 'has-error' : ''}">
                  <label class="cadastro-mini-label" for="cadastro-cep">CEP*</label>
                  <input
                    id="cadastro-cep"
                    name="cep"
                    type="text"
                    inputmode="numeric"
                    maxlength="9"
                    value="${esc(draft.cep)}"
                    placeholder="00000-000"
                    autocomplete="postal-code"
                    required
                  />
                </div>
                <div class="cadastro-pill cadastro-pill-labeled cadastro-pill-city ${errors.city ? 'has-error' : ''}">
                  <label class="cadastro-mini-label" for="cadastro-city">Cidade*</label>
                  <input
                    id="cadastro-city"
                    name="city"
                    type="text"
                    maxlength="100"
                    value="${esc(draft.city)}"
                    placeholder="Sua cidade"
                    autocomplete="address-level2"
                    required
                  />
                </div>
                <div class="cadastro-pill cadastro-pill-labeled cadastro-pill-uf ${errors.state ? 'has-error' : ''}">
                  <label class="cadastro-mini-label" for="cadastro-state">UF*</label>
                  <select id="cadastro-state" name="state" aria-label="UF" required>
                    ${renderUfOptions(draft.state)}
                  </select>
                </div>
              </div>
              ${
                errors.cep || errors.city || errors.state
                  ? `<span class="cadastro-field-error is-visible" data-error-split-address-top role="alert">${esc(
                      errors.cep || errors.city || errors.state || ''
                    )}</span>`
                  : '<span class="cadastro-field-error" data-error-split-address-top role="alert"></span>'
              }
            </div>

            <div class="cadastro-field-group">
              <div class="cadastro-row cadastro-row-split cadastro-row-address-street">
                <span class="cadastro-icon-badge" aria-hidden="true">${ICONS.mapPin}</span>
                <div class="cadastro-pill cadastro-pill-labeled cadastro-pill-street ${errors.street ? 'has-error' : ''}">
                  <label class="cadastro-mini-label" for="cadastro-street">Logradouro*</label>
                  <input
                    id="cadastro-street"
                    name="street"
                    type="text"
                    maxlength="160"
                    value="${esc(draft.street)}"
                    placeholder="Rua, Avenida, Travessa..."
                    autocomplete="street-address"
                    required
                  />
                </div>
                <div class="cadastro-pill cadastro-pill-labeled cadastro-pill-number ${errors.streetNumber ? 'has-error' : ''}">
                  <label class="cadastro-mini-label" for="cadastro-street-number">Número*</label>
                  <input
                    id="cadastro-street-number"
                    name="streetNumber"
                    type="text"
                    maxlength="20"
                    value="${esc(draft.streetNumber)}"
                    placeholder="Nº"
                    required
                  />
                </div>
              </div>
              ${
                errors.street || errors.streetNumber
                  ? `<span class="cadastro-field-error is-visible" data-error-split-address-street role="alert">${esc(
                      errors.street || errors.streetNumber || ''
                    )}</span>`
                  : '<span class="cadastro-field-error" data-error-split-address-street role="alert"></span>'
              }
            </div>

            <div class="cadastro-field-group">
              <div class="cadastro-row cadastro-row-split cadastro-row-address-extra">
                <span class="cadastro-icon-badge" aria-hidden="true">${ICONS.mapPin}</span>
                <div class="cadastro-pill cadastro-pill-labeled cadastro-pill-neighborhood ${errors.neighborhood ? 'has-error' : ''}">
                  <label class="cadastro-mini-label" for="cadastro-neighborhood">Bairro*</label>
                  <input
                    id="cadastro-neighborhood"
                    name="neighborhood"
                    type="text"
                    maxlength="100"
                    value="${esc(draft.neighborhood)}"
                    placeholder="Seu bairro"
                    required
                  />
                </div>
                <div class="cadastro-pill cadastro-pill-labeled cadastro-pill-complement ${errors.complement ? 'has-error' : ''}">
                  <label class="cadastro-mini-label" for="cadastro-complement">Complemento</label>
                  <input
                    id="cadastro-complement"
                    name="complement"
                    type="text"
                    maxlength="120"
                    value="${esc(draft.complement)}"
                    placeholder="Apto, bloco (opcional)"
                    autocomplete="address-line2"
                  />
                </div>
              </div>
              ${
                errors.neighborhood || errors.complement
                  ? `<span class="cadastro-field-error is-visible" data-error-split-address-extra role="alert">${esc(
                      errors.neighborhood || errors.complement || ''
                    )}</span>`
                  : '<span class="cadastro-field-error" data-error-split-address-extra role="alert"></span>'
              }
            </div>

            <div class="cadastro-field-group">
              <div class="cadastro-row">
                <span class="cadastro-icon-badge" aria-hidden="true">${ICONS.lock}</span>
                <div class="cadastro-pill ${errors.password ? 'has-error' : ''}">
                  <label class="sr-only" for="cadastro-password">Senha</label>
                  <input
                    id="cadastro-password"
                    name="password"
                    type="${showPassword ? 'text' : 'password'}"
                    value="${esc(draft.password)}"
                    placeholder="Senha*"
                    autocomplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    class="cadastro-pill-trailing-btn"
                    data-action="toggle-password-visibility"
                    aria-label="${showPassword ? 'Ocultar senha' : 'Mostrar senha'}"
                    aria-pressed="${showPassword}"
                  >${showPassword ? ICONS.eye : ICONS.eyeOff}</button>
                </div>
              </div>
              ${fieldErrorHtml('password', errors)}
            </div>

            <div class="cadastro-field-group">
              <div class="cadastro-row">
                <span class="cadastro-icon-badge" aria-hidden="true">${ICONS.lock}</span>
                <div class="cadastro-pill ${errors.confirmPassword ? 'has-error' : ''}">
                  <label class="sr-only" for="cadastro-confirm-password">Confirmar Senha</label>
                  <input
                    id="cadastro-confirm-password"
                    name="confirmPassword"
                    type="${showConfirmPassword ? 'text' : 'password'}"
                    value="${esc(draft.confirmPassword)}"
                    placeholder="Confirmar Senha*"
                    autocomplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    class="cadastro-pill-trailing-btn"
                    data-action="toggle-confirm-visibility"
                    aria-label="${showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}"
                    aria-pressed="${showConfirmPassword}"
                  >${showConfirmPassword ? ICONS.eye : ICONS.eyeOff}</button>
                </div>
              </div>
              ${fieldErrorHtml('confirmPassword', errors)}
            </div>
          </div>

          <div class="cadastro-divider">
            <span class="cadastro-divider-line" aria-hidden="true"></span>
            <span class="cadastro-divider-title">
              <span class="cadastro-bell-icon" aria-hidden="true">${ICONS.bell}</span>
              <span>Receber novidades</span>
            </span>
            <span class="cadastro-divider-line" aria-hidden="true"></span>
          </div>

          <p class="cadastro-terms-subtitle">Cadastro exclusivo para maiores de 18 anos. Marque a opção abaixo para aceitar os termos (v1.1):</p>

          <div class="cadastro-consent-grid">
            <div class="cadastro-consent-col ${errors.acceptTerms ? 'has-error' : ''}">
              <label class="cadastro-checkbox-label" for="cadastro-terms">
                <input
                  id="cadastro-terms"
                  name="acceptTerms"
                  type="checkbox"
                  required
                  aria-required="true"
                  aria-invalid="${errors.acceptTerms ? 'true' : 'false'}"
                  ${draft.acceptTerms ? 'checked' : ''}
                />
                <span class="cadastro-consent-icon is-crimson" aria-hidden="true">${ICONS.mail}</span>
                <span class="cadastro-terms-copy">
                  Declaro ter 18 anos ou mais e concordo com os
                  <button
                    type="button"
                    class="cadastro-inline-link"
                    data-action="open-terms-modal"
                    title="Abrir documento de Termos de Condições de Uso"
                  >Termos de Condições</button>
                  e
                  <button
                    type="button"
                    class="cadastro-inline-link cadastro-inline-link--privacy"
                    data-action="open-privacy-modal"
                    title="Abrir documento de Política de Privacidade (LGPD)"
                  >Política de Privacidade <span class="cadastro-inline-link-badge" aria-hidden="true">↗</span></button>
                </span>
              </label>
              ${fieldErrorHtml('acceptTerms', errors)}
            </div>

            <div class="cadastro-consent-col cadastro-marketing-col">
              <label class="cadastro-checkbox-label" for="cadastro-promo-whatsapp">
                <input
                  id="cadastro-promo-whatsapp"
                  name="promoWhatsapp"
                  type="checkbox"
                  ${draft.promoWhatsapp ? 'checked' : ''}
                />
                <span class="cadastro-consent-icon is-whatsapp" aria-hidden="true">${ICONS.whatsapp}</span>
                <span>Receber anúncios por WhatsApp</span>
              </label>

              <label class="cadastro-checkbox-label" for="cadastro-promo-email">
                <input
                  id="cadastro-promo-email"
                  name="promoEmail"
                  type="checkbox"
                  ${draft.promoEmail ? 'checked' : ''}
                />
                <span class="cadastro-consent-icon is-crimson" aria-hidden="true">${ICONS.mail}</span>
                <span>Receber anúncios por e-mail</span>
              </label>
            </div>
          </div>

          <div class="cadastro-submit-wrap">
            <button type="submit" class="cadastro-submit-btn" ${isSubmitting ? 'disabled' : ''}>
              <span class="cadastro-submit-icon" aria-hidden="true">${ICONS.userPlus}</span>
              <span>${
                isSubmitting
                  ? savedProfile
                    ? 'Salvando Alterações...'
                    : 'Criando Conta...'
                  : savedProfile
                    ? 'Salvar Alterações'
                    : 'Criar Minha Conta'
              }</span>
            </button>
            <p class="cadastro-storage-hint"><svg class="cadastro-lock-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="currentColor"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> ${
              supabaseConfigured
                ? 'Controlador: Gabriel Cremonese (FerveC Gastronomia) · Seus dados são protegidos pela LGPD e sincronizados no Supabase.'
                : 'Controlador: Gabriel Cremonese (FerveC Gastronomia) · Armazenamento provisório local (Fase 1) protegido para acesso ao portal e à Biblioteca.'
            }</p>
          </div>
        </form>
      </div>

      <div class="cadastro-ribbon-bottom" aria-hidden="true"></div>
      <img class="cadastro-footer-produce" src="/assets/foliage/footer-produce.png" alt="" aria-hidden="true" draggable="false">
      <button type="button" class="cadastro-help-float" data-action="help">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 1 3 6.2L3 20l1-4.2A8 8 0 0 1 4 12Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/></svg>
        <span>Precisa de ajuda?</span>
      </button>
    </section>
  </main>`;
}
