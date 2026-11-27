export interface IngredientItem {
  id: string;
  name: string;
  amount: string;
  image: string;
  alt: string;
  role: string;
  note: string;
}

export const INGREDIENTS_CATALOG: Record<string, IngredientItem> = {
  spaghetti: {
    id: 'spaghetti',
    name: 'Spaghetti',
    amount: '200 g',
    image: '/assets/step-icons/spaghetti.png',
    alt: 'Spaghetti seco italiano',
    role: 'Base estrutural da Carbonara; libera amido na água do cozimento para ajudar na emulsão.',
    note: 'Cozinhe al dente em água fervente com sal moderado e reserve água antes de escorrer. Alergênico: trigo (contém glúten).',
  },
  fettuccine: {
    id: 'fettuccine',
    name: 'Fettuccine fresco com ovos',
    amount: '400 g',
    image: '/assets/step-icons/farinha-ovos.png',
    alt: 'Fettuccine fresco artesanal com ovos',
    role: 'Massa fresca de tiras largas ao ovo que absorve a emulsão de manteiga e Parmigiano-Reggiano.',
    note: 'Não aplique 30 segundos indiscriminadamente; ajuste o tempo à espessura real e distinga peso da farinha do peso final da massa fresca. Alergênicos: trigo, ovos, glúten.',
  },
  penne: {
    id: 'penne',
    name: 'Penne rigate seco',
    amount: '320 g',
    image: '/assets/step-icons/penne.png',
    alt: 'Penne rigate seco italiano',
    role: 'Massa tubular seca com ranhuras externas (não é recheada) ideal para reter o molho Arrabbiata.',
    note: 'Padronização didática FerveC para 4 porções (Turismo Roma usa 400 g). Finalize diretamente no molho. Alergênico: trigo (contém glúten).',
  },
  fusilli: {
    id: 'fusilli',
    name: 'Fusilli seco',
    amount: '320 g',
    image: '/assets/step-icons/fusilli.png',
    alt: 'Fusilli seco em espiral',
    role: 'Adaptação didática em espiral que envolve o pesto sem cozimento intenso; tradicionais da Ligúria: trofie e trenette.',
    note: 'Cozinhe al dente e misture fora do fogo direto com o pesto e água amilácea. Alergênico: trigo (contém glúten).',
  },
  guanciale: {
    id: 'guanciale',
    name: 'Guanciale (sem pele)',
    amount: '100 g',
    image: '/assets/step-icons/guanciale.png',
    alt: 'Guanciale limpo cortado em tiras ou cubos uniformes',
    role: 'Fornece gordura saborosa e textura crocante característica da Carbonara quando dourado na própria gordura.',
    note: 'Retire a pele dura quando presente, corte uniforme, controle a quantidade de gordura mantida na frigideira e reserve parte crocante para finalizar.',
  },
  ovos: {
    id: 'ovos',
    name: 'Ovos inteiros pasteurizados',
    amount: '2 ovos pasteurizados',
    image: '/assets/step-icons/ovos-queijo.png',
    alt: 'Dois ovos inteiros pasteurizados',
    role: 'Formam a base proteica da emulsão cremosa quando combinados ao Pecorino e ao calor residual fora do fogo.',
    note: 'Padrão didático obrigatório para preparações sem cocção completa: calor residual não elimina microrganismos e textura cremosa não comprova segurança.',
  },
  gema: {
    id: 'gema',
    name: 'Gema pasteurizada',
    amount: '1 gema pasteurizada',
    image: '/assets/step-icons/farinha-ovos.png',
    alt: 'Gema pasteurizada adicional',
    role: 'Enriquece a cor dourada e intensifica a cremosidade da Carbonara sem usar creme de leite.',
    note: 'Mantenha sob refrigeração até o uso e incorpore com a frigideira afastada do calor direto.',
  },
  pecorino: {
    id: 'pecorino',
    name: 'Pecorino Romano',
    amount: '50 g ralado fino',
    image: '/assets/step-icons/pinoli-queijo.png',
    alt: 'Queijo Pecorino Romano ralado fino',
    role: 'Queijo de ovelha curado que confere salinidade e corpo à Carbonara (ou opção contemporânea na Arrabbiata).',
    note: 'Reserve uma fração dos 50 g para a montagem final da Carbonara. Alergênico: leite.',
  },
  pecorinoSardo: {
    id: 'pecorinoSardo',
    name: 'Pecorino Sardo',
    amount: '25 g ralado fino',
    image: '/assets/step-icons/pinoli-queijo.png',
    alt: 'Queijo Pecorino Sardo para Pesto Genovese',
    role: 'Queijo tradicional da Sardenha que complementa o Parmigiano no Pesto Genovese oficial de Gênova.',
    note: 'Padronização dentro do intervalo oficial genovês (sujeito à validação prática). Alergênico: leite.',
  },
  pimenta: {
    id: 'pimenta',
    name: 'Pimenta-do-reino',
    amount: 'Moída na hora',
    image: '/assets/step-icons/tempero.png',
    alt: 'Grãos de pimenta-do-reino preta',
    role: 'Aromatiza a Carbonara e atua apenas como adaptação opcional no Fettuccine Alfredo.',
    note: 'Moer na hora preserva óleos essenciais voláteis.',
  },
  sal: {
    id: 'sal',
    name: 'Sal',
    amount: 'Uso moderado',
    image: '/assets/step-icons/tempero.png',
    alt: 'Cristais de sal marinho',
    role: 'Tempera a água da massa e auxilia a maceração do alho no almofariz do Pesto Genovese.',
    note: 'Modere o sal especialmente na Carbonara por causa do Pecorino Romano e do guanciale.',
  },
  agua: {
    id: 'agua',
    name: 'Água do cozimento',
    amount: 'Quanto baste',
    image: '/assets/step-icons/agua.png',
    alt: 'Água rica em amido reservada do cozimento',
    role: 'Rica em amido, emulsiona gorduras e queijos na Carbonara, Alfredo, Pesto, Pomodoro e Burro e Salvia.',
    note: 'Reserve antes de escorrer a massa e adicione colher a colher para não afinar o molho.',
  },
  manteiga: {
    id: 'manteiga',
    name: 'Manteiga sem sal',
    amount: '100 g',
    image: '/assets/step-icons/manteiga.png',
    alt: '100 g de manteiga sem sal',
    role: 'Base lipídica do Fettuccine Alfredo (em temperatura ambiente) e do molho Burro e Salvia (4 porções iniciais).',
    note: 'Controle térmico rigoroso: diferencie manteiga derretida, dourada (aromas agradáveis) e queimada (sólidos queimados amargos). Alergênico: leite.',
  },
  parmigiano: {
    id: 'parmigiano',
    name: 'Parmigiano-Reggiano',
    amount: '240 g (Alfredo) / 50 g (Pesto)',
    image: '/assets/step-icons/pinoli-queijo.png',
    alt: 'Queijo Parmigiano-Reggiano maturado',
    role: 'Fornece estrutura e umami na mantecatura do Alfredo (pref. 24 meses), no Pesto Genovese e na finalização opcional.',
    note: 'Rale fino e incorpore aos poucos fora do fogo intenso para não empelotar. Alergênico: leite.',
  },
  parmigianoAlfredo: {
    id: 'parmigianoAlfredo',
    name: 'Parmigiano-Reggiano (24 meses)',
    amount: '240 g ralado fino',
    image: '/assets/step-icons/pinoli-queijo.png',
    alt: '240 g de Parmigiano-Reggiano maturado por 24 meses',
    role: 'Proporção oficial Alfredo alla Scrofa / Vanity Fair (2019) para 400 g de fettuccine e 100 g de manteiga.',
    note: 'Sem creme de leite: o queijo finamente ralado emulsiona diretamente com manteiga e água amilácea. Alergênico: leite.',
  },
  parmigianoPesto: {
    id: 'parmigianoPesto',
    name: 'Parmigiano-Reggiano',
    amount: '50 g ralado fino',
    image: '/assets/step-icons/pinoli-queijo.png',
    alt: '50 g de Parmigiano-Reggiano para Pesto Genovese',
    role: 'Queijo principal da mistura láctea do Pesto Genovese junto aos 25 g de Pecorino Sardo.',
    note: 'Adicione após macerar o alho, os pinoli e o manjericão. Alergênico: leite.',
  },
  tomate: {
    id: 'tomate',
    name: 'Tomate pelado / passata',
    amount: '400 g / 800 g / 200 g',
    image: '/assets/step-icons/tomate.png',
    alt: 'Tomates pelados italianos e passata',
    role: 'Base de Arrabbiata (400 g), Pomodoro (800 g, aproveitando o líquido) e Ragù (200 g passata + 1 c.s. extrato duplo).',
    note: 'A redução de 20–30 min no Pomodoro concentra sabor e suaviza a percepção de acidez sem exigir açúcar nem afirmar redução química garantida.',
  },
  tomateArrabbiata: {
    id: 'tomateArrabbiata',
    name: 'Tomate pelado',
    amount: '400 g (1 lata com líquido)',
    image: '/assets/step-icons/tomate.png',
    alt: '400 g de tomate pelado italiano com líquido',
    role: 'Base do molho Arrabbiata; aproveita-se o tomate pelado junto com o líquido para redução equilibrada.',
    note: 'Esmague delicadamente na frigideira sem ferver em excesso nem depender de açúcar.',
  },
  tomatePomodoro: {
    id: 'tomatePomodoro',
    name: 'Tomate pelado',
    amount: '800 g (com seu líquido)',
    image: '/assets/step-icons/tomate.png',
    alt: '800 g de tomate pelado italiano com líquido',
    role: 'Base do Pomodoro clássico; redução inicial de 20–30 min concentra sabor e suaviza a percepção de acidez.',
    note: 'Não afirma redução química de pH; açúcar não é obrigatório.',
  },
  tomateRagu: {
    id: 'tomateRagu',
    name: 'Passata + extrato duplo',
    amount: '200 g + 1 c.s.',
    image: '/assets/step-icons/tomate.png',
    alt: '200 g de passata de tomate e 1 colher de sopa de extrato duplo',
    role: 'Conforme Accademia Italiana della Cucina (20/04/2023): proporção moderada para realçar carne e soffritto nas 2–3 h de cocção.',
    note: 'Dilua o extrato duplo com caldo leve quente durante o cozimento lento.',
  },
  parmigianoOpcional: {
    id: 'parmigianoOpcional',
    name: 'Parmigiano-Reggiano (opcional)',
    amount: 'A gosto',
    image: '/assets/step-icons/pinoli-queijo.png',
    alt: 'Parmigiano-Reggiano ralado opcional para finalização',
    role: 'Finalização opcional servida à parte no Tagliatelle al Ragù ou ao concluir Burro e Salvia.',
    note: 'Alergênico obrigatório: leite.',
  },
  azeite: {
    id: 'azeite',
    name: 'Azeite extravirgem',
    amount: '30 ml / 40 ml / 45 ml / 70 ml',
    image: '/assets/step-icons/azeite.png',
    alt: 'Azeite extravirgem em garrafa',
    role: 'Extrai aromas na Arrabbiata (40 ml), Pomodoro (30 ml), Ragù (3 c.s. ≈ 45 ml) e emulsiona o Pesto (70 ml).',
    note: 'Em refogados com alho, controle o calor para não queimar.',
  },
  azeiteArrabbiata: {
    id: 'azeiteArrabbiata',
    name: 'Azeite extravirgem',
    amount: '40 ml',
    image: '/assets/step-icons/azeite.png',
    alt: '40 ml de azeite extravirgem para Arrabbiata',
    role: 'Meio de extração aromática em fogo baixo para alho e peperoncino/pimenta calabresa.',
    note: 'Controle o calor para não queimar o alho nem amargar o óleo.',
  },
  azeiteRagu: {
    id: 'azeiteRagu',
    name: 'Azeite extravirgem',
    amount: '3 c.s. (~45 ml FerveC)',
    image: '/assets/step-icons/azeite.png',
    alt: '3 colheres de sopa de azeite extravirgem',
    role: 'Padronização didática FerveC (~45 ml) para as 3 colheres de sopa da Accademia Italiana della Cucina.',
    note: 'Ajuda a derreter suavemente a pancetta fresca não defumada.',
  },
  azeitePomodoro: {
    id: 'azeitePomodoro',
    name: 'Azeite extravirgem',
    amount: '30 ml',
    image: '/assets/step-icons/azeite.png',
    alt: '30 ml de azeite extravirgem para Pomodoro',
    role: 'Base aromática suave para perfumar alho/cebola opcionais antes do tomate pelado.',
    note: 'Aqueça em fogo baixo sem queimar.',
  },
  azeitePesto: {
    id: 'azeitePesto',
    name: 'Azeite extravirgem',
    amount: '70 ml',
    image: '/assets/step-icons/azeite.png',
    alt: '70 ml de azeite extravirgem para Pesto Genovese',
    role: 'Adicionado gradualmente ao final da maceração para dar brilho e fluidez ao Pesto Genovese.',
    note: 'Nunca armazene pesto fresco com alho e azeite à temperatura ambiente (risco botulínico — NCHFP).',
  },
  alho: {
    id: 'alho',
    name: 'Alho',
    amount: '1 a 2 dentes',
    image: '/assets/step-icons/alho-pimenta.png',
    alt: 'Dente de alho fresco',
    role: 'Perfuma Arrabbiata (2 dentes), Pomodoro (1 opcional) e abre a maceração com sal no Pesto (1 dente pequeno).',
    note: 'Evite queimar em óleo quente; em pesto cru com azeite, mantenha refrigeração/congelamento ou consumo imediato.',
  },
  alhoArrabbiata: {
    id: 'alhoArrabbiata',
    name: 'Alho fresco',
    amount: '2 dentes',
    image: '/assets/step-icons/alho-pimenta.png',
    alt: '2 dentes de alho fresco para Arrabbiata',
    role: 'Perfuma os 40 ml de azeite em fogo baixo sem dourar em excesso.',
    note: 'Controle a chama para não queimar nem amargar.',
  },
  alhoPesto: {
    id: 'alhoPesto',
    name: 'Alho fresco',
    amount: '1 dente pequeno',
    image: '/assets/step-icons/almofariz.png',
    alt: '1 dente pequeno de alho no almofariz para Pesto Genovese',
    role: 'Macerado com pitada de sal logo no início do Pesto Genovese até formar pasta.',
    note: 'Nunca armazene preparo cru de alho em azeite fora de refrigeração (risco botulínico — NCHFP).',
  },
  alhoPomodoro: {
    id: 'alhoPomodoro',
    name: 'Alho (opcional)',
    amount: '1 dente',
    image: '/assets/step-icons/tempero.png',
    alt: '1 dente de alho opcional para Pomodoro',
    role: 'Aromático opcional no azeite antes dos 800 g de tomate pelado (ou 1/2 cebola pequena opcional).',
    note: 'Perfume suavemente sem escurecer.',
  },
  pimentaCalabresa: {
    id: 'pimentaCalabresa',
    name: 'Peperoncino / pimenta calabresa',
    amount: 'A gosto',
    image: '/assets/step-icons/alho-pimenta.png',
    alt: 'Peperoncino italiano ou pimenta calabresa seca',
    role: 'Define a picância vibrante do Penne all’Arrabbiata; a pimenta calabresa é alternativa acessível ao peperoncino.',
    note: 'Dose gradualmente para realçar o tomate sem encobrir seu sabor.',
  },
  manjericao: {
    id: 'manjericao',
    name: 'Manjericão fresco',
    amount: '60 g (Pesto) / folhas (Pomodoro)',
    image: '/assets/step-icons/manjericao.png',
    alt: 'Folhas verdes frescas de manjericão',
    role: 'Protagonista aromático do Pesto Genovese (60 g de folhas) e finalizador fresco do Pomodoro.',
    note: 'Higienize conforme RDC 216/2004 e seque cuidadosamente. Evite calor intenso ou atrito prolongado para prevenir oxidação.',
  },
  manjericaoPomodoro: {
    id: 'manjericaoPomodoro',
    name: 'Manjericão fresco',
    amount: 'Folhas a gosto',
    image: '/assets/step-icons/manjericao.png',
    alt: 'Folhas frescas de manjericão higienizadas para Pomodoro',
    role: 'Finalizador aromático adicionado ao desligar o fogo no molho Pomodoro clássico.',
    note: 'Higienize conforme RDC 216/2004 e evite fervura prolongada após adicionar.',
  },
  manjericaoPesto: {
    id: 'manjericaoPesto',
    name: 'Folhas de manjericão fresco',
    amount: '60 g de folhas',
    image: '/assets/step-icons/manjericao.png',
    alt: '60 g de folhas de manjericão frescas higienizadas e secas',
    role: 'Base aromática principal do Pesto Genovese na padronização oficial genovesa.',
    note: 'Higienize e seque integralmente antes de incorporar após alho e pinoli.',
  },
  pinoli: {
    id: 'pinoli',
    name: 'Pinoli',
    amount: '30 g',
    image: '/assets/step-icons/pinoli-queijo.png',
    alt: '30 g de sementes de pinoli',
    role: 'Entrega maciez e untuosidade delicada ao Pesto Genovese na etapa logo após o alho.',
    note: 'Alergênico obrigatório (Anvisa RDC 727/2022): contém pinoli / oleaginosa.',
  },
  salvia: {
    id: 'salvia',
    name: 'Sálvia fresca',
    amount: '8–12 folhas',
    image: '/assets/step-icons/manteiga-salvia.png',
    alt: '8 a 12 folhas frescas de sálvia',
    role: 'Aromatiza os 100 g de manteiga sem sal no molho Burro e Salvia para massas recheadas.',
    note: 'Higienize e seque antes de levar à manteiga em fogo baixo a médio.',
  },
  farinha: {
    id: 'farinha',
    name: 'Farinha tipo 00 + ovos (Massa)',
    amount: '400 g + 4 ovos médios',
    image: '/assets/step-icons/farinha-ovos.png',
    alt: 'Farinha de trigo tipo 00 e ovos para tagliatelle (4 porções)',
    role: 'Rendimento de 4 porções para o tagliatelle artesanal: sova de 15–20 min e descanso protegido de ~30 min.',
    note: 'Referência de corte histórico ~7 mm crua (8 mm cozida), existindo cortes contemporâneos de 8 mm crua. Alergênicos: trigo, ovos, glúten.',
  },
  carne: {
    id: 'carne',
    name: 'Carne bovina + pancetta + soffritto',
    amount: '400 g + 150 g + 180 g',
    image: '/assets/step-icons/carne.png',
    alt: 'Carne bovina moída grossa, pancetta fresca não defumada e soffritto',
    role: 'Base do Ragù (6 porções, Accademia 2023): carne moída grossa rica em colágeno, pancetta fresca não defumada e 60/60/60 g de cebola, cenoura e salsão.',
    note: 'Alergênicos/composição: informe separadamente salsão e carne suína (não integram a lista obrigatória brasileira Anvisa).',
  },
  vinho: {
    id: 'vinho',
    name: 'Vinho e leite opcional (Ragù)',
    amount: '1 copo cada (~120 ml FerveC)',
    image: '/assets/step-icons/vinho.png',
    alt: 'Taça de vinho culinário para deglaçagem do ragù',
    role: '1 copo de vinho branco/tinto para deglaçar e 1 copo de leite integral opcional adicionado na metade do cozimento lento (2–3 h).',
    note: '120 ml é padronização didática FerveC. Não afirme eliminação total do álcool na cocção. Leite é alergênico obrigatório; vinho é informação adicional.',
  },
};

