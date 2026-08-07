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

export interface AtsAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  missingKeywords: string[];
  formattingIssues: string[];
  recommendations: string[];
}

export interface AtsResult {
  heuristics: AtsHeuristic;
  analysis: AtsAnalysis;
  cached: boolean;
}

/** Resposta do endpoint /api/extension/analyze. */
export type AnalyzeResponse = AtsResult | { error: string };

export type AnalyzeErrorCode =
  | 'NOT_CONNECTED'
  | 'NO_TEXT'
  | 'NO_RESUME'
  | 'RATE_LIMITED'
  | 'UNKNOWN';