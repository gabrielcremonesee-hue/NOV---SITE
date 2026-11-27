import { exam, QUESTION_OPTION_KEYS, questions, type QuizQuestion } from './courseData.ts';
import { extraRecipes, type ExtraRecipe } from './recipesData.ts';

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
export type AttemptType = 'work' | 'exam';

export function isValidModuleKey(value: string): value is ModuleKey {
  return (ALL_MODULE_KEYS as readonly string[]).includes(value);
}

interface CuratedModuleAssessments {
  work: QuizQuestion[];
  exam: QuizQuestion[];
}

export interface QuestionAttemptSnapshot {
  questionId: string;
  prompt: string;
  selectedOptionId: string;
  selectedText: string;
  correctOptionId: string;
  correctText: string;
  isCorrect: boolean;
  explanation: string;
}

const MODULE_ASSESSMENT_BANKS: Record<Exclude<ModuleKey, 'carbonara'>, CuratedModuleAssessments> = {
  alfredo: {
    work: [
      {
        id: 'alf-w1',
        optionIds: ['alf-w1-a', 'alf-w1-b', 'alf-w1-c', 'alf-w1-d'],
        correctOptionId: 'alf-w1-c',
        q: 'Na padronização de 4 porções do Fettuccine Alfredo segundo o Alfredo alla Scrofa (Vanity Fair, 2019), qual proporção de manteiga sem sal e Parmigiano-Reggiano acompanha 400 g de fettuccine fresco?',
        a: [
          '150 g de manteiga sem sal e 150 g de Parmigiano-Reggiano jovem ralado grosso.',
          '80 g de manteiga com sal e 180 g de Pecorino Romano curado.',
          '100 g de manteiga sem sal em temperatura ambiente e 240 g de Parmigiano-Reggiano (pref. 24 meses).',
          '120 g de manteiga noisette e 200 g de queijo Grana Padano em lascas.',
        ],
        correct: 2,
        why: 'A referência publicada pelo Alfredo alla Scrofa emprega 100 g de manteiga sem sal e 240 g de Parmigiano-Reggiano (preferencialmente 24 meses) para 400 g de fettuccine fresco com ovos.',
        tip: 'Rale o Parmigiano bem fino antes de ir ao fogo para dissolver de maneira uniforme na manteecatura.',
      },
      {
        id: 'alf-w2',
        optionIds: ['alf-w2-a', 'alf-w2-b', 'alf-w2-c', 'alf-w2-d'],
        correctOptionId: 'alf-w2-a',
        q: 'Qual é a composição básica recomendada para produzir o fettuccine fresco artesanal utilizado no Módulo 2?',
        a: [
          'Farinha de trigo tipo 00 (ou mistura didática com sêmola), ovos frescos pasteurizados e pitada opcional de sal na massa ou apenas na água.',
          'Farinha de milho fina hidratada com leite integral e duas colheres de creme de leite.',
          'Farinha de trigo integral, clara em neve batida e azeite extravirgem em partes iguais.',
          'Polvilho doce escaldado com caldo de legumes e duas gemas cruas não pasteurizadas.',
        ],
        correct: 0,
        why: 'A massa clássica fresca ao ovo combina farinha de trigo adequada e ovos em proporção equilibrada (~100 g de farinha para 1 ovo médio), distinguindo-se peso seco de ingredientes do peso final hidratado.',
        tip: 'Diferencie sempre na ficha técnica o peso da farinha seca do peso final da massa já sovada e cortada.',
      },
      {
        id: 'alf-w3',
        optionIds: ['alf-w3-a', 'alf-w3-b', 'alf-w3-c', 'alf-w3-d'],
        correctOptionId: 'alf-w3-d',
        q: 'Na mantecatura tradicional do Fettuccine Alfredo apresentada no curso, qual papel cumpre a água do cozimento?',
        a: [
          'Diluir excessivamente o queijo para formar um caldo ralo antes de escorrer.',
          'Substituir integralmente a manteiga sem sal na formação do creme.',
          'Resfriar a travessa para que a manteiga volte ao estado sólido sobre o prato.',
          'Fornecer amido em suspensão e umidade controlada para ligar manteiga e Parmigiano em emulsão brilhante sem creme de leite.',
        ],
        correct: 3,
        why: 'O amido liberado pela massa na água do cozimento estabiliza a emulsão entre a gordura da manteiga e as proteínas/gorduras do Parmigiano-Reggiano.',
        tip: 'Adicione a água do cozimento colher a colher enquanto revolve a massa delicadamente.',
      },
      {
        id: 'alf-w4',
        optionIds: ['alf-w4-a', 'alf-w4-b', 'alf-w4-c', 'alf-w4-d'],
        correctOptionId: 'alf-w4-b',
        q: 'Sobre o uso de creme de leite e pimenta-do-reino na versão histórica do Alfredo alla Scrofa trabalhada em aula, qual afirmação está correta?',
        a: [
          'O creme de leite fresco é indispensável para impedir a separação do queijo, e a pimenta entra antes da manteiga.',
          'Não se utiliza creme de leite na receita tradicional romana; a pimenta-do-reino é apenas opcional na finalização.',
          'Usa-se creme de leite UHT apenas quando o Parmigiano tiver mais de 24 meses de maturação.',
          'A pimenta-do-reino preta é obrigatória na massa crua, enquanto o creme de leite entra na água fervente.',
        ],
        correct: 1,
        why: 'O Alfredo tradicional é construído exclusivamente com manteiga, Parmigiano-Reggiano e água do cozimento; pimenta-do-reino pode aparecer apenas como acabamento opcional.',
        tip: 'Mantenha o foco na dupla manteiga + queijo para sentir o equilíbrio lácteo autêntico do prato.',
      },
      {
        id: 'alf-w5',
        optionIds: ['alf-w5-a', 'alf-w5-b', 'alf-w5-c', 'alf-w5-d'],
        correctOptionId: 'alf-w5-a',
        q: 'Quais alergênicos obrigatórios pela Anvisa RDC 727/2022 precisam constar no aviso do Fettuccine Alfredo artesanal?',
        a: [
          'Trigo (CONTÉM GLÚTEN), ovos (presentes na massa fresca) e leite (presente na manteiga e no Parmigiano-Reggiano).',
          'Apenas leite de vaca e pimenta-do-reino moída, pois massa cozida não retém glúten.',
          'Somente trigo e pinoli, já que o Parmigiano maturado por 24 meses perde proteínas lácteas.',
          'Apenas ovos crus e salsão, pois manteiga sem sal é isenta de derivados de leite.',
        ],
        correct: 0,
        why: 'Mesmo com 24 meses de maturação (que reduz lactose, mas não elimina caseína/proteínas do leite), o queijo e a manteiga declaram LEITE, somados a TRIGO (glúten) e OVOS da massa fresca.',
        tip: 'Nunca confunda redução natural de lactose com ausência de alergênicos do leite.',
      },
      {
        id: 'alf-w6',
        optionIds: ['alf-w6-a', 'alf-w6-b', 'alf-w6-c', 'alf-w6-d'],
        correctOptionId: 'alf-w6-c',
        q: 'O que define o preparo adequado da travessa antes de transferir o fettuccine cozido para a mantecatura final?',
        a: [
          'Gelá-la previamente no freezer para solidificar a manteiga na hora da mistura.',
          'Aquecê-la diretamente sobre chama alta até a manteiga espumar e escurecer.',
          'Mantê-la limpa, ampla e levemente aquecida, fora do fogo direto, com a manteiga em temperatura ambiente.',
          'Forrá-la com papel-toalha úmido para absorver o excesso de água da massa.',
        ],
        correct: 2,
        why: 'Uma travessa ampla e levemente morna fora do fogo direto permite que o calor da massa derreta a manteiga suavemente sem quebrar a emulsão do queijo.',
        tip: 'Disponha parte da manteiga no fundo da travessa morna antes de transferir o fettuccine.',
      },
    ],
    exam: [
      {
        id: 'alf-e1',
        optionIds: ['alf-e1-a', 'alf-e1-b', 'alf-e1-c', 'alf-e1-d'],
        correctOptionId: 'alf-e1-b',
        q: 'Em uma cozinha profissional, um aluno segue literalmente os "30 segundos de cozimento" citados pelo restaurante Alfredo alla Scrofa ao preparar um fettuccine artesanal feito à mão em rolo doméstico. A massa sai com centro farinhento e cru. Qual foi a falha técnica?',
        a: [
          'Faltou acrescentar 100 ml de azeite extravirgem dentro da água fervente.',
          'Desconsiderou que os 30 s dependem da lâmina ultrafina industrial/profissional do restaurante; massa artesanal exige ajuste de tempo pela espessura real e prova segura do ponto.',
          'A água fervente deveria estar a 70 °C em vez de 100 °C para evitar endurecer os ovos.',
          'O Parmigiano-Reggiano deveria ter sido fervido junto com a massa na panela.',
        ],
        correct: 1,
        why: 'Cada espessura de laminação e nível de secagem altera drasticamente o tempo de cocção; em bancada didática ou restaurante, o cozimento é controlado visualmente e pela prova.',
        tip: 'Use 30 s apenas como referência de massa ultrafina profissional e teste sempre uma tira antes de escorrer.',
      },
      {
        id: 'alf-e2',
        optionIds: ['alf-e2-a', 'alf-e2-b', 'alf-e2-c', 'alf-e2-d'],
        correctOptionId: 'alf-e2-d',
        q: 'Durante o serviço, ao incorporar os 240 g de Parmigiano-Reggiano sobre a massa ainda muito quente dentro de uma panela em chama baixa, o queijo se agrupa em fios elásticos e libera gordura líquida separada. Como prevenir essa falha na próxima batelada?',
        a: [
          'Substituir o Parmigiano por queijo minas frescal picado e dobrar o fogo da panela.',
          'Lavar a massa cozida em água fria da torneira antes de adicionar a manteiga gelada.',
          'Misturar todo o queijo ralado grosso em banho-maria acima de 95 °C sem água do cozimento.',
          'Ralar o queijo bem fino, realizar a mantecatura fora do calor direto com adição gradual de água do cozimento morna e distribuir o queijo aos poucos.',
        ],
        correct: 3,
        why: 'Calor excessivo direto e falta de fase aquosa desnaturam as proteínas do queijo, provocando grumos elásticos e separação da gordura láctea.',
        tip: 'Se começar a espessar demais na mistura, afaste imediatamente da fonte de calor e pingue água do cozimento.',
      },
      {
        id: 'alf-e3',
        optionIds: ['alf-e3-a', 'alf-e3-b', 'alf-e3-c', 'alf-e3-d'],
        correctOptionId: 'alf-e3-a',
        q: 'Um cozinheiro precisa preparar 4 porções usando fettuccine fresco artesanal feito na própria cozinha. Ao pesar os insumos da massa, confunde 400 g de farinha seca com 400 g de massa fresca pronta. Qual impacto prático ocorre na receita do Alfredo?',
        a: [
          '400 g de farinha com ~4 ovos rendem ~600 g de massa fresca hidratada, deixando os 100 g de manteiga e 240 g de queijo proporcionados para 400 g insuficientes para envolver toda a massa.',
          'O peso final da massa fresca após sovar cai para metade da farinha seca usada, tornando o molho exagerado.',
          'Não há diferença alguma porque ovos e água evaporam totalmente durante a sova na bancada.',
          'A mistura vira automaticamente massa seca de sêmola que exige 15 minutos de fervura.',
        ],
        correct: 0,
        why: 'Na panificação e massas frescas, ovos e umidade aumentam o peso final em torno de 45–55% em relação à farinha; na ficha do Alfredo, 400 g refere-se ao fettuccine fresco pronto.',
        tip: 'Ao produzir a massa do zero, pese 400 g das tiras frescas já cortadas para manter a proporção 400:100:240.',
      },
      {
        id: 'alf-e4',
        optionIds: ['alf-e4-a', 'alf-e4-b', 'alf-e4-c', 'alf-e4-d'],
        correctOptionId: 'alf-e4-c',
        q: 'Na pré-produção da praça de massas frescas em restaurante, o fettuccine artesanal foi laminado e descansado em ninhos sobre bandeja enfarinhada às 14h para o jantar das 20h. Que conduta atende à Anvisa RDC 216/2004?',
        a: [
          'Deixar os ninhos crus com ovos frescos descobertos em cima do forno desligado até a noite.',
          'Borrifar água filtrada e cobrir com pano úmido fora da geladeira por 6 horas.',
          'Manter a massa fresca crua com ovos devidamente protegida/etiquetada sob refrigeração controlada (<= 5 °C) ou congelamento rápido até a cocção.',
          'Pré-cozinhar metade dos ninhos e deixá-los imersos em água morna parada por 4 horas.',
        ],
        correct: 2,
        why: 'Massa fresca contém ovos e elevada atividade de água, favorecendo multiplicação microbiana à temperatura ambiente; conservação segura exige refrigeração controlada ou congelamento.',
        tip: 'Polvilhe levemente com semolina e acomode em caixas tampadas dentro da câmara fria.',
      },
      {
        id: 'alf-e5',
        optionIds: ['alf-e5-a', 'alf-e5-b', 'alf-e5-c', 'alf-e5-d'],
        correctOptionId: 'alf-e5-a',
        q: 'Ao abrir a massa fresca com rolo, o cozinheiro percebe que a folha encolhe elasticamente a cada passada e começa a rasgar nas bordas. Qual etapa técnica anterior foi negligenciada?',
        a: [
          'O descanso protegido da massa após a sova (~20–30 min) para relaxamento da rede de glúten.',
          'O acréscimo de duas colheres de vinagre de vinho tinto para quebrar as fibras do ovo.',
          'A fervura da massa ainda em bloco antes de passar no rolo ou cilindro.',
          'A adição de 100 g de manteiga derretida dentro da farinha durante a abertura.',
        ],
        correct: 0,
        why: 'Sem o descanso protegido, o glúten permanece tensionado pela sova e resiste ao alongamento, causando retração e fissuras; descansar relaxa as cadeias proteicas.',
        tip: 'Se a massa começar a oferecer resistência elástica no cilindro, cubra-a por 10 minutos e retome.',
      },
      {
        id: 'alf-e6',
        optionIds: ['alf-e6-a', 'alf-e6-b', 'alf-e6-c', 'alf-e6-d'],
        correctOptionId: 'alf-e6-d',
        q: 'Na finalização da travessa de Fettuccine Alfredo, você nota que a manteiga derreteu bem, mas o molho ainda apresenta leve poça aquosa no fundo e pouca aderência às tiras. Qual ajuste resolve na hora?',
        a: [
          'Adicionar mais 100 ml de água fria da torneira sobre o prato servido.',
          'Retornar a travessa para chama alta por 3 minutos sem mexer a massa.',
          'Escorrer todo o queijo restante para uma peneira fina e servir seco.',
          'Movimentar/revolver o fettuccine vigorosamente fora do fogo com pequenos incrementos graduais de Parmigiano ralado fino até encorpar e brilhar.',
        ],
        correct: 3,
        why: 'A agitação mecânica com queijo fino incorpora o excesso pontual de água amilácea na rede emulsificada, transformando o líquido solto em filme cremoso.',
        tip: 'Reserve cerca de um quinto do Parmigiano exatamente para ajustar a viscosidade nos segundos finais.',
      },
      {
        id: 'alf-e7',
        optionIds: ['alf-e7-a', 'alf-e7-b', 'alf-e7-c', 'alf-e7-d'],
        correctOptionId: 'alf-e7-b',
        q: 'Um auxiliar retira a manteiga diretamente da câmara fria a 3 °C em cubo único duro no instante em que o fettuccine já está na travessa. Qual consequência previsível acontece durante o empratamento?',
        a: [
          'A manteiga gelada ferve imediatamente ao tocar a massa e carameliza os açúcares do trigo.',
          'A manteiga demora a fundir e exige mistura prolongada, fazendo a massa esfriar antes de completar a emulsão lisa com o Parmigiano.',
          'A manteiga fria neutraliza todos os alergênicos do leite presentes no queijo.',
          'A água do cozimento perde todo o amido e endurece o fettuccine instantaneamente.',
        ],
        correct: 1,
        why: 'Como a mantecatura do Alfredo é rápida e feita fora do fogo, manteiga muito gelada rouba calor da massa recém-escorrida, prejudicando temperatura de serviço e homogeneidade.',
        tip: 'Corte os 100 g de manteiga sem sal em cubos pequenos em temperatura ambiente durante o mise en place.',
      },
      {
        id: 'alf-e8',
        optionIds: ['alf-e8-a', 'alf-e8-b', 'alf-e8-c', 'alf-e8-d'],
        correctOptionId: 'alf-e8-c',
        q: 'Sobrou uma travessa grande de Fettuccine Alfredo já emulsionado ao final da demonstração em sala de aula. Qual orientação de conservação evita falhas técnicas e riscos sanitários?',
        a: [
          'Manter a travessa coberta com filme plástico em cima da bancada até o turno do dia seguinte.',
          'Adicionar creme de leite frio à sobra pronta e congelar por 90 dias garantindo textura idêntica.',
          'Lembrar que a emulsão foi feita para consumo imediato (ao reaquecer tende a separar); se houver sobra eventual, resfriar rápido e manter sob refrigeração rigorosa conforme RDC 216/2004, sem garantir qualidade original nem prazo comercial.',
          'Deixar em banho-maria morno a 40 °C por até 12 horas para servir em outro evento.',
        ],
        correct: 2,
        why: 'Emulsões de manteiga e Parmigiano perdem estabilidade quando esfriam/reaquecem; sanitariamente, sobras precisam de resfriamento rápido e refrigeração segura fora da zona de perigo (não 40 °C nem bancada).',
        tip: 'Produza o Fettuccine Alfredo sob demanda por lote de serviço para entregar brilho e temperatura ideais.',
      },
    ],
  },
  arrabbiata: {
    work: [
      {
        id: 'arr-w1',
        optionIds: ['arr-w1-a', 'arr-w1-b', 'arr-w1-c', 'arr-w1-d'],
        correctOptionId: 'arr-w1-a',
        q: 'Qual é a classificação técnica correta do penne rigate utilizado no Módulo 3 (Penne all’Arrabbiata) e sua carga didática de massa?',
        a: [
          'Massa tubular seca frisada (não é massa recheada), em versão didática de 320 g para 4 porções (enquanto o Turismo de Roma usa 400 g).',
          'Massa fresca recheada com ricota e ervas, padronizada obrigatoriamente em 500 g por aluno.',
          'Massa longa em fita equivalente ao tagliatelle bolonhês, servida sempre com 240 g de queijo.',
          'Massa cilíndrica oca cozida por imersão sem água, exclusivamente em 600 g por receita.',
        ],
        correct: 0,
        why: 'Penne rigate é uma massa curta tubular seca com ranhuras externas que retêm molho; não possui recheio. A FerveC usa 320 g didáticos para 4 porções.',
        tip: 'As ranhuras do penne rigate capturam melhor o azeite aromatizado e os fragmentos de tomate.',
      },
      {
        id: 'arr-w2',
        optionIds: ['arr-w2-a', 'arr-w2-b', 'arr-w2-c', 'arr-w2-d'],
        correctOptionId: 'arr-w2-c',
        q: 'Quais ingredientes compõem o conjunto base padronizado pela FerveC para o molho all’Arrabbiata?',
        a: [
          '800 g de creme de leite fresco, 100 g de manteiga sem sal, cebola roxa e noz-moscada.',
          '150 g de pancetta defumada, 60 g de cenoura, 60 g de salsão e 120 ml de vinho tinto.',
          '400 g de tomate pelado com seu líquido, 40 ml de azeite extravirgem, 2 dentes de alho, peperoncino (ou pimenta calabresa), sal, salsinha opcional (10 g) e Pecorino Romano opcional.',
          '60 g de folhas de manjericão cru, 30 g de pinoli, 50 g de Parmigiano e zero aquecimento.',
        ],
        correct: 2,
        why: 'O Arrabbiata romano destaca tomate pelado, alho em infusão suave no azeite, picância do peperoncino, salsinha opcional e toque contemporâneo opcional de Pecorino Romano.',
        tip: 'Se não encontrar peperoncino italiano fresco ou seco, a pimenta calabresa em flocos é alternativa didática equivalente.',
      },
      {
        id: 'arr-w3',
        optionIds: ['arr-w3-a', 'arr-w3-b', 'arr-w3-c', 'arr-w3-d'],
        correctOptionId: 'arr-w3-b',
        q: 'Qual é o efeito esperado ao aquecer o alho e o peperoncino em fogo baixo nos 40 ml de azeite extravirgem antes de entrar com o tomate?',
        a: [
          'Carbonizar o alho até ficar marrom-escuro para dar sabor defumado ao tomate.',
          'Aromatizar o azeite por infusão suave mantendo o alho claro/levemente dourado, sem queimar nem amargar.',
          'Fritar o alho até desidratar totalmente e depois descartar todo o azeite da frigideira.',
          'Cozinhar a massa crua diretamente no azeite quente por 5 minutos antes do tomate.',
        ],
        correct: 1,
        why: 'A capsaicina e os compostos aromáticos do alho são lipossolúveis e migram rapidamente para o azeite morno; queimar o alho arruína o molho com amargor.',
        tip: 'Assim que o alho perfumar e começar a mudar sutilmente de cor, adicione imediatamente o tomate pelado.',
      },
      {
        id: 'arr-w4',
        optionIds: ['arr-w4-a', 'arr-w4-b', 'arr-w4-c', 'arr-w4-d'],
        correctOptionId: 'arr-w4-d',
        q: 'Qual característica define o termo gastronômico "all’arrabbiata" na tradição romana?',
        a: [
          'Molho branco amanteigado aromatizado exclusivamente com folhas de sálvia.',
          'Emulsão fria de queijo de cabra e pinoli macerados em almofariz de mármore.',
          'Ragù cozido lentamente por 3 horas com carnes suína e bovina ricas em colágeno.',
          'Molho de tomate picante e vibrante ("nervoso/apimentado") marcado pela presença do peperoncino e do alho.',
        ],
        correct: 3,
        why: '"Arrabbiata" remete à intensidade picante dada pelo peperoncino em base rápida de tomate e alho no azeite.',
        tip: 'Ajuste a quantidade de sementes da pimenta conforme o grau de picância desejado pela turma.',
      },
      {
        id: 'arr-w5',
        optionIds: ['arr-w5-a', 'arr-w5-b', 'arr-w5-c', 'arr-w5-d'],
        correctOptionId: 'arr-w5-c',
        q: 'Na finalização do Penne all’Arrabbiata, como se comportam a salsinha fresca (10 g) e o Pecorino Romano dentro da ficha técnica?',
        a: [
          'Ambos entram no azeite frio no início junto com o tomate cru sem aquecimento.',
          'São proibidos em qualquer versão contemporânea italiana do prato.',
          'A salsinha picada e o Pecorino Romano ralado entram como finalizações opcionais (sendo o Pecorino uma variação contemporânea que exige declaração de alergênico LEITE).',
          'A salsinha substitui totalmente o tomate pelado e o Pecorino substitui a água do cozimento.',
        ],
        correct: 2,
        why: 'Na versão clássica pura não vai queijo; entretanto, o uso de Pecorino Romano na finalização é variação contemporânea aceita, desde que sinalizada como opcional e comunicada quanto ao leite.',
        tip: 'Sempre avise o comensal quando incluir Pecorino Romano, pois altera o perfil de alergênicos do prato.',
      },
      {
        id: 'arr-w6',
        optionIds: ['arr-w6-a', 'arr-w6-b', 'arr-w6-c', 'arr-w6-d'],
        correctOptionId: 'arr-w6-a',
        q: 'Para higienizar os 10 g de salsinha fresca utilizada sem tratamento térmico final, qual procedimento atende às boas práticas sanitárias (Anvisa RDC 216/2004)?',
        a: [
          'Lavar em água corrente folha por folha, imergir em solução clorada própria para alimentos na diluição recomendada e enxaguar em água potável.',
          'Apenas sacudir o maço seco sobre a lixeira para remover terra superficial.',
          'Passar rapidamente em água quente do cozimento já salgada com o penne.',
          'Deixar de molho em azeite puro à temperatura ambiente por duas horas.',
        ],
        correct: 0,
        why: 'Ervas adicionadas ao final sem cocção plena devem passar por lavagem, sanitização com produto regularizado conforme rótulo e enxágue em água potável.',
        tip: 'Seque bem a salsinha após o enxágue para evitar que escureça ou molhe o prato.',
      },
    ],
    exam: [
      {
        id: 'arr-e1',
        optionIds: ['arr-e1-a', 'arr-e1-b', 'arr-e1-c', 'arr-e1-d'],
        correctOptionId: 'arr-e1-d',
        q: 'Ao preparar o molho Arrabbiata em cozinha didática, o aluno deixa a frigideira aquecer em chama máxima antes de colocar os 2 dentes de alho picados nos 40 ml de azeite; em 20 segundos o alho fica escuro e exala odor acre. Qual é a decisão correta?',
        a: [
          'Seguir normalmente jogando o tomate pelado por cima e acrescentar duas colheres de açúcar.',
          'Retirar apenas os pedaços pretos com escumadeira e aproveitar o mesmo azeite queimado.',
          'Ferver o azeite queimado com 200 ml de água do cozimento até clarear a cor.',
          'Descartar o azeite e o alho queimados, higienizar/trocar a frigideira e recomeçar a infusão em fogo baixo para não contaminar todo o molho com amargor.',
        ],
        correct: 3,
        why: 'Compostos sulfurados queimados do alho impregnam permanentemente o azeite e amargam o tomate inteiro; recomeçar é a única correção limpa.',
        tip: 'Prefira alho em lâminas ou bem picado adicionado com o azeite ainda morno para controlar melhor a curva térmica.',
      },
      {
        id: 'arr-e2',
        optionIds: ['arr-e2-a', 'arr-e2-b', 'arr-e2-c', 'arr-e2-d'],
        correctOptionId: 'arr-e2-a',
        q: 'Para tornar a cozinha inclusiva a um convidado vegano ou alérgico ao leite na aula do Módulo 3, como deve ser conduzido o serviço do Penne all’Arrabbiata?',
        a: [
          'Preparar o molho sem o Pecorino Romano opcional (mantendo massa de trigo/semolina sem ovos, tomate, azeite, alho, peperoncino e salsinha) e usar utensílios limpos separados de preparos lácteos.',
          'Substituir o Pecorino por 100 g de manteiga sem sal para dar brilho ao molho de tomate.',
          'Informar que tomate reduzido por 20 minutos neutraliza as proteínas do Pecorino.',
          'Colocar o Pecorino na frigideira apenas nos últimos 10 segundos e servir como isento de leite.',
        ],
        correct: 0,
        why: 'Sem o Pecorino opcional (e com massa seca tradicional apenas de trigo e água), o prato naturalmente não contém leite nem ovos, bastando rigor contra contaminação cruzada.',
        tip: 'Mantenha o queijo opcional em tigela à parte com colher exclusiva na bancada de finalização.',
      },
      {
        id: 'arr-e3',
        optionIds: ['arr-e3-a', 'arr-e3-b', 'arr-e3-c', 'arr-e3-d'],
        correctOptionId: 'arr-e3-c',
        q: 'Um aluno escorre os 320 g de penne rigate já completamente cozidos até amolecer na água e depois deixa fervendo mais 4 minutos dentro do molho Arrabbiata. O resultado chega à mesa pastoso e quebradiço. Qual ajuste corrige a execução?',
        a: [
          'Deixar o penne descansar 15 minutos em água fria entre a panela e o molho.',
          'Cozinhar o penne seco sem água diretamente dentro do tomate pelado por 25 minutos.',
          'Retirar o penne 1 a 2 minutos antes do ponto final al dente e concluir a cocção na frigideira junto ao molho quente com um pouco de água do cozimento.',
          'Dobrar o azeite para 80 ml depois que o penne já estiver mole para firmar a massa.',
        ],
        correct: 2,
        why: 'Como a massa continua hidratando ao entrar no molho quente ("risottatura/saltare in padella"), deve sair firme da água para atingir o al dente exato no prato.',
        tip: 'Programe o cronômetro para checar a firmeza do tubo de penne 2 minutos antes do tempo da embalagem.',
      },
      {
        id: 'arr-e4',
        optionIds: ['arr-e4-a', 'arr-e4-b', 'arr-e4-c', 'arr-e4-d'],
        correctOptionId: 'arr-e4-b',
        q: 'Um cozinheiro substitui o peperoncino fresco inteiro por pimenta calabresa em flocos e adiciona todo o conteúdo de um envelope comercial sem observar picância, tornando o prato excessivamente ardido para os comensais. O que causou o desequilíbrio?',
        a: [
          'A ausência de queijo mussarela derretido para absorver os tomates pelados.',
          'A falta de dosagem gradual: pimentas secas em flocos concentram capsaicina nas sementes e variam muito em pungência, exigindo prova e ajuste progressivo no azeite.',
          'O uso de panela larga em vez de panela estreita durante a redução de 15 minutos.',
          'O corte transversal do penne rigate em lugar de espaguete comprido.',
        ],
        correct: 1,
        why: 'Flocos secos têm umidade baixa e sementes concentradas; sem dosagem cuidadosa e prova prévia do molho antes de envolver a massa, a picância foge do controle.',
        tip: 'Comece com pequena pitada na infusão e ajuste apenas ao final da redução se precisar de mais calor.',
      },
      {
        id: 'arr-e5',
        optionIds: ['arr-e5-a', 'arr-e5-b', 'arr-e5-c', 'arr-e5-d'],
        correctOptionId: 'arr-e5-c',
        q: 'Durante a aula, um estudante lê a ficha do Módulo 3 (320 g de penne) e pergunta por que uma receita oficial turística de Roma encontrada na internet indica 400 g de penne. Qual resposta didática é precisa?',
        a: [
          'A versão de 400 g é um erro de tradução porque penne rigate só existe em pacotes de 320 g.',
          'As duas medidas pesam exatamente o mesmo depois que a água evapora.',
          '320 g (80 g/pessoa para 4 porções) é a padronização didática FerveC, enquanto o Turismo de Roma publica 400 g para 4 pessoas (~100 g/pessoa); ambas são válidas desde que declaradas com transparência.',
          '400 g se refere a penne fresco recheado com carne bovina, não a massa seca.',
        ],
        correct: 2,
        why: 'Na Itália é comum porcionar 80–100 g de massa seca por pessoa; explicitar a referência original vs padronização do curso garante clareza pedagógica.',
        tip: 'Se usar 400 g em serviço comercial mais farto, observe se há necessidade de ajustar levemente molho e água amilácea.',
      },
      {
        id: 'arr-e6',
        optionIds: ['arr-e6-a', 'arr-e6-b', 'arr-e6-c', 'arr-e6-d'],
        correctOptionId: 'arr-e6-d',
        q: 'O molho Arrabbiata reduziu mais rápido que o previsto em fogo alto, ficando espesso demais antes que o penne fique pronto. Como restaurar a fluidez sem comprometer sabor e aderência?',
        a: [
          'Acrescentar 100 ml de óleo de soja cru e desligar o fogo imediatamente.',
          'Jogar meio copo de água fria da torneira sobre o tomate já seco na frigideira.',
          'Adicionar duas colheres de sopa de manteiga com sal e creme de leite.',
          'Abaixar o fogo e acrescentar conchas pequenas da água fervente do cozimento da massa para manter brilho, salinidade equilibrada e capacidade de envolver o penne.',
        ],
        correct: 3,
        why: 'A água amilácea quente devolve umidade e promove leve emulsificação com o azeite do molho sem diluir o sabor em água fria sem amido.',
        tip: 'Mantenha o fogo brando enquanto o penne cozinha ao lado.',
      },
      {
        id: 'arr-e7',
        optionIds: ['arr-e7-a', 'arr-e7-b', 'arr-e7-c', 'arr-e7-d'],
        correctOptionId: 'arr-e7-a',
        q: 'Ao preparar o mise en place, o estudante manipula pimenta peperoncino sem proteção ou lavagem posterior e em seguida coça os olhos ou toca outros ingredientes crus. Qual boa prática previne acidente e contaminação cruzada?',
        a: [
          'Lavar rigorosamente as mãos com água e sabão (ou usar luvas descartáveis trocadas logo após manusear pimenta) e higienizar tábua e faca separadas antes de manipular itens prontos.',
          'Passar um pano seco de louça nos dedos e continuar picando a salsinha na mesma tábua.',
          'Mergulhar a mão em azeite frio porque capsaicina dissolve instantaneamente em água pura.',
          'Secar a faca no avental para manter a picância concentrada para o próximo preparo.',
        ],
        correct: 0,
        why: 'A capsaicina permanece aderida à pele e às superfícies, causando irritação severa em mucosas e transferindo picância indesejada a outros pratos.',
        tip: 'Lave mãos, faca e tábua imediatamente após porcionar a pimenta.',
      },
      {
        id: 'arr-e8',
        optionIds: ['arr-e8-a', 'arr-e8-b', 'arr-e8-c', 'arr-e8-d'],
        correctOptionId: 'arr-e8-b',
        q: 'Sobrou apenas molho Arrabbiata preparado (sem a massa misturada) após a demonstração. Como deve ser conservado em conformidade com a Anvisa RDC 216/2004?',
        a: [
          'Armazenar o molho morno em pote fechado sobre a bancada por 24 horas para intensificar o sabor do alho.',
          'Resfriar rapidamente em recipiente raso, identificar com data e manter sob refrigeração controlada ou congelamento, evitando declarar validade comercial sem validação técnica.',
          'Deixar na panela destampada sobre o fogão desligado até o jantar do dia seguinte.',
          'Cobrir com uma camada grossa de azeite em temperatura ambiente e guardar no armário seco.',
        ],
        correct: 1,
        why: 'Molho cozido fora de refrigeração atravessa a zona de perigo microbiana; além disso, nunca se conserva preparo com alho e azeite em temperatura ambiente.',
        tip: 'Conserve sempre o molho separado da massa caso deseje aproveitar eventuais sobras em casa.',
      },
    ],
  },
  pesto: {
    work: [
      {
        id: 'pes-w1',
        optionIds: ['pes-w1-a', 'pes-w1-b', 'pes-w1-c', 'pes-w1-d'],
        correctOptionId: 'pes-w1-d',
        q: 'Quais quantidades de ingredientes compõem o molho Pesto Genovese na ficha técnica padronizada do Módulo 4?',
        a: [
          '120 g de manjericão, 60 g de castanha-de-caju, 100 g de muçarela e 140 ml de óleo de girassol.',
          '30 g de salsinha, 50 g de amendoim, 40 g de queijo coalho e 30 ml de azeite.',
          '40 g de rúcula, 30 g de nozes, 60 g de gorgonzola e 100 ml de creme de leite.',
          '60 g de folhas de manjericão fresco, 30 g de pinoli, 50 g de Parmigiano-Reggiano, 25 g de Pecorino Sardo, 70 ml de azeite extravirgem e 1 dente pequeno de alho.',
        ],
        correct: 3,
        why: 'A padronização FerveC adota 60 g de manjericão, 30 g de pinoli, 50 g de Parmigiano-Reggiano, 25 g de Pecorino Sardo, 70 ml de azeite extravirgem e 1 dente pequeno de alho.',
        tip: 'Note a combinação clássica dos dois queijos: Parmigiano-Reggiano (maior doçura/umami) e Pecorino Sardo (nota picante e salgada).',
      },
      {
        id: 'pes-w2',
        optionIds: ['pes-w2-a', 'pes-w2-b', 'pes-w2-c', 'pes-w2-d'],
        correctOptionId: 'pes-w2-b',
        q: 'Em relação ao formato da massa e às referências ligúres consultadas (VisitGenoa e Campionato Mondiale), o que é documentalmente correto afirmar?',
        a: [
          'O VisitGenoa exige exatamente 600 g de fusilli seco e proíbe trofie ou trenette.',
          'Na Ligúria, os formatos clássicos são trofie e trenette (VisitGenoa cita ~4 porções sem fixar 600 g de massa); o curso usa 320 g de fusilli seco como adaptação didática pela facilidade de acesso.',
          'O Campionato Mondiale determina o cozimento obrigatório do pesto no forno por 20 minutos.',
          'O fusilli é o único formato italiano reconhecido em Gênova desde o século XIX.',
        ],
        correct: 1,
        why: 'O VisitGenoa descreve o preparo clássico com trofie ou trenette para cerca de 4 pessoas sem fixar 600 g; a FerveC emprega 320 g de fusilli seco por razões didáticas e acessibilidade no Brasil.',
        tip: 'As espirais do fusilli retêm muito bem o pesto emulsionado mesmo em cozinha iniciante.',
      },
      {
        id: 'pes-w3',
        optionIds: ['pes-w3-a', 'pes-w3-b', 'pes-w3-c', 'pes-w3-d'],
        correctOptionId: 'pes-w3-c',
        q: 'Na sequência oficial em 10 etapas da aula do Módulo 4, qual ordem descreve corretamente a construção inicial da pasta aromática?',
        a: [
          'Aquecer o azeite até ferver, fritar os queijos ralados e só depois colocar o manjericão molhado.',
          'Processar primeiro todo o azeite com o fusilli cozido e misturar o alho cru por cima no prato.',
          'Higienizar e secar bem as folhas, macerar alho com pequena quantidade de sal, acrescentar pinoli, incorporar o manjericão, depois os queijos ralados e gradualmente o azeite.',
          'Macerar o manjericão antes da higienização, cobrir com vinho branco e acrescentar o sal apenas no dia seguinte.',
        ],
        correct: 2,
        why: 'A ordem progressiva (alho + sal -> pinoli -> folhas secas -> queijos -> azeite gradual) gera pasta homogênea com menor atrito e melhor emulsão.',
        tip: 'Secar integralmente as folhas após a higienização é a etapa 1 indispensável.',
      },
      {
        id: 'pes-w4',
        optionIds: ['pes-w4-a', 'pes-w4-b', 'pes-w4-c', 'pes-w4-d'],
        correctOptionId: 'pes-w4-a',
        q: 'Quais alergênicos obrigatórios devem ser comunicados aos alunos e consumidores no Fusilli al Pesto Genovese?',
        a: [
          'Trigo (CONTÉM GLÚTEN, na massa), leite (Parmigiano-Reggiano e Pecorino Sardo) e pinoli (castanhas/sementes).',
          'Apenas trigo e ovos, pois o pesto não contém produtos lácteos nem oleaginosas.',
          'Somente soja e salsão, já que o pinoli perde potencial alergênico ao ser macerado.',
          'Nenhum alergênico, pois todos os ingredientes principais do pesto são vegetais frescos.',
        ],
        correct: 0,
        why: 'Segundo a Anvisa RDC 727/2022, a formulação reúne cereais com glúten (trigo), leite (dois queijos) e pinoli (grupo de castanhas/oleaginosas).',
        tip: 'Caso utilize processador, garanta limpeza rigorosa antes de usar o equipamento para outra preparação.',
      },
      {
        id: 'pes-w5',
        optionIds: ['pes-w5-a', 'pes-w5-b', 'pes-w5-c', 'pes-w5-d'],
        correctOptionId: 'pes-w5-d',
        q: 'Qual método de ajuste de consistência deve ser aplicado ao envolver o fusilli cozido al dente no pesto?',
        a: [
          'Ferver o pesto dentro da panela da massa por 5 minutos antes de escorrer.',
          'Colocar a travessa direto sobre a chama do fogão até o queijo derreter em fios.',
          'Despejar 100 ml de vinagre branco para deixar o manjericão mais fluido.',
          'Misturar o pesto à massa fora do calor direto e ajustar a cremosidade com pequenas colheres de água do cozimento reservada.',
        ],
        correct: 3,
        why: 'O calor direto oxida e escurece o manjericão além de separar o azeite e coagular os queijos; a mistura é feita fora do fogo, usando água morna amilácea aos poucos.',
        tip: 'Reserve meia xícara de água do cozimento antes de escorrer o fusilli.',
      },
      {
        id: 'pes-w6',
        optionIds: ['pes-w6-a', 'pes-w6-b', 'pes-w6-c', 'pes-w6-d'],
        correctOptionId: 'pes-w6-b',
        q: 'Ao usar processador de alimentos como alternativa doméstica ao almofariz tradicional, qual cuidado técnico preserva cor e aroma do pesto?',
        a: [
          'Manter o processador ligado em velocidade máxima contínua por 4 minutos até aquecer a tigela.',
          'Trabalhar com lâmina/copo frios em pulsos curtos, sem aquecer por atrito nem triturar em excesso até oxidar.',
          'Adicionar água fervente dentro do copo junto com o manjericão para facilitar o corte.',
          'Processar apenas os pinoli quentes tostados e misturar o manjericão inteiro sem cortar.',
        ],
        correct: 1,
        why: 'Lâminas girando continuamente aquecem a mistura e rompem células rapidamente em contato com o ar, escurecendo o verde brilhante do manjericão.',
        tip: 'Se possível, resfrie brevemente o copo e as lâminas do processador antes dos pulsos curtos.',
      },
    ],
    exam: [
      {
        id: 'pes-e1',
        optionIds: ['pes-e1-a', 'pes-e1-b', 'pes-e1-c', 'pes-e1-d'],
        correctOptionId: 'pes-e1-a',
        q: 'Na inspeção de segurança alimentar (NCHFP e Anvisa RDC 216/2004), você encontra um pote de vidro com sobra de pesto caseiro contendo alho cru e azeite deixado há 18 horas sobre o balcão à temperatura ambiente, pois alguém acreditou que "o azeite protege o alho". Qual ação e justificativa são obrigatórias?',
        a: [
          'Descartar imediatamente o produto: misturas de alho cru em óleo à temperatura ambiente criam ambiente anaeróbico de baixa acidez favorável ao desenvolvimento de Clostridium botulinum e sua toxina; pesto deve ser consumido na hora, refrigerado rigorosamente ou congelado.',
          'Ferver o pote por 30 segundos na frigideira antes de servir sobre a massa quente, pois isso torna seguro qualquer armazenamento prévio.',
          'Acrescentar mais 25 g de Pecorino Sardo ralado e conservar em armário escuro por até 15 dias.',
          'Coar o azeite verde para reutilizá-lo à temperatura ambiente durante a semana.',
        ],
        correct: 0,
        why: 'Conforme o National Center for Home Food Preservation (NCHFP), alho/ervas em óleo fora da refrigeração oferecem risco real de botulismo; aquecimento doméstico comum não é medida corretiva segura após abuso de tempo/temperatura.',
        tip: 'Nunca armazene pesto artesanal com alho em azeite fora de refrigeração ou congelamento.',
      },
      {
        id: 'pes-e2',
        optionIds: ['pes-e2-a', 'pes-e2-b', 'pes-e2-c', 'pes-e2-d'],
        correctOptionId: 'pes-e2-c',
        q: 'Durante uma aula prática, dois grupos preparam o pesto com os mesmos ingredientes: o Grupo 1 entrega um molho verde-esmeralda cremoso; o Grupo 2 entrega um molho verde-amarronzado e aquoso no fundo da tigela. Analisando os erros mais prováveis do Grupo 2, qual combinação explica o defeito?',
        a: [
          'Usaram Parmigiano-Reggiano em vez de mussarela e maceraram em almofariz frio.',
          'Fizeram o pesto 100% no pilão de mármore com folhas perfeitamente secas.',
          'Deixaram umidade residual nas folhas de manjericão após a higienização e aqueceram o molho no processador contínuo ou diretamente sobre a boca do fogão.',
          'Pesaram exatamente 320 g de fusilli seco e reservaram água amilácea da panela.',
        ],
        correct: 2,
        why: 'Água superficial deixa o pesto aguado e prejudica a emulsão com o azeite, enquanto atrito/calor oxidam a clorofila do manjericão, gerando tom amarronzado.',
        tip: 'Centrifugue e seque suavemente em papel/pano limpo sem amassar os tecidos da folha antes de macerar.',
      },
      {
        id: 'pes-e3',
        optionIds: ['pes-e3-a', 'pes-e3-b', 'pes-e3-c', 'pes-e3-d'],
        correctOptionId: 'pes-e3-b',
        q: 'Ao terminar a cocção dos 320 g de fusilli seco, o cozinheiro escorre toda a água da panela na pia sem separar uma xícara, joga o pesto diretamente sobre a massa recém-saída na panela quente que ainda estava na chama desligada e o molho fica seco e empelotado. O que ele deveria ter feito?',
        a: [
          'Lavado o fusilli em água gelada e adicionado 70 ml de vinagre branco sobre a panela.',
          'Reservado água do cozimento antes de escorrer e transferido o fusilli para uma travessa fora do calor direto, soltando o pesto colher a colher com a água amilácea morna.',
          'Cozido o fusilli por apenas 2 minutos para manter o interior farinhento seco.',
          'Adicionado 200 ml de creme de leite frio para substituir a falta de água da panela.',
        ],
        correct: 1,
        why: 'O contato com fundo metálico superaquecido coagula as proteínas dos queijos e oxida o pesto; a água do cozimento morna fora do fogo cria fluido cremoso que adere às espirais.',
        tip: 'Use uma travessa previamente em temperatura ambiente (jamais a panela quente sobre a boca do fogão).',
      },
      {
        id: 'pes-e4',
        optionIds: ['pes-e4-a', 'pes-e4-b', 'pes-e4-c', 'pes-e4-d'],
        correctOptionId: 'pes-e4-d',
        q: 'Em auditoria de cardápio didático, percebe-se uma ficha antiga afirmando que "o portal VisitGenoa exige 600 g de massa para este pesto". Consultando a fonte original e o Campionato Mondiale, como corrigir a documentação?',
        a: [
          'Manter 600 g atribuídos ao VisitGenoa e mudar os ingredientes do pesto para 150 g de salsinha.',
          'Declarar que VisitGenoa proíbe porções menores que 1 kg de massa cozida.',
          'Informar que 600 g é o peso exato do fusilli depois de assado no forno.',
          'Corrigir a nota registrando que o VisitGenoa cita ~4 porções com trofie/trenette sem fixar 600 g nem discriminar peso seco vs fresco (e o Campionato aponta 4–6 porções), mantendo 320 g de fusilli como padronização didática sujeita à validação prática.',
        ],
        correct: 3,
        why: 'Fontes referenciais precisam ser citadas com fidelidade documental, diferenciando claramente o dado real do portal genovês da adaptação didática aplicada na FerveC.',
        tip: 'Nunca atribua números não publicados às instituições italianas consultadas.',
      },
      {
        id: 'pes-e5',
        optionIds: ['pes-e5-a', 'pes-e5-b', 'pes-e5-c', 'pes-e5-d'],
        correctOptionId: 'pes-e5-b',
        q: 'Um aluno pretende vender potes de pesto fresco artesanal com prazo de validade de 30 dias em prateleira ambiente, usando a ficha técnica da aula como justificativa. Qual resposta técnica do Instrutor está correta?',
        a: [
          'Aprovar o rótulo de 30 dias desde que o pote seja esterilizado em água fervente com o pesto dentro.',
          'Proibir categoricamente validade ambiente e explicar que nenhum prazo comercial pode ser estabelecido sem validação físico-química/microbiológica técnica (atividade de água, pH e cadeia fria conforme RDC 216/2004).',
          'Liberar 15 dias em temperatura ambiente caso substitua Pecorino Sardo por sal grosso.',
          'Autorizar 30 dias apenas em geladeira doméstica afirmando que não há risco com alho cru.',
        ],
        correct: 1,
        why: 'Receitas didáticas não substituem estudos de vida de prateleira nem controles industriais de pH/Aw exigidos para conservação segura de produtos vegetais frescos com alho e óleo.',
        tip: 'Separe sempre prática culinária imediata de rotulagem ou prazo de validade comercial.',
      },
      {
        id: 'pes-e6',
        optionIds: ['pes-e6-a', 'pes-e6-b', 'pes-e6-c', 'pes-e6-d'],
        correctOptionId: 'pes-e6-a',
        q: 'Na ausência temporária de almofariz e pilão para todos os alunos de uma turma grande, o instrutor libera processadores pequenos. Como organizar a ordem dos insumos no copo para minimizar aquecimento e garantir textura agradável?',
        a: [
          'Usar pulsos curtos começando por alho, sal e pinoli/parte do azeite, juntar as folhas bem secas em pulsos rápidos sem moer demais e finalizar misturando os queijos ralados e o restante do azeite delicadamente.',
          'Colocar primeiro toda a massa cozida quente no processador junto com o queijo e depois bater o manjericão.',
          'Bater apenas folhas com água gelada por 3 minutos contínuos até espumar antes de juntar óleo.',
          'Triturar primeiro 100 g de queijo com sal por 5 minutos em rotação contínua.',
        ],
        correct: 0,
        why: 'Reduzir o tempo de batimento direto sobre o manjericão e os queijos evita aquecimento excessivo por fricção e preserva cor e untuosidade.',
        tip: 'Se quiser ainda mais frescor no processador, incorpore parte dos queijos e ajuste de azeite à mão na tigela.',
      },
      {
        id: 'pes-e7',
        optionIds: ['pes-e7-a', 'pes-e7-b', 'pes-e7-c', 'pes-e7-d'],
        correctOptionId: 'pes-e7-d',
        q: 'Na validação em bancada, um aluno utiliza um dente de alho muito grande e brotado em vez de 1 dente pequeno sem germe, e não macera com sal antes dos pinoli. Como o erro aparece na análise sensorial?',
        a: [
          'O pesto fica completamente sem sabor e extremamente adocicado.',
          'Os pinoli endurecem como pedra após o contato com o queijo Parmigiano.',
          'A massa fusilli muda de cor para vermelho-escuro durante o cozimento.',
          'Pedaços irregulares de alho cru liberam picância sulfurosa agressiva que domina o aroma delicado do manjericão e dos queijos.',
        ],
        correct: 3,
        why: 'Macerar 1 dente pequeno de alho (idealmente sem o broto interno) com sal forma uma pasta fina homogênea que integra o aroma sem focos ardidos.',
        tip: 'Retire o miolo verde caso o dente de alho apresente início de brotação.',
      },
      {
        id: 'pes-e8',
        optionIds: ['pes-e8-a', 'pes-e8-b', 'pes-e8-c', 'pes-e8-d'],
        correctOptionId: 'pes-e8-c',
        q: 'Ao higienizar os 60 g de folhas de manjericão fresco para um preparo que não receberá cozimento direto posterior, qual cuidado sanitário é inegociável?',
        a: [
          'Passar rapidamente em jato de água morna da torneira para não precisar enxaguar depois.',
          'Deixar de molho apenas em suco de limão diluído por 1 minuto sem enxágue.',
          'Realizar seleção, lavagem em água corrente, imersão em solução sanitizante própria para hortifrútis conforme orientação do fabricante, enxágue em água potável e secagem completa.',
          'Cozinhar as folhas em água fervente por 2 minutos antes de levá-las ao almofariz.',
        ],
        correct: 2,
        why: 'Vegetais consumidos crus exigem sanitização química controlada (RDC 216/2004), nunca branqueamento neste preparo nem simples lavagem superficial.',
        tip: 'Descarte talos fibrosos duros ou folhas machucadas/oxidadas antes de pesar os 60 g líquidos de folhas.',
      },
    ],
  },
  ragù: {
    work: [
      {
        id: 'rag-w1',
        optionIds: ['rag-w1-a', 'rag-w1-b', 'rag-w1-c', 'rag-w1-d'],
        correctOptionId: 'rag-w1-c',
        q: 'Por que o Módulo 5 organiza o Tagliatelle al Ragù alla Bolognese em duas fichas técnicas independentes (Ficha A e Ficha B)?',
        a: [
          'Porque o ragù e a massa são sempre servidos em pratos diferentes em dias alternados.',
          'Porque a massa fresca é feita apenas com água e o ragù usa exclusivamente carne de frango.',
          'Porque a massa fresca artesanal rende 4 porções (400 g de farinha + 4 ovos), enquanto a fórmula oficial do Ragù da Accademia (2023) rende 6 porções — exigindo montagem porcionada (~400 g de ragù pronto) e gestão de eventual sobra.',
          'Porque a Ficha B proíbe o uso de Parmigiano-Reggiano e exige 3 horas de forno na massa crua.',
        ],
        correct: 2,
        why: 'Separar Ficha A (Tagliatelle, 4 porções) e Ficha B (Ragù, 6 porções) elimina a confusão matemática entre o lote de massa e o lote de molho da receita bolonhesa atualizada em 20/04/2023.',
        tip: 'Consulte sempre a seção de Montagem Final para alinhar o porcionamento de ~400 g de ragù sobre as 4 porções de massa.',
      },
      {
        id: 'rag-w2',
        optionIds: ['rag-w2-a', 'rag-w2-b', 'rag-w2-c', 'rag-w2-d'],
        correctOptionId: 'rag-w2-d',
        q: 'Na Ficha Técnica B (Ragù alla Bolognese — Accademia Italiana della Cucina, 2023), qual combinação de carnes e vegetais aromáticos forma a base do prato?',
        a: [
          '400 g de filé mignon em cubos grandes, 150 g de bacon defumado e apenas pimentão amarelo.',
          '500 g de linguiça suína fresca, 100 g de alho-poró e 800 g de tomate pelado.',
          '300 g de carne moída fina magra, 100 g de guanciale defumado e zero vegetais.',
          '400 g de carne bovina moída grossa rica em colágeno, 150 g de pancetta fresca suína (não defumada) e soffritto com 60 g de cebola, 60 g de cenoura e 60 g de salsão.',
        ],
        correct: 3,
        why: 'A atualização de 20/04/2023 mantém o corte bovino grosso rico em colágeno (400 g), pancetta fresca suína não defumada (150 g) e proporção igual 60/60/60 g de cebola, cenoura e salsão.',
        tip: 'Nunca use bacon ou pancetta defumada, pois a nota de fumaça descaracteriza o ragù bolonhês.',
      },
      {
        id: 'rag-w3',
        optionIds: ['rag-w3-a', 'rag-w3-b', 'rag-w3-c', 'rag-w3-d'],
        correctOptionId: 'rag-w3-b',
        q: 'Quais são as padronizações didáticas FerveC adotadas para as medidas italianas em copo/colher no Ragù (6 porções)?',
        a: [
          'Vinho: 300 ml; Leite: 350 ml; Azeite: 15 ml.',
          '1 copo de vinho: 120 ml; 1 copo de leite integral opcional: 120 ml; 3 colheres de sopa de azeite extravirgem: 45 ml.',
          '1 copo de vinho: 50 ml; Leite obrigatório: 500 ml; Manteiga defumada: 200 g.',
          'Vinho: 250 ml obrigatório sem redução; Azeite: 100 ml; Leite condensado opcional: 60 ml.',
        ],
        correct: 1,
        why: 'A FerveC padroniza didaticamente 1 copo = 120 ml (tanto para o vinho quanto para o leite opcional na metade da cocção) e 3 colheres de sopa de azeite = 45 ml.',
        tip: 'O leite entra na metade do cozimento lento para suavizar textura e acidez sem talhar.',
      },
      {
        id: 'rag-w4',
        optionIds: ['rag-w4-a', 'rag-w4-b', 'rag-w4-c', 'rag-w4-d'],
        correctOptionId: 'rag-w4-a',
        q: 'Sobre o corte de largura do tagliatelle na Ficha Técnica A (4 porções: 400 g farinha tipo 00, 4 ovos médios e 1 pitada de sal), o que descreve a posição técnica do curso?',
        a: [
          'A referência histórica da Câmara de Comércio de Bolonha indica ~7 mm na massa crua (~8 mm cozida), mas receitas contemporâneas também utilizam 8 mm crua — nenhuma é tratada como erro absoluto, permanecendo sob validação em bancada.',
          'Qualquer corte diferente de exatamente 5,0 mm crua torna a massa imprópria para consumo.',
          'O tagliatelle deve ser cortado com 25 mm de largura antes de cozinhar para não rasgar.',
          'Não existe debate técnico: todas as fontes italianas publicam 3 mm de largura como única medida.',
        ],
        correct: 0,
        why: 'A FerveC expõe com honestidade técnica tanto o marco histórico (~7 mm crua / ~8 mm cozida) quanto a prática contemporânea de 8 mm crua, aguardando validação física da cozinha.',
        tip: 'O mais importante na aula é manter regularidade na largura das tiras para cozinharem por igual.',
      },
      {
        id: 'rag-w5',
        optionIds: ['rag-w5-a', 'rag-w5-b', 'rag-w5-c', 'rag-w5-d'],
        correctOptionId: 'rag-w5-b',
        q: 'Sobre alergênicos obrigatórios pela Anvisa RDC 727/2022 e demais informações de composição no Tagliatelle al Ragù alla Bolognese, qual distinção está correta?',
        a: [
          'Salsão e vinho são os únicos alergênicos obrigatórios da Anvisa no Brasil; trigo e ovos são opcionais.',
          'Trigo (glúten), ovos (massa fresca) e leite (quando usado na cocção ou Parmigiano) são alergênicos obrigatórios da lista Anvisa; salsão, carne suína e vinho são informados separadamente como dados adicionais de composição.',
          'Apenas carne bovina e passata de tomate constam na RDC 727/2022.',
          'Leite cozido por 3 horas no ragù perde integralmente a classificação de alergênico.',
        ],
        correct: 1,
        why: 'A lista obrigatória brasileira (Anvisa RDC 727/2022) exige destaque explícito para trigo/glúten, ovos e leite; salsão, carne suína e presença de vinho informam-se à parte por clareza dietética e ética.',
        tip: 'Lembre-se de declarar também que o leite é opcional no preparo do molho, devendo ser informado sempre que presente.',
      },
      {
        id: 'rag-w6',
        optionIds: ['rag-w6-a', 'rag-w6-b', 'pes-w6-x', 'rag-w6-d'].map((x, idx) =>
          idx === 2 ? 'rag-w6-c' : x
        ) as [string, string, string, string],
        correctOptionId: 'rag-w6-c',
        q: 'Qual combinação de sova e descanso garante elasticidade sem rasgar ao laminar a massa fresca da Ficha Técnica A?',
        a: [
          'Sovar por 2 minutos rápidos e abrir imediatamente no cilindro sem descanso.',
          'Adicionar 100 ml de óleo na farinha e deixar descansar destampada ao sol por 2 horas.',
          'Sovar por 15–20 minutos até ficar lisa e elástica e descansar protegida (sem ressecar) por aproximadamente 30 minutos.',
          'Guardar a massa já sovada sem embalar na porta da geladeira antes de começar a mexer.',
        ],
        correct: 2,
        why: 'Sova de 15–20 minutos desenvolve rede glutínica homogênea, e o descanso protegido de ~30 minutos permite abrir lâmina fina sem retração nem ressecamento superficial.',
        tip: 'Cubra bem a bola de massa com filme ou tigela limpa invertida durante todo o descanso.',
      },
    ],
    exam: [
      {
        id: 'rag-e1',
        optionIds: ['rag-e1-a', 'rag-e1-b', 'rag-e1-c', 'rag-e1-d'],
        correctOptionId: 'rag-e1-b',
        q: 'Ao montar o prato final para 4 pessoas seguindo a referência do Turismo Oficial de Bolonha, um cozinheiro despeja todos os 6 rendimentos completos do Ragù da Ficha B sobre os 400 g de farinha convertidos em tagliatelle fresco (Ficha A). O prato fica afogado em excesso de carne e molho. Qual conduta correta faltou?',
        a: [
          'Dobrar o peso da farinha para 1 kg sem alterar o número de ovos.',
          'Porcionar cerca de 400 g do ragù pronto para envolver as 4 porções de tagliatelle e destinar a eventual sobra do molho ao resfriamento rápido e refrigeração/congelamento seguro.',
          'Descartar 2 ovos da massa para que ela absorva mais molho durante a fervura.',
          'Substituir a passata de tomate por 500 ml de caldo extra para diluir o excesso.',
        ],
        correct: 1,
        why: 'Como a massa rende 4 porções e o ragù rende 6 porções, usar todo o lote do molho desequilibra a montagem; Bologna Welcome referencia ~400 g de ragù preparado para essa porção de massa.',
        tip: 'Pese ~400 g do ragù aquecido em frigideira ampla antes de transferir o tagliatelle recém-cozido.',
      },
      {
        id: 'rag-e2',
        optionIds: ['rag-e2-a', 'rag-e2-b', 'rag-e2-c', 'rag-e2-d'],
        correctOptionId: 'rag-e2-a',
        q: 'Durante a deglaçagem com os 120 ml de vinho no preparo do ragù, um instrutor precisa orientar um aluno com restrição severa ao consumo de álcool (ou criança na família). Que explicação técnica deve dar?',
        a: [
          'Explicar que a redução pelo calor concentra os aromas, mas NÃO elimina necessariamente 100% do álcool, podendo permanecer traços residuais na preparação mesmo após cozimento longo.',
          'Garantir ao aluno que após 5 minutos de fervura exatos 100% do álcool evapora sem deixar nenhum traço químico.',
          'Substituir a carne bovina por carne suína dupla porque gordura neutraliza moléculas de etanol.',
          'Afirmar que vinho branco perde todo o álcool, enquanto vinho tinto não evapora nada.',
        ],
        correct: 0,
        why: 'Estudos bromatológicos mostram retenção variável de álcool conforme tempo, recipiente e método térmico; nunca se afirma eliminação total sem teste analítico ou receita sem álcool.',
        tip: 'Para públicos que exijam zero álcool absoluto, informe a presença do vinho na composição e avalie não utilizá-lo conforme o caso.',
      },
      {
        id: 'rag-e3',
        optionIds: ['rag-e3-a', 'rag-e3-b', 'rag-e3-c', 'rag-e3-d'],
        correctOptionId: 'rag-e3-d',
        q: 'Uma cozinha utiliza patinho moído fino extramagrinho em vez de corte bovino de moagem grossa rico em colágeno (ex.: dianteiro/músculo) para cozinhar o ragù por 2h30min. Qual defeito sensorial aparece no resultado final?',
        a: [
          'O ragù fica excessivamente gelatinoso, oleoso e com gosto de carne defumada.',
          'A passata de tomate talha imediatamente ao encontrar carne magra na panela.',
          'O molho cozinha rápido demais em 10 minutos e dissolve o soffritto.',
          'As fibras ficam ressecadas, arenosas e sem a untuosidade natural produzida pela hidrólise lenta do colágeno.',
        ],
        correct: 3,
        why: 'Cortes magros de cocção rápida endurecem e ressecam em cozimentos prolongados; cortes ricos em tecido conjuntivo liberam gelatina ao longo de 2–3 horas, envolvendo o molho.',
        tip: 'Peça moagem grossa (disco mais aberto ou ponta de faca) em cortes com colágeno para sustentar a estrutura do ragù.',
      },
      {
        id: 'rag-e4',
        optionIds: ['rag-e4-a', 'rag-e4-b', 'rag-e4-c', 'rag-e4-d'],
        correctOptionId: 'rag-e4-c',
        q: 'Para evitar contaminação cruzada durante o mise en place simultâneo da Ficha A (ovos na massa), Ficha B (carne bovina, pancetta e vegetais do soffritto), qual organização de bancada cumpre a RDC 216/2004?',
        a: [
          'Picar os vegetais na mesma tábua onde acabou de cortar a pancetta suína crua para aproveitar o sabor.',
          'Quebrar os 4 ovos diretamente dentro da panela fria onde ficou a carne crua marinando.',
          'Utilizar tábuas, facas e tigelas exclusivas e higienizadas para cada família de insumo (vegetais sanitizados separados de carnes cruas e ovos), com lavagem de mãos nas trocas de etapa.',
          'Lavar as facas apenas com água fria entre a carne crua e o corte final da salsinha ou tagliatelle cozido.',
        ],
        correct: 2,
        why: 'Separar superfícies e utensílios de vegetais, carnes cruas e massa pronta previne transferência de microrganismos patogênicos e contaminação cruzada de alergênicos.',
        tip: 'Finalize o corte fino do soffritto antes de manipular as carnes ou utilize tábuas codificadas por cor.',
      },
      {
        id: 'rag-e5',
        optionIds: ['rag-e5-a', 'rag-e5-b', 'rag-e5-c', 'rag-e5-d'],
        correctOptionId: 'rag-e5-d',
        q: 'Na metade das 2 a 3 horas de cozimento lento do ragù, o cozinheiro nota que o líquido reduziu quase totalmente e o fundo da panela ameaça grudar antes de entrar com o copo opcional de leite (120 ml). Qual sequência de ação salva o molho?',
        a: [
          'Aumentar para fogo alto para terminar a receita em 30 minutos e juntar 400 g de passata extra.',
          'Deixar tostar o fundo por 10 minutos para criar crosta preta e só então colocar água fria.',
          'Retirar toda a pancetta e refogar um segundo soffritto cru dentro do molho pronto.',
          'Manter fogo mínimo, acrescentar caldo leve quente aos poucos para restabelecer umidade controlada, incorporar o leite opcional (120 ml) na metade do tempo e seguir com a panela parcialmente tampada.',
        ],
        correct: 3,
        why: 'O ragù necessita de hidratação progressiva com caldo leve quente e fogo brando para o colágeno gelatinizar sem queimar proteínas no fundo.',
        tip: 'Use panela pesada de fundo espesso que distribua calor de maneira uniforme sem pontos quentes.',
      },
      {
        id: 'rag-e6',
        optionIds: ['rag-e6-a', 'rag-e6-b', 'rag-e6-c', 'rag-e6-d'],
        correctOptionId: 'rag-e6-b',
        q: 'Ao final da montagem de 4 porções do curso, sobra aproximadamente um terço do lote de 6 porções de ragù ainda bem quente (~80 °C) na panela pesada. Qual procedimento de conservação segue a segurança alimentar para aproveitar essa sobra?',
        a: [
          'Tampar hermeticamente a panela pesada quente e colocá-la inteira fora da geladeira até esfriar em 8 horas.',
          'Transferir a sobra para recipiente raso limpo (acelerando o resfriamento seguro), identificar e armazenar sob refrigeração controlada ou congelamento conforme Anvisa RDC 216/2004, sem fixar prazo comercial sem validação.',
          'Misturar a sobra do molho com a massa fresca crua restante e deixar na geladeira por 7 dias.',
          'Deixar na mesma panela sobre o fogão desligado até o almoço do dia seguinte.',
        ],
        correct: 1,
        why: 'Panelas fundas mantêm o núcleo na zona de perigo por horas e sobrecargas quentes elevam a temperatura da geladeira; dividir em recipientes rasos garante resfriamento rápido.',
        tip: 'Etiquete o recipiente com nome do preparo, presença de alergênicos (como leite, se usado) e data.',
      },
      {
        id: 'rag-e7',
        optionIds: ['rag-e7-a', 'rag-e7-b', 'rag-e7-c', 'rag-e7-d'],
        correctOptionId: 'rag-e7-c',
        q: 'Na preparação dos 400 g de farinha tipo 00 e 4 ovos médios (Ficha Técnica A), o lote de ovos da cozinha tem unidades bem pequenas (~42 g cada) e a mistura forma farofa seca que não liga após 5 minutos de sova. Qual correção técnica é apropriada?',
        a: [
          'Descartar toda a farinha e acrescentar 200 ml de óleo vegetal ou manteiga derretida.',
          'Forçar a farofa seca no cilindro até que o calor derreta a farinha em massa.',
          'Ajustar a hidratação com cautela acrescentando pequenas gotas de ovo batido ou água potável até atingir consistência homogênea que permita os 15–20 min de sova.',
          'Enrolar a farofa seca diretamente em água fervente por 15 minutos.',
        ],
        correct: 2,
        why: 'Variações de umidade da farinha e peso dos ovos exigem ajuste fino com pequenas quantidades de líquido ou ovo para não ressecar nem encharcar a massa.',
        tip: 'Pesar os ovos já sem casca na produção padroniza ainda mais a hidratação da massa fresca.',
      },
      {
        id: 'rag-e8',
        optionIds: ['rag-e8-a', 'rag-e8-b', 'rag-e8-c', 'rag-e8-d'],
        correctOptionId: 'rag-e8-a',
        q: 'Ao enrolar a lâmina fina aberta para cortar o tagliatelle, o aluno aplica farinha em excesso ou esmaga a dobra antes de passar a faca; ao desenrolar, as tiras estão grudadas em blocos grossos. Como evitar e conduzir corretamente essa etapa?',
        a: [
          'Polvilhar levemente com farinha ou semolina na medida justa (sem excesso nem falta), dobrar frouxamente sem pressionar, cortar tiras regulares (7–8 mm) e soltar imediatamente os ninhos sobre pano/superfície levemente enfarinhada.',
          'Passar água fria sobre a lâmina antes de dobrar e apertar bem forte com o rolo.',
          'Cortar as tiras depois de cozinhar a lâmina inteira na água fervente.',
          'Empilhar todos os ninhos molhados dentro de uma tigela funda e cobrir com azeite.',
        ],
        correct: 0,
        why: 'Dobras apertadas colam camadas úmidas de massa fresca ao ovo, enquanto excesso de farinha crua turva a água e deixa o molho pesado.',
        tip: 'Se a massa estiver levemente úmida na abertura, deixe secar por 3–5 minutos ao ar antes de dobrar e cortar.',
      },
    ],
  },
  sauces: {
    work: [
      {
        id: 'sau-w1',
        optionIds: ['sau-w1-a', 'sau-w1-b', 'sau-w1-c', 'sau-w1-d'],
        correctOptionId: 'sau-w1-a',
        q: 'No Módulo 6 (Molhos Essenciais Italianos), quais quantidades e insumos compõem o Pomodoro básico padronizado?',
        a: [
          '800 g de tomate pelado com seu líquido, 30 ml de azeite extravirgem, 1 dente de alho opcional, 1/2 cebola pequena opcional, manjericão fresco e sal.',
          '400 g de extrato concentrado puro, 150 g de manteiga com sal e 2 colheres de sopa obrigatórias de açúcar refinado.',
          '400 g de carne moída grossa, 150 g de pancetta, cenoura, salsão e 120 ml de vinho tinto.',
          '1 kg de tomate seco em conserva com 200 ml de creme de leite fresco e noz-moscada.',
        ],
        correct: 0,
        why: 'O Pomodoro clássico da FerveC usa 800 g de tomate pelado com seu líquido, 30 ml de azeite extravirgem, aromáticos opcionais (alho ou meia cebola), manjericão fresco e sal, reduzidos por 20–30 minutos.',
        tip: 'Para 4 pessoas, sugere-se combinar essa base com 320–400 g de massa seca cozida al dente.',
      },
      {
        id: 'sau-w2',
        optionIds: ['sau-w2-a', 'sau-w2-b', 'sau-w2-c', 'sau-w2-d'],
        correctOptionId: 'sau-w2-b',
        q: 'Sobre o efeito do cozimento de 20–30 minutos e o uso de açúcar no molho Pomodoro, qual afirmação é tecnicamente rigorosa?',
        a: [
          'Cozinhar por 30 minutos destrói quimicamente os ácidos orgânicos do tomate, exigindo sempre açúcar para neutralizar o pH.',
          'A redução concentra açúcares e compostos aromáticos naturais, melhorando a percepção sensorial de equilíbrio sem "eliminar quimicamente a acidez"; açúcar não entra como ingrediente obrigatório.',
          'Açúcar refinado substitui integralmente o azeite extravirgem para encorpar o tomate.',
          'O Pomodoro nunca deve ferver por mais de 3 minutos porque perde toda a cor vermelha.',
        ],
        correct: 1,
        why: 'Cozinhar reduz volume de água e volatiliza certos aromas, modificando a percepção gustativa de doçura vs acidez sem neutralizar quimicamente o pH ácido do tomate; um bom tomate pelado não demanda açúcar obrigatório.',
        tip: 'Escolha tomates pelados maduros de boa procedência em vez de mascarar defeitos com açúcar.',
      },
      {
        id: 'sau-w3',
        optionIds: ['sau-w3-a', 'sau-w3-b', 'sau-w3-c', 'sau-w3-d'],
        correctOptionId: 'sau-w3-d',
        q: 'Qual é a referência quantitativa de manteiga e sálvia apresentada para o molho Burro e Salvia e a quais massas ele tradicionalmente se destina?',
        a: [
          '300 g de manteiga com sal e 40 folhas de alecrim, servido apenas com penne rigate seco.',
          '40 ml de azeite e 100 g de carne moída para acompanhar fusilli gelado.',
          '250 g de creme de leite fresco com 2 folhas de sálvia secas para spaghetti à carbonara.',
          '100 g de manteiga sem sal (referência inicial para 4 porções, sujeita a testes conforme formato) e 8–12 folhas de sálvia fresca, tradicional para ravioli, tortelli e massas recheadas.',
        ],
        correct: 3,
        why: 'Os 100 g de manteiga sem sal + 8–12 folhas de sálvia formam base delicada que perfuma e envolve massas recheadas (ravioli, tortelli) sem competir com o recheio.',
        tip: 'Como o tamanho e o recheio das massas frescas recheadas variam muito, considere os 100 g de manteiga referência inicial ajustável.',
      },
      {
        id: 'sau-w4',
        optionIds: ['sau-w4-a', 'sau-w4-b', 'sau-w4-c', 'sau-w4-d'],
        correctOptionId: 'sau-w4-c',
        q: 'Ao aquecer a manteiga no Burro e Salvia, qual distinção térmica define os três estágios discutidos na ficha técnica?',
        a: [
          'Os três estágios têm cor, aroma e sabor idênticos, mudando apenas o peso final da manteiga.',
          'Manteiga queimada é o ponto preferido do chef porque carboniza os açúcares sem amargar.',
          'Manteiga derretida (suave, sem tostar sólidos), manteiga dourada (aromas tostados agradáveis quando controlada) e manteiga queimada (sólidos lácteos carbonizados e amargos, que devem ser evitados).',
          'Manteiga derretida ocorre apenas acima de 220 °C e não contém proteínas do leite.',
        ],
        correct: 2,
        why: 'Diferenciar derretida, dourada controlada (noisette suave) e queimada é essencial porque o ponto passa de aromático para amargo em segundos.',
        tip: 'Mantenha fogo baixo a médio e use frigideira de fundo claro para acompanhar facilmente a mudança de cor dos sólidos.',
      },
      {
        id: 'sau-w5',
        optionIds: ['sau-w5-a', 'sau-w5-b', 'sau-w5-c', 'sau-w5-d'],
        correctOptionId: 'sau-w5-d',
        q: 'Por que os alergênicos devem ser comunicados separadamente para o molho e para a massa no Módulo 6?',
        a: [
          'Porque massa fresca nunca contém trigo nem ovos quando cozida no Burro e Salvia.',
          'Porque apenas o manjericão fresco do Pomodoro possui glúten natural.',
          'Porque tomate pelado e manteiga sem sal pertencem ao mesmo grupo botânico.',
          'Porque o Pomodoro puro em si não contém leite nem glúten (ganhando trigo ou queijo conforme a massa e finalização escolhidas), enquanto o Burro e Salvia já traz LEITE na manteiga e soma trigo, ovos e itens do recheio da massa recheada.',
        ],
        correct: 3,
        why: 'Separar molho de massa evita erro de rotulagem ou surpresa ao cliente com restrições alimentares, destacando cada fonte alergênica com precisão (RDC 727/2022).',
        tip: 'Sempre consulte também o recheio do ravioli/tortelli (ex.: queijos, nozes ou crustáceos).',
      },
      {
        id: 'sau-w6',
        optionIds: ['sau-w6-a', 'sau-w6-b', 'sau-w6-c', 'sau-w6-d'],
        correctOptionId: 'sau-w6-a',
        q: 'No Pomodoro clássico, em que momento devemos incorporar as folhas frescas de manjericão higienizadas para preservar cor e óleos essenciais?',
        a: [
          'Ao final da redução ou fora do calor intenso, rasgadas delicadamente na hora de finalizar.',
          'Nos primeiros 2 minutos dentro do azeite quente antes de colocar o tomate.',
          'Cozinhando em fervura vigorosa por 40 minutos até as folhas ficarem pretas.',
          'Apenas depois que o molho esfriar completamente a 4 °C dentro da geladeira.',
        ],
        correct: 0,
        why: 'Os compostos voláteis delicados do manjericão evaporam e as folhas escurecem se submetidos a 30 minutos de fervura; juntar no final preserva aroma fresco e cor.',
        tip: 'Higienize e seque as folhas previamente conforme boas práticas antes de aplicá-las no acabamento.',
      },
    ],
    exam: [
      {
        id: 'sau-e1',
        optionIds: ['sau-e1-a', 'sau-e1-b', 'sau-e1-c', 'sau-e1-d'],
        correctOptionId: 'sau-e1-d',
        q: 'Na praça quente de um restaurante italiano que serve ambos os pratos do Módulo 6 simultaneamente, entra um pedido de massa seca com Pomodoro para um cliente com alergia severa à proteína do leite e outro de ravioli al Burro e Salvia na mesma boleta. Qual conduta operacional garante segurança?',
        a: [
          'Preparar primeiro o Burro e Salvia e apenas passar um papel-toalha seco na frigideira antes de esquentar o Pomodoro.',
          'Usar a mesma colher de serviço para emulsionar os dois pratos agilizando a saída.',
          'Adicionar um cubo pequeno de manteiga no Pomodoro afirmando que pouca quantidade não desencadeia reação.',
          'Separar integralmente panelas, frigideiras, pegadores e tábuas entre o Pomodoro (sem leite e sem Parmigiano finalizador) e o Burro e Salvia, além de verificar a composição da massa seca escolhida.',
        ],
        correct: 3,
        why: 'Traços mínimos de manteiga ou queijo transferidos por utensílios compartilhados provocam reações alérgicas graves; separação física rígida é obrigatória na RDC 216/2004 e RDC 727/2022.',
        tip: 'Mantenha utensílios limpos dedicados à preparação isenta de lácteos.',
      },
      {
        id: 'sau-e2',
        optionIds: ['sau-e2-a', 'sau-e2-b', 'sau-e2-c', 'sau-e2-d'],
        correctOptionId: 'sau-e2-b',
        q: 'Durante a aula de Burro e Salvia, o aluno retira as 10 folhas de sálvia direto da solução de enxágue ainda pingando água e as coloca na manteiga derretida quente. Ocorrem respingos imediatos e manchas escurecidas. O que falhou e como evitar?',
        a: [
          'Faltou acrescentar tomate pelado dentro da manteiga antes de colocar a sálvia.',
          'Faltou secar cuidadosamente as folhas higienizadas com pano limpo ou papel antes de ir à gordura, pois água livre vaporiza violentamente em contato com manteiga quente (risco de queimadura e degradação do aroma).',
          'Deveria ter fervido a sálvia na água com sal por 15 minutos antes de pôr na manteiga.',
          'A manteiga deveria estar congelada em pedra ao receber as folhas.',
        ],
        correct: 1,
        why: 'Água superficial atinge ponto de ebulição instantâneo ao entrar na gordura acima de 100 °C, projetando gotículas quentes sobre quem cozinha e prejudicando a infusão limpa.',
        tip: 'Sempre seque totalmente ervas frescas antes de levá-las a azeite ou manteiga aquecidos.',
      },
      {
        id: 'sau-e3',
        optionIds: ['sau-e3-a', 'sau-e3-b', 'sau-e3-c', 'sau-e3-d'],
        correctOptionId: 'sau-e3-a',
        q: 'Enquanto prepara Burro e Salvia para 4 porções de ravioli, o cozinheiro atende outro preparo e deixa a frigideira esquentar demais: a manteiga escurece rapidamente com odor acre de queimado e pontos pretos no fundo. Qual atitude profissional deve ser tomada?',
        a: [
          'Descartar a manteiga queimada, lavar/substituir a frigideira e recomeçar com controle térmico mais baixo — jamais tentar mascarar sólidos lácteos carbonizados com água ou queijo.',
          'Despejar duas conchas de água do cozimento na hora para dissolver os pontos pretos e servir dizendo ser manteiga dourada.',
          'Peneirar a gordura preta e adicionar mais 50 g de manteiga gelada por cima.',
          'Acrescentar uma colher de açúcar refinado para equilibrar o amargor da queima.',
        ],
        correct: 0,
        why: 'Manteiga queimada contém sólidos do leite carbonizados irremediavelmente amargos; diferenciar visual e olfativamente douramento leve de queima evita servir prato defeituoso.',
        tip: 'Assim que a manteiga espumar e desprender aroma suave de avelã, junte água do cozimento imediatamente para interromper o aquecimento seco.',
      },
      {
        id: 'sau-e4',
        optionIds: ['sau-e4-a', 'sau-e4-b', 'sau-e4-c', 'sau-e4-d'],
        correctOptionId: 'sau-e4-c',
        q: 'Um aluno prova o molho Pomodoro após 8 minutos de fervura rápida, acha o sabor ainda aguado/metálico e pega o saleiro e um pote de açúcar para tentar corrigir antes do tempo mínimo da receita. Qual é a recomendação técnica correta?',
        a: [
          'Dobrar a dose de sal e adicionar duas colheres de açúcar para interromper imediatamente a cocção aos 8 minutos.',
          'Bater o molho no liquidificador com gelo por 3 minutos para mudar o pH do tomate.',
          'Manter a redução branda prevista (20–30 minutos no total) para evaporar água livre e concentrar açúcares e aromas naturais do tomate pelado, ajustando sal moderadamente ao final sem açúcar obrigatório.',
          'Despejar 100 g de manteiga derretida dentro do Pomodoro para esconder o gosto da lata.',
        ],
        correct: 2,
        why: 'Aos 8 minutos o tomate pelado ainda não reduziu nem integrou ao azeite; apressar com açúcar ou sal excessivo rompe o equilíbrio natural da redução de 20–30 min.',
        tip: 'Amassar levemente os tomates pelados durante os 20–30 min ajuda a liberar pectina e uniformizar a textura.',
      },
      {
        id: 'sau-e5',
        optionIds: ['sau-e5-a', 'sau-e5-b', 'sau-e5-c', 'sau-e5-d'],
        correctOptionId: 'sau-e5-b',
        q: 'No preparo do Burro e Salvia com ravioli delicado recém-cozido, o cozinheiro despeja apenas manteiga derretida seca sobre a massa, resultando em ravioli gorduroso com película oleosa solta no fundo do prato. Qual etapa faltou?',
        a: [
          'Faltou deixar a manteiga queimar por 6 minutos antes de colocar o ravioli.',
          'Faltou emulsionar a manteiga aromatizada com pequenas colheres da água rica em amido do cozimento fora do calor intenso (e Parmigiano opcional), ligando gordura e fase aquosa num véu brilhante.',
          'Faltou lavar o ravioli cozido em água fria para remover todo o amido da superfície.',
          'Faltou fritar o ravioli em imersão de óleo antes de passar pela manteiga.',
        ],
        correct: 1,
        why: 'Sem pequena adição de água do cozimento amilácea e movimentação suave, a manteiga permanece apenas como gordura livre escorregadia em vez de creme brilhante.',
        tip: 'Movimente a frigideira com delicadeza para não romper a massa fina dos raviolis recheados.',
      },
      {
        id: 'sau-e6',
        optionIds: ['sau-e6-a', 'sau-e6-b', 'sau-e6-c', 'sau-e6-d'],
        correctOptionId: 'sau-e6-d',
        q: 'Na escolha da quantidade de manteiga para servir 4 porções de tortelli grandes de abóbora comparados a 4 porções pequenas de ravioli fino, qual leitura da ficha técnica do Burro e Salvia está correta?',
        a: [
          'Os 100 g de manteiga nunca podem sofrer nenhum ajuste em testes de bancada.',
          'Deve-se obrigatoriamente usar exatamente 400 g de manteiga independentemente do formato.',
          'O rendimento cai para 1 porção se o tortelli tiver recheio doce ou vegetal.',
          'Os 100 g funcionam como referência inicial para 4 porções, devendo ser avaliados na bancada conforme área superficial, recheio e peso da massa escolhida.',
        ],
        correct: 3,
        why: 'Massas recheadas artesanais variam muito em volume e gramatura por porção; tratar os 100 g como linha de base sujeita a validação prática garante padrão honesto.',
        tip: 'Observe a cobertura uniforme sem excesso acumulado no fundo do prato.',
      },
      {
        id: 'sau-e7',
        optionIds: ['sau-e7-a', 'sau-e7-b', 'sau-e7-c', 'sau-e7-d'],
        correctOptionId: 'sau-e7-c',
        q: 'Ao comparar os dois molhos do Módulo 6 quanto à conservação após o serviço, qual conduta diferencia corretamente o Pomodoro base sem massa do Burro e Salvia?',
        a: [
          'Ambos suportam igualmente bem 72 horas em banho-maria morno a 45 °C sem risco sanitário.',
          'O Burro e Salvia pode ficar 15 dias em temperatura ambiente por causa da sálvia; o Pomodoro estraga em 30 minutos na geladeira.',
          'O Burro e Salvia deve ser preparado e servido na hora (pois emulsões de manteiga desestabilizam no resfriamento/reaquecimento), enquanto eventual sobra de Pomodoro base sem massa pode ser resfriada rapidamente e mantida sob refrigeração ou congelamento conforme RDC 216/2004, sem prazo comercial inventado.',
          'O Pomodoro deve receber 200 ml de leite frio antes de congelar para durar 6 meses.',
        ],
        correct: 2,
        why: 'A base de tomate puro resiste bem a resfriamento rápido e cadeia fria quando feita isolada da massa; já a emulsão manteiga + água quebra ao esfriar.',
        tip: 'Se armazenar sobra do Pomodoro base em casa, adicione manjericão fresco somente quando for reaquecer para servir.',
      },
      {
        id: 'sau-e8',
        optionIds: ['sau-e8-a', 'sau-e8-b', 'sau-e8-c', 'sau-e8-d'],
        correctOptionId: 'sau-e8-a',
        q: 'Ao preparar os 800 g de tomate pelado no Pomodoro opcional com alho e cebola, um estudante coloca a panela no fogo máximo para o alho e cebola dourarem em 30 segundos, resultando em partículas queimadas escuras flutuando no molho vermelho. Como o erro deveria ter sido evitado?',
        a: [
          'Suando a cebola e o alho opcionais suavemente nos 30 ml de azeite em fogo baixo a médio até ficarem translúcidos e perfumados, juntando o tomate pelado antes de escurecerem.',
          'Colocando o alho apenas depois que o tomate pelado ferveu por 30 minutos e já foi desligado.',
          'Lavando a cebola picada em água fria com açúcar antes de colocar no azeite fumegante.',
          'Substituindo os 30 ml de azeite extravirgem por 300 ml de água filtrada fria.',
        ],
        correct: 0,
        why: 'Um molho Pomodoro limpo e doce naturalmente depende de cocção branda nos aromáticos iniciais; queimar cebola ou alho deixa sabor amargo e pontos escuros indesejáveis.',
        tip: 'Lembre que alho e cebola são opcionais nesta receita — quando usados, pedem gentileza no fogo.',
      },
    ],
  },
};

