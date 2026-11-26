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

export interface QuizQuestion {
  q: string;
  a: string[];
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
    q: 'Antes de levar o guanciale à frigideira, quais cuidados de preparo e corte devem ser aplicados?',
    a: [
      'Cozinhar o guanciale em água fervente junto com o spaghetti.',
      'Retirar a pele dura quando presente, cortar em tiras ou cubos uniformes e dourar na própria gordura.',
      'Temperar com bastante sal fino e fritar em manteiga escura.',
      'Bater o guanciale no liquidificador com o Pecorino antes de aquecer.',
    ],
    correct: 1,
    why: 'A retirada da pele dura evita partes rígidas, o corte uniforme garante dourado homogêneo e o guanciale solta sua própria gordura sem precisar de outro óleo.',
    tip: 'Doure em fogo baixo a médio e reserve parte do guanciale crocante para a montagem final.',
  },
  {
    q: 'Por que a água do cozimento do spaghetti na Carbonara deve ser salgada com moderação?',
    a: [
      'Porque o sal impede a água de ferver na temperatura correta.',
      'Porque a receita proíbe qualquer uso de sal na cozinha italiana.',
      'Porque guanciale e Pecorino Romano já são ricos em sódio e contribuem para o sabor final.',
      'Porque o sal coagula imediatamente os ovos pasteurizados antes da emulsão.',
    ],
    correct: 2,
    why: 'Como o Pecorino Romano curado e o guanciale já apresentam teor elevado de sal, dosar com moderação na água evita que o prato fique salgado demais.',
    tip: 'Equilibre o tempero pensando no conjunto dos ingredientes no final do preparo.',
  },
  {
    q: 'Qual é o destino correto da gordura liberada pelo guanciale e dos ingredientes reservados?',
    a: [
      'Controlar o excesso de gordura na frigideira e reservar parte do guanciale e do Pecorino para a montagem.',
      'Descartar toda a gordura do guanciale e substituir por creme de leite.',
      'Adicionar 100 ml de óleo vegetal para cobrir todo o spaghetti.',
      'Misturar toda a crosta crocante na água do cozimento enquanto ainda ferve.',
    ],
    correct: 0,
    why: 'Parte da gordura participa da emulsão, mas o excesso deve ser controlado; reservar guanciale crocante e fração do Pecorino garante textura e acabamento.',
    tip: 'Separe os itens da montagem ainda no mise en place para não incorporar tudo na frigideira.',
  },
  {
    q: 'Qual combinação de ingredientes compõe a base cremosa da Carbonara nesta aula e qual item NÃO entra na versão tradicional?',
    a: [
      'Creme de leite fresco, manteiga e parmesão ralado grosso.',
      'Leite integral, amido de milho e pancetta defumada.',
      '2 ovos inteiros pasteurizados, 1 gema pasteurizada, 50 g de Pecorino Romano e pimenta-do-reino; sem creme de leite.',
      'Apenas claras batidas em neve e queijo mozzarella.',
    ],
    correct: 2,
    why: 'A cremosidade tradicional vem da emulsão entre ovos, queijo Pecorino Romano, gordura do guanciale e água rica em amido — sem creme de leite.',
    tip: 'A FerveC adota ovos pasteurizados como padrão didático pela segurança microbiológica.',
  },
  {
    q: 'Por que devemos reservar água do cozimento antes de escorrer e afastar a frigideira do fogo ao incorporar os ovos?',
    a: [
      'Para lavar o guanciale frio depois do preparo.',
      'Para usar a água com amido no ajuste da emulsão e evitar que o calor direto coagule os ovos.',
      'Para reduzir a quantidade de glúten da massa já cozida.',
      'Para derreter os pedaços de guanciale que sobraram na tábua.',
    ],
    correct: 1,
    why: 'A água com amido ajuda a ligar gordura e queijo sem deixar o molho seco, enquanto afastar do calor direto evita que as proteínas do ovo coagulem em grumos.',
    tip: 'Mexa sem parar e vá pingando água do cozimento aos poucos até obter brilho sedoso.',
  },
  {
    q: 'Quais alergênicos de declaração obrigatória estão presentes na receita padrão de Spaghetti alla Carbonara?',
    a: [
      'Trigo (glúten), ovos e leite.',
      'Apenas oleaginosas e crustáceos.',
      'Apenas soja e gergelim.',
      'Nenhum, pois massa e queijo não são alergênicos.',
    ],
    correct: 0,
    why: 'O spaghetti contém trigo (e glúten), a emulsão leva ovos e o Pecorino Romano é derivado de leite — todos de declaração obrigatória segundo a Anvisa.',
    tip: 'Leia rótulos de insumos industrializados e evite contaminação cruzada na bancada.',
  },
];

