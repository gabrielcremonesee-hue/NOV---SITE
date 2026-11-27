import type { CourseInfo, LessonStage, TechnicalSheet } from './courseData';

export const PASSING_SCORE_PERCENT = 70;
export const ASSESSMENT_BANK_VERSION = 'v2-2026-11';

export const ALL_MODULE_KEYS = [
  'carbonara',
  'alfredo',
  'arrabbiata',
  'pesto',
  'ragù',
  'sauces',
] as const;

export type ModuleKey = (typeof ALL_MODULE_KEYS)[number];

export interface PublicQuizQuestion {
  id: string;
  optionIds: [string, string, string, string];
  q: string;
  a: [string, string, string, string];
  tip?: string;
}

export interface PublicModuleSummary {
  id: ModuleKey;
  index: number;
  title: string;
  recipeTitle: string;
  subtitle: string;
  desc: string;
  region: string;
  yield: string;
  duration: string;
  level: string;
  technique: string;
  allergens: string;
  stepTags: string[];
  totalLessonSteps: number;
  totalWorkQuestions: number;
  totalExamQuestions: number;
}

export interface ProtectedCourseContentPayload {
  ok: true;
  course: CourseInfo;
  carbonara: {
    stages: LessonStage[];
    ingredients: string[];
    prep: string[];
    reviewItems: [string, string][];
    techSheet: TechnicalSheet;
  };
  extraRecipes: Array<{
    id: string;
    photo?: string;
    title: string;
    subtitle: string;
    region: string;
    yield: string;
    duration: string;
    level: string;
    technique: string;
    adaptation: string;
    ingredients: string[];
    allergens: string;
    editorialAlert?: string;
    sauceCards?: Array<{
      name: string;
      intro: string;
      ingredients: string[];
      steps: string[];
      tip: string;
    }>;
    steps: [string, string, string][];
    techniques: string[];
    errors: string[];
    chefTip: string;
    imageStatus: string;
    techSheet: TechnicalSheet;
    technicalSheets?: Array<{ code: string; title: string; sheet: TechnicalSheet }>;
    assemblyGuide?: { title: string; reference: string; points: string[] };
  }>;
}

export const course: CourseInfo = {
  title: 'Massas italianas',
  subtitle: 'Módulo 1 · Fundamentos das Massas Italianas: Spaghetti alla Carbonara',
  description:
    'Entre na cozinha com o Chef Cremonese e domine os fundamentos das massas italianas por meio do Spaghetti alla Carbonara: cocção al dente, renderização de guanciale, emulsão com ovos pasteurizados e segurança alimentar.',
  chef: 'Chef CREMONESE',
  servings: '2 porções',
  duration: '25–30 min',
  level: 'Para começar',
  recipe: 'Spaghetti alla Carbonara',
};

export const introText =
  'Olá! Seja muito bem-vinda ao FerveC Gastronomia! Eu sou o Chef CREMONESE e vou acompanhar você nessa experiência. Aqui vamos aprender juntos, com rigor técnico, cuidado sanitário e explicação clara. Organize os ingredientes com segurança, porque hoje vamos colocar a mão na massa!';

export const ingredients: string[] = [
  '200 g de spaghetti',
  '100 g de guanciale (sem pele, cortado em tiras ou cubos uniformes)',
  '2 ovos inteiros pasteurizados',
  '1 gema pasteurizada adicional',
  '50 g de Pecorino Romano ralado fino (reservar parte para finalizar)',
  'Pimenta-do-reino preta moída na hora',
  'Sal para a água do cozimento (uso moderado)',
  'Água do cozimento da massa, quanto baste',
];

