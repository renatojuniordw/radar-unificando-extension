/** Tipos de domínio da análise ATS. */

export interface AtsCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface AtsHeuristic {
  checks: AtsCheck[];
  score: number;
}

export interface SkillScore {
  skill: string;
  score: number; // 0-100
  present: boolean;
  suggestion: string;
}

export interface AtsAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  missingKeywords: string[];
  formattingIssues: string[];
  recommendations: string[];
  skillScores: SkillScore[];
}

export interface AtsResult {
  heuristics: AtsHeuristic;
  analysis: AtsAnalysis;
  cached: boolean;
}