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
    role: 'Base estrutural do prato; libera amido na água do cozimento para ajudar na emulsão.',
    note: 'Cozinhe em água fervente salgada até o ponto al dente e reserve um pouco da água antes de escorrer.',
  },
  guanciale: {
    id: 'guanciale',
    name: 'Guanciale',
    amount: '100 g',
    image: '/assets/step-icons/guanciale.png',
    alt: 'Guanciale cortado em tiras',
    role: 'Fornece gordura saborosa e textura dourada característica da Carbonara.',
    note: 'Deve estar previamente cortado antes de ir ao fogo. Doure gradualmente sem queimar.',
  },
  ovos: {
    id: 'ovos',
    name: 'Ovos inteiros',
    amount: '2 ovos inteiros',
    image: '/assets/step-icons/ovos-queijo.png',
    alt: 'Dois ovos inteiros frescos',
    role: 'Formam a estrutura proteica da base cremosa quando combinados ao queijo e ao calor residual.',
    note: 'Textura cremosa não comprova segurança microbiológica; considere ovos pasteurizados e siga orientações confiáveis.',
  },
  gema: {
    id: 'gema',
    name: 'Gema adicional',
    amount: '1 gema',
    image: '/assets/step-icons/farinha-ovos.png',
    alt: 'Gema de ovo fresca em tigela',
    role: 'Enriquece a cor dourada e intensifica a cremosidade da emulsão sem precisar de creme de leite.',
    note: 'Incorpore apenas com a frigideira afastada do fogo direto para evitar coagulação.',
  },
  pecorino: {
    id: 'pecorino',
    name: 'Pecorino Romano',
    amount: '50 g ralado',
    image: '/assets/step-icons/pinoli-queijo.png',
    alt: 'Queijo Pecorino Romano ralado',
    role: 'Queijo de ovelha curado que traz salinidade, profundidade e corpo à mistura.',
    note: 'Ralar fino facilita a dissolução homogênea com os ovos e a água da massa.',
  },
  pimenta: {
    id: 'pimenta',
    name: 'Pimenta-do-reino',
    amount: 'Moída na hora',
    image: '/assets/step-icons/tempero.png',
    alt: 'Grãos de pimenta-do-reino preta',
    role: 'Aromatiza e equilibra a untuosidade do guanciale e do Pecorino.',
    note: 'Moer na hora preserva os óleos essenciais e o aroma fresco.',
  },
  sal: {
    id: 'sal',
    name: 'Sal',
    amount: 'Para a água',
    image: '/assets/step-icons/tempero.png',
    alt: 'Cristais de sal marinho',
    role: 'Tempera a massa desde o interior durante o cozimento em água fervente.',
    note: 'Como guanciale e Pecorino já são salgados, ajuste com cautela.',
  },
  agua: {
    id: 'agua',
    name: 'Água do cozimento',
    amount: 'Quanto baste',
    image: '/assets/step-icons/agua.png',
    alt: 'Água rica em amido reservada do cozimento',
    role: 'Rica em amido, liga a gordura e o queijo formando um molho brilhante e fluido.',
    note: 'Reserve antes de escorrer a massa e adicione aos poucos na finalização.',
  },
  manteiga: {
    id: 'manteiga',
    name: 'Manteiga sem sal',
    amount: '100 g a 160 g',
    image: '/assets/step-icons/manteiga.png',
    alt: 'Manteiga sem sal em bloco',
    role: 'Base lipídica que se une à água rica em amido e ao queijo na mantecatura.',
    note: 'Controle o fogo para derreter suavemente sem escurecer nem amargar.',
  },
  parmigiano: {
    id: 'parmigiano',
    name: 'Parmigiano-Reggiano',
    amount: 'Ralado fino',
    image: '/assets/step-icons/pinoli-queijo.png',
    alt: 'Queijo Parmigiano-Reggiano',
    role: 'Traz umami e cremosidade quando incorporado gradualmente fora do calor intenso.',
    note: 'Adicione aos poucos enquanto mistura para evitar que empelote.',
  },
  tomate: {
    id: 'tomate',
    name: 'Tomate pelado',
    amount: '400 g a 800 g',
    image: '/assets/step-icons/tomate.png',
    alt: 'Tomates pelados italianos maduros',
    role: 'Constrói acidez, doçura natural e corpo ao molho vermelho durante a redução.',
    note: 'Desmanche com cuidado e cozinhe em fogo moderado ou baixo para concentrar o sabor.',
  },
  azeite: {
    id: 'azeite',
    name: 'Azeite extravirgem',
    amount: '30 ml a 100 ml',
    image: '/assets/step-icons/azeite.png',
    alt: 'Azeite extravirgem em garrafa',
    role: 'Extrai compostos aromáticos de alho, pimenta e ervas; confere brilho ao pesto e molhos.',
    note: 'Em refogados, evite aquecer em excesso para não queimar o alho.',
  },
  alho: {
    id: 'alho',
    name: 'Alho',
    amount: '1 a 2 dentes',
    image: '/assets/step-icons/alho-pimenta.png',
    alt: 'Cabeça e dente de alho fresco',
    role: 'Perfuma o azeite em infusão aromática ou compõe a base do pesto genovese.',
    note: 'Não deixe escurecer na frigideira para evitar sabor amargo.',
  },
  pimentaCalabresa: {
    id: 'pimentaCalabresa',
    name: 'Pimenta calabresa',
    amount: 'A gosto',
    image: '/assets/step-icons/alho-pimenta.png',
    alt: 'Flocos de pimenta calabresa seca',
    role: 'Define a picância vibrante do Penne all’Arrabbiata.',
    note: 'Dose gradualmente para equilibrar calor e sabor sem mascarar o tomate.',
  },
  manjericao: {
    id: 'manjericao',
    name: 'Manjericão fresco',
    amount: '50 g / folhas',
    image: '/assets/step-icons/manjericao.png',
    alt: 'Folhas verdes frescas de manjericão',
    role: 'Protagonista aromático do Pesto Genovese e finalizador do molho Pomodoro.',
    note: 'Lave e seque muito bem as folhas antes de triturar; evite calor intenso sobre o pesto.',
  },
  pinoli: {
    id: 'pinoli',
    name: 'Pinoli',
    amount: '30 g',
    image: '/assets/step-icons/pinoli-queijo.png',
    alt: 'Sementes de pinoli',
    role: 'Traz maciez, gordura delicada e textura amanteigada ao Pesto Genovese.',
    note: 'Contém oleaginosas: confira sempre observações de alergênicos.',
  },
  salvia: {
    id: 'salvia',
    name: 'Sálvia fresca',
    amount: '8–12 folhas',
    image: '/assets/step-icons/manteiga-salvia.png',
    alt: 'Folhas frescas de sálvia',
    role: 'Aromatiza a manteiga no molho clássico Burro e Salvia.',
    note: 'Deixe perfumar brevemente em fogo baixo a médio sem queimar a manteiga.',
  },
  farinha: {
    id: 'farinha',
    name: 'Farinha tipo 00',
    amount: '400 g',
    image: '/assets/step-icons/farinha-ovos.png',
    alt: 'Farinha de trigo tipo 00 peneirada',
    role: 'Estrutura a massa fresca de tagliatelle ao ser hidratada e sovada com ovos.',
    note: 'Respeite o descanso da massa para facilitar a abertura uniforme.',
  },
  carne: {
    id: 'carne',
    name: 'Carne, pancetta e soffritto',
    amount: 'Base do ragù',
    image: '/assets/step-icons/carne.png',
    alt: 'Preparo de carne moída com soffritto',
    role: 'Base de sabor profundo desenvolvida pelo cozimento lento com legumes e pancetta.',
    note: 'Deixe perder o excesso de umidade antes da deglaçagem e mantenha fogo baixo.',
  },
  vinho: {
    id: 'vinho',
    name: 'Vinho para deglaçagem',
    amount: '120 ml',
    image: '/assets/step-icons/vinho.png',
    alt: 'Taça de vinho culinário',
    role: 'Solta os resíduos saborosos do fundo da panela e acrescenta complexidade ácida.',
    note: 'Permita que o álcool evapore antes de seguir para a passata e o cozimento lento.',
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
      [C.manteiga, C.parmigiano, C.spaghetti],
      [C.agua, C.sal],
      [C.spaghetti, C.agua],
      [C.manteiga],
      [C.manteiga, C.parmigiano, C.agua],
      [C.spaghetti, C.manteiga, C.parmigiano, C.agua],
      [C.parmigiano, C.pimenta],
    ];
    return byStage[stageIndex] || [C.manteiga, C.parmigiano, C.agua];
  }
  if (moduleId === 'arrabbiata') {
    const byStage: IngredientItem[][] = [
      [C.tomate, C.azeite, C.alho, C.pimentaCalabresa],
      [C.alho, C.pimentaCalabresa],
      [C.azeite, C.alho, C.pimentaCalabresa],
      [C.tomate],
      [C.tomate, C.sal, C.pimentaCalabresa],
      [C.spaghetti, C.agua, C.sal],
      [C.spaghetti, C.tomate, C.agua],
      [C.pecorino, C.pimentaCalabresa],
    ];
    return byStage[stageIndex] || [C.tomate, C.alho, C.pimentaCalabresa, C.azeite];
  }
  if (moduleId === 'pesto') {
    const byStage: IngredientItem[][] = [
      [C.manjericao],
      [C.manjericao, C.pinoli, C.parmigiano, C.pecorino],
      [C.manjericao, C.pinoli, C.alho, C.azeite],
      [C.parmigiano, C.pecorino, C.azeite],
      [C.spaghetti, C.agua, C.sal],
      [C.manjericao, C.spaghetti],
      [C.agua, C.azeite],
      [C.manjericao, C.parmigiano],
    ];
    return byStage[stageIndex] || [C.manjericao, C.pinoli, C.parmigiano, C.azeite];
  }
  if (moduleId === 'ragù') {
    if (stageIndex <= 2) return [C.carne, C.azeite];
    if (stageIndex === 3) return [C.carne];
    if (stageIndex === 4) return [C.vinho, C.carne];
    if (stageIndex <= 6) return [C.tomate, C.carne];
    if (stageIndex <= 10) return [C.farinha, C.ovos, C.sal];
    return [C.farinha, C.carne, C.parmigiano, C.agua];
  }
  if (moduleId === 'sauces') {
    const byStage: IngredientItem[][] = [
      [C.tomate, C.azeite, C.manteiga, C.salvia],
      [C.manjericao, C.salvia, C.alho],
      [C.tomate, C.azeite, C.alho, C.manjericao],
      [C.manteiga, C.salvia, C.agua],
      [C.sal, C.agua, C.parmigiano],
      [C.tomate, C.manteiga, C.manjericao, C.salvia],
    ];
    return byStage[stageIndex] || [C.tomate, C.manteiga, C.manjericao, C.salvia];
  }
  return [C.spaghetti, C.azeite, C.sal];
}