export function recipeQuestionSet(r: ExtraRecipe, count: number): QuizQuestion[] {
  if (r.id === 'carbonara') {
    const bank = count >= 8 ? exam : questions;
    return bank.slice(0, count);
  }
  const key = r.id as Exclude<ModuleKey, 'carbonara'>;
  const curated = MODULE_ASSESSMENT_BANKS[key];
  if (!curated) {
    return (count >= 8 ? exam : questions).slice(0, count);
  }
  const bank = count >= 8 ? curated.exam : curated.work;
  return bank.slice(0, count);
}

export function getModuleQuestions(
  moduleKey: string,
  attemptType: AttemptType
): QuizQuestion[] | null {
  if (!isValidModuleKey(moduleKey)) return null;
  if (moduleKey === 'carbonara') {
    return attemptType === 'exam' ? exam : questions;
  }
  const curated = MODULE_ASSESSMENT_BANKS[moduleKey];
  if (!curated) return null;
  return attemptType === 'exam' ? curated.exam : curated.work;
}

export function resolveQuestionOptions(
  question: QuizQuestion,
  displayedOptionIds?: string[]
): {
  orderedOptionIds: string[];
  orderedTexts: string[];
  canonicalIndices: number[];
  correctDisplayIndex: number;
} {
  const canonicalIds =
    Array.isArray(question.optionIds) && question.optionIds.length === question.a.length
      ? question.optionIds
      : QUESTION_OPTION_KEYS.map((k) => `${question.id || 'q'}-${k}`);

  const useCustomOrder =
    Array.isArray(displayedOptionIds) &&
    displayedOptionIds.length === canonicalIds.length &&
    canonicalIds.every((id) => displayedOptionIds.includes(id));

  const canonicalIndices = useCustomOrder
    ? displayedOptionIds!.map((id) => canonicalIds.indexOf(id))
    : canonicalIds.map((_, idx) => idx);

  const orderedOptionIds = canonicalIndices.map((ci) => canonicalIds[ci]);
  const orderedTexts = canonicalIndices.map((ci) => question.a[ci]);
  const correctCanonicalIdx =
    typeof question.correct === 'number' && question.correct >= 0 && question.correct < canonicalIds.length
      ? question.correct
      : canonicalIds.indexOf(question.correctOptionId);
  const correctDisplayIndex = canonicalIndices.indexOf(correctCanonicalIdx);

  return {
    orderedOptionIds,
    orderedTexts,
    canonicalIndices,
    correctDisplayIndex: correctDisplayIndex >= 0 ? correctDisplayIndex : 0,
  };
}

