import { getExtractor, genericExtractor, MAX_JOB_DESCRIPTION, pickLargestTextBlock } from './extractors';

export { MAX_JOB_DESCRIPTION, pickLargestTextBlock };

/**
 * Extrai o texto da vaga da página. Delega ao extrator específico do site
 * (via URL) e cai para o genérico quando não há conteúdo.
 */
export function extractJobText(doc: Document, url: string): string {
  const extractor = getExtractor(url);
  const text = extractor.extract(doc);
  if (text) return text;
  return genericExtractor.extract(doc);
}