export const exam: QuizQuestion[] = [
  {
    q: 'Em relação ao uso de ovos na Carbonara, qual afirmação atende corretamente às normas de segurança alimentar?',
    a: [
      'Se o molho ficar brilhante e cremoso, os ovos atingiram temperatura segura contra patógenos.',
      'A pimenta-do-reino preta elimina bactérias presentes em ovos crus.',
      'O calor residual da massa não garante eliminação de microrganismos, e textura cremosa não comprova segurança; adotar ovos pasteurizados.',
      'Queijo Pecorino curado esteriliza a mistura quando batido na tigela.',
    ],
    correct: 2,
    why: 'Aparência, cor ou cremosidade não verificam segurança microbiológica, e o calor residual da finalização não garante eliminação térmica completa de patógenos como Salmonella.',
    tip: 'Use ovos pasteurizados como padrão didático e siga a Anvisa RDC 216/2004 em serviços de alimentação.',
  },
  {
    q: 'Ao dourar o guanciale e preparar a mantecatura da Carbonara, como o cozinheiro deve gerenciar a gordura da frigideira?',
    a: [
      'Controlar a quantidade de gordura mantida na frigideira, evitando excesso livre no prato final.',
      'Adicionar azeite extravirgem e manteiga em dobro para cobrir o guanciale.',
      'Aquecer em fogo máximo até o guanciale ficar preto e soltar fumaça intensa.',
      'Jogar toda a gordura fora e emulsionar o queijo apenas com água fria da torneira.',
    ],
    correct: 0,
    why: 'O guanciale libera bastante gordura; manter a dose equilibrada evita que a emulsão quebre ou fique pesada, enquanto queimar a carne gera amargor.',
    tip: 'Retire eventual excesso de gordura com uma colher e guarde o guanciale crocante reservado para o topo.',
  },
  {
    q: 'Sobre as proporções da Carbonara ensinadas pela FerveC (200 g de spaghetti, 100 g de guanciale, 2 ovos + 1 gema, 50 g de Pecorino), o que é correto afirmar?',
    a: [
      'São fixas por lei italiana e proíbem qualquer variação de peso em Roma.',
      'Exigem obrigatoriamente 100 ml de creme de leite se faltarem ovos.',
      'Devem ser multiplicadas mantendo o sal da água em três colheres de sopa por litro.',
      'Funcionam como versão didática padronizada da FerveC para 2 porções, existindo outras variações tradicionais.',
    ],
    correct: 3,
    why: 'Na tradição romana há variações nas quantidades de gemas, ovos inteiros e queijo; a ficha da FerveC é uma referência didática consistente, não a única formulação possível.',
    tip: 'Respeite as proporções da ficha ao treinar a técnica para prever a textura do molho.',
  },
  {
    q: 'Qual procedimento garante o ponto al dente do spaghetti e viabiliza o ajuste correto da emulsão no final?',
    a: [
      'Lavar a massa cozida em água corrente fria antes de levá-la à frigideira.',
      'Usar o tempo da embalagem como referência, provar com cuidado e reservar água rica em amido antes de escorrer.',
      'Cozinhar a massa por metade do tempo e finalizar no forno a 220 °C.',
      'Escorrer toda a água na pia antes de verificar se há líquido suficiente para o queijo.',
    ],
    correct: 1,
    why: 'Provar próximo ao tempo indicado confirma o ponto al dente, e não lavar nem descartar toda a água preserva o amido necessário para estabilizar o molho.',
    tip: 'Use uma caneca ou concha resistente ao calor para recolher a água do cozimento antes de escorrer.',
  },
  {
    q: 'Na etapa de montagem e serviço da Spaghetti alla Carbonara, qual conduta deve ser seguida?',
    a: [
      'Servir imediatamente após finalizar, distribuindo guanciale crocante e Pecorino reservados, sem armazenar em temperatura ambiente.',
      'Deixar a frigideira tampada fora da geladeira por duas horas para o molho engrossar.',
      'Reaquecer o prato várias vezes em fogo alto até os ovos secarem totalmente.',
      'Misturar o guanciale ainda cru sobre a massa já colocada no prato.',
    ],
    correct: 0,
    why: 'A emulsão perde fluidez e estabilidade se esperar na bancada, e preparações com ovo não devem permanecer em zona de perigo térmico à temperatura ambiente.',
    tip: 'Organize os pratos antes da emulsão final para que o serviço aconteça na sequência imediata.',
  },
  {
    q: 'O que caracteriza os cuidados sanitários previstos pela Anvisa (RDC 216/2004) durante o preparo desta aula?',
    a: [
      'Usar a mesma tábua do guanciale cru para fatiar alimentos prontos sem higienização.',
      'Dispensar lavagem das mãos sempre que a receita passar pelo fogão.',
      'Manter ovos frescos quebrados sobre a bancada morna por horas antes de servir.',
      'Higienizar mãos, superfícies e utensílios, prevenir contaminação cruzada e controlar temperaturas.',
    ],
    correct: 3,
    why: 'A RDC 216/2004 estabelece higiene pessoal, higienização de bancadas e utensílios, separação entre crus e prontos e controle rigoroso de tempo e temperatura.',
    tip: 'Bancada organizada e higienizada é parte inseparável da técnica gastronômica.',
  },
  {
    q: 'Durante a finalização, ao adicionar a mistura de ovos pasteurizados e Pecorino ao spaghetti na frigideira, qual sinal indica erro de técnica?',
    a: [
      'Película cremosa brilhante envolvendo os fios de spaghetti.',
      'Formação de grumos sólidos de ovo coagulado por excesso de calor direto.',
      'Aroma evidente de pimenta-do-reino preta moída na hora.',
      'Necessidade de adicionar uma pequena colher de água do cozimento para soltar o molho.',
    ],
    correct: 1,
    why: 'Grumos indicam que a mistura foi exposta a calor direto ou temperatura excessiva, coagulando as proteínas do ovo em vez de emulsionar.',
    tip: 'Afaste sempre a frigideira da chama e mantenha movimento contínuo com o pegador.',
  },
  {
    q: 'Ao informar um aluno ou cliente com restrições alimentares sobre a Carbonara da ficha FerveC, quais alergênicos devem ser comunicados?',
    a: [
      'Apenas pimenta-do-reino e sal marinho.',
      'Trigo (glúten), ovos e leite (Pecorino Romano), observando também risco de contaminação cruzada.',
      'Somente ovos, já que queijo curado não contém proteínas lácteas.',
      'Nenhum alergênico, porque o cozimento elimina glúten e proteínas do leite.',
    ],
    correct: 1,
    why: 'Massa de trigo fornece trigo/glúten, a base leva ovos e o Pecorino Romano é derivado de leite; o cozimento não elimina alergênicos.',
    tip: 'Em serviços de alimentação, confira rótulos de todos os insumos e evite contato cruzado.',
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
