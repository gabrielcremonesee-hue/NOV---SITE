export interface FinancialGuardConfig {
  allowPaidAi: boolean;
  allowExternalTts: boolean;
  dailyBudgetUsd: number;
  maxCallsPerUserDay: number;
  maxCallsPerMinute: number;
  maxChatInputChars: number;
  maxChatHistoryMessages: number;
  maxTtsChars: number;
}

export interface FinancialGuardTelemetry {
  dateKey: string;
  allowPaidAi: boolean;
  allowExternalTts: boolean;
  dailyBudgetUsd: number;
  estimatedSpendUsd: number;
  paidAiCallsToday: number;
  localFallbackCallsToday: number;
  externalTtsCallsToday: number;
  blockedCallsToday: number;
  circuitOpenUntilIso: string | null;
  lastBlockedReason: string | null;
}

interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  status?: number;
  mode: 'paid_ai' | 'local_programmed';
}

function getBrasiliaDateKey(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function readFinancialGuardConfig(
  env: Record<string, string | undefined> = process.env
): FinancialGuardConfig {
  const allowPaidAi = String(env.FERVEC_ALLOW_PAID_AI ?? 'false').trim().toLowerCase() === 'true';
  const allowExternalTts =
    String(env.FERVEC_ALLOW_EXTERNAL_TTS ?? 'false').trim().toLowerCase() === 'true';
  const budgetRaw = Number(env.FERVEC_AI_DAILY_BUDGET_USD ?? 0);
  const dailyBudgetUsd = Number.isFinite(budgetRaw) && budgetRaw >= 0 ? budgetRaw : 0;
  const userCapRaw = Number(env.FERVEC_AI_MAX_CALLS_PER_USER_DAY ?? (allowPaidAi ? 25 : 0));
  const maxCallsPerUserDay = Number.isFinite(userCapRaw) && userCapRaw >= 0 ? Math.floor(userCapRaw) : 0;
  const minCapRaw = Number(env.FERVEC_AI_MAX_CALLS_PER_MINUTE ?? 6);
  const maxCallsPerMinute = Number.isFinite(minCapRaw) && minCapRaw >= 1 ? Math.floor(minCapRaw) : 6;

  return {
    allowPaidAi,
    allowExternalTts,
    dailyBudgetUsd,
    maxCallsPerUserDay,
    maxCallsPerMinute,
    maxChatInputChars: 1200,
    maxChatHistoryMessages: 8,
    maxTtsChars: 1200,
  };
}

class FinancialGuardState {
  private dateKey = getBrasiliaDateKey();
  private estimatedSpendUsd = 0;
  private paidAiCallsToday = 0;
  private localFallbackCallsToday = 0;
  private externalTtsCallsToday = 0;
  private blockedCallsToday = 0;
  private consecutiveFailures = 0;
  private circuitOpenUntilMs = 0;
  private lastBlockedReason: string | null = null;
  private readonly perUserDayCalls = new Map<string, number>();
  private readonly rateWindowByKey = new Map<string, number[]>();

  private resetIfNewDay() {
    const today = getBrasiliaDateKey();
    if (today !== this.dateKey) {
      this.dateKey = today;
      this.estimatedSpendUsd = 0;
      this.paidAiCallsToday = 0;
      this.localFallbackCallsToday = 0;
      this.externalTtsCallsToday = 0;
      this.blockedCallsToday = 0;
      this.perUserDayCalls.clear();
    }
  }

  public checkRateLimit(bucketKey: string, maxPerMinute: number, nowMs = Date.now()): boolean {
    const cutoff = nowMs - 60_000;
    const prev = this.rateWindowByKey.get(bucketKey) || [];
    const recent = prev.filter((ts) => ts >= cutoff);
    if (recent.length >= maxPerMinute) {
      this.rateWindowByKey.set(bucketKey, recent);
      return false;
    }
    recent.push(nowMs);
    this.rateWindowByKey.set(bucketKey, recent);
    return true;
  }

  public tryConsumeChatQuota(
    userKey: string,
    cfg: FinancialGuardConfig = readFinancialGuardConfig(),
    nowMs = Date.now()
  ): QuotaCheckResult {
    this.resetIfNewDay();

    if (!this.checkRateLimit(`chat:${userKey}`, cfg.maxCallsPerMinute, nowMs)) {
      this.blockedCallsToday++;
      this.lastBlockedReason = 'rate_limit_minute';
      return {
        allowed: false,
        status: 429,
        mode: 'local_programmed',
        reason: 'Limite de perguntas por minuto atingido. Aguarde alguns segundos.',
      };
    }

    if (!cfg.allowPaidAi || cfg.dailyBudgetUsd <= 0 || cfg.maxCallsPerUserDay <= 0) {
      this.localFallbackCallsToday++;
      this.lastBlockedReason = 'kill_switch_zero_spend';
      return {
        allowed: true,
        mode: 'local_programmed',
        reason: 'Modo R$ 0 ativo (respostas programadas locais).',
      };
    }

    if (this.circuitOpenUntilMs > nowMs) {
      this.localFallbackCallsToday++;
      this.lastBlockedReason = 'circuit_breaker_open';
      return {
        allowed: true,
        mode: 'local_programmed',
        reason: 'Circuito de proteção ativo temporariamente.',
      };
    }

    const userCount = this.perUserDayCalls.get(userKey) || 0;
    if (userCount >= cfg.maxCallsPerUserDay) {
      this.blockedCallsToday++;
      this.lastBlockedReason = 'user_daily_cap';
      return {
        allowed: true,
        mode: 'local_programmed',
        reason: 'Cota diária de IA do usuário atingida — usando guia programado local.',
      };
    }

    const estimatedNextCost = 0.004;
    if (this.estimatedSpendUsd + estimatedNextCost > cfg.dailyBudgetUsd) {
      this.blockedCallsToday++;
      this.lastBlockedReason = 'global_daily_budget';
      return {
        allowed: true,
        mode: 'local_programmed',
        reason: 'Teto diário de gasto atingido — usando guia programado local.',
      };
    }

    this.perUserDayCalls.set(userKey, userCount + 1);
    this.paidAiCallsToday++;
    this.estimatedSpendUsd = Number((this.estimatedSpendUsd + estimatedNextCost).toFixed(4));
    return { allowed: true, mode: 'paid_ai' };
  }

  public canUseExternalTts(
    userKey: string,
    cfg: FinancialGuardConfig = readFinancialGuardConfig(),
    nowMs = Date.now()
  ): { allowed: boolean; status?: number; reason?: string } {
    this.resetIfNewDay();

    if (!this.checkRateLimit(`tts:${userKey}`, cfg.maxCallsPerMinute * 2, nowMs)) {
      this.blockedCallsToday++;
      this.lastBlockedReason = 'tts_rate_limit';
      return {
        allowed: false,
        status: 429,
        reason: 'Muitas requisições de leitura em sequência. Aguarde instantes.',
      };
    }

    if (!cfg.allowExternalTts) {
      this.blockedCallsToday++;
      this.lastBlockedReason = 'external_tts_disabled_zero_spend';
      return {
        allowed: false,
        status: 503,
        reason:
          'Narração neural externa desativada pela trava financeira (R$ 0). Utilize a voz local do navegador.',
      };
    }

    this.externalTtsCallsToday++;
    return { allowed: true };
  }

  public recordPaidAiSuccess() {
    this.consecutiveFailures = 0;
  }

  public recordPaidAiFailure(nowMs = Date.now()) {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= 3) {
      this.circuitOpenUntilMs = nowMs + 5 * 60_000;
      this.lastBlockedReason = 'circuit_breaker_tripped';
    }
  }

  public getTelemetry(cfg: FinancialGuardConfig = readFinancialGuardConfig()): FinancialGuardTelemetry {
    this.resetIfNewDay();
    return {
      dateKey: this.dateKey,
      allowPaidAi: cfg.allowPaidAi,
      allowExternalTts: cfg.allowExternalTts,
      dailyBudgetUsd: cfg.dailyBudgetUsd,
      estimatedSpendUsd: this.estimatedSpendUsd,
      paidAiCallsToday: this.paidAiCallsToday,
      localFallbackCallsToday: this.localFallbackCallsToday,
      externalTtsCallsToday: this.externalTtsCallsToday,
      blockedCallsToday: this.blockedCallsToday,
      circuitOpenUntilIso:
        this.circuitOpenUntilMs > Date.now() ? new Date(this.circuitOpenUntilMs).toISOString() : null,
      lastBlockedReason: this.lastBlockedReason,
    };
  }

  public resetForTests() {
    this.dateKey = getBrasiliaDateKey();
    this.estimatedSpendUsd = 0;
    this.paidAiCallsToday = 0;
    this.localFallbackCallsToday = 0;
    this.externalTtsCallsToday = 0;
    this.blockedCallsToday = 0;
    this.consecutiveFailures = 0;
    this.circuitOpenUntilMs = 0;
    this.lastBlockedReason = null;
    this.perUserDayCalls.clear();
    this.rateWindowByKey.clear();
  }
}