export interface GradeAssessmentOptions {
  displayedOptionOrders?: string[][];
}

export interface GradedAssessment {
  ok: boolean;
  error?: string;
  moduleKey: ModuleKey;
  attemptType: AttemptType;
  bankVersion: string;
  questionIds: string[];
  selectedOptionIds: string[];
  questionSnapshots: QuestionAttemptSnapshot[];
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  answers: number[];
}

export function gradeAssessment(
  moduleKey: string,
  attemptType: AttemptType,
  rawAnswers: unknown[],
  options?: GradeAssessmentOptions
): GradedAssessment {
  if (!isValidModuleKey(moduleKey)) {
    return {
      ok: false,
      error: 'Módulo de avaliação inválido.',
      moduleKey: 'carbonara',
      attemptType,
      bankVersion: ASSESSMENT_BANK_VERSION,
      questionIds: [],
      selectedOptionIds: [],
      questionSnapshots: [],
      score: 0,
      correctCount: 0,
      totalQuestions: 0,
      passed: false,
      answers: [],
    };
  }

  const bank = getModuleQuestions(moduleKey, attemptType);
  if (!bank || bank.length === 0) {
    return {
      ok: false,
      error: 'Banco de questões não encontrado para este módulo.',
      moduleKey,
      attemptType,
      bankVersion: ASSESSMENT_BANK_VERSION,
      questionIds: [],
      selectedOptionIds: [],
      questionSnapshots: [],
      score: 0,
      correctCount: 0,
      totalQuestions: 0,
      passed: false,
      answers: [],
    };
  }

  if (!Array.isArray(rawAnswers) || rawAnswers.length !== bank.length) {
    return {
      ok: false,
      error: `Responda todas as ${bank.length} questões antes de enviar.`,
      moduleKey,
      attemptType,
      bankVersion: ASSESSMENT_BANK_VERSION,
      questionIds: bank.map((q) => q.id),
      selectedOptionIds: [],
      questionSnapshots: [],
      score: 0,
      correctCount: 0,
      totalQuestions: bank.length,
      passed: false,
      answers: [],
    };
  }

  const normalizedAnswers: number[] = [];
  const selectedOptionIds: string[] = [];
  const questionSnapshots: QuestionAttemptSnapshot[] = [];
  let correctCount = 0;

  for (let i = 0; i < bank.length; i++) {
    const q = bank[i];
    const resolved = resolveQuestionOptions(q, options?.displayedOptionOrders?.[i]);
    const val = rawAnswers[i];

    let canonicalIndex = -1;
    let selectedOptionId = '';
    let selectedText = '';

    if (typeof val === 'number' && Number.isInteger(val) && val >= 0 && val < resolved.canonicalIndices.length) {
      canonicalIndex = resolved.canonicalIndices[val];
      selectedOptionId = resolved.orderedOptionIds[val];
      selectedText = resolved.orderedTexts[val];
    } else if (typeof val === 'string' && q.optionIds.includes(val)) {
      canonicalIndex = q.optionIds.indexOf(val);
      selectedOptionId = val;
      selectedText = q.a[canonicalIndex];
    } else {
      return {
        ok: false,
        error: `A questão ${i + 1} precisa de uma alternativa válida.`,
        moduleKey,
        attemptType,
        bankVersion: ASSESSMENT_BANK_VERSION,
        questionIds: bank.map((item) => item.id),
        selectedOptionIds: [],
        questionSnapshots: [],
        score: 0,
        correctCount: 0,
        totalQuestions: bank.length,
        passed: false,
        answers: [],
      };
    }

    const isCorrect =
      selectedOptionId === q.correctOptionId || canonicalIndex === q.correct;
    if (isCorrect) correctCount++;

    normalizedAnswers.push(canonicalIndex);
    selectedOptionIds.push(selectedOptionId);
    questionSnapshots.push({
      questionId: q.id,
      prompt: q.q,
      selectedOptionId,
      selectedText,
      correctOptionId: q.correctOptionId,
      correctText: q.a[q.correct],
      isCorrect,
      explanation: q.why,
    });
  }

  const percentScore = Math.round((correctCount / bank.length) * 100);
  const score = attemptType === 'exam' ? percentScore : correctCount;
  const passed = attemptType === 'exam' ? percentScore >= PASSING_SCORE_PERCENT : true;

  return {
    ok: true,
    moduleKey,
    attemptType,
    bankVersion: ASSESSMENT_BANK_VERSION,
    questionIds: bank.map((q) => q.id),
    selectedOptionIds,
    questionSnapshots,
    score,
    correctCount,
    totalQuestions: bank.length,
    passed,
    answers: normalizedAnswers,
  };
}