export function getIngredientsForModuleStage(moduleId: string, stageIndex: number): IngredientItem[] {
  const C = INGREDIENTS_CATALOG;
  if (moduleId === 'carbonara') {
    const byStage: IngredientItem[][] = [
      [C.agua, C.sal, C.spaghetti],
      [C.guanciale],
      [C.spaghetti, C.agua, C.sal],
      [C.ovos, C.gema, C.pecorino, C.pimenta],
      [C.spaghetti, C.guanciale, C.ovos, C.agua],
      [C.spaghetti, C.guanciale, C.pecorino, C.pimenta],
    ];
    return byStage[stageIndex] || [C.spaghetti, C.guanciale, C.ovos, C.pecorino];
  }
  if (moduleId === 'alfredo') {
    const byStage: IngredientItem[][] = [
      [C.manteiga, C.parmigianoAlfredo, C.fettuccine],
      [C.agua, C.sal],
      [C.fettuccine, C.agua],
      [C.manteiga],
      [C.manteiga, C.parmigianoAlfredo, C.agua],
      [C.fettuccine, C.manteiga, C.parmigianoAlfredo, C.agua],
      [C.parmigianoAlfredo, C.pimenta],
    ];
    return byStage[stageIndex] || [C.manteiga, C.parmigianoAlfredo, C.agua];
  }
  if (moduleId === 'arrabbiata') {
    const byStage: IngredientItem[][] = [
      [C.penne, C.tomateArrabbiata, C.azeiteArrabbiata, C.alhoArrabbiata],
      [C.alhoArrabbiata, C.pimentaCalabresa],
      [C.azeiteArrabbiata, C.alhoArrabbiata, C.pimentaCalabresa],
      [C.tomateArrabbiata],
      [C.tomateArrabbiata, C.sal, C.pimentaCalabresa],
      [C.penne, C.agua, C.sal],
      [C.penne, C.tomateArrabbiata, C.agua],
      [C.pecorino, C.pimentaCalabresa],
    ];
    return byStage[stageIndex] || [C.penne, C.tomateArrabbiata, C.alhoArrabbiata, C.pimentaCalabresa];
  }
  if (moduleId === 'pesto') {
    const byStage: IngredientItem[][] = [
      [C.manjericaoPesto],
      [C.alhoPesto, C.sal],
      [C.pinoli, C.alhoPesto],
      [C.manjericaoPesto, C.pinoli],
      [C.parmigianoPesto, C.pecorinoSardo],
      [C.azeitePesto, C.manjericaoPesto],
      [C.fusilli, C.agua, C.sal],
      [C.fusilli, C.manjericaoPesto, C.azeitePesto],
      [C.agua, C.fusilli],
      [C.fusilli, C.parmigianoPesto, C.pecorinoSardo, C.pinoli],
    ];
    return byStage[stageIndex] || [C.manjericaoPesto, C.pinoli, C.parmigianoPesto, C.pecorinoSardo, C.azeitePesto];
  }
  if (moduleId === 'ragù') {
    if (stageIndex <= 2) return [C.carne, C.azeiteRagu];
    if (stageIndex === 3) return [C.carne];
    if (stageIndex === 4) return [C.vinho, C.carne];
    if (stageIndex <= 6) return [C.tomateRagu, C.vinho, C.carne];
    if (stageIndex <= 10) return [C.farinha, C.sal];
    return [C.farinha, C.carne, C.parmigianoOpcional, C.agua];
  }
  if (moduleId === 'sauces') {
    const byStage: IngredientItem[][] = [
      [C.tomatePomodoro, C.azeitePomodoro, C.manteiga, C.salvia],
      [C.manjericaoPomodoro, C.salvia, C.alhoPomodoro],
      [C.tomatePomodoro, C.azeitePomodoro, C.alhoPomodoro],
      [C.tomatePomodoro, C.manjericaoPomodoro, C.sal],
      [C.manteiga, C.salvia],
      [C.manteiga, C.salvia, C.agua, C.parmigianoOpcional],
    ];
    return byStage[stageIndex] || [C.tomatePomodoro, C.manteiga, C.manjericaoPomodoro, C.salvia];
  }
  return [C.spaghetti, C.azeite, C.sal];
}
