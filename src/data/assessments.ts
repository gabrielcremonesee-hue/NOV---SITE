import { exam, questions, type QuizQuestion } from './courseData.ts';
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

const MODULE_ASSESSMENT_BANKS: Record<Exclude<ModuleKey, 'carbonara'>, CuratedModuleAssessments> = {
  alfredo: {
    work: [
      {
        q: 'Na padronização de 4 porções do Fettuccine Alfredo inspirada no Alfredo alla Scrofa (Vanity Fair, 2019), quais são as quantidades corretas de manteiga e Parmigiano-Reggiano para 400 g de fettuccine fresco?',
        a: [
          '160 g de manteiga com sal e 280 g de queijo mussarela.',
          '100 g de manteiga sem sal e 240 g de Parmigiano-Reggiano (pref. 24 meses).',
          '50 g de azeite extravirgem e 120 g de creme de leite fresco.',
          '200 g de manteiga clarificada e 80 g de Pecorino Romano.',
        ],
        correct: 1,
        why: 'A referência publicada pelos proprietários do restaurante Alfredo alla Scrofa corresponde a 100 g de manteiga sem sal e 240 g de Parmigiano-Reggiano (pref. 24 meses) para 400 g de fettuccine fresco.',
        tip: 'Mantenha a manteiga em temperatura ambiente e o queijo ralado fino para facilitar a emulsão.',
      },
      {
        q: 'Por que NÃO devemos aplicar indiscriminadamente o tempo de cozimento de 30 segundos usado pelo restaurante Alfredo alla Scrofa?',
        a: [
          'Porque massa fresca italiana só cozinha em menos de 10 segundos.',
          'Porque o restaurante usa água fria sem sal na fervura.',
          'Porque a massa do restaurante é especialmente fina; o aluno deve ajustar o tempo à espessura e características da própria massa.',
          'Porque 30 segundos serve apenas para fettuccine seco industrializado.',
        ],
        correct: 2,
        why: 'O tempo de cocção de uma massa fresca depende diretamente da espessura da lâmina e do teor de umidade; seguir 30 s sem testar pode deixar uma massa mais espessa crua no centro.',
        tip: 'Prove uma tira próxima ao ponto estimado e reserve água do cozimento antes de escorrer.',
      },
      {
        q: 'Qual ingrediente NÃO faz parte da versão tradicional do Fettuccine Alfredo ensinada neste módulo?',
        a: [
          'Creme de leite.',
          'Água do cozimento da massa.',
          'Manteiga sem sal em temperatura ambiente.',
          'Parmigiano-Reggiano ralado fino.',
        ],
        correct: 0,
        why: 'Na tradição romana, a cremosidade nasce exclusivamente da emulsão de manteiga, Parmigiano-Reggiano maturado e água do cozimento rica em amido.',
        tip: 'Pimenta-do-reino preta pode aparecer apenas como adaptação opcional, nunca como elemento obrigatório.',
      },
      {
        q: 'Sobre a fabricação artesanal do fettuccine com ovos, qual distinção técnica o aluno deve compreender?',
        a: [
          '100 g de farinha seca rendem exatamente 100 g de massa fresca crua após os ovos.',
          'O peso da farinha seca usada no preparo difere do peso final da massa fresca produzida (que soma ovos e hidratação).',
          'Massa artesanal de fettuccine não precisa de sova nem de descanso antes de abrir.',
          'O descanso deve acontecer com a massa descoberta em forno quente.',
        ],
        correct: 1,
        why: 'Ao incorporar ovos à farinha, a massa ganha peso; portanto, 400 g de fettuccine fresco pronto não equivalem a 400 g de farinha seca.',
        tip: 'Na produção artesanal, execute sova, descanso protegido, abertura uniforme e corte regular.',
      },
      {
        q: 'Durante a mantecatura do Fettuccine Alfredo, qual atitude evita que o Parmigiano-Reggiano empelote ou solte gordura?',
        a: [
          'Ferver o queijo junto com a manteiga em fogo alto por cinco minutos.',
          'Lavar o fettuccine em água gelada antes de misturar à manteiga.',
          'Misturar fora do calor intenso, em movimentos contínuos, adicionando queijo aos poucos e ajustando com pequenas quantidades de água do cozimento.',
          'Substituir toda a água do cozimento por óleo vegetal frio.',
        ],
        correct: 2,
        why: 'Calor intenso desnatura e agrupa proteínas do queijo em fios/grumos; movimentos contínuos com calor moderado e água amilácea formam emulsão lisa.',
        tip: 'Use travessa previamente aquecida ou frigideira larga fora da chama.',
      },
      {
        q: 'Qual declaração de alergênicos obrigatórios segundo a Anvisa se aplica ao Fettuccine Alfredo com ovos?',
        a: [
          'Contém apenas leite, pois massa fresca artesanal não tem glúten.',
          'Contém apenas ovos e soja.',
          'Não apresenta alergênicos quando servido sem pimenta.',
          'Contém trigo (e glúten), ovos e leite.',
        ],
        correct: 3,
        why: 'A massa fresca leva farinha de trigo (glúten) e ovos, e o molho leva manteiga e Parmigiano-Reggiano (leite).',
        tip: 'Confira sempre rótulos de produtos industrializados e evite contaminação cruzada na bancada.',
      },
    ],
    exam: [
      {
        q: 'Ao montar o mise en place para 4 porções de Fettuccine Alfredo, em que condição física a manteiga e o queijo devem estar?',
        a: [
          'Manteiga congelada em cubos grandes e queijo cortado em lascas grossas.',
          'Manteiga derretida até escurecer e queijo misturado em leite fervendo.',
          'Manteiga sem sal em temperatura ambiente (100 g) e Parmigiano-Reggiano ralado fino (240 g).',
          'Manteiga substituída por margarina líquida e queijo provolone em cubos.',
        ],
        correct: 2,
        why: 'Manteiga em temperatura ambiente incorpora-se suavemente ao calor da massa recém-escorrida, e o queijo ralado fino dissolve sem formar grumos.',
        tip: 'Retire os 100 g de manteiga da refrigeração alguns minutos antes de cozinhar a massa.',
      },
      {
        q: 'Como deve ser apresentada a pimenta-do-reino preta no módulo de Fettuccine Alfredo?',
        a: [
          'Como adaptação opcional no serviço, não como ingrediente essencial da formulação tradicional.',
          'Como base obrigatória refogada na manteiga antes da água ferver.',
          'Em quantidade fixa de duas colheres de sopa por porção.',
          'Como substituto direto da água do cozimento na emulsão.',
        ],
        correct: 0,
        why: 'Na formulação de referência do Alfredo romano, os pilares essenciais são massa, manteiga e Parmigiano-Reggiano; a pimenta é facultativa.',
        tip: 'Sirva o moedor à mesa para quem desejar finalizar com pimenta.',
      },
      {
        q: 'Qual é a sequência lógica correta para preparar fettuccine artesanal com ovos antes de ir para a panela?',
        a: [
          'Misturar farinha e ovos, cortar imediatamente sem sovar e cozinhar em óleo.',
          'Integrar farinha e ovos com hidratação adequada, sovar, respeitar o descanso protegido, abrir em espessura uniforme e cortar.',
          'Ferver a farinha na água, adicionar ovos depois e abrir com rolo.',
          'Assar a mistura por 20 minutos antes de passar no cilindro.',
        ],
        correct: 1,
        why: 'Sova desenvolve o glúten, o descanso relaxa a rede proteica para não encolher na abertura e o corte uniforme garante cocção regular.',
        tip: 'Mantenha a massa coberta durante o descanso para evitar crosta ressecada.',
      },
      {
        q: 'Ao transferir o fettuccine quente para a travessa com manteiga, o molho parece espesso e opaco. Como corrigir imediatamente?',
        a: [
          'Levar a travessa direto à chama máxima até a manteiga fritar.',
          'Juntar creme de leite gelado sem mexer.',
          'Adicionar excesso de sal fino na superfície do queijo.',
          'Acrescentar pequenas quantidades de água quente do cozimento e prosseguir com movimentos contínuos de mantecatura.',
        ],
        correct: 3,
        why: 'Pequenas porções de água amilácea fornecem fase aquosa e amido para completar a emulsão e devolver fluidez brilhante.',
        tip: 'Reserve a água do cozimento antes de escorrer a panela.',
      },
      {
        q: 'Por que o Fettuccine Alfredo deve ser servido imediatamente após a mantecatura?',
        a: [
          'Porque ao esfriar o queijo e a manteiga tendem a espessar e separar, perdendo a textura sedosa.',
          'Porque o prato precisa fermentar à temperatura ambiente antes de servir.',
          'Porque a massa fresca endurece somente depois de refrigerada por 2 horas.',
          'Porque a água do cozimento evapora apenas depois de 30 minutos no prato.',
        ],
        correct: 0,
        why: 'Emulsões de manteiga e queijo maturado são sensíveis à perda de calor; esperar na bancada compromete brilho e fluidez.',
        tip: 'Aqueça levemente os pratos ou organize o serviço antes de iniciar a mantecatura.',
      },
      {
        q: 'Qual cuidado sanitário da Anvisa RDC 216/2004 é indispensável ao manipular massa fresca artesanal com ovos antes do cozimento?',
        a: [
          'Deixar massa crua com ovos exposta em bancada quente durante todo o turno de trabalho.',
          'Usar a mesma superfície sem higienização após manusear carnes cruas.',
          'Higienizar mãos, bancada e utensílios, prevenir contaminação cruzada e manter massa crua com ovos sob refrigeração controlada se não cozida de imediato.',
          'Lavar a massa fresca cozida em água da torneira para resfriar na pia.',
        ],
        correct: 2,
        why: 'Massa fresca com ovos é alimento perecível; exige higiene rigorosa e controle de temperatura e contaminação cruzada.',
        tip: 'Planeje o fluxo limpo da bancada separando insumos crus dos utensílios de serviço.',
      },
      {
        q: 'Na ficha técnica de Fettuccine Alfredo para 4 porções, o que significa a recomendação de usar Parmigiano-Reggiano preferencialmente maturado por 24 meses?',
        a: [
          'Queijo jovem de 24 horas substitui o amido da água.',
          'A maturação de ~24 meses entrega equilíbrio de solubilidade na emulsão e complexidade aromática sem excesso de umidade.',
          'Queijo maturado dispensa qualquer cuidado com o alergênico leite.',
          'Impede que a água do cozimento ferva a 100 °C.',
        ],
        correct: 1,
        why: 'Na faixa de 24 meses, o Parmigiano-Reggiano rala fino com facilidade e derrete de forma equilibrada na mantecatura.',
        tip: 'Prefira sempre queijo em peça ralado pouco antes do preparo.',
      },
      {
        q: 'Em um atendimento a cliente celíaco e alérgico a proteínas do leite, qual postura está correta quanto ao Fettuccine Alfredo tradicional?',
        a: [
          'Servir normalmente afirmando que a água fervente elimina o glúten e a lactose/caseína.',
          'Garantir que trocar Parmigiano por manteiga torna a receita livre de leite.',
          'Informar que a receita contém trigo (glúten), ovos e leite (manteiga e queijo) e não pode ser oferecida como segura sem reformulação e controle de contaminação cruzada.',
          'Retirar apenas a pimenta opcional e servir o prato padrão.',
        ],
        correct: 2,
        why: 'Cocção não destrói glúten nem proteínas alergênicas do leite e do ovo; tanto manteiga quanto queijo derivam de leite.',
        tip: 'Comunique todos os alergênicos obrigatórios com clareza conforme legislação brasileira.',
      },
    ],
  },
  arrabbiata: {
    work: [
      {
        q: 'Por que o módulo de Penne all’Arrabbiata foi reclassificado para “Massas Tubulares e Molhos Picantes”?',
        a: [
          'Porque todo penne possui recheio interno de queijo Pecorino antes do cozimento.',
          'Porque a massa é feita obrigatoriamente de arroz integral sem glúten.',
          'Porque o penne rigate é uma massa tubular seca com sulcos que retêm o molho, e não uma massa recheada.',
          'Porque o molho é servido frio sem passagem pelo fogão.',
        ],
        correct: 2,
        why: 'Classificar penne como “Massas Recheadas” era erro taxonômico; trata-se de formato tubular seco (geralmente rigate, com ranhuras).',
        tip: 'Massas recheadas serão tratadas apenas em módulos específicos futuros, como ravioli ou tortelli.',
      },
      {
        q: 'Sobre a picância do Penne all’Arrabbiata no contexto brasileiro, qual orientação está correta?',
        a: [
          'Substituir totalmente o tomate por molho de soja apimentado.',
          'A pimenta calabresa seca é uma alternativa acessível ao peperoncino italiano, devendo ser dosada sem esconder o tomate.',
          'Proibir qualquer tipo de pimenta em preparações romanas.',
          'Queimar a pimenta até ficar preta para aumentar a acidez.',
        ],
        correct: 1,
        why: 'O peperoncino tradicional pode ser substituído com fidelidade prática pela pimenta calabresa seca, equilibrando picância e tomate.',
        tip: 'Ajuste a quantidade ao paladar para manter a identidade do molho sem mascarar o tomate.',
      },
      {
        q: 'Como devemos lidar com a lata de tomate pelado ao construir o molho Arrabbiata?',
        a: [
          'Descartar todo o líquido da lata e usar apenas as sementes.',
          'Ferver por 3 horas com 100 g de açúcar refinado.',
          'Aproveitar o tomate pelado e seu líquido, desmanchando com cuidado e reduzindo em fogo moderado até a consistência certa.',
          'Bater com creme de leite fresco antes de aquecer o alho.',
        ],
        correct: 2,
        why: 'O líquido que envolve os tomates pelados traz sabor e auxilia na cocção uniforme durante a redução controlada.',
        tip: 'Controle a chama para concentrar sem ressecar nem espirrar excessivamente.',
      },
      {
        q: 'Qual é o papel da diferença entre 320 g (FerveC) e 400 g (Turismo Roma) de penne rigate para quatro pessoas?',
        a: [
          'Torna a receita da FerveC matematicamente errada e inutilizável.',
          'Exige trocar o penne rigate por tagliatelle fresco.',
          'Obriga a dobrar o tempo de cozimento do alho até escurecer.',
          'A formulação de 320 g é mantida como padronização didática da FerveC; a diferença para 400 g não torna a receita incorreta.',
        ],
        correct: 3,
        why: 'Porções de massa seca variam de 80 g a 100 g por pessoa conforme o contexto gastronômico; ambas são válidas quando declaradas com clareza.',
        tip: 'Use a referência de 320 g da ficha técnica como guia consistente ao treinar a proporção de molho.',
      },
      {
        q: 'Por que transferimos o penne rigate al dente para a frigideira com o molho reduzido antes de servir?',
        a: [
          'Para lavar o amido da massa com água fria.',
          'Para integrar a massa ao molho e melhorar a aderência nos sulcos e no interior dos tubos, ajustando com água do cozimento.',
          'Para derreter os pedaços crus de alho reservados.',
          'Para cozinhar o Pecorino por mais 20 minutos em fogo alto.',
        ],
        correct: 1,
        why: 'Finalizar o último instante na frigideira permite que amido, molho e massa tubular se envolvam de maneira uniforme.',
        tip: 'Escorra o penne rigate firme (al dente) e leve imediatamente ao molho.',
      },
      {
        q: 'Quais alergênicos devem ser comunicados ao preparar Penne all’Arrabbiata com finalização opcional de Pecorino Romano?',
        a: [
          'Apenas pinoli e crustáceos.',
          'Trigo (glúten) da massa e, quando utilizado Pecorino Romano, leite.',
          'Somente ovos e amendoim.',
          'Nenhum alergênico, mesmo usando queijo de ovelha.',
        ],
        correct: 1,
        why: 'O penne de trigo fornece trigo/glúten e o Pecorino Romano (opção contemporânea) traz proteínas do leite.',
        tip: 'Confirme sempre o rótulo da massa seca (possíveis traços de ovo/soja em fábrica) e do queijo.',
      },
    ],
    exam: [
      {
        q: 'Por que o formato penne rigate (com ranhuras externas) é tradicionalmente preferido na Arrabbiata em comparação a massas completamente lisas?',
        a: [
          'Porque as ranhuras ajudam a reter o molho de tomate reduzido sobre a superfície da massa.',
          'Porque penne rigate é uma massa recheada com carne bovina.',
          'Porque cozinha em apenas 30 segundos na água fria.',
          'Porque dispensa o uso de água salgada durante a cocção.',
        ],
        correct: 0,
        why: 'Os sulcos externos do penne rigate oferecem atrito e retenção física para o molho de tomate, alho e pimenta.',
        tip: 'Em Roma, o penne rigate é a escolha clássica para este preparo.',
      },
      {
        q: 'Qual erro acontece com maior frequência na etapa de infusão aromática de azeite, alho e pimenta na Arrabbiata?',
        a: [
          'Deixar a água do cozimento salgada demais por usar tomate pelado.',
          'Aquecer demais e queimar o alho, gerando amargor persistente que compromete o molho.',
          'Usar penne rigate em vez de penne recheado.',
          'Aproveitar o líquido da lata de tomate pelado na redução.',
        ],
        correct: 1,
        why: 'O alho queima muito depressa no azeite quente; quando escurece demais, libera compostos amargos que não desaparecem com a adição do tomate.',
        tip: 'Trabalhe em fogo baixo a médio e entre com o tomate assim que o alho perfumar sem escurecer.',
      },
      {
        q: 'Sobre o uso de queijo Pecorino Romano no Penne all’Arrabbiata, qual orientação reflete o conteúdo corrigido?',
        a: [
          'É proibido em qualquer cozinha italiana sob pena de descaracterizar o tomate.',
          'Deve substituir integralmente os 400 g de tomate pelado.',
          'A receita tradicional pode dispensar queijo, mas o Pecorino Romano é utilizado como complemento opcional em versões contemporâneas.',
          'É o único ingrediente responsável pela picância do prato.',
        ],
        correct: 2,
        why: 'Embora puristas sirvam sem queijo, versões contemporâneas aceitam Pecorino Romano opcionalmente — sempre alertando para o alergênico leite.',
        tip: 'Quando usar Pecorino, informe claramente a presença de leite a quem tem alergia.',
      },
      {
        q: 'Ao finalizar a redução do molho Arrabbiata, o aluno nota que a consistência ficou aguada. Qual procedimento corrige o problema?',
        a: [
          'Adicionar 50 ml de água fria da torneira.',
          'Engrossar adicionando três colheres de farinha de trigo crua.',
          'Desligar o fogo imediatamente e cobrir com tampa fechada por 1 hora.',
          'Manter em fogo moderado destampado mexendo até evaporar parte da água do tomate e encorpar.',
        ],
        correct: 3,
        why: 'A evaporação controlada concentra os sólidos do tomate pelado e do líquido sem alterar a pureza do molho.',
        tip: 'Observe o brilho e a espessura antes de transferir o penne.',
      },
      {
        q: 'Qual cuidado da Anvisa RDC 216/2004 se aplica diretamente à salsinha fresca opcional usada na finalização da Arrabbiata?',
        a: [
          'Picar sem lavar para não perder o aroma da folha.',
          'Higienizar cuidadosamente em água potável/solução sanitizante adequada antes do corte e finalização.',
          'Guardar picada fora da geladeira por cinco dias em pote fechado com azeite.',
          'Cortar na mesma tábua de frango cru sem higienização.',
        ],
        correct: 1,
        why: 'Ervas frescas adicionadas ao final sem cocção prolongada exigem higienização adequada para evitar contaminação microbiológica.',
        tip: 'Higienize e seque a salsinha ainda durante o mise en place.',
      },
      {
        q: 'Qual relação entre peperoncino e pimenta calabresa o aluno deve explicar corretamente?',
        a: [
          'Pimenta calabresa é uma alternativa acessível ao peperoncino italiano para conferir a picância do prato.',
          'Pimenta calabresa é pimenta-do-reino branca moída com açúcar.',
          'Peperoncino refere-se exclusivamente ao queijo curado da Sardenha.',
          'Nenhuma das duas contém capsaicina nem picância.',
        ],
        correct: 0,
        why: 'Como peperoncino italiano fresco ou seco nem sempre está disponível no Brasil, os flocos de pimenta calabresa cumprem função análoga.',
        tip: 'Ajuste conforme a intensidade do lote de pimenta disponível na cozinha.',
      },
      {
        q: 'Por que o prazo de validade comercial de um molho Arrabbiata armazenado não deve ser inventado na ficha técnica?',
        a: [
          'Porque tomate não estraga nunca após ser fervido uma vez.',
          'Porque pimenta calabresa conserva o alimento em temperatura ambiente por 30 dias.',
          'Porque prazos comerciais dependem de validação técnica, controle térmico, embalagem e critérios sanitários da legislação brasileira.',
          'Porque a Anvisa proíbe refrigerar molhos à base de tomate.',
        ],
        correct: 2,
        why: 'A RDC 216/2004 e as normas sanitárias exigem controle de tempo/temperatura e não validam estimativas arbitrárias de prateleira sem estudo técnico.',
        tip: 'Em preparo doméstico ou didático, priorize consumo imediato ou resfriamento rápido sob refrigeração/congelamento.',
      },
      {
        q: 'Ao unir penne rigate cozido ao molho na frigideira, qual erro compromete o resultado final do prato?',
        a: [
          'Reservar um pouco da água do cozimento para eventual ajuste.',
          'Usar salsinha higienizada no desligamento do fogo.',
          'Servir imediatamente após envolver a massa no molho.',
          'Cozinhar demais o penne antes de ir ao molho, fazendo os tubos desmancharem ou amassarem.',
        ],
        correct: 3,
        why: 'Escorrer o penne rigate no ponto al dente evita que ele se desfaça ao ser mexido junto ao molho quente.',
        tip: 'Prove o penne pouco antes do tempo mínimo da embalagem.',
      },
    ],
  },
  pesto: {
    work: [
      {
        q: 'Quais ingredientes e quantidades compõem o Pesto Genovese padronizado neste módulo para 4 porções (320 g de fusilli)?',
        a: [
          '50 g de manjericão, 100 ml de azeite, 40 g de Parmigiano e 20 g de Pecorino.',
          '60 g de folhas de manjericão fresco, 30 g de pinoli, 50 g de Parmigiano-Reggiano, 25 g de Pecorino Sardo, 70 ml de azeite extravirgem e 1 dente pequeno de alho.',
          '120 g de salsinha, 60 g de nozes, 100 g de ricota e 150 ml de creme de leite.',
          '30 g de manjericão seco, 10 g de amendoim e 200 ml de óleo de soja.',
        ],
        correct: 1,
        why: 'Essas quantidades foram padronizadas pela FerveC dentro dos intervalos oficiais publicados pelo portal de Gênova (VisitGenoa), sujeitas à validação prática.',
        tip: 'Pecora/ovelha entra com 25 g de Pecorino Sardo ao lado de 50 g de Parmigiano-Reggiano.',
      },
      {
        q: 'Qual sequência reproduz fielmente as primeiras etapas de preparo da pasta no almofariz segundo o portal oficial de Gênova?',
        a: [
          'Ferver o azeite com o manjericão e depois juntar alho e queijo.',
          'Bater queijo e água do cozimento antes de limpar as folhas.',
          'Higienizar e secar o manjericão -> macerar alho com sal -> acrescentar pinoli -> incorporar folhas de manjericão -> adicionar queijos -> incorporar azeite.',
          'Cozinhar o manjericão junto com o fusilli na panela fervente.',
        ],
        correct: 2,
        why: 'Macerar primeiro alho com sal e pinoli cria a pasta base que protege e amacia o manjericão antes da entrada de queijos e azeite.',
        tip: 'Se usar processador doméstico, faça pulsos curtos para evitar aquecimento e oxidação.',
      },
      {
        q: 'Sobre o formato de massa utilizado neste módulo (320 g de fusilli seco), qual informação o aluno precisa dominar?',
        a: [
          'O fusilli é uma adaptação didática FerveC; na Ligúria os formatos tradicionais para pesto são trofie e trenette.',
          'O fusilli é o único formato legalmente permitido na cidade de Gênova.',
          'O fusilli deve ser servido cru sobre o molho quente.',
          'Trofie e trenette são molhos doces da Sicília, sem relação com pesto.',
        ],
        correct: 0,
        why: 'As espirais do fusilli facilitam a demonstração didática no Brasil, enquanto trofie e trenette representam a tradição da Ligúria.',
        tip: 'Lembre-se de que a proporção de 320 g de fusilli frente à receita de molho segue sujeita à validação prática em bancada.',
      },
      {
        q: 'Por que NÃO devemos cozinhar o pesto em fogo intenso nem aquecer demais durante a trituração?',
        a: [
          'Porque o pinoli vira gelatina líquida abaixo de 50 °C.',
          'Porque o calor intenso acelera a oxidação e o escurecimento do manjericão e degrada compostos aromáticos voláteis e emulsão.',
          'Porque o azeite extravirgem congela a 80 °C.',
          'Porque o sal desaparece quando misturado fora do fogo.',
        ],
        correct: 1,
        why: 'O calor destrói a clorofila vibrante e oxida polifenóis do manjericão, escurecendo o pesto e deixando sabor cozido.',
        tip: 'Misture o pesto ao fusilli sempre fora do calor direto e ajuste apenas com pequenas colheres de água do cozimento.',
      },
      {
        q: 'Qual regra de conservação é OBRIGATÓRIA para pesto fresco contendo alho e azeite, segundo o NCHFP e as boas práticas sanitárias?',
        a: [
          'Pode permanecer fechado em pote de vidro à temperatura ambiente por duas semanas.',
          'Deve ser guardado dentro do forno desligado até o fim de semana.',
          'Nunca armazenar pesto com alho e azeite à temperatura ambiente; consumir de imediato, refrigerar adequadamente ou congelar.',
          'Adicionar meia colher de água fria permite conservar em temperatura ambiente com segurança.',
        ],
        correct: 2,
        why: 'Misturas de alho cru em óleo sem acidez e em ambiente anaeróbico podem favorecer o desenvolvimento de Clostridium botulinum fora da cadeia fria.',
        tip: 'Jamais estipule prazos de validade comercial sem validação técnica formal.',
      },
      {
        q: 'Quais alergênicos obrigatórios da legislação brasileira estão presentes no Fusilli al Pesto Genovese?',
        a: [
          'Apenas glúten, pois pinoli não é alergênico.',
          'Apenas leite e crustáceos.',
          'Nenhum alergênico se o manjericão for seco em centrífuga.',
          'Trigo (glúten), leite (Parmigiano e Pecorino Sardo) e pinoli (oleaginosa).',
        ],
        correct: 3,
        why: 'Massa de trigo fornece trigo/glúten, os dois queijos contêm leite e o pinoli integra o grupo de oleaginosas/sementes de declaração obrigatória.',
        tip: 'Leia sempre os rótulos dos insumos e evite contaminação cruzada na cozinha.',
      },
    ],
    exam: [
      {
        q: 'Ao higienizar as 60 g de folhas de manjericão para o Pesto Genovese, por que a secagem rigorosa antes da maceração é indispensável?',
        a: [
          'Folhas secas pesam o dobro depois de trituradas.',
          'Excesso de água residual acelera a oxidação/escurecimento, prejudica a emulsão com o azeite e compromete a qualidade microbiológica.',
          'A água da lavagem neutraliza completamente o alergênico pinoli.',
          'Folhas molhadas impedem o cozimento do fusilli na outra panela.',
        ],
        correct: 1,
        why: 'A água livre prejudica a ligação do azeite extravirgem e favorece deterioração e escurecimento enzimático do manjericão.',
        tip: 'Use centrífuga de folhas limpa e finalize secando delicadamente sem amassar.',
      },
      {
        q: 'Comparando almofariz e pilão com o processador doméstico de lâminas no Pesto Genovese, qual afirmação é tecnicamente verdadeira?',
        a: [
          'O almofariz macera sem atrito rápido de lâminas; o processador é alternativa doméstica que exige pulsos curtos para não aquecer nem oxidar.',
          'O processador ferve o alho enquanto tritura, dispensando geladeira.',
          'O almofariz só funciona se os ingredientes forem congelados por 24 horas.',
          'Não existe diferença térmica nem sensorial entre trituração contínua longa e maceração.',
        ],
        correct: 0,
        why: 'Lâminas em rotação contínua geram calor por atrito e incorporam ar, acelerando oxidação do manjericão; pulsos curtos mitigam esse efeito.',
        tip: 'Se usar processador, pode resfriar brevemente o copo antes de pulsar.',
      },
      {
        q: 'Qual é o par correto de queijos e pesos adotado na ficha padronizada de Pesto Genovese?',
        a: [
          '40 g de queijo minas e 20 g de cheddar.',
          '80 g de gorgonzola e 10 g de creme de ricota.',
          '50 g de Parmigiano-Reggiano e 25 g de Pecorino Sardo.',
          '100 g de Parmigiano-Reggiano sem nenhum Pecorino.',
        ],
        correct: 2,
        why: 'Os valores de 50 g de Parmigiano-Reggiano e 25 g de Pecorino Sardo respeitam os intervalos publicados pelo portal oficial de Gênova.',
        tip: 'Incorpore os queijos ralados após macerar alho, sal, pinoli e manjericão.',
      },
      {
        q: 'Na etapa de envolver o fusilli cozido com o pesto na travessa, por que juntamos pequenas quantidades de água do cozimento?',
        a: [
          'Para ferver o pesto por 10 minutos na travessa.',
          'Para substituir os 70 ml de azeite extravirgem caso sejam esquecidos.',
          'Para esterilizar o alho cru antes da montagem.',
          'Para ajustar a consistência e ajudar o pesto a envolver as espirais fora do calor direto graças ao amido da água.',
        ],
        correct: 3,
        why: 'O pesto pronto é denso; pequenas colheres de água morna do cozimento tornam o molho fluido o suficiente para recobrir o fusilli sem levar ao fogo.',
        tip: 'Adicione aos poucos para não transformar o pesto em caldo ralo.',
      },
      {
        q: 'Um aluno sugere engarrafar pesto fresco com alho e azeite e guardar no armário da cozinha por 15 dias para vender. Qual resposta técnica está correta?',
        a: [
          'Procedimento inseguro: alho em óleo sem refrigeração representa risco botulínico grave, e prazos comerciais exigem validação técnica e cumprimento sanitário.',
          'É seguro se colocar três folhas extras de manjericão seco na tampa.',
          'Basta usar azeite extravirgem italiano que o pH cai abaixo de 2,0 automaticamente.',
          'A Anvisa recomenda 30 dias em temperatura ambiente para molhos caseiros crus.',
        ],
        correct: 0,
        why: 'Segundo o NCHFP e normas sanitárias (Anvisa), alho em óleo em ambiente fechado fora de refrigeração pode permitir multiplicação de Clostridium botulinum.',
        tip: 'Não confunda orientação doméstica com validade comercial validada em serviço de alimentação.',
      },
      {
        q: 'Qual o motivo pedagógico e prático de se apresentar o fusilli ao lado da citação de trofie e trenette neste módulo?',
        a: [
          'Ensinar que trofie é uma marca registrada de pesto industrializado.',
          'Contextualizar a tradição da Ligúria (trofie e trenette) enquanto se utiliza um formato seco acessível (fusilli) com espirais que seguram o molho.',
          'Provar que massa longa seca nunca combina com azeite extravirgem.',
          'Justificar o cozimento do pesto junto à água fervente.',
        ],
        correct: 1,
        why: 'O aluno compreende a referência geográfica autêntica sem perder viabilidade de execução no ambiente doméstico ou escolar.',
        tip: 'Quando tiver acesso a trofie ou trenette, aplique exatamente a mesma sequência de finalização fora do fogo.',
      },
      {
        q: 'Em qual ordem correta o azeite extravirgem (70 ml) entra na preparação do pesto segundo a sequência das 10 etapas?',
        a: [
          'Antes de higienizar as folhas de manjericão, fervido em frigideira.',
          'Somente depois que a massa já estiver servida nos pratos individuais.',
          'Gradualmente, após a incorporação das folhas de manjericão e dos queijos ralados.',
          'Na água fervente junto com o sal do cozimento do fusilli.',
        ],
        correct: 2,
        why: 'Na sequência genovesa, primeiro cria-se a pasta de alho/sal, pinoli, manjericão e queijos, para então emulsionar gradualmente com os 70 ml de azeite.',
        tip: 'Entrar gradualmente impede separação de óleo livre na superfície.',
      },
      {
        q: 'Qual afirmação sobre a formulação padronizada de Pesto Genovese (60 g manjericão / 320 g fusilli) expressa rigor técnico?',
        a: [
          'A quantidade já garante rendimento comercial fechado sem necessidade de testes.',
          'Permite ignorar o alergênico pinoli em cardápios por ser apenas 30 g.',
          'Dispensa higienização das folhas porque o sal do queijo elimina microrganismos.',
          'Situa-se nos intervalos da referência oficial genovesa, mas a relação molho/massa permanece sujeita à validação prática em bancada.',
        ],
        correct: 3,
        why: 'VisitGenoa apresenta referência para ~600 g de massa; manter 320 g de fusilli exige validar em bancada se haverá sobra de pesto ou ajuste de porção.',
        tip: 'Jamais declare validação em bancada antes de testar fisicamente peso final e rendimento.',
      },
    ],
  },
  'ragù': {
    work: [
      {
        q: 'Na ficha corrigida com base na Accademia Italiana della Cucina (20/04/2023), como se comparam os rendimentos de massa fresca e ragù?',
        a: [
          'Ambos rendem obrigatoriamente 2 porções idênticas sem nenhuma sobra.',
          'O ragù rende 1 porção e exige 2 kg de farinha para acompanhar.',
          'A massa fresca rende 4 porções (400 g farinha 00 + 4 ovos) e o ragù rende 6 porções, gerando possível sobra de molho.',
          'Não é possível separar ficha técnica de massa e ficha técnica de molho.',
        ],
        correct: 2,
        why: 'A referência da Accademia de 2023 formula o ragù para 6 pessoas, enquanto a massa de 400 g de farinha + 4 ovos atende 4 pessoas (Turismo de Bolonha usa ~400 g de ragù pronto para a montagem de 4 pessoas).',
        tip: 'Resfrie rapidamente e refrigere/congele a eventual sobra de ragù conforme a Anvisa RDC 216/2004.',
      },
      {
        q: 'Quais características de carne e pancetta correspondem à receita oficial atualizada de Ragù alla Bolognese (2023)?',
        a: [
          'Carne bovina de moagem grossa (cortes ricos em colágeno, 400 g) e pancetta fresca suína não defumada (150 g).',
          'Carne bovina magra moída muito fina (3x) e bacon suíno fortemente defumado.',
          'Apenas peito de frango desfiado e linguiça calabresa defumada.',
          'Carne cozida direto no leite sem soffritto nem gordura suína.',
        ],
        correct: 0,
        why: 'Cortes ricos em colágeno em moagem grossa mantêm estrutura e suculência após 2–3 h de cocção lenta, e a pancetta fresca (não defumada) preserva o perfil clássico.',
        tip: 'Derreta a pancetta gradualmente no azeite antes de entrar com o soffritto.',
      },
      {
        q: 'O que a revisão técnica determinou sobre o uso de medidas em mililitros (120 ml de vinho, 120 ml de leite, 45 ml de azeite) no Ragù?',
        a: [
          'São medidas exatas registradas originalmente em mililitros pela Câmara de Comércio em 1982.',
          'Podem ser dobradas livremente sem anotar na ficha.',
          'Devem ser identificadas expressamente como padronizações didáticas da FerveC, pois a referência italiana usa 1 copo e 3 colheres de sopa.',
          'Significam que vinho e leite são proibidos pela Accademia.',
        ],
        correct: 2,
        why: 'A referência oficial italiana utiliza “1 bicchiere” (copo) e “3 cucchiai” (colheres de sopa); declarar a conversão em ml dá transparência didática sem falsificar a fonte.',
        tip: 'Mantenha igualmente ativos os alertas de validação prática em bancada para o rendimento final.',
      },
      {
        q: 'Sobre a deglaçagem com vinho no preparo do ragù, qual afirmação é cientificamente precisa?',
        a: [
          'Dez minutos de fervura garantem 100% de eliminação de todo álcool etílico.',
          'O vinho entra somente após desligar o fogo depois das 3 horas de cozimento.',
          'O vinho substitui integralmente o tomate e o caldo.',
          'Deixar reduzir solta sabores do fundo e concentra aromas, mas não devemos afirmar que todo o álcool é necessariamente eliminado.',
        ],
        correct: 3,
        why: 'Mesmo após cozimentos longos, pequenos percentuais residuais de álcool podem permanecer dependendo de volume, superfície e tempo.',
        tip: 'Em alergênicos/composição, informe separadamente a presença de vinho, carne suína e salsão.',
      },
      {
        q: 'Qual informação sobre o corte do tagliatelle reflete o consenso técnico e histórico adequado?',
        a: [
          'A referência histórica registra ~7 mm de largura crua (8 mm cozida), mas existem receitas italianas contemporâneas com corte cru de 8 mm, sem tratar isso como erro absoluto.',
          'Tagliatelle só pode ter 2 mm de largura, igual a capellini.',
          'Cortar a 8 mm cru torna a massa tóxica e imprópria para consumo.',
          'A largura oficial do tagliatelle é 30 mm (igual a pappardelle largo).',
        ],
        correct: 0,
        why: 'A Biblioteca Salaborsa / Câmara de Comércio indica 7 mm crua para atingir ~8 mm após cocção, enquanto fontes contemporâneas citam 8 mm crua; o importante é manter clareza editorial e validação.',
        tip: 'Sove 15–20 min, descanse protegido ~30 min e abra fina e uniforme antes do corte.',
      },
      {
        q: 'Como devem ser comunicados os alergênicos e ingredientes de atenção no Tagliatelle al Ragù alla Bolognese no Brasil?',
        a: [
          'Trigo, ovos e leite na lista obrigatória, ocultando salsão e carne suína.',
          'Trigo (glúten), ovos e leite (se usado na cocção/finalização) como alergênicos obrigatórios da Anvisa, destacando salsão, carne suína e vinho separadamente.',
          'Salsão e vinho como os únicos alergênicos reconhecidos pela Anvisa, ignorando trigo.',
          'Nenhum aviso é necessário após 3 horas de cozimento lento.',
        ],
        correct: 1,
        why: 'Na legislação brasileira (Anvisa RDC 727/2022), trigo, ovos e leite são alergênicos obrigatórios; salsão, carne suína e vinho não integram essa lista brasileira, mas merecem destaque separado por restrições alimentares/religiosas/internacionais.',
        tip: 'Diferenciar lista obrigatória da Anvisa de informações adicionais evita erro regulatório.',
      },
    ],
    exam: [
      {
        q: 'Ao comparar a receita da Accademia Italiana della Cucina (2023) com a montagem de 4 porções do Turismo de Bolonha, qual relação numérica ajuda o aluno a planejar a cozinha?',
        a: [
          '400 g de farinha exigem obrigatoriamente 4 litros de vinho tinto.',
          'O Turismo de Bolonha orienta ~400 g de ragù já preparado para a massa de 400 g de farinha e 4 ovos (4 porções), enquanto a panela completa de ragù rende 6 porções.',
          'A receita de 2023 proíbe totalmente o uso de passata e extrato de tomate.',
          'Os 400 g de carne bovina crua rendem exatamente 400 g de ragù para 1 pessoa.',
        ],
        correct: 1,
        why: 'Entender que a receita de ragù para 6 pessoas gera molho suficiente para a massa de 4 pessoas (com sobra) evita superdosar o prato na montagem.',
        tip: 'Porcione o necessário para os pratos e armazene o restante do ragù sob refrigeração ou congelamento seguro.',
      },
      {
        q: 'Em que momento e com qual função entra o copo de leite integral opcional na construção do Ragù alla Bolognese?',
        a: [
          'No início da frigideira antes da pancetta, para fritar a cebola.',
          'Cru diretamente sobre o prato montado no lugar de Parmigiano-Reggiano.',
          'Aproximadamente na metade do cozimento lento (de 2 a 3 horas), ajudando a suavizar a acidez percebida e arredondar a textura.',
          'Durante a sova da massa de farinha tipo 00 junto aos 4 ovos.',
        ],
        correct: 2,
        why: 'A Accademia indica adicionar o leite gradualmente/na metade da cocção lenta para integrar e suavizar o molho; lembre-se de declarar o alergênico leite quando utilizado.',
        tip: 'Se um comensal tiver alergia a proteínas do leite, omita tanto o leite quanto o Parmigiano na finalização.',
      },
      {
        q: 'Qual é a proporção clássica de vegetais do soffritto na receita da Accademia (2023) para 400 g de carne e 150 g de pancetta?',
        a: [
          '200 g de alho, 200 g de pimentão e 50 g de salsinha.',
          '10 g de cebola, 500 g de cenoura e zero salsão.',
          '60 g de cebola, 60 g de cenoura e 60 g de salsão picados finamente.',
          '300 g de batata e 100 g de abobrinha ralada.',
        ],
        correct: 2,
        why: 'Partes iguais de 60 g de cebola, 60 g de cenoura e 60 g de salsão formam a base aromática equilibrada do soffritto bolonhês.',
        tip: 'Cozinhe suavemente na gordura liberada pela pancetta e azeite sem dourar em excesso.',
      },
      {
        q: 'Qual processo define corretamente o preparo da massa fresca de tagliatelle antes de abrir e cortar?',
        a: [
          'Bater tudo no liquidificador com água gelada e congelar sem sovar.',
          'Ferver os ovos antes de misturar à farinha tipo 00.',
          'Assar a farinha a 200 °C por 20 minutos.',
          'Incorporar progressivamente 4 ovos médios e 400 g de farinha 00 (com pitada de sal), sovar por 15–20 min e descansar protegida por ~30 min.',
        ],
        correct: 3,
        why: 'A incorporação gradual evita excesso imediato de farinha, a sova de 15–20 min estrutura o glúten e o descanso protegido de 30 min relaxa a massa para abrir fino.',
        tip: 'Cubra com filme ou tigela invertida durante o descanso para não formar película seca.',
      },
      {
        q: 'Sobre a sobra de ragù produzida além das 4 porções da massa, qual procedimento cumpre a Anvisa RDC 216/2004?',
        a: [
          'Promover resfriamento adequado e armazenar sob refrigeração controlada ou congelamento, com descongelamento sob refrigeração antes de reaquecer.',
          'Deixar a panela tampada sobre o fogão até o dia seguinte à temperatura ambiente.',
          'Estabelecer prazo fixo de 15 dias em geladeira comum sem controle térmico.',
          'Misturar carne crua nova diretamente no molho já pronto antes de guardar.',
        ],
        correct: 0,
        why: 'Alimentos cozidos ricos em proteína exigem redução rápida de temperatura para evitar multiplicação microbiana e devem descongelar sob refrigeração.',
        tip: 'Divida a sobra em recipientes rasos e limpos antes de refrigerar ou congelar.',
      },
      {
        q: 'Qual ingrediente de tomate e em que quantidade faz parte da atualização de 2023 da Accademia Italiana della Cucina?',
        a: [
          '1 kg de ketchup temperado com açúcar.',
          '200 g de passata de tomate e 1 colher de sopa de extrato duplo concentrado de tomate.',
          '800 g de tomate pelado com 150 ml de creme de leite.',
          'Zero tomate de qualquer tipo em qualquer fase.',
        ],
        correct: 1,
        why: 'O ragù autêntico utiliza base moderada de tomate (200 g passata + 1 c.s. extrato duplo) para destacar a carne e o soffritto.',
        tip: 'Dilua o extrato com caldo leve quente ao longo do cozimento lento de 2–3 horas.',
      },
      {
        q: 'Qual prática de higiene da RDC 216/2004 é crítica na etapa simultânea de preparar vegetais do soffritto e manipular carne/pancetta?',
        a: [
          'Usar a mesma faca e tábua da pancetta crua para cortar a salsinha final sem lavar.',
          'Dispensa de higienizar cenoura e salsão porque serão refogados depois.',
          'Higienizar os vegetais corretamente e utilizar tábuas, facas e higienização das mãos separando alimentos crus de prontos para evitar contaminação cruzada.',
          'Descongelar a carne bovina em água parada quente sobre a pia por 4 horas.',
        ],
        correct: 2,
        why: 'Prevenir contaminação cruzada entre carnes suínas/bovinas cruas, ovos da massa e vegetais ou utensílios de finalização é pilar da RDC 216/2004.',
        tip: 'Mantenha tábuas distintas ou higienize integralmente entre etapas.',
      },
      {
        q: 'Por que a ficha técnica de Tagliatelle al Ragù mantém alertas explícitos de validação prática pendente?',
        a: [
          'Porque a receita ainda não foi digitalizada no projeto.',
          'Porque a cozinha italiana proibiu o ensino de tagliatelle em cursos digitais.',
          'Porque falta acrescentar bacon defumado e farinha de mandioca.',
          'Porque peso final cozido, fração exata por porção e definição de corte (7 mm vs 8 mm) dependem de teste físico real em bancada antes de declarar validação.',
        ],
        correct: 3,
        why: 'Transparência técnica exige não inventar pesos cozidos finais nem afirmar validação em bancada sem execução física real.',
        tip: 'Estude a ficha com consciência crítica sobre rendimentos e controle de qualidade.',
      },
    ],
  },
  sauces: {
    work: [
      {
        q: 'No preparo do molho Pomodoro clássico (800 g de tomate pelado), qual é o tratamento correto do líquido da lata e do tempo inicial de redução?',
        a: [
          'Escorrer todo o líquido na pia e cozinhar os tomates por apenas 2 minutos em fogo máximo.',
          'Bater com manteiga queimada e 40 g de açúcar cristal obrigatório.',
          'Aproveitar os tomates pelados junto com o líquido e reduzir em fogo baixo inicialmente por cerca de 20 a 30 minutos, ajustando à consistência.',
          'Ferver por 4 horas até secar completamente sem mexer.',
        ],
        correct: 2,
        why: 'O líquido da lata ajuda a hidratar a redução de 20–30 minutos enquanto os açúcares e aromas do tomate se concentram de forma natural.',
        tip: 'Ajuste o tempo de fogo baixo conforme a suculência do tomate pelado usado.',
      },
      {
        q: 'Sobre a relação entre cozimento, acidez e açúcar no molho Pomodoro, qual explicação é cientificamente precisa?',
        a: [
          'A redução concentra o sabor e muda a percepção de acidez no paladar, mas não se deve afirmar que cozinhar mais necessariamente reduz a acidez química; açúcar não é obrigatório.',
          'Açúcar branco é ingrediente obrigatório em toda receita italiana de Pomodoro.',
          'Cozinhar por 30 minutos transforma o pH do tomate em básico (alcalino).',
          'O manjericão fresco só entra antes do alho no azeite fervendo.',
        ],
        correct: 0,
        why: 'A concentração aromática e a suavização de voláteis equilibram a percepção sensorial sem garantia de redução química do pH, tornando dispensável açúcar obrigatório.',
        tip: 'Finalize com folhas de manjericão fresco ao desligar o fogo para preservar aroma.',
      },
      {
        q: 'Qual é a sugestão correta de acompanhamento e a postura adequada sobre alergênicos no molho Pomodoro?',
        a: [
          'Serve apenas carnes grelhadas; Pomodoro tem leite obrigatório na composição.',
          'Acompanha 1 kg de massa para 2 pessoas e não tem glúten mesmo usando massa de trigo.',
          'Sugere-se acompanhar 320 a 400 g de massa seca para 4 pessoas, informando separadamente alergênicos do molho (ausentes na base simples) e da massa (trigo/glúten e eventuais ovos).',
          'Deve levar 240 g de Parmigiano dentro da panela de redução.',
        ],
        correct: 2,
        why: 'Separar alergênicos do molho dos alergênicos da massa permite transparência para consumidores com restrições alimentares.',
        tip: 'Verifique sempre rótulos de tomates pelados e massas secas quanto à contaminação cruzada.',
      },
      {
        q: 'No molho Burro e Salvia, qual distinção técnica o cozinheiro deve dominar ao aquecer os 100 g de manteiga sem sal?',
        a: [
          'Manteiga queimada e manteiga derretida produzem exatamente o mesmo sabor doce.',
          'Os sólidos do leite devem carbonizar até ficar pretos para gerar emulsão.',
          'A água do cozimento entra antes de colocar a manteiga na frigideira seca.',
          'Diferenciar manteiga derretida, manteiga dourada (aromas agradáveis quando controlada) e manteiga queimada (sólidos lácteos queimados e amargos).',
        ],
        correct: 3,
        why: 'O douramento controlado (noisette suave) desenvolve notas aromáticas agradáveis sem queimar os sólidos lácteos; se queimar, amarga o prato.',
        tip: 'Controle o calor em fogo baixo a médio e observe a cor e o aroma da manteiga.',
      },
      {
        q: 'Quais acompanhamentos são tradicionalmente apresentados como adequados para o molho Burro e Salvia?',
        a: [
          'Ravioli, tortelli e outras massas recheadas.',
          'Apenas arroz branco frio e salada crua.',
          'Somente pão duro seco sem cozimento.',
          'Apenas frituras de imersão.',
        ],
        correct: 0,
        why: 'A delicadeza da manteiga aromatizada com sálvia e emulsionada com água do cozimento valoriza sem encobrir o recheio de ravioli e tortelli.',
        tip: 'Mantenha os 100 g de manteiga como referência inicial para 4 porções, ajustando em teste conforme formato e massa.',
      },
      {
        q: 'Quais alergênicos devem ser comunicados ao servir Burro e Salvia com ravioli ou tortelli?',
        a: [
          'Apenas sálvia e sal marinho.',
          'Leite (manteiga e Parmigiano opcional) somado aos alergênicos da massa recheada escolhida (ex.: trigo/glúten, ovos e itens do recheio).',
          'Apenas tomate pelado.',
          'Nenhum alergênico, pois manteiga sem sal não deriva do leite.',
        ],
        correct: 1,
        why: 'Manteiga sem sal é derivada do leite; ao combinar com massas recheadas, somam-se trigo, ovos e eventuais queijos ou oleaginosas do recheio.',
        tip: 'Evite contaminação cruzada entre o preparo do Pomodoro (sem lácteos) e o do Burro e Salvia.',
      },
    ],
    exam: [
      {
        q: 'Ao comparar os dois molhos do Módulo 6 lado a lado, qual diferença fundamental distingue o Pomodoro do Burro e Salvia?',
        a: [
          'O Pomodoro usa cozimento rápido de 2 minutos em manteiga; o Burro e Salvia ferve tomate por 3 horas.',
          'O Pomodoro baseia-se em redução vegetal do tomate com azeite por 20–30 min; o Burro e Salvia depende de controle térmico da manteiga, sálvia e emulsão com água do cozimento.',
          'Ambos exigem 240 g de Pecorino Romano e carne bovina moída grossa.',
          'Nenhum dos dois utiliza ervas frescas higienizadas.',
        ],
        correct: 1,
        why: 'Colocar os dois lado a lado evidencia técnicas distintas: extração + redução aquosa ácida vs infusão em gordura láctea + emulsão rápida.',
        tip: 'Respeite o perfil térmico próprio de cada base gordurosa (azeite vs manteiga).',
      },
      {
        q: 'No Pomodoro clássico, por que evitamos dourar demais ou queimar o alho e a cebola opcionais nos 30 ml de azeite?',
        a: [
          'Para que o alho e a cebola soltem aromas suaves sem amargar nem escurecer a cor viva do molho.',
          'Para impedir que a água do tomate evapore durante os 25 minutos seguintes.',
          'Porque cebola queimada transforma o tomate em manteiga dourada.',
          'Para aumentar o teor de açúcar refinado do molho.',
        ],
        correct: 0,
        why: 'Alho queimado transfere amargor persistente que compromete o frescor do Pomodoro.',
        tip: 'Mantenha fogo baixo e junte o tomate pelado assim que os aromáticos murcharem/perfumarem.',
      },
      {
        q: 'Durante a preparação do Burro e Salvia, as folhas de sálvia higienizadas precisam ser bem secas antes de ir à manteiga morna. Qual é a razão prática e de segurança?',
        a: [
          'Folhas secas eliminam as proteínas do leite presentes na manteiga.',
          'Folhas secas dobram o peso de Parmigiano-Reggiano na finalização.',
          'Água superficial em contato com gordura quente provoca respingos (risco de queimadura) e prejudica a infusão aromática limpa.',
          'Permite guardar a manteiga em temperatura ambiente por 10 dias.',
        ],
        correct: 2,
        why: 'Gotículas de água vaporizam violentamente na gordura quente; secar a sálvia após higienização protege quem cozinha e garante aroma limpo.',
        tip: 'Seque as 8–12 folhas cuidadosamente com papel ou pano limpo.',
      },
      {
        q: 'Se os sólidos lácteos da manteiga queimarem na frigideira durante o preparo do Burro e Salvia, qual conduta é correta?',
        a: [
          'Acrescentar bastante sal e sálvia extra para disfarçar a cor preta.',
          'Misturar tomate pelado na mesma frigideira sem limpar.',
          'Servir afirmando que manteiga queimada e manteiga dourada têm o mesmo resultado.',
          'Descartar a manteiga queimada, higienizar/trocar a frigideira e recomeçar com controle de temperatura mais baixo.',
        ],
        correct: 3,
        why: 'Sólidos do leite queimados deixam amargor irreversível e resíduos indesejáveis; apenas o douramento leve controlado produz aromas agradáveis.',
        tip: 'Assim que derreter e espumar suavemente com aroma de avelã, reduza/afaste e emulsione com a água do cozimento.',
      },
      {
        q: 'Qual frase descreve corretamente o papel do açúcar no molho Pomodoro desta aula?',
        a: [
          'Não se recomenda açúcar como ingrediente obrigatório; o equilíbrio vem da redução controlada de 20–30 min e qualidade do tomate.',
          'É obrigatório adicionar duas colheres de sopa de açúcar em qualquer tomate pelado.',
          'Açúcar substitui integralmente o sal e o manjericão fresco.',
          'Açúcar é utilizado apenas no molho Burro e Salvia para engrossar a manteiga.',
        ],
        correct: 0,
        why: 'Um bom tomate pelado reduzido por 20–30 minutos desenvolve doçura natural percebida sem mascarar o perfil italiano com açúcar adicionado.',
        tip: 'Evite repetir mitos culinários de que cozinhar ou adoçar elimina quimicamente a acidez do tomate.',
      },
      {
        q: 'Como os 100 g de manteiga no Burro e Salvia devem ser tratados em relação ao rendimento para 4 porções?',
        a: [
          'São proibidos em qualquer massa recheada como ravioli.',
          'Funcionam como referência inicial para quatro porções, sujeita a testes conforme o formato e a quantidade de massa utilizada.',
          'Exigem obrigatoriamente 500 g de farinha crua dentro da manteiga.',
          'Devem render exatamente 12 porções comerciais sem variação.',
        ],
        correct: 1,
        why: 'Massas recheadas variam muito em volume e absorção (ex.: raviolis grandes vs pequenos); manter como referência inicial sujeita a testes garante precisão didática.',
        tip: 'Avalie visualmente a cobertura brilhante ao emulsionar com água do cozimento.',
      },
      {
        q: 'Um aluno prepara Pomodoro simples e Burro e Salvia na mesma aula para atender dois convidados, sendo um deles alérgico ao leite. Qual cuidado da RDC 216/2004 evita incidentes?',
        a: [
          'Usar a mesma colher para mexer a manteiga e depois mexer o molho Pomodoro.',
          'Finalizar os dois pratos na mesma frigideira sem lavar.',
          'Manter utensílios, colheres e superfícies separados entre os dois molhos e informar alergênicos separadamente para molho e massa.',
          'Afirmar que manteiga em temperatura de fervura perde a proteína do leite.',
        ],
        correct: 2,
        why: 'Prevenir contaminação cruzada física por utensílios compartilhados é exigência essencial para segurança de alérgicos.',
        tip: 'Use uma colher exclusiva para o Pomodoro (sem leite) e outra para o Burro e Salvia.',
      },
      {
        q: 'Sobre conservação do Pomodoro básico (sem massa) e do Burro e Salvia após o preparo, qual orientação segue as normas sanitárias?',
        a: [
          'Deixar o Burro e Salvia fora da geladeira por 48 horas e depois só esquentar na frigideira.',
          'Declarar validade comercial de 60 dias em pote comum para ambos os molhos.',
          'Ferver o manjericão fresco por 2 horas após pronto para conservar sem refrigeração.',
          'Consumir Burro e Salvia imediatamente; se houver sobra de Pomodoro base, resfriar adequadamente e manter sob refrigeração ou congelamento conforme RDC 216/2004.',
        ],
        correct: 3,
        why: 'Emulsões de manteiga desestabilizam na espera; já o Pomodoro base só pode ser guardado com segurança seguindo controle de resfriamento e cadeia fria sem prazos inventados.',
        tip: 'Adicione folhas de manjericão fresco apenas no momento de finalizar a porção que será servida.',
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

export interface GradedAssessment {
  ok: boolean;
  error?: string;
  moduleKey: ModuleKey;
  attemptType: AttemptType;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  answers: number[];
}

export function gradeAssessment(
  moduleKey: string,
  attemptType: AttemptType,
  rawAnswers: unknown[]
): GradedAssessment {
  if (!isValidModuleKey(moduleKey)) {
    return {
      ok: false,
      error: 'Módulo de avaliação inválido.',
      moduleKey: 'carbonara',
      attemptType,
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
      score: 0,
      correctCount: 0,
      totalQuestions: bank.length,
      passed: false,
      answers: [],
    };
  }

  const normalizedAnswers: number[] = [];
  for (let i = 0; i < bank.length; i++) {
    const val = rawAnswers[i];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val >= bank[i].a.length) {
      return {
        ok: false,
        error: `A questão ${i + 1} precisa de uma alternativa válida.`,
        moduleKey,
        attemptType,
        score: 0,
        correctCount: 0,
        totalQuestions: bank.length,
        passed: false,
        answers: [],
      };
    }
    normalizedAnswers.push(val);
  }

  const correctCount = normalizedAnswers.filter((ans, idx) => ans === bank[idx].correct).length;
  const percentScore = Math.round((correctCount / bank.length) * 100);
  const score = attemptType === 'exam' ? percentScore : correctCount;
  const passed = attemptType === 'exam' ? percentScore >= PASSING_SCORE_PERCENT : true;

  return {
    ok: true,
    moduleKey,
    attemptType,
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