export const financialGuard = new FinancialGuardState();

interface KnowledgeRule {
  keywords: RegExp;
  reply: string;
}

const PROGRAMMED_CHEF_RULES: KnowledgeRule[] = [
  {
    keywords: /carbonara|ovo|ovos|talh|emuls|guanciale|pecorino/i,
    reply:
      'Na Carbonara clássica, o segredo para não talhar os ovos é retirar a frigideira do fogo antes de juntar a mistura de ovos pasteurizados, gema, Pecorino Romano e pimenta-do-reino. Adicione água do cozimento aos poucos e mexa vigorosamente até formar um creme brilhante. Importante: não use creme de leite e nunca afirme que o calor residual elimina patógenos — utilize ovos pasteurizados no padrão didático.',
  },
  {
    keywords: /alfredo|fettuccine|manteiga|parmigiano|mantecatura/i,
    reply:
      'No Fettuccine Alfredo tradicional, a cremosidade vem apenas da emulsão de manteiga sem sal em temperatura ambiente, Parmigiano-Reggiano ralado fino e água do cozimento rica em amido. Ajuste o cozimento da massa fresca à espessura real e trabalhe a mantecatura rapidamente para manter o molho sedoso sem creme de leite.',
  },
  {
    keywords: /arrabbiata|penne|pimenta|alho|peperoncino|calabresa/i,
    reply:
      'No Penne all’Arrabbiata, controle o fogo baixo para dourar levemente o alho no azeite extravirgem sem queimar (o que amargaria o molho). Junte o peperoncino ou pimenta calabresa e reduza o tomate pelado com seu líquido antes de finalizar o penne al dente com um pouco da água do cozimento.',
  },
  {
    keywords: /pesto|fusilli|manjeric|pinoli|almofariz|botul/i,
    reply:
      'No Fusilli al Pesto Genovese, seque muito bem as folhas de manjericão após a higienização, trabalhe no almofariz ou em pulsos curtos sem aquecer (evitando oxidação) e envolva a massa fora do fogo direto. Atenção de segurança alimentar: nunca armazene pesto com alho e azeite em temperatura ambiente — mantenha sob refrigeração ou congelamento e consuma rapidamente.',
  },
  {
    keywords: /rag[uù]|bolonhes|bolognese|tagliatelle|pancetta|sofrito|soffritto|massa fresca|sova|rasga/i,
    reply:
      'Para o Tagliatelle al Ragù alla Bolognese, sove a massa (400 g de farinha 00 e 4 ovos médios) por 15–20 minutos e respeite o descanso protegido de cerca de 30 minutos para relaxar o glúten — se a massa rasgar ao abrir, ela precisa descansar mais um pouco. O ragù leva soffritto delicado, pancetta fresca não defumada, carne bovina moída grossa, vinho, passata, extrato duplo e cozimento lento de 2 a 3 horas.',
  },
  {
    keywords: /pomodoro|burro|s[aá]lvia|ravioli|tortelli|acidez|manteiga dourada/i,
    reply:
      'Nos Molhos Essenciais: para o Pomodoro, reduza tomates pelados em azeite EV com manjericão fresco por 20–30 minutos para concentrar sabor sem açúcar obrigatório. Para o Burro e Salvia, derreta a manteiga suavemente controlando a temperatura para não queimar os sólidos do leite, liberando o aroma da sálvia antes de emulsionar com água do cozimento.',
  },
  {
    keywords: /vinho|vin[ií]cola|chianti|malbec|pinot|ros[eé]|prosecco|harmoniz/i,
    reply:
      'Na Vinícola FerveC: Chianti combina muito bem com molhos à base de tomate (Pomodoro e Arrabbiata) pela acidez viva; Pinot Grigio e Prosecco harmonizam com preparações leves ou amanteigadas (Burro e Salvia e entradas); Vinho Rosé acompanha pratos equilibrados; Malbec cai bem com ragù encorpado e carnes.',
  },
  {
    keywords: /sec|congel|higiene|rdc|216|alerg|temperatura|seguran/i,
    reply:
      'Seguimos rigorosamente a RDC 216/2004 da Anvisa: higienize as mãos e superfícies, lave e seque vegetais corretamente, previna contaminação cruzada e controle temperaturas de preparo e resfriamento. Os alérgenos principais (trigo/glúten, ovos, leite, pinoli) devem sempre ser observados separadamente. Para conservar massa fresca, seque em ninhos ou congele rapidamente em bandeja antes de ensacar.',
  },
];

export function getProgrammedChefReply(params: {
  question: string;
  context?: string;
}): string {
  const q = String(params.question || '').trim();
  const ctx = String(params.context || '').trim();
  const combined = `${q} ${ctx}`;

  for (const rule of PROGRAMMED_CHEF_RULES) {
    if (rule.keywords.test(combined)) {
      return `${rule.reply} (Guia programado FerveC — consulta local sem custo adicional.)`;
    }
  }

  return (
    'Sou o Chef CREMONESE no modo de orientação programada (R$ 0). Posso ajudar com Carbonara, Fettuccine Alfredo, Penne all’Arrabbiata, Fusilli al Pesto, Tagliatelle al Ragù, Pomodoro, Burro e Salvia, técnicas de massa fresca, segurança alimentar (RDC 216/2004) e harmonizações da Vinícola. Pergunte especificamente sobre qualquer receita ou etapa!'
  );
}
