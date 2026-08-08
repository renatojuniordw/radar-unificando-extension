import { useState } from "react";
import type { AtsResult } from "../../types";
import { formatResultToText } from "../../format";
import { copyText } from "../../clipboard";
import Section from "./Section";

function getQualityBadge(score: number) {
  if (score >= 80) return { label: "Excelente", cls: "excellent" };
  if (score >= 60) return { label: "Bom", cls: "good" };
  return { label: "Atenção", cls: "warning" };
}

function ResultView({ result }: { result: AtsResult }) {
  const { analysis, heuristics } = result;
  const [copied, setCopied] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<boolean | null>(null);

  async function copyTips() {
    const ok = await copyText(formatResultToText(result));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }

  function sendFeedback(rating: boolean) {
    if (feedbackSent !== null) return;
    setFeedbackSent(rating);
    chrome.runtime.sendMessage({ type: "FEEDBACK", rating });
  }

  const quality = getQualityBadge(analysis.score);

  return (
    <div>
      {result.cached && <div className="cached">⚡ Resultado em cache</div>}

      <div className="score-card">
        <div className="score-header">
          <span className="score-badge-title">MATCH SCORE ATS</span>
          <span className={`score-quality ${quality.cls}`}>{quality.label}</span>
        </div>
        <div className="score-main">
          <span className="score-value">{analysis.score}</span>
          <span className="score-label">/ 100</span>
        </div>
        <div className="score-track">
          <div
            className="score-fill"
            style={{ width: `${Math.max(0, Math.min(100, analysis.score))}%` }}
          />
        </div>
      </div>

      {analysis.summary && <p className="summary">{analysis.summary}</p>}

      {analysis.skillScores?.length > 0 && (
        <Section title="Score por Skill">
          {analysis.skillScores.map((s) => (
            <div key={s.skill} className="skill">
              <div className="skill-row">
                <span className="skill-name">{s.skill}</span>
                <span className={s.present ? "ok" : "bad"}>{s.score}/100</span>
              </div>
              <div className="score-track slim">
                <div
                  className="score-fill"
                  style={{ width: `${Math.max(0, Math.min(100, s.score))}%` }}
                />
              </div>
              {s.suggestion && (
                <p className="skill-suggestion">{s.suggestion}</p>
              )}
            </div>
          ))}
        </Section>
      )}

      {analysis.strengths.length > 0 && (
        <Section title="Pontos Fortes Alinhados">
          <ul className="list">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="ok">
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.missingKeywords.length > 0 && (
        <Section title="Skills Faltando">
          <div className="chips">
            {analysis.missingKeywords.map((s, i) => (
              <span key={i} className="chip warn">
                ⚠ {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {analysis.recommendations.length > 0 && (
        <Section title="Dicas de Ajuste">
          <ul className="list">
            {analysis.recommendations.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>
      )}

      {heuristics.checks.length > 0 && (
        <Section title="Checklist do Currículo">
          <ul className="list">
            {heuristics.checks.map((c) => (
              <li key={c.id} className={c.ok ? "ok" : "bad"}>
                {c.label}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="actions">
        <button className="ghost" onClick={copyTips}>
          {copied ? "✓ Dicas copiadas!" : "Copiar dicas de ajuste"}
        </button>
        <div className="feedback">
          <span className="feedback-label">Útil?</span>
          <button
            className={feedbackSent === true ? "active" : ""}
            onClick={() => sendFeedback(true)}
            disabled={feedbackSent !== null}
          >
            Sim
          </button>
          <button
            className={feedbackSent === false ? "active" : ""}
            onClick={() => sendFeedback(false)}
            disabled={feedbackSent !== null}
          >
            Não
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultView;
