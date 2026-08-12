import { describe, it, expect, vi } from 'vitest';

// Stub NodeFilter before imports
vi.stubGlobal('NodeFilter', {
  SHOW_ELEMENT: 1,
});

import { linkedinExtractor } from './linkedin';
import { gupyExtractor } from './gupy';
import { inhireExtractor } from './inhire';
import { genericExtractor, firstMatchText, pickLargestTextBlock, MAX_JOB_DESCRIPTION } from './generic';

// Mock Document helper
function createMockDocument(selectorTexts: Record<string, string>, bodyText = ''): Document {
  return {
    querySelector: (selector: string) => {
      const text = selectorTexts[selector];
      if (text) {
        return { innerText: text };
      }
      return null;
    },
    createTreeWalker: () => ({
      nextNode: () => null,
    }),
    body: {
      innerText: bodyText,
    },
  } as unknown as Document;
}

describe('linkedinExtractor', () => {
  describe('matches', () => {
    it('matches linkedin.com/jobs URLs', () => {
      expect(linkedinExtractor.matches('https://www.linkedin.com/jobs/view/123')).toBe(true);
    });

    it('matches linkedin.com/jobs with query params', () => {
      expect(linkedinExtractor.matches('https://www.linkedin.com/jobs/search/?keywords=react')).toBe(true);
    });

    it('does not match non-job LinkedIn URLs', () => {
      expect(linkedinExtractor.matches('https://www.linkedin.com/feed/')).toBe(false);
    });

    it('does not match other sites', () => {
      expect(linkedinExtractor.matches('https://www.gupy.io/job/123')).toBe(false);
    });
  });

  describe('extract', () => {
    it('extracts text from first matching selector', () => {
      const doc = createMockDocument({
        '.jobs-description__content': 'React Developer position',
      });
      expect(linkedinExtractor.extract(doc)).toBe('React Developer position');
    });

    it('tries multiple selectors in order', () => {
      const doc = createMockDocument({
        '[data-test-id="job-details"]': 'Job details text',
      });
      expect(linkedinExtractor.extract(doc)).toBe('Job details text');
    });

    it('returns empty string when no selector matches', () => {
      const doc = createMockDocument({});
      expect(linkedinExtractor.extract(doc)).toBe('');
    });
  });
});

describe('gupyExtractor', () => {
  describe('matches', () => {
    it('matches gupy.io URLs', () => {
      expect(gupyExtractor.matches('https://www.gupy.io/job/123')).toBe(true);
    });

    it('does not match other sites', () => {
      expect(gupyExtractor.matches('https://www.linkedin.com/jobs/123')).toBe(false);
    });
  });

  describe('extract', () => {
    it('extracts text from job-description selector', () => {
      const doc = createMockDocument({
        '.job-description': 'Backend Developer',
      });
      expect(gupyExtractor.extract(doc)).toBe('Backend Developer');
    });

    it('returns empty string when no selector matches', () => {
      const doc = createMockDocument({});
      expect(gupyExtractor.extract(doc)).toBe('');
    });
  });
});

describe('inhireExtractor', () => {
  describe('matches', () => {
    it('matches inhire.app URLs', () => {
      expect(inhireExtractor.matches('https://company.inhire.app/job/123')).toBe(true);
    });

    it('matches inhire.com URLs', () => {
      expect(inhireExtractor.matches('https://company.inhire.com/job/123')).toBe(true);
    });

    it('does not match other sites', () => {
      expect(inhireExtractor.matches('https://www.gupy.io/job/123')).toBe(false);
    });
  });

  describe('extract', () => {
    it('extracts text from job-description selector', () => {
      const doc = createMockDocument({
        '.job-description': 'Full Stack Developer',
      });
      expect(inhireExtractor.extract(doc)).toBe('Full Stack Developer');
    });

    it('returns empty string when no selector matches', () => {
      const doc = createMockDocument({});
      expect(inhireExtractor.extract(doc)).toBe('');
    });
  });
});

describe('genericExtractor', () => {
  describe('matches', () => {
    it('always returns true', () => {
      expect(genericExtractor.matches('https://any-site.com')).toBe(true);
    });
  });

  describe('extract', () => {
    it('returns empty string when no text content', () => {
      const doc = createMockDocument({}, '');
      expect(genericExtractor.extract(doc)).toBe('');
    });
  });
});

describe('firstMatchText', () => {
  it('returns text from first matching selector', () => {
    const doc = createMockDocument({
      '.first': 'First match',
      '.second': 'Second match',
    });
    expect(firstMatchText(doc, ['.first', '.second'])).toBe('First match');
  });

  it('skips non-matching selectors', () => {
    const doc = createMockDocument({
      '.second': 'Second match',
    });
    expect(firstMatchText(doc, ['.first', '.second'])).toBe('Second match');
  });

  it('returns empty string when no selector matches', () => {
    const doc = createMockDocument({});
    expect(firstMatchText(doc, ['.first', '.second'])).toBe('');
  });
});

describe('pickLargestTextBlock', () => {
  it('returns empty string for empty array', () => {
    expect(pickLargestTextBlock([])).toBe('');
  });

  it('returns the longest text block', () => {
    expect(pickLargestTextBlock(['short', 'medium length text', 'a'])).toBe('medium length text');
  });

  it('trims whitespace from texts', () => {
    expect(pickLargestTextBlock(['  trimmed  ', '   also trimmed   '])).toBe('also trimmed');
  });

  it('returns first when tied', () => {
    expect(pickLargestTextBlock(['equal', 'equal'])).toBe('equal');
  });
});
