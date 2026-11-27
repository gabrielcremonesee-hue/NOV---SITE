import type { TechnicalSheet } from './courseData.ts';

export interface SauceCard {
  name: string;
  intro: string;
  ingredients: string[];
  steps: string[];
  tip: string;
}

export interface IndependentTechnicalSheet {
  code: string;
  title: string;
  sheet: TechnicalSheet;
}

export interface RecipeAssemblyGuide {
  title: string;
  reference: string;
  points: string[];
}

export interface ExtraRecipe {
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
  sauceCards?: SauceCard[];
  steps: [string, string, string][];
  techniques: string[];
  errors: string[];
  chefTip: string;
  imageStatus: string;
  techSheet: TechnicalSheet;
  technicalSheets?: IndependentTechnicalSheet[];
  assemblyGuide?: RecipeAssemblyGuide;
}

export const extraRecipes: ExtraRecipe[] = [
  {
    id: 'alfredo',
    title: 'Fettuccine Alfredo',
    subtitle: 'Massas Frescas e Emulsificação: a tradição romana da mantecatura',
    region: 'Roma (Itália)',
    yield: '4 porções',
    duration: '25–35 min',
    level: 'Intermediária',
    technique: 'Massa fresca artesanal, emulsificação e mantecatura',
    adaptation:
      'Formulação padronizada pela referência do restaurante Alfredo alla Scrofa (Vanity Fair Italia, fev/2019): 400 g de fettuccine fresco com ovos, 100 g de manteiga sem sal e 240 g de Parmigiano-Reggiano, sem creme de leite.',
    ingredients: [
      '400 g de fettuccine fresco com ovos',
      '100 g de manteiga sem sal (em temperatura ambiente)',
      '240 g de Parmigiano-Reggiano ralado fino (preferencialmente maturado por 24 meses)',
      'Água do cozimento da massa, quanto baste',
      'Sal para a água do cozimento',
      'Pimenta-do-reino preta moída na hora, opcional (adaptação facultativa)',
    ],
    allergens:
      'ALERGÊNICOS (Anvisa RDC 727/2022): Contém TRIGO, OVOS e LEITE. CONTÉM GLÚTEN. Conferir rótulos de ingredientes industrializados e prevenir contaminação cruzada.',
    editorialAlert:
      'Nota técnica de cozimento: não aplique indiscriminadamente o tempo de 30 segundos utilizado pelo restaurante Alfredo alla Scrofa, pois sua massa artesanal é especialmente fina. Ajuste o tempo à espessura e hidratação do fettuccine utilizado. Distinga sempre o peso da farinha seca usada na fabricação do peso final da massa fresca pronta.',
    steps: [
      [
        'Mise en place e fabricação artesanal',
        'Higienize mãos, bancada e utensílios (Anvisa RDC 216/2004). Deixe 100 g de manteiga sem sal em temperatura ambiente e rale fino 240 g de Parmigiano-Reggiano (pref. 24 meses). Se produzir o fettuccine artesanalmente (farinha, ovos, hidratação, sova, descanso, abertura e corte), lembre de distinguir o peso da farinha do peso final de 400 g de massa fresca.',
        'Manteiga em temperatura ambiente e queijo ralado fino facilitam a emulsão uniforme.',
      ],
      [
        'Preparação da água',
        'Leve uma panela grande com água à fervura constante e tempere com sal para o cozimento.',
        'Fogão, panela ampla e água fervente exigem supervisão e cuidado contra queimaduras.',
      ],
      [
        'Cozimento do fettuccine fresco',
        'Cozinhe os 400 g de fettuccine fresco em água fervente salgada observando a espessura da sua massa — não aplique automaticamente os 30 segundos do restaurante romano sem testar o ponto. Reserve uma xícara da água do cozimento antes de escorrer.',
        'O tempo varia conforme a espessura da lâmina e se a massa está recém-aberta ou seca na superfície.',
      ],
      [
        'Preparação da travessa com manteiga',
        'Disponha os 100 g de manteiga sem sal em temperatura ambiente numa travessa pré-aquecida ou frigideira larga fora do fogo intenso, evitando calor excessivo.',
        'Evite derreter a manteiga em calor alto para não separar gordura e água.',
      ],
      [
        'Construção da emulsão fora do calor direto',
        'Transfira o fettuccine ainda bem quente para a travessa com a manteiga e junte pequenas colheres da água do cozimento rica em amido. Incorpore os 240 g de Parmigiano-Reggiano aos poucos, sem adicionar creme de leite.',
        'Calor moderado e adição gradual do queijo evitam que as proteínas empelotem.',
      ],
      [
        'Mantecatura em movimento contínuo',
        'Execute a mantecatura com movimentos contínuos de elevação e giro até envolver todos os fios com brilho uniforme, dosando pequenas adições de água do cozimento conforme a consistência.',
        'O movimento contínuo com o amido da água transforma manteiga e queijo em creme aveludado.',
      ],
      [
        'Finalização e serviço imediato',
        'Sirva imediatamente após a mantecatura. Pimenta-do-reino pode ser oferecida apenas como adaptação opcional, pois não é ingrediente essencial da receita clássica romana.',
        'Resultado esperado: fettuccine coberto por emulsão lisa e brilhante, sem grumos nem gordura separada.',
      ],
    ],
    techniques: [
      'Fabricação artesanal do fettuccine (farinha, ovos, hidratação, sova, descanso, abertura e corte)',
      'Distinção entre peso da farinha e peso final da massa fresca',
      'Emulsificação de manteiga, queijo maturado e água amilácea sem creme de leite',
      'Mantecatura em movimentos contínuos',
      'Controle térmico (manteiga em temperatura ambiente e ausência de fogo direto intenso)',
      'Adaptação do tempo de cozimento à espessura da massa',
    ],
    errors: [
      'Molho oleoso ou separado: calor excessivo ou falta de água amilácea; incorpore pequenas quantidades de água quente mexendo continuamente fora do fogo.',
      'Queijo empelotado: fogo alto ou queijo jogado de uma vez; rale fino, baixe a temperatura e adicione gradualmente.',
      'Massa empapada por copiar 30 s sem validar espessura: avalie a espessura real do fettuccine e prove antes de escorrer.',
      'Molho espesso e seco na espera: ajuste com água do cozimento e sirva imediatamente.',
    ],
    chefTip:
      'A autenticidade do Fettuccine Alfredo vem de manteiga em temperatura ambiente, Parmigiano-Reggiano ralado fino, água do cozimento e mantecatura contínua — sem creme de leite.',
    imageStatus: 'Imagem ilustrativa do prato finalizado; validação prática de pesagem final pendente.',
    techSheet: {
      originalName: 'Fettuccine Alfredo',
      portugueseExplanation:
        'Fetuccine fresco ao ovo emulsionado à mesa/travessa com manteiga sem sal, Parmigiano-Reggiano maturado e água do cozimento, sem creme de leite.',
      region: 'Roma (Itália)',
      yield: '4 porções',
      portionQuantity:
        '100 g de fettuccine fresco cru por porção como referência inicial (peso cozido final sujeito à validação em bancada)',
      prepTime: '15–20 min (com massa pronta) · +45 min se fabricar a massa artesanalmente',
      cookTime: '10–15 min (fervura, cocção e mantecatura)',
      totalEstimatedTime: '25–35 min culinários (com fettuccine já preparado)',
      workloadDistinction:
        'Tempo culinário na cozinha (25–35 min com massa já pronta); distinto da carga horária pedagógica do curso no certificado.',
      difficulty: 'Intermediária',
      ingredients: [
        '400 g de fettuccine fresco com ovos',
        '100 g de manteiga sem sal (temperatura ambiente)',
        '240 g de Parmigiano-Reggiano ralado fino (pref. 24 meses)',
        'Água do cozimento da massa, quanto baste',
        'Sal para a água',
        'Pimenta-do-reino, opcional',
      ],
      utensils: [
        'Panela grande para cocção da massa',
        'Travessa larga aquecida ou frigideira ampla fora da chama',
        'Ralador fino, pegador/garfos de mantecatura, concha e escorredor',
        'Rolo/cilindro e faca (caso produza o fettuccine artesanalmente)',
      ],
      miseEnPlace: [
        'Higienizar mãos, bancada e utensílios conforme Anvisa RDC 216/2004.',
        'Retirar 100 g de manteiga sem sal da refrigeração com antecedência para atingir temperatura ambiente.',
        'Ralar finamente 240 g de Parmigiano-Reggiano (pref. maturação de 24 meses).',
        'Separar os 400 g de fettuccine fresco com ovos (lembrando que o peso da massa pronta inclui farinha + ovos, diferindo do peso da farinha seca).',
      ],
      detailedSteps: [
        '1. Mise en place: manteiga amolecida em temperatura ambiente, Parmigiano ralado fino e massa pesada (400 g).',
        '2. Água fervente: aquecer panela grande com água e adicionar sal.',
        '3. Cocção: cozinhar o fettuccine conforme espessura real (sem copiar 30 s cegamente) e reservar água amilácea.',
        '4. Base lipídica: colocar 100 g de manteiga na travessa aquecida ou frigideira fora do fogo intenso.',
        '5. Emulsificação: transferir a massa quente, juntar água amilácea aos poucos e incorporar os 240 g de queijo gradualmente.',
        '6. Mantecatura: movimentar continuamente até obter creme homogêneo e brilhante.',
        '7. Serviço imediato: servir na hora; pimenta-do-reino apenas opcional.',
      ],
      techniques: [
        'Mantecatura e emulsificação sem creme de leite',
        'Controle térmico de manteiga e queijo maturado',
        'Fabricação artesanal de massa fresca ao ovo (farinha, ovos, hidratação, sova, descanso, abertura e corte)',
      ],
      controlPoints: [
        'Manteiga em temperatura ambiente antes da entrada da massa quente.',
        'Ausência de calor excessivo para evitar separação de gordura e grumos de queijo.',
        'Avaliação visual e tátil do ponto da massa conforme espessura, sem aplicar 30 s indiscriminadamente.',
      ],
      expectedResult:
        'Fios soltos e cozidos por igual envolvidos por emulsão lisa, acetinada e brilhante de manteiga e Parmigiano, sem gordura empoçada.',
      errorsAndFixes: [
        'Queijo empelotado: diminuir temperatura imediatamente e adicionar água do cozimento batendo com movimento rápido.',
        'Molho oleoso: excesso de calor separou a manteiga; retirar do calor e emulsionar aos poucos com água quente rica em amido.',
        'Massa crua ou mole demais: validar tempo em pequena amostra antes de escorrer toda a panela.',
      ],
      chefTips: [
        'Se fabricar o fettuccine em casa, controle a hidratação na sova, deixe descansar coberto por 30 min e abra fino e uniforme antes de cortar.',
        'Não use creme de leite na receita tradicional; o Parmigiano de 24 meses derrete de maneira mais limpa na emulsão.',
      ],
      allergens:
        'ALERGÊNICOS (Anvisa RDC 727/2022): Contém TRIGO, OVOS e LEITE. CONTÉM GLÚTEN. Verificar rótulos e risco de contaminação cruzada.',
      conservation:
        'Consumo imediato após finalizar; o molho emulsionado perde estabilidade ao esfriar e reaquecer. Seguir Anvisa RDC 216/2004 caso manipule massa fresca com ovos sob refrigeração (<= 5 °C).',
      foodSafetyNotes: [
        'Higiene das mãos, controle de refrigeração da massa fresca crua com ovos antes do cozimento e prevenção de contaminação cruzada (RDC 216/2004).',
      ],
      references: [
        {
          label: 'Restaurante Alfredo alla Scrofa — Fettuccine Alfredo',
          url: 'https://alfredoallascrofa.com/en/fettuccine/',
        },
        {
          label: 'Vanity Fair Italia (fev/2019) — Ricetta originale Alfredo alla Scrofa',
          url: 'https://www.vanityfair.it/vanityfood/ricette/2019/02/07/fettuccine-alfredo-ricetta-originale',
        },
        {
          label: 'Anvisa — Boas Práticas e Rotulagem de Alergênicos',
          url: 'https://www.gov.br/anvisa/pt-br/assuntos/alimentos',
        },
      ],
      didacticAdaptations:
        'Proporção corrigida para 100 g de manteiga e 240 g de Parmigiano-Reggiano para 400 g de massa fresca (4 porções), em substituição à formulação anterior superestimada (160 g / 280 g). Pimenta-do-reino mantida somente como opcional.',
      practicalValidationStatus:
        'Proporções padronizadas conforme referência histórica publicada; validação física em bancada na cozinha FerveC pendente.',
    },
  },
  {
    id: 'arrabbiata',
    title: 'Penne all’Arrabbiata',
    subtitle: 'Massas Tubulares e Molhos Picantes: o clássico romano',
    region: 'Roma e Lácio (Itália)',
    yield: '4 porções (versão didática FerveC)',
    duration: '30–40 min',
    level: 'Fácil',
    technique: 'Massas tubulares, infusão aromática e redução de tomate',
    adaptation:
      'Penne rigate é uma massa tubular seca (não é massa recheada). Mantemos 320 g como versão didática FerveC para 4 porções; o portal oficial Turismo Roma utiliza 400 g de massa para quatro pessoas, sem tornar incorreta a versão de 320 g.',
    ingredients: [
      '320 g de penne rigate seco',
      '400 g de tomate pelado (aproveitando o fruto e seu líquido)',
      '40 ml de azeite extravirgem',
      '2 dentes de alho',
      'Peperoncino ou pimenta calabresa a gosto (pimenta calabresa é alternativa acessível)',
      'Sal a gosto',
      '10 g de salsinha fresca, opcional',
      'Água do cozimento da massa, quanto baste',
      'Pecorino Romano ralado, opcional (utilizado em versões contemporâneas)',
    ],
    allergens:
      'ALERGÊNICOS (Anvisa RDC 727/2022): Contém TRIGO (CONTÉM GLÚTEN) e, quando utilizado Pecorino Romano na finalização, contém LEITE. Verificar composição da massa e contaminação cruzada.',
    editorialAlert:
      'Classificação corrigida: o módulo pertence a “Massas Tubulares e Molhos Picantes” (penne rigate é massa tubular com ranhuras que retêm molho, não massa recheada). A quantidade de 320 g é padronização didática da FerveC (Turismo Roma usa 400 g).',
    steps: [
      [
        'Mise en place e higienização',
        'Higienize as mãos, bancada e utensílios (Anvisa RDC 216/2004) e higienize corretamente a salsinha fresca opcional. Separe os 320 g de penne rigate seco e abra os 400 g de tomate pelado preservando seu líquido para aproveitar na redução.',
        'Os sulcos do penne rigate ajudam a reter o molho de tomate picante.',
      ],
      [
        'Preparação aromática (peperoncino ou pimenta calabresa)',
        'Prepare os 2 dentes de alho (fatiados ou levemente amassados) e dose o peperoncino italiano ou a pimenta calabresa como alternativa acessível ao paladar, sem dominar todo o prato.',
        'A pimenta calabresa brasileira substitui com praticidade o peperoncino seco italiano.',
      ],
      [
        'Infusão dos aromas sem queimar o alho',
        'Aqueça os 40 ml de azeite extravirgem em fogo baixo a médio com o alho e o peperoncino ou pimenta calabresa. Perfume o óleo controlando o calor para dourar levemente sem queimar ou amargar o alho.',
        'Alho queimado amarga todo o molho; se escurecer demais, reinicie a base.',
      ],
      [
        'Construção e redução com tomate e líquido',
        'Adicione o tomate pelado junto com o líquido da lata, desmanche os tomates delicadamente e cozinhe em fogo moderado até reduzir à consistência desejada (ajustando o tempo conforme a fluidez do líquido).',
        'Aproveitar o líquido do tomate pelado reduz desperdício e concentra o sabor durante a cocção.',
      ],
      [
        'Ajuste de sal e equilíbrio',
        'Tempere com sal moderado e prove o equilíbrio entre doçura natural do tomate, acidez e picância.',
        'O tempo de redução ajusta textura e sabor sem mascarar o tomate.',
      ],
      [
        'Cozimento al dente do penne rigate',
        'Cozinhe os 320 g de penne rigate em água fervente salgada até o ponto al dente (firme por dentro e sem colapsar os tubos). Reserve um pouco da água do cozimento antes de escorrer.',
        'Use panela ampla com fervura constante e cuidado contra queimaduras.',
      ],
      [
        'Finalização da massa junto ao molho',
        'Transfira o penne rigate diretamente para a frigideira com o molho reduzido, junte pequenas quantidades da água do cozimento se precisar de fluidez e envolva no calor brando para que o molho entre nos tubos.',
        'Terminar o cozimento na frigideira integra o amido e melhora a aderência ao penne rigate.',
      ],
      [
        'Montagem e variações contemporâneas',
        'Desligue o fogo, adicione salsinha fresca opcional e sirva na hora. Pecorino Romano ralado pode ser servido à parte ou sobre o prato como opção contemporânea.',
        'Resultado esperado: penne rigate al dente brilhante e envolvido por molho vermelho vivo e picante na medida.',
      ],
    ],
    techniques: [
      'Escolha de formato tubular com ranhuras (penne rigate)',
      'Infusão aromática controlada de alho e peperoncino / pimenta calabresa',
      'Aproveitamento integral e redução do tomate pelado com seu líquido',
      'Equilíbrio entre acidez, sal e picância',
      'Cozimento al dente e finalização da massa no próprio molho',
    ],
    errors: [
      'Alho queimado e molho amargo: mantenha fogo baixo ao perfumar o azeite e adicione o tomate assim que o alho ficar levemente dourado.',
      'Molho muito ralo: prolongue a redução em fogo moderado aproveitando o líquido do tomate até encorpar.',
      'Picância exagerada ocultando o tomate: comece com pouca pimenta calabresa/peperoncino e ajuste no final.',
      'Penne murcho ou mole: escorra firme ao dente e conclua o último minuto na frigideira com o molho.',
    ],
    chefTip:
      'O penne rigate não é uma massa recheada: suas ranhuras externas e o tubo interno funcionam para abraçar o molho picante de tomate.',
    imageStatus: 'Imagem ilustrativa disponível no curso; validação física de rendimento cozido pendente.',
    techSheet: {
      originalName: 'Penne all’Arrabbiata',
      portugueseExplanation:
        'Massa tubular seca com ranhuras (penne rigate) servida com molho rápido e picante de tomate, alho, azeite extravirgem e peperoncino (ou pimenta calabresa).',
      region: 'Roma e Lácio (Itália)',
      yield: '4 porções (versão didática FerveC com 320 g; Turismo Roma usa 400 g)',
      portionQuantity:
        '80 g de penne rigate seco cru por pessoa na formulação FerveC (peso cozido final sujeito à validação prática)',
      prepTime: '10–15 min (higienização de salsinha, alho e separação)',
      cookTime: '20–25 min (infusão, redução do tomate e cocção da massa)',
      totalEstimatedTime: '30–40 min culinários',
      workloadDistinction:
        'Tempo culinário de preparo (30–40 min); distinto da carga horária pedagógica do curso no certificado.',
      difficulty: 'Fácil',
      ingredients: [
        '320 g de penne rigate seco',
        '400 g de tomate pelado (com seu líquido)',
        '40 ml de azeite extravirgem',
        '2 dentes de alho',
        'Peperoncino ou pimenta calabresa a gosto',
        'Sal a gosto',
        '10 g de salsinha fresca, opcional',
        'Água do cozimento, quanto baste',
        'Pecorino Romano, opcional',
      ],
      utensils: [
        'Panela grande para cozimento do penne',
        'Frigideira larga ou sautéuse para infusão, redução e finalização',
        'Escorredor, concha, tábua e faca higienizadas',
      ],
      miseEnPlace: [
        'Higienizar mãos, superfícies, utensílios e a salsinha fresca opcional (Anvisa RDC 216/2004).',
        'Pesar 320 g de penne rigate seco e 400 g de tomate pelado com seu líquido.',
        'Fatiar ou amassar levemente os 2 dentes de alho e separar a pimenta e o Pecorino opcional.',
      ],
      detailedSteps: [
        '1. Mise en place: separar insumos e higienizar a salsinha.',
        '2. Aromáticos: preparar alho e dosar peperoncino ou pimenta calabresa.',
        '3. Infusão: aquecer azeite em calor baixo a médio sem queimar o alho.',
        '4. Molho: juntar tomate pelado e líquido, desmanchar e reduzir em fogo moderado.',
        '5. Tempero: ajustar sal avaliando acidez e picância.',
        '6. Cocção: cozinhar o penne rigate al dente e reservar água amilácea.',
        '7. Integração: finalizar o penne dentro do molho na frigideira.',
        '8. Serviço: adicionar salsinha opcional, servir na hora e ofertar Pecorino se desejado.',
      ],
      techniques: [
        'Infusão aromática controlada em azeite',
        'Redução controlada de molho de tomate',
        'Integração final de massa tubular ranhurada ao molho',
      ],
      controlPoints: [
        'Temperatura do alho no azeite para impedir oxidação e amargor.',
        'Consistência do molho ao término da redução (encorpado, não aquoso).',
        'Ponto al dente preservado para o penne finalizar junto ao molho.',
      ],
      expectedResult:
        'Penne rigate firme com molho vermelho brilhante, aromático e picante equilibrado aderindo aos sulcos e interior dos tubos.',
      errorsAndFixes: [
        'Alho queimado: descartar e recomeçar antes da entrada do tomate.',
        'Molho aguado: manter fogo moderado por alguns minutos extras até evaporar o excesso de líquido.',
        'Falta ou excesso de picância: dosar pimenta calabresa gradualmente na infusão.',
      ],
      chefTips: [
        'A versão tradicional romana dispensa queijo, mas o Pecorino Romano pode integrar versões contemporâneas a critério do cozinheiro.',
      ],
      allergens:
        'ALERGÊNICOS (Anvisa RDC 727/2022): Contém TRIGO (CONTÉM GLÚTEN) e, se utilizar Pecorino Romano opcional, contém LEITE. Verificar rótulo da massa e riscos de contaminação cruzada.',
      conservation:
        'Consumo preferencialmente imediato. Em serviços de alimentação, sobras ou molho base devem passar por resfriamento controlado e armazenamento sob refrigeração (<= 5 °C) ou congelamento conforme Anvisa RDC 216/2004, sem prazo comercial não validado.',
      foodSafetyNotes: [
        'Higienização adequada da salsinha fresca, higiene das mãos e prevenção de contaminação cruzada com laticínios opcionais (RDC 216/2004).',
      ],
      references: [
        {
          label: 'Turismo Roma — Penne all’Arrabbiata',
          url: 'https://www.turismoroma.it/it/page/penne-allarrabbiata',
        },
        {
          label: 'Anvisa — Boas Práticas e Rotulagem',
          url: 'https://www.gov.br/anvisa/pt-br/assuntos/alimentos',
        },
      ],
      didacticAdaptations:
        'Uso de 320 g de penne rigate para 4 porções mantido como padrão didático FerveC (Turismo Roma emprega 400 g); pimenta calabresa apresentada como alternativa acessível ao peperoncino e Pecorino como complemento contemporâneo opcional.',
      practicalValidationStatus:
        'Corrigido em classificação taxonômica e conteúdo; pesagem final cozida em bancada pendente.',
    },
  },
  {
    id: 'pesto',
    title: 'Fusilli al Pesto Genovese',
    subtitle: 'Molhos Clássicos da Ligúria: técnica a frio e conservação segura',
    region: 'Ligúria / Gênova (Itália)',
    yield: '4 porções (padronização didática sujeita à validação prática)',
    duration: '25–35 min',
    level: 'Fácil a intermediária',
    technique: 'Maceração a frio, emulsão crua e controle de oxidação',
    adaptation:
      'Os ingredientes do pesto são padronização didática FerveC dentro das faixas clássicas da Ligúria (VisitGenoa apresenta o preparo para cerca de 4 pessoas sem fixar 600 g de massa nem distinguir massa seca vs fresca; formatos tradicionais locais são trofie e trenette). O uso de 320 g de fusilli seco é adaptação didática FerveC cuja proporção exata molho/massa depende de validação prática em bancada.',
    ingredients: [
      '320 g de fusilli seco (adaptação didática; tradicionais da Ligúria: trofie e trenette)',
      '60 g de folhas de manjericão fresco',
      '30 g de pinoli',
      '50 g de Parmigiano-Reggiano ralado fino',
      '25 g de Pecorino Sardo ralado fino',
      '70 ml de azeite extravirgem',
      '1 dente pequeno de alho',
      'Sal a gosto',
      'Água do cozimento da massa, quanto baste',
    ],
    allergens:
      'ALERGÊNICOS (Anvisa RDC 727/2022): Contém TRIGO, LEITE e PINOLI (oleaginosa/semente). CONTÉM GLÚTEN. Conferir os rótulos de todos os insumos e prevenir contaminação cruzada.',
    editorialAlert:
      'Segurança na conservação (NCHFP + Anvisa): NUNCA armazene pesto fresco com alho e azeite à temperatura ambiente devido ao risco microbiológico (Clostridium botulinum em ambiente com alho e óleo sem acidez/refrigeração). Consuma imediatamente, refrigere adequadamente ou congele; não estipule prazos comerciais sem validação técnica.',
    steps: [
      [
        'Higienizar e secar o manjericão',
        'Higienize cuidadosamente os 60 g de folhas de manjericão fresco (conforme boas práticas sanitárias) e seque completamente com centrífuga ou papel/pano limpo sem amassar.',
        'Folhas úmidas oxidam rápido e deixam o molho aquoso.',
      ],
      [
        'Macerar o alho com sal',
        'No almofariz (método tradicional genovês), macere 1 dente pequeno de alho com uma pequena quantidade de sal até formar pasta suave. Se usar processador doméstico, resfrie copo/lâminas e trabalhe em pulsos breves.',
        'O almofariz esmaga fibras liberando óleos essenciais sem aquecer como lâminas rápidas.',
      ],
      [
        'Acrescentar os pinoli',
        'Adicione os 30 g de pinoli ao alho macerado e trabalhe em movimento circular até formar pasta cremosa e uniforme.',
        'A gordura natural dos pinoli começa a construir a cremosidade da base.',
      ],
      [
        'Incorporar as folhas de manjericão',
        'Acrescente os 60 g de folhas de manjericão secas delicadamente e pressione/macere sem triturar por atrito excessivo nem aquecer, evitando oxidação e escurecimento.',
        'Evite aquecimento durante a trituração para manter a cor verde vibrante.',
      ],
      [
        'Adicionar os queijos ralados',
        'Incorpore os 50 g de Parmigiano-Reggiano e os 25 g de Pecorino Sardo ralados finos à pasta aromática.',
        'A combinação dos dois queijos equilibra umami doce e nota salina característica de Gênova.',
      ],
      [
        'Incorporar gradualmente o azeite',
        'Adicione os 70 ml de azeite extravirgem em fio gradual, misturando até obter pasta homogênea, verde e aromática.',
        'Entrar aos poucos permite emulsão estável entre azeite, erva e queijos.',
      ],
      [
        'Cozinhar a massa al dente',
        'Cozinhe os 320 g de fusilli seco em água fervente salgada até o ponto al dente e reserve água do cozimento antes de escorrer. (Lembrete: trofie e trenette são os formatos tradicionais da Ligúria.)',
        'As espirais do fusilli retêm o molho cru na adaptação didática.',
      ],
      [
        'Misturar o pesto fora do calor direto',
        'Transfira o fusilli escorrido para travessa fora do calor direto e junte o pesto genovese. Nunca cozinhe o pesto em fogo intenso para não cozinhar e escurecer o manjericão.',
        'O pesto é um molho sem cozimento direto: preserve seus aromas voláteis.',
      ],
      [
        'Ajustar consistência com água do cozimento',
        'Acrescente pequenas colheres de água morna do cozimento rica em amido até o pesto envolver uniformemente todas as espirais.',
        'Dose aos poucos para obter aderência cremosa sem afinar demais.',
      ],
      [
        'Finalizar e servir com conservação segura',
        'Sirva imediatamente. Nunca deixe pesto com alho e azeite armazenado à temperatura ambiente: eventuais sobras exigem consumo imediato, refrigeração adequada ou congelamento, sem prazo comercial sem validação.',
        'Resultado esperado: pesto verde brilhante, perfumado e envolvido de forma uniforme.',
      ],
    ],
    techniques: [
      'Higienização e secagem integral do manjericão',
      'Maceração em almofariz (método tradicional) vs processador com controle de calor',
      'Controle de oxidação e escurecimento enzimático do manjericão',
      'Integração gradual de queijos (Parmigiano e Pecorino Sardo) e azeite',
      'Finalização de molho cru fora do calor direto com água amilácea',
      'Conservação segura de preparações com alho em óleo (proibição de temperatura ambiente)',
    ],
    errors: [
      'Pesto escurecido ou amargo: lâminas quentes no processador ou pesto levado ao fogo intenso; use almofariz ou pulsos curtos e misture fora da chama.',
      'Molho muito aguado: folhas mal secas ou excesso de água do cozimento; seque bem o manjericão e ajuste água gota a gota.',
      'Conservação insegura fora da geladeira: pesto com alho e azeite nunca deve permanecer à temperatura ambiente (risco sanitário); consuma na hora, refrigere ou congele.',
      'Pesto espesso demais: ajuste aos poucos com pequenas quantidades de água do cozimento.',
    ],
    chefTip:
      'O segredo do Pesto Genovese está em secar bem as folhas, controlar o atrito para não aquecer e misturar à massa sempre fora do fogo direto.',
    imageStatus: 'Imagem ilustrativa disponível no curso; proporção didática sujeita à validação prática.',
    techSheet: {
      originalName: 'Pesto alla Genovese (aplicado didaticamente ao Fusilli)',
      portugueseExplanation:
        'Molho cru tradicional de Gênova à base de manjericão fresco, pinoli, alho, Parmigiano-Reggiano, Pecorino Sardo e azeite extravirgem, aplicado didaticamente sobre fusilli seco.',
      region: 'Ligúria / Gênova (Itália)',
      yield: '4 porções (padronização didática sujeita à validação prática)',
      portionQuantity:
        '80 g de fusilli seco cru por pessoa na padronização didática FerveC (320 g para 4 porções); o peso final cozido e a relação exata entre essa batelada de molho e os 320 g de fusilli aguardam validação prática em bancada. Observação documental: o portal VisitGenoa descreve a receita clássica para cerca de 4 pessoas acompanhada de trofie ou trenette, sem fixar 600 g de massa nem discriminar ali peso seco vs fresco.',
      prepTime: '15–20 min (higienização, secagem das folhas e maceração)',
      cookTime: '10–12 min (cocção da massa al dente)',
      totalEstimatedTime: '25–35 min culinários',
      workloadDistinction:
        'Tempo culinário (25–35 min); distinto da carga horária pedagógica do curso no certificado.',
      difficulty: 'Fácil a intermediária',
      ingredients: [
        '320 g de fusilli seco (adaptação didática)',
        '60 g de folhas de manjericão fresco',
        '30 g de pinoli',
        '50 g de Parmigiano-Reggiano',
        '25 g de Pecorino Sardo',
        '70 ml de azeite extravirgem',
        '1 dente pequeno de alho',
        'Sal a gosto',
        'Água do cozimento, quanto baste',
      ],
      utensils: [
        'Almofariz e pilão (tradicional) ou processador de alimentos utilizado em pulsos curtos',
        'Centrífuga ou pano/papel limpo para secar folhas',
        'Panela grande para massa, travessa fora do calor, ralador fino, concha e escorredor',
      ],
      miseEnPlace: [
        'Higienizar mãos, bancada, utensílios e sanitizar corretamente o manjericão fresco (Anvisa RDC 216/2004).',
        'Secar integralmente os 60 g de folhas de manjericão sem machucar.',
        'Ralar fino os 50 g de Parmigiano-Reggiano e 25 g de Pecorino Sardo; pesar 30 g de pinoli, 70 ml de azeite, 1 dente pequeno de alho e 320 g de fusilli.',
      ],
      detailedSteps: [
        '1. Higienizar e secar cuidadosamente as folhas de manjericão.',
        '2. Macerar o alho com uma pequena quantidade de sal.',
        '3. Acrescentar os pinoli.',
        '4. Incorporar delicadamente as folhas de manjericão.',
        '5. Adicionar os queijos ralados (Parmigiano e Pecorino Sardo).',
        '6. Incorporar gradualmente o azeite.',
        '7. Cozinhar a massa até o ponto al dente e reservar água.',
        '8. Misturar o pesto à massa fora do calor direto.',
        '9. Ajustar a consistência com pequenas quantidades de água do cozimento.',
        '10. Finalizar e servir imediatamente.',
      ],
      techniques: [
        'Maceração tradicional em almofariz e alternativa doméstica com pulsos curtos',
        'Prevenção de oxidação térmica do manjericão',
        'Emulsão crua sem cozimento direto',
      ],
      controlPoints: [
        'Secagem completa das folhas após higienização sanitária.',
        'Ausência de superaquecimento mecânico (processador) ou térmico (fogo direto sobre o pesto).',
        'Conservação estrita: proibição absoluta de armazenar alho e azeite à temperatura ambiente.',
      ],
      expectedResult:
        'Molho verde vivo, aromático e cremoso envolvendo as espirais do fusilli sem escurecimento nem separação de óleo.',
      errorsAndFixes: [
        'Pesto escurecido: houve aquecimento ou excesso de oxidação; reduza pulsos ou use almofariz e misture longe do fogo.',
        'Pesto aguado: folhas ainda molhadas ou excesso de água da massa.',
        'Alho agressivo: use apenas 1 dente pequeno e macere bem com sal antes dos pinoli.',
      ],
      chefTips: [
        'Na Ligúria, os formatos clássicos para este pesto são trofie e trenette; o fusilli é usado didaticamente pelo fácil acesso e boa aderência nas espirais.',
      ],
      allergens:
        'ALERGÊNICOS (Anvisa RDC 727/2022): Contém TRIGO, LEITE e PINOLI (oleaginosas/sementes). CONTÉM GLÚTEN. Verificar rótulos de todos os ingredientes e contaminação cruzada.',
      conservation:
        'Consumo imediato recomendado. NUNCA armazenar pesto fresco com alho e azeite à temperatura ambiente (risco de toxina botulínica — NCHFP). Caso haja sobra doméstica, manter sob refrigeração rigorosa por curtíssimo prazo ou congelar imediatamente conforme condições higiênico-sanitárias (Anvisa RDC 216/2004). Não estabelecer prazo de validade comercial sem validação técnica.',
      foodSafetyNotes: [
        'Alho em óleo em ambiente anaeróbico e sem acidez oferece risco de Clostridium botulinum fora de refrigeração/congelamento (NCHFP).',
        'Higienização completa de vegetais crus (manjericão) antes de consumo sem tratamento térmico.',
      ],
      references: [
        {
          label: 'VisitGenoa — Pesto alla Genovese (Portal Oficial de Gênova, ~4 porções com trofie/trenette)',
          url: 'https://www.visitgenoa.it/it/pesto-alla-genovese',
        },
        {
          label: 'Campionato Mondiale di Pesto al Mortaio — Receita Oficial Genovesa (referência comparativa da Ligúria)',
          url: 'https://www.pestochampionship.it/il-campionato/ricetta-ufficiale-del-pesto-genovese/',
        },
        {
          label: 'NCHFP — Freezing Garlic in Oil & Risco Botulínico',
          url: 'https://nchfp.uga.edu/how/freeze/vegetable/freezing-garlic-in-oil/',
        },
        {
          label: 'Anvisa — Boas Práticas e Rotulagem de Alergênicos',
          url: 'https://www.gov.br/anvisa/pt-br/assuntos/alimentos',
        },
      ],
      didacticAdaptations:
        'Ingredientes do molho padronizados pela FerveC dentro dos intervalos genoveses (60 g manjericão, 30 g pinoli, 50 g Parmigiano, 25 g Pecorino Sardo, 70 ml azeite, 1 dente pequeno de alho) com adaptação didática do formato de massa para 320 g de fusilli seco (em lugar dos tradicionais trofie ou trenette). VisitGenoa não prescreve 600 g de massa nem fixa peso seco/fresco.',
      practicalValidationStatus:
        'A relação exata entre o molho padronizado e os 320 g de fusilli seco (bem como eventual sobra de pesto e rendimento final em prato) depende de validação física em bancada.',
    },
  },
  {
    id: 'ragù',
    photo: '/assets/massas-italianas.svg',
    title: 'Tagliatelle al Ragù alla Bolognese',
    subtitle: 'Massa Artesanal e Cozimento Lento: referência oficial de Bolonha (2023)',
    region: 'Emília-Romanha / Bolonha (Itália)',
    yield: 'Massa fresca: 4 porções | Ragù: 6 porções (rendimentos distintos — validação prática pendente)',
    duration: '3 horas ou mais',
    level: 'Intermediária a avançada',
    technique: 'Massa fresca ao ovo, soffritto, deglaçagem e cozimento lento',
    adaptation:
      'Baseada na receita atualizada da Accademia Italiana della Cucina (20/04/2023) e na referência de montagem para 4 pessoas do Turismo Oficial de Bolonha (400 g de ragù já preparado + 400 g de farinha + 4 ovos médios). Rendimentos separados: massa para 4 pessoas; ragù para 6 pessoas (com possibilidade de sobra de molho). Medidas em ml de vinho, leite e azeite são padronizações didáticas FerveC para as medidas italianas em copo/colher.',
    ingredients: [
      'MASSA FRESCA (referência 4 porções): 400 g de farinha de trigo tipo 00',
      'MASSA FRESCA (referência 4 porções): 4 ovos médios',
      'MASSA FRESCA (referência 4 porções): 1 pitada de sal (conforme referência)',
      'RAGÙ (referência 6 porções · Accademia 2023): 400 g de carne bovina moída grossa (cortes ricos em colágeno)',
      'RAGÙ (referência 6 porções): 150 g de pancetta fresca suína (não defumada)',
      'RAGÙ (referência 6 porções): 60 g de cebola',
      'RAGÙ (referência 6 porções): 60 g de cenoura',
      'RAGÙ (referência 6 porções): 60 g de salsão',
      'RAGÙ (referência 6 porções): 1 copo de vinho branco ou tinto (padronização didática FerveC: 120 ml)',
      'RAGÙ (referência 6 porções): 200 g de passata de tomate',
      'RAGÙ (referência 6 porções): 1 colher de sopa de extrato duplo concentrado de tomate',
      'RAGÙ (referência 6 porções): 1 copo de leite integral, opcional (padronização didática FerveC: 120 ml)',
      'RAGÙ (referência 6 porções): 3 colheres de sopa de azeite extravirgem (padronização didática FerveC: 45 ml)',
      'RAGÙ (referência 6 porções): Caldo leve de carne ou vegetais, quanto baste',
      'RAGÙ (referência 6 porções): Sal e pimenta a gosto',
      'FINALIZAÇÃO: Parmigiano-Reggiano ralado na hora (opcional)',
    ],
    allergens:
      'ALERGÊNICOS OBRIGATÓRIOS (Anvisa RDC 727/2022): Contém TRIGO (CONTÉM GLÚTEN), OVOS e LEITE (quando utilizado o leite opcional na cocção ou Parmigiano na finalização). INFORMAÇÃO ADICIONAL DE COMPOSIÇÃO (não compõem a lista obrigatória brasileira da Anvisa): presença de salsão, carne suína (pancetta) e vinho.',
    editorialAlert:
      'Módulo com dupla ficha técnica (Massa para 4 porções; Ragù para 6 porções, podendo gerar sobra de molho; referência de montagem de Bolonha usa 400 g de ragù pronto para 400 g de farinha e 4 ovos). Validação física pendente em bancada para pesagem final, fração exata por prato e corte do tagliatelle (referência histórica ~7 mm crua / 8 mm cozida; variações italianas contemporâneas indicam 8 mm crua, sem tratar como erro absoluto).',
    steps: [
      [
        'Preparação do soffritto',
        'Higienize mãos, vegetais, tábua e faca (Anvisa RDC 216/2004). Pique finamente na faca os 60 g de cebola, 60 g de cenoura e 60 g de salsão, mantendo separação de carnes cruas.',
        'O corte fino e uniforme garante cozimento homogêneo do soffritto.',
      ],
      [
        'Liberação gradual da gordura da pancetta',
        'Em panela de fundo espesso, aqueça os 150 g de pancetta fresca suína (não defumada) picada junto com as 3 colheres de sopa de azeite extravirgem (padronização FerveC: 45 ml), permitindo liberação gradual da gordura.',
        'A pancetta fresca não defumada evita notas de defumação estranhas ao ragù tradicional.',
      ],
      [
        'Cozimento lento do soffritto',
        'Junte cebola, cenoura e salsão e cozinhe suavemente até murcharem e liberarem dulçor sem queimar.',
        'Paciência nesta etapa forma a base aromática sem escurecer demais.',
      ],
      [
        'Douramento da carne bovina moída grossa',
        'Acrescente os 400 g de carne bovina de moagem grossa (cortes ricos em colágeno, como dianteiro/músculo) e refogue até perder umidade superficial e dourar adequadamente.',
        'Cortes com colágeno sustentam o cozimento longo e entregam untuosidade natural.',
      ],
      [
        'Deglaçagem com vinho',
        'Despeje 1 copo de vinho branco ou tinto (padronização FerveC: 120 ml), mexa soltando o fundo da panela e deixe reduzir quase por completo. Não afirme que todo o álcool é necessariamente eliminado pelo calor.',
        'A redução concentra os aromas do vinho, embora traços alcoólicos possam permanecer.',
      ],
      [
        'Incorporação de extrato, passata e caldo',
        'Misture a colher de sopa de extrato duplo concentrado, os 200 g de passata de tomate e adicione caldo leve quente aos poucos.',
        'Tomate entra em quantidade equilibrada: o ragù à bolonhesa tem protagonismo da carne.',
      ],
      [
        'Cozimento lento (2 a 3 horas) e leite opcional',
        'Cozinhe tampado parcialmente em fogo bem baixo por cerca de 2 a 3 horas, ajustando com caldo leve quando precisar. Na metade do cozimento, acrescente 1 copo de leite integral opcional (padronização FerveC: 120 ml) e ajuste sal e pimenta ao final.',
        'O cozimento lento amacia o colágeno e arredonda a textura; o rendimento total atende 6 porções (com possível sobra em relação à massa de 4 porções).',
      ],
      [
        'Massa fresca: incorporação progressiva',
        'Sobre bancada limpa, disponha os 400 g de farinha tipo 00 (com 1 pitada de sal conforme referência), abra uma cova central, coloque os 4 ovos médios e incorpore a farinha progressivamente das bordas para o centro.',
        'A incorporação gradual evita derramar ovo e garante hidratação equilibrada.',
      ],
      [
        'Sova (15–20 min) e descanso protegido (30 min)',
        'Sove por cerca de 15 a 20 minutos até obter massa lisa e elástica. Cubra bem para não ressecar e deixe descansar por aproximadamente 30 minutos.',
        'O descanso relaxa a rede de glúten para permitir abertura fina.',
      ],
      [
        'Abertura fina e uniforme',
        'Abra a massa progressivamente com rolo ou cilindro em superfície levemente enfarinhada até atingir lâmina fina e uniforme.',
        'Trabalhe com calma e evite excesso de farinha seca na superfície.',
      ],
      [
        'Corte do tagliatelle (7 mm / 8 mm)',
        'Corte tiras regulares respeitando o debate técnico: a referência histórica da Câmara de Comércio de Bolonha indica ~7 mm crua (para ~8 mm cozida), enquanto receitas italianas contemporâneas também utilizam 8 mm crua — nenhuma dessas variações é tratada como erro absoluto e a medida segue sob validação prática na cozinha FerveC.',
        'Solte os ninhos sobre pano/superfície levemente enfarinhada sem esmagar.',
      ],
      [
        'Cozimento do tagliatelle fresco',
        'Cozinhe em água fervente salgada por poucos minutos até atingir ponto firme e cozido por igual. Reserve um pouco da água.',
        'Massa fresca cozinha bem mais rápido que a seca; acompanhe de perto.',
      ],
      [
        'Integração com o ragù porcionado',
        'Utilize cerca de 400 g de ragù pronto para envolver as 4 porções de tagliatelle (referência Turismo de Bolonha), reservando eventual sobra do molho (cuja receita rende 6 porções) sob refrigeração adequada.',
        'Ajuste umidade com pequenas colheres de água do cozimento se necessário.',
      ],
      [
        'Finalização e serviço',
        'Sirva imediatamente com Parmigiano-Reggiano ralado na hora (opcional). Observe os alertas de alergênicos e resfriamento seguro para a eventual sobra do molho.',
        'Resultado esperado: tagliatelle firme e sedoso envolvido por ragù rico, brilhante e encorpado.',
      ],
    ],
    techniques: [
      'Soffritto em corte fino e cocção suave',
      'Escolha de carne bovina de moagem grossa rica em colágeno + pancetta não defumada',
      'Deglaçagem com vinho e redução controlada',
      'Cozimento lento de 2 a 3 horas com adição de leite na metade do tempo',
      'Separação técnica de rendimentos (massa 4 porções vs ragù 6 porções)',
      'Sova (15–20 min), descanso protegido (30 min), abertura uniforme e corte de tagliatelle (7 mm / 8 mm)',
    ],
    errors: [
      'Confundir rendimento da massa (4 porções) com o do ragù (6 porções): porcione ~400 g de ragù para a massa e resfrie/refrigere a sobra adequadamente.',
      'Usar pancetta defumada ou bacon: altera o perfil aromático tradicional bolonhês.',
      'Afirmar que todo o álcool do vinho evapora completamente: traços podem permanecer após a redução.',
      'Massa rasgada por falta de descanso ou abertura apressada: respeite 15–20 min de sova e 30 min de descanso protegido.',
      'Ragù ressecado ou queimado no fundo: mantenha fogo mínimo e umedeça com caldo quente durante as 2–3 horas.',
    ],
    chefTip:
      'Massa fresca e ragù têm fichas e rendimentos próprios: o molho pode gerar sobra saborosa para conservar sob refrigeração ou congelamento seguro conforme a RDC 216/2004.',
    imageStatus: 'Imagem ilustrativa disponível; pesagem final cozida e corte oficial em validação prática.',
    techSheet: {
      originalName: 'Ragù alla Bolognese (Ficha Técnica B · Ficha Principal de Molho)',
      portugueseExplanation:
        'Molho clássico bolonhês de cocção lenta elaborado com carne bovina moída grossa rica em colágeno, pancetta fresca não defumada, soffritto (cebola, cenoura e salsão), vinho, passata, extrato duplo concentrado e caldo leve, seguindo a atualização de 20/04/2023 da Accademia Italiana della Cucina.',
      region: 'Emília-Romanha / Bolonha (Itália)',
      yield: '6 porções de molho (rendimento independente da massa fresca de 4 porções; pode gerar sobra após a montagem)',
      portionQuantity:
        'Na montagem com tagliatelle de 4 porções, utiliza-se ~400 g de ragù pronto (Bologna Welcome); o peso exato do molho cozido total e a fração final por porção aguardam validação física em bancada.',
      prepTime: '20–25 min (higienização de vegetais, corte fino do soffritto e separação de insumos)',
      cookTime: '2 a 3 horas (douramento, deglaçagem e cozimento lento em fogo mínimo)',
      totalEstimatedTime: '2 h 30 min a 3 h 30 min culinárias',
      workloadDistinction:
        'Tempo culinário exclusivo do Ragù (2 h 30 min a 3 h 30 min); distinto da carga horária pedagógica do curso no certificado.',
      difficulty: 'Intermediária a avançada',
      ingredients: [
        '400 g de carne bovina moída grossa (cortes ricos em colágeno, ex.: dianteiro/músculo)',
        '150 g de pancetta fresca suína (não defumada)',
        '60 g de cebola picada finamente',
        '60 g de cenoura picada finamente',
        '60 g de salsão picado finamente',
        '1 copo de vinho branco ou tinto (padronização didática FerveC: 120 ml)',
        '200 g de passata de tomate',
        '1 colher de sopa de extrato duplo concentrado de tomate',
        '1 copo de leite integral, opcional (padronização didática FerveC: 120 ml)',
        '3 colheres de sopa de azeite extravirgem (padronização didática FerveC: 45 ml)',
        'Caldo leve de carne ou vegetais, quanto baste',
        'Sal e pimenta a gosto',
      ],
      utensils: [
        'Panela pesada de fundo espesso com tampa para cocção lenta',
        'Tábuas higienizadas separadas (uma exclusiva para vegetais, outra para carnes cruas)',
        'Faca do chef afiada, colher de madeira/espátula resistente ao calor e concha',
        'Recipientes rasos e termômetro culinário para controle térmico e resfriamento rápido da sobra',
      ],
      miseEnPlace: [
        'Higienizar mãos, bancada e vegetais (cebola, cenoura, salsão), separando tábua exclusiva para evitar contaminação cruzada com carnes cruas (Anvisa RDC 216/2004).',
        'Manter carne bovina moída grossa e pancetta fresca sob refrigeração controlada até o momento de levar à panela.',
        'Pesar todos os insumos do molho e medir as padronizações didáticas FerveC (120 ml vinho, 120 ml leite opcional, 45 ml azeite).',
      ],
      detailedSteps: [
        '1. Picar finamente cebola (60 g), cenoura (60 g) e salsão (60 g) para o soffritto.',
        '2. Aquecer a pancetta fresca não defumada (150 g) com azeite (3 c.s. / 45 ml) em fogo baixo para liberar gordura gradualmente.',
        '3. Cozinhar o soffritto na gordura da pancetta até amaciar sem queimar.',
        '4. Juntar os 400 g de carne bovina moída grossa rica em colágeno e dourar bem até evaporar a água superficial.',
        '5. Deglaçar com 1 copo de vinho (120 ml didáticos) soltando o fundo e reduzindo até concentrar aromas (sem afirmar eliminação de 100% do álcool).',
        '6. Incorporar 1 c.s. de extrato duplo concentrado, 200 g de passata de tomate e caldo leve quente aos poucos.',
        '7. Cozinhar tampado parcialmente em fogo mínimo por 2 a 3 horas, repondo caldo leve conforme necessário, juntando o copo de leite opcional (120 ml didáticos) na metade do tempo e ajustando sal/pimenta ao final.',
      ],
      techniques: [
        'Soffritto fino em cocção branda',
        'Liberação gradual da gordura da pancetta fresca não defumada',
        'Selagem/douramento de carne rica em colágeno e deglaçagem controlada',
        'Cozimento lento de 2 a 3 horas com adição de leite opcional na metade do processo',
      ],
      controlPoints: [
        'Separação sanitária rigorosa de tábuas e facas entre vegetais e carnes cruas.',
        'Fogo mínimo constante sem queimar o fundo durante 2–3 horas.',
        'Transparência científica: não afirmar eliminação total do álcool durante a redução do vinho.',
        'Controle de rendimento: molho rende 6 porções; na montagem de 4 porções (com ~400 g), separar e resfriar a sobra.',
      ],
      expectedResult:
        'Ragù escuro-avermelhado, brilhante e untuoso, com carne macia que envolve sem excesso de óleo separado nem acidez agressiva.',
      errorsAndFixes: [
        'Carne seca e dura: falta de colágeno, chama alta ou pouco caldo; reduza o fogo e adicione caldo quente aos poucos.',
        'Sabor defumado dominante: uso indevido de bacon em vez de pancetta fresca não defumada.',
        'Sobra conservada em panela tampada fora da geladeira: risco sanitário; fracione em recipiente raso, promova resfriamento rápido e refrigere ou congele.',
      ],
      chefTips: [
        'As quantidades de 120 ml (vinho/leite) e 45 ml (azeite) são padronizações didáticas FerveC para 1 copo e 3 colheres de sopa citados na fonte italiana.',
      ],
      allergens:
        'ALERGÊNICOS OBRIGATÓRIOS (Anvisa RDC 727/2022): Contém LEITE quando utilizado o copo de leite integral opcional na cocção. DESTAQUE ADICIONAL DE COMPOSIÇÃO (não integra a lista obrigatória brasileira, mas relevante a restrições alimentares): contém salsão, carne suína (pancetta) e vinho (álcool residual possível).',
      conservation:
        'Sobra eventual (o ragù rende 6 porções; a montagem de 4 porções utiliza ~400 g) deve passar por resfriamento rápido controlado, armazenamento sob refrigeração (<= 5 °C) ou congelamento conforme Anvisa RDC 216/2004, com descongelamento sempre sob refrigeração antes de reaquecer integralmente. Não declarar prazo comercial sem validação.',
      foodSafetyNotes: [
        'Manipulação segura de carnes bovina e suína cruas separadas de vegetais do soffritto (RDC 216/2004).',
        'Resfriamento rápido e descongelamento refrigerado para eventuais sobras de ragù cozido.',
      ],
      references: [
        {
          label: 'Accademia Italiana della Cucina — Vero Ragù alla Bolognese (20/04/2023)',
          url: 'https://accademia1953.it/it/notizie/notizia/l%E2%80%99accademia-italiana-della-cucina-deposita-la-ricetta-aggiornata-del-vero-rag%C3%B9-alla',
        },
        {
          label: 'Bologna Welcome — Tagliatelle al Ragù (~400 g de ragù para 4 porções)',
          url: 'https://www.bolognawelcome.com/it/altro/altro/tagliatelle-al-ragu',
        },
        {
          label: 'Anvisa — Boas Práticas e Rotulagem de Alergênicos',
          url: 'https://www.gov.br/anvisa/pt-br/assuntos/alimentos',
        },
      ],
      didacticAdaptations:
        'Conversão de 1 copo (120 ml de vinho e 120 ml de leite opcional) e 3 colheres de sopa (45 ml de azeite) declarada explicitamente como padronização didática FerveC mantendo a referência da Accademia Italiana della Cucina (2023).',
      practicalValidationStatus:
        'Peso total cozido do ragù e fração exata servida por porção pendentes de validação física em bancada.',
    },
    technicalSheets: [
      {
        code: 'A',
        title: 'Ficha Técnica A — Tagliatelle artesanal (4 porções)',
        sheet: {
          originalName: 'Tagliatelle Fresche all’Uovo (Ficha Técnica A · Massa Artesanal)',
          portugueseExplanation:
            'Massa fresca artesanal ao ovo preparada com farinha de trigo tipo 00, ovos médios e pitada de sal, sovada, descansada sob proteção, aberta em lâmina fina e cortada em tiras regulares para 4 porções.',
          region: 'Emília-Romanha / Bolonha (Itália)',
          yield: '4 porções (base de 400 g de farinha tipo 00 + 4 ovos médios + 1 pitada de sal)',
          portionQuantity:
            'Proporção crua de referência: 100 g de farinha tipo 00 e 1 ovo médio por pessoa; peso final cozido por porção pendente de validação física em bancada.',
          prepTime: '50–60 min ativos e de descanso (incorporação, sova 15–20 min, descanso protegido ~30 min, abertura e corte)',
          cookTime: '2–4 min aproximados em água fervente salgada (ajustar conforme espessura real da lâmina)',
          totalEstimatedTime: '55–65 min culinários (independentes da cocção prévia do ragù)',
          workloadDistinction:
            'Tempo culinário da massa fresca (55–65 min); distinto da carga horária pedagógica total exibida no certificado.',
          difficulty: 'Intermediária',
          ingredients: [
            '400 g de farinha de trigo tipo 00',
            '4 ovos médios',
            '1 pitada de sal (conforme referência de Bolonha)',
            'Farinha tipo 00 ou sêmola fina extra apenas q.b. para polvilhar na abertura e ninhos',
            'Água e sal moderado para a panela de cocção',
          ],
          utensils: [
            'Bancada lisa e higienizada (madeira ou pedra limpa)',
            'Rolo de macarrão (mattarello) ou cilindro laminador de massas',
            'Faca afiada / cortador para corte regular de 7 mm / 8 mm',
            'Filme plástico ou tigela limpa para cobrir durante o descanso protegido',
            'Panela ampla, escumadeira/escorredor e pano ou grade limpa para ninhos',
          ],
          miseEnPlace: [
            'Higienizar rigorosamente mãos, bancada, rolo/cilindro e utensílios separando da área de carnes cruas do ragù (Anvisa RDC 216/2004).',
            'Pesar 400 g de farinha tipo 00, separar 4 ovos médios (mantidos refrigerados até o preparo) e 1 pitada de sal.',
            'Reservar filme plástico ou tigela limpa para proteger a massa durante os 30 minutos de descanso.',
          ],
          detailedSteps: [
            '1. Formar coroa/cova com os 400 g de farinha tipo 00 e 1 pitada de sal na bancada limpa e quebrar os 4 ovos médios no centro.',
            '2. Bater levemente os ovos com garfo e incorporar progressivamente a farinha das bordas para o centro até formar massa agregada.',
            '3. Sovar vigorosamente por cerca de 15 a 20 minutos até alcançar massa lisa, homogênea e elástica.',
            '4. Envolver bem em filme plástico ou cobrir sob tigela limpa e deixar descansar por aproximadamente 30 minutos para relaxar o glúten.',
            '5. Abrir progressivamente em espessura fina e uniforme sem excesso de farinha seca.',
            '6. Enrolar frouxamente ou dobrar e cortar tiras regulares: referência histórica da Câmara de Comércio indica ~7 mm crua (para ~8 mm cozida), enquanto variações italianas contemporâneas indicam 8 mm crua — sem tratar como erro absoluto e sob validação prática.',
            '7. Cozinhar o tagliatelle em água fervente salgada por poucos minutos até ponto firme e uniforme, reservando um pouco da água do cozimento antes da montagem.',
          ],
          techniques: [
            'Incorporação progressiva de ovos e farinha tipo 00',
            'Sova manual (15–20 min) e desenvolvimento controlado da rede de glúten',
            'Descanso protegido (~30 min) para relaxamento proteico sem ressecamento superficial',
            'Laminação fina uniforme e corte regular de tagliatelle (7 mm / 8 mm em validação)',
            'Cocção rápida al dente com reserva de água amilácea',
          ],
          controlPoints: [
            'Tempo de sova (15–20 min) e descanso protegido (30 min) para evitar que a massa encolha ou rasgue na abertura.',
            'Consistência ao incorporar ovos sem acréscimos arbitrários de farinha ou líquidos antes da avaliação real do tamanho dos ovos.',
            'Definição editorial transparente do corte (7 mm cru / 8 mm cozido histórico vs 8 mm cru contemporâneo), pendente de validação em bancada.',
          ],
          expectedResult:
            'Fitas regulares de tagliatelle frescas, lisas, elásticas e sem rachaduras, que cozinham por igual mantendo leve resistência al dente para sustentar o ragù.',
          errorsAndFixes: [
            'Massa rasgando ao abrir: faltou sova ou descanso protegido suficiente; cubra novamente por 15 minutos antes de voltar ao rolo/cilindro.',
            'Massa seca ou quebradiça: avalie a umidade/tamanho real dos ovos sob orientação antes de alterar proporções.',
            'Tiras grudando nos ninhos: polvilhe levemente com farinha/sêmola fina sem exagerar para não engrossar demais a água.',
          ],
          chefTips: [
            'Na produção artesanal, lembre-se de que o peso final da massa fresca pronta supera os 400 g de farinha seca por causa da hidratação trazida pelos 4 ovos.',
          ],
          allergens:
            'ALERGÊNICOS OBRIGATÓRIOS (Anvisa RDC 727/2022): Contém TRIGO (CONTÉM GLÚTEN) e OVOS. Prevenir contaminação cruzada na bancada e utensílios.',
          conservation:
            'Cozinhar preferencialmente após o preparo e servir imediatamente com o ragù. Caso a massa fresca crua com ovos não seja cozida de imediato, manter protegida sob refrigeração controlada (<= 5 °C) ou congelamento conforme Anvisa RDC 216/2004, sem estabelecer prazo comercial sem validação.',
          foodSafetyNotes: [
            'Massa fresca com ovos é alimento perecível: manipular com mãos e bancada rigorosamente higienizadas e evitar permanência prolongada em temperatura ambiente.',
            'Evitar contato cruzado com carnes cruas durante o preparo concomitante do ragù.',
          ],
          references: [
            {
              label: 'Bologna Welcome — Tagliatelle al Ragù (base massa 4 porções: 400 g farinha 00 + 4 ovos)',
              url: 'https://www.bolognawelcome.com/it/altro/altro/tagliatelle-al-ragu',
            },
            {
              label: 'Biblioteca Salaborsa — Ricetta e misura della Tagliatella Bolognese (7 mm cru / 8 mm cozido)',
              url: 'https://www.bibliotecasalaborsa.it/bolognaonline/events/ricetta_e_misura_della_tagliatella_bolognese',
            },
            {
              label: 'Anvisa — Boas Práticas para Serviços de Alimentação (RDC 216/2004) e Alergênicos (RDC 727/2022)',
              url: 'https://www.gov.br/anvisa/pt-br/assuntos/alimentos',
            },
          ],
          didacticAdaptations:
            'A ficha apresenta os rendimentos próprios da massa (4 porções) separados do molho (6 porções), explicitando o consenso histórico/contemporâneo da largura de corte (7 mm vs 8 mm) sob validação física.',
          practicalValidationStatus:
            'Peso cozido final da massa fresca e definição definitiva da largura padrão de corte (7 mm vs 8 mm) pendentes de validação física em bancada.',
        },
      },
      {
        code: 'B',
        title: 'Ficha Técnica B — Ragù alla Bolognese (6 porções)',
        sheet: {
          originalName: 'Vero Ragù alla Bolognese (Ficha Técnica B · Molho Lento)',
          portugueseExplanation:
            'Molho tradicional de Bolonha depositado pela Accademia Italiana della Cucina (20/04/2023), formulado para 6 porções com carne bovina moída grossa rica em colágeno, pancetta fresca não defumada, soffritto clássico, vinho, passata, extrato duplo concentrado, caldo leve e leite opcional.',
          region: 'Emília-Romanha / Bolonha (Itália)',
          yield: '6 porções de molho (independente da massa fresca de 4 porções)',
          portionQuantity:
            'Peso cozido total do molho e rendimento exato por porção aguardam validação prática em bancada (na montagem para 4 pessoas usa-se ~400 g de ragù pronto).',
          prepTime: '20–25 min (higienização de vegetais, corte fino do soffritto e separação de insumos)',
          cookTime: '2 a 3 horas (renderização da pancetta, douramento, deglaçagem e cocção lenta)',
          totalEstimatedTime: '2 h 30 min a 3 h 30 min culinárias',
          workloadDistinction:
            'Tempo culinário exclusivo do molho Ragù (2 h 30 min a 3 h 30 min); distinto da carga horária pedagógica do curso no certificado.',
          difficulty: 'Intermediária a avançada',
          ingredients: [
            '400 g de carne bovina moída grossa (cortes ricos em colágeno)',
            '150 g de pancetta fresca suína (não defumada)',
            '60 g de cebola',
            '60 g de cenoura',
            '60 g de salsão',
            '1 copo de vinho branco ou tinto (padronização didática FerveC: 120 ml)',
            '200 g de passata de tomate',
            '1 colher de sopa de extrato duplo concentrado de tomate',
            '1 copo de leite integral, opcional (padronização didática FerveC: 120 ml)',
            '3 colheres de sopa de azeite extravirgem (padronização didática FerveC: 45 ml)',
            'Caldo leve de carne ou vegetais, quanto baste',
            'Sal e pimenta a gosto (Parmigiano-Reggiano ralado na hora opcional na montagem)',
          ],
          utensils: [
            'Panela pesada de fundo espesso com tampa para cocção lenta',
            'Tábuas e facas distintas e higienizadas para vegetais vs carnes cruas',
            'Colher/espátula resistente ao calor e concha para caldo',
            'Recipientes rasos e termômetro culinário para cocção e resfriamento rápido de sobras',
          ],
          miseEnPlace: [
            'Higienizar mãos, vegetais (cebola, cenoura, salsão) e separar área limpa distinta das carnes cruas (RDC 216/2004).',
            'Manter carne bovina moída grossa e pancetta fresca sob refrigeração até o início da cocção.',
            'Separar medidas padronizadas FerveC (120 ml vinho, 120 ml leite opcional, 45 ml azeite), passata, extrato duplo e caldo leve aquecido.',
          ],
          detailedSteps: [
            '1. Picar finamente cebola (60 g), cenoura (60 g) e salsão (60 g) para o soffritto.',
            '2. Aquecer os 150 g de pancetta fresca não defumada com 3 c.s. de azeite (45 ml) em fogo baixo para liberar gordura gradualmente.',
            '3. Suar o soffritto em calor suave até amaciar sem queimar.',
            '4. Dourar os 400 g de carne bovina moída grossa rica em colágeno até eliminar umidade superficial.',
            '5. Deglaçar com 1 copo de vinho (120 ml didáticos) soltando sabores do fundo até reduzir (sem afirmar eliminação total de álcool).',
            '6. Adicionar 1 c.s. de extrato duplo, 200 g de passata e caldo leve quente aos poucos.',
            '7. Cozinhar lentamente por 2 a 3 horas com tampa parcial em fogo mínimo, incorporando o copo de leite opcional (120 ml didáticos) na metade da cocção e ajustando sal e pimenta ao final.',
          ],
          techniques: [
            'Soffritto em corte fino e cocção suave',
            'Liberação gradual de gordura da pancetta fresca não defumada',
            'Selagem de carne com colágeno e deglaçagem controlada com vinho',
            'Cozimento lento de 2–3 horas e adição de leite opcional na metade da cocção',
          ],
          controlPoints: [
            'Uso obrigatório de carne moída grossa com colágeno e pancetta fresca não defumada.',
            'Não afirmar evaporação de 100% do álcool na redução do vinho.',
            'Controle rigoroso de tempo e temperatura no resfriamento rápido da eventual sobra do molho (RDC 216/2004).',
          ],
          expectedResult:
            'Ragù encorpado, escuro-avermelhado, brilhante e macio, com gordura integrada e equilíbrio entre carne, soffritto e tomate moderado.',
          errorsAndFixes: [
            'Carne ressecada: fogo alto demais ou pouco caldo leve ao longo das 2–3 horas.',
            'Perfil defumado incorreto: troca de pancetta fresca por bacon defumado.',
            'Fundo grudado ou queimado: manter chama mínima e mexer periodicamente umedecendo com caldo quente.',
          ],
          chefTips: [
            'Como esta receita rende 6 porções e a montagem clássica de Bolonha usa ~400 g de ragù para 4 porções de massa, já planeje o resfriamento seguro da sobra.',
          ],
          allergens:
            'ALERGÊNICOS OBRIGATÓRIOS (Anvisa RDC 727/2022): Contém LEITE quando utilizado o leite integral opcional na cocção (ou Parmigiano na finalização). INFORMAÇÃO ADICIONAL DE COMPOSIÇÃO (fora da lista obrigatória brasileira): contém salsão, carne suína e vinho.',
          conservation:
            'Resfriamento rápido da sobra de molho após a porcionagem, mantendo sob refrigeração controlada (<= 5 °C) ou congelamento conforme Anvisa RDC 216/2004. Descongelar sempre sob refrigeração antes de reaquecer integralmente. Sem prazo comercial sem validação técnica.',
          foodSafetyNotes: [
            'Prevenção de contaminação cruzada entre carnes cruas, vegetais e utensílios prontos.',
            'Resfriamento rápido em recipientes rasos e descongelamento refrigerado conforme Anvisa RDC 216/2004.',
          ],
          references: [
            {
              label: 'Accademia Italiana della Cucina — Vero Ragù alla Bolognese (20/04/2023)',
              url: 'https://accademia1953.it/it/notizie/notizia/l%E2%80%99accademia-italiana-della-cucina-deposita-la-ricetta-aggiornata-del-vero-rag%C3%B9-alla',
            },
            {
              label: 'Anvisa — Boas Práticas (RDC 216/2004) e Rotulagem de Alergênicos (RDC 727/2022)',
              url: 'https://www.gov.br/anvisa/pt-br/assuntos/alimentos',
            },
          ],
          didacticAdaptations:
            'Conversão de 1 copo (120 ml vinho / 120 ml leite opcional) e 3 colheres de sopa (45 ml azeite) expressamente identificada como padronização didática FerveC.',
          practicalValidationStatus:
            'Peso final cozido do ragù e rendimento fracionado em bancada pendentes de validação física.',
        },
      },
    ],
    assemblyGuide: {
      title: 'Montagem final — Referência Turismo de Bolonha e controle de sobra',
      reference: 'Bologna Welcome (Tagliatelle al Ragù — 4 porções)',
      points: [
        '1. Rendimento da massa (Ficha Técnica A): 4 porções (400 g de farinha tipo 00, 4 ovos médios e 1 pitada de sal).',
        '2. Rendimento do molho (Ficha Técnica B): 6 porções completas segundo a Accademia Italiana della Cucina (20/04/2023).',
        '3. Quantidade na montagem final: utilize aproximadamente 400 g de ragù pronto para envolver as 4 porções de tagliatelle fresco (referência Turismo de Bolonha), ajustando com pequena colher de água do cozimento se necessário e Parmigiano-Reggiano opcional.',
        '4. Possível sobra de molho: como o molho rende 6 porções e a montagem consome ~400 g para 4 porções de massa, resfrie rapidamente a eventual sobra do ragù em recipiente raso limpo e conserve sob refrigeração (<= 5 °C) ou congelamento conforme Anvisa RDC 216/2004.',
        '5. Validação prática pendente: o peso cozido final da massa fresca, a fração exata por prato montado e o corte definitivo do tagliatelle (7 mm cru / 8 mm cozido histórico vs 8 mm cru contemporâneo) aguardam validação física em bancada (nenhum peso cozido inventado).',
      ],
    },
  },
  {
    id: 'sauces',
    title: 'Molhos italianos: Pomodoro & Burro e Salvia',
    subtitle: 'Molhos Essenciais Italianos: redução aromática e emulsão na manteiga',
    region: 'Cozinha Italiana',
    yield: 'Pomodoro: 4 porções (sugestão 320–400 g massa seca) | Burro e Salvia: referência inicial 4 porções (sujeito a testes)',
    duration: '30–40 min',
    level: 'Iniciante',
    technique: 'Redução controlada, concentração de sabor e emulsão de manteiga',
    adaptation:
      'Dois molhos essenciais ensinados lado a lado. No Pomodoro, sugere-se acompanhar 320 a 400 g de massa seca para quatro pessoas como referência de porcionamento; no Burro e Salvia, a formulação de 100 g de manteiga é referência inicial para quatro porções sujeita a testes conforme formato (ravioli, tortelli ou massas recheadas) e quantidade de massa.',
    ingredients: [
      'POMODORO: 800 g de tomate pelado em lata (com seu líquido)',
      'POMODORO: 30 ml de azeite extravirgem',
      'POMODORO: 1 dente de alho, opcional',
      'POMODORO: 1/2 cebola pequena, opcional',
      'POMODORO: folhas de manjericão fresco e sal a gosto',
      'POMODORO (sugestão de acompanhamento para 4 pessoas): 320 a 400 g de massa seca',
      'BURRO E SALVIA (ref. inicial 4 porções): 100 g de manteiga sem sal',
      'BURRO E SALVIA: 8 a 12 folhas de sálvia fresca',
      'BURRO E SALVIA: água do cozimento da massa, quanto baste',
      'BURRO E SALVIA: sal a gosto, quando necessário',
      'BURRO E SALVIA: Parmigiano-Reggiano ralado, opcional',
    ],
    allergens:
      'ALERGÊNICOS SEPARADOS (Anvisa RDC 727/2022): MOLHO POMODORO básico (tomate, azeite, alho/cebola, manjericão e sal) não contém alergênicos obrigatórios da lista brasileira; a massa de acompanhamento adiciona TRIGO (CONTÉM GLÚTEN) e eventuais OVOS. MOLHO BURRO E SALVIA contém LEITE (manteiga e Parmigiano opcional) e, quando servido com ravioli, tortelli ou massas recheadas, soma TRIGO/GLÚTEN, OVOS e alergênicos do recheio escolhido.',
    sauceCards: [
      {
        name: 'Molho 1 · Pomodoro clássico',
        intro:
          'Redução equilibrada aproveitando o tomate pelado e seu líquido, distinguindo concentração de sabor de redução química de acidez e finalizada com manjericão fresco.',
        ingredients: [
          '800 g de tomate pelado (aproveitando seu líquido)',
          '30 ml de azeite extravirgem',
          '1 dente de alho, opcional',
          '1/2 cebola pequena, opcional',
          'Sal a gosto e folhas de manjericão fresco',
          'Sugestão de porcionamento (4 pessoas): 320 a 400 g de massa seca',
        ],
        steps: [
          'Aqueça os 30 ml de azeite em fogo baixo e controle o calor ao perfumar o alho e/ou cebola opcionais, sem dourar demais ou queimar.',
          'Junte os 800 g de tomate pelado com seu líquido e esmague delicadamente os tomates maiores.',
          'Realize redução inicial de aproximadamente 20 a 30 minutos em fogo baixo, mexendo de vez em quando e ajustando conforme a consistência.',
          'Ajuste o sal sem depender de açúcar obrigatório; finalize fora do fogo com folhas de manjericão fresco higienizadas.',
        ],
        tip: 'A redução de 20–30 min concentra açúcares e compostos aromáticos naturais do tomate, mudando a percepção de acidez no paladar — mas não afirma-se que cozinhar mais necessariamente reduz a acidez química (pH). Não é necessário açúcar obrigatório.',
      },
      {
        name: 'Molho 2 · Burro e Salvia',
        intro:
          'Emulsão delicada de manteiga aromatizada com sálvia fresca e água do cozimento, ideal para ravioli, tortelli e outras massas recheadas.',
        ingredients: [
          '100 g de manteiga sem sal (ref. inicial 4 porções)',
          '8 a 12 folhas de sálvia fresca, higienizadas e secas',
          'Água do cozimento da massa, quanto baste',
          'Sal a gosto, quando necessário',
          'Parmigiano-Reggiano ralado, opcional',
        ],
        steps: [
          'Controle a temperatura em fogo baixo a médio para derreter os 100 g de manteiga sem sal.',
          'Perfume com as 8 a 12 folhas de sálvia sem queimar os sólidos do leite.',
          'Distinga o ponto: manteiga derretida (neutra), manteiga dourada controlada (aromas agradáveis de avelã) e manteiga queimada (escura e amarga — descartar).',
          'Junte ravioli, tortelli ou massa recheada cozida e emulsione com água do cozimento aos poucos até brilho uniforme; finalize com Parmigiano opcional.',
        ],
        tip: 'Aromatize mantendo rigor térmico: o douramento leve controlado traz aromas agradáveis, enquanto queimar os sólidos do leite amarga o molho.',
      },
    ],
    steps: [
      [
        'Apresentação comparativa e alergênicos',
        'Compare os dois molhos essenciais lado a lado: Pomodoro (base vegetal reduzida para 320–400 g de massa seca) e Burro e Salvia (base láctea emulsionada, referência inicial de 100 g para ravioli, tortelli e massas recheadas).',
        'Separe claramente alergênicos do molho e da massa escolhida antes de iniciar.',
      ],
      [
        'Higiene e preparo dos vegetais e ervas',
        'Higienize mãos, bancada, utensílios, folhas de manjericão e folhas de sálvia conforme Anvisa RDC 216/2004, secando cuidadosamente a sálvia para evitar respingos na manteiga.',
        'Ervas limpas e bem secas garantem segurança e infusão aromática limpa.',
      ],
      [
        'Pomodoro: aromáticos e redução (20–30 min)',
        'Controle o calor do azeite com alho e/ou cebola opcionais, incorpore os 800 g de tomate pelado aproveitando seu líquido e reduza inicialmente por 20 a 30 minutos em fogo baixo, ajustando à consistência.',
        'Cozinhar concentra sabor e suaviza a percepção de acidez no paladar, sem afirmar redução química garantida da acidez nem exigir açúcar.',
      ],
      [
        'Pomodoro: finalização com manjericão fresco',
        'Ajuste o sal do Pomodoro e finalize com folhas de manjericão fresco fora da fervura intensa. Combine com 320 a 400 g de massa seca cozida para 4 porções.',
        'Folhas frescas no encerramento preservam cor e aroma herbáceo.',
      ],
      [
        'Burro e Salvia: temperatura e pontos da manteiga',
        'Derreta os 100 g de manteiga sem sal em fogo baixo a médio com 8 a 12 folhas de sálvia, diferenciando manteiga derretida, manteiga dourada controlada (aromas agradáveis) e manteiga queimada (sólidos lácteos queimados).',
        'Não deixe os sólidos do leite queimarem para não gerar amargor.',
      ],
      [
        'Burro e Salvia: emulsificação e acompanhamento',
        'Envolva ravioli, tortelli ou outra massa recheada cozida na manteiga aromatizada e junte pequenas adições de água do cozimento para formar emulsão sedosa. Sirva imediatamente, com Parmigiano-Reggiano opcional.',
        'Observe como a água rica em amido liga a manteiga sem necessidade de creme de leite.',
      ],
    ],
    techniques: [
      'Controle térmico de aromáticos em azeite',
      'Aproveitamento do líquido do tomate e redução de 20–30 minutos',
      'Diferença entre concentração de sabor e acidez química',
      'Aromatização de manteiga com sálvia fresca',
      'Diferenciação entre manteiga derretida, manteiga dourada e manteiga queimada',
      'Emulsificação de manteiga com água do cozimento para massas recheadas',
    ],
    errors: [
      'Alho ou cebola escurecidos no Pomodoro: reduza o calor e reinicie antes de entrar o tomate.',
      'Usar açúcar obrigatório no Pomodoro ou afirmar redução química de pH pelo cozimento: foque na redução controlada de 20–30 min e escolha de tomates maduros.',
      'Manteiga queimada no Burro e Salvia: sólidos do leite escureceram por temperatura alta; descarte e recomece controlando a chama.',
      'Emulsão separada na manteiga: adicione água do cozimento aos poucos mexendo fora do calor intenso.',
    ],
    chefTip:
      'Dominar redução no Pomodoro e controle térmico na manteiga com sálvia abre caminho para acompanhar desde massas secas até ravioli e tortelli.',
    imageStatus: 'Ilustração dos ingredientes disponível; validação prática em bancada pendente.',
    techSheet: {
      originalName: 'Sugo al Pomodoro & Burro e Salvia',
      portugueseExplanation:
        'Dois molhos clássicos italianos estudados em paralelo: molho de tomate pelado reduzido com manjericão e emulsão aromática de manteiga sem sal com folhas de sálvia.',
      region: 'Cozinha Italiana',
      yield:
        'Pomodoro: 4 porções (sugestão de 320–400 g de massa seca) · Burro e Salvia: referência inicial para 4 porções (sujeito a testes conforme formato/massa)',
      portionQuantity:
        'Porção pronta em g/ml sujeita à validação prática em bancada conforme massa seca (Pomodoro) ou massa recheada (Burro e Salvia).',
      prepTime: '10 min (higienização de ervas e separação de insumos)',
      cookTime: '20–30 min (Pomodoro) · 5–10 min (Burro e Salvia)',
      totalEstimatedTime: '30–40 min culinários',
      workloadDistinction:
        'Tempo culinário (30–40 min); distinto da carga horária pedagógica do curso no certificado.',
      difficulty: 'Iniciante',
      ingredients: [
        'POMODORO — 800 g de tomate pelado italiano (com seu líquido)',
        'POMODORO — 30 ml de azeite extravirgem',
        'POMODORO — 1 dente pequeno de alho opcional e 1/2 cebola pequena opcional',
        'POMODORO — Folhas de manjericão fresco e sal quanto baste (sugestão: 320–400 g de massa seca)',
        'BURRO E SALVIA — 100 g de manteiga sem sal (referência inicial para 4 porções)',
        'BURRO E SALVIA — 8 a 12 folhas de sálvia fresca higienizadas e secas',
        'BURRO E SALVIA — Água do cozimento q.b., sal q.n. e Parmigiano-Reggiano opcional (ideal para ravioli/tortelli)',
      ],
      utensils: [
        'Duas frigideiras ou panela para molho e frigideira larga para manteiga',
        'Panela ampla para cozimento da massa escolhida',
        'Escorredor, concha, colher de madeira/espátula e centrífuga/papel para secar ervas',
      ],
      miseEnPlace: [
        'Higienizar mãos, superfícies, manjericão e sálvia fresca (RDC 216/2004); secar perfeitamente a sálvia.',
        'Separar os ingredientes de cada molho para comparar técnicas e prevenir contaminação cruzada com laticínios do Burro e Salvia.',
      ],
      detailedSteps: [
        '1. Apresentar comparação técnica e alergênicos separados de molho e massa.',
        '2. Higienizar bancada e ervas (secando bem a sálvia).',
        '3. Pomodoro: aquecer azeite suavemente, perfumar alho/cebola opcionais sem queimar, juntar 800 g de tomate pelado com líquido e reduzir por ~20–30 min.',
        '4. Pomodoro: ajustar sal sem açúcar obrigatório, finalizar com manjericão fresco e combinar com 320–400 g de massa seca.',
        '5. Burro e Salvia: derreter 100 g de manteiga com controle térmico, aromatizar com sálvia evitando queimar sólidos do leite.',
        '6. Emulsionar ravioli/tortelli/massas recheadas com água do cozimento aos poucos e servir imediatamente.',
      ],
      techniques: [
        'Redução controlada de tomate e aproveitamento do líquido da lata',
        'Controle térmico de aromáticos e sólidos lácteos da manteiga',
        'Emulsificação de gordura láctea com água rica em amido',
      ],
      controlPoints: [
        'Não afirmar redução química de acidez por cozimento prolongado; explicar concentração de sabor e percepção sensorial.',
        'Não recomendar açúcar como ingrediente obrigatório.',
        'Evitar queimar os sólidos do leite no Burro e Salvia (distinguir derretida, dourada e queimada).',
      ],
      expectedResult:
        'Pomodoro espesso, vermelho vivo e aromático sem amargor; Burro e Salvia com manteiga clara ou levemente dourada emulsionada, sálvia perfumada e brilho uniforme sobre a massa recheada.',
      errorsAndFixes: [
        'Manteiga queimada (preta/amarga): descarte e recomece em fogo mais baixo.',
        'Pomodoro ralo: estenda ligeiramente a redução em fogo brando.',
        'Molho de manteiga separado: acrescente água amilácea morna aos poucos fora do fogo forte.',
      ],
      chefTips: [
        'Se desejar notas amendoadas no Burro e Salvia, leve a manteiga apenas ao ponto dourado leve (noisette suave) com controle absoluto para jamais queimar os sólidos do leite.',
      ],
      allergens:
        'ALERGÊNICOS SEPARADOS (Anvisa RDC 727/2022): MOLHO POMODORO (sem massa) não leva alergênicos obrigatórios da lista brasileira; a massa seca adiciona TRIGO (CONTÉM GLÚTEN) e eventuais ovos. BURRO E SALVIA contém LEITE (manteiga e Parmigiano opcional), somando TRIGO/GLÚTEN, OVOS e ingredientes do recheio conforme ravioli ou tortelli escolhido.',
      conservation:
        'Burro e Salvia destina-se a consumo imediato (emulsão separa ao esfriar). Pomodoro base sem massa pode ser resfriado rapidamente e conservado sob refrigeração (<= 5 °C) ou congelado conforme Anvisa RDC 216/2004, sem prazo comercial sem validação técnica.',
      foodSafetyNotes: [
        'Higienização das mãos e das ervas frescas (manjericão e sálvia); prevenção de contaminação cruzada entre preparo sem lácteos (Pomodoro) e preparo com manteiga/queijo (Burro e Salvia).',
      ],
      references: [
        {
          label: 'Il Cucchiaio d’Argento — Spaghetti al Pomodoro',
          url: 'https://www.cucchiaio.it/ricetta/spaghetti-al-pomodoro/',
        },
        {
          label: 'Anvisa — Boas Práticas e Rotulagem de Alergênicos',
          url: 'https://www.gov.br/anvisa/pt-br/assuntos/alimentos',
        },
      ],
      didacticAdaptations:
        'Formulação de Pomodoro mantida com recomendação de 320–400 g de massa seca para 4 pessoas; Burro e Salvia mantido com 100 g de manteiga como referência inicial para 4 porções, direcionado a ravioli, tortelli e outras massas recheadas.',
      practicalValidationStatus:
        'Adequação de proporção final em relação a diferentes massas secas e recheadas sujeita à validação prática em bancada.',
    },
  },
];
