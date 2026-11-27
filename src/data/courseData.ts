export interface CourseInfo {
  title: string;
  subtitle: string;
  description: string;
  chef: string;
  servings: string;
  duration: string;
  level: string;
  recipe: string;
}

export interface LessonStage {
  title: string;
  tag: string;
  photo: string;
  alt: string;
  caption: string;
  intro: string;
  body: string;
  tip: string;
  warning: string;
  micro: string[];
  quote: string;
  timer?: boolean;
  highlight?: boolean;
  finish?: boolean;
  audioScript?: string;
}

export const QUESTION_OPTION_KEYS = ['a', 'b', 'c', 'd'] as const;
export type QuestionOptionKey = (typeof QUESTION_OPTION_KEYS)[number];

export interface QuizQuestion {
  id: string;
  optionIds: [string, string, string, string];
  correctOptionId: string;
  q: string;
  a: [string, string, string, string];
  correct: number;
  why: string;
  tip: string;
}

export interface TechnicalSheet {
  originalName: string;
  portugueseExplanation: string;
  region: string;
  yield: string;
  portionQuantity: string;
  prepTime: string;
  cookTime: string;
  totalEstimatedTime: string;
  workloadDistinction: string;
  difficulty: string;
  ingredients: string[];
  utensils: string[];
  miseEnPlace: string[];
  detailedSteps: string[];
  techniques: string[];
  controlPoints: string[];
  expectedResult: string;
  errorsAndFixes: string[];
  chefTips: string[];
  allergens: string;
  conservation: string;
  foodSafetyNotes: string[];
  references: { label: string; url: string }[];
  didacticAdaptations: string;
  practicalValidationStatus: string;
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

export const stages: LessonStage[] = [
  {
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
  },
  {
    title: 'Preparando o guanciale',
    tag: 'Guanciale',
    photo: '/assets/guanciale-pan.svg',
    alt: 'Guanciale dourando lentamente numa frigideira, imagem ilustrativa',
    caption: 'Guanciale dourando na própria gordura · imagem ilustrativa',
    intro:
      'O guanciale traz aroma e untuosidade. Retire a pele dura externa quando presente, corte em tiras ou cubos uniformes e renderize a gordura devagar, sem óleo adicional.',
    body: 'Com o guanciale previamente limpo (sem pele/couraça dura) e cortado em tiras ou cubos uniformes, leve à frigideira em fogo baixo a médio para renderizar sua própria gordura. Quando estiver dourado e crocante, retire e reserve parte do guanciale para a montagem, controlando também a quantidade de gordura que permanecerá na frigideira.',
    tip: 'Retirar a pele e manter corte uniforme garante cozimento regular. Reservar parte do guanciale crocante preserva textura contrastante no prato final, e remover eventual excesso de gordura evita molho pesado.',
    warning:
      'Não demonstramos corte com faca sem supervisão: use o guanciale já preparado ou peça apoio responsável. Cuidado com respingos de gordura quente e faça higienização imediata da tábua usada no curado.',
    micro: [
      'Verifique se a pele dura foi removida e se as tiras ou cubos estão uniformes.',
      'Doure em fogo baixo a médio na própria gordura, sem adicionar óleo ou manteiga.',
      'Reserve parte do guanciale crocante para a montagem e controle o excesso de gordura na frigideira.',
    ],
    quote:
      'Corte uniforme, fogo gentil e zero óleo extra: deixamos o guanciale liberar a própria gordura, reservando uma parte crocante para coroar o prato.',
    audioScript:
      'Retire a pele do guanciale se houver e trabalhe com tiras ou cubos uniformes. Doure devagar na própria gordura, sem queimar. Reserve parte crocante para finalizar e descarte o excesso de gordura se houver sobra na frigideira.',
  },
  {
    title: 'Cozinhando o spaghetti',
    tag: 'Spaghetti',
    photo: '/assets/spaghetti-water.svg',
    alt: 'Spaghetti sendo colocado na panela de água fervente, imagem ilustrativa',
    caption: 'Cozimento al dente e reserva da água · imagem ilustrativa',
    intro:
      'O spaghetti cozinha até ficar al dente e fornece água rica em amido. Reserve essa água antes de escorrer.',
    body: 'Coloque os 200 g de spaghetti na água fervente salgada e use o tempo da embalagem apenas como referência inicial. Prove com cuidado instantes antes do término para confirmar o ponto al dente (cozido por dentro, firme à mordida). Reserve uma xícara da água do cozimento rica em amido antes de escorrer.',
    tip: 'A água rica em amido estabiliza a ligação entre gordura do guanciale, Pecorino e ovos, garantindo brilho sem excesso de gordura.',
    warning:
      'Água fervente e vapor oferecem risco de queimadura. Utilize pegador ou escorredor com apoio firme e reserve a água com uma concha antes de escorrer na pia.',
    micro: [
      'Use o tempo da embalagem como guia no cronômetro e mexa nos primeiros minutos.',
      'Prove com segurança para confirmar o ponto al dente.',
      'Reserve parte da água rica em amido antes de escorrer o spaghetti.',
    ],
    quote:
      'Antes de escorrer a massa, separe sua água do cozimento: esse caldo rico em amido é a chave da emulsão.',
    timer: true,
    audioScript:
      'Cozinhe os 200 gramas de spaghetti em água fervente com sal moderado. Use o tempo da embalagem como referência, prove para checar o ponto al dente e lembre de reservar a água do cozimento antes de escorrer.',
  },
  {
    title: 'Mistura de ovos pasteurizados e queijo',
    tag: 'Ovos + queijo',
    photo: '/assets/egg-pecorino.svg',
    alt: 'Mistura de ovos pasteurizados, gema, Pecorino Romano e pimenta em tigela, imagem ilustrativa',
    caption: 'Base de ovos pasteurizados e Pecorino · imagem ilustrativa',
    intro:
      'Preparamos o creme base sem creme de leite: ovos pasteurizados, Pecorino Romano ralado fino e pimenta-do-reino moída na hora. Reservamos parte do Pecorino para a finalização.',
    body: 'Em tigela limpa, bata 2 ovos inteiros pasteurizados, 1 gema pasteurizada adicional, cerca de dois terços dos 50 g de Pecorino Romano ralado fino (reservando o restante para o acabamento do prato) e pimenta-do-reino preta moída na hora até ficar homogêneo. Não utilize creme de leite na formulação tradicional.',
    tip: 'Adotamos ovos pasteurizados como padrão didático sempre que a receita utiliza cocção branda. Em serviços de alimentação, observe as normas sanitárias brasileiras (Anvisa RDC 216/2004) e tratamentos térmicos controlados.',
    warning:
      'ATENÇÃO SANITÁRIA: O calor residual da massa NÃO garante a eliminação de microrganismos patogênicos (como Salmonella), e textura, cor ou cremosidade NÃO comprovam segurança microbiológica. Use ovos pasteurizados e evite manter ovos crus fora de refrigeração.',
    micro: [
      'Separe 2 ovos inteiros pasteurizados e 1 gema pasteurizada adicional.',
      'Misture com parte dos 50 g de Pecorino ralado fino (reservando fração para finalizar) e pimenta moída na hora.',
      'Bata até obter pasta uniforme, sem adicionar creme de leite.',
    ],
    quote:
      'Cremosidade e brilho não são atestado de segurança alimentar: o padrão didático usa ovos pasteurizados e nada de creme de leite.',
    audioScript:
      'Misture os dois ovos inteiros pasteurizados, uma gema pasteurizada, pimenta-do-reino moída na hora e parte dos 50 gramas de Pecorino Romano, reservando o restante para o prato. Lembre: a cremosidade não comprova segurança microbiológica, e o calor residual não garante eliminação de patógenos.',
  },
  {
    title: 'Emulsão fora do fogo direto',
    tag: 'Emulsão',
    photo: '/assets/carbonara-emulsion.svg',
    alt: 'Spaghetti envolvido em emulsão cremosa fora do fogo direto, imagem ilustrativa',
    caption: 'Mantecatura e emulsão fora da chama · imagem ilustrativa',
    intro:
      'Unimos massa, quantidade controlada de gordura do guanciale, mistura de ovos pasteurizados e água do cozimento fora do fogo direto.',
    body: 'Transfira o spaghetti escorrido para a frigideira com a gordura controlada do guanciale (e parte do guanciale). Afaste completamente a frigideira do calor direto antes de verter a mistura de ovos e queijo. Mexa continuamente, adicionando água do cozimento aos poucos para formar emulsão sedosa sem coagular os ovos em grumos.',
    tip: 'Se a frigideira estiver quente demais, aguarde alguns segundos antes de juntar os ovos. Água do cozimento entra colher a colher conforme a viscosidade desejada.',
    warning:
      'Calor excessivo coagula as proteínas do ovo e transforma o molho em ovo mexido. Mantenha longe da chama ao emulsionar e respeite os cuidados térmicos.',
    micro: [
      'Envolva o spaghetti na frigideira com quantidade controlada da gordura do guanciale.',
      'Afaste completamente do calor direto antes de adicionar os ovos pasteurizados.',
      'Mexa sem parar e ajuste a cremosidade com água do cozimento aos poucos.',
    ],
    quote:
      'Longe do fogo direto, movimento contínuo e água do cozimento aos poucos constroem a emulsão cremosa.',
    highlight: true,
    audioScript:
      'Envolva o spaghetti na frigideira com a gordura controlada do guanciale e afaste do fogo direto. Só então junte a mistura de ovos pasteurizados e Pecorino, mexendo rápido e dosando água do cozimento aos poucos para evitar coagulação.',
  },
  {
    title: 'Montagem e serviço imediato',
    tag: 'Montagem',
    photo: '/assets/carbonara-final.svg',
    alt: 'Spaghetti alla Carbonara servido com guanciale reservado, Pecorino e pimenta, imagem ilustrativa',
    caption: 'Carbonara finalizada · imagem ilustrativa',
    intro:
      'A Carbonara não espera na bancada: sirva imediatamente após finalizar, distribuindo os elementos reservados.',
    body: 'Sirva o spaghetti imediatamente em pratos aquecidos ou limpos, distribua por cima o guanciale crocante reservado e finalize com a fração reservada de Pecorino Romano e pimenta-do-reino moída na hora. Consuma na hora; não armazene sobras à temperatura ambiente.',
    tip: 'Esta formulação (200 g de spaghetti para 2 porções) é uma padronização didática da FerveC; na tradição romana existem variações de proporção entre massa, gema, ovo inteiro e queijo.',
    warning:
      'Alergênicos presentes: trigo (glúten), ovos e leite (Pecorino Romano). Sempre confira rótulos de ingredientes industrializados e evite contaminação cruzada. Sirva imediatamente; não reaproveite preparação à temperatura ambiente.',
    micro: [
      'Sirva o spaghetti imediatamente após atingir o brilho da emulsão.',
      'Finalize com o guanciale crocante reservado, Pecorino reservado e pimenta.',
      'Consuma na hora e aplique regras sanitárias para qualquer descarte ou refrigeração.',
    ],
    quote:
      'Serviço imediato, guanciale crocante no topo e Pecorino reservado: é assim que a emulsão chega intacta à mesa.',
    finish: true,
    audioScript:
      'Sirva imediatamente após finalizar, acomodando o guanciale crocante reservado, o Pecorino reservado e pimenta-do-reino fresca. Atenção aos alergênicos trigo, ovos, leite e glúten.',
  },
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

export const carbonaraTechSheet: TechnicalSheet = {
  originalName: 'Spaghetti alla Carbonara',
  portugueseExplanation:
    'Espaguete à Carbonara — massa longa seca envolvida em emulsão de ovos pasteurizados, Pecorino Romano, pimenta-do-reino preta e gordura controlada de guanciale, sem creme de leite.',
  region: 'Roma e Lácio (Itália)',
  yield: '2 porções (versão didática FerveC)',
  portionQuantity:
    'Aproximadamente 100 g de massa seca crua por pessoa (peso final cozido por porção sujeito a validação prática em bancada)',
  prepTime: '10–15 min (mise en place e separação)',
  cookTime: '12–15 min (cocção da massa, renderização do guanciale e emulsão)',
  totalEstimatedTime: '25–30 min culinários',
  workloadDistinction:
    'Tempo culinário de preparo na cozinha (25–30 min); distinto da carga horária pedagógica do curso completo exibida no certificado.',
  difficulty: 'Para começar (atenção especial ao controle térmico na emulsão)',
  ingredients,
  utensils: [
    'Panela ampla para cocção da massa',
    'Frigideira larga para o guanciale e mantecatura',
    'Tigela média para mistura de ovos pasteurizados e queijo',
    'Ralador fino, concha, pegador, escorredor e tábua higienizada',
    'Termômetro culinário de contato/imersão (recomendado em serviço profissional para controle térmico)',
  ],
  miseEnPlace: prep,
  detailedSteps: stages.map((st, idx) => `${idx + 1}. ${st.title}: ${st.body}`),
  techniques: [
    'Limpeza (retirada de pele) e corte uniforme do guanciale',
    'Renderização gradual de gordura sem óleo adicional e controle do excesso lipídico',
    'Cocção al dente em água moderadamente salgada com reserva de água amilácea',
    'Preparo de base cremosa sem creme de leite com ovos pasteurizados',
    'Emulsificação por calor residual fora do fogo direto e movimento contínuo',
    'Montagem com elementos reservados e serviço imediato',
  ],
  controlPoints: [
    'Moderação do sal da água em razão da salinidade natural do guanciale e do Pecorino Romano.',
    'Controle da temperatura da frigideira ao renderizar o guanciale (dourado, sem queimar) e remoção de excesso de gordura.',
    'Afastamento total do calor direto antes de adicionar a mistura de ovos pasteurizados para evitar coagulação.',
    'Segurança microbiológica: usar ovos pasteurizados; calor residual da massa não garante eliminação de patógenos e cremosidade não comprova segurança.',
  ],
  expectedResult:
    'Massa al dente envolta por molho liso, brilhante e aveludado, sem grumos de ovo coagulado, com excesso de gordura controlado, contraste crocante do guanciale reservado e aroma fresco de Pecorino e pimenta.',
  errorsAndFixes: [
    'Ovos coagulados (aspecto de ovo mexido): temperatura alta ou contato com fogo direto; para evitar, afaste a frigideira da chama, deixe amornar por alguns segundos e adicione água do cozimento em movimento constante.',
    'Molho seco ou espesso demais: ajuste aos poucos com colheres de água do cozimento rica em amido.',
    'Prato excessivamente salgado: reduza o sal da água na próxima execução e respeite a proporção do Pecorino.',
    'Excesso de gordura livre no fundo do prato: escorra parte da gordura renderizada do guanciale antes de incorporar a massa e emulsione com água amilácea.',
    'Guanciale queimado ou amargo: controle o calor em fogo baixo a médio desde o início; se queimar, descarte e reinicie.',
  ],
  chefTips: [
    'Não use creme de leite na versão tradicional: a textura cremosa nasce da emulsão entre gordura do guanciale, queijo ralado fino, ovos pasteurizados e amido da água.',
    'Separe parte do guanciale crocante e parte do Pecorino antes de finalizar na panela para garantir textura e apresentação no prato.',
  ],
  allergens:
    'ALERGÊNICOS (Anvisa RDC 727/2022): Contém TRIGO, OVOS e LEITE (Pecorino Romano). CONTÉM GLÚTEN. Verificar rótulos de ingredientes industrializados e prevenir contaminação cruzada.',
  conservation:
    'Consumo imediato após o preparo. Não manter preparação à temperatura ambiente. Para serviços de alimentação, observar integralmente a Anvisa RDC 216/2004 (controle de tempo/temperatura, resfriamento rápido sob refrigeração <= 5 °C caso aplicável e ausência de prazos de validade sem validação técnica).',
  foodSafetyNotes: [
    'Uso de ovos pasteurizados como padrão didático para receitas sem cocção térmica completa validada.',
    'Higiene rigorosa das mãos, bancada e utensílios (RDC 216/2004), prevenindo contaminação cruzada entre carne curada crua, ovos crus e superfície de montagem.',
    'O calor residual da massa não substitui tratamento térmico validado nem garante eliminação de patógenos.',
  ],
  references: [
    {
      label: 'Turismo Roma — Spaghetti alla Carbonara',
      url: 'https://www.turismoroma.it/it/pagina/spaghetti-alla-carbonara',
    },
    {
      label: 'Anvisa — Boas Práticas para Serviços de Alimentação (RDC 216/2004)',
      url: 'https://www.gov.br/anvisa/pt-br/assuntos/alimentos',
    },
    {
      label: 'Anvisa — Rotulagem de Alergênicos (RDC 727/2022)',
      url: 'https://www.gov.br/anvisa/pt-br/assuntos/alimentos/rotulagem',
    },
    {
      label: 'FDA — Egg Safety (Manipulação Segura de Ovos)',
      url: 'https://www.fda.gov/food/buy-store-serve-safe-food/what-you-need-know-about-egg-safety',
    },
  ],
  didacticAdaptations:
    'As quantidades (200 g de spaghetti, 100 g de guanciale, 2 ovos + 1 gema e 50 g de Pecorino Romano para 2 porções) são padronização didática da FerveC com adoção obrigatória de ovos pasteurizados; não representam a única formulação tradicional existente.',
  practicalValidationStatus:
    'Ficha tecnicamente revisada conforme referências; validação física de rendimento cozido e pesagem final em bancada pendente.',
};

export const questions: QuizQuestion[] = [
  {
    id: 'carb-w1',
    optionIds: ['carb-w1-a', 'carb-w1-b', 'carb-w1-c', 'carb-w1-d'],
    correctOptionId: 'carb-w1-b',
    q: 'Antes de dourar o guanciale na Carbonara, qual preparo garante cozimento regular e liberação limpa de gordura?',
    a: [
      'Cozinhar o guanciale diretamente na água fervente junto com o spaghetti.',
      'Retirar a pele dura quando presente, cortar em tiras ou cubos uniformes e dourar na própria gordura sem óleo adicional.',
      'Passar na farinha de trigo e fritar em manteiga escura para formar crosta.',
      'Bater o guanciale cru com Pecorino Romano antes de ir à frigideira.',
    ],
    correct: 1,
    why: 'A retirada da pele dura evita partes rígidas, o corte uniforme garante douramento homogêneo e o guanciale rende sua própria gordura em fogo brando.',
    tip: 'Doure em fogo baixo a médio e reserve parte do guanciale crocante para finalizar o prato.',
  },
  {
    id: 'carb-w2',
    optionIds: ['carb-w2-a', 'carb-w2-b', 'carb-w2-c', 'carb-w2-d'],
    correctOptionId: 'carb-w2-d',
    q: 'Por que a água do cozimento do spaghetti na Carbonara recebe sal de forma moderada em comparação a molhos leves de tomate?',
    a: [
      'Porque o sal impede o amido do spaghetti de passar para a água.',
      'Porque o sal bloqueia a absorção de pimenta-do-reino pela massa.',
      'Porque o uso de ovos pasteurizados dispensa completamente sódio no prato.',
      'Porque o guanciale curado e o Pecorino Romano já aportam salinidade elevada ao conjunto.',
    ],
    correct: 3,
    why: 'Tanto o guanciale quanto o Pecorino Romano são produtos curados ricos em sódio; moderar o sal da água evita desequilíbrio salino ao final.',
    tip: 'Pense sempre na salinidade somada de água, queijo curado e curado suíno antes de temperar.',
  },
  {
    id: 'carb-w3',
    optionIds: ['carb-w3-a', 'carb-w3-b', 'carb-w3-c', 'carb-w3-d'],
    correctOptionId: 'carb-w3-a',
    q: 'Qual formulação compõe a mistura cremosa da Carbonara ensinada pela FerveC e qual item fica fora da receita tradicional?',
    a: [
      '2 ovos inteiros pasteurizados, 1 gema pasteurizada adicional, Pecorino Romano ralado fino e pimenta-do-reino; sem creme de leite.',
      '100 ml de creme de leite fresco, 2 ovos inteiros e queijo mussarela ralado.',
      'Leite integral aquecido, amido de milho e manteiga derretida.',
      'Apenas claras batidas com ricota fresca, reservando todas as gemas cruas.',
    ],
    correct: 0,
    why: 'A cremosidade tradicional resulta da emulsão entre ovos, Pecorino Romano, gordura do guanciale e água rica em amido — sem creme de leite.',
    tip: 'Separe cerca de um terço dos 50 g de Pecorino para o acabamento final nos pratos.',
  },
  {
    id: 'carb-w4',
    optionIds: ['carb-w4-a', 'carb-w4-b', 'carb-w4-c', 'carb-w4-d'],
    correctOptionId: 'carb-w4-c',
    q: 'Qual é a função técnica da água reservada do cozimento do spaghetti durante a etapa de mantecatura?',
    a: [
      'Resfriar rapidamente o spaghetti como um choque térmico antes de ligar o fogo.',
      'Lavar a gordura do guanciale para removê-la integralmente da frigideira.',
      'Fornecer fase aquosa quente e amido dissolvido para ligar gordura, queijo e ovos em emulsão brilhante.',
      'Cozinhar o guanciale pela segunda vez até que ele perca a crocância.',
    ],
    correct: 2,
    why: 'O amido disperso na água do cozimento atua como agente estabilizador natural entre fase gordurosa e queijo ralado, ajustando a viscosidade.',
    tip: 'Recolha uma concha da água antes de escorrer a panela e adicione colher a colher.',
  },
  {
    id: 'carb-w5',
    optionIds: ['carb-w5-a', 'carb-w5-b', 'carb-w5-c', 'carb-w5-d'],
    correctOptionId: 'carb-w5-b',
    q: 'Quais alergênicos obrigatórios segundo a Anvisa RDC 727/2022 estão presentes na receita padrão de Spaghetti alla Carbonara?',
    a: [
      'Apenas oleaginosas e sulfitos.',
      'Trigo (contém glúten), ovos e leite (derivado do Pecorino Romano).',
      'Somente carne suína e pimenta-do-reino preta.',
      'Apenas ovos e amendoim, já que queijo curado não é considerado lácteo.',
    ],
    correct: 1,
    why: 'O spaghetti traz trigo e glúten, a base emulsionada contém ovos e o Pecorino Romano é derivado de leite — todos de declaração obrigatória no Brasil.',
    tip: 'Confira rótulos de todos os insumos industrializados quanto a possíveis traços adicionais.',
  },
  {
    id: 'carb-w6',
    optionIds: ['carb-w6-a', 'carb-w6-b', 'carb-w6-c', 'carb-w6-d'],
    correctOptionId: 'carb-w6-d',
    q: 'Como devem ser interpretadas as medidas de 200 g de spaghetti, 100 g de guanciale, 2 ovos + 1 gema e 50 g de Pecorino para 2 porções?',
    a: [
      'Como lei culinária imutável que proíbe qualquer ajuste de gemas na Itália.',
      'Como rendimento comercial para 6 pessoas sem alteração de quantidades.',
      'Como única receita que exige obrigatoriamente troca por creme de leite quando dobrada.',
      'Como padronização didática FerveC para 2 porções, existindo variações tradicionais romanas entre massa, ovos e queijo.',
    ],
    correct: 3,
    why: 'Na tradição romana coexistem proporções distintas de gemas/ovos inteiros e queijo; a FerveC fixa uma referência didática clara para o treino da técnica.',
    tip: 'Lembre também que a pesagem final cozida por porção depende de validação prática em bancada.',
  },
];

export const exam: QuizQuestion[] = [
  {
    id: 'carb-e1',
    optionIds: ['carb-e1-a', 'carb-e1-b', 'carb-e1-c', 'carb-e1-d'],
    correctOptionId: 'carb-e1-c',
    q: 'Durante o serviço, um auxiliar usa ovos in natura não pasteurizados e afirma que o molho cremoso garante segurança contra Salmonella. Qual decisão técnica está correta?',
    a: [
      'Aprovar o serviço porque o Pecorino Romano curado reduz o pH e esteriliza os ovos.',
      'Aumentar a quantidade de pimenta-do-reino preta para neutralizar microrganismos.',
      'Corrigir a conduta e adotar ovos pasteurizados como padrão didático, pois calor residual e textura cremosa não garantem eliminação de patógenos.',
      'Deixar a travessa pronta sobre a bancada por 30 minutos para terminar a pasteurização espontânea.',
    ],
    correct: 2,
    why: 'Cremosidade, cor ou brilho não comprovam segurança microbiológica, e o calor residual fora do fogo não assegura destruição térmica completa de patógenos como Salmonella.',
    tip: 'Mantenha ovos pasteurizados refrigerados até o uso e siga integralmente a Anvisa RDC 216/2004.',
  },
  {
    id: 'carb-e2',
    optionIds: ['carb-e2-a', 'carb-e2-b', 'carb-e2-c', 'carb-e2-d'],
    correctOptionId: 'carb-e2-a',
    q: 'Ao incorporar a mistura de ovos e Pecorino ao spaghetti na frigideira, formaram-se pequenos grumos sólidos semelhantes a ovo mexido. O que causou a falha e como preveni-la?',
    a: [
      'Contato com calor direto ou frigideira muito quente; afastar completamente do fogo, aguardar breves segundos e mexer continuamente com água do cozimento aos poucos.',
      'Falta de manteiga sem sal no preparo do guanciale; acrescentar 100 g de manteiga fervendo.',
      'Uso de spaghetti cozido al dente; cozinhar a massa por mais 10 minutos para esfriar a mistura.',
      'Excesso de pimenta-do-reino preta moída antes de bater as gemas.',
    ],
    correct: 0,
    why: 'Calor direto acima da temperatura de coagulação desnatura rapidamente as proteínas do ovo; afastar da chama e movimentar em emulsão preserva textura aveludada.',
    tip: 'Se a frigideira estiver fumegante, deixe arrefecer brevemente fora da boca do fogão antes de verter os ovos.',
  },
  {
    id: 'carb-e3',
    optionIds: ['carb-e3-a', 'carb-e3-b', 'carb-e3-c', 'carb-e3-d'],
    correctOptionId: 'carb-e3-d',
    q: 'Um lote de guanciale rendeu volume muito alto de gordura líquida na frigideira antes de entrar o spaghetti. Como proceder para não quebrar ou pesar a emulsão?',
    a: [
      'Completar o volume com 50 ml de azeite extravirgem para equilibrar os sabores.',
      'Descartar 100% da gordura, lavar o guanciale em água fria e usar leite integral.',
      'Ferver a massa por 5 minutos dentro de toda a gordura acumulada para absorvê-la.',
      'Retirar o excesso de gordura mantendo apenas porção controlada na frigideira e reservar parte do guanciale crocante para a montagem final.',
    ],
    correct: 3,
    why: 'Excesso de gordura livre dificulta a emulsão com água amilácea e torna o prato pesado; controlar a fração na frigideira e reservar crocante para o topo protege textura e equilíbrio.',
    tip: 'Use uma colher limpa para remover eventuais excessos antes de transferir o spaghetti.',
  },
  {
    id: 'carb-e4',
    optionIds: ['carb-e4-a', 'carb-e4-b', 'carb-e4-c', 'carb-e4-d'],
    correctOptionId: 'carb-e4-b',
    q: 'Um aprendiz escorreu toda a água do cozimento na pia sem reservar uma concha e sugere usar creme de leite de caixinha para acertar o ponto. Qual orientação segue o módulo?',
    a: [
      'Aceitar o creme de leite em pequenas doses por ter função idêntica ao amido da massa.',
      'Recusar o creme de leite na formulação tradicional, adotar água quente em mínima porção nesta emergência e instituir reserva obrigatória antes de escorrer.',
      'Substituir a água amilácea por vinagre de vinho branco para soltar o Pecorino.',
      'Adicionar mais 3 gemas cruas fora da refrigeração para compensar a falta de umidade.',
    ],
    correct: 1,
    why: 'O creme de leite descaracteriza o método clássico da Carbonara; prevenir no fluxo de bancada reservando água amilácea garante ligação autêntica.',
    tip: 'Deixe uma caneca ou concha posicionada ao lado da panela já no mise en place.',
  },
  {
    id: 'carb-e5',
    optionIds: ['carb-e5-a', 'carb-e5-b', 'carb-e5-c', 'carb-e5-d'],
    correctOptionId: 'carb-e5-d',
    q: 'No pico do movimento, a mesma tábua e o mesmo pegador usados para fatiar o guanciale e misturar ovos crus foram utilizados nos pratos prontos sem lavagem. Qual risco sanitário da RDC 216/2004 ocorreu?',
    a: [
      'Oxidação acelerada do azeite por atrito mecânico na madeira.',
      'Perda exclusiva da temperatura do prato sem implicação microbiológica.',
      'Excesso de amido residual na superfície do Pecorino Romano.',
      'Contaminação cruzada entre alimentos/utensílios crus e preparação pronta para consumo.',
    ],
    correct: 3,
    why: 'A Anvisa RDC 216/2004 exige separação física e higienização rigorosa de tábuas, utensílios e mãos entre manipulação de insumos crus e alimentos prontos.',
    tip: 'Mantenha um pegador limpo dedicado apenas à finalização e ao empratamento.',
  },
  {
    id: 'carb-e6',
    optionIds: ['carb-e6-a', 'carb-e6-b', 'carb-e6-c', 'carb-e6-d'],
    correctOptionId: 'carb-e6-a',
    q: 'Dois pratos de Carbonara já finalizados aguardaram 20 minutos na bancada morna esperando a saída de outra mesa. Que problema técnico e sanitário acontece?',
    a: [
      'A emulsão perde fluidez e separa ao esfriar, além de permanecer em zona térmica inadequada para preparação com ovo.',
      'Os ovos terminam de pasteurizar lentamente e melhoram a cremosidade com o tempo.',
      'O guanciale reservado volta a ficar mais crocante em contato com o vapor do molho.',
      'A massa continua absorvendo água do ar e atinge o ponto al dente ideal após 20 minutos.',
    ],
    correct: 0,
    why: 'A Carbonara não admite espera no passe: a emulsão engrossa/quebra rapidamente e alimentos proteicos com ovos não devem ficar expostos à temperatura ambiente.',
    tip: 'Sincronize a comanda para iniciar a emulsão somente quando os pratos puderem sair imediatamente.',
  },
  {
    id: 'carb-e7',
    optionIds: ['carb-e7-a', 'carb-e7-b', 'carb-e7-c', 'carb-e7-d'],
    correctOptionId: 'carb-e7-c',
    q: 'Ao cozinhar um spaghetti de marca diferente da habitual, o rótulo indica 11 minutos. Qual procedimento confirma o ponto al dente correto sem comprometer o acabamento?',
    a: [
      'Cozinhar por exatamente 15 minutos sem experimentar para garantir digestibilidade.',
      'Escorrer aos 5 minutos e finalizar cozinhando a massa seca diretamente dentro dos ovos na panela.',
      'Usar os 11 minutos apenas como referência inicial e provar com segurança pouco antes do término até sentir centro firme e cozido por igual.',
      'Passar a massa em água gelada após 11 minutos para interromper o cozimento e depois aquecer na manteiga.',
    ],
    correct: 2,
    why: 'Lotes e formatos de massa variam em espessura; o tempo da embalagem é guia inicial, cabendo ao cozinheiro confirmar o ponto al dente antes de escorrer.',
    tip: 'Não lave a massa após escorrer para não remover o amido superficial que ajuda na aderência do molho.',
  },
  {
    id: 'carb-e8',
    optionIds: ['carb-e8-a', 'carb-e8-b', 'carb-e8-c', 'carb-e8-d'],
    correctOptionId: 'carb-e8-b',
    q: 'Um cliente com alergia à proteína do leite pede a Carbonara da casa solicitando apenas "não colocar queijo ralado por cima na mesa". Qual resposta profissional é correta?',
    a: [
      'Atender o pedido normalmente retirando só o queijo decorativo do topo.',
      'Recusar o atendimento com a receita padrão e explicar que o Pecorino Romano já integra a emulsão do molho, além de trigo e ovos presentes na massa e na base.',
      'Garantir que o calor da massa derreteu completamente as proteínas alergênicas do queijo.',
      'Substituir o Pecorino da base por manteiga sem sal alegando ausência de lactose/caseína.',
    ],
    correct: 1,
    why: 'Retirar apenas o acabamento não torna o prato seguro: o Pecorino Romano já está emulsionado com os ovos em todo o spaghetti e alergênicos proteicos não desaparecem com calor.',
    tip: 'Comunique sempre os alergênicos integrais da receita e verifique risco de contato cruzado na cozinha.',
  },
];

export const reviewItems: [string, string][] = [
  [
    'Ingredientes (2 porções)',
    '200 g de spaghetti · 100 g de guanciale (sem pele) · 2 ovos inteiros pasteurizados · 1 gema pasteurizada · 50 g de Pecorino Romano · pimenta-do-reino · sal moderado · água do cozimento q.b. (padronização didática FerveC).',
  ],
  [
    'Higiene e preparo',
    'Higienize mãos, tábua e utensílios (Anvisa RDC 216/2004), evite contaminação cruzada e deixe tudo separado antes do fogo.',
  ],
  [
    'Guanciale',
    'Retire a pele dura, corte em tiras ou cubos uniformes, doure na própria gordura, controle o excesso lipídico e reserve parte crocante para finalizar.',
  ],
  [
    'Massa e sal',
    'Tempere a água com sal moderado por causa do Pecorino e guanciale. Cozinhe al dente e reserve água amilácea antes de escorrer.',
  ],
  [
    'Ovos pasteurizados e segurança',
    'Sem creme de leite. Calor residual não garante eliminação de microrganismos e cremosidade não comprova segurança microbiológica: use ovos pasteurizados.',
  ],
  [
    'Emulsão fora do fogo',
    'Afaste a frigideira do calor direto antes de adicionar os ovos e queijo (reservando fração do Pecorino para o prato); mexa continuamente com água do cozimento aos poucos.',
  ],
  [
    'Erros comuns',
    'Guanciale com pele ou queimado; excesso de gordura livre; sal excessivo na água; massa mole; calor direto coagulando os ovos.',
  ],
  [
    'Serviço e alergênicos',
    'Sirva imediatamente após finalizar (não manter em temperatura ambiente). Alergênicos: trigo (glúten), ovos e leite.',
  ],
];
