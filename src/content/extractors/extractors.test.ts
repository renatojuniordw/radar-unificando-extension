import { describe, it, expect, vi } from 'vitest';

// Stub NodeFilter before imports
vi.stubGlobal('NodeFilter', {
  SHOW_ELEMENT: 1,
});

import { linkedinExtractor } from './linkedin';
import { gupyExtractor } from './gupy';
import { inhireExtractor } from './inhire';
import { genericExtractor, firstMatchText, pickLargestTextBlock, MAX_JOB_DESCRIPTION } from './generic';
import { getExtractor } from './index';

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

// Mock Document with TreeWalker that yields leaf nodes
function createMockDocumentWithTreeWalker(
  leafTexts: string[],
  bodyText = '',
): Document {
  let callCount = 0;
  const nodes = leafTexts.map((text) => ({ children: [], innerText: text }));
  return {
    querySelector: () => null,
    createTreeWalker: () => {
      const walker = {
        currentNode: null as unknown,
        nextNode: () => {
          if (callCount < nodes.length) {
            walker.currentNode = nodes[callCount++];
            return walker.currentNode;
          }
          return null;
        },
      };
      return walker;
    },
    body: {
      innerText: bodyText,
    },
  } as unknown as Document;
}

// Mock Document with TreeWalker that returns elements with children (non-leaf, should be skipped)
function createMockDocumentWithNonLeafNodes(bodyText = ''): Document {
  let called = false;
  return {
    querySelector: () => null,
    createTreeWalker: () => {
      const walker = {
        currentNode: null as unknown,
        nextNode: () => {
          if (!called) {
            called = true;
            const node = { children: [{}, {}], innerText: 'has children' };
            walker.currentNode = node;
            return node;
          }
          return null;
        },
      };
      return walker;
    },
    body: {
      innerText: bodyText,
    },
  } as unknown as Document;
}

describe('linkedinExtractor', () => {
  describe('matches', () => {
    it('should_match_linkedin_job_urls', () => {
      expect(linkedinExtractor.matches('https://www.linkedin.com/jobs/view/123')).toBe(true);
    });

    it('should_match_linkedin_urls_with_query_params', () => {
      expect(linkedinExtractor.matches('https://www.linkedin.com/jobs/search/?keywords=react')).toBe(true);
    });

    it('should_not_match_non_job_linkedin_urls', () => {
      expect(linkedinExtractor.matches('https://www.linkedin.com/feed/')).toBe(false);
    });

    it('should_not_match_other_sites', () => {
      expect(linkedinExtractor.matches('https://www.gupy.io/job/123')).toBe(false);
    });
  });

  describe('extract', () => {
    it('should_extract_text_from_first_matching_selector', () => {
      const doc = createMockDocument({
        '.jobs-description__content': 'React Developer position',
      });
      expect(linkedinExtractor.extract(doc)).toBe('React Developer position');
    });

    it('should_try_multiple_selectors_in_order', () => {
      const doc = createMockDocument({
        '.jobs-box__html-content': 'Second selector text',
      });
      expect(linkedinExtractor.extract(doc)).toBe('Second selector text');
    });

    it('should_return_empty_string_when_no_selector_matches', () => {
      const doc = createMockDocument({});
      expect(linkedinExtractor.extract(doc)).toBe('');
    });
  });
});

describe('gupyExtractor', () => {
  describe('matches', () => {
    it('should_match_gupy_urls', () => {
      expect(gupyExtractor.matches('https://www.gupy.io/job/123')).toBe(true);
    });

    it('should_not_match_other_sites', () => {
      expect(gupyExtractor.matches('https://example.com')).toBe(false);
    });
  });

  describe('extract', () => {
    it('should_extract_text_using_first_match', () => {
      const doc = createMockDocument({
        '[data-testid="job-description"]': 'Gupy job description',
      });
      expect(gupyExtractor.extract(doc)).toBe('Gupy job description');
    });

    it('should_return_empty_string_when_no_selector_matches', () => {
      const doc = createMockDocument({});
      expect(gupyExtractor.extract(doc)).toBe('');
    });
  });
});

describe('inhireExtractor', () => {
  describe('matches', () => {
    it('should_match_inhire_app_urls', () => {
      expect(inhireExtractor.matches('https://app.inhire.app/jobs/123')).toBe(true);
    });

    it('should_match_inhire_com_urls', () => {
      expect(inhireExtractor.matches('https://www.inhire.com/job/456')).toBe(true);
    });

    it('should_not_match_other_sites', () => {
      expect(inhireExtractor.matches('https://example.com')).toBe(false);
    });
  });

  describe('extract', () => {
    it('should_extract_text_using_first_match', () => {
      const doc = createMockDocument({
        '.job-description': 'InHire job description',
      });
      expect(inhireExtractor.extract(doc)).toBe('InHire job description');
    });

    it('should_return_empty_string_when_no_selector_matches', () => {
      const doc = createMockDocument({});
      expect(inhireExtractor.extract(doc)).toBe('');
    });
  });
});

