import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import ResultView from './ResultView';
import type { AtsResult } from '../../shared/types';

const { mockCopyText } = vi.hoisted(() => ({
  mockCopyText: vi.fn(async () => true),
}));
vi.mock('../clipboard', () => ({
  copyText: mockCopyText,
}));

const sendMessageMock = vi.fn();

const FULL_RESULT: AtsResult = {
  heuristics: {
    checks: [
      { id: 'c1', label: 'Contato', ok: true, detail: '' },
      { id: 'c2', label: 'Email', ok: false, detail: 'ausente' },
    ],
    score: 80,
  },
  analysis: {
    score: 85,
    summary: 'Currículo forte',
    strengths: ['Experiência em React'],
    missingKeywords: ['TypeScript'],
    recommendations: ['Adicione TypeScript'],
    skillScores: [
      { skill: 'React', score: 90, present: true, suggestion: 'Mantenha' },
      { skill: 'Node', score: 40, present: false, suggestion: '' },
    ],
  },
  cached: true,
  courses: [
    {
      titulo: 'Curso de React',
      skill: 'React',
      plataforma: 'Udemy',
      preco: 'R$ 49,90',
      url: 'https://udemy.com/react',
    },
  ],
};

beforeEach(() => {
  sendMessageMock.mockReset();
  vi.stubGlobal('chrome', {
    runtime: { sendMessage: sendMessageMock, lastError: null },
  });
  vi.stubGlobal('navigator', {
    clipboard: { writeText: vi.fn(async () => {}) },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ResultView', () => {
  it('should_show_cached_badge_when_result_is_cached', () => {
    render(<ResultView result={FULL_RESULT} />);
    expect(screen.getByText(/Resultado em cache/)).toBeTruthy();
  });

  it('should_not_show_cached_badge_when_result_is_not_cached', () => {
    render(<ResultView result={{ ...FULL_RESULT, cached: false }} />);
    expect(screen.queryByText(/Resultado em cache/)).toBeNull();
  });

  it('should_render_the_score', () => {
    render(<ResultView result={FULL_RESULT} />);
    expect(screen.getByText('85')).toBeTruthy();
  });

  it('should_show_excellent_quality_badge_for_score_above_80', () => {
    render(<ResultView result={FULL_RESULT} />);
    expect(screen.getByText('Excelente')).toBeTruthy();
  });

  it('should_show_good_quality_badge_for_score_between_60_and_79', () => {
    render(<ResultView result={{ ...FULL_RESULT, analysis: { ...FULL_RESULT.analysis, score: 65 } }} />);
    expect(screen.getByText('Bom')).toBeTruthy();
  });

  it('should_show_warning_quality_badge_for_score_below_60', () => {
    render(<ResultView result={{ ...FULL_RESULT, analysis: { ...FULL_RESULT.analysis, score: 45 } }} />);
    expect(screen.getByText('Atenção')).toBeTruthy();
  });

  it('should_render_summary_when_present', () => {
    render(<ResultView result={FULL_RESULT} />);
    expect(screen.getByText('Currículo forte')).toBeTruthy();
  });

  it('should_render_skill_scores_with_suggestion', () => {
    render(<ResultView result={FULL_RESULT} />);
    expect(screen.getByText('Score por Skill')).toBeTruthy();
    expect(screen.getByText('Mantenha')).toBeTruthy();
    // 'React' appears in skill name and course title — both should be present
    expect(screen.getAllByText('React').length).toBeGreaterThanOrEqual(1);
  });

  it('should_render_strengths_section', () => {
    render(<ResultView result={FULL_RESULT} />);
    expect(screen.getByText('Pontos Fortes Alinhados')).toBeTruthy();
    expect(screen.getByText('Experiência em React')).toBeTruthy();
  });

  it('should_render_missing_keywords_section', () => {
    render(<ResultView result={FULL_RESULT} />);
    expect(screen.getByText('Skills Faltando')).toBeTruthy();
    // 'TypeScript' appears in missingKeywords AND in the recommendation text
    expect(screen.getAllByText(/TypeScript/).length).toBeGreaterThanOrEqual(1);
  });

  it('should_render_recommendations_section', () => {
    render(<ResultView result={FULL_RESULT} />);
    expect(screen.getByText('Dicas de Ajuste')).toBeTruthy();
    expect(screen.getByText('Adicione TypeScript')).toBeTruthy();
  });

  it('should_render_checklist_with_ok_and_bad_items', () => {
    render(<ResultView result={FULL_RESULT} />);
    expect(screen.getByText('Checklist do Currículo')).toBeTruthy();
    expect(screen.getByText('Contato')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('should_render_courses_section_with_affiliate_link', () => {
    render(<ResultView result={FULL_RESULT} />);
    expect(screen.getByText('Cursos Recomendados')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Ver curso' });
    expect(link.getAttribute('href')).toBe('https://udemy.com/react');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('should_send_feedback_once_when_clicking_sim', async () => {
    render(<ResultView result={FULL_RESULT} />);
    const simButton = screen.getByRole('button', { name: 'Sim' });
    fireEvent.click(simButton);
    fireEvent.click(simButton); // second click ignored

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'FEEDBACK', rating: true });
  });

  it('should_send_feedback_once_when_clicking_nao', () => {
    render(<ResultView result={FULL_RESULT} />);
    const naoButton = screen.getByRole('button', { name: 'Não' });
    fireEvent.click(naoButton);
    fireEvent.click(naoButton);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'FEEDBACK', rating: false });
  });

  it('should_disable_feedback_buttons_after_first_click', () => {
    render(<ResultView result={FULL_RESULT} />);
    const simButton = screen.getByRole('button', { name: 'Sim' });
    const naoButton = screen.getByRole('button', { name: 'Não' });

    fireEvent.click(simButton);
    expect((simButton as HTMLButtonElement).disabled).toBe(true);
    expect((naoButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('should_copy_tips_and_show_confirmation', async () => {
    render(<ResultView result={FULL_RESULT} />);
    const copyButton = screen.getByRole('button', { name: 'Copiar dicas de ajuste' });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(mockCopyText).toHaveBeenCalled();
    expect(screen.getByText(/Dicas copiadas!/)).toBeTruthy();
  });

  it('should_not_show_copied_confirmation_when_copy_fails', async () => {
    mockCopyText.mockResolvedValueOnce(false);
    render(<ResultView result={FULL_RESULT} />);
    const copyButton = screen.getByRole('button', { name: 'Copiar dicas de ajuste' });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(screen.queryByText(/Dicas copiadas!/)).toBeNull();
  });

  it('should_not_render_optional_sections_when_arrays_are_empty', () => {
    const emptyResult: AtsResult = {
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
    render(<ResultView result={emptyResult} />);
    expect(screen.queryByText('Score por Skill')).toBeNull();
    expect(screen.queryByText('Pontos Fortes Alinhados')).toBeNull();
    expect(screen.queryByText('Skills Faltando')).toBeNull();
    expect(screen.queryByText('Dicas de Ajuste')).toBeNull();
    expect(screen.queryByText('Checklist do Currículo')).toBeNull();
    expect(screen.queryByText('Cursos Recomendados')).toBeNull();
  });
});