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
 * Extrai o texto principal da página. Heurística genérica (qualquer site):
 * coleta os blocos de texto visíveis mais longos e escolhe o maior, com
 * fallback para `body.innerText`. Trunca em MAX_JOB_DESCRIPTION.
 */
export function extractJobText(doc: Document): string {
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
}