export const prep: string[] = [
  'Higienizar mãos, bancada, tábuas e utensílios separando alimentos crus de prontos (Anvisa RDC 216/2004).',
  'Conferir todos os ingredientes e lembrar que a proporção (200 g para 2 porções) é padronização didática FerveC.',
  'Conferir a retirada da pele dura do guanciale (se houver) e garantir corte em tiras ou cubos uniformes.',
  'Ralar fino os 50 g de Pecorino Romano e reservar parte dele para a finalização no prato.',
  'Separar os 2 ovos inteiros pasteurizados e 1 gema pasteurizada adicional mantidos sob refrigeração até o uso.',
  'Deixar os 200 g de spaghetti disponíveis, moedor de pimenta-do-reino e sal moderado.',
  'Separar panela ampla, frigideira, tigela, concha para água do cozimento, ralador fino, escorredor e pegador.',
];

// Prévia pública exclusiva da Etapa 0 (Módulo 1) para degustação antes da matrícula
export const CARBONARA_PREVIEW_STAGE: LessonStage = {
  title: 'Mise en place e água do cozimento',
  tag: 'Água',
  photo: '/assets/spaghetti-water.svg',
  alt: 'Spaghetti entrando em uma panela com água fervente, imagem ilustrativa',
  caption: 'Água e spaghetti · imagem ilustrativa',
  intro:
    'Começamos pela higiene da bancada e pelo preparo da água em panela ampla. Como o guanciale e o Pecorino Romano já são curados e salgados, o sal da água deve ser dosado com moderação.',
  body: 'Higienize as mãos, superfícies e utensílios conforme boas práticas (Anvisa RDC 216/2004), mantendo carnes e ovos crus separados de itens prontos. Leve uma panela ampla com água ao fogo até fervura constante e tempere com sal de forma moderada.',
  tip: 'A água do cozimento retém amido liberado pela massa e deve ser reservada para ajustar a emulsão sem recorrer a creme de leite.',
  warning:
    'Fogão, panela e água fervente oferecem risco de queimadura. Lave as mãos antes de manipular alimentos e evite contaminação cruzada entre tábua de curados, ovos e utensílios de finalização.',
  micro: [
    'Higienize as mãos, bancada, tábua e utensílios antes de iniciar.',
    'Leve panela ampla com água ao fogo até fervura constante.',
    'Adicione sal moderadamente, considerando o sódio do Pecorino e do guanciale.',
  ],
  quote:
    'Cozinha segura começa antes do fogo: mãos limpas, utensílios separados e sal equilibrado para respeitar o queijo e o guanciale.',
  audioScript:
    'Antes de cozinhar, lave bem as mãos e organize a bancada separando utensílios de alimentos crus e prontos. Ferva água em panela ampla e tempere com sal moderado, pois guanciale e Pecorino já trazem salinidade.',
};

export const CARBONARA_PUBLIC_STAGE_TAGS: string[] = [
  'Água',
  'Guanciale',
  'Spaghetti',
  'Ovos + queijo',
  'Emulsão',
  'Montagem',
];

export const reviewItems: [string, string][] = [
  [
    'Água moderada e rica em amido',
    'Tempere a água considerando que guanciale e Pecorino são salgados, e reserve parte do líquido antes de escorrer.',
  ],
  [
    'Guanciale uniforme e sem pele',
    'Doure lentamente na própria gordura em fogo baixo, reservando parte crocante e controlando o excesso de gordura.',
  ],
  [
    'Ovos pasteurizados e sem creme de leite',
    'Use ovos pasteurizados por segurança microbiológica; reserve parte do Pecorino para finalizar no prato.',
  ],
  [
    'Emulsão fora do fogo direto',
    'Afaste a frigideira da chama antes de juntar ovos e queijo, ajustando a textura com água amilácea aos poucos.',
  ],
];

