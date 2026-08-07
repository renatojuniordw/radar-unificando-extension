/**
 * Contrato de extração de texto de vaga. Cada site implementa um extrator;
 * o genérico é o fallback. Segue LSP: todos os extratores expõem a mesma interface.
 */
export interface JobExtractor {
  name: string;
  /** Retorna true se este extrator sabe lidar com a URL. */
  matches(url: string): boolean;
  /** Extrai o texto da vaga. Retorna string vazia se não encontrar conteúdo. */
  extract(doc: Document): string;
}