export function parseDurationMinutes(label: string): { min: number; max: number } {
  const clean = String(label || '').toLowerCase().trim();
  if (!clean) return { min: 0, max: 0 };

  const nums = clean.match(/\d+(?:[.,]\d+)?/g)?.map((n) => Number(n.replace(',', '.'))) ?? [];
  if (nums.length === 0) return { min: 0, max: 0 };

  const isHours = /\bhoras?\b|\bh\b/.test(clean) && !/\bmin/.test(clean);
  const factor = isHours ? 60 : 1;

  if (nums.length >= 2) {
    const lo = Math.min(nums[0], nums[1]) * factor;
    const hi = Math.max(nums[0], nums[1]) * factor;
    return { min: lo, max: hi };
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

  if (hours === 0) {
    return `${safeMinutes} ${safeMinutes === 1 ? 'minuto' : 'minutos'}`;
  }
  if (remMinutes === 0) {
    return `${hours} ${hourWord}`;
  }
  return `${hours} ${hourWord} e ${remMinutes} ${minWord}`;
}

export function computeCourseWorkloadMinutes(durationLabels: string[]): number {
  if (!Array.isArray(durationLabels) || durationLabels.length === 0) {
    return 0;
  }
  let minSum = 0;
  let maxSum = 0;
  for (const label of durationLabels) {
    const parsed = parseDurationMinutes(label);
    minSum += parsed.min;
    maxSum += parsed.max;
  }
  return Math.round((minSum + maxSum) / 2);
}

export function computeCourseWorkloadLabel(durationLabels: string[]): string {
  const totalMinutes = computeCourseWorkloadMinutes(durationLabels);
  if (totalMinutes <= 0) {
    return '4 horas';
  }
  return formatWorkloadFromMinutes(totalMinutes);
}

export function extractPositiveMinutes(record: Record<string, unknown> | null | undefined): number {
  if (!record) return 0;
  const candidateKeys = [
    'estimated_minutes',
    'workload_minutes',
    'duration_minutes',
    'total_minutes',
    'carga_horaria_minutos',
  ];
  for (const key of candidateKeys) {
    const val = Number(record[key]);
    if (Number.isFinite(val) && val > 0) {
      return Math.round(val);
    }
  }
  return 0;
}

export function resolveCourseWorkload(params: {
  courseRecord?: Record<string, unknown> | null;
  modules?: Array<Record<string, unknown> & { duration_label?: string | null }>;
  fallbackMinutes?: number;
}): { totalMinutes: number; workloadLabel: string } {
  const courseExplicit = extractPositiveMinutes(params.courseRecord);
  if (courseExplicit > 0) {
    return {
      totalMinutes: courseExplicit,
      workloadLabel: formatWorkloadFromMinutes(courseExplicit),
    };
  }

  const modules = Array.isArray(params.modules) ? params.modules : [];
  if (modules.length > 0) {
    let moduleExplicitSum = 0;
    let hasAllExplicit = true;
    for (const mod of modules) {
      const mMin = extractPositiveMinutes(mod);
      if (mMin > 0) {
        moduleExplicitSum += mMin;
      } else {
        hasAllExplicit = false;
      }
    }
    if (hasAllExplicit && moduleExplicitSum > 0) {
      return {
        totalMinutes: moduleExplicitSum,
        workloadLabel: formatWorkloadFromMinutes(moduleExplicitSum),
      };
    }

    let totalFromModules = 0;
    for (const mod of modules) {
      const mMin = extractPositiveMinutes(mod);
      if (mMin > 0) {
        totalFromModules += mMin;
      } else if (typeof mod.duration_label === 'string' && mod.duration_label.trim()) {
        const parsed = parseDurationMinutes(mod.duration_label);
        totalFromModules += Math.round((parsed.min + parsed.max) / 2);
      }
    }
    if (totalFromModules > 0) {
      return {
        totalMinutes: totalFromModules,
        workloadLabel: formatWorkloadFromMinutes(totalFromModules),
      };
    }
  }

  const fallback = params.fallbackMinutes && params.fallbackMinutes > 0 ? params.fallbackMinutes : 240;
  return {
    totalMinutes: fallback,
    workloadLabel: formatWorkloadFromMinutes(fallback),
  };
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
