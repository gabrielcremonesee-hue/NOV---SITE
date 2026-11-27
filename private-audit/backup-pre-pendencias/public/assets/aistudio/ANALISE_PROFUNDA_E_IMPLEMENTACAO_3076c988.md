# FerveC Gastronomia — análise e implementação UX/UI

## Base analisada
- `index.html`
- `app.js`
- `styles.css`
- `course-data.js`
- `recipes-data.js`
- `progress.js`
- `audio.js`
- `CONFIGURACAO.md`
- `uploads/Prompt_Completo_Digital_Gastronomia-1.docx`
- imagens e demais assets do projeto

## Diagnóstico
O projeto já possui uma base funcional importante: navegação SPA, dados locais de curso e receitas, progresso, etapas guiadas, trabalho, revisão, prova e certificado demonstrativo. O principal problema encontrado não é falta de conteúdo, mas a relação entre arquitetura da informação, hierarquia visual e clareza do percurso do aluno.

### Problemas prioritários
1. `Meus cursos` apresentava diretamente a aula de estreia, em vez de funcionar como uma biblioteca em dois níveis: curso → módulos.
2. A lista de módulos não explicava suficientemente o que cada módulo ensina antes da abertura.
3. Alguns módulos não tinham um visual próprio; isso reduzia a identificação rápida das receitas.
4. O módulo de molhos tinha conteúdo suficiente, mas sua apresentação era linear e pouco hierarquizada.
5. O sistema de revisão/prova já existia no código, mas precisava ficar visualmente explícito e consistente nos cards e na experiência dos módulos.
6. A experiência precisava ficar mais adequada para iniciantes: localização, próximo passo e objetivo deveriam ser perceptíveis sem exigir leitura extensa.

## Princípios utilizados
- Navegação consistente e orientação por títulos/breadcrumbs.
- Linguagem simples e rótulos de ações descritivos.
- Uso de HTML semântico e controles nativos quando aplicável.
- Design responsivo e mobile-first.
- Hierarquia visual por títulos, cards, agrupamentos e estados.
- Contraste e foco visual adequados.

Esses princípios são compatíveis com recomendações da W3C e MDN sobre navegação consistente, orientação do usuário, linguagem compreensível, semântica HTML, controles acessíveis e design responsivo.

## Alterações implementadas
### 1. Meus cursos
Agora funciona como uma biblioteca de cursos. O primeiro nível apresenta `Massas Italianas` como pasta/curso principal.

### 2. Massas Italianas
Ao abrir o curso, o usuário encontra os seis módulos:
- Spaghetti alla Carbonara
- Fettuccine Alfredo
- Penne all’Arrabbiata
- Fusilli al Pesto Genovese
- Tagliatelle al Ragù alla Bolognese
- Molhos italianos: Pomodoro & Burro e Salvia

Cada card passou a ter:
- imagem/visual próprio;
- número do módulo;
- status;
- descrição didática;
- quantidade de etapas;
- indicação de revisão e prova;
- progresso;
- botão de ação.

### 3. Visuais dos módulos
Foram adicionados SVGs didáticos para módulos que não possuíam fotografia própria. Eles são explicitamente tratados como visuais didáticos, e não como fotografias reais dos pratos.

### 4. Módulo de Molhos
A apresentação foi ampliada para incluir:
- cabeçalho mais forte;
- objetivos de aprendizagem;
- comparação Pomodoro × Burro e Salvia;
- cartões individuais dos dois molhos;
- ingredientes e modo de preparo em blocos numerados;
- dica do Chef;
- etapa atual com navegação;
- resumo técnico final;
- observações e alergênicos.

O conteúdo culinário existente foi preservado.

### 5. Revisão e prova
A estrutura existente de revisão e avaliação não foi removida. Os cards dos módulos agora deixam isso explícito para o usuário antes de entrar na aula.

### 6. Responsividade
Foram adicionados ajustes para tablet e celular, reduzindo colunas, reorganizando blocos e aumentando a clareza dos botões.

## Limites preservados
O projeto continua sendo uma demonstração estática/local conforme a documentação existente. Não foram inventados checkout, autenticação, matrícula, sincronização entre dispositivos ou emissão oficial de certificado.

## Fontes de referência utilizadas
- W3C WAI — Designing for Web Accessibility: navegação consistente, orientação e breadcrumbs.
- W3C WCAG 2 — princípios de conteúdo perceptível, operável, compreensível e robusto.
- MDN — boas práticas de acessibilidade em HTML, linguagem simples e controles semânticos.
- MDN — design responsivo para diferentes tamanhos de tela.

## Resultado esperado
O percurso principal fica:

Meus cursos → Massas Italianas → módulo → etapas → revisão → prova

Isso reduz a ambiguidade, melhora a identificação visual e preserva a estrutura pedagógica existente.
