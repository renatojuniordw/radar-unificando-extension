import { describe, it, expect, vi } from 'vitest';
import { pickLargestTextBlock, MAX_JOB_DESCRIPTION } from './extractors/generic';
import { extractJobText } from './extract';
import type { JobExtractor } from './extractors/types';

// Stub NodeFilter before importing modules that use it
vi.stubGlobal('NodeFilter', {
  SHOW_ELEMENT: 1,
});

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
function createMockDocumentWithLeaves(leafTexts: string[], bodyText = ''): Document {
  let callCount = 0;
  return {
    querySelector: () => null,
    createTreeWalker: () => ({
      nextNode: () => {
        if (callCount < leafTexts.length) {
          return { children: [], innerText: leafTexts[callCount++] } as unknown;
        }
        return null;
      },
    }),
    body: {
      innerText: bodyText,
    },
  } as unknown as Document;
}

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

  it('should_return_the_longest_when_all_are_different_lengths', () => {
    const long = 'a'.repeat(500);
    expect(pickLargestTextBlock(['a', 'bb', long, 'ccc'])).toBe(long);
  });
});

describe('MAX_JOB_DESCRIPTION', () => {
  it('should_be_8000', () => {
    expect(MAX_JOB_DESCRIPTION).toBe(8000);
  });
});

describe('extractJobText', () => {
  it('should_delegate_to_the_matching_site_extractor_and_return_its_result', () => {
    const doc = createMockDocument({ '.jobs-description__content': 'LinkedIn job' });
    const text = extractJobText(doc, 'https://www.linkedin.com/jobs/view/123');
    expect(text).toBe('LinkedIn job');
  });

  it('should_fallback_to_generic_extractor_when_site_extractor_returns_empty', () => {
    // LinkedIn extractor returns '' for this URL, but generic finds body text
    const doc = createMockDocumentWithLeaves([], 'a'.repeat(80) + ' - generic fallback content');
    const text = extractJobText(doc, 'https://www.linkedin.com/jobs/view/123');
    // LinkedIn extractor won't find its selectors, returns ''
    // Falls back to generic
    expect(text.length).toBeGreaterThan(0);
  });

  it('should_fallback_to_generic_when_unknown_url_has_no_extractor', () => {
    const doc = createMockDocumentWithLeaves([], 'a'.repeat(100));
    const text = extractJobText(doc, 'https://example.com/jobs/123');
    expect(text).toBe('a'.repeat(100));
  });

  it('should_return_empty_string_when_no_content_found_by_any_extractor', () => {
    const doc = createMockDocument({}, '');
    const text = extractJobText(doc, 'https://example.com/empty');
    expect(text).toBe('');
  });

  it('should_prefer_site_extractor_result_over_generic_when_both_have_content', () => {
    // Site extractor finds content, generic also has content
    const doc = createMockDocument(
      { '.jobs-description__content': 'Site-specific content' },
      'a'.repeat(100),
    );
    const text = extractJobText(doc, 'https://www.linkedin.com/jobs/view/123');
    expect(text).toBe('Site-specific content');
  });
});