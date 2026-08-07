import type { JobExtractor } from './types';
import { genericExtractor } from './generic';
import { linkedinExtractor } from './linkedin';
import { gupyExtractor } from './gupy';
import { inhireExtractor } from './inhire';

/**
 * Registro de extratores específicos. Novos sites são adicionados aqui sem
 * alterar os existentes (OCP). O genérico é sempre o fallback final.
 */
const extractors: JobExtractor[] = [
  linkedinExtractor,
  gupyExtractor,
  inhireExtractor,
];

/**
 * Escolhe o extrator para a URL. Tenta o primeiro que `matches`; se ele não
 * encontrar conteúdo, cai para o próximo e, por fim, para o genérico.
 */
export function getExtractor(url: string): JobExtractor {
  const specific = extractors.find((e) => e.matches(url));
  if (specific) return specific;
  return genericExtractor;
}

export type { JobExtractor } from './types';
export { genericExtractor, MAX_JOB_DESCRIPTION, pickLargestTextBlock } from './generic';