import type { AtsResult } from '../shared/types';

/** Formata o resultado da análise como texto puro (para copiar/exportar). */
export function formatResultToText(result: AtsResult): string {
  const { analysis, heuristics } = result;
  const lines: string[] = [];

  lines.push('Radar Unificando — Análise ATS');
  lines.push(`Score: ${analysis.score}/100`);
  if (analysis.summary) lines.push('', analysis.summary);

  if (analysis.skillScores?.length) {
    lines.push('', 'Score por skill:');
    for (const s of analysis.skillScores) {
      lines.push(`- ${s.skill}: ${s.score}/100${s.suggestion ? ` — ${s.suggestion}` : ''}`);
    }
  }

  if (analysis.strengths.length) {
    lines.push('', 'Pontos fortes:');
    analysis.strengths.forEach((s) => lines.push(`- ${s}`));
  }

  if (analysis.missingKeywords.length) {
    lines.push('', 'Skills faltando:');
    analysis.missingKeywords.forEach((s) => lines.push(`- ${s}`));
  }

  if (analysis.recommendations.length) {
    lines.push('', 'Dicas:');
    analysis.recommendations.forEach((s) => lines.push(`- ${s}`));
  }

  if (heuristics.checks.length) {
    lines.push('', 'Checklist do currículo:');
    heuristics.checks.forEach((c) => lines.push(`- ${c.ok ? '✓' : '✗'} ${c.label}`));
  }

  return lines.join('\n');
}