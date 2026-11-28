export type ActiveEnvironment = 'portal' | 'library' | 'site';

export interface InitialEnvResolution {
  env: ActiveEnvironment;
  libraryEntry: 'default' | 'demo' | 'auth';
}

const SITE_DEEP_HASH_PREFIXES = [
  '#/cozinhas',
  '#/vendas',
  '#/cursos',
  '#/curso',
  '#/aula',
  '#/receita',
  '#/revisao-receita',
  '#/exercicios',
  '#/revisao',
  '#/prova',
  '#/certificados',
  '#/certificado-carbonara',
  '#/pagamentos',
  '#/progresso',
  '#/minha-conta',
  '#/admin',
  '#/painel-admin',
  '#/criar-perfil',
  '#/memorial',
  '#/chef',
  '#/vinicola',
  '#/categorias',
  '#/categoria-',
  '#/ajuda',
];

export function resolveInitialEnvironment(search = '', hash = ''): InitialEnvResolution {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const autostart = (params.get('autostart') || '').trim().toLowerCase();

  if (autostart === 'site' || autostart === 'cozinha' || autostart === 'portal') {
    return { env: 'site', libraryEntry: 'default' };
  }
  if (autostart === 'auth') {
    return { env: 'library', libraryEntry: 'auth' };
  }
  if (autostart === 'library' || autostart === 'biblioteca' || autostart === 'demo' || autostart === '1') {
    return { env: 'library', libraryEntry: 'demo' };
  }
  if (params.has('memorial')) {
    return { env: 'site', libraryEntry: 'default' };
  }

  const normalizedHash = String(hash || '').trim().toLowerCase();
  if (SITE_DEEP_HASH_PREFIXES.some((prefix) => normalizedHash === prefix || normalizedHash.startsWith(`${prefix}/`))) {
    return { env: 'site', libraryEntry: 'default' };
  }

  return { env: 'site', libraryEntry: 'default' };
}

export interface StylesheetCandidateDescriptor {
  tagName: string;
  id?: string;
  rel?: string;
  href?: string;
  viteDevId?: string | null;
  textContent?: string;
}

export function isSiteStylesheetDescriptor(el: StylesheetCandidateDescriptor): boolean {
  const id = (el.id || '').trim();
  if (
    id === 'fervec-portal-css' ||
    id === 'fervec-library-css' ||
    id === 'fervec-maplibre-css'
  ) {
    return false;
  }

  const tag = String(el.tagName || '').toUpperCase();
  if (tag === 'STYLE') {
    const devId = String(el.viteDevId || '');
    if (devId.includes('/src/') || devId.endsWith('.css')) return true;
    const text = String(el.textContent || '');
    if (
      text.includes('--parchment-grain') ||
      text.includes('fervec') ||
      text.includes('--tw-') ||
      text.includes('--coffee') ||
      text.includes('@layer')
    ) {
      return true;
    }
    return false;
  }

  if (tag === 'LINK') {
    const rel = String(el.rel || '').toLowerCase();
    if (!rel.includes('stylesheet')) return false;
    const href = String(el.href || '');
    if (!href) return false;
    if (
      href.includes('fonts.googleapis.com') ||
      href.includes('portal.css') ||
      href.includes('library-styles.css') ||
      href.includes('styles.css') ||
      href.includes('maplibre-gl')
    ) {
      return false;
    }
    return href.includes('/assets/') || href.includes('/src/');
  }

  return false;
}
