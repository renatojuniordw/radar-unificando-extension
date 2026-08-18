import { describe, it, expect } from 'vitest';
import { formatResultToText } from './format';
import type { AtsResult } from '../shared/types';

const FULL_RESULT: AtsResult = {
  heuristics: { checks: [{ id: 'c1', label: 'Contato', ok: true, detail: '' }], score: 80 },
  analysis: {
    score: 80,
    summary: 'Bom currículo',
    strengths: ['Experiência relevante'],
    missingKeywords: ['React'],
    recommendations: ['Adicione React'],
    skillScores: [{ skill: 'React', score: 80, present: true, suggestion: 'Adicione' }],
  },
  cached: false,
  courses: [],
};

const EMPTY_RESULT: AtsResult = {
  heuristics: { checks: [], score: 0 },
  analysis: {
    score: 0,
    summary: '',
    strengths: [],
    missingKeywords: [],
    recommendations: [],
    skillScores: [],
  },
  cached: false,
  courses: [],
};

describe('formatResultToText', () => {
  it('should_include_the_header_and_score_line', () => {
    const text = formatResultToText(FULL_RESULT);
    expect(text).toContain('Radar Unificando — Análise ATS');
    expect(text).toContain('Score: 80/100');
  });

  it('should_include_the_summary_when_non_empty', () => {
    const text = formatResultToText(FULL_RESULT);
    expect(text).toContain('Bom currículo');
  });

  it('should_list_skills_with_score_and_suggestion', () => {
    const text = formatResultToText(FULL_RESULT);
    expect(text).toContain('React: 80/100 — Adicione');
  });

  it('should_list_strengths', () => {
    const text = formatResultToText(FULL_RESULT);
    expect(text).toContain('Experiência relevante');
  });

  it('should_list_missing_keywords', () => {
    const text = formatResultToText(FULL_RESULT);
    expect(text).toContain('React');
  });

  it('should_list_recommendations', () => {
    const text = formatResultToText(FULL_RESULT);
    expect(text).toContain('Adicione React');
  });

  it('should_show_checkmark_for_passing_checks', () => {
    const text = formatResultToText(FULL_RESULT);
    expect(text).toContain('✓ Contato');
  });

  it('should_show_cross_for_failing_checks', () => {
    const result: AtsResult = {
      ...FULL_RESULT,
      heuristics: {
        ...FULL_RESULT.heuristics,
        checks: [{ id: 'c2', label: 'Email', ok: false, detail: 'missing' }],
      },
    };
    const text = formatResultToText(result);
    expect(text).toContain('✗ Email');
  });

  it('should_omit_skill_suggestion_when_empty_string', () => {
    const result: AtsResult = {
      ...FULL_RESULT,
      analysis: {
        ...FULL_RESULT.analysis,
        skillScores: [{ skill: 'React', score: 80, present: true, suggestion: '' }],
      },
    };
    const text = formatResultToText(result);
    expect(text).toContain('React: 80/100');
    expect(text).not.toContain('React: 80/100 —');
  });

  it('should_omit_all_optional_sections_when_arrays_are_empty', () => {
    const text = formatResultToText(EMPTY_RESULT);
    expect(text).toContain('Radar Unificando — Análise ATS');
    expect(text).toContain('Score: 0/100');
    expect(text).not.toContain('Score por skill');
    expect(text).not.toContain('Pontos fortes');
    expect(text).not.toContain('Skills faltando');
    expect(text).not.toContain('Dicas');
    expect(text).not.toContain('Checklist do currículo');
  });

  it('should_omit_summary_when_empty', () => {
    const text = formatResultToText(EMPTY_RESULT);
    // Summary is empty → no content between header and end (just score)
    expect(text).not.toContain('summary-section');
  });

  it('should_handle_multiple_checks_with_mixed_ok_values', () => {
    const result: AtsResult = {
      ...FULL_RESULT,
      heuristics: {
        ...FULL_RESULT.heuristics,
        checks: [
          { id: 'c1', label: 'Contato', ok: true, detail: '' },
          { id: 'c2', label: 'Email', ok: false, detail: 'missing' },
          { id: 'c3', label: 'Telefone', ok: true, detail: '' },
        ],
      },
    };
    const text = formatResultToText(result);
    expect(text).toContain('✓ Contato');
    expect(text).toContain('✗ Email');
    expect(text).toContain('✓ Telefone');
  });
});