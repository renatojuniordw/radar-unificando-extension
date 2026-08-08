import { describe, it, expect } from 'vitest';
import { formatResultToText } from './format';
import type { AtsResult } from '../shared/types';

const result: AtsResult = {
  heuristics: { checks: [{ id: 'c1', label: 'Contato', ok: true, detail: '' }], score: 80 },
  analysis: {
    score: 80,
    summary: 'Bom currículo',
    strengths: ['Experiência relevante'],
    missingKeywords: ['React'],
    formattingIssues: [],
    recommendations: ['Adicione React'],
    skillScores: [{ skill: 'React', score: 80, present: true, suggestion: 'Adicione' }],
  },
  cached: false,
};

describe('formatResultToText', () => {
  it('inclui score e resumo', () => {
    const text = formatResultToText(result);
    expect(text).toContain('Score: 80/100');
    expect(text).toContain('Bom currículo');
  });

  it('lista skills, pontos fortes, faltas e dicas', () => {
    const text = formatResultToText(result);
    expect(text).toContain('React: 80/100');
    expect(text).toContain('Experiência relevante');
    expect(text).toContain('React');
    expect(text).toContain('Adicione React');
  });

  it('inclui o checklist do currículo', () => {
    const text = formatResultToText(result);
    expect(text).toContain('✓ Contato');
  });
});