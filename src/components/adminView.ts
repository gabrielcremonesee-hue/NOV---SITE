import { PHASE_INTEGRATIONS, PROVISIONAL_NOTICE_TEXT } from '../config/integrationPhase';
import {
  ALLOWED_DISCOUNT_PERCENTS,
  ALLOWED_VALIDITY_DAYS,
  CouponRecord,
  DEFAULT_COUPON_VALIDITY_DAYS,
  getCouponComputedStatus,
  getCouponStatusLabel,
} from '../utils/coupons';
import { EvaluatedCourseProgress } from '../utils/courseProgressEngine';
import { formatBrlFromCents } from '../utils/paymentCheckout';
import {
  ProvisionalActivityItem,
  ProvisionalDemoOrder,
  UnifiedAccountRecord,
} from '../services/provisionalStore';
import {
  CHEF_MALE_VOICE_PRESETS,
  ChefVoiceProfileConfig,
  CHEF_VOICE_TEST_PHRASE,
} from '../utils/voiceProfile';
import type { ServerAdminTelemetry } from '../utils/supabase/courseSync';
import { SUPPLIER_IDENTITY } from '../config/legalConfig';

const ADMIN_COURSES_CATALOG: Array<{
  slug: string;
  title: string;
  available: boolean;
  workloadLabel: string;
}> = [
  {
    slug: 'massas-italianas',
    title: 'Cozinha Italiana: Massas Artesanais',
    available: true,
    workloadLabel: '6 módulos · Formação técnica completa',
  },
  {
    slug: 'cozinha-francesa',
    title: 'Cozinha Francesa: Técnicas Clássicas',
    available: false,
    workloadLabel: 'Em preparação · Fase 2',
  },
  {
    slug: 'cozinha-japonesa',
    title: 'Culinária Japonesa: Sushi e Washoku',
    available: false,
    workloadLabel: 'Em preparação · Fase 2',
  },
  {
    slug: 'cozinha-brasileira',
    title: 'Cozinha Brasileira: Sabores e Cultura',
    available: false,
    workloadLabel: 'Em preparação · Fase 2',
  },
];

export type AdminTabId =
  | 'overview'
  | 'students'
  | 'courses'
  | 'assessments'
  | 'certificates'
  | 'coupons'
  | 'reports'
  | 'settings'
  | 'integrations';

export interface AdminAssessmentAttemptView {
  moduleTitle: string;
  kind: 'Trabalho' | 'Prova';
  scoreLabel: string;
  passedLabel: string;
  dateIso: string;
}

export interface AdminCouponDraftView {
  code: string;
  discountPercent: number;
  validityDays: number;
  maxUses: number;
  courseScope: string;
}

export interface AdminDashboardRenderOptions {
  activeTab: AdminTabId;
  mobileMenuOpen: boolean;
  adminDisplayName: string;
  adminEmail: string;
  accounts: UnifiedAccountRecord[];
  coupons: CouponRecord[];
  demoOrders: ProvisionalDemoOrder[];
  activities: ProvisionalActivityItem[];
  courseProgress: EvaluatedCourseProgress;
  assessments: AdminAssessmentAttemptView[];
  couponDraft: AdminCouponDraftView;
  voiceConfig: ChefVoiceProfileConfig;
  voiceTestPhrase: string;
  voiceStatusLabel: string;
  availableVoices: Array<{ voiceURI: string; name: string; lang: string }>;
  serverTelemetry?: ServerAdminTelemetry | null;
}

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[ch] || ch;
  });
}

function formatDateBrShort(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso || '—';
  return new Date(t).toLocaleDateString('pt-BR');
}

