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

/** Resposta do endpoint /api/extension/analyze. */
export type AnalyzeResponse = AtsResult | { error: string };

export type AnalyzeErrorCode =
  | 'NOT_CONNECTED'
  | 'NO_TEXT'
  | 'NO_RESUME'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

/** Resposta do /api/extension/feedback. */
export type FeedbackResponse = { ok: true } | { error: string };

/** Mensagens trocadas entre side panel, content script e o service worker. */
export type ExtensionMessage =
  | { type: 'ANALYZE'; jobDescription: string }
  | { type: 'FEEDBACK'; rating: boolean; comment?: string }
  | { type: 'GET_STATUS' }
  | { type: 'CONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'GET_PAGE_TEXT' } // side panel → background → content
  | { type: 'PAGE_CHANGED' }; // content → side panel