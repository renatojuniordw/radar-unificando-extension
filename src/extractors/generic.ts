import type { JobExtractor } from './types';

export const MAX_JOB_DESCRIPTION = 8000;

/** Escolhe o maior bloco de texto — heurística genérica para páginas de vaga. */
export function pickLargestTextBlock(texts: string[]): string {
  let best = '';
  for (const t of texts) {
    const trimmed = t.trim();
    if (trimmed.length > best.length) best = trimmed;
  }
  return best;
}

/**
 * Extrator genérico (qualquer site): coleta os blocos de texto visíveis mais
 * longos e escolhe o maior, com fallback para `body.innerText`. Trunca em
 * MAX_JOB_DESCRIPTION.
 */
export const genericExtractor: JobExtractor = {
  name: 'generic',
  matches: () => true,
  extract(doc: Document): string {
    const candidates: string[] = [];

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const el = walker.currentNode as HTMLElement;
      if (el.children.length > 0) continue; // só folhas de texto
      const text = el.innerText?.trim();
      if (text && text.length >= 80) candidates.push(text);
    }

    const bodyText = doc.body?.innerText?.trim() ?? '';
    const chosen = pickLargestTextBlock([...candidates, bodyText]);
    return chosen.slice(0, MAX_JOB_DESCRIPTION);
  },
};

/** Retorna o texto do primeiro seletor que encontrar conteúdo, ou ''. */
export function firstMatchText(doc: Document, selectors: string[]): string {
  for (const selector of selectors) {
    const el = doc.querySelector(selector) as HTMLElement | null;
    const text = el?.innerText?.trim();
    if (text && text.length > 0) return text.slice(0, MAX_JOB_DESCRIPTION);
  }
  return '';
}