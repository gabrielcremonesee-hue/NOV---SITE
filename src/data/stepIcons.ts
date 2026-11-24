const MODULE_STEP_ICONS: Record<string, readonly string[]> = {
  carbonara: [
    '/assets/step-icons/agua.png',
    '/assets/step-icons/guanciale.png',
    '/assets/step-icons/spaghetti.png',
    '/assets/step-icons/ovos-queijo.png',
    '/assets/step-icons/emulsao.png',
    '/assets/step-icons/montagem.png',
  ],
  alfredo: [
    '/assets/step-icons/mise.png',
    '/assets/step-icons/agua.png',
    '/assets/step-icons/spaghetti.png',
    '/assets/step-icons/manteiga.png',
    '/assets/step-icons/emulsao.png',
    '/assets/step-icons/mantecatura.png',
    '/assets/step-icons/prato-alfredo.png',
  ],
  arrabbiata: [
    '/assets/step-icons/mise.png',
    '/assets/step-icons/alho-pimenta.png',
    '/assets/step-icons/azeite.png',
    '/assets/step-icons/tomate.png',
    '/assets/step-icons/tempero.png',
    '/assets/step-icons/penne.png',
    '/assets/step-icons/frigideira.png',
    '/assets/step-icons/prato-arrabbiata.png',
  ],
  pesto: [
    '/assets/step-icons/manjericao.png',
    '/assets/step-icons/pinoli-queijo.png',
    '/assets/step-icons/almofariz.png',
    '/assets/step-icons/azeite.png',
    '/assets/step-icons/fusilli.png',
    '/assets/step-icons/mantecatura.png',
    '/assets/step-icons/agua.png',
    '/assets/step-icons/prato-pesto.png',
  ],
  'ragù': [
    '/assets/step-icons/soffritto.png',
    '/assets/step-icons/guanciale.png',
    '/assets/step-icons/azeite.png',
    '/assets/step-icons/carne.png',
    '/assets/step-icons/vinho.png',
    '/assets/step-icons/tomate.png',
    '/assets/step-icons/panela.png',
    '/assets/step-icons/farinha-ovos.png',
    '/assets/step-icons/massa-bola.png',
    '/assets/step-icons/rolo.png',
    '/assets/step-icons/spaghetti.png',
    '/assets/step-icons/agua.png',
    '/assets/step-icons/frigideira.png',
    '/assets/step-icons/prato-ragu.png',
  ],
  sauces: [
    '/assets/step-icons/duo-molhos.png',
    '/assets/step-icons/mise.png',
    '/assets/step-icons/tomate.png',
    '/assets/step-icons/manteiga-salvia.png',
    '/assets/step-icons/emulsao.png',
    '/assets/step-icons/montagem.png',
  ],
};

export function getStageIcon(moduleId: string, stageIndex: number): string {
  const list = MODULE_STEP_ICONS[moduleId];
  if (!list || list.length === 0) {
    return '/assets/step-icons/montagem.png';
  }
  const safeIndex = Math.max(0, Math.min(stageIndex, list.length - 1));
  return list[safeIndex];
}

export function getModuleStepIconCount(moduleId: string): number {
  return MODULE_STEP_ICONS[moduleId]?.length ?? 0;
}