export const PUBLIC_MODULES: PublicModuleSummary[] = [
  {
    id: 'carbonara',
    index: 1,
    title: 'Fundamentos das Massas Italianas: Carbonara',
    recipeTitle: 'Spaghetti alla Carbonara',
    subtitle: 'Módulo 1 · Fundamentos das Massas Italianas: Spaghetti alla Carbonara',
    desc: 'Controle de sal, guanciale sem pele, ovos pasteurizados como padrão didático, emulsão fora do fogo direto e segurança alimentar.',
    region: 'Roma e Lácio (Itália)',
    yield: '2 porções',
    duration: '25–30 min',
    level: 'Para começar',
    technique: 'Emulsão fora do fogo direto e ponto al dente',
    allergens: 'TRIGO (GLÚTEN), OVOS e LEITE.',
    stepTags: CARBONARA_PUBLIC_STAGE_TAGS,
    totalLessonSteps: 6,
    totalWorkQuestions: 6,
    totalExamQuestions: 8,
  },
  {
    id: 'alfredo',
    index: 2,
    title: 'Massas Frescas e Emulsificação: Fettuccine Alfredo',
    recipeTitle: 'Fettuccine Alfredo',
    subtitle: 'Massas Frescas e Emulsificação: a tradição romana da mantecatura',
    desc: 'Padronizado com 400 g de fettuccine fresco, 100 g de manteiga e 240 g de Parmigiano-Reggiano (24 meses), sem creme de leite, com fabricação artesanal da massa.',
    region: 'Roma (Itália)',
    yield: '4 porções',
    duration: '25–35 min',
    level: 'Intermediária',
    technique: 'Massa fresca artesanal, emulsificação e mantecatura',
    allergens: 'TRIGO (GLÚTEN), OVOS e LEITE.',
    stepTags: ['Mise', 'Água', 'Fettuccine', 'Travessa', 'Emulsão', 'Mantecatura', 'Serviço'],
    totalLessonSteps: 7,
    totalWorkQuestions: 6,
    totalExamQuestions: 8,
  },
  {
    id: 'arrabbiata',
    index: 3,
    title: 'Massas Tubulares e Molhos Picantes: Penne all’Arrabbiata',
    recipeTitle: 'Penne all’Arrabbiata',
    subtitle: 'Massas Tubulares e Molhos Picantes: infusão aromática e picância equilibrada',
    desc: 'Massa tubular penne rigate seca (320 g didáticos) com infusão controlada de alho e peperoncino/pimenta calabresa e redução integral de tomate pelado.',
    region: 'Roma e Lácio (Itália)',
    yield: '4 porções',
    duration: '30–35 min',
    level: 'Essencial',
    technique: 'Infusão aromática controlada e redução ácida de tomate',
    allergens: 'TRIGO (GLÚTEN) e LEITE (se Pecorino opcional).',
    stepTags: ['Mise', 'Infusão', 'Tomate', 'Penne', 'Mantecatura', 'Finalização', 'Serviço'],
    totalLessonSteps: 7,
    totalWorkQuestions: 6,
    totalExamQuestions: 8,
  },
  {
    id: 'pesto',
    index: 4,
    title: 'Molhos Clássicos da Ligúria: Pesto Genovese',
    recipeTitle: 'Fusilli al Pesto Genovese',
    subtitle: 'Molhos Clássicos da Ligúria: extração fria, textura e segurança alimentar',
    desc: 'Molho cru da Ligúria em 10 etapas (60 g manjericão, 30 g pinoli, 50 g Parmigiano, 25 g Pecorino Sardo, 70 ml azeite) sobre fusilli didático, com conservação segura.',
    region: 'Gênova e Ligúria (Itália)',
    yield: '4 porções',
    duration: '30–40 min',
    level: 'Intermediária',
    technique: 'Maceração a frio e proteção enzimática da clorofila',
    allergens: 'TRIGO (GLÚTEN), LEITE e PINOLI (oleaginosa).',
    stepTags: ['Higiene', 'Folhas', 'Base', 'Queijos', 'Azeite', 'Fusilli', 'Emulsão', 'Serviço', 'Conservação', 'Alergênicos'],
    totalLessonSteps: 10,
    totalWorkQuestions: 6,
    totalExamQuestions: 8,
  },
  {
    id: 'ragù',
    index: 5,
    title: 'Massa Artesanal e Cozimento Lento: Tagliatelle al Ragù',
    recipeTitle: 'Tagliatelle al Ragù alla Bolognese',
    subtitle: 'Massa Artesanal e Cozimento Lento: fichas técnicas independentes',
    desc: 'Baseado na Accademia Italiana della Cucina (2023): fichas separadas (massa 4 porções; ragù 6 porções), carne moída grossa, pancetta fresca, soffritto e cozimento lento.',
    region: 'Bolonha e Emília-Romanha (Itália)',
    yield: 'Massa 4 porções · Ragù 6 porções',
    duration: '65–75 min',
    level: 'Clássica aprofundada',
    technique: 'Laminação artesanal e cocção lenta em caldo e vinho',
    allergens: 'TRIGO (GLÚTEN), OVOS, LEITE (se usado) e SALSÃO.',
    stepTags: ['Massa', 'Sova', 'Laminação', 'Pancetta', 'Soffritto', 'Carne', 'Vinho', 'Cocção', 'Montagem'],
    totalLessonSteps: 9,
    totalWorkQuestions: 6,
    totalExamQuestions: 8,
  },
  {
    id: 'sauces',
    index: 6,
    title: 'Molhos Essenciais Italianos: Pomodoro e Burro e Salvia',
    recipeTitle: 'Molhos Essenciais: Pomodoro & Burro e Salvia',
    subtitle: 'Molhos Essenciais Italianos: controle de acidez e manteiga emulsionada',
    desc: 'Pomodoro (redução de 20–30 min para 320–400 g de massa seca, sem açúcar obrigatório) ao lado de Burro e Salvia (100 g manteiga para ravioli e tortelli).',
    region: 'Itália (Tradição Clássica)',
    yield: '4 porções por molho',
    duration: '30–40 min',
    level: 'Essencial versátil',
    technique: 'Redução controlada de tomate e emulsão de manteiga aromatizada',
    allergens: 'TRIGO (GLÚTEN) e LEITE (manteiga/queijo).',
    stepTags: ['Mise', 'Pomodoro', 'Redução', 'Manteiga', 'Sálvia', 'Massa', 'Emulsão', 'Finalização'],
    totalLessonSteps: 8,
    totalWorkQuestions: 6,
    totalExamQuestions: 8,
  },
];

