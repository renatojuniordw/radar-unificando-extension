import type { JobExtractor } from './types';
import { firstMatchText } from './generic';

const INHIRE_SELECTORS = [
  '.job-description',
  '.job-details',
  '#job-description',
  '.description',
];

/** Extrator best-effort para páginas de vaga da InHire. */
export const inhireExtractor: JobExtractor = {
  name: 'inhire',
  matches: (url) => /inhire\.app|inhire\.com/.test(url),
  extract: (doc) => firstMatchText(doc, INHIRE_SELECTORS),
};