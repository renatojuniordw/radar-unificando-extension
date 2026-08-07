import type { JobExtractor } from './types';
import { firstMatchText } from './generic';

const GUPY_SELECTORS = [
  '[data-testid="job-description"]',
  '.job-description',
  '.job',
  '.description',
];

/** Extrator best-effort para páginas de vaga da Gupy. */
export const gupyExtractor: JobExtractor = {
  name: 'gupy',
  matches: (url) => /gupy\.io/.test(url),
  extract: (doc) => firstMatchText(doc, GUPY_SELECTORS),
};