export function parseDurationMinutes(label: string): { min: number; max: number } {
  const clean = String(label || '').toLowerCase().trim();
  if (!clean) return { min: 0, max: 0 };
  const nums = clean.match(/\d+(?:[.,]\d+)?/g)?.map((n) => Number(n.replace(',', '.'))) ?? [];
  if (nums.length === 0) return { min: 0, max: 0 };
  const isHours = /\bhoras?\b|\bh\b/.test(clean) && !/\bmin/.test(clean);
  const factor = isHours ? 60 : 1;
  if (nums.length >= 2) {
    return {
      min: Math.min(nums[0], nums[1]) * factor,
      max: Math.max(nums[0], nums[1]) * factor,
    };
  }
  return { min: nums[0] * factor, max: nums[0] * factor };
}

export function formatWorkloadFromMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (safeMinutes <= 0) return '0 minutos';
  const hours = Math.floor(safeMinutes / 60);
  const remMinutes = safeMinutes % 60;
  const hourWord = hours === 1 ? 'hora' : 'horas';
  const minWord = remMinutes === 1 ? 'minuto' : 'minutos';
  if (hours === 0) return `${safeMinutes} ${safeMinutes === 1 ? 'minuto' : 'minutos'}`;
  if (remMinutes === 0) return `${hours} ${hourWord}`;
  return `${hours} ${hourWord} e ${remMinutes} ${minWord}`;
}

export function computeCourseWorkloadLabel(durationLabels: string[]): string {
  if (!Array.isArray(durationLabels) || durationLabels.length === 0) return '4 horas';
  let minSum = 0;
  let maxSum = 0;
  for (const label of durationLabels) {
    const parsed = parseDurationMinutes(label);
    minSum += parsed.min;
    maxSum += parsed.max;
  }
  const total = Math.round((minSum + maxSum) / 2);
  return total > 0 ? formatWorkloadFromMinutes(total) : '4 horas';
}

export function formatBrDate(isoOrDate: string | Date): string {
  const dt = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(dt.getTime())) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
}