describe('getExtractor', () => {
  it('should_return_linkedin_extractor_for_linkedin_urls', () => {
    const extractor = getExtractor('https://www.linkedin.com/jobs/view/123');
    expect(extractor.name).toBe('linkedin');
  });

  it('should_return_gupy_extractor_for_gupy_urls', () => {
    const extractor = getExtractor('https://www.gupy.io/job/123');
    expect(extractor.name).toBe('gupy');
  });

  it('should_return_inhire_extractor_for_inhire_urls', () => {
    const extractor = getExtractor('https://app.inhire.app/job/123');
    expect(extractor.name).toBe('inhire');
  });

  it('should_return_generic_extractor_for_unknown_sites', () => {
    const extractor = getExtractor('https://example.com/job/123');
    expect(extractor.name).toBe('generic');
  });

  it('should_prefer_linkedin_over_generic_for_linkedin_urls', () => {
    const extractor = getExtractor('https://www.linkedin.com/jobs/view/456');
    expect(extractor).toBe(linkedinExtractor);
  });
});

describe('genericExtractor', () => {
  describe('matches', () => {
    it('should_match_any_url', () => {
      expect(genericExtractor.matches('https://anything.com')).toBe(true);
    });
  });

  describe('extract', () => {
    it('should_collect_leaf_nodes_with_text_80_or_longer', () => {
      const longText = 'a'.repeat(80);
      const doc = createMockDocumentWithTreeWalker([longText]);
      const result = genericExtractor.extract(doc);
      expect(result).toBe(longText);
    });

    it('should_skip_leaf_nodes_with_text_shorter_than_80_chars', () => {
      const shortText = 'short'; // < 80 chars
      const bodyText = 'a'.repeat(80);
      const doc = createMockDocumentWithTreeWalker([shortText], bodyText);
      const result = genericExtractor.extract(doc);
      // Short leaf is skipped, falls back to bodyText
      expect(result).toBe(bodyText);
    });

    it('should_skip_non_leaf_nodes_even_with_long_text', () => {
      const bodyText = 'a'.repeat(100);
      const doc = createMockDocumentWithNonLeafNodes(bodyText);
      const result = genericExtractor.extract(doc);
      // Non-leaf skipped, only bodyText available
      expect(result).toBe(bodyText);
    });

    it('should_pick_the_largest_text_block', () => {
      const short = 'a'.repeat(80);
      const long = 'b'.repeat(200);
      const doc = createMockDocumentWithTreeWalker([short, long]);
      const result = genericExtractor.extract(doc);
      expect(result).toBe(long);
    });

    it('should_truncate_output_to_MAX_JOB_DESCRIPTION', () => {
      const longText = 'a'.repeat(10000);
      const doc = createMockDocumentWithTreeWalker([longText]);
      const result = genericExtractor.extract(doc);
      expect(result.length).toBe(MAX_JOB_DESCRIPTION);
      expect(result).toBe(longText.slice(0, MAX_JOB_DESCRIPTION));
    });

    it('should_fallback_to_body_innerText_when_no_leaf_nodes_yield_content', () => {
      const doc = createMockDocumentWithTreeWalker([], 'body text fallback');
      const result = genericExtractor.extract(doc);
      expect(result).toBe('body text fallback');
    });
  });
});

describe('firstMatchText', () => {
  it('should_return_text_from_first_matching_selector', () => {
    const doc = createMockDocument({
      '.first': 'First text',
      '.second': 'Second text',
    });
    expect(firstMatchText(doc, ['.first', '.second'])).toBe('First text');
  });

  it('should_return_empty_string_when_no_selectors_match', () => {
    const doc = createMockDocument({});
    expect(firstMatchText(doc, ['.missing1', '.missing2'])).toBe('');
  });

  it('should_skip_selectors_that_return_null', () => {
    const doc = createMockDocument({
      '.second': 'Found this',
    });
    expect(firstMatchText(doc, ['.missing', '.second'])).toBe('Found this');
  });

  it('should_skip_selectors_with_empty_innerText', () => {
    const doc = createMockDocument({
      '.first': '',
      '.second': 'Has content',
    });
    expect(firstMatchText(doc, ['.first', '.second'])).toBe('Has content');
  });

  it('should_truncate_text_to_MAX_JOB_DESCRIPTION', () => {
    const longText = 'a'.repeat(10000);
    const doc = createMockDocument({ '.job': longText });
    const result = firstMatchText(doc, ['.job']);
    expect(result.length).toBe(MAX_JOB_DESCRIPTION);
    expect(result).toBe(longText.slice(0, MAX_JOB_DESCRIPTION));
  });

  it('should_return_original_text_when_under_MAX', () => {
    const shortText = 'short text';
    const doc = createMockDocument({ '.job': shortText });
    expect(firstMatchText(doc, ['.job'])).toBe(shortText);
  });
});

describe('pickLargestTextBlock', () => {
  it('should_return_the_longest_block', () => {
    expect(pickLargestTextBlock(['curto', 'um texto bem mais longo aqui', 'médio'])).toBe(
      'um texto bem mais longo aqui',
    );
  });

  it('should_return_empty_when_no_blocks', () => {
    expect(pickLargestTextBlock([])).toBe('');
  });

  it('should_trim_blocks_before_comparing', () => {
    expect(pickLargestTextBlock(['  x  ', '   abc   '])).toBe('abc');
  });

  it('should_return_the_only_element_when_single_block', () => {
    expect(pickLargestTextBlock(['single'])).toBe('single');
  });
});

describe('MAX_JOB_DESCRIPTION', () => {
  it('should_be_8000', () => {
    expect(MAX_JOB_DESCRIPTION).toBe(8000);
  });
});