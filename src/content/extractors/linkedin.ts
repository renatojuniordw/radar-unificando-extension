import type { JobExtractor } from './types';
import { firstMatchText } from './generic';

const LINKEDIN_SELECTORS = [
  '.jobs-description__content',
  '.jobs-box__html-content',
  '[data-test-id="job-details"]',
  '.show-more-less-html__marker',
  '#job-details',
];

/** Extrator best-effort para páginas de vaga do LinkedIn. */
export const linkedinExtractor: JobExtractor = {
  name: 'linkedin',
  matches: (url) => /linkedin\.com\/jobs/.test(url),
  extract: (doc) => firstMatchText(doc, LINKEDIN_SELECTORS),
};