function formatTimeBrShort(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ADMIN_NAV: Array<{ id: AdminTabId; label: string; icon: string; badge?: string }> = [
  {
    id: 'overview',
    label: 'Visão Geral',
    icon: '<svg viewBox="0 0 24 24"><path d="M4 13h7V4H4v9Zm9 7h7V11h-7v9ZM4 20h7v-5H4v5Zm9-11h7V4h-7v5Z"/></svg>',
  },
  {
    id: 'students',
    label: 'Gerenciar Alunos',
    icon: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 19a6 6 0 0 1 12 0"/><circle cx="17.5" cy="9.5" r="2.4"/><path d="M15.5 19a5 5 0 0 1 6-4.5"/></svg>',
  },
  {
    id: 'courses',
    label: 'Cursos',
    icon: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22zM4 5v17M8 7h8M8 11h8"/></svg>',
  },
  {
    id: 'assessments',
    label: 'Provas e Avaliações',
    icon: '<svg viewBox="0 0 24 24"><path d="M8 4h8l3 3v13H5V4h3Z"/><path d="m9 13 2 2 4-4"/></svg>',
  },
  {
    id: 'certificates',
    label: 'Certificados',
    icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4.8"/><path d="m8.8 12.5-1.3 8.5 4.5-2.1 4.5 2.1-1.3-8.5"/></svg>',
  },
  {
    id: 'coupons',
    label: 'Gerenciar Cupons',
    icon: '<svg viewBox="0 0 24 24"><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7Z"/><path d="m9 15 6-6"/></svg>',
    badge: 'Destaque',
  },
  {
    id: 'reports',
    label: 'Relatórios',
    icon: '<svg viewBox="0 0 24 24"><path d="M4 20V11h4v9M10 20V5h4v15M16 20v-8h4v8"/></svg>',
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/></svg>',
  },
  {
    id: 'integrations',
    label: 'Integrações',
    icon: '<svg viewBox="0 0 24 24"><path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8"/></svg>',
  },
];

function renderDonutMetrics(progress: EvaluatedCourseProgress): string {
  const total = Math.max(1, progress.modules.length);
  const donePct = Math.round((progress.completedModulesCount / total) * 100);
  const inProgPct = Math.round((progress.inProgressModulesCount / total) * 100);
  const availPct = Math.round((progress.availableModulesCount / total) * 100);
  const lockedPct = Math.max(0, 100 - donePct - inProgPct - availPct);

  const r = 46;
  const c = 2 * Math.PI * r;
  const segDone = (donePct / 100) * c;
  const segProg = (inProgPct / 100) * c;
  const segAvail = (availPct / 100) * c;

  return `<div class="fadmin-donut-wrap">
    <div class="fadmin-donut-svg-box">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(148,163,184,0.18)" stroke-width="12"/>
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="#38bdf8" stroke-width="12"
          stroke-dasharray="${segAvail.toFixed(1)} ${c.toFixed(1)}"
          stroke-dashoffset="0" transform="rotate(-90 60 60)"/>
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="#f59e0b" stroke-width="12"
          stroke-dasharray="${segProg.toFixed(1)} ${c.toFixed(1)}"
          stroke-dashoffset="${(-segAvail).toFixed(1)}" transform="rotate(-90 60 60)"/>
        <circle cx="60" cy="60" r="${r}" fill="none" stroke="#34d399" stroke-width="12"
          stroke-dasharray="${segDone.toFixed(1)} ${c.toFixed(1)}"
          stroke-dashoffset="${(-(segAvail + segProg)).toFixed(1)}" transform="rotate(-90 60 60)"/>
      </svg>
      <div class="fadmin-donut-center">
        <strong>${progress.overallPct}%</strong>
        <span>Progresso Local</span>
      </div>
    </div>
    <ul class="fadmin-legend">
      <li><i class="dot is-emerald"></i><span>Concluídos</span><strong>${progress.completedModulesCount}/${total} (${donePct}%)</strong></li>
      <li><i class="dot is-amber"></i><span>Em andamento</span><strong>${progress.inProgressModulesCount}/${total} (${inProgPct}%)</strong></li>
      <li><i class="dot is-cyan"></i><span>Disponíveis</span><strong>${progress.availableModulesCount}/${total} (${availPct}%)</strong></li>
      <li><i class="dot is-slate"></i><span>Bloqueados</span><strong>${progress.lockedModulesCount}/${total} (${lockedPct}%)</strong></li>
    </ul>
  </div>`;
}

export function renderAdminDashboard(opts: AdminDashboardRenderOptions): string {
  const {
    activeTab,
    mobileMenuOpen,
    adminDisplayName,
    adminEmail,
    accounts,
    coupons,
    demoOrders,
    activities,
    courseProgress,
    assessments,
    couponDraft,
    voiceConfig,
    voiceTestPhrase,
    voiceStatusLabel,
    availableVoices,
    serverTelemetry = null,
  } = opts;

  const activeCouponsCount = coupons.filter((c) => getCouponComputedStatus(c) === 'active').length;
  const totalCouponUses = coupons.reduce((acc, c) => acc + c.usesCount, 0);
  const totalDiscountCents = demoOrders.reduce((acc, o) => acc + (o.discountCents || 0), 0);
  const fg = serverTelemetry?.financialGuard;
  const priceConf = serverTelemetry?.priceConfirmation;

  const governanceCardHtml = `
    <section class="fadmin-card">
      <div class="fadmin-card-head">
        <div>
          <span class="fadmin-eyebrow">GOVERNANÇA FINANCEIRA, SEGURANÇA &amp; CONFORMIDADE (LGPD / CDC)</span>
          <h2>Trava de Gastos IA, Sessão Única e Validação Comercial</h2>
          <p>Controlador/Fornecedor: ${esc(SUPPLIER_IDENTITY.civilName)} (CPF mascarado em logs: ${esc(SUPPLIER_IDENTITY.cpfMasked)}) · Mínimo 18 anos · Microfone de aluno desativado permanentemente.</p>
        </div>
        <span class="fadmin-status-badge ${fg?.allowPaidAi ? 'is-amber' : 'is-active'}">${
          fg?.allowPaidAi ? 'IA paga controlada' : 'Modo R$ 0 ativo (Kill Switch)'
        }</span>
      </div>
      <div class="fadmin-integrations-grid">
        <article class="fadmin-integ-card">
          <div class="fadmin-course-head">
            <strong>Trava Financeira IA / TTS</strong>
            <span class="fadmin-status-badge ${fg?.allowPaidAi ? 'is-amber' : 'is-active'}">${
              fg ? (fg.allowPaidAi ? 'Pago limitado' : 'R$ 0 Programado') : 'R$ 0 Local'
            }</span>
          </div>
          <p>${
            fg
              ? `Gasto est. hoje: US$ ${fg.estimatedSpendUsd.toFixed(4)} / teto US$ ${fg.dailyBudgetUsd.toFixed(2)} · Locais: ${fg.localFallbackCallsToday} · Bloqueadas: ${fg.blockedCallsToday}`
              : 'Kill switch padrão ativo no servidor (FERVEC_ALLOW_PAID_AI=false, FERVEC_ALLOW_EXTERNAL_TTS=false). 4 vozes masculinas do Chef preservadas via síntese neural local/navegador.'
          }</p>
        </article>
        <article class="fadmin-integ-card">
          <div class="fadmin-course-head">
            <strong>Integridade de Preço &amp; Pendências Comerciais</strong>
            <span class="fadmin-status-badge ${priceConf?.confirmed ? 'is-active' : 'is-amber'}">${
              priceConf?.confirmed ? 'Preço confirmado' : 'Aguarda confirmação'
            }</span>
          </div>
          <p>${esc(
            priceConf?.note ||
              'Divergência histórica R$ 12,00 vs R$ 12,90: aguardando FERVEC_PRICE_CONFIRMED=true e confirmação oficial de endereço físico e prazo de acesso.'
          )}${
            typeof serverTelemetry?.singleSessionActiveCount === 'number'
              ? ` · Sessões únicas ativas: ${serverTelemetry.singleSessionActiveCount}`
              : ''
          }</p>
        </article>
      </div>
    </section>
  `;

  let mainSectionHtml = '';

  if (activeTab === 'overview') {
    mainSectionHtml = `
      <div class="fadmin-kpi-grid">
        <article class="fadmin-kpi-card">
          <div class="fadmin-kpi-head">
            <span>Alunos Cadastrados</span>
            <em class="fadmin-tag">Local</em>
          </div>
          <strong>${accounts.length}</strong>
          <small>Base unificada neste navegador</small>
        </article>
        <article class="fadmin-kpi-card is-highlight">
          <div class="fadmin-kpi-head">
            <span>Cupons Ativos</span>
            <em class="fadmin-tag is-amber">${totalCouponUses} uso(s)</em>
          </div>
          <strong>${activeCouponsCount}</strong>
          <small>${coupons.length} cupom(ns) gerados localmente</small>
        </article>
        <article class="fadmin-kpi-card">
          <div class="fadmin-kpi-head">
            <span>Cursos no Catálogo</span>
            <em class="fadmin-tag is-cyan">1 ativo</em>
          </div>
          <strong>${ADMIN_COURSES_CATALOG.length}</strong>
          <small>Massas Italianas + ${ADMIN_COURSES_CATALOG.length - 1} em preparação</small>
        </article>
        <article class="fadmin-kpi-card">
          <div class="fadmin-kpi-head">
            <span>Provas &amp; Avaliações</span>
            <em class="fadmin-tag">${assessments.length} registro(s)</em>
          </div>
          <strong>${courseProgress.overallPct}%</strong>
          <small>Progresso atual de Massas Italianas</small>
        </article>
      </div>

      <div class="fadmin-two-col">
        <section class="fadmin-card">
          <div class="fadmin-card-head">
            <div>
              <h2>Desempenho do Curso</h2>
              <p>Cálculo real integrado de aula, trabalho, revisão e prova (armazenamento local).</p>
            </div>
            <button type="button" class="fadmin-btn-ghost" data-action="admin-tab" data-tab="courses">Ver módulos →</button>
          </div>
          ${renderDonutMetrics(courseProgress)}
        </section>

        <section class="fadmin-card">
          <div class="fadmin-card-head">
            <div>
              <h2>Atividade Recente</h2>
              <p>Eventos reais registrados nesta sessão local (Fase 1 provisória).</p>
            </div>
            <button type="button" class="fadmin-btn-cyan" data-action="admin-tab" data-tab="coupons">Gerenciar Cupons →</button>
          </div>
          ${
            activities.length > 0
              ? `<ul class="fadmin-activity-list">
                  ${activities
                    .slice(0, 6)
                    .map(
                      (act) => `<li>
                        <span class="fadmin-act-dot is-${esc(act.kind)}"></span>
                        <div class="fadmin-act-copy">
                          <strong>${esc(act.title)}</strong>
                          <small>${esc(act.detail)}</small>
                        </div>
                        <time>${esc(formatTimeBrShort(act.timestamp))}</time>
                      </li>`
                    )
                    .join('')}
                </ul>`
              : `<div class="fadmin-empty-state">
                  <p>Nenhuma movimentação local registrada ainda nesta sessão.</p>
                  <span>Crie um cupom, conclua uma etapa ou faça um cadastro para acompanhar eventos reais aqui.</span>
                </div>`
          }
        </section>
      </div>

      <section class="fadmin-card">
        <div class="fadmin-card-head">
          <div>
            <h2>Ações Rápidas de Controle</h2>
            <p>Acesse diretamente as ferramentas operacionais desta prévia administrativa.</p>
          </div>
        </div>
        <div class="fadmin-quick-grid">
          <button type="button" class="fadmin-quick-btn is-featured" data-action="admin-tab" data-tab="coupons">
            <span>%</span>
            <strong>Gerenciar Cupons</strong>
            <small>Gerar código único, validade e auditoria</small>
          </button>
          <button type="button" class="fadmin-quick-btn" data-action="admin-tab" data-tab="students">
            <span>👥</span>
            <strong>Gerenciar Alunos</strong>
            <small>${accounts.length} conta(s) unificada(s)</small>
          </button>
          <button type="button" class="fadmin-quick-btn" data-action="admin-tab" data-tab="settings">
            <span>🔊</span>
            <strong>Voz do Chef</strong>
            <small>Ajustar locução pt-BR e testar</small>
          </button>
          <button type="button" class="fadmin-quick-btn" data-action="admin-tab" data-tab="integrations">
            <span>⇄</span>
            <strong>Integrações Fase 2</strong>
            <small>Supabase &amp; Asaas aguardando conexão</small>
          </button>
        </div>
      </section>
      ${governanceCardHtml}
    `;
  } else if (activeTab === 'coupons') {
    mainSectionHtml = `
      <section class="fadmin-card fadmin-coupon-hero">
        <div class="fadmin-card-head">
          <div>
            <span class="fadmin-eyebrow">GERENCIAMENTO DE CUPONS · FASE 1 PROVISÓRIA</span>
            <h2>Gerar Novo Cupom Promocional</h2>
            <p>Código único de 6 dígitos, descontos de 10% a 100%, validade programada (padrão 7 dias) e vínculo automático com pedidos demonstrativos.</p>
          </div>
        </div>

        <form id="admin-coupon-form" class="fadmin-coupon-form">
          <div class="fadmin-form-grid">
            <div class="fadmin-field">
              <label for="admin-coupon-code">Código de 6 dígitos</label>
              <div class="fadmin-code-row">
                <input id="admin-coupon-code" class="fadmin-mono-input" name="code" type="text" maxlength="6" inputmode="numeric" value="${esc(couponDraft.code)}" required />
                <button type="button" class="fadmin-btn-ghost" data-action="admin-regenerate-coupon-code">Gerar único</button>
              </div>
            </div>

            <div class="fadmin-field">
              <label for="admin-coupon-discount">Percentual de desconto</label>
              <select id="admin-coupon-discount" name="discountPercent">
                ${ALLOWED_DISCOUNT_PERCENTS.map(
                  (pct) =>
                    `<option value="${pct}" ${couponDraft.discountPercent === pct ? 'selected' : ''}>${pct}% ${
                      pct === 100 ? '(Aquisição demonstrativa gratuita)' : ''
                    }</option>`
                ).join('')}
              </select>
            </div>

            <div class="fadmin-field">
              <label for="admin-coupon-validity">Validade em dias</label>
              <select id="admin-coupon-validity" name="validityDays">
                ${ALLOWED_VALIDITY_DAYS.map(
                  (days) =>
                    `<option value="${days}" ${
                      (couponDraft.validityDays || DEFAULT_COUPON_VALIDITY_DAYS) === days ? 'selected' : ''
                    }>${days} ${days === 1 ? 'dia' : 'dias'}${days === 7 ? ' (Padrão)' : ''}</option>`
                ).join('')}
              </select>
            </div>

            <div class="fadmin-field">
              <label for="admin-coupon-maxuses">Limite de utilizações</label>
              <input id="admin-coupon-maxuses" name="maxUses" type="number" min="1" max="999" value="${esc(couponDraft.maxUses)}" required />
            </div>

            <div class="fadmin-field">
              <label for="admin-coupon-scope">Curso elegível</label>
              <select id="admin-coupon-scope" name="courseScope">
                <option value="massas-italianas" ${couponDraft.courseScope === 'massas-italianas' ? 'selected' : ''}>Cozinha Italiana: Massas Artesanais</option>
                <option value="all" ${couponDraft.courseScope === 'all' ? 'selected' : ''}>Todos os cursos do portal</option>
              </select>
            </div>
          </div>

          <div class="fadmin-form-actions">
            <button type="submit" class="fadmin-btn-cyan">+ Gerar e Salvar Cupom</button>
            <span class="fadmin-helper-note">Cupons 100% liberam matrícula demonstrativa sem gateway nesta Fase 1.</span>
          </div>
        </form>
      </section>

      <section class="fadmin-card">
        <div class="fadmin-card-head">
          <div>
            <h2>Cupons Gerados &amp; Auditoria de Usos</h2>
            <p>Acompanhe status, expiração, limite e pedidos demonstrativos vinculados.</p>
          </div>
          <span class="fadmin-pill-count">${coupons.length} cupom(ns)</span>
        </div>

        ${
          coupons.length === 0
            ? `<div class="fadmin-empty-state">
                <p>Nenhum cupom criado até o momento.</p>
                <span>Use o formulário acima para gerar seu primeiro cupom de 6 dígitos e testar na página de Pagamentos.</span>
              </div>`
            : `<div class="fadmin-table-wrap">
                <table class="fadmin-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Desconto</th>
                      <th>Validade</th>
                      <th>Usos</th>
                      <th>Status</th>
                      <th>Pedidos Demo Vinculados</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${coupons
                      .map((c) => {
                        const status = getCouponComputedStatus(c);
                        const label = getCouponStatusLabel(status);
                        const redemptionsHtml =
                          c.redemptions.length > 0
                            ? c.redemptions
                                .slice(0, 3)
                                .map(
                                  (r) =>
                                    `<div class="fadmin-redemption-chip"><code>${esc(r.orderId)}</code> · ${esc(r.studentEmail)}</div>`
                                )
                                .join('')
                            : '<span class="fadmin-muted">Nenhum uso ainda</span>';
                        return `<tr>
                          <td>
                            <div class="fadmin-code-cell">
                              <code class="fadmin-coupon-code">${esc(c.code)}</code>
                              <button type="button" class="fadmin-mini-btn" data-action="admin-copy-coupon" data-code="${esc(c.code)}">Copiar</button>
                            </div>
                          </td>
                          <td><strong>${c.discountPercent}%</strong></td>
                          <td>
                            <div>${c.validityDays}d</div>
                            <small class="fadmin-muted">até ${esc(formatDateBrShort(c.expiresAt))}</small>
                          </td>
                          <td><strong>${c.usesCount}</strong> / ${c.maxUses}</td>
                          <td><span class="fadmin-status-badge is-${esc(status)}">${esc(label)}</span></td>
                          <td>${redemptionsHtml}</td>
                          <td>
                            <button
                              type="button"
                              class="fadmin-mini-btn ${c.active ? 'is-danger' : 'is-success'}"
                              data-action="admin-toggle-coupon"
                              data-code="${esc(c.code)}"
                              data-next-active="${c.active ? '0' : '1'}"
                            >${c.active ? 'Desativar' : 'Reativar'}</button>
                          </td>
                        </tr>`;
                      })
                      .join('')}
                  </tbody>
                </table>
              </div>`
        }
      </section>
    `;
  } else if (activeTab === 'students') {
    mainSectionHtml = `
      <section class="fadmin-card">
        <div class="fadmin-card-head">
          <div>
            <h2>Gerenciar Alunos (Cadastro Único Local)</h2>
            <p>Contas criadas pelo Cadastro Principal do site. Em Fase 1 os registros ficam armazenados neste navegador; na Fase 2 serão sincronizados no Supabase.</p>
          </div>
          <button type="button" class="fadmin-btn-cyan" data-action="create-profile">+ Novo Cadastro no Site</button>
        </div>
        ${
          accounts.length === 0
            ? `<div class="fadmin-empty-state">
                <p>Nenhum aluno cadastrado localmente ainda.</p>
                <span>Crie um cadastro em "Cadastro" para que ele apareça automaticamente aqui e permita entrar na Biblioteca Interativa.</span>
              </div>`
            : `<div class="fadmin-table-wrap">
                <table class="fadmin-table">
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>E-mail</th>
                      <th>CPF</th>
                      <th>Idade / Tel</th>
                      <th>Perfil</th>
                      <th>Cursos Liberados (Demo)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${accounts
                      .map(
                        (acc) => `<tr>
                          <td><strong>${esc(acc.fullName)}</strong><br><small class="fadmin-muted">Desde ${esc(formatDateBrShort(acc.createdAt))}</small></td>
                          <td>${esc(acc.email)}</td>
                          <td><code>${esc(acc.cpfMasked)}</code></td>
                          <td>${acc.age} anos · (${esc(acc.ddd)}) ${esc(acc.phone)}</td>
                          <td><span class="fadmin-status-badge ${acc.role === 'admin' ? 'is-cyan' : 'is-active'}">${acc.role === 'admin' ? 'Admin' : 'Aluno'}</span></td>
                          <td>${
                            acc.entitledCourses.length > 0
                              ? acc.entitledCourses.map((s) => `<span class="fadmin-status-badge is-active">${esc(s)}</span>`).join(' ')
                              : '<span class="fadmin-muted">Somente visualização demo</span>'
                          }</td>
                        </tr>`
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>`
        }
      </section>
    `;
  } else if (activeTab === 'courses') {
    mainSectionHtml = `
      <section class="fadmin-card">
        <div class="fadmin-card-head">
          <div>
            <h2>Catálogo de Cursos &amp; Arquitetura Multi-Cursos</h2>
            <p>Motor preparado para expansão de novas cozinhas sem reescrever regras de progresso, avaliação e certificado.</p>
          </div>
          <button type="button" class="fadmin-btn-ghost" data-action="progress">Ver em Meu Progresso →</button>
        </div>
        <div class="fadmin-course-cards">
          ${ADMIN_COURSES_CATALOG
            .map((c) => {
              const isMain = c.slug === 'massas-italianas';
              return `<article class="fadmin-course-item ${isMain ? 'is-live' : ''}">
                <div class="fadmin-course-head">
                  <strong>${esc(c.title)}</strong>
                  <span class="fadmin-status-badge ${c.available ? 'is-active' : 'is-inactive'}">${c.available ? 'Disponível' : 'Planejado'}</span>
                </div>
                <p>${esc(c.workloadLabel)} · ${isMain ? `${courseProgress.modules.length} módulos ativos` : 'Estrutura de módulos pronta para Fase 2'}</p>
                ${
                  isMain
                    ? `<div class="fadmin-progress-row">
                        <div class="fadmin-bar"><span style="width:${courseProgress.overallPct}%"></span></div>
                        <strong>${courseProgress.overallPct}%</strong>
                      </div>`
                    : ''
                }
              </article>`;
            })
            .join('')}
        </div>
      </section>
    `;
  } else if (activeTab === 'assessments') {
    mainSectionHtml = `
      <section class="fadmin-card">
        <div class="fadmin-card-head">
          <div>
            <h2>Provas e Avaliações (Dados Locais)</h2>
            <p>Tentativas reais de Trabalho e Prova registradas pelo aluno neste navegador.</p>
          </div>
        </div>
        ${
          assessments.length === 0
            ? `<div class="fadmin-empty-state">
                <p>Nenhuma tentativa registrada ainda.</p>
                <span>As respostas de Trabalho e Provas enviadas nos módulos aparecerão listadas aqui automaticamente.</span>
              </div>`
            : `<div class="fadmin-table-wrap">
                <table class="fadmin-table">
                  <thead>
                    <tr>
                      <th>Módulo</th>
                      <th>Etapa</th>
                      <th>Pontuação</th>
                      <th>Situação</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${assessments
                      .map(
                        (a) => `<tr>
                          <td><strong>${esc(a.moduleTitle)}</strong></td>
                          <td>${esc(a.kind)}</td>
                          <td><code>${esc(a.scoreLabel)}</code></td>
                          <td><span class="fadmin-status-badge ${a.passedLabel === 'Aprovado' || a.passedLabel === 'Concluído' ? 'is-active' : 'is-expired'}">${esc(a.passedLabel)}</span></td>
                          <td>${esc(formatTimeBrShort(a.dateIso))}</td>
                        </tr>`
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>`
        }
      </section>
    `;
  } else if (activeTab === 'certificates') {
    mainSectionHtml = `
      <section class="fadmin-card">
        <div class="fadmin-card-head">
          <div>
            <h2>Certificados &amp; Elegibilidade</h2>
            <p>Emissão oficial em servidor (Supabase) será habilitada na Fase 2. Nesta Fase 1 a prévia e elegibilidade seguem o critério real do curso.</p>
          </div>
          <button type="button" class="fadmin-btn-cyan" data-action="certificate">Abrir aba Certificados →</button>
        </div>
        <div class="fadmin-course-cards">
          ${courseProgress.modules
            .map(
              (m) => `<article class="fadmin-course-item ${m.certificateUnlocked ? 'is-live' : ''}">
                <div class="fadmin-course-head">
                  <strong>Módulo ${m.index} · ${esc(m.recipeTitle)}</strong>
                  <span class="fadmin-status-badge ${m.certificateUnlocked ? 'is-active' : 'is-inactive'}">${m.certificateUnlocked ? 'Elegível' : 'Bloqueado'}</span>
                </div>
                <p>Aula: ${m.lessonCompleted ? '✓' : '—'} · Trabalho: ${m.workCompleted ? '✓' : '—'} · Revisão: ${m.reviewCompleted ? '✓' : '—'} · Prova: ${m.examPassed ? '✓' : '—'}</p>
              </article>`
            )
            .join('')}
        </div>
      </section>
    `;
  } else if (activeTab === 'reports') {
    mainSectionHtml = `
      <section class="fadmin-card">
        <div class="fadmin-card-head">
          <div>
            <h2>Relatórios Operacionais (Provisório Local)</h2>
            <p>Consolidado em tempo real dos cupons, inscrições demonstrativas (100%) e evolução no curso.</p>
          </div>
          <button type="button" class="fadmin-btn-cyan" data-action="admin-export-report">Exportar JSON Local ↓</button>
        </div>
        <div class="fadmin-kpi-grid">
          <article class="fadmin-kpi-card">
            <div class="fadmin-kpi-head"><span>Pedidos Demo Registrados</span></div>
            <strong>${demoOrders.length}</strong>
            <small>Via cupom 100% demonstrativo</small>
          </article>
          <article class="fadmin-kpi-card">
            <div class="fadmin-kpi-head"><span>Descontos Demonstrativos</span></div>
            <strong>${esc(formatBrlFromCents(totalDiscountCents))}</strong>
            <small>Total aplicado em testes locais</small>
          </article>
          <article class="fadmin-kpi-card">
            <div class="fadmin-kpi-head"><span>Usos de Cupons</span></div>
            <strong>${totalCouponUses}</strong>
            <small>Entre ${coupons.length} cupom(ns)</small>
          </article>
          <article class="fadmin-kpi-card">
            <div class="fadmin-kpi-head"><span>Etapas Concluídas</span></div>
            <strong>${courseProgress.completedUnits}/${courseProgress.totalUnits}</strong>
            <small>${courseProgress.overallPct}% de conclusão</small>
          </article>
        </div>
      </section>
    `;
  } else if (activeTab === 'settings') {
    mainSectionHtml = `
      <section class="fadmin-card">
        <div class="fadmin-card-head">
          <div>
            <span class="fadmin-eyebrow">ESTÚDIO DE VOZ · CHEF EDUCADOR</span>
            <h2>Configuração Unificada de Narração (Site + Biblioteca)</h2>
            <p>Ajusta a voz em Português Brasileiro aplicada tanto nas aulas do site quanto nas respostas faladas do Chef na Biblioteca Interativa.</p>
          </div>
          <span class="fadmin-status-badge is-cyan">${esc(voiceStatusLabel)}</span>
        </div>

        <form id="admin-voice-form" class="fadmin-voice-form">
          <div class="fadmin-form-grid">
            <div class="fadmin-field fadmin-field-wide">
              <label for="admin-voice-select">Voz masculina do Chef (pt-BR natural)</label>
              <select id="admin-voice-select" name="voiceUri">
                ${(availableVoices.length > 0 ? availableVoices : CHEF_MALE_VOICE_PRESETS)
                  .map(
                    (v) =>
                      `<option value="${esc(v.voiceURI)}" ${voiceConfig.voiceUri === v.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`
                  )
                  .join('')}
              </select>
              <small class="fadmin-muted">4 vozes masculinas naturais, leves e firmes para explicar receitas sem tom robótico (Site + Biblioteca).</small>
            </div>

            <div class="fadmin-field">
              <label for="admin-voice-rate">Velocidade: <strong data-voice-rate-val>${voiceConfig.rate.toFixed(2)}x</strong></label>
              <input id="admin-voice-rate" name="rate" type="range" min="0.70" max="1.30" step="0.02" value="${voiceConfig.rate.toFixed(2)}" />
            </div>

            <div class="fadmin-field">
              <label for="admin-voice-pitch">Tom / Timbre: <strong data-voice-pitch-val>${voiceConfig.pitch.toFixed(2)}</strong></label>
              <input id="admin-voice-pitch" name="pitch" type="range" min="0.75" max="1.20" step="0.02" value="${voiceConfig.pitch.toFixed(2)}" />
            </div>

            <div class="fadmin-field">
              <label for="admin-voice-volume">Volume padrão: <strong data-voice-vol-val>${Math.round(voiceConfig.volume * 100)}%</strong></label>
              <input id="admin-voice-volume" name="volume" type="range" min="0.20" max="1.00" step="0.05" value="${voiceConfig.volume.toFixed(2)}" />
            </div>
          </div>

          <div class="fadmin-field">
            <label for="admin-voice-test-phrase">Frase culinária para teste de pronúncia</label>
            <textarea id="admin-voice-test-phrase" name="testPhrase" rows="3">${esc(voiceTestPhrase || CHEF_VOICE_TEST_PHRASE)}</textarea>
          </div>

          <div class="fadmin-form-actions">
            <button type="button" class="fadmin-btn-cyan" data-action="admin-voice-test">▶ Ouvir Demonstração</button>
            <button type="button" class="fadmin-btn-ghost" data-action="admin-voice-stop">■ Parar Áudio</button>
            <button type="submit" class="fadmin-btn-amber">Salvar Configuração de Voz</button>
            <button type="button" class="fadmin-btn-ghost" data-action="admin-voice-reset">Restaurar Padrão</button>
          </div>
        </form>
      </section>
    `;
  } else {
    mainSectionHtml = `
      <section class="fadmin-card">
        <div class="fadmin-card-head">
          <div>
            <span class="fadmin-eyebrow">ARQUITETURA DE INTEGRAÇÕES</span>
            <h2>Estado das Conexões — Fase 1</h2>
            <p>Nenhuma integração externa é executada nesta primeira etapa. Toda a persistência usa serviços provisórios encapsulados para ativação na Fase 2.</p>
          </div>
        </div>

        <div class="fadmin-integrations-grid">
          ${PHASE_INTEGRATIONS.map(
            (integ) => `<article class="fadmin-integ-card">
              <div class="fadmin-course-head">
                <strong>${esc(integ.name)}</strong>
                <span class="fadmin-status-badge is-amber">${esc(integ.statusLabel)}</span>
              </div>
              <p>${esc(integ.phaseNote)}</p>
            </article>`
          ).join('')}
        </div>
      </section>
      ${governanceCardHtml}
    `;
  }

  return `<main class="fadmin-shell">
    <div class="fadmin-provisional-banner" role="note">
      <span>⚡ <strong>Modo Fase 1 (Provisório Local)</strong> — ${esc(PROVISIONAL_NOTICE_TEXT)}</span>
      <button type="button" class="fadmin-btn-ghost" data-action="home">← Voltar ao Site</button>
    </div>

    <div class="fadmin-layout">
      <aside class="fadmin-sidebar ${mobileMenuOpen ? 'is-open' : ''}" aria-label="Menu do Painel Administrativo">
        <div class="fadmin-brand">
          <div class="fadmin-brand-mark">FC</div>
          <div>
            <strong>Painel Administrativo</strong>
            <small>FerveC Control Center</small>
          </div>
        </div>

        <nav class="fadmin-nav">
          ${ADMIN_NAV.map(
            (item) => `<button
              type="button"
              class="fadmin-nav-item ${activeTab === item.id ? 'is-active' : ''} ${item.id === 'coupons' ? 'is-coupons' : ''}"
              data-action="admin-tab"
              data-tab="${item.id}"
            >
              <span class="fadmin-nav-ico" aria-hidden="true">${item.icon}</span>
              <span class="fadmin-nav-label">${esc(item.label)}</span>
              ${item.badge ? `<em class="fadmin-nav-badge">${esc(item.badge)}</em>` : ''}
            </button>`
          ).join('')}
        </nav>

        <div class="fadmin-sidebar-foot">
          <div class="fadmin-operator-card">
            <small>Operador (Prévia Fase 1)</small>
            <strong>${esc(adminDisplayName)}</strong>
            <span>${esc(adminEmail)}</span>
          </div>
          <button type="button" class="fadmin-btn-ghost fadmin-help-btn" data-action="help">Precisa de ajuda?</button>
        </div>
      </aside>

      <div class="fadmin-main">
        <header class="fadmin-topbar">
          <div class="fadmin-topbar-title">
            <button
              type="button"
              class="fadmin-mobile-toggle"
              data-action="admin-toggle-mobile-nav"
              aria-expanded="${mobileMenuOpen ? 'true' : 'false'}"
              aria-label="Abrir ou fechar menu administrativo"
            >☰ Menu</button>
            <div>
              <h1>${esc(ADMIN_NAV.find((n) => n.id === activeTab)?.label || 'Visão Geral')}</h1>
              <p>Acompanhe métricas locais, cupons promocionais, cursos e voz do Chef.</p>
            </div>
          </div>

          <div class="fadmin-topbar-pills">
            <span class="fadmin-status-pill is-amber"><i aria-hidden="true"></i> Supabase: aguardando integração</span>
            <span class="fadmin-status-pill is-amber"><i aria-hidden="true"></i> Asaas: aguardando configuração</span>
          </div>
        </header>

        <div class="fadmin-content">
          ${mainSectionHtml}
        </div>
      </div>
    </div>
  </main>